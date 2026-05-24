import uuid
from typing import Optional
from pydantic import BaseModel, Field

class VideoSegment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    voiceover_prompt: Optional[str] = None
    visual_type: str = "generic"
    visual_params: dict[str, str] = Field(default_factory=dict)

class VideoScript(BaseModel):
    title: str
    segments: list[VideoSegment] = Field(default_factory=list)
    target_duration_seconds: int = 60
