import asyncio
from typing import TypedDict, Annotated, Optional, Dict, Any, List
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from .models import RepoAnalysisModel, VideoScriptModel, BlueprintModel
from .tools.playwright_scraper import scrape_github_repo_tool

# 初始化 LLM (需要环境变量 OPENAI_API_KEY)
llm = ChatOpenAI(model="gpt-4o", temperature=0.2)

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
    # 真实逻辑：先爬网页
    scraped_data = await scrape_github_repo_tool.ainvoke({
        "url": state["repo_url"], 
        "output_screenshot_path": "repo_screenshot.png"
    })
    
    # 真实逻辑：让 LLM 解析并输出结构化 JSON
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert repository analyst. Analyze the following GitHub README and extract the project details matching the schema."),
        ("user", "README Content:\n{readme}\n\nRepo URL: {url}")
    ])
    
    chain = prompt | llm.with_structured_output(RepoAnalysisModel)
    analysis = await chain.ainvoke({
        "readme": scraped_data["readme"],
        "url": state["repo_url"]
    })
    
    return {"repo_analysis": analysis, "project_type": analysis.project_type.value}

async def compose_script_node(state: PipelineState):
    print("Node: compose_script")
    analysis = state["repo_analysis"]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a professional video director. Generate a highly engaging video script based on the project analysis. The style should be {project_type}. Target duration is around 60 seconds."),
        ("user", "Project Name: {name}\nDescription: {desc}\nFeatures: {features}")
    ])
    
    chain = prompt | llm.with_structured_output(VideoScriptModel)
    script = await chain.ainvoke({
        "project_type": analysis.project_type.value,
        "name": analysis.project_name,
        "desc": analysis.description,
        "features": ", ".join(analysis.key_features)
    })
    
    return {"video_script": script}

class QAResult(BaseModel):
    score: int
    reasoning: str

async def qa_script_node(state: PipelineState):
    print("Node: qa_script")
    script = state["video_script"]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a harsh QA evaluator for video scripts. Grade the script strictly on a scale of 0 to 100 based on its technical accuracy, pacing, and engaging narrative. Provide your score and reasoning."),
        ("user", "Script:\n{script_text}")
    ])
    
    chain = prompt | llm.with_structured_output(QAResult)
    # 转换为文本以便评估
    script_text = f"Title: {script.title}\nSegments: {len(script.segments)}" 
    for s in script.segments:
        script_text += f"\n- {s.text}"
        
    result = await chain.ainvoke({"script_text": script_text})
    
    print(f"QA Script Score: {result.score}. Reasoning: {result.reasoning}")
    retries = state.get("qa_script_retry_count", 0) + 1
    return {"qa_script_score": result.score, "qa_script_retry_count": retries}

async def generate_blueprint_node(state: PipelineState):
    print("Node: generate_blueprint")
    blueprint = BlueprintModel(
        durationInFrames=1800,
        scenes=[]
    )
    return {"blueprint": blueprint}

async def qa_blueprint_node(state: PipelineState):
    print("Node: qa_blueprint")
    blueprint = state["blueprint"]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a visual director. Evaluate if the following JSON blueprint scenes properly translate to the philosophical UI aesthetic (Parchment, Ink, hard borders). Score 0-100."),
        ("user", "Blueprint Scenes:\n{scenes}")
    ])
    
    chain = prompt | llm.with_structured_output(QAResult)
    result = await chain.ainvoke({"scenes": str(blueprint.scenes)})
    
    print(f"QA Blueprint Score: {result.score}. Reasoning: {result.reasoning}")
    retries = state.get("qa_blueprint_retry_count", 0) + 1
    return {"qa_blueprint_score": result.score, "qa_blueprint_retry_count": retries}

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
