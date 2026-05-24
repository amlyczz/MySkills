# AI 视频智能生成管线重构方案 (LangGraph 版)

## 1. 架构目标与愿景
本项目旨在将当前基于 Code Agent（非确定性 Prompt 驱动）的视频生成管线，全面重构为基于 **LangChain + LangGraph** 的工业级自动化流水线。
核心解决上下文紊乱、执行结果薛定谔等痛点，并在关键节点引入**多维加权 QA 评估**与**跨 Agent 协同自愈（代码实时生成适配）**机制。

### 1.1 技术栈基准
- **包管理与运行时**：`uv` (极速 Python 包管理)
- **后端核心**：Python 3.12+, LangChain, LangGraph, Pydantic 2.x
- **前端与视频引擎**：TypeScript, React, Remotion
- **后期处理**：FFmpeg
- **设计系统**：遵循 `@frontend-design-system` 规范（哲学主题浅色系）

---

## 2. 后端整洁架构设计 (Clean Architecture)

后端严格遵守**整洁架构 (Clean Architecture)**，实现高内聚低耦合。严禁使用 `dict` 和 `Any`。

### 2.1 分层设计 (Layered Architecture)
- **领域层 (Domain)**: `RepoContext`, `VideoScript`, `Blueprint`, `QAScorecard` (基于 Pydantic BaseModels)。
- **用例层 (Use Case)**: LangGraph 工作流状态机。
- **基础设施层 (Infrastructure)**: LLM 封装、PostgreSQL 数据存储 (纯正 **SQLAlchemy 2.0** 异步驱动)、大文件存储 (本地/S3)、FFmpeg 调用、跨 Agent 通信总线 (Event Bus)、内置 Python 工具集 (Tools)。

---

## 3. 持久化与存储分离方案 (Storage Architecture)

为了实现服务端的横向扩展并保证数据的一致性，本架构严格区分**结构化数据**与**非结构化大文件**：
1. **结构化数据 (PostgreSQL + SQLAlchemy 2.0)**：
   - 所有的 JSON 产物（`content.json`, `blueprint.json`, `material_manifest.json`）将存储到 PostgreSQL 的 `JSONB` 字段中。
   - 领域层的 `Pydantic BaseModel` 与基础设施层的 `SQLAlchemy Declarative Base` 进行严谨的映射，绝不污染业务逻辑。
   - LangGraph 的状态持久化（Checkpointer / State）同样挂载到 PostgreSQL，确保哪怕服务重启也能从数据库恢复断点。
2. **非结构化大文件 (Local Storage / OSS)**：
   - 生成的视频 (`video.mp4`)、音频 (`voiceover.mp3`, `bgm.mp3`)、以及截图图片等大体积 Blob，存储在本地文件系统（对应生产环境的 S3 / OSS），并在 PostgreSQL 的对应表中记录它们的相对路径或 URL。

---

## 3. LangGraph 核心编排流与 QA 路由 (State Machine)

这是本次重构最核心的改进，我们在标准的串行管线中加入了多个**质量检测节点 (QA Nodes)** 与**自愈机制 (Self-Healing)**。

### 3.1 核心节点定义与流转逻辑

1. **`analyze_repo` 节点 (源码洞察与资产抓取)**:
   - **输入**：Repo URL。
   - **动作**：专职负责“情报收集”。挂载 **Playwright Tool**，驱动无头浏览器访问 GitHub、滚动捕获长截图、提取 README 和核心代码片段。
   - **输出**：强类型的 `RepoAnalysisModel`（包含项目类别、核心技术亮点、痛点分析、以及抓取到的原生视觉素材路径）。

2. **`compose_script` 节点 (剧本创作)**:
   - **输入**：`RepoAnalysisModel`（也可单独接收外部的文章或文字需求，实现极高复用率）。
   - **动作**：专职负责“内容创作”。依据传入的结构化洞察，生成带旁白的 `VideoScriptModel` 与最终定稿的素材清单 `MaterialManifest`。

3. **🛑 `qa_script` 节点 (内容多维评估)**:
   - **机制**：根据项目类型动态加载评分维度（如教学科普看重“逻辑清晰度、概念通俗度”）。由大模型进行加权打分。
   - **路由控制**：
     - **Score >= 80**: 正常流转至 `generate_blueprint`。
     - **Score < 80**: 携带评审意见流转回 `compose_script` 重新生成。最大重试次数为 3 次。
     - **Retry == 3**: 抛出异常或降级输出。

3. **`generate_blueprint` 节点**:
   - 根据脚本与对应的前端组件库，映射为视觉 Blueprint。

4. **🛑 `qa_blueprint` 节点 (视觉蓝图评估)**:
   - **机制**：由 LLM 作为视觉导演，审查调用的组件、模板、动效配置是否契合当前类型（如宣传片是否配置了足够顶级的动效参数，哲学风格是否使用了过于轻挑的色彩）。
   - **路由控制**：
     - **Score >= 80**: 正常流转至 `render_video`。
     - **Score < 80 & Retry < 3**: 流转回 `generate_blueprint`。
     - **Score < 80 & Retry == 3**: 触发底牌 -> 路由至 `agentic_code_gen`。

5. **🛠️ `agentic_code_gen` 节点 (跨 Agent 协同 / 代码生成)**:
   - **触发条件**：现有前端组件/样式已穷尽，连续 3 次无法满足视觉 QA 的 80 分要求。
   - **职责**：将需求打包为任务上下文（包含：缺少的组件、需要的样式、报错信息等），**通过 IPC/Socket 甚至 MCP 协议发送给本地独立的 Code Agent（如当前的 IDE 助手）**。
   - **操作流**：Code Agent 负责编写 React 代码 -> 调试改 Bug -> 重启/热更新 Remotion 服务。
   - **回传**：Code Agent 修复完成后，发送信号给 LangGraph，LangGraph 重新加载 State，退回 `generate_blueprint` 重新使用新写的组件适配。

6. **`render_video` 节点**:
   - 唤起 `npx remotion render` 输出成片。

7. **🛑 `qa_video` 节点 (终极成片多模态校验)**:
   - **机制**：利用多模态大模型与音频分析工具，抽取成片的帧序列和音频轨。
   - **检查项**：口播与字幕是否对齐、是否有 BGM、文字/素材是否发生物理重叠、样式是否冲突、背景一致性。
   - **路由控制**：
     - **参数级错误**（如字号太大导致重叠）：路由至 `generate_blueprint` 调参。
     - **内容级错误**（如口播词太长）：路由至 `analyze_and_compose` 删减字数。
     - **组件级/渲染代码错误**（如 Flex 布局代码写死导致溢出）：路由至 `agentic_code_gen` 呼叫 Code Agent 修改 React 源码。
     - **通过**：流转至 `post_process`。

8. **`post_process` 节点 (后期合成与压制)**:
   - **机制**：完全继承并重构原有的 `post-producer` 模块逻辑。
   - **动作**：
     - 调用 FFmpeg 进行高级音频混音（Voiceover + BGM Sidechain Ducking 自动避让）。
     - 依据时间轴数据生成 SRT，并使用 `subtitles` 过滤器将字幕硬烧录到视频中。
     - 组装最终成品 `final.mp4` 并输出。

---

## 5. 跨层基建映射 (Cross-Cutting Infrastructure)

原有的离散脚本（如 `media-generator`）将按以下方式融入新的架构体系：

### 5.1 统一媒体生成中心 (Media Generator Service)
- **定位**：不再作为割裂的命令行工具，而是作为 **基础设施层 (Infrastructure)** 的全局单例服务 (Singleton Service)。
- **封装形式**：将 `media-generator` 包装为 LangChain 规范的 `@tool` (如 `ToolGenerateBGM`, `ToolGenerateVoiceover`)。
- **调用时机**：在 `compose_script` 节点生成完台本后，或者单独设立一个并行的 `generate_media_assets` 子图，并发调用这些 Tool 生成音频、封面图，并落盘到统一工作区。

## 6. 生产级周边支撑 (Production-Readiness)

为了确保这是一套名副其实的“企业级流水线”，基于我对系统架构的通盘推演，目前还补齐了以下三个不可或缺的横向切面：

### 6.1 用户交互控制台 (Control Panel Frontend)
控制台是人机共驾的中枢，整体设计严格遵循 `@frontend-design-system` 的“哲学经典书籍”美学（羊皮纸底色、墨黑正文、暗红强调、无圆角硬边几何布局）。
- **技术栈**：Vite + React + TypeScript + Tailwind CSS (严格受限的 Token)。
- **核心页面结构**：
  1. **工作台主页 (Dashboard)**：
     - **极简表单**：居中对齐的单行输入框，输入 GitHub URL 或长文本，回车直接触发解析任务。
     - **历史卷轴 (Task List)**：以报纸排版的双栏列表展示历史任务的状态（排队中/进行中/待干预/已完成），点击卡片进入详情。
  2. **流转监控室 (Task Detail / Live Graph)**：
     - **DAG 可视化**：左侧面板渲染 LangGraph 的拓扑图，当前高亮节点会呼吸闪烁（如停在 `qa_blueprint`）。
     - **打字机日志流**：右侧面板通过 WebSocket 实时接收后端的 stdout 和大模型思考流，使用经典的 Monospace 终端字体展示。
     - **QA 成绩单**：动态展示评分雷达图和评审意见（如“逻辑通俗度 85，动效视觉 92”）。
  3. **人机共驾断点模态框 (HITL Modal)**：
     - 当管线触发 `interrupt`（如连续 3 次 QA 失败或生成了新代码需要 Review）时，整个界面会蒙上一层半透明石墨灰遮罩。
     - 弹出硬边卡片：“🚨 阻断求助：系统无法生成匹配主题的拓扑图组件”。
     - 提供交互按钮：`强制跳过` / `修改台本再试` / `批准外挂 Agent 的新代码`。用户决策后，通过 API 发放 `resume` 信号唤醒挂起的 LangGraph。

### 6.2 异步任务队列与并发控制 (Concurrency Management)
- 视频渲染 (Remotion) 和 FFmpeg 压制是吃 CPU 和内存的怪兽。如果同时涌入 5 个任务，服务器会直接 OOM 崩溃。
- **机制**：采用大道至简的方案，抛弃沉重的 Celery/RQ，直接在应用层使用 **Python 原生的 `asyncio.Semaphore`** 实现本地级别的并发熔断与限流，确保任意时刻只有一个极其耗费资源的渲染节点在运行，其余请求在内存队列中挂起等待。

### 6.3 可观测性与 LLM 追踪 (Open-Source Observability)
- **挑战**：当 LLM 打分节点抛出不可预知的幻觉，或者连续 3 次 QA 失败时，我们必须能知道“它当时是怎么思考的”。
- **方案**：采用免费且强大的开源可观测性平台 **Langfuse**（完全开源，可本地 Docker 部署，无缝集成 LangChain）。
- **效果**：它能精准记录每一次 Prompt 的变量注入、结构化输出的 JSON 耗时、以及精确到每一步的 Token 开销。遇到 Bug，点开 Langfuse 面板就能像看堆栈报错一样，彻底掀开大模型的黑盒。

---

## 4. 前端与视频引擎设计 (Frontend & Remotion)

基于既有的 `@frontend-design-system` 构建，采用经典的黑格尔/马克思哲学实体书美学。
- **色彩与排版**：羊皮纸底色 (`#F9F9F6`)，墨黑正文，经典暗红强调色；衬线字体（Serif）构建厚重的阅读质感。
- **Remotion 引擎**：高度纯粹化，仅接受 `blueprint.json` 驱动。任何涉及到组件库拓展的工作，均由上述的 `agentic_code_gen` 节点交由外挂的 Code Agent 负责实现。
