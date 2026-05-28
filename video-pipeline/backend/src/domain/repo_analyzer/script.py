from typing import Optional
from pydantic import BaseModel, Field

class ScriptSegment(BaseModel):
    """Narration script segment."""
    text: str
    duration_est: float = Field(5.0, ge=0)
    assigned_asset: Optional[str] = Field(None, description="The URL of the curated asset to display, or Mermaid code snippet.")
    visual_hook: str = Field(..., description="Instructions for the video editor (e.g., zoom, pan, highlight).")

class Script(BaseModel):
    """Narration script."""
    full_text: str
    segments: list[ScriptSegment] = Field(..., min_length=1)
    total_duration_est: float = Field(..., ge=0)

class ScriptChapterPlan(BaseModel):
    """A high-level plan for a single script chapter."""
    chapter_title: str = Field(..., description="The title or topic of this chapter")
    target_duration_est: float = Field(..., description="Target duration in seconds for this chapter")
    description: str = Field(..., description="Brief description of what this chapter covers")
    key_points: list[str] = Field(..., description="Key points that must be covered in this chapter")

class ScriptPlan(BaseModel):
    """Overall narrative plan for the script."""
    chapters: list[ScriptChapterPlan] = Field(..., description="Ordered list of chapters")
    overall_narrative_arc: str = Field(..., description="Description of the overall narrative flow")

class ChapterScript(BaseModel):
    """The generated script for a single chapter."""
    segments: list[ScriptSegment] = Field(..., description="Script segments for this chapter")
    chapter_summary: str = Field(..., description="A brief summary of what was covered, to be passed to the next chapter generation for continuity")
