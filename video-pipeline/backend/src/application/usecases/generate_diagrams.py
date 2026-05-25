"""Use case: generate diagrams from Mermaid code in script segments."""

import uuid

from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...infrastructure.media_generator.diagram_generator import DiagramGenerator
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir


class GenerateDiagramsUseCase:

    def __init__(self, repository: PipelineTaskRepository) -> None:
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running GenerateDiagrams")

        script = state.get("script")
        if not script or not script.segments:
            return {"status": PipelineStatus.BLUEPRINTING}

        output_dir = resolve_output_dir(state)

        generator = DiagramGenerator(output_dir=output_dir)
        generated = await generator.generate(script)

        if generated:
            print(f"[UseCase] Generated {len(generated)} diagrams")

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.BLUEPRINTING
            await self.repository.update(task)

        return {
            "script": script,
            "status": PipelineStatus.BLUEPRINTING,
        }
