from typing import Any, Optional
from pydantic import BaseModel, ConfigDict

class SceneBackground(BaseModel):
    model_config = ConfigDict(extra="allow")
    type: str = "none"  # BackgroundType —宽松处理
    props: Optional[dict[str, Any]] = None
