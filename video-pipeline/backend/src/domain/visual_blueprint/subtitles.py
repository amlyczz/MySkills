from typing import Any, Optional
from pydantic import BaseModel, ConfigDict

class SubtitleToken(BaseModel):
    model_config = ConfigDict(extra="allow")
    text: str
    fromSec: float = 0.0
    toSec: float = 0.0

    def __init__(self, **data: Any) -> None:
        # Coerce LLM field name variants
        for old, new in [("from", "fromSec"), ("start", "fromSec"), ("to", "toSec"), ("end", "toSec")]:
            if old in data and new not in data:
                data[new] = data.pop(old)
        # Also accept v1 frame fields and convert (migration helper)
        for frame_key, sec_key in [("fromFrame", "fromSec"), ("toFrame", "toSec")]:
            if frame_key in data and sec_key not in data:
                data[sec_key] = float(data.pop(frame_key)) / 30.0
        super().__init__(**data)

class SubtitleConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    tokens: Optional[list[SubtitleToken]] = None
    srtUrl: Optional[str] = None
    captionsUrl: Optional[str] = None
    highlightColor: Optional[str] = None
    fontSize: Optional[int] = None
