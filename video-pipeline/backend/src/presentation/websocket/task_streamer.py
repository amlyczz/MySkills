import asyncio
import logging
import uuid
from typing import Any

logger = logging.getLogger(__name__)

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langgraph.types import Command, Interrupt

from ...domain.task.entities import PipelineStatus
from ...infrastructure.task.connection import _get_session_maker
from ...infrastructure.task.postgres_repository import PostgresPipelineTaskRepository
from ...infrastructure.repo_analyzer.llm_analyzer import LLMRepoAnalyzer
from ...infrastructure.script_composer.llm_composer import LLMScriptComposer
from ...infrastructure.visual_blueprint.llm_composer import LLMBlueprintComposer
from ...infrastructure.visual_blueprint.remotion_renderer import RemotionVideoRenderer
from ...infrastructure.post_producer.media_generator import MediaGenerator
from ...infrastructure.post_producer.ffmpeg_mixer import FFmpegAudioMixer
from ...application.workflow.graph import compile_workflow

router = APIRouter(prefix="/api/v1/task", tags=["stream"])

# Global rendering semaphore to limit CPU load
global_render_semaphore = asyncio.Semaphore(1)

# Active graphs per task — used for HITL resume
_active_graphs: dict[str, Any] = {}


async def _mark_task_error(task_id: str, error_msg: str) -> None:
    """Update task status to ERROR in the database."""
    try:
        session_maker = _get_session_maker()
        async with session_maker() as session:
            repo = PostgresPipelineTaskRepository(session)
            task = await repo.get_by_id(uuid.UUID(task_id))
            if task:
                task.status = PipelineStatus.ERROR
                await repo.update(task)
    except Exception as e:
        logger.error("Failed to mark task %s as ERROR: %s", task_id, e)


def _get_checkpointer_context():
    """Return an async context manager that yields a PostgresSaver checkpointer.

    AsyncPostgresSaver.from_conn_string() returns an async context manager —
    we must stay inside it while the graph is in use to keep the connection alive.
    """
    from ...infrastructure.config.app_config import settings

    if not settings.database_url:
        logger.info("No DATABASE_URL, skipping checkpointer")
        from contextlib import nullcontext
        return nullcontext(None)

    conn_string = settings.database_url.replace("+asyncpg", "")

    try:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
        from ...domain.github_trending.entities import ScoredRepo
        from ...domain.repo_analyzer.entities import ContentModel, MaterialManifest, Script, DomainAnalysis
        from ...domain.visual_blueprint.entities import Blueprint
        from ...domain.task.entities import QAScorecard

        serde = JsonPlusSerializer(allowed_msgpack_modules=[
            ScoredRepo, ContentModel, MaterialManifest, Script,
            DomainAnalysis, Blueprint, QAScorecard,
        ])
        return AsyncPostgresSaver.from_conn_string(conn_string, serde=serde)
    except Exception as e:
        logger.error("PostgresSaver import failed: %s", e)
        from contextlib import nullcontext
        return nullcontext(None)


def _serialize_interrupt_value(value: Any) -> Any:
    """Make interrupt value JSON-serializable (handles Pydantic models)."""
    if value is None:
        return None
    if isinstance(value, dict):
        return {k: _serialize_interrupt_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_interrupt_value(v) for v in value]
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return value


def _output_to_dict(output: Any) -> dict[str, Any]:
    """Convert node output to dict — handles PipelineState Pydantic models and plain dicts."""
    if isinstance(output, dict):
        return output
    if hasattr(output, "model_dump"):
        # PipelineState (or other Pydantic BaseModel) — exclude None fields to avoid
        # overwriting existing state with nulls during merge
        return output.model_dump(exclude_none=True)
    if hasattr(output, "__dict__"):
        return vars(output)
    return {}


async def _stream_graph(graph: Any, state_input: Any, config: dict, websocket: WebSocket, all_nodes: set[str]) -> str:
    """Stream a LangGraph execution, sending rich node updates and HITL interrupts to the WebSocket.

    Uses astream() which properly surfaces __interrupt__ events (unlike astream_events).
    Returns: "completed" | "hitl" | "error"
    """
    # ── Node start announcement ──
    async def _send_node_start(node_name: str, detail: str = "") -> None:
        payload: dict[str, Any] = {
            "type": "state_change",
            "node": node_name,
            "status": "active",
        }
        if detail:
            payload["detail"] = detail
        await websocket.send_json(payload)

    # ── Node completion with rich data ──
    async def _send_node_completed(node_name: str, output: dict) -> None:
        payload: dict[str, Any] = {
            "type": "state_change",
            "node": node_name,
            "status": "completed",
        }
        # Attach node-specific rich detail for the frontend log
        detail = _extract_detail(node_name, output)
        if detail:
            payload["detail"] = detail
        await websocket.send_json(payload)

    # ── Predict next node from graph structure ──
    # astream("updates") only fires on node completion, so we proactively
    # send "active" for the next expected node to give real-time feedback.
    SEQUENTIAL_NEXT: dict[str, str | None] = {
        "hitl_trending_review": "analyze_repo",
        "analyze_repo": "compose_script",
        "compose_script": "hitl_script_review",
        "generate_diagrams": "generate_blueprint",
        "generate_blueprint": "hitl_blueprint_review",
        "audio_design": "render_compose",
        "render_compose": None,  # END
    }

    def _predict_next_node(completed_node: str, output: dict) -> str | None:
        """Determine the next node based on completed node + its output."""
        # Conditional edges
        if completed_node == "github_trending":
            trending = output.get("trending_repos")
            if trending:
                return "hitl_trending_review"
            return "analyze_repo"

        if completed_node == "hitl_trending_review":
            if output.get("hitl_trending_feedback"):
                return "github_trending"
            return "analyze_repo"

        if completed_node == "hitl_script_review":
            if output.get("qa_script_feedback"):
                return "compose_script"
            return "generate_diagrams"

        if completed_node == "hitl_blueprint_review":
            if output.get("qa_blueprint_feedback"):
                return "generate_blueprint"
            return "audio_design"

        return SEQUENTIAL_NEXT.get(completed_node)

    # ── Determine entry node and send initial "active" ──
    first_node: str | None = None
    if isinstance(state_input, dict):
        # Fresh start — entry node is github_trending (trending) or analyze_repo (direct URL)
        repo_url = state_input.get("repo_url", "")
        first_node = "github_trending" if repo_url in ("", "trending", "pending") else "analyze_repo"
        await _send_node_start(first_node, "Starting pipeline...")
        logger.info("Pipeline starting. Entry node: %s", first_node)

    try:
      async for chunk in graph.astream(state_input, config=config, stream_mode="updates"):
        if "__interrupt__" in chunk:
            # HITL interrupt — one or more Interrupt objects
            interrupts: tuple[Interrupt, ...] = chunk["__interrupt__"]
            for intr in interrupts:
                value = _serialize_interrupt_value(intr.value)
                reason = value.get("reason") if isinstance(value, dict) else "?"
                logger.info("HITL interrupt: reason=%s", reason)

                # The node is PAUSED (not completed). The frontend already received
                # "active" for this node; the HITL event will set the correct hitl state.
                await websocket.send_json({
                    "type": "hitl",
                    "message": "Pipeline paused for human review.",
                    "interrupt_id": intr.id,
                    "value": value,
                })
            return "hitl"  # Don't send pipeline_end — graph is paused

        # Normal node update: {node_name: {output_dict}}
        for node_name, node_output in chunk.items():
            if node_name.startswith("__"):
                continue

            # Detect error outputs and send details to frontend
            if isinstance(node_output, dict):
                error_msg = node_output.get("error")
                status_val = node_output.get("status")
                if error_msg or (status_val is not None and str(status_val) == "PipelineStatus.ERROR"):
                    logger.error("Node '%s' ERROR: %s", node_name, error_msg)
                    await websocket.send_json({
                        "type": "state_change",
                        "node": node_name,
                        "status": "error",
                        "detail": error_msg or str(status_val),
                    })
                    await websocket.send_json({
                        "type": "error",
                        "content": f"[{node_name}] {error_msg or status_val}",
                    })
                    return "error"

            logger.info("Node '%s' completed.", node_name)
            output_dict = _output_to_dict(node_output)
            await _send_node_completed(node_name, output_dict)

            # Predict and announce the next node
            next_node = _predict_next_node(node_name, output_dict)
            if next_node:
                await _send_node_start(next_node)
                first_node = next_node
                logger.info("Next node predicted: %s", next_node)

      logger.info("Pipeline finished normally (no more nodes)")
      await websocket.send_json({"type": "pipeline_end"})
      return "completed"
    except Exception as e:
      # Unhandled exception during node execution — send node-level error
      failed_node = first_node or "unknown"
      logger.error("Unhandled error in node '%s': %s", failed_node, e)
      await websocket.send_json({
          "type": "state_change",
          "node": failed_node,
          "status": "error",
          "detail": str(e),
      })
      await websocket.send_json({
          "type": "error",
          "content": f"[{failed_node}] {e}",
      })
      return "error"


def _get_field(obj: Any, key: str, default: Any = None) -> Any:
    """Access a field from dict or Pydantic model uniformly."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _extract_detail(node_name: str, output: dict) -> str:
    """Extract a human-readable detail string from node output dict for the frontend log."""

    # ── github_trending ──
    if node_name == "github_trending":
        repos = _get_field(output, "trending_repos")
        if repos and isinstance(repos, list) and len(repos) > 0:
            top = repos[0]
            n = len(repos)
            top_name = f"{_get_field(top, 'owner', '?')}/{_get_field(top, 'name', '?')}"
            top_score = _get_field(top, "final_score", "?")
            top_stars_7d = _get_field(top, "recent_stars_7d", 0)
            return f"Scored {n} repos — Top: {top_name} (score={top_score}, +{top_stars_7d}/7d)"
        return "No trending repos found"

    # ── hitl_trending_review ──
    if node_name == "hitl_trending_review":
        repo_url = _get_field(output, "repo_url")
        if repo_url:
            return f"Selected: {repo_url}"
        return "Trending review decision processed"

    # ── analyze_repo ──
    if node_name == "analyze_repo":
        cm = _get_field(output, "content_model")
        title = ""
        category = _get_field(output, "project_category", "")
        if cm:
            content = _get_field(cm, "content")
            if content:
                title = _get_field(content, "title", "")
            if not title:
                source = _get_field(cm, "source")
                if source:
                    title = f"{_get_field(source, 'owner', '')}/{_get_field(source, 'repo_name', '')}"
        parts = []
        if title:
            parts.append(title)
        if category:
            parts.append(f"category={category}")
        da = _get_field(output, "domain_analysis")
        if da:
            aud = _get_field(da, "audience")
            if aud:
                parts.append(f"audience={_get_field(aud, 'primary', '')}")
        return " | ".join(parts) if parts else "Analysis complete"

    # ── compose_script ──
    if node_name == "compose_script":
        script = _get_field(output, "script")
        if script:
            n_seg = len(_get_field(script, "segments", []))
            dur = _get_field(script, "total_duration_est", 0)
            return f"{n_seg} segments, ~{dur:.0f}s total"
        return "Script composed"

    # ── hitl_script_review ──
    if node_name == "hitl_script_review":
        fb = _get_field(output, "qa_script_feedback")
        if fb:
            return "Rejected with feedback — retrying"
        return "Script approved"

    # ── generate_diagrams ──
    if node_name == "generate_diagrams":
        script = _get_field(output, "script")
        if script:
            segs = _get_field(script, "segments", [])
            diagram_count = sum(
                1 for s in segs
                if _get_field(s, "assigned_asset") and
                str(_get_field(s, "assigned_asset", "")).endswith((".png", ".svg"))
            )
            return f"{diagram_count} diagram(s) rendered"
        return "Diagrams generated"

    # ── generate_blueprint ──
    if node_name == "generate_blueprint":
        bp = _get_field(output, "blueprint")
        if bp:
            scenes = _get_field(bp, "scenes", [])
            total_frames = sum(_get_field(s, "durationInFrames", 0) for s in scenes)
            total_s = total_frames / 30 if total_frames else 0
            gs = _get_field(bp, "globalSettings")
            theme = ""
            if gs:
                t = _get_field(gs, "theme")
                if t:
                    theme = f", theme={_get_field(t, 'id', '')}"
            return f"{len(scenes)} scenes, {total_s:.1f}s{theme}"
        return "Blueprint generated"

    # ── hitl_blueprint_review ──
    if node_name == "hitl_blueprint_review":
        fb = _get_field(output, "qa_blueprint_feedback")
        if fb:
            return "Rejected with feedback — retrying"
        return "Blueprint approved"

    # ── audio_design ──
    if node_name == "audio_design":
        durations = _get_field(output, "segment_actual_durations", [])
        vo = _get_field(output, "voiceover_path")
        bgm = _get_field(output, "bgm_path")
        if durations:
            total = sum(durations)
            return f"TTS {len(durations)} segments ({total:.1f}s), BGM generated"
        parts = []
        if vo:
            parts.append("voiceover OK")
        if bgm:
            parts.append("BGM OK")
        return ", ".join(parts) if parts else "Audio design complete"

    # ── render_compose ──
    if node_name == "render_compose":
        video = output.get("video_mp4_path")
        final = output.get("final_mp4_path")
        if final:
            return f"Final video: {final.split('/')[-1]}"
        if video:
            return f"Raw video: {video.split('/')[-1]}"
        return "Render & compose complete"

    return ""


@router.websocket("/stream/{task_id}")
async def stream_task(websocket: WebSocket, task_id: str, repo_url: str, project_type: str = "educational") -> None:
    """WebSocket endpoint that compiles the StateGraph and streams steps live."""
    await websocket.accept()

    session_maker = _get_session_maker()
    async with session_maker() as session:
        repository = PostgresPipelineTaskRepository(session)
        analyzer = LLMRepoAnalyzer()
        composer = LLMScriptComposer()
        blueprint_composer = LLMBlueprintComposer()
        video_renderer = RemotionVideoRenderer()
        media_gen = MediaGenerator()
        audio_mixer = FFmpegAudioMixer()

        # Keep checkpointer context alive for the entire WebSocket session
        checkpointer_ctx = _get_checkpointer_context()
        async with checkpointer_ctx as checkpointer:
            if checkpointer is not None:
                try:
                    await checkpointer.setup()
                except Exception as e:
                    logger.error("Checkpointer setup failed: %s", e)
                    checkpointer = None

            graph = compile_workflow(
                analyzer=analyzer,
                composer=composer,
                blueprint_composer=blueprint_composer,
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

            all_nodes = {
                "github_trending", "hitl_trending_review",
                "analyze_repo", "compose_script",
                "hitl_script_review",
                "generate_diagrams",
                "generate_blueprint",
                "hitl_blueprint_review",
                "audio_design", "render_compose",
            }

            try:
                result = await _stream_graph(graph, state_input, config, websocket, all_nodes)
                if result == "hitl":
                    # Graph is paused — keep it in _active_graphs for resume
                    logger.info("Graph paused for HITL, keeping task %s active", task_id)
                    return  # Don't close websocket or pop graph
                else:
                    _active_graphs.pop(task_id, None)
            except WebSocketDisconnect:
                _active_graphs.pop(task_id, None)
                logger.info("Client disconnected for task %s", task_id)
            except Exception as e:
                _active_graphs.pop(task_id, None)
                await _mark_task_error(task_id, str(e))
                try:
                    await websocket.send_json({"type": "error", "content": str(e)})
                except Exception:
                    pass
                logger.error("Error during task stream: %s", e)

    try:
        await websocket.close()
    except Exception:
        pass


@router.websocket("/resume/{task_id}")
async def resume_task(websocket: WebSocket, task_id: str) -> None:
    """WebSocket endpoint to resume a paused (HITL) task with a human decision.

    Client sends: {"action": "approve" | "reject" | "abort" | "select", "feedback": "...", "repo_url": "..."}
    """
    await websocket.accept()

    try:
        data = await websocket.receive_json()
        action = data.get("action", "abort")
        feedback = data.get("feedback")
        repo_url = data.get("repo_url")

        # Always recompile with fresh connections — the stream endpoint's
        # session/checkpointer contexts are closed by the time we get here.
        _active_graphs.pop(task_id, None)
        logger.info("Recompiling graph for resume of task %s...", task_id)

        session_maker = _get_session_maker()
        async with session_maker() as session:
            repository = PostgresPipelineTaskRepository(session)
            analyzer = LLMRepoAnalyzer()
            composer = LLMScriptComposer()
            blueprint_composer = LLMBlueprintComposer()
            video_renderer = RemotionVideoRenderer()
            media_gen = MediaGenerator()
            audio_mixer = FFmpegAudioMixer()

            checkpointer_ctx = _get_checkpointer_context()
            async with checkpointer_ctx as checkpointer:
                if checkpointer is not None:
                    try:
                        await checkpointer.setup()
                    except Exception as e:
                        logger.error("Checkpointer setup failed: %s", e)
                        checkpointer = None

                graph = compile_workflow(
                    analyzer=analyzer,
                    composer=composer,
                    blueprint_composer=blueprint_composer,
                    video_renderer=video_renderer,
                    voiceover_gen=media_gen,
                    bgm_gen=media_gen,
                    audio_mixer=audio_mixer,
                    repository=repository,
                    semaphore=global_render_semaphore,
                    checkpointer=checkpointer,
                )

                # Reconstruct state from DB to preserve outputs of already-completed nodes
                # (fresh thread_id = no checkpoint, so skip guards need DB state)
                db_task = await repository.get_by_id(uuid.UUID(task_id))
                if db_task is None:
                    await websocket.send_json({"type": "error", "content": f"Task {task_id} not found"})
                    await websocket.close()
                    return

                db_state: dict[str, Any] = {
                    "task_id": task_id,
                    "repo_url": db_task.repo_url,
                    "project_category": db_task.project_category or "github",
                    "status": db_task.status,
                    "trending_repos": db_task.trending_repos,
                    "content_model": db_task.content_model,
                    "material_manifest": db_task.material_manifest,
                    "script": db_task.script,
                    "blueprint": db_task.blueprint,
                    "domain_analysis": db_task.domain_analysis,
                    "voiceover_path": db_task.voiceover_path,
                    "bgm_path": db_task.bgm_path,
                    "video_mp4_path": db_task.video_mp4_path,
                    "final_mp4_path": db_task.final_mp4_path,
                }
                # Filter out None values so they don't overwrite valid checkpoint state
                db_state = {k: v for k, v in db_state.items() if v is not None}

                config = {"configurable": {"thread_id": task_id, **db_state}}
                resume_input = Command(resume={"action": action, "feedback": feedback, "repo_url": repo_url})

                try:
                    result = await _stream_graph(graph, resume_input, config, websocket, set())
                    if result in ("completed", "error"):
                        _active_graphs.pop(task_id, None)
                except Exception as e:
                    _active_graphs.pop(task_id, None)
                    await _mark_task_error(task_id, str(e))
                    try:
                        await websocket.send_json({"type": "error", "content": str(e)})
                    except Exception:
                        pass
                    logger.error("Error during task resume: %s", e)

    except WebSocketDisconnect:
        logger.info("Resume client disconnected for task %s", task_id)


@router.websocket("/retry/{task_id}")
async def retry_task(websocket: WebSocket, task_id: str) -> None:
    """WebSocket endpoint to retry a failed task from the last failed node.

    Reconstructs PipelineState from DB fields, then re-runs the graph.
    Skip-if-done guards on each node ensure completed nodes are no-ops,
    and the failed node re-executes with preserved context.
    """
    await websocket.accept()

    try:
        session_maker = _get_session_maker()
        async with session_maker() as session:
            repository = PostgresPipelineTaskRepository(session)

            # 1. Load task from DB
            task = await repository.get_by_id(uuid.UUID(task_id))
            if not task:
                await websocket.send_json({"type": "error", "content": f"Task {task_id} not found"})
                await websocket.close()
                return

            # 2. Verify task is in ERROR state
            if task.status != PipelineStatus.ERROR:
                await websocket.send_json({"type": "error", "content": f"Task is not in ERROR state (current: {task.status})"})
                await websocket.close()
                return

            # 3. Reset task status to PENDING
            task.status = PipelineStatus.PENDING
            await repository.update(task)

            # 4. Reconstruct PipelineState dict from DB fields
            state_input: dict[str, Any] = {
                "task_id": task_id,
                "repo_url": task.repo_url,
                "project_category": task.project_category or "github",
                "status": PipelineStatus.PENDING,
                "trending_repos": task.trending_repos,
                "hitl_trending_feedback": None,
                "content_model": task.content_model,
                "material_manifest": task.material_manifest,
                "script": task.script,
                "blueprint": task.blueprint,
                "domain_analysis": task.domain_analysis,
                "qa_script": None,
                "qa_blueprint": None,
                "qa_script_retry_count": 0,
                "qa_blueprint_retry_count": 0,
                "qa_script_feedback": None,
                "qa_blueprint_feedback": None,
                "segment_actual_durations": [],
                "voiceover_path": task.voiceover_path,
                "bgm_path": task.bgm_path,
                "video_mp4_path": task.video_mp4_path,
                "final_mp4_path": task.final_mp4_path,
                "error": None,
            }

            # 5. Compile graph with fresh checkpointer (new thread_id)
            analyzer = LLMRepoAnalyzer()
            composer = LLMScriptComposer()
            blueprint_composer = LLMBlueprintComposer()
            video_renderer = RemotionVideoRenderer()
            media_gen = MediaGenerator()
            audio_mixer = FFmpegAudioMixer()

            checkpointer_ctx = _get_checkpointer_context()
            async with checkpointer_ctx as checkpointer:
                if checkpointer is not None:
                    try:
                        await checkpointer.setup()
                    except Exception as e:
                        logger.error("Checkpointer setup failed: %s", e)
                        checkpointer = None

                graph = compile_workflow(
                    analyzer=analyzer,
                    composer=composer,
                    blueprint_composer=blueprint_composer,
                    video_renderer=video_renderer,
                    voiceover_gen=media_gen,
                    bgm_gen=media_gen,
                    audio_mixer=audio_mixer,
                    repository=repository,
                    semaphore=global_render_semaphore,
                    checkpointer=checkpointer,
                )

                # Use a new thread_id to avoid checkpoint conflicts with the original run
                config = {"configurable": {"thread_id": f"{task_id}-retry"}}

                all_nodes = {
                    "github_trending", "hitl_trending_review",
                    "analyze_repo", "compose_script",
                    "hitl_script_review",
                    "generate_diagrams",
                    "generate_blueprint",
                    "hitl_blueprint_review",
                    "audio_design", "render_compose",
                }

                try:
                    await _stream_graph(graph, state_input, config, websocket, all_nodes)
                except WebSocketDisconnect:
                    logger.info("Retry client disconnected for task %s", task_id)
                except Exception as e:
                    await _mark_task_error(task_id, str(e))
                    try:
                        await websocket.send_json({"type": "error", "content": str(e)})
                    except Exception:
                        pass
                    logger.error("Error during task retry: %s", e)

    except WebSocketDisconnect:
        logger.info("Retry client disconnected early for task %s", task_id)
    except Exception as e:
        logger.error("Retry setup error for task %s: %s", task_id, e)
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass

    try:
        await websocket.close()
    except Exception:
        pass
