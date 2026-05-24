from enum import Enum
from pydantic import BaseModel, Field

class ProjectType(str, Enum):
    EDUCATIONAL = "educational"
    PROMO = "promo"

class RepoAnalysis(BaseModel):
    repo_url: str
    project_name: str
    project_type: ProjectType
    description: str
    key_features: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    raw_materials: list[str] = Field(default_factory=list)
