from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CreateProjectRequest(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
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
    twitter_url: Optional[str] = None
