from typing import Optional
from pydantic import BaseModel


class TaskSubmitRequest(BaseModel):
    repo_url: str | None = None
    project_type: str = "educational"


class TaskSubmitResponse(BaseModel):
    task_id: str
    status: str = "created"


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    content_model: Optional[dict] = None
    material_manifest: Optional[dict] = None
    script: Optional[dict] = None
    blueprint: Optional[dict] = None
    video_mp4_path: Optional[str] = None
    final_mp4_path: Optional[str] = None
    trending_repos: Optional[list[dict]] = None


class TaskResumeRequest(BaseModel):
    """Resume a paused (HITL) task with a human decision."""
    action: str  # approve | reject | abort
    feedback: Optional[str] = None
