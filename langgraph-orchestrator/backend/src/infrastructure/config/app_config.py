import os
from pydantic import BaseModel, Field

class AppConfig(BaseModel):
    database_url: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL", "postgresql+asyncpg://zand:811098@localhost:5432/video_pipeline"
        )
    )
    openai_api_key: str = Field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY", "")
    )
    openai_base_url: str = Field(
        default_factory=lambda: os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    )
    langfuse_public_key: str = Field(
        default_factory=lambda: os.getenv("LANGFUSE_PUBLIC_KEY", "pk-lf-test")
    )
    langfuse_secret_key: str = Field(
        default_factory=lambda: os.getenv("LANGFUSE_SECRET_KEY", "sk-lf-test")
    )
    langfuse_host: str = Field(
        default_factory=lambda: os.getenv("LANGFUSE_HOST", "http://localhost:3000")
    )
    output_dir: str = Field(
        default_factory=lambda: os.getenv("OUTPUT_DIR", "x:\\home\\zand\\proj\\MySkills\\output")
    )

settings = AppConfig()
