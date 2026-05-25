from typing import Optional
from pydantic import BaseModel, Field

class VoiceoverSplit(BaseModel):
    """Voiceover sub-sentence."""
    text: str = ""
    time_offset: float = 0.0

class VoiceoverSegment(BaseModel):
    """Voiceover paragraph."""
    text: str = ""
    duration_est: float = 0.0
    splits: list[VoiceoverSplit] = Field(default_factory=list)

class SfxEntry(BaseModel):
    """Sound effect trigger."""
    id: str
    time: float = 0.0
    volume: float = Field(default=0.5, ge=0, le=1)
    repeat_every: Optional[float] = None

class AudioConfig(BaseModel):
    """Segment audio configuration."""
    bgm_volume: float = 0.25
    bgm_fade_in: Optional[float] = None
    bgm_fade_out: Optional[float] = None
    sfx: list[SfxEntry] = Field(default_factory=list)
