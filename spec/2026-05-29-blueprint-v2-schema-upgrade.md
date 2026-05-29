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
| 9 | LLM 绝对定位错误 | 🟡 | ElementLayout + ElementRenderer |
| 10 | 缺少场景预设库 | 🟡 | shot_presets + LLM prompt |
| 11 | 无校验钩子 | 🔴 | validate + auto_fix |

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

**全面替换为秒，不兼容旧帧字段。** LLM 只写秒数，Python `normalizeBlueprint()` 转换为帧数后交给 Remotion。所有 `xxxFrame` / `xxxInFrames` 字段从 Schema 中删除。

#### v2 Schema 字段替换清单

| v1 字段（删除） | v2 字段（替换为） | 说明 |
|-----------------|------------------|------|
| `startFrame` | `startSec` | 场景起始秒数。**通常省略**，由 normalize 自动计算 |
| `durationInFrames` | `durationSec` | 场景持续秒数 |
| `transitionToNext.durationInFrames` | `transitionToNext.durationSec` | 过渡持续秒数，默认 0.5 |
| `timeline.inFrame` | `timeline.inSec` | 动画开始秒数（相对场景），默认 0 |
| `timeline.duration` | `timeline.durationSec` | 动画持续秒数 |
| `fromFrame` / `toFrame` | `fromSec` / `toSec` | 字幕时间 |
| `atFrame` | `atSec` | 音效触发秒数 |
| `voiceover.startFrame` / `endFrame` | `voiceover.startSec` / `endSec` | 旁白时间 |
| `loopStartDelay`（帧） | `loopStartDelaySec` | loop 延迟秒数 |

#### v2 类型定义

```typescript
// SceneConfig（时间字段替换）
interface SceneConfig {
  startSec?: number;           // 场景起始秒数（通常省略，自动计算）
  durationSec: number;         // 场景持续秒数。如 3, 5, 2.5
  // ...其余不变
}

// AnimationTimeline（替换）
interface AnimationTimeline {
  inSec?: number;              // 动画开始秒数（相对场景），默认 0
  durationSec?: number;        // 动画持续秒数
}

// SubtitleToken（替换）
interface SubtitleToken {
  text: string;
  fromSec: number;             // 字幕开始秒数
  toSec: number;               // 字幕结束秒数
}

// SfxTrigger（替换）
interface SfxTrigger {
  sfx: string;
  atSec?: number;              // 触发秒数，默认 0
  volume?: number;
}

// VoiceoverConfig（替换）
interface VoiceoverConfig {
  audioUrl: string;
  text: string;
  startSec: number;            // 开始秒数
  endSec?: number;             // 结束秒数
  volume?: number;
  loop?: boolean;
}

// TransitionToNext（替换）
interface TransitionToNext {
  type: string;
  durationSec?: number;        // 过渡秒数，默认 0.5
  props?: Record<string, unknown>;
}

// AnimationConfig.loopStartDelay（新增，秒）
loopStartDelaySec?: number;    // loop 延迟秒数，默认 0

// LoopConfig（保持帧）
// 注意：LoopConfig.durationInFrames 保留帧单位，
// 因为它是"一个周期的帧数"，属于引擎内部参数，LLM 无需计算
```

> **LoopConfig 例外**：`loop.durationInFrames` 保留帧单位，因为它是引擎内部的一个循环周期参数（如 30 帧 = 1 秒一个脉冲），不属于"时间轴计算"范畴。LLM 只需知道 `amplitude` 和循环类型即可。

#### LLM 生成示例（纯秒模式）

```json
{
  "meta": { "id": "demo", "name": "Demo" },
  "globalSettings": { "theme": { "colors": {"bg": "#000"}, "typography": { "primaryFont": "Inter", "scales": {} } } },
  "scenes": [
    {
      "id": "intro",
      "type": "intro",
      "durationSec": 3,
      "voiceover": { "audioUrl": "vo.mp3", "text": "欢迎", "startSec": 0 },
      "transitionToNext": { "type": "crossfade", "durationSec": 0.5 },
      "elements": [
        {
          "id": "title",
          "type": "animated-text",
          "props": { "text": "Hello" },
          "animation": {
            "type": "fade-up",
            "timeline": { "inSec": 0, "durationSec": 1 }
          }
        }
      ]
    },
    {
      "id": "detail",
      "type": "generic",
      "durationSec": 5,
      "subtitles": {
        "tokens": [
          { "text": "功能一", "fromSec": 0, "toSec": 1.5 },
          { "text": "功能二", "fromSec": 1.5, "toSec": 3 }
        ]
      },
      "sfx": [{ "sfx": "pop", "atSec": 0 }]
    }
  ]
}
```

> 注意：没有任何 `Frame` / `InFrames` 字段。`startSec` 也省略了（自动计算）。

#### normalizeBlueprint() 预处理（Python 侧）

在 `backend/src/domain/visual_blueprint/` 新增 `normalize.py`：

```python
def normalize_blueprint(bp: dict, fps: int = 30) -> dict:
    """将 v2 秒模式 JSON 转换为 Remotion 可消费的帧模式 JSON。

    职责：
    1. 所有 xxxSec → round(sec * fps) 写入对应的 xxxFrame / xxxInFrames
    2. 自动计算场景 startFrame（按顺序累加 duration - transition 重叠）
    3. 删除所有 xxxSec 字段（Remotion 不需要）
    4. Remotion 侧接收到的 JSON 只包含帧字段，无需任何改动
    """
```

**处理流程**：

```
LLM 生成 JSON（纯秒）         Python normalize_blueprint()           Remotion 消费（纯帧）
─────────────────────        ──────────────────────────          ──────────────────────
durationSec: 3        ──→    durationInFrames: 90           ──→   durationInFrames: 90
(省略 startSec)        ──→    startFrame: 0 (自动算)         ──→   startFrame: 0
durationSec: 0.5      ──→    durationInFrames: 15           ──→   durationInFrames: 15
inSec: 0.3            ──→    inFrame: 9                     ──→   inFrame: 9
fromSec: 0.5          ──→    fromFrame: 15                  ──→   fromFrame: 15
atSec: 2.0            ──→    atFrame: 60                    ──→   atFrame: 60
```

**自动 startFrame 计算**：

LLM 通常省略 `startSec`，`normalize_blueprint` 按场景顺序自动计算：

```python
offset = 0
for scene in bp["scenes"]:
    scene["startFrame"] = offset
    scene["durationInFrames"] = round(scene["durationSec"] * fps)
    # 处理 transition
    t = scene.get("transitionToNext")
    if t and t.get("type", "none") != "none":
        t["durationInFrames"] = round(t["durationSec"] * fps)
        offset += scene["durationInFrames"] - t["durationInFrames"]
    else:
        offset += scene["durationInFrames"]
    # 删除秒字段
    scene.pop("durationSec", None)
    scene.pop("startSec", None)
```

**Python 实体（Pydantic）也需要同步改为秒字段**：

```python
# scene_config.py — v2
class SceneConfig(BaseModel):
    id: str
    type: str = "generic"
    startSec: Optional[float] = None    # 替换 startFrame
    durationSec: float = 3.0            # 替换 durationInFrames
    # ...其余不变

# voiceover.py — v2
class VoiceoverConfig(BaseModel):
    audioUrl: str = ""
    text: str = ""
    startSec: float = 0.0               # 替换 startFrame
    endSec: Optional[float] = None      # 替换 endFrame
    # ...其余不变
```

### 验收标准

- [ ] Python `normalize_blueprint()` 单元测试：纯秒输入 → 正确帧输出
- [ ] 自动 startFrame 计算：3 场景 + 2 过渡 → 正确累加减重叠
- [ ] 所有 Pydantic 实体字段从 Frame 改为 Sec
- [ ] Remotion TypeScript 类型和 Zod schema 同步更新（保留帧字段，由 normalize 写入）
- [ ] 现有模板（dark-neon, tech-launch 等）中的帧值全部改为秒值

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

#### AnimationConfig 新增 loopStartDelaySec

```typescript
interface AnimationConfig {
  // ...原有字段

  /** loop 动画延迟开始秒数（相对于入场动画结束） */
  loopStartDelaySec?: number;    // 默认 0
}
```

#### applyAnimation.ts 修改

normalize 会将 `loopStartDelaySec` 转为帧数写入 `loopStartDelay`，引擎消费帧：

```typescript
const entranceEnd = config.timeline.inFrame + (config.timeline.duration ?? 30);
const loopDelay = config.loopStartDelay ?? 0;
const loopActive = frame >= entranceEnd + loopDelay;

if (loopActive && config.loop) {
  const lp = loopStyle(frame, fps, config.loop);
  base.transform = mergeTransform(base.transform, lp.transform);
}
```

### 验收标准

- [ ] `loopStartDelaySec` 三端同步（Python/TS/Zod）
- [ ] `applyAnimation` 只在入场完成后应用 loop
- [ ] 测试：fade-up(1秒) + loop(float, delaySec=0) → 前 1 秒无漂浮，1 秒后开始漂浮

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
| **P1** | 9. 自动布局 | 减少 LLM 坐标错误 |
| **P1** | 10. 场景预设库 | 大幅提升生成质量 |
| **P0** | 11. 验证钩子 | 防止非法蓝图进入渲染 |

---

## 改动 9：自动布局（Auto-Layout）

### 问题

LLM 直接输出 `x: "50%", y: "40%"` 绝对坐标，元素重叠、溢出频繁发生。LLM 不理解 1920x1080 的空间关系。

### 方案

#### ElementLayout 新增语义定位

```typescript
interface ElementLayout {
  // ...原有字段保留（但 LLM 不需要直接使用 x/y）

  /** 语义定位（替代 x/y 绝对坐标） */
  position: "absolute" | "relative" | "flex-child"   // 保留
  /** 自动定位：由引擎计算 x/y */
  align?: "top-left" | "top-center" | "top-right"
        | "center-left" | "center" | "center-right"
        | "bottom-left" | "bottom-center" | "bottom-right";
  /** Flex 布局（仅父容器使用） */
  flexDirection?: "row" | "column";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  gap?: number | string;      // px 或 "%"
}
```

#### 渲染实现

在 `ElementRenderer.tsx` 中，当 `align` 指定时自动计算 x/y：

```typescript
const alignMap: Record<string, { x: string | number; y: string | number }> = {
  "top-left":      { x: 0,      y: 0 },
  "top-center":    { x: "50%",  y: 0 },
  "top-right":     { x: "100%", y: 0 },
  "center-left":   { x: 0,      y: "50%" },
  "center":        { x: "50%",  y: "50%" },
  "center-right":  { x: "100%", y: "50%" },
  "bottom-left":   { x: 0,      y: "100%" },
  "bottom-center": { x: "50%",  y: "100%" },
  "bottom-right":  { x: "100%", y: "100%" },
};

if (layout.align) {
  const { x, y } = alignMap[layout.align];
  layoutStyle.left = x;
  layoutStyle.top = y;
  // 百分比值自动 translate(-50%, -50%) 居中
}
```

#### LLM 生成示例

```json
// v1: LLM 要算坐标（易错）
{ "layout": { "position": "absolute", "x": "50%", "y": "40%", "width": "60%" } }

// v2: LLM 只说"居中偏上"（语义化）
{ "layout": { "align": "top-center", "width": "60%" } }
```

### 验收标准

- [ ] 9 种 align 位置在 ElementRenderer 中正确映射
- [ ] Flex 布局属性（flexDirection, gap, justifyContent, alignItems）生效
- [ ] LLM prompt 中引导使用 align + flex，不直接写 x/y

---

## 改动 10：场景预设库（Shot References）

### 问题

LLM 每次从零拼凑底层动画，质量不可控。已有大量高级组件（coverflow-carousel, glass-panel），但 LLM 不了解最佳组合方式。

### 方案

#### 建立 shot_presets/ 目录

```
backend/src/infrastructure/code_agent/shot_presets/
├── suspense_intro.json       # 悬念开场：暗色 + 逐字揭示 + 低沉 VO
├── data_highlight.json       # 数据高光：数字飞入 + bar-grow 图表
├── feature_showcase.json     # 功能展示：卡片轮播 + stagger 动画
├── comparison.json           # 对比展示：split-layout + 对比表
├── testimonial.json          # 用户证言：引用卡 + 渐变背景
└── outro_cta.json            # 结尾 CTA：logo 浮现 + 行动号召
```

#### 预设结构

```typescript
interface ShotPreset {
  id: string;                  // 预设 ID
  name: string;                // 预设名称
  description: string;         // 场景描述（给 LLM 看）
  /** 变量占位符 — LLM 只需填这些 */
  slots: Record<string, {      // 如 "title", "subtitle", "items", "bgColor"
    type: "string" | "number" | "string[]";
    description: string;
    default?: unknown;
  }>;
  /** 场景 JSON 模板（使用 {{slotName}} 占位符） */
  template: SceneConfig;       // 场景配置，包含用 Mustache {{title}} 标记的可替换部分
}
```

#### 示例：悬念开场预设

```json
{
  "id": "suspense_intro",
  "name": "悬念开场",
  "description": "暗色背景，大字逐字揭示，配合低沉旁白",
  "slots": {
    "headline": { "type": "string", "description": "主标题文字" },
    "subtitle": { "type": "string", "description": "副标题（可选）" },
    "bgType": { "type": "string", "description": "背景类型", "default": "dark-neon" }
  },
  "template": {
    "id": "intro",
    "type": "intro",
    "durationSec": 3,
    "background": { "type": "{{bgType}}" },
    "elements": [
      {
        "id": "headline",
        "type": "animated-text",
        "props": { "text": "{{headline}}", "fontSize": "72px" },
        "layout": { "align": "center" },
        "animation": {
          "type": "char-fly-in",
          "timeline": { "inSec": 0.3, "durationSec": 1.5 },
          "stagger": { "delayPerChild": 3 }
        }
      }
    ]
  }
}
```

#### LLM 使用方式

在 system prompt 中注入预设摘要：

```
你可以使用以下场景预设来快速构建场景。只需指定 preset + 填写 slots：

1. suspense_intro — 悬念开场。slots: headline, subtitle, bgType
2. data_highlight — 数据高光。slots: metric, label, chartData[]
3. feature_showcase — 功能展示。slots: title, features[]
4. comparison — 对比展示。slots: leftTitle, rightTitle, rows[]
5. outro_cta — 结尾行动号召。slots: headline, ctaText, logoUrl
```

LLM 生成：

```json
{
  "id": "intro",
  "preset": "suspense_intro",
  "slots": {
    "headline": "这个项目改变了世界",
    "bgType": "fluid-aurora"
  }
}
```

Python 侧 `resolve_preset()` 展开：

```python
def resolve_preset(bp: dict) -> dict:
    """将 preset + slots 展开为完整 SceneConfig"""
    for scene in bp["scenes"]:
        if "preset" in scene:
            preset = load_preset(scene["preset"])
            scene_config = render_template(preset.template, scene["slots"])
            scene.update(scene_config)
            scene.pop("preset")
            scene.pop("slots")
    return bp
```

### 验收标准

- [ ] 至少 6 个预设 JSON 文件创建
- [ ] `resolve_preset()` 函数实现
- [ ] LLM prompt 中注入预设摘要
- [ ] 现有模板（dark-neon 等）可作为预设基础

---

## 改动 11：验证钩子（Validation Hooks）

### 问题

LLM 输出直接扔给 Remotion 渲染，可能包含时间轴不合法（子动画超出场景时长）、字幕帧溢出等错误。

### 方案

#### Python 侧验证层

在 `normalize_blueprint()` 之后、渲染之前，插入 `validate_blueprint()` 校验：

```python
# backend/src/domain/visual_blueprint/validate.py

class BlueprintValidationError(Exception):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Blueprint validation failed: {errors}")

def validate_blueprint(bp: dict) -> None:
    """校验 normalize 后的帧模式 JSON。

    Raises:
        BlueprintValidationError: 校验失败时抛出，包含所有错误列表
    """
    errors: list[str] = []

    for scene in bp["scenes"]:
        scene_duration = scene["durationInFrames"]

        # 1. 子元素动画时长不能超出场景
        for elem in scene.get("elements", []):
            _validate_element_timeline(elem, scene_duration, errors)

        # 2. 字幕帧不能超出场景
        for token in scene.get("subtitles", {}).get("tokens", []):
            if token["toFrame"] > scene_duration:
                errors.append(
                    f"场景 {scene['id']}: 字幕 '{token['text']}' toFrame={token['toFrame']} "
                    f"超出场景时长 {scene_duration}"
                )

        # 3. 音效触发帧不能超出场景
        for trigger in scene.get("sfx", []):
            if trigger["atFrame"] > scene_duration:
                errors.append(
                    f"场景 {scene['id']}: 音效 '{trigger['sfx']}' atFrame={trigger['atFrame']} "
                    f"超出场景时长 {scene_duration}"
                )

        # 4. 旁白时间合法性
        vo = scene.get("voiceover")
        if vo and vo.get("endFrame"):
            if vo["endFrame"] > scene_duration:
                errors.append(
                    f"场景 {scene['id']}: 旁白 endFrame={vo['endFrame']} "
                    f"超出场景时长 {scene_duration}"
                )

    if errors:
        raise BlueprintValidationError(errors)

def _validate_element_timeline(elem: dict, scene_duration: int, errors: list):
    """递归校验元素动画时间轴"""
    anim = elem.get("animation")
    if anim:
        timeline = anim.get("timeline", {})
        in_frame = timeline.get("inFrame", 0)
        duration = timeline.get("duration", scene_duration)
        end = in_frame + duration
        if end > scene_duration:
            errors.append(
                f"元素 {elem['id']}: 动画结束帧 {end} 超出场景时长 {scene_duration}"
            )
        # loop delay 校验
        loop_delay = anim.get("loopStartDelay", 0)
        if loop_delay + duration > scene_duration:
            errors.append(
                f"元素 {elem['id']}: loop 开始帧 {duration + loop_delay} 超出场景时长"
            )
    for child in elem.get("children", []):
        _validate_element_timeline(child, scene_duration, errors)
```

#### 自愈机制

校验失败时，提供两种修复路径：

```python
def auto_fix_blueprint(bp: dict) -> dict:
    """自动修正常见错误：

    1. 字幕 toFrame 超出 → 截断到 scene_duration
    2. 动画 duration 超出 → 缩短到 scene_duration - inFrame
    3. 音效 atFrame 超出 → 截断到 scene_duration - 1
    4. 旁白 endFrame 超出 → 截断到 scene_duration
    """
    for scene in bp["scenes"]:
        dur = scene["durationInFrames"]
        # ...逐项修正
    return bp

def validate_and_fix(bp: dict) -> dict:
    """校验 + 自愈 + 重新校验。如果自愈后仍有错误，抛异常"""
    try:
        validate_blueprint(bp)
        return bp
    except BlueprintValidationError:
        bp = auto_fix_blueprint(bp)
        validate_blueprint(bp)  # 二次校验，仍有问题则抛异常
        return bp
```

#### Pipeline 集成

在 `blueprint_composer.py` 或渲染入口调用：

```python
# pipeline 流程
blueprint_dict = llm_generate_blueprint(...)
blueprint_dict = normalize_blueprint(blueprint_dict)
blueprint_dict = validate_and_fix(blueprint_dict)   # 新增
render(blueprint_dict)
```

### 验收标准

- [ ] `validate_blueprint()` 覆盖 4 类时间轴校验
- [ ] `auto_fix_blueprint()` 能自动修正截断类错误
- [ ] `validate_and_fix()` 集成到 pipeline
- [ ] 校验失败时日志输出具体错误位置（场景ID + 元素ID + 字段）

## v1 → v2 破坏性变更说明

**时间字段全面替换为秒，不兼容 v1 帧字段。** 这是一次 breaking change。

### 迁移策略

1. **Python Pydantic 实体**：所有 `xxxFrame` → `xxxSec`，类型 `int` → `float`
2. **TypeScript 类型**：`normalize_blueprint()` 输出的 JSON 包含帧字段，Remotion TS 类型保持帧字段不变
3. **Zod schema**：保持帧字段校验（normalize 输出的是帧）
4. **LLM prompt**：更新 system prompt，只使用秒模式
5. **现有模板**（dark-neon, tech-launch 等）：需将帧值手动改为秒值
6. **normalize_blueprint()**：作为 Python → Remotion 的唯一桥梁，在 pipeline 中自动调用
