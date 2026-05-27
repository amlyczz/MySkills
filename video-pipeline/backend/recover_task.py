import asyncio
import uuid
import sys
import os

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "src")))

from src.infrastructure.task.connection import get_db_session
from src.infrastructure.task.postgres_repository import PostgresPipelineTaskRepository
from src.infrastructure.project.postgres_models import ProjectDB  # noqa: F401 — registers projects table in metadata
from src.domain.task.entities import PipelineStatus

async def main():
    async for session in get_db_session():
        repo = PostgresPipelineTaskRepository(session)
        task_id = uuid.UUID("36607180-1744-4d61-9a6b-444dbfc4b689")
        task = await repo.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.ERROR
            task.failed_node = "compose_script"
            task.node_error = "Client disconnected due to frontend HMR hot-reload"
            task.current_node = None
            await repo.update(task)
            print("Successfully transitioned stuck task to ERROR status in DB!")
        else:
            print("Task not found in DB.")
        break

if __name__ == "__main__":
    asyncio.run(main())
