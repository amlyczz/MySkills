from typing import Optional
from pydantic import BaseModel, Field


class ChartDataPoint(BaseModel):
    """Single data point for animated bar/comparison charts."""
    label: str
    value: float
    color: Optional[str] = None


class ProjectEncyclopedia(BaseModel):
    """The deep encyclopedia containing common base dimensions for any project."""
    title: str = Field(..., description="Project name")
    tagline: str = Field(..., description="One-sentence positioning")
    quick_start: str = Field(..., description="How to run it quickly? Minimal Working Example or install command.")
    use_cases: str = Field(..., description="What pain points does it solve? Where is it most applicable?")
    usage_intro: str = Field(..., description="Core API usage, CLI commands, or SDK integration overview.")
    architecture_breakdown: str = Field("", description="Detailed architecture analysis: modules, data flow, design patterns, key abstractions.")
    domain_specific_insights: str = Field("", description="Domain-specific deep insights: algorithms, optimizations, unique techniques, performance characteristics.")
    stats_text: Optional[str] = Field(None, description="Human-readable growth stats")
    chart_data: Optional[list[ChartDataPoint]] = Field(None, alias="chartData", description="Optional benchmark/comparison data for animated bar charts")

    model_config = {"populate_by_name": True}
