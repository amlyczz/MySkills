# 阶段 4: 监控面板 UI 与动态管线图重构 (Spec)

## 一、 核心目标

随着视频合成系统支持的信息源越来越多（Github Trending, Github URL, Twitter URL），原有的基础 Tab 切换和垂直的静态日志列表已经无法满足管线监控的复杂度。

本方案旨在重构 `TaskMonitor.tsx`，引入基于 React Flow 的动态 DAG（有向无环图）可视化机制，并提供更加现代化、模块化的任务入口与日志终端。

## 二、 界面布局架构

整体页面采用**上下分层布局**：

### 1. 顶部：输入源矩阵卡片区 (Source Cards)
采用带有 Glassmorphism（毛玻璃质感）的大尺寸卡片作为输入源选择。
*   **卡片一**：🔥 GitHub Trending（默认）
*   **卡片二**：🔗 GitHub URL
*   **卡片三**：🐦 Twitter URL
**交互行为**：用户点击卡片后，卡片下方会动态渲染专属的表单组件（例如 Github URL 框或 Twitter URL 框）。选中态的卡片将带有霓虹阴影高亮。

### 2. 中部：管线执行 DAG 视图 (Pipeline Flow Graph)
使用 `@xyflow/react` (React Flow) 替代纯手工编写的静态步骤条，展示真实的流向图。
*   **结构**：从左至右的多路分支合并结构。
    *   源节点组：`Github Trending`, `Github URL`, `Twitter Source`。
    *   分析节点组：`Repo Analyzer` (承接 Github 流) 和 `Twitter Analyzer` (承接 Twitter 流)。
    *   主干管线组：汇聚到 `Script Composer` -> `Blueprint` -> `Audio` -> `Render`。
*   **动态连线 (Animated Edges)**：根据任务当前的状态，激活特定路径上的发光连线（例如：Twitter 任务将点亮 `Twitter -> Twitter Analyzer -> Composer` 这条路径）。

### 3. 底部：流式终端与 HITL 交互区 (Terminal & HITL)
采用黑客风/极客风的深色终端界面。
*   **左侧分栏 (SSE Terminal)**：通过 WebSocket/SSE 实时流式输出后端的日志，支持颜色高亮（如红色 `ERROR`，绿色 `COMPLETED`，黄色 `PAUSED`）。
*   **右侧分栏 (HITL Area)**：当管线处于 `hitl_trending`, `hitl_script_review` 等暂停节点时，在此区域展示对应的审批和数据调整面板。平时如果无 HITL 任务，左侧终端可全屏扩展。

## 三、 技术栈选型
*   **布局与样式**：Tailwind CSS (响应式与深色模式)
*   **DAG 渲染**：`@xyflow/react` (提供平移缩放、自定义节点、动态边动画等能力)
*   **图标组件**：`lucide-react`

## 四、 错误处理与容错
由于管线可能会在运行中失败（例如图表生成失败），在获取状态时，如果后端无法提供精确的 `failed_node`，UI 必须停止运行，维持原样并展示全局报错，**严禁使用任何“猜侧”逻辑自动倒退至起点节点**，以避免状态的错乱和时光倒流。
