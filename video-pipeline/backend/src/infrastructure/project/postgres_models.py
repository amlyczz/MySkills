import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from ..task.connection import Base
from ...domain.project.entities import SourceType


class ProjectDB(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    source_type = Column(SAEnum(SourceType), default=SourceType.GITHUB_REPO, nullable=False)
    repo_url = Column(String, nullable=True)
    description = Column(String, nullable=True)
    language = Column(String, nullable=True)
    stars = Column(Integer, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
