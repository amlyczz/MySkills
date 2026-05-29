from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, field_validator

class SfxTrigger(BaseModel):
    model_config = ConfigDict(extra="allow")
    sfx: str
    atFrame: int = 0
    frameOf: Optional[Literal["scene", "global"]] = None
    volume: Optional[float] = None

    @field_validator("sfx", mode="before")
    @classmethod
    def _coerce_sfx(cls, v: Any) -> Any:
        """LLM sometimes uses 'id' instead of 'sfx' for the sound effect name."""
        return v

    @field_validator("atFrame", mode="before")
    @classmethod
    def _coerce_atFrame(cls, v: Any) -> Any:
        """LLM sometimes uses 'frame' instead of 'atFrame'."""
        return v

    def __init__(self, **data: Any) -> None:
        # Coerce LLM field name variants
        if "id" in data and "sfx" not in data:
            data["sfx"] = data.pop("id")
        if "frame" in data and "atFrame" not in data:
            data["atFrame"] = data.pop("frame")
        if "name" in data and "sfx" not in data:
            data["sfx"] = data.pop("name")
        super().__init__(**data)
