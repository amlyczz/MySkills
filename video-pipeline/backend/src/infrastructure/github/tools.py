import asyncio
import base64
import json
import sys
import argparse
from datetime import datetime, timedelta
from typing import Optional

from ...domain.github_trending.entities import RawTrendingRepo


async def _run_gh_cmd(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        "gh", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        return ""
    return stdout.decode()


async def fetch_repo_metadata(r: dict) -> RawTrendingRepo:
    """Enrich a raw GitHub search result with additional metadata."""
    owner = r['owner']['login']
    name = r['name']

    stars = r.get('stargazersCount', 0)
    forks = r.get('forksCount', 0)

    # Watchers
    repo_detail_str = await _run_gh_cmd("api", f"repos/{owner}/{name}", "--jq", "{watchers:.subscribers_count}")
    watchers = 0
    if repo_detail_str.strip():
        try:
            watchers = json.loads(repo_detail_str).get("watchers", 0)
        except Exception:
            pass

    # Dependents (rough estimate)
    dependents_count = 0
    deps_str = await _run_gh_cmd("api", f"repos/{owner}/{name}/dependency-graph/sbom")
    if deps_str.strip():
        dependents_count = 100
    else:
        search_deps = await _run_gh_cmd("api", f"search/code?q={name}+in:file+org:{owner}", "--jq", ".total_count")
        if search_deps.strip().isdigit():
            dependents_count = int(search_deps.strip())

    # 7-day star growth
    seven_days = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    recent_stars_query = (
        f'query {{ repository(owner:"{owner}", name:"{name}") '
        f'{{ stargazers(query: "created:>{seven_days}") {{ totalCount }} }} }}'
    )
    growth_str = await _run_gh_cmd("api", "graphql", "-f", f"query={recent_stars_query}")
    recent_stars = 0
    if growth_str.strip():
        try:
            gql_res = json.loads(growth_str)
            recent_stars = gql_res.get("data", {}).get("repository", {}).get("stargazers", {}).get("totalCount", 0)
        except Exception:
            pass

    # Author info
    user_str = await _run_gh_cmd("api", f"users/{owner}", "--jq", "{followers:.followers, company:.company}")
    followers = 0
    company = ""
    if user_str.strip():
        try:
            user_json = json.loads(user_str)
            followers = user_json.get("followers", 0)
            company = user_json.get("company", "")
        except Exception:
            pass

    # README snippet
    readme_b64 = await _run_gh_cmd("api", f"repos/{owner}/{name}/readme", "--jq", ".content")
    readme_snippet = ""
    if readme_b64.strip():
        try:
            readme_text = base64.b64decode(readme_b64.strip()).decode('utf-8', errors='ignore')
            readme_snippet = readme_text[:500]
        except Exception:
            pass

    return RawTrendingRepo(
        owner=owner,
        name=name,
        url=r.get('url', f"https://github.com/{owner}/{name}"),
        description=r.get('description') or "No description provided.",
        language=r.get('primaryLanguage', {}).get('name', "Unknown") if r.get('primaryLanguage') else "Unknown",
        stars=stars,
        forks=forks,
        watchers=watchers,
        dependents_count=dependents_count,
        recent_stars_7d=recent_stars,
        author_followers=followers,
        author_company=company,
        readme_snippet=readme_snippet,
    )


async def fetch_trending_repos(limit: int = 20) -> list[RawTrendingRepo]:
    """Fetch and enrich trending GitHub repos."""
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    async def search(query_type: str) -> list[dict]:
        flag = "--created" if query_type == "created" else "--pushed"
        out = await _run_gh_cmd(
            "search", "repos", flag, f">={seven_days_ago}",
            "--sort", "stars", "--limit", "15", "--json",
            "name,owner,description,stargazersCount,forksCount,url,primaryLanguage",
        )
        if not out.strip():
            return []
        return json.loads(out)

    results = await asyncio.gather(search("created"), search("updated"))
    raw_repos = results[0] + results[1]

    seen: set[str] = set()
    repos_to_score: list[dict] = []
    for r in raw_repos:
        repo_id = f"{r['owner']['login']}/{r['name']}"
        if repo_id not in seen:
            seen.add(repo_id)
            repos_to_score.append(r)

    repos_to_score = repos_to_score[:limit]

    sem = asyncio.Semaphore(5)

    async def fetch_with_sem(r: dict) -> RawTrendingRepo:
        async with sem:
            return await fetch_repo_metadata(r)

    enriched_repos = await asyncio.gather(*(fetch_with_sem(r) for r in repos_to_score))
    return list(enriched_repos)


async def main():
    parser = argparse.ArgumentParser(description="Fetch GitHub Trending repos")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    try:
        repos = await fetch_trending_repos(args.limit)
        print(json.dumps([r.model_dump() for r in repos], ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
