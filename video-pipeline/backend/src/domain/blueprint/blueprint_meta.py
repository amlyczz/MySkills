from typing import Optional
from pydantic import BaseModel, ConfigDict

class BlueprintMeta(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    name: str
    description: Optional[str] = None
