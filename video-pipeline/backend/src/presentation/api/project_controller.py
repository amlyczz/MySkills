from fastapi import APIRouter, Depends, HTTPException, Query
import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.project.entities import Project
from ...domain.task.entities import PipelineTask, PipelineStatus
from ...infrastructure.project.postgres_models import ProjectDB
from ...infrastructure.project.postgres_repository import PostgresProjectRepository
from ...infrastructure.task.connection import get_db_session
from ...infrastructure.task.postgres_models import PipelineTaskDB
from ..dtos.project_dtos import (
    CreateProjectRequest,
    ProjectResponse,
    ProjectListResponse,
    ProjectSubmitTaskRequest,
)

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def _project_to_response(p: Project, task_count: int = 0) -> ProjectResponse:
    return ProjectResponse(
        id=str(p.id),
        name=p.name,
        source_type=p.source_type.value,
        repo_url=p.repo_url,
        description=p.description,
        language=p.language,
        stars=p.stars,
        thumbnail_url=p.thumbnail_url,
        task_count=task_count,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.post("", response_model=ProjectResponse)
async def create_project(
    req: CreateProjectRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ProjectResponse:
    repo = PostgresProjectRepository(session)
    project = Project(
        name=req.name,
        source_type=req.source_type,
        repo_url=req.repo_url,
    )
    saved = await repo.save(project)
    await session.commit()
    return _project_to_response(saved)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> ProjectListResponse:
    repo = PostgresProjectRepository(session)
    projects, total = await repo.list_projects(page=page, page_size=page_size, search=search)

    # Get task counts for all projects in one query
    project_ids = [p.id for p in projects]
    task_counts: dict[str, int] = {}
    if project_ids:
        stmt = (
            select(PipelineTaskDB.project_id, func.count(PipelineTaskDB.id))
            .where(PipelineTaskDB.project_id.in_(project_ids))
            .group_by(PipelineTaskDB.project_id)
        )
        result = await session.execute(stmt)
        task_counts = {str(row[0]): row[1] for row in result.all()}

    return ProjectListResponse(
        projects=[_project_to_response(p, task_counts.get(str(p.id), 0)) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> ProjectResponse:
    try:
        uid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    repo = PostgresProjectRepository(session)
    project = await repo.get_by_id(uid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Task count
    count_stmt = select(func.count(PipelineTaskDB.id)).where(PipelineTaskDB.project_id == uid)
    task_count = (await session.execute(count_stmt)).scalar() or 0

    return _project_to_response(project, task_count)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    try:
        uid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    repo = PostgresProjectRepository(session)
    deleted = await repo.delete(uid)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found.")
    await session.commit()
    return {"status": "deleted"}


@router.post("/{project_id}/tasks", response_model=dict)
async def submit_task_in_project(
    project_id: str,
    req: ProjectSubmitTaskRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    try:
        uid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")

    repo = PostgresProjectRepository(session)
    project = await repo.get_by_id(uid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    repo_url = req.repo_url or project.repo_url
    if not repo_url and project.source_type.value != "trending":
        raise HTTPException(status_code=400, detail="repo_url is required for github_repo projects.")

    task_id = uuid.uuid4()
    task = PipelineTask(
        id=task_id,
        repo_url=repo_url or "",
        status=PipelineStatus.PENDING,
    )

    # Save task with project_id
    task_db = PipelineTaskDB(
        id=task.id,
        repo_url=task.repo_url,
        status=task.status,
        project_id=uid,
    )
    session.add(task_db)
    await session.commit()

    return {"task_id": str(task_id), "project_id": str(uid), "status": "created"}
