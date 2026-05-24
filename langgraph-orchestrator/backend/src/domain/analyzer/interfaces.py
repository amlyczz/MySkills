from abc import ABC, abstractmethod
from .entities import RepoAnalysis

class RepoScraper(ABC):
    
    @abstractmethod
    async def scrape_repo(self, url: str, output_screenshot_path: str) -> str:
        """Scrapes repository readme and captures web screenshot."""
        pass

class RepoAnalyzer(ABC):
    
    @abstractmethod
    async def analyze_repo(self, readme_text: str, repo_url: str) -> RepoAnalysis:
        """Analyzes README text and constructs structured RepoAnalysis entity."""
        pass
