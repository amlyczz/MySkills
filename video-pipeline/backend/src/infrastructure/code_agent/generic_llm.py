"""Generic CodeAgent LLM — drop-in replacement for any LangChain chain.

Wraps ClaudeCodeChatModel with a prompt + output parser so it can replace
any ``structured_chain(prompt, llm, Schema)`` call.
"""

import json
import logging
from typing import Any, Callable, Optional, Type

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from .claude_code import ClaudeCodeChatModel, parse_claude_json


logger = logging.getLogger(__name__)


class CodeAgentLLM:
    """Generic Claude Code wrapper that mimics a structured_chain call.

    Usage::

        agent = CodeAgentLLM(
            system_prompt="You are ...",
            output_schema=MyPydanticModel,
            allowed_tools=["Read", "Glob", "Grep", "Bash(gh:*)"],
        )
        result = await agent.ainvoke({"input": "..."})
        # result is an instance of MyPydanticModel
    """

    def __init__(
        self,
        system_prompt: str,
        output_schema: Type[BaseModel],
        allowed_tools: list[str] | None = None,
        timeout: int = 600,
        effort: str = "medium",
        on_progress: Optional[Callable[[str], None]] = None,
    ):
        self.system_prompt = system_prompt
        self.output_schema = output_schema
        self.llm = ClaudeCodeChatModel.from_pydantic(
            output_schema,
            allowed_tools=allowed_tools or ["Read", "Glob", "Grep", "Bash(gh:*)"],
            timeout=timeout,
            effort=effort,
            on_progress=on_progress,
        )

    async def ainvoke(self, variables: dict[str, Any]) -> Any:
        """Run the agent and return a parsed Pydantic model."""
        # Format the system prompt with variables
        system_text = self.system_prompt
        for k, v in variables.items():
            system_text = system_text.replace(f"{{{k}}}", str(v))

        # Build a simple user message with the remaining content
        user_parts = [f"{k}:\n{v}" for k, v in variables.items()]
        user_text = "\n\n".join(user_parts) if user_parts else "请分析。"

        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=system_text),
            HumanMessage(content=user_text),
        ]

        result = self.llm._generate(messages)
        content = result.generations[0].message.content

        return self._parse(content)

    def _parse(self, content: str) -> Any:
        """Parse JSON output into the target Pydantic schema."""
        data = parse_claude_json(content)
        return self.output_schema.model_validate(data)
