"""Finite State Machine for PipelineStatus transitions.

All status changes MUST go through this service to ensure consistency.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Any, Callable, Awaitable

from .pipeline_status import PipelineStatus
from .interfaces import PipelineTaskRepository

logger = logging.getLogger(__name__)

# 1:1 mapping: DAG node name → PipelineStatus when that node is active
NODE_TO_STATUS: dict[str, PipelineStatus] = {
    "github_trending":       PipelineStatus.FETCHING_TRENDING,
    "hitl_trending_review":  PipelineStatus.HITL_TRENDING,
    "analyze_repo":          PipelineStatus.ANALYZING,
    "analyze_twitter":       PipelineStatus.ANALYZING,
    "compose_script":        PipelineStatus.COMPOSING,
    "hitl_script_review":    PipelineStatus.HITL_SCRIPT_REVIEW,
    "generate_diagrams":     PipelineStatus.GENERATING_DIAGRAMS,
    "generate_blueprint":    PipelineStatus.BLUEPRINTING,
    "hitl_blueprint_review": PipelineStatus.HITL_BLUEPRINT_REVIEW,
    "audio_design":          PipelineStatus.GENERATE_MEDIA,
    "render_compose":        PipelineStatus.RENDERING,
}

# Valid transitions: from_status → set of allowed to_statuses
VALID_TRANSITIONS: dict[PipelineStatus, set[PipelineStatus]] = {
    PipelineStatus.PENDING:               {PipelineStatus.FETCHING_TRENDING, PipelineStatus.ANALYZING, PipelineStatus.ERROR},
    PipelineStatus.FETCHING_TRENDING:     {PipelineStatus.HITL_TRENDING, PipelineStatus.ANALYZING, PipelineStatus.ERROR},
    PipelineStatus.HITL_TRENDING:         {PipelineStatus.FETCHING_TRENDING, PipelineStatus.ANALYZING, PipelineStatus.ERROR},
    PipelineStatus.ANALYZING:             {PipelineStatus.COMPOSING, PipelineStatus.ERROR},
    PipelineStatus.COMPOSING:             {PipelineStatus.HITL_SCRIPT_REVIEW, PipelineStatus.ERROR},
    PipelineStatus.HITL_SCRIPT_REVIEW:    {PipelineStatus.COMPOSING, PipelineStatus.GENERATING_DIAGRAMS, PipelineStatus.ERROR},
    PipelineStatus.GENERATING_DIAGRAMS:   {PipelineStatus.BLUEPRINTING, PipelineStatus.ERROR},
    PipelineStatus.BLUEPRINTING:          {PipelineStatus.HITL_BLUEPRINT_REVIEW, PipelineStatus.ERROR},
    PipelineStatus.HITL_BLUEPRINT_REVIEW: {PipelineStatus.BLUEPRINTING, PipelineStatus.GENERATE_MEDIA, PipelineStatus.ERROR},
    PipelineStatus.GENERATE_MEDIA:        {PipelineStatus.RENDERING, PipelineStatus.ERROR},
    PipelineStatus.RENDERING:             {PipelineStatus.COMPLETED, PipelineStatus.ERROR},
    PipelineStatus.COMPLETED:             set(),  # terminal
    PipelineStatus.ERROR:                 {PipelineStatus.PENDING},  # retry resets to PENDING
}


class StatusTransitionService:
    """Single authority for all pipeline status changes.
    
    Enforces FSM transitions, updates DB atomically, and tracks node progress.
    """

    def __init__(self, repository: PipelineTaskRepository, ws_callback: Optional[Callable[[Any], Awaitable[None]]] = None) -> None:
        self.repository = repository
        self.ws_callback = ws_callback

    async def transition(
        self,
        task_id: uuid.UUID,
        to_status: PipelineStatus,
        node: Optional[str] = None,
        error: Optional[str] = None,
        updates: Optional[dict[str, Any]] = None,
    ) -> None:
        """Transition task to a new status.
        
        Args:
            task_id: The task UUID.
            to_status: Target PipelineStatus.
            node: The DAG node name triggering this transition.
            error: Error message (only for ERROR transitions).
            updates: Additional field updates (content_model, script, etc.).
        """
        task = await self.repository.get_by_id(task_id)
        if task is None:
            logger.error("Task %s not found for transition", task_id)
            return

        from_status = task.status

        # Validate transition (skip validation for same-status updates)
        if from_status != to_status:
            allowed = VALID_TRANSITIONS.get(from_status, set())
            if to_status not in allowed:
                logger.warning(
                    "Invalid transition %s → %s for task %s (node=%s). Forcing anyway.",
                    from_status, to_status, task_id, node,
                )

        # Update status
        task.status = to_status

        # Track node progress
        if node:
            if to_status == PipelineStatus.ERROR:
                task.failed_node = node
                task.node_error = error
                task.current_node = None
            else:
                task.current_node = node
                task.failed_node = None
                task.node_error = None

        if error and to_status == PipelineStatus.ERROR:
            task.failed_node = task.failed_node or node
            task.node_error = error

        # Apply additional field updates
        if updates:
            for key, value in updates.items():
                if hasattr(task, key):
                    setattr(task, key, value)

        await self.repository.update(task)
        logger.info(
            "Task %s: %s → %s (node=%s)",
            str(task_id)[:8], from_status.value, to_status.value, node or "-",
        )

        if self.ws_callback:
            try:
                await self.ws_callback(task)
            except Exception as e:
                logger.warning("ws_callback failed in transition: %s", e)

    async def mark_node_completed(
        self,
        task_id: uuid.UUID,
        node: str,
        updates: Optional[dict[str, Any]] = None,
    ) -> None:
        """Mark a node as completed and add it to completed_nodes list."""
        task = await self.repository.get_by_id(task_id)
        if task is None:
            logger.error("Task %s not found for node completion", task_id)
            return

        if node not in task.completed_nodes:
            task.completed_nodes.append(node)

        task.current_node = None

        if updates:
            for key, value in updates.items():
                if hasattr(task, key):
                    setattr(task, key, value)

        await self.repository.update(task)
        logger.info("Task %s: node '%s' completed. Progress: %s", str(task_id)[:8], node, task.completed_nodes)

        if self.ws_callback:
            try:
                await self.ws_callback(task)
            except Exception as e:
                logger.warning("ws_callback failed in mark_node_completed: %s", e)

    async def reset_for_retry(self, task_id: uuid.UUID) -> None:
        """Reset task from ERROR to PENDING for retry."""
        await self.transition(task_id, PipelineStatus.PENDING, error=None)
        task = await self.repository.get_by_id(task_id)
        if task:
            task.failed_node = None
            task.node_error = None
            task.current_node = None
            await self.repository.update(task)
