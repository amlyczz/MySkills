"""CodeAgent-backed trending scorer — Claude Code analyzes repos with actual code access.

Instead of scoring based on truncated descriptions, Claude Code can use gh CLI
to fetch README, browse code structure, and make deeper assessments.
"""

import json
import logging
from typing import Callable, Optional

from langchain_core.prompts import ChatPromptTemplate

from ...domain.github_trending.entities import TrendingResponse
from .claude_code import ClaudeCodeChatModel

logger = logging.getLogger(__name__)

_SCORING_SYSTEM_PROMPT = """你是一个专业的 GitHub 项目评估专家，服务于技术视频制作管线。
你的任务是为仓库打分，判断它们作为**教育/推广视频内容**的潜力。

## 评分维度（每项 1-5 分）

1. **tech_depth**（1-5）：技术含量和创新性
   - 5：新颖架构、复杂算法、前沿研究
   - 3：扎实的工程实现、有趣的设计模式
   - 1：简单的包装器、样板代码

2. **video_friendly**（1-5）：转化为视频内容的视觉表现力
   - 5：有演示、截图、架构图、实时预览
   - 3：文档完善、用例清晰
   - 1：抽象库、纯 CLI、没有可展示的视觉内容

3. **topic_heat**（1-5）：当前技术趋势的相关性
   - 5：AI/LLM Agent、MCP、Rust 系统编程、WebGPU
   - 3：主流语言/工具、细分领域
   - 1：过时技术、饱和话题

4. **onboarding_exp**（1-5）：上手体验和可理解性
   - 5：优秀的 README、快速上手示例
   - 3：文档尚可、可以理解
   - 1：无文档、复杂配置

## 工作方法
- 用 `gh api repos/{{owner}}/{{repo}}` 获取仓库元数据
- 用 `gh api repos/{{owner}}/{{repo}}/readme` 获取 README
- 用 `gh api repos/{{owner}}/{{repo}}/git/trees/HEAD?recursive=1` 浏览目录结构
- 用 `gh api repos/{{owner}}/{{repo}}/contents/{{path}}` 读取核心文件
- 基于实际代码质量打分，不要只看描述

## 输出格式
返回 JSON 对象，包含 `repos` 数组。每个条目：
- owner, name: string
- tech_depth, video_friendly, topic_heat, onboarding_exp: number (1-5)
- one_liner: 中文单句亮点（必须用中文，有吸引力，适合作为视频标题）

## 排除规则
- 排除垃圾仓库（赌博、破解、色情）
- 排除低质量仓库（配置文件、无改动的 fork）
- 排除纯列表/合集（无实际代码）
- 排除老牌明星项目（React、VS Code 等）
"""


class CodeAgentTrendingScorer:
    """Claude Code based trending repo scorer.

    Instead of scoring based only on descriptions, Claude Code can actually
    browse each repo via gh CLI to examine code quality.
    """

    def __init__(self, timeout: int = 600, on_progress: Optional[Callable[[str], None]] = None) -> None:
        self.llm = ClaudeCodeChatModel(
            allowed_tools=["Read", "Glob", "Grep", "Bash(gh:*)"],
            timeout=timeout,
            on_progress=on_progress,
        )

    async def score(self, repos_data: list[dict]) -> TrendingResponse:
        """Score trending repos using Claude Code's code analysis capabilities.

        Args:
            repos_data: List of dicts with at least 'owner' and 'name' keys.
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", _SCORING_SYSTEM_PROMPT),
            ("user", "待评估的仓库列表（包含 owner 和 name，你可以用 gh CLI 深入分析每个仓库）：\n{repos_data}"),
        ])

        chain = prompt | self.llm | self._parse_result
        return await chain.ainvoke({
            "repos_data": json.dumps(repos_data, ensure_ascii=False),
        })

    @staticmethod
    def _parse_result(msg) -> TrendingResponse:
        content = msg.content if hasattr(msg, "content") else str(msg)
        content = content.strip()

        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(content[start:end])
            else:
                raise ValueError(f"Could not parse JSON from Claude Code output: {content[:500]}")

        if isinstance(data, list):
            data = {"repos": data}

        return TrendingResponse.model_validate(data)
