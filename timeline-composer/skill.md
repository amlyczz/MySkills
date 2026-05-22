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
| 1 | 口播分句（基于已有 script segments，按需合并/拆分） | `_split_voiceover()` |
| 2 | 关键词提取 | `_extract_keywords()` |
| 3 | 素材匹配（keyword → material scoring） | `_match_materials()` |
| 4 | 合并同源同素材 utterance → segment | `_merge_into_segments()` |
| 5 | 类型分配（hook/problem/solution/...） | `_assign_seg_types()` |
| 6 | 音频编排（BGM/SFX，不含布局） | `_build_layout_and_audio()` |
| 7 | 章节划分 | `_divide_chapters()` |
| 8 | 字幕生成 | `_generate_subtitles()` |

### seg.type → Layout 映射 → Agent 决策

`SEG_TYPE_LAYOUT` 已移除。Agent 负责按场景逐一决策 layoutId / motionMap / 内容 / 素材 / 过渡。

### BGM/SFX 编排 → 读 `_build_layout_and_audio()`

`_build_layout_and_audio()` 按 seg type 分配音频参数（bgm_volume, sfx 等），不再分配布局。

### timeline → VideoConfig → Agent 写入

`to_video_config()` 已移除。Agent 读取 timeline.json + content.json + material_manifest.json 后，自行按场景决策布局/动效/过渡/内容/素材，写入 video_config.json。

---

## 输出目录

所有管线产物按信息源分类输出到 `output/{source_category}/{date}/{repo_name}/`：

```
output/{source_category}/{date}/{repo_name}/
  ├── timeline.json              ← 本层输出
  ├── timeline.srt               ← 本层输出
  ├── timeline.bgm_curve.json    ← 本层输出
  ├── video_config.json          ← Agent 后续写入
  ├── voiceover.mp3              ← media_generator 后续产物
  ├── bgm.mp3                    ← media_generator 后续产物
  └── ...（下游视频/混音产物）
```

`source_category` 为信息来源分类（如 `github`），`date` 为日期（`YYYY-MM-DD`），`repo_name` 为项目标识（如 `1050-byteDance-Lance`）。

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
