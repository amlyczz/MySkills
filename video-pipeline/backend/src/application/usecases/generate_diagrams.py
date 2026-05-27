"""Use case: generate diagrams from Mermaid code in script segments."""

import logging
import uuid

logger = logging.getLogger(__name__)

from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ...infrastructure.media_generator.diagram_generator import DiagramGenerator
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir


class GenerateDiagramsUseCase:

    def __init__(self, repository: PipelineTaskRepository, status_service: StatusTransitionService) -> None:
        self.repository = repository
        self.status_service = status_service

    async def __call__(self, state: PipelineState) -> PipelineState:
        # Skip-if-done guard: if blueprint exists, diagrams were already generated
        if state.get("blueprint") is not None:
            logger.info("[UseCase] GenerateDiagrams: skipping (blueprint already exists)")
            return {**state}

        task_id = uuid.UUID(state["task_id"])

        # ① Enter node: mark active immediately
        await self.status_service.transition(
            task_id, PipelineStatus.GENERATING_DIAGRAMS, node="generate_diagrams"
        )

        logger.info("[UseCase] Running GenerateDiagrams")

        script = state.get("script")
        if script is None or not script.segments:
            await self.status_service.mark_node_completed(
                task_id, "generate_diagrams",
                updates={"status": PipelineStatus.GENERATING_DIAGRAMS},
            )
            return {**state, "status": PipelineStatus.GENERATING_DIAGRAMS}

        output_dir = resolve_output_dir(state)

        generator = DiagramGenerator(output_dir=output_dir)
        generated = await generator.generate(script)

        if generated:
            logger.info(f"[UseCase] Generated {len(generated)} diagrams")

        # ② Complete node: update via FSM
        await self.status_service.mark_node_completed(
            task_id, "generate_diagrams",
            updates={"status": PipelineStatus.GENERATING_DIAGRAMS},
        )

        return {**state, "status": PipelineStatus.GENERATING_DIAGRAMS}
