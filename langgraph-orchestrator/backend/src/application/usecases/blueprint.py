import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.blueprint.entities import Blueprint, SceneConfig
from ..workflow.state import PipelineState

class GenerateBlueprintUseCase:
    
    def __init__(self, repository: PipelineTaskRepository) -> None:
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running GenerateBlueprint")
        
        script = state["video_script"]
        if not script:
            raise ValueError("Video script is missing in state.")

        scenes = []
        for s in script.segments:
            layout_id = "center-layout" if s.visual_type == "intro" else "split-layout"
            
            motion_map = {
                "title": "scale-bounce",
                "narration": "fade-up",
            }
            
            content = {
                "text": s.text,
                "voiceover_prompt": s.voiceover_prompt or "",
            }
            
            scene = SceneConfig(
                layoutId=layout_id,
                motionMap=motion_map,
                content=content,
            )
            scenes.append(scene)

        blueprint = Blueprint(
            durationInFrames=1800,
            scenes=scenes,
        )

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.BLUEPRINTING
            task.blueprint = blueprint
            await self.repository.update(task)

        return {
            "blueprint": blueprint,
            "status": PipelineStatus.BLUEPRINTING,
        }
