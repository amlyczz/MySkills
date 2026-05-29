from typing import Literal, Optional, Union
from pydantic import BaseModel, ConfigDict

from .enums import PositionType

class ElementLayout(BaseModel):
    model_config = ConfigDict(extra="allow")
    position: Optional[PositionType] = None
    # Semantic alignment (replaces manual x/y for LLM)
    align: Optional[Literal[
        "top-left", "top-center", "top-right",
        "center-left", "center", "center-right",
        "bottom-left", "bottom-center", "bottom-right",
    ]] = None
    # Manual positioning (still supported for edge cases)
    x: Optional[Union[int, float, str]] = None
    y: Optional[Union[int, float, str]] = None
    width: Optional[Union[int, float, str]] = None
    height: Optional[Union[int, float, str]] = None
    zIndex: Optional[int] = None
    scale: Optional[float] = None
    rotation: Optional[float] = None
    opacity: Optional[float] = None
    z: Optional[float] = None  # 3D depth layer (for parallax)
    # Flex layout (for parent containers)
    flexDirection: Optional[Literal["row", "column"]] = None
    justifyContent: Optional[Literal["flex-start", "center", "flex-end", "space-between", "space-around"]] = None
    alignItems: Optional[Literal["flex-start", "center", "flex-end", "stretch"]] = None
    gap: Optional[Union[int, str]] = None
