# Spec: 视频宣传片模板化系统重构

## 问题陈述

当前 gh-video-recorder 的模板系统存在以下局限性：

1. **结构固化**：只有 Intro + 素材拼接 + Outro 的线性结构，无法表达"漏斗型叙事"（Hook → Problem → Solution → Features → CTA）
2. **样式/主题耦合**：12 个主题是平级的色彩方案，缺少风格维度（科技风、商务风、创意风），且无法按内容自动匹配
3. **布局硬编码**：Intro 和 Outro 各自只有一个居中对称布局，无法按内容类型匹配不同布局（左右分栏、全屏图文、卡片网格等）
4. **动效散落**：spring 参数和 timing 常量集中在 `animations.ts`，但动效类型有限（入场滑入/淡入/缩放），缺少丰富的动效模板库
5. **匹配能力缺失**：当前只有 `recommendTheme()` 做简单关键词匹配，无法实现 LLM 驱动的「内容 → 样式 + 布局 + 动效」全链路自动匹配

**目标**：将当前"硬编码的固定模板"重构为"可组合、可扩展、可自动匹配的模板化系统"，使 code agent 能根据输入内容智能组装视频。

---

## 一、整体架构：五层可组合模板系统

```
┌─────────────────────────────────────────────────────────────────┐
│  L5  匹配引擎 (Matching Engine)                    【决策层】   │
│       LLM/code agent 根据内容 → 选择结构+样式+布局+动效+音频     │
├─────────────────────────────────────────────────────────────────┤
│  L4  结构模板 (Structure Templates)                 【视频级】   │
│       漏斗型 / 时间线型 / 故事型 / 产品展示型                    │
│       定义场景序列，每场景声明所需的内容槽位 (content slots)       │
│       ★ 作用域 = 整个视频（一套结构模板定义完整的场景排列）       │
├─────────────────────────────────────────────────────────────────┤
│  L3  样式模板 (Style Templates)                     【视频级】   │
│       科技风 / 商务风 / 创意风 / 极简风 / 活力风                 │
│       包含色彩方案 + 字体方案 + 装饰系统                          │
│       ★ 作用域 = 整个视频（统一的视觉身份 / "皮肤"）             │
├─────────────────────────────────────────────────────────────────┤
│  L2  布局模板 (Layout Templates)                    【场景级】   │
│       每个场景独立选择布局，同一视频可混合多种布局                 │
│       居中单列 / 左右分栏 / 全屏图文 / 卡片网格 / 引用式等        │
│       ★ 作用域 = 每个场景（hook→居中, solution→左右分栏...）    │
├─────────────────────────────────────────────────────────────────┤
│  L1  动效模板 (Motion Templates)                    【元素级】   │
│       每个内容元素（标题/副标题/列表项/URL...）独立选择入场动效    │
│       弹性滑入 / 弧线入场 / 打字机 / 渐显缩放 / 粒子消散等        │
│       ★ 作用域 = 每个组件/元素（标题→弧线, 列表项→弹性上滑...） │
├─────────────────────────────────────────────────────────────────┤
│  A   听觉系统 (Audio System)                      【横切层】    │
│       A3 BGM 背景音乐  【视频级】 整片铺底 + 音量曲线             │
│       A2 SFX 音效      【元素级】 与动效 timing 精确绑定          │
│       A1 Voiceover     【场景级+】 拆段对齐到元素入场帧           │
│       ★ 横切于视觉四层，音频时间轴与视频帧严格同步               │
└─────────────────────────────────────────────────────────────────┘
```

**作用域速记**：结构 = 骨架（视频级）→ 样式 = 皮肤（视频级）→ 布局 = 房间格局（场景级）→ 动效 = 家具怎么摆进来（元素级）→ 音频 = 背景音乐+脚步声+旁白（横切层）

核心思想：**每层独立定义、独立扩展，通过组合产生无穷变化**。

---

## 二、结构模板 (Structure Templates) — L4

### 2.1 设计原理

将视频视为一个**场景序列**，每个场景是一个独立的 Remotion `<Sequence>` 组件。结构模板定义的是"场景的排列和时长"，而非视觉呈现。

### 2.2 数据结构

```typescript
// structure.ts
interface SceneDef {
  id: string;                    // 场景唯一标识
  type: SceneType;               // 场景类型 → 决定可用的布局选项
  durationSeconds: number;       // 该场景时长
  contentSlots: ContentSlot[];   // 该场景需要的内容槽位
  requiredAssets?: AssetType[];  // 该场景需要的素材类型
}

type SceneType =
  | 'hook'        // 黄金三秒：视觉冲击 + 核心信息
  | 'problem'     // 痛点共鸣
  | 'solution'    // 方案亮相
  | 'feature'     // 功能亮点（可多个）
  | 'proof'       // 数据证明 / 用户评价
  | 'cta'         // 行动呼吁（即 outro）
  | 'transition'  // 场景间过渡
  | 'showcase';   // 素材展示（视频/图片/滚动录屏）

type AssetType = 'video' | 'image' | 'scroll_recording';

interface ContentSlot {
  name: string;          // 槽位名：title / subtitle / body / image / video / stats
  type: 'text' | 'media';
  required: boolean;
  maxLines?: number;     // 文本最大行数（用于布局计算）
}
```

### 2.3 预置结构模板

#### 漏斗型 (Funnel) — 首个实现

```typescript
const funnelStructure: StructureTemplate = {
  id: 'funnel',
  name: '漏斗型叙事',
  scenes: [
    {
      id: 'hook',
      type: 'hook',
      durationSeconds: 5,
      contentSlots: [
        { name: 'headline', type: 'text', required: true, maxLines: 2 },
        { name: 'visual', type: 'media', required: false },
      ],
    },
    {
      id: 'problem',
      type: 'problem',
      durationSeconds: 6,
      contentSlots: [
        { name: 'title', type: 'text', required: true, maxLines: 1 },
        { name: 'points', type: 'text', required: true, maxLines: 4 },
      ],
    },
    {
      id: 'solution',
      type: 'solution',
      durationSeconds: 6,
      contentSlots: [
        { name: 'title', type: 'text', required: true, maxLines: 1 },
        { name: 'subtitle', type: 'text', required: false, maxLines: 2 },
        { name: 'visual', type: 'media', required: false },
      ],
    },
    {
      id: 'showcase',
      type: 'showcase',
      durationSeconds: 0, // 动态：由素材量决定
      requiredAssets: ['video', 'image', 'scroll_recording'],
      contentSlots: [],   // 由 allocate 动态填充
    },
    {
      id: 'features',
      type: 'feature',
      durationSeconds: 8,
      contentSlots: [
        { name: 'title', type: 'text', required: true, maxLines: 1 },
        { name: 'points', type: 'text', required: true, maxLines: 5 },
      ],
    },
    {
      id: 'cta',
      type: 'cta',
      durationSeconds: 6,
      contentSlots: [
        { name: 'url', type: 'text', required: true },
        { name: 'stats', type: 'text', required: false },
        { name: 'summary', type: 'text', required: false, maxLines: 3 },
      ],
    },
  ],
};
```

#### 未来扩展：时间线型、故事型、产品展示型

```typescript
// 时间线型：适合 changelog / 版本演进
const timelineStructure: StructureTemplate = {
  id: 'timeline',
  name: '时间线叙事',
  scenes: [
    { id: 'intro', type: 'hook', ... },
    { id: 'milestone-1', type: 'feature', ... },
    { id: 'milestone-2', type: 'feature', ... },
    { id: 'showcase', type: 'showcase', ... },
    { id: 'cta', type: 'cta', ... },
  ],
};
```

### 2.4 渲染逻辑

```typescript
// VideoComposer.tsx
export const VideoComposer: React.FC<{ config: VideoConfig }> = ({ config }) => {
  let currentFrame = 0;
  const { structure, scenes } = config;

  return (
    <>
      {structure.scenes.map((sceneDef) => {
        const startFrame = currentFrame;
        const durationFrames = sceneDef.durationSeconds * config.fps;
        currentFrame += durationFrames;

        // 匹配该场景的布局模板
        const layout = config.sceneConfigs[sceneDef.id].layout;
        // 匹配该场景的动效模板
        const motion = config.sceneConfigs[sceneDef.id].motion;

        return (
          <Sequence
            key={sceneDef.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <SceneRenderer
              sceneDef={sceneDef}
              sceneConfig={config.sceneConfigs[sceneDef.id]}
              style={config.style}
              layout={layout}
              motion={motion}
            />
          </Sequence>
        );
      })}
    </>
  );
};
```

---

## 三、样式模板 (Style Templates) — L3

### 3.1 设计原理

当前 `themes.ts` 中的 12 个主题实际上是"颜色方案"。重构后，样式模板 = **颜色方案 + 字体方案 + 装饰系统**。样式模板按"风格族"分组，每个族下多个色彩变体。

### 3.2 数据结构

```typescript
// styles.ts
interface StyleTemplate {
  id: string;
  family: StyleFamily;           // 风格族
  displayName: string;
  mood: string[];                // 情绪标签，用于匹配

  // 色彩方案 (60-30-10)
  colors: {
    background: string;          // 60% 主背景
    surface: string;             // 30% 辅面色
    primary: string;             // 核心交互色
    accent: string;              // 10% 强调色
    text: string;                // 正文色
    textMuted: string;           // 辅助文字色
    divider: string;             // 分割线色
  };

  // 字体方案
  typography: {
    fontFamily: string;
    titleWeight: number;
    bodyWeight: number;
    titleLetterSpacing: number;
    titleSize: number;           // 基准值，布局可缩放
  };

  // 装饰系统
  decoration: {
    vignette: boolean;
    pattern?: 'dot-grid' | 'noise' | 'grid' | null;
    borderRadius: number;
    ruleStyle: 'solid' | 'dashed' | 'double';
    bulletChar: string;
    textTransform?: 'uppercase' | 'none';
  };

  // 默认背景动效
  defaultBgType: BgType;

  // 特殊效果
  effects?: {
    glowColor?: string;          // neon glow
    shadowPreset?: 'neon' | 'warm' | 'default';
    italicForSubtitle?: boolean;
  };
}

type StyleFamily = 'tech' | 'business' | 'creative' | 'minimal' | 'playful';
```

### 3.3 与当前 themes.ts 的映射

当前 12 个主题可直接迁移为样式模板，并补充 `family` 字段：

| 当前主题 | family | mood 标签 |
|---------|--------|----------|
| dark-purple | tech | dark, tech, professional |
| light-teal | business | light, clean, modern |
| warm-orange | playful | warm, energetic, creative |
| dark-red | business | dark, elegant, serious |
| glassmorphism | creative | modern, glassy, futuristic |
| minimal-bw | minimal | dark, minimal, stark |
| nature-green | business | warm, natural, calm |
| tech-grid | tech | dark, tech, code, data |
| warm-yellow | playful | warm, sunny, energetic |
| sakura-pink | creative | light, warm, design |
| neon-blue | tech | dark, cyber, gaming |
| matte-metal | minimal | dark, industrial, cold |

### 3.4 Tailwind CSS 可行性分析

**结论：Remotion + Tailwind 可以共存，但核心样式系统不建议直接用 Tailwind 类名。**

原因：
- Remotion 渲染在 Node.js 环境中，Tailwind CSS 的 JIT 编译需要额外配置（PostCSS 集成）
- 视频渲染对样式精度要求极高（像素级），Tailwind 的 `px` 单位粒度可能不够
- 动态主题切换需要 CSS-in-JS 的灵活性

**推荐方案**：样式模板用 TypeScript 对象定义（当前方式），`tokens.ts` 扩展为完整的 Design Token 系统。Tailwind 仅用于 Remotion Studio 的预览 UI，不用于视频渲染本身。

```typescript
// tokens.ts — 扩展为 Design Token 系统
export function resolveStyleTokens(style: StyleTemplate): StyleTokens {
  return {
    // 背景衍生
    overlayBg: overlayGradient(style),
    bgBaseColor: extractBaseColor(style.colors.background),

    // 文字衍生
    titleShadow: resolveTitleShadow(style),
    bodyColor: style.colors.text,
    mutedColor: style.colors.textMuted,

    // 装饰衍生
    underlineBg: underlineGradient(style.colors.accent),
    bulletColor: style.colors.accent,

    // 排版衍生
    titleFont: buildFontStack(style),
    titleTransform: style.decoration.textTransform,
  };
}
```

---

## 四、布局模板 (Layout Templates) — L2

### 4.1 设计原理

**核心洞察**：布局不是"每个风格一个整体布局"，而是"每个场景的每个内容区域可独立选择布局"。布局模板是**内容无关的容器组件**，接收 children 或 content props，负责空间分配和视觉层级。

### 4.2 预置布局模板

```typescript
// layouts/index.tsx
type LayoutType =
  | 'hero-center'      // 当前 Intro 风格：居中、标题突出
  | 'split-left-text'  // 左侧文案 1/3 + 右侧留空/素材 2/3
  | 'split-right-text' // 右侧文案 + 左侧素材
  | 'full-screen-text' // 全屏文字，极简
  | 'card-grid'        // 2×2 或 3×1 卡片网格
  | 'quote-style'      // 引用式：大引号 + 文字
  | 'stat-highlight'   // 大数字 + 说明文字
  | 'media-full'       // 纯素材展示（视频/图片铺满）
  | 'two-column-list'  // 双列对比列表
  | 'timeline-item';   // 时间线节点
```

### 4.3 布局组件接口

每个布局组件遵循统一接口：

```typescript
interface LayoutProps {
  // 内容
  title?: string;
  subtitle?: string;
  body?: string;
  points?: string[];
  mediaUrl?: string;
  stats?: string;

  // 布局参数
  style: StyleTokens;           // 从样式模板派生
  motion: MotionPreset;         // 从动效模板派生
  theme: StyleTemplate;         // 完整样式模板引用

  // 装饰
  showUnderline?: boolean;
  showBullet?: boolean;
}
```

### 4.4 各场景类型 → 布局推荐映射

| SceneType | 推荐布局 | 备选布局 |
|-----------|---------|---------|
| hook | hero-center | full-screen-text, media-full |
| problem | hero-center | quote-style |
| solution | split-left-text | hero-center |
| feature | hero-center | card-grid, split-left-text |
| proof | stat-highlight | card-grid |
| cta | hero-center | split-left-text |
| showcase | media-full | — |

**布局匹配逻辑**：
- 默认使用推荐布局
- 如果内容特征匹配备选布局（如 feature 场景有 4+ 要点 → card-grid），agent 可选择备选
- 同一视频内可以混合不同布局，增加视觉变化

### 4.5 布局组件示例

```typescript
// layouts/HeroCenter.tsx
export const HeroCenter: React.FC<LayoutProps> = ({
  title, subtitle, points, style, motion, theme, showUnderline = true
}) => {
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: CONTENT_PAD }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: CONTENT_MAX_WIDTH }}>
        {title && <Title text={title} style={style} motion={motion.titleMotion} />}
        {showUnderline && <Underline accentColor={theme.colors.accent} motion={motion.underlineMotion} />}
        {subtitle && <Subtitle text={subtitle} style={style} motion={motion.subtitleMotion} />}
        {points && <PointList items={points} style={style} motion={motion.pointsMotion} theme={theme} />}
      </div>
    </AbsoluteFill>
  );
};

// layouts/SplitLeftText.tsx
export const SplitLeftText: React.FC<LayoutProps> = ({
  title, subtitle, points, mediaUrl, style, motion, theme
}) => {
  return (
    <AbsoluteFill style={{ display: 'flex', padding: CONTENT_PAD }}>
      {/* 左侧 1/3 文案 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {title && <Title text={title} style={style} motion={motion.titleMotion} />}
        {points && <PointList items={points} style={style} motion={motion.pointsMotion} theme={theme} />}
      </div>
      {/* 右侧 2/3 素材/留白 */}
      <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {mediaUrl ? <MediaDisplay url={mediaUrl} /> : <div />}
      </div>
    </AbsoluteFill>
  );
};
```

---

## 五、动效模板 (Motion Templates) — L1

### 5.1 设计原理

动效模板是**可复用的动画配置包**，封装了 spring 参数、timing、缓动曲线。每个动效模板描述一个"入场 + 驻留 + 退场"的完整动画周期。

### 5.2 动效分类

```typescript
// motions.ts
type MotionType =
  // 入场动效
  | 'spring-slide-up'      // 弹性从下方滑入
  | 'spring-slide-left'    // 弹性从左侧滑入
  | 'arc-entrance'         // 弧线入场（当前标题使用的）
  | 'scale-fade'           // 缩放 + 淡入
  | 'typewriter'           // 打字机效果
  | 'reveal-mask'          // 遮罩揭示
  | 'bounce-in'            // 弹跳入场
  | 'blur-focus'           // 模糊 → 清晰
  // 退场动效
  | 'fade-out'
  | 'slide-out-left'
  | 'scale-down-out'
  | 'blur-out'
  // 驻留动效（持续微动效）
  | 'subtle-float'         // 微弱漂浮
  | 'glow-pulse'           // 光晕脉冲
  | 'none';                // 无动效
```

### 5.3 动效模板数据结构

```typescript
interface MotionPreset {
  id: string;
  name: string;

  // 入场动画
  entrance: {
    springConfig: SpringConfig;
    delayFrames: number;            // 相对场景起点的延迟
    durationFrames: number;
    enterFrom: EnterPosition;       // 入场方向/位置
  };

  // 驻留动画（可选）
  idle?: {
    type: 'float' | 'glow' | 'none';
    amplitude?: number;
    frequency?: number;
  };

  // 退场动画（可选，最后一个场景通常不需要）
  exit?: {
    type: 'fade-out' | 'slide-out' | 'scale-down';
    durationFrames: number;
  };
}

interface SpringConfig {
  mass: number;
  damping: number;
  stiffness: number;
}

type EnterPosition =
  | { type: 'translate', x: number, y: number }   // 从 (x,y) 滑入
  | { type: 'scale', from: number }                // 从 scale 比例放大
  | { type: 'arc', fromX: number, fromY: number }  // 弧线入场
  | { type: 'mask', direction: 'left' | 'right' }; // 遮罩揭示
```

### 5.4 预置动效模板

```typescript
const motionPresets: Record<MotionType, MotionPreset> = {
  'spring-slide-up': {
    id: 'spring-slide-up',
    name: '弹性上滑',
    entrance: {
      springConfig: { mass: 0.8, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 40,
      enterFrom: { type: 'translate', x: 0, y: 60 },
    },
  },
  'arc-entrance': {
    id: 'arc-entrance',
    name: '弧线入场',
    entrance: {
      springConfig: { mass: 1.0, damping: 20, stiffness: 80 },
      delayFrames: 0,
      durationFrames: 55,
      enterFrom: { type: 'arc', fromX: 40, fromY: 60 },
    },
  },
  'typewriter': {
    id: 'typewriter',
    name: '打字机',
    entrance: {
      springConfig: { mass: 1.0, damping: 100, stiffness: 200 }, // 接近线性
      delayFrames: 0,
      durationFrames: 60,
      enterFrom: { type: 'translate', x: 0, y: 0 }, // 不移动，用 clip-path 揭示
    },
  },
  'scale-fade': {
    id: 'scale-fade',
    name: '缩放淡入',
    entrance: {
      springConfig: { mass: 0.6, damping: 20, stiffness: 100 },
      delayFrames: 0,
      durationFrames: 30,
      enterFrom: { type: 'scale', from: 0.85 },
    },
  },
  // ... 更多
};
```

### 5.5 动效 Hook 封装

将动效模板封装为 React Hook，组件只需调用：

```typescript
// hooks/useMotion.ts
export function useEntrance(motion: MotionPreset, sceneFrame: number, fps: number) {
  const entranceFrame = Math.max(0, sceneFrame - motion.entrance.delayFrames);
  const progress = spring({
    frame: entranceFrame,
    fps,
    config: motion.entrance.springConfig,
  });

  const { type } = motion.entrance.enterFrom;
  let transform = '';
  let opacity = 1;

  switch (type) {
    case 'translate': {
      const { x, y } = motion.entrance.enterFrom as { type: 'translate'; x: number; y: number };
      const tx = interpolate(progress, [0, 1], [x, 0]);
      const ty = interpolate(progress, [0, 1], [y, 0]);
      transform = `translate(${tx}px, ${ty}px)`;
      opacity = interpolate(entranceFrame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
      break;
    }
    case 'arc': {
      const { fromX, fromY } = motion.entrance.enterFrom as { type: 'arc'; fromX: number; fromY: number };
      const tx = interpolate(progress, [0, 1], [fromX, 0]);
      const ty = interpolate(progress, [0, 1], [fromY, 0]);
      transform = `translate(${tx}px, ${ty}px)`;
      opacity = interpolate(entranceFrame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
      break;
    }
    case 'scale': {
      const { from } = motion.entrance.enterFrom as { type: 'scale'; from: number };
      const s = interpolate(progress, [0, 1], [from, 1]);
      transform = `scale(${s})`;
      opacity = interpolate(entranceFrame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
      break;
    }
  }

  return { transform, opacity };
}
```

---

## 六、听觉系统 (Audio System) — 横切层

### 6.1 设计原理

听觉系统不是一个纵向的"层"，而是**横切于结构/样式/布局/动效的平行维度**。音频轨道必须与视觉帧精确对齐——BGM 铺满全片，音效跟随元素入场，配音跟随场景叙事。

三个子系统的作用域完全不同：

```
┌──────────────────────────────────────────────────────────────────┐
│  A3  BGM 背景音乐                                   【视频级】    │
│      整个视频一条 BGM，控制情绪基调、节奏 BPM、音量曲线            │
├──────────────────────────────────────────────────────────────────┤
│  A2  SFX 音效                                       【元素级】    │
│      每个视觉元素的入场/转场可配一个短音效                         │
│      标题 whoosh / 列表项 ding / 下划线 swoosh / 转场 swoosh     │
│      ★ 必须与动效模板的 timing 精确对齐                            │
├──────────────────────────────────────────────────────────────────┤
│  A1  Voiceover 配音 / 口播                           【场景级+】   │
│      每个场景可配一段口播音频                                      │
│      场景内的每个内容元素（标题/要点/总结）也可独立配音频段落       │
│      ★ 必须与结构模板的场景时长、内容元素的入场帧精确对齐          │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 BGM — 背景音乐（视频级）

#### 6.2.1 数据结构

```typescript
interface BgmTrack {
  id: string;
  src: string;                    // 音频文件路径 / URL
  bpm?: number;                   // 节拍速度（用于自动踩点匹配）
  mood: BgmMood;                  // 情绪标签（用于自动匹配）
  volumeCurve?: VolumePoint[];    // 全片音量曲线（与结构对齐）
}

type BgmMood = 'epic' | 'upbeat' | 'chill' | 'tech' | 'cinematic' | 'corporate' | 'playful';

interface VolumePoint {
  /** 相对视频起点的秒数 */
  time: number;
  /** 0-1 音量，0 = 静音（用于配音时降低 BGM） */
  volume: number;
}
```

#### 6.2.2 BGM 与结构模板的联动

BGM 的音量曲线应与结构模板的场景节奏自动对齐：

```typescript
function generateBgmCurve(structure: StructureTemplate, voiceover: VoiceoverTrack[]): VolumePoint[] {
  const points: VolumePoint[] = [];

  for (const scene of structure.scenes) {
    const sceneStart = scene.startTimeSeconds;

    if (hasVoiceoverAt(scene.id, voiceover)) {
      // 有配音时：BGM 降低到 0.15（ducking）
      points.push({ time: sceneStart, volume: 0.15 });
      points.push({ time: sceneStart + scene.durationSeconds, volume: 0.15 });
    } else {
      // 无配音时：BGM 正常音量 0.5
      points.push({ time: sceneStart, volume: 0.5 });
    }

    // hook 场景：BGM 渐入（fade in）
    if (scene.type === 'hook') {
      points.unshift({ time: 0, volume: 0 });
      points.unshift({ time: sceneStart, volume: 0 });
    }

    // cta 场景：BGM 渐出（fade out）
    if (scene.type === 'cta') {
      points.push({ time: sceneStart + scene.durationSeconds - 2, volume: 0.3 });
      points.push({ time: sceneStart + scene.durationSeconds, volume: 0 });
    }
  }

  return points.sort((a, b) => a.time - b.time);
}
```

#### 6.2.3 BGM 模板库

按 `BgmMood` 预置推荐映射：

| BgmMood | 适用场景 | 样式族推荐 |
|---------|---------|-----------|
| epic | hook + solution 场景，大型项目 | tech |
| upbeat | 全片，活力型产品 | playful |
| chill | 全片，文档/工具类 | minimal, business |
| tech | 全片，开发者工具/框架 | tech |
| cinematic | hook + cta，高质感 | creative |
| corporate | 全片，商业/B2B 产品 | business |
| playful | 全片，社区/教育/创意工具 | playful, creative |

### 6.3 SFX — 音效（元素级）

#### 6.3.1 核心洞察：音效必须与动效模板的 timing 精确绑定

每个动效模板可以声明一个**关联音效**。当元素使用该动效入场时，音效在对应的帧自动触发：

```typescript
// motions.ts — 动效模板扩展 sfx 字段
interface MotionPreset {
  id: string;
  name: string;
  entrance: { ... };
  idle?: { ... };
  exit?: { ... };

  // ── 新增：关联音效 ──
  sfx?: {
    /** 音效文件路径 */
    src: string;
    /** 相对入场动画开始的延迟（秒），通常为 0（同步触发） */
    delay: number;
    /** 音量 0-1 */
    volume: number;
  };
}
```

#### 6.3.2 预置动效 → 音效映射

| 动效模板 | 推荐音效 | 说明 |
|---------|---------|------|
| `arc-entrance` | `sfx/whoosh-soft.mp3` | 标题弧线入场，柔和 whoosh |
| `spring-slide-up` | `sfx/swoosh-up.mp3` | 列表项/文字上滑，轻快 swoosh |
| `scale-fade` | `sfx/pop-soft.mp3` | 缩放淡入，柔和弹出 |
| `typewriter` | `sfx/type-keystroke.mp3` | 打字机效果，逐字击键音 |
| `bounce-in` | `sfx/bounce.mp3` | 弹跳入场，弹性音 |
| `reveal-mask` | `sfx/swoosh-reveal.mp3` | 遮罩揭示，横向 sweep |
| underline-grow | `sfx/swoosh-line.mp3` | 下划线生长，线性 sweep |
| transition | `sfx/whoosh-transition.mp3` | 场景过渡，强烈 whoosh |

#### 6.3.3 SFX 渲染方式

Remotion 支持 `<Audio>` 组件，音效通过帧对齐自动同步：

```typescript
// 在布局组件 / 场景组件中
import { Audio, useCurrentFrame } from "remotion";

export const Title: React.FC<TitleProps> = ({ text, motion, ... }) => {
  const frame = useCurrentFrame();
  const { transform, opacity } = useEntrance(motion, frame, fps);

  return (
    <>
      <div style={{ opacity, transform }}>{text}</div>
      {motion.sfx && frame === motion.entrance.delayFrames && (
        <Audio
          src={motion.sfx.src}
          volume={motion.sfx.volume}
          startFrom={0}
        />
      )}
    </>
  );
};
```

### 6.4 Voiceover — 配音/口播（场景级 + 元素级）

#### 6.4.1 数据结构

配音有两种对齐粒度：

```typescript
// ── 场景级配音：一段音频对应整个场景 ──
interface VoiceoverTrack {
  /** 关联的场景 ID */
  sceneId: string;
  /** 音频文件路径 */
  src: string;
  /** 该段配音的文本原文（用于校对 / 字幕生成） */
  text: string;
  /** 配音时长（秒），由 allocate 用于验证是否超出场景时长 */
  durationSeconds: number;
}

// ── 元素级配音：每段音频对应场景内的一个内容元素 ──
interface VoiceoverSegment {
  /** 关联的场景 ID */
  sceneId: string;
  /** 关联的内容元素角色：title / subtitle / points[0] / points[1] / ... */
  elementRole: string;
  /** 音频文件路径 */
  src: string;
  /** 文本原文 */
  text: string;
  durationSeconds: number;
  /** 该段配音相对于场景起点的偏移（秒），由匹配引擎根据动效 timing 计算 */
  startOffsetSeconds: number;
}
```

#### 6.4.2 配音对齐逻辑

配音必须与视觉动效的 timing 精确对齐。对齐规则：

```
场景开始 (frame 0)
  ├── F0-20:  overlay 淡入（无配音）
  ├── F20:    标题动效开始 → 标题配音在 F20 触发
  ├── F60:    下划线动效开始（通常无配音）
  ├── F80:    副标题动效开始 → 副标题配音在 F80 触发
  ├── F110:   要点1 动效开始 → 要点1 配音在 F110 触发
  ├── F128:   要点2 动效开始 → 要点2 配音在 F128 触发
  ...
```

```typescript
function alignVoiceoverToMotion(
  voiceoverText: string,           // 口播脚本原文
  sceneDef: SceneDef,              // 场景定义（含 contentSlots）
  motionMap: Record<string, MotionType>,  // 元素→动效映射
  motionPresets: Record<string, MotionPreset>,
  fps: number,
): VoiceoverSegment[] {
  // 1. 按标点/句号将口播文本拆分为段落
  const segments = splitByPunctuation(voiceoverText);

  // 2. 将段落分配到内容槽位
  //    - 第 1 段 → title
  //    - 第 2 段 → subtitle 或 points[0]
  //    - 第 3+ 段 → points[1..n]
  //    - 最后 1-2 段 → summary（如果是 cta 场景）

  // 3. 从动效模板中提取入场帧，转换为秒偏移
  const segments: VoiceoverSegment[] = [];
  for (const seg of assignedSegments) {
    const motion = motionPresets[motionMap[seg.elementRole]];
    const startOffsetSeconds = motion.entrance.delayFrames / fps;
    segments.push({
      sceneId: sceneDef.id,
      elementRole: seg.elementRole,
      src: seg.audioPath,
      text: seg.text,
      durationSeconds: seg.audioDuration,
      startOffsetSeconds,
    });
  }

  return segments;
}
```

#### 6.4.3 配音的时长约束

配音段落的总时长不能超过场景时长。这是一个**硬约束**，allocate 阶段需要验证：

```typescript
function validateVoiceoverTiming(
  sceneDef: SceneDef,
  segments: VoiceoverSegment[],
): { valid: boolean; overflow: number } {
  const sceneDuration = sceneDef.durationSeconds;
  const lastSegment = segments[segments.length - 1];
  const voiceoverEnd = lastSegment.startOffsetSeconds + lastSegment.durationSeconds;

  return {
    valid: voiceoverEnd <= sceneDuration,
    overflow: Math.max(0, voiceoverEnd - sceneDuration),
  };
}
```

如果溢出：
- 优先调快语速（TTS speed 参数）
- 其次延长场景时长（从其他场景借用）
- 最后截断口播文本

#### 6.4.4 配音来源

| 来源 | 触发条件 | 实现方式 |
|------|---------|---------|
| **CONTENT_DIR 口播脚本** | `allocate.py` 的 `--content-dir` 中有 `*-口播脚本.md` | 脚本文本 → TTS API 生成音频 → 写入输出目录 |
| **LLM 生成口播** | 用户请求生成配音，或 CONTENT_DIR 中无口播脚本 | 匹配引擎根据内容生成口播文本 → TTS → 音频 |
| **用户预录音频** | 用户提供了音频文件 | 直接使用，跳过 TTS |
| **无配音** | 默认 | 只有 BGM + SFX，无口播 |

#### 6.4.5 配音 → VideoConfig 集成

```typescript
// VideoConfig 扩展音频配置
interface VideoConfig {
  structureId: string;
  styleId: string;
  bgType: BgType;
  sceneConfigs: Record<string, SceneConfig>;

  // ── 新增：音频配置 ──
  audio: {
    bgm?: BgmTrack;
    sfxEnabled: boolean;                        // 是否启用音效（默认 true）
    voiceover: VoiceoverSegment[];               // 配音段落列表
    voiceoverEnabled: boolean;                   // 是否启用配音
  };
}
```

### 6.5 音频系统的完整数据流

```
输入：
  ├── manifest_full.json          （素材）
  ├── CONTENT_DIR/*.md            （文案 + 口播脚本原文）
  ├── 口播脚本 → TTS API          （生成配音音频文件）
  └── BGM 库                      （按 mood 匹配）

allocate.py 处理流程：
  1. 匹配引擎 → 生成 VideoConfig（含 audio 字段）
  2. 口播脚本拆段 → alignVoiceoverToMotion() → VoiceoverSegment[]
  3. BGM 选择 → generateBgmCurve() → VolumePoint[]
  4. SFX 自动绑定到动效模板
  5. 写入 audio_config.json

Remotion 渲染：
  ├── <VideoComposer>
  │     ├── <Sequence (hook)>
  │     │     ├── 视觉组件 + <Audio src="sfx/whoosh.mp3">
  │     │     └── <Audio src="voiceover/hook.mp3" startFrom={...} />
  │     ├── <Sequence (feature)>
  │     │     ├── 视觉组件 + <Audio src="sfx/ding.mp3"> (×5 stagger)
  │     │     └── <Audio src="voiceover/feature.mp3" />
  │     └── ...
  └── <Audio src="bgm/tech-upbeat.mp3" volume={bgmCurve} />  ← 全片
```

### 6.6 音频模板与视觉模板的匹配联动

音频不是独立选择的——它必须与视觉维度联动：

| 视觉维度 | 音频联动 |
|---------|---------|
| **结构模板** | BGM 音量曲线跟随场景节奏（hook 渐入、配音段 ducking、cta 渐出） |
| **样式模板** | BGM mood 跟随 styleFamily（tech → BGM tech, playful → BGM upbeat） |
| **布局模板** | 无直接联动（布局是空间维度，音频是时间维度） |
| **动效模板** | SFX 严格绑定到动效的 entrance timing（弧线 → whoosh, 弹跳 → bounce） |
| **场景类型** | 配音内容跟随场景类型（hook → 吸引语, problem → 痛点描述, cta → 号召语） |

### 6.7 匹配引擎扩展

`matchAudio()` 加入匹配引擎：

```typescript
function matchBgm(style: StyleTemplate, structure: StructureTemplate): BgmTrack {
  // 样式族 → BGM mood 映射
  const familyToMood: Record<StyleFamily, BgmMood> = {
    tech: 'tech',
    business: 'corporate',
    creative: 'cinematic',
    minimal: 'chill',
    playful: 'upbeat',
  };
  const mood = familyToMood[style.family];
  return bgmLibrary.find(b => b.mood === mood) ?? bgmLibrary[0];
}

function matchVoiceover(
  contentDir: string | null,
  structure: StructureTemplate,
  sceneConfigs: Record<string, SceneConfig>,
  motionPresets: Record<string, MotionPreset>,
  fps: number,
): VoiceoverSegment[] {
  if (!contentDir) return [];  // 无内容目录，无配音

  // 1. 读取口播脚本文本
  const scriptText = readVoiceoverScript(contentDir);

  // 2. 按场景拆分段落
  const sceneParagraphs = splitScriptToScenes(scriptText, structure);

  // 3. 对每个场景做元素级对齐
  const segments: VoiceoverSegment[] = [];
  for (const [sceneId, paragraph] of Object.entries(sceneParagraphs)) {
    const sceneConfig = sceneConfigs[sceneId];
    const aligned = alignVoiceoverToMotion(
      paragraph, structure.scenes.find(s => s.id === sceneId)!,
      sceneConfig.motionMap, motionPresets, fps,
    );
    segments.push(...aligned);
  }

  return segments;
}
```

### 6.8 Phase 集成

| Phase | 音频实现范围 |
|-------|------------|
| **Phase 1** | 定义音频类型接口，不实现渲染（预留槽位） |
| **Phase 2** | 实现 BGM 全片铺底 + 音量曲线，Remotion `<Audio>` 集成 |
| **Phase 3** | 实现 SFX 与动效模板绑定，实现口播配音拆段对齐 |
| **Phase 4** | TTS API 集成（MiniMax / 其他），自动生成配音音频 |

---

## 七、匹配引擎 (Matching Engine) — L5

### 7.1 设计原理

匹配引擎是 code agent 的"决策大脑"。它接收输入内容（文案、素材、仓库信息），输出完整的 `VideoConfig`——一个描述了结构+样式+布局+动效组合的 JSON 配置。

### 7.2 输入

```typescript
interface MatchingInput {
  // ── 文案内容 ──
  title: string;
  tagline?: string;
  points: string[];           // 核心要点（来自仓库档案 / LLM 生成）
  summary?: string;           // 总结语
  url: string;                // 项目地址
  stats?: string;             // Star · Fork 等数据

  // ── 素材清单（来自 manifest_full.json）──
  extractedVideos: AssetInfo[];  // 页面内嵌视频/GIF（最高优先级素材）
  images: AssetInfo[];           // 页面截图/图片（Ken Burns 动效）
  scrollVideos: AssetInfo[];     // 页面滚动录屏（Playwright 录制）
  linkVideos: AssetInfo[];       // 关键链接录屏（Demo/文档页面）

  // ── 仓库信息（用于智能匹配）──
  language?: string;             // 主编程语言
  topics?: string[];             // 仓库标签/话题
  isDemoHeavy?: boolean;         // 页面内嵌视频 ≥ 3（产品展示型）

  // ── 目标 ──
  totalDuration: number;         // 目标视频总时长（秒）
}

interface AssetInfo {
  path: string;
  duration?: number;    // 视频时长（秒），图片无此项
  label?: string;       // 来源描述
}
```

### 7.3 输出

```typescript
interface VideoConfig {
  // 结构选择
  structureId: string;       // 'funnel' | 'timeline' | ...

  // 样式选择
  styleId: string;           // 'dark-purple' | 'tech-grid' | ...

  // 背景动效
  bgType: BgType;

  // 每个场景的配置
  sceneConfigs: Record<string, SceneConfig>;
}

interface SceneConfig {
  // 布局选择
  layoutId: LayoutType;

  // 每个内容元素的动效选择
  motionMap: Record<string, MotionType>;
  // 例：{ title: 'arc-entrance', subtitle: 'scale-fade', points: 'spring-slide-up' }

  // 内容填充
  content: Record<string, string | string[]>;
}
```

### 7.4 匹配策略

匹配引擎通过**规则 + LLM** 混合策略工作：

#### 规则层（确定性，快速）

```typescript
function matchStructure(input: MatchingInput): string {
  const totalVideos = input.extractedVideos.length + input.linkVideos.length;

  // 有大量视频素材（≥3 个内嵌视频，或 Demo 页录屏丰富）→ 产品展示型
  if (input.extractedVideos.length >= 3 || input.isDemoHeavy) return 'product-showcase';

  // 有滚动录屏 + 图片（典型的 README 浏览型）→ 漏斗型（showcase 场景用录屏填充）
  if (input.scrollVideos.length > 0) return 'funnel';

  // 默认 → 漏斗型
  return 'funnel';
}

function matchStyle(input: MatchingInput): StyleTemplate {
  // 复用当前 themeMeta.ts 的 recommendTheme 逻辑
  const { themeId } = recommendTheme(input.language, input.topics);
  return styleTemplates.find(s => s.id === themeId) ?? styleTemplates[0];
}

function matchLayout(sceneType: SceneType, content: ContentSlot[]): LayoutType {
  // 基于场景类型和内容特征选择布局
  const defaults: Record<SceneType, LayoutType> = {
    hook: 'hero-center',
    problem: 'hero-center',
    solution: 'split-left-text',
    feature: 'hero-center',
    proof: 'stat-highlight',
    cta: 'hero-center',
    showcase: 'media-full',
    transition: 'full-screen-text',
  };
  return defaults[sceneType] ?? 'hero-center';
}

function matchMotion(sceneType: SceneType, elementRole: string): MotionType {
  // 标题 → arc-entrance / 弹性滑入
  // 副标题 → scale-fade
  // 列表项 → spring-slide-up (stagger)
  // URL → spring-slide-up (重 mass)
  const motionMap: Record<string, MotionType> = {
    title: 'arc-entrance',
    subtitle: 'scale-fade',
    points: 'spring-slide-up',
    url: 'spring-slide-up',
    stats: 'scale-fade',
    summary: 'spring-slide-up',
  };
  return motionMap[elementRole] ?? 'scale-fade';
}
```

#### LLM 层（智能，可选增强）

当 code agent 有 LLM 能力时，可在规则层基础上做增强匹配：

```python
# 匹配提示词模板
MATCHING_PROMPT = """
你是一个视频宣传片自动匹配引擎。根据以下输入内容，为每个场景选择最优的布局和动效组合。

输入内容：
- 标题：{title}
- 要点：{points}
- 语言：{language}
- 素材：{video_count} 个视频，{image_count} 张图片

可选布局：{available_layouts}
可选动效：{available_motions}

输出 JSON 格式：
{{
  "scenes": {{
    "hook": {{ "layout": "...", "titleMotion": "..." }},
    "problem": {{ "layout": "...", "pointsMotion": "..." }},
    ...
  }}
}}
"""
```

### 7.5 在当前 pipeline 中的集成点

匹配发生在 `allocate.py` 中，在调用 Remotion 渲染之前：

```
recorder.mjs → manifest_full.json
                         ↓
              allocate.py (匹配引擎)
                ├── 1. 读取 manifest + 内容
                ├── 2. 调用匹配引擎 → 生成 VideoConfig JSON
                ├── 3. 将 VideoConfig 写入 config.json
                ├── 4. 调用 Remotion 渲染（传入 config.json）
                └── 5. 素材分配 + timeline + concat
```

---

## 八、重构实施计划

### Phase 1: 基础抽象层（不改变现有功能）

**目标**：将当前硬编码的逻辑重构为可配置的抽象，但输出结果与当前完全一致。同时定义音频系统类型接口（预留槽位）。

#### 1.1 样式模板迁移

- [ ] `themes.ts` → `styles.ts`：将 Theme 接口迁移为 StyleTemplate 接口
- [ ] 补充 `family` 字段，将 12 个主题归类到 5 个风格族
- [ ] 扩展 `tokens.ts` 为完整的 Design Token 系统
- [ ] `themeMeta.ts` 重命名为 `styleMeta.ts`，`recommendTheme()` 更新为 `matchStyle()`

#### 1.2 动效模板提取

- [ ] 从 `Intro.tsx` 和 `Outro.tsx` 中提取动效参数，定义 5-8 个预置动效模板
- [ ] 封装 `useEntrance()` Hook
- [ ] `animations.ts` 保留为 timing 常量，但 spring 配置迁移到动效模板中

#### 1.3 布局模板提取

- [ ] 将当前 Intro 的居中布局提取为 `HeroCenter` 布局组件
- [ ] 将当前 Outro 的居中布局提取为 `HeroCenter` 布局组件
- [ ] 新增 `SplitLeftText` 布局（备选）
- [ ] 新增 `MediaFull` 布局（用于 showcase 场景）

#### 1.4 音频系统类型定义（预留槽位）

- [ ] 定义 `BgmTrack` / `BgmMood` / `VolumePoint` 类型
- [ ] 定义 `VoiceoverTrack` / `VoiceoverSegment` 类型
- [ ] 定义 `SfxBinding` 类型（动效模板的 sfx 字段）
- [ ] `MotionPreset` 接口扩展 `sfx?` 可选字段
- [ ] `VideoConfig` 接口扩展 `audio` 字段

**文件变更**：

| 文件 | 操作 |
|------|------|
| `remotion/src/styles.ts` | NEW — StyleTemplate 定义 + 12 个样式模板 |
| `remotion/src/styleMeta.ts` | NEW — 风格元数据 + matchStyle() |
| `remotion/src/tokens.ts` | REWRITE — Design Token 系统 |
| `remotion/src/motions.ts` | NEW — MotionPreset 定义 + 预置动效库 |
| `remotion/src/hooks/useEntrance.ts` | NEW — 动效 Hook |
| `remotion/src/layouts/index.tsx` | NEW — 布局类型定义 + 调度器 |
| `remotion/src/layouts/HeroCenter.tsx` | NEW — 居中布局 |
| `remotion/src/layouts/SplitLeftText.tsx` | NEW — 左右分栏布局 |
| `remotion/src/layouts/MediaFull.tsx` | NEW — 素材全屏布局 |
| `remotion/src/Intro.tsx` | REFACTOR — 使用布局组件 + 动效 Hook |
| `remotion/src/Outro.tsx` | REFACTOR — 使用布局组件 + 动效 Hook |
| `remotion/src/themes.ts` | DELETE — 迁移到 styles.ts |
| `remotion/src/themeMeta.ts` | DELETE — 迁移到 styleMeta.ts |
| `remotion/src/animations.ts` | MODIFY — spring 配置移到 motions.ts |
| `remotion/src/audio/types.ts` | NEW — 音频类型定义（预留） |

### Phase 2: 结构模板 + 场景系统 + BGM 基础

**目标**：引入场景序列，实现漏斗型结构。实现 BGM 全片铺底。

#### 2.1 场景系统

- [ ] 定义 `SceneDef` / `StructureTemplate` 类型
- [ ] 实现 `funnelStructure` 结构模板
- [ ] 新增 `SceneRenderer` 组件（根据 SceneConfig 选择布局+动效）
- [ ] 新增 `VideoComposer` 组件（替代当前 Root.tsx 中的固定 Composition）

#### 2.2 场景组件

- [ ] `HookScene` — 黄金三秒场景
- [ ] `ProblemScene` — 痛点共鸣场景
- [ ] `SolutionScene` — 方案亮相场景
- [ ] `FeatureScene` — 功能亮点场景（当前 Intro 的内容即可复用）
- [ ] `ShowcaseScene` — 素材展示场景（Ken Burns / 视频播放）
- [ ] `CtaScene` — 行动呼吁场景（当前 Outro 的内容即可复用）

#### 2.3 BGM 基础集成

- [ ] 实现 `bgmLibrary.ts` — BGM 模板库（按 mood 索引，初始 3-5 首）
- [ ] 实现 `bgmCurve.ts` — BGM 音量曲线自动生成（跟随结构模板场景节奏）
- [ ] `VideoComposer` 中集成 Remotion `<Audio>` 组件铺 BGM
- [ ] BGM mood 与样式族联动（tech 样式 → tech BGM）

**文件变更**：

| 文件 | 操作 |
|------|------|
| `remotion/src/structures.ts` | NEW — StructureTemplate 定义 + funnelStructure |
| `remotion/src/scenes/HookScene.tsx` | NEW |
| `remotion/src/scenes/ProblemScene.tsx` | NEW |
| `remotion/src/scenes/SolutionScene.tsx` | NEW |
| `remotion/src/scenes/FeatureScene.tsx` | NEW — 复用当前 Intro 逻辑 |
| `remotion/src/scenes/ShowcaseScene.tsx` | NEW — 复用 KenBurnsClip |
| `remotion/src/scenes/CtaScene.tsx` | NEW — 复用当前 Outro 逻辑 |
| `remotion/src/scenes/SceneRenderer.tsx` | NEW — 场景 → 布局+动效 桥接 |
| `remotion/src/VideoComposer.tsx` | NEW — 场景序列渲染器 |
| `remotion/src/Root.tsx` | MODIFY — 注册 VideoComposer |
| `remotion/src/Intro.tsx` | KEEP — 保留为 FeatureScene 的内联版本 |
| `remotion/src/Outro.tsx` | KEEP — 保留为 CtaScene 的内联版本 |

### Phase 3: 匹配引擎 + Pipeline 集成 + 音效/配音

**目标**：实现规则层匹配，集成到 allocate.py。实现 SFX 与动效绑定、口播配音拆段对齐。

#### 3.1 匹配引擎

- [ ] 实现 `matchStructure()` — 基于素材特征选择结构模板
- [ ] 实现 `matchStyle()` — 复用并增强当前 `recommendTheme()`
- [ ] 实现 `matchLayout()` — 基于场景类型选择布局
- [ ] 实现 `matchMotion()` — 基于元素角色选择动效
- [ ] 组合为 `generateVideoConfig()` — 输入 MatchingInput，输出 VideoConfig

#### 3.2 Pipeline 集成

- [ ] `allocate.py` 增加匹配步骤：读取内容 → 调用匹配 → 生成 config.json
- [ ] `remotion_render()` 改为传入 config.json 而非散列 props
- [ ] Remotion 端新增 `VideoComposer` Composition，接收 config.json 渲染
- [ ] 保留当前的 `Intro`/`Outro` Composition 作为降级路径

#### 3.3 SFX + 配音集成

- [ ] 实现 `sfxLibrary.ts` — 音效模板库（按动效类型索引）
- [ ] 动效模板的 `sfx` 字段绑定到实际音效文件
- [ ] 基础组件（Title/Subtitle/PointList）中集成 `<Audio>` 播放音效
- [ ] 实现 `voiceoverAlign.ts` — 口播脚本文本拆段 + 与动效 timing 对齐
- [ ] `allocate.py` 增加口播脚本读取 → TTS 调用 → 配音文件生成
- [ ] `VideoComposer` 中集成配音 `<Audio>` 组件

**文件变更**：

| 文件 | 操作 |
|------|------|
| `remotion/src/matching.ts` | NEW — 匹配引擎（纯函数，可测试） |
| `remotion/src/VideoComposer.tsx` | MODIFY — 接收 VideoConfig 渲染 |
| `remotion/src/audio/bgmLibrary.ts` | NEW — BGM 模板库 |
| `remotion/src/audio/bgmCurve.ts` | NEW — BGM 音量曲线生成 |
| `remotion/src/audio/sfxLibrary.ts` | NEW — 音效模板库 |
| `remotion/src/audio/voiceoverAlign.ts` | NEW — 配音拆段对齐 |
| `scripts-v2/allocate.py` | MODIFY — 集成匹配引擎 + 音频配置 |
| `skill.md` | MODIFY — 更新匹配流程说明 |

### Phase 4: 扩展（后续迭代）

- [ ] 新增 `timeline` 结构模板
- [ ] 新增 `product-showcase` 结构模板
- [ ] 新增更多布局：`CardGrid`、`QuoteStyle`、`StatHighlight`
- [ ] 新增更多动效：`typewriter`、`reveal-mask`、`blur-focus`
- [ ] LLM 增强匹配：code agent 调用 LLM 做创意决策
- [ ] 自定义结构模板：用户通过 JSON 定义场景序列
- [ ] TTS API 集成（MiniMax TTS / 其他），口播脚本自动生成配音
- [ ] BGM 踩点增强：根据 BPM 自动对齐场景切换到节拍
- [ ] 字幕生成：从 VoiceoverSegment 自动生成 SRT/WebVTT

---

## 九、可行性分析

### 8.1 你的方案可行性评估

| 维度 | 方案 | 可行性 | 分析 |
|------|------|--------|------|
| 结构模板化 | 配置驱动场景序列 | **完全可行** | Remotion 的 `<Sequence>` 天然支持场景组合。漏斗型先实现，后续新增结构只需定义新的 scenes 数组 |
| 样式可切换 | TypeScript 对象 + family 分组 | **完全可行** | 当前 12 主题已经是对象，只需补充 family 字段。Tailwind 不建议用于视频渲染本身 |
| 每场景独立布局 | 布局组件 + 场景类型映射 | **完全可行** | 布局组件接收统一 props，不同场景匹配不同布局。关键是统一 LayoutProps 接口 |
| 每元素独立动效 | 动效模板 + Hook 封装 | **完全可行** | 当前已经在做（spring + interpolate），只需抽象为可配置的预设 |
| Agent 自动匹配 | 规则层 + LLM 增强 | **完全可行** | 规则层确定性高（90% 场景覆盖），LLM 做创意增强（布局组合、动效节奏微调） |

### 8.2 关键风险和缓解

| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| Phase 1 重构引入回归 | 渲染结果与当前不一致 | 每个 Phase 结束后做截图对比测试，确保现有 Intro/Outro 输出不变 |
| 布局组件接口设计不合理 | 后续扩展需要改接口 | Phase 1 先只做 HeroCenter（当前布局），验证接口后再扩展 |
| 匹配规则覆盖不全 | 某些内容特征匹配错误 | 提供手动覆盖机制（`--structure`、`--layout`、`--style` 参数） |
| Remotion 渲染性能 | 场景多了渲染变慢 | 每个场景是独立 Sequence，Remotion 并行渲染，性能影响可控 |

### 8.3 与当前代码的兼容性

- **向后兼容**：Phase 1 完成后，当前 `Intro`/`Outro` Composition 继续工作（内部改用布局组件 + 动效 Hook，外部接口不变）
- **渐进迁移**：Phase 2 新增 `VideoComposer` Composition，与 `Intro`/`Outro` 并存，`allocate.py` 优先使用 `VideoComposer`，失败时降级到旧 Composition
- **降级链保留**：当前 L0→L1→L2→L3 四级降级策略在重构后继续有效

---

## 十、目录结构（重构后）

```
remotion/src/
  index.ts                          # registerRoot
  Root.tsx                          # Composition 注册（Intro/Outro/VideoComposer/KenBurnsClip）

  # ── 配置层 ──
  structures.ts                     # 结构模板定义 + 预置结构
  styles.ts                         # 样式模板定义 + 12 个预置样式
  motions.ts                        # 动效模板定义 + 预置动效库
  styleMeta.ts                      # 样式元数据 + matchStyle()
  matching.ts                       # 匹配引擎（matchStructure/matchLayout/matchMotion/matchAudio → VideoConfig）

  # ── 类型 ──
  types.ts                          # 所有共享类型定义

  # ── Token 系统 ──
  tokens.ts                         # Design Token 派生函数
  layout.ts                         # 布局常量（间距、字号）
  animations.ts                     # 时间线帧数常量

  # ── 布局组件 ──
  layouts/
    index.tsx                       # LayoutType + 布局调度器
    HeroCenter.tsx                  # 居中单列
    SplitLeftText.tsx               # 左右分栏
    MediaFull.tsx                   # 素材全屏
    StatHighlight.tsx               # 数据高亮
    CardGrid.tsx                    # 卡片网格

  # ── 场景组件 ──
  scenes/
    SceneRenderer.tsx               # 场景 → 布局+动效 桥接
    HookScene.tsx                   # 黄金三秒
    ProblemScene.tsx                # 痛点共鸣
    SolutionScene.tsx               # 方案亮相
    FeatureScene.tsx                # 功能亮点
    ShowcaseScene.tsx               # 素材展示
    CtaScene.tsx                    # 行动呼吁

  # ── 基础组件 ──
  components/
    Title.tsx                       # 标题（接收 style + motion）
    Subtitle.tsx                    # 副标题
    PointList.tsx                   # 要点列表（stagger 动效）
    Underline.tsx                   # 装饰线
    MediaDisplay.tsx                # 素材展示（视频/图片）

  # ── Hooks ──
  hooks/
    useEntrance.ts                  # 入场动效 Hook
    useIdle.ts                      # 驻留动效 Hook

  # ── 背景动效 ──
  backgrounds/
    index.tsx                       # BackgroundLayer 调度器
    Starfield.tsx
    BokehCircles.tsx
    GeometricPatterns.tsx
    PixelTransition.tsx

  # ── 听觉系统 ──
  audio/
    types.ts                        # BgmTrack / VoiceoverSegment / SfxBinding 类型
    bgmLibrary.ts                   # BGM 模板库（按 mood 索引）
    sfxLibrary.ts                   # 音效模板库（按动效类型索引）
    voiceoverAlign.ts               # 配音拆段 + 与动效 timing 对齐
    bgmCurve.ts                     # BGM 音量曲线生成（跟随结构模板）

  # ── 旧组件（兼容期保留）──
  Intro.tsx                         # 旧 Intro（Phase 1 后内部分解，外部接口不变）
  Outro.tsx                         # 旧 Outro
  KenBurnsClip.tsx                  # 图片 pan/zoom

  # ── VideoComposer（Phase 2+）──
  VideoComposer.tsx                 # 新的统一渲染入口

  # ── 工具 ──
  fonts.ts                          # Google Fonts 加载

# ── 音频资源 ──
remotion/public/audio/
  bgm/                              # BGM 文件（mp3）
    tech-01.mp3
    upbeat-01.mp3
    ...
  sfx/                              # 音效文件（短 mp3/wav）
    whoosh-soft.mp3
    swoosh-up.mp3
    pop-soft.mp3
    ding.mp3
    type-keystroke.mp3
    ...
```

---

## 十一、验收标准

### Phase 1
- [ ] `npx remotion studio` 中，Intro/Outro 视觉效果与重构前完全一致
- [ ] 渲染的 MP4 截图对比无差异
- [ ] 12 个样式模板均可正确切换
- [ ] 至少 5 个动效模板可供选择
- [ ] 3 个布局组件（HeroCenter / SplitLeftText / MediaFull）可在 Studio 中预览
- [ ] 音频类型接口已定义，VideoConfig 包含 `audio` 字段

### Phase 2
- [ ] 漏斗型结构模板可生成 5-6 个场景的视频
- [ ] 每个场景可独立选择不同布局
- [ ] ShowcaseScene 正确展示 Ken Burns 图片 + 视频素材
- [ ] VideoComposer 接收 config.json 正确渲染
- [ ] BGM 全片铺底，音量曲线跟随场景节奏（配音段自动 ducking）

### Phase 3
- [ ] `allocate.py` 自动生成 VideoConfig（结构+样式+布局+动效+音频全部匹配）
- [ ] 渲染结果与手动选择的配置一致
- [ ] 降级链（L0→L3）仍然有效
- [ ] `--structure` / `--style` / `--layout` 手动覆盖参数可用
- [ ] SFX 与动效模板绑定正确（标题入场触发 whoosh）
- [ ] 口播配音拆段对齐（每段配音在对应元素入场帧触发）
- [ ] 配音时长不超出场景时长（硬约束校验通过）
