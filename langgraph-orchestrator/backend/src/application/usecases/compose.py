import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.composer.interfaces import ScriptComposer
from ..workflow.state import PipelineState

class ComposeScriptUseCase:
    
    def __init__(
        self,
        composer: ScriptComposer,
        repository: PipelineTaskRepository,
    ) -> None:
        self.composer = composer
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running ComposeScript")
        
        analysis = state["repo_analysis"]
        if not analysis:
            raise ValueError("Repository analysis is missing in state.")

        # Generate a video script via ScriptComposer interface
        script = await self.composer.compose_script(analysis, target_duration=60)

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.COMPOSING
            task.video_script = script
            await self.repository.update(task)

        return {
            "video_script": script,
            "status": PipelineStatus.COMPOSING,
        }
