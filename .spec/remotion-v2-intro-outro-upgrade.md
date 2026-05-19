# Spec: Remotion Intro/Outro 升级 — 背景动效 + Ken Burns 素材动效 + 内容层完全重构

## Problem

当前 v2 Intro/Outro 只有基础 spring translateY 滑入 + 静态渐变背景。视觉效果粗糙，缺乏科技感和高级感。录制的视频和爬取的图片素材也没有平移/缩放动效。

## Design Goals

1. **背景层动效**：Starfield / Bokeh / GeometricPatterns / PixelTransition 四选一
2. **内容层完全重构**：基于动画设计 10 原则，追求高雅、美观、舒适的动效体验
3. **素材 Ken Burns 效果**：图片转视频时自动添加 pan/zoom
4. **模块化架构**：背景、内容、素材三层解耦

## 动画设计原则（JR Canest 10 Principles）

| 原则 | 应用 |
|------|------|
| Timing, Spacing, Rhythm | 标题 → 副标题 → 要点 的节奏感，每个元素之间有精确的帧间隔 |
| Eases | spring() 的 damping/mass 精调，让运动不突兀不生硬 |
| Mass & Weight | 大标题用大 mass + 高 damping（厚重缓慢），要点用小 mass（轻盈） |
| Anticipation | 标题出现前先有微小反向位移（-5px → +60px → 0px），增强力度感 |
| Arcs | 要点列表项沿弧线入场（translateX + translateY 组合），非直线 |
| Follow Through | 标题到位后有微小回弹 overshoot（spring config overshootClamping: false） |
| Secondary Animation | 标题入场时同步有 underline 从 0 增长到满宽 |
| Exaggeration | 背景粒子足够大、足够多，不能畏畏缩缩 |
| Appeal | 最终效果必须是"好看"的 |

## Intro 动画时间轴（300 帧 / 10 秒 / 30fps）

```
Frame  0-15:  背景动效开始 + 半透明遮罩渐入
Frame 15-40:  标题从下方 arc 弧线入场（spring, mass=1.2, damping=14）+ anticipate 反向 5px
Frame 30-60:  Underline 从中心向两侧生长（渐变 accent 色）
Frame 40-65:  Tagline 淡入 + 轻微 scale（0.95 → 1.0）
Frame 60-80:  要点 1 沿弧线滑入（从左下到中心位）
Frame 68-88:  要点 2
Frame 76-96:  要点 3
Frame 84-104: 要点 4
Frame 92-112: 要点 5
Frame 112-300: 所有元素稳定展示，背景动效持续
```

## Outro 动画时间轴

```
Frame  0-15:  背景动效开始 + 遮罩渐入
Frame 15-40:  URL 从下方 spring 入场（mass=1.5, 更厚重）
Frame 35-55:  Stats 淡入（比 URL 延迟 20 帧）
Frame 55-70:  Underline 生长
Frame 65-90:  Summary 淡入 + 轻微 translateY
Frame 90-300: 稳定展示
```

## Technical Approach

### 一、背景动效组件（4 个）

`remotion/src/backgrounds/` 目录：

所有背景统一接口：
```typescript
interface BackgroundProps {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
}
```

| 组件 | 效果描述 |
|------|---------|
| Starfield | 80 颗星从中心向外扩散，大小随距离增大，模拟透视 |
| BokehCircles | 15 个柔和光斑漂浮 + 脉冲，radial-gradient 实现 |
| GeometricPatterns | 20 层旋转几何线框，spring 驱动旋转 + 缩放 |
| PixelTransition | 像素块随机出现，HSL 颜色基于主题色偏移 |

### 二、Intro.tsx 完全重构

两层结构 + 精调动画参数：

```tsx
<AbsoluteFill>
  {/* 背景层 */}
  <AbsoluteFill><BackgroundLayer ... /></AbsoluteFill>

  {/* 半透明遮罩 — 控制背景不抢焦点 */}
  <AbsoluteFill style={{ background: overlayGradient }} />

  {/* 内容层 */}
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    {/* 标题：anticipate + arc 弧线 + overshoot */}
    {/* Underline：宽度从 0 增长 */}
    {/* Tagline：scale + fade */}
    {/* Points：弧线入场，逐条 stagger */}
  </AbsoluteFill>
</AbsoluteFill>
```

关键动画参数：
- 标题 spring: `{ mass: 1.2, damping: 14, stiffness: 80 }` — 中等力度回弹
- 要点 spring: `{ mass: 0.6, damping: 18 }` — 轻盈
- Underline: `interpolate(frame, [30, 60], [0, 100%])` — 线性增长
- Tagline: `interpolate(frame, [40, 60], [0, 1])` — 渐显

### 三、Outro.tsx 完全重构

类似结构，但 URL 使用更大 mass（1.5），Stats 使用渐显。

### 四、KenBurnsClip 组件

```typescript
interface KenBurnsClipProps {
  imageUrl: string;
  durationInFrames: number;
  panFromX: number; panFromY: number;
  panToX: number; panToY: number;
  zoomFrom: number; zoomTo: number;
}
```

运动模式（5 种，随机选取）：
| 模式 | 效果 |
|------|------|
| slow-zoom-in | center→center, 1.0→1.3 |
| pan-left | right→left, 1.2→1.2 |
| pan-right | left→right, 1.15→1.15 |
| diagonal | top-right→bottom-left, 1.0→1.25 |
| slow-zoom-out | center→center, 1.3→1.0 |

### 五、allocate.py 变更

- 新增 `--bg-type` CLI 参数
- `generate_intro_outro()` 传递 bgType 到 props
- `image_to_video_clip()` 改为 Remotion KenBurnsClip 渲染

### 六、skill.md 更新

背景选择规则：`--bg-type` 显式指定，或 skill 根据仓库特征自动选择。

## File Changes

| 文件 | 操作 |
|------|------|
| `remotion/src/backgrounds/Starfield.tsx` | NEW |
| `remotion/src/backgrounds/BokehCircles.tsx` | NEW |
| `remotion/src/backgrounds/GeometricPatterns.tsx` | NEW |
| `remotion/src/backgrounds/PixelTransition.tsx` | NEW |
| `remotion/src/backgrounds/index.ts` | NEW |
| `remotion/src/KenBurnsClip.tsx` | NEW |
| `remotion/src/Intro.tsx` | REWRITE — 完全重构动画 |
| `remotion/src/Outro.tsx` | REWRITE — 完全重构动画 |
| `remotion/src/Root.tsx` | MODIFY — 注册 KenBurnsClip |
| `scripts-v2/allocate.py` | MODIFY — bgType + Ken Burns |
| `skill.md` | MODIFY — 背景选择规则 |

## Acceptance Criteria

1. `npx remotion studio` 预览时，4 种背景 + 12 套主题 + Intro/Outro 组合流畅美观
2. 标题有 anticipate 反向 + arc 弧线 + overshoot 回弹
3. Underline 有从中心向两侧生长的动效
4. 要点列表有 stagger 节奏感 + 弧线入场
5. KenBurnsClip 可渲染带 pan/zoom 的图片 MP4
6. allocate.py `--bg-type` 参数正确传递到 Remotion
7. 渲染的 10s MP4 播放时动画流畅无卡顿
