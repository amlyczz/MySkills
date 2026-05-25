import uuid
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.script_composer.interfaces import ScriptEvaluator
from ...domain.visual_blueprint.interfaces import BlueprintEvaluator
from ..workflow.state import PipelineState


def _format_feedback(score: int, reasoning: str) -> str:
    """Format QA reasoning into actionable feedback for the retry prompt."""
    return f"""## Previous QA Review (Score: {score}/100)

The independent QA evaluator found the following deficiencies:

{reasoning}

### Instructions for Retry:
You MUST address each deficiency listed above. Do NOT repeat the same mistakes.
Focus on fixing the specific issues identified by the reviewer."""


def _build_source_context(state: PipelineState) -> str:
    """Build source materials context for fact-checking from pipeline state."""
    parts = []

    # Content model provides structured analysis
    content_model = state.get("content_model")
    if content_model:
        if content_model.content:
            parts.append("## Content Analysis")
            parts.append(f"Title: {content_model.content.title}")
            parts.append(f"Summary: {content_model.content.summary or 'N/A'}")
            if content_model.content.points:
                parts.append(f"Key Points: {', '.join(content_model.content.points[:8])}")
            parts.append("")

        if content_model.source_code_insight:
            insight = content_model.source_code_insight
            parts.append("## Source Code Insight")
            if insight.architecture:
                parts.append(f"Architecture: {insight.architecture}")
            if insight.patterns:
                parts.append(f"Patterns: {', '.join(insight.patterns)}")
            if insight.highlights:
                parts.append(f"Highlights: {', '.join(insight.highlights)}")
            parts.append("")

        source = content_model.source
        if hasattr(source, "language") and source.language:
            parts.append(f"Primary Language: {source.language}")
        if hasattr(source, "stars") and source.stars:
            parts.append(f"Stars: {source.stars}")
        if hasattr(source, "topics") and source.topics:
            parts.append(f"Topics: {', '.join(source.topics)}")
        parts.append("")

    # Material manifest provides file-level info
    manifest = state.get("material_manifest")
    if manifest and manifest.materials:
        config_files = [m for m in manifest.materials if m.type == "code" and "config" in m.id]
        if config_files:
            parts.append("## Config Files Found")
            for m in config_files:
                parts.append(f"- {m.id} ({m.metadata.language or 'unknown'})")
            parts.append("")

        source_files = [m for m in manifest.materials if m.type == "code" and "config" not in m.id]
        if source_files:
            parts.append("## Core Source Files Analyzed")
            for m in source_files[:5]:
                lang = m.metadata.language or "unknown" if m.metadata else "unknown"
                parts.append(f"- {m.id} ({lang})")
            parts.append("")

    if not parts:
        return ""

    return "## Source Materials for Fact-Checking\n\n" + "\n".join(parts)


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

        script = state.get("script")
        if not script:
            raise ValueError("Script is missing in state.")

        # Build source context for fact-checking
        source_context = _build_source_context(state)

        scorecard = await self.evaluator.evaluate_script(script, source_context)
        retries = state.get("qa_script_retry_count", 0) + 1
        scorecard.retry_count = retries

        # Build feedback string for retry prompt injection
        feedback = _format_feedback(scorecard.score, scorecard.reasoning) if scorecard.score < 80 else None

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
            "qa_script_feedback": feedback,
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

        blueprint = state.get("blueprint")
        if not blueprint:
            raise ValueError("Blueprint is missing in state.")

        scorecard = await self.evaluator.evaluate_blueprint(blueprint)
        retries = state.get("qa_blueprint_retry_count", 0) + 1
        scorecard.retry_count = retries

        # Build feedback string for retry prompt injection
        feedback = _format_feedback(scorecard.score, scorecard.reasoning) if scorecard.score < 80 else None

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
            "qa_blueprint_feedback": feedback,
            "status": PipelineStatus.QA_BLUEPRINT_FAILED if scorecard.score < 80 and retries >= 3 else state["status"],
        }
