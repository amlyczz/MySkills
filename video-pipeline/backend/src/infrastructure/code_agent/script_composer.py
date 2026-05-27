"""CodeAgent-backed script composer — Claude Code writes video scripts.

Drop-in replacement for LLMScriptComposer. Same prompts, different LLM backend.
"""

import json
import logging
from typing import Callable, Optional

from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis, Script
from ...domain.script_composer.interfaces import ScriptComposer
from ...domain.twitter_analyzer.entities import TwitterContentModel
from ..llm.prompt_loader import load_prompt
from .claude_code import ClaudeCodeChatModel

logger = logging.getLogger(__name__)


class CodeAgentScriptComposer(ScriptComposer):
    """ScriptComposer backed by Claude Code CLI."""

    def __init__(self, timeout: int = 900, on_progress: Optional[Callable[[str], None]] = None) -> None:
        self.llm = ClaudeCodeChatModel(timeout=timeout, on_progress=on_progress)

    async def compose_script(
        self,
        content: Optional[ContentModel] = None,
        target_duration: int = 0,
        domain_analysis: Optional[DomainAnalysis] = None,
        qa_feedback: Optional[str] = None,
        twitter_content: Optional[TwitterContentModel] = None,
    ) -> Script:
        system = load_prompt("script_composer", "compose_script_system.md")
        user_template = load_prompt("script_composer", "compose_script_user.md")

        # Build context
        context_parts = []
        if content:
            context_parts.append(f"项目百科:\n{content.content.model_dump_json(indent=2) if content.content else 'N/A'}")
            if content.source_code_insight:
                context_parts.append(f"源码洞察:\n{content.source_code_insight.model_dump_json(indent=2)}")
        if domain_analysis:
            context_parts.append(f"领域分析:\n{domain_analysis.model_dump_json(indent=2)}")
        if twitter_content:
            context_parts.append(f"Twitter内容:\n{twitter_content.model_dump_json(indent=2)}")
        if qa_feedback:
            context_parts.append(f"QA反馈（需要改进）:\n{qa_feedback}")
        if target_duration:
            context_parts.append(f"目标时长: {target_duration}秒")

        context = "\n\n".join(context_parts)
        user = user_template.replace("{enriched_input}", context)

        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        result = self.llm._generate(messages)
        content_str = result.generations[0].message.content

        return self._parse_script(content_str)

    @staticmethod
    def _parse_script(raw: str) -> Script:
        raw = raw.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            end_idx = len(lines)
            for i in range(len(lines) - 1, 0, -1):
                if lines[i].strip() == "```":
                    end_idx = i
                    break
            raw = "\n".join(lines[1:end_idx])

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(raw[start:end])
            else:
                raise ValueError(f"Could not parse script JSON: {raw[:500]}")

        return Script.model_validate(data)
