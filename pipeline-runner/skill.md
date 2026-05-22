---
name: pipeline-runner
description: >
  全流程视频管线执行器。接收 content.json（来自任意内容源）+ 素材清单，
  串联 5 层：素材采集 → 时间线编排 → Remotion 渲染 → 后期合成 → final.mp4。
  内容源无关，任何上游 skill 生成 content.json 后调用此 skill 即可。
triggers:
  - 跑全流程
  - 生成最终视频
  - 合成视频
  - 从内容到视频
  - 执行视频管线
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Pipeline Runner — 全流程视频管线执行器

你是视频管线的执行引擎。接收 `content.json` + 素材 → 输出 `final.mp4`。

## 目录结构

```
pipeline-runner/
├── scripts/
│   └── pipeline.sh    ← 一键编排脚本
└── skill.md
```

## 快速上手

```bash
cd pipeline-runner/scripts
bash pipeline.sh <content.json> <total_duration> \
  --repo-url https://github.com/owner/repo \
  --bg-type starfield \
  --style dark-purple
```

`pipeline.sh` 自动串联 5 层管线。素材来源不感知：自动录制、用户手动、外部提供，统一处理。

---

## 素材三模式

| 模式 | 素材来源 | recorder.mjs | 用户提供 | 产出 |
|------|---------|-------------|---------|------|
| **全自动** | Playwright 录制 | ✅ 运行 | 无 | manifest 全由 recorder 生成 |
| **混合** | 自动 + 手动 | ✅ 运行 | `--manual-image/--manual-video` | manifest 合并自动+手动 |
| **全手动** | 用户提供 | ❌ 跳过 | 全部文件 + 路径列表 | manifest 由 allocate.py --manual-* 构建 |

---

## 前置条件

调用方（上游内容源 skill）必须提供：
- **位置参数 1**：`content.json` 文件路径
- **位置参数 2**：目标视频时长（秒）

可选参数：
- `--repo-url URL`：仓库 URL，有则自动录制，无则跳过
- `--extra-urls "URL1 URL2"`：额外 Demo/文档 URL
- `--manual-image PATH` / `--manual-video PATH`：手动素材（可重复）
- `--bg-type TYPE`：背景类型（starfield/bokeh/geometric/pixel，默认 starfield）
- `--style ID` / `--structure ID`：风格/结构模板 ID（默认 auto）
- `--dry-run`：打印命令但不执行
- `--skip-recording` / `--skip-render`：跳过特定阶段

---

## 5 层执行流程（pipeline.sh 内部）

### Phase 0：内容生成（Layer 0 — content-generator）

方案略——如果上游内容源 skill 已生成 content.json，此步跳过。否则调用 content-generator skill：

```bash
# 输出到 content-generator/content/YYYY-MM-DD/HHmm-{project}-content.json
```

### Phase 1：素材采集（Layer 1 — material-collector）

pipeline.sh 内部调用：

```bash
cd material-collector/scripts
# 全自动/混合模式：先录制
REPO_URL="<url>" TOTAL_DURATION="<duration>" node recorder.mjs

# allocate.py：素材分配+时间分配+生成 video_config.json
python3 allocate.py \
  "$OUTPUT_DIR/material_manifest.json" \
  $TOTAL_DURATION \
  --output-dir "$OUTPUT_DIR" \
  --content-dir "$(dirname content.json)" \
  --bg-type starfield \
  --repo-url "$REPO_URL" \
  [--manual-image /path/to/extra.png ...]
# → material_manifest.json + video_config.json
```

### Phase 2：时间线编排（Layer 2 — timeline-composer）

pipeline.sh 内部调用：

```bash
cd timeline-composer/scripts
python3 timeline_composer.py \
  "$CONTENT_JSON" \
  "$OUTPUT_DIR/material_manifest.json" \
  --output "$OUTPUT_DIR/timeline.json" \
  --total-duration $TOTAL_DURATION \
  --output-video-config "$OUTPUT_DIR/video_config.json" \
  --style-id dark-purple --bg-type starfield
# → timeline.json + timeline.srt + video_config.json
```

### Phase 3：Remotion 渲染（Layer 3 — video-renderer）

```bash
cd video-renderer/remotion
npx remotion render VideoComposer \
  "$OUTPUT_DIR/video.mp4" \
  --props="$OUTPUT_DIR/video_config.json" \
  --codec h264 --crf 18
# → video.mp4
```

### Phase 4：后期合成（Layer 4 — post-producer）

pipeline.sh 内部调用：

```bash
cd post-producer/scripts
python3 verify_output.py "$OUTPUT_DIR" $TOTAL_DURATION

# 混音 + 字幕烧录（需要 voiceover.mp3 + bgm.mp3 + timeline.json）
python3 audio_mixer.py \
  "$OUTPUT_DIR/video.mp4" voiceover.mp3 bgm.mp3 \
  "$OUTPUT_DIR/timeline.json" \
  --output "$OUTPUT_DIR/final.mp4" \
  --srt "$OUTPUT_DIR/timeline.srt"
# → final.mp4
```

### Phase 5：报告

```
最终视频：$OUTPUT_DIR/final.mp4
时长：xx 秒  大小：xx MB
素材统计：scroll x1 / image x3 / code x2 / screenshot x1 / manual xN
结构模板：funnel/timeline/product-showcase
```

---

## 内容源接口

上游只需生成 **1 个文件**：

```
content-generator/content/YYYY-MM-DD/HHmm-{project}-content.json
```

Pipeline 从 `content.json` 自动读取 `repo.url` 决定是否录制。素材可来源任意组合。
