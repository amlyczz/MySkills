"""CodeAgent-backed script composer — Claude Code writes video scripts.

Drop-in replacement for LLMScriptComposer. Same prompts, different LLM backend.
"""

import logging
from typing import Callable, Optional

from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis, Script
from ...domain.script_composer.interfaces import ScriptComposer
from ...domain.twitter_analyzer.entities import TwitterContentModel
from ..llm.prompt_loader import load_prompt
from .claude_code import ClaudeCodeChatModel, parse_claude_json

logger = logging.getLogger(__name__)


class CodeAgentScriptComposer(ScriptComposer):
    """ScriptComposer backed by Claude Code CLI."""

    def __init__(self, timeout: int = 900, on_progress: Optional[Callable[[str], None]] = None) -> None:
        self.llm = ClaudeCodeChatModel.from_pydantic(Script, timeout=timeout, on_progress=on_progress)

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

        # Extract encyclopedia (may be None for incomplete content)
        encyclopedia = content.content if content else None

        # Map template variables from domain_analysis
        da = domain_analysis
        replacements = {
            "{audience_primary}": str(da.audience.primary) if da and da.audience else "developer",
            "{audience_expertise}": str(da.audience.expertise_level) if da and da.audience else "intermediate",
            "{technical_depth}": str(da.technical_depth) if da else "medium",
            "{narrative_angle}": str(da.narrative.angle) if da and da.narrative else "architecture_deep_dive",
            # Hardcoded narrative arc percentages (not in domain model)
            "{hook_pct}": "10%",
            "{context_pct}": "15%",
            "{deep_dive_pct}": "50%",
            "{climax_pct}": "15%",
            "{resolution_pct}": "10%",
            # From ProjectEncyclopedia (content.content)
            "{name}": encyclopedia.title if encyclopedia else (content.source.name if content and hasattr(content.source, "name") else "未知项目"),
            "{summary}": encyclopedia.tagline if encyclopedia else "",
            "{quick_start}": encyclopedia.quick_start if encyclopedia else "",
            "{use_cases}": encyclopedia.use_cases if encyclopedia else "",
            "{usage_intro}": encyclopedia.usage_intro if encyclopedia else "",
            "{architecture}": encyclopedia.architecture_breakdown if encyclopedia else "",
            "{domain_specific_insights}": encyclopedia.domain_specific_insights if encyclopedia else "",
            # curated_materials
            "{curated_materials}": "\n".join(content.curated_materials) if content and content.curated_materials else "无可用素材",
            # QA feedback section
            "{feedback_section}": f"\n\n## Human Review Feedback（必须逐条改进）\n{qa_feedback}" if qa_feedback else "",
        }

        # Apply all substitutions
        user = user_template
        for var, value in replacements.items():
            user = user.replace(var, value)

        # Build enriched_input context for the "Analyzer产出翻译" section
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
        user = user.replace("{enriched_input}", context)

        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        result = self.llm._generate(messages)
        content_str = result.generations[0].message.content

        return self._parse_script(content_str)

    @staticmethod
    def _parse_script(raw: str) -> Script:
        data = parse_claude_json(raw)
        return Script.model_validate(data)
