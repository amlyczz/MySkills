import asyncio
import logging
import uuid
from typing import Any

logger = logging.getLogger(__name__)

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langgraph.types import Command, Interrupt

from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.status_machine import NODE_TO_STATUS
from ...domain.task.dag_definition import compute_dag_snapshot, _detect_source_type as dag_detect_source
from ...infrastructure.task.connection import _get_session_maker
from ...infrastructure.task.postgres_repository import PostgresPipelineTaskRepository
from ...infrastructure.repo_analyzer.llm_analyzer import LLMRepoAnalyzer
from ...infrastructure.code_agent.repo_analyzer import CodeAgentRepoAnalyzer
from ...infrastructure.code_agent.trending_scorer import CodeAgentTrendingScorer
from ...infrastructure.code_agent.script_composer import CodeAgentScriptComposer
from ...infrastructure.code_agent.blueprint_composer import CodeAgentBlueprintComposer
from ...infrastructure.code_agent.twitter_analyzer import CodeAgentTwitterAnalyzer
from ...infrastructure.script_composer.llm_composer import LLMScriptComposer
from ...infrastructure.twitter_analyzer.agent_scraper import OpenCLITwitterScraper
from ...infrastructure.twitter_analyzer.llm_analyzer import LLMTwitterAnalyzer
from ...infrastructure.visual_blueprint.llm_composer import LLMBlueprintComposer
from ...infrastructure.visual_blueprint.remotion_renderer import RemotionVideoRenderer
from ...infrastructure.post_producer.media_generator import MediaGenerator
from ...infrastructure.post_producer.ffmpeg_mixer import FFmpegAudioMixer
from ...infrastructure.post_producer.tts.mimo_tts import MimoTTSVoiceoverGenerator
from ...infrastructure.post_producer.tts.minimax_tts import MinimaxTTSVoiceoverGenerator
from ...infrastructure.post_producer.tts.omnivoice_tts import OmnivoiceTTSVoiceoverGenerator
from ...infrastructure.post_producer.tts.chain import TTSChain
from ...application.workflow.graph import compile_workflow

router = APIRouter(prefix="/api/v1/task", tags=["stream"])

# Global rendering semaphore to limit CPU load
global_render_semaphore = asyncio.Semaphore(1)

# Active graphs per task — used for HITL resume
_active_graphs: dict[str, Any] = {}


def _build_services(session, ws_callback: Any = None):
    """Create all DDD services with shared session and StatusTransitionService."""
    repository = PostgresPipelineTaskRepository(session)
    status_service = StatusTransitionService(repository, ws_callback=ws_callback)
    return repository, status_service


async def _mark_task_error(task_id: str, error_msg: str, node: str | None = None) -> None:
    """Update task status to ERROR in the database via FSM."""
    try:
        session_maker = _get_session_maker()
        async with session_maker() as session:
            repo = PostgresPipelineTaskRepository(session)
            status_service = StatusTransitionService(repo)
            await status_service.transition(
                uuid.UUID(task_id), PipelineStatus.ERROR, node=node, error=error_msg,
            )
    except Exception as e:
        logger.error("Failed to mark task %s as ERROR: %s", task_id, e)


def _get_checkpointer_context():
    """Return an async context manager that yields a PostgresSaver checkpointer."""
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
        return output.model_dump(exclude_none=True)
    if hasattr(output, "__dict__"):
        return vars(output)
    return {}


def _get_field(obj: Any, key: str, default: Any = None) -> Any:
    """Access a field from dict or Pydantic model uniformly."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _build_dag_snapshot_from_state(
    task_id: str,
    repo_url: str,
    completed_nodes: list[str],
    current_node: str | None,
    failed_node: str | None,
    pipeline_status: str,
    source_type: str,
) -> dict:
    """Build a dag_snapshot from local state without hitting the DB."""
    from ...domain.task.entities import PipelineTask, PipelineStatus as PS
    from uuid import UUID

    try:
        status_enum = PS(pipeline_status)
    except ValueError:
        status_enum = PS.PENDING

    task = PipelineTask(
        id=UUID(task_id),
        repo_url=repo_url,
        status=status_enum,
        completed_nodes=completed_nodes,
        current_node=current_node,
        failed_node=failed_node,
    )
    snapshot = compute_dag_snapshot(task)
    snapshot["source_type"] = source_type
    return snapshot


async def _send_node_event(
    websocket: WebSocket,
    node: str,
    status: str,
    pipeline_status: str,
    completed_nodes: list[str],
    detail: str = "",
    error: str = "",
    dag_snapshot: dict | None = None,
) -> None:
    """Send a unified node_event to the WebSocket."""
    payload: dict[str, Any] = {
        "type": "node_event",
        "node": node,
        "status": status,
        "pipeline_status": pipeline_status,
        "completed_nodes": completed_nodes,
        "dag_snapshot": dag_snapshot,
    }
    if detail:
        payload["detail"] = detail
    if error:
        payload["error"] = error
    try:
        await websocket.send_json(payload)
    except Exception as e:
        logger.debug("WebSocket send_json failed in _send_node_event (client disconnected?): %s", e)


async def _send_hitl_event(
    websocket: WebSocket,
    node: str,
    pipeline_status: str,
    reason: str,
    data: Any,
    completed_nodes: list[str],
    dag_snapshot: dict | None = None,
) -> None:
    """Send a unified hitl_event to the WebSocket."""
    try:
        await websocket.send_json({
            "type": "hitl_event",
            "node": node,
            "pipeline_status": pipeline_status,
            "reason": reason,
            "data": data,
            "completed_nodes": completed_nodes,
            "dag_snapshot": dag_snapshot,
        })
    except Exception as e:
        logger.debug("WebSocket send_json failed in _send_hitl_event (client disconnected?): %s", e)


async def _send_pipeline_event(
    websocket: WebSocket,
    status: str,
    completed_nodes: list[str],
    dag_snapshot: dict | None = None,
) -> None:
    """Send a pipeline_event (completed or error) to the WebSocket."""
    try:
        await websocket.send_json({
            "type": "pipeline_event",
            "status": status,
            "completed_nodes": completed_nodes,
            "dag_snapshot": dag_snapshot,
        })
    except Exception as e:
        logger.debug("WebSocket send_json failed in _send_pipeline_event (client disconnected?): %s", e)


async def _stream_graph(
    graph: Any,
    state_input: Any,
    config: dict,
    websocket: WebSocket,
    task_id: str,
    source_type: str = "github_url",
    repo_url: str = "",
    progress_queue: asyncio.Queue | None = None,
) -> str:
    """Stream a LangGraph execution with unified event protocol.

    The StatusTransitionService inside each UseCase node handles DB updates.
    This function only reads DB state for progress and sends WebSocket events.

    Args:
        progress_queue: Optional asyncio.Queue receiving (node_name, line) tuples
            from Claude Code stderr. Drained and forwarded as WebSocket events.

    Returns: "completed" | "hitl" | "error"
    """
    session_maker = _get_session_maker()
    completed_nodes: list[str] = []
    current_node: str | None = None
    failed_node: str | None = None
    pipeline_status_str: str = "pending"

    # Load initial progress from DB
    _hitl_nodes = {"hitl_trending_review", "hitl_script_review", "hitl_blueprint_review"}
    _hitl_statuses = {"hitl_trending", "hitl_script_review", "hitl_blueprint_review"}
    try:
        async with session_maker() as session:
            repo_db = PostgresPipelineTaskRepository(session)
            task = await repo_db.get_by_id(uuid.UUID(task_id))
            if task and task.completed_nodes:
                completed_nodes = list(task.completed_nodes)
            if task:
                current_node = task.current_node
                failed_node = task.failed_node
                pipeline_status_str = task.status.value
                # If we are resuming from a HITL pause, the HITL node itself was never
                # added to completed_nodes. Pre-add it now so the DAG renders it as
                # "completed" (not "idle") after the human decision is submitted.
                if (
                    task.status.value in _hitl_statuses
                    and task.current_node in _hitl_nodes
                    and task.current_node not in completed_nodes
                ):
                    completed_nodes.append(task.current_node)
    except Exception:
        pass


    def _snapshot(node: str | None = None, status: str | None = None) -> dict:
        return _build_dag_snapshot_from_state(
            task_id, repo_url, completed_nodes,
            node or current_node, failed_node,
            status or pipeline_status_str, source_type,
        )

    # Track which node is currently active
    last_announced_node: str | None = None

    # Drain Claude Code progress events from the queue and send as WebSocket events
    async def _drain_progress():
        _last_send = 0.0
        _min_interval = 0.5  # max 2 events/sec to avoid flooding the frontend
        while True:
            try:
                node_name, line = await progress_queue.get()
                now = asyncio.get_event_loop().time()
                if now - _last_send < _min_interval:
                    continue  # drop to avoid flooding
                _last_send = now
                await _send_node_event(
                    websocket, node_name, "started", pipeline_status_str,
                    completed_nodes, detail=line,
                    dag_snapshot=_snapshot(node_name, pipeline_status_str),
                )
            except asyncio.CancelledError:
                break
            except Exception:
                break

    drain_task = asyncio.create_task(_drain_progress()) if progress_queue else None

    try:
        async for chunk in graph.astream(state_input, config=config, stream_mode="updates"):
            if "__interrupt__" in chunk:
                # HITL interrupt
                interrupts: tuple[Interrupt, ...] = chunk["__interrupt__"]
                for intr in interrupts:
                    value = _serialize_interrupt_value(intr.value)
                    reason = value.get("reason") if isinstance(value, dict) else "?"
                    logger.info("HITL interrupt: reason=%s", reason)

                    # Map reason → node + status
                    reason_to_node = {
                        "trending_review": "hitl_trending_review",
                        "script_review": "hitl_script_review",
                        "blueprint_review": "hitl_blueprint_review",
                    }
                    hitl_node = reason_to_node.get(reason, last_announced_node or "unknown")
                    hitl_status_enum = NODE_TO_STATUS.get(hitl_node, PipelineStatus.PENDING)
                    hitl_status = hitl_status_enum.value
                    current_node = hitl_node
                    pipeline_status_str = hitl_status

                    # Persist HITL state to DB via FSM so page refresh restores correctly
                    try:
                        async with session_maker() as db_session:
                            repo_db4 = PostgresPipelineTaskRepository(db_session)
                            svc = StatusTransitionService(repo_db4)
                            await svc.transition(
                                uuid.UUID(task_id), hitl_status_enum,
                                node=hitl_node,
                            )
                            logger.info("FSM: Persisted HITL state %s for task %s", hitl_status, task_id[:8])
                    except Exception as fsm_err:
                        logger.error("Failed to persist HITL state: %s", fsm_err)

                    await _send_hitl_event(
                        websocket, hitl_node, hitl_status, reason, value, completed_nodes,
                        dag_snapshot=_snapshot(hitl_node, hitl_status),
                    )
                return "hitl"

            # Normal node update: {node_name: {output_dict}}
            for node_name, node_output in chunk.items():
                if node_name.startswith("__"):
                    continue

                output_dict = _output_to_dict(node_output)

                # Check for error
                error_msg = output_dict.get("error")
                status_val = output_dict.get("status")
                is_error = error_msg or (
                    status_val is not None and (
                        str(status_val) == "PipelineStatus.ERROR"
                        or status_val == PipelineStatus.ERROR
                        or str(status_val) == "error"
                    )
                )

                if is_error:
                    logger.error("Node '%s' ERROR: %s", node_name, error_msg)
                    failed_node = node_name
                    pipeline_status_str = "error"
                    node_status = NODE_TO_STATUS.get(node_name, PipelineStatus.ERROR).value
                    await _mark_task_error(task_id, error_msg or str(status_val), node=node_name)
                    await _send_node_event(
                        websocket, node_name, "error", "error",
                        completed_nodes, error=error_msg or str(status_val),
                        dag_snapshot=_snapshot(node_name, "error"),
                    )
                    await _send_pipeline_event(websocket, "error", completed_nodes,
                        dag_snapshot=_snapshot(node_name, "error"))
                    return "error"

                # Node completed successfully
                if node_name not in completed_nodes:
                    completed_nodes.append(node_name)

                pipeline_status_str = NODE_TO_STATUS.get(node_name, PipelineStatus.PENDING).value
                detail = _extract_detail(node_name, output_dict)

                logger.info("Node '%s' completed. Progress: %s", node_name, completed_nodes)

                # Read next current_node from DB BEFORE sending completed event,
                # so the dag_snapshot reflects the next active node correctly.
                next_current_node: str | None = None
                next_pipeline_status: str | None = None
                try:
                    async with session_maker() as session:
                        repo_db2 = PostgresPipelineTaskRepository(session)
                        task2 = await repo_db2.get_by_id(uuid.UUID(task_id))
                        if task2 and task2.current_node:
                            next_current_node = task2.current_node
                            next_pipeline_status = NODE_TO_STATUS.get(
                                next_current_node, PipelineStatus.PENDING
                            ).value
                except Exception:
                    pass

                # Update local tracking variables
                current_node = next_current_node
                if next_pipeline_status:
                    pipeline_status_str = next_pipeline_status
                else:
                    current_node = None

                # Send completed event with snapshot that already shows the next active node
                await _send_node_event(
                    websocket, node_name, "completed", pipeline_status_str,
                    completed_nodes, detail=detail,
                    dag_snapshot=_snapshot(current_node, pipeline_status_str),
                )

                last_announced_node = node_name

                # Send explicit started event for the next node
                if next_current_node:
                    await _send_node_event(
                        websocket, next_current_node, "started",
                        next_pipeline_status or "pending",
                        completed_nodes,
                        dag_snapshot=_snapshot(next_current_node, next_pipeline_status),
                    )
                    last_announced_node = next_current_node

        logger.info("Pipeline finished normally (no more nodes)")
        pipeline_status_str = "completed"
        current_node = None
        await _send_pipeline_event(websocket, "completed", completed_nodes,
            dag_snapshot=_snapshot(None, "completed"))
        return "completed"

    except WebSocketDisconnect:
        logger.info("Client disconnected during _stream_graph for task %s", task_id)
        return "disconnected"
    except RuntimeError as e:
        if "close message has been sent" in str(e) or "WebSocket is not connected" in str(e):
            logger.info("Websocket closed prematurely during _stream_graph for task %s", task_id)
            return "disconnected"
        raise
    except Exception as e:
        failed_node = last_announced_node or "unknown"
        # Try to get the actual failed node from the DB, since the node that threw the exception
        # would have marked itself as current_node in the FSM before failing.
        try:
            async with session_maker() as session:
                repo_db3 = PostgresPipelineTaskRepository(session)
                task3 = await repo_db3.get_by_id(uuid.UUID(task_id))
                if task3 and task3.current_node:
                    failed_node = task3.current_node
        except Exception:
            pass

        pipeline_status_str = "error"
        current_node = None
        err_msg = str(e) or repr(e)
        logger.error("Unhandled error in node '%s': %s", failed_node, err_msg)
        await _mark_task_error(task_id, err_msg, node=failed_node)
        try:
            await _send_node_event(
                websocket, failed_node, "error", "error",
                completed_nodes, error=err_msg,
                dag_snapshot=_snapshot(failed_node, "error"),
            )
            await _send_pipeline_event(websocket, "error", completed_nodes,
                dag_snapshot=_snapshot(failed_node, "error"))
        except Exception:
            pass
        return "error"
    finally:
        if drain_task:
            drain_task.cancel()
            try:
                await drain_task
            except (asyncio.CancelledError, Exception):
                pass


def _extract_detail(node_name: str, output: dict) -> str:
    """Extract a human-readable detail string from node output dict for the frontend log."""

    if node_name == "github_trending":
        repos = _get_field(output, "trending_repos")
        if repos and isinstance(repos, list) and len(repos) > 0:
            top3 = repos[:3]
            n = len(repos)
            lines = [f"Fetched {n} trending repos"]
            for i, r in enumerate(top3):
                name = f"{_get_field(r, 'owner', '?')}/{_get_field(r, 'name', '?')}"
                score = _get_field(r, "final_score", "?")
                stars = _get_field(r, "recent_stars_7d", 0)
                one_liner = _get_field(r, "one_liner", "")
                lines.append(f"  #{i+1} {name} (score={score}, +{stars}★/7d) — {one_liner}")
            return "\n".join(lines)
        return "No trending repos found"

    if node_name == "hitl_trending_review":
        repo_url = _get_field(output, "repo_url")
        if repo_url:
            # Extract owner/repo from URL
            parts = repo_url.rstrip("/").split("/")
            short = "/".join(parts[-2:]) if len(parts) >= 2 else repo_url
            return f"Selected repo: {short}"
        fb = _get_field(output, "hitl_trending_feedback")
        if fb:
            return f"Retrying trending fetch: {fb}"
        return "Trending review processed"

    if node_name == "analyze_repo":
        cm = _get_field(output, "content_model")
        title = ""
        lang = ""
        stars = ""
        if cm:
            content = _get_field(cm, "content")
            if content:
                title = _get_field(content, "title", "")
                lang = _get_field(content, "language", "")
                stars = _get_field(content, "stars", "")
            if not title:
                source = _get_field(cm, "source")
                if source:
                    title = f"{_get_field(source, 'owner', '')}/{_get_field(source, 'repo_name', '')}"
        parts = [title] if title else []
        if lang:
            parts.append(lang)
        if stars:
            parts.append(f"⭐{stars}")
        return " | ".join(parts) if parts else "Analysis complete"

    if node_name == "analyze_twitter":
        tc = _get_field(output, "twitter_content")
        if tc:
            author = _get_field(tc, "author", "")
            title = _get_field(tc, "title", "")
            tweet_count = _get_field(tc, "tweet_count", 0)
            summary = _get_field(tc, "summary", "")
            parts = []
            if author:
                parts.append(f"@{author}")
            if title:
                parts.append(title)
            if tweet_count:
                parts.append(f"{tweet_count} tweets")
            result = " | ".join(parts)
            if summary:
                result += f"\n  Summary: {summary[:200]}"
            return result
        return "Twitter analysis complete"

    if node_name == "compose_script":
        script = _get_field(output, "script")
        if script:
            n_seg = len(_get_field(script, "segments", []))
            dur = _get_field(script, "total_duration_est", 0)
            full_text = _get_field(script, "full_text", "")
            preview = full_text[:120] + "..." if len(full_text) > 120 else full_text
            return f"{n_seg} segments, ~{dur:.0f}s\n  {preview}"
        return "Script composed"

    if node_name == "hitl_script_review":
        fb = _get_field(output, "qa_script_feedback")
        if fb:
            return f"Script rejected: {fb}"
        return "Script approved, proceeding to diagrams"

    if node_name == "generate_diagrams":
        return "Mermaid/architecture diagrams rendered from domain analysis"

    if node_name == "generate_blueprint":
        bp = _get_field(output, "blueprint")
        if bp:
            scenes = _get_field(bp, "scenes", [])
            total_frames = sum(_get_field(s, "durationInFrames", 0) for s in scenes)
            total_s = total_frames / 30 if total_frames else 0
            scene_labels = [_get_field(s, "sceneName", f"Scene {i+1}") for i, s in enumerate(scenes)]
            return f"{len(scenes)} scenes ({total_s:.1f}s): {', '.join(scene_labels)}"
        return "Blueprint generated"

    if node_name == "hitl_blueprint_review":
        fb = _get_field(output, "qa_blueprint_feedback")
        if fb:
            return f"Blueprint rejected: {fb}"
        return "Blueprint approved, proceeding to audio design"

    if node_name == "audio_design":
        durations = _get_field(output, "segment_actual_durations", [])
        voiceover = _get_field(output, "voiceover_path", "")
        bgm = _get_field(output, "bgm_path", "")
        parts = []
        if durations:
            total = sum(durations)
            parts.append(f"TTS {len(durations)} segments ({total:.1f}s)")
        if voiceover:
            parts.append(f"voiceover ✓")
        if bgm:
            parts.append(f"BGM ✓")
        return " | ".join(parts) if parts else "Audio design complete"

    if node_name == "render_compose":
        video = output.get("video_mp4_path", "")
        final = output.get("final_mp4_path", "")
        parts = []
        if video:
            parts.append(f"render ✓")
        if final:
            parts.append(f"mix ✓ -> {final.split('/')[-1]}")
        return " | ".join(parts) if parts else "Render & compose complete"

    return ""


def _compile_graph_with_services(
    session,
    checkpointer,
    ws_callback: Any = None,
    progress_queue: Any = None,
):
    """Compile the workflow graph with all injected services.

    Agent selection per node via NODE_AGENT_CONFIG env var.
    Format: "analyze_repo=claude_code:900,compose_script=deepseek"
    Timeout (seconds) is optional, appended after colon.
    Unset nodes fall back to CODE_AGENT_TYPE (default: claude_code).

    Args:
        progress_queue: Optional asyncio.Queue for Claude Code progress events.
            CodeAgent implementations push stderr lines to this queue,
            and the caller drains it to send WebSocket events.
    """
    from ...infrastructure.config.app_config import settings, get_node_timeout, get_node_effort, get_node_model

    repository, status_service = _build_services(session, ws_callback=ws_callback)
    nc = settings.node_agent_config
    default = settings.code_agent_type

    def _agent(node: str) -> str:
        val = nc.get(node, default)
        if ":" in val:
            return val.split(":")[0].strip()
        return val

    def _progress(node_name: str):
        """Create an on_progress callback for a CodeAgent that pushes to the shared queue."""
        if progress_queue is None:
            return None
        def _push(line: str):
            try:
                progress_queue.put_nowait((node_name, line))
            except Exception:
                pass
        return _push

    # Repo analyzer
    analyzer = (
        CodeAgentRepoAnalyzer(timeout=get_node_timeout("analyze_repo"), effort=get_node_effort("analyze_repo"), on_progress=_progress("analyze_repo"))
        if _agent("analyze_repo") == "claude_code"
        else LLMRepoAnalyzer(model=get_node_model("analyze_repo"))
    )

    # Trending scorer
    trending_scorer = (
        CodeAgentTrendingScorer(timeout=get_node_timeout("github_trending"), effort=get_node_effort("github_trending"), on_progress=_progress("github_trending"))
        if _agent("github_trending") == "claude_code"
        else None
    )

    # Script composer
    composer = (
        CodeAgentScriptComposer(timeout=get_node_timeout("compose_script"), effort=get_node_effort("compose_script"), on_progress=_progress("compose_script"))
        if _agent("compose_script") == "claude_code"
        else LLMScriptComposer(model=get_node_model("compose_script"))
    )

    # Twitter (scraper is always OpenCLI, only analyzer switches)
    twitter_scraper = OpenCLITwitterScraper()
    twitter_analyzer = (
        CodeAgentTwitterAnalyzer(timeout=get_node_timeout("analyze_twitter"), effort=get_node_effort("analyze_twitter"), on_progress=_progress("analyze_twitter"))
        if _agent("analyze_twitter") == "claude_code"
        else LLMTwitterAnalyzer(model=get_node_model("analyze_twitter"))
    )

    # Blueprint composer
    blueprint_composer = (
        CodeAgentBlueprintComposer(timeout=get_node_timeout("generate_blueprint"), effort=get_node_effort("generate_blueprint"), on_progress=_progress("generate_blueprint"))
        if _agent("generate_blueprint") == "claude_code"
        else LLMBlueprintComposer(model=get_node_model("generate_blueprint"))
    )
    video_renderer = RemotionVideoRenderer()

    # TTS chain: MiMo (首选) → MiniMax → Omnivoice
    tts_chain = TTSChain(providers=[
        MimoTTSVoiceoverGenerator(api_key=settings.mimo_api_key, voice=settings.mimo_tts_voice),
        MinimaxTTSVoiceoverGenerator(),
        OmnivoiceTTSVoiceoverGenerator(),
    ])

    media_gen = MediaGenerator()  # BGM only
    audio_mixer = FFmpegAudioMixer()

    graph = compile_workflow(
        analyzer=analyzer,
        composer=composer,
        twitter_scraper=twitter_scraper,
        twitter_analyzer=twitter_analyzer,
        blueprint_composer=blueprint_composer,
        video_renderer=video_renderer,
        voiceover_gen=tts_chain,
        bgm_gen=media_gen,
        audio_mixer=audio_mixer,
        repository=repository,
        semaphore=global_render_semaphore,
        status_service=status_service,
        trending_scorer=trending_scorer,
        checkpointer=checkpointer,
        trending_model=get_node_model("github_trending"),
    )
    return graph, repository, status_service


def _detect_source_type(repo_url: str) -> str:
    """Detect source type from the repo_url query parameter."""
    return dag_detect_source(repo_url)


@router.websocket("/stream/{task_id}")
async def stream_task(websocket: WebSocket, task_id: str, repo_url: str) -> None:
    """WebSocket endpoint that compiles the StateGraph and streams steps live."""
    await websocket.accept()

    source_type = _detect_source_type(repo_url)

    session_maker = _get_session_maker()

    # --- Guard: if task already has non-trivial progress, refuse to restart ---
    # Page refresh should show current state via REST API, not re-run the pipeline.
    async with session_maker() as session:
        existing_task = None
        try:
            repo_check = PostgresPipelineTaskRepository(session)
            existing_task = await repo_check.get_by_id(uuid.UUID(task_id))
        except Exception:
            pass

        if existing_task and existing_task.status not in (PipelineStatus.PENDING, None):
            # Task already started or finished — just send current DAG snapshot and close.
            logger.info(
                "Task %s already in status %s, refusing to restart (page refresh). Sending current state.",
                task_id[:8], existing_task.status.value,
            )
            snap = compute_dag_snapshot(existing_task)
            # Send a single snapshot event so frontend can update
            await websocket.send_json({
                "type": "pipeline_event",
                "status": existing_task.status.value,
                "completed_nodes": existing_task.completed_nodes or [],
                "dag_snapshot": snap,
            })
            await websocket.close()
            return

    # --- Fresh start: no prior progress ---
    async with session_maker() as session:
        state_input = {
            "task_id": task_id,
            "repo_url": repo_url,
            "source_type": source_type,
            "status": PipelineStatus.PENDING,
            "qa_script_retry_count": 0,
            "qa_blueprint_retry_count": 0,
            "content_model": None,
            "material_manifest": None,
            "domain_analysis": None,
            "script": None,
            "blueprint": None,
            "twitter_content": None,
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

        checkpointer_ctx = _get_checkpointer_context()
        async with checkpointer_ctx as checkpointer:
            if checkpointer is not None:
                try:
                    await checkpointer.setup()
                except Exception as e:
                    logger.error("Checkpointer setup failed: %s", e)
                    checkpointer = None

            async def ws_callback(updated_task) -> None:
                snap = compute_dag_snapshot(updated_task)
                snap["source_type"] = source_type
                try:
                    await websocket.send_json({
                        "type": "sync",
                        "dag_snapshot": snap
                    })
                except Exception:
                    pass

            progress_queue: asyncio.Queue = asyncio.Queue()
            graph, repository, status_service = _compile_graph_with_services(
                session, checkpointer, ws_callback=ws_callback, progress_queue=progress_queue,
            )
            _active_graphs[task_id] = graph

            config = {"configurable": {"thread_id": task_id}}

            try:
                result = await _stream_graph(graph, state_input, config, websocket, task_id,
                    source_type=source_type, repo_url=repo_url, progress_queue=progress_queue)
                if result == "hitl":
                    logger.info("Graph paused for HITL, keeping task %s active", task_id)
                    return
                else:
                    _active_graphs.pop(task_id, None)
            except WebSocketDisconnect:
                _active_graphs.pop(task_id, None)
                logger.info("Client disconnected for task %s", task_id)
            except Exception as e:
                _active_graphs.pop(task_id, None)
                await _mark_task_error(task_id, str(e))
                try:
                    await websocket.send_json({"type": "pipeline_event", "status": "error", "completed_nodes": []})
                except Exception:
                    pass
                logger.error("Error during task stream: %s", e)

    try:
        await websocket.close()
    except Exception:
        pass


@router.websocket("/resume/{task_id}")
async def resume_task(websocket: WebSocket, task_id: str) -> None:
    """WebSocket endpoint to resume a paused (HITL) task with a human decision."""
    await websocket.accept()

    try:
        data = await websocket.receive_json()
        action = data.get("action", "abort")
        feedback = data.get("feedback")
        repo_url = data.get("repo_url")

        _active_graphs.pop(task_id, None)

        # Persist selected repo_url to DB immediately (otherwise retry loses it)
        if action == "select" and repo_url:
            try:
                async with _get_session_maker()() as s:
                    r = PostgresPipelineTaskRepository(s)
                    t = await r.get_by_id(uuid.UUID(task_id))
                    if t:
                        t.repo_url = repo_url
                        await r.update(t)
                        logger.info("Persisted selected repo_url to DB: %s", repo_url[:60])
            except Exception as e:
                logger.warning("Failed to persist repo_url: %s", e)

        logger.info("Recompiling graph for resume of task %s...", task_id)

        session_maker = _get_session_maker()
        async with session_maker() as session:
            checkpointer_ctx = _get_checkpointer_context()
            async with checkpointer_ctx as checkpointer:
                if checkpointer is not None:
                    try:
                        await checkpointer.setup()
                    except Exception as e:
                        logger.error("Checkpointer setup failed: %s", e)
                        checkpointer = None

                async def ws_callback(updated_task) -> None:
                    snap = compute_dag_snapshot(updated_task)
                    try:
                        snap["source_type"] = _detect_source_type(updated_task.repo_url)
                        await websocket.send_json({
                            "type": "sync",
                            "dag_snapshot": snap
                        })
                    except Exception:
                        pass

                progress_queue: asyncio.Queue = asyncio.Queue()
                graph, repository, status_service = _compile_graph_with_services(
                    session, checkpointer, ws_callback=ws_callback, progress_queue=progress_queue,
                )

                db_task = await repository.get_by_id(uuid.UUID(task_id))
                if db_task is None:
                    await websocket.send_json({"type": "pipeline_event", "status": "error", "completed_nodes": []})
                    await websocket.close()
                    return

                source_type = _detect_source_type(db_task.repo_url)
                db_state: dict[str, Any] = {
                    "task_id": task_id,
                    "repo_url": db_task.repo_url,
                    "source_type": source_type,
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
                db_state = {k: v for k, v in db_state.items() if v is not None}

                config = {"configurable": {"thread_id": task_id, **db_state}}
                resume_input = Command(resume={"action": action, "feedback": feedback, "repo_url": repo_url})

                try:
                    result = await _stream_graph(graph, resume_input, config, websocket, task_id,
                        source_type=source_type, repo_url=db_task.repo_url, progress_queue=progress_queue)
                    if result in ("completed", "error"):
                        _active_graphs.pop(task_id, None)
                except Exception as e:
                    _active_graphs.pop(task_id, None)
                    await _mark_task_error(task_id, str(e))
                    try:
                        await websocket.send_json({"type": "pipeline_event", "status": "error", "completed_nodes": []})
                    except Exception:
                        pass
                    logger.error("Error during task resume: %s", e)

    except WebSocketDisconnect:
        logger.info("Resume client disconnected for task %s", task_id)


@router.websocket("/retry/{task_id}")
async def retry_task(websocket: WebSocket, task_id: str, node: str = "") -> None:
    """WebSocket endpoint to retry a failed task.

    With `node` query param: retry from that specific node (keeps prior progress).
    Without: retry entire pipeline from scratch.
    """
    await websocket.accept()

    try:
        session_maker = _get_session_maker()
        async with session_maker() as session:
            repository, status_service = _build_services(session)

            task = await repository.get_by_id(uuid.UUID(task_id))
            if not task:
                await websocket.send_json({"type": "pipeline_event", "status": "error", "completed_nodes": []})
                await websocket.close()
                return

            if task.status != PipelineStatus.ERROR:
                await websocket.send_json({
                    "type": "pipeline_event", "status": "error",
                    "completed_nodes": task.completed_nodes or [],
                })
                await websocket.close()
                return

            completed = list(task.completed_nodes or [])

            if node:
                # Per-node retry: remove the failed node from completed (if it was added),
                # keep everything else, and resume from the last checkpoint before failure.
                logger.info("Per-node retry for '%s' on task %s", node, task_id[:8])
                # Remove the failed node so it re-runs
                if node in completed:
                    completed.remove(node)
                # Clear error markers, keep all domain entities
                task.failed_node = None
                task.node_error = None
                task.status = PipelineStatus.PENDING
                task.current_node = None
                task.completed_nodes = completed
                await repository.update(task)

                await _send_node_event(
                    websocket, node, "started", "pending", completed,
                    detail=f"Retrying node: {node}...",
                )
            else:
                # Full pipeline retry
                await status_service.reset_for_retry(uuid.UUID(task_id))
                await _send_node_event(
                    websocket, task.failed_node or "unknown", "started", "pending",
                    completed, detail="Retrying entire pipeline...",
                )

            source_type = _detect_source_type(task.repo_url)

            # If repo_url is still "trending", try to extract the real URL from saved data
            actual_url = task.repo_url
            if actual_url in ("trending", "pending", ""):
                if task.content_model:
                    actual_url = getattr(task.content_model.source, "url", "") if task.content_model.source else ""
                if not actual_url and task.script:
                    actual_url = task.repo_url  # fallback, will still fail but clearer
                logger.info("Retry: resolved repo_url from '%s' → '%s'", task.repo_url, actual_url[:60])

            state_input: dict[str, Any] = {
                "task_id": task_id,
                "repo_url": actual_url,
                "source_type": source_type,
                "status": PipelineStatus.PENDING,
                "trending_repos": task.trending_repos,
                "content_model": task.content_model,
                "material_manifest": task.material_manifest,
                "script": task.script,
                "blueprint": task.blueprint,
                "domain_analysis": task.domain_analysis,
                "twitter_content": task.twitter_content,
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

            checkpointer_ctx = _get_checkpointer_context()
            async with checkpointer_ctx as checkpointer:
                if checkpointer is not None:
                    try:
                        await checkpointer.setup()
                    except Exception as e:
                        logger.error("Checkpointer setup failed: %s", e)
                        checkpointer = None

                async def ws_callback(updated_task) -> None:
                    snap = compute_dag_snapshot(updated_task)
                    try:
                        snap["source_type"] = _detect_source_type(updated_task.repo_url)
                        await websocket.send_json({
                            "type": "sync",
                            "dag_snapshot": snap
                        })
                    except Exception:
                        pass

                progress_queue: asyncio.Queue = asyncio.Queue()
                graph, _, _ = _compile_graph_with_services(
                    session, checkpointer, ws_callback=ws_callback, progress_queue=progress_queue,
                )

                # Use original thread_id to resume from last checkpoint (per-node retry)
                # or fresh thread for full retry
                config = {
                    "configurable": {
                        "thread_id": task_id if node else f"{task_id}-retry"
                    }
                }

                try:
                    await _stream_graph(graph, state_input, config, websocket, task_id,
                        source_type=source_type, repo_url=actual_url, progress_queue=progress_queue)
                except WebSocketDisconnect:
                    logger.info("Retry client disconnected for task %s", task_id)
                except Exception as e:
                    await _mark_task_error(task_id, str(e))
                    try:
                        await websocket.send_json({"type": "pipeline_event", "status": "error", "completed_nodes": []})
                    except Exception:
                        pass
                    logger.error("Error during task retry: %s", e)

    except WebSocketDisconnect:
        logger.info("Retry client disconnected early for task %s", task_id)
    except Exception as e:
        logger.error("Retry setup error for task %s: %s", task_id, e)
        try:
            await websocket.send_json({"type": "pipeline_event", "status": "error", "completed_nodes": []})
        except Exception:
            pass

    try:
        await websocket.close()
    except Exception:
        pass
