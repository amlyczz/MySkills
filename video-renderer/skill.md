---
name: video-renderer
description: >
  Remotion 视频渲染层。接收 video_config.json（来自 Agent 决策），
  使用 React + @remotion/transitions 的 TransitionSeries 渲染场景序列 → video.mp4。
triggers:
  - 渲染视频
  - Remotion 渲染
  - 视频合成
  - 从timeline生成视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Video Renderer — Remotion 渲染 Skill

你是 Remotion 视频渲染引擎。接收 `video_config.json`，输出 `video.mp4`。

**调用方**：pipeline-orchestrator（见 pipeline-orchestrator/skill.md）
**上游**：Agent（读取 timeline-composer 的 timeline.json 后写入 video_config.json）
**下游**：post-producer Phase 4（音频混音 + 字幕烧录）

---

## 目录结构

```
video-renderer/
├── skill.md                 ← 本文件（不要硬编码布局/主题列表，去读源码）
├── scripts/
│   └── render.py            ← Python 渲染封装（供 pipeline.sh 调用）
├── search_lottie.py         ← Lottie 动画搜索
└── remotion/                ← Remotion 项目
    ├── package.json
    ├── src/
    │   ├── VideoComposer.tsx     ← 统一渲染入口（TransitionSeries）
    │   ├── Root.tsx              ← Composition 注册 + duration 计算
    │   ├── scenes/               ← 场景类型（读取 index.tsx sceneRegistry）
    │   ├── layouts/              ← 布局组件（读取 index.tsx LayoutDispatcher switch）
    │   ├── backgrounds/          ← 动态背景（读取 index.tsx BgType）
    │   ├── wrappers/             ← 过渡/动画包装器
    │   ├── audio/                ← SFX / BGM / voiceover
    │   ├── components/           ← SfxPlayer、ChapterProgressBar 等
    │   ├── hooks/                ← useEntrance / useLifecycle
    │   ├── schemas/              ← Zod schema + validate
    │   └── types.ts / styles.ts / structures.ts / themes.ts / motions.ts
    └── public/
        └── audio/ (bgm/ + sfx/)
```

---

## 安装 / 开发预览 / 渲染

```bash
cd video-renderer/remotion
npm install
npx remotion studio
npx remotion render VideoComposer out/video.mp4 --props='{"config":{...}}' --codec h264 --crf 18
```

---

## Pipeline 集成

### 输出目录约定

所有管线产物按信息源分类统一输出：

```
output/{source_category}/{YYYY-MM-DD-HHMM}/{repo_name}/
  ├── video_config.json      ← Agent 决策
  ├── voiceover.mp3           ← media-generator
  ├── bgm.mp3                 ← media-generator
  ├── video.mp4               ← 本层渲染产物
  └── ...（下游 post-producer 产物）
```

`source_category` 为信息来源分类（如 `github`），`date` 为日期（`YYYY-MM-DD`），`repo_name` 为项目标识。

### 渲染前准备

voiceover/bgm 音频需从 `output/` 复制到 `remotion/public/` 供 `staticFile()` 引用：

```bash
cp output/{source}/{date}/{repo}/voiceover.mp3 video-renderer/remotion/public/
cp output/{source}/{date}/{repo}/bgm.mp3       video-renderer/remotion/public/
```

### Pipeline 调用

关键：`--props` 的 video_config.json 必须用 `{config: ...}` 包装以匹配 `VideoComposerProps`：

```bash
# 错误：直接传 video_config.json
npx remotion render VideoComposer out/video.mp4 \
  --props=video_config.json       # ← 不会！

# 正确：{config: ...} 包装
npx remotion render VideoComposer out/video.mp4 \
  --props='{"config": {...}}' --codec h264 --crf 18

# 或用包装脚本：
python3 -c "
import json
with open('video_config.json') as f:
    cfg = json.load(f)
with open('video_config_wrapped.json', 'w') as f:
    json.dump({'config': cfg}, f)
"
npx remotion render VideoComposer out/video.mp4 \
  --props=video_config_wrapped.json --codec h264 --crf 18
```

```bash
# Phase 3 调用
cd video-renderer/scripts
python3 -c "
from render import render_video_composer
render_video_composer('\$OUTPUT_DIR', video_config_dict)
"
```

`video_config.json` 由 Agent 生成（读取 timeline.json + content.json + material_manifest.json 后按场景决策）。

---

## 选择逻辑 — 去读源码，不写死在这里

**原则**：每种选择维度的数据源都在各自的代码文件中。不要记忆列表，去读文件。

### 布局 (layout_id) → 由 Agent 决策

Agent 按场景逐一选择 layoutId + motionMap，直接写入 `video_config.json.sceneConfigs[].layoutId`，不再经过 timeline_composer 的静态映射表。

**VideoComposer 读取 layoutId 后** → `LayoutDispatcher`（`layouts/index.tsx`）的 switch 选择组件。要查看所有可用布局，直接读 `layouts/index.tsx` 的 case 分支。

### 场景类型 (scene type) → 读 `scenes/index.tsx`

`sceneRegistry` 导出 7 种场景组件（hook / problem / solution / feature / showcase / proof / cta）。`_assign_seg_types()`（timeline_composer.py 中）做自动类型分配，Agent 在写 video_config.json 时按 layoutId 决定场景类型。

### 样式/主题 → 读 `styles.ts` + `themes.ts`

`styleTemplates[]`（`styles.ts`）包含所有可用主题 ID。pipeline.sh 的 `--style` 参数直接传递到 `video_config.styleId`。

### 背景 → 读 `backgrounds/index.tsx`

`BgType` 类型定义导出了所有可用背景。pipeline.sh 的 `--bg-type` 参数传递到 `video_config.bgType`。

### 过渡 → 读 `VideoComposer.tsx` `buildTransitionPresentation()`

第 276-303 行：transition config → `@remotion/transitions` presentation 的映射。支持 crossfade / slide-in / slide-out / whip-pan / none。

### 结构 → 读 `structures.ts`

`getStructure() + structureTemplates[]`。`timeline-adaptive` 是 pipeline 默认结构（场景由 sceneConfigs 动态派生），也可选 `funnel` / `product-showcase` 等固定结构。

### 动效 → 读 `motions.ts`

`motionPresets[]` + `defaultMotionMap`。按 `MotionType` 索引的弹簧/插值参数。

### SFX → 读 `audio/sfxLibrary.ts`

`sfxLibrary[]` 按 MotionType 索引音效文件路径。

---

## Agent 素材分配规则

Agent 在写 `video_config.json` 时，必须遵守以下素材分配规则：

### 强制规则（必须遵守）

| 规则 | 说明 | 实现方式 |
|------|------|----------|
| **Logo 首屏** | seg_001 必须展示项目 logo | `content.visual` = logo 文件（如 `lance-logo.webp`）|
| **GitHub 截图** | 至少一个 scene 必须展示 GitHub 仓库页面截图 | `content.visual` = 截图文件，layout = `split-left-text` |
| **代码块展示** | 至少一个 scene 必须展示核心代码，使用 `code-display` layout | `content.code` + `content.language`，layout = `code-display` |
| **全覆盖** | 所有素材类型必须分配到 scene，不能有素材闲置 | 遍历 `material_manifest.json` 中每种 `type`，至少分配一个 scene |
| **无空 scene** | 每个 scene 必须有 `content.visual` 或 `content.code` | 不能出现只填文案没有视觉素材的 scene |

### 素材类型 → 推荐 Layout 映射

| 素材类型 | 推荐 Layout | 说明 |
|----------|-------------|------|
| `logo` | `hero-center` 或 `split-left-text` | 首屏展示 logo + 标题 |
| `demo_gif` | `media-gallery` 或 `media-full` | 多个GIF用 `media-gallery` 网格展示，单个用 `media-full`（支持 DeviceFrame/Glow 包装）|
| `screenshot` | `split-left-text` | 截图配文字说明 |
| `code_snippet` / `source_code` | `code-carousel` 或 `code-display` | 多代码块用 `code-carousel`（DeviceFrame 内Tab轮播），单代码块用 `code-display` |
| `scroll_video` / `link_video` | `media-full`（wrapperType: `device-frame`）| 视频素材在 DeviceFrame 内展示，更高端 |
| `benchmark_chart` | `split-left-text` | 基准图配文字说明 |
| `image` | `split-left-text` | 图片配左侧文案 |
| `social_proof` | `split-left-text` 或 `stat-highlight` | 数据或评价展示 |

### 素材分配顺序

1. **Logo** → seg_001（时间线第一段）
2. **Code snippets** → 口播提到 API/install/quickstart 内容的 segment
3. **GitHub 截图** → seg_007（结尾 CTA 前）或口播提到 repo 信息的 segment
4. **剩余素材** → 按 keyword 相似度分配到未分配给上述类型的 segment
5. 如果 segment 数 < 素材数 → 优先使用 GIF > 视频 > 图片 > 截图

### 检查清单

写入 `video_config.json` 前自查：
- [ ] seg_001 的 `content.visual` 是 logo 文件
- [ ] 至少一个 scene 使用 `layoutId: "code-carousel"` 或 `"code-display"` 且有 `content.code`
- [ ] 至少一个 scene 使用 GitHub screenshot 作为 `content.visual`
- [ ] 检查 `material_manifest.json.materials`，每种 `type` 至少在一个 scene 中出现
- [ ] 每个 scene 的 `content.visual` 或 `content.code` 不为空
- [ ] 所有 `content.visual` 文件路径在 `staticFile()` 可达（已复制到 `public/` 或通过 `staticFile()` 路径引用）
- [ ] voiceover 文本包含至少一个"你"或"用户"视角的收益描述
- [ ] 视频总 duration 不超过 voiceover.mp3 时长（约 +15% 呼吸空间）

---

## 核心架构

### TransitionSeries 场景序列

VideoComposer 使用 `@remotion/transitions` 的 `<TransitionSeries>` 管理场景过渡：

```
TransitionSeries
├── <Sequence scene 0>
├── <Transition>          ← fade/slide/whip-pan
├── <Sequence scene 1>
├── ...
└── <Sequence scene N>
```

- 过渡类型在 `buildTransitionPresentation()` 中映射
- 帧计算自动扣除过渡重叠，voiceover/chapter bar 使用调整后的帧位置
- 自定义 presentation：`whipPanPresentation.tsx`

### SceneBase 场景外壳

三层叠加：动态背景 → 半透明遮罩（overlay）→ 内容布局（LayoutDispatcher）。SceneBase 不处理过渡，过渡由外部的 TransitionSeries 管理。

### 音频系统

- **BGM**：`audio/bgmCurve.ts` 生成 volume curve（有 voiceover 时自动降音），`audio/bgmLibrary.ts` 曲库
- **Voiceover**：voiceover.mp3 是连续 TTS 文件，VideoComposer 中使用**per-scene `<Sequence>` + `<Audio>` 元素**按 `cumulativeOffsetSeconds` 做 `trimBefore` 裁剪。每个 scene 的 entry 必须有足够的 `startOffsetSeconds` 间隔防止音频重叠（`startOffsetSeconds[N] ≥ startOffsetSeconds[N-1] + durationSeconds[N-1]`）。累计偏移超 voiceover.mp3 时长的条目自动静音。
- **SFX**：`audio/sfxLibrary.ts` 按 MotionType 索引，`components/SfxPlayer.tsx` 自动在入场帧触发
- **`staticFile()`**：所有 `<Audio>`/`<Video>` 的 `src` 必须通过 `staticFile()` 引用（文件放在 `public/`）。音视频文件需从 `output/` 复制到 `public/`

### 动画系统

- **useEntrance** — 元素入场动效。被 4+ 个布局 + 3 个 hero hook 使用
- **useLifecycle** — 完整生命周期（idle/intro/outro）
- **LayoutAnimationWrapper** — 可选基础设施，接收 MotionPreset 自动包裹入场动效

---

## 关键约定

- 场景过渡在 **VideoComposer 层面**由 `@remotion/transitions` 管理，SceneBase 不处理过渡
- `timeline-adaptive` 结构从 `sceneConfigs` 动态派生场景列表
- 所有音视频通过 `staticFile()` 引用，`<Video>`/`<Audio>` 从 `@remotion/media` 导入
- **GIF 动画**：必须使用 `<AnimatedImage>`（从 `remotion` 导入）替代 `<Img>`，否则 GIF 在 SSR 时只显示第一帧。GIF 检测：`mediaUrl.endsWith(".gif")`
- 禁止 CSS transitions/animations；使用 `interpolate()`/`spring()` 驱动动画
- `LayoutDispatcher` 使用 exhaustive switch（`assertNever` 兜底），新增布局类型必须加 case
