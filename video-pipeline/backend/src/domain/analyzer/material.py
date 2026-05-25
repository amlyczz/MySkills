from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator

class RepoRef(BaseModel):
    """Repository reference."""
    full_name: str
    url: str

class MaterialSource(BaseModel):
    """Material source metadata."""
    type: str = "github_page"
    url: Optional[str] = None
    original_url: Optional[str] = None
    element_selector: Optional[str] = None
    section: Optional[str] = None
    line_number: Optional[int] = None

class CaptureInfo(BaseModel):
    """Material capture metadata."""
    method: str = "gh_api"
    timestamp: Optional[str] = None
    duration_ms: Optional[float] = None
    retries: int = 0

class MaterialMetadata(BaseModel):
    """Material metadata (type-specific)."""
    alt_text: Optional[str] = None
    is_camo_url: Optional[bool] = None
    filter_reason: Optional[str] = None
    language: Optional[str] = None
    highlight_score: Optional[float] = None
    lines: Optional[int] = None
    module: Optional[str] = None
    conversion: Optional[str] = None

class Material(BaseModel):
    """Single material entry."""
    id: str = ""
    type: str
    path: str
    duration: Optional[float] = None
    speed: float = 1.0
    dimensions: Optional[list[int]] = None
    file_size_kb: Optional[float] = None
    source: Optional[MaterialSource] = None
    capture: Optional[CaptureInfo] = None
    metadata: Optional[MaterialMetadata] = None
    extra: dict[str, Any] = Field(default_factory=dict)

    @field_validator("dimensions")
    @classmethod
    def validate_dimensions(cls, v: Optional[list[int]]) -> Optional[list[int]]:
        if v is not None and len(v) != 2:
            raise ValueError(f"dimensions must be [width, height], got {v}")
        return v

class MaterialManifest(BaseModel):
    """material_manifest.json top-level model (v2)."""
    version: str = "2"
    repo: Optional[RepoRef] = None
    created_at: Optional[str] = None
    materials: list[Material] = Field(default_factory=list)

    @classmethod
    def from_json(cls, path: str) -> "MaterialManifest":
        """Load and validate from JSON file."""
        import json
        with open(path, "r", encoding="utf-8") as f:
            return cls.model_validate(json.load(f))

    def to_json_file(self, path: str) -> None:
        """Serialize and write to JSON file."""
        import json
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=2, exclude_none=True))
