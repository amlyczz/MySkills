# Video Pipeline 前端设计系统规范 (Design System)

本设计系统基于原子设计理论与系统性原则构建，作为 Video Pipeline 前端所有 UI 组件与页面布局的绝对执行标准。所有的样式、交互和响应式设计均须严格遵循以下规范。

---

## 一、 色彩系统 (Color System)

色彩定义采用 **基础色板 (Palette) -> 语义化颜色 (Semantic) -> 组件颜色 (Component)** 的三层映射机制。

本系统采用暗黑赛博朋克极客风格，以深色为底，高饱和度荧光色为辅。

| 语义分类 | 抽象定义 | 具体值 (Tokens) |
| :--- | :--- | :--- |
| **品牌主色 (Primary)** | 代表品牌视觉核心，用于主要操作、高亮选中。 | **Cyan / Purple**<br/>基准：`#00F0FF` (Cyan), `#7000FF` (Purple)<br/>衍生梯度：使用 Tailwind 的 `cyan-400` 至 `cyan-600` 等。<br/>主按钮/焦点：`#00F0FF`。 |
| **成功 (Success)** | 表达积极、完成、安全的状态。 | **Green**<br/>基准：`#10B981` (emerald-500)<br/>满足 WCAG AA 标准，用于 Pipeline 成功节点。 |
| **警告 (Warning)** | 表达需要注意、可能有副作用但非致命的状态。 | **Amber / Orange**<br/>基准：`#F59E0B` (amber-500)<br/>用于 HITL (人工介入) 等需注意状态。 |
| **危险/错误 (Danger/Error)** | 表达系统异常、破坏性操作。 | **Red**<br/>基准：`#EF4444` (red-500)<br/>用于系统报错、阻断型故障。 |
| **信息 (Info)** | 表达中立提示、辅助说明。 | **Blue**<br/>基准：`#3B82F6` (blue-500) 或直接复用主色 Cyan。 |
| **中性色 (Neutral/Gray)** | 构成页面骨架，用于文本、背景、边框、禁用态。 | **Obsidian Black / Slate**<br/>背景底色：`#0B0E14`<br/>面板色：`bg-black/40` 或 `rgba(255,255,255,0.05)`<br/>主文本：`#FFFFFF`<br/>次文本：`#8A92A6`<br/>禁用/边框：`rgba(255,255,255,0.1)` |

### 暗黑模式映射规则
*本系统为**全局强制暗黑模式 (Dark Mode Only)**。*
- **bg-surface**: 浅色透明玻璃态 `bg-white/5` 配合 `backdrop-blur(16px)`。
- **text-main**: 纯白 `#FFFFFF`。
- **text-muted**: 灰蓝色 `#8A92A6`。

---

## 二、 排版与字体系统 (Typography System)

排版基于数学比例（Type Scale），采用 **1.2 (Minor Third)** 缩放比例。

| 维度 | 具体值 |
| :--- | :--- |
| **字号 (Font Size)** | 基础字号 `1rem` (16px)。<br/>梯度：`text-xs`(12px), `text-sm`(14px), `text-base`(16px), `text-lg`(18px), `text-xl`(20px), `text-2xl`(24px), `text-5xl`(48px)。 |
| **字重 (Font Weight)** | Regular `400`（正文），Medium `500`（按钮/次标题），Semibold `600`（高亮），Extrabold `800`（大标题）。 |
| **行高 (Line Height)** | 正文段落：`1.6`<br/>标题：`1.2`<br/>单行组件/按钮：`1.0` 或等同容器高度。 |
| **字体栈 (Font Family)** | **无衬线正文 (Sans)**: `"Inter", "Helvetica Neue", Arial, sans-serif`<br/>**等宽代码 (Mono)**: `"JetBrains Mono", "Courier New", Courier, monospace` |

---

## 三、 空间、尺寸与布局 (Spatial & Layout System)

采用基础倍数计算法（Base Unit Scale = `4px`），消灭界面中的魔法数字。

| 维度 | 具体值 |
| :--- | :--- |
| **间距系统 (Spacing)** | `4px` 步进系统。<br/>Token 示例：`p-1`(4px), `p-2`(8px), `p-3`(12px), `p-4`(16px), `p-6`(24px), `p-8`(32px), `p-10`(40px)。 |
| **尺寸限制 (Sizing)** | **图标**: `w-4 h-4`(16px), `w-5 h-5`(20px), `w-6 h-6`(24px), `w-8 h-8`(32px)<br/>**按钮/表单高度**: 小号 `32px`, 中号 `48px`。 |
| **栅格与容器 (Grid)** | 容器最大宽度 `max-w-7xl` (1280px)。<br/>主体采用 12 栏栅格 (`grid-cols-12`)，Gutter = `gap-6` (24px) 或 `gap-8` (32px)。 |

---

## 四、 形态与层级 (Shape & Elevation System)

本系统使用 Glassmorphism (毛玻璃) 搭配锐利边缘构建极客风格的层级关系。

| 维度 | 具体值 |
| :--- | :--- |
| **圆角 (Border Radius)** | 基础面板：`rounded-lg` (8px)<br/>弹窗与大容器：`rounded-2xl` (16px)<br/>药丸状/图标底座：`rounded-full` (9999px) |
| **边框粗细 (Border Width)** | 默认 `1px` (`border-white/5` 或 `border-white/10`)。<br/>焦点/高亮状态 `2px` (`border-[var(--color-accent)]`)。 |
| **透明度 (Opacity)** | 禁用态：`opacity-50`<br/>深色遮罩 (弹窗背景)：`bg-black/60` |
| **发光与阴影 (Glow/Shadow)** | **悬浮层级 (Level 1)**: `shadow-md`<br/>**重要强调 (Level 2)**: 赛博发光 `shadow-[0_0_15px_rgba(0,240,255,0.3)]`<br/>**全局弹窗 (Level 3)**: 搭配 `backdrop-blur-sm` 的全屏蒙层 |

---

## 五、 动效与过渡系统 (Motion Design System)

所有动态效果需克制且流畅，严禁生硬跳变。

| 维度 | 具体值 |
| :--- | :--- |
| **持续时间 (Duration)** | 悬浮/状态切换/色彩渐变: `150ms` (Tailwind 默认 `duration-150`)<br/>持续性呼吸灯 (Pulse): `2000ms`<br/>旋转 (Spin): 慢速 `duration-1000` |
| **缓动函数 (Easing)** | 状态变更标准: `ease-in-out` 或 `transition-all`<br/>进场: `ease-out`<br/>退场: `ease-in` |

---

## 六、 体验与可访问性 (UX & Accessibility)

| 维度 | 具体值 |
| :--- | :--- |
| **对比度合规** | 遵循 WCAG AA 标准。纯黑背景下的文本需保证足够灰度（如 `#8A92A6`），核心数据和提示必须采用高亮荧光色以保障阅读辨识度。 |
| **触控目标** | 最小交互热区须保证 `44x44px` 或 `48x48px`（针对按钮、输入框、可点击 Icon）。 |
| **焦点可见性** | 键盘导航必须保证 Focus Ring 可见，**严禁**仅设置 `outline: none` 而无视觉替代。<br/>输入框激活须有 `focus:border-[var(--color-accent)]` 响应。 |
