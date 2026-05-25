import asyncio
import os
import uuid
from datetime import datetime
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.blueprint.interfaces import VideoRenderer
from ...infrastructure.config.app_config import PROJECT_ROOT
from ..workflow.state import PipelineState


def _resolve_output_dir(state: PipelineState) -> str:
    """Compute output directory following convention: output/{source}/{date}/{repo_name}/"""
    source = state.get("project_category", "github")
    date_str = datetime.now().strftime("%Y-%m-%d")
    repo_url = state.get("repo_url", "unknown")
    repo_name = repo_url.rstrip("/").split("/")[-1] if "/" in repo_url else "unknown"
    output_dir = str(PROJECT_ROOT / "output" / source / date_str / repo_name)
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


class RenderVideoUseCase:

    def __init__(
        self,
        renderer: VideoRenderer,
        repository: PipelineTaskRepository,
        semaphore: asyncio.Semaphore,
    ) -> None:
        self.renderer = renderer
        self.repository = repository
        self.semaphore = semaphore

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Waiting for rendering slot...")

        async with self.semaphore:
            print("[UseCase] Acquired slot. Invoking VideoRenderer...")

            blueprint = state.get("blueprint")
            if not blueprint:
                raise ValueError("Blueprint is missing in state.")

            output_dir = _resolve_output_dir(state)
            video_path = os.path.join(output_dir, "video.mp4")

            await self.renderer.render_video(blueprint, video_path)

            task_id = uuid.UUID(state["task_id"])
            task = await self.repository.get_by_id(task_id)
            if task:
                task.status = PipelineStatus.RENDERING
                task.video_mp4_path = video_path
                await self.repository.update(task)

            return {
                "video_mp4_path": video_path,
                "status": PipelineStatus.RENDERING,
            }
