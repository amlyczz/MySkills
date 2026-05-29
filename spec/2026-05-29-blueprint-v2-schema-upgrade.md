# Blueprint v2 Schema 升级 Spec

> 基于 LLM 生成 + Remotion 渲染的实际痛点，对 Blueprint Schema 进行结构性升级。
> 核心目标：**让 LLM 只写"语义描述"，让引擎做"数学计算"**。

**前置阅读**：`spec/2026-05-29-blueprint-schema-spec.md`（v1 完整字段文档）

**涉及模块**：
- Python 实体：`backend/src/domain/visual_blueprint/`
- TypeScript 类型：`frontend/remotion/src/engine/types.ts`
- Zod 校验：`frontend/remotion/src/contracts/blueprint-schema.ts`
- 渲染管线：`TemplateRenderer.tsx` → `SceneRenderer.tsx` → `ElementRenderer.tsx`
- 动效引擎：`applyAnimation.ts`

---

## 问题总览

| # | 痛点 | 严重度 | 改动范围 |
|---|------|--------|----------|
| 1 | LLM 帧数计算灾难（致命） | 🔴 | Python 预处理 + TS 类型 |
| 2 | 缺乏镜头语言 / 3D 空间感 | 🟡 | TS 类型 + ElementRenderer |
| 3 | 缺少全局后期处理 | 🟡 | TS 类型 + TemplateRenderer |
| 4 | 动态排版能力不足 | 🟢 | 新增 AnimationType |
| 5 | 数组遍历（repeat/forEach）缺失 | 🟡 | TS 类型 + ElementRenderer |
| 6 | scene.type 与 elements 职责冲突 | 🟡 | SceneRenderer + 文档 |
| 7 | 模板变量语法不明确 | 🟢 | 文档 + resolveDataRefs |
| 8 | Loop 与入场动画时序冲突 | 🟡 | applyAnimation |

---

## 改动 1：语义化时间（解决帧数计算灾难）

### 问题

LLM 是语言模型，不擅长 `startFrame: 45, duration: 32` 这类精确帧数计算。当前要求 LLM 计算：
- 场景 `startFrame` 需要累加前面所有场景的 `durationInFrames` 并减去过渡重叠
- 动画 `timeline.inFrame` / `duration` 以帧为单位
- 字幕 `fromFrame` / `toFrame` 需要对齐语音时间轴
- 音效 `atFrame` 触发点

这些数学计算 LLM 极大概率出错，导致音画不同步、动画穿模。

### 方案

**LLM 生成用秒，引擎消费用帧。** 在 Python 侧新增 `normalizeBlueprint()` 预处理层，在 JSON 交给 Remotion 之前完成所有帧数换算。

#### v2 Schema 新增字段（语义时间）

所有时间相关字段支持**双模式**：
- 保留原有 `xxxFrame` / `xxxInFrames` 字段（帧模式，向后兼容）
- 新增对应的 `xxxSec` 字段（秒模式，LLM 优先使用）

```typescript
// SceneConfig 扩展
interface SceneConfig {
  // 原有帧模式（向后兼容）
  startFrame?: number;         // 场景起始帧
  durationInFrames?: number;   // 场景持续帧数

  // 新增秒模式（LLM 用）
  startSec?: number;           // 场景起始秒数，如 0, 3.5, 7.2
  durationSec?: number;        // 场景持续秒数，如 3, 5, 2.5

  // ...其余不变
}

// AnimationTimeline 扩展
interface AnimationTimeline {
  inFrame?: number;
  duration?: number;
  // 新增
  inSec?: number;    // 动画开始秒数（相对场景）
  durationSec?: number; // 动画持续秒数
}

// SubtitleToken 扩展
interface SubtitleToken {
  fromFrame?: number;
  toFrame?: number;
  // 新增
  fromSec?: number;  // 字幕开始秒数
  toSec?: number;    // 字幕结束秒数
}

// SfxTrigger 扩展
interface SfxTrigger {
  atFrame?: number;
  // 新增
  atSec?: number;    // 触发秒数
}

// VoiceoverConfig 扩展
interface VoiceoverConfig {
  startFrame?: number;
  endFrame?: number;
  // 新增
  startSec?: number;
  endSec?: number;
}

// TransitionToNext 扩展
interface TransitionToNext {
  durationInFrames?: number;
  // 新增
  durationSec?: number;
}
```

#### normalizeBlueprint() 预处理（Python 侧）

在 `backend/src/domain/visual_blueprint/` 新增 `normalize.py`：

```python
def normalize_blueprint(bp: dict, fps: int = 30) -> dict:
    """将秒数字段转换为帧数字段，供 Remotion 消费。

    规则：
    1. 如果字段同时有秒和帧，帧优先（向后兼容）
    2. 如果只有秒，自动换算：帧 = round(秒 * fps)
    3. 自动计算场景 startFrame（若未指定）：按顺序累加 duration 并减去过渡重叠
    4. 自动补齐 animation.timeline.duration（若未指定）：使用场景 duration
    """
```

**处理流程**：

```
LLM 生成 JSON（秒模式）     Python normalize_blueprint()        Remotion 消费（帧模式）
─────────────────────      ──────────────────────────        ──────────────────────
startSec: 3.5        ──→   startFrame: 105              ──→   startFrame: 105
durationSec: 5       ──→   durationInFrames: 150         ──→   durationInFrames: 150
transitionSec: 0.5   ──→   durationInFrames: 15          ──→   durationInFrames: 15
fromSec: 0.5         ──→   fromFrame: 15                ──→   fromFrame: 15
atSec: 2.0           ──→   atFrame: 60                  ──→   atFrame: 60
```

**自动 startFrame 计算**：

如果 LLM 未指定 `startFrame`（只给 `durationSec`），`normalize_blueprint` 按场景顺序自动计算：

```python
# 简化逻辑
offset = 0
for scene in bp["scenes"]:
    if "startFrame" not in scene and "startSec" not in scene:
        scene["startFrame"] = offset
    offset += scene["durationInFrames"]
    if scene.get("transitionToNext", {}).get("type", "none") != "none":
        offset -= scene["transitionToNext"]["durationInFrames"]
```

### 验收标准

- [ ] Python `normalize_blueprint()` 单元测试：纯秒输入 → 正确帧输出
- [ ] 混合模式测试：部分秒、部分帧 → 帧优先，秒补缺
- [ ] 自动 startFrame 计算：3 个场景 + 2 个过渡 → 正确累加
- [ ] Remotion 侧无需任何改动（接收到的 JSON 全是帧）

---

## 改动 2：镜头语言 & 3D 深度

### 问题

当前 `ElementLayout` 只有 2D 的 x/y/scale/rotation，无法表达 Z 轴视差效果和镜头运动。

### 方案

#### SceneConfig 新增 camera 字段

```typescript
interface CameraConfig {
  /** 初始镜头位置 */
  initial?: {
    x?: number;      // px，默认 960（画面中心）
    y?: number;      // px，默认 540
    zoom?: number;   // 缩放倍率，默认 1.0
  };
  /** 镜头运动（到达目标位置） */
  move?: {
    x?: number;
    y?: number;
    zoom?: number;
  };
  /** 镜头运动时间（秒，经 normalize 转帧） */
  moveSec?: number;
}
```

#### ElementLayout 新增 z 字段

```typescript
interface ElementLayout {
  // ...原有字段
  z?: number;  // 深度层，默认 0。正值=靠近镜头（放大），负值=远离镜头（缩小）
}
```

#### 渲染实现

在 `SceneRenderer.tsx` 中：

```tsx
// 将 scene.camera + element.layout.z 合成为 CSS perspective + translateZ
const sceneStyle: React.CSSProperties = {
  perspective: "1200px",
  perspectiveOrigin: "50% 50%",
};

// 在 ElementRenderer 中，z != 0 时应用 translateZ
if (element.layout?.z) {
  layoutStyle.transform = `translateZ(${element.layout.z}px)`;
}
```

`camera.move` 的运镜通过 Remotion `interpolate` 驱动，基于场景内帧数进度。

### 验收标准

- [ ] `CameraConfig` 在 TypeScript/Python/Zod 三端同步
- [ ] SceneRenderer 应用 perspective + camera 运镜
- [ ] ElementRenderer 支持 `z` 字段 translateZ
- [ ] LLM prompt 中引导使用 `camera` + `z` 而非手动计算位移

---

## 改动 3：全局后期处理

### 问题

当前后期效果（film-grain 等）是零散的装饰组件，缺乏全局调色、暗角等统一控制。

### 方案

#### globalSettings 新增 postProcessing

```typescript
interface PostProcessingConfig {
  /** 色彩滤镜（预设名或自定义） */
  colorGrading?: {
    preset?: "none" | "warm" | "cool" | "vintage" | "cinematic" | "noir";
    brightness?: number;    // -1 到 1，默认 0
    contrast?: number;      // -1 到 1，默认 0
    saturate?: number;      // 0 到 2，默认 1
  };
  /** 暗角 */
  vignette?: {
    enabled: boolean;
    intensity?: number;     // 0-1，默认 0.4
    softness?: number;      // 0-1，默认 0.5
  };
  /** 发光 */
  bloom?: {
    enabled: boolean;
    intensity?: number;     // 0-1，默认 0.3
    threshold?: number;     // 0-1，默认 0.8
  };
  /** 色差 */
  chromaticAberration?: {
    enabled: boolean;
    intensity?: number;     // 0-1，默认 0.02
  };
}
```

#### 渲染实现

在 `TemplateRenderer.tsx` 最外层 `<AbsoluteFill>` 内新增后处理叠加层：

```tsx
{/* 后期处理叠加层（最顶层） */}
{globalSettings.postProcessing && (
  <PostProcessingOverlay config={globalSettings.postProcessing} />
)}
```

`PostProcessingOverlay` 使用 CSS `filter` + `mix-blend-mode` + 径向渐变叠加实现（不需要 WebGL）：

```tsx
const style: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  filter: buildFilterString(config.colorGrading, config.bloom),
  // vignette 用径向渐变 box-shadow
  boxShadow: config.vignette?.enabled
    ? `inset 0 0 ${200 * config.vignette.softness}px rgba(0,0,0,${config.vignette.intensity})`
    : undefined,
};
```

### 验收标准

- [ ] `PostProcessingConfig` 三端同步
- [ ] CSS filter 方案验证：colorGrading + bloom + vignette 无性能问题
- [ ] chromaticAberration 用 CSS `text-shadow` offset 模拟或跳过
- [ ] LLM 可生成 `postProcessing: { colorGrading: { preset: "cinematic" }, vignette: { enabled: true } }`

---

## 改动 4：增强动态排版

### 问题

文字动画只有 `typewriter` 和 `fade-up`，缺少逐字飞入、路径运动等高级效果。

### 方案

#### 新增 AnimationType

```typescript
// 新增 3 种文字动画
| "char-fly-in"    // 逐字飞入（从底部弹起，带交错）
| "word-slide"     // 逐词滑入（从左到右，带交错）
| "mask-reveal"    // 遮罩揭示（从中间向两侧展开）
```

#### applyAnimation.ts 新增实现

```typescript
// char-fly-in: 由组件内部处理，animation 只设标志
const charFlyIn: AnimationFn = () => ({});
// 实际逐字动画在 animated-text / text-block 组件内部实现，
// 组件读取 animation.stagger.delayPerChild 作为逐字延迟
```

> **设计决策**：逐字/逐词动画由**组件内部**实现（因为需要拆分文字 DOM），而非 `applyAnimation.ts`（只处理整体 transform）。`applyAnimation` 只提供 `stagger` 配置，组件自行消费。

### 验收标准

- [ ] `char-fly-in` 在 `animated-text` 组件中实现逐字弹入
- [ ] `word-slide` 在 `text-block` 组件中实现逐词滑入
- [ ] `mask-reveal` 在 `animated-text` 组件中实现 clip-path 遮罩

---

## 改动 5：数组遍历（repeat/forEach）

### 问题

`$data.features` 如果是一个 5 元素数组，LLM 无法在 JSON 里写 5 个重复的 elements。

### 方案

#### ElementConfig 新增 repeat 字段

```typescript
interface ElementConfig {
  // ...原有字段

  /** 数据驱动的重复渲染 */
  repeat?: {
    /** 数据源路径，如 "$data.features" */
    dataSource: string;
    /** 迭代变量名，在子元素 props 中引用，如 "item" */
    itemAlias?: string;    // 默认 "item"
    /** 子元素模板（只定义一个，引擎按数组长度复制） */
    template: ElementConfig;
  };
}
```

#### LLM 生成示例

```json
{
  "id": "feature-list",
  "type": "div",
  "layout": { "position": "absolute", "x": "10%", "y": "30%", "width": "80%" },
  "repeat": {
    "dataSource": "$data.features",
    "itemAlias": "item",
    "template": {
      "id": "feature-item",
      "type": "stat-card",
      "props": {
        "title": "$item.name",
        "value": "$item.value"
      },
      "animation": {
        "type": "fade-up",
        "timeline": { "inSec": 0, "durationSec": 0.5 },
        "stagger": { "delayPerChild": 5 }
      }
    }
  }
}
```

#### 渲染实现

在 `ElementRenderer.tsx` 中：

```tsx
// 如果有 repeat，展开模板
if (element.repeat) {
  const items = resolveDataPath(element.repeat.dataSource, dataCtx);
  if (Array.isArray(items)) {
    return (
      <div style={mergedStyle}>
        {items.map((item, i) => {
          const childCtx = { ...dataCtx, [element.repeat!.itemAlias ?? "item"]: item };
          const childConfig = { ...element.repeat!.template };
          // 为每个复制项生成唯一 id
          childConfig.id = `${element.id}-${i}`;
          return (
            <ElementRenderer
              key={childConfig.id}
              element={childConfig}
              dataCtx={childCtx}
              motionTokens={motionTokens}
              staggerOffset={stagger?.direction === "reverse"
                ? (items.length - 1 - i) * (stagger?.delayPerChild ?? 3)
                : i * (stagger?.delayPerChild ?? 3)}
            />
          );
        })}
      </div>
    );
  }
}
```

`resolveDataPath` 函数解析 `$data.features` 为实际数组，`$item.name` 解析为迭代变量字段。

### 验收标准

- [ ] `repeat` 字段三端同步（TS 类型、Zod、Python）
- [ ] `resolveDataPath` 解析 `$data.xxx.yyy` 路径
- [ ] 迭代变量 `$item.xxx` 在子元素 props 中正确解析
- [ ] stagger 自动应用于展开后的子元素

---

## 改动 6：scene.type 语义明确化

### 问题

`scene.type` 有 `split-data-chart` 等值。如果指定了 type，LLM 还需要写 elements 吗？当前行为不明确。

### 方案

**将 scene.type 明确为"布局模板"（Layout Template）。**

规则：
1. 如果 `scene.type` 不是 `"generic"`，引擎使用 `presetSceneRegistry` 的预设组件渲染
2. 预设组件只接收 `scene.props`，**不消费 `scene.elements`**
3. 如果 `scene.type === "generic"`（默认），引擎使用 `GenericScene` 渲染 `scene.elements`
4. `scene.type` 可以作为**语义标签**同时传入（如 `"intro"`），但如果对应预设组件不存在，fallback 到 GenericScene

**文档更新**：在 Blueprint spec 中明确标注：

```
scene.type 有两种角色：
1. 布局模板（如 split-data-chart）→ 使用预设组件，不需要写 elements
2. 语义标签（如 intro, outro）→ 仍用 GenericScene，但 type 帮助 LLM 理解叙事结构
```

### 验收标准

- [ ] SceneRenderer 当前逻辑已正确（preset 存在则用，否则 fallback）
- [ ] 文档中明确 type 的两种角色

---

## 改动 7：模板变量语法明确化

### 问题

`$data.repoName` 和 `theme.colors.primary` 的解析规则不统一，LLM 不知道什么时候用 `$` 前缀。

### 方案

**统一两种引用语法，用正则校验**：

| 引用语法 | 含义 | 解析函数 | 正则 |
|----------|------|----------|------|
| `$data.xxx` 或 `$data.xxx.yyy` | 引用 Blueprint.data 中的共享数据 | `resolveDataRefs()` | `/^\$data\.[a-zA-Z0-9_.]+$/` |
| `$item.xxx` | repeat 迭代变量（仅在 repeat.template 内） | `resolveDataRefs()` + childCtx | `/^\$item\.[a-zA-Z0-9_.]+$/` |
| `theme.colors.xxx` | 引用全局主题色 | `resolveDataRefs()` | `/^theme\.colors\.[a-zA-Z0-9_]+$/` |

**不支持的语法**（在 Zod 校验层拒绝）：
- `$eval(...)` / `eval(...)` — 防止注入
- `${...}` — 模板字符串
- `window.xxx` / `process.xxx` — 环境变量

#### resolveDataRefs 增强

```typescript
function resolveDataRefs(props, dataCtx, itemCtx?) {
  // $item.xxx → 优先从迭代上下文解析
  // $data.xxx → 从 Blueprint.data 解析
  // theme.colors.xxx → 从全局主题解析（由 TemplateRenderer 注入 dataCtx）
}
```

### 验收标准

- [ ] Zod 校验层对 condition 和 props 中的变量引用做正则校验
- [ ] 文档中明确三种合法引用语法

---

## 改动 8：Loop 与入场动画时序

### 问题

Schema 说"入场动画完成后持续循环"，但 `applyAnimation.ts` 没有显式延迟，loop 和 spring 入场可能打架。

### 方案

#### AnimationConfig 新增 loopStartDelay

```typescript
interface AnimationConfig {
  // ...原有字段

  /** loop 动画延迟开始帧数（相对于入场动画结束） */
  loopStartDelay?: number;    // 默认 0
  // 秒模式
  loopStartDelaySec?: number;
}
```

#### applyAnimation.ts 修改

```typescript
// 当前行为：loop 从 frame=0 就开始（可能和入场重叠）
// 修改后：loop 在入场动画结束后才激活

const entranceEnd = config.timeline.inFrame + (config.timeline.duration ?? 30);
const loopDelay = config.loopStartDelay ?? 0;
const loopActive = frame >= entranceEnd + loopDelay;

if (loopActive && config.loop) {
  // 应用 loop 效果
  const lp = loopStyle(frame, fps, config.loop);
  base.transform = mergeTransform(base.transform, lp.transform);
}
```

### 验收标准

- [ ] `loopStartDelay` 三端同步
- [ ] `applyAnimation` 只在入场完成后应用 loop
- [ ] 测试：fade-up(30帧) + loop(float, delay=0) → 前 30 帧无漂浮，30 帧后开始漂浮

---

## 实施优先级

| 阶段 | 改动 | 理由 |
|------|------|------|
| **P0** | 1. 语义化时间 | 解决 LLM 生成最致命的帧数计算问题 |
| **P0** | 8. Loop 时序 | 修复现有渲染 bug |
| **P1** | 5. repeat/forEach | 大幅减少 LLM JSON 体积和重复劳动 |
| **P1** | 6. scene.type 明确 | 消除 LLM 生成歧义 |
| **P1** | 7. 变量语法明确 | 减少解析错误 |
| **P2** | 3. 后期处理 | 提升视觉品质 |
| **P2** | 2. 镜头 & 3D | 增强空间表现力 |
| **P3** | 4. 动态排版 | 锦上添花 |

---

## v1 → v2 向后兼容策略

所有改动**向后兼容**：

1. **语义时间**：新增 `xxxSec` 字段，原有 `xxxFrame` 字段不变。未指定秒时走帧逻辑。
2. **camera**：可选字段，不填则无镜头运动。
3. **postProcessing**：可选字段，不填则无后期。
4. **repeat**：可选字段，不填则走原有 elements 逻辑。
5. **loopStartDelay**：可选字段，默认 0（即当前行为）。
6. **新 AnimationType**：新增枚举值，不影响已有类型。

> **LLM 端**：通过更新 system prompt 引导 LLM 使用 v2 字段（优先秒模式、使用 repeat 等），但不强制。
> **旧蓝图**：完全不包含 v2 字段的 JSON 仍可正常渲染。
