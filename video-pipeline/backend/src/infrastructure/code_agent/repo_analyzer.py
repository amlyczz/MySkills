"""CodeAgent-backed RepoAnalyzer — single Claude Code call replaces 4 DeepSeek calls.

Instead of: collector.collect(algorithm picks 30 files) → classify_domain → analyze_repo → classify_category → analyze_domain

We do:      collector.collect(metadata + README + screenshots) → CodeAgent analyzes everything in one shot
"""

import json
import logging
from typing import Callable, Optional

from langchain_core.prompts import ChatPromptTemplate

from ...domain.repo_analyzer.entities import (
    ContentModel,
    DomainAnalysis,
    GitHubSourceMeta,
    ProjectCategory,
    ProjectEncyclopedia,
    RepoMetadata,
    SourceCodeInsight,
    TechDomain,
)
from ...domain.repo_analyzer.interfaces import RepoAnalyzer
from ..llm.prompt_loader import load_prompt
from .claude_code import ClaudeCodeChatModel, parse_claude_json
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class _ContentOutput(BaseModel):
    title: str = ""
    tagline: str = ""
    quick_start: str = ""
    use_cases: str = ""
    usage_intro: str = ""
    architecture_breakdown: str = ""
    domain_specific_insights: str = ""


class _SourceCodeInsightOutput(BaseModel):
    architecture: str = ""
    patterns: list[str] = []
    highlights: list[str] = []
    api_style: str = ""


class AnalysisOutput(BaseModel):
    """Pydantic schema for --json-schema constrained output."""
    tech_domain: str = "GENERAL"
    category: str = "promo"
    content: _ContentOutput = _ContentOutput()
    source_code_insight: _SourceCodeInsightOutput = _SourceCodeInsightOutput()
    curated_materials: list[str] = []
    domain_analysis: DomainAnalysis


class CodeAgentAnalysisResult:
    """Parsed result from a single Claude Code analysis call."""

    def __init__(self, raw: dict):
        self.tech_domain = TechDomain(raw.get("tech_domain", "GENERAL"))
        self.category = ProjectCategory(raw.get("category", "promo"))
        content = raw.get("content", {})
        self.title = content.get("title", "")
        self.tagline = content.get("tagline", "")
        self.quick_start = content.get("quick_start", "")
        self.use_cases = content.get("use_cases", "")
        self.usage_intro = content.get("usage_intro", "")
        self.architecture_breakdown = content.get("architecture_breakdown", "")
        self.domain_specific_insights = content.get("domain_specific_insights", "")

        sci = raw.get("source_code_insight", {})
        self.source_code_insight = SourceCodeInsight(
            architecture=sci.get("architecture", ""),
            patterns=sci.get("patterns", []),
            highlights=sci.get("highlights", []),
            api_style=sci.get("api_style", ""),
        )

        self.curated_materials = raw.get("curated_materials", [])

        da = raw.get("domain_analysis", {})
        self.domain_analysis = DomainAnalysis.model_validate(da)


class CodeAgentRepoAnalyzer(RepoAnalyzer):
    """RepoAnalyzer implementation backed by Claude Code CLI.

    Replaces 4 sequential DeepSeek LLM calls with a single Claude Code
    invocation. Claude Code acts as an autonomous agent that can glob,
    grep and read files — no need to pre-fetch source code.
    """

    def __init__(self, timeout: int = 720, on_progress: Optional[Callable[[str], None]] = None) -> None:
        self.llm = ClaudeCodeChatModel.from_pydantic(AnalysisOutput, timeout=timeout, on_progress=on_progress)
        self._cached: Optional[CodeAgentAnalysisResult] = None

    # ── RepoAnalyzer interface ─────────────────────────────────────────

    async def classify_tech_domain(self, enriched_input: str) -> TechDomain:
        result = await self._analyze(enriched_input)
        return result.tech_domain

    async def analyze_repo(
        self,
        enriched_input: str,
        repo_url: str,
        tech_domain: TechDomain,
        candidate_materials: str,
    ) -> ContentModel:
        result = await self._analyze(enriched_input)

        repo_name = "Unknown"
        owner = "Unknown"
        full_name = "Unknown"
        if repo_url:
            parts = repo_url.rstrip("/").split("/")
            if len(parts) >= 1:
                repo_name = parts[-1]
            if len(parts) >= 2:
                owner = parts[-2]
                full_name = f"{owner}/{repo_name}"

        source = GitHubSourceMeta(
            source_type="github",
            url=repo_url,
            name=repo_name,
            full_name=full_name,
        )

        encyclopedia = ProjectEncyclopedia(
            title=result.title or repo_name,
            tagline=result.tagline or "An open-source repository analysis.",
            quick_start=result.quick_start or f"git clone {repo_url}",
            use_cases=result.use_cases or "No explicit use cases provided.",
            usage_intro=result.usage_intro or "No usage introduction provided.",
            architecture_breakdown=result.architecture_breakdown,
            domain_specific_insights=result.domain_specific_insights,
        )

        content_model = ContentModel(
            source=source,
            content=encyclopedia,
            source_code_insight=result.source_code_insight,
            curated_materials=result.curated_materials,
        )
        content_model.script = None
        return content_model

    async def classify_category(self, content: ContentModel) -> ProjectCategory:
        result = await self._cached_result()
        return result.category

    async def analyze_domain(
        self,
        content_model: ContentModel,
        repo_metadata: Optional[RepoMetadata] = None,
    ) -> DomainAnalysis:
        result = await self._cached_result()
        return result.domain_analysis

    # ── Internal ───────────────────────────────────────────────────────

    async def _cached_result(self) -> CodeAgentAnalysisResult:
        if self._cached is None:
            raise RuntimeError("CodeAgentRepoAnalyzer: _analyze() must be called before accessing cached results")
        return self._cached

    async def _analyze(self, enriched_input: str) -> CodeAgentAnalysisResult:
        """Single Claude Code call that performs all analysis."""
        if self._cached is not None:
            return self._cached

        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("code_agent", "analyze_system.md")),
            ("user", "{enriched_input}"),
        ])

        chain = prompt | self.llm | self._parse_result
        result = await chain.ainvoke({"enriched_input": enriched_input})
        self._cached = result
        logger.info(
            "CodeAgent analysis complete: domain=%s, category=%s, title=%s",
            result.tech_domain.value,
            result.category.value,
            result.title,
        )
        return result

    @staticmethod
    def _parse_result(msg) -> CodeAgentAnalysisResult:
        """Parse the AIMessage content into CodeAgentAnalysisResult."""
        content = msg.content if hasattr(msg, "content") else str(msg)
        data = parse_claude_json(content)

        return CodeAgentAnalysisResult(data)
