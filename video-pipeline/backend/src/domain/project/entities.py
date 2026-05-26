import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class Project(BaseModel):
    """Pure content container — no source type or URL bound to the project level.
    Source information belongs on PipelineTask."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    description: Optional[str] = None
    task_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
