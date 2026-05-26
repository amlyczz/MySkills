from typing import Optional
from pydantic import BaseModel, Field, model_validator

from .covers import Covers
from .meta import Meta
from .project_encyclopedia import ProjectEncyclopedia
from .publish_copy import PublishCopy
from .script import Script
from .source_code_insight import SourceCodeInsight
from .source_metadata import AnySourceMeta

class ContentModel(BaseModel):
    """content.json top-level model."""
    source: AnySourceMeta = Field(..., discriminator="source_type")
    content: Optional[ProjectEncyclopedia] = None
    script: Optional[Script] = None
    covers: Optional[Covers] = None
    publish_copy: Optional[PublishCopy] = None
    source_code_insight: Optional[SourceCodeInsight] = None
    curated_materials: Optional[list[str]] = None
    meta: Optional[Meta] = None

    @model_validator(mode="before")
    @classmethod
    def _reconstruct_content_from_encyclopedia(cls, data):
        """Handle legacy DB records where encyclopedia was stored instead of content,
        or where content is missing due to incomplete serialization."""
        if isinstance(data, dict):
            # If content is missing but encyclopedia exists (legacy format), use it
            if data.get("content") is None and data.get("encyclopedia") is not None:
                data["content"] = data["encyclopedia"]
            # If content is still missing, create minimal content from source
            if data.get("content") is None and data.get("source") is not None:
                src = data["source"]
                name = src.get("name") or src.get("full_name") or "Unknown" if isinstance(src, dict) else "Unknown"
                data["content"] = {
                    "title": name,
                    "tagline": "Repository analysis",
                    "quick_start": "",
                    "use_cases": "",
                    "usage_intro": "",
                }
        return data

    def to_json_file(self, path: str) -> None:
        """Serialize and write to JSON file."""
        import json
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=2, by_alias=True, exclude_none=True))

    @classmethod
    def from_json_file(cls, path: str) -> "ContentModel":
        """Deserialize from JSON file."""
        import json
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.model_validate(data)
