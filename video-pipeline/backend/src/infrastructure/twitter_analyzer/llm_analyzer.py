"""LLM Analyzer for Twitter — transforms RawScrapeResult into TwitterContentModel.

Uses DeepSeek LLM with structured output to:
1. Summarize tweet/thread content
2. Analyze community sentiment from replies
3. Extract external links
4. Classify tech domain if applicable
"""

import logging
from typing import Optional, Any

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from ...domain.twitter_analyzer.entities import (
    RawScrapeResult,
    TwitterContentModel,
    ThreadNarrative,
    CommunitySentiment,
    TweetStats,
    ExternalLink,
)
from ...domain.twitter_analyzer.interfaces import TwitterAnalyzer
from ..llm.client import get_llm, LLMRole
from ..llm.prompt_loader import load_prompt

logger = logging.getLogger(__name__)


class LLMTwitterResponse(BaseModel):
    """Bulletproof DTO for LLM Twitter analysis response."""
    title: Optional[str] = ""
    summary: Optional[str] = ""
    narrative_flow: Optional[str] = ""
    key_points: Optional[list[str]] = None
    overall_tone: Optional[str] = "neutral"
    top_endorsements: Optional[list[str]] = None
    top_corrections: Optional[list[str]] = None
    toxicity_level: Optional[str] = "low"
    external_links: Optional[list[dict[str, str]]] = None
    tech_domain: Optional[str] = None
    estimated_views: Optional[int] = None
    estimated_likes: Optional[int] = None
    estimated_reposts: Optional[int] = None
    estimated_bookmarks: Optional[int] = None


class LLMTwitterAnalyzer(TwitterAnalyzer):
    """LLM-powered analyzer that transforms raw Twitter scrape data into structured content."""

    def __init__(self) -> None:
        self.llm = get_llm(LLMRole.SCORING, temperature=0.3)

    async def _invoke_with_retry(self, chain: Any, kwargs: dict[str, Any], max_retries: int = 3) -> Any:
        last_error = None
        for attempt in range(max_retries):
            try:
                return await chain.ainvoke(kwargs)
            except Exception as e:
                last_error = e
                logger.warning("[TwitterAnalyzer] LLM attempt %d/%d failed: %s", attempt + 1, max_retries, e)
        if last_error:
            raise last_error

    async def analyze(self, raw: RawScrapeResult, url: str) -> TwitterContentModel:
        """Transform RawScrapeResult into a structured TwitterContentModel."""
        logger.info("[TwitterAnalyzer] Analyzing tweet: %s", url)

        prompt = ChatPromptTemplate.from_messages([
            ("system", self._build_system_prompt()),
            ("user", self._build_user_prompt(raw, url)),
        ])

        chain = prompt | self.llm.with_structured_output(LLMTwitterResponse, method="function_calling", strict=True)

        try:
            result: LLMTwitterResponse = await self._invoke_with_retry(chain, {})
        except Exception as e:
            logger.error("[TwitterAnalyzer] LLM analysis failed: %s", e)
            # Return a basic model from raw data
            return self._fallback_model(raw, url, str(e))

        # Build TwitterContentModel from LLM response
        thread_narrative = ThreadNarrative(
            total_tweets=1 + len(raw.thread_texts),
            narrative_flow=result.narrative_flow or raw.main_tweet_text[:500],
            key_points=result.key_points or [],
        )

        community_sentiment = CommunitySentiment(
            overall_tone=result.overall_tone or "neutral",
            top_endorsements=result.top_endorsements or [],
            top_corrections=result.top_corrections or [],
            toxicity_level=result.toxicity_level or "low",
        )

        stats = TweetStats(
            views=result.estimated_views or 0,
            likes=result.estimated_likes or 0,
            reposts=result.estimated_reposts or 0,
            bookmarks=result.estimated_bookmarks or 0,
        )

        external_links = []
        if result.external_links:
            for link_data in result.external_links:
                external_links.append(ExternalLink(
                    url=link_data.get("url", ""),
                    title=link_data.get("title", ""),
                    description=link_data.get("description", ""),
                ))

        title = result.title or raw.main_tweet_text[:80]
        if len(title) == 80:
            title += "..."

        return TwitterContentModel(
            title=title,
            author=raw.author_name,
            handle=raw.author_handle,
            summary=result.summary or raw.main_tweet_text[:200],
            url=url,
            stats=stats,
            main_tweet_text=raw.main_tweet_text,
            thread_context=thread_narrative,
            community_sentiment=community_sentiment,
            external_links=external_links,
            media_urls=raw.media_urls,
            screenshot_paths=raw.screenshot_paths,
            tech_domain=result.tech_domain,
            scrape_error=raw.error,
        )

    def _fallback_model(self, raw: RawScrapeResult, url: str, error: str) -> TwitterContentModel:
        """Build a basic TwitterContentModel when LLM analysis fails."""
        title = raw.main_tweet_text[:80]
        if len(raw.main_tweet_text) > 80:
            title += "..."

        return TwitterContentModel(
            title=title,
            author=raw.author_name,
            handle=raw.author_handle,
            summary=raw.main_tweet_text[:200],
            url=url,
            main_tweet_text=raw.main_tweet_text,
            thread_context=ThreadNarrative(
                total_tweets=1 + len(raw.thread_texts),
                narrative_flow=raw.main_tweet_text[:500],
            ),
            media_urls=raw.media_urls,
            scrape_error=raw.error or error,
        )

    @staticmethod
    def _build_system_prompt() -> str:
        return """You are a Twitter content analyst. Your job is to analyze tweet/thread content
and extract structured information.

Analyze the tweet content and return a JSON object with these fields:
- title: A concise, engaging title (max 80 chars) summarizing the tweet/thread
- summary: A one-paragraph summary of the key message (max 200 chars)
- narrative_flow: The logical flow of the thread (how ideas connect across tweets)
- key_points: Array of key points made in the tweet/thread (3-5 items)
- overall_tone: "positive", "negative", "neutral", "analytical", "critical", or "humorous"
- top_endorsements: Array of insightful endorsements or agreements from replies (max 3)
- top_corrections: Array of valuable corrections or counterarguments from replies (max 3)
- toxicity_level: "low", "medium", or "high"
- external_links: Array of {{url, title, description}} objects from links in the tweet
- tech_domain: If the tweet is about technology, classify as: "ai_model", "ai_agent", "web_backend", "frontend_ui", "cli_infra", "general" (or null if not tech-related)
- estimated_views: Estimated view count (integer, 0 if not available)
- estimated_likes: Estimated like count (integer)
- estimated_reposts: Estimated repost/retweet count (integer)
- estimated_bookmarks: Estimated bookmark count (integer)

Be objective and factual. Do not speculate beyond what the content supports."""

    @staticmethod
    def _build_user_prompt(raw: RawScrapeResult, url: str) -> str:
        parts = [f"## Tweet URL\n{url}\n"]

        if raw.author_handle or raw.author_name:
            parts.append(f"## Author\nHandle: {raw.author_handle}\nName: {raw.author_name}\n")

        if raw.main_tweet_text:
            parts.append(f"## Main Tweet Text\n{raw.main_tweet_text}\n")

        if raw.thread_texts:
            parts.append("## Thread Continuation Tweets\n")
            for i, text in enumerate(raw.thread_texts, 1):
                parts.append(f"[{i}] {text}\n")

        if raw.reply_texts:
            parts.append("## Top Replies\n")
            for i, text in enumerate(raw.reply_texts[:20], 1):
                parts.append(f"[{i}] {text}\n")

        if raw.quote_retweet_texts:
            parts.append("## Quoted Retweet Texts\n")
            for i, text in enumerate(raw.quote_retweet_texts, 1):
                parts.append(f"[{i}] {text}\n")

        if raw.media_urls:
            parts.append("## Media URLs\n")
            for url_item in raw.media_urls:
                parts.append(f"- {url_item}\n")

        return "\n".join(parts)
