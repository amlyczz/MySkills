import os
from langchain_openai import ChatOpenAI
from ..config.app_config import settings


def get_llm_client(temperature: float = 0.2, model: str | None = None) -> ChatOpenAI:
    """LLM client factory for generation tasks.

    Args:
        temperature: Generation temperature (default 0.2 — deterministic).
        model: Override model name (default from settings or gpt-4o).
    """
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY", "mock-key")
    base_url = settings.openai_base_url
    model_name = model or settings.llm_model

    return ChatOpenAI(
        model=model_name,
        temperature=temperature,
        openai_api_key=api_key,
        openai_api_base=base_url,
    )


def get_qa_client() -> ChatOpenAI:
    """LLM client factory for QA evaluation tasks.

    Uses a DIFFERENT model than generation to reduce self-preferencing bias.
    Higher temperature encourages critical evaluation over sycophancy.
    """
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY", "mock-key")
    base_url = settings.openai_base_url
    # QA 用更小/不同的模型，降低自我偏好
    qa_model = settings.qa_model or settings.llm_model

    return ChatOpenAI(
        model=qa_model,
        temperature=0.7,
        openai_api_key=api_key,
        openai_api_base=base_url,
    )
