from pydantic import BaseModel, Field

class PublishTitle(BaseModel):
    """Publish title."""
    full: str
    short: str

class PublishCopy(BaseModel):
    """Publish copy."""
    titles: list[PublishTitle] = Field(..., min_length=1)
    body: str = Field(..., description="Unified publish copy, 100-200 chars")
    tags: list[str]
