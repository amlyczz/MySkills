"""Media generation request types (Pydantic models)."""

from typing import Optional
from pydantic import BaseModel


class ImageRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    size: Optional[str] = None
    aspect_ratio: Optional[str] = None
    style: Optional[str] = None
    num_images: int = 1
    quality: Optional[str] = None


class SpeechRequest(BaseModel):
    text: str
    voice_id: str
    speed: float = 1.0
    pitch: int = 0
    format: str = "mp3"
    sample_rate: int = 24000


class MusicRequest(BaseModel):
    prompt: str
    lyrics: Optional[str] = None
    duration: Optional[int] = None
    style: Optional[str] = None
    mood: Optional[str] = None
    tempo: Optional[str] = None
    key: Optional[str] = None


class InstrumentalRequest(BaseModel):
    prompt: str
    duration: Optional[int] = None
    style: Optional[str] = None
    mood: Optional[str] = None
    tempo: Optional[str] = None


class VideoRequest(BaseModel):
    prompt: str
    duration: Optional[int] = None
    resolution: Optional[str] = None
    style: Optional[str] = None
    negative_prompt: Optional[str] = None


class ImageToVideoRequest(BaseModel):
    image_path: str
    prompt: Optional[str] = None
    duration: Optional[int] = None
    resolution: Optional[str] = None


class SpecializedTextRequest(BaseModel):
    format: str = "other"
    theme: str = ""
    style: Optional[str] = None
    length: str = "medium"
    rhyme_scheme: Optional[str] = None
