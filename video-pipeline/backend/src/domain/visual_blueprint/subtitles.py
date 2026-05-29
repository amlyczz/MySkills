from typing import Any, Optional
from pydantic import BaseModel, ConfigDict

class SubtitleToken(BaseModel):
    model_config = ConfigDict(extra="allow")
    text: str
    fromFrame: int = 0
    toFrame: int = 0

    def __init__(self, **data: Any) -> None:
        # Coerce LLM field name variants
        if "from" in data and "fromFrame" not in data:
            data["fromFrame"] = data.pop("from")
        if "to" in data and "toFrame" not in data:
            data["toFrame"] = data.pop("to")
        if "start" in data and "fromFrame" not in data:
            data["fromFrame"] = data.pop("start")
        if "end" in data and "toFrame" not in data:
            data["toFrame"] = data.pop("end")
        super().__init__(**data)

class SubtitleConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    tokens: Optional[list[SubtitleToken]] = None
    srtUrl: Optional[str] = None
    captionsUrl: Optional[str] = None
    highlightColor: Optional[str] = None
    fontSize: Optional[int] = None
