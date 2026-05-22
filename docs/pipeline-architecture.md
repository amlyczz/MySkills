# MySkills 视频管线架构文档

> 完整业务流、数据流与系统架构说明
> 最后更新: 2026-05-22

---

## 目录

1. [系统概述](#1-系统概述)
2. [整体架构](#2-整体架构)
3. [Pipeline 业务流](#3-pipeline-业务流)
4. [层间数据契约](#4-层间数据契约)
5. [Remotion 渲染引擎](#5-remotion-渲染引擎)
6. [布局系统](#6-布局系统)
7. [动画系统](#7-动画系统)
8. [过渡系统](#8-过渡系统)
9. [音频系统](#9-音频系统)
10. [样式系统](#10-样式系统)
11. [文件索引](#11-文件索引)

---

## 1. 系统概述

MySkills 是一个**从 GitHub 仓库 URL 到最终视频**的全自动视频生成管线。输入一个 GitHub 仓库 URL，输出一个结构化的项目演示视频（`final.mp4`）。

### 核心设计原则

- **分层解耦**：5 层严格递进的流水线架构，每层只依赖前一层的输出
- **AI 决策 + 机械执行**：创作类任务由 AI agent 主导，确定性任务由脚本自动完成
- **无降级**：每阶段必须成功，失败即报错退出，不静默跳过
- **Schema 约束**：所有层间数据交换使用 Pydantic / Zod 类型约束
- **断点续跑**：checkpoint 机制，重跑时跳过已完成阶段

### 适用场景

- GitHub 项目推广视频
- 技术产品演示视频
- 开源项目介绍
- 性能/功能发布视频

---

## 2. 整体架构

```
                     ┌─────────────────────────┐
                     │  内容源层 (可选)          │
                     │ content-source-github-   │
                     │ trending                 │
                     └───────────┬─────────────┘
                                 │ 选择 repo
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                    Layer 0: 内容生成                           │
│                 content-generator (AI 决策)                     │
│         输入: GitHub URL → 输出: content.json                   │
└────────────────────────────┬───────────────────────────────────┘
                             │ content.json
┌────────────────────────────▼───────────────────────────────────┐
│                    Layer 1: 素材采集                           │
│                 material-collector (机械执行)                    │
│         输入: content.json → 输出: material_manifest.json       │
└────────────────────────────┬───────────────────────────────────┘
                             │ material_manifest.json
┌────────────────────────────▼───────────────────────────────────┐
│                    Layer 2: 时间线编排                         │
│                 timeline-composer (机械执行)                     │
│         输入: content.json + manifest → 输出: timeline.json     │
│                                  + video_config.json            │
│                                  + .srt 字幕                    │
└────────────────────────────┬───────────────────────────────────┘
                             │ video_config.json + timeline.json
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Layer 3      │   │  Layer 2.5    │   │  横向切面      │
│  video-       │   │  音频生成      │   │  media_        │
│  renderer     │   │  media_       │   │  generation    │
│  (Remotion)   │   │  generation   │   │  (图片/语音/    │
│               │   │  (voiceover   │   │   音乐/视频)    │
│               │   │   + bgm)      │   │               │
└───────┬───────┘   └───────┬───────┘   └───────────────┘
        │                   │
        ▼                   ▼
┌────────────────────────────────────────────────────────────────┐
│                    Layer 4: 后期合成                          │
│                 post-producer (机械执行)                        │
│         输入: video.mp4 + voiceover + bgm + timeline           │
│         输出: final.mp4 ✅                                      │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    编排层: pipeline-orchestrator               │
│            AI agent 阅读 skill.md 逐阶段驱动管线的执行           │
└────────────────────────────────────────────────────────────────┘
```

### 3 种执行路径

| 路径 | 适用场景 | 说明 |
|------|---------|------|
| **全自动** | 从零到最终视频 | content-source → content-generator → pipeline-orchestrator 全阶段执行 |
| **指定仓库** | 已知目标项目 | 直接调用 content-generator 生成内容，再走 pipeline-orchestrator |
| **半自动** | 已有 content.json | 从 pipeline-orchestrator Phase 1 开始执行（素材采集 → 渲染） |

---

## 3. Pipeline 业务流

### Phase 0: 内容生成（AI 决策）

**角色**：AI agent 主导

**输入**：GitHub 仓库 URL

**处理流程**：

1. **基础数据采集**：通过 `gh api` 获取仓库元数据（stars, forks, topics, license, README）
2. **源码扫描**：扫描仓库，按 4 维评分选取前 15 个最有价值的源码文件
3. **4 维深度分析**：
   - 技术栈与架构设计
   - 核心业务逻辑与数据流
   - 代码质量与工程化规范
   - 性能、安全与扩展性
4. **内容生成**：生成口播脚本（8-20 segments）、文案、封面提示词、发布文案

**输出文件**：`content-generator/content/YYYY-MM-DD/HHmm-{repo_name}-content.json`

**质量铁律**：
- 口播 8-20 segments，总时长 60-360 秒
- 4 字/秒估算 duration_est
- 封面提示词中英文各一份，具体到视觉元素
- 去重记录写入 `content-generator/content/YYYY-repos.md`

---

### Phase 1: 素材采集（机械执行）

**角色**：Playwright 录制脚本 + allocate.py

**输入**：仓库 URL + 总时长

**处理流程**：

1. **recorder.mjs**：Playwright 浏览器自动化，执行以下操作：
   - 录制页面滚动视频（scroll_video）
   - 提取内嵌图片/视频/GIF（image, extracted_video）
   - 发现关键外链并录屏（link_video）
   - 提取 README 代码块并截图（code_snippet）
   - 自动截图关键元素（screenshot）
   - 探测 /docs 目录（doc_page）
2. **allocate.py**：验证素材清单完整性
3. **manifest_validator.py**：Pydantic 模式校验

**输出文件**：
- `material_manifest.json` — 结构化素材清单（v2 格式）
- `materials/` — 实际素材文件目录

**素材类型（15 种）**：

| 类型 | 说明 | 来源 |
|------|------|------|
| `scroll_video` | 页面滚动录屏 | recorder.mjs |
| `link_video` | 外链页录屏 | recorder.mjs |
| `image` | 内嵌图片 | 页面提取 |
| `extracted_video` | 页面内嵌视频 | 页面提取 |
| `screenshot` | 元素截图 | Playwright |
| `code_snippet` | 代码块截图 | Playwright |
| `source_code` | 源码文件 | gh api |
| `doc_page` | 文档页面截图 | Playwright |
| `repo_tree` | 仓库目录结构 | gh api |
| `repo_stats` | 仓库统计数据 | gh api |
| `manual_*` | 手动上传素材 | 用户提供 |

---

### Phase 2: 时间线编排（机械执行）

**角色**：`timeline_composer.py`（805 行编排引擎）

**输入**：`content.json` + `material_manifest.json` + 总时长

**8 步编排流水线**：

| 步骤 | 方法 | 功能 |
|------|------|------|
| 1 | `_split_voiceover()` | 按标点把口播拆分为 utterances |
| 2 | `_extract_keywords()` | 从每段 utterance 提取关键词（英文术语 + 功能 + 领域标签） |
| 3 | `_match_materials()` | 关键词-素材评分匹配（代码/图片/视频/截图各有权重） |
| 4 | `_merge_into_segments()` | 合并同一素材的连续 utterances → TimelineSegment |
| 5 | `_assign_seg_types()` | 按位置和素材类型分配场景类型 |
| 6 | `_build_layout_and_audio()` | 按 seg type 分配 layout + motion + 音频 |
| 7 | `_divide_chapters()` | 从 segment boundaries 创建章节标记 |
| 8 | `_generate_subtitles()` | 从 voiceover 文本生成 15 字/段字幕条目 |

**场景类型 → 布局映射**：

```
hook             → hero-center       + bounce-in
problem          → hero-center       + {}
solution         → split-left-text   + {}
features         → card-grid         + spring-slide-up
showcase         → media-full        + {}
code_showcase    → code-display      + {}
source_highlight → code-display      + {}
stats_showcase   → stat-highlight    + {}
proof            → stat-highlight    + spring-elastic
social_proof     → quote-style       + {}
comparison       → stat-highlight    + {}
cta              → hero-center       + spring-slide-up
manual           → media-full        + {}
```

**输出文件**：
- `timeline.json` — 完整时间线（segments + chapters + subtitles）
- `timeline.srt` — 字幕文件
- `video_config.json` — **唯一**写入此文件的层，Phase 3 的直接输入

---

### Phase 2.5: 音频生成（机械执行）

**角色**：`media_generation` CLI

**输入**：content.json + 总时长

```
python -m media_generation voiceover --from-content content.json --output voiceover.mp3
python -m media_generation bgm --duration $TOTAL_DURATION --output bgm.mp3
```

**输出文件**：
- `voiceover.mp3` — 口播录音
- `bgm.mp3` — 背景音乐

**底层 Provider**：MiniMax（通过 mmx CLI），支持多 provider 降级。

---

### Phase 3: Remotion 渲染（机械执行）

**角色**：Remotion + React 组件树

**输入**：`video_config.json`

```
npx remotion render VideoComposer video.mp4 \
  --props=video_config.json --codec h264 --crf 18
```

**输出文件**：`video.mp4`（h264, CRF 18, 1080p@30fps）

详见第 5 节 [Remotion 渲染引擎](#5-remotion-渲染引擎)。

---

### Phase 4: 后期合成（机械执行）

**角色**：`post-producer` 脚本

**输入文件**：
- `video.mp4`（Phase 3）
- `voiceover.mp3` + `bgm.mp3`（Phase 2.5）
- `timeline.json` + `.srt`（Phase 2）

**处理流程**：

1. **verify_output.py**：检查所有必需文件是否存在
2. **audio_mixer.py**：音频混音管线
   - Voiceover: loudnorm 标准化到 -16 LUFS
   - BGM: 按 segment 音频编排生成音量包络 + fade in/out
   - **Sidechain ducking**: voiceover 激活时 BGM 自动闪避
   - **SFX 放置**: 按 timeline 时间点放置音效
   - **Mux**: video + mixed audio → 最终输出

**输出文件**：**`final.mp4`** ✅

---

## 4. 层间数据契约

| 层 | 输入 | 输出 | Schema 验证 |
|-----|------|------|-------------|
| Layer 0 | GitHub repo URL | `content.json` | `ContentModel` (Pydantic) + `content.schema.json` |
| Layer 1 | Repo URL + 时长 | `material_manifest.json` + `materials/` | `MaterialManifest` (Pydantic) + `material_manifest.schema.json` |
| Layer 2 | content.json + manifest | `timeline.json` + `.srt` + `video_config.json` | `TimelineComposer` 内联验证 + `timeline.schema.json` / Zod |
| Layer 3 | `video_config.json` | `video.mp4` | Zod `videoConfigSchema` |
| Layer 4 | video.mp4 + audio + timeline | `final.mp4` | `TimelineModel` + `MixAudioRequest` (Pydantic) |
| 横向 | 文本/提示词 | 媒体文件 | 各 capability Pydantic 模型 |

### ContentModel（Layer 0 输出）

```python
class ContentModel(BaseModel):
    repo:        RepoInfo     # full_name, url, language, stars, forks, topics, license
    content:     ContentInfo   # title, tagline, points[3-5], summary, chartData, domains
    script:      Script        # full_text, segments[{text, duration_est}], total_duration_est
    covers:      Covers        # 3x4 + 16x9, 中英文各一份
    publish_copy:PublishCopy   # titles[{full, short}], body[100-200字], tags[6-8]
    source_code_insight: ...   # 可选：4 维源码分析结果
    meta:        Meta          # generated_at, source
```

### MaterialManifest（Layer 1 输出）

```python
class MaterialManifest(BaseModel):
    version:    str = "2"
    repo:       RepoRef | None
    created_at: str | None
    materials:  list[Material]    # Material: id, type, path, duration?, dimensions?
```

### TimelineSegment（Layer 2 内部模型）

```python
class TimelineSegment(BaseModel):
    id:               str     # "seg_001"
    type:             str     # hook/problem/solution/features/showcase/...
    label:            str     # 中文标签
    time_start:       float   # 起始时间（秒）
    time_end:         float   # 结束时间（秒）
    duration:         float   # 时长（秒）
    voiceover:        dict    # text, duration_est, splits[]
    primary_material: str | None
    material_refs:    str[]   # 素材 ID 列表
    layout:           dict    # {layout_id, motion_map}
    audio:            dict    # bgm_volume, sfx[]
    transition_in:    str     # crossfade/slide-in/whip-pan/none
    transition_out:   str
```

### VideoConfig（Layer 3 输入 — Zod 约束）

```typescript
interface VideoConfig {
  generated_by?: { phase, layer, timestamp, version };
  structureId: "funnel" | "timeline" | "product-showcase" | "performance-launch";
  styleId: string;
  bgType: "starfield" | "bokeh" | "geometric" | "pixel" | "fluid-gradient" | "none";
  sceneConfigs: Record<string, SceneConfig>;
  audio: { sfxEnabled, voiceover[], voiceoverEnabled, bgm? };
}

interface SceneConfig {
  layoutId: LayoutType;      // 15 种枚举
  motionMap: Record<string, MotionType>;  // 18 种枚举
  content: Record<string, string | string[]>;
  durationSeconds?: number;  // 1-300
  chartData?: BarChartItem[];
  cameraAction?: { type: "pan-and-zoom", ... };
  wrapperType?: "glow" | "device-frame";
  transitionIn?: { type: TransitionType, direction?, durationFrames };
  transitionOut?: { type: TransitionType, direction?, durationFrames };
}
```

### 全局参数计算

```
total_seconds = max(60, min(300, ceil(total_duration_est * 1.2 + 30)))
```

最少 60 秒，最多 300 秒。公式 = 口播时长 × 1.2 倍 + 30 秒余量。

### 输出目录结构

```
$OUTPUT_DIR/                          # content-generator/content/YYYY-MM-DD/HHmm-{repo_name}
  video_config.json                   # Agent 初始 → Phase 2 精细化覆盖
  material_manifest.json              # Phase 1 产出
  materials/                          # Phase 1 素材文件目录
  timeline.json                       # Phase 2 产出
  timeline.srt                        # Phase 2 产出字幕
  voiceover.mp3                       # Phase 2.5 产出
  bgm.mp3                             # Phase 2.5 产出
  video.mp4                           # Phase 3 产出
  final.mp4                           # Phase 4 产出 ✅
  .pipeline_checkpoints.json          # 断点续跑状态
```

---

## 5. Remotion 渲染引擎

> 路径: `video-renderer/remotion/src/`

### 5.1 渲染树

```
<RemotionRoot>
  <Composition id="VideoComposer">
    <VideoComposer config={videoConfig}>
      <AbsoluteFill>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={N}>
            <SceneBase>
              <AbsoluteFill>
                {/* Layer 0: 可选视频背景 */}
                {/* Layer 1: BackgroundLayer 动态背景 */}
                {/* Layer 2: 半透明遮罩 overlay */}
                {/* Layer 3: LayoutDispatcher → 具体布局组件 */}
              </AbsoluteFill>
            </SceneBase>
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition presentation={fade/slide/whipPan} />

          <TransitionSeries.Sequence durationInFrames={N}>
            <SceneBase>...</SceneBase>
          </TransitionSeries.Sequence>

          ... 更多场景
        </TransitionSeries>

        {/* 始终可见的 overlay */}
        <ChapterProgressBar />
        <BgmWithCurve />        {/* BGM 音量曲线 */}
        <Audio />               {/* 逐场景 voiceover */}
      </AbsoluteFill>
    </VideoComposer>
  </Composition>
</RemotionRoot>
```

### 5.2 场景注册表

VideoComposer 接收 `timeline-adaptive` 结构时，从 `sceneConfigs` 动态派生场景列表。每个场景的 `type` 字段告诉注册表使用哪个 Scene 组件。

注册表位于 `scenes/index.tsx`，包含 7 个场景组件：

| 场景组件 | 默认布局 | 默认动效 | 用途 |
|---------|---------|---------|------|
| `HookScene` | hero-center | title: bounce-in | 开篇钩子 |
| `ProblemScene` | hero-center | defaultMotionMap | 问题描述 |
| `SolutionScene` | split-left-text | defaultMotionMap | 方案展示 |
| `FeatureScene` | hero-center | defaultMotionMap | 功能亮点 |
| `ShowcaseScene` | media-full | title: none | 素材展示 |
| `CtaScene` | hero-center | underline=true, bullet=false | 行动呼吁 |
| `ProofScene` | stat-highlight | stats: scale-fade | 数据证明 |

### 5.3 SceneBase 架构

每个场景 = 4 层叠加：

1. **Layer 0 — 视频背景**（可选）：`style.backgroundVideoUrl`，循环播放，覆盖程序化背景
2. **Layer 1 — 动态背景**：`BackgroundLayer` 组件，5 种类型
3. **Layer 2 — 半透明遮罩**：渐变 overlay，20 帧内淡入
4. **Layer 3 — 内容布局**：`LayoutDispatcher` 根据 `layoutId` 派发

### 5.4 VideoComposer 数据流

```
VideoConfig JSON
  │
  ├─ Zod 运行时验证 (validateVideoConfig)
  │
  ├─ 查找结构模板 (getStructure)
  │
  ├─ 查找样式模板 (styleTemplates.find)
  │
  ├─ 构建 SceneRenderData[]
  │   ├─ timeline-adaptive: 从 sceneConfigs 键派生
  │   └─ 其他结构: 从 structure.scenes 构建
  │
  ├─ 计算过渡 presentations (buildTransitionPresentation)
  │
  ├─ 计算调整后帧位置 (扣除过渡重叠)
  │
  ├─ 构建 TransitionSeries 子节点
  │
  └─ 渲染 (Remotion 逐帧输出)
```

---

## 6. 布局系统

15 种布局，通过 `layouts/index.tsx` 的 `LayoutDispatcher` 派发。

| 布局 ID | 组件 | 视觉说明 | 适用场景 |
|---------|------|---------|---------|
| `hero-center` | HeroCenter | 居中单列，标题→下划线→副标题→要点 | hook, problem, cta |
| `split-left-text` | SplitLeftText | 左 1/3 文案 + 右 2/3 素材/图表 | solution, feature |
| `split-right-text` | SplitLeftText `direction="right"` | 右 1/3 文案 + 左 2/3 素材 | solution（镜像） |
| `full-screen-text` | FullScreenText | 全屏极简文字，居中 | hook |
| `card-grid` | CardGrid | 3 列毛玻璃卡片网格 | feature |
| `quote-style` | QuoteStyle | 大引号 + 引用文字 | proof |
| `stat-highlight` | StatHighlight | 大数字 + 说明文字 | proof |
| `media-full` | MediaFull | 全屏视频/图片展示 | showcase |
| `code-display` | CodeDisplay | macOS 终端风格代码窗口 | code showcase |
| `center-focus-video` | CenterFocusVideo | 视频 + 标题覆盖 + 摄像机运镜 | showcase |
| `kinetic-typography` | KineticText | 打字/高亮/删除/替换状态机 | hook |
| `floating-grid` | FloatingGrid | 卡片从随机角度飞入网格 | feature |
| `fly-through` | ZAxisFlyThrough | CSS 3D Z 轴穿梭 | showcase |
| `prompt-input` | PromptInput | AI 对话输入模拟 | showcase |
| `sandwich-text` | SandwichText | 3 层深度夹心（背景→文字→浮动卡片） | showcase |

### LayoutProps 接口

所有布局接收统一 Props：

```typescript
interface LayoutProps {
  title?: string;
  subtitle?: string;
  body?: string;
  points?: string[];
  mediaUrl?: string;
  stats?: string;
  code?: string;
  language?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  codeAnimation?: "type" | "fade" | "scroll";
  style: StyleTokens;
  theme: StyleTemplate;
  motionMap: Record<string, MotionType>;
  showUnderline?: boolean;
  showBullet?: boolean;
  chartData?: BarChartItem[];
  cameraAction?: CameraAction;
  wrapperType?: "glow" | "device-frame";
}
```

### LayoutType → SceneType 映射（timeline-adaptive）

VideoComposer 中的 `layoutTypeToSceneType()`：

```
hero-center, kinetic-typography, full-screen-text → hook
split-left-text, split-right-text                 → solution
card-grid, floating-grid                          → feature
stat-highlight                                    → proof
其余（media-full, code-display, 所有 showcase 类） → showcase
```

---

## 7. 动画系统

### 7.1 动画分层

```
L1 动效层
├── Entrance (入场) — 10 种
│   ├── spring-slide-up     弹簧上滑
│   ├── spring-slide-left   弹簧左滑
│   ├── arc-entrance        弧线入场
│   ├── scale-fade          缩放淡入
│   ├── typewriter          打字机效果
│   ├── reveal-mask         遮罩揭示
│   ├── bounce-in           弹跳入场
│   ├── blur-focus          模糊对焦
│   ├── spring-elastic      弹性进入
│   ├── smooth-scale-up     平滑放大
│   └── staggered-grow      交错增长
│
├── Idle (驻留) — 2 种
│   ├── subtle-float        微浮动
│   └── glow-pulse          辉光脉冲
│
└── Exit (退场) — 4 种
    ├── fade-out             淡出
    ├── slide-out-left       左滑出
    ├── scale-down-out       缩小淡出
    └── blur-out             模糊淡出
```

### 7.2 动画 Hook

| Hook | 阶段 | 用途 |
|------|------|------|
| `useEntrance` | 仅入场 | 大多数布局的元素入场。轻量，API 简洁 |
| `useLifecycle` | 入场+驻留+退场 | 需要 idle/outro 的长驻元素。三阶段状态机 |
| `useBezierAnim` | 入场 | CSS cubic-bezier 曲线动画 |
| `useAudioEnergy` | 始终 | FFT 音频能量提取（用于 AudioReactive wrapper） |

**Hero 专用 Hooks**（HeroCenter 布局独有）：

| Hook | 效果 |
|------|------|
| `useHeroTitle` | 标题入场 + 预期微移位（-5px X, 3px Y, 6帧） |
| `useHeroUnderline` | 下划线从中心向外生长 |
| `useHeroTagline` | 副标题缩放淡入 |
| `useHeroPoints` | 要点列表 staggered 入场，按索引 12 度角度展 |

### 7.3 动效预设

`motions.ts` 定义 `defaultMotionMap`（元素角色 → 默认动效）：

```
title       → arc-entrance
subtitle    → scale-fade
tagline     → scale-fade
headline    → scale-fade
points      → spring-slide-up
body        → spring-slide-up
url         → spring-slide-up
summary     → spring-slide-up
stats       → scale-fade
underline   → none
```

### 7.4 Timing 常量（30fps）

| 常量 | 帧范围 | 说明 |
|------|--------|------|
| `OVERLAY_FADE` | [0, 20] | 背景遮罩淡入 |
| `TITLE_INTRO` | [20, 75] | 标题入场 |
| `UNDERLINE_GROW` | [60, 110] | 下划线生长 |
| `TAGLINE_INTRO` | [80, 130] | 副标题入场 |
| `POINTS_START` | 110 | 第一个要点 |
| `POINTS_STAGGER` | 18 | 要点间隔帧数 |
| `STATS_INTRO` | [60, 110] | 数据入场 |

---

## 8. 过渡系统

### 8.1 架构

使用 `@remotion/transitions` 的 `<TransitionSeries>` 管理场景间过渡。取代了旧的手动 `<Sequence>` overlap。

### 8.2 过渡类型

| 类型 | 默认方向 | Remotion 实现 | 视觉效果 |
|------|---------|--------------|---------|
| `none` | - | 零时长 transition | 硬切 |
| `crossfade` | - | `fade({ shouldFadeOutExitingScene: true })` | 淡入淡出 |
| `slide-in` | left | `slide({ direction: from-left })` | 从方向滑入 |
| `slide-out` | left | `slide({ direction: from-right })` 反向 | 旧场景滑出，新场景反向滑入 |
| `whip-pan` | left | 自定义 `whipPanPresentation` | 方向模糊转场 |

### 8.3 帧计算

- 每个场景有原始 `durationFrames`
- 过渡重叠的帧数从总时长中扣除（`adjustedFrame -= trans.durationFrames`）
- Voiceover 和时间使用调整后的帧位置
- `ChapterProgressBar` 也使用调整后的时间

### 8.4 WhipPan 实现

自定义 transition presentation（`whipPanPresentation.tsx`）：

- 速度在中间点达到峰值（正弦曲线）
- 进入场景从外部滑入（方向反侧）
- 退出场景向外部滑出（方向同侧）
- 最大速度时应用 12px 模糊

---

## 9. 音频系统

### 9.1 三层音频架构

| 层 | 类型 | 生成方式 | 渲染方式 |
|---|------|---------|---------|
| BGM | 背景音乐 | Phase 2.5 media_generation | `Audio` + volume curve |
| Voiceover | 口播 | Phase 2.5 media_generation | 逐场景 `Audio` 段 |
| SFX | 音效 | sfxLibrary 模板匹配 | `SfxPlayer` 组件触发 |

### 9.2 SFX 绑定

11 个动效类型关联音效，在 `motions.ts` 模块加载时自动绑定：

```
arc-entrance       → whoosh-soft.mp3   (0.6)
spring-slide-up    → swoosh-up.mp3     (0.4)
spring-slide-left  → swoosh-up.mp3     (0.4)
scale-fade         → pop-soft.mp3      (0.4)
bounce-in          → bounce.mp3        (0.5)
typewriter         → type-keystroke.mp3 (0.3)
reveal-mask        → swoosh-reveal.mp3  (0.5)
spring-elastic     → bounce.mp3        (0.5)
smooth-scale-up    → pop-soft.mp3      (0.4)
staggered-grow     → swoosh-up.mp3     (0.4)
blur-focus         → whoosh-soft.mp3   (0.6)
```

### 9.3 BGM 音量曲线

`generateBgmCurve()` 根据场景类型和 voiceover 状态生成时间-音量曲线：

- **hook 场景**：从 0 淡入到 0.5（如有 voiceover 则 0.15），1.5 秒
- **有 voiceover 场景**：闪避到 0.15
- **无 voiceover 场景**：保持在 0.5
- **cta 场景**：最后 1.5 秒从 0.3 淡出到 0

### 9.4 Voiceover 对齐

`alignVoiceoverToScene()` 按标点分割脚本，分配到内容槽位：

- 第 1 段 → title/headline（帧 20/30 = 0.67s）
- 第 2 段 → subtitle/tagline（帧 80/30 = 2.67s）
- 第 3 段+ → points（帧 110 + N*18 = ~3.67s）
- 最后一段 → summary（cta 场景，帧 120/30 = 4s）

---

## 10. 样式系统

### 10.1 12 个样式模板

| ID | Family | 配色 | 背景 | 适合 |
|----|--------|------|------|------|
| `dark-purple` | tech | 深紫 | geometric | 通用技术 |
| `light-teal` | business | 浅青 | bokeh | 商业产品 |
| `warm-orange` | playful | 暖橙 | pixel | 创意工具 |
| `dark-red` | business | 深红 | starfield | 性能发布 |
| `glassmorphism` | creative | 毛玻璃 | bokeh | 现代 UI |
| `minimal-bw` | minimal | 黑白 | geometric | 极简 |
| `nature-green` | business | 自然绿 | starfield | 环保/数据 |
| `tech-grid` | tech | 深色网格 | geometric | 技术深度 |
| `warm-yellow` | playful | 暖黄 | pixel | 工具类 |
| `sakura-pink` | creative | 樱花粉 | bokeh | 社区/创意 |
| `neon-blue` | tech | 霓虹蓝 | pixel | 硬核技术 |
| `matte-metal` | minimal | 金属灰 | starfield | 工业/基础设施 |

### 10.2 60-30-10 配色法则

- **60%**：`colors.background` — 主背景色
- **30%**：`colors.surface` — 辅面色（卡片、面板）
- **10%**：`colors.accent` — 强调色（按钮、图表、下划线）

### 10.3 Typography

- 主字体：Inter（200-800 weight）
- 中文字体：Noto Sans SC
- Serif：Playfair Display（dark-red 主题）
- Monospace：JetBrains Mono（code-display、tech-grid）

---

## 11. 文件索引

### Pipeline 层

| 路径 | 用途 |
|------|------|
| `content-generator/skill.md` | Layer 0 AI 操作指南 |
| `content-generator/schema/models.py` | ContentModel Pydantic |
| `content-generator/schema/dedup.py` | DedupDB 去重管理 |
| `content-source-github-trending/skill.md` | 内容源入口 |
| `material-collector/skill.md` | Layer 1 操作指南 |
| `material-collector/schema/models.py` | MaterialManifest Pydantic |
| `material-collector/scripts/recorder.mjs` | Playwright 录制 |
| `material-collector/scripts/allocate.py` | 素材验证编排 |
| `material-collector/scripts/manifest_validator.py` | Manifest 校验 |
| `timeline-composer/skill.md` | Layer 2 操作指南 |
| `timeline-composer/scripts/timeline_composer.py` | 编排引擎（805 行） |
| `video-renderer/skill.md` | Layer 3 操作指南 |
| `post-producer/skill.md` | Layer 4 操作指南 |
| `post-producer/schema/models.py` | 混音模型 |
| `post-producer/scripts/audio_mixer.py` | 音频混音 |
| `post-producer/scripts/verify_output.py` | 输出验证 |
| `pipeline-orchestrator/skill.md` | 编排层操作指南 |
| `media_generation/__main__.py` | 媒体生成 CLI |

### Remotion 核心

| 路径 | 用途 |
|------|------|
| `video-renderer/remotion/src/index.ts` | 入口 |
| `video-renderer/remotion/src/Root.tsx` | Composition 注册 |
| `video-renderer/remotion/src/VideoComposer.tsx` | 主渲染器 |
| `video-renderer/remotion/src/types.ts` | 所有类型定义 |
| `video-renderer/remotion/src/structures.ts` | 5 个结构模板 |
| `video-renderer/remotion/src/styles.ts` | 12 个样式模板 |
| `video-renderer/remotion/src/motions.ts` | 动效预设 + SFX 绑定 |
| `video-renderer/remotion/src/animations.ts` | 动画 timing 常量 |
| `video-renderer/remotion/src/layout.ts` | 排版常量 |
| `video-renderer/remotion/src/tokens.ts` | 样式 token 解析 |
| `video-renderer/remotion/src/fonts.ts` | Google Fonts 加载 |
| `video-renderer/remotion/src/matching.ts` | 匹配引擎 |
| `video-renderer/remotion/src/schemas/VideoConfig.schema.ts` | Zod schema |
| `video-renderer/remotion/src/schemas/validate.ts` | 运行时验证 |

### Remotion 场景

| 路径 | 用途 |
|------|------|
| `scenes/index.tsx` | 场景注册表 |
| `scenes/SceneBase.tsx` | 场景通用外壳 |

### Remotion 布局

| 路径 | 用途 |
|------|------|
| `layouts/index.tsx` | 布局调度器 |
| `layouts/HeroCenter.tsx` | 居中单列 |
| `layouts/SplitLeftText.tsx` | 文案+素材分栏 |
| `layouts/MediaFull.tsx` | 全屏媒体 |
| `layouts/FullScreenText.tsx` | 全屏文字 |
| `layouts/StatHighlight.tsx` | 数据高亮 |
| `layouts/CardGrid.tsx` | 卡片网格 |
| `layouts/QuoteStyle.tsx` | 引用式 |
| `layouts/CodeDisplay.tsx` | 代码展示 |
| `layouts/CenterFocusVideo.tsx` | 视频+运镜 |
| `layouts/KineticText.tsx` | 动态排印 |
| `layouts/FloatingGrid.tsx` | 飞行卡片 |
| `layouts/ZAxisFlyThrough.tsx` | Z 轴穿梭 |
| `layouts/PromptInput.tsx` | AI 对话模拟 |
| `layouts/SandwichText.tsx` | 景深夹心 |

### Remotion 背景

| 路径 | 用途 |
|------|------|
| `backgrounds/index.tsx` | 背景调度器 |
| `backgrounds/Starfield.tsx` | 星场 |
| `backgrounds/BokehCircles.tsx` | 散景光斑 |
| `backgrounds/FluidGradient.tsx` | 流动渐变 |
| `backgrounds/GeometricPatterns.tsx` | 几何图形 |
| `backgrounds/PixelTransition.tsx` | 像素过渡 |

### Remotion Wrappers

| 路径 | 用途 |
|------|------|
| `wrappers/GlowContainer.tsx` | 4 色渐变动画边界辉光 |
| `wrappers/DeviceFrame.tsx` | 3D 设备外壳（MacBook/iPhone） |
| `wrappers/AudioReactive.tsx` | 音频响应式视觉效果 |
| `wrappers/GenerativeReveal.tsx` | AI 生成模拟揭示 |
| `wrappers/LayoutAnimationWrapper.tsx` | 布局级入场动画包裹器 |
| `wrappers/TransitionWrapper.tsx` | 场景入场过渡（被 @remotion/transitions 替代） |
| `wrappers/whipPanPresentation.tsx` | WhipPan transition presentation |

### Remotion Hooks

| 路径 | 用途 |
|------|------|
| `hooks/useEntrance.ts` | 入场动效（通用） |
| `hooks/useLifecycle.ts` | 三阶段生命周期 |
| `hooks/useBezierAnim.ts` | Bezier 曲线动画 |
| `hooks/useAudioEnergy.ts` | 音频能量提取 |
| `hooks/useHeroTitle.ts` | Hero 标题（预期微移位） |
| `hooks/useHeroUnderline.ts` | Hero 下划线生长 |
| `hooks/useHeroTagline.ts` | Hero 副标题 |
| `hooks/useHeroPoints.ts` | Hero 要点列表 |

### Remotion 组件

| 路径 | 用途 |
|------|------|
| `components/SfxPlayer.tsx` | SFX 音频触发 |
| `components/VirtualCamera.tsx` | Ken Burns 运镜 |
| `components/AnimatedBarChart.tsx` | 弹簧动画柱状图 |
| `components/ChapterProgressBar.tsx` | 章节进度条 |
| `components/WhipPanTransition.tsx` | WhipPan 组件（独立版） |

### Remotion 音频

| 路径 | 用途 |
|------|------|
| `audio/sfxLibrary.ts` | 11 个 SFX 条目 |
| `audio/bgmLibrary.ts` | 5 个 BGM 条目 |
| `audio/bgmCurve.ts` | BGM 音量曲线生成 |
| `audio/voiceoverAlign.ts` | Voiceover 对齐 |
| `audio/types.ts` | 音频内部类型 |

---

## 附录 A: 去重系统

`content-generator/schema/dedup.py` 的 `DedupDB` 类管理跨会话去重。

**数据文件**：`content-generator/content/YYYY-repos.md`

每行存储 `- owner/repo`。

**两个写入入口**：

1. `content-source-github-trending` — 推荐前用 `is_duplicate()` 过滤
2. `content-generator` — 生成后调用 `add(full_name).save()` 追加

---

## 附录 B: checkpoint 机制

各阶段状态保存在 `$OUTPUT_DIR/.pipeline_checkpoints.json`：

```json
{
  "phase0": true,
  "phase1": false,
  "phase2": false,
  "phase2_5": false,
  "phase3": false,
  "phase4": false
}
```

每阶段完成后更新。重跑时检查并跳过已完成阶段。

---

## 附录 C: 质量铁律

- **无降级**：所有阶段必须成功，`|| exit 1` 替代 `|| log_warn`
- **最高质量**：Remotion CRF 18, 1080p@30fps
- **Schema 校验**：每阶段输出后立即校验，失败即报错
- **全走代理**：所有网络命令先 `source proxy.sh`
- **TDD 流程**：spec 确认后，按测试驱动开发实施
