import asyncio
import os
import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.blueprint.interfaces import VideoRenderer
from ..workflow.state import PipelineState

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
            
            blueprint = state["blueprint"]
            if not blueprint:
                raise ValueError("Blueprint is missing in state.")
                
            video_output_dir = "x:\\home\\zand\\proj\\MySkills\\output"
            os.makedirs(video_output_dir, exist_ok=True)
            video_path = os.path.join(video_output_dir, f"video_{state['task_id']}.mp4")
            
            # Execute visual rendering via VideoRenderer interface
            await self.renderer.render_video(blueprint, video_path)
            
            # Synchronize DB state
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
