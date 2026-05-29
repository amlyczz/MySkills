from typing import Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field

from .enums import AnimationType
from .loop_animation import LoopConfig
from .motion import BezierEasing, LinearEasing, SpringEasing

class AnimationTimeline(BaseModel):
    model_config = ConfigDict(extra="allow")
    inSec: float = 0.0
    outSec: Optional[float] = None
    durationSec: Optional[float] = None

class StaggerConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    delayPerChild: int = 3
    direction: Optional[Literal["forward", "reverse"]] = None

class AnimationConfig(BaseModel):
    """Blueprint v2: LLM writes seconds, normalize converts to frames."""
    model_config = ConfigDict(extra="allow")
    type: AnimationType = "fade-in"
    timeline: AnimationTimeline = Field(default_factory=AnimationTimeline)
    startState: Optional[dict[str, float]] = None
    endState: Optional[dict[str, float]] = None
    easing: Optional[Union[SpringEasing, BezierEasing, LinearEasing, str]] = None
    stagger: Optional[StaggerConfig] = None
    loop: Optional[LoopConfig] = None
    loopStartDelaySec: Optional[float] = None
