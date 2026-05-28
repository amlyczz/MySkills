"""CodeAgent-backed Twitter analyzer — Claude Code analyzes Twitter content.

Drop-in replacement for LLMTwitterAnalyzer.
"""

import json
import logging
from typing import Callable, Optional

from ...domain.twitter_analyzer.entities import RawScrapeResult, TwitterContentModel, ThreadNarrative
from ...domain.twitter_analyzer.interfaces import TwitterAnalyzer
from .claude_code import ClaudeCodeChatModel, parse_claude_json


logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """你是一个专业的社交媒体内容分析师。分析给定的 Twitter/X 帖子内容，提取结构化信息。

## 输出格式
返回 JSON 对象：
- author: 作者用户名
- title: 内容主题标题
- summary: 内容摘要（中文）
- tweet_count: 帖子数量
- key_points: 关键要点列表
- tech_topics: 涉及的技术话题
- sentiment: 情感倾向 (positive/neutral/negative)
"""


class CodeAgentTwitterAnalyzer(TwitterAnalyzer):
    """TwitterAnalyzer backed by Claude Code CLI."""

    def __init__(self, timeout: int = 300, effort: str = "medium", on_progress: Optional[Callable[[str], None]] = None) -> None:
        self.llm = ClaudeCodeChatModel.from_pydantic(
            TwitterContentModel,
            allowed_tools=["Read", "Glob", "Grep"],
            timeout=timeout,
            effort=effort,
            on_progress=on_progress,
        )

    async def analyze(self, raw: RawScrapeResult, url: str) -> TwitterContentModel:
        from langchain_core.messages import SystemMessage, HumanMessage

        user_text = f"Twitter URL: {url}\n\n帖子内容:\n{raw.main_tweet_text or 'N/A'}"
        if raw.thread_texts:
            user_text += f"\n\n帖子线程:\n{json.dumps(raw.thread_texts, ensure_ascii=False, indent=2)}"

        messages = [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=user_text)]
        result = self.llm._generate(messages)
        content = result.generations[0].message.content

        return self._parse(content, raw, url)

    def _parse(self, raw_content: str, raw: RawScrapeResult, url: str) -> TwitterContentModel:
        try:
            data = parse_claude_json(raw_content)
            if not isinstance(data, dict):
                data = {}
                
            data["media_urls"] = raw.media_urls
            data["screenshot_paths"] = raw.screenshot_paths
            data["url"] = url
            if not data.get("main_tweet_text"):
                data["main_tweet_text"] = raw.main_tweet_text
            if not data.get("author"):
                data["author"] = raw.author_name or ""
            if not data.get("handle"):
                data["handle"] = raw.author_handle or ""
            if not data.get("title"):
                data["title"] = (raw.main_tweet_text or "Twitter Content")[:80]
            if not data.get("summary"):
                data["summary"] = (raw.main_tweet_text or "")[:200]
                
            model = TwitterContentModel.model_validate(data)
            
            if not model.main_tweet_text and not model.media_urls and not model.summary:
                raise ValueError("Parsed model contains no usable tweet text or media")
                
            return model
        except Exception as e:
            logger.warning("[CodeAgentTwitterAnalyzer] parse/validate failed: %s, using fallback", e)
            return self._fallback(raw, url, str(e))

    @staticmethod
    def _fallback(raw: RawScrapeResult, url: str, error: str) -> TwitterContentModel:
        title = (raw.main_tweet_text or "Twitter Content")[:80]
        return TwitterContentModel(
            title=title,
            author=raw.author_name,
            handle=raw.author_handle,
            summary=(raw.main_tweet_text or "")[:200],
            url=url,
            main_tweet_text=raw.main_tweet_text,
            thread_context=ThreadNarrative(
                total_tweets=1 + len(raw.thread_texts),
                narrative_flow=raw.main_tweet_text[:500] if raw.main_tweet_text else "",
            ),
            media_urls=raw.media_urls,
            screenshot_paths=raw.screenshot_paths,
            scrape_error=raw.error or error,
        )
