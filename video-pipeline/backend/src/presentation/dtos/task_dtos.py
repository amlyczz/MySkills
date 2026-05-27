from typing import Optional
from pydantic import BaseModel

from ...domain.repo_analyzer.entities import ContentModel, MaterialManifest, Script
from ...domain.twitter_analyzer.entities import TwitterContentModel
from ...domain.visual_blueprint.entities import Blueprint
from ...domain.github_trending.entities import ScoredRepo


class TaskSubmitRequest(BaseModel):
    repo_url: str | None = None
    twitter_url: str | None = None


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

    # Node-level progress (eliminates frontend guesswork)
    current_node: Optional[str] = None
    completed_nodes: list[str] = []
    failed_node: Optional[str] = None
    node_error: Optional[str] = None

    # Domain data
    content_model: Optional[ContentModel] = None
    twitter_content: Optional[TwitterContentModel] = None
    material_manifest: Optional[MaterialManifest] = None
    script: Optional[Script] = None
    blueprint: Optional[Blueprint] = None
    video_mp4_path: Optional[str] = None
    final_mp4_path: Optional[str] = None
    trending_repos: Optional[list[ScoredRepo]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TaskResumeRequest(BaseModel):
    """Resume a paused (HITL) task with a human decision."""
    action: str  # approve | reject | abort
    feedback: Optional[str] = None


class DagNodeResponse(BaseModel):
    id: str
    label: str
    icon: str
    type: str
    position: dict
    state: str
    status_label: str


class DagEdgeResponse(BaseModel):
    id: str
    source: str
    target: str


class DagSnapshotResponse(BaseModel):
    task_id: str
    nodes: list[DagNodeResponse]
    edges: list[DagEdgeResponse]
    active_path_nodes: list[str]
    pipeline_status: str
    source_type: str
