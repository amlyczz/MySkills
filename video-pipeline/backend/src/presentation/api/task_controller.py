from fastapi import APIRouter, Depends, HTTPException
import uuid
from ...domain.task.entities import PipelineTask, PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.task.dag_definition import compute_dag_snapshot
from .dependencies import get_task_repo
from ..dtos.task_dtos import (
    TaskSubmitRequest, TaskSubmitResponse, TaskStatusResponse, DagSnapshotResponse,
)

router = APIRouter(prefix="/api/v1/task", tags=["task"])


@router.get("/dag", response_model=DagSnapshotResponse)
async def get_default_dag() -> DagSnapshotResponse:
    """Returns the DAG structure with all nodes idle (no task context needed)."""
    snapshot = compute_dag_snapshot(None)
    snapshot["task_id"] = ""
    return DagSnapshotResponse(**snapshot)


@router.post("/submit", response_model=TaskSubmitResponse)
async def submit_task(
    req: TaskSubmitRequest,
    repo: PipelineTaskRepository = Depends(get_task_repo)
) -> TaskSubmitResponse:
    """Submits a URL to register a pipeline task in the database."""
    task_id = uuid.uuid4()

    repo_url = req.repo_url or req.twitter_url or ""

    task = PipelineTask(
        id=task_id,
        repo_url=repo_url,
        status=PipelineStatus.PENDING,
    )
    await repo.save(task)

    return TaskSubmitResponse(task_id=str(task_id), status="created")


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    repo: PipelineTaskRepository = Depends(get_task_repo)
) -> TaskStatusResponse:
    """Retrieves the execution status and output files of a specific task."""
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    task = await repo.get_by_id(uid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    return TaskStatusResponse(
        task_id=str(task.id),
        status=task.status.value,
        repo_url=task.repo_url,
        current_node=task.current_node,
        completed_nodes=task.completed_nodes or [],
        failed_node=task.failed_node,
        node_error=task.node_error,
        content_model=task.content_model,
        twitter_content=task.twitter_content,
        material_manifest=task.material_manifest,
        script=task.script,
        blueprint=task.blueprint,
        video_mp4_path=task.video_mp4_path,
        final_mp4_path=task.final_mp4_path,
        trending_repos=task.trending_repos,
        created_at=task.created_at.isoformat() if task.created_at else None,
        updated_at=task.updated_at.isoformat() if task.updated_at else None,
    )


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    repo: PipelineTaskRepository = Depends(get_task_repo)
) -> dict:
    """Delete a task by ID."""
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    deleted = await repo.delete(uid)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found.")
    
    return {"status": "deleted"}


@router.get("/{task_id}/dag", response_model=DagSnapshotResponse)
async def get_task_dag(
    task_id: str,
    repo: PipelineTaskRepository = Depends(get_task_repo),
) -> DagSnapshotResponse:
    """Returns the full DAG structure with current node states for the frontend."""
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    task = await repo.get_by_id(uid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    snapshot = compute_dag_snapshot(task)
    snapshot["task_id"] = task_id
    return DagSnapshotResponse(**snapshot)
