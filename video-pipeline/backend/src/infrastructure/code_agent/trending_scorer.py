"""CodeAgent-backed trending scorer — Claude Code analyzes repos with actual code access.

Instead of scoring based on truncated descriptions, Claude Code uses gh CLI
to fetch README, browse code structure, and make deeper assessments.
"""

import logging
from typing import Callable, Optional

from langchain_core.prompts import ChatPromptTemplate

from ...domain.github_trending.entities import TrendingResponse
from .claude_code import ClaudeCodeChatModel, parse_claude_json


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
- 这些是远程 GitHub 仓库，不在本地文件系统中。我只提供了基本描述和 Stars 数据，**没有提供 README**。
- **你必须使用 Bash 工具**（如执行 `gh repo view {{owner}}/{{name}} --readme`）自行拉取并阅读各个仓库的 README 或源码结构，然后进行打分。
- 由于仓库数量较多（约20-30个），为了避免超时，建议你高效地使用 Bash 工具（例如一次性执行多个命令，或者编写简单的 for 循环批量获取摘要信息）。
- 综合阅读后的实际内容给出评分。

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

    def __init__(self, timeout: int = 600, effort: str = "medium", on_progress: Optional[Callable[[str], None]] = None) -> None:
        self.llm = ClaudeCodeChatModel.from_pydantic(
            TrendingResponse,
            allowed_tools=["Bash", "Read", "Glob", "Grep"],
            timeout=timeout,
            effort=effort,
            on_progress=on_progress,
        )

    async def score(self, repos_data: list[dict]) -> TrendingResponse:
        """Score trending repos using Claude Code's code analysis capabilities.

        Args:
            repos_data: List of dicts with at least 'owner' and 'name' keys.
        """
        import json
        
        # 移除 readme_snippet 减小上下文
        cleaned_data = []
        for r in repos_data:
            c = dict(r)
            c.pop("readme_snippet", None)
            cleaned_data.append(c)
            
        repos_json = json.dumps(cleaned_data, ensure_ascii=False, indent=2)
        prompt = ChatPromptTemplate.from_messages([
            ("system", _SCORING_SYSTEM_PROMPT),
            ("user", "待评估的仓库数据：\n{repos_json}"),
        ])

        chain = prompt | self.llm | self._parse_result
        return await chain.ainvoke({"repos_json": repos_json})

    @staticmethod
    def _parse_result(msg) -> TrendingResponse:
        content = msg.content if hasattr(msg, "content") else str(msg)
        data = parse_claude_json(content)
        if isinstance(data, list):
            data = {"repos": data}
        return TrendingResponse.model_validate(data)
