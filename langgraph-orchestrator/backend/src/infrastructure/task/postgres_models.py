import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from .connection import Base
from ...domain.task.entities import PipelineStatus

class PipelineTaskDB(Base):
    __tablename__ = "pipeline_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_url = Column(String, nullable=False)
    status = Column(Enum(PipelineStatus), default=PipelineStatus.PENDING, nullable=False)
    
    # JSONB columns for Pydantic domain models
    repo_analysis = Column(JSONB, nullable=True)
    video_script = Column(JSONB, nullable=True)
    blueprint = Column(JSONB, nullable=True)
    
    # QA Scorecards stored as JSONB
    qa_script = Column(JSONB, nullable=True)
    qa_blueprint = Column(JSONB, nullable=True)
    
    # Local output paths
    video_mp4_path = Column(String, nullable=True)
    final_mp4_path = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
