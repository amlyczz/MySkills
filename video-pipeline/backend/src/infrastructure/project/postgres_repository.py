import uuid
from typing import Optional

from sqlalchemy import select, func, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.project.entities import Project
from ...domain.project.interfaces import ProjectRepository
from .postgres_models import ProjectDB


def _to_entity(row: ProjectDB) -> Project:
    return Project(
        id=row.id,
        name=row.name,
        description=row.description,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class PostgresProjectRepository(ProjectRepository):

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, project: Project) -> Project:
        row = ProjectDB(
            id=project.id,
            name=project.name,
            description=project.description,
        )
        self._session.add(row)
        await self._session.commit()
        return project

    async def get_by_id(self, project_id: uuid.UUID) -> Optional[Project]:
        stmt = select(ProjectDB).where(ProjectDB.id == project_id)
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        return _to_entity(row) if row else None

    async def list_projects(
        self, page: int = 1, page_size: int = 20, search: Optional[str] = None
    ) -> tuple[list[Project], int]:
        # Count
        count_stmt = select(func.count(ProjectDB.id))
        if search:
            count_stmt = count_stmt.where(ProjectDB.name.ilike(f"%{search}%"))
        total = (await self._session.execute(count_stmt)).scalar() or 0

        # Query
        stmt = select(ProjectDB).order_by(ProjectDB.updated_at.desc())
        if search:
            stmt = stmt.where(ProjectDB.name.ilike(f"%{search}%"))
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self._session.execute(stmt)
        rows = result.scalars().all()
        return [_to_entity(r) for r in rows], total

    async def delete(self, project_id: uuid.UUID) -> bool:
        stmt = sa_delete(ProjectDB).where(ProjectDB.id == project_id)
        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.rowcount > 0

    async def get_task_counts_batch(self, project_ids: list[uuid.UUID]) -> dict[str, int]:
        from ...infrastructure.task.postgres_models import PipelineTaskDB
        if not project_ids:
            return {}
        stmt = (
            select(PipelineTaskDB.project_id, func.count(PipelineTaskDB.id))
            .where(PipelineTaskDB.project_id.in_(project_ids))
            .group_by(PipelineTaskDB.project_id)
        )
        result = await self._session.execute(stmt)
        return {str(row[0]): row[1] for row in result.all()}
