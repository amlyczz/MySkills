---
name: github-trending
description: >
  GitHub Trending 内容源。多策略搜索 + 5 维评分，推荐 20 个候选，
  用户选择后进入 pipeline-orchestrator 全流程出视频。
triggers:
  - 推荐 GitHub 项目
  - GitHub trending
  - 今天有什么好项目
  - 开源项目推荐
  - 做一个 GitHub 项目视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
  - web_search
---

# GitHub Trending 内容源 Skill

你是 GitHub 宝藏项目发现引擎。搜索 → 评分 → 用户选 → 调 pipeline-orchestrator。
> **架构更新**：当前 Trending 已集成至流水线内部的 `GithubTrendingUseCase` Node 与前端交互（HITL）。该技能包主要通过其 `scripts/fetch_trending.py` 被 LangGraph 调用。

---

## Phase A：搜索 & 评分（20 个候选）

### A1. 多策略搜索（由 fetch_trending.py 自动完成）

按优先级依次执行，直到凑满 20 个高质量候选：
**策略 1**：过去 7 天新建 + 高星
**策略 2**：过去 7 天活跃 + 高星（补充老牌项目）

### A2. 获取详情与基础打分（由 fetch_trending.py 自动完成）

脚本并发调用 `gh api` 抓取每个仓库的以下核心指标：
- 基础数据 (`stargazers_count`, `forks_count`, `subscribers_count`)
- 被依赖数 (通过 SBOM 或 code search `Used by`)
- 作者影响力 (Followers, 组织属性)
- 近 7 天 Star 增量

### A3. 综合八维打分（由 Agent 执行）

针对客观获取的数据，通过大模型进行主观评价（1-5⭐）：

#### 基础热度（权重 3x）
| 维度 | 数据来源 | 评分标准 |
|------|---------|---------|
| 📊 **Stars** | `stargazers_count` | <100:1, 100-1k:2, 1k-5k:3, 5k-20k:4, >20k:5 |
| 🚀 **Star 增速** | 近 7 天增量 vs 总数 | 日均增量/总量 >2%:5, >1%:4, >0.5%:3, >0.1%:2, 停滞:1 |
| 🍴 **Forks** | `forks_count` | Fork/Star 比 >0.1:5, >0.05:4, >0.02:3, >0.01:2, 极少:1 |

#### 硬核影响力（权重 3x）
| 维度 | 数据来源 | 评分标准 |
|------|---------|---------|
| 🔗 **被依赖数** | Dependents | >1k:5, >100:4, >10:3, 有:2, 无:1 |
| 👤 **作者背书** | followers + org | >10k或知名机构:5, >1k:4, >100:3, 普通:2, 无:1 |

#### 内容质量（权重 2x）
| 维度 | 评估标准 |
|------|---------|
| 🧠 **技术深度** | 架构创新、算法复杂度、是否解决硬问题 |
| 🎬 **视频友好** | 有 Demo/截图/架构图/在线试用 |
| ⚡ **话题热度** | AI/Agent/MCP/Rust/工具链 等当前热点 |
| 📖 **上手体验** | README 质量、Quick Start、文档完整度 |

> 综合分 = (热度×3 + 影响力×3 + 内容×2) / 8

### A4. 前端 HITL 交互展示

大模型将 20 个项目按得分由高到低排序后，管线挂起 (Interrupt)，通过 `/api/v1/task/{id}` 暴露出等待用户操作的 `HITL_TRENDING` 状态。
用户在前端看到如下类目：
1. **🏆 本周必看（综合 >= 4.0 / 5.0）**
2. **💎 技术深度（综合 >= 3.5）**
3. **🛠️ 开发者利器 / 🎨 可视化创意**

用户在前端挑选后，发送指令进入下一环。

---

## Phase B & C：后续管线

用户选择一个 repo 后（或指定 `repo_url`），交由后续的 `analyze_repo` 和 `compose_script` 继续生成，进入标准的 `pipeline-orchestrator` 视频自动化。
