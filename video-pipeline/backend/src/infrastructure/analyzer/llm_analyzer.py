from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from ...domain.analyzer.entities import ContentModel, DomainAnalysis, GitHubSourceMeta, NormalizedContent, Script, SourceCodeInsight, MaterialManifest, ProjectCategory
from ...domain.analyzer.interfaces import RepoAnalyzer
from ..llm.client import get_llm_client
from ..llm.prompt_loader import load_prompt

class LLMRepoAnalyzer(RepoAnalyzer):

    def __init__(self) -> None:
        self.llm = get_llm_client()

    async def analyze_repo(self, readme_text: str, repo_url: str) -> ContentModel:
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("repo_analyzer", "analyze-repo-system.md")),
            ("user", load_prompt("repo_analyzer", "analyze-repo-user.md")),
        ])

        chain = prompt | self.llm.with_structured_output(ContentModel)
        content_model: ContentModel = await chain.ainvoke({
            "readme": readme_text,
            "url": repo_url,
        })

        # Safety: ensure script is null (analyzer should not produce scripts)
        content_model.script = None

        return content_model

    async def classify_category(self, content: ContentModel) -> ProjectCategory:
        """Classify based on source metadata and content characteristics."""
        # Simple rule-based classification; can be replaced with LLM classification
        source_type = getattr(content.source, "source_type", "github")
        points = content.content.points if content.content else []
        has_code_insight = bool(content.source_code_insight and content.source_code_insight.highlights)

        if has_code_insight and len(points) >= 5:
            return ProjectCategory.TECH_DEEP_DIVE
        if has_code_insight:
            return ProjectCategory.EDUCATIONAL
        return ProjectCategory.PROMO

    async def analyze_domain(
        self, content_model: ContentModel, repo_metadata: Optional[dict] = None,
    ) -> DomainAnalysis:
        """Analyze domain architecture, build audience profile, select narrative angle."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", load_prompt("domain_analysis", "analyze-domain-system.md")),
            ("user", load_prompt("domain_analysis", "analyze-domain-user.md")),
        ])

        chain = prompt | self.llm.with_structured_output(DomainAnalysis)

        # Extract fields from ContentModel and repo_metadata for the user prompt
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
            "dependency_summary": (repo_metadata or {}).get("dependency_summary", ""),
            "directory_tree": self._format_directory_tree(repo_metadata),
        }

        domain_analysis: DomainAnalysis = await chain.ainvoke(invoke_vars)
        return domain_analysis

    @staticmethod
    def _format_directory_tree(repo_metadata: Optional[dict]) -> str:
        """Format directory tree entries as a plain-text tree."""
        if not repo_metadata:
            return ""
        tree = repo_metadata.get("directory_tree", [])
        if not tree:
            return ""
        lines = []
        for item in tree[:50]:
            prefix = "📁 " if item.get("type") == "tree" else "📄 "
            lines.append(f"{prefix}{item.get('path', '')}")
        if len(tree) > 50:
            lines.append(f"... and {len(tree) - 50} more entries")
        return "\n".join(lines)
