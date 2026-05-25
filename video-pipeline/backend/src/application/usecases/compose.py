import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.script_composer.interfaces import ScriptComposer
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

        content_model = state.get("content_model")
        if not content_model:
            raise ValueError("ContentModel is missing in state.")

        # Generate script from ContentModel via ScriptComposer interface
        # Pass QA feedback from previous failed attempt if available
        qa_feedback = state.get("qa_script_feedback")
        domain_analysis = state.get("domain_analysis")
        script = await self.composer.compose_script(
            content_model,
            target_duration=60,
            domain_analysis=domain_analysis,
            qa_feedback=qa_feedback
        )

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.COMPOSING
            task.script = script
            await self.repository.update(task)

        return {
            "script": script,
            "status": PipelineStatus.COMPOSING,
        }
