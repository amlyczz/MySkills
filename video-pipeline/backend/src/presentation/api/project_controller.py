from fastapi import APIRouter, Depends, HTTPException, Query
import uuid
from ...domain.project.entities import Project
from ...domain.project.interfaces import ProjectRepository
from ...domain.task.entities import PipelineTask, PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from .dependencies import get_project_repo, get_task_repo
from ..dtos.project_dtos import (
    CreateProjectRequest,
    ProjectResponse,
    ProjectListResponse,
    ProjectSubmitTaskRequest,
)
from ..dtos.task_dtos import TaskListItem

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def _project_to_response(p: Project, task_count: int = 0) -> ProjectResponse:
    return ProjectResponse(
        id=str(p.id),
        name=p.name,
        description=p.description,
        task_count=task_count,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.post("", response_model=ProjectResponse)
async def create_project(
    req: CreateProjectRequest,
    repo: ProjectRepository = Depends(get_project_repo),
) -> ProjectResponse:
    project = Project(name=req.name)
    saved = await repo.save(project)
    return _project_to_response(saved)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    repo: ProjectRepository = Depends(get_project_repo),
) -> ProjectListResponse:
    projects, total = await repo.list_projects(page=page, page_size=page_size, search=search)

    # Get task counts for all projects in one query
    project_ids = [p.id for p in projects]
    task_counts = await repo.get_task_counts_batch(project_ids) if project_ids else {}

    return ProjectListResponse(
        projects=[_project_to_response(p, task_counts.get(str(p.id), 0)) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    repo: ProjectRepository = Depends(get_project_repo),
) -> ProjectResponse:
    try:
        uid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    project = await repo.get_by_id(uid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Task count
    counts = await repo.get_task_counts_batch([uid])
    task_count = counts.get(str(uid), 0)

    return _project_to_response(project, task_count)


@router.get("/{project_id}/tasks", response_model=list[TaskListItem])
async def list_project_tasks(
    project_id: str,
    task_repo: PipelineTaskRepository = Depends(get_task_repo),
) -> list[TaskListItem]:
    """List all tasks belonging to a project."""
    try:
        uid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    tasks = await task_repo.list_by_project(uid)

    return [
        TaskListItem(
            task_id=str(task.id),
            repo_url=task.repo_url or "",
            status=task.status.value if task.status else "pending",
            created_at=task.created_at.isoformat() if task.created_at else None,
            updated_at=task.updated_at.isoformat() if task.updated_at else None,
        )
        for task in tasks
    ]


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    repo: ProjectRepository = Depends(get_project_repo),
) -> dict:
    try:
        uid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    deleted = await repo.delete(uid)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found.")
    return {"status": "deleted"}


@router.post("/{project_id}/tasks", response_model=dict)
async def submit_task_in_project(
    project_id: str,
    req: ProjectSubmitTaskRequest,
    repo: ProjectRepository = Depends(get_project_repo),
    task_repo: PipelineTaskRepository = Depends(get_task_repo),
) -> dict:
    try:
        uid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    project = await repo.get_by_id(uid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    repo_url = req.repo_url or req.twitter_url
    if not repo_url:
        raise HTTPException(status_code=400, detail="repo_url or twitter_url is required.")

    task_id = uuid.uuid4()
    task = PipelineTask(
        id=task_id,
        repo_url=repo_url,
        status=PipelineStatus.PENDING,
        project_id=uid,
    )

    await task_repo.save(task)

    return {"task_id": str(task_id), "project_id": str(uid), "status": "created"}

