from typing import Optional, Any, Union

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field, model_validator
from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis, GitHubSourceMeta, ProjectEncyclopedia, Script, SourceCodeInsight, MaterialManifest, ProjectCategory, TechDomain, RepoMetadata
from ...domain.repo_analyzer.project_encyclopedia import ChartDataPoint
from ...domain.repo_analyzer.interfaces import RepoAnalyzer
from ..llm.client import get_llm, LLMRole, structured_chain
from ..llm.prompt_loader import load_prompt

# Bulletproof DTO for LLM response to ensure JSON parsing never fails
class LLMContentResponse(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    quick_start: Optional[str] = None
    use_cases: Optional[str] = None
    usage_intro: Optional[str] = None
    architecture_breakdown: Optional[str] = None
    domain_specific_insights: Optional[str] = None
    stats_text: Optional[str] = None
    chart_data: Optional[list[ChartDataPoint]] = None
    source_code_insight: Optional[SourceCodeInsight] = None
    curated_assets: Optional[list[str]] = None
    curated_materials: Optional[list[str]] = None

def format_mixed_to_markdown(d: Any) -> str:
    if not d:
        return ""
    if isinstance(d, str):
        return d
    if isinstance(d, list):
        return "\n".join(f"- {item}" for item in d)
    if isinstance(d, dict):
        lines = []
        for k, v in d.items():
            title = k.replace("_", " ").title()
            lines.append(f"### {title}")
            lines.append(format_mixed_to_markdown(v))
            lines.append("")
        return "\n".join(lines).strip()
    return str(d)

class LLMRepoAnalyzer(RepoAnalyzer):

    def __init__(self, model: str | None = None) -> None:
        self.llm = get_llm(LLMRole.EXTRACTION, model=model)

    async def _invoke_with_retry(self, chain: Any, kwargs: dict[str, Any], max_retries: int = 3) -> Any:
        # No automatic retries as requested by user. Let exceptions propagate so manual retry can handle it.
        return await chain.ainvoke(kwargs)

    async def classify_tech_domain(self, enriched_input: str) -> TechDomain:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("repo_analyzer", "classify_domain_system.md")),
            ("user", "Determine the tech domain of this repository based on the following input:\n\n{input}\n\nRespond in strictly valid JSON format conforming to the expected schema. Ensure all double quotes inside strings are properly escaped.")
        ])
        class DomainWrapper(BaseModel):
            domain: Optional[TechDomain] = None
            tech_domain: Optional[TechDomain] = None

            @model_validator(mode="before")
            @classmethod
            def normalize_fields(cls, data: Any) -> Any:
                if isinstance(data, dict):
                    for k, v in list(data.items()):
                        if isinstance(v, str):
                            data[k] = v.upper().replace("-", "_")
                return data

            @property
            def resolved_domain(self) -> TechDomain:
                return self.domain or self.tech_domain or TechDomain.GENERAL

        chain = structured_chain(prompt, self.llm, DomainWrapper)
        result = await self._invoke_with_retry(chain, {"input": enriched_input})
        return result.resolved_domain

    async def analyze_repo(
        self, enriched_input: str, repo_url: str, tech_domain: TechDomain, candidate_materials: str
    ) -> ContentModel:
        domain_prompt_map = {
            TechDomain.AI_MODEL: "deep_read_ai_system.md",
            TechDomain.AI_AGENT: "deep_read_agent_system.md",
            TechDomain.WEB_BACKEND: "deep_read_backend_system.md",
            TechDomain.FRONTEND_UI: "deep_read_frontend_system.md",
            TechDomain.CLI_INFRA: "deep_read_infra_system.md",
            TechDomain.GENERAL: "deep_read_general_system.md",
        }
        sys_prompt_file = domain_prompt_map.get(tech_domain, "deep_read_general_system.md")

        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("repo_analyzer", sys_prompt_file)),
            ("user", "Analyze this repository:\n\nURL: {url}\n\nCandidate Materials (JSON):\n{candidate_materials}\n\nEnriched Input:\n{enriched_input}\n\nRespond in strictly valid JSON format. IMPORTANT: Ensure all double quotes within strings are correctly escaped (e.g., \\\"word\\\")."),
        ])

        chain = structured_chain(prompt, self.llm, LLMContentResponse)
        flat_res: LLMContentResponse = await self._invoke_with_retry(chain, {
            "url": repo_url,
            "candidate_materials": candidate_materials,
            "enriched_input": enriched_input,
        })

        # Parse owner and repo name from URL
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

        title = format_mixed_to_markdown(flat_res.title) or repo_name
        tagline = format_mixed_to_markdown(flat_res.tagline) or "An open-source repository analysis."

        encyclopedia = ProjectEncyclopedia(
            title=title,
            tagline=tagline,
            quick_start=format_mixed_to_markdown(flat_res.quick_start) or f"git clone {repo_url}",
            use_cases=format_mixed_to_markdown(flat_res.use_cases) or "No explicit use cases provided.",
            usage_intro=format_mixed_to_markdown(flat_res.usage_intro) or "No usage introduction provided.",
            architecture_breakdown=format_mixed_to_markdown(flat_res.architecture_breakdown),
            domain_specific_insights=format_mixed_to_markdown(flat_res.domain_specific_insights),
            stats_text=format_mixed_to_markdown(flat_res.stats_text) if flat_res.stats_text else None,
            chart_data=None, # Keep simple
        )

        parsed_sci = None
        if flat_res.source_code_insight:
            try:
                if isinstance(flat_res.source_code_insight, dict):
                    parsed_sci = SourceCodeInsight.model_validate(flat_res.source_code_insight)
                elif isinstance(flat_res.source_code_insight, SourceCodeInsight):
                    parsed_sci = flat_res.source_code_insight
            except Exception:
                pass

        source = GitHubSourceMeta(
            source_type="github",
            url=repo_url,
            name=repo_name,
            full_name=full_name,
        )

        curated = flat_res.curated_assets or flat_res.curated_materials or []

        content_model = ContentModel(
            source=source,
            content=encyclopedia,
            source_code_insight=parsed_sci,
            curated_materials=curated,
        )

        content_model.script = None
        return content_model

    async def classify_category(self, content: ContentModel) -> ProjectCategory:
        source_type = getattr(content.source, "source_type", "github")
        has_code_insight = bool(content.source_code_insight and content.source_code_insight.highlights)

        if has_code_insight:
            return ProjectCategory.TECH_EDU
        return ProjectCategory.PROMO

    async def analyze_domain(
        self, content_model: ContentModel, repo_metadata: Optional[RepoMetadata] = None,
    ) -> DomainAnalysis:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("repo_analyzer", "analyze_domain_system.md")),
            ("user", load_prompt("repo_analyzer", "analyze_domain_user.md") + "\n\nRespond in strictly valid JSON format conforming to the expected schema. Ensure all double quotes inside strings are properly escaped."),
        ])

        chain = structured_chain(prompt, self.llm, DomainAnalysis)

        insight = content_model.source_code_insight
        source = content_model.source

        invoke_vars = {
            "content_title": content_model.content.title if content_model.content else "",
            "content_tagline": content_model.content.tagline if content_model.content else "",
            "content_points": content_model.content.use_cases if content_model.content else "",
            "architecture": insight.architecture if insight else "",
            "patterns": ", ".join(insight.patterns or []) if insight else "",
            "highlights": ", ".join(insight.highlights or []) if insight else "",
            "language": getattr(source, "language", "") or "",
            "stars": str(getattr(source, "stars", 0) or 0),
            "topics": ", ".join(getattr(source, "topics", []) or []),
            "dependency_summary": "",
            "directory_tree": self._format_directory_tree(repo_metadata),
        }

        domain_analysis: DomainAnalysis = await self._invoke_with_retry(chain, invoke_vars)
        return domain_analysis

    @staticmethod
    def _format_directory_tree(repo_metadata: Optional[RepoMetadata]) -> str:
        if not repo_metadata or not repo_metadata.directory_tree:
            return ""
        lines = []
        for item in repo_metadata.directory_tree[:50]:
            prefix = "📁 " if item.type == "tree" else "📄 "
            lines.append(f"{prefix}{item.path}")
        if len(repo_metadata.directory_tree) > 50:
            lines.append(f"... and {len(repo_metadata.directory_tree) - 50} more entries")
        return "\n".join(lines)
