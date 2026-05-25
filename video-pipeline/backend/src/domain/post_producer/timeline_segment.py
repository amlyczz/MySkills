from typing import Optional
from pydantic import BaseModel, Field

from .audio import AudioConfig, VoiceoverSegment
from .code_template import CodeTemplate
from .layout import LayoutConfig
from .style import StyleConfig

class TimelineSegment(BaseModel):
    """Timeline segment."""
    model_config = {"frozen": False}

    id: str = ""
    type: str = ""
    label: str = ""
    time_start: float = 0.0
    time_end: float = 0.0
    duration: float = 0.0
    voiceover: VoiceoverSegment = Field(default_factory=VoiceoverSegment)
    primary_material: Optional[str] = None
    material_refs: list[str] = Field(default_factory=list)
    material_time_range: Optional[dict[str, float]] = None
    code_template: Optional[CodeTemplate] = None
    layout: LayoutConfig = Field(default_factory=LayoutConfig)
    style: StyleConfig = Field(default_factory=StyleConfig)
    audio: AudioConfig = Field(default_factory=AudioConfig)
    transition_in: str = "crossfade"
    transition_out: str = "crossfade"
