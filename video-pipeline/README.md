# Video Pipeline

多源输入、多类型产出的自动化视频生成管线服务。基于 LangGraph 状态机编排，带 QA 反馈循环和人机共驾 (HITL) 支持。

## 目录

- [架构总览](#架构总览)
- [领域实体](#领域实体)
- [Pipeline 状态上下文](#pipeline-状态上下文)
- [工具与能力](#工具与能力)
- [Code Agent 调用机制](#code-agent-调用机制)
- [环境变量](#环境变量)
- [启动方式](#启动方式)
- [API 端点](#api-端点)

---

## 架构总览

```
video-pipeline/
├── backend/
│   ├── .env.example              # 环境变量模板
│   ├── pyproject.toml            # 依赖声明 (uv)
│   └── src/
│       ├── main.py               # 入口: uvicorn 启动
│       ├── domain/               # ── 领域层 ──
│       │   ├── analyzer/
│       │   │   ├── entities.py   #   ContentModel, MaterialManifest, ProjectCategory
│       │   │   └── interfaces.py #   RepoScraper, RepoAnalyzer (ABC)
│       │   ├── composer/
│       │   │   ├── entities.py   #   Script, ScriptSegment, VisualPlan
│       │   │   └── interfaces.py #   ScriptComposer, ScriptEvaluator, VisualPlanner (ABC)
│       │   ├── blueprint/
│       │   │   ├── entities.py   #   Blueprint, SceneConfig, ElementConfig, AnimationConfig ...
│       │   │   └── interfaces.py #   BlueprintComposer, BlueprintEvaluator, VideoRenderer (ABC)
│       │   ├── post_producer/
│       │   │   └── interfaces.py #   VoiceoverGenerator, BGMGenerator, AudioMixer (ABC)
│       │   └── task/
│       │       ├── entities.py   #   PipelineTask, PipelineStatus, QAScorecard
│       │       └── interfaces.py #   PipelineTaskRepository (ABC)
│       ├── application/          # ── 应用层 ──
│       │   ├── usecases/         #   LangGraph 节点 = UseCase 类
│       │   │   ├── analyze.py    #   analyze_repo
│       │   │   ├── compose.py    #   compose_script
│       │   │   ├── qa.py         #   qa_script, qa_blueprint
│       │   │   ├── blueprint.py  #   generate_blueprint
│       │   │   ├── render.py     #   render_video (带并发控制)
│       │   │   └── post_process.py # post_process
│       │   └── workflow/
│       │       ├── state.py      #   PipelineState (LangGraph 状态定义)
│       │       └── graph.py      #   StateGraph 编译 + HITL 节点 + 路由
│       ├── infrastructure/       # ── 基础设施层 ──
│       │   ├── config/
│       │   │   └── app_config.py #   AppConfig, PROJECT_ROOT
│       │   ├── llm/
│       │   │   └── client.py     #   ChatOpenAI 工厂 (Langfuse 追踪)
│       │   ├── analyzer/
│       │   │   ├── playwright_scraper.py  #   Playwright 页面抓取
│       │   │   └── llm_analyzer.py        #   LLM → ContentModel + MaterialManifest
│       │   ├── composer/
│       │   │   ├── llm_composer.py        #   LLM → Script
│       │   │   └── llm_evaluator.py       #   LLM → QAScorecard (4 维)
│       │   ├── blueprint/
│       │   │   ├── llm_composer.py        #   LLM → Blueprint (13 维)
│       │   │   ├── llm_evaluator.py       #   LLM → QAScorecard (6 维)
│       │   │   └── remotion_renderer.py   #   Blueprint JSON → npx remotion render
│       │   ├── post_producer/
│       │   │   ├── media_generator.py     #   python -m media_generator voiceover/bgm
│       │   │   └── ffmpeg_mixer.py        #   audio_mixer.py → final.mp4
│       │   └── task/
│       │       ├── connection.py          #   SQLAlchemy async lazy engine
│       │       ├── postgres_models.py     #   PipelineTaskDB ORM
│       │       └── postgres_repository.py #   领域实体 ↔ JSONB 转换
│       └── presentation/        # ── 展示层 ──
│           ├── server.py         #   FastAPI 应用工厂
│           ├── api/
│           │   └── task_controller.py  #   REST: submit, get_status
│           └── websocket/
│               └── task_streamer.py    #   WS: stream, resume (HITL)
└── frontend/                    # React + Vite + Tailwind 控制面板
    └── src/
        └── App.tsx              #   任务提交 + DAG 可视化 + HITL Modal + 日志流
```

---

## 领域实体

所有实体在 `video-pipeline/backend/src/domain/` 下定义，video-pipeline 完全自包含，无外部 contracts 依赖。

### Analyzer 域 (`domain/analyzer/entities.py`)

| 实体 | 说明 |
|------|------|
| `ContentModel` | 内容分析全量模型: source + content + script + covers + publish_copy + source_code_insight |
| `MaterialManifest` | 素材采集清单: materials[] (type, source, capture, metadata) |
| `Script` / `ScriptSegment` | 口播脚本: full_text + segments[] (text, duration_est, visual_type, visual_params) |
| `GitHubSourceMeta` | GitHub 元信息: language, stars, forks, topics, license |
| `ProjectCategory` | 路由枚举: `educational / promo / tech_deep_dive / product_showcase / trending_digest` |
| `NormalizedContent` | 规范化内容: title, tagline, points, summary, stats_text |
| `SourceCodeInsight` | 源码洞察: architecture, patterns, highlights, api_style |

### Composer 域 (`domain/composer/entities.py`)

| 实体 | 说明 |
|------|------|
| `Script` / `ScriptSegment` / `ContentModel` | 从 analyzer 域导入 |
| `VisualPlan` | composer→blueprint 桥接: segment_index, scene_type, layout_hint, motion_hint, element_suggestions |

### Blueprint 域 (`domain/blueprint/entities.py`) — 本地定义，397 行

这是 video-pipeline 最核心的领域模型，直接映射 Remotion 渲染引擎的 TypeScript 接口。

| 实体 | 说明 |
|------|------|
| `Blueprint` | 顶层: meta, data, variables, globalSettings, globalBackground, globalOverlays, scenes[] |
| `BlueprintMeta` | id, name, description |
| `GlobalSettings` | safeArea, theme (colors + typography + shape), motionTokens, audio (bgm + ducking) |
| `ThemeConfig` | colors (primary, secondary, accent, bg, text, textMuted), typography, shape |
| `SceneConfig` | id, type, startFrame, durationInFrames, background, elements[], transitionToNext, voiceover, subtitles, sfx |
| `ElementConfig` | 递归组件树: id, type, props, children[], animation, layout, condition |
| `AnimationConfig` | type (fade-in/out/up/down, scale-in/bounce, slide-left/right/up/down, typewriter), timeline (inFrame, outFrame), easing, stagger, loop |
| `AnimationTimeline` | inFrame, outFrame, duration |
| `StaggerConfig` | delayPerChild, direction |
| `TransitionToNext` | type (crossfade, soft-replace, spatial-shift, diagonal-wipe), durationInFrames |
| `VoiceoverConfig` | audioUrl, text, startFrame, endFrame, volume |
| `SubtitleConfig` | tokens[] (text, fromFrame, toFrame), highlightColor |
| `SfxTrigger` | sfx, atFrame, volume |
| `ElementLayout` | position (flex-child), x, y, width, height, zIndex, scale, rotation |
| `MotionToken` | easing (spring/bezier/linear), duration |

Blueprint 序列化后的 JSON 可直接传入 Remotion `--props` 消费。

### Task 域 (`domain/task/entities.py`)

| 实体 | 说明 |
|------|------|
| `PipelineStatus` | 枚举 (12 值): pending → analyzing → composing → qa_script_failed → blueprinting → qa_blueprint_failed → generate_media → rendering → qa_video_failed → post_processing → completed / error |
| `QAScorecard` | score (0-100), reasoning, retry_count |
| `PipelineTask` | 聚合根: id, repo_url, status, content_model, material_manifest, script, blueprint, qa_script, qa_blueprint, video_mp4_path, final_mp4_path |

---

## Pipeline 状态上下文

LangGraph `PipelineState` (TypedDict) 是整个状态机的上下文，在节点之间传递：

```python
class PipelineState(TypedDict):
    # ── 任务标识 ──
    task_id: str                              # UUID
    repo_url: str                             # 输入的 GitHub URL
    project_category: str                     # educational / promo / tech_deep_dive / ...

    # ── 执行状态 ──
    status: PipelineStatus                    # 当前阶段枚举

    # ── 领域实体 (按管线顺序产出) ──
    content_model: Optional[ContentModel]     # ← analyze_repo 产出
    material_manifest: Optional[MaterialManifest]  # ← analyze_repo 产出
    script: Optional[Script]                  # ← compose_script 产出
    blueprint: Optional[Blueprint]            # ← generate_blueprint 产出

    # ── QA 评估 ──
    qa_script: Optional[QAScorecard]          # ← qa_script 产出
    qa_blueprint: Optional[QAScorecard]       # ← qa_blueprint 产出

    # ── 重试控制 ──
    qa_script_retry_count: int                # qa_script 失败次数
    qa_blueprint_retry_count: int             # qa_blueprint 失败次数

    # ── 产出文件路径 ──
    voiceover_path: Optional[str]             # voiceover.mp3
    bgm_path: Optional[str]                   # bgm.mp3
    video_mp4_path: Optional[str]             # video.mp4
    final_mp4_path: Optional[str]             # final.mp4

    # ── 错误 ──
    error: Optional[str]
```

### 状态流转

```
analyze_repo
  → content_model + material_manifest + project_category

compose_script
  → script (Script)

qa_script
  → qa_script (QAScorecard)
  → score >= 80 → generate_blueprint
  → score < 80, retry < 3 → compose_script
  → retry >= 3 → hitl_script_review (HITL)

generate_blueprint
  → blueprint (Blueprint)

qa_blueprint
  → qa_blueprint (QAScorecard)
  → score >= 80 → render_video
  → score < 80, retry < 3 → generate_blueprint
  → retry >= 3 → hitl_blueprint_review (HITL)

hitl_script_review / hitl_blueprint_review
  → LangGraph interrupt() 暂停，等待人类决策
  → skip / retry / abort / code_gen

agentic_code_gen
  → 打包上下文发送给 Code Agent
  → 完成后回退到 generate_blueprint

render_video
  → video_mp4_path (video.mp4)

post_process
  → voiceover_path + bgm_path + final_mp4_path (final.mp4)
```

### 输出目录

所有产物统一输出到:
```
output/{source_category}/{YYYY-MM-DD}/{repo_name}/
  ├── blueprint.json          ← generate_blueprint 产出
  ├── voiceover.mp3           ← post_process 产出
  ├── bgm.mp3                 ← post_process 产出
  ├── timeline.json           ← post_process 从 script 生成
  ├── subtitles.srt           ← post_process 从 script 生成
  ├── video.mp4               ← render_video 产出
  └── final.mp4               ← post_process 产出
```

---

## 工具与能力

video-pipeline 的基础设施层提供以下能力，每个能力由一个 domain interface (ABC) 定义，由 infrastructure adapter 实现：

### LLM 能力 (`infrastructure/llm/`)

| 适配器 | 接口 | 实现 |
|--------|------|------|
| `get_llm_client()` | — | ChatOpenAI 工厂，返回 `gpt-4o`，temp=0.2，带 Langfuse 追踪 |

**支持的 LLM 后端**: 任何 OpenAI 兼容 API (OpenAI, DeepSeek, 通义千问, 本地 vLLM 等)，通过 `OPENAI_BASE_URL` 配置。

### 内容分析 (`infrastructure/analyzer/`)

| 适配器 | 接口 | 实现方式 |
|--------|------|----------|
| `PlaywrightScraper` | `RepoScraper` | Playwright 无头浏览器: 访问 GitHub 页面 → 滚动 → 截图 → 提取 README |
| `LLMRepoAnalyzer` | `RepoAnalyzer` | LLM + `with_structured_output(ContentModel)`: 4-Phase 分析 → ContentModel + MaterialManifest |

### 剧本创作 (`infrastructure/composer/`)

| 适配器 | 接口 | 实现方式 |
|--------|------|----------|
| `LLMScriptComposer` | `ScriptComposer` | LLM + `with_structured_output(Script)`: 输入 ContentModel → 输出 Script |
| `LLMScriptEvaluator` | `ScriptEvaluator` | LLM + `with_structured_output(QAResultSchema)`: 4 维加权评分 |

### 视觉蓝图 (`infrastructure/blueprint/`)

| 适配器 | 接口 | 实现方式 |
|--------|------|----------|
| `LLMBlueprintComposer` | `BlueprintComposer` | LLM + `with_structured_output(Blueprint)`: 13 维编排 → 完整 ElementConfig 树 |
| `LLMBlueprintEvaluator` | `BlueprintEvaluator` | LLM: 6 维视觉评估 (elements, animation, layout, outFrame, subtitles, cohesion) |
| `RemotionVideoRenderer` | `VideoRenderer` | 序列化 Blueprint → JSON 文件 → 调用 `video-pipeline/video-renderer/scripts/render.py` |

### 后期制作 (`infrastructure/post_producer/`)

| 适配器 | 接口 | 实现方式 |
|--------|------|----------|
| `MediaGenerator` | `VoiceoverGenerator` + `BGMGenerator` | subprocess: `python -m media_generator voiceover --text ... --pitch 3` / `bgm --prompt ...` |
| `FFmpegAudioMixer` | `AudioMixer` | subprocess: `python audio_mixer.py` → loudnorm + sidechain ducking + 字幕烧录 |

### 数据持久化 (`infrastructure/task/`)

| 适配器 | 接口 | 实现方式 |
|--------|------|----------|
| `PostgresPipelineTaskRepository` | `PipelineTaskRepository` | SQLAlchemy 2.0 async + asyncpg: 领域实体 ↔ JSONB 双向转换 |
| `AsyncPostgresSaver` | LangGraph Checkpointer | `langgraph-checkpoint-postgres`: pipeline 状态断点续跑 |

---

## Code Agent 调用机制

当 Blueprint QA 连续 3 次未通过（通常因为现有组件库无法满足视觉需求），触发 `agentic_code_gen` 节点：

### 当前实现

```
qa_blueprint (fail ×3)
  → hitl_blueprint_review (interrupt, 等待人类)
    → 人类选择 "code_gen"
      → agentic_code_gen 节点
        → 打包上下文 (blueprint_summary, qa_score, qa_reasoning)
        → interrupt() 暂停，人类在 Modal 中审批
        → 人类确认后 → 回退到 generate_blueprint 重新评估
```

### 未来: IPC/MCP 协议

`agentic_code_gen` 的完整设计是：

1. **打包需求上下文**: 将 Blueprint 失败原因、缺失的组件类型、需要的样式参数打包为 JSON
2. **通过 MCP 协议发送给本地 Code Agent** (如 Claude Code / Cursor):
   ```
   POST /mcp/tools/code_gen
   Body: { context, missing_components, style_requirements }
   ```
3. **Code Agent 执行**:
   - 在 `video-pipeline/video-renderer/remotion/src/` 下编写新的 React 组件
   - 注册到 `componentRegistry.ts`
   - 调试并确保 TypeScript 编译通过
   - 热更新 Remotion 开发服务器
4. **回传信号**: Code Agent 完成后发送完成信号
5. **LangGraph 恢复**: 重新执行 `generate_blueprint` 使用新的组件库

---

## 环境变量

配置文件: `backend/.env.example` (复制为 `.env`)

### 必填

| 变量 | 示例 | 说明 |
|------|------|------|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@localhost:5432/video_pipeline` | PostgreSQL 连接，用于任务持久化 + LangGraph checkpointer |
| `OPENAI_API_KEY` | `sk-xxxxxxxx` | LLM API 密钥 (支持 OpenAI / DeepSeek / 通义等兼容 API) |

### 可选

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | 自定义 API 端点 (DeepSeek: `https://api.deepseek.com/v1`) |
| `LLM_MODEL` | `gpt-4o` (代码内硬编码) | 模型名称 |
| `OUTPUT_DIR` | `项目根/output/` | 覆盖输出目录 |
| `HTTP_PROXY` | — | HTTP 代理 (macOS: `127.0.0.1:7890`, WSL: `172.28.0.1:10808`) |
| `HTTPS_PROXY` | — | HTTPS 代理 |
| `LANGFUSE_PUBLIC_KEY` | `pk-lf-test` | Langfuse 追踪公钥 |
| `LANGFUSE_SECRET_KEY` | `sk-lf-test` | Langfuse 追踪私钥 |
| `LANGFUSE_HOST` | `http://localhost:3000` | Langfuse 本地地址 |

---

## 启动方式

```bash
# 1. 后端
cd video-pipeline/backend
cp .env.example .env        # 填入 DATABASE_URL 和 OPENAI_API_KEY
uv sync                      # 安装依赖
uv run python -m src.main    # 启动 FastAPI 服务 (0.0.0.0:18274)

# 2. 前端
cd video-pipeline/frontend
npm install
npm run dev                  # 启动 Vite 开发服务器 (localhost:15392)
```

### 依赖关系

```
video-pipeline/backend/pyproject.toml
  ├── langchain / langchain-openai / langgraph
  ├── fastapi / uvicorn / websockets
  ├── pydantic >= 2.0
  ├── sqlalchemy[asyncio] + asyncpg / psycopg
  └── playwright
```

所有实体定义自包含在 `src/domain/` 下，无外部 contracts 包依赖。

---

## API 端点

### REST

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/task/submit` | 提交任务: `{repo_url, project_type}` → `{task_id, status}` |
| `GET` | `/api/v1/task/{task_id}` | 查询状态: 返回全部领域实体 + 文件路径 |

### WebSocket

| 路径 | 说明 |
|------|------|
| `ws://host:18274/api/v1/task/stream/{task_id}?repo_url=...` | 流式执行: state_change / log / hitl / pipeline_end / error |
| `ws://host:18274/api/v1/task/resume/{task_id}` | HITL 恢复: 发送 `{action: "skip"|"retry"|"abort"|"code_gen"}` |

### WebSocket 事件格式

```jsonc
// 节点开始/完成
{"type": "state_change", "node": "analyze_repo", "status": "started" | "completed"}

// LLM token 流
{"type": "log", "node": "compose_script", "content": "..."}

// HITL 暂停 (QA 失败 3 次)
{"type": "hitl", "message": "Pipeline paused for human review.", "task_id": "..."}

// 管线结束
{"type": "pipeline_end"}

// 错误
{"type": "error", "content": "..."}
```

---

## QA 评估维度

### Script QA (4 维, 各 25%)

| 维度 | 权重 | 评估标准 |
|------|------|----------|
| Technical Accuracy | 25% | 技术描述准确，代码/架构描述精确 |
| Narrative Pacing | 25% | 节奏流畅，分段时长均衡 |
| Audience Engagement | 25% | 语言有吸引力，能抓住观众注意力 |
| Structure Completeness | 25% | 有清晰的 intro/body/outro，有技术架构段 |

### Blueprint QA (6 维)

| 维度 | 权重 | 评估标准 |
|------|------|----------|
| Element Completeness | 20% | 每个场景有完整的 ElementConfig 组件树 |
| Animation Quality | 20% | 所有动画元素有正确的 inFrame/outFrame, stagger |
| Flex Layout | 15% | 所有元素使用 flex-child，无绝对定位 |
| Safe Exit | 15% | outFrame = durationInFrames - 15 |
| Subtitle Quality | 15% | 按标点分句，非逐词切分 |
| Visual Cohesion | 15% | 过渡、背景、主题色形成统一视觉语言 |

**阈值**: 80/100 通过。最大重试 3 次。第 3 次失败触发 HITL。
