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

def _parse_node_agent_config() -> dict[str, str]:
    """Parse NODE_AGENT_CONFIG env var.

    Format: "analyze_repo=claude_code:900,github_trending=deepseek"
    Timeout (seconds) is optional, appended after colon.
    Unset nodes fall back to CODE_AGENT_TYPE.
    """
    raw = os.getenv("NODE_AGENT_CONFIG", "")
    if not raw:
        return {}
    config = {}
    for pair in raw.split(","):
        pair = pair.strip()
        if "=" in pair:
            k, v = pair.split("=", 1)
            config[k.strip()] = v.strip()
    return config


def get_node_timeout(node: str) -> int:
    """Get timeout for a specific node from NODE_AGENT_CONFIG.

    Format: "analyze_repo=claude_code:900" → 900s for analyze_repo.
    Falls back to CODE_AGENT_TIMEOUT env var, then 600s default.
    """
    raw = os.getenv("NODE_AGENT_CONFIG", "")
    default = int(os.getenv("CODE_AGENT_TIMEOUT", "600"))
    if not raw:
        return default
    for pair in raw.split(","):
        pair = pair.strip()
        if "=" in pair:
            k, v = pair.split("=", 1)
            if k.strip() == node and ":" in v:
                try:
                    return int(v.split(":")[1].strip())
                except ValueError:
                    pass
    return default


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
    mimo_api_key: str = Field(
        default_factory=lambda: os.getenv("MIMO_API_KEY", "")
    )
    mimo_tts_voice: str = Field(
        default_factory=lambda: os.getenv("MIMO_TTS_VOICE", "苏打")
    )
    code_agent_type: str = Field(
        default_factory=lambda: os.getenv("CODE_AGENT_TYPE", "claude_code")
    )
    node_agent_config: dict[str, str] = Field(
        default_factory=lambda: _parse_node_agent_config()
    )

settings = AppConfig()
