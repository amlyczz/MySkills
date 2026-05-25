import asyncio
import json
import sys
import argparse
from datetime import datetime, timedelta

async def _run_gh_cmd(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        "gh", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    # Don't throw for 404s on dependents/readme
    if proc.returncode != 0:
        return ""
    return stdout.decode()

async def fetch_repo_metadata(r: dict) -> dict:
    owner = r['owner']['login']
    name = r['name']
    
    # 1. Base info already in r
    stars = r.get('stargazersCount', 0)
    forks = r.get('forksCount', 0)
    
    # 2. Get subscriber count (watchers)
    repo_detail_str = await _run_gh_cmd("api", f"repos/{owner}/{name}", "--jq", "{watchers:.subscribers_count}")
    watchers = 0
    if repo_detail_str.strip():
        try:
            watchers = json.loads(repo_detail_str).get("watchers", 0)
        except: pass

    # 3. Get Dependents (used by)
    dependents_count = 0
    deps_str = await _run_gh_cmd("api", f"repos/{owner}/{name}/dependency-graph/sbom")
    if deps_str.strip():
        dependents_count = 100 # Rough estimate if SBOM exists, GitHub API is restrictive here
    else:
        # Fallback to search
        search_deps = await _run_gh_cmd("api", f"search/code?q={name}+in:file+org:{owner}", "--jq", ".total_count")
        if search_deps.strip().isdigit():
            dependents_count = int(search_deps.strip())
            
    # 4. Get 7 day star growth
    # For speed, we just assume some data or fetch stargazers count via pagination (approx)
    seven_days = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    # This is a heavy API call in real life, simplified approximation here
    recent_stars_query = f"""
    query {{
      repository(owner:"{owner}", name:"{name}") {{
        stargazers(query: "created:>{seven_days}") {{
          totalCount
        }}
      }}
    }}
    """
    growth_str = await _run_gh_cmd("api", "graphql", "-f", f"query={recent_stars_query}")
    recent_stars = 0
    if growth_str.strip():
        try:
            gql_res = json.loads(growth_str)
            recent_stars = gql_res.get("data", {}).get("repository", {}).get("stargazers", {}).get("totalCount", 0)
        except: pass

    # 5. Author info
    user_str = await _run_gh_cmd("api", f"users/{owner}", "--jq", "{followers:.followers, company:.company}")
    followers = 0
    company = ""
    if user_str.strip():
        try:
            user_json = json.loads(user_str)
            followers = user_json.get("followers", 0)
            company = user_json.get("company", "")
        except: pass

    # 6. Readme snippet
    readme_b64 = await _run_gh_cmd("api", f"repos/{owner}/{name}/readme", "--jq", ".content")
    readme_snippet = ""
    if readme_b64.strip():
        import base64
        try:
            readme_text = base64.b64decode(readme_b64.strip()).decode('utf-8', errors='ignore')
            # Extract first 500 chars for LLM to judge "上手体验" / "视频友好"
            readme_snippet = readme_text[:500]
        except: pass

    return {
        "owner": owner,
        "name": name,
        "url": r.get('url', f"https://github.com/{owner}/{name}"),
        "description": r.get('description') or "No description provided.",
        "language": r.get('primaryLanguage', {}).get('name') if r.get('primaryLanguage') else "Unknown",
        "stars": stars,
        "forks": forks,
        "watchers": watchers,
        "dependents_count": dependents_count,
        "recent_stars_7d": recent_stars,
        "author_followers": followers,
        "author_company": company,
        "readme_snippet": readme_snippet
    }

async def fetch_repo_tree(owner: str, name: str) -> list[dict]:
    """Fetch the repository directory tree via GitHub API."""
    tree_str = await _run_gh_cmd("api", f"repos/{owner}/{name}/git/trees/main?recursive=1")
    if not tree_str.strip():
        # Fallback to master if main doesn't exist
        tree_str = await _run_gh_cmd("api", f"repos/{owner}/{name}/git/trees/master?recursive=1")
    
    if tree_str.strip():
        try:
            return json.loads(tree_str).get("tree", [])
        except: pass
    return []

async def fetch_repo_file(owner: str, name: str, path: str) -> str:
    """Fetch the exact text content of a specific file."""
    b64_content = await _run_gh_cmd("api", f"repos/{owner}/{name}/contents/{path}", "--jq", ".content")
    if b64_content.strip():
        import base64
        try:
            return base64.b64decode(b64_content.strip()).decode('utf-8', errors='ignore')
        except: pass
    return ""

async def fetch_trending_repos(limit: int = 20) -> list[dict]:
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    
    async def search(query_type: str):
        flag = "--created" if query_type == "created" else "--pushed"
        out = await _run_gh_cmd(
            "search", "repos", flag, f">={seven_days_ago}", 
            "--sort", "stars", "--limit", "15", "--json", 
            "name,owner,description,stargazersCount,forksCount,url,primaryLanguage"
        )
        if not out.strip(): return []
        return json.loads(out)

    results = await asyncio.gather(search("created"), search("updated"))
    raw_repos = results[0] + results[1]
    
    seen = set()
    repos_to_score = []
    for r in raw_repos:
        repo_id = f"{r['owner']['login']}/{r['name']}"
        if repo_id not in seen:
            seen.add(repo_id)
            repos_to_score.append(r)
            
    repos_to_score = repos_to_score[:limit]
    
    sem = asyncio.Semaphore(5)
    async def fetch_with_sem(r):
        async with sem:
            return await fetch_repo_metadata(r)
            
    enriched_repos = await asyncio.gather(*(fetch_with_sem(r) for r in repos_to_score))
    return enriched_repos

async def main():
    parser = argparse.ArgumentParser(description="Fetch GitHub Trending repos (Metadata Only)")
    parser.add_argument("--limit", type=int, default=20, help="Number of repos to return")
    args = parser.parse_args()

    try:
        repos = await fetch_trending_repos(args.limit)
        # Output strictly JSON to stdout
        print(json.dumps(repos, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
