from pydantic import BaseModel, Field

class AudienceProfile(BaseModel):
    """Target audience profile for video content."""
    primary: str = Field("developer", description="Primary audience: developer, cto, product_manager, researcher, general")
    expertise_level: str = Field("intermediate", description="Expected expertise: beginner, intermediate, advanced")
    domain_familiarity: str = Field("medium", description="Familiarity with the project's domain: low, medium, high")

class NarrativeAngle(BaseModel):
    """Narrative strategy for the video."""
    angle: str = Field("architecture_deep_dive", description="Narrative angle: tutorial, review, architecture_deep_dive, trend_introduction, comparison, feature_showcase")
    reasoning: str = Field("", description="Why this angle was chosen")
    pacing: str = Field("medium", description="Narrative pacing: fast, medium, slow")

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
