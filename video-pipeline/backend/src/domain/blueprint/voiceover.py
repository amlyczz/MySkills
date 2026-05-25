from typing import Optional
from pydantic import BaseModel, ConfigDict

class VoiceoverConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    audioUrl: str = ""
    text: str = ""
    startFrame: int = 0
    endFrame: Optional[int] = None
    volume: Optional[float] = None
    loop: Optional[bool] = None
