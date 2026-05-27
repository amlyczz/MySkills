"""Use case for Twitter analysis in the LangGraph pipeline.

Orchestrates:
1. Agent Scraper (opencli) → RawScrapeResult
2. LLM Analyzer → TwitterContentModel
"""

import asyncio
import json
import logging
import os
import uuid

from ...domain.task.entities import PipelineStatus, StatusTransitionService
from ...domain.task.interfaces import PipelineTaskRepository
from ...domain.twitter_analyzer.interfaces import TwitterScraper, TwitterAnalyzer
from ..workflow.state import PipelineState

logger = logging.getLogger(__name__)


class AnalyzeTwitterUseCase:

    def __init__(
        self,
        scraper: TwitterScraper,
        analyzer: TwitterAnalyzer,
        repository: PipelineTaskRepository,
        status_service: StatusTransitionService,
    ) -> None:
        self.scraper = scraper
        self.analyzer = analyzer
        self.repository = repository
        self.status_service = status_service

    async def __call__(self, state: PipelineState) -> PipelineState:
        if state.get("twitter_content") is not None:
            logger.info("[UseCase] AnalyzeTwitter: skipping (twitter_content already in state)")
            return {**state}

        task_id = uuid.UUID(state["task_id"])
        repo_url = state.get("repo_url", "")

        # ① Enter node: mark active
        await self.status_service.transition(
            task_id, PipelineStatus.ANALYZING, node="analyze_twitter"
        )

        logger.info("[UseCase] Running AnalyzeTwitter for: %s", repo_url)

        # Resolve output directory
        from .output_dir import resolve_output_dir
        output_dir = resolve_output_dir(state)
        twitter_output_dir = os.path.join(output_dir, "twitter_analyzer")
        os.makedirs(twitter_output_dir, exist_ok=True)

        # 1. Scrape Twitter content via opencli
        raw_result = await self.scraper.scrape(repo_url, twitter_output_dir)

        if raw_result.error:
            logger.warning("[UseCase] Twitter scrape had errors: %s", raw_result.error)

        # 2. Analyze via LLM → TwitterContentModel
        twitter_content = await self.analyzer.analyze(raw_result, repo_url)

        # 3. Save TwitterContentModel for reference
        content_path = os.path.join(twitter_output_dir, "twitter_content.json")
        try:
            with open(content_path, "w", encoding="utf-8") as f:
                f.write(twitter_content.model_dump_json(indent=2, exclude_none=True))
        except Exception as e:
            logger.warning("[UseCase] Failed to save twitter content: %s", e)

        # ② Complete node: update via FSM
        await self.status_service.mark_node_completed(
            task_id, "analyze_twitter",
            updates={
                "status": PipelineStatus.ANALYZING,
                "twitter_content": twitter_content,
            },
        )

        return {
            **state,
            "repo_url": repo_url,
            "twitter_content": twitter_content,
            "status": PipelineStatus.ANALYZING,
        }
