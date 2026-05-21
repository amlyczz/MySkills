---
name: video-renderer
description: >
  Remotion 视频渲染层。接收 VideoConfig JSON，使用 React + spring 动画渲染视频片段。
  支持 12 套主题、4 种动态背景、CodeDisplay 代码模板、ChapterProgressBar 进度条组件、
  Ken Burns 图片动效。四级降级链确保渲染成功。
triggers:
  - 渲染视频
  - 生成 intro/outro
  - Remotion 渲染
  - 视频合成
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Video Renderer — Remotion 渲染 Skill

你是一个 Remotion 视频渲染引擎。接收 VideoConfig，输出 MP4 视频片段。

---

## 目录结构

```
video-renderer/
├── skill.md          ← 本文件
├── search_lottie.py  ← Lottie 动画搜索
└── remotion/         ← Remotion 项目
    ├── package.json
    ├── src/
    │   ├── VideoComposer.tsx   ← 统一渲染入口（动态 seg 序列）
    │   ├── Intro.tsx / Outro.tsx
    │   ├── KenBurnsClip.tsx
    │   ├── backgrounds/        ← 4 种动态背景
    │   ├── layouts/            ← 7 种布局模板（含 CodeDisplay）
    │   ├── components/         ← ChapterProgressBar 等
    │   ├── scenes/             ← 场景渲染器
    │   ├── styles.ts / structures.ts / types.ts
    │   └── Root.tsx
    └── public/
```

---

## 安装

```bash
cd video-renderer/remotion
npm install
```

## 开发预览

```bash
cd video-renderer/remotion
npx remotion studio
```

## 渲染

```bash
cd video-renderer/remotion
npx remotion render VideoComposer out/video.mp4 --props='{...}'
```

---

## 模板系统

### 12 套主题配色
`dark-purple` | `sakura-pink` | `neon-blue` | `warm-orange` | `deep-green` |
`matte-metal` | `ocean-cyan` | `tech-grid` | `paper-light` | `ink-dark` |
`corporate-gray` | `retro-warm`

### 4 种动态背景
`starfield` | `bokeh` | `geometric` | `pixel`

### 7 种布局模板
`hero-center` | `split-left-text` | `media-full` | `card-grid` |
`code-display` | `stat-highlight` | `quote-style`

---

## CodeDisplay 模板

```
┌──────────────────────────────────────────┐
│ ● ● ●  install.sh                        │  ← macOS 三色圆点
│  1  │  npx skills add ...                │  ← 行号 + 语法高亮
│  2  │  DenisSergeevitch/agents-...       │  ← 高亮行脉冲发光
│     │                                    │
└──────────────────────────────────────────┘
```

支持 type / fade / scroll 三种入场动画。

## ChapterProgressBar

5 种样式：`minimal-dots` | `labeled-bar` | `gradient-fill` | `segment-blocks` | `timeline-ticks`

---

## 降级链（4 级）

| 级别 | 方式 | 触发条件 |
|------|------|---------|
| L0 | 完整 Remotion（标题+描述+要点+背景） | 正常 |
| L1 | 简化 Remotion（仅标题+URL+背景） | L0 失败 |
| L2 | 纯色 ffmpeg（深蓝 `#1a1a2e`） | L1 失败 |
| L3 | 纯黑 ffmpeg 兜底 | L2 失败 |
