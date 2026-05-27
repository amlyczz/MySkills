import asyncio
import base64
import json
import logging
import os
import re
import sys
import argparse
from datetime import datetime, timedelta, timezone

import httpx

from ...domain.github_trending.entities import RawTrendingRepo

logger = logging.getLogger("gh")

# ── Shared httpx client ──

_client: httpx.AsyncClient | None = None
_token: str | None = None


def _get_proxy() -> str | None:
    """Get proxy from env or auto-detect by platform."""
    proxy = os.getenv("HTTPS_PROXY") or os.getenv("HTTP_PROXY") or os.getenv("https_proxy") or os.getenv("http_proxy")
    if proxy:
        return proxy
    import platform
    system = platform.system().lower()
    if "darwin" in system:
        return "http://127.0.0.1:7890"
    if "linux" in system:
        try:
            if "microsoft" in open("/proc/version").read().lower():
                return "http://172.28.0.1:10808"
        except Exception:
            pass
    return None


async def _get_client() -> httpx.AsyncClient:
    """Lazy-init a shared httpx client with proxy."""
    global _client
    if _client and not _client.is_closed:
        return _client
    proxy = _get_proxy()
    _client = httpx.AsyncClient(
        timeout=15,
        follow_redirects=True,
        proxy=proxy,
    )
    return _client


async def _get_token() -> str:
    """Get GitHub token: GITHUB_TOKEN env var > gh auth token (cached)."""
    global _token
    if _token:
        return _token

    env = os.getenv("GITHUB_TOKEN", "")
    if env:
        _token = env
        return _token

    # Fallback: one-time gh auth token call
    proc = await asyncio.create_subprocess_exec(
        "gh", "auth", "token",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    _token = stdout.decode().strip()
    return _token


def _api_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }


async def _gh_get(endpoint: str, extra_headers: dict | None = None) -> dict | list | None:
    """Call GitHub REST API."""
    token = await _get_token()
    client = await _get_client()
    headers = _api_headers(token)
    if extra_headers:
        headers.update(extra_headers)
    for attempt in range(3):
        try:
            resp = await client.get(f"https://api.github.com{endpoint}", headers=headers, timeout=20.0)
            if resp.status_code == 403 and "rate limit" in resp.text.lower():
                await asyncio.sleep(2 * (attempt + 1))
                continue
            if resp.status_code >= 400:
                logger.info(f"API {endpoint} → {resp.status_code}")
                return None
            return resp.json()
        except httpx.TimeoutException as e:
            if attempt == 2:
                logger.warning(f"Timeout error for {endpoint}: {e}")
                return None
            await asyncio.sleep(1 * (attempt + 1))
        except httpx.ConnectError as e:
            logger.warning(f"Connect error for {endpoint}: {e}")
            return None
    return None


async def _gh_get_text(url: str, headers: dict | None = None) -> str:
    """Raw GET for non-API URLs (e.g. trending page)."""
    client = await _get_client()
    h = headers or {
        "Accept": "text/html",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    }
    for attempt in range(3):
        try:
            resp = await client.get(url, headers=h, timeout=20.0)
            resp.raise_for_status()
            return resp.text
        except httpx.TimeoutException:
            if attempt == 2:
                raise
            await asyncio.sleep(1 * (attempt + 1))
    return ""


# ── Trending page scraping (only source for actual trending data) ──

async def _scrape_github_trending(since: str = "weekly") -> list[dict]:
    """Scrape GitHub Trending page. No official API for this."""
    url = f"https://github.com/trending?since={since}"
    repos: list[dict] = []

    try:
        html = await _gh_get_text(url)
        articles = re.findall(r'<article class="Box-row">(.*?)</article>', html, re.DOTALL)
        for art in articles:
            hrefs = re.findall(r'href="([^"]+)"', art)
            repo_hrefs = [
                h for h in hrefs
                if h.startswith('/') and h.count('/') == 2
                and '/login' not in h and not h.startswith('/topics')
                and not h.startswith('/explore') and not h.startswith('/apps/')
            ]
            if not repo_hrefs:
                continue
            parts = repo_hrefs[0].strip('/').split('/')
            if len(parts) != 2:
                continue
            owner, name = parts

            desc_match = re.search(r'<p[^>]*class="[^"]*col-9[^"]*"[^>]*>(.*?)</p>', art, re.DOTALL)
            description = re.sub(r'<[^>]+>', '', desc_match.group(1)).strip() if desc_match else ""

            lang_match = re.search(r'itemprop="programmingLanguage">(.*?)<', art)
            lang = lang_match.group(1).strip() if lang_match else "Unknown"

            stars_match = re.search(r'([\d,]+)\s+stars (today|this week|this month)', art)
            period_stars = int(stars_match.group(1).replace(',', '')) if stars_match else 0

            repos.append({
                "owner": {"login": owner},
                "name": name,
                "url": f"https://github.com/{owner}/{name}",
                "description": description,
                "language": lang,
                "stargazersCount": 0,
                "forksCount": 0,
                "_period_stars": period_stars,
            })

        logger.info(f"Scraped %d repos from GitHub Trending ({since})", len(repos))
    except Exception as e:
        logger.error("Failed to scrape GitHub Trending: %s", e)

    return repos


# ── Search API fallback ──

async def _search_repos(query: str = "", sort: str = "stars",
                        stars: str = "", updated: str = "",
                        per_page: int = 20) -> list[dict]:
    """GitHub Search API via httpx (fallback when trending page gives few results)."""
    params: dict[str, str | int] = {"sort": sort, "order": "desc", "per_page": per_page}
    q_parts: list[str] = []
    if query:
        q_parts.append(query)
    if stars:
        q_parts.append(f"stars:{stars}")
    if updated:
        q_parts.append(f"pushed:{updated}")
    params["q"] = " ".join(q_parts)

    data = await _gh_get(f"/search/repositories?{'&'.join(f'{k}={v}' for k, v in params.items())}")
    if not data or "items" not in data:
        return []
    return [
        {
            "owner": {"login": item["owner"]["login"]},
            "name": item["name"],
            "url": item["html_url"],
            "description": item.get("description") or "",
            "language": item.get("language") or "Unknown",
            "stargazersCount": item.get("stargazers_count", 0),
            "forksCount": item.get("forks_count", 0),
        }
        for item in data["items"]
    ]


# ── Repo enrichment ──

async def fetch_repo_metadata(r: dict) -> RawTrendingRepo:
    """Enrich a candidate with accurate metadata via GitHub API."""
    owner = r['owner']['login']
    name = r['name']
    period_stars = r.get('_period_stars', 0)

    # Single API call for repo details
    stars = r.get('stargazersCount', 0)
    forks = r.get('forksCount', 0)
    watchers = 0

    detail = await _gh_get(f"/repos/{owner}/{name}")
    if detail and isinstance(detail, dict):
        stars = detail.get("stargazers_count", stars)
        forks = detail.get("forks_count", forks)
        watchers = detail.get("subscribers_count", 0)

    # Recent star growth
    recent_stars = period_stars if period_stars > 0 else 0
    star_velocity = round(recent_stars / 7, 1)

    # Author info (concurrent with repo detail to save time)
    author_task = _gh_get(f"/users/{owner}")
    readme_task = _gh_get(f"/repos/{owner}/{name}/readme")

    author_data, readme_data = await asyncio.gather(author_task, readme_task)

    followers = 0
    company = None
    if author_data and isinstance(author_data, dict):
        followers = author_data.get("followers", 0)
        company = author_data.get("company")

    readme_snippet = ""
    if readme_data and isinstance(readme_data, dict):
        content_b64 = readme_data.get("content", "")
        if content_b64:
            try:
                readme_snippet = base64.b64decode(content_b64).decode('utf-8', errors='ignore')[:500]
            except Exception:
                pass

    return RawTrendingRepo(
        owner=owner,
        name=name,
        url=r.get('url', f"https://github.com/{owner}/{name}"),
        description=r.get('description') or "No description provided.",
        language=r.get('language') or "Unknown",
        stars=stars,
        forks=forks,
        watchers=watchers,
        dependents_count=0,
        recent_stars_7d=recent_stars,
        star_velocity=star_velocity,
        author_followers=followers,
        author_company=company,
        readme_snippet=readme_snippet,
    )


# ── Main entry ──

MEGA_REPOS = {
    'freeCodeCamp/freeCodeCamp', 'facebook/react', 'tensorflow/tensorflow',
    'microsoft/vscode', 'torvalds/linux', 'twbs/bootstrap', 'flutter/flutter',
    'ohmyzsh/ohmyzsh', 'TheAlgorithms/Python', 'trekhleb/javascript-algorithms',
    'vuejs/vue', 'angular/angular', 'vercel/next.js', 'facebook/react-native',
    'd3/d3', 'microsoft/TypeScript', 'golang/go', 'rust-lang/rust',
    'electron/electron', 'nodejs/node', 'django/django', 'pallets/flask',
    'pytorch/pytorch', 'Significant-Gravitas/AutoGPT', 'ollama/ollama',
    'langchain-ai/langchain', 'n8n-io/n8n', 'ultralytics/ultralytics',
    'microsoft/PowerToys', 'Genymobile/scrcpy', 'avelino/awesome-go',
    'sindresorhus/awesome', 'jwasham/coding-interview-university',
    'donnemartin/system-design-primer', 'public-apis/public-apis',
    'kamranahmedse/developer-roadmap', 'nilbuild/developer-roadmap',
    'apple/swift', 'comma10/open-assistant', 'vinta/awesome-python',
    'openclaw/openclaw', 'ultraworkers/claw-code',
    'h5bp/html5-boilerplate', 'github/gitignore',
}

SPAM_KEYWORDS = {'casino', 'gambl', 'bonus', 'hack', 'crack', 'cheat', 'porn', 'xxx',
                 'lottery', 'slot', 'betting', 'poker', '9arm', 'skill', 'awesome-'}
SPAM_OWNERS = {'sponsors'}


async def fetch_trending_repos(limit: int = 20, exclude_urls: set[str] | None = None) -> list[RawTrendingRepo]:
    """Fetch trending GitHub repos with strongest upward momentum.

    Primary: GitHub Trending page (weekly + daily).
    Fallback: GitHub Search API.
    """
    exclude = exclude_urls or set()
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    # ── Primary: Trending page ──
    trending_results = await asyncio.gather(
        _scrape_github_trending(since="weekly"),
        _scrape_github_trending(since="daily"),
    )
    candidates: list[dict] = []
    seen_ids: set[str] = set()
    for r in trending_results[0] + trending_results[1]:
        repo_id = f"{r['owner']['login']}/{r['name']}"
        if repo_id not in seen_ids:
            seen_ids.add(repo_id)
            candidates.append(r)

    # ── Fallback: Search API ──
    if len(candidates) < 15:
        logger.info("Trending page gave %d repos, supplementing with search API...", len(candidates))
        search_results = await asyncio.gather(
            _search_repos(stars="50..5000", updated=f">{seven_days_ago}", sort="stars", per_page=20),
            _search_repos(query="AI agent", stars=">100", updated=f">{seven_days_ago}", sort="stars", per_page=15),
        )
        for r in search_results[0] + search_results[1]:
            repo_id = f"{r['owner']['login']}/{r['name']}"
            if repo_id not in seen_ids:
                seen_ids.add(repo_id)
                candidates.append(r)

    # ── Filter ──
    repos_to_score: list[dict] = []
    for r in candidates:
        repo_id = f"{r['owner']['login']}/{r['name']}"
        repo_url = r.get('url', f"https://github.com/{repo_id}")
        owner_login = r['owner']['login']
        if repo_url in exclude:
            logger.debug("Skipping already completed: %s", repo_id)
            continue
        if owner_login in SPAM_OWNERS:
            continue
        if repo_id in MEGA_REPOS:
            continue
        desc = (r.get('description') or '').lower()
        name_lower = r['name'].lower()
        if any(kw in desc or kw in name_lower for kw in SPAM_KEYWORDS):
            continue
        repos_to_score.append(r)

    repos_to_score = repos_to_score[:30]
    logger.info("%d candidates after filtering, enriching...", len(repos_to_score))

    if not repos_to_score:
        return []

    # ── Enrich (concurrent, 5 at a time) ──
    sem = asyncio.Semaphore(5)

    async def fetch_with_sem(r: dict) -> RawTrendingRepo:
        async with sem:
            return await fetch_repo_metadata(r)

    enriched = await asyncio.gather(*(fetch_with_sem(r) for r in repos_to_score))

    # ── Sort by recent star growth (fallback to total stars for search API results) ──
    enriched.sort(key=lambda x: (x.recent_stars_7d, x.stars), reverse=True)

    trending = [r for r in enriched if r.recent_stars_7d > 0]
    
    # If we still have room for more candidates up to the requested limit,
    # fill them with the fallback Search API results (which have recent_stars_7d == 0)
    if len(trending) < limit:
        for r in enriched:
            if r.recent_stars_7d == 0 and len(trending) < limit:
                trending.append(r)

    if trending:
        top = trending[0]
        logger.info("Top: %s/%s (+%d stars/7d)", top.owner, top.name, top.recent_stars_7d)

    return trending[:limit]


async def main():
    parser = argparse.ArgumentParser(description="Fetch GitHub Trending repos")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    try:
        repos = await fetch_trending_repos(args.limit)
        logger.info(json.dumps([r.model_dump() for r in repos], ensure_ascii=False, indent=2))
    except Exception as e:
        logger.error(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
