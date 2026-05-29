from typing import Optional
from pydantic import BaseModel, ConfigDict

class VoiceoverConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    audioUrl: str = ""
    text: str = ""
    startSec: float = 0.0
    endSec: Optional[float] = None
    volume: Optional[float] = None
    loop: Optional[bool] = None
