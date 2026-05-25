# Remotion 视觉上限提升 Spec

## 问题陈述

当前 Blueprint 生成管线（LLMBlueprintComposer 3 步分层）远未发挥 Remotion 引擎的视觉潜力：

### 1. Step 2 Prompt 太简陋

`step2_elements_system.md` 仅 20 行，LLM 不知道：
- 可用的 60+ 组件及其视觉能力
- 元素嵌套/组合设计模式
- 装饰层叠加策略（FilmGrain、CinematicBars、ConnectionLine）
- 如何利用 `assigned_asset`（图表/图片素材）

结果：LLM 走最安全路线（`text` + `fade-up`），产出平庸视觉。

### 2. Transition 大量浪费

前端已有 4 种高质量自定义转场但只注册了 5 个（3 个映射到同一 `fade()`）：

| Blueprint type | 当前映射 | 前端已有组件 |
|---|---|---|
| `crossfade` | `fade()` ✅ | — |
| `soft-replace` | `fade()` ❌ | `SoftReplacement`（淡出淡入独立控制） |
| `spatial-shift` | `slide()` ⚠️ | `SpatialShift`（spring 驱动 X 平移 + 右侧入场） |
| `stack-pop` | `fade()` ❌ | `StackPopIn`（scale + translateY spring 弹入） |
| `diagonal-wipe` | `wipe()` ✅ | — |

### 3. 动画系统单薄

13 种基础动画只覆盖入场，缺少：
- **退出动画**（outro 场景元素如何退场）
- **持续动画叠加**（loop: pulse/float/spin/wiggle 已在 engine 中实现但 LLM 不用）
- **stagger 嵌套**（列表子元素错开入场已支持但 prompt 没引导）
- **motion token 复用**（全局定义好缓动预设但 LLM 不知道有哪些 token）

### 4. 背景层没有叠加思维

LLM 选一种背景就完事，不会组合：
- `DarkNeonBg` + `DotGridBg` + `FilmGrain` = 赛博朋克质感
- `FluidAurora` + `NoiseBackground` + `CinematicBars` = 科幻电影感
- `LightBeam` + `MeshGradientBg` = 高端产品展示

### 5. 场景叙事无视觉节奏

所有场景的视觉密度趋同，没有：
- **Hook 场景**：高冲击力（大字 + scale-bounce + 强装饰）
- **Context 场景**：信息展示（split-layout + code-block + connection-line）
- **Deep Dive 场景**：图文结合（split-media + diagram + stagger-reveal）
- **Climax 场景**：视觉爆发（gradient-text + particles + 强动画）
- **Resolution 场景**：平静收束（center-layout + fade-out + 简洁元素）

## 设计方案

### 一、Step 2 Prompt 重写 — 注入完整设计系统

**位置**：`infrastructure/visual_blueprint/prompts/step2_elements_system.md`

新 prompt 结构：

```
1. 角色定义：Remotion 视觉导演，追求影视级效果
2. 组件目录（按角色分类，含 props 描述）
3. 设计模式库（5-8 种高视觉冲击组合模板）
4. 叙事节奏指南（Hook/Context/DeepDive/Climax/Resolution 各自的视觉策略）
5. 动画指南（入场 + loop + stagger + motion token）
6. 装饰叠加策略（何时加 FilmGrain/CinematicBars 等）
7. 素材利用指南（assigned_asset 如何融入布局）
8. 硬规则（flex-child 定位、outFrame 对齐、元素数量等）
```

**设计模式库**示例（注入 prompt）：

```
模式 A: 架构讲解
  split-layout >
    左: chapter-title + key-point (stagger)
    右: image[src=assigned_asset] (scale-in)
  装饰: connection-line + dot-grid-bg

模式 B: 数据对比
  center-layout >
    gradient-text (标题, scale-bounce)
    comparison-table (stagger-reveal)
  装饰: organic-blob (背景层)

模式 C: 代码走读
  split-media >
    左: code-block (typewriter)
    右: ai-summary-box (slide-right)
  装饰: cursor + film-grain

模式 D: 高潮冲击
  center-layout >
    word-swap-headline (scale-bounce)
    stat-card × 3 (stagger, scale-bounce + loop: pulse)
  装饰: mesh-gradient-bg + cinematic-bars

模式 E: Hook 开场
  center-layout >
    title[level=h1] (scale-bounce)
    gradient-text (subtitle, fade-up)
  装饰: organic-blob + noise-background

模式 F: 流程/数据流
  center-layout >
    image[src=diagram_svg] (scale-in)
    step-indicator (stagger)
  装饰: connection-line

模式 G: Outro 收束
  center-layout >
    gradient-text (fade-in, loop: float)
    lower-third (fade-up)
  装饰: film-grain
```

**叙事节奏视觉映射**：

```python
# 在 Step 1 skeleton 生成时，给每个 scene 标记 narrative_phase
# Step 2 根据 narrative_phase 选择不同的设计模式

hook     → 模式 E（强冲击，少元素，大动画）
context  → 模式 A（split 布局，信息展示）
deep_dive → 模式 A/B/C（根据内容类型选：架构/数据/代码）
climax   → 模式 D（视觉爆发，多动画叠加）
resolution → 模式 G（简洁收束）
```

### 二、TransitionRegistry 升级

**位置**：`frontend/remotion/src/registries/transitionRegistry.ts`

将前端已有的自定义转场注册进去：

```typescript
// 当前
"soft-replace": () => fade(),
"spatial-shift": () => slide({ direction: "from-right" }),
"stack-pop": () => fade(),

// 改为自定义 Presentation
// 需要将 useSoftEnter/useSoftExit/useSpatialShiftLeft/useStackPopIn
// 包装成 @remotion/transitions 的 CustomPresentation
```

实现方式：用 `@remotion/transitions` 的 `customTransition` API 将 hooks 包装为 Presentation：

```typescript
import { customTransition } from "@remotion/transitions";

export const softReplacePresentation = () =>
  customTransition({
    enter: ({ progress }) => ({ opacity: progress }),
    exit: ({ progress }) => ({ opacity: 1 - progress }),
  });

export const spatialShiftPresentation = () =>
  customTransition({
    enter: ({ progress }) => ({
      opacity: progress,
      transform: `translateX(${(1 - progress) * 60}px)`,
    }),
    exit: ({ progress }) => ({
      opacity: progress,
      transform: `translateX(${-(1 - progress) * 30}%)`,
    }),
  });

export const stackPopPresentation = () =>
  customTransition({
    enter: ({ progress }) => ({
      opacity: progress,
      transform: `translateY(${(1 - progress) * 30}px) scale(${0.95 + 0.05 * progress})`,
    }),
  });
```

### 三、Blueprint 后处理 — 装饰层自动叠加

**位置**：`infrastructure/visual_blueprint/llm_composer.py` 的 Step 3

在 Step 3（程序化装配）中新增装饰层叠加逻辑：

```python
def _apply_decoration_layers(scene: SceneConfig, narrative_phase: str, theme: str) -> None:
    """根据场景类型和主题自动叠加装饰元素。"""
    decorations = []

    # 全局: 所有场景加微弱 FilmGrain 增加质感
    if theme in ("dark-neon", "fluid-aurora", "neon-blue"):
        decorations.append(ElementConfig(
            id=f"{scene.id}_grain",
            type="film-grain",
            layout=ElementLayout(position="absolute", width="100%", height="100%", zIndex=999),
            animation=AnimationConfig(type="fade-in", timeline=AnimationTimeline(inFrame=0, duration=15)),
        ))

    # Hook/Climax: 电影感上下黑边
    if narrative_phase in ("hook", "climax"):
        decorations.append(ElementConfig(
            id=f"{scene.id}_cinema",
            type="cinematic-bars",
            layout=ElementLayout(position="absolute", width="100%", height="100%", zIndex=998),
        ))

    # Deep Dive: 连接线装饰（如有多个元素）
    if narrative_phase == "deep_dive" and scene.elements and len(scene.elements) >= 2:
        decorations.append(ElementConfig(
            id=f"{scene.id}_conn",
            type="connection-line",
            layout=ElementLayout(position="absolute", width="100%", height="100%", zIndex=-1),
        ))

    scene.elements = (scene.elements or []) + decorations
```

### 四、Scene Skeleton 增加 narrative_phase

**位置**：`domain/visual_blueprint/scene_config.py`

给 `SceneConfig` 增加 `narrativePhase` 字段：

```python
class SceneConfig(BaseModel):
    # ...existing fields...
    narrativePhase: Optional[str] = None  # hook | context | deep_dive | climax | resolution
```

**位置**：`infrastructure/visual_blueprint/prompts/step1_skeleton_system.md`

在 Step 1 prompt 中增加指令：
- 根据 segment 在叙事弧线中的位置，给每个 scene 标记 `narrativePhase`
- 不同 phase 映射不同的视觉策略

### 五、Step 1 Prompt 丰富化 — 背景叠加策略

在 Step 1 prompt 中引导 LLM 不只选一种背景，而是组合：

```
背景叠加规则：
1. 选择一个主背景（如 dark-neon）
2. 根据场景类型叠加装饰背景：
   - intro/outro: 加 noise-background
   - deep_dive 场景: 加 dot-grid-bg
   - climax 场景: 加 mesh-gradient-bg
3. 通过 scene.elements 中添加 decoration 类型元素实现叠加
```

### 六、Animation 增强

#### 6.1 新增动画类型

**位置**：`frontend/remotion/src/engine/applyAnimation.ts` + `types.ts`

```typescript
// 新增 AnimationType
"reveal"     // 遮罩揭示（从左到右或从中心扩展）
"blur-in"    // 模糊到清晰
"3d-flip"    // 3D 翻转入场
"path-follow" // 沿路径运动
```

#### 6.2 Prompt 引导使用 loop 动画

在 Step 2 prompt 中明确引导 LLM 为关键元素添加 loop：
```
动画叠加规则：
- 标题类元素：入场动画 + loop: float（微浮动，增加生命感）
- 数据类元素：入场动画 + loop: pulse（脉冲呼吸，吸引注意力）
- 装饰类元素：loop: spin 或 wiggle（持续运动，增加动态感）
- 场景最后 15 帧：自动 fade-out（通过 outFrame 控制）
```

## 实施顺序

### Phase 1：Prompt 重写（影响最大，改动最小）
1. 重写 `step2_elements_system.md` — 注入组件目录 + 设计模式库 + 叙事节奏
2. 更新 `step1_skeleton_system.md` — 增加 narrativePhase + 背景叠加策略
3. 更新 Python schema — SceneConfig 增加 narrativePhase 字段

### Phase 2：Transition 升级（前端改动）
4. 升级 `transitionRegistry.ts` — 包装自定义转场为 Presentation
5. 清理 `soft-replace` / `spatial-shift` / `stack-pop` 的映射

### Phase 3：装饰层后处理（后端改动）
6. 在 `llm_composer.py` Step 3 中增加 `_apply_decoration_layers()`
7. 根据 narrativePhase + theme 自动叠加装饰元素

### Phase 4：动画增强（前端改动）
8. 新增 4 种动画类型（reveal, blur-in, 3d-flip, path-follow）
9. 更新 AnimationType 类型 + applyAnimation 实现
10. 更新 Step 2 prompt 引导使用 loop 和新动画

## 参考来源：web-video-presentation 项目拆解

从 `web-video-presentation/` 项目中拆解出以下可直接复用到 Remotion 管线的设计资产：

### 可复用的动效原语

| 原语 | 来源 | 复用方式 |
|------|------|---------|
| **MaskReveal** (clip-path wipe) | `templates/src/components/MaskReveal.tsx` + `animations.css` | → 新增 `reveal` AnimationType，用 `clip-path: inset()` 从左到右揭示文字 |
| **Rule Grow** (scaleX 从 0→1) | `animations.css` `.rule-grow` | → 已有 `bar-grow` 动画，可直接用于 accent-bar 元素 |
| **Stamp Drop** (scale overshoot) | `EXAMPLES/hook-chapter/chapter.css` `hk-stamp-drop` | → 新增 `stamp-drop` AnimationType，scale(2.4)→scale(0.92)→scale(1) |
| **Brush Strike** (横线划过) | `EXAMPLES/hook-chapter/chapter.css` `hk-brush-strike` | → 新增 `brush-strike` AnimationType，scaleX(0)→scaleX(1) 用于划掉效果 |
| **Pop-in** (scale+rotate overshoot) | `animations.css` `pop-in` | → 已有 `scale-bounce`，可增强加入 rotation |
| **Letter Stagger** (逐字入场) | `animations.css` `.letter-stagger` | → 已有 stagger 系统，引导 LLM 使用 |
| **Pulse Halo** (扩散环) | `animations.css` `pulse-halo` | → 已有 `loop: pulse`，可直接引导使用 |

### 可复用的主题设计系统

`web-video-presentation` 有 10 套主题（`themes/`），每套主题用 `theme.json` + `tokens.css` 定义：

| 主题 | 风格 | 可映射到 Remotion 背景 |
|------|------|----------------------|
| `bauhaus-bold` | 包豪斯/布鲁塔利，锐角、粗线、偏移阴影 | → `light-beam` 背景 + 直角卡片 |
| `terminal-green` | 80s 磷光终端，CRT 扫描线，纯绿单色 | → `dark-neon` 背景 + scanline decoration |
| `midnight-press` | 电影感深色编辑风格，慢速 cinematic 动画 | → `fluid-aurora` 背景 + vignette |
| `newsroom` | 报纸印刷，印章砸下、刷线效果 | → `tech-overlay` 背景 |
| `chalk-garden` | 粉笔黑板，手绘感 | → `dot-grid-bg` 背景 |
| `warm-keynote` | 暖色调 keynote 演讲 | → `light-beam` 背景 |

**主题 token 契约**（可注入到 `globalSettings.theme`）：
```
palette:     --shell, --surface, --surface-2/3, --text/2/mute/faint, --rule, --accent/soft/glow
fonts:       --font-display-cn/en, --font-body, --font-mono
motion:      --dur-quick/base/slow/cinematic, --ease-quart/expo/soft/overshoot
identity:    --r-card (卡片圆角性格), --rule-w (分割线粗细), --hero-num-* (大字风格)
             --card-shadow (卡片阴影性格), --stage-border (舞台边框)
decoration:  --surface-pattern (表面纹理), --surface-vignette (暗角)
```

### 可复用的设计方法论

从 `CHAPTER-CRAFT.md` 提炼的核心原则（应注入到 Step 2 prompt）：

1. **内容驱动动画** — 先找内容的"内在动作"（数字递增、对比展开、流程连通），找不到才用入场动画兜底
2. **逐步揭示** — 清单/列表 1 项 = 1 步，严禁一次 stagger 上 N 项
3. **视觉演示** — 每章至少 1-2 处 CSS/SVG/Canvas/JS 演示，纯文字 = 验收不过
4. **字号狠对比** — hero 文字 ≥ 80px，正文 16-20px，极端对比制造视觉张力
5. **避免 AI 味** — 禁止紫粉渐变、圆角彩色边框、假插画、emoji、全场同一种入场动画
6. **画面密度 > 口播密度** — 屏幕信息要比口播更丰富，从 Analyzer 的结构化知识抽细节挂到画面

### 具体新增内容

#### 从 web-video-presentation 引入的新 AnimationType

```typescript
// 新增 4 种动效（来自 animations.css + examples）
"reveal"       // clip-path: inset(0 100% 0 0) → inset(0 0 0 0)，文字从左到右揭示
"stamp-drop"   // scale(2.4) → scale(0.92) → scale(1) + rotate(-8deg)，印章砸下效果
"brush-strike" // scaleX(0) → scaleX(1)，横线划过
"blur-in"      // filter: blur(20px) → blur(0) + opacity 0→1，模糊到清晰
```

#### 从 web-video-presentation 引入的主题映射

在 Step 1 `template_catalog.md` 中新增 3 种映射模板：
- `terminal-green` — 映射到 `dark-neon` 背景 + phosphor-green 配色 + scanline decoration
- `midnight-press` — 映射到 `fluid-aurora` 背景 + warm-dark 配色 + cinematic 缓动
- `bauhaus-bold` — 映射到 `light-beam` 背景 + sharp-corner 配色 + 快速锐利动画

## 验收标准

- [ ] Step 2 prompt 包含完整组件目录（60+ 组件含 props 描述）
- [ ] Step 2 prompt 包含 5+ 种设计模式模板
- [ ] Step 2 prompt 包含叙事节奏视觉映射
- [ ] SceneConfig 增加 narrativePhase 字段
- [ ] TransitionRegistry 中 soft-replace、spatial-shift、stack-pop 使用自定义实现而非 fade
- [ ] Blueprint 后处理自动为 dark-neon/fluid-aurora 主题添加 FilmGrain
- [ ] Hook/Climax 场景自动添加 CinematicBars
- [ ] 新增至少 2 种动画类型（reveal, blur-in）
- [ ] LLM 生成的 Blueprint 元素嵌套深度 ≥ 2（layout > content 而非 flat elements）
- [ ] 每个 scene 至少包含 1 个 decoration 层元素
