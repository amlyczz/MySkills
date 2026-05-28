from typing import Optional
from ...domain.github_trending.interfaces import TrendingScraper
from ...domain.github_trending.entities import RawTrendingRepo
from .tools import fetch_trending_repos

class GitHubTrendingScraper(TrendingScraper):
    """Implementation of TrendingScraper using GitHub API and web scraping."""

    async def fetch_trending_repos(
        self,
        limit: int = 30,
        exclude_urls: Optional[set[str]] = None
    ) -> list[RawTrendingRepo]:
        """Fetch trending repositories."""
        return await fetch_trending_repos(limit=limit, exclude_urls=exclude_urls)
