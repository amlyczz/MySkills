import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from ...infrastructure.config.app_config import now_east8


class Project(BaseModel):
    """Pure content container — no source type or URL bound to the project level.
    Source information belongs on PipelineTask."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    description: Optional[str] = None
    task_count: int = 0
    created_at: datetime = Field(default_factory=now_east8)
    updated_at: datetime = Field(default_factory=now_east8)
