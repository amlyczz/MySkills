# Twitter Analyzer + 动态 DAG 前端统一实现 Spec

## 一、 核心目标

本方案分两个主体：

1. **后端**：实现 Twitter 链接的 Agent 驱动分析管线（Agent Scraper + Twitter Analyzer），作为与 Repo Analyzer 并列的输入源分支，最终收束到 Script Composer。
2. **前端**：用 `@xyflow/react` (React Flow) 替换当前硬编码的静态步骤条，实现真实的多路分支汇聚 DAG 图，并增强 SSE 流式日志终端。

---

## 二、 领域层简化：Project / Task / DAG 三层职责拆清

### 2.1 当前混乱点

现有代码中，Project、Task、DAG 三层都有来源相关的字段，职责边界模糊：

| 层级 | 冗余字段 | 问题 |
|------|---------|------|
| `Project` | `source_type`, `repo_url`, `language`, `stars`, `thumbnail_url` | 项目不该绑定单一来源——一个项目可以包含多个不同类型的 Task |
| `PipelineState` | `project_category` | 这是 RepoAnalyzer 的输出（分类结果），不是 DAG 路由的输入 |
| DTOs (`project_dtos`, `task_dtos`) | `project_type = "educational"` | 硬编码默认值，没有实际用途 |

### 2.2 精简后的三层结构

```
┌────────────────────────────────────────────────┐
│  Project                                       │
│  id / name / description / created_at /         │
│  updated_at / task_count                        │
│  ─── 纯粹的内容容器，不存任何来源信息              │
└────────────────────┬───────────────────────────┘
                     │ 1:N
                     ▼
┌────────────────────────────────────────────────┐
│  PipelineTask                                  │
│  id / project_id / status / source_type /       │
│  repo_url|twitter_url /                        │
│  completed_nodes / current_node / failed_node / │
│  node_error / ...                              │
│  ─── 持有所需来源信息，驱动 DAG 执行              │
└────────────────────┬───────────────────────────┘
                     │ 1:1
                     ▼
┌────────────────────────────────────────────────┐
│  DAG (LangGraph 运行时)                        │
│  PipelineState TypedDict:                      │
│  task_id / source_type / repo_url /            │
│  |twitter_content| / content_model /           │
│  script / blueprint / ...                      │
│  ─── runtime state, 不持久化                    │
└────────────────────────────────────────────────┘
```

### 2.3 具体改动清单

| 文件 | 改动 |
|------|------|
| `domain/project/entities.py` | 删除 `source_type`, `repo_url`, `language`, `stars`, `thumbnail_url`；保留 `id`, `name`, `description`, `created_at`, `updated_at`, `task_count` |
| `domain/project/interfaces.py` | 对应更新接口（如果引用淘汰字段的话） |
| `presentation/dtos/project_dtos.py` | 删除 `project_type` |
| `presentation/dtos/task_dtos.py` | 删除 `project_type` |
| `application/workflow/state.py` | 删除 `project_category`；保留 `source_type` 作为 DAG 路由条件 |
| `domain/task/pipeline_task.py` | 删除 `project_category`（这是 RepoAnalyzer 的内部枚举输出，不属于 Task 持久层）；保留 `source_type` |
| `infrastructure/task/postgres_models.py` | 移除 `project_category` 列（迁移脚本或直接 drop column） |
| `infrastructure/task/postgres_repository.py` | 移除对应字段的读写 |
| `presentation/websocket/task_streamer.py` | 移除 `project_category` 的引用 |

注意：`ProjectCategory` 枚举（`domain/repo_analyzer/project_category.py`）本身保留，它是 RepoAnalyzer 的输出分类结果，在分析完成后写回 Task 的 `project_category` 字段即可——但作为 Analyzer 产物而非路由参数。

---

## 三、 后端：Twitter Analyzer 管线

### 3.1 数据流概览

```
Twitter URL
    │
    ▼
┌─────────────────────────────────┐
│  Agent Scraper (LLM + opencli)  │  ← 新节点
│  - 抓取主推文 / Thread / 评论    │
│  - 截图 / 媒体下载               │
└────────────┬────────────────────┘
             │ raw_text + media_urls + screenshots
             ▼
┌─────────────────────────────────┐
│  LLM Analyzer                   │  ← 新节点
│  - 提纯为 TwitterContentModel   │
└────────────┬────────────────────┘
             │ TwitterContentModel
             ▼
┌─────────────────────────────────┐
│  Script Composer (现有节点)      │  ← 汇聚点
└─────────────────────────────────┘
```

### 3.2 领域模型 — 新增文件

**文件**: `video-pipeline/backend/src/domain/twitter_analyzer/entities.py`

```python
class TwitterContentModel(BaseModel):
    """继承 ContentModel 并扩展 Twitter 特有字段"""
    # 复用的基础字段
    title: str
    author: str
    handle: str  # @username
    summary: str  # 一句话核心价值
    tech_domain: TechDomain  # 复用现有枚举
    stats: TweetStats  # Views, Likes, Reposts, Bookmarks

    # Twitter 特有扩展
    thread_context: ThreadNarrative  # 完整脉络（起承转合）
    community_sentiment: CommunitySentiment  # 评论风向分析
    external_links: list[ExternalLink]  # 外链与引用
    media_urls: list[str]  # 推文自带的图片/视频 URL
    screenshot_paths: list[str]  # 本地已下载的截图路径


class ThreadNarrative(BaseModel):
    """Thread 长文脉络"""
    total_tweets: int
    narrative_flow: str  # LLM 归并后的逻辑流
    key_points: list[str]


class CommunitySentiment(BaseModel):
    """社区评论情绪与分析"""
    overall_tone: str  # 赞同 / 质疑 / 中立
    top_endorsements: list[str]  # 有深度的补充或赞同
    top_corrections: list[str]  # 高价值的纠错或反驳
    toxicity_level: str  # low / medium / high


class TweetStats(BaseModel):
    views: int
    likes: int
    reposts: int
    bookmarks: int


class ExternalLink(BaseModel):
    url: str
    title: str
    description: str
```

### 3.3 Agent Scraper — LLM 驱动爬虫

**文件**: `video-pipeline/backend/src/infrastructure/twitter_analyzer/agent_scraper.py`

#### 架构

```python
class ScraperAgent:
    """LLM 驱动的自主爬虫智能体"""

    async def scrape(self, twitter_url: str) -> RawScrapeResult:
        # 1. 初始化 opencli 挂载浏览器
        # 2. LLM 决定初始命令（opencli twitter get <url> 等）
        # 3. 执行 → 读取 stdout/stderr → 分析结果
        # 4. 根据结果决定下一步：
        #    - 成功抓取 → 整理输出
        #    - 元素未加载 → 注入 wait/scroll 再试
        #    - 登录拦截 → 识别并退避/重试
        #    - 长 Thread 折叠 → 点击展开后再抓
        # 5. 截图核心推文+高赞评论
        pass
```

#### 错误恢复策略

| 场景 | Agent 行为 |
|------|-----------|
| "Element not found" | 尝试 `wait` 2-3s 后重试, 或滚动页面 |
| "Login required" | 识别弹窗, 尝试绕过或退避到截图模式 |
| 长 Thread 折叠 | 点击 "Show more" / "Show replies" 展开 |
| 评论加载不全 | 滚动到评论区底部 |

#### Open Questions（已确认）

- **opencli 环境**: 用户机器上已有 opencli 命令行可用
- **截图用途**: 保留截图作为多媒体素材供最终渲染使用（不丢弃）

### 3.4 LLM Analyzer — 数据提纯映射

**文件**: `video-pipeline/backend/src/infrastructure/twitter_analyzer/llm_analyzer.py`

```python
class TwitterLLMAnalyzer:
    """将 Agent Scraper 的原始抓取结果提纯为结构化的 TwitterContentModel"""

    async def analyze(self, raw: RawScrapeResult) -> TwitterContentModel:
        # 1. 拼接原始文本（主推文 + Thread + 评论）
        # 2. 调用 LLM 提取结构化字段
        # 3. 复用 TechDomain 枚举进行分类
        # 4. 返回 TwitterContentModel
        pass
```

### 3.5 LangGraph 管线集成

**文件**: `video-pipeline/backend/src/application/workflow/graph.py`

#### 新增节点

| 节点名 | 对应 UseCase | 输入 | 输出 |
|--------|-------------|------|------|
| `analyze_twitter` | `AnalyzeTwitterUseCase` | twitter_url | TwitterContentModel |

#### 路由修改

```python
def route_source(state: PipelineState) -> str:
    """根据 source_type 路由到不同的 Analyzer"""
    source = state.get("source_type", "github_url")
    if source == "twitter":
        return "analyze_twitter"
    return "analyze_repo"  # 默认走 Repo Analyzer
```

#### 修改后的边 (Edges)

```
                   ┌──────────────┐
                   │  entry_point  │
                   └──────┬───────┘
                          │
                  ┌───────┴───────┐
                  │ route_source   │  ← conditional: twitter → analyze_twitter
                  └───────┬───────┘           github   → analyze_repo
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               │
  analyze_repo    analyze_twitter         │
          │               │               │
          └───────────────┘               │
          ┌───────────────┘               │
          ▼                               │
    compose_script  ◄─────────────────────┘  (汇聚点)
          │
          ▼
    (后续节点不变: hitl_script_review → generate_diagrams → ...)
```

#### PipelineState 扩展

向 `state.py` 的 `PipelineState` TypedDict 中新增字段：

```python
class PipelineState(TypedDict):
    # ... 现有字段 ...
    twitter_content: Optional[TwitterContentModel]   # 新增
    source_type: str                                   # "github_url" | "github_trending" | "twitter"
```

#### NODE_TO_STATUS 扩展

向 `status_machine.py` 添加：

```python
NODE_TO_STATUS["analyze_twitter"] = PipelineStatus.ANALYZING
# analyze_twitter 复用 ANALYZING 状态, 通过 source_type 区分分支
```

#### VALID_TRANSITIONS 扩展

```python
PipelineStatus.PENDING: {
    PipelineStatus.FETCHING_TRENDING,
    PipelineStatus.ANALYZING,   # 从 PENDING 可以直接进 ANALYZING (twitter 场景)
    PipelineStatus.ERROR,
}
```

---

## 四、 前端：动态 DAG 视图重构

### 4.1 技术栈变更

| 当前 | 变更后 |
|------|--------|
| Tailwind Flex 静态步骤条 | `@xyflow/react` 动态 DAG |
| 手写左右连线伪线段 | React Flow 自定义边 + SVG 流动动画 |
| 无分支结构 | 真实多路分支 + 汇聚结构 |

需安装: `npm install @xyflow/react`（约 300KB gzipped）

### 4.2 DAG 节点布局

```
 Phase 1: Source         Phase 2: Analysis         Phase 3: Core Pipeline
 ┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────────┐
 │  GitHub Trending │────▶│  Repo Analyzer  │──┐  │                          │
 │  [cards icon]    │     │                 │  │  │                          │
 └─────────────────┘     └─────────────────┘  │  │                          │
                                               ├──▶│  Script → HITL → Diag   │
 ┌─────────────────┐     ┌─────────────────┐  │  │  → Blueprint → HITL →    │
 │  GitHub URL      │────▶│  Repo Analyzer  │──┘  │  Audio → Render          │
 │  [link icon]     │     │                 │     │                          │
 └─────────────────┘     └─────────────────┘     └──────────────────────────┘
 ┌─────────────────┐     ┌─────────────────┐
 │  Twitter URL     │────▶│ Twitter Analyzer│──┘
 │  [msg icon]      │     │                 │
 └─────────────────┘     └─────────────────┘
```

### 4.3 React Flow 实现

#### 自定义节点定义

```typescript
// pipeline-nodes.ts (或内联在 TaskMonitor)
const sourceNodes = [
  { id: 'github_trending', type: 'sourceNode', position: { x: 0, y: 0 }, data: { label: 'GitHub Trending', icon: 'flame' } },
  { id: 'github_url',      type: 'sourceNode', position: { x: 0, y: 100 }, data: { label: 'GitHub URL', icon: 'link' } },
  { id: 'twitter_url',     type: 'sourceNode', position: { x: 0, y: 200 }, data: { label: 'Twitter URL', icon: 'message' } },
]

// 每个分析节点位置居中对齐
const analysisNodes = [
  { id: 'analyze_repo',    type: 'processNode', position: { x: 250, y: 50 }, data: { label: 'Repo Analyzer' } },
  { id: 'analyze_twitter', type: 'processNode', position: { x: 250, y: 200 }, data: { label: 'Twitter Analyzer' } },
]

const coreNodes = [
  { id: 'compose_script',      type: 'processNode', position: { x: 500, y: 125 }, data: { label: 'Script Composer' } },
  { id: 'hitl_script_review',  type: 'hitlNode',    position: { x: 650, y: 125 }, data: { label: 'Script Review' } },
  { id: 'generate_diagrams',   type: 'processNode', position: { x: 800, y: 125 }, data: { label: 'Diagrams' } },
  // ...
]
```

#### 边定义与动态高亮

```typescript
const baseEdges = [
  // Source → Analysis
  { id: 'e-github_trending-analyze_repo', source: 'github_trending', target: 'analyze_repo' },
  { id: 'e-github_url-analyze_repo',      source: 'github_url',      target: 'analyze_repo' },
  { id: 'e-twitter_url-analyze_twitter',  source: 'twitter_url',     target: 'analyze_twitter' },
  // Analysis → Core (汇聚)
  { id: 'e-analyze_repo-compose_script',    source: 'analyze_repo',    target: 'compose_script' },
  { id: 'e-analyze_twitter-compose_script', source: 'analyze_twitter', target: 'compose_script' },
  // Core pipeline (线性)
  { id: 'e-compose_script-hitl_script_review',      source: 'compose_script',    target: 'hitl_script_review' },
  { id: 'e-hitl_script_review-generate_diagrams',   source: 'hitl_script_review', target: 'generate_diagrams' },
  { id: 'e-generate_diagrams-generate_blueprint',   source: 'generate_diagrams',  target: 'generate_blueprint' },
  { id: 'e-generate_blueprint-hitl_blueprint_review', source: 'generate_blueprint', target: 'hitl_blueprint_review' },
  { id: 'e-hitl_blueprint_review-audio_design',     source: 'hitl_blueprint_review', target: 'audio_design' },
  { id: 'e-audio_design-render_compose',            source: 'audio_design',         target: 'render_compose' },
]
```

**动态高亮**: 监听 `currentNode` + `source_type`，点亮激活路径上的边：

| 场景 | 高亮边集合 |
|------|-----------|
| Twitter 任务 | `twitter_url → analyze_twitter → compose_script → ...` |
| GitHub URL 任务 | `github_url → analyze_repo → compose_script → ...` |
| GitHub Trending 任务 | `github_trending → analyze_repo → compose_script → ...` |

未激活路径的边保持暗色（opacity 0.2），激活边的样式：
- 流动动画（`stroke-dasharray` + CSS `animation`）
- 霓虹发光滤镜（SVG `feGaussianBlur`）

#### SVG 发光连线

```tsx
// 自定义边组件中注入 SVG filter
<defs>
  <filter id="glow">
    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>
```

### 4.4 交互行为

- **Zoom & Pan**: React Flow 默认支持滚轮缩放和平移
- **节点点击**: 点击某节点可显示该阶段的详细信息
- **Source 选择**: 保留顶部卡片矩阵选择输入源，选中后 DAG 图自动聚焦到该分支

### 4.5 SSE 流式日志终端增强

保留现有双栏布局（左侧终端 + 右侧 HITL），增强以下功能：

| 特性 | 实现方式 |
|------|---------|
| ANSI 颜色 | 终端的日志行按 `[NODE] STATUS — detail` 格式解析着色 |
| 自动滚动 | `IntersectionObserver` 绑定底部锚点 |
| 日志分级 | `ERROR`(红色) / `WARN`(黄色) / `INFO`(白色) / `COMPLETED`(绿色) |
| 最大行数 | 保留最近 500 行，超出则截断防止内存泄漏 |

---

## 五、 前后端 DAG 状态一致性保证

### 5.1 核心原则

**后端是 DAG 状态的唯一权威 (Single Source of Truth)**，前端 DAG 渲染严格遵循后端推过来的状态数据，不做任何推测。

### 5.2 状态字段定义

后端 `PipelineTask` 实体维护三个进度字段，前端的 DAG 节点状态完全由此三者推导：

| 后端字段 | 类型 | 用途 | 持久化 |
|---------|------|------|--------|
| `completed_nodes` | `list[str]` | 已完成节点名列表（有序） | Postgres, 每次 `mark_node_completed` 时写入 |
| `current_node` | `str \| None` | 当前正在执行的节点名 | Postgres, 节点进入时设值, 完成时清空 |
| `failed_node` | `str \| None` | 失败节点名 | Postgres, 仅 ERROR 时设值 |

### 5.3 DAG 节点状态推导规则（纯函数）

前端 `getNodeState(nodeId)` 必须是**确定性纯函数**，只依赖后端提供的三个集合，没有任何分支猜侧逻辑：

```typescript
type NodeState = 'completed' | 'active' | 'hitl' | 'error' | 'idle'

function deriveNodeState(
  nodeId: string,
  completedNodes: Set<string>,
  currentNode: string | null,
  failedNode: string | null,
  pipelineStatus: string,
): NodeState {
  // 优先级 1: 已完成（后端明确标记）
  if (completedNodes.has(nodeId)) return 'completed'

  // 优先级 2: 失败节点（后端明确标记）
  if (failedNode === nodeId) return 'error'

  // 优先级 3: 当前节点
  if (currentNode === nodeId) {
    // 如果当前节点是 hitl_ 前缀，且管线状态匹配, 显示 hitl 态
    if (nodeId.startsWith('hitl_') && pipelineStatus.startsWith('hitl_')) return 'hitl'
    return 'active'
  }

  // 优先级 4: 其余均为 idle
  return 'idle'
}
```

**禁止**以下模式（代码审查必须拦截）：
- ❌ `if (!completedNodes.has(node) && !currentNode)` 遍历推测第一个未完成节点
- ❌ `STATUS_TO_PROGRESS` 或类似的静态状态→进度映射表作为主力（只能作为降级兜底，见 4.6）
- ❌ 根据 `logs` 数组长度/内容推导节点状态
- ❌ 在前端直接硬编码 `analyze_twitter` 跳过 `github_trending` 的逻辑

### 5.4 WebSocket 事件协议 — 精确的状态载荷

后端每个 WebSocket 消息必须携带完整的节点进度状态，便于前端直接覆盖：

```typescript
// node_event: 节点状态变更
interface NodeEvent {
  type: 'node_event'
  node: string              // 受影响的节点名
  status: 'started' | 'completed' | 'error'
  pipeline_status: string
  completed_nodes: string[] // 始终完整列表，非增量
  current_node: string | null
  failed_node: string | null
  detail?: string
  error?: string
}

// hitl_event: HITL 暂停
interface HitlEvent {
  type: 'hitl_event'
  node: string
  pipeline_status: string
  completed_nodes: string[]
  current_node: string
  reason: string
  data: Record<string, unknown>
}

// pipeline_event: 管线终态
interface PipelineEvent {
  type: 'pipeline_event'
  status: 'completed' | 'error'
  completed_nodes: string[]
  current_node: null
  failed_node: string | null
}
```

关键约束：
- `completed_nodes` **始终是完整快照**（非增量 diff），前端直接 `setCompletedNodes(new Set(msg.completed_nodes))` 覆盖
- 每条消息同时携带 `current_node` 和 `failed_node`
- 杜绝 "前端推理: 因为 msg.status==='error' 且没拿到 failed_node，所以猜最晚活跃的节点是失败节点" 这类猜侧

### 5.5 页面恢复 (Page Restore) 保证

当用户刷新页面时（刷新操作会重新触发 TaskMonitor 的 mount），前端通过 `GET /api/v1/task/{taskId}` 恢复状态：

```
GET /api/v1/task/{taskId} 响应:
{
  "status": "analyzing",
  "repo_url": "...",
  "completed_nodes": ["github_trending", "hitl_trending_review"],
  "current_node": "analyze_repo",
  "failed_node": null,
  "node_error": null,
  "source_type": "github_trending",  // 新增：用于 DAG 分支高亮判断
  "trending_repos": [...],          // 仅 HITL 时
  "script": {...},                   // 仅 HITL 时
  "blueprint": {...}                 // 仅 HITL 时
}
```

前端恢复流程（严格顺序）:

```
1. 获取 taskId → fetch API
2. 如果 API 失败 → 显示 "Failed to restore task" 错误消息，停止
3. 解析 response:
   a. completed_nodes → setCompletedNodes(new Set(data.completed_nodes))
   b. current_node → setCurrentNode(data.current_node) 或 null
   c. failed_node → setFailedNodes(有条件加入)
   d. source_type → 用于 DAG 分支高亮
   e. status → 用于 HITL/终端/最终态展示
4. 如果 status === 'error' 且 data.failed_node 为空 → 全局错误提示, **不猜测 fallback**
5. 如果任务是活跃态 (非 terminal, 非 HITL) → 自动重连 WebSocket
```

### 5.6 STATUS_TO_PROGRESS 降级条件

当前端通过 `GET /api/v1/task/{taskId}` 恢复时，如果以下条件**全部**满足，才允许使用 `STATUS_TO_PROGRESS` 降级补全：

1. `data.completed_nodes` 为空数组
2. `data.current_node` 为 `null`
3. `data.failed_node` 为 `null`
4. `data.status` 不为 `pending` 或 `error`

只有在这种"后端完全没存进度"的极端退化场景下，才根据 `status` 推导出近似的 `current_node` 占位。推导出的结果是只读展示用，不参与后续交互决策。

### 5.7 边际场景 (Edge Cases) 处理

| 场景 | 处理方式 |
|------|---------|
| 页面刷新在 `completed_nodes` 写入前 crash | 后端 checkpointer 保证原子性，不会出现半写状态；如果确实没存上，前端按 4.6 降级 |
| WebSocket 断线重连 | 前端检测 `onclose` 后，主动调用 `GET /api/v1/task/{taskId}` 全量拉取最新状态，再用完整态覆盖 React Flow |
| 后端宕机重启时 | `in_progress` 任务标记为 `error`, `current_node` 清空。前端显示全局错误，不倒退 |
| 浏览器标签页关闭后恢复 | 完全走 4.5 的页面恢复流程，DAG 从 REST API 重建 |
| 后端 push 消息延迟 (先发 completed 再发 started) | React 的 `setState` 批处理保证最终一致性; 若短暂出现两个 completed_nodes 更新间有空窗期, 因为后端确保推的 completed_nodes 是完整快照, 前端不会出现错误过渡态 |
| Twitter 任务在 restore 时 | `source_type === 'twitter'` → DAG 高亮 `twitter_url → analyze_twitter` 分支, `github_trending` 和 `github_url` 分支保持 idle |

---

## 六、 验收标准

### 6.1 后端

- [ ] `TwitterContentModel` 及其子模型正确定义，包含 thread_context / community_sentiment 等特有字段
- [ ] `ScraperAgent` 能调用 opencli 抓取推文并返回原始文本
- [ ] `TwitterLLMAnalyzer` 能将原始文本提纯为 `TwitterContentModel`
- [ ] `graph.py` 中 `analyze_twitter` 节点正确接入，与 `analyze_repo` 并列后汇聚到 `compose_script`
- [ ] `PipelineState` 新增 `source_type` 字段，路由条件 `route_source` 按 source_type 智能分流
- [ ] Twitter 输入源的完整端到端管线可执行（含 HITL → 渲染）

### 6.2 前端

- [ ] `@xyflow/react` 成功安装且无版本冲突
- [ ] DAG 图正确展示所有节点（3 个 Source + 2 个 Analyzer + 主干管线 7 个节点）
- [ ] 激活路径边带有流动动画 + 霓虹发光效果，未激活边呈暗色
- [ ] 不同输入源（GitHub Trending / GitHub URL / Twitter URL/ 切换时 DAG 高亮路径正确切换
- [ ] SSE 终端实时显示流式日志，500 行截断机制正常工作
- [ ] HITL 面板在暂停时正常展示审批界面

---

## 七、 实现顺序建议

1. **前端 DAG 重构**（`npm install @xyflow/react` → 重构 TaskMonitor 渲染区）
2. **后端 Twitter 领域模型**（entities.py）
3. **后端 Agent Scraper**（agent_scraper.py）
4. **后端 LLM Analyzer**（llm_analyzer.py）
5. **后端 LangGraph 集成**（graph.py / state.py / status_machine.py）
6. **端到端联调测试**

---

## 八、 引用

- 现有 Spec: `phase3_twitter_analyzer_spec.md`, `phase4_ui_dag_spec.md`
- 后端域模型: `video-pipeline/backend/src/domain/repo_analyzer/`
- 前端当前实现: `video-pipeline/frontend/src/pages/TaskMonitor.tsx`
- 管线定义: `video-pipeline/backend/src/application/workflow/graph.py`
