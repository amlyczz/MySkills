import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    GITHUB_REPO = "github_repo"
    TRENDING = "trending"


class Project(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    source_type: SourceType = SourceType.GITHUB_REPO
    repo_url: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    stars: Optional[int] = None
    thumbnail_url: Optional[str] = None
    task_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
