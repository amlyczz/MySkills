from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...domain.project.interfaces import ProjectRepository
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.github_trending.interfaces import TrendingScraper

from ...infrastructure.task.connection import get_db_session
from ...infrastructure.project.postgres_repository import PostgresProjectRepository
from ...infrastructure.task.postgres_repository import PostgresPipelineTaskRepository
from ...infrastructure.github.trending_scraper import GitHubTrendingScraper


async def get_project_repo(session: AsyncSession = Depends(get_db_session)) -> ProjectRepository:
    """Provides an instance of ProjectRepository."""
    return PostgresProjectRepository(session)


async def get_task_repo(session: AsyncSession = Depends(get_db_session)) -> PipelineTaskRepository:
    """Provides an instance of PipelineTaskRepository."""
    return PostgresPipelineTaskRepository(session)


async def get_trending_scraper() -> TrendingScraper:
    """Provides an instance of TrendingScraper."""
    return GitHubTrendingScraper()
