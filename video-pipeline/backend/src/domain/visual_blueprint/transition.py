from typing import Any, Optional
from pydantic import BaseModel, ConfigDict

from .enums import TransitionType

class TransitionToNext(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: TransitionType = "crossfade"
    durationInFrames: int = 15
    props: Optional[dict[str, Any]] = None
