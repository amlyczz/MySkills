from typing import Any
from pydantic import BaseModel, Field, field_validator

class AudienceProfile(BaseModel):
    """Target audience profile for video content. Tolerates LLM naming quirks."""
    primary: str = Field("developer", description="Primary audience")
    expertise_level: str = Field("intermediate", description="Expertise level")
    domain_familiarity: str = Field("medium", description="Domain familiarity")

    @field_validator("primary", mode="before")
    @classmethod
    def _coerce_primary(cls, v: Any) -> str:
        if isinstance(v, dict):
            return v.get("primary_audience", v.get("primary", str(v)))
        return str(v) if v else "developer"

class NarrativeAngle(BaseModel):
    """Narrative strategy for the video. Tolerates LLM naming quirks."""
    angle: str = Field("architecture_deep_dive", description="Narrative angle")
    reasoning: str = Field("", description="Why this angle was chosen")
    pacing: str = Field("medium", description="Narrative pacing: fast, medium, slow")

    @field_validator("angle", mode="before")
    @classmethod
    def _coerce_angle(cls, v: Any) -> str:
        if isinstance(v, dict):
            return v.get("strategy", v.get("angle", str(v)))
        return str(v) if v else "architecture_deep_dive"

    @field_validator("reasoning", mode="before")
    @classmethod
    def _coerce_reasoning(cls, v: Any) -> str:
        if isinstance(v, dict):
            return v.get("rationale", str(v))
        return str(v) if v else ""

class InformationHierarchy(BaseModel):
    """Information priority levels."""
    must_tell: list[str] = Field(default_factory=list, description="3 items that MUST be in the video")
    worth_telling: list[str] = Field(default_factory=list, description="2 items worth including if time allows")
    can_skip: list[str] = Field(default_factory=list, description="Items that can be safely omitted")

class DomainAnalysis(BaseModel):
    """Domain analysis result — audience + narrative strategy."""
    architecture_pattern: str = Field("", description="Identified architecture pattern")
    audience: AudienceProfile = Field(default_factory=AudienceProfile)
    narrative: NarrativeAngle = Field(default_factory=NarrativeAngle)
    information_hierarchy: InformationHierarchy = Field(default_factory=InformationHierarchy)
    technical_depth: str = Field("medium", description="Recommended technical depth: surface, medium, deep")

    @field_validator("architecture_pattern", mode="before")
    @classmethod
    def _coerce_arch_pattern(cls, v: Any) -> str:
        if isinstance(v, dict):
            return v.get("primary", "") or str(v)
        if isinstance(v, str):
            return v
        return str(v) if v else ""
