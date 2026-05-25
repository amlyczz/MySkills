from pydantic import BaseModel, Field

class Meta(BaseModel):
    """Metadata."""
    generated_at: str
    source: str = Field(..., pattern=r"^(gh-trending|manual|gh-api)$")
