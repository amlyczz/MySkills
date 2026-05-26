import logging
import uuid

logger = logging.getLogger(__name__)
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.visual_blueprint.interfaces import BlueprintComposer
from ..workflow.state import PipelineState


class GenerateBlueprintUseCase:

    def __init__(
        self,
        composer: BlueprintComposer,
        repository: PipelineTaskRepository,
    ) -> None:
        self.composer = composer
        self.repository = repository

    async def __call__(self, state: PipelineState) -> PipelineState:
        # Skip-if-done guard: if blueprint exists and no QA feedback, skip
        # (blueprint was produced in a previous run — preserve it)
        if state.get("blueprint") is not None and state.get("qa_blueprint_feedback") is None:
            logger.info("[UseCase] GenerateBlueprint: skipping (blueprint already in state)")
            return PipelineState(
                task_id=state["task_id"],
                repo_url=state["repo_url"],
                blueprint=state["blueprint"],
                status=PipelineStatus.BLUEPRINTING,
            )

        logger.info("[UseCase] Running GenerateBlueprint")

        script = state.get("script")
        content_model = state.get("content_model")
        if script is None or content_model is None:
            raise ValueError("Script or ContentModel is missing in state.")

        # AI Agent visual orchestration → full Remotion Blueprint
        # Pass QA feedback from previous failed attempt if available
        blueprint = await self.composer.compose_blueprint(
            script,
            content_model,
            qa_feedback=state.get("qa_blueprint_feedback"),
            domain_analysis=state.get("domain_analysis"),
        )

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.BLUEPRINTING
            task.blueprint = blueprint
            await self.repository.update(task)

        return PipelineState(
            task_id=state["task_id"],
            repo_url=state["repo_url"],
            blueprint=blueprint,
            status=PipelineStatus.BLUEPRINTING,
        )
