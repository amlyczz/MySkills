from abc import ABC, abstractmethod
from typing import Optional
from .entities import Project
import uuid


class ProjectRepository(ABC):

    @abstractmethod
    async def save(self, project: Project) -> Project: ...

    @abstractmethod
    async def get_by_id(self, project_id: uuid.UUID) -> Optional[Project]: ...

    @abstractmethod
    async def list_projects(
        self, page: int = 1, page_size: int = 20, search: Optional[str] = None
    ) -> tuple[list[Project], int]: ...

    @abstractmethod
    async def delete(self, project_id: uuid.UUID) -> bool: ...
