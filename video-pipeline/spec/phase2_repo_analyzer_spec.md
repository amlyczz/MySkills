# 阶段 2 与阶段 3：深度重构与百科全书式知识提取 (V3)

## 一、 领域提示词维度的极致扩充与“按需画图”

### 0. 无论任何领域的**通用维度底座 (Common Base)**
- **🚀 快速开始 (Quick Start)**
- **💡 适用场景 (Use Cases)**
- **📖 用法介绍 (Usage Intro)**

> **✨ 新增：AI 自动研判绘图 (Dynamic Diagram Generation)**
> 大模型在分析源码时，将被赋予“架构绘图师”的权限。如果它觉得纯文字无法解释清楚，会在输出文档中直接使用 **Mermaid 语法** 画图：
> - 遇到网络架构或状态机，自动画出**状态流转图 (State Diagram)** 或**数据流图 (Data Flow Diagram)**。
> - 遇到微服务或复杂依赖，自动画出**系统架构图 (Architecture Diagram)**。
> - 遇到复杂的业务步骤，自动画出**时序图 (Sequence Diagram)**。

### 🧠 1. `AI_MODEL` 域（底层模型与算法）
- **网络架构与维度流转 (Network & Tensor Flow)**
- **Why it's designed this way (设计哲学)**
- **工程优化底座 (Engineering Optimization)**
- **数学与线性代数视角**

### 🤖 2. `AI_AGENT` 域（智能体与编排框架）
- **Harness 工程架构 (Harness Architecture)**
- **实现与底层机制 (Implementation & The "Why")**
- **采用的哲学范式 (Philosophical Paradigm)**

---

## 二、 精选素材池：从“暴力全下”到“按需懒加载 (Lazy Download)”

### 🔍 阶段 1: 智能索引收集 (Material Indexing)
- **只记录元数据 (JSON 化)**：去遍历 GitHub API 和 README 树，只提取出图片的 URL、Alt 描述文字、周围的 Markdown 上下文。将这上百个候选人记录成纯文本的 JSON 候选池 (`candidate_materials.json`)。
- **唯一允许落地的活儿**：在这个阶段，只有**高价值且容易丢失**的网页动作会立刻落盘（如全局长截图，录屏）。

### 🧠 阶段 2: 大模型鉴赏与挑选 (Repo Analyzer Curating)
- **输入**：大模型拿到源码、README，以及上面那份记录着几十个图片/动图 URL 与其周边文字上下文的 `candidate_materials.json`。
- **输出**：大模型输出一份含有 **约 20 个高优 URL 的精选清单**。

### 📥 阶段间 (Phase Transition): 按需真实下载 (On-demand Fetching)
- 在 Repo Analyzer 确定了那 20 个 URL 后，系统会**立刻启动一个轻量级的 Downloader 工具**。将文件落盘到 `output/repo_name/assets/` 下。

### 🎬 阶段 3: 剧本调用 (Script Composer)
- 剧本撰写节点此时拿到的就是：深度干货的百科全书 + AI 画的 Mermaid 架构图 + **本地已经躺好的 20 张极其精准的高质量素材图**。
