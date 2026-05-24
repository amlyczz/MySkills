---
name: repo-analyzer
description: >
  数据接入 + 深度分析 + 内容创作。AI Agent 主导，一个上下文完成
  从 GitHub URL 到 ContentModel + MaterialManifest 的全流程。
triggers:
  - 分析仓库
  - 生成内容
  - 下载素材
  - 深度源码分析
  - 创作口播脚本
  - 创建架构图
  - 生成封面提示词
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
  - browser_snapshot
  - browser_navigate
---

# RepoAnalyzer — 数据接入 + 深度分析 + 内容创作

> **网络依赖**：本 skill 需要外网访问。运行前确保已加载 `proxy/skill.md` 配置代理。

你是整个 Pipeline 的第一环。输入 GitHub URL，输出结构化内容 + 已下载素材。

**原则**：所有决策细节不写在此，去读 `.spec/2026-05-23-全链路逻辑梳理.md` §2。

---

## 4-Phase 工作流

详见 spec §2.2。

| Phase | 内容 | 产出 |
|-------|------|------|
| 1 | Repo 探索 | 只读不存，Agent 消化 |
| 2 | 素材发现 + 主动创作 | `material_manifest.json` + `materials/` |
| 3 | 源码深度分析 | 写入 `content.json.source_code_insight` |
| 4 | 内容创作 + 素材绑定 | `content.json`（含 script.segments[].{primary_material, material_refs}）|

---

## 素材数量约束

详见 spec §2.8。关键数字：
- 发现：14-35 个
- 下载：12-25 个
- 至少覆盖 4 种素材类型
- 不足时主动创作（架构图 → 截图 → 滚动录屏 → 代码段）

---

## 源码分析强制要求

**所有 GitHub 项目（不论类型）都必须执行源码深度分析（Phase 3），并在 script 中体现。**

### 分析内容
1. **项目结构扫描**：列出核心目录和关键文件
2. **技术栈识别**：语言、框架、依赖
3. **核心架构理解**：主模块职责、数据流、设计模式
4. **关键代码解读**：入口、核心算法、配置系统

### 脚本体现要求
- `source_code_insight` 字段必须完整填写
- 脚本中**至少有一段口播**直接讲解项目架构/技术亮点，配合视觉素材展示
- 如果项目有代码示例、配置文件等，提取关键片段到 `content.code` 字段

---

## AI 模型项目特殊要求

当项目为 **AI/ML 模型**（如 LLM、多模态模型、扩散模型等），必须额外执行：

### 网络架构可视化（强制）
1. **阅读核心模型代码**：读 `modeling/` 或 `models/` 目录下主模型架构文件，理解模块组成
2. **创作架构图**：创建网络架构的几何直观图，展示：
   - 模型主要模块（如 Encoder → Processor → Decoder）
   - 数据流向（输入 → 各模块 → 输出）
   - 参数量和关键连接
   - 风格：流程图 + 3D 方块 + 连接线，层次分明
3. **写入 content.json**：
   - `source_code_insight` 中详细描述架构
   - 脚本中至少有一段口播直接讲解架构图（配合视觉素材展示）
   - `materials/` 中包含生成的架构图文件

### 架构图质量要求
- 清晰展示模型各组件及连接关系
- 标注关键参数（如 3B、hidden_size、num_layers）
- 视觉上美观，可直接用于视频场景

---

## 输出

所有输出写入统一的 `$OUTPUT_DIR/`，路径格式由 pipeline-orchestrator 确定：

```
output/{source_category}/{YYYY-MM-DD-HHMM}/{repo_name}/
  ├── content.json              # ContentModel（口播 + 素材绑定 + 源码分析 + 封面 + 发布文案）
  ├── material_manifest.json    # 素材清单
  └── materials/                # 下载的素材文件
```
