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

## 输出

所有输出写入统一的 `$OUTPUT_DIR/`：
- `content.json` — ContentModel（口播 + 素材绑定 + 源码分析 + 封面 + 发布文案）
- `material_manifest.json` — 素材清单
- `materials/` — 下载的素材文件
