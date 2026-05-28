from fastapi import APIRouter, Depends, HTTPException

from ...domain.github_trending.entities import RawTrendingRepo
from ...domain.github_trending.interfaces import TrendingScraper
from .dependencies import get_trending_scraper

router = APIRouter(prefix="/api/v1/trending", tags=["trending"])


@router.get("")
async def get_trending_repos(
    limit: int = 20,
    scraper: TrendingScraper = Depends(get_trending_scraper)
) -> list[RawTrendingRepo]:
    """Fetch trending github repositories."""
    try:
        repos = await scraper.fetch_trending(limit=limit)
        return repos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trending repos: {e}")
