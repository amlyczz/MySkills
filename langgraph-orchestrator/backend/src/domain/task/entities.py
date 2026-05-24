import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

from ..analyzer.entities import RepoAnalysis
from ..composer.entities import VideoScript
from ..blueprint.entities import Blueprint

class PipelineStatus(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    COMPOSING = "composing"
    QA_SCRIPT_FAILED = "qa_script_failed"
    BLUEPRINTING = "blueprinting"
    QA_BLUEPRINT_FAILED = "qa_blueprint_failed"
    AGENTIC_CODE_GEN = "agentic_code_gen"
    RENDERING = "rendering"
    POST_PROCESSING = "post_processing"
    COMPLETED = "completed"
    ERROR = "error"

class QAScorecard(BaseModel):
    score: int
    reasoning: str
    retry_count: int = 0

class PipelineTask(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    repo_url: str
    status: PipelineStatus = PipelineStatus.PENDING
    
    # Subdomain domain models
    repo_analysis: Optional[RepoAnalysis] = None
    video_script: Optional[VideoScript] = None
    blueprint: Optional[Blueprint] = None
    
    # Strictly-typed QA scorecards
    qa_script: Optional[QAScorecard] = None
    qa_blueprint: Optional[QAScorecard] = None
    
    # Local output file paths
    video_mp4_path: Optional[str] = None
    final_mp4_path: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
