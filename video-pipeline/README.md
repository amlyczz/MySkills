# Video Pipeline

多源输入、多类型产出的自动化视频生成管线服务。基于 LangGraph 状态机编排，带人机共驾 (HITL) 人工审核。

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
│       │   ├── repo_analyzer/    #   ContentModel, MaterialManifest, ProjectCategory
│       │   ├── script_composer/  #   Script, ScriptSegment, VisualPlan
│       │   ├── visual_blueprint/ #   Blueprint, SceneConfig, ElementConfig, AnimationConfig ...
│       │   ├── post_producer/    #   VoiceoverGenerator, BGMGenerator, AudioMixer (ABC)
│       │   ├── github_trending/  #   GitHub Trending 评估域
│       │   └── task/             #   PipelineTask, PipelineStatus, QAScorecard
│       ├── application/          # ── 应用层 ──
│       │   ├── usecases/         #   LangGraph 节点 = UseCase 类
│       │   └── workflow/         #   PipelineState + StateGraph
│       ├── infrastructure/       # ── 基础设施层 ──
│       │   ├── config/           #   AppConfig
│       │   ├── llm/              #   ChatOpenAI 工厂
│       │   ├── repo_analyzer/    #   Playwright 抓取 + LLM 分析
│       │   ├── script_composer/  #   LLM 剧本创作 + 评估
│       │   ├── visual_blueprint/ #   LLM 蓝图生成 + 评估 + Remotion 渲染封装
│       │   │   ├── remotion_renderer.py   #   Blueprint JSON → npx remotion render
│       │   │   └── scripts/               #   渲染工具脚本
│       │   │       ├── render.py          #   Remotion 渲染封装 + Ken Burns + ffmpeg 工具
│       │   │       └── search_lottie.py   #   Lottie 动画搜索
│       │   ├── post_producer/             #   后期制作适配器
│       │   │   ├── ffmpeg_mixer.py        #   audio_mixer → final.mp4
│       │   │   ├── media_generator.py     #   TTS + BGM 生成
│       │   │   └── scripts/               #   后期制作脚本
│       │   │       ├── audio_mixer.py     #   音频混音 + 字幕烧录
│       │   │       ├── gen_srt.py         #   SRT 生成（等比例缩放）
│       │   │       ├── gen_srt_sentences.py # 句子级 SRT 生成
│       │   │       ├── gen_voiceover_timed.py # 段级 TTS + 场景对齐
│       │   │       ├── gen_voiceover_omnivoice.py # OmniVoice 声音克隆
│       │   │       └── verify_output.py   #   素材完整性检查
│       │   ├── qa_evaluator/     #   QA 评估提示词
│       │   ├── github/           #   GitHub Trending 抓取 + 评分
│       │   └── task/             #   PostgreSQL 持久化
│       └── presentation/         # ── 展示层 ──
│           ├── server.py         #   FastAPI 应用工厂
│           ├── api/              #   REST 端点
│           └── websocket/        #   WS 流式推送
├── frontend/                     # ── 前端 ──
│   ├── src/                      #   React + Vite + Tailwind 控制面板
│   │   └── App.tsx               #   任务提交 + DAG 可视化 + HITL Modal
│   ├── remotion/                 #   Remotion 视频渲染引擎 (TypeScript/React)
│   │   ├── src/
│   │   │   ├── engine/           #   VideoComposer + SceneRenderer
│   │   │   ├── components/       #   UI 组件库 (content/layout/decoration)
│   │   │   └── compositions/     #   场景组合
│   │   └── .claude/skills/remotion-best-practices/
│   └── hyperframes/              #   HyperFrames HTML 视频渲染引擎
│       ├── compositions/         #   HTML 场景组合
│       └── elevenlabs/           #   TTS 规格
└── output/                       #   管线产物输出目录
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
  → content_model + material_manifest + project_category + domain_analysis

compose_script
  → script (Script, 3-10 分钟，LLM 自行决定时长)

hitl_script_review (HITL — 始终触发)
  → 前端展示完整 segments 表格（口播/时长/视觉指令/素材）
  → approve → generate_blueprint
  → reject (带 feedback) → compose_script (重试)
  → abort → END

generate_blueprint
  → blueprint (Blueprint)
  → 同时写入 frontend/remotion/public/preview.json

hitl_blueprint_review (HITL — 始终触发)
  → 前端展示 Remotion Studio URL + 场景概览
  → approve → audio_design
  → reject (带 feedback) → generate_blueprint (重试)
  → abort → END

audio_design
  → 逐段 TTS → actual_durations[] → voiceover.mp3 + bgm.mp3 + timeline.json + subtitles.srt

render_compose
  → Blueprint 校准 (actual_durations) → Remotion render → video.mp4
  → ffmpeg mix + burn → final.mp4
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

### 视觉蓝图 (`infrastructure/blueprint/`)

| 适配器 | 接口 | 实现方式 |
|--------|------|----------|
| `LLMBlueprintComposer` | `BlueprintComposer` | LLM + `with_structured_output(Blueprint)`: 13 维编排 → 完整 ElementConfig 树 |
| `RemotionVideoRenderer` | `VideoRenderer` | 序列化 Blueprint → JSON 文件 → 调用 `backend/src/infrastructure/visual_blueprint/scripts/render.py` |

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
   - 在 `video-pipeline/frontend/remotion/src/` 下编写新的 React 组件
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

## HITL 人工审核

所有关键节点均由人工审核替代自动评分：

### Script Review
- 前端展示完整 segments 表格（序号/口播文本/时长/视觉指令/关联素材）
- 显示总预估时长
- 操作: Approve (继续) / Reject + feedback (重写) / Abort

### Blueprint Review
- 后端将 Blueprint JSON 写入 `frontend/remotion/public/preview.json`
- 前端展示 Remotion Studio URL (`http://localhost:31200/`)，用户点击可在 Remotion Studio 中预览
- 显示场景数量和总时长
- 操作: Approve (继续) / Reject + feedback (重新生成) / Abort
