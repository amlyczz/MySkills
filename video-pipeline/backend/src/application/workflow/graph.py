import asyncio
import logging
from typing import Any, Optional

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.types import interrupt

logger = logging.getLogger(__name__)

from ..workflow.state import PipelineState
from ..usecases.analyze import AnalyzeRepoUseCase
from ..usecases.compose import ComposeScriptUseCase
from ..usecases.generate_diagrams import GenerateDiagramsUseCase
from ..usecases.blueprint import GenerateBlueprintUseCase
from ..usecases.audio_design import AudioDesignUseCase
from ..usecases.render_compose import RenderComposeUseCase
from ..usecases.analyze_twitter import AnalyzeTwitterUseCase
from ..usecases.github_trending import GithubTrendingUseCase
from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.repo_analyzer.interfaces import RepoAnalyzer
from ...domain.twitter_analyzer.interfaces import TwitterScraper, TwitterAnalyzer
from ...domain.script_composer.interfaces import ScriptComposer
from ...domain.visual_blueprint.interfaces import BlueprintComposer, VideoRenderer
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator, AudioMixer


def route_source(state: PipelineState) -> str:
    """Route to the correct entry node based on source_type."""
    source_type = state.get("source_type", "github_trending")
    status = state.get("status")
    if status == PipelineStatus.ERROR:
        return END
    if source_type == "twitter":
        return "analyze_twitter"
    if source_type == "github_url":
        return "analyze_repo"
    return "github_trending"


def route_trending(state: PipelineState) -> str:
    status = state.get("status")
    if status == PipelineStatus.ERROR:
        return END
    if status == PipelineStatus.HITL_TRENDING:
        return "hitl_trending_review"
    return "analyze_repo"


def route_hitl_trending(state: PipelineState) -> str:
    status = state.get("status")
    if status == PipelineStatus.ERROR:
        return END
    if state.get("hitl_trending_feedback"):
        return "github_trending"
    return "analyze_repo"


async def hitl_trending_review_node(state: PipelineState) -> PipelineState:
    """HITL breakpoint for Github Trending selection."""
    repo_url = state.get("repo_url", "")
    # Auto-approve guard: if repo_url is a real URL (not placeholder), skip interrupt
    if repo_url and repo_url not in ("", "pending", "trending"):
        return {**state, "hitl_trending_feedback": None, "status": PipelineStatus.PENDING}

    decision = interrupt({
        "reason": "trending_review",
        "repos": [r.model_dump() for r in state.get("trending_repos") or []],
        "message": "Review trending repositories. Choose: select | retry | abort",
    })
    action = decision.get("action", "abort")

    if action == "select":
        selected_url = decision.get("repo_url", repo_url)
        logger.info("[HITL] Trending review selected: %s (was %s)", selected_url[:60] if selected_url else "?", repo_url[:60] if repo_url else "?")
        return {**state, "repo_url": selected_url, "hitl_trending_feedback": None, "status": PipelineStatus.PENDING}
    elif action == "retry":
        return {**state, "hitl_trending_feedback": decision.get("feedback"), "status": PipelineStatus.PENDING}
    else:
        return {**state, "status": PipelineStatus.ERROR, "error": "Aborted by user during trending review"}


async def hitl_script_review_node(state: PipelineState) -> PipelineState:
    """HITL breakpoint for script review — always triggers after compose_script."""
    # Auto-approve guard: if a downstream blueprint exists, it means this script
    # was already approved in a previous run. Skip the manual review interrupt.
    if state.get("blueprint") is not None:
        return {**state, "status": PipelineStatus.COMPOSING, "qa_script_feedback": None}

    script = state.get("script")
    decision = interrupt({
        "reason": "script_review",
        "message": "Review the generated script. Approve or reject with feedback.",
        "script": {
            "full_text": script.full_text if script else "",
            "total_duration_est": script.total_duration_est if script else 0,
            "segments": [
                {
                    "index": i,
                    "text": seg.text,
                    "duration_est": seg.duration_est,
                    "assigned_asset": seg.assigned_asset,
                    "visual_hook": seg.visual_hook,
                }
                for i, seg in enumerate(script.segments)
            ] if script else [],
        },
    })
    action = decision.get("action", "approve")

    if action == "approve":
        return {**state, "qa_script_feedback": None, "status": PipelineStatus.COMPOSING}
    elif action == "reject":
        feedback = decision.get("feedback", "")
        return {**state, "qa_script_feedback": feedback, "status": PipelineStatus.COMPOSING}
    else:
        return {**state, "status": PipelineStatus.ERROR, "error": "Aborted by user during script review"}


async def hitl_blueprint_review_node(state: PipelineState) -> PipelineState:
    """HITL breakpoint for blueprint review — always triggers after generate_blueprint."""
    # Auto-approve guard: if downstream media exists, it means this blueprint
    # was already approved in a previous run. Skip the manual review interrupt.
    if state.get("voiceover_path") is not None or state.get("video_mp4_path") is not None:
        return {**state, "status": PipelineStatus.BLUEPRINTING}

    import json
    import os

    blueprint = state.get("blueprint")

    # Write blueprint to Remotion public folder for preview
    preview_url = ""
    if blueprint:
        try:
            from ...infrastructure.config.app_config import PROJECT_ROOT
            remotion_public = PROJECT_ROOT / "frontend" / "remotion" / "public"
            os.makedirs(remotion_public, exist_ok=True)
            preview_path = remotion_public / "preview.json"
            with open(preview_path, "w", encoding="utf-8") as f:
                json.dump(blueprint.model_dump(exclude_none=True, by_alias=True), f, ensure_ascii=False, indent=2)
            preview_url = "http://localhost:31200/"
        except Exception as e:
            logger.warning("Failed to write preview.json: %s", e)

    total_frames = sum(s.durationInFrames for s in blueprint.scenes) if blueprint and blueprint.scenes else 0
    total_seconds = total_frames / 30

    decision = interrupt({
        "reason": "blueprint_review",
        "message": "Review the visual blueprint in Remotion Studio. Approve or reject with feedback.",
        "preview_url": preview_url,
        "scene_count": len(blueprint.scenes) if blueprint and blueprint.scenes else 0,
        "total_duration_frames": total_frames,
        "total_duration_seconds": round(total_seconds, 1),
    })
    action = decision.get("action", "approve")

    if action == "approve":
        return {**state, "qa_blueprint_feedback": None, "status": PipelineStatus.BLUEPRINTING}
    elif action == "reject":
        feedback = decision.get("feedback", "")
        return {**state, "qa_blueprint_feedback": feedback, "status": PipelineStatus.BLUEPRINTING}
    else:
        return {**state, "status": PipelineStatus.ERROR, "error": "Aborted by user during blueprint review"}


def compile_workflow(
    analyzer: RepoAnalyzer,
    composer: ScriptComposer,
    twitter_scraper: TwitterScraper,
    twitter_analyzer: TwitterAnalyzer,
    blueprint_composer: BlueprintComposer,
    video_renderer: VideoRenderer,
    voiceover_gen: VoiceoverGenerator,
    bgm_gen: BGMGenerator,
    audio_mixer: AudioMixer,
    repository: PipelineTaskRepository,
    semaphore: asyncio.Semaphore,
    status_service: StatusTransitionService,
    checkpointer: Optional[BaseCheckpointSaver] = None,
    trending_scorer: Optional[object] = None,
) -> Any:
    """Compiles the LangGraph StateGraph with DDD-injected services and HITL support."""
    analyze_repo_uc = AnalyzeRepoUseCase(analyzer, repository, status_service)
    analyze_twitter_uc = AnalyzeTwitterUseCase(twitter_scraper, twitter_analyzer, repository, status_service)
    compose_script_uc = ComposeScriptUseCase(composer, repository, status_service)
    generate_diagrams_uc = GenerateDiagramsUseCase(repository, status_service)
    generate_blueprint_uc = GenerateBlueprintUseCase(blueprint_composer, repository, status_service)
    audio_design_uc = AudioDesignUseCase(voiceover_gen, bgm_gen, repository, status_service)
    render_compose_uc = RenderComposeUseCase(video_renderer, audio_mixer, repository, semaphore, status_service)

    async def analyze_repo_node(state: PipelineState) -> PipelineState:
        """Wrapper that catches exceptions and routes to review instead of crashing."""
        try:
            return await analyze_repo_uc(state)
        except Exception as e:
            logger.exception("[analyze_repo] Unhandled exception, routing to review: %s", e)
            return {**state, "status": PipelineStatus.ERROR, "error": str(e)}

    workflow = StateGraph(PipelineState)

    # Nodes
    workflow.add_node("github_trending", GithubTrendingUseCase(repository, status_service, trending_scorer=trending_scorer))
    workflow.add_node("hitl_trending_review", hitl_trending_review_node)
    workflow.add_node("analyze_repo", analyze_repo_node)
    workflow.add_node("analyze_twitter", analyze_twitter_uc)
    workflow.add_node("compose_script", compose_script_uc)
    workflow.add_node("hitl_script_review", hitl_script_review_node)
    workflow.add_node("generate_diagrams", generate_diagrams_uc)
    workflow.add_node("generate_blueprint", generate_blueprint_uc)
    workflow.add_node("hitl_blueprint_review", hitl_blueprint_review_node)
    workflow.add_node("audio_design", audio_design_uc)
    workflow.add_node("render_compose", render_compose_uc)

    # Edges
    workflow.set_conditional_entry_point(route_source)
    workflow.add_conditional_edges("github_trending", route_trending)
    workflow.add_conditional_edges("hitl_trending_review", route_hitl_trending)
    workflow.add_edge("analyze_repo", "compose_script")
    workflow.add_edge("analyze_twitter", "compose_script")
    workflow.add_edge("compose_script", "hitl_script_review")
    workflow.add_conditional_edges("hitl_script_review", lambda state: (
        END if state.get("status") == PipelineStatus.ERROR
        else "compose_script" if state.get("qa_script_feedback")
        else "generate_diagrams"
    ))
    workflow.add_edge("generate_diagrams", "generate_blueprint")
    workflow.add_edge("generate_blueprint", "hitl_blueprint_review")
    workflow.add_conditional_edges("hitl_blueprint_review", lambda state: (
        END if state.get("status") == PipelineStatus.ERROR
        else "generate_blueprint" if state.get("qa_blueprint_feedback")
        else "audio_design"
    ))
    workflow.add_edge("audio_design", "render_compose")
    workflow.add_edge("render_compose", END)

    return workflow.compile(checkpointer=checkpointer)
