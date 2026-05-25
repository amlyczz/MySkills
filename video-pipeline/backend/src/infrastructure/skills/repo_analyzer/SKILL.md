---
name: repo-analyzer
description: 分析 GitHub 仓库并生成结构化的 ContentModel，包含来源元数据、内容摘要和代码洞察。当你需要理解仓库架构、提取技术亮点或为视频旁白准备内容时使用此技能。触发条件：仓库分析、代码库研究、代码库理解，或任何需要将 GitHub 仓库转化为结构化内容数据的任务。
---

# 仓库分析器（Repo Analyzer）

通过严格的 3 阶段流水线分析 GitHub 仓库，生成结构化的 `ContentModel`。

## 流水线阶段

### 阶段 1 — 仓库探索
解析仓库结构、编程语言、框架和架构。提取星标数、Fork 数、语言占比、许可证和 Topics。

### 阶段 2 — 源码深度分析
深入检查代码库。提取：架构模式、关键设计模式、主要入口点、核心算法、技术亮点。对于 AI/ML 模型，还需提取：模型架构（如 Transformer 块）、参数量、隐藏层维度、层级结构。

### 阶段 3 — 内容摘要
创建引人注目的标题、标语、摘要、3-5 个要点、统计数据文本、目标用户和领域。这是后续剧本编写者（script writer）使用的原始素材。

## 输出结构

分析产出包含以下字段的 `ContentModel`：
- **source**：GitHub 元数据（编程语言、星标数、Fork 数、Topics、许可证）
- **content**：标题、标语、摘要、要点（3-5 个）、统计数据文本、目标用户、领域
- **script**：必须为 null（剧本编写由 script-composer 技能处理）
- **source_code_insight**：架构、设计模式、亮点、API 风格、已分析文件数量

## AI/ML 仓库特殊规则

如果项目是一个 AI/ML 模型：
1. 解析主要建模层架构（如 Encoder -> Processor -> Decoder）
2. 以可视化方式描述神经网络模块
3. 列出参数和维度（如 3B 参数、hidden_size、层数）
4. 将这些细节包含在 source_code_insight 中

## 提示词模板（Prompt Templates）

- `references/analyze-repo-system.md` — 分析 LLM 调用的系统提示词
- `references/analyze-repo-user.md` — 带占位符的用户提示词模板
