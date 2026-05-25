from typing import Optional, Union
from pydantic import BaseModel, ConfigDict

from .enums import PositionType

class ElementLayout(BaseModel):
    model_config = ConfigDict(extra="allow")
    position: Optional[PositionType] = None
    x: Optional[Union[int, float, str]] = None
    y: Optional[Union[int, float, str]] = None
    width: Optional[Union[int, float, str]] = None
    height: Optional[Union[int, float, str]] = None
    zIndex: Optional[int] = None
    scale: Optional[float] = None
    rotation: Optional[float] = None
    opacity: Optional[float] = None
