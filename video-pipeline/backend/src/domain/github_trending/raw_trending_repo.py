from typing import Optional
from pydantic import BaseModel


class RawTrendingRepo(BaseModel):
    """Raw trending repo data returned by GitHub search + enrichment.

    This is the intermediate data format produced by fetch_trending_repos()
    before LLM scoring produces a ScoredRepo.
    """
    owner: str
    name: str
    url: str
    description: str = ""
    language: str = "Unknown"
    stars: int = 0
    forks: int = 0
    watchers: int = 0
    dependents_count: int = 0
    recent_stars_7d: int = 0
    author_followers: int = 0
    author_company: str = ""
    readme_snippet: str = ""
    base_heat_score: int = 0
    impact_score: int = 0
