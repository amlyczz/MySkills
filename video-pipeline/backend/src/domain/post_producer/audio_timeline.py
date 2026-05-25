from typing import Optional
from pydantic import BaseModel, Field


class AudioTimelineSegment(BaseModel):
    """Lightweight timeline segment produced by AudioDesignUseCase.

    Simplified version of TimelineSegment — only carries what audio_design
    needs: timing + text + asset refs.
    """
    id: str
    text: str
    time_start: float
    time_end: float
    duration: float
    assigned_asset: Optional[str] = None
    visual_hook: str = ""


class AudioTimeline(BaseModel):
    """Timeline produced by AudioDesignUseCase with actual TTS durations."""
    version: str = "3"
    total_duration: float
    total_duration_est: float
    segments: list[AudioTimelineSegment] = Field(default_factory=list)
