import asyncio
from typing import Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langgraph.types import Command

from ...domain.task.entities import PipelineStatus
from ...infrastructure.task.connection import _get_engine, _get_session_maker
from ...infrastructure.task.postgres_repository import PostgresPipelineTaskRepository
from ...infrastructure.repo_analyzer.llm_analyzer import LLMRepoAnalyzer
from ...infrastructure.script_composer.llm_composer import LLMScriptComposer
from ...infrastructure.script_composer.llm_evaluator import LLMScriptEvaluator
from ...infrastructure.visual_blueprint.llm_composer import LLMBlueprintComposer
from ...infrastructure.visual_blueprint.llm_evaluator import LLMBlueprintEvaluator
from ...infrastructure.visual_blueprint.remotion_renderer import RemotionVideoRenderer
from ...infrastructure.post_producer.media_generator import MediaGenerator
from ...infrastructure.post_producer.ffmpeg_mixer import FFmpegAudioMixer
from ...application.workflow.graph import compile_workflow

router = APIRouter(prefix="/api/v1/task", tags=["stream"])

# Global rendering semaphore to limit CPU load
global_render_semaphore = asyncio.Semaphore(1)

# Active graphs per task — used for HITL resume
_active_graphs: dict[str, Any] = {}


def _get_checkpointer():
    """Create an AsyncPostgresSaver from the configured database URL.

    Returns None if DATABASE_URL is not set (for development without DB).
    """
    try:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from ...infrastructure.config.app_config import settings
        if not settings.database_url:
            return None
        # AsyncPostgresSaver.from_conn_string handles connection pooling
        return AsyncPostgresSaver.from_conn_string(settings.database_url)
    except Exception as e:
        print(f"[WebSocket] Checkpointer unavailable: {e}")
        return None


@router.websocket("/stream/{task_id}")
async def stream_task(websocket: WebSocket, task_id: str, repo_url: str, project_type: str = "educational") -> None:
    """WebSocket endpoint that compiles the StateGraph and streams steps live.

    Handles three types of events:
    - state_change: Node started/completed
    - log: LLM token stream
    - hitl: Pipeline paused for human decision
    - pipeline_end / error: Terminal events
    """
    await websocket.accept()

    session_maker = _get_session_maker()
    async with session_maker() as session:
        # Resolve concrete adapters
        repository = PostgresPipelineTaskRepository(session)
        analyzer = LLMRepoAnalyzer()
        composer = LLMScriptComposer()
        blueprint_composer = LLMBlueprintComposer()
        script_evaluator = LLMScriptEvaluator()
        blueprint_evaluator = LLMBlueprintEvaluator()
        video_renderer = RemotionVideoRenderer()
        media_gen = MediaGenerator()
        audio_mixer = FFmpegAudioMixer()

        checkpointer = _get_checkpointer()

        graph = compile_workflow(
            analyzer=analyzer,
            composer=composer,
            blueprint_composer=blueprint_composer,
            script_evaluator=script_evaluator,
            blueprint_evaluator=blueprint_evaluator,
            video_renderer=video_renderer,
            voiceover_gen=media_gen,
            bgm_gen=media_gen,
            audio_mixer=audio_mixer,
            repository=repository,
            semaphore=global_render_semaphore,
            checkpointer=checkpointer,
        )

        _active_graphs[task_id] = graph

        config = {"configurable": {"thread_id": task_id}}
        state_input = {
            "task_id": task_id,
            "repo_url": repo_url,
            "project_category": project_type,
            "status": PipelineStatus.PENDING,
            "qa_script_retry_count": 0,
            "qa_blueprint_retry_count": 0,
            "content_model": None,
            "material_manifest": None,
            "domain_analysis": None,
            "script": None,
            "blueprint": None,
            "qa_script": None,
            "qa_blueprint": None,
            "segment_actual_durations": [],
            "qa_script_feedback": None,
            "qa_blueprint_feedback": None,
            "voiceover_path": None,
            "bgm_path": None,
            "video_mp4_path": None,
            "final_mp4_path": None,
            "error": None,
        }

        all_nodes = [
            "analyze_repo", "compose_script", "qa_script",
            "generate_blueprint", "qa_blueprint",
            "hitl_script_review", "hitl_blueprint_review", "agentic_code_gen",
            "audio_design", "render_compose",
        ]

        try:
            async for event in graph.astream_events(state_input, config=config, version="v2"):
                event_type = event["event"]
                node = event.get("name", "")

                if event_type == "on_chat_model_stream":
                    content = event["data"]["chunk"].content
                    if content:
                        await websocket.send_json({
                            "type": "log",
                            "node": node,
                            "content": content,
                        })
                elif event_type == "on_chain_start" and node in all_nodes:
                    await websocket.send_json({
                        "type": "state_change",
                        "node": node,
                        "status": "started",
                    })
                elif event_type == "on_chain_end" and node in all_nodes:
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
            # Check if this is an interrupt (HITL pause)
            error_str = str(e)
            if "interrupt" in error_str.lower():
                await websocket.send_json({
                    "type": "hitl",
                    "message": "Pipeline paused for human review.",
                    "task_id": task_id,
                })
            else:
                try:
                    await websocket.send_json({"type": "error", "content": error_str})
                    await websocket.close()
                except Exception:
                    pass
                print(f"[WebSocket] Error during task stream: {e}")
        finally:
            _active_graphs.pop(task_id, None)


@router.websocket("/resume/{task_id}")
async def resume_task(websocket: WebSocket, task_id: str) -> None:
    """WebSocket endpoint to resume a paused (HITL) task with a human decision.

    Client sends: {"action": "skip" | "retry" | "abort" | "code_gen"}
    """
    await websocket.accept()

    try:
        data = await websocket.receive_json()
        action = data.get("action", "abort")
        feedback = data.get("feedback")
        repo_url = data.get("repo_url")

        graph = _active_graphs.get(task_id)
        if not graph:
            await websocket.send_json({"type": "error", "content": f"No active graph for task {task_id}"})
            await websocket.close()
            return

        config = {"configurable": {"thread_id": task_id}}

        # Resume the graph with the human decision
        async for event in graph.astream_events(
            Command(resume={"action": action, "feedback": feedback, "repo_url": repo_url}),
            config=config,
            version="v2",
        ):
            event_type = event["event"]
            node = event.get("name", "")

            if event_type == "on_chain_start":
                await websocket.send_json({"type": "state_change", "node": node, "status": "started"})
            elif event_type == "on_chain_end":
                await websocket.send_json({"type": "state_change", "node": node, "status": "completed"})
            elif event_type == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    await websocket.send_json({"type": "log", "node": node, "content": content})

        await websocket.send_json({"type": "pipeline_end"})
        await websocket.close()

    except WebSocketDisconnect:
        print(f"[WebSocket] Resume client disconnected for task {task_id}")
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
            await websocket.close()
        except Exception:
            pass
        print(f"[WebSocket] Error during task resume: {e}")
