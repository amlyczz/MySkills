# 项目重构 spec：5 层 Pipeline 瘦身与标准化

## 问题陈述

项目经历了快速迭代，5 层分层架构的边界越来越模糊。核心问题：

1. **allocate.py 是上帝对象**（996 行，6 项不相干职责）：位于 material-collector 但做 intro/outro 渲染、VideoComposer 渲染、视频分割、字幕烧录 — 后三者本应是 video-renderer / post-producer 的事
2. **timeline_composer.py 是断头路**：输出 timeline.json v2 但下游没有任何层消费它 — 实际 pipeline 的入口是 allocate.py 直接 build_video_config()
3. **pipeline-orchestrator 是空壳**：只有 skill.md 描述，无编排脚本
4. **layer 结构不一致**：content-generator 无 scripts/，material-collector 过度膨胀，timeline-composer 有死代码，post-producer 的 verify 引用已删除的 concat_list
5. **Remotion Root.tsx durationInFrames 硬编码 9000**，不随实际时长自适应

## 验收标准

- 各层二进制文件数减少，职责单一化
- `timeline-composer` → `video-renderer` 的数据通路打通（被 Remotion VideoComposer 消费）
- `pipeline-orchestrator` 有实际编排脚本
- 死代码被清理，无"马甲"函数
- 各层 `skill.md + schema/ + scripts/` 结构一致
- `final.mp4` 渲染通路不受影响

---

## 任务拆解

### T1：allocate.py 瘦身 — 剥离非本层职责

**位置**：`material-collector/scripts/allocate.py`

**改动**：

| 剥离的功能 | 目标层 | 迁移方式 |
|-----------|--------|---------|
| `render_intro_outro_with_degradation()` (L0-L3 降级) | 删除 | 死代码 — VideoComposer 已替代 intro/outro |
| `render_video_composer()` | video-renderer | 新建 `video-renderer/scripts/render.py` |
| `split_video_composer()` | 删除 | 不需要 — VideoComposer 一次输出完整 |
| `image_to_video_clip()` | video-renderer | 移入 `video-renderer/scripts/render.py` |
| `burn_subtitles()` | post-producer | 移入 `post-producer/scripts/audio_mixer.py` |
| `speed_remap()` | video-renderer | 移入 `video-renderer/scripts/render.py` |
| Manifest schema/Pydantic 模型 | 保留 | allocate 的核心职责是素材分配&编排 |

**瘦身后的 allocate.py** 职责缩小为：

- 素材清单读取 & schema 验证
- time allocation（按 structure 模板分配各场景时长）
- `build_video_config()` + showcase 自动填充素材
- 调用 `video-renderer/scripts/render.py` render（不再直接 subprocess remotion）
- CLI 入口保持向后兼容

**估算**：996 → ~400 行

---

### T2：打通 timeline-composer → video-renderer 的通路

**问题**：timeline_composer.py 的 timeline.json v2 输出格式与 allocate.py 的 build_video_config()/VideoConfig 格式不兼容。

当前实际路径：
```
content.json → allocate.py → video_config.json → Remotion VideoComposer → video.mp4
```

理想路径：
```
content.json → timeline_composer.py → timeline.json → render.py → video_config.json → Remotion VideoComposer → video.mp4
```

**改动**：

1. **timeline_composer.py 增加 `to_video_config()` 方法**：将 TimelineSegment[] 转换为 `VideoConfig`（SceneConfig 字典），这样 timeline.json 输出可直接被 VideoComposer 消费

2. **删除或重命名 timeline_composer.py 中 unused 的字段**：

| 字段 | 变更 |
|------|------|
| `CodeTemplate` | 删除 — 已被 Remotion code-display layout 替代 |
| `SfxEntry` `AudioConfig` | 删除 — audio 由 post-producer 处理，不是 timeline 关心的事 |
| `voiceover.splits` | 删除 — 未被使用 |
| `material_time_range` | 删除 — 未被使用 |
| `transition_in` `transition_out` | 删除 — 未被使用 |

3. **新增 `TimelineSegment → SceneConfig` 映射**：

```python
def to_video_config(self, timeline: dict, style_id="dark-purple", bg_type="starfield") -> dict:
    segments = timeline.get("segments", [])
    scene_configs = {}
    for seg in segments:
        seg_id = seg.get("id", "")
        layout = seg.get("layout", {})
        scene_configs[seg_id] = {
            "layoutId": layout.get("layout_id", "hero-center"),
            "motionMap": layout.get("motion_map", {}),
            "content": seg.get("voiceover", {}).get("text", ""),
            "durationSeconds": seg.get("duration", 5),
            "primary_material": seg.get("primary_material"),
        }
    return {
        "structureId": "timeline-adaptive",
        "styleId": style_id,
        "bgType": bg_type,
        "sceneConfigs": scene_configs,
        "audio": {"sfxEnabled": False, "voiceover": [], "voiceoverEnabled": False},
    }
```

**额外工作**：在 `structures.ts` 中新增 `"timeline-adaptive"` 结构模板，使其 scenes 正好匹配 timeline_composer 的输出。

**P0 做 simplest thing**：timeline_composer.py 保持原样，增加 `--output-video-config` 参数直接输出 VideoConfig 格式，跳过中间的 timeline.json 间接格式。

---

### T3：pipeline-orchestrator 空心化

**问题**：`pipeline-orchestrator/` 只有 skill.md（9 行实际内容），而 `pipeline-runner/skill.md` （183 行）有更详细的执行流程却被放在不同的文件夹。两者概念重复。

**分析**：

| Skill | 定位 |
|-------|------|
| pipeline-orchestrator | "一键编排" — 高层入口，适合人类 agent 调用 |
| pipeline-runner | "全流程执行器" — 技术实现，适合自动化 shell 脚本 |

**重构方案**：

- `pipeline-orchestrator/skill.md` 简化 → 仅作为入口路由，自动触发 `pipeline-runner` skill
- `pipeline-runner/` 扩展 → 新增 `scripts/pipeline.sh` 作为真正的自动化编排脚本
  - Step 0: 检查前置条件（content.json 存在、素材目录存在、mmx 可调用）
  - Step 1: 素材采集 (recorder.mjs)
  - Step 2: 时间线编排 (timeline_composer.py)
  - Step 3: Remotion 渲染 (render.py)
  - Step 4: 后期合成 (audio_mixer.py)
  - Step 5: 报告输出
  - 每步自动检测失败 → 非关键跳过 + 报告

---

### T4：统一各层目录结构

**目标**：每层遵循 `skill.md + schema/ + scripts/`

| 层 | 当前 | 迁移目标 |
|----|------|---------|
| content-generator | skill.md + schema/ | 不变 — content 由 agent 生成，无需脚本 |
| material-collector | skill.md + schema/ + scripts/ (2 files) | 不变，但 allocate.py 瘦身 |
| timeline-composer | skill.md + schema/ + timeline_composer.py | 移入 scripts/ 目录 |
| video-renderer | skill.md + remotion/ | 新增 scripts/render.py |
| post-producer | skill.md + scripts/ (2 files) | 接收 burn_subtitles 加入 audio_mixer |
| pipeline-orchestrator | skill.md | 引用 pipeline-runner skill |
| pipeline-runner | skill.md | 新增 scripts/pipeline.sh |

---

### T5：修复 Remotion Root.tsx durationInFrames 硬编码

**现状**：Line 162 `durationInFrames={9000}` — 这个值是写死的，不随 `video_config.json` 中的 `sceneConfigs[].durationSeconds` 变化。

**修复方案**（已在之前的 session 中识别为待修复项）：

在 Root.tsx 中新增 calculateMetadata，从 props 的 config 推断实际总帧数：

```typescript
calculateMetadata={async ({ props }) => {
    const p = props as { config: VideoConfig };
    const config = p.config;
    let totalFrames = 0;
    const structure = getStructure(config.structureId);
    if (structure) {
      for (const scene of structure.scenes) {
        const dur = config.sceneConfigs[scene.id]?.durationSeconds || scene.durationSeconds;
        totalFrames += Math.max(dur, 1) * 30;
      }
    } else {
      totalFrames = 9000; // fallback
    }
    return { durationInFrames: totalFrames };
}}
```

---

### T6：清理死代码与不一致引用

| 位置 | 问题 | 操作 |
|------|------|------|
| `post-producer/scripts/verify_output.py` | 检查 intro.mp4 / outro.mp4 / concat_list.txt | 改为检查 `video_composer.mp4` / `video.mp4` / `voiceover.mp3` / `bgm.mp3` |
| `material-collector/skill.md` | 引用 allocate.py 的 `--srt` 参数（已移到 post-producer） | 更新文档 |
| `pyproject.toml` | 依赖只有 pydantic，缺少 timeline-composer 可能需要的新 deps | 不修改，保持最小 |
| `media_generation/skill.md` | 引用 `text.py` capability（文本生成不走 MediaGenerator 原则） | 确认 text.py 是否存在并明确功能 |

---

## 实施顺序

```
Phase 1 (安全重构 — 不改行为):
T5 → T6 → T4 (目录迁移)

Phase 2 (功能重构 — 改变行为):
T1 (allocate瘦身) → T2 (timeline连通) → T3 (orchestrator 脚本化)
```

Phase 1 可不验证最终视频通路不变。Phase 2 每步结束后需用已有 content.json + 素材跑一次 pipeline 验证 final.mp4 生成正常。

## 风险

- **allocate.py 瘦身可能遗漏隐藏副作用**：`render_video_composer()` 的 cwd 是 REMOTION_DIR，迁移后需确保路径正确
- **timeline.json → VideoConfig 映射可能有字段对不齐**：需检查所有 Remotion 场景组件期望的 props key
- **verify_output.py 更新后可能误报**：如果旧的 output 目录还在，应跳过不存在文件的检查（容忍性降级）
