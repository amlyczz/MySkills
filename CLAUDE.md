# MySkills — AI 操作指南

## 触发规则

- **Plan Mode / Spec 驱动**：任何新功能、重构、或你认为需要设计方案的变更 → 先写 spec，详见 `.spec/` 目录下的已有 spec 文件，命名格式 `.spec/<简短描述>.md`，包含问题陈述、设计方案、验收标准
文件命名格式：
```
日期-具体spec说明.md
例如：
- 2026-05-15-多类型剧本AI创作系统架构设计.md
- 2026-05-16-用户反馈模块设计.md
```
- **TDD 流程**：spec 确认后，按测试驱动开发实施
- **AI 操作日志**：大功能任务、技术决策、架构变更使用 `@agent-harness/memory-logs.md` 规范记录（.memory/YYYY-MM-DD.md）

## Git 操作铁律

- **高风险命令必须经我许可**：以下命令执行前必须弹出确认，禁止直接运行：
  `git checkout .`、`git clean`、`git reset --hard`、`git push --force`、
  `git rebase`、`git stash drop`、`git branch -D`、`rm -rf`（针对被跟踪的目录）
- **每次大功能/修复/重构完成后**统一做一次 `git commit` + `git push`，不要每改一个文件就提交
- **禁止**在 commit message 中使用 `$(cat <<'EOF' ... EOF)` 嵌套 heredoc，直接写字符串

## Python 项目规范

- **包管理器**：统一使用 `uv`（`uv sync`、`uv add`、`uv run`），禁止 `pip install` 直接安装
- **数据模型**：所有 dataclass / dict → Pydantic `BaseModel`，提供 `model_dump()` / `model_dump_json()` 和类型校验
- **依赖声明**：根目录 `pyproject.toml`，`dependency-groups.dev` 放开发依赖
- **虚拟环境**：`.venv/` 由 `uv sync` 自动创建，不手动管理

## Processor 架构

每个功能单元是一个 **Processor**：输入契约 + 处理逻辑 + 输出契约，不关心上下游。管线由 `pipelines/*.json` 的 DAG 定义描述连接关系。

### Processor 一览

| Processor | 输入 | 输出 |
|-----------|------|------|
| **RepoAnalyzer** | GitHub URL → `repo-analyzer/` | ContentModel |
| **MaterialCurator** | ContentModel → `material-collector/` | MaterialManifest |
| **ScriptTimelineComposer** | ContentModel + MaterialManifest → `timeline-composer/` | TimelineModel + VideoConfig |
| **MediaGenerator** | Script → `media_generator/` | voiceover.mp3 + bgm.mp3 |
| **VideoRenderer** | VideoConfig + Timeline → `video-renderer/remotion/` | video.mp4 |
| **PostProducer** | video.mp4 + audio + timeline → `post-producer/` | final.mp4 |

### 数据契约

所有跨层数据使用 `contracts/pipeline_contracts/` 中的 Pydantic BaseModel（Python）和 Zod schema（TypeScript）。多语言共享枚举统一放在 `contracts/enums/*.json`：

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

`pipeline-orchestrator/` 读取 Pipeline 定义 → 拓扑排序 → 顺序执行各 Processor。支持断点续跑（checkpoint 文件）和全代理（proxy.sh 自动识别平台）。

### 可用 Pipeline

| Pipeline | Processor 序列 |
|----------|---------------|
| `pipelines/github-promo.json` | RepoAnalyzer → MaterialCurator → ScriptTimelineComposer → MediaGenerator → VideoRenderer → PostProducer |
| `pipelines/manual-production.json` | ScriptTimelineComposer → MediaGenerator → VideoRenderer → PostProducer |
| `pipelines/podcast-clip.json` | ScriptTimelineComposer → MediaGenerator → PostProducer |

### 横向切面

`media_generator/` 提供图片/语音/音乐/视频/文本生成能力，作为横向切面被多个 Processor 调用。

## Skill 目录规范

每个 skill 是一个独立文件夹，必须包含：
- `skill.md`：YAML frontmatter（name / description / triggers / tools_allowed）+ 中文 agent 操作指南
- `schema/`：该层的数据格式定义（JSON Schema draft-07）
- `scripts/`：可执行脚本

## Remotion Skill

Remotion 最佳实践 skill 已安装到 `.claude/skills/remotion-best-practices/`。涉及 Remotion 视频渲染时自动加载，包含 38 条 rules（动画/字幕/字体/音频/3D/过渡等）。

## Video Renderer 项目 Skill

`video-renderer/skill.md` 是**本项目的渲染层 skill**，描述 remotion 模块的架构和 pipeline 集成方式。布局/场景/主题等动态维度不在 md 中硬编码，而是指引 agent 去读各源码文件作为数据源。
