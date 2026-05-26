"""Twitter Analyzer domain interfaces — ports for scraper and analyzer."""
from abc import ABC, abstractmethod
from .entities import RawScrapeResult, TwitterContentModel


class TwitterScraper(ABC):
    """Port for scraping Twitter content from a URL."""

    @abstractmethod
    async def scrape(self, url: str, output_dir: str) -> RawScrapeResult:
        """Scrape Twitter content from the given URL.

        Returns raw scrape result with tweet text, thread, replies, media.
        """


class TwitterAnalyzer(ABC):
    """Port for analyzing scraped Twitter content."""

    @abstractmethod
    async def analyze(self, raw: RawScrapeResult, url: str) -> TwitterContentModel:
        """Transform raw scrape result into structured TwitterContentModel."""
