from fastapi import APIRouter, HTTPException

from ...domain.github_trending.entities import RawTrendingRepo
from ...infrastructure.github.tools import fetch_trending_repos

router = APIRouter(prefix="/api/v1/trending", tags=["trending"])


@router.get("")
async def get_trending_repos(limit: int = 20) -> list[RawTrendingRepo]:
    """Fetch trending github repositories."""
    try:
        repos = await fetch_trending_repos(limit=limit)
        return repos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trending repos: {e}")
