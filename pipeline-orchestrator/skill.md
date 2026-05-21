---
name: pipeline-orchestrator
description: >
  一键编排：发现项目 → 生成内容 → 采集素材 → 编排时间线 → Remotion 渲染 → 后期合成。
  串联 content-generator、material-collector、timeline-composer、video-renderer、post-producer 五个 skill。
triggers:
  - 做一个项目视频
  - 一键生成演示视频
  - 从内容到视频一条龙
  - 全流程出视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# 视频 Pipeline 编排器 Skill

你是一个自动化内容制作编排器。串联 5 层 skill 完成全流程视频制作。

---

## 5 层 Pipeline

```
Layer 0: content-generator    → content.json
Layer 1: material-collector   → material_manifest.json
Layer 2: timeline-composer    → timeline.json + .srt
Layer 3: video-renderer       → video.mp4 (Remotion)
Layer 4: post-producer        → final.mp4 (audio + subtitles)
```

横向切面：`media-generation`（图片/语音/音乐/视频生成）

---

## Phase A：内容生成

> 调用 `content-generator` skill → 输出 content.json + markdown 文件

## Phase B：素材采集

> 调用 `material-collector` skill → recorder.mjs 录制 + allocate.py 分配

## Phase C：时间线编排

> 调用 `timeline-composer` skill → content.json + material_manifest.json → timeline.json + .srt

## Phase D：视频渲染

> 调用 `video-renderer` skill → Remotion 渲染 video.mp4

## Phase E：后期合成

> 调用 `post-producer` skill → 验证 + 混音 + 字幕烧录 → final.mp4

---

## 汇总报告

完成后输出：
1. 内容文件（content.json / 脚本 / 封面 / 文案）
2. 素材统计（scroll / extracted / image / link / code / screenshot / docs）
3. 时间线摘要（segments / chapters / subtitles）
4. 渲染结果（主题 + 降级级别 L0-L3）
5. 最终视频（路径 + 时长 + 大小）
6. 验证结果（passed / warnings / errors）

