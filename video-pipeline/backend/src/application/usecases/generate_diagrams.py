"""Use case: generate diagrams from Mermaid code in script segments."""

import logging
import uuid

logger = logging.getLogger(__name__)

from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...infrastructure.media_generator.diagram_generator import DiagramGenerator
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir


class GenerateDiagramsUseCase:

    def __init__(self, repository: PipelineTaskRepository) -> None:
        self.repository = repository

    async def __call__(self, state: PipelineState) -> PipelineState:
        # Skip-if-done guard: if blueprint exists, diagrams were already generated
        if state.get("blueprint") is not None:
            logger.info("[UseCase] GenerateDiagrams: skipping (blueprint already exists)")
            return PipelineState(
                task_id=state["task_id"],
                repo_url=state["repo_url"],
                script=state.get("script"),
                status=PipelineStatus.BLUEPRINTING,
            )

        logger.info("[UseCase] Running GenerateDiagrams")

        script = state.get("script")
        if script is None or not script.segments:
            return PipelineState(
                task_id=state["task_id"],
                repo_url=state["repo_url"],
                status=PipelineStatus.BLUEPRINTING,
            )

        output_dir = resolve_output_dir(state)

        generator = DiagramGenerator(output_dir=output_dir)
        generated = await generator.generate(script)

        if generated:
            logger.info(f"[UseCase] Generated {len(generated)} diagrams")

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.BLUEPRINTING
            await self.repository.update(task)

        return PipelineState(
            task_id=state["task_id"],
            repo_url=state["repo_url"],
            script=script,
            status=PipelineStatus.BLUEPRINTING,
        )
