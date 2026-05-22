---
name: pipeline-orchestrator
description: >
  全流程视频管线编排器。AI agent 负责智能决策（内容生成、模板/风格/布局选择），
  机械执行直接调用各层脚本。串联 5 层：内容生成 → 素材采集 → 时间线编排 →
  Remotion 渲染 → 后期合成 → final.mp4。内容源无关。
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

# Pipeline Orchestrator — 全流程视频管线

你是视频管线的编排引擎。**AI agent 负责智能决策，机械执行直接调各层脚本。**

## 原则

- **无降级**：每一阶段都必须成功，失败即报错退出。不要 fallback，不要静默跳过，修复根本原因。
- **顶尖效果**：所有渲染使用最高质量设置（Remotion CRF 18, 1080p@30fps）。
- **分层调用**：各层脚本在各自目录下独立执行，不依赖统一编排脚本。
- **选择逻辑去读各层源码**：布局/主题/动效等不在本文件硬编码，指引见下文。
- **全走代理**：所有需要网络的命令（素材采集/音频生成/Remotion 渲染）都必须先 source proxy.sh。
- **断点续跑**：每阶段成功后更新 checkpoint 文件，重跑时跳过已完成阶段。
- **先校验后继续**：每阶段输出后立即做 schema 校验，失败即报错。

---

## 目录结构

```
pipeline-orchestrator/
├── skill.md              ← 本文件（agent 操作指南）
└── scripts/
    └── proxy.sh          ← 统一网络代理配置
```

---

## 全流程一览

```
                            pipeline-orchestrator (AI agent)
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
  ┌────▼─────┐               ┌──────▼──────┐              ┌──────▼──────┐
  │ AI 决策  │               │  机械执行    │              │  机械执行    │
  │ 阶段     │               │  阶段        │              │  阶段        │
  └──────────┘               └──────────────┘              └──────────────┘
   Phase 0                     Phase 1                       Phase 2.5
   内容生成                     素材采集                       音频生成
   (agent 分析)                 (脚本运行)                     (脚本运行)
       │                           │                           │
       ▼                           ▼                           ▼
  content.json            material_manifest            voiceover.mp3
                                            \               /
                                        ┌───▼─────────────▼───┐
                                        │   Phase 2           │
                                        │   时间线编排 (脚本)   │
                                        │  timeline_composer  │
                                        └─────────────────────┘
                                                  │
                                        timeline.json + video_config.json
                                                  │
                                        ┌─────────▼─────────┐
                                        │   Phase 3          │
                                        │   Remotion (脚本)   │
                                        └───────────────────┘
                                                  │
                                                 video.mp4
                                                  │
                                        ┌─────────▼─────────┐
                                        │   Phase 4          │
                                        │   后期合成 (脚本)    │
                                        └───────────────────┘
                                                  │
                                                 final.mp4
```

---

## Phase 0：内容生成（AI 决策）

调用 `content-generator` skill，输入 repo URL：

1. 基础数据采集（gh api）
2. 源码扫描 + Top-15 文件评分选取
3. 4 维源码分析
4. 生成 content.json（口播脚本 / 文案 / 封面提示词 / 源码洞察）

**输出**：`content-generator/content/YYYY-MM-DD/HHmm-{repo_name}-content.json`

---

## 全局参数（Phase 0 后计算）

读取 content.json 后，计算以下参数供后续所有阶段共享：

### OUTPUT_DIR

```bash
OUTPUT_DIR="content-generator/content/YYYY-MM-DD/HHmm-{repo_name}"
CONTENT_JSON="${OUTPUT_DIR}-content.json"
```

各阶段产出的统一目录：

| 文件 | 产出阶段 |
|------|---------|
| `$OUTPUT_DIR/video_config.json` | AI 决策 → Phase 2 精细化覆盖 |
| `$OUTPUT_DIR/material_manifest.json` | Phase 1 |
| `$OUTPUT_DIR/materials/` | Phase 1 |
| `$OUTPUT_DIR/timeline.json` + `.srt` | Phase 2 |
| `$OUTPUT_DIR/voiceover.mp3` + `bgm.mp3` | Phase 2.5 |
| `$OUTPUT_DIR/video.mp4` | Phase 3 |
| `$OUTPUT_DIR/final.mp4` | Phase 4 |

### TOTAL_DURATION

从 `content.json.script.total_duration_est` 动态计算，不硬编码：

```
total_seconds = max(60, min(300, ceil(total_duration_est * 1.2 + 30)))
```

最少 60s，最多 300s，口播时长 × 1.2 倍 + 30s 余量。

### Checkpoint

```json
{"phase0": true, "phase1": false, "phase2": false, "phase2_5": false, "phase3": false, "phase4": false}
```

文件路径：`$OUTPUT_DIR/.pipeline_checkpoints.json`。每阶段更新，重跑可跳过已完成阶段。

### 代理

```bash
source pipeline-orchestrator/scripts/proxy.sh
```

自动读取 `material-collector/proxy.json`，识别平台（mac/WSL）并导出 `http_proxy`/`https_proxy`。

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
| 默认 seg.type→layout 映射 | `timeline-composer/scripts/timeline_composer.py` | `SEG_TYPE_LAYOUT` |
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

## 机械执行阶段

### 全局脚本前导

```bash
OUTPUT_DIR="content-generator/content/YYYY-MM-DD/HHmm-{repo_name}"
CONTENT_JSON="${OUTPUT_DIR}-content.json"
TOTAL_DURATION=<计算值>

# checkpoint 检查函数
checkpoint_done() {
  grep -q "\"$1\": true" "$OUTPUT_DIR/.pipeline_checkpoints.json" 2>/dev/null
}
update_checkpoint() {
  python3 -c "import json; c=json.load(open('$OUTPUT_DIR/.pipeline_checkpoints.json')); c['$1']=True; json.dump(c, open('$OUTPUT_DIR/.pipeline_checkpoints.json','w'), indent=2)"
}
```

---

### Phase 1：素材采集

```bash
if checkpoint_done "phase1"; then
  echo "Phase 1 already completed, skipping"
else
  source pipeline-orchestrator/scripts/proxy.sh
  cd material-collector/scripts

  REPO_URL="$REPO_URL" TOTAL_DURATION="$TOTAL_DURATION" node recorder.mjs

  python3 allocate.py \
    "$OUTPUT_DIR/material_manifest.json" \
    $TOTAL_DURATION --output-dir "$OUTPUT_DIR" \
    --content-dir "$(dirname $CONTENT_JSON)" \
    --bg-type starfield --repo-url "$REPO_URL"

  python3 -m material_collector.scripts.manifest_validator "$OUTPUT_DIR/material_manifest.json" || exit 1
  cd "$OLDPWD"
  update_checkpoint "phase1"
fi
```

**输出**：`material_manifest.json` + `materials/` 目录

---

### Phase 2：时间线编排

```bash
if checkpoint_done "phase2"; then
  echo "Phase 2 already completed, skipping"
else
  cd timeline-composer/scripts

  python3 timeline_composer.py \
    "$CONTENT_JSON" "$OUTPUT_DIR/material_manifest.json" \
    --output "$OUTPUT_DIR/timeline.json" --total-duration $TOTAL_DURATION \
    --output-video-config "$OUTPUT_DIR/video_config.json" \
    --style-id dark-purple --bg-type starfield

  # 校验
  python3 -c "import json; d=json.load(open('$OUTPUT_DIR/timeline.json')); assert 'segments' in d and 'chapters' in d; print(f'timeline OK: {len(d[\"segments\"])} segments, {len(d[\"chapters\"])} chapters')" || exit 1
  python3 -c "import json; d=json.load(open('$OUTPUT_DIR/video_config.json')); assert 'structureId' in d and 'sceneConfigs' in d and 'styleId' in d and 'bgType' in d; print(f'video_config OK: {len(d[\"sceneConfigs\"])} scenes, style={d[\"styleId\"]}')" || exit 1

  cd "$OLDPWD"
  update_checkpoint "phase2"
fi
```

**输出**：`timeline.json` + `timeline.srt` + `video_config.json`（精细化覆盖）

---

### Phase 2.5：音频生成

```bash
if checkpoint_done "phase2_5"; then
  echo "Phase 2.5 already completed, skipping"
else
  source pipeline-orchestrator/scripts/proxy.sh

  python3 -m media_generation voiceover --from-content "$CONTENT_JSON" --output "$OUTPUT_DIR/voiceover.mp3"
  python3 -m media_generation bgm --duration $TOTAL_DURATION --output "$OUTPUT_DIR/bgm.mp3"

  update_checkpoint "phase2_5"
fi
```

**输出**：`voiceover.mp3` + `bgm.mp3`

---

### Phase 3：Remotion 渲染

```bash
if checkpoint_done "phase3"; then
  echo "Phase 3 already completed, skipping"
else
  source pipeline-orchestrator/scripts/proxy.sh
  cd video-renderer/remotion

  npx remotion render VideoComposer "$OUTPUT_DIR/video.mp4" \
    --props="$OUTPUT_DIR/video_config.json" --codec h264 --crf 18

  cd "$OLDPWD"
  update_checkpoint "phase3"
fi
```

**输出**：`video.mp4`

---

### Phase 4：后期合成 + 字幕

```bash
if checkpoint_done "phase4"; then
  echo "Phase 4 already completed, skipping"
else
  cd post-producer/scripts

  python3 verify_output.py "$OUTPUT_DIR" $TOTAL_DURATION
  python3 audio_mixer.py \
    "$OUTPUT_DIR/video.mp4" "$OUTPUT_DIR/voiceover.mp3" "$OUTPUT_DIR/bgm.mp3" \
    "$OUTPUT_DIR/timeline.json" --output "$OUTPUT_DIR/final.mp4" \
    --srt "$OUTPUT_DIR/timeline.srt"

  cd "$OLDPWD"
  update_checkpoint "phase4"
fi
```

**输出**：**`$OUTPUT_DIR/final.mp4`** ✅

---

## 汇总报告

```bash
# 素材统计
python3 -c "
import json
m = json.load(open('$OUTPUT_DIR/material_manifest.json'))
types = {}
for item in m.get('items', []):
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
content-generator/content/YYYY-MM-DD/HHmm-{project}-content.json
```

素材可来源任意组合：自动录制、用户手动、外部提供。
