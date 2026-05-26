# 前端性能与状态同步问题修复设计

## 问题陈述

用户反馈了两个关键的前端可用性问题：
1. **项目详情页加载极其缓慢（白屏许久）**：
   访问 `http://localhost:15392/project/:id` 时，页面需要很长时间才能渲染出来，体验非常差。
2. **状态同步失效**：
   刷新或重新进入管线监控页面时，原本已经跑完的管线节点阶段又会重新变成"进行中"（或没有完成标记），甚至在错误状态下所有节点都退回成灰色未开始状态。

---

## 根因分析

### 1. 详情页加载慢（白屏/挂起）的根因

在项目详情页中，前端通过 `Promise.all` 同时请求 `/api/v1/projects/{id}` 和 `/api/v1/projects/{id}/tasks`。
在后端 `/api/v1/projects/{id}/tasks` 的实现（`project_controller.py`）中：
```python
stmt = (
    select(PipelineTaskDB)
    .where(PipelineTaskDB.project_id == uid)
    .order_by(PipelineTaskDB.created_at.desc())
)
result = await session.execute(stmt)
tasks = result.scalars().all()
```
- 该查询会直接 select 整个 `PipelineTaskDB` 实体，从而把大字段 JSONB 列（包含完整的 `content_model`、`material_manifest`、`script`、特别是有数 MB 大小的 Remotion `blueprint`！）全部从 PostgreSQL 读入内存、传回给 Python API 并序列化。
- 这会导致网络 I/O、数据库 I/O 以及 Python CPU 资源极大浪费，使任务列表接口加载极其缓慢，导致详情页长时间处于挂起/Loading状态，看似白屏。
- 实际上前端 `TaskListItem` 只需要 `id`, `repo_url`, `status`, `created_at`, `updated_at`，根本不需要获取任何 JSONB 字段。

### 2. 状态同步失效的根因

在 `/project/:id/task/:tid`（管线监控页 `TaskMonitor.tsx`）中：
- **WebSocket 未重新连接**：当用户刷新或直接通过 URL 进入管线页时，前端从 API 恢复了当前的 DB 状态，但**没有建立任何 WebSocket 连接**！此时如果管线正在后台运行，前端页面将永远停留在这个静态状态，无法接收后续的步骤更新。
- **状态映射不准确（特别是 Error 和 Blueprint 节点）**：
  - 如果状态是 `error`，`STATUS_TO_PROGRESS['error']` 返回 `completed: []`，这导致此前所有成功完成的节点（如 `analyze_repo`，`compose_script`）全部在 UI 上退回灰色未开始状态，且不知道哪个节点失败了。
  - 对于 `blueprinting` 状态，`STATUS_TO_PROGRESS` 将 `generate_diagrams` 标记为 `completed`，即使它其实才刚刚开始运行。
  - 在 `post_processing` 状态，`STATUS_TO_PROGRESS` 漏掉了把 `render_compose` 标记为完成。

---

## 设计方案

### 1. 后端数据库查询性能优化

重构 `project_controller.py` 中的 `list_project_tasks` 接口，仅投影选择必要的元数据列，完全规避大 JSONB 字段的加载：

```python
stmt = (
    select(
        PipelineTaskDB.id,
        PipelineTaskDB.repo_url,
        PipelineTaskDB.status,
        PipelineTaskDB.created_at,
        PipelineTaskDB.updated_at,
    )
    .where(PipelineTaskDB.project_id == uid)
    .order_by(PipelineTaskDB.created_at.desc())
)
result = await session.execute(stmt)
tasks = result.all()
```

### 2. 前端状态恢复逻辑重构（TaskMonitor.tsx）

在 `TaskMonitor.tsx` 的恢复 `useEffect` 中，引入更加智能和鲁棒的混合映射逻辑：
- **基于现有数据字段反推完成节点**：
  - 如果 `data.content_model` 存在，说明 `analyze_repo` 必已完成。
  - 如果 `data.script` 存在且状态不是 `hitl_script_review` 且不处于 compose 前期，说明 `compose_script` 和 `hitl_script_review` 已完成。
  - 如果 `data.blueprint` 存在，说明 `generate_diagrams` 必已完成。如果 `status !== 'blueprinting'`，说明 `generate_blueprint` 也已完成。
  - 如果 `voiceover_path` / `bgm_path` 存在，说明 `audio_design` 必已完成。
  - 如果 `final_mp4_path` 存在，说明 `render_compose` 必已完成。
- **Error 状态精准推导**：
  如果 status 为 `error`，通过 DAG 节点的顺序，找到第一个未完成的节点，将其标记为 `failedNodes`，从而精准在 UI 上把该节点标记为红色的 `Failed`，并保留之前所有成功节点的绿色勾选！
- **WebSocket 自动重连**：
  如果任务状态不是终态（即不是 `completed` 且不是 `error`）并且不处于 HITL 交互中断状态（即不是 `hitl_trending`、`hitl_script_review`、`hitl_blueprint_review`），则在恢复任务后，**自动调用 `connectWebSocket(taskId, repoUrl)`** 保持长连接，实现刷新后依然能实时监听管线。

---

## 验收标准

1. 项目详情页 `/project/:id` 瞬时加载，无白屏卡顿，API 响应时间 < 100ms。
2. 刷新管线监控页时，后台正在运行的管线能够自动重连 WebSocket 并实时更新 UI 进度。
3. 刷新已失败的管线时，UI 能精准标识出是哪一个节点失败（红色），且前面完成的节点保持绿色勾选。
4. 刷新已完成的管线时，所有阶段均显示绿色勾选。
