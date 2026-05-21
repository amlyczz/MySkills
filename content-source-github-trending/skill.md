---
name: content-source-github-trending
description: >
  GitHub Trending 内容源。多策略搜索 + 5 维评分，推荐 20 个候选，
  用户选择后生成 content.json，调用 pipeline-runner 全流程出视频。
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

你是 GitHub 宝藏项目发现引擎。搜索 → 评分 → 用户选 → 生成 content.json → 调 pipeline-runner。

---

## Phase A：搜索 & 评分（20 个候选）

### A1. 读去重记录

检查 `content-generator/YYYY-repos.md`。已推荐的仓库不再出现。

### A2. 多策略搜索（必须凑满 20 个高质量候选）

按优先级依次执行，直到凑满 20 个：

**策略 1**：过去 7 天新建 + 高星
```bash
gh search repos --created ">=YYYY-MM-DD" --sort stars --limit 30
```

**策略 2**：过去 7 天活跃 + 高星（补充老牌项目）
```bash
gh search repos --pushed ">=YYYY-MM-DD" --sort stars --limit 20
```

**策略 3**（备用）：Web 搜索补充
```
搜索 "GitHub trending repositories <今天日期> developer tools AI"
```

**过滤规则**：
- 描述为关键词堆砌/SEO 垃圾的 → 丢弃
- 已推荐过的 → 丢弃
- 纯教程/文档合集（awesome-list 类）→ 视为低分

### A3. 获取详情

对每个候选获取完整信息：

```bash
# 基础元信息
gh api repos/{owner}/{repo}

# 社区数据（Star 趋势 + Fork 数 + 被引用数）
gh api repos/{owner}/{repo} --jq '{stars:.stargazers_count, forks:.forks_count, watchers:.subscribers_count}'

# 被依赖数（硬核影响力指标 — 有多少其他仓库依赖此项目）
gh api repos/{owner}/{repo}/dependency-graph/sbom 2>/dev/null
# 备用：搜索"Used by"数量，GitHub 网页上显示在右侧 sidebar
gh api "search/code?q=REPO_NAME+in:file+org:ORG_NAME" --jq '.total_count'

# 近 7 天 Star 增量（通过 Star History API 或对比）
gh api "repos/{owner}/{repo}/stargazers?per_page=100&page=1" --jq 'length'

# 作者影响力
gh api users/{owner} --jq '{login:.login, followers:.followers, repos:.public_repos, company:.company}'

# README 内容
gh api repos/{owner}/{repo}/readme  # base64 解码
```

### A4. 八维评分（每项 1-5⭐）

#### 基础热度（权重 3x）

| 维度 | 数据来源 | 评分标准 |
|------|---------|---------|
| 📊 **Stars** | `stargazers_count` | <100:1, 100-1k:2, 1k-5k:3, 5k-20k:4, >20k:5 |
| 🚀 **Star 增速** | 近 7 天增量 vs 总 Star 数 | 日均增量/总量 >2%:5, >1%:4, >0.5%:3, >0.1%:2, 停滞:1 |
| 🍴 **Forks** | `forks_count` | Fork/Star 比 >0.1:5, >0.05:4, >0.02:3, >0.01:2, 极少:1 |

#### 硬核影响力（权重 3x）

| 维度 | 数据来源 | 评分标准 |
|------|---------|---------|
| 🔗 **被依赖数** | Used by / dependents | >1k:5, >100:4, >10:3, 有:2, 无:1 |
| 👤 **作者背书** | owner followers + org 属性 | >10k followers 或 Apache/CNCF/Google/Microsoft 等:5, >1k followers:4, >100 followers:3, 普通:2, 无头像/空:1 |

#### 内容质量（权重 2x）

| 维度 | 评估标准 |
|------|---------|
| 🧠 **技术深度** | 架构创新、算法复杂度、是否解决硬问题 |
| 🎬 **视频友好** | 有 Demo/截图/架构图/在线试用 |
| ⚡ **话题热度** | AI/Agent/MCP/Rust/工具链 等当前热点 |
| 📖 **上手体验** | README 质量、Quick Start、文档完整度 |

> 综合分 = (热度×3 + 影响力×3 + 内容×2) / 8

**展示格式**（分类呈现）：

```
## 🔥 GitHub Trending — YYYY-MM-DD

### 🏆 本周必看（综合 >= 4.0 / 5.0）
| # | 项目 | ⭐ | 🚀增速 | 🔗被引 | 👤背书 | 🧠 | 🎬 | 综合 | 一句话 |
|---|------|-----|--------|--------|--------|-----|-----|------|------|
| 1 | owner/repo | 4.1k | 5 | 4 | 5 | 5 | 3 | ⭐4.5 | Agent 时代的新编程语言 |

### 💎 技术深度（综合 >= 3.5）
| # | 项目 | ⭐ | 🚀 | 🔗 | 👤 | 🧠 | 🎬 | 综合 | 一句话 |
|---|------|-----|-----|-----|-----|-----|-----|------|------|

### 🛠️ 开发者利器 / 🎨 可视化创意
| # | 项目 | ⭐ | 🚀 | 🔗 | 👤 | 🧠 | 🎬 | 综合 | 一句话 |
|---|------|-----|-----|-----|-----|-----|-----|------|------|

📊 = Stars  🚀 = Star增速  🔗 = 被依赖数  👤 = 作者背书  🧠 = 技术深度  🎬 = 视频友好

选择一个序号，我来生成完整内容 + 视频 👇
```

---

## Phase B：生成 content.json

用户选择后，调用 `content-generator` skill 生成 **1 个文件**：

```
content-generator/content/YYYY-MM-DD/HHmm-{repo_name}-content.json
```

**content.json 包含**（7 字段，schema：`content-generator/schema/content.schema.json`）：

| 字段 | 内容 | 生成方式 |
|------|------|---------|
| `repo` | 元信息（url/stars/language/license/homepage） | gh api 直接映射 |
| `content` | 定位/功能点/目标用户/领域/chartData | LLM 基于 README 总结 |
| `script` | 口播全文 + 分段 + 时长估算 | LLM 创作（100-750 字，约 4 字/秒） |
| `covers` | 3:4 + 16:9 封面提示词（中英双语） | LLM 生成（无霓虹/赛博朋克） |
| `publish_copy` | 5 选 1 标题 + 正文 + 标签 | LLM 生成 |
| `source_code_insight` | 4 维度源码分析（可选） | 有 README + 关键源码则生成 |
| `meta` | 时间戳 + 来源标记 | 自动填充 |

更新去重记录：`content-generator/YYYY-repos.md` 追加一行 `- owner/repo`。

---

## Phase C：调用 pipeline-runner

```
调用 pipeline-runner skill，传入：
  CONTENT_JSON    = content-generator/content/YYYY-MM-DD/HHmm-{repo}-content.json
  REPO_URL        = {html_url}
  TOTAL_DURATION  = 根据 script.total_duration_est 估算（120-180 秒）
  EXTRA_URLS      = {homepage}（如果有）
```

Pipeline-runner 接管后续全部流程 → final.mp4。

---

## 降级策略

- `gh` 命令失败：等 60s 重试一次，仍失败告知用户
- 候选全重复：提示"本周项目均已推荐，暂无新内容"
- README 无内容：跳过 `source_code_insight`
- 仓库无 homepage：不传 EXTRA_URLS
- web_search 也凑不满 20 个：有多少展示多少，标注实际数量
