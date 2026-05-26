import logging
import uuid

logger = logging.getLogger(__name__)
from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.script_composer.interfaces import ScriptComposer
from ..workflow.state import PipelineState


class ComposeScriptUseCase:

    def __init__(
        self,
        composer: ScriptComposer,
        repository: PipelineTaskRepository,
        status_service: StatusTransitionService,
    ) -> None:
        self.composer = composer
        self.repository = repository
        self.status_service = status_service

    async def __call__(self, state: PipelineState) -> PipelineState:
        # Skip-if-done guard: if script exists and no QA feedback, skip
        # (script was produced in a previous run — preserve it, don't re-run)
        if state.get("script") is not None and state.get("qa_script_feedback") is None:
            logger.info("[UseCase] ComposeScript: skipping (script already in state)")
            return PipelineState(
                task_id=state["task_id"],
                repo_url=state["repo_url"],
                script=state["script"],
                status=PipelineStatus.COMPOSING,
            )

        task_id = uuid.UUID(state["task_id"])

        # ① Enter node: mark active immediately
        await self.status_service.transition(
            task_id, PipelineStatus.COMPOSING, node="compose_script"
        )

        logger.info("[UseCase] Running ComposeScript")

        if state.get("content_model") is None:
            raise ValueError("ContentModel is missing in state.")

        # Generate script from ContentModel via ScriptComposer interface
        # Pass QA feedback from previous failed attempt if available
        script = await self.composer.compose_script(
            state["content_model"],
            target_duration=0,
            domain_analysis=state.get("domain_analysis"),
            qa_feedback=state.get("qa_script_feedback"),
        )

        # ② Complete node: update via FSM
        await self.status_service.mark_node_completed(
            task_id, "compose_script",
            updates={"status": PipelineStatus.COMPOSING, "script": script},
        )

        return PipelineState(
            task_id=state["task_id"],
            repo_url=state["repo_url"],
            script=script,
            status=PipelineStatus.COMPOSING,
        )
