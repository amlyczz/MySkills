from typing import Optional
from pydantic import BaseModel, Field


class DimensionAnalysis(BaseModel):
    """One dimension of source code analysis."""
    readability: str = Field("", description="Code readability and clarity assessment")
    complexity: str = Field("", description="Algorithmic and structural complexity assessment")
    maintainability: str = Field("", description="How easy to maintain and extend")
    testability: str = Field("", description="How testable the codebase is")


class SourceCodeInsight(BaseModel):
    """Source code insight."""
    architecture: Optional[str] = None
    patterns: Optional[list[str]] = None
    highlights: Optional[list[str]] = None
    api_style: Optional[str] = None
    analyzed_files: Optional[list[str]] = None
    total_files_analyzed: Optional[int] = 0
    total_lines_analyzed: Optional[int] = 0
    dimensions: Optional[DimensionAnalysis] = None
