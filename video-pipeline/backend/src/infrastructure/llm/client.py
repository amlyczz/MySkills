import os
from langchain_deepseek import ChatDeepSeek
from ..config.app_config import settings


def _build(model: str, temperature: float) -> ChatDeepSeek:
    api_key = settings.openai_api_key or os.getenv("DEEPSEEK_API_KEY", "mock-key")
    return ChatDeepSeek(
        model=model,
        temperature=temperature,
        api_key=api_key,
        max_retries=2,
    )


def get_llm_client(temperature: float = 0.2, model: str | None = None) -> ChatDeepSeek:
    """Deep analysis / script composition / blueprint generation — uses pro model."""
    model_name = model or settings.llm_model_pro
    return _build(model_name, temperature)


def get_fast_client(temperature: float = 0.2) -> ChatDeepSeek:
    """Lightweight tasks (trending scoring, QA eval) — uses fast model."""
    return _build(settings.llm_model_fast, temperature)


def get_qa_client() -> ChatDeepSeek:
    """QA evaluation — uses pro model + higher temperature for critical review."""
    qa_model = settings.qa_model or settings.llm_model_pro
    return _build(qa_model, 0.7)
