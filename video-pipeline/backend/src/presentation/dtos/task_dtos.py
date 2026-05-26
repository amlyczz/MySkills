from typing import Optional
from pydantic import BaseModel


class TaskSubmitRequest(BaseModel):
    repo_url: str | None = None
    project_type: str = "educational"


class TaskSubmitResponse(BaseModel):
    task_id: str
    status: str = "created"


class TaskListItem(BaseModel):
    """Lightweight task info for list views."""
    task_id: str
    repo_url: str
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    repo_url: Optional[str] = None
    content_model: Optional[dict] = None
    material_manifest: Optional[dict] = None
    script: Optional[dict] = None
    blueprint: Optional[dict] = None
    video_mp4_path: Optional[str] = None
    final_mp4_path: Optional[str] = None
    trending_repos: Optional[list[dict]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TaskResumeRequest(BaseModel):
    """Resume a paused (HITL) task with a human decision."""
    action: str  # approve | reject | abort
    feedback: Optional[str] = None
