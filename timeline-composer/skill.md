---
name: script-timeline-composer
description: >
  AI Agent 主导的场景编排。读取 content.json（含素材绑定），
  为每段口播逐一决策 13 个视觉维度，输出 timeline.json + video_config.json。
triggers:
  - 编排视频
  - 生成时间线
  - 决策场景布局
  - 生成 video_config
  - 生成渲染配置
  - 场景编排
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Script Timeline Composer — AI Agent 场景编排

你是 **ScriptTimelineComposer**。输入 content.json（RepoAnalyzer 已产出 8-15 段口播，每段已绑定 primary_material + material_refs），你对每段 scene 做 13 维视觉决策，输出 timeline.json + video_config.json。

**原则**：所有可选值不写在此，去读源码/配置文件获取最新列表。

---

## 工作流

### Step 1-5：Agent 语义推理（核心）

读取 content.json 后，对每个 segment 逐一决策以下 13 维：

| # | 维度 | 数据来源 | 决策要点 |
|---|------|----------|----------|
| 1 | **seg_type** | `contracts/enums/layouts.json` | 首段→hook，末段→cta；中间→口播内容决定 |
| 2 | **layoutId** | `src/layouts/index.ts` 注册的布局 | seg_type + 素材 + 内容长度 |
| 3 | **motionMap** | Zod MotionType + `contracts/enums/motions.json` | 元素角色 + 节奏 |
| 4 | **bgType** | Zod BgType | seg_type + 前后段不重复 |
| 5 | **wrapperType** | `src/wrappers/` 下容器组件 | 代码→device-frame，截图→glow |
| 6 | **transitionIn** | Zod TransitionType + `contracts/enums/transitions.json` | 与上一场景关系 |
| 7 | **transitionOut** | 同上 | 与下一场景关系 |
| 8 | **content** | content.json segment 字段 | 按布局映射字段 |
| 9 | **staggerOrder** | 元素角色顺序 | 标题先入→主体后入 |
| 10 | **styleId** | `contracts/enums/styles.json` | 整视频 1-3 种 |
| 11 | **durationSeconds** | voiceover 时长 × 1.15~1.3 | 口播 + 呼吸空间 |
| 12 | **bgm_volume** | 0-1 | seg_type + 口播闪避 |
| 13 | **sfx** | `contracts/enums/sfx.json` | seg_type 默认 |

### Step 6-8：确定性工具（调用 timeline_composer.py）

Agent 写入 timeline.json + video_config.json 后，调用工具补充：

```bash
# BGM 音量曲线
python3 timeline_composer.py bgm-curve <timeline.json>

# SRT 字幕
python3 timeline_composer.py subtitles <timeline.json>

# 章节标记
python3 timeline_composer.py chapters <timeline.json>
```

---

## 视觉品质参考

优先选 4-5 星选项（详见 spec §3.3.1）：

| 维度 | S 级（5星） | A 级（4星） |
|------|-------------|-------------|
| layoutId | kinetic-typography, fly-through, media-gallery | code-carousel, hero-center, split-left-text 等 |
| motionMap | spring-elastic, arc-entrance, reveal-mask | staggered-grow, blur-focus, bounce-in |
| bgType | nebula-3d, aurora | particle-field, geometric |
| wrapperType | device-frame(macbook) | perspective-frame |
| transition | whip-pan | slide-in(from-right/left) |
| styleId | gold-luxury, midnight-indigo, sunset-red | dark-purple, tech-cyan, ocean-teal |

---

## 输出

写入统一 `$OUTPUT_DIR/`：
- `timeline.json` → PostProducer (audio_mixer.py)
- `timeline.srt` → PostProducer (burn_subtitles)
- `timeline.bgm_curve.json` → PostProducer (--bgm-curve)
- `video_config.json` → VideoRenderer (Remotion)
