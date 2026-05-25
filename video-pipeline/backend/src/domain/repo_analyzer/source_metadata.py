from typing import Literal, Optional, Union
from pydantic import BaseModel, Field

class SourceMeta(BaseModel):
    """Data source metadata — polymorphic base."""
    source_type: str
    source_url: str = ""
    source_name: str = ""

class GitHubSourceMeta(SourceMeta):
    """GitHub-specific metadata."""
    source_type: Literal["github"] = "github"
    url: Optional[str] = Field(None, description="Repository URL")
    name: Optional[str] = Field(None, description="Repository name")
    full_name: Optional[str] = Field(None, description="owner/repo")
    language: Optional[str] = None
    stars: Optional[int] = 0
    forks: Optional[int] = 0
    topics: Optional[list[str]] = Field(default_factory=list)
    license: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    homepage: Optional[str] = None

class PodcastSourceMeta(SourceMeta):
    """Podcast-specific metadata."""
    source_type: Literal["podcast"] = "podcast"
    host: Optional[str] = None
    episode_number: Optional[int] = None

class ProductSourceMeta(SourceMeta):
    """Product-specific metadata."""
    source_type: Literal["product"] = "product"
    version: Optional[str] = None
    category: Optional[str] = None

AnySourceMeta = Union[GitHubSourceMeta, PodcastSourceMeta, ProductSourceMeta]
