---
name: video-renderer
description: >
  Remotion 视频渲染层。接收 video_config.json（来自 timeline-composer Phase 2），
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
**上游**：timeline-composer Phase 2（生成 video_config.json）
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

```bash
# pipeline.sh Phase 3 调用
cd video-renderer/scripts
python3 -c "
from render import render_video_composer
render_video_composer('\$OUTPUT_DIR', video_config_dict)
"
```

`video_config.json` 由 Phase 2（timeline-composer）生成。

---

## 选择逻辑 — 去读源码，不写死在这里

**原则**：每种选择维度的数据源都在各自的代码文件中。不要记忆列表，去读文件。

### 布局 (layout_id) → 读 `timeline_composer.py` `SEG_TYPE_LAYOUT`

```
timeline-composer/scripts/timeline_composer.py 第 38-53 行
```
seg type → layout_id + motion 的静态映射表。`to_video_config()`（第 575 行起）将此表展开写入 `video_config.json.sceneConfigs[].layoutId`。

**VideoComposer 读取 layoutId 后** → `LayoutDispatcher`（`layouts/index.tsx`）的 switch 选择组件。要查看所有可用布局，直接读 `layouts/index.tsx` 的 case 分支。

### 场景类型 (scene type) → 读 `scenes/index.tsx`

`sceneRegistry` 导出 7 种场景组件（hook / problem / solution / feature / showcase / proof / cta）。`_assign_seg_types()`（timeline_composer.py 第 429 行）做自动类型分配。

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
- **Voiceover**：per-scene 音频片段，通过 `config.audio.voiceover[]` 配置，使用调整后帧位置播放
- **SFX**：`audio/sfxLibrary.ts` 按 MotionType 索引，`components/SfxPlayer.tsx` 自动在入场帧触发

### 动画系统

- **useEntrance** — 元素入场动效。被 4+ 个布局 + 3 个 hero hook 使用
- **useLifecycle** — 完整生命周期（idle/intro/outro）
- **LayoutAnimationWrapper** — 可选基础设施，接收 MotionPreset 自动包裹入场动效

---

## 关键约定

- 场景过渡在 **VideoComposer 层面**由 `@remotion/transitions` 管理，SceneBase 不处理过渡
- `timeline-adaptive` 结构从 `sceneConfigs` 动态派生场景列表
- 所有音视频通过 `staticFile()` 引用，`<Video>`/`<Audio>` 从 `@remotion/media` 导入
- 禁止 CSS transitions/animations；使用 `interpolate()`/`spring()` 驱动动画
- `LayoutDispatcher` 使用 exhaustive switch（`assertNever` 兜底），新增布局类型必须加 case
