# 🏗️ Remotion 模块化模板引擎 — 终极架构规范 (v4.0)

> **目标**：建立一套基于 AI Agent 的动态视频模板引擎。该引擎以 **10 大系统** 为核心基石，彻底防范 AI 的视觉与排版失控，并支持从 JSON 蓝图到带音频的高保真视频的工业级全自动渲染。

---

## 1. 引擎底层 10 大基石系统 (The 10 Core Systems)

为了实现无懈可击的 AI 视频生成，架构必须在底层锁死这 10 个维度的控制权：

### 🎨 A. 基础视觉系统 (Visual Foundation) —— 基于 Tailwind v4
1. **色彩系统 (Color System)**：借助 Tailwind v4，使用标准 React `style={{}}` 注入 `--color-primary` 等 CSS 变量，完全兼容 Tailwind v4 arbitrary values 特性。组件统一使用 `className="bg-primary text-foreground"`。
2. **排版系统 (Typography)**：通过注入 `font-display` 等字体变量，并统一下发文本尺寸工具类（如 `text-h1`, `text-body`）。
3. **空间布局 (Layout System)**：全面废弃绝对坐标与内联样式。依赖 Tailwind 的 Flex/Grid 工具类（如 `flex items-center justify-center gap-4`）构建防撞布局。
4. **形态层级 (Shape & Hierarchy)**：将 JSON 中的圆角与投影变量注入 `--radius-*` 和 `--shadow-*`。保证 `rounded-card` 能够随主题瞬间切换形态。

### 🎬 B. 视频动效系统 (Video Motion)
5. **动效过渡 (Motion System)**：内置 `animationRegistry` 与 `transitionRegistry`。提供弹簧 (Spring) 物理系统，所有元素入场统一由外层包装，组件退化为静态的 Dumb Components。
6. **时间编排 (Timeline Orchestration)**：利用 Remotion 的 `<Sequence>` 实现场景的时间隔离；通过 `animation.timeline.inFrame` 精准控制元素的交错入场 (Stagger)。

### 🔊 C. 媒体与音频系统 (Media & Audio)
7. **媒体资产 (Media Assets)**：增强 `ElementRenderer`，对图像和视频引入标准的 `object-fit` 裁切规则；引入对透明通道和 Lottie 矢量动画的映射支持。
8. **音频同步 (Audio & Beat-Sync)**：**新增音频层**。JSON 解析器在引擎顶层挂载 `<Audio>`，支持全局 BGM 和环境音效，将静态画面升级为真正的多媒体视频。

### 🛡️ D. 工程健壮性系统 (Engineering Resilience)
9. **数据容错 (Resilience & TextFit)**：根据 Remotion 官方最佳实践，引入 `@remotion/layout-utils`。使用 `fitText()` 计算最佳字号，使用 `fillTextBox()` 预防多行溢出。针对 AI 生成的不可控文本长度，确保内容绝对不出界，从而实现防弹级别的排版稳定性。

### 🧩 E. 组件注册与复用体系 (Component Registry & Reuse) —— v4.0 新增
10. **组件注册表 (Component Registry)**：所有可视化组件必须通过 `componentRegistry` 注册，以 `ComponentType` 字符串 ID 索引。组件分为四层：
    - **布局层** (Layout)：`split-layout`, `center-layout`, `browser-mockup`, `iphone-frame` — 纯容器，不包含业务样式
    - **内容层** (Content)：`text-block`, `pricing-card`, `data-bar-chart`, `agent-card`, `flow-music-card` 等 — 业务组件，接收 props 渲染
    - **装饰层** (Decoration)：`aurora-bg`, `organic-blob`, `cursor`, `dot-grid-bg` — 纯视觉效果，无业务语义
    - **基元层** (Primitive)：`text`, `image`, `video`, `shape`, `div` — 引擎内置，不在 registry 中

    **注册表规则**：
    - 组件必须是 Dumb Component（无入场动画，无 `useCurrentFrame` 驱动的 opacity/transform 入场）
    - 允许保留微动效（typewriter 逐字、呼吸脉冲、shimmer 扫光等内部循环效果）
    - 所有尺寸/颜色/圆角通过 Tailwind class + CSS 变量接收，不从 props 接收硬编码色值
    - 新增组件必须先注册再使用，`ElementRenderer` 通过 registry 动态解析

    **注册表本身也是注册表**：`backgroundRegistry`、`animationRegistry`、`transitionRegistry`、`sceneRegistry` 各自独立，遵循同样的「字符串 ID → 实现」映射模式。

---

## 2. 终极版 Blueprint JSON Schema 规范

大模型输出的 JSON 将包含上述 9 大系统的参数映射。全局固定为 **30 FPS**。LLM 必须自行在内部完成 `秒 -> 帧` 的换算。

```json
{
  "globalSettings": {
    "frameRate": 30,
    "resolution": { "width": 1920, "height": 1080 },
    "theme": {
      "colors": {
        "primary": "#A855F7",
        "background": "#0F0F0F",
        "surface": "#1A1A1A"
      },
      "typography": {
        "fontFamily": "Inter",
        "scales": { "h1": "48px", "body": "24px" }
      },
      "shape": {
        "radius": "16px",
        "shadow": "0 20px 40px rgba(0,0,0,0.5)"
      }
    },
    "audio": {
      "bgmUrl": "https://example.com/bgm.mp3",
      "bgmVolume": 0.5,
      "sfx": {
        "whoosh": "https://remotion.media/whoosh.wav",
        "click": "https://remotion.media/mouse-click.wav"
      }
    }
  },
  "globalBackground": "dark-neon",
  "scenes": [
    {
      "id": "scene-1",
      "durationInFrames": 120,
      "transitionToNext": "soft-replace",
      "voiceover": {
        "audioUrl": "https://tts.example.com/scene-1.mp3",
        "text": "Welcome to the future of search.",
        "startFrame": 0,
        "volume": 0.8
      },
      "subtitles": {
        "tokens": [
          { "text": "Welcome ", "fromFrame": 0, "toFrame": 15 },
          { "text": "to ", "fromFrame": 15, "toFrame": 30 },
          { "text": "the ", "fromFrame": 30, "toFrame": 45 },
          { "text": "future ", "fromFrame": 45, "toFrame": 60 },
          { "text": "of ", "fromFrame": 60, "toFrame": 75 },
          { "text": "search.", "fromFrame": 75, "toFrame": 100 }
        ],
        "highlightColor": "#39E508",
        "fontSize": 64
      },
      "sfx": [
        { "sfx": "whoosh", "atFrame": 0, "volume": 0.6 }
      ],
      "elements": [
        {
          "type": "split-layout",
          "props": { "ratio": "4:6" },
          "children": [
            {
              "type": "text-block",
              "props": { "type": "h1", "text": "自适应容错的长标题测试", "autoFit": true },
              "animation": { "type": "fade-up", "timeline": { "inFrame": 0 } }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 3. 基于 Tailwind v4 的“洗牌重构”法则

1. **全面替换内联样式**：移除所有 `style={{ backgroundColor: "#000" }}`，强制替换为 Tailwind v4 实用类（`className="bg-background text-foreground"`）。
2. **严格遵守动静分离法则**：所有时间轴动效被剥离出来，在 `ElementRenderer` 的包装器中统一使用 Remotion 的 `useCurrentFrame()` 和 `interpolate()` 重新实现。
3. **响应式自适应**：抹除固定的宽度和高度，使用 `w-full`, `flex-1`。
4. **安全文本测量**：使用 `@remotion/layout-utils` 的 `fitText`。

---

## 4. 实施结果报告 (Implementation Results)

We have successfully migrated the legacy codebase to a **9-dimension blueprint architecture** and systematically washed **40+ legacy components**.

### Phase 1.5 & 2: Infrastructure Patches
- **Tailwind `@theme` Injection**: Upgraded `TemplateRenderer.tsx` to read `globalSettings.theme` and dynamically generate Tailwind v4 CSS variables for colors, typography, and radii. Fix bug with browser `<style type="text/tailwindcss">` compiler bypass by directly using React inline custom properties mapped to Tailwind values. Added explicit Tailwind CSS injection on entry.
- **Layout & Resilience**: Integrated `@remotion/layout-utils` into the project. Upgraded primitives like `TextBlock` to use `fitText()`, ensuring long text safely scales down instead of overflowing.
- **Audio Context**: Activated `<Audio>` tag support globally based on blueprint parameters.

### Phase 2.5: Massive Component Wash
Through concurrent subagent processing, we refactored 41 legacy components (e.g., `BrowserMockup`, `DataBarChart`, `PricingCard`, `AnimatedText`, `SplitLayout`) to adhere to the strict **Dumb Component** specification:
1. **Removed Entrance Animations**: Stripped macro-animations like `useFadeInUp` and `interpolate` opacity. Components are now static targets, fully controlled by the orchestrator (`ElementRenderer`).
2. **Preserved Micro-Animations**: Kept internal effects like Typewriter logic (`PromptInput`) and geometric pulsing (`AuroraBg`).
3. **Pure Tailwind**: Wiped out `style={{...}}` blocks and absolute pixel sizing. Elements now seamlessly adapt to grid layouts and flexbox orchestrations. `SplitLayout` was updated to properly parse React `children`.

### Phase 3: The First Pipeline Integration
We deployed `src/templates/search-demo.ts`, demonstrating the first end-to-end usage of the new JSON Blueprint, combining `SplitLayout`, `TextBlock` (with `fitText`), and the newly washed `BrowserMockup` on a deep dark zinc-950 theme.
