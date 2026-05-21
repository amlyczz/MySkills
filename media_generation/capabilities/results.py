"""Media generation result types (Pydantic models)."""

from typing import Optional
from pydantic import BaseModel, Field


class ImageData(BaseModel):
    url: Optional[str] = None
    local_path: Optional[str] = None
    width: int = 0
    height: int = 0
    size_bytes: int = 0


class ImageResult(BaseModel):
    images: list[ImageData] = Field(default_factory=list)


class VoiceInfo(BaseModel):
    id: str
    name: str
    language: str
    gender: str
    style: Optional[str] = None
    sample_url: Optional[str] = None


class SpeechResult(BaseModel):
    audio_path: str
    format: str = "mp3"
    duration_seconds: float = 0.0
    sample_rate: int = 24000


class MusicResult(BaseModel):
    audio_path: str
    format: str = "mp3"
    duration_seconds: float = 0.0
    title: Optional[str] = None
    cover_image_path: Optional[str] = None


class VideoResult(BaseModel):
    video_path: str
    duration_seconds: float = 0.0
    resolution: str = "1920x1080"
    format: str = "mp4"
    thumbnail_path: Optional[str] = None


class SpecializedTextResult(BaseModel):
    content: str
    format: str = "other"
