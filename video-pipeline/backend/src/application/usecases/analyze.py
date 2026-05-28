import asyncio
import logging
import os
import subprocess
import uuid

from ...domain.repo_analyzer.entities import ContentModel, MaterialManifest, RepoMetadata

logger = logging.getLogger(__name__)
from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.repo_analyzer.interfaces import RepoAnalyzer, MaterialCollector, MaterialDownloader
from ..workflow.state import PipelineState
from .output_dir import resolve_output_dir


class AnalyzeRepoUseCase:

    def __init__(
        self,
        analyzer: RepoAnalyzer,
        repository: PipelineTaskRepository,
        status_service: StatusTransitionService,
        collector: MaterialCollector,
        downloader: MaterialDownloader,
    ) -> None:
        self.analyzer = analyzer
        self.repository = repository
        self.status_service = status_service
        self.collector = collector
        self.downloader = downloader

    async def __call__(self, state: PipelineState) -> PipelineState:
        if state.get("content_model") is not None:
            logger.info("[UseCase] AnalyzeRepo: skipping (content_model already in state)")
            return {**state}

        task_id = uuid.UUID(state["task_id"])

        repo_url = state.get("repo_url", "")

        # Fallback: if repo_url is a placeholder, try loading the real URL from DB
        # (This can happen if the LangGraph checkpoint didn't properly merge the HITL decision)
        if not repo_url or repo_url in ("pending", "trending", ""):
            try:
                db_task = await self.repository.get_by_id(task_id)
                if db_task and db_task.repo_url and db_task.repo_url not in ("pending", "trending", ""):
                    logger.warning(
                        "[UseCase] AnalyzeRepo: repo_url was '%s' in state but '%s' in DB — using DB value",
                        repo_url, db_task.repo_url[:60],
                    )
                    repo_url = db_task.repo_url
            except Exception as e:
                logger.warning("[UseCase] AnalyzeRepo: failed to load repo_url from DB: %s", e)

        # ① Enter node: mark active immediately (before guard, so error is attributed correctly)
        await self.status_service.transition(
            task_id, PipelineStatus.ANALYZING, node="analyze_repo"
        )

        # Guard: refuse to analyze placeholder URLs
        if not repo_url or repo_url in ("pending", "trending", ""):
            raise ValueError(
                f"Cannot analyze repo with URL '{repo_url}'. "
                f"Delete this task and create a new one with a real GitHub URL."
            )

        logger.info("[UseCase] Running AnalyzeRepo")

        output_dir = resolve_output_dir(state)
        screenshot_path = os.path.join(output_dir, "repo_screenshot.png")

        # 1. Collect materials via GitHub API + Playwright
        readme_text, material_manifest, repo_metadata = await self.collector.collect(
            repo_url=repo_url,
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
            await self.downloader.download(
                content_model.curated_materials, output_dir, material_manifest
            )

        # 4. Classify project category for downstream routing
        category = await self.analyzer.classify_category(content_model)

        # 5. Domain analysis — audience profile + narrative strategy
        domain_analysis = await self.analyzer.analyze_domain(content_model, repo_metadata)

        # ② Complete node: update via FSM
        await self.status_service.mark_node_completed(
            task_id, "analyze_repo",
            updates={
                "status": PipelineStatus.ANALYZING,
                "content_model": content_model,
                "material_manifest": material_manifest,
                "domain_analysis": domain_analysis,
            },
        )

        return {
            **state,
            "content_model": content_model,
            "material_manifest": material_manifest,
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

        parts.append("# 分析目标仓库")
        parts.append(f"**请分析以下 GitHub 仓库：** https://github.com/{repo_metadata.full_name}")
        parts.append("")

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

        parts.append("## Analysis Instructions (严格遵循)")
        parts.append("请按以下逻辑自主完成分析任务（严禁执行 git clone 或 gh repo clone）：")
        parts.append("1. **拉取目录树**: 使用 `gh api repos/{owner}/{repo}/git/trees/HEAD?recursive=1` 获取远程目录树。")
        parts.append("2. **挑选核心文件**: 根据目录树结构，精准分析并挑选出最具代表性的核心源码文件（最多 30 个）。")
        parts.append("3. **深度阅读与分析**: 使用 `Bash` 工具通过 `gh api` 拉取这 30 个文件的内容。为了避免逐个文件拉取耗时过长，强烈建议在 Bash 中使用小脚本（如 for 循环配合 `&` 并发，或批量请求）一次性获取，然后进行深度的源码和架构分析。")

        return "\n".join(parts)

