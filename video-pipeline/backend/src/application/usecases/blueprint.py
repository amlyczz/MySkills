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
            return {**state}

        task_id = uuid.UUID(state["task_id"])

        # ① Enter node: mark active immediately
        await self.status_service.transition(
            task_id, PipelineStatus.BLUEPRINTING, node="generate_blueprint"
        )

        logger.info("[UseCase] Running GenerateBlueprint")

        script = state.get("script")
        content_model = state.get("content_model")
        twitter_content = state.get("twitter_content")

        if script is None:
            raise ValueError("Script is missing in state.")
        if content_model is None and twitter_content is None:
            raise ValueError("Neither ContentModel nor twitter_content is available in state.")

        # For Twitter tasks: build a minimal ContentModel from twitter_content
        if content_model is None and twitter_content is not None:
            from ...domain.repo_analyzer.entities import ContentModel, ProjectEncyclopedia
            from ...domain.repo_analyzer.source_metadata import GitHubSourceMeta
            tc = twitter_content
            content_model = ContentModel(
                source=GitHubSourceMeta(
                    source_type="github",
                    url=state.get("repo_url", ""),
                    name=tc.handle,
                    full_name=tc.author,
                ),
                content=ProjectEncyclopedia(
                    title=tc.title,
                    tagline=tc.summary,
                    quick_start="",
                    usage_intro="",
                    use_cases=tc.main_tweet_text[:500],
                    architecture_breakdown=tc.thread_context.narrative_flow,
                    domain_specific_insights=tc.community_sentiment.overall_tone,
                ),
                curated_materials=tc.media_urls,
            )

        # AI Agent visual orchestration → full Remotion Blueprint
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
