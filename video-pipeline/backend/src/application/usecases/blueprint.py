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

        script = state.get("script")
        content_model = state.get("content_model")
        if not script or not content_model:
            raise ValueError("Script or ContentModel is missing in state.")

        # AI Agent visual orchestration → full Remotion Blueprint
        # Pass QA feedback from previous failed attempt if available
        qa_feedback = state.get("qa_blueprint_feedback")
        domain_analysis = state.get("domain_analysis")
        blueprint = await self.composer.compose_blueprint(
            script, content_model,
            qa_feedback=qa_feedback,
            domain_analysis=domain_analysis,
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
