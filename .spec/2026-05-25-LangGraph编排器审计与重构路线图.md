# LangGraph 编排器审计报告与重构路线图

## 1. 问题陈述

现有 `langgraph-orchestrator/` 是由 AI 按照已有 spec (`.spec/2026-05-25-langgraph-refactor.md`) 实现的一版 LangGraph 编排后端 + 控制面板前端。经全链路审计，发现以下系统性问题：

1. **命名不当** — `langgraph-orchestrator` 暗示"仅编排"，实际包含了完整后端 (DDD 四层 + FastAPI + WebSocket + PostgreSQL) 和前端控制面板，且目标是替代而非仅编排现有 skill 管线。
2. **领域模型与渲染引擎严重脱节** — Blueprint Pydantic 模型仅为 Remotion 引擎实际 Blueprint 接口的 ~10%。
3. **未复用已有契约层** — 没有引用 `contracts/pipeline_contracts/` 和 `contracts/enums/`，所有实体重新定义且与现有 ContentModel、MaterialManifest 等不兼容。
4. **关键节点为空壳或 mock** — render_video / post_process / agentic_code_gen / qa_video 均未实际实现。
5. **硬编码 Windows 路径** — 代码中 `x:\home\zand\proj\MySkills\...` 无法在 macOS 上运行。
6. **提示词与数据模型矛盾** — prompt 要求 13 维视觉决策，但 SceneConfig 只有 3 个字段。

---

## 2. 现有全链路 Pipeline 梳理

### 2.1 端到端数据流

```
github-trending (skill.md)
    │ gh search repos → 20 scored candidates → 用户选择
    ▼
repo-analyzer (skill.md)
    │ 4-Phase: 探索 → 素材发现+主动创作 → 源码深度分析 → 内容创作+素材绑定
    │ 产出: content.json (ContentModel) + material_manifest.json + materials/
    ▼
script-timeline-composer (skill.md)
    │ 13维视觉决策 → blueprint.json
    │ 产出: blueprint.json + timeline.json + .srt + .bgm_curve.json
    ▼
media-generator (CLI: python -m media_generator)
    │ alias 路由 → provider 降级 → voiceover.mp3 + bgm.mp3
    ▼
video-pipeline/video-renderer (Remotion)
    │ blueprint.json → TemplateRenderer → SceneRenderer → ElementRenderer → video.mp4
    ▼
video-pipeline/post-producer (FFmpeg)
    │ loudnorm + sidechain ducking + SFX + subtitle burn → final.mp4
```

### 2.2 编排方式

当前生产路径: **skill 驱动** (`pipeline-orchestrator/skill.md`) — AI agent 读取 skill.md，按 DAG 拓扑顺序调用各 processor。checkpoint 文件为 JSON。

LangGraph 路径: **状态机驱动** — LangGraph StateGraph 编排，PostgreSQL 持久化，QA 循环，WebSocket 实时流。

### 2.3 契约层

| 契约 | 文件 | 核心模型 |
|------|------|----------|
| Layer 0 | `contracts/pipeline_contracts/content.py` | `ContentModel`, `NormalizedContent`, `Script`, `SourceCodeInsight`, `Covers`, `PublishCopy` |
| Layer 0 | `contracts/pipeline_contracts/material.py` | `MaterialManifest`, `Material`, `CaptureInfo` |
| Layer 1 | `contracts/pipeline_contracts/timeline.py` | `TimelineModel`, `TimelineSegment`, `SubtitleEntry` |
| Layer 2 | `contracts/pipeline_contracts/audio.py` | `VoiceoverSegment`, `SfxEntry`, `AudioConfig` |
| Layer 2 | `contracts/pipeline_contracts/video_config.py` | `VideoConfig`, `SceneConfig` |
| Layer 2 | `contracts/pipeline_contracts/enums.py` | LAYOUTS, MOTIONS, TRANSITIONS, STYLES, STRUCTURES, SFX_MOTION_MAP |
| 渲染层 | `video-pipeline/video-renderer/remotion/src/engine/types.ts` | `Blueprint`, `SceneConfig`(TS), `ElementConfig`, `AnimationConfig` |

---

## 3. LangGraph 编排器逐层审计

### 3.1 命名问题

**现状**: `langgraph-orchestrator/`
**问题**: 名字暗示"仅编排"，但实际是完整后端服务 + 前端控制面板。且 `pipeline-orchestrator/` 已存在。

**建议**: 重命名为 `pipeline-server/` 或 `video-pipeline/`（后端服务），前端作为子目录或独立 repo。与现有 `pipeline-orchestrator/`(skill 驱动) 的关系需明确定义。

### 3.2 架构分层评估

| 层 | 目录 | 遵循度 | 问题 |
|---|---|---|---|
| Domain | `domain/` | ★★★☆☆ | 使用 Pydantic BaseModel ✓，但实体定义过于简陋，与 contracts 不兼容 |
| Application | `application/` | ★★★★☆ | UseCase 编排清晰，LangGraph graph 结构合理 |
| Infrastructure | `infrastructure/` | ★★☆☆☆ | 硬编码路径、mock 实现、未调用现有 processor |
| Presentation | `presentation/` | ★★★★☆ | FastAPI + WebSocket 结构清晰，API 设计合理 |

### 3.3 领域实体 vs 契约对比 (核心问题)

#### 3.3.1 RepoAnalysis vs ContentModel — 覆盖率 ~20%

| ContentModel 字段 | RepoAnalysis 对应 | 状态 |
|---|---|---|
| `source: GitHubSourceMeta` (language, stars, forks, topics, license) | `repo_url` only | 缺失全部元数据 |
| `content.title` | `project_name` | 近似 |
| `content.tagline` | 无 | **缺失** |
| `content.summary` | 无 | **缺失** |
| `content.points` | `key_features` | 近似 |
| `content.stats_text` | 无 | **缺失** |
| `content.target_users` | 无 | **缺失** |
| `content.domains` | 无 | **缺失** |
| `content.chartData` | 无 | **缺失** |
| `script.segments[]` | 移至 VideoScript (合理拆分) | 架构差异 |
| `covers` (3x4 + 16x9 提示词) | 无 | **缺失** |
| `publish_copy` (标题/正文/标签) | 无 | **缺失** |
| `source_code_insight` (结构化) | 无 | **缺失** |
| `meta` | 无 | **缺失** |
| MaterialManifest | `raw_materials: list[str]` | **严重退化** |

#### 3.3.2 Blueprint vs Remotion Blueprint — 覆盖率 ~10%

**LangGraph SceneConfig**:
```python
class SceneConfig(BaseModel):
    layoutId: str
    motionMap: dict[str, str]
    content: dict[str, str]
```

**Remotion SceneConfig** (TypeScript):
```typescript
interface SceneConfig {
    id: string;
    type: SceneType;
    startFrame: number;
    durationInFrames: number;
    background?: { type: BackgroundType; props? };
    style?: React.CSSProperties;
    transitionToNext?: { type: TransitionType; durationInFrames; props? };
    elements?: ElementConfig[];       // 递归组件树
    voiceover?: VoiceoverConfig;
    subtitles?: SubtitleConfig;
    sfx?: SfxTrigger[];
}
```

**缺失的关键结构**:
- `meta` / `globalSettings` / `variables` / `data` (Blueprint 顶层)
- `globalBackground` / `globalOverlays`
- `elements[]` 递归组件树 (ElementConfig → children → ElementConfig)
- `animation` (AnimationConfig: type, easing, duration, delay, springConfig)
- `transitionToNext` (过渡类型 + 帧数)
- `voiceover` / `subtitles` / `sfx` (场景级音视频配置)
- `startFrame` / `durationInFrames` (场景时间轴定位)

**结论**: LangGraph 生成的 Blueprint **无法被 Remotion 渲染器消费**。这是阻塞性问题。

#### 3.3.3 VideoScript vs Script — 覆盖率 ~40%

| Script 字段 | VideoScript 对应 | 状态 |
|---|---|---|
| `full_text` | 无 | 缺失 |
| `segments[].text` | `segments[].text` | ✓ |
| `segments[].duration_est` | 无 | 缺失 |
| `segments[].visual_type` | `segments[].visual_type` | ✓ |
| `segments[].visual_params` | `segments[].visual_params: dict[str, str]` | 无类型约束 |
| `total_duration_est` | `target_duration_seconds` | 近似 |

### 3.4 节点实现状态

| 节点 | spec 要求 | 实现状态 | 问题 |
|---|---|---|---|
| `analyze_repo` | 4-Phase 扫描 + 素材抓取 | 部分实现 | 输出模型不足，无素材下载，Playwright 仅截单图 |
| `compose_script` | 完整台本生成 | 部分实现 | 缺 duration_est，visual_params 无类型 |
| `qa_script` | 多维加权评分 (按项目类型) | 部分实现 | 评分维度固定，无动态加载 |
| `generate_blueprint` | 13维视觉编排 | 严重不足 | SceneConfig 仅 3 字段，Prompt 要求无法兑现 |
| `qa_blueprint` | 视觉导演评估 | 表面化 | 评估的是简陋模型，非真实 Blueprint |
| `agentic_code_gen` | 跨 Agent 代码生成 | 空占位符 | 仅 print + sleep |
| `render_video` | Remotion 渲染 | Mock | 写入虚拟字节 |
| `qa_video` | 多模态成片校验 | 未实现 | spec 中定义但代码中不存在 |
| `post_process` | FFmpeg 音视混合 | 严重 Mock | 假 timeline.json，假 subtitles.srt |

### 3.5 提示词一致性分析

| 提示词 | 文件 | 要求 | 模型支撑 | 一致性 |
|---|---|---|---|---|
| ANALYZE_REPO_SYSTEM_PROMPT | `infrastructure/analyzer/llm_analyzer.py` | 4-Phase, source_code_insight, AI/ML 特殊规则 | RepoAnalysis 无 source_code_insight 字段 | **矛盾** |
| COMPOSE_SCRIPT_SYSTEM_PROMPT | `infrastructure/composer/llm_composer.py` | 技术架构段, 标点分词 | VideoSegment 无 subtitles 字段 | **矛盾** |
| BLUEPRINT_SYSTEM_PROMPT | `infrastructure/blueprint/llm_composer.py` | 13维编排, Flex防撞, outFrame, stagger, spring | SceneConfig 仅 layoutId/motionMap/content | **严重矛盾** |
| QA_SCRIPT_SYSTEM_PROMPT | `infrastructure/composer/llm_evaluator.py` | 技术准确性/节奏/叙事 | 通用3维，无项目类型动态加载 | **不足** |
| QA_BLUEPRINT_SYSTEM_PROMPT | `infrastructure/blueprint/llm_evaluator.py` | 哲学UI美学评估 | SceneConfig 无 elements/animation/theme | **无法评估** |

### 3.6 其他问题

| 问题 | 位置 | 严重度 |
|---|---|---|
| 硬编码 Windows 路径 `x:\home\zand\...` | `app_config.py`, `render.py`, `post_process.py`, `ffmpeg_mixer.py` | P0 |
| 数据库凭据明文 | `app_config.py` 第8行 | P1 |
| tools/ 目录 3 个文件从未被引用 | `src/tools/` | P2 (死代码) |
| LangGraph checkpointer=None | `task_streamer.py` 第57行 | P1 (无断点续跑) |
| CORS allow_origins=["*"] | `server.py` 第14行 | P2 (开发可接受) |
| 前端 DAG 仅显示 4/8 节点 | `App.tsx` 第106行 | P2 |
| 根 main.py 是无用存根 | `/langgraph-orchestrator/main.py` | P3 |
| 无 proxy 支持 | 全局 | P1 (需集成 proxy.sh) |

---

## 4. 重构路线图

### Phase 0: 基础修复 (不改变架构)

1. **删除硬编码路径** — 所有路径改为环境变量或相对路径，使用 `pathlib.Path`
2. **删除 tools/ 死代码** — 3 个 @tool 文件未被使用
3. **删除根 main.py 存根** — 指向 backend/src/main.py 即可
4. **数据库凭据移至环境变量** — 删除默认密码
5. **添加 proxy 支持** — 注入 proxy.sh 环境变量到 subprocess 调用

### Phase 1: 契约对齐 (核心)

**目标**: 领域实体直接复用 `contracts/pipeline_contracts/` 中的模型。

1. **RepoAnalysis → 复用 ContentModel**:
   - `domain/analyzer/entities.py` 改为从 `pipeline_contracts` import ContentModel, MaterialManifest, Material
   - LLM Analyzer 的 output schema 改为 ContentModel
   - Prompt 调整为产出 ContentModel 所需的全部字段

2. **VideoScript → 复用 Script**:
   - `domain/composer/entities.py` 改为从 `pipeline_contracts.content` import Script, ScriptSegment
   - 补充 duration_est 字段

3. **Blueprint → 完整重建**:
   - `domain/blueprint/entities.py` 重写为与 Remotion `types.ts` 的 `Blueprint` 接口完全对齐
   - SceneConfig 必须包含: id, type, startFrame, durationInFrames, elements[], transitionToNext, voiceover, subtitles, sfx, background
   - ElementConfig 必须包含: type, props, children[], animation, layout, conditional
   - AnimationConfig 必须包含: type, easing, durationFrames, delayFrames, springConfig
   - 顶层 Blueprint 必须包含: meta, data, globalSettings (theme, typography, motionTokens, audio), globalBackground, globalOverlays, scenes

4. **enums 集成**:
   - 从 `contracts/enums/*.json` 加载 LAYOUTS, MOTIONS, TRANSITIONS, STYLES, STRUCTURES
   - Blueprint Prompt 中的布局/动效 ID 必须来自枚举值

### Phase 2: 节点实际化

1. **render_video** — 调用 `video-pipeline/video-renderer/scripts/render.py` 的 `render_video_composer()`
2. **post_process** — 调用 `video-pipeline/post-producer/scripts/audio_mixer.py` 的完整管线
3. **generate_media** (新增并行节点) — 调用 `media-generator/` 的 voiceover + bgm 生成
4. **agentic_code_gen** — 实现 IPC/MCP 协议与本地 Code Agent 通信
5. **qa_video** — 实现多模态帧抽取 + 音频分析校验

### Phase 3: LangGraph 增强

1. **启用 checkpointer** — 使用 `langgraph-checkpoint-postgres`，实现断点续跑
2. **并发控制** — `asyncio.Semaphore` 限制 Remotion/FFmpeg 并发
3. **HITL (Human-in-the-loop)** — LangGraph `interrupt()` 实现，等待前端 resume 信号
4. **前端补全** — 完整 DAG 可视化 (8节点)、QA 雷达图、HITL Modal

### Phase 4: 命名与整合

1. **重命名 `langgraph-orchestrator/` → `pipeline-server/`**
2. **明确与 `pipeline-orchestrator/` 的关系** — 后者保留为 skill 驱动的快速路径，前者为服务化的生产路径
3. **统一输出目录** — 遵循 `output/{source_category}/{YYYY-MM-DD-HHMM}/{repo_name}/` 规范
4. **集成 github-trending** — 作为前端入口，对接 pipeline-server API

---

## 5. 验收标准

### Phase 0 ✅ 已完成
- [x] 零硬编码路径，所有路径来自 env 或 pathlib 相对计算
- [x] tools/ 目录已删除 (3 个 @tool 死代码文件)
- [x] 根 main.py 存根已删除
- [x] 数据库 URL 仅从环境变量读取 (无默认密码)
- [x] proxy 支持已添加到 AppConfig

### Phase 1 ✅ 已完成
- [x] 重命名 `langgraph-orchestrator/` → `video-pipeline/`
- [x] `domain/analyzer/entities.py` 使用 ContentModel + MaterialManifest (从 contracts 导入)
- [x] `domain/composer/entities.py` 使用 Script + ScriptSegment (从 contracts 导入)
- [x] `domain/blueprint/entities.py` 完整重建: Blueprint, SceneConfig, ElementConfig (递归), AnimationConfig, TransitionToNext, VoiceoverConfig, SubtitleConfig, SfxTrigger, GlobalSettings (theme/typography/motionTokens/audio) — 与 Remotion types.ts 一一对齐
- [x] `domain/task/entities.py` 更新 PipelineStatus 枚举 + PipelineTask 使用 contracts 模型
- [x] 所有 interfaces 更新为使用 contracts 类型签名
- [x] 所有 infrastructure adapters 更新: LLMRepoAnalyzer → ContentModel, LLMScriptComposer → Script, LLMBlueprintComposer → 完整 Blueprint
- [x] 所有 Prompts 重写: Analyzer 4-Phase → ContentModel, Composer → Script with duration_est, Blueprint → 13维完整编排
- [x] QA Prompts 增强: 4 维加权评分 (技术准确性/节奏/叙事/结构)
- [x] PipelineState TypedDict 字段名对齐 (content_model, material_manifest, script, blueprint)
- [x] PostgreSQL ORM + Repository 更新为新字段名
- [x] 前端 DAG 更新为显示全部 8 个节点
- [x] 测试更新为使用新模型
- [x] contracts/pipeline_contracts/content.py 增强: ScriptSegment 增加 visual_type/visual_params, ContentModel 中 covers/publish_copy/meta 改为 Optional
- [x] pyproject.toml 名称更新为 `video-pipeline`

### Phase 2 ✅ 已完成
- [x] render_video → RemotionVideoRenderer 重写: 序列化 Blueprint → JSON → 调用 video-pipeline/video-renderer/scripts/render.py
- [x] post_process → 从 Script segments 生成 timeline.json + SRT, 调用 FFmpeg audio_mixer
- [x] media_generator → 调用 media-generator/ CLI (voiceover + bgm)
- [x] 输出目录遵循 convention: `output/{source_category}/{YYYY-MM-DD}/{repo_name}/`

### Phase 3 ✅ 已完成
- [x] LangGraph checkpointer — AsyncPostgresSaver 集成，lazy 初始化
- [x] HITL interrupt — 2 个 HITL 节点 (script_review, blueprint_review) + agentic_code_gen
- [x] 前端 HITL Modal — 遮罩层 + QA scorecard + Skip/Retry/Code Gen/Abort 按钮
- [x] 前端 DAG — 全部 10 节点显示 + 颜色状态 (active/completed/failed/HITL)
- [x] WebSocket resume 端点 — `/api/v1/task/resume/{task_id}` 支持人机共驾
- [x] 前端标题更新为 "Video Pipeline — Multi-Source Video Generation Control Panel"
- [x] README.md 完整文档

### 待做 (需实际环境验证)
- [ ] 端到端跑通: GitHub URL → final.mp4 (需 PostgreSQL + LLM API)
- [ ] agentic_code_gen 与本地 Code Agent 的 IPC/MCP 实际对接

---

## 6. 工作量估算

| Phase | 范围 | 复杂度 |
|---|---|---|
| Phase 0 | 基础修复 | 低 (路径/删除/环境变量) |
| Phase 1 | 契约对齐 | **高** (Blueprint 完整重建是核心难点) |
| Phase 2 | 节点实际化 | 中 (调用现有脚本) |
| Phase 3 | LangGraph 增强 | 中-高 (checkpointer + HITL + 前端) |
| Phase 4 | 命名整合 | 低 |

**建议优先级**: Phase 0 → Phase 1 → Phase 2 → Phase 4 → Phase 3

Phase 1 是关键路径 — 如果 Blueprint 模型不对齐，后续所有节点都无法实际运行。
