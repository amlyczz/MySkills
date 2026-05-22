---
name: timeline-composer
description: >
  时间线编排器。输入 content.json（含 RepoAnalyzer 产出的口播脚本初稿）
  + material_discovery.json，输出 timeline.json v2 + .srt。
  实现口播微调、素材匹配、章节划分、BGM/SFX 编排、字幕生成。
triggers:
  - 生成时间线
  - 编排视频时间线
  - 匹配口播和素材
  - 生成字幕文件
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Timeline Composer — 时间线编排 Skill

你是一个视频时间线编排引擎。输入 content.json（含 RepoAnalyzer 产出的口播脚本初稿）+ 素材评估清单，做编排式微调后输出完整的 timeline.json v2。

**原则**：seg.type → layout 映射、BGM/SFX 编排逻辑不写在此，去读源码。

---

## 目录结构

```
timeline-composer/
├── skill.md                  ← 本文件
├── schema/
│   └── timeline.schema.json
└── scripts/
    └── timeline_composer.py      ← 编排引擎
```

---

## 使用

```bash
cd timeline-composer/scripts
python3 timeline_composer.py content.json material_discovery.json \
  --output timeline.json \
  --total-duration 180 \
  --bgm-track bgm_ambient_tech
```

**输出**：
- `timeline.json` — 时间线（segments + audio + chapters + subtitles）
- `timeline.srt` — 字幕文件

---

## 编排流水线（8 步）

> 脚本初稿已由 RepoAnalyzer 产出（`content.json.script`），这里做编排式微调而非从头创作。

| Step | 功能 | 代码位置 |
|------|------|---------|
| 1 | 口播分句（基于已有 script segments，按需合并/拆分） | `_split_voiceover()` 第 227 行 |
| 2 | 关键词提取 | `_extract_keywords()` 第 263 行 |
| 3 | 素材匹配（keyword → material scoring） | `_match_materials()` 第 297 行 |
| 4 | 合并同源同素材 utterance → segment | `_merge_into_segments()` 第 374 行 |
| 5 | 类型分配（hook/problem/solution/...） | `_assign_seg_types()` 第 429 行 |
| 6 | 布局+音频编排 | `_build_layout_and_audio()` 第 479 行 |
| 7 | 章节划分 | `_divide_chapters()` 第 518 行 |
| 8 | 字幕生成 | `_generate_subtitles()` 第 532 行 |

### seg.type → Layout 映射 → 读 `SEG_TYPE_LAYOUT`

`timeline_composer.py` 第 38-53 行定义 `SEG_TYPE_LAYOUT` 字典，这是 seg type → `{layout_id, motion}` 的唯一数据源。

### BGM/SFX 编排 → 读 `_build_layout_and_audio()`

`timeline_composer.py` 第 479-513 行的 `_build_layout_and_audio()` 方法按 seg type 分配音频参数。

### transition 映射 → 读 `_map_transition()`

`timeline_composer.py` 第 666-683 行将 timeline 过渡枚举映射到 VideoConfig 过渡枚举。

### timeline → VideoConfig → 读 `to_video_config()`

`timeline_composer.py` 第 575-663 行将 timeline.json 转换为 Remotion 可消费的 video_config.json 格式。

---

## 数据输出

### timeline.json v2 结构

```json
{
  "version": "2",
  "global": { "title", "total_duration", "resolution", "fps", "bgm_track" },
  "segments": [{ "id", "type", "label", "time_start", "time_end", "duration",
                  "voiceover", "layout", "style", "audio", "transition_in", "transition_out" }],
  "chapters": [{ "label", "time" }],
  "subtitles": [{ "text", "time_start", "time_end" }]
}
```

完整 schema 见 `schema/timeline.schema.json`。
