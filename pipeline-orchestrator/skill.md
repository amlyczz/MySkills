---
name: pipeline-orchestrator
description: >
  全流程管线编排。读取 pipelines/github-promo.json DAG，
  按拓扑排序顺序执行各 Processor，支持断点续跑。
triggers:
  - 跑全流程
  - 生成最终视频
  - 合成视频
  - 执行视频管线
  - 做一个项目视频
  - 一键生成演示视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Pipeline Orchestrator — 管线编排引擎

你是全流程编排引擎。读取 Pipeline DAG 定义，按拓扑排序执行 Processor。

**原则**：所有架构细节不写在此，去读 `.spec/2026-05-23-全链路逻辑梳理.md`。

---

## 唯一 Pipeline

`pipelines/github-promo.json` — 从 GitHub URL 到 final.mp4 的全流程。

| Processor | 目录 | 驱动方式 | 输入 | 输出 |
|-----------|------|----------|------|------|
| RepoAnalyzer | `repo-analyzer/` | AI Agent | GitHub URL | content.json + material_manifest.json + materials/ |
| ScriptTimelineComposer | `script-timeline-composer/` | AI Agent + 工具 | content.json | timeline.json + video_config.json + .srt + bgm_curve.json |
| MediaGenerator | `media-generator/` | CLI | content.json | voiceover.mp3 + bgm.mp3 |
| VideoRenderer | `video-renderer/remotion/` | CLI | video_config.json | video.mp4 |
| PostProducer | `post-producer/` | CLI | video.mp4 + 音频 + timeline | final.mp4 + final_subtitled.mp4 |

---

## 执行流程

```bash
# 1. 确定输出目录
DATE=$(date +%Y-%m-%d-%H%M)
OUTPUT_DIR="output/github/${DATE}/${REPO_NAME}"
mkdir -p "$OUTPUT_DIR"

# 2. 拓扑排序（按 edges 定义）
#    analyze → compose → audio ─┐
#                    → render ──┤
#                    → post  ←──┘

# 3. 逐个执行 Processor
#    RepoAnalyzer:            Agent 驱动（读 skill.md）
#    ScriptTimelineComposer:  Agent 驱动（读 skill.md）+ timeline_composer.py 工具
#    MediaGenerator:          uv run python -m media_generator voiceover/bgm
#    VideoRenderer:           npx remotion render VideoComposer --props=...
#    PostProducer:            python3 audio_mixer.py ...

# 4. 断点续跑
#    $OUTPUT_DIR/.pipeline_checkpoints.json
```

## 输出目录

```
output/github/{YYYY-MM-DD-HHMM}/{repo_name}/
  ├── content.json              # RepoAnalyzer
  ├── material_manifest.json    # RepoAnalyzer
  ├── materials/                # RepoAnalyzer
  ├── video_config.json         # ScriptTimelineComposer
  ├── timeline.json             # ScriptTimelineComposer
  ├── timeline.srt              # ScriptTimelineComposer
  ├── timeline.bgm_curve.json   # ScriptTimelineComposer
  ├── voiceover.mp3             # MediaGenerator
  ├── bgm.mp3                   # MediaGenerator
  ├── video.mp4                 # VideoRenderer
  ├── final.mp4                 # PostProducer
  └── final_subtitled.mp4       # PostProducer
```

## 断点续跑

- 每个 Processor 成功后在 `$OUTPUT_DIR/.pipeline_checkpoints.json` 写入完成标记
- 失败报错退出，不静默降级
- 失败后修复问题，重新运行同一条命令即可跳过已完成步骤
