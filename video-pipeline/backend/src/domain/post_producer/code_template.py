from typing import Optional
from pydantic import BaseModel, Field

class CodeTemplate(BaseModel):
    """Code rendering configuration."""
    language: str = ""
    highlight_lines: list[int] = Field(default_factory=list)
    animation: str = "fade"
    show_line_numbers: bool = False
    max_visible_lines: Optional[int] = None
