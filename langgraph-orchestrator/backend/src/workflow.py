import asyncio
from typing import TypedDict, Annotated, Optional, Dict, Any, List
from langgraph.graph import StateGraph, END
from pydantic import BaseModel

from .models import RepoAnalysisModel, VideoScriptModel, BlueprintModel

class PipelineState(TypedDict):
    repo_url: str
    project_type: str
    repo_analysis: Optional[RepoAnalysisModel]
    video_script: Optional[VideoScriptModel]
    blueprint: Optional[BlueprintModel]
    qa_script_score: Optional[int]
    qa_blueprint_score: Optional[int]
    qa_script_retry_count: int
    qa_blueprint_retry_count: int
    error: Optional[str]
    video_path: Optional[str]
    final_path: Optional[str]

# ----------------- NODES -----------------

async def analyze_repo_node(state: PipelineState):
    print("Node: analyze_repo")
    # In reality: Call Playwright tool, crawl Github, use LLM to parse into RepoAnalysisModel
    analysis = RepoAnalysisModel(
        repo_url=state["repo_url"],
        project_name="Sample Project",
        project_type="educational",
        description="A sample project",
        key_features=["Feature A", "Feature B"],
        pain_points=["None"]
    )
    return {"repo_analysis": analysis, "project_type": analysis.project_type.value}

async def compose_script_node(state: PipelineState):
    print("Node: compose_script")
    # In reality: Call LLM with state["repo_analysis"] to generate VideoScriptModel
    script = VideoScriptModel(
        title="Sample Video",
        segments=[],
        target_duration_seconds=60
    )
    return {"video_script": script}

async def qa_script_node(state: PipelineState):
    print("Node: qa_script")
    # Mock LLM grading
    score = 85 # Passed
    retries = state.get("qa_script_retry_count", 0) + 1
    return {"qa_script_score": score, "qa_script_retry_count": retries}

async def generate_blueprint_node(state: PipelineState):
    print("Node: generate_blueprint")
    blueprint = BlueprintModel(
        durationInFrames=1800,
        scenes=[]
    )
    return {"blueprint": blueprint}

async def qa_blueprint_node(state: PipelineState):
    print("Node: qa_blueprint")
    score = 90
    retries = state.get("qa_blueprint_retry_count", 0) + 1
    return {"qa_blueprint_score": score, "qa_blueprint_retry_count": retries}

async def agentic_code_gen_node(state: PipelineState):
    print("Node: agentic_code_gen (HITL or Code Agent Call)")
    # This node sends IPC to a local Code Agent and pauses
    return {}

async def render_video_node(state: PipelineState):
    print("Node: render_video")
    # This uses asyncio.Semaphore in production to limit concurrency
    # Calls npx remotion render
    return {"video_path": "output.mp4"}

async def post_process_node(state: PipelineState):
    print("Node: post_process")
    # Calls ffmpeg wrapper
    return {"final_path": "final_subtitled.mp4"}

# ----------------- EDGES -----------------

def route_qa_script(state: PipelineState):
    score = state.get("qa_script_score", 0)
    if score >= 80:
        return "generate_blueprint"
    if state["qa_script_retry_count"] >= 3:
        return "error_end"
    return "compose_script"

def route_qa_blueprint(state: PipelineState):
    score = state.get("qa_blueprint_score", 0)
    if score >= 80:
        return "render_video"
    if state["qa_blueprint_retry_count"] >= 3:
        return "agentic_code_gen"
    return "generate_blueprint"

# ----------------- GRAPH COMPILATION -----------------
workflow = StateGraph(PipelineState)

workflow.add_node("analyze_repo", analyze_repo_node)
workflow.add_node("compose_script", compose_script_node)
workflow.add_node("qa_script", qa_script_node)
workflow.add_node("generate_blueprint", generate_blueprint_node)
workflow.add_node("qa_blueprint", qa_blueprint_node)
workflow.add_node("agentic_code_gen", agentic_code_gen_node)
workflow.add_node("render_video", render_video_node)
workflow.add_node("post_process", post_process_node)

workflow.set_entry_point("analyze_repo")
workflow.add_edge("analyze_repo", "compose_script")
workflow.add_edge("compose_script", "qa_script")
workflow.add_conditional_edges("qa_script", route_qa_script)

workflow.add_edge("generate_blueprint", "qa_blueprint")
workflow.add_conditional_edges("qa_blueprint", route_qa_blueprint)

# agentic_code_gen returns to generate_blueprint once code is written
workflow.add_edge("agentic_code_gen", "generate_blueprint")

workflow.add_edge("render_video", "post_process")
workflow.add_edge("post_process", END)

# In a real setup, we'd add memory/checkpointer here
graph = workflow.compile()
