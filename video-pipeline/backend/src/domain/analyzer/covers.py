from pydantic import BaseModel, Field

class CoverVariant(BaseModel):
    """Cover image prompt (one aspect ratio)."""
    prompt_zh: str
    prompt_en: str

class Covers(BaseModel):
    """Cover image prompts (3x4 + 16x9)."""
    size_3x4: CoverVariant = Field(alias="3x4")
    size_16x9: CoverVariant = Field(alias="16x9")

    model_config = {"populate_by_name": True}
