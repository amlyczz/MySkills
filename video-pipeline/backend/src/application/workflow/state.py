from typing import TypedDict, Optional

from ...domain.repo_analyzer.entities import ContentModel, MaterialManifest, Script, DomainAnalysis
from ...domain.visual_blueprint.entities import Blueprint
from ...domain.task.entities import PipelineStatus, QAScorecard
from ...domain.github_trending.entities import ScoredRepo


class PipelineState(TypedDict):
    """TypedDict for LangGraph pipeline state.

    Using TypedDict (not Pydantic) because LangGraph's checkpoint/snapshot mechanism
    requires plain dict merging. Pydantic BaseModel would require a custom
    state class that implements dict-compatible methods.
    """
    task_id: str
    repo_url: str
    project_category: str
    status: PipelineStatus

    # Trending HITL
    trending_repos: Optional[list[ScoredRepo]]
    hitl_trending_feedback: Optional[str]

    # Domain entities
    content_model: Optional[ContentModel]
    material_manifest: Optional[MaterialManifest]
    script: Optional[Script]

    # Visual blueprint
    blueprint: Optional[Blueprint]

    # Domain analysis
    domain_analysis: Optional[DomainAnalysis]

    # QA scorecards
    qa_script: Optional[QAScorecard]
    qa_blueprint: Optional[QAScorecard]

    # State tracking
    qa_script_retry_count: int
    qa_blueprint_retry_count: int

    # QA feedback loop
    qa_script_feedback: Optional[str]
    qa_blueprint_feedback: Optional[str]

    # Audio design outputs
    segment_actual_durations: list[float]

    # Output paths
    voiceover_path: Optional[str]
    bgm_path: Optional[str]
    video_mp4_path: Optional[str]
    final_mp4_path: Optional[str]

    # Error
    error: Optional[str]
