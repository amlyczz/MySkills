from typing import Optional
from pydantic import BaseModel

class ScoredRepo(BaseModel):
    owner: str
    name: str
    url: str
    description: Optional[str]
    language: Optional[str]
    stars: int
    recent_stars_7d: int
    forks: int
    dependents_count: int
    author_followers: int
    
    # Subjective Scores (1-5)
    tech_depth: int
    video_friendly: int
    topic_heat: int
    onboarding_exp: int
    
    # Calculated Base Scores (1-5)
    base_heat_score: int
    impact_score: int
    
    final_score: float
    one_liner: str
