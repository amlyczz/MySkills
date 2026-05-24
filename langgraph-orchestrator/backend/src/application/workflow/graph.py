import asyncio
from typing import Optional, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver

from ..workflow.state import PipelineState
from ..usecases.analyze import AnalyzeRepoUseCase
from ..usecases.compose import ComposeScriptUseCase
from ..usecases.qa import QAScriptUseCase, QABlueprintUseCase
from ..usecases.blueprint import GenerateBlueprintUseCase
from ..usecases.render import RenderVideoUseCase
from ..usecases.post_process import PostProcessUseCase
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.analyzer.interfaces import RepoScraper, RepoAnalyzer
from ...domain.composer.interfaces import ScriptComposer, ScriptEvaluator
from ...domain.blueprint.interfaces import BlueprintComposer, BlueprintEvaluator, VideoRenderer
from ...domain.post_producer.interfaces import VoiceoverGenerator, BGMGenerator, AudioMixer

# Routing logic for script evaluation
def route_qa_script(state: PipelineState) -> str:
    scorecard = state.get("qa_script")
    if scorecard and scorecard.score >= 80:
        return "generate_blueprint"
    
    retry_count = state.get("qa_script_retry_count", 0)
    if retry_count >= 3:
        print(f"[Graph] QA Script failed 3 times. Terminating workflow.")
        return END
        
    return "compose_script"

# Routing logic for blueprint evaluation
def route_qa_blueprint(state: PipelineState) -> str:
    scorecard = state.get("qa_blueprint")
    if scorecard and scorecard.score >= 80:
        return "render_video"
        
    retry_count = state.get("qa_blueprint_retry_count", 0)
    if retry_count >= 3:
        print(f"[Graph] QA Blueprint failed 3 times. Requesting agentic code gen.")
        return "agentic_code_gen"
        
    return "generate_blueprint"

async def agentic_code_gen_node(state: PipelineState) -> dict[str, object]:
    print("[Graph] Node: agentic_code_gen (HITL or Code Agent Invoke)")
    await asyncio.sleep(1)
    return {}

def compile_workflow(
    scraper: RepoScraper,
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
    """
    Compiles the LangGraph StateGraph, injecting DDD-bound services into UseCases.
    """
    # Instantiate UseCases with injected fine-grained services
    analyze_repo_uc = AnalyzeRepoUseCase(scraper, analyzer, repository)
    compose_script_uc = ComposeScriptUseCase(composer, repository)
    qa_script_uc = QAScriptUseCase(script_evaluator, repository)
    generate_blueprint_uc = GenerateBlueprintUseCase(blueprint_composer, repository) # Injected!
    qa_blueprint_uc = QABlueprintUseCase(blueprint_evaluator, repository)
    render_video_uc = RenderVideoUseCase(video_renderer, repository, semaphore)
    post_process_uc = PostProcessUseCase(voiceover_gen, bgm_gen, audio_mixer, repository)

    # Initialize StateGraph
    workflow = StateGraph(PipelineState)

    # Add Nodes
    workflow.add_node("analyze_repo", analyze_repo_uc)
    workflow.add_node("compose_script", compose_script_uc)
    workflow.add_node("qa_script", qa_script_uc)
    workflow.add_node("generate_blueprint", generate_blueprint_uc)
    workflow.add_node("qa_blueprint", qa_blueprint_uc)
    workflow.add_node("agentic_code_gen", agentic_code_gen_node)
    workflow.add_node("render_video", render_video_uc)
    workflow.add_node("post_process", post_process_uc)

    # Define DAG structure
    workflow.set_entry_point("analyze_repo")
    workflow.add_edge("analyze_repo", "compose_script")
    workflow.add_edge("compose_script", "qa_script")
    
    # Conditional edge after script QA
    workflow.add_conditional_edges("qa_script", route_qa_script)
    
    workflow.add_edge("generate_blueprint", "qa_blueprint")
    
    # Conditional edge after visual blueprint QA
    workflow.add_conditional_edges("qa_blueprint", route_qa_blueprint)
    
    # Loop back from Agentic Code Gen to blueprint adapting
    workflow.add_edge("agentic_code_gen", "generate_blueprint")
    
    workflow.add_edge("render_video", "post_process")
    workflow.add_edge("post_process", END)

    return workflow.compile(checkpointer=checkpointer)
