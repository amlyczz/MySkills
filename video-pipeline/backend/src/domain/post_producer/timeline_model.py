from typing import Optional
from pydantic import BaseModel, Field

from ...domain.repo_analyzer.entities import RepoRef
from .timeline_config import GlobalTimelineConfig
from .timeline_segment import TimelineSegment

class ChapterMarker(BaseModel):
    """Chapter marker."""
    label: str
    time: float = 0.0

class SubtitleEntry(BaseModel):
    """Subtitle entry."""
    text: str
    time_start: float = 0.0
    time_end: float = 0.0

class TimelineModel(BaseModel):
    """timeline.json top-level model."""
    version: str = "2"
    repo: Optional[RepoRef] = None
    global_: GlobalTimelineConfig = Field(default_factory=GlobalTimelineConfig, alias="global")
    segments: list[TimelineSegment] = Field(default_factory=list)
    chapters: list[ChapterMarker] = Field(default_factory=list)
    subtitles: list[SubtitleEntry] = Field(default_factory=list)

    model_config = {"populate_by_name": True}

    @classmethod
    def from_json(cls, path: str) -> "TimelineModel":
        """Load from timeline.json file."""
        import json
        with open(path, "r", encoding="utf-8") as f:
            return cls.model_validate(json.load(f))

    def to_json(self) -> dict:
        """Serialize to JSON-compatible dict."""
        return self.model_dump(by_alias=True, exclude_none=True)
