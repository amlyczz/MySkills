from typing import Optional
from pydantic import BaseModel

class QAResultSchema(BaseModel):
    score: int
    reasoning: str

class SceneFillRequest(BaseModel):
    """Input for Step 2: describes what to fill for a single scene."""
    scene_index: int
    scene_type: str
    duration_in_frames: int
    background_type: str
    narration_text: str
    assigned_asset: Optional[str] = None
    visual_hook: str
    content_title: str = ""
    content_points: str = ""
