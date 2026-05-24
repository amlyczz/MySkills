import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.composer.interfaces import ScriptEvaluator
from ...domain.blueprint.interfaces import BlueprintEvaluator
from ..workflow.state import PipelineState

class QAScriptUseCase:
    
    def __init__(
        self,
        evaluator: ScriptEvaluator,
        repository: PipelineTaskRepository,
    ) -> None:
        self.evaluator = evaluator
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running QAScript")
        
        script = state["video_script"]
        if not script:
            raise ValueError("Video script is missing in state.")

        # Grade the script using ScriptEvaluator interface
        scorecard = await self.evaluator.evaluate_script(script)
        retries = state.get("qa_script_retry_count", 0) + 1
        scorecard.retry_count = retries

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.qa_script = scorecard
            if scorecard.score < 80 and retries >= 3:
                task.status = PipelineStatus.QA_SCRIPT_FAILED
            await self.repository.update(task)

        return {
            "qa_script": scorecard,
            "qa_script_retry_count": retries,
            "status": PipelineStatus.QA_SCRIPT_FAILED if scorecard.score < 80 and retries >= 3 else state["status"],
        }

class QABlueprintUseCase:
    
    def __init__(
        self,
        evaluator: BlueprintEvaluator,
        repository: PipelineTaskRepository,
    ) -> None:
        self.evaluator = evaluator
        self.repository = repository

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running QABlueprint")
        
        blueprint = state["blueprint"]
        if not blueprint:
            raise ValueError("Blueprint is missing in state.")

        # Grade the blueprint using BlueprintEvaluator interface
        scorecard = await self.evaluator.evaluate_blueprint(blueprint)
        retries = state.get("qa_blueprint_retry_count", 0) + 1
        scorecard.retry_count = retries

        # Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.qa_blueprint = scorecard
            if scorecard.score < 80 and retries >= 3:
                task.status = PipelineStatus.QA_BLUEPRINT_FAILED
            await self.repository.update(task)

        return {
            "qa_blueprint": scorecard,
            "qa_blueprint_retry_count": retries,
            "status": PipelineStatus.QA_BLUEPRINT_FAILED if scorecard.score < 80 and retries >= 3 else state["status"],
        }
