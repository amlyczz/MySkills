from typing import Optional
from pydantic import BaseModel, Field

class ScriptSegment(BaseModel):
    """Narration script segment."""
    text: str
    duration_est: float = Field(5.0, ge=0)
    visual_type: Optional[str] = Field(None, description="Scene visual type: intro, generic, code, data, split, outro")
    visual_params: Optional[dict[str, str]] = Field(None, description="Visual parameters for blueprint generation")

class Script(BaseModel):
    """Narration script."""
    full_text: str
    segments: list[ScriptSegment] = Field(..., min_length=1)
    total_duration_est: float = Field(..., ge=0)
