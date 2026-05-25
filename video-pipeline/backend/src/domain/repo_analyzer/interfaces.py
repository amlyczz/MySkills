from abc import ABC, abstractmethod

from typing import Optional

from .entities import ContentModel, DomainAnalysis, MaterialManifest, ProjectCategory, RepoMetadata, TechDomain


class RepoScraper(ABC):

    @abstractmethod
    async def scrape_repo(self, url: str, output_screenshot_path: str) -> str:
        """Scrapes repository readme and captures web screenshot."""
        pass


class RepoAnalyzer(ABC):

    @abstractmethod
    async def classify_tech_domain(self, enriched_input: str) -> TechDomain:
        """Classify the technical domain (e.g. AI_MODEL, WEB_BACKEND)."""
        pass

    @abstractmethod
    async def analyze_repo(
        self, enriched_input: str, repo_url: str, tech_domain: TechDomain, candidate_materials: str
    ) -> ContentModel:
        """Analyzes enriched repo text and constructs ContentModel using domain prompt."""
        pass

    @abstractmethod
    async def classify_category(self, content: ContentModel) -> ProjectCategory:
        """Classify the content into a ProjectCategory for downstream routing."""
        pass

    @abstractmethod
    async def analyze_domain(
        self, content_model: ContentModel, repo_metadata: Optional[RepoMetadata] = None,
    ) -> DomainAnalysis:
        """Analyze domain architecture, build audience profile, and select narrative angle."""
        pass
