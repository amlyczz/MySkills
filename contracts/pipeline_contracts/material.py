"""
MaterialManifest — 素材采集清单的数据契约。

从 material-collector/schema/models.py 迁移而来，作为 pipeline 各层共享的单一来源。
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any


class RepoRef(BaseModel):
    """仓库引用（与 content.py 的 RepoInfo 字段结构一致，供 manifest 使用）"""
    full_name: str
    url: str


class MaterialSource(BaseModel):
    """素材来源元信息"""
    type: str = "github_page"
    url: Optional[str] = None
    original_url: Optional[str] = None
    element_selector: Optional[str] = None
    section: Optional[str] = None
    line_number: Optional[int] = None


class CaptureInfo(BaseModel):
    """素材采集元信息"""
    method: str = "gh_api"
    timestamp: Optional[str] = None
    duration_ms: Optional[float] = None
    retries: int = 0


class MaterialMetadata(BaseModel):
    """素材元数据（类型特定）"""
    alt_text: Optional[str] = None
    is_camo_url: Optional[bool] = None
    filter_reason: Optional[str] = None
    language: Optional[str] = None
    highlight_score: Optional[float] = None
    lines: Optional[int] = None
    module: Optional[str] = None
    conversion: Optional[str] = None


class Material(BaseModel):
    """单个素材条目"""
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
    """material_manifest.json 顶层模型 (v2)"""
    version: str = "2"
    repo: Optional[RepoRef] = None
    created_at: Optional[str] = None
    materials: list[Material] = Field(default_factory=list)

    @classmethod
    def from_json(cls, path: str) -> "MaterialManifest":
        """从 JSON 文件加载并验证。"""
        import json
        with open(path, "r", encoding="utf-8") as f:
            return cls.model_validate(json.load(f))

    def to_json_file(self, path: str) -> None:
        """序列化并写入 JSON 文件。"""
        import json
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=2, exclude_none=True))
