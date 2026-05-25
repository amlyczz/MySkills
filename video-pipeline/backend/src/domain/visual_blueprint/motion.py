from typing import Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field

class SpringParams(BaseModel):
    model_config = ConfigDict(extra="allow")
    mass: float = 1.0
    damping: float = 10.0
    stiffness: float = 100.0

class BezierEasing(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: Literal["bezier"] = "bezier"
    bezier: list[float] = Field(default_factory=lambda: [0.25, 0.1, 0.25, 1.0])

class SpringEasing(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: Literal["spring"] = "spring"
    params: SpringParams = Field(default_factory=SpringParams)

class LinearEasing(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: Literal["linear"] = "linear"

MotionTokenEasing = Union[SpringEasing, BezierEasing, LinearEasing]

class MotionToken(BaseModel):
    model_config = ConfigDict(extra="allow")
    easing: MotionTokenEasing
    duration: Optional[int] = None
