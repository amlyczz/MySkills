from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

class ContentVariable(BaseModel):
    model_config = ConfigDict(extra="allow")
    key: str
    label: str
    type: Literal["string", "number", "image", "textarea"] = "string"
    default: Any = None

class ThemeVariable(BaseModel):
    model_config = ConfigDict(extra="allow")
    key: str
    label: str
    type: Literal["color", "font"] = "color"
    default: Any = None

class BlueprintVariables(BaseModel):
    model_config = ConfigDict(extra="allow")
    content: list[ContentVariable] = Field(default_factory=list)
    theme: list[ThemeVariable] = Field(default_factory=list)
