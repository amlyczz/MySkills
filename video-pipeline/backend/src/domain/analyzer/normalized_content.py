from typing import Optional
from pydantic import BaseModel, Field

class NormalizedContent(BaseModel):
    """Normalized content — unified input for all downstream processors."""
    title: str = Field(..., description="Short name or title")
    tagline: str = Field(..., description="One-sentence positioning")
    points: list[str] = Field(..., min_length=1, description="3-5 key features")
    summary: Optional[str] = Field(None, description="Closing reflection or outro hook")
    stats_text: Optional[str] = Field(None, description="Human-readable growth stats")
    target_users: Optional[str] = None
    domains: Optional[str] = Field(None, description="Classification tags, separated by 、")
    chartData: Optional[list[dict]] = Field(None, description="Optional benchmark/comparison data for animated bar charts")
