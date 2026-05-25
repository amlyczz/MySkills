from typing import Optional
from pydantic import BaseModel, Field

class SourceCodeInsight(BaseModel):
    """Source code insight."""
    architecture: Optional[str] = None
    patterns: Optional[list[str]] = None
    highlights: Optional[list[str]] = None
    api_style: Optional[str] = None
    analyzed_files: Optional[list[str]] = None
    total_files_analyzed: Optional[int] = 0
    total_lines_analyzed: Optional[int] = 0
    dimensions: Optional[dict[str, str]] = Field(None, description="4-dimension analysis, 50-100 chars each")
