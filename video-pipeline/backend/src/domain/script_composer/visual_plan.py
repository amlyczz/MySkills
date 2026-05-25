from typing import Optional
from pydantic import BaseModel, Field


class ElementSuggestion(BaseModel):
    """Suggested visual element for a script segment's blueprint scene."""
    element_type: str = Field(..., description="Component type: Title, CodeBlock, StatCard, ComparisonTable, etc.")
    content: str = Field("", description="Text or data to display")
    priority: str = Field("primary", description="primary | secondary | decoration")


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
    element_suggestions: list[ElementSuggestion] = Field(default_factory=list)
