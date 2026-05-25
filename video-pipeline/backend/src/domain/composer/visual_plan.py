from typing import Optional
from pydantic import BaseModel, Field

class VisualPlan(BaseModel):
    """Visual planning helper that bridges a script segment to its blueprint element mapping.

    This is a local domain model — it is an intermediate artifact used only
    by the composer-to-blueprint handoff.
    """

    segment_index: int
    scene_type: str = "generic"
    layout_hint: Optional[str] = None
    motion_hint: Optional[str] = None
    primary_material_id: Optional[str] = None
    visual_description: str = ""
    element_suggestions: list[dict] = Field(default_factory=list)
