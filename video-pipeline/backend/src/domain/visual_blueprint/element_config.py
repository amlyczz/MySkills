from typing import Any, Optional
from pydantic import BaseModel, ConfigDict

from .animation import AnimationConfig
from .element_layout import ElementLayout

class RepeatConfig(BaseModel):
    """Data-driven repeat: expand one template per array item."""
    model_config = ConfigDict(extra="allow")
    dataSource: str           # e.g. "$data.features"
    itemAlias: str = "item"   # variable name in child props
    template: Optional[Any] = None  # ElementConfig dict (avoid recursive type)

class ElementConfig(BaseModel):
    """Matches engine ElementConfig exactly.

    Supports recursive children via model_rebuild().
    """
    model_config = ConfigDict(extra="allow")
    id: str
    type: str  # ComponentType —宽松处理，以支持面向未来的组件
    props: Optional[dict[str, Any]] = None
    layout: Optional[ElementLayout] = None
    style: Optional[dict[str, Any]] = None
    animation: Optional[AnimationConfig] = None
    condition: Optional[str] = None
    children: Optional[list["ElementConfig"]] = None
    repeat: Optional[RepeatConfig] = None

ElementConfig.model_rebuild()
