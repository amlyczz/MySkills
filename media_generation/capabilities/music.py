"""Music generation capability types."""

from typing import Optional

from pydantic import BaseModel


class MusicRequest(BaseModel):
    prompt: str
    lyrics: Optional[str] = None
    duration: Optional[int] = None    # seconds
    style: Optional[str] = None
    mood: Optional[str] = None
    tempo: Optional[str] = None       # "slow" | "medium" | "fast"
    key: Optional[str] = None         # "C major" | "A minor" ...


class InstrumentalRequest(BaseModel):
    prompt: str
    duration: Optional[int] = None
    style: Optional[str] = None
    mood: Optional[str] = None
    tempo: Optional[str] = None


class MusicResult(BaseModel):
    audio_path: str
    format: str = "mp3"
    duration_seconds: float = 0.0
    title: Optional[str] = None
    cover_image_path: Optional[str] = None
