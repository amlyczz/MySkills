# Pipeline Orchestrator — 架构梳理与问题分析

## 1. 现状全景

### 1.1 定位

`pipeline-orchestrator` 是整个视频管线的**唯一编排入口**。它替代了原先的 `pipeline-runner`（机械 bash 脚本），采用「AI agent 智能决策 + 机械脚本执行」的混合架构。

### 1.2 5 层管线

```
Phase 0 (AI):   内容生成       → content.json
AI Decision:    模板/风格/布局  → video_config.json   ← 核心 AI 判断环节
Phase 1 (机械):  素材采集       → material_manifest.json
Phase 2 (机械):  时间线编排     → timeline.json + .srt + video_config.json (覆盖)
Phase 2.5 (机械): 音频生成      → voiceover.mp3 + bgm.mp3
Phase 3 (机械):  Remotion 渲染  → video.mp4
Phase 4 (机械):  后期合成+字幕  → final.mp4
```

### 1.3 层间数据契约

| 产出文件 | 来源 | Schema |
|---------|------|--------|
| `content.json` | content-generator skill | `content-generator/schema/models.py` → `ContentModel` |
| `material_manifest.json` | recorder.mjs + allocate.py | `material-collector/schema/models.py` → `MaterialManifest` |
| `video_config.json` | **Agent 决策** → Phase 2 覆盖 | `VideoConfig.schema.ts` → Zod schema |
| `timeline.json` | timeline_composer.py | `timeline.schema.json` → Segment list |
| `timeline.srt` | timeline_composer.py | 标准 SRT 格式 |
| `voiceover.mp3` | `python -m media_generation voiceover` | 音频文件 |
| `bgm.mp3` | `python -m media_generation bgm` | 音频文件 |
| `video.mp4` | `npx remotion render` | 视频文件 |
| `final.mp4` | audio_mixer.py | 最终视频文件 |

---

## 2. 关键设计决策

### 2.1 AI 决策 vs 机械执行的边界

| 环节 | 类型 | 原因 |
|------|------|------|
| 内容生成 (Phase 0) | AI | 需要理解仓库语义、分析源码、编写口播脚本 |
| 模板/风格/布局选择 | AI | 需要理解项目类型、受众、素材丰富度来适配 |
| 素材采集 (Phase 1) | 机械 | Playwright 录制 + Python 验证，确定性操作 |
| 时间线编排 (Phase 2) | 机械 | 口播分句→关键词→素材匹配→分段，规则驱动 |
| 音频生成 (Phase 2.5) | 机械 | TTS + BGM，参数化 CLI 调用 |
| Remotion 渲染 (Phase 3) | 机械 | `npx remotion render`，单向执行 |
| 后期合成 (Phase 4) | 机械 | ffmpeg 混音 + 字幕烧录，确定性操作 |

### 2.2 video_config.json 的双重写入问题

**当前问题**：
1. Agent 决策阶段写入 `video_config.json`（AI 选择 structure/style/layout/motion）
2. Phase 2 `timeline_composer.py` 再次写入 `video_config.json`（根据时间线映射覆盖）

**分析**：这是有意设计——Agent 的 video_config 是初始模板选择，Phase 2 的 `to_video_config()` 将其细化为每个段落的精确配置（含帧精度、transition 映射）。但存在风险：
- Agent 写的配置被全部覆盖，还是只有 sceneConfigs 被覆盖？
- 如果 Agent 设置了 `audio.sfxEnabled = true` 但 timeline_composer 不感知，会不会丢失？

**需要验证** `timeline_composer.py` 的 `to_video_config()` 方法是否保留了 Agent 写入的顶层字段（structureId / styleId / bgType / audio）。

### 2.3 TOTAL_DURATION 的决策归属

**当前问题**：`TOTAL_DURATION=180` 在 skill.md 中硬编码为示例值，但实际调用时谁决定这个值？

- 太短（<60s）：素材可能不够用
- 太长（>300s）：观众注意力下降
- 应该由 Agent 根据 content.json 的 `script.segments` 数量和 `total_duration_est` 动态决定

### 2.4 OUTPUT_DIR 约定

**当前问题**：各阶段通过 `$OUTPUT_DIR` 共享输出路径，但该路径的生成规则未明确定义。

建议统一规则：`content-generator/content/YYYY-MM-DD/HHmm-{repo_name}/` 或其父目录。

---

## 3. 现有问题清单

### P0 — 功能性缺陷

| # | 问题 | 影响 | 建议修复 |
|---|------|------|---------|
| 1 | `video_config.json` 双重写入可能覆盖 Agent 决策 | Agent 的 audio/sfx 配置可能丢失 | 让 `to_video_config()` merge 而非覆盖 |
| 2 | `TOTAL_DURATION` 无动态决策逻辑 | 示例值 180s 硬编码 | Agent 根据 content.json 动态计算 |
| 3 | Phase 0 输出路径与 OUTPUT_DIR 无关联 | agent 需手动拼接路径 | 统一路径约定 |

### P1 — 健壮性

| # | 问题 | 影响 | 建议修复 |
|---|------|------|---------|
| 4 | 各阶段无重试机制 | 网络/临时故障导致全流程失败 | 为 Phase 1 recorder.mjs 添加重试 |
| 5 | 失败后恢复困难 | 中途失败需从头重跑 | 添加 checkpoint 机制，支持断点续跑 |
| 6 | 无素材不足时的降级路径 | 无视频/GIF 素材时结构选择受限 | Agent 选择结构时需检查素材可用性 |

### P2 — 可观测性

| # | 问题 | 影响 | 建议修复 |
|---|------|------|---------|
| 7 | 无中间产物校验 | timeline.json 损坏到 Phase 3 才暴露 | 每阶段输出后做 schema 校验 |
| 8 | 无执行日志 | 无法追溯哪一步失败 | 每阶段记录开始/结束时间+退出码 |
| 9 | final.mp4 无元数据报告 | 不知道最终时长/大小/编码 | 执行 ffprobe 生成报告 |

---

## 4. 数据流时序图

```
Agent                          脚本层
 │                                │
 ├─ Phase 0: content-generator ──►│
 │   (AI 分析 repo)               │
 │◄── content.json ──────────────┤
 │                                │
 ├─ 决策：读 content.json ────────┤
 │   · 分析语言/topics/受众       │
 │   · 选 structure/style/layout  │
 │   · 写 video_config.json       │
 │                                │
 ├─ Phase 1: material-collector ──►│
 │   │  recorder.mjs + allocate   │
 │   │◄── material_manifest.json ─┤
 │   │                            │
 │   ├─ Phase 2: timeline ─────────►│
 │   │  timeline_composer.py       │
 │   │◄── timeline.json + .srt ───┤
 │   │◄── video_config.json (v2) ─┤
 │   │                            │
 │   ├─ Phase 2.5: audio ─────────►│
 │   │  media_generation CLI       │
 │   │◄── voiceover.mp3 + bgm.mp3 ┤
 │   │                            │
 │   ├─ Phase 3: Remotion ─────────►│
 │   │  npx remotion render        │
 │   │◄── video.mp4 ──────────────┤
 │   │                            │
 │   ├─ Phase 4: post-producer ────►│
 │   │  verify + audio_mixer       │
 │   │◄── final.mp4 ──────────────┤
 │   │                            │
 │   └─ 汇总报告 ──────────────────┤
 │      素材统计/时间线/视频信息    │
```

---

## 5. 推荐改进项

### 5.1 动态 TOTAL_DURATION

Agent 应根据 `content.json.script.total_duration_est` 决定总时长，公式：

```
total_seconds = max(60, min(300, script.total_duration_est * 1.2 + 30))
# 最少 60s，最多 300s，口播时长 1.2 倍 + 30s 余量
```

### 5.2 video_config.json merge 策略

`timeline_composer.py` 的 `to_video_config()` 应：

```python
# 伪代码
output = {
    **existing_config,                    # 保留 Agent 写入的顶层字段
    "sceneConfigs": scene_configs,        # 覆盖 sceneConfigs
    "generated_by": {
        "phase": "phase2",
        "layer": "timeline-composer",
        "timestamp": now(),
        "version": "2.0"
    }
}
```

### 5.3 统一 OUTPUT_DIR 规范

```
OUTPUT_DIR = "content-generator/content/YYYY-MM-DD/HHmm-{repo_name}"
```

各阶段直接使用此路径读写，Agent 无需手动拼接。

### 5.4 推荐执行顺序（按场景）

场景 A：**快速生成**（已有 content.json）
→ 跳过 Phase 0，从 AI 决策开始

场景 B：**全自动**（仅需 repo URL）
→ Phase 0 → AI 决策 → Phase 1-4

场景 C：**手动素材**（用户提供素材）
→ 跳过 Phase 1 recorder，仅运行 allocate.py --manual-*

场景 D：**仅后期**（已有 video.mp4 + 音频）
→ 直接 Phase 4

### 5.5 验收标准

- Agent 能根据 content.json 动态决定 TOTAL_DURATION
- video_config.json 跨阶段字段不丢失（audio / styleId / bgType）
- 每阶段有输出校验 + 日志记录
- 失败时可定位到具体阶段和错误原因
- `npx remotion render` 使用 --props 传入的 video_config.json 正确渲染
