import os
from pathlib import Path
from pydantic import BaseModel, Field

# app_config.py is at:
#   video-pipeline/backend/src/infrastructure/config/app_config.py
# Levels up to video-pipeline root: config(0) -> infrastructure(1) -> src(2) -> backend(3) -> video-pipeline(4)
PROJECT_ROOT = Path(__file__).resolve().parents[4]

def get_auto_proxy() -> str | None:
    proxy = os.getenv("HTTP_PROXY") or os.getenv("http_proxy")
    if proxy:
        return proxy
    import platform
    try:
        if "linux" in platform.system().lower() and "microsoft" in open("/proc/version").read().lower():
            return "http://172.28.0.1:10808"
        elif "darwin" in platform.system().lower():
            return "http://127.0.0.1:7890"
    except Exception:
        pass
    return None

class AppConfig(BaseModel):
    database_url: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL", ""
        )
    )
    openai_api_key: str = Field(
        default_factory=lambda: os.getenv("DEEPSEEK_V4_API_KEY", "") if os.getenv("USE_DEEPSEEK_V4", "False").lower() in ("true", "1", "yes") else os.getenv("OPENAI_API_KEY", "")
    )
    openai_base_url: str = Field(
        default_factory=lambda: os.getenv("DEEPSEEK_V4_API_BASE", "https://api.deepseek.com") if os.getenv("USE_DEEPSEEK_V4", "False").lower() in ("true", "1", "yes") else os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
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
        default_factory=lambda: os.getenv(
            "OUTPUT_DIR", str(PROJECT_ROOT / "output")
        )
    )
    http_proxy: str | None = Field(
        default_factory=get_auto_proxy
    )
    https_proxy: str | None = Field(
        default_factory=get_auto_proxy
    )
    llm_model_pro: str = Field(
        default_factory=lambda: os.getenv("LLM_MODEL_PRO", "deepseek-v4-pro")
    )
    llm_model_fast: str = Field(
        default_factory=lambda: os.getenv("LLM_MODEL_FAST", "deepseek-v4-flash")
    )
    qa_model: str | None = Field(
        default_factory=lambda: os.getenv("QA_MODEL") or None
    )

settings = AppConfig()
