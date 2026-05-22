"""Image generation capability types."""

from typing import Optional

from pydantic import BaseModel, Field


class ImageRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    size: Optional[str] = None          # "1024x1024" | "1024x1368" | "1920x1080"
    aspect_ratio: Optional[str] = None  # "1:1" | "3:4" | "16:9"
    style: Optional[str] = None
    num_images: int = 1
    quality: Optional[str] = None       # "standard" | "hd"


class ImageData(BaseModel):
    url: Optional[str] = None
    local_path: Optional[str] = None
    width: int = 0
    height: int = 0
    size_bytes: int = 0


class ImageResult(BaseModel):
    images: list[ImageData] = Field(default_factory=list)
