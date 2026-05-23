"""
ContentModel — 内容分析与项目理解的数据契约。

从 content-ingester/schema/models.py 迁移而来，作为 pipeline 各层共享的单一来源。
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, Union


class SourceMeta(BaseModel):
    """数据源元信息 — 多态基类"""
    source_type: str
    source_url: str
    source_name: str


class GitHubSourceMeta(SourceMeta):
    """GitHub 特有元信息"""
    source_type: Literal["github"] = "github"
    language: Optional[str] = None
    stars: Optional[int] = 0
    forks: Optional[int] = 0
    topics: Optional[list[str]] = Field(default_factory=list)
    license: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    homepage: Optional[str] = None


class PodcastSourceMeta(SourceMeta):
    """Podcast 特有元信息"""
    source_type: Literal["podcast"] = "podcast"
    host: Optional[str] = None
    episode_number: Optional[int] = None


class ProductSourceMeta(SourceMeta):
    """Product 特有元信息"""
    source_type: Literal["product"] = "product"
    version: Optional[str] = None
    category: Optional[str] = None


AnySourceMeta = Union[GitHubSourceMeta, PodcastSourceMeta, ProductSourceMeta]


class NormalizedContent(BaseModel):
    """规范化内容 — 所有下游 Processor 的统一输入"""
    title: str = Field(..., description="Short name or title")
    tagline: str = Field(..., description="One-sentence positioning")
    points: list[str] = Field(..., min_length=1, description="3-5 key features")
    summary: Optional[str] = Field(None, description="Closing reflection or outro hook")
    stats_text: Optional[str] = Field(None, description="Human-readable growth stats")
    target_users: Optional[str] = None
    domains: Optional[str] = Field(None, description="Classification tags, separated by 、")
    chartData: Optional[list[dict]] = Field(None, description="Optional benchmark/comparison data for animated bar charts")


class ScriptSegment(BaseModel):
    """口播脚本段落"""
    text: str
    duration_est: float = Field(..., ge=0)


class Script(BaseModel):
    """口播脚本"""
    full_text: str
    segments: list[ScriptSegment] = Field(..., min_length=1)
    total_duration_est: float = Field(..., ge=0)


class CoverVariant(BaseModel):
    """封面提示词（一个比例）"""
    prompt_zh: str
    prompt_en: str


class Covers(BaseModel):
    """封面提示词（3x4 + 16x9）"""
    size_3x4: CoverVariant = Field(alias="3x4")
    size_16x9: CoverVariant = Field(alias="16x9")

    model_config = {"populate_by_name": True}


class PublishTitle(BaseModel):
    """发布标题"""
    full: str
    short: str


class PublishCopy(BaseModel):
    """发布文案"""
    titles: list[PublishTitle] = Field(..., min_length=1)
    body: str = Field(..., description="Unified publish copy, 100-200 chars")
    tags: list[str]


class SourceCodeInsight(BaseModel):
    """源码洞察"""
    architecture: Optional[str] = None
    patterns: Optional[list[str]] = None
    highlights: Optional[list[str]] = None
    api_style: Optional[str] = None
    analyzed_files: Optional[list[str]] = None
    total_files_analyzed: Optional[int] = 0
    total_lines_analyzed: Optional[int] = 0
    dimensions: Optional[dict[str, str]] = Field(None, description="4 维分析，各 50-100 字")


class Meta(BaseModel):
    """元信息"""
    generated_at: str
    source: str = Field(..., pattern=r"^(gh-trending|manual|gh-api)$")


class ContentModel(BaseModel):
    """content.json 顶层模型"""
    source: AnySourceMeta = Field(..., discriminator="source_type")
    content: NormalizedContent
    script: Script
    covers: Covers
    publish_copy: PublishCopy
    source_code_insight: Optional[SourceCodeInsight] = None
    meta: Meta

    def to_json_file(self, path: str) -> None:
        """序列化并写入 JSON 文件。"""
        import json
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=2, by_alias=True, exclude_none=True))

    @classmethod
    def from_json_file(cls, path: str) -> "ContentModel":
        """从 JSON 文件反序列化。"""
        import json
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.model_validate(data)
