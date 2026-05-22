# Agent-Driven 素材匹配与布局选择架构

## 问题陈述

当前管线生成的视频存在三个严重问题：

1. **素材未在视频中展示**：`material_manifest.json` 有 6 种素材类型（benchmark_chart/logo/demo_gif/code_install/code_quickstart/screenshot），但 `video_config.json` 的 sceneConfigs 中 `content.visual` 要么缺失，要么传的是字符串 ID 而非实际文件路径。

2. **布局单一模板丑陋**：7 段场景中 5 段全是 card-grid 布局，且 `content` 只包含截断的口播文字（前 60 字符），原始 content.json 的 title/points/summary 等结构性内容完全丢失。

3. **Agent 决策被脚本覆盖**：pipeline-orchestrator 的 skill.md 要求 agent 基于素材做智能决策，但 `timeline_composer.py` 的 `to_video_config()` 使用静态 `SEG_TYPE_LAYOUT` 字典无条件覆盖 `sceneConfigs`。

## 根因分析

```
当前实际数据流:

content.json + material_manifest.json
    → timeline_composer.py (_score_material 静态规则)
    → to_video_config() 用 SEG_TYPE_LAYOUT 硬编码映射
    → sceneConfigs.layoutId 永远是 card-grid × 5
    → sceneConfigs.content 只含截断的口播文字
    → sceneConfigs.content.visual 是素材 ID 字符串而非文件路径
```

Agent 的决策只影响了 top-level 字段（`styleId`/`bgType`），`sceneConfigs` 完全由静态规则生成。

## 目标架构

```
目标数据流 (Agent-Driven):

Agent 读取:
  - content.json (title/points/summary/script)
  - material_manifest.json (素材类型/路径/评估)
  - 各枚举文件 (layouts/motions/transitions/styles/structures)

Agent 决策:
  - 每段场景用什么布局 (layoutId)
  - 每段场景展示什么素材 (content.visual = 文件路径)
  - 每段场景的原始内容填充 (title/points/summary)
  - 每段场景的动效 (motionMap)
  - 段落间过渡 (transitionIn/transitionOut)

时序分工:
  timeline_composer.py → 只产出 timeline.json (时间线/时长/字幕)
  Agent → 直接写 video_config.json (布局/素材/内容/动效)
```

## 设计方案

### 1. 分离 `timeline_composer.py` 的职责

**改动**：移除 `--output-video-config` CLI 参数和 `to_video_config()` 函数。

`timeline_composer.py` 只做：
- 口播分句（utterance splitting）
- 关键词提取
- 素材粗匹配（产出 material_refs 元数据供 agent 参考）
- 场景合并（merge consecutive same-material utterances）
- 时间线计算（时长/起始时间）
- 字幕生成（SRT）
- 产出 `timeline.json` + `timeline.srt` + `timeline.bgm_curve.json`

不再产出 `video_config.json`。

### 2. Agent 驱动的场景编排流程

Agent 按以下步骤决策并写 `video_config.json`：

**Step 1: 读数据**
- 读 `content.json` — 取 `content.title`, `content.points[]`, `content.summary`, `script.segments[]`
- 读 `material_manifest.json` — 遍历所有 materials，记录 `{id, type, path, metadata}`
- 读 `timeline.json` — 取 segments 的时间线（场景数/时长），确认 `material_refs`

**Step 2: 布局决策（按场景）**

为每段场景依次决策：

| 场景位置 | 推荐素材类型 | 推荐布局 | 内容填充 |
|---------|-------------|---------|---------|
| 首段 (hook) | (无素材) | hero-center / kinetic-typography / full-screen-text | title + tagline 大字展示 |
| 素材匹配段 | 取决于素材类型 | 见下"素材→布局映射" | title + visual + 要点 |
| 功能描述段 | (无素材也可) | card-grid / floating-grid | headline + points |
| 数据段 | benchmark_chart | stat-highlight / card-grid | headline + stats |
| 代码段 | code_snippet / source_code | code-display | headline + code |
| 演示段 | demo_gif / screenshot | media-full / center-focus-video | headline + visual |
| 末段 (cta) | (无素材) | hero-center / sandwich-text | title + url + stats |

**素材→布局映射**（agent 参考，不硬编码）：

| 素材类型 | 建议布局 | 效果 |
|---------|---------|------|
| screenshot (截图) | media-full / center-focus-video | 全屏展示截图 |
| demo_gif (动图) | media-full / center-focus-video | 全屏展示演示 Gif |
| logo (品牌标识) | hero-center / split-left-text | 标题旁展示 Logo |
| benchmark_chart (基准图) | stat-highlight / card-grid | 展示数据看板 |
| code_install (安装代码) | code-display | 终端窗口展示代码 |
| code_quickstart (快速开始) | code-display | 终端窗口展示代码 |
| architecture_diagram (架构图) | media-full / center-focus-video | 全屏展示架构图 |
| scroll_video (滚动录屏) | center-focus-video / media-full | 视频播放 |
| link_video (外部视频) | center-focus-video / media-full | 视频播放 |

**Step 3: 素材路径解析**

`content.visual` 必须填入实际文件路径:
```json
{
  "sceneId": "seg_003",
  "layoutId": "code-display",
  "content": {
    "headline": "安装与快速开始",
    "code": "pip install lance",
    "language": "bash",
    "visual": "materials/code_install.sh"
  }
}
```

从 `material_manifest.json` 的 `path` 字段获取相对路径，以 OUTPUT_DIR 为基准。

**Step 4: 动效决策（motionMap）**

按元素角色选择：

| 元素 | 可选动效（按推荐排序） |
|------|---------------------|
| title/headline | bounce-in, spring-elastic, arc-entrance, blur-focus |
| subtitle | scale-fade, smooth-scale-up, spring-slide-up |
| body/text | spring-slide-up, staggered-grow |
| cards/points | spring-slide-up, staggered-grow, spring-slide-left |
| stats | scale-fade, spring-elastic |
| visual/media | none (素材本身不需要入场动效) |

**Step 5: 过渡决策**

| 场景类型 | 推荐过渡 |
|---------|---------|
| hook → 下一段 | crossfade (15f) |
| 同类型段落之间 | crossfade (15f) 或 none |
| 进入代码段 | slide-in from right (20f) |
| 进入演示段 | whip-pan (20f) |
| 代码段 → 下一段 | slide-out to right (20f) |
| 进入 cta | crossfade (30f, 稍慢) |

### 3. Agent 写 video_config.json 的格式

```json
{
  "generated_by": {
    "phase": "phase2",
    "layer": "agent-matcher",
    "version": "3.0"
  },
  "structureId": "timeline-adaptive",
  "styleId": "<agent 选定>",
  "bgType": "<agent 选定>",
  "sceneConfigs": {
    "seg_001": {
      "layoutId": "hero-center",
      "motionMap": { "title": "bounce-in", "subtitle": "scale-fade" },
      "content": {
        "title": "字节跳动开源 Lance",
        "headline": "3B 激活参数的原生统一多模态模型",
        "summary": "同时处理图像和视频的理解、生成和编辑",
        "visual": "materials/lance-logo.webp"
      },
      "durationSeconds": 18.0,
      "transitionIn": { "type": "crossfade", "durationFrames": 1 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "seg_002": {
      "layoutId": "card-grid",
      "motionMap": { "headline": "bounce-in", "cards": "spring-slide-up" },
      "content": {
        "headline": "典型任务一览",
        "points": [
          "Text-to-Image 生成",
          "Image-to-Image 编辑",
          "Text-to-Video 生成",
          "视频内容理解",
          "多轮一致性编辑"
        ]
      },
      "durationSeconds": 15.0,
      "transitionIn": { "type": "crossfade", "durationFrames": 15 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "seg_003": {
      "layoutId": "code-display",
      "motionMap": { "headline": "bounce-in", "code": "type" },
      "content": {
        "headline": "一行代码安装",
        "code": "pip install lance",
        "language": "bash",
        "visual": "materials/code_install.sh"
      },
      "durationSeconds": 10.0,
      "transitionIn": { "type": "slide-in", "direction": "right", "durationFrames": 20 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "seg_004": {
      "layoutId": "stat-highlight",
      "motionMap": { "headline": "bounce-in", "stats": "scale-fade" },
      "content": {
        "headline": "3B 参数达到 7B 开源模型水平",
        "visual": "materials/benchmark-overview.png"
      },
      "durationSeconds": 12.0,
      "transitionIn": { "type": "crossfade", "durationFrames": 15 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "seg_005": {
      "layoutId": "media-full",
      "motionMap": { "headline": "bounce-in" },
      "content": {
        "headline": "视频生成演示",
        "visual": "materials/t2v-demo-01.gif"
      },
      "durationSeconds": 15.0,
      "transitionIn": { "type": "whip-pan", "direction": "left", "durationFrames": 20 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "seg_006": {
      "layoutId": "media-full",
      "motionMap": { "headline": "bounce-in" },
      "content": {
        "headline": "图片编辑效果",
        "visual": "materials/image-editing-overview.webp"
      },
      "durationSeconds": 12.0,
      "transitionIn": { "type": "crossfade", "durationFrames": 15 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "seg_007": {
      "layoutId": "hero-center",
      "motionMap": { "title": "spring-slide-up" },
      "content": {
        "title": "byteDance/Lance",
        "body": "值得关注和尝试，已经在 GitHub 和 HuggingFace 上开源"
      },
      "durationSeconds": 10.0,
      "transitionIn": { "type": "crossfade", "durationFrames": 30 },
      "transitionOut": { "type": "none", "durationFrames": 0 }
    }
  },
  "audio": {
    "sfxEnabled": true,
    "voiceover": [
      // 从 timeline.json 的 segments[].voiceover.splits 复制
    ],
    "voiceoverEnabled": true
  }
}
```

### 4. timeline_composer.py 的修改

**移除**：
- `--output-video-config` CLI 参数
- `to_video_config()` 函数
- `SEG_TYPE_LAYOUT` 字典

**保留**：
- `_split_voiceover()` — 分句
- `_extract_keywords()` — 关键词提取
- `_match_materials()` — 素材粗匹配（产出 material_refs）
- `_assign_seg_types()` — 场景类型分配（简化版，只标记 type 不涉及布局）
- `_build_layout_and_audio()` — 只保留音频配置（SFX/BGM volume），移除布局赋值
- `_divide_chapters()` — 章节划分
- `_generate_subtitles()` — 字幕生成
- `_generate_bgm_curve()` — BGM 音量曲线
- main() — 只输出 timeline.json (+ .srt + bgm_curve.json)

**新增**：
- `segments[].material_path` — 从 material_manifest 解析的实际文件路径，供 agent 参考

### 5. Agent 编排流程整合

pipeline-orchestrator/skill.md 中 ScriptTimelineComposer 处理器流程改为：

```
1. 运行 timeline_composer.py 产出 timeline.json + .srt
2. Agent 读取 timeline.json 的 segments 列表
3. Agent 读取 content.json + material_manifest.json
4. Agent 为每段场景决策：
   a. 查看该段是否有 material_refs
   b. 如有素材 → 按素材类型选布局 → 写 visual 文件路径
   c. 如无素材但有关键词 → 按口播内容选布局（card-grid/floating-grid）
   d. 从 content.json 取结构化内容填充
5. Agent 写 video_config.json
```

### 6. 时序验证

修改后 pipeline 各阶段时序：

```
Phase 2 (timeline_composer.py):
  content.json + material_manifest.json → timeline.json + timeline.srt + bgm_curve.json

Phase 2.5 (agent matching):
  content.json + material_manifest.json + timeline.json → video_config.json

Phase 2.5 (media_generation):
  content.json → voiceover.mp3 + bgm.mp3

Phase 3 (remotion render):
  video_config.json → video.mp4

Phase 4 (post-producer):
  video.mp4 + voiceover.mp3 + bgm.mp3 + timeline.json → final.mp4
```

## 验收标准

1. **素材可见**：视频中至少 3 段场景展示了实际素材文件（截图/Gif/代码/Logo），非文字占位
2. **布局多样**：7 段场景中至少有 3 种不同布局（如 hero-center + card-grid + code-display + media-full）
3. **内容完整**：每段场景的 headline/body/points 包含有意义的结构化内容，非截断口播文字
4. **素材路径正确**：所有 `content.visual` 值应为指向 `materials/` 目录下文件的路径，能被 `<Img>`/`<Video>` 加载
5. **音频完整**：视频全长=timeline.duration，voiceover 全程可听，BGM 铺底

## 涉及文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `timeline-composer/scripts/timeline_composer.py` | 修改 | 移除 `--output-video-config` 和 `to_video_config()`，简化 `_assign_seg_types()` 和 `_build_layout_and_audio()` |
| `pipeline-orchestrator/skill.md` | 修改 | ScriptTimelineComposer 处理器流程改为两步（脚本跑 timeline + agent 写 video_config） |
| `pipeline-orchestrator/llm_matcher.py` | 参考（暂不接入） | 提供 prompt 设计和枚举目录参考，agent 直接读源码决策更灵活 |

## 不涉及

- Remotion 布局组件本身的视觉修改
- SFX 库/音频混音算法
- content-generator/material-collector 的素材发现逻辑
- pipeline DAG 结构（processor 顺序不变）
