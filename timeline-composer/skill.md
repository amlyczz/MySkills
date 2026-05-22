---
name: timeline-composer
description: >
  时间线编排器。输入 content.json + material_manifest.json，输出 timeline.json v2 + .srt。
  实现口播-素材匹配、章节自动划分、BGM/SFX 编排、字幕生成。
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

你是一个视频时间线编排引擎。输入结构化内容 + 素材清单，输出完整的 timeline.json v2。

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
python3 timeline_composer.py content.json material_manifest.json \
  --output timeline.json \
  --total-duration 180 \
  --bgm-track bgm_ambient_tech
```

**输出**：
- `timeline.json` — 时间线（segments + audio + chapters + subtitles）
- `timeline.srt` — 字幕文件

---

## 编排流水线（8 步）

| Step | 功能 |
|------|------|
| 1 | 口播分句（标点拆分 → utterance，4 字/秒估算） |
| 2 | 关键词提取（英文术语 + 功能点 + 领域标签） |
| 3 | 素材匹配（code/section → image/alt → scroll/section → screenshot/score → link/url → 降级 hero-center） |
| 4 | 合并同源同素材 utterance → segment |
| 5 | 类型分配（hook/problem/solution/showcase/code_showcase/features/stats/showcase/cta） |
| 6 | 布局+音频编排（layout_id + motion + bgm_volume + sfx） |
| 7 | 章节划分（从 seg label 生成 chapter markers） |
| 8 | 字幕生成（~15 字/条拆分） |

---

## seg.type → Layout 映射

| seg.type | layout_id | 默认 motion |
|----------|-----------|-------------|
| hook/cta | hero-center | bounce-in / spring-slide-up |
| problem/solution | hero-center / split-left-text | scale-fade / arc-entrance |
| features/changelog | card-grid | spring-slide-up |
| showcase/manual | media-full | fade |
| code_showcase/source_highlight | code-display | type/fade/scroll |
| stats_showcase/comparison | stat-highlight | scale-bounce |
| social_proof | quote-style | fade |

---

## BGM/SFX 编排

| seg.type | BGM | SFX |
|----------|-----|-----|
| hook | 0.3 + fade_in 0.5s | whoosh @ 0.2s |
| cta | 0.3 + fade_out 2.0s | — |
| code_showcase | 0.2 | keypress repeat 0.3s |
| features | 0.25 | pop × N (card entrances) |
| stats_showcase | 0.25 | impact @ 0.3s |
| 其他 | 0.25 | — |
