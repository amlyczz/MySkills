import os
from langchain_deepseek import ChatDeepSeek
from ..config.app_config import settings


def _build(model: str, temperature: float, **kwargs) -> ChatDeepSeek:
    api_key = settings.openai_api_key or os.getenv("DEEPSEEK_API_KEY", "mock-key")
    return ChatDeepSeek(
        model=model,
        temperature=temperature,
        api_key=api_key,
        max_retries=2,
        max_tokens=16384,
        **kwargs,
    )


def get_llm_client(temperature: float = 0.2, model: str | None = None) -> ChatDeepSeek:
    """Deep analysis / script composition / blueprint generation — uses pro model."""
    model_name = model or settings.llm_model_pro
    return _build(model_name, temperature)


def get_json_client(temperature: float = 0.2, model: str | None = None) -> ChatDeepSeek:
    """Structured JSON output — follows DeepSeek JSON Output docs."""
    model_name = model or settings.llm_model_pro
    return _build(
        model_name, temperature,
        model_kwargs={"response_format": {"type": "json_object"}},
        reasoning_effort=_thinking_effort(model_name),
    )


def get_thinking_client(temperature: float = 0.2, model: str | None = None) -> ChatDeepSeek:
    """Non-structured calls with reasoning (analysis, classification)."""
    model_name = model or settings.llm_model_pro
    return _build(model_name, temperature, reasoning_effort=_thinking_effort(model_name))


def _thinking_effort(model: str) -> str | None:
    if "pro" in model.lower():
        return "max"
    elif "flash" in model.lower():
        return "high"
    return None


def get_fast_client(temperature: float = 0.2) -> ChatDeepSeek:
    """Lightweight tasks (trending scoring, QA eval) — uses fast model."""
    return _build(settings.llm_model_fast, temperature)


def get_qa_client() -> ChatDeepSeek:
    """QA evaluation — uses pro model + higher temperature for critical review."""
    qa_model = settings.qa_model or settings.llm_model_pro
    return _build(qa_model, 0.7)
