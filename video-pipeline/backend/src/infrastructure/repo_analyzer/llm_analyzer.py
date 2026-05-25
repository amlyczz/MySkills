from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel
from ...domain.repo_analyzer.entities import ContentModel, DomainAnalysis, GitHubSourceMeta, ProjectEncyclopedia, Script, SourceCodeInsight, MaterialManifest, ProjectCategory, TechDomain, RepoMetadata
from ...domain.repo_analyzer.interfaces import RepoAnalyzer
from ..llm.client import get_llm_client
from ..llm.prompt_loader import load_prompt

class LLMRepoAnalyzer(RepoAnalyzer):

    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def classify_tech_domain(self, enriched_input: str) -> TechDomain:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("repo_analyzer", "classify_domain_system.md")),
            ("user", "Determine the tech domain of this repository based on the following input:\n\n{input}")
        ])
        class DomainWrapper(BaseModel):
            domain: TechDomain

        chain = prompt | self.llm.with_structured_output(DomainWrapper)
        result = await chain.ainvoke({"input": enriched_input})
        return result.domain

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
            ("user", "Analyze this repository:\n\nURL: {url}\n\nCandidate Materials (JSON):\n{candidate_materials}\n\nEnriched Input:\n{enriched_input}"),
        ])

        chain = prompt | self.llm.with_structured_output(ContentModel)
        content_model: ContentModel = await chain.ainvoke({
            "url": repo_url,
            "candidate_materials": candidate_materials,
            "enriched_input": enriched_input,
        })

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
            ("user", load_prompt("repo_analyzer", "analyze_domain_user.md")),
        ])

        chain = prompt | self.llm.with_structured_output(DomainAnalysis)

        insight = content_model.source_code_insight
        source = content_model.source

        invoke_vars = {
            "content_title": content_model.content.title if content_model.content else "",
            "content_tagline": content_model.content.tagline if content_model.content else "",
            "content_points": ", ".join(content_model.content.points) if content_model.content and content_model.content.points else "",
            "architecture": insight.architecture if insight else "",
            "patterns": ", ".join(insight.patterns or []),
            "highlights": ", ".join(insight.highlights or []),
            "language": getattr(source, "language", "") or "",
            "stars": str(getattr(source, "stars", 0) or 0),
            "topics": ", ".join(getattr(source, "topics", []) or []),
            "dependency_summary": "",
            "directory_tree": self._format_directory_tree(repo_metadata),
        }

        domain_analysis: DomainAnalysis = await chain.ainvoke(invoke_vars)
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
