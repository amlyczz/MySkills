from datetime import datetime
import uuid
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, DateTime, Enum, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
import enum

from .database import Base

# ==========================================
# Domain Layer: Pydantic Models (Strict Typing)
# ==========================================

class ProjectType(str, enum.Enum):
    EDUCATIONAL = "educational"
    PROMO = "promo"

class RepoAnalysisModel(BaseModel):
    repo_url: str
    project_name: str
    project_type: ProjectType
    description: str
    key_features: List[str]
    pain_points: List[str]
    raw_materials: List[str] = Field(default_factory=list) # e.g. paths to screenshots

class VideoSegment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    voiceover_prompt: Optional[str] = None
    visual_type: str = "generic" # intro, outro, generic
    visual_params: Dict[str, Any] = Field(default_factory=dict)

class VideoScriptModel(BaseModel):
    title: str
    segments: List[VideoSegment]
    target_duration_seconds: int

class BlueprintModel(BaseModel):
    version: str = "1.0.0"
    fps: int = 30
    durationInFrames: int
    compositionWidth: int = 1920
    compositionHeight: int = 1080
    scenes: List[Dict[str, Any]] # Frontend remotion properties

# ==========================================
# Infrastructure Layer: SQLAlchemy Models
# ==========================================

class PipelineStatus(str, enum.Enum):
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

class PipelineTaskDB(Base):
    __tablename__ = "pipeline_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_url = Column(String, nullable=False)
    status = Column(Enum(PipelineStatus), default=PipelineStatus.PENDING, nullable=False)
    
    # Store the Pydantic models as JSONB
    repo_analysis = Column(JSONB, nullable=True)
    video_script = Column(JSONB, nullable=True)
    blueprint = Column(JSONB, nullable=True)
    
    # QA Scores
    qa_script_score = Column(Integer, nullable=True)
    qa_blueprint_score = Column(Integer, nullable=True)
    
    # Artifacts (Paths to local storage)
    video_mp4_path = Column(String, nullable=True)
    final_mp4_path = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
