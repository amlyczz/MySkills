# V4 空间态 + 波普动感引擎 — 统一分析 & 实施计划

> 基于 Chrome Skills (动感波普风) + Google Flow (空间 UI 态) + Compositing P2 残留
> 日期：2026-05-21
> 实施状态：P0 ✅ + P1 ✅ — P2 跳过（DeviceFrame/变速/Vision 属于未来增强）

---

## 一、视频拆解来源

| 视频 | 风格 | 核心特征 |
|------|------|---------|
| Chrome Skills | 动感波普风 (Kinetic Pop) | 打字替换、甩镜头、卡片群飞入 |
| Google Flow | 空间 UI (Spatial UI) | 3D Z 轴穿梭、富文本实体胶囊、生成态模拟 |
| 前序 P2 残留 | Compositing 增强 | DeviceFrame、时间变速 |

---

## 二、7 个新维度分析

### 维度 1：动态排印状态机 (Kinetic Typography Engine)

**来源**：Chrome Skills 0:05 — 文字"选中→删除→替换"

**拆解**：
- 打字阶段（type）: 逐字出现
- 高亮阶段（highlight）: 虚拟色块从左到右覆盖文字，文字颜色反转
- 删除阶段（delete）: 逐字消失
- 替换阶段（type）: 新词逐字出现 + 闪烁光标

**与现有系统融合**：
- 新增 `KineticText` 组件
- `LayoutProps` 新增 `actionSequence` 字段
- 可作为独立布局 `kinetic-typography`，也可嵌入其他布局的 `subtitle` 槽位

**模板化价值**：极高。LLM 只需输出痛点词+方案词，系统自动渲染"先删旧痛点，再打新方案"的视觉冲击。

**实施复杂度**：中。~80 行组件 + actionSequence 类型。

---

### 维度 2：甩镜头转场 (Whip-Pan Transition)

**来源**：Chrome Skills 0:11 — 定向动态模糊加速

**拆解**：
- 加速阶段：元素从正常速度加速到极快，同时 `filter: blur()` 随速度线性增加
- 匀速段：最大模糊维持
- 减速段：速度降回正常，模糊衰减到 0

**实现方案**：`WhipPanTransition` 组件包裹两个场景之间的过渡，通过 `useCurrentFrame` 计算速度 → 映射 blur + translateX/Y。

**与现有系统融合**：
- 新增到 `segments[].transition_in` / `transition_out` 枚举（`whip-pan-left`）
- 或作为独立的 `<Transition>` Sequence 夹在两个场景之间

**实施复杂度**：低。~40 行组件。

---

### 维度 3：多图层空间阵列 (Floating Grid / Card Swarm)

**来源**：Chrome Skills 0:21 — 卡片从四面八方飞入形成网格

**拆解**：
- 每张卡片有初始随机位置（从屏幕四角外）→ 弹簧吸附到目标网格位置
- 错峰延迟（staggerDelay = index × 8 帧）
- 飞行路径带轻微弧线（X/Y 不同弹簧参数产生弧线轨迹）

**实现方案**：`FloatingGrid` 组件。输入 `items: Array<{src, label}>` + `columns: 3`，输出网格布局。

**与现有系统融合**：
- 新布局 `floating-grid`
- 复用 `useEntrance` / `useLifecycle` 的 spring 体系
- grid 坐标计算：`col = index % cols`, `row = Math.floor(index / cols)`

**实施复杂度**：中。~70 行组件。

---

### 维度 4：Z 轴穿梭运镜 (Z-Axis Fly-Through Carousel)

**来源**：Google Flow 0:48 — 摄像机穿透排成一列的图片

**拆解**：
- CSS `perspective: 1000px` + `transformStyle: 'preserve-3d'`
- 每张图片初始 Z = -(index × 1200)，逐帧 +cameraSpeed
- 透明度曲线：远处淡入 → 眼前清晰 → 掠过镜头后淡出
- 动态模糊伪装景深

**实现方案**：`ZAxisFlyThrough` 组件。输入 `images` 数组 + `cameraSpeed`。

**与现有系统融合**：
- 新布局 `fly-through`
- 纯 CSS 3D transform，无需额外依赖

**实施复杂度**：中。~60 行组件。

---

### 维度 5：富文本内联实体胶囊 (Inline Entity Pill)

**来源**：Google Flow 0:22 — 输入框内 `@Betta` 渲染为带缩略图的胶囊组件

**拆解**：
- 输入文本为混合数组：`['add ', Pill(type="character"), ' to my ', Pill(type="environment")]`
- Pill 组件：毛玻璃底色 + 缩略图/视频 + 文字 + 圆角
- 每个 Pill 有自己的 stagger 入场动画

**实现方案**：`PromptInput` 布局。输入 `rawPrompt` + `entities` 映射表，代码自动替换占位符。

**与现有系统融合**：
- 新布局 `prompt-input`
- EntityPill 复用 CardGrid 的毛玻璃/混合模式样式

**实施复杂度**：中。~80 行组件。

---

### 维度 6：多阶段生成态模拟 (Generative State Machine)

**来源**：Google Flow 0:45 — 毛玻璃空态 → 进度% → 模糊 → 瞬间清晰

**拆解**：
- Stage 1 (0-40f): 骨架屏 — 毛玻璃空卡片 + 微弱脉冲
- Stage 2 (40-80f): 进度数字从 0% 递增到 100%
- Stage 3 (80-100f): 图片出现但极其模糊（blur: 20px）
- Stage 4 (100-120f): 瞬间清晰（spring blur: 20→0）

**实现方案**：`GenerativeReveal` wrapper 组件。输入 `stages` 数组 + 最终内容 children。

**与现有系统融合**：
- 新 wrapper 组件 `wrappers/GenerativeReveal.tsx`
- 可包裹任何内容（图片、卡片、视频）
- 状态机由 `useCurrentFrame` 驱动

**实施复杂度**：中。~70 行组件。

---

### 维度 7：景深夹心合成 (Z-Depth Sandwich)

**来源**：Google Flow 0:31 — 文字夹在背景图和前景 UI 之间

**拆解**：
- 三层 z-index 控制：背景层（z:0） < 文字层（z:10） < 前景 UI 层（z:20）
- 当前 SceneBase 已有三层结构，只需在特定布局中暴露中间文字层

**实现方案**：`SandwichText` 布局 — 背景 + 居中大字 + 前景 UI 卡片。

**与现有系统融合**：
- 新布局 `sandwich-text`
- 本质上是对现有三层结构的语义化封装

**实施复杂度**：低。~50 行组件。

---

## 三、前序 P2 残留（Compositing Workflow 未完成项）

| # | 项目 | 说明 |
|---|------|------|
| P2-1 | DeviceFrame 3D 设备外壳 | 手机/笔记本 3D 模型 + 屏幕贴图 |
| P2-2 | 时间变速（speed remapping） | ffmpeg 预处理：素材指定片段加速/减速 |
| P2-3 | Vision 自动坐标提取 | 分析视频帧 → 识别按钮/光标 → focusPoint |

---

## 四、实施优先级

### P0 — 核心视觉 ✅

| # | 维度 | 组件 | 文件 | 状态 |
|---|------|------|------|------|
| 1 | 动态排印 | `KineticText` | `layouts/KineticText.tsx` | ✅ |
| 2 | 甩镜头转场 | `WhipPanTransition` | `components/WhipPanTransition.tsx` | ✅ |
| 3 | 卡片群飞入 | `FloatingGrid` | `layouts/FloatingGrid.tsx` | ✅ |
| 4 | Z 轴穿梭 | `ZAxisFlyThrough` | `layouts/ZAxisFlyThrough.tsx` | ✅ |
| 5 | 实体胶囊 | `PromptInput` | `layouts/PromptInput.tsx` | ✅ |
| 6 | 生成态模拟 | `GenerativeReveal` | `wrappers/GenerativeReveal.tsx` | ✅ |

### P1 — 类型 + 注册 ✅

| # | 项目 | 工作量 |
|---|------|--------|
| 7 | LayoutType 新增 6 个枚举值 | ~6 行 |
| 8 | LayoutDispatcher 注册 | ~12 行 |
| 9 | `actionSequence` / `entities` / `generativeStages` 入类型 | ~30 行 |
| 10 | 管线透传（VideoComposer → SceneBase → LayoutDispatcher） | ~20 行 |

### P2 — 未来增强

| # | 项目 | 优先级 |
|---|------|--------|
| 11 | DeviceFrame 3D 外壳 | 低 |
| 12 | 时间变速 ffmpeg | 低 |
| 13 | Vision 自动坐标提取 | 低 |
| 14 | SandwichText 布局 | 低 |

---

## 五、JSON Schema 扩展

```json
{
  "sceneConfigs": {
    "scene-kinetic": {
      "layoutId": "kinetic-typography",
      "content": {
        "baseText": "No more",
        "actionSequence": [
          { "type": "type", "text": "retyping", "frames": 30 },
          { "type": "highlight", "color": "#1A73E8", "frames": 10 },
          { "type": "delete", "frames": 10 },
          { "type": "type", "text": "frequent prompts", "frames": 40 }
        ]
      }
    },
    "scene-cards": {
      "layoutId": "floating-grid",
      "transitionIn": { "type": "whip-pan", "direction": "left" },
      "content": {
        "items": [
          { "src": "card-1.png", "label": "Skill A" },
          { "src": "card-2.png", "label": "Skill B" }
        ]
      }
    },
    "scene-flythrough": {
      "layoutId": "fly-through",
      "content": {
        "images": ["gen-1.jpg", "gen-2.jpg", "gen-3.jpg"],
        "cameraSpeed": "hyper"
      }
    },
    "scene-prompt": {
      "layoutId": "prompt-input",
      "content": {
        "rawPrompt": "add {entity1} to my {entity2}",
        "entities": {
          "entity1": { "type": "character", "name": "Betta", "thumb": "fish.jpg" },
          "entity2": { "type": "environment", "name": "Apartment", "thumb": "apt.mp4" }
        }
      }
    },
    "scene-generate": {
      "layoutId": "hero-center",
      "generativeStages": [
        { "stage": "skeleton", "frames": 40 },
        { "stage": "progress", "start": 0, "end": 100, "frames": 40 },
        { "stage": "resolve", "blurStart": 20, "frames": 20 }
      ]
    }
  }
}
```

---

## 六、System Prompt 融入设计 — LLM 作为导演大脑

### 6.1 核心理念：表现与逻辑解耦

Gemini 设计的 System Prompt 与我们已有的 `moodStrategy` 映射表完美契合。三条核心设计原则：

| 原则 | Gemini 设计 | 我们已有的实现 |
|------|-----------|-------------|
| 约束变量 (Arsenal) | 枚举锁死 layoutType | ✅ `LayoutType` 枚举（10 种） |
| 行业常识 (Cinematography) | 硬编码导演规则 | ❌ 需新增——当前无 |
| 动态属性剥离 (Motion Profile) | LLM 输出语义，代码映射物理参数 | ✅ `moodStrategy` `{power, elegant, professional, calm}` |

### 6.2 融入方式

**不需要额外代码**。System Prompt 是一段配置文本，放在 LLM 调用时注入。

两层映射关系：

```
LLM 输出                         系统映射
─────────────────────────────────────────────────
layoutType: "HeroCenter"    →   直接用（LayoutDispatcher）
layoutType: "AnimatedBarChart" → stat-highlight 布局 + chartData
layoutType: "UI_MagicWorkflow" → center-focus-video + GlowContainer + VirtualCamera
layoutType: "KineticTypography" → kinetic-typography（新增）
layoutType: "ZAxisFlyThrough"  → fly-through（新增）
layoutType: "SmartPromptInput" → prompt-input（新增）

motionProfile: "SpringPop"  →    moodStrategy.power → spring-elastic
motionProfile: "SmoothSlideUp" → moodStrategy.elegant → smooth-scale-up + ease-out-expo
motionProfile: "WhipPan"    →    whip-pan transition（新增）
motionProfile: "FadeIn"     →    scale-fade

theme.mode: "dark"          →    自动选 dark-purple / tech-grid 等暗色主题
theme.mode: "light"         →    自动选 light-teal / paper-light 等亮色主题
```

### 6.3 System Prompt 建议（中文版）

```markdown
# 角色：视频导演 & 动效数据架构师

你是顶级商业视频导演。你的任务是把用户输入（产品/URL/脚本）翻译成 JSON，
驱动 Remotion 渲染引擎。

## 武器库（只能用这些，禁止自创）

以下是引擎支持的 layoutType，你必须从中选择：

1. `hero-center` — 居中大字，宣言式。Hook/CTA 场景首选。
2. `stat-highlight` — 数据证明。配合 chartData 使用柱状图。
3. `center-focus-video` — UI 演示。包裹录屏 + GlowContainer + 虚拟摄像机运镜。
4. `kinetic-typography` — 动态排印。打字→选中→删除→替换。
5. `fly-through` — 3D Z 轴穿梭。相册/案例集展示。
6. `prompt-input` — AI 对话模拟。富文本实体胶囊。
7. `floating-grid` — 卡片群飞入。功能矩阵展示。
8. `card-grid` — 静态卡片网格。
9. `code-display` — 代码展示。
10. `split-left-text` — 左文右图。

## 导演规则（铁律）

- **前三秒必须是 Hook**：用 hero-center 或 kinetic-typography，≤90 帧（1.5s）。
- **标题不超过 8 个词**：视频是视觉媒介，不是文章。
- **每场景 ≤ 300 帧（5s）**：快节奏。超过 5 秒的场景拆成两个。
- **情绪 → 动效映射**：
  - 数据冲击/性能证明 → `mood: "power"`（弹簧回弹）
  - 优雅愿景/品牌落版 → `mood: "elegant"`（贝塞尔缓动）
  - 功能介绍/稳重专业 → `mood: "professional"`
  - 结尾致谢/平和安静 → `mood: "calm"`
- **结构选择**：
  - 有 benchmark 数据 → `structure: "performance-launch"`
  - 有录屏素材 → showcase 场景用 `center-focus-video`
  - 纯功能介绍 → `structure: "funnel"`

## 输出约束

1. 只输出 JSON。不要 markdown 代码块、不要解释文字。
2. JSON 严格符合 content.schema.json（Layer 0 输出格式）。
3. 默认暗色主题，除非用户指定亮色。
```

### 6.4 实操推演

用户输入：
> "我的 SaaS 叫 DataNinja，做跨境电商数据分析。卖点：1. 抛弃 Excel；2. 一键生成选品图表；3. AI 识别爆款。做个视频。"

LLM 思维链（注入 System Prompt 后）：

1. "抛弃 Excel" → `kinetic-typography`：打出 "Excel"，高亮删除，替换为 "DataNinja"
2. "一键生成图表" → 适合 `stat-highlight` / `AnimatedBarChart`：对比前后效率数据
3. "AI 识别爆款" → `center-focus-video`：产品录屏 + GlowContainer + 运镜推近
4. 结构 → `performance-launch`（4 段式，2 个 proof 数据场景）
5. 情绪 → `mood: "power"`（SaaS/数据类产品）

LLM 输出（content.json 节选）：
```json
{
  "content": {
    "title": "DataNinja",
    "tagline": "抛弃 Excel，AI 驱动的选品引擎",
    "points": ["一键生成选品图表", "AI 识别爆款", "实时竞品分析"],
    "chartData": [
      {"label": "选品效率", "value": 85, "previousValue": 32},
      {"label": "爆款识别准确率", "value": 92, "previousValue": 45}
    ]
  },
  "meta": { "structure": "performance-launch", "mood": "power" }
}
```

### 6.5 与现有 pipeline 的整合点

```
用户输入 → System Prompt 注入 → LLM 生成 content.json
  → Layer 0: content-generator 保存
  → Layer 1: material-collector 采集素材
  → Layer 2: timeline-composer 编排时间线（mood → seg type + BGM/SFX）
  → Layer 3: video-renderer 渲染（mood → motion strategy）
  → Layer 4: post-producer 最终合成
```

**关键**：`mood` 和 `structure` 通过 content.json → allocate.py → VideoConfig 全链路透传，LLM 不需要知道物理参数。

---

## 七、与现有系统关系

全部新增组件为**增量**，不影响现有 5 结构、12 主题、10 布局、16 动效。

```
新增目录：
video-renderer/remotion/src/
├── layouts/
│   ├── KineticText.tsx        ← 新增
│   ├── FloatingGrid.tsx       ← 新增
│   ├── ZAxisFlyThrough.tsx    ← 新增
│   ├── PromptInput.tsx        ← 新增
│   └── ...
├── components/
│   ├── WhipPanTransition.tsx  ← 新增
│   └── ...
├── wrappers/
│   ├── GlowContainer.tsx      ← 已有
│   ├── GenerativeReveal.tsx   ← 新增
│   └── ...
└── layouts/index.tsx          ← 扩展 6 个 case
```

---

## 八、音频驱动视觉 (AV Sync) — 分析

### 8.1 核心理念

LLM 不"听"音乐，LLM 只下达指令。真正的 FFT 音频解析由 Remotion 在渲染时通过 `@remotion/media-utils` 实时演算。

**分工**：
- **LLM（大脑）**：指定音频文件 + 频段偏好（`bass`/`treble`）+ 爆发强度
- **Remotion（四肢）**：逐帧读取 FFT 频谱数据 → 能量值 0~1 → 注入动画公式

### 8.2 与当前音频系统的关系

我们已有**两层音频控制**，AV Sync 是第三层：

| 层 | 粒度 | 控制方式 | 已有？ |
|---|------|---------|-------|
| 1. 编排层 | segment 级 | `timeline.json audio.bgm_volume` + `sfx[]` | ✅ |
| 2. 混音层 | 全局 | `audio_mixer.py` sidechain ducking + BGM envelope | ✅ |
| 3. 反应层 | **帧级** | FFT 能量 → 视觉参数实时调制 | ❌ 新增 |

三者互补不冲突。编排层设基线音量，混音层做人声闪避，反应层让画面"踩点"。

### 8.3 新增组件

| # | 组件 | 文件 | 功能 |
|---|------|------|------|
| 1 | `useAudioEnergy` hook | `hooks/useAudioEnergy.ts` | FFT 频段能量萃取（bass/treble/full） |
| 2 | `AudioReactive` wrapper | `wrappers/AudioReactive.tsx` | 全局音频反应容器（呼吸缩放 + 色差分离） |

### 8.4 useAudioEnergy 设计

```ts
// hooks/useAudioEnergy.ts
function useAudioEnergy(
  audioSrc: string,
  frequencyBand: 'bass' | 'treble' | 'full' = 'bass',
  smoothing: number = 1.5
): number  // 返回 0~1 的能量值
```

利用 `@remotion/media-utils` 的 `useAudioData()` + `visualizeAudio()`：
1. `useAudioData(audioSrc)` — 加载并解析完整音频
2. `visualizeAudio({ fps, frame, audioData, numberOfSamples: 64 })` — 64 频段 FFT
3. 频段切片：bass → [0:5], treble → [40:60], full → [0:64]
4. 归一化：`Math.min(1, avgEnergy * smoothing)`

### 8.5 对现有组件的增强

`useAudioEnergy` 是正交 hook，可注入任何已有组件：

```tsx
// ZAxisFlyThrough — 鼓点驱动穿梭速度
const energy = useAudioEnergy(globalAudio, 'bass');
const burstSpeed = 20 + (energy * 100 * burstIntensity);

// SceneBase — 鼓点驱动全局呼吸
const globalScale = 1 + (energy * 0.15);

// AnimatedBarChart — 鼓点触发柱子二次弹跳
const kickBounce = energy > 0.7 ? spring({ ... }) : 0;

// CardGrid — 鼓点触发卡片光晕脉冲
const glowPulse = 1 + (energy * 0.5);
```

### 8.6 色差分离特效 (Chromatic Aberration)

鼓点极强时（energy > 0.8）触发：
```css
filter: drop-shadow(4px 0 0 rgba(255,0,0,0.5))
        drop-shadow(-4px 0 0 rgba(0,255,255,0.5));
```

模拟镜头震动/色散，增强打击感。

### 8.7 JSON Schema 扩展

在 `timeline.json` 的 `global` 中新增：

```json
{
  "global": {
    "audioTrack": "assets/cyber-beat-120bpm.mp3",  // 新增
    "audioReact": {                                  // 新增
      "enabled": true,
      "frequencyBand": "bass",
      "burstIntensity": 2.5,
      "chromaticAberration": true
    }
  }
}
```

按场景覆盖（scene 级优先级高于 global）：
```json
{
  "segments": [{
    "audioReact": {
      "frequencyBand": "treble",
      "burstIntensity": 1.5
    }
  }]
}
```

### 8.8 System Prompt 扩展

LLM 新增一个语义级选择：

```
- **音频反应**（可选）：选择 BGM 后，指定画面如何跟随音乐：
  - `audioReact: "bass-heavy"` → 低频鼓点驱动（适合电子/摇滚/Hip-Hop）
  - `audioReact: "treble-light"` → 高音驱动（适合古典/钢琴/轻音乐）
  - `audioReact: "none"` → 仅编排层 BGM 音量控制
```

### 8.9 实施优先级

| # | 项目 | 工作量 | 优先级 |
|---|------|--------|--------|
| 1 | `useAudioEnergy` hook | ~40 行 | P0 |
| 2 | `AudioReactive` wrapper | ~50 行 | P0 |
| 3 | 注入 ZAxisFlyThrough + SceneBase | ~20 行/组件 | P0 |
| 4 | timeline schema 扩展 audioTrack/audioReact | ~15 行 | P1 |
| 5 | `@remotion/media-utils` 依赖安装 | `npm install` | P0 |

---

## 九、最终：完整武器库清单

经过 4 支顶级视频拆解 + System Prompt + AV Sync，系统全部能力：

### 叙事结构（5 种）
`funnel` | `timeline` | `product-showcase` | `performance-launch` | 自由组合

### 布局模板（10 种，现有 7 + v4 新增 3）

| 现有 | 新增 |
|------|------|
| `hero-center` | `kinetic-typography` |
| `split-left-text` | `floating-grid` |
| `media-full` | `fly-through` |
| `card-grid` | `prompt-input` |
| `stat-highlight` | `center-focus-video` (v3) |
| `quote-style` | `sandwich-text` (P2) |
| `code-display` | |

### 动效预设（16 种）

12 现有 + 3 v3 弹性 + 1 v4 whip-pan

### 背景（5 种）

`starfield` | `bokeh` | `geometric` | `pixel` | `fluid-gradient`

### Wrapper（3 种）

`GlowContainer` | `GenerativeReveal` | `AudioReactive`

### 组件（4 种）

`AnimatedBarChart` | `ChapterProgressBar` | `VirtualCamera` | `WhipPanTransition`

### Hook（3 种）

`useEntrance` | `useLifecycle` | `useBezierAnim` | `useAudioEnergy`

### 语义映射

`mood` (power/elegant/professional/calm) → motion + bezier
`audioReact` (bass-heavy/treble-light/none) → FFT band + intensity
`structure` → scene sequence
