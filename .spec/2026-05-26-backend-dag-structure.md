# Backend DAG Structure & Unified State Management

## 问题

当前 DAG 结构（节点坐标、边关系、状态推导）全部硬编码在前端 `TaskMonitor.tsx` 中：
- `DAG_NODES` / `INITIAL_NODES` / `BASE_EDGES` 写死在前端
- `deriveNodeState()` 前端推导状态
- `STATUS_TO_PROGRESS` fallback 也在前端
- 后端只发单个 node event，不提供完整 DAG 状态

**后果**：后端 pipeline 结构变更时前端必须同步改，状态流转逻辑前后端割裂。

## 方案

### 后端新增

1. **DAG 静态结构定义** — `domain/task/dag_definition.py`：
   - 定义所有节点（id, label, icon, type, position）
   - 定义所有边（source→target）
   - 定义分支路径（trending/github_url/twitter 三条分支）
   - 根据 source_type 和 completed_nodes 计算 active_paths

2. **DAG 状态快照** — 根据 task 实体计算：
   - 每个节点的当前状态（idle/active/completed/hitl/error）
   - 活跃路径集合（哪些边高亮）
   - pipeline 整体状态

3. **新 API 端点** — `GET /api/v1/task/{task_id}/dag` 返回完整 DAG 结构 + 当前状态

4. **WebSocket 事件增强** — 所有 `node_event` / `hitl_event` / `pipeline_event` 增加 `dag_snapshot` 字段

### 前端变更

1. 移除所有硬编码 DAG 结构
2. 组件挂载时 `fetch` DAG 结构
3. WebSocket 事件到达时直接应用 `dag_snapshot` 更新节点状态
4. 移除 `deriveNodeState`、`STATUS_TO_PROGRESS`、`DAG_NODES` 等

### 数据契约

```json
// GET /api/v1/task/{task_id}/dag 响应
{
  "task_id": "...",
  "source_type": "github_trending",
  "pipeline_status": "analyzing",
  "nodes": [
    {
      "id": "github_trending",
      "label": "GitHub Trending",
      "icon": "🔥",
      "type": "source",
      "position": { "x": 0, "y": 0 },
      "state": "completed",
      "status_label": "DONE"
    }
  ],
  "edges": [
    { "id": "e-github_trending-analyze_repo", "source": "github_trending", "target": "analyze_repo" }
  ],
  "active_path_nodes": ["github_trending", "hitl_trending_review", "analyze_repo", ...]
}
```

## 验收标准

- [x] 前端不再硬编码任何 DAG 节点/边坐标
- [x] 前端不再推导节点状态
- [x] DAG 结构可从后端 API 获取
- [x] WebSocket 事件包含完整 DAG 快照
- [x] 前端渲染完全由后端数据驱动
