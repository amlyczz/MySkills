import asyncio
from typing import Any, Optional

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.types import interrupt

from ..workflow.state import PipelineState
from ..usecases.analyze import AnalyzeRepoUseCase
from ..usecases.compose import ComposeScriptUseCase
from ..usecases.generate_diagrams import GenerateDiagramsUseCase
from ..usecases.blueprint import GenerateBlueprintUseCase
from ..usecases.audio_design import AudioDesignUseCase
from ..usecases.render_compose import RenderComposeUseCase
from ..usecases.github_trending import GithubTrendingUseCase
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.repo_analyzer.interfaces import RepoAnalyzer
from ...domain.script_composer.interfaces import ScriptComposer
from ...domain.visual_blueprint.interfaces import BlueprintComposer, VideoRenderer
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator, AudioMixer


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


async def hitl_trending_review_node(state: PipelineState) -> dict[str, object]:
    """HITL breakpoint for Github Trending selection."""
    decision = interrupt({
        "reason": "trending_review",
        "repos": [r.model_dump() for r in state.get("trending_repos", [])],
        "message": "Review trending repositories. Choose: select | retry | abort",
    })
    action = decision.get("action", "abort")

    if action == "select":
        return {"repo_url": decision.get("repo_url"), "hitl_trending_feedback": None, "status": PipelineStatus.PENDING}
    elif action == "retry":
        return {"hitl_trending_feedback": decision.get("feedback"), "status": PipelineStatus.PENDING}
    else:
        return {"status": PipelineStatus.ERROR, "error": "Aborted by user during trending review"}


async def hitl_script_review_node(state: PipelineState) -> dict[str, object]:
    """HITL breakpoint for script review — always triggers after compose_script."""
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
        return {"status": PipelineStatus.COMPOSING}
    elif action == "reject":
        feedback = decision.get("feedback", "")
        return {
            "qa_script_feedback": feedback,
            "status": PipelineStatus.COMPOSING,
        }
    else:
        return {"status": PipelineStatus.ERROR, "error": "Aborted by user during script review"}


async def hitl_blueprint_review_node(state: PipelineState) -> dict[str, object]:
    """HITL breakpoint for blueprint review — always triggers after generate_blueprint.

    Writes the blueprint JSON to the Remotion project's public folder for preview
    and returns the Remotion Studio URL.
    """
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
            print(f"[Graph] Warning: Failed to write preview.json: {e}")

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
        return {"status": PipelineStatus.BLUEPRINTING}
    elif action == "reject":
        feedback = decision.get("feedback", "")
        return {
            "qa_blueprint_feedback": feedback,
            "status": PipelineStatus.BLUEPRINTING,
        }
    else:
        return {"status": PipelineStatus.ERROR, "error": "Aborted by user during blueprint review"}


def compile_workflow(
    analyzer: RepoAnalyzer,
    composer: ScriptComposer,
    blueprint_composer: BlueprintComposer,
    video_renderer: VideoRenderer,
    voiceover_gen: VoiceoverGenerator,
    bgm_gen: BGMGenerator,
    audio_mixer: AudioMixer,
    repository: PipelineTaskRepository,
    semaphore: asyncio.Semaphore,
    checkpointer: Optional[BaseCheckpointSaver] = None,
) -> Any:
    """Compiles the LangGraph StateGraph with DDD-injected services and HITL support.

    DAG:
        github_trending → analyze_repo → compose_script → hitl_script_review
                                                            ├─ approve → generate_diagrams → generate_blueprint → hitl_blueprint_review
                                                            └─ reject → compose_script (retry)
                                                            └─ abort → END

        hitl_blueprint_review
            ├─ approve → audio_design → render_compose → END
            ├─ reject → generate_blueprint (retry)
            └─ abort → END
    """
    analyze_repo_uc = AnalyzeRepoUseCase(analyzer, repository)
    compose_script_uc = ComposeScriptUseCase(composer, repository)
    generate_diagrams_uc = GenerateDiagramsUseCase(repository)
    generate_blueprint_uc = GenerateBlueprintUseCase(blueprint_composer, repository)
    audio_design_uc = AudioDesignUseCase(voiceover_gen, bgm_gen, repository)
    render_compose_uc = RenderComposeUseCase(video_renderer, audio_mixer, repository, semaphore)

    workflow = StateGraph(PipelineState)

    # Nodes
    workflow.add_node("github_trending", GithubTrendingUseCase(repository))
    workflow.add_node("analyze_repo", analyze_repo_uc)
    workflow.add_node("compose_script", compose_script_uc)
    workflow.add_node("hitl_script_review", hitl_script_review_node)
    workflow.add_node("generate_diagrams", generate_diagrams_uc)
    workflow.add_node("generate_blueprint", generate_blueprint_uc)
    workflow.add_node("hitl_blueprint_review", hitl_blueprint_review_node)
    workflow.add_node("audio_design", audio_design_uc)
    workflow.add_node("render_compose", render_compose_uc)

    # Edges
    workflow.set_entry_point("github_trending")
    workflow.add_conditional_edges("github_trending", route_trending)
    workflow.add_conditional_edges("hitl_trending_review", route_hitl_trending)
    workflow.add_edge("analyze_repo", "compose_script")
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
