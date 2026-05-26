import logging
import uuid

logger = logging.getLogger(__name__)
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

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.COMPOSING
            task.script = script
            await self.repository.update(task)

        return PipelineState(
            task_id=state["task_id"],
            repo_url=state["repo_url"],
            script=script,
            status=PipelineStatus.COMPOSING,
        )
