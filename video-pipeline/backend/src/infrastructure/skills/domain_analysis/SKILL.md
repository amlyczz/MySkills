---
name: domain-analysis
description: 识别技术架构模式、构建受众画像，并为视频内容选择最佳叙事角度。当你需要理解项目的技术深度、确定目标受众或选择最佳叙事策略时使用此技能。触发条件：领域分析、受众建模、叙事角度选择或技术架构模式识别。
---

# 领域分析（Domain Analysis）

将 `ContentModel` 转化为 `DomainAnalysis`，包含受众画像、叙事策略和信息层次。

## 核心功能

### 1. 架构模式识别
从已知集合中识别项目的主要架构风格：单体架构（Monolith）、微服务（Microservices）、MVC/MVVM、整洁架构（Clean Architecture）、插件式（Plugin-based）、事件驱动（Event-driven）、分层架构（Layered）、CQRS、单体仓库（Monorepo）、库/SDK（Library/SDK）。使用 `source_code_insight.architecture`、`patterns` 和目录结构作为识别信号。

### 2. 受众画像建模
确定谁应该观看这个视频：
- **主要受众（primary audience）**：开发者（developer）、CTO、产品经理（product_manager）、研究人员（researcher）、泛人群（general）
- **专业水平（expertise level）**：初级（beginner）、中级（intermediate）、高级（advanced）
- **领域熟悉度（domain familiarity）**：低（low）、中（medium）、高（high）

### 3. 叙事角度选择
从以下选项中选择叙事策略：教程（tutorial）、评测（review）、架构深入分析（architecture_deep_dive）、趋势介绍（trend_introduction）、对比（comparison）、功能展示（feature_showcase）。包含节奏建议（快/中/慢）以及选择该角度的理由。

## 输出

产出包含以下字段的 `DomainAnalysis` 模型：
- `architecture_pattern` — 识别出的架构模式字符串
- `audience` — `AudienceProfile`（主要受众、专业水平、领域熟悉度）
- `narrative` — `NarrativeAngle`（叙事角度、选择理由、节奏）
- `information_hierarchy` — `InformationHierarchy`（必须呈现：3 项、值得提及：2 项、可省略：其余）
- `technical_depth` — 表面（surface）、适中（medium）或深入（deep）

## 提示词模板（Prompt Templates）

- `references/analyze-domain-system.md` — 领域分析 LLM 调用的系统提示词
- `references/analyze-domain-user.md` — 带占位符的用户提示词模板
