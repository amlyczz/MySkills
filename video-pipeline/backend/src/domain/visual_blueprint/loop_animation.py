from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

class LoopConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: Literal["pulse", "float", "spin", "wiggle", "flicker", "bounce", "shake"] = "pulse"
    durationInFrames: int = 30
    amplitude: Optional[float] = None
