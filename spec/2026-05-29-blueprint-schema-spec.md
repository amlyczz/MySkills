# Blueprint Schema Spec

> 视频蓝图（Blueprint）是 Remotion 渲染引擎的核心数据结构。LLM 生成此 JSON 后，引擎直接消费渲染视频。

**源码参考**：
- TypeScript 类型：`frontend/remotion/src/engine/types.ts`
- Zod 校验：`frontend/remotion/src/contracts/blueprint-schema.ts`
- Python 实体：`backend/src/domain/visual_blueprint/`
- 动效实现：`frontend/remotion/src/engine/applyAnimation.ts`

---

## 顶层结构

```typescript
interface Blueprint {
  meta: BlueprintMeta;           // 必填 - 蓝图元信息
  data?: Record<string, unknown>; // 可选 - 共享数据，场景通过 $data.xxx 引用
  variables?: BlueprintVariables; // 可选 - 模板变量，驱动 UI 表单
  globalSettings: GlobalSettings; // 必填(有默认) - 全局主题/动效/音频
  globalBackground?: SceneBackground; // 可选 - 全局背景
  globalOverlays?: ElementConfig[];   // 可选 - 全局叠加层
  scenes: SceneConfig[];          // 必填 - 场景列表
}
```

---

## meta - 蓝图元信息

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | Y | 蓝图唯一标识，如 `"tech-launch"` |
| `name` | string | Y | 蓝图显示名称 |
| `description` | string | - | 蓝图描述 |

---

## globalSettings - 全局设置

### theme - 主题

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `colors` | Record<string, string> | Y | 颜色令牌（见下方详细说明） |
| `typography` | object | Y | 字体配置 |

**colors 详细说明**：

颜色令牌是语义化的颜色别名，组件通过令牌名引用颜色而非硬编码色值，实现主题统一管理。

**数据结构**：`Record<string, string>`，key = 令牌名（如 `"primary"`），value = 颜色值（如 `"#6366F1"`）。组件通过 `theme.colors.primary` 引用，渲染时解析为实际色值。

```json
{
  "primary": "#6366F1",
  "secondary": "#8B5CF6",
  "accent": "#F59E0B",
  "bg": "#0F0F1A",
  "background": "#0F0F1A",
  "surface": "#1E1E2E",
  "foreground": "#FFFFFF",
  "text": "#FFFFFF",
  "textMuted": "#9CA3AF"
}
```

| Token | 语义 | 典型用途 | 暗色主题示例 | 亮色主题示例 |
|-------|------|----------|-------------|-------------|
| `primary` | 主色调 / 品牌色 | CTA 按钮、选中状态、重点高亮、进度条 | `#6366F1`（靛蓝） | `#4F46E5` |
| `secondary` | 辅助色 | 次要按钮、标签、辅助图标 | `#8B5CF6`（紫） | `#7C3AED` |
| `accent` | 强调色 | 需要吸引注意力的小元素：徽章、角标、跳转提示 | `#F59E0B`（琥珀） | `#D97706` |
| `bg` / `background` | 最底层背景 | 场景底色、页面背景（`bg` 和 `background` 通常设为同一值） | `#0F0F1A`（深蓝黑） | `#FFFFFF` |
| `surface` | 中间层背景 | 卡片、面板、弹窗等浮层底色，比 `bg` 略亮（暗色）或略暗（亮色） | `#1E1E2E` | `#F3F4F6` |
| `foreground` | 前景色 | 与 `background` 形成对比的前景元素（图标、分割线等） | `#FFFFFF` | `#111827` |
| `text` | 主文字色 | 正文、标题等主要可读文字 | `#FFFFFF` | `#111827` |
| `textMuted` | 次要文字色 | 说明文字、时间戳、占位符等弱化文字 | `#9CA3AF`（灰） | `#6B7280` |

**层级关系**：`bg`（最底）→ `surface`（浮层）→ `foreground`（前景）→ `text`（文字）

> LLM 生成时只需提供上述常用 key 即可。组件内部通过 `theme.colors.xxx` 引用，如 `theme.colors.primary`。如果某个组件需要额外的颜色（如 `error`、`success`、`warning`），也可扩展添加，但上述 8 个是基础必需项。
| `typography.primaryFont` | string | Y | 主字体，默认 `"Inter"` |
| `typography.fallbackFont` | string | - | 备选字体 |
| `typography.scales` | Record<string, string> | Y | 字号令牌。默认值：`{ xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", 2xl: "1.5rem", 3xl: "1.875rem", 4xl: "2.25rem" }` |
| `shape` | object | - | 形状配置 |
| `shape.radii` | Record<string, string> | - | 圆角令牌。如 `{ md: "8px", lg: "16px" }` |
| `shape.shadows` | Record<string, string> | - | 阴影令牌。如 `{ md: "0 4px 6px rgba(0,0,0,0.3)" }` |

### safeArea - 安全区域

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `top` | number | Y | 上边距 |
| `right` | number | Y | 右边距 |
| `bottom` | number | Y | 下边距 |
| `left` | number | Y | 左边距 |
| `unit` | `"px"` \| `"%"` | Y | 单位 |

### motionTokens - 动效令牌

命名的缓动预设，`AnimationConfig.easing` 可通过字符串引用。

**数据结构**：`Record<string, MotionToken>`
- **key** = 自定义预设名称（如 `"bouncy"`、`"smooth"`）
- **value** = `MotionToken` 对象，包含缓动曲线配置和可选的默认帧数

组件在 `animation.easing` 中通过预设名引用，而非每次都写完整缓动参数：
```json
{
  "animation": {
    "type": "fade-up",
    "easing": "bouncy",
    "timeline": { "inFrame": 0, "duration": 30 }
  }
}
```

```json
{
  "bouncy": { "easing": { "type": "spring", "params": { "mass": 1.2, "damping": 12, "stiffness": 120 } } },
  "smooth": { "easing": { "type": "bezier", "bezier": [0.25, 0.1, 0.25, 1.0] }, "duration": 30 }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `easing` | object | Y | 缓动配置（见下方 Easing 类型） |
| `duration` | number | - | 默认持续帧数（引用此预设时若 `timeline.duration` 未指定，则自动使用此值） |

**Easing 类型**（三选一）：

| type | 额外字段 | 说明 |
|------|----------|------|
| `"spring"` | `params: { mass, damping, stiffness }` | 弹簧物理。mass=质量, damping=阻尼, stiffness=刚度。默认值：`{ mass: 1, damping: 14, stiffness: 100 }` |
| `"bezier"` | `bezier: [x1, y1, x2, y2]` | 贝塞尔曲线，4 个 0-1 浮点数。默认值：`[0.25, 0.1, 0.25, 1.0]` |
| `"linear"` | 无 | 线性匀速 |

> 若未指定 `easing`，默认使用 spring（mass=1, damping=14, stiffness=100）。`scale-bounce` 和 `stamp-drop` 有各自固定的弹簧参数，不受全局默认影响。

### audio - 全局音频

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bgmUrl` | string | - | 背景音乐 URL |
| `bgmVolume` | number (0-1) | - | BGM 音量 |
| `sfx` | Record<string, string> | - | 音效库。key=音效名, value=URL |
| `ducking` | object | - | 自动闪避（VO 播放时降低 BGM） |
| `ducking.enabled` | boolean | Y | 是否启用 |
| `ducking.duckToVolume` | number (0-1) | - | 闪避目标音量 |
| `ducking.fadeDurationFrames` | number | - | 渐变帧数 |

---

## scenes - 场景列表

每个场景是一段独立的视频片段，引擎按顺序拼接渲染。

### SceneConfig

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | string | Y | - | 场景唯一 ID |
| `type` | string | - | `"generic"` | 场景类型。可选：`generic`, `intro`, `centered-statement`, `split-data-chart`, `split-ui-mockup`, `scrolling-graphic`, `outro` |
| `startFrame` | number | - | `0` | 场景起始帧（相对于全局时间轴） |
| `durationInFrames` | number | Y | `90` | 场景持续帧数。30fps 下 90 帧 = 3 秒 |
| `narrativePhase` | string | - | - | 叙事阶段：`hook`, `context`, `deep_dive`, `climax`, `resolution` |
| `description` | string | - | - | 场景描述（供 LLM/人类参考） |
| `background` | SceneBackground \| null | - | - | 场景背景，null 表示透明 |
| `style` | CSSProperties | - | - | 场景容器的 CSS 样式覆盖 |
| `transitionToNext` | TransitionToNext | - | - | 到下一个场景的过渡效果 |
| `elements` | ElementConfig[] | - | - | 场景内的元素列表 |
| `props` | Record | - | - | 场景级属性，传递给场景组件 |
| `voiceover` | VoiceoverConfig | - | - | 旁白配置 |
| `subtitles` | SubtitleConfig | - | - | 字幕配置 |
| `sfx` | SfxTrigger[] | - | - | 音效触发器列表 |

### SceneBackground

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | string | - | `"none"` | 背景类型：`fluid-aurora`, `dark-neon`, `light-beam`, `tech-overlay`, `aurora-bg`, `fluid-background`, `noise-background`, `dot-grid-bg`, `none` |
| `props` | Record | - | - | 背景组件的属性 |

### TransitionToNext

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | string | Y | `"crossfade"` | 过渡类型：`none`, `crossfade`, `soft-replace`, `spatial-shift`, `stack-pop`, `diagonal-wipe` |
| `durationInFrames` | number | - | `15` | 过渡持续帧数 |
| `props` | Record | - | - | 过渡组件的属性 |

---

## elements - 元素列表

元素是场景内的可视组件，支持递归嵌套。

### ElementConfig

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | Y | 元素唯一 ID |
| `type` | string | Y | 组件类型（见 ComponentType 枚举） |
| `props` | Record | - | 传递给组件的属性（各组件不同） |
| `layout` | ElementLayout | - | 布局定位 |
| `style` | CSSProperties | - | 原始 CSS 覆盖 |
| `animation` | AnimationConfig | - | 入场/循环动画 |
| `condition` | string | - | 条件渲染表达式，如 `"data.showCard === true"` |
| `children` | ElementConfig[] | - | 子元素（递归） |

### ComponentType 枚举

**布局类**：
- `browser-mockup` - 浏览器模拟框
- `device-frame` - 设备框架
- `split-layout` - 左右分栏
- `center-layout` - 居中布局
- `pricing-stack` - 定价卡堆叠
- `floating-card` - 3D 悬浮卡片
- `coverflow-carousel` - 封面流轮播
- `horizontal-carousel` - 水平轮播
- `layered-element` - 分层元素
- `pop-up-book-base` - 立体书效果
- `icon-grid` - 图标网格
- `split-media` - 媒体分栏

**内容类**：
- `search-bar` - 搜索栏
- `ai-summary-box` - AI 摘要框
- `pricing-card` - 定价卡
- `geometric-card` - 几何卡片
- `data-bar-chart` - 数据柱状图
- `animated-bar` - 动画条形图
- `video-card` - 视频卡
- `product-card` - 产品卡
- `agent-card` - Agent 卡
- `ui-card` - UI 卡
- `minimal-card` - 极简卡
- `mock-ui-card` - 模拟 UI 卡
- `experiment-card` - 实验卡
- `cover-card` - 封面卡
- `album-card` - 专辑卡
- `mobile-list-item` - 移动端列表项
- `mobile-nav-bar` - 移动端导航栏
- `mobile-status-bar` - 移动端状态栏
- `filter-pills` - 筛选胶囊标签
- `progress-ring` - 环形进度条
- `title` - 标题
- `cta-button` - CTA 按钮
- `stat-card` - 数据统计卡
- `quote-card` - 引用卡
- `callout-box` - 提示框
- `step-indicator` - 步骤指示器
- `comparison-table` - 对比表
- `code-block` - 代码块
- `key-point` - 关键点
- `chapter-title` - 章节标题
- `gradient-text` - 渐变文字
- `luxury-card` - 奢华卡
- `reveal-mask` - 揭示遮罩
- `stagger-reveal` - 交错揭示
- `glass-panel` / `glass-card` - 毛玻璃效果
- `chip-card` - 标签卡
- `branch-flow` - 分支流程图
- `animated-counter` - 动画计数器

**文字类**：
- `animated-text` - 动画文字
- `text-block` - 文本块
- `word-swap-headline` - 词替换标题
- `typewriter` - 打字机效果
- `prompt-input` - 提示输入框
- `typing-input` - 打字输入框
- `subtitle-overlay` - 字幕叠加
- `lower-third` - 下三分之一标题

**装饰类**：
- `cursor` - 光标
- `decoration-overlay` - 装饰叠加层
- `dot-grid-bg` - 点阵背景（装饰型）
- `graphic-overlay` - 图形叠加层
- `organic-blob` - 有机 blob
- `realistic-sphere` - 写实球体
- `generating-pill` - 生成中胶囊
- `connection-line` - 连接线
- `scene-canvas` - 场景画布
- `diagonal-wipe-transition` - 对角擦除过渡
- `badge` - 徽章
- `ken-burns` - Ken Burns 效果
- `cinematic-bars` - 电影遮幅
- `mesh-gradient-bg` - 网格渐变背景
- `film-grain` - 胶片颗粒
- `radial-glow` - 径向发光
- `particle-field` - 粒子场
- `icon-badge` - 图标徽章
- `blur-fade-text` - 模糊淡入文字
- `glow-bar-chart` - 发光柱状图
- `typing-message` - 打字消息
- `canvas-gradient-bg` - 画布渐变背景

**基础媒体**：
- `text` - 纯文本
- `image` - 图片
- `video` - 视频
- `shape` - 形状
- `div` - 容器
- `lottie` - Lottie 动画

### ElementLayout

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `position` | `"absolute"` \| `"relative"` \| `"flex-child"` | - | 定位方式 |
| `x` | number \| string | - | X 坐标。数字=px，字符串如 `"50%"` |
| `y` | number \| string | - | Y 坐标 |
| `width` | number \| string | - | 宽度 |
| `height` | number \| string | - | 高度 |
| `zIndex` | number | - | 层叠顺序 |
| `scale` | number | - | 静态缩放（不参与动画） |
| `rotation` | number | - | 旋转角度（度） |
| `opacity` | number (0-1) | - | 不透明度 |

---

## animation - 动画配置

### AnimationConfig

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | AnimationType | - | `"fade-in"` | 动画类型 |
| `timeline` | object | Y | - | 时间轴控制 |
| `timeline.inFrame` | number | Y | `0` | 动画开始帧（相对于场景） |
| `timeline.outFrame` | number | - | - | 动画结束帧 |
| `timeline.duration` | number | - | - | 动画持续帧数 |
| `startState` | Record<string, number> | - | - | 起始状态值，如 `{ opacity: 0, translateY: 40 }` |
| `endState` | Record<string, number> | - | - | 结束状态值 |
| `easing` | Easing \| string | - | spring(默认) | 缓动。字符串=引用 motionTokens 名 |
| `stagger` | StaggerConfig | - | - | 子元素交错配置 |
| `loop` | LoopConfig | - | - | 入场后的循环动画 |

### AnimationType 枚举

| 类型 | 效果说明 | startState 默认值 | endState 默认值 |
|------|----------|-------------------|-----------------|
| `none` | 无动画 | - | - |
| `fade-in` | 淡入 | opacity: 0 | opacity: 1 |
| `fade-out` | 淡出 | opacity: 1 | opacity: 0 |
| `fade-up` | 上移淡入 | translateY: 40, opacity: 0 | translateY: 0, opacity: 1 |
| `fade-down` | 下移淡入 | translateY: -40, opacity: 0 | translateY: 0, opacity: 1 |
| `scale-in` | 缩放进入 | scale: 0.8, opacity: 0 | scale: 1, opacity: 1 |
| `scale-bounce` | 弹跳缩放（弹簧） | scale: 0.85, translateY: 60 | scale: 1, translateY: 0 |
| `slide-left` | 从右滑入 | translateX: 100, opacity: 0 | translateX: 0, opacity: 1 |
| `slide-right` | 从左滑入 | translateX: -100, opacity: 0 | translateX: 0, opacity: 1 |
| `slide-up` | 从下滑入 | translateY: 80, opacity: 0 | translateY: 0, opacity: 1 |
| `slide-down` | 从上滑入 | translateY: -80, opacity: 0 | translateY: 0, opacity: 1 |
| `bar-grow` | 条形增长（scaleX 0→1，从左，使用 cubic-out 缓动而非 spring） | - | - |
| `typewriter` | 打字机效果 | - | - |
| `reveal` | 裁剪揭示（clip-path 从左到右） | - | - |
| `stamp-drop` | 印章落下（过冲缩放 2.4→0.92→1 + 旋转 -8°→0°） | - | - |
| `brush-strike` | 笔触横扫（scaleX 0→1，从左） | - | - |
| `blur-in` | 模糊进入（blur 20px→0） | - | - |

> `startState`/`endState` 可覆盖默认值。如 `fade-up` 默认 translateY 40→0，可通过 `startState: { translateY: 100 }` 改为 100→0。

### StaggerConfig

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `delayPerChild` | number | - | `3` | 每个子元素延迟帧数 |
| `direction` | `"forward"` \| `"reverse"` | - | - | 交错方向 |

### LoopConfig

入场动画完成后持续循环的效果。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | string | Y | `"pulse"` | 循环类型 |
| `durationInFrames` | number | Y | `30` | 一个周期的帧数 |
| `amplitude` | number (0-1) | - | `0.05` | 振幅 |

**LoopType 枚举**：

| 类型 | Remotion 实现 | 效果 |
|------|:---:|------|
| `pulse` | ✅ | 脉冲缩放（scale 1±amplitude） |
| `float` | ✅ | 漂浮上下（translateY ±amplitude*20px） |
| `spin` | ✅ | 旋转（360°/周期） |
| `wiggle` | ✅ | 摇摆（rotate ±amplitude*10°） |
| `flicker` | ❌ | 闪烁（Python 端扩展，Remotion 无实现） |
| `bounce` | ❌ | 弹跳（Python 端扩展，Remotion 无实现） |
| `shake` | ❌ | 抖动（Python 端扩展，Remotion 无实现） |

> ⚠️ `flicker`/`bounce`/`shake` 仅在 Python Pydantic 校验中可用，Remotion 引擎（`applyAnimation.ts`）的 `loopStyle()` 函数只处理 `pulse`/`float`/`spin`/`wiggle` 四种，其他类型会返回空对象。LLM 生成建议只用前 4 种。

---

## voiceover - 旁白

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `audioUrl` | string | Y | 音频文件 URL |
| `text` | string | Y | 旁白文本内容 |
| `startFrame` | number | Y | 开始播放帧 |
| `endFrame` | number | - | 结束播放帧 |
| `volume` | number (0-1) | - | 音量 |
| `loop` | boolean | - | 是否循环 |

---

## subtitles - 字幕

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tokens` | SubtitleToken[] | - | 逐词/逐句字幕 |
| `srtUrl` | string | - | SRT 字幕文件 URL |
| `captionsUrl` | string | - | Captions 文件 URL |
| `highlightColor` | string | - | 高亮颜色 |
| `fontSize` | number | - | 字号 |

### SubtitleToken

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | Y | 字幕文本 |
| `fromFrame` | number | Y | 开始帧 |
| `toFrame` | number | Y | 结束帧 |

---

## sfx - 音效触发器

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `sfx` | string | Y | - | 音效名（对应 `globalSettings.audio.sfx` 的 key） |
| `atFrame` | number | - | `0` | 触发帧 |
| `frameOf` | `"scene"` \| `"global"` | - | - | 帧参考：`scene`=相对场景, `global`=相对全局 |
| `volume` | number (0-1) | - | - | 音量 |

---

## variables - 模板变量

驱动 UI 表单生成，让用户可以自定义蓝图参数。

**顶层结构**：`BlueprintVariables` 对象，包含两个数组：

```json
{
  "content": [ ... ],  // 内容变量数组
  "theme": [ ... ]     // 主题变量数组
}
```

### ContentVariable

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | string | Y | 变量 key，props 中通过 `$data.key` 引用 |
| `label` | string | Y | 表单标签 |
| `type` | `"string"` \| `"number"` \| `"image"` \| `"textarea"` | - | 输入类型 |
| `default` | any | - | 默认值 |

### ThemeVariable

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | string | Y | 变量 key |
| `label` | string | Y | 表单标签 |
| `type` | `"color"` \| `"font"` | - | 输入类型 |
| `default` | any | - | 默认值 |

---

## 常量

| 常量 | 值 | 说明 |
|------|-----|------|
| FPS | 30 | 帧率 |
| 宽度 | 1920px | 视频宽度 |
| 高度 | 1080px | 视频高度 |

---

## 帧数换算

| 秒数 | 帧数 (30fps) |
|------|--------------|
| 1s | 30 |
| 2s | 60 |
| 3s | 90 |
| 4s | 120 |
| 5s | 150 |

### 总帧数计算（含过渡）

引擎使用 `@remotion/transitions` 的 `TransitionSeries` 渲染，总帧数 = 各场景 duration 之和 - 过渡重叠帧：

```
totalFrames = sum(scenes[i].durationInFrames) - sum(scenes[i].transitionToNext.durationInFrames)
```

示例：3 个场景各 90 帧，各有 15 帧 crossfade 过渡：
- 总帧数 = 90 + 90 + 90 - 15 - 15 = 240 帧（8 秒）

> 最后一个场景的 `transitionToNext` 不参与扣减（无后续场景）。

---

## Zod 校验 vs TypeScript/Python 差异

> 以下为 Zod schema（前端校验层）与 TypeScript 类型 / Python 实体的已知差异。LLM 生成应以 TypeScript/Python 为准。

| 字段 | Zod 校验 | TypeScript / Python | 说明 |
|------|----------|-------------------|------|
| AnimationType | 12 种（缺 `reveal`, `stamp-drop`, `brush-strike`, `blur-in`） | 16 种（完整） | Zod 校验较严格，LLM 可生成完整 16 种 |
| LoopConfig.type | `pulse`, `float`, `spin`, `wiggle` | Python 额外支持 `flicker`, `bounce`, `shake` | Python 端已扩展 |
| SceneConfig.narrativePhase | 未定义 | `"hook"`, `"context"`, `"deep_dive"`, `"climax"`, `"resolution"` | Zod 未校验此字段，但 TypeScript/Python 支持 |

---

## LLM 生成注意事项

### 必填字段（不可省略）
- `meta.id`, `meta.name`
- `scenes[].id`, `scenes[].durationInFrames`
- `scenes[].elements[].id`, `scenes[].elements[].type`
- `scenes[].sfx[].sfx`
- `scenes[].voiceover.audioUrl`, `scenes[].voiceover.text`, `scenes[].voiceover.startFrame`
- `scenes[].subtitles.tokens[].text`, `scenes[].subtitles.tokens[].fromFrame`, `scenes[].subtitles.tokens[].toFrame`

### 字段命名规范（LLM 易错点）
- 音效用 `sfx`（不是 `id` 或 `name`）
- 音效触发帧用 `atFrame`（不是 `frame`）
- 字幕时间用 `fromFrame`/`toFrame`（不是 `from`/`to` 或 `start`/`end`）
- 循环动画类型：Python 端支持全部 7 种（`pulse`/`float`/`spin`/`wiggle`/`flicker`/`bounce`/`shake`），Zod 校验仅支持前 4 种

### 推荐的动画搭配

| 场景类型 | 推荐入场动画 | 推荐循环 |
|----------|-------------|----------|
| 标题 | `fade-up` 或 `stamp-drop` | - |
| 卡片 | `fade-up` + stagger | `float` |
| 数据图表 | `bar-grow` | - |
| 代码块 | `reveal` | - |
| 图标 | `scale-bounce` | `pulse` |
| 装饰元素 | `blur-in` | `wiggle` |
