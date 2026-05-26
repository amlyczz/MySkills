import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

from ..repo_analyzer.entities import ContentModel, MaterialManifest, Script
from ..repo_analyzer.domain_analysis import DomainAnalysis
from ..visual_blueprint.entities import Blueprint
from ..github_trending.entities import ScoredRepo
from .pipeline_status import PipelineStatus
from .qa_scorecard import QAScorecard


class PipelineTask(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    repo_url: str
    status: PipelineStatus = PipelineStatus.PENDING

    # Domain entities (local to video-pipeline)
    content_model: Optional[ContentModel] = None
    material_manifest: Optional[MaterialManifest] = None
    script: Optional[Script] = None
    blueprint: Optional[Blueprint] = None
    trending_repos: Optional[list[ScoredRepo]] = None
    domain_analysis: Optional[DomainAnalysis] = None
    project_category: Optional[str] = "github"

    # Strictly-typed QA scorecards
    qa_script: Optional[QAScorecard] = None
    qa_blueprint: Optional[QAScorecard] = None
    qa_video: Optional[QAScorecard] = None

    # Local output file paths
    voiceover_path: Optional[str] = None
    bgm_path: Optional[str] = None
    video_mp4_path: Optional[str] = None
    final_mp4_path: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
