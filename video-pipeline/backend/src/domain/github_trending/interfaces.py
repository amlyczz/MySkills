from abc import ABC, abstractmethod
from typing import Optional

from .entities import RawTrendingRepo

class TrendingScraper(ABC):
    """Interface for scraping trending repositories."""

    @abstractmethod
    async def fetch_trending_repos(
        self,
        limit: int = 30,
        exclude_urls: Optional[set[str]] = None
    ) -> list[RawTrendingRepo]:
        """Fetch trending repositories.

        Args:
            limit: Maximum number of repos to fetch.
            exclude_urls: Set of repository URLs to exclude.

        Returns:
            list[RawTrendingRepo]: List of fetched trending repositories.
        """
        pass
