import asyncio
import os
import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.visual_blueprint.interfaces import VideoRenderer
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir


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

            output_dir = resolve_output_dir(state)
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
