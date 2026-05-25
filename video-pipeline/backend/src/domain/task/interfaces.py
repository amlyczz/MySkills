import uuid
from abc import ABC, abstractmethod
from typing import Optional

from .entities import PipelineTask


class PipelineTaskRepository(ABC):

    @abstractmethod
    async def save(self, task: PipelineTask) -> None:
        """Saves a new pipeline task."""
        pass

    @abstractmethod
    async def get_by_id(self, task_id: uuid.UUID) -> Optional[PipelineTask]:
        """Retrieves a pipeline task by its ID."""
        pass

    @abstractmethod
    async def update(self, task: PipelineTask) -> None:
        """Updates an existing pipeline task."""
        pass
