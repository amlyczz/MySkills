from typing import TypedDict, Optional
from ...domain.analyzer.entities import RepoAnalysis
from ...domain.composer.entities import VideoScript
from ...domain.blueprint.entities import Blueprint
from ...domain.task.entities import PipelineStatus, QAScorecard

class PipelineState(TypedDict):
    task_id: str
    repo_url: str
    project_type: str
    status: PipelineStatus
    
    # Domain entities
    repo_analysis: Optional[RepoAnalysis]
    video_script: Optional[VideoScript]
    blueprint: Optional[Blueprint]
    
    # QA scorecards
    qa_script: Optional[QAScorecard]
    qa_blueprint: Optional[QAScorecard]
    
    # State tracking
    qa_script_retry_count: int
    qa_blueprint_retry_count: int
    
    # Outputs
    video_mp4_path: Optional[str]
    final_mp4_path: Optional[str]
    error: Optional[str]
