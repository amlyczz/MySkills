import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ...domain.task.entities import PipelineStatus
from ...infrastructure.task.connection import async_session_maker
from ...infrastructure.task.postgres_repository import PostgresPipelineTaskRepository
from ...infrastructure.analyzer.playwright_scraper import PlaywrightScraper
from ...infrastructure.analyzer.llm_analyzer import LLMRepoAnalyzer
from ...infrastructure.composer.llm_composer import LLMScriptComposer
from ...infrastructure.composer.llm_evaluator import LLMScriptEvaluator
from ...infrastructure.blueprint.llm_evaluator import LLMBlueprintEvaluator
from ...infrastructure.blueprint.remotion_renderer import RemotionVideoRenderer
from ...infrastructure.post_producer.media_generator import MediaGenerator
from ...infrastructure.post_producer.ffmpeg_mixer import FFmpegAudioMixer
from ...application.workflow.graph import compile_workflow

router = APIRouter(prefix="/api/v1/task", tags=["stream"])

# Global rendering semaphore to limit GPU/CPU load globally
global_render_semaphore = asyncio.Semaphore(1)

@router.websocket("/stream/{task_id}")
async def stream_task(websocket: WebSocket, task_id: str, repo_url: str, project_type: str = "educational") -> None:
    """
    WebSocket endpoint that compiles the business-bound StateGraph and streams steps live.
    """
    await websocket.accept()
    
    async with async_session_maker() as session:
        # Resolve concrete adapters for domain interfaces
        repository = PostgresPipelineTaskRepository(session)
        scraper = PlaywrightScraper()
        analyzer = LLMRepoAnalyzer()
        composer = LLMScriptComposer()
        script_evaluator = LLMScriptEvaluator()
        blueprint_evaluator = LLMBlueprintEvaluator()
        video_renderer = RemotionVideoRenderer()
        media_gen = MediaGenerator()
        audio_mixer = FFmpegAudioMixer()
        
        # Compile LangGraph StateGraph with all concrete dependencies injected
        graph = compile_workflow(
            scraper=scraper,
            analyzer=analyzer,
            composer=composer,
            script_evaluator=script_evaluator,
            blueprint_evaluator=blueprint_evaluator,
            video_renderer=video_renderer,
            voiceover_gen=media_gen,
            bgm_gen=media_gen,
            audio_mixer=audio_mixer,
            repository=repository,
            semaphore=global_render_semaphore,
            checkpointer=None,
        )
        
        config = {"configurable": {"thread_id": task_id}}
        state_input = {
            "task_id": task_id,
            "repo_url": repo_url,
            "project_type": project_type,
            "status": PipelineStatus.PENDING,
            "qa_script_retry_count": 0,
            "qa_blueprint_retry_count": 0,
            "repo_analysis": None,
            "video_script": None,
            "blueprint": None,
            "qa_script": None,
            "qa_blueprint": None,
            "video_mp4_path": None,
            "final_mp4_path": None,
            "error": None,
        }
        
        try:
            async for event in graph.astream_events(state_input, config=config, version="v2"):
                event_type = event["event"]
                node = event.get("name", "")
                
                # Stream LLM tokens live
                if event_type == "on_chat_model_stream":
                    content = event["data"]["chunk"].content
                    if content:
                        await websocket.send_json({
                            "type": "log",
                            "node": node,
                            "content": content,
                        })
                # Stream node step activations
                elif event_type == "on_chain_start" and node in [
                    "analyze_repo", "compose_script", "qa_script", 
                    "generate_blueprint", "qa_blueprint", "render_video", "post_process"
                ]:
                    await websocket.send_json({
                        "type": "state_change",
                        "node": node,
                        "status": "started",
                    })
                # Stream step completions
                elif event_type == "on_chain_end" and node in [
                    "analyze_repo", "compose_script", "qa_script", 
                    "generate_blueprint", "qa_blueprint", "render_video", "post_process"
                ]:
                    await websocket.send_json({
                        "type": "state_change",
                        "node": node,
                        "status": "completed",
                    })
                    
            await websocket.send_json({"type": "pipeline_end"})
            await websocket.close()
            
        except WebSocketDisconnect:
            print(f"[WebSocket] Client disconnected for task {task_id}")
        except Exception as e:
            try:
                await websocket.send_json({"type": "error", "content": str(e)})
                await websocket.close()
            except Exception:
                pass
            print(f"[WebSocket] Error during task stream: {e}")
