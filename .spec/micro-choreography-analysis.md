# Micro-Choreography 模板化分析

> 5 个帧级微观维度 vs 当前系统的差距与模板化方案
> 日期：2026-05-21
> 实施状态：P0 ✅ + P1 ✅ — 全部 5 维度完成

---

## 一、总体评估

| 维度 | 当前成熟度 | 差距等级 | 模板化价值 |
|------|-----------|---------|-----------|
| 1. 元素生命周期状态机 | 40% — 仅有 Intro | **大** | 极高 |
| 2. 微观编排与错峰延迟 | 50% — 有工具但未暴露 | **中** | 高 |
| 3. 底层缓动数学模型 | 60% — 仅有 Spring | **中** | 高 |
| 4. 景深与 Z 轴伪造 | 10% — 基本缺失 | **大** | 中 |
| 5. 材质混合模式 | 0% — 完全缺失 | **大** | 中 |

**核心结论：5 个维度均可模板化。其中维度 1-3 应作为 P0，维度 4-5 作为 P1。**

---

## 二、逐维度分析

### 维度 1：元素生命周期状态机 (Intro → Idle → Outro)

**现状：**
- ✅ `useEntrance` hook — 仅处理 Intro（spring + opacity + transform）
- ✅ `motions.ts` 有 `subtle-float`、`glow-pulse` — 名义上的 Idle 动效
- ❌ Idle 动效从未被自动应用 — 需要组件手动调用
- ❌ 无 Outro 阶段 — 元素在 Segment 结束时被 Remotion Sequence 直接裁掉
- ❌ 三阶段未建模为统一概念

**模板化方案：`useLifecycle` hook**

```
元素生命周期模型：
┌─────────┐    ┌──────────────┐    ┌─────────┐
│  Intro  │ →  │    Idle      │ →  │  Outro  │
│ (入场)   │    │ (悬停/呼吸)   │    │ (退场)   │
└─────────┘    └──────────────┘    └─────────┘
  0→40f           40→(dur-30)f       (dur-30)→dur
```

新增类型：
```ts
interface LifecycleConfig {
  intro: { type: MotionType; durationFrames: number };
  idle: { type: "float" | "glow" | "none"; amplitude: number; frequency: number };
  outro: { type: MotionType; durationFrames: number };
}

// MotionPreset 扩展
interface MotionPreset {
  // ...existing fields
  lifecycle?: LifecycleConfig;  // 新增
}
```

`useLifecycle` hook 自动根据 scene 内帧号计算当前阶段，返回当前阶段的 transform/opacity/filter。

**模板化收益：** LLM 生成一个 JSON 字段（如 `lifecycle: "premium-card"`），系统自动应用完整的入场→悬停→退场三阶段。

**实施复杂度：** 中。需新增 ~100 行 hook + 修改 SceneBase 透传 lifecycle。

---

### 维度 2：微观编排 & 错峰延迟 (Stagger)

**现状：**
- ✅ `staggerStartFrame()` 工具函数存在
- ✅ `AnimatedBarChart` 已内建 `staggerDelay`
- ❌ `staggerIndex` 未在 MotionPreset 中建模 — 每个组件硬编码
- ❌ 无法从 JSON 控制"标题先出，卡片延迟 10 帧，数据条延迟 15 帧"

**模板化方案：`staggerIndex` + `staggerDelay` 字段**

在 `MotionPreset` 中新增：
```ts
interface MotionPreset {
  // ...existing fields
  stagger?: {
    index: number;     // 0-based order in the sequence
    delayFrames: number; // per-index delay (e.g. 10 = +10f per element)
  };
}
```

在 `SceneConfig.content` 中新增 `staggerOrder`：
```json
{
  "content": {
    "title": "Performance",
    "points": ["Point 1", "Point 2"],
    "staggerOrder": ["title", "chartBg", "bar1", "bar2", "number1", "number2"]
  }
}
```

Layout 组件读取 `staggerOrder`，按索引分配 `staggerIndex`，传递给 `useEntrance`。

**模板化收益：** LLM 不需要知道具体帧数，只需排序 `["title", "bar1", "bar2"]`，系统自动计算 stagger 延迟。

**实施复杂度：** 低。`staggerOrder` 是 content 中的 optional array，layout 组件已能处理 `index` 参数。

---

### 维度 3：缓动数学模型 (Spring vs Bezier)

**现状：**
- ✅ 物理弹簧 `spring()` — 有稳重和弹性两套预设
- ✅ `interpolate()` 用于 opacity/transform 线性插值
- ❌ 无 Cubic-Bezier 支持 — 无法表达 `ease-out-expo`、`ease-in-out-quart`
- ❌ 无法按场景情绪选择缓动曲线（"激进证明"用 spring，"优雅愿景"用 bezier）

**模板化方案：`EasingCurve` 类型**

```ts
// 现有 SpringConfig 保留
interface SpringConfig { mass: number; damping: number; stiffness: number; }

// 新增 Bezier 曲线
type BezierCurve = "ease-out-expo" | "ease-out-quart" | "ease-in-out-cubic";

// MotionPreset 扩展
interface MotionEntrance {
  springConfig?: SpringConfig;  // 物理弹簧（现有）
  easingCurve?: BezierCurve;    // CSS 贝塞尔（新增）
}

// 工具函数
function useBezierAnim(curve: BezierCurve, progress: number): number;
```

不同情绪的推荐曲线：
| 情绪 | 曲线 | 参数 |
|------|------|------|
| 高效敏捷（数据证明） | spring-elastic | damping:12, stiffness:100 |
| 优雅深邃（愿景宣告） | ease-out-expo | CSS: `cubic-bezier(0.16, 1, 0.3, 1)` |
| 稳重专业（功能介绍） | ease-out-quart | CSS: `cubic-bezier(0.25, 1, 0.5, 1)` |

**模板化收益：** LLM 根据场景情绪选择 `easingType: "power" | "elegant"` 而非手填阻尼值。

**实施复杂度：** 中。`useBezierAnim` ~30 行 + Remotion 已支持 `interpolate` 配合 `extrapolate`，可映射 Bezier 曲线。

---

### 维度 4：景深与 Z 轴伪造 (Depth Parallax)

**现状：**
- ✅ SceneBase 三层结构（背景→遮罩→内容）
- ✅ `blur-focus` 动效在入场时做 blur→clear
- ❌ 背景层不响应前景动效 — 无 push-pull 联动
- ❌ 卡片的 boxShadow 不随 scale 变化
- ❌ 流体渐变背景不会在前景元素入场时增加模糊

**模板化方案：背景联动参数**

在 `StyleTemplate` 中新增 depth 字段：
```ts
interface DepthConfig {
  /** 前景元素入场时背景 blur 峰值 (px) */
  backgroundBlurPeak: number;
  /** 背景缩放退后感 (1.0 = 无退后, 0.95 = 微微后退) */
  backgroundScaleRetreat: number;
}

// StyleTemplate 扩展
interface StyleTemplate {
  // ...existing
  depth?: DepthConfig;
}
```

在 `SceneBase` 中：前景入场 progress → 背景 `blur(progress * depth.backgroundBlurPeak)` + `scale(1 - progress * (1 - depth.backgroundScaleRetreat))`。

**模板化收益：** 一条 `depth: { blurPeak: 8, scaleRetreat: 0.97 }` 让所有场景自动拥有摄像机呼吸感。

**实施复杂度：** 低。SceneBase 已接收 frame 参数，添加 blur/scale 联动只需 ~20 行。

---

### 维度 5：材质混合模式 (Blend Modes)

**现状：**
- ❌ 完全缺失 — 无 `mixBlendMode`、无 `backdropFilter`
- ✅ 有半透明遮罩层（Layer 2 overlay），但非元素级
- ❌ 文字边缘与流体背景无光学交互

**模板化方案：BlendMode 样式属性**

```ts
// StyleTokens 扩展
interface StyleTokens {
  // ...existing
  blendMode?: "normal" | "overlay" | "color-dodge" | "luminosity" | "difference";
  backdropBlur?: number;    // px
  glassOpacity?: number;    // 0.0 - 1.0
}

// 在 LayoutProps 中透传
interface LayoutProps {
  // ...existing
  blendMode?: string;
}
```

卡片组件自动应用：
```tsx
<div style={{
  backdropFilter: `blur(${style.backdropBlur ?? 0}px)`,
  backgroundColor: `rgba(255,255,255,${style.glassOpacity ?? 0.05})`,
  mixBlendMode: style.blendMode ?? 'normal',
}}>
```

**模板化收益：** 一套"镭射光斑 + 白色毛玻璃卡片 + luminosity 混合"的组合可通过 3 个 JSON 字段描述。

**实施复杂度：** 低。纯 CSS 属性，透传即可。

---

## 三、优先级与实施路线

### P0 — 立即实施（维度 1-3）

| # | 项目 | 文件 | 工作量 |
|---|------|------|--------|
| 1.1 | `useLifecycle` hook (Intro→Idle→Outro) | `hooks/useLifecycle.ts` | ~100 行 |
| 1.2 | Lifecycle 字段集成到 MotionPreset | `types.ts` + `motions.ts` | ~30 行 |
| 2.1 | `staggerOrder` 字段 + staggerIndex 透传 | `types.ts` + `layouts/*.tsx` | ~50 行 |
| 3.1 | `EasingCurve` 类型 + `useBezierAnim` | `types.ts` + `hooks/useBezierAnim.ts` | ~60 行 |
| 3.2 | 按情绪推荐缓动曲线的映射表 | `motions.ts` 新增 | ~20 行 |

### P1 — 后续实施（维度 4-5）

| # | 项目 | 文件 | 工作量 |
|---|------|------|--------|
| 4.1 | DepthConfig + 背景联动 blur/scale | `types.ts` + `SceneBase.tsx` | ~30 行 |
| 5.1 | BlendMode + backdropFilter 样式属性 | `types.ts` + `tokens.ts` + `layouts/*.tsx` | ~40 行 |

---

## 四、LLM 如何输出这些参数

最终目标：LLM 在生成 `content.json` 或 `timeline.json` 时，按以下语义级描述：

```json
{
  "sceneConfigs": {
    "proof-1": {
      "layoutId": "stat-highlight",
      "content": {
        "title": "Up to 48% sharper",
        "staggerOrder": ["title", "bg", "bar1", "bar2"]
      },
      "chartData": [...],
      "lifecycle": "premium-card",
      "mood": "power"
    }
  }
}
```

`mood: "power"` 自动映射到 `spring-elastic`，`lifecycle: "premium-card"` 自动展开为完整的 Intro→Idle→Outro 配置。LLM 不需要知道 `damping: 12` 或 `frequency: 0.02`。

---

## 五、不影响项

- 现有 12 套主题、5 种结构、7 种布局保持不变
- `useEntrance` hook 继续可用，`useLifecycle` 作为增强选项
- 所有新字段均为 optional，不设则 fallback 到当前行为
- Spring 参数预设保留，Bezier 作为新增选项
