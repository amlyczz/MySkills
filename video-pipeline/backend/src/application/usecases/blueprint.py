import logging
import uuid

logger = logging.getLogger(__name__)
from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.visual_blueprint.interfaces import BlueprintComposer
from ..workflow.state import PipelineState


class GenerateBlueprintUseCase:

    def __init__(
        self,
        composer: BlueprintComposer,
        repository: PipelineTaskRepository,
        status_service: StatusTransitionService,
    ) -> None:
        self.composer = composer
        self.repository = repository
        self.status_service = status_service

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

        task_id = uuid.UUID(state["task_id"])

        # ① Enter node: mark active immediately
        await self.status_service.transition(
            task_id, PipelineStatus.BLUEPRINTING, node="generate_blueprint"
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

        # ② Complete node: update via FSM
        await self.status_service.mark_node_completed(
            task_id, "generate_blueprint",
            updates={"status": PipelineStatus.BLUEPRINTING, "blueprint": blueprint},
        )

        return PipelineState(
            task_id=state["task_id"],
            repo_url=state["repo_url"],
            blueprint=blueprint,
            status=PipelineStatus.BLUEPRINTING,
        )
