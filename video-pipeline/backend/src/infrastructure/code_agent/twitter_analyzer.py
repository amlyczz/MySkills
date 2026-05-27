"""CodeAgent-backed Twitter analyzer — Claude Code analyzes Twitter content.

Drop-in replacement for LLMTwitterAnalyzer.
"""

import json
import logging
from typing import Callable, Optional

from ...domain.twitter_analyzer.entities import RawScrapeResult, TwitterContentModel
from ...domain.twitter_analyzer.interfaces import TwitterAnalyzer
from .claude_code import ClaudeCodeChatModel

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

    def __init__(self, timeout: int = 300, on_progress: Optional[Callable[[str], None]] = None) -> None:
        self.llm = ClaudeCodeChatModel(
            allowed_tools=["Read", "Glob", "Grep"],
            timeout=timeout,
            on_progress=on_progress,
        )

    async def analyze(self, raw: RawScrapeResult, url: str) -> TwitterContentModel:
        from langchain_core.messages import SystemMessage, HumanMessage

        user_text = f"Twitter URL: {url}\n\n帖子内容:\n{raw.text or 'N/A'}"
        if raw.thread:
            user_text += f"\n\n帖子线程:\n{json.dumps(raw.thread, ensure_ascii=False, indent=2)}"

        messages = [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=user_text)]
        result = self.llm._generate(messages)
        content = result.generations[0].message.content

        return self._parse(content)

    @staticmethod
    def _parse(raw: str) -> TwitterContentModel:
        raw = raw.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            end_idx = len(lines)
            for i in range(len(lines) - 1, 0, -1):
                if lines[i].strip() == "```":
                    end_idx = i
                    break
            raw = "\n".join(lines[1:end_idx])

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(raw[start:end])
            else:
                raise ValueError(f"Could not parse Twitter analysis JSON: {raw[:500]}")

        return TwitterContentModel.model_validate(data)
