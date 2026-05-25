from typing import Optional
from pydantic import BaseModel, ConfigDict

class SubtitleToken(BaseModel):
    model_config = ConfigDict(extra="allow")
    text: str
    fromFrame: int = 0
    toFrame: int = 0

class SubtitleConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    tokens: Optional[list[SubtitleToken]] = None
    srtUrl: Optional[str] = None
    captionsUrl: Optional[str] = None
    highlightColor: Optional[str] = None
    fontSize: Optional[int] = None
