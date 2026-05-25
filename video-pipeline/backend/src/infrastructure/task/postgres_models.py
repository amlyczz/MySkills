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

    # JSONB columns for domain models (from contracts)
    content_model = Column(JSONB, nullable=True)
    material_manifest = Column(JSONB, nullable=True)
    script = Column(JSONB, nullable=True)

    # JSONB column for local domain model (Blueprint)
    blueprint = Column(JSONB, nullable=True)
    trending_repos = Column(JSONB, nullable=True)

    # QA Scorecards stored as JSONB
    qa_script = Column(JSONB, nullable=True)
    qa_blueprint = Column(JSONB, nullable=True)

    # Local output paths
    voiceover_path = Column(String, nullable=True)
    bgm_path = Column(String, nullable=True)
    video_mp4_path = Column(String, nullable=True)
    final_mp4_path = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
