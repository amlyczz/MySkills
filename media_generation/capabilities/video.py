"""Video generation capability types."""

from typing import Optional

from pydantic import BaseModel


class VideoRequest(BaseModel):
    prompt: str
    duration: Optional[int] = None     # seconds, default 6
    resolution: Optional[str] = None   # "720p" | "1080p"
    style: Optional[str] = None
    negative_prompt: Optional[str] = None


class ImageToVideoRequest(BaseModel):
    image_path: str
    prompt: Optional[str] = None       # motion description
    duration: Optional[int] = None
    resolution: Optional[str] = None


class VideoResult(BaseModel):
    video_path: str
    duration_seconds: float = 0.0
    resolution: str = "1920x1080"
    format: str = "mp4"
    thumbnail_path: Optional[str] = None
