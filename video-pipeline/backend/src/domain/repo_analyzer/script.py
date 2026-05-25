from typing import Optional
from pydantic import BaseModel, Field

class ScriptSegment(BaseModel):
    """Narration script segment."""
    text: str
    duration_est: float = Field(5.0, ge=0)
    assigned_asset: Optional[str] = Field(None, description="The URL of the curated asset to display, or Mermaid code snippet.")
    visual_hook: str = Field(..., description="Instructions for the video editor (e.g., zoom, pan, highlight).")

class Script(BaseModel):
    """Narration script."""
    full_text: str
    segments: list[ScriptSegment] = Field(..., min_length=1)
    total_duration_est: float = Field(..., ge=0)
