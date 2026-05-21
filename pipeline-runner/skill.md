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

### Phase 2：素材筛选与下载（Material Curation）

**关键原则：先筛选再下载，不是全量下载再筛选。**

recorder.mjs 已经收集了所有候选 URL（imageUrls/videoUrls/codeSnippets/screenshots），在下载前由 code agent 筛选：

1. 读取 recorder.mjs 输出的 `candidate_urls.json`，统计各类型候选数量
2. 根据 `content.json` 的 `script.total_duration_est` 和 segment 内容，确定各类型期望数量：

| 素材类型 | 数量上限 | 选取策略 |
|---------|---------|---------|
| `scroll_video` | 1 | 主录屏，不筛选 |
| `extracted_video` | 3-8 个 | 优先选 README 中与口播关键词匹配的 section 视频；无 section 信息时等距采样 |
| `image` | 3-8 张 | 优先选有 alt_text + 尺寸 > 800px + 非 camo URL |
| `screenshot` | 2-5 张 | 优先选 highlight_score 最高的 |
| `code_snippet` | 2-5 个 | 优先选 Quick Start/API 章节 |

3. **总素材数控制在 8-20 个**，图片和视频比例保持 1:1 到 2:1
4. code agent 将筛选后的 URL 列表传给 recorder.mjs 的下载阶段
5. 下载完成后写入 `material_manifest_curated.json`（仅含选中素材）

**LLM 判断时的元数据参考**（recorder.mjs 已为每个候选采集）：

| 素材类型 | 可用字段 | 用于判断 |
|---------|---------|---------|
| `image` | `alt`, `section`, `caption`, `width`, `height` | alt 含 "architecture/diagram" 的字优先；caption/section 与口播关键词匹配的优先 |
| `video/GIF` | `section`, `description`, `linkText`, `altText`, `width`, `height` | section 在 Demo/Quick Start 的优先；description 作为 LLM 理解视频内容的上下文 |
| `screenshot` | `section`, `description`, `highlight_score` | score 最高的优先；覆盖不同 section |
| `code_snippet` | `section`, `language`, `score` | Quick Start/API section 的优先 |

**LLM 判断原则**：
- 如果某类型候选 > 20 个（如 Lance 的 89 个视频），大胆砍到 8 个以内
- 选取标准不是"最多"而是"最能讲好故事"——与口播内容高度相关的优先
- 覆盖不同 README section 的素材更有叙事价值
- `description`/`caption`/`alt` 字段是 LLM 判断素材内容的关键依据

### Phase 3：时间线编排

```bash
cd timeline-composer
python3 timeline_composer.py \
  "$CONTENT_JSON" \
  "$OUTPUT_DIR/material_manifest_curated.json" \
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
