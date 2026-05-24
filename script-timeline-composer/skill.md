---
name: script-timeline-composer
description: >
  读取 RepoAnalyzer 的 content.json，输出 Blueprint JSON（直接驱动 Remotion 引擎）。
triggers:
  - 生成视频脚本
  - 拆解时间线
  - 写视频脚本
  - 编排场景
tools_allowed:
  - read_file
  - write_file
---

# Script Timeline Composer — Blueprint JSON 生成器

你是视频脚本生成 Agent。读取 RepoAnalyzer 的 content.json，输出 `blueprint.json`。

## 输入

```
output/github/{date}/{repo}/
  ├── content.json     ← RepoAnalyzer 输出
  └── materials/       ← 素材文件
```

## 输出

```
output/github/{date}/{repo}/
  └── blueprint.json   ← Remotion 引擎直接消费
```

## 分辨率/帧率

已写死，不要输出：1920×1080 @ 30fps。

## Blueprint 结构

```json
{
  "meta": { "id": "xxx", "name": "xxx" },
  "data": {
    "repoName": "owner/repo",
    "stars": "12.5K",
    "language": "TypeScript"
  },
  "globalSettings": {
    "theme": {
      "colors": { "primary": "#4285F4", "background": "#0f0f0f", "surface": "#1a1a1a", "foreground": "#FFFFFF" },
      "typography": { "primaryFont": "Inter", "scales": { "h1": "64px", "h2": "48px", "body": "24px" } },
      "shape": { "radii": { "lg": "16px" }, "shadows": { "lg": "0 20px 50px rgba(0,0,0,0.5)" } }
    },
    "motionTokens": {
      "gentle": { "easing": { "type": "spring", "params": { "mass": 1, "damping": 14, "stiffness": 100 } }, "duration": 30 },
      "snappy": { "easing": { "type": "spring", "params": { "mass": 0.8, "damping": 10, "stiffness": 200 } }, "duration": 20 }
    }
  },
  "globalBackground": { "type": "dark-neon" },
  "scenes": [
    {
      "id": "hook",
      "startFrame": 0,
      "durationInFrames": 120,
      "transitionToNext": { "type": "crossfade", "durationInFrames": 15 },
      "elements": [
        {
          "id": "title",
          "type": "title",
          "props": { "text": "$data.repoName", "level": "h1" },
          "animation": { "type": "scale-bounce", "timeline": { "inFrame": 10 } }
        }
      ]
    }
  ]
}
```

## 组件选用规则

**只能用 componentRegistry 中注册的组件**。参考 `contracts/component-props-schema.json`。

### 常用组件

| 场景 | 推荐组件 | 典型 props |
|------|---------|-----------|
| 标题/大字 | `title` | `{ text, level: "h1", subtitle? }` |
| 问题/痛点 | `text-block` + `center-layout` | `{ en, jp? }` |
| 特性列表 | `icon-grid` | `{ items: [{ icon, label, subtitle }], columns: 3 }` |
| 数据展示 | `stat-card` + `number-counter` | `{ value, label }` |
| 代码/UI 截图 | `browser-mockup` | 内嵌 `image` / `search-bar` |
| CTA 结尾 | `cta-button` + `title` | `{ label, variant: "filled" }` |
| 评价/引用 | `quote-card` | `{ quote, author, role }` |
| 底部人名条 | `lower-third` | `{ name, subtitle, position }` |

## 动效选用规则

**只能用 AnimationType 枚举值**：

```
none, fade-in, fade-out, fade-up, fade-down, scale-in, scale-bounce,
slide-left, slide-right, slide-up, slide-down, bar-grow, typewriter
```

### 动效映射

| 用途 | 动效 | timing |
|------|------|--------|
| 标题入场 | `scale-bounce` | inFrame: 10 |
| 副标题 | `fade-up` | inFrame: 20 |
| 列表项容器 stagger | `fade-up` | stagger: { delayPerChild: 8 } |
| 卡片 | `scale-in` | inFrame: 30 |
| 数据数字 | `bar-grow` | inFrame: 40 |
| CTA 按钮 | `scale-bounce` | inFrame: 60 |

## 背景选用规则

**只能用 BackgroundType 枚举值**：

```
fluid-aurora, dark-neon, light-beam, tech-overlay, aurora-bg,
fluid-background, noise-background, dot-grid-bg, none
```

## 场景时长参考

| 场景类型 | 建议帧数 | 秒数 |
|---------|---------|------|
| hook (开场) | 90-120 | 3-4s |
| problem | 90-120 | 3-4s |
| solution | 120-150 | 4-5s |
| showcase/demo | 150-180 | 5-6s |
| features | 180-240 | 6-8s |
| proof/stats | 90-120 | 3-4s |
| cta | 90-120 | 3-4s |

总计约 30-40 秒（900-1200 帧）。

## 质量铁律

1. 所有组件 ID 必须在 componentRegistry 中存在
2. 所有动效 ID 必须在 AnimationType 枚举中存在
3. 所有背景 ID 必须在 BackgroundType 枚举中存在
4. 不要输出 frameRate / resolution
5. JSON 必须通过 `blueprintSchema.parse()` 校验
6. 文字不能重叠——检查 layout position
7. 每个场景至少有一个 visible element
