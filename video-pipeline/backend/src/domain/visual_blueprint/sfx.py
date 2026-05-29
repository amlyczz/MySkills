from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, field_validator

class SfxTrigger(BaseModel):
    model_config = ConfigDict(extra="allow")
    sfx: str
    atSec: float = 0.0
    frameOf: Optional[Literal["scene", "global"]] = None
    volume: Optional[float] = None

    def __init__(self, **data: Any) -> None:
        # Coerce LLM field name variants
        if "id" in data and "sfx" not in data:
            data["sfx"] = data.pop("id")
        if "name" in data and "sfx" not in data:
            data["sfx"] = data.pop("name")
        if "frame" in data and "atSec" not in data:
            data["atSec"] = data.pop("frame")
        # v1 migration: atFrame → atSec
        if "atFrame" in data and "atSec" not in data:
            data["atSec"] = float(data.pop("atFrame")) / 30.0
        super().__init__(**data)
