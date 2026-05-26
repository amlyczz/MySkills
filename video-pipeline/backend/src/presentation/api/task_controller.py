from fastapi import APIRouter, Depends, HTTPException
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.task.entities import PipelineTask, PipelineStatus
from ...infrastructure.task.connection import get_db_session
from ...infrastructure.task.postgres_repository import PostgresPipelineTaskRepository
from ...infrastructure.task.postgres_models import PipelineTaskDB
from ..dtos.task_dtos import TaskSubmitRequest, TaskSubmitResponse, TaskStatusResponse

router = APIRouter(prefix="/api/v1/task", tags=["task"])


@router.post("/submit", response_model=TaskSubmitResponse)
async def submit_task(req: TaskSubmitRequest, session: AsyncSession = Depends(get_db_session)) -> TaskSubmitResponse:
    """Submits a repository URL to register a pipeline task in the database."""
    repo = PostgresPipelineTaskRepository(session)
    task_id = uuid.uuid4()

    task = PipelineTask(
        id=task_id,
        repo_url=req.repo_url or "",
        status=PipelineStatus.PENDING,
    )
    await repo.save(task)

    return TaskSubmitResponse(task_id=str(task_id), status="created")


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, session: AsyncSession = Depends(get_db_session)) -> TaskStatusResponse:
    """Retrieves the execution status and output files of a specific task."""
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    repo = PostgresPipelineTaskRepository(session)
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
        content_model=task.content_model.model_dump() if task.content_model else None,
        material_manifest=task.material_manifest.model_dump() if task.material_manifest else None,
        script=task.script.model_dump() if task.script else None,
        blueprint=task.blueprint.model_dump() if task.blueprint else None,
        video_mp4_path=task.video_mp4_path,
        final_mp4_path=task.final_mp4_path,
        trending_repos=[r.model_dump() for r in task.trending_repos] if task.trending_repos else None,
        created_at=task.created_at.isoformat() if task.created_at else None,
        updated_at=task.updated_at.isoformat() if task.updated_at else None,
    )


@router.delete("/{task_id}")
async def delete_task(task_id: str, session: AsyncSession = Depends(get_db_session)) -> dict:
    """Delete a task by ID."""
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    result = await session.execute(
        select(PipelineTaskDB).where(PipelineTaskDB.id == uid)
    )
    task_db = result.scalars().first()
    if not task_db:
        raise HTTPException(status_code=404, detail="Task not found.")

    await session.delete(task_db)
    await session.commit()
    return {"status": "deleted"}
