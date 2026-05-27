"""LLM client factory with role-based abstraction.

Roles map to specific model/temperature/mode configurations so that each pipeline
node can declare *what* it needs (extraction, reasoning, scoring, QA) without
coupling to a concrete model name.

Quick reference:
    - ``extraction``  — Strict tool_calls (beta endpoint), pro model, thinking enabled
    - ``reasoning``   — Thinking mode (high reasoning_effort), pro model
    - ``scoring``     — Fast model (flash), thinking enabled
    - ``qa``          — Pro model with higher temperature for critical review
    - ``generation``  — Pro model, plain chat (no structured output constraints)

Note: DeepSeek V4 enables thinking mode by default. Thinking supports tool_calls
with ``tool_choice: "auto"``, but NOT with specific function name. Use
:func:`structured_chain` for strict structured output compatible with thinking.
"""

import enum
import re
import os
import logging
from langchain_deepseek import ChatDeepSeek
from langchain_core.runnables import RunnableLambda
from langchain_core.utils.function_calling import convert_to_openai_tool
from ..config.app_config import settings

logger = logging.getLogger(__name__)

# ── Beta endpoint for DeepSeek strict mode ────────────────────────────
_DEEPSEEK_BETA_BASE = "https://api.deepseek.com/beta"


class LLMRole(str, enum.Enum):
    """Semantic roles that map to concrete LLM configurations."""
    EXTRACTION = "extraction"      # Strict tool_calls, pro model, thinking enabled
    REASONING = "reasoning"        # Deep thinking / analysis
    SCORING = "scoring"            # Lightweight classification / scoring (fast model)
    QA = "qa"                      # Critical review with higher temperature
    GENERATION = "generation"      # Free-form generation (scripts, etc.)


def _thinking_effort(model: str) -> str | None:
    if "pro" in model.lower():
        return "max"
    elif "flash" in model.lower():
        return "high"
    return None


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


# ── Role → config mapping ────────────────────────────────────────────

def _build_extraction(model: str | None = None, temperature: float = 0.2) -> ChatDeepSeek:
    """Strict tool_calls — beta endpoint for server-side schema enforcement.

    Uses ``structured_chain()`` for structured output (thinking-compatible).
    """
    model_name = model or settings.llm_model_pro
    api_key = settings.openai_api_key or os.getenv("DEEPSEEK_API_KEY", "mock-key")
    return ChatDeepSeek(
        model=model_name,
        temperature=temperature,
        api_key=api_key,
        api_base=_DEEPSEEK_BETA_BASE,
        max_retries=2,
        max_tokens=16384,
        reasoning_effort=_thinking_effort(model_name),
    )


def _build_reasoning(model: str | None = None, temperature: float = 0.2) -> ChatDeepSeek:
    """Thinking mode — reasoning_effort with no JSON constraints."""
    model_name = model or settings.llm_model_pro
    return _build(model_name, temperature, reasoning_effort=_thinking_effort(model_name))


def _build_scoring(temperature: float = 0.2) -> ChatDeepSeek:
    """Fast model for lightweight tasks."""
    return _build(settings.llm_model_fast, temperature, reasoning_effort=_thinking_effort(settings.llm_model_fast))


def _build_qa(temperature: float = 0.7) -> ChatDeepSeek:
    """Pro model with higher temperature for critical review."""
    qa_model = settings.qa_model or settings.llm_model_pro
    return _build(qa_model, temperature)


def _build_generation(model: str | None = None, temperature: float = 0.2) -> ChatDeepSeek:
    """Plain pro model for free-form generation."""
    model_name = model or settings.llm_model_pro
    return _build(model_name, temperature)


_ROLE_BUILDERS = {
    LLMRole.EXTRACTION: _build_extraction,
    LLMRole.REASONING: _build_reasoning,
    LLMRole.SCORING: _build_scoring,
    LLMRole.QA: _build_qa,
    LLMRole.GENERATION: _build_generation,
}


def get_llm(role: LLMRole, **kwargs) -> ChatDeepSeek:
    """Get an LLM client by semantic role.

    Args:
        role: Semantic role that determines model, temperature, and mode.
        **kwargs: Forwarded to the role-specific builder (e.g. temperature, model).

    Returns:
        Configured ChatDeepSeek instance.
    """
    builder = _ROLE_BUILDERS.get(role)
    if builder is None:
        raise ValueError(f"Unknown LLM role: {role}")
    return builder(**kwargs)


def structured_chain(prompt, llm, schema_cls, include_raw=False):
    """Build a chain using DeepSeek strict tool_calls (thinking-compatible).

    Unlike ``with_structured_output(method="function_calling")``, this does NOT
    set ``tool_choice`` to a specific function name, so it works with DeepSeek's
    thinking mode. Strict schema enforcement is achieved via the beta endpoint.

    Args:
        prompt: ChatPromptTemplate.
        llm: ChatDeepSeek instance.
        schema_cls: Pydantic model class for structured output.
        include_raw: If True, return ``{"parsed": ..., "raw": ...}``.

    Returns:
        Runnable chain: prompt → llm_with_strict_tool → parser.
    """
    # Ensure beta endpoint for strict mode
    if _DEEPSEEK_BETA_BASE not in (llm.api_base or ""):
        llm = llm.model_copy(update={"api_base": _DEEPSEEK_BETA_BASE})

    # Convert schema to OpenAI tool format with strict: true
    tool_def = convert_to_openai_tool(schema_cls)
    tool_def["function"]["strict"] = True

    # Bind tools WITHOUT specific tool_choice (thinking-compatible)
    llm_with_tools = llm.bind_tools([tool_def], parallel_tool_calls=False)

    def _parse(msg):
        # Primary: parse from tool_call arguments
        if hasattr(msg, 'tool_calls') and msg.tool_calls:
            args = msg.tool_calls[0]['args']
            if isinstance(args, str):
                return schema_cls.model_validate_json(args)
            return schema_cls.model_validate(args)
        # Fallback: parse from content
        content = msg.content or ""
        content = re.sub(r'^```(?:json)?\s*', '', content.strip())
        content = re.sub(r'\s*```\s*$', '', content)
        return schema_cls.model_validate_json(content)

    parser = RunnableLambda(_parse)

    if include_raw:
        def _parse_with_raw(msg):
            return {"parsed": _parse(msg), "raw": msg}
        parser = RunnableLambda(_parse_with_raw)

    return prompt | llm_with_tools | parser


# ── Legacy aliases (backward compat, will be removed) ────────────────

def get_llm_client(temperature: float = 0.2, model: str | None = None) -> ChatDeepSeek:
    """Legacy — use ``get_llm(LLMRole.GENERATION)``."""
    return get_llm(LLMRole.GENERATION, model=model, temperature=temperature)


def get_json_client(temperature: float = 0.2, model: str | None = None) -> ChatDeepSeek:
    """Legacy — use ``get_llm(LLMRole.EXTRACTION)`` for strict mode."""
    logger.warning("get_json_client() is deprecated, use get_llm(LLMRole.EXTRACTION)")
    return _build(
        model or settings.llm_model_pro, temperature,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


def get_thinking_client(temperature: float = 0.2, model: str | None = None) -> ChatDeepSeek:
    """Legacy — use ``get_llm(LLMRole.REASONING)``."""
    return get_llm(LLMRole.REASONING, model=model, temperature=temperature)


def get_fast_client(temperature: float = 0.2) -> ChatDeepSeek:
    """Legacy — use ``get_llm(LLMRole.SCORING)``."""
    return get_llm(LLMRole.SCORING, temperature=temperature)


def get_qa_client() -> ChatDeepSeek:
    """Legacy — use ``get_llm(LLMRole.QA)``."""
    return get_llm(LLMRole.QA)
