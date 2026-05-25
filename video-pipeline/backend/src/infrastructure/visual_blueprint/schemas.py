from typing import Optional
from pydantic import BaseModel

from ...domain.visual_blueprint.element_layout import ElementLayout


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


def _decoration_overlay_layout(z_index: int = -1) -> ElementLayout:
    """Standard layout for full-screen decoration overlays."""
    return ElementLayout(position="absolute", width="100%", height="100%", zIndex=z_index)
