from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

class SfxTrigger(BaseModel):
    model_config = ConfigDict(extra="allow")
    sfx: str
    atFrame: int = 0
    frameOf: Optional[Literal["scene", "global"]] = None
    volume: Optional[float] = None
