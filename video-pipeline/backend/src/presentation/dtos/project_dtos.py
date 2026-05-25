from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from ...domain.project.entities import SourceType


class CreateProjectRequest(BaseModel):
    name: str
    source_type: SourceType = SourceType.GITHUB_REPO
    repo_url: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    source_type: str
    repo_url: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    stars: Optional[int] = None
    thumbnail_url: Optional[str] = None
    task_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
    page: int
    page_size: int


class ProjectSubmitTaskRequest(BaseModel):
    repo_url: Optional[str] = None
    project_type: str = "educational"
