import os
import uuid
from datetime import datetime

from ...domain.analyzer.entities import ContentModel, MaterialManifest
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.analyzer.interfaces import RepoAnalyzer
from ...infrastructure.analyzer.github_collector import GitHubMaterialCollector
from ...infrastructure.config.app_config import PROJECT_ROOT
from ..workflow.state import PipelineState


def _resolve_output_dir(state: PipelineState) -> str:
    source = state.get("project_category", "github")
    date_str = datetime.now().strftime("%Y-%m-%d")
    repo_url = state.get("repo_url", "unknown")
    repo_name = repo_url.rstrip("/").split("/")[-1] if "/" in repo_url else "unknown"
    output_dir = str(PROJECT_ROOT / "output" / source / date_str / repo_name)
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


class AnalyzeRepoUseCase:

    def __init__(
        self,
        analyzer: RepoAnalyzer,
        repository: PipelineTaskRepository,
    ) -> None:
        self.analyzer = analyzer
        self.repository = repository
        self.collector = GitHubMaterialCollector()

    async def __call__(self, state: PipelineState) -> dict[str, object]:
        print("[UseCase] Running AnalyzeRepo")

        output_dir = _resolve_output_dir(state)
        screenshot_path = os.path.join(output_dir, "repo_screenshot.png")

        # 1. Collect materials via GitHub API + Playwright
        readme_text, material_manifest, repo_metadata, dependency_summary = await self.collector.collect(
            repo_url=state["repo_url"],
            output_dir=output_dir,
            screenshot_path=screenshot_path,
        )

        # 2. Enrich README text with repo metadata for better LLM analysis
        enriched_input = self._build_enriched_input(
            readme_text, repo_metadata, dependency_summary
        )

        # 3. Analyze via RepoAnalyzer → ContentModel
        content_model = await self.analyzer.analyze_repo(enriched_input, state["repo_url"])

        # 4. Classify project category for downstream routing
        category = await self.analyzer.classify_category(content_model)

        # 5. Domain analysis — audience profile + narrative strategy
        repo_meta_for_domain = {**repo_metadata, "dependency_summary": dependency_summary or {}}
        domain_analysis = await self.analyzer.analyze_domain(content_model, repo_meta_for_domain)

        # 6. Synchronize DB state
        task_id = uuid.UUID(state["task_id"])
        task = await self.repository.get_by_id(task_id)
        if task:
            task.status = PipelineStatus.ANALYZING
            task.content_model = content_model
            task.material_manifest = material_manifest
            await self.repository.update(task)

        return {
            "content_model": content_model,
            "material_manifest": material_manifest,
            "project_category": category.value,
            "domain_analysis": domain_analysis,
            "status": PipelineStatus.ANALYZING,
        }

    def _build_enriched_input(
        self,
        readme_text: str,
        repo_metadata: dict,
        dependency_summary: dict | None = None,
    ) -> str:
        """Enrich README text with structured metadata for better LLM analysis."""
        parts = []

        if repo_metadata:
            parts.append("## Repository Metadata")
            parts.append(f"Full Name: {repo_metadata.get('full_name', 'N/A')}")
            parts.append(f"Description: {repo_metadata.get('description', 'N/A')}")
            parts.append(f"Language: {repo_metadata.get('language', 'N/A')}")
            parts.append(f"Stars: {repo_metadata.get('stargazers_count', 0)}")
            parts.append(f"Forks: {repo_metadata.get('forks_count', 0)}")
            parts.append(f"Topics: {', '.join(repo_metadata.get('topics', []))}")
            parts.append(f"License: {repo_metadata.get('license', 'N/A')}")
            parts.append(f"Homepage: {repo_metadata.get('homepage', 'N/A')}")
            parts.append("")

            # Include directory tree (top 50 entries)
            tree = repo_metadata.get("directory_tree", [])
            if tree:
                parts.append("## Directory Structure (top 50)")
                for item in tree[:50]:
                    prefix = "📁 " if item.get("type") == "tree" else "📄 "
                    parts.append(f"{prefix}{item.get('path', '')}")
                if len(tree) > 50:
                    parts.append(f"... and {len(tree) - 50} more entries")
                parts.append("")

            # Include core source files
            core_files = repo_metadata.get("core_files", [])
            if core_files:
                parts.append("## Core Source Files")
                for cf in core_files[:5]:
                    path = cf.get("path", "unknown")
                    content = cf.get("content", "")
                    # Truncate to 1500 chars for enriched input
                    if len(content) > 1500:
                        content = content[:1500] + "\n... (truncated)"
                    parts.append(f"### {path}")
                    parts.append(f"```")
                    parts.append(content)
                    parts.append("```")
                    parts.append("")

        # Dependency stack
        if dependency_summary:
            parts.append("## Dependency Stack")
            parts.append(f"Language: {dependency_summary.get('language', 'Unknown')}")
            frameworks = dependency_summary.get("frameworks", [])
            if frameworks:
                parts.append(f"Frameworks: {', '.join(frameworks)}")
            key_deps = dependency_summary.get("key_deps", [])
            if key_deps:
                parts.append(f"Key Dependencies: {', '.join(key_deps)}")
            parts.append("")

        parts.append("## README Content")
        parts.append(readme_text)

        return "\n".join(parts)
