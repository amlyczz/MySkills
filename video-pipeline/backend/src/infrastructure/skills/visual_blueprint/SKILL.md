---
name: visual-blueprint
description: 为 Remotion 视频渲染生成分层视觉蓝图（Blueprint）。采用三步法——场景骨架、逐场景元素树、程序化组装——以可靠地生成 Blueprint。当你需要创建视觉场景布局、设计 Remotion 蓝图、规划视频过渡效果或构建带动画的元素树时，请使用此 skill。
---

# Visual Blueprint（视觉蓝图）

使用三步法为 Remotion 视频渲染生成分层 `Blueprint`（蓝图），相比一次性生成显著提升可靠性。

## 为什么要分层？

每一步都有聚焦的、更简单的任务：
- Step 2 可以跨场景并行执行
- Step 3 是确定性的（无需 LLM）
- 每一步产出更小、更可靠的输出

## Step 0：模板选择

在生成骨架之前，从模板目录中选择一个视觉模板作为风格锚点：

- 阅读 `references/template-catalog.md` 了解可用模板
- 根据以下因素匹配：项目类型、叙事角度、受众画像、技术深度
- 选定的模板指导所有下游视觉决策（配色、动画、场景类型）
- 将模板选择包含在 `globalSettings.theme` 中

## 三步流程

### Step 1：场景骨架（Scene Skeleton）
决定每个场景的视觉结构：
- **id**：唯一标识符（如 "scene_intro"、"scene_architecture"）
- **type**：可选值："intro"、"centered-statement"、"split-data-chart"、"split-ui-mockup"、"scrolling-graphic"、"outro"、"generic"
- **durationInFrames**：根据脚本片段时长计算（30fps）。例如 5s = 150 帧
- **background**：可选值："dark-neon"、"fluid-aurora"、"light-beam"、"tech-overlay"、"aurora-bg"、"none"
- **transitionToNext**：类型 + durationInFrames（12-20）

同时定义 globalSettings，包含主题（theme）、排版（typography）、音频闪避（audio ducking）和动效令牌（motion tokens）。

### Step 2：逐场景元素树（Per-Scene Element Trees）
为每个场景创建丰富的元素树和动画。

**元素类型（Element Types）：**
- Layout（布局）：center-layout、split-layout、split-media、coverflow-carousel、horizontal-carousel、layered-element、icon-grid
- Content（内容）：title、subtitle-overlay、code-block、data-bar-chart、stat-card、key-point、chapter-title、gradient-text、ai-summary-box、comparison-table
- Decoration（装饰）：cursor、dot-grid-bg、organic-blob、realistic-sphere、ken-burns、badge、connection-line
- Primitives（基础元素）：text、image、video、shape、div、lottie

**动画类型（Animation Types）：** fade-in、fade-out、fade-up、scale-in、scale-bounce、slide-left、slide-right、slide-up、slide-down、typewriter

**关键规则：**
- 所有元素使用 position: "flex-child"，绝不允许使用绝对定位（absolute positioning）
- 每个有动画的元素的 outFrame = scene.durationInFrames - 15
- 列表/网格子元素使用 stagger（错开动画），delayPerChild 为 3-5 帧
- 每个场景创建 2-5 个元素（不要只创建 1 个）
- 入场动画使用 spring 缓动

### Step 3：程序化组装（Programmatic Assembly）
确定性步骤（无需 LLM），添加：
- **Voiceover（旁白）** — 文本 + startFrame + endFrame + volume
- **Subtitles（字幕）** — 按标点符号拆分 token，均匀分配到各帧
- **SFX（音效）** — 过渡音效（whoosh、swoosh、soft_transition）+ scale 动画的 pop 音效

## 提示词模板

- `references/step1-skeleton-system.md` — 场景骨架生成的系统提示词
- `references/step1-skeleton-user.md` — 骨架输入的用户提示词模板
- `references/step2-elements-system.md` — 元素树生成的系统提示词
- `references/step2-elements-user.md` — 逐场景元素输入的用户提示词模板
- `references/template-catalog.md` — 用于风格锚定的视觉模板目录
