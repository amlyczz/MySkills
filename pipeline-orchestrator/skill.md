---
name: pipeline-orchestrator
description: >
  全流程管线编排器 — Orchestrator。按 Pipeline 定义编排 Processor
  DAG（有向无环图），不假设任何特定流程。当前支持 github-promo 管线
  (GitHub URL → final.mp4)，也可编排其他流程。
triggers:
  - 跑全流程
  - 生成最终视频
  - 合成视频
  - 从内容到视频
  - 执行视频管线
  - 做一个项目视频
  - 一键生成演示视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Pipeline Orchestrator — Processor 编排引擎

你是管线编排引擎。每个功能单元是一个 **Processor**：

```
Processor = 输入契约 + 处理逻辑 + 输出契约
            (不关心上游是谁、下游是谁)
```

管线由 Pipeline 定义文件描述 DAG 连接关系。Orchestrator 读定义 → 拓扑排序 → 顺序执行。

## 原则

- **无降级**：每个 Processor 都必须成功，失败即报错退出。不要 fallback，不要静默跳过，修复根本原因。
- **顶尖效果**：所有渲染使用最高质量设置（Remotion CRF 18, 1080p@30fps）。
- **契约驱动**：Processor 之间只通过数据契约（`contracts/pipeline_contracts/`）通信，不假设上下游。
- **选择逻辑去读各层源码**：布局/主题/动效等不在本文件硬编码，去读各层源码和 JSON 枚举。
- **全走代理**：所有需要网络的命令（素材采集/音频生成/Remotion 渲染）都必须先 source proxy.sh。
- **断点续跑**：每个 Processor 成功后更新 checkpoint，重跑时跳过已完成步骤。
- **先校验后继续**：每个 Processor 产出后立即做 schema 校验（使用 pipeline-contracts 模型）。

---

## 目录结构

```
pipeline-orchestrator/
├── skill.md              ← 本文件（agent 操作指南）
└── scripts/
    └── proxy.sh          ← 统一网络代理配置

contracts/                ← 数据契约层（所有 Processor 的依赖）
├── pipeline_contracts/   ← Pydantic 模型
├── enums/                ← JSON 枚举文件
└── pyproject.toml

pipelines/                ← Pipeline 定义文件
├── github-promo.json     ← 标准 GitHub 推广管线
├── manual-production.json
└── podcast-clip.json

各 Processor:
  repo-analyzer/      → RepoAnalyzer
  material-collector/     → MaterialCurator
  timeline-composer/      → ScriptTimelineComposer
  media_generator/       → MediaGenerator
  video-renderer/         → VideoRenderer
  post-producer/          → PostProducer
```

---

## 可用 Processor

所有 Processor 在各自目录有 `processor.json` 声明文件，描述输入/输出契约和执行方式。

| Processor | 输入 | 输出 | 执行方式 |
|-----------|------|------|---------|
| **RepoAnalyzer** | GitHub URL | ContentModel (无 script) | skill: repo-analyzer |
| **MaterialCurator** | ContentModel | MaterialManifest | skill: material-collector |
| **ScriptTimelineComposer** | ContentModel + MaterialManifest | TimelineModel + ContentModel(完整) + VideoConfig | skill: timeline-composer |
| **MediaGenerator** | Script | voiceover.mp3 + bgm.mp3 | command: media_generator |
| **VideoRenderer** | VideoConfig + TimelineModel | video.mp4 | command: remotion render |
| **PostProducer** | video.mp4 + audio + timeline | final.mp4 | command: post-producer |

---

## Pipeline 选择

根据输入类型选择 Pipeline 模板：

| 输入 | Pipeline | Processor 序列 |
|------|----------|---------------|
| GitHub 仓库 URL | `pipelines/github-promo.json` | RepoAnalyzer → MaterialCurator → ScriptTimelineComposer → MediaGenerator → VideoRenderer → PostProducer |
| 已有 content + material | `pipelines/manual-production.json` | ScriptTimelineComposer → MediaGenerator → VideoRenderer → PostProducer |
| 纯文案 | `pipelines/podcast-clip.json` | ScriptTimelineComposer → MediaGenerator → PostProducer |

---

## 全局参数（Pipeline 启动时计算）

### OUTPUT_DIR

```bash
OUTPUT_DIR="repo-analyzer/content/YYYY-MM-DD/HHmm-{repo_name}"
CONTENT_JSON="${OUTPUT_DIR}-content.json"
```

各 Processor 产出的统一目录：

| 文件 | 产出 Processor |
|------|---------------|
| `$OUTPUT_DIR/-content.json` | RepoAnalyzer |
| `$OUTPUT_DIR/material_manifest.json` + `materials/` | MaterialCurator |
| `$OUTPUT_DIR/timeline.json` + `.srt` | ScriptTimelineComposer |
| `$OUTPUT_DIR/video_config.json` | ScriptTimelineComposer |
| `$OUTPUT_DIR/voiceover.mp3` + `bgm.mp3` | MediaGenerator |
| `$OUTPUT_DIR/video.mp4` | VideoRenderer |
| `$OUTPUT_DIR/final.mp4` | PostProducer |

### TOTAL_DURATION

从 `content.json.script.total_duration_est` 动态计算，不硬编码：

```
total_seconds = max(60, min(300, ceil(total_duration_est * 1.2 + 30)))
```

最少 60s，最多 300s，口播时长 × 1.2 倍 + 30s 余量。

### Checkpoint

```json
{"RepoAnalyzer": true, "MaterialCurator": false, "ScriptTimelineComposer": false, ...}
```

文件路径：`$OUTPUT_DIR/.pipeline_checkpoints.json`。每个 Processor 完成后更新。

### 代理

```bash
source pipeline-orchestrator/scripts/proxy.sh
```

自动识别平台（mac/WSL）并导出 `http_proxy`/`https_proxy`。

---

## Processor：RepoAnalyzer（GitHub 仓库分析）

调用 `repo-analyzer` skill，输入 repo URL：

1. 基础数据采集（gh api）
2. 源码扫描 + Top-15 文件评分选取
3. 4 维源码分析
4. 生成 repo_insights（ContentModel，不含 script/covers/publish_copy）

**输出**：`$OUTPUT_DIR-content.json`（不含 script 字段）

---

## Processor：MaterialCurator（素材采集）

调用 `material-collector` skill，agent 读 repo_insights → 策划素材需求 → 目标化采集 → 精选输出。

1. 读 `$CONTENT_JSON`，理解项目核心卖点
2. 策划素材需求清单（架构图、benchmark、截图、demo 等）
3. 使用 Playwright 按优先级目标化采集
4. URL 引用支持：远程图片可直接引用，无需下载本地
5. 输出精选 `material_manifest.json`

**输出**：`$OUTPUT_DIR/material_manifest.json` + `materials/`

---

## Processor：ScriptTimelineComposer（脚本创作 + 时间线编排）

Agent 在一个上下文窗口中同时完成脚本创作 + 素材匹配 + 时间线编排。

同时读取 `$CONTENT_JSON`（项目理解）和 `material_manifest.json`（可用素材），基于两者交集创作。

1. 理解项目 + 素材全景，设计叙事结构
2. 为每个场景写口播脚本（预配对视觉呈现方案）
3. 语义素材匹配（论证关系、时序关系、互补关系）
4. 布局与动效设计
5. 过渡设计（基于内容情绪）
6. 章节划分 + 字幕生成
7. 输出 3 个文件

**输出**：
- `$OUTPUT_DIR-content.json`（覆盖写入，含 script/covers/publish_copy）
- `$OUTPUT_DIR/timeline.json` + `.srt`
- `$OUTPUT_DIR/video_config.json`

---

## Processor：MediaGenerator（音频生成）

### 语音

```bash
source pipeline-orchestrator/scripts/proxy.sh
python3 -m media_generator voiceover --from-content "$CONTENT_JSON" --output "$OUTPUT_DIR/voiceover.mp3"
```

### 背景音乐

```bash
python3 -m media_generator bgm --duration $TOTAL_DURATION --output "$OUTPUT_DIR/bgm.mp3"
```

**输出**：`$OUTPUT_DIR/voiceover.mp3` + `$OUTPUT_DIR/bgm.mp3`

---

## Processor：VideoRenderer（Remotion 渲染）

```bash
source pipeline-orchestrator/scripts/proxy.sh
cd video-renderer/remotion

npx remotion render VideoComposer "$OUTPUT_DIR/video.mp4" \
  --props="$OUTPUT_DIR/video_config.json" --codec h264 --crf 18

cd "$OLDPWD"
```

**输出**：`$OUTPUT_DIR/video.mp4`

---

## Processor：PostProducer（后期合成 + 字幕）

```bash
cd post-producer/scripts

python3 verify_output.py "$OUTPUT_DIR" $TOTAL_DURATION
python3 audio_mixer.py \
  "$OUTPUT_DIR/video.mp4" "$OUTPUT_DIR/voiceover.mp3" "$OUTPUT_DIR/bgm.mp3" \
  "$OUTPUT_DIR/timeline.json" --output "$OUTPUT_DIR/final.mp4" \
  --srt "$OUTPUT_DIR/timeline.srt" \
  --bgm-curve "$OUTPUT_DIR/timeline.bgm_curve.json"

cd "$OLDPWD"
```

**输出**：**`$OUTPUT_DIR/final.mp4`** ✅

---

## 智能决策：模板/风格/布局选择

Agent 读 content.json + Remotion 源码 → 自行决策 → 写 video_config.json。

### 选择维度——去读源码，不记在这里

| 维度 | 数据源文件 | 读什么 |
|------|-----------|--------|
| 结构模板 | `video-renderer/remotion/src/structures.ts` | `structureTemplates[]` 场景序列 |
| StyleFamily + 样式 | `video-renderer/remotion/src/styles.ts` + `themes.ts` | `styleTemplates[]` ID + 配色 |
| 布局 | `video-renderer/remotion/src/layouts/index.tsx` | `LayoutDispatcher` switch 全部 case |
| 动效 | `video-renderer/remotion/src/motions.ts` | `motionPresets[]` |
| 过渡 | `video-renderer/remotion/src/VideoComposer.tsx` | `buildTransitionPresentation()` |
| 默认 seg.type→layout 映射 | `contracts/enums/layouts.json` | `scene_type_default_layout` |
| 背景类型 | `video-renderer/remotion/src/backgrounds/index.tsx` | `BgType` |
| SFX 映射 | `video-renderer/remotion/src/audio/sfxLibrary.ts` | `sfxLibrary[]` |

### 选择要点

- **结构**：先读 `material_manifest.json` 检查素材可用性。≥3 个 video/GIF → 展示型；纯数据 → timeline；通用 → funnel。
- **样式**：按语言推断。Rust→冷色极简，Python→tech，JS/TS→创意，Go→深色。
- **布局**：按场景类型选。代码→code-display，屏幕录制→media-full，数据→stat-highlight，对比→split。
- **动效**：元素角色决定。title→bounce-in/spring-elastic，列表→spring-slide-up/staggered-grow，数据→scale-fade。

### 产出：video_config.json

按 Zod schema（`video-renderer/remotion/src/schemas/VideoConfig.schema.ts`）格式输出：

```json
{
  "structureId": "timeline-adaptive",
  "styleId": "<选定样式ID>",
  "bgType": "<选定背景>",
  "sceneConfigs": {
    "<scene_id>": {
      "layoutId": "<布局ID>",
      "motionMap": { "<元素>": "<动效>" },
      "content": { "<字段>": "<值>" },
      "durationSeconds": <秒>,
      "transitionIn": { "type": "crossfade", "durationFrames": 15 },
      "transitionOut": { "type": "crossfade", "durationFrames": 15 }
    }
  },
  "audio": {
    "sfxEnabled": true,
    "voiceoverEnabled": false
  }
}
```

写入 `$OUTPUT_DIR/video_config.json`。

---

## 汇总报告

```bash
# 素材统计
python3 -c "
import json
m = json.load(open('$OUTPUT_DIR/material_manifest.json'))
types = {}
for item in m.get('materials', []):
    t = item.get('type', 'unknown')
    types[t] = types.get(t, 0) + 1
print('Materials: ' + ', '.join(f'{k}={v}' for k, v in sorted(types.items())))
"

# 时间线摘要
python3 -c "
import json
t = json.load(open('$OUTPUT_DIR/timeline.json'))
print(f'Timeline: {len(t.get(\"segments\",[]))} segments, {len(t.get(\"chapters\",[]))} chapters')
"

# 视频元数据
ffprobe -v quiet -print_format json -show_format -show_streams "$OUTPUT_DIR/final.mp4" | \
python3 -c "
import json, sys
d = json.load(sys.stdin)
fmt = d.get('format', {})
print(f'Duration: {float(fmt.get(\"duration\",0)):.1f}s')
print(f'Size: {int(fmt.get(\"size\",0))/1024/1024:.1f}MB')
for s in d.get('streams', []):
    if s.get('codec_type') == 'video':
        print(f'Video: {s.get(\"codec_name\")} {s.get(\"width\")}x{s.get(\"height\")} @ {s.get(\"r_frame_rate\",\"?\")}fps')
    elif s.get('codec_type') == 'audio':
        print(f'Audio: {s.get(\"codec_name\")} {s.get(\"sample_rate\")}Hz')
"
```

---

## 内容源接口

上游只需生成 **1 个文件**：

```
repo-analyzer/content/YYYY-MM-DD/HHmm-{project}-content.json
```

素材可来源任意组合：自动录制、用户手动、外部提供。不同的 Pipeline 模板可接受不同的输入类型（GitHub URL、视频文件路径、纯文本文案等）。
