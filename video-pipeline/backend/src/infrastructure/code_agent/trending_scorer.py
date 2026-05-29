"""CodeAgent-backed trending scorer — Claude Code analyzes repos with actual code access.

Instead of scoring based on truncated descriptions, Claude Code uses gh CLI
to fetch README, browse code structure, and make deeper assessments.
This node specifically allows the 'Agent' tool so Claude Code can delegate
individual repository evaluations to Subagents.

Uses a Map-Reduce chunking pattern to avoid timeouts.
"""

import asyncio
import json
import logging
from typing import Callable, Optional

from langchain_core.prompts import ChatPromptTemplate

from ...domain.github_trending.entities import TrendingResponse, ScoredRepo
from .claude_code import ClaudeCodeChatModel, parse_claude_json


logger = logging.getLogger(__name__)

_SCORING_SYSTEM_PROMPT = """你是一个专业的 GitHub 项目评估专家，服务于技术视频制作管线。
你的任务是为这小批仓库（约 4-5 个）打分，判断它们作为**教育/推广视频内容**的潜力。

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

## 工作方法（核心约束）
- 这些是远程 GitHub 仓库，不在本地文件系统中。我只提供了基本描述和 Stars 数据，**没有提供 README**。
- 为了保证效率和防止死锁，你**必须使用 Agent 工具**将这几个仓库的评估任务并行分发给子代理去处理。
- **防止上下文爆炸的硬性要求**：在拉取 README 时，子代理**必须**使用 Bash 工具并结合管道截断，例如强制使用 `gh repo view {{owner}}/{{name}} --readme | head -c 8000`。绝不允许拉取未截断的完整 README。
- 请综合所有子代理收集的信息，给出每个仓库的最终打分。

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
    """Claude Code based trending repo scorer using Native Subagents with Chunking.

    Splits the trending repositories into smaller chunks and evaluates them
    concurrently. Within each chunk, Claude Code is instructed to use the 'Agent'
    tool to safely fetch and truncate READMEs in parallel.
    """

    def __init__(self, timeout: int = 400, effort: str = "medium", on_progress: Optional[Callable[[str], None]] = None) -> None:
        self.timeout = timeout
        self.effort = effort
        self.on_progress = on_progress
        self._chunk_size = 5

    def _create_llm(self) -> ClaudeCodeChatModel:
        return ClaudeCodeChatModel(
            allowed_tools=["Bash", "Read", "Glob", "Grep", "Agent"],
            timeout=self.timeout,
            effort=self.effort,
            on_progress=self.on_progress,
        )

    async def score(self, repos_data: list[dict]) -> TrendingResponse:
        """Score trending repos concurrently in chunks."""
        import json
        
        # 移除 readme_snippet 减小上下文
        cleaned_data = []
        for r in repos_data:
            c = dict(r)
            c.pop("readme_snippet", None)
            cleaned_data.append(c)
            
        chunks = [cleaned_data[i:i + self._chunk_size] for i in range(0, len(cleaned_data), self._chunk_size)]
        
        logger.info("[TrendingScorer] Split %d repos into %d chunks for Map-Reduce", len(cleaned_data), len(chunks))
        
        tasks = [self._async_score_chunk(chunk, i) for i, chunk in enumerate(chunks)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_scored_repos: list[ScoredRepo] = []
        
        for idx, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error("[TrendingScorer] Chunk %d failed: %s", idx, res)
            elif isinstance(res, TrendingResponse) and res.repos:
                all_scored_repos.extend(res.repos)
                
        # 去重并排序
        seen = set()
        unique_repos = []
        for repo in all_scored_repos:
            identifier = f"{repo.owner}/{repo.name}"
            if identifier not in seen:
                seen.add(identifier)
                unique_repos.append(repo)
                
        unique_repos.sort(
            key=lambda r: (r.tech_depth + r.video_friendly + r.topic_heat + r.onboarding_exp), 
            reverse=True
        )
        
        return TrendingResponse(repos=unique_repos)

    async def _async_score_chunk(self, chunk: list[dict], index: int) -> TrendingResponse:
        """Score a single chunk using a dedicated ClaudeCodeChatModel."""
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = self._create_llm()
        repos_json = json.dumps(chunk, ensure_ascii=False, indent=2)
        schema_str = json.dumps(TrendingResponse.model_json_schema(), ensure_ascii=False, indent=2)
        system_content = _SCORING_SYSTEM_PROMPT + "\n\n### 期望的 JSON Schema\n请严格遵守以下 JSON Schema 输出:\n```json\n" + schema_str + "\n```"

        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=f"待评估的仓库数据（块 {index}）：\n{repos_json}"),
        ]

        result = llm._generate(messages)
        msg = result.generations[0].message
        return self._parse_result(msg)

    @staticmethod
    def _parse_result(msg) -> TrendingResponse:
        content = msg.content if hasattr(msg, "content") else str(msg)
        data = parse_claude_json(content)
        if isinstance(data, list):
            data = {"repos": data}
        if not isinstance(data, dict):
            return TrendingResponse(repos=[])
        return TrendingResponse.model_validate(data)


