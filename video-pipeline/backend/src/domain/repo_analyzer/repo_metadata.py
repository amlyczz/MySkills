from typing import Optional
from pydantic import BaseModel, Field


class DirectoryEntry(BaseModel):
    """Single entry in a repository directory tree."""
    path: str
    type: str = "blob"  # blob or tree


class CoreFile(BaseModel):
    """A collected source file with its content."""
    path: str
    content: str


class RepoMetadata(BaseModel):
    """Structured repository metadata collected from GitHub API.

    Replaces the untyped dict that was previously passed around.
    """
    full_name: str = ""
    description: str = ""
    language: str = ""
    stargazers_count: int = 0
    forks_count: int = 0
    topics: list[str] = Field(default_factory=list)
    license: str = ""
    default_branch: str = "main"
    homepage: str = ""
    directory_tree: list[DirectoryEntry] = Field(default_factory=list)
    core_files: list[CoreFile] = Field(default_factory=list)
