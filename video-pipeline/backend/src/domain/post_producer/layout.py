from pydantic import BaseModel, Field

class LayoutConfig(BaseModel):
    """Segment layout configuration."""
    layout_id: str = "hero-center"
    motion_map: dict[str, str] = Field(default_factory=dict)
