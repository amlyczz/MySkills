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
        if state.get("script") is not None and state.get("qa_script_feedback") is None:
            logger.info("[UseCase] ComposeScript: skipping (script already in state)")
            return {**state}

        task_id = uuid.UUID(state["task_id"])

        # ① Enter node: mark active immediately
        await self.status_service.transition(
            task_id, PipelineStatus.COMPOSING, node="compose_script"
        )

        logger.info("[UseCase] Running ComposeScript")

        content_model = state.get("content_model")
        twitter_content = state.get("twitter_content")

        if content_model is None and twitter_content is None:
            raise ValueError("Neither ContentModel nor twitter_content is available in state.")

        # Guard: if twitter_content came from a failed scrape, warn but proceed
        if twitter_content and content_model is None:
            main_text = twitter_content.main_tweet_text
            if not main_text or len(main_text.strip()) < 20:
                scrape_err = twitter_content.scrape_error or "unknown"
                raise ValueError(
                    f"Twitter scrape failed: {scrape_err}. "
                    f"No usable tweet content to compose script from."
                )
            if twitter_content.scrape_error:
                logger.warning("[ComposeScript] Twitter scrape had errors but proceeding with %d chars of raw text",
                    len(main_text))

        # Generate script from ContentModel or TwitterContent via ScriptComposer interface
        # Pass QA feedback from previous failed attempt if available
        script = await self.composer.compose_script(
            content_model,
            target_duration=420,  # ~7 min target, LLM decides 6-10 min within constraints
            domain_analysis=state.get("domain_analysis"),
            qa_feedback=state.get("qa_script_feedback"),
            twitter_content=twitter_content,
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
