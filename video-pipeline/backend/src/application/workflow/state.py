from typing import TypedDict, Optional

from ...domain.analyzer.entities import ContentModel, MaterialManifest, Script, DomainAnalysis
from ...domain.blueprint.entities import Blueprint
from ...domain.task.entities import PipelineStatus, QAScorecard
from ...domain.github_trending.entities import ScoredRepo


class PipelineState(TypedDict):
    task_id: str
    repo_url: str
    project_category: str
    status: PipelineStatus

    # Trending HITL
    trending_repos: Optional[list[ScoredRepo]]
    hitl_trending_feedback: Optional[str]

    # Domain entities (local to video-pipeline)
    content_model: Optional[ContentModel]
    material_manifest: Optional[MaterialManifest]
    script: Optional[Script]

    # Domain model local to video-pipeline
    blueprint: Optional[Blueprint]

    # Domain analysis for template selection
    domain_analysis: Optional[DomainAnalysis]

    # QA scorecards
    qa_script: Optional[QAScorecard]
    qa_blueprint: Optional[QAScorecard]

    # State tracking
    qa_script_retry_count: int
    qa_blueprint_retry_count: int

    # QA feedback loop — previous QA reasoning injected into retry prompts
    qa_script_feedback: Optional[str]
    qa_blueprint_feedback: Optional[str]

    # Audio design outputs (per-segment actual durations from TTS)
    segment_actual_durations: list[float]

    # Output paths
    voiceover_path: Optional[str]
    bgm_path: Optional[str]
    video_mp4_path: Optional[str]
    final_mp4_path: Optional[str]
    error: Optional[str]
