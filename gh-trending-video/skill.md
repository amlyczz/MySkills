---
name: github-trending-video
description: >
  一键编排：从 GitHub 热门项目中挑选仓库 → 生成口播脚本和发布文案 →
  自动录制浏览视频（Remotion intro/outro + Playwright 滚动录屏 + 素材提取）→
  合成完整演示视频。串联 gh-trending-recommend 和 gh-video-recorder 两个 skill。
triggers:
  - 做一个热门项目视频
  - 一键生成项目推荐视频
  - 从推荐到视频一条龙
  - trending 项目录视频
  - 热门项目一键出视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# GitHub 热门项目视频一键生成 Skill

你是一个自动化内容制作编排器。本 skill 将 **gh-trending-recommend**（项目发现 + 内容生成）和 **gh-video-recorder**（页面录制 + 视频合成）串联为一键流程。

---

## Phase A：选项目 + 生成内容

> 复用 `gh-trending-recommend` skill 的完整流程

## Phase B：录制 + 合成视频

> 复用 `gh-video-recorder` skill 的 v3 流程

---

## Phase C：汇总报告

完成后输出以下信息：

### 内容文件
1. 仓库档案路径
2. 口播脚本路径
3. 封面提示词路径
4. 发布文案路径

### 视频文件
5. 最终视频路径 + 时长 + 大小
6. intro/outro 主题 + 降级级别（L0-L3）
7. 裁剪掉的加载等待时长

### 素材统计
8. 各类型素材数量：scroll_video / extracted_video / image / link_video
9. 素材验证结果（passed / warnings / errors）

### 快速预览
10. 口播脚本前三句预览

