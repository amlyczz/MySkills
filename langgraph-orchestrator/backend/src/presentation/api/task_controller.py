from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.task.entities import PipelineTask, PipelineStatus
from ...infrastructure.task.connection import get_db_session
from ...infrastructure.task.postgres_repository import PostgresPipelineTaskRepository

router = APIRouter(prefix="/api/v1/task", tags=["task"])

class TaskSubmitRequest(BaseModel):
    repo_url: str
    project_type: str = "educational"

@router.post("/submit")
async def submit_task(req: TaskSubmitRequest, session: AsyncSession = Depends(get_db_session)) -> dict[str, str]:
    """
    Submits a repository URL to register a pipeline task in the database.
    """
    repo = PostgresPipelineTaskRepository(session)
    task_id = uuid.uuid4()
    
    task = PipelineTask(
        id=task_id,
        repo_url=req.repo_url,
        status=PipelineStatus.PENDING,
    )
    await repo.save(task)
    
    return {"task_id": str(task_id), "status": "created"}

@router.get("/{task_id}")
async def get_task_status(task_id: str, session: AsyncSession = Depends(get_db_session)) -> dict[str, object]:
    """
    Retrieves the execution status and output files of a specific task.
    """
    try:
        uid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")
        
    repo = PostgresPipelineTaskRepository(session)
    task = await repo.get_by_id(uid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
        
    return {
        "task_id": str(task.id),
        "status": task.status.value,
        "repo_analysis": task.repo_analysis.model_dump() if task.repo_analysis else None,
        "video_script": task.video_script.model_dump() if task.video_script else None,
        "blueprint": task.blueprint.model_dump() if task.blueprint else None,
        "video_mp4_path": task.video_mp4_path,
        "final_mp4_path": task.final_mp4_path,
    }
