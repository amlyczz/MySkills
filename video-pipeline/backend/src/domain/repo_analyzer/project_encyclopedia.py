from typing import Optional
from pydantic import BaseModel, Field

class ProjectEncyclopedia(BaseModel):
    """The deep encyclopedia containing common base dimensions for any project."""
    title: str = Field(..., description="Project name")
    tagline: str = Field(..., description="One-sentence positioning")
    quick_start: str = Field(..., description="How to run it quickly? Minimal Working Example or install command.")
    use_cases: str = Field(..., description="What pain points does it solve? Where is it most applicable?")
    usage_intro: str = Field(..., description="Core API usage, CLI commands, or SDK integration overview.")
    stats_text: Optional[str] = Field(None, description="Human-readable growth stats")
    chartData: Optional[list[dict]] = Field(None, description="Optional benchmark/comparison data for animated bar charts")
