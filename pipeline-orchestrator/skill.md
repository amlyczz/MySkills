---
name: pipeline-orchestrator
description: >
  一键编排：发现项目 → 生成内容 → 采集素材 → 编排时间线 → Remotion 渲染 → 后期合成。
  串联 content-generator、material-collector、timeline-composer、video-renderer、post-producer 五个 skill。
triggers:
  - 做一个项目视频
  - 一键生成演示视频
  - 从内容到视频一条龙
  - 全流程出视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# 视频 Pipeline 编排器 Skill

你是一个自动化内容制作编排器。串联 5 层 skill 完成全流程视频制作。

---

## 5 层 Pipeline

```
Layer 0: content-generator    → content.json
Layer 1: material-collector   → material_manifest.json
Layer 2: timeline-composer    → timeline.json + .srt
Layer 3: video-renderer       → video.mp4 (Remotion)
Layer 4: post-producer        → final.mp4 (audio + subtitles)
```

横向切面：`media-generation`（图片/语音/音乐/视频生成）

---

## Phase A：内容生成

> 调用 `content-generator` skill → 输出 content.json + markdown 文件

## Phase B：素材采集 + 智能匹配

> 调用 `material-collector` skill → recorder.mjs 录制 + allocate.py 分配

### B.1 素材采集

按 material-collector skill 执行录制和素材提取，得到 `manifest_full.json`。

### B.2 内容 → 模板智能匹配 (Code Agent 直接执行)

**你（Code Agent）本身就是 LLM**，不需要外部 API key。读取 content.json 后，你直接分析内容语义、品牌调性、受众，然后选择最优的模板组合，生成 `video_config.json`。

#### 步骤 1：读取输入

```
读取 content.json → 获取: title, tagline, points, language, topics, stats
读取 manifest_full.json → 获取素材清单 (视频数/图片数/录屏数)
```

#### 步骤 2：选择结构模板

根据素材丰富度和内容类型:

| 结构 ID | 名称 | 场景序列 | 最适合 |
|---------|------|---------|--------|
| `funnel` | 漏斗型 | hook→problem→solution→showcase→features→cta | 通用项目、开源仓库 |
| `product-showcase` | 产品展示 | hook→problem→demo→features→proof→cta | Demo 丰富(≥3视频)、可视化产品 |
| `timeline` | 时间线 | hook→origin→milestones→showcase→today→cta | 版本演进、Changelog |
| `performance-launch` | 性能发布 | hook→proof×2→showcase→features→cta | 数据驱动、Benchmark |

**选择规则**: 素材有 ≥3 个视频/GIF → product-showcase。默认 → funnel。

#### 步骤 3：选择样式模板 + 背景

根据编程语言和 topics 匹配风格族，再选具体样式:

| StyleFamily | 样式 ID | 情绪 | 最适合 | 默认背景 |
|------------|---------|------|--------|---------|
| **tech** | `dark-purple`, `tech-grid`, `neon-blue` | dark/tech/code | 开发工具、框架、底层技术 | starfield |
| **business** | `corporate-gray`, `ink-dark`, `paper-light` | professional/clean | 商业产品、B2B、企业级 | geometric |
| **creative** | `sakura-pink`, `ocean-cyan` | creative/design | 创意工具、设计系统、前端 | fluid-gradient |
| **minimal** | `matte-metal` | minimal/stark | CLI 工具、极简项目、底层库 | bokeh |
| **playful** | `warm-orange`, `warm-yellow`, `retro-warm` | warm/energetic | 社区项目、教育工具、游戏 | fluid-gradient |

**选择规则**: Python→tech-grid, Rust→matte-metal, Go→dark-purple, JS/TS→sakura-pink, Ruby→warm-orange, Swift→neon-blue, 其他→dark-purple。Topics 含 AI/ML → tech family。

#### 步骤 4：为每个场景选择布局

| 场景类型 | 主布局 | 备选布局 | 何时用备选 |
|---------|--------|---------|-----------|
| hook | `hero-center` | `kinetic-typography` | 需要动态排印效果时 |
| problem | `hero-center` | `split-left-text`, `quote-style` | 有痛点配图时用 split |
| solution | `split-left-text` | `hero-center`, `card-grid` | 纯文字用 hero-center |
| feature | `card-grid` | `hero-center`, `floating-grid` | ≤3 要点用 hero-center |
| showcase/demo | `media-full` | `center-focus-video`, `fly-through` | 有包装需求用 center-focus |
| proof | `stat-highlight` | `card-grid`, `quote-style` | 多条数据用 card-grid |
| cta | `hero-center` | `prompt-input` | AI/命令行项目用 prompt-input |

可用布局完整列表: `hero-center`, `split-left-text`, `split-right-text`, `full-screen-text`, `card-grid`, `quote-style`, `stat-highlight`, `media-full`, `code-display`, `center-focus-video`, `kinetic-typography`, `floating-grid`, `fly-through`, `prompt-input`, `sandwich-text`

#### 步骤 5：为每个元素选择动效

| 元素角色 | 主动效 | 备选 |
|---------|--------|------|
| title/headline | `arc-entrance` | `bounce-in`, `spring-elastic` |
| subtitle/tagline | `scale-fade` | `smooth-scale-up` |
| points (列表项) | `spring-slide-up` | `staggered-grow` |
| stats (数据) | `scale-fade` | `spring-slide-up` |
| url | `spring-slide-up` | — |

#### 步骤 6：生成 video_config.json

将以上选择组装为如下 JSON，写入 `output/video_config.json`:

```json
{
  "structureId": "funnel",
  "styleId": "tech-grid",
  "bgType": "starfield",
  "sceneConfigs": {
    "hook": {
      "layoutId": "hero-center",
      "motionMap": { "headline": "bounce-in" },
      "content": { "headline": "<从 content.json 取 title>" },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "problem": {
      "layoutId": "hero-center",
      "motionMap": { "title": "arc-entrance", "points": "spring-slide-up" },
      "content": { "title": "Why This Matters", "points": ["<痛点1>", "<痛点2>"] },
      "transitionIn": { "type": "crossfade", "durationFrames": 15 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "solution": {
      "layoutId": "split-left-text",
      "motionMap": { "title": "arc-entrance", "subtitle": "scale-fade" },
      "content": { "title": "<方案标题>", "subtitle": "<方案描述>" },
      "transitionIn": { "type": "crossfade", "durationFrames": 15 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "showcase": {
      "layoutId": "media-full",
      "motionMap": {},
      "content": {},
      "transitionIn": { "type": "crossfade", "durationFrames": 15 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "features": {
      "layoutId": "card-grid",
      "motionMap": { "title": "arc-entrance", "points": "spring-slide-up" },
      "content": { "title": "Key Features", "points": ["<功能1>", "<功能2>", "<功能3>"] },
      "transitionIn": { "type": "crossfade", "durationFrames": 15 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    },
    "cta": {
      "layoutId": "hero-center",
      "motionMap": { "title": "arc-entrance", "stats": "scale-fade" },
      "content": { "title": "<url>", "stats": "<stars/forks>" },
      "transitionIn": { "type": "crossfade", "durationFrames": 15 }
    }
  },
  "audio": {
    "sfxEnabled": true,
    "voiceover": [],
    "voiceoverEnabled": false
  }
}
```

#### 步骤 7：渲染

将 `video_config.json` 传给 Remotion:

```bash
cd video-renderer/remotion
npx remotion render VideoComposer out/video.mp4 --props='{"config": <video_config.json 内容>}'
```

### B.3 降级路径

如果 Code Agent 不想手动匹配（快速模式），可以走 Python 规则匹配:

```bash
# 确定性规则匹配 (不需要 API key，始终可用)
python3 material-collector/scripts/allocate.py manifest_full.json 180 --output-dir ./output

# 或走外部 LLM API 匹配 (需要 DeepSeek/OpenAI key)
python3 material-collector/scripts/allocate.py manifest_full.json 180 --output-dir ./output \
  --use-llm --llm-provider deepseek --llm-api-key $DEEPSEEK_API_KEY
```

### 模板匹配架构

```
内容输入 (content.json + manifest)
    ↓
Code Agent 分析 (你自己)
    ├── 理解内容语义、品牌调性、受众
    ├── 选择结构模板 (4 种)
    ├── 选择样式模板 (12 种，5 个风格族)
    ├── 为每个场景选择布局 (15 种)
    ├── 为每个元素选择动效 (18 种)
    ├── 添加过渡效果 (crossfade 15帧)
    └── 生成完整 video_config.json
    ↓
(可选) Pydantic 校验 (schema_validator.py)
    ↓
Remotion 渲染

## Phase C：时间线编排

> 调用 `timeline-composer` skill → content.json + material_manifest.json → timeline.json + .srt

## Phase D：视频渲染

> 调用 `video-renderer` skill → Remotion 渲染 video.mp4

## Phase E：后期合成

> 调用 `post-producer` skill → 验证 + 混音 + 字幕烧录 → final.mp4

---

## 汇总报告

完成后输出：
1. 内容文件（content.json / 脚本 / 封面 / 文案）
2. 素材统计（scroll / extracted / image / link / code / screenshot / docs）
3. 时间线摘要（segments / chapters / subtitles）
4. 渲染结果（主题 + 降级级别 L0-L3）
5. 最终视频（路径 + 时长 + 大小）
6. 验证结果（passed / warnings / errors）

