import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.blueprint.interfaces import BlueprintComposer
from ..workflow.state import PipelineState

class GenerateBlueprintUseCase:
    
    def __init__(
        self,
        composer: BlueprintComposer,
        repository: PipelineTaskRepository,
    ) -> None:
        self.composer = composer
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running GenerateBlueprint")
        
        script = state["video_script"]
        analysis = state["repo_analysis"]
        if not script or not analysis:
            raise ValueError("Video script or repository analysis is missing in state.")

        # Dynamic AI Agent visual orchestration
        blueprint = await self.composer.compose_blueprint(script, analysis)

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
