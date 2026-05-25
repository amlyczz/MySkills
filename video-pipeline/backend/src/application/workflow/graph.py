import asyncio
from typing import Optional, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.types import interrupt

from ..workflow.state import PipelineState
from ..usecases.analyze import AnalyzeRepoUseCase
from ..usecases.compose import ComposeScriptUseCase
from ..usecases.qa import QAScriptUseCase, QABlueprintUseCase
from ..usecases.blueprint import GenerateBlueprintUseCase
from ..usecases.audio_design import AudioDesignUseCase
from ..usecases.render_compose import RenderComposeUseCase
from ..usecases.github_trending import GithubTrendingUseCase
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.repo_analyzer.interfaces import RepoAnalyzer
from ...domain.script_composer.interfaces import ScriptComposer, ScriptEvaluator
from ...domain.visual_blueprint.interfaces import BlueprintComposer, BlueprintEvaluator, VideoRenderer
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
    # If the user sets feedback, go back to trending. If they select a repo, go to analyze.
    if state.get("hitl_trending_feedback"):
        return "github_trending"
    return "analyze_repo"

def route_qa_script(state: PipelineState) -> str:
    scorecard = state.get("qa_script")
    if scorecard and scorecard.score >= 80:
        return "generate_blueprint"

    retry_count = state.get("qa_script_retry_count", 0)
    if retry_count >= 3:
        return "hitl_script_review"

    return "compose_script"


def route_qa_blueprint(state: PipelineState) -> str:
    scorecard = state.get("qa_blueprint")
    if scorecard and scorecard.score >= 80:
        return "audio_design"

    retry_count = state.get("qa_blueprint_retry_count", 0)
    if retry_count >= 3:
        return "hitl_blueprint_review"

    return "generate_blueprint"


def route_hitl_script(state: PipelineState) -> str:
    """After HITL script review: abort → END, retry → compose_script, skip → generate_blueprint."""
    status = state.get("status")
    if status == PipelineStatus.ERROR:
        return END
    if state.get("qa_script_retry_count", 0) == 0 and status == PipelineStatus.COMPOSING:
        return "compose_script"
    return "generate_blueprint"


def route_hitl_blueprint(state: PipelineState) -> str:
    """After HITL blueprint review: abort → END, code_gen → agentic_code_gen, skip → audio_design, retry → generate_blueprint."""
    status = state.get("status")
    if status == PipelineStatus.ERROR:
        return END
    if status == PipelineStatus.QA_BLUEPRINT_FAILED:
        return "agentic_code_gen"
    if state.get("qa_blueprint_retry_count", 0) == 0 and status == PipelineStatus.BLUEPRINTING:
        return "generate_blueprint"
    return "audio_design"


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
    """HITL breakpoint when script QA fails 3 times."""
    decision = interrupt({
        "reason": "script_qa_failed_3_times",
        "scorecard": state.get("qa_script").model_dump() if state.get("qa_script") else None,
        "message": "Script QA failed 3 consecutive times. Choose: skip | retry | abort",
    })
    action = decision.get("action", "abort")

    if action == "skip":
        return {"status": PipelineStatus.COMPOSING}
    elif action == "retry":
        return {"qa_script_retry_count": 0, "status": PipelineStatus.COMPOSING}
    else:
        return {"status": PipelineStatus.ERROR, "error": "Aborted by user after 3 script QA failures"}


async def hitl_blueprint_review_node(state: PipelineState) -> dict[str, object]:
    """HITL breakpoint when blueprint QA fails 3 times."""
    decision = interrupt({
        "reason": "blueprint_qa_failed_3_times",
        "scorecard": state.get("qa_blueprint").model_dump() if state.get("qa_blueprint") else None,
        "message": "Blueprint QA failed 3 consecutive times. Choose: skip | code_gen | retry | abort",
    })
    action = decision.get("action", "abort")

    if action == "skip":
        return {"status": PipelineStatus.BLUEPRINTING}
    elif action == "code_gen":
        return {"status": PipelineStatus.QA_BLUEPRINT_FAILED}
    elif action == "retry":
        return {"qa_blueprint_retry_count": 0, "status": PipelineStatus.BLUEPRINTING}
    else:
        return {"status": PipelineStatus.ERROR, "error": "Aborted by user after 3 blueprint QA failures"}


async def agentic_code_gen_node(state: PipelineState) -> dict[str, object]:
    """Cross-agent code generation for missing visual components."""
    blueprint = state.get("blueprint")
    qa_scorecard = state.get("qa_blueprint")

    context = {
        "blueprint_summary": f"{len(blueprint.scenes)} scenes" if blueprint else "N/A",
        "qa_score": qa_scorecard.score if qa_scorecard else 0,
        "qa_reasoning": qa_scorecard.reasoning if qa_scorecard else "",
    }
    print(f"[Graph] agentic_code_gen: packaging context={context}")

    interrupt({
        "reason": "agentic_code_gen_request",
        "context": context,
        "message": "Code generation needed. Approve component changes to continue.",
    })

    return {"qa_blueprint_retry_count": 0, "status": PipelineStatus.BLUEPRINTING}


def compile_workflow(
    analyzer: RepoAnalyzer,
    composer: ScriptComposer,
    blueprint_composer: BlueprintComposer,
    script_evaluator: ScriptEvaluator,
    blueprint_evaluator: BlueprintEvaluator,
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
        github_trending → analyze_repo → compose_script → qa_script
                                              ├─ pass → generate_blueprint → qa_blueprint
                                              └─ fail×3 → hitl_script_review
                                                                            ├─ skip → generate_blueprint
                                                                            ├─ retry → compose_script
                                                                            └─ abort → END

        generate_blueprint → qa_blueprint
                                      ├─ pass → audio_design → render_compose → END
                                      └─ fail×3 → hitl_blueprint_review
                                                                ├─ skip → audio_design
                                                                ├─ code_gen → agentic_code_gen → generate_blueprint
                                                                ├─ retry → generate_blueprint
                                                                └─ abort → END

    Key improvement over v1:
        audio_design runs BEFORE render_compose so that:
        1. TTS generates actual per-segment audio durations
        2. render_compose recalibrates Blueprint frames using actual durations
        3. Timeline/SRT use actual audio timing (not estimated duration_est)
    """
    analyze_repo_uc = AnalyzeRepoUseCase(analyzer, repository)
    compose_script_uc = ComposeScriptUseCase(composer, repository)
    qa_script_uc = QAScriptUseCase(script_evaluator, repository)
    generate_blueprint_uc = GenerateBlueprintUseCase(blueprint_composer, repository)
    qa_blueprint_uc = QABlueprintUseCase(blueprint_evaluator, repository)
    audio_design_uc = AudioDesignUseCase(voiceover_gen, bgm_gen, repository)
    render_compose_uc = RenderComposeUseCase(video_renderer, audio_mixer, repository, semaphore)

    workflow = StateGraph(PipelineState)

    # Nodes
    workflow.add_node("github_trending", GithubTrendingUseCase(repository))
    workflow.add_node("analyze_repo", analyze_repo_uc)
    workflow.add_node("compose_script", compose_script_uc)
    workflow.add_node("qa_script", qa_script_uc)
    workflow.add_node("generate_blueprint", generate_blueprint_uc)
    workflow.add_node("qa_blueprint", qa_blueprint_uc)
    workflow.add_node("audio_design", audio_design_uc)
    workflow.add_node("render_compose", render_compose_uc)
    workflow.add_node("hitl_trending_review", hitl_trending_review_node)
    workflow.add_node("hitl_script_review", hitl_script_review_node)
    workflow.add_node("hitl_blueprint_review", hitl_blueprint_review_node)
    workflow.add_node("agentic_code_gen", agentic_code_gen_node)

    # Edges
    workflow.set_entry_point("github_trending")
    workflow.add_conditional_edges("github_trending", route_trending)
    workflow.add_conditional_edges("hitl_trending_review", route_hitl_trending)
    workflow.add_edge("analyze_repo", "compose_script")
    workflow.add_edge("compose_script", "qa_script")
    workflow.add_conditional_edges("qa_script", route_qa_script)
    workflow.add_edge("generate_blueprint", "qa_blueprint")
    workflow.add_conditional_edges("qa_blueprint", route_qa_blueprint)
    workflow.add_conditional_edges("hitl_script_review", route_hitl_script)
    workflow.add_conditional_edges("hitl_blueprint_review", route_hitl_blueprint)
    workflow.add_edge("agentic_code_gen", "generate_blueprint")
    workflow.add_edge("audio_design", "render_compose")
    workflow.add_edge("render_compose", END)

    return workflow.compile(checkpointer=checkpointer)
