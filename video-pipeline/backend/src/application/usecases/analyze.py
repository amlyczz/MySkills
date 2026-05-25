import os
import uuid

from ...domain.repo_analyzer.entities import ContentModel, MaterialManifest, RepoMetadata
from ...domain.task.entities import PipelineStatus
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.repo_analyzer.interfaces import RepoAnalyzer
from ...infrastructure.repo_analyzer.github_collector import GitHubMaterialCollector
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir


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

        output_dir = resolve_output_dir(state)
        screenshot_path = os.path.join(output_dir, "repo_screenshot.png")

        # 1. Collect materials via GitHub API + Playwright
        readme_text, material_manifest, repo_metadata = await self.collector.collect(
            repo_url=state["repo_url"],
            output_dir=output_dir,
            screenshot_path=screenshot_path,
        )

        # 2. Enrich README text with repo metadata for better LLM analysis
        enriched_input = self._build_enriched_input(readme_text, repo_metadata)

        # 3. Analyze via RepoAnalyzer → ContentModel
        # 3.1 Classify Domain
        tech_domain = await self.analyzer.classify_tech_domain(enriched_input)

        # 3.2 Load Candidate Materials
        candidate_materials_str = ""
        candidate_path = os.path.join(output_dir, "candidate_materials.json")
        if os.path.exists(candidate_path):
            with open(candidate_path, "r", encoding="utf-8") as f:
                candidate_materials_str = f.read()

        # 3.3 Deep Read
        content_model = await self.analyzer.analyze_repo(
            enriched_input, state["repo_url"], tech_domain, candidate_materials_str
        )

        # 3.4 Lazy Fetch Curated Materials
        if content_model.curated_materials:
            await self._download_curated_materials(
                content_model.curated_materials, output_dir, material_manifest
            )

        # 4. Classify project category for downstream routing
        category = await self.analyzer.classify_category(content_model)

        # 5. Domain analysis — audience profile + narrative strategy
        domain_analysis = await self.analyzer.analyze_domain(content_model, repo_metadata)

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
        repo_metadata: RepoMetadata,
    ) -> str:
        """Enrich README text with structured metadata for better LLM analysis."""
        parts = []

        parts.append("## Repository Metadata")
        parts.append(f"Full Name: {repo_metadata.full_name or 'N/A'}")
        parts.append(f"Description: {repo_metadata.description or 'N/A'}")
        parts.append(f"Language: {repo_metadata.language or 'N/A'}")
        parts.append(f"Stars: {repo_metadata.stargazers_count}")
        parts.append(f"Forks: {repo_metadata.forks_count}")
        parts.append(f"Topics: {', '.join(repo_metadata.topics)}")
        parts.append(f"License: {repo_metadata.license or 'N/A'}")
        parts.append(f"Homepage: {repo_metadata.homepage or 'N/A'}")
        parts.append("")

        if repo_metadata.directory_tree:
            parts.append("## Directory Structure (top 50)")
            for item in repo_metadata.directory_tree[:50]:
                prefix = "📁 " if item.type == "tree" else "📄 "
                parts.append(f"{prefix}{item.path}")
            if len(repo_metadata.directory_tree) > 50:
                parts.append(f"... and {len(repo_metadata.directory_tree) - 50} more entries")
            parts.append("")

        if repo_metadata.core_files:
            parts.append(f"## Core Source Files ({len(repo_metadata.core_files)} files)")
            for cf in repo_metadata.core_files:
                content = cf.content
                if len(content) > 2000:
                    content = content[:2000] + "\n... (truncated)"
                parts.append(f"### {cf.path}")
                parts.append("```")
                parts.append(content)
                parts.append("```")
                parts.append("")

        parts.append("## README Content")
        parts.append(readme_text)

        return "\n".join(parts)

    async def _download_curated_materials(self, urls: list[str], output_dir: str, manifest: MaterialManifest) -> None:
        import subprocess
        from ...domain.repo_analyzer.entities import Material, MaterialSource, CaptureInfo, MaterialMetadata

        assets_dir = os.path.join(output_dir, "assets")
        os.makedirs(assets_dir, exist_ok=True)

        for url in urls:
            filename = os.path.basename(url.split("?")[0])
            if not filename:
                continue
            file_path = os.path.join(assets_dir, filename)

            try:
                if "api.github.com" in url:
                    cmd = ["gh", "api", url.replace("https://api.github.com", "")]
                else:
                    cmd = ["curl", "-sL", url]

                result = subprocess.run(cmd, capture_output=True, timeout=30)
                if result.returncode == 0 and len(result.stdout) > 0:
                    with open(file_path, "wb") as f:
                        f.write(result.stdout)

                    ext = os.path.splitext(filename)[1].lower()
                    mat_type = "image" if ext in (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp") else "other"
                    manifest.materials.append(Material(
                        id=f"asset_curated_{filename.replace('.', '_')}",
                        type=mat_type,
                        path=file_path,
                        source=MaterialSource(type="curated_download", url=url),
                        capture=CaptureInfo(method="lazy_fetch")
                    ))
            except Exception as e:
                print(f"[AnalyzeRepoUseCase] Failed to lazy fetch {url}: {e}")
