"""CodeAgent-backed blueprint composer — Claude Code generates Remotion blueprints.

Drop-in replacement for LLMBlueprintComposer.
"""

import json
import logging
from typing import Callable, Optional

from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis, Script
from ...domain.visual_blueprint.entities import Blueprint
from ...domain.visual_blueprint.interfaces import BlueprintComposer
from ..llm.prompt_loader import load_prompt
from .claude_code import ClaudeCodeChatModel, parse_claude_json


logger = logging.getLogger(__name__)


class CodeAgentBlueprintComposer(BlueprintComposer):
    """BlueprintComposer backed by Claude Code CLI."""

    def __init__(self, timeout: int = 900, effort: str = "medium", on_progress: Optional[Callable[[str], None]] = None) -> None:
        # Do not use from_pydantic, as the strict structured output enforcement 
        # can cause error_max_structured_output_retries for complex schemas.
        self.llm = ClaudeCodeChatModel(timeout=timeout, effort=effort, on_progress=on_progress)

    async def compose_blueprint(
        self,
        script: Script,
        content: ContentModel,
        qa_feedback: Optional[str] = None,
        domain_analysis: Optional[DomainAnalysis] = None,
    ) -> Blueprint:
        system = load_prompt("visual_blueprint", "compose_blueprint_system.md")
        user_template = load_prompt("visual_blueprint", "compose_blueprint_user.md")

        # Inject JSON schema into system prompt to guide generation without strict API enforcement
        schema_str = json.dumps(Blueprint.model_json_schema(), ensure_ascii=False, indent=2)
        system += "\n\n### 期望的 JSON Schema\n请严格遵守以下 JSON Schema 输出:\n```json\n" + schema_str + "\n```"

        context_parts = []
        context_parts.append(f"脚本:\n{script.model_dump_json(indent=2)}")
        if content.content:
            context_parts.append(f"项目百科:\n{content.content.model_dump_json(indent=2)}")
        if domain_analysis:
            context_parts.append(f"领域分析:\n{domain_analysis.model_dump_json(indent=2)}")
        if qa_feedback:
            context_parts.append(f"QA反馈（需要改进）:\n{qa_feedback}")

        context = "\n\n".join(context_parts)
        user = user_template.replace("{input}", context)

        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        result = self.llm._generate(messages)
        raw = result.generations[0].message.content

        return self._parse_blueprint(raw)

    @staticmethod
    def _parse_blueprint(raw: str) -> Blueprint:
        data = parse_claude_json(raw)
        return Blueprint.model_validate(data)
