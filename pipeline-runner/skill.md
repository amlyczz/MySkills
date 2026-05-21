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

素材来源不感知：自动录制、用户手动、外部提供，统一合并为 `material_manifest.json` v2。

---

## 素材三模式

| 模式 | 素材来源 | recorder.mjs | 用户提供 | 产出 |
|------|---------|-------------|---------|------|
| **全自动** | Playwright 录制 | ✅ 运行 | 无 | manifest 全由 recorder 生成 |
| **混合** | 自动 + 手动 | ✅ 运行 | `--manual-image/--manual-video` | manifest 合并自动+手动 |
| **全手动** | 用户提供 | ❌ 跳过 | 全部文件 + 路径列表 | manifest 由 allocate.py --manual-* 构建 |

无论哪种模式，下游 `timeline-composer` 和 `video-renderer` **只读 `material_manifest.json` v2**，不感知来源。

---

## 前置条件

调用方（上游内容源 skill）必须提供：
- **`CONTENT_JSON`**：`content.json` 文件路径
- **`TOTAL_DURATION`**：目标视频时长（秒），默认 180
- **`REPO_URL`**（可选）：有则自动录制，无则跳过
- **`EXTRA_URLS`**（可选）：额外 Demo/文档 URL
- **`MANUAL_MATERIALS`**（可选）：用户手动素材路径列表

---

## 5 层执行流程

### Phase 0：内容生成（Layer 0 — content-generator）

```
输入：REPO_URL + gh api 数据 + README
输出：content.json
```

```bash
# 调用 content-generator skill 生成 content.json
# 输出到 content-generator/content/YYYY-MM-DD/HHmm-{project}-content.json
```

如果上游内容源 skill 已生成 content.json，此步跳过。

### Phase 1：素材采集 / 合并（Layer 1 — material-collector）

```bash
# 全自动 / 混合模式：运行 recorder
cd material-collector/scripts
export REPO_URL="<url>" TOTAL_DURATION="<duration>"
node recorder.mjs
# → OUTPUT_DIR 自动生成，含 manifest_full.json + material_manifest.json

# 混合 / 全手动模式：注入手动素材
python3 allocate.py \
  "$OUTPUT_DIR/material_manifest.json" \
  $TOTAL_DURATION \
  --output-dir "$OUTPUT_DIR" \
  --repo-url "$REPO_URL" \
  --content-dir "$CONTENT_DIR" \
  --manual-image /path/to/extra.png \
  --manual-video /path/to/demo.mp4
# → 合并自动 + 手动 → material_manifest.json v2
```

### Phase 2：时间线编排

```bash
cd timeline-composer
python3 timeline_composer.py \
  "$CONTENT_JSON" \
  "$OUTPUT_DIR/material_manifest.json" \
  --output "$OUTPUT_DIR/timeline.json" \
  --total-duration $TOTAL_DURATION
# → timeline.json v2 + timeline.srt
```

### Phase 3：Remotion 渲染

```bash
cd video-renderer/remotion
npx remotion render VideoComposer \
  "$OUTPUT_DIR/video.mp4" \
  --props="$OUTPUT_DIR/video_config.json"
# → video.mp4
```

### Phase 4：后期合成

```bash
cd post-producer/scripts
python3 verify_output.py "$OUTPUT_DIR" $TOTAL_DURATION

# 混音（需要 voiceover.mp3 + bgm.mp3）
python3 audio_mixer.py \
  "$OUTPUT_DIR/video.mp4" voiceover.mp3 bgm.mp3 \
  "$OUTPUT_DIR/timeline.json" \
  --output "$OUTPUT_DIR/final.mp4"

# 字幕烧录（需要 timeline.srt）
python3 ../material-collector/scripts/allocate.py --srt "$OUTPUT_DIR/timeline.srt" \
  # ...
```

### Phase 5：报告

```
最终视频：$OUTPUT_DIR/final.mp4
时长：xx 秒  大小：xx MB
素材统计：scroll x1 / image x3 / code x2 / screenshot x1 / manual xN
素材验证：passed / warnings / errors
```

---

## 内容源接口

上游只需生成 **1 个文件**：

```
content-generator/content/YYYY-MM-DD/HHmm-{project}-content.json
```

Pipeline 从 `content.json` 自动读取 `repo.url` 决定是否录制。素材可来源任意组合。
