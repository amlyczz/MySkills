# MySkills 的 AI 操作指南

## 运行环境要求

- **操作系统**：该项目**必须**在 **WSL (Windows Subsystem for Linux)** 或 **macOS** 环境下运行。请勿直接在 Windows (CMD/PowerShell) 原生环境下执行任何构建、安装依赖（如 npm install / uv sync）或启动脚本，以防产生跨平台路径解析和软链接（.bin）冲突。

## 触发规则

- **Plan Mode / Spec 驱动**：任何新功能、重构、或你认为需要设计方案的变更，需先写 spec，详见 `spec/` 目录下的已有 spec 文件，命名格式 `spec/<简短描述>.md`，包含问题陈述、设计方案、验收标准。文件命名格式：
```
日期-具体spec说明.md
例如：
- 2026-05-15-多类型剧本AI创作系统架构设计.md
- 2026-05-16-用户反馈模块设计.md
```
- **TDD 流程**：spec 确认后，按测试驱动开发实践。
- **AI 操作日志**：大功能任务、技术决策、架构变更使用 `@agent-harness/memory-logs.md` 规范记录在 `memory/YYYY-MM-DD.md` 中。
- **技能开发铁律**：Any creation, modification, or optimization of skills MUST follow the standard skill structure (`SKILL.md` + `scripts/` directory). You must refer to the `skill-creator` skill instructions in `.agents/skills/skill-creator/SKILL.md` for guidance.

## Git 操作铁律

- **高风险命令必须经我许可**：以下命令执行前必须弹出确认，禁止直接运行：
  `git checkout .`、`git clean`、`git reset --hard`、`git push --force`、`git rebase`、`git stash drop`、`git branch -D`、`rm -rf`（针对被跟踪的目录）
- **每次大功能/修复/重构完成后**：统一做一次 `git commit` + `git push`，不要每改一个文件就提交。
- **禁止**在 commit message 中使用 `$(cat <<'EOF' ... EOF)` 嵌套 heredoc，直接写字符串。

## Python 项目规范

- **包管理器**：统一使用 `uv`（`uv sync`、`uv add`、`uv run`），禁止 `pip install` 直接安装。
- **数据模型**：所有 dataclass / dict 换 Pydantic `BaseModel`，提供 `model_dump()` / `model_dump_json()` 和类型校验。
- **LangGraph StateGraph 例外**：`PipelineState` 必须用 `TypedDict`（不是 Pydantic），因为 LangGraph 内部使用 dict merging 做 checkpoint/snapshot 机制，Pydantic model 无法直接参与 dict 合并。使用 TypedDict + `state.get("field")` 访问模式。
- **依赖声明**：根目录 `pyproject.toml`，`dependency-groups.dev` 放开发依赖。
- **虚拟环境**：`.venv/` 由 `uv sync` 自动创建，不手动管理。

## Processor 架构

每个功能单元是一个 **Processor**：输入契约 + 处理逻辑 + 输出契约，不关心上下游。管线由 `pipelines/*.json` 的 DAG 定义描述连接关系。

### Processor 一览
| Processor | 输入 | 输出 |
|-----------|------|------|
| **RepoAnalyzer** | GitHub URL 至 `repo-analyzer/` | ContentModel + material_manifest.json + materials/ |
| **ScriptTimelineComposer** | ContentModel + material_manifest.json 至 `script-timeline-composer/` | TimelineModel + VideoConfig |
| **MediaGenerator** | Script 至 `media-generator/` | voiceover.mp3 + bgm.mp3 |
| **VideoRenderer** | VideoConfig + Timeline 至 `video-pipeline/video-renderer/remotion/` | video.mp4 |
| **PostProducer** | video.mp4 + audio + timeline 至 `video-pipeline/post-producer/` | final.mp4 |

### 数据契约

所有跨层数据使用 `contracts/pipeline_contracts/` 中的 Pydantic BaseModel（Python）和 Zod schema（TypeScript）。多语言共享枚举统一放在 `contracts/enums/*.json`。

| 枚举文件 | 用途 |
|---------|------|
| `layouts.json` | 布局 ID + 场景→布局默认映射 |
| `motions.json` | 动效 ID + 元素角色→动效默认映射 |
| `transitions.json` | 过渡类型枚举 |
| `styles.json` | 样式主题 ID |
| `structures.json` | 结构模板 ID |
| `materials.json` | 素材类型/来源/采集方式 |
| `sfx.json` | 动效→音效文件映射 |

### 编排

`pipeline-orchestrator/` 读取 Pipeline 定义，拓扑排序并顺序执行 Processor。支持断点续跑（checkpoint 文件）和全代理（proxy.sh 自动识别平台）。

### 可用 Pipeline

| Pipeline | Processor 序列 |
|----------|---------------|
| `pipelines/github-promo.json` | RepoAnalyzer → ScriptTimelineComposer → MediaGenerator → VideoRenderer → PostProducer |

### 横向切面

`media-generator/` 提供图片/语音/音乐/视频/文本生成能力，作为横向切面被多个 Processor 调用。

## Remotion Skill

Remotion 最佳实践 skill 已安装到 `.claude/skills/remotion-best-practices/`。涉及 Remotion 视频渲染时自动加载，包含 38 条 rules（动画/字幕/字体/音频/3D/过渡等）。

**注意：涉及Remotion的地方都要用remotion-best-practices这个skill来实施。**

