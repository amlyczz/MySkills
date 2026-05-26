# Spec: Pipeline Per-Node Retry Feature

> Date: 2026-05-26
> Status: Draft

## 问题描述

当 Pipeline 任意节点失败时，整个 task 进入 ERROR 状态，用户只能从头创建新任务。现有的重试机制仅适用于 HITL 拒绝（script/blueprint review → 循环回去），不支持从失败节点恢复。已完成的节点产出的中间数据（content_model、script、blueprint 等）无法复用。

## 设计方案

### 核心思路

**DB 状态重建 + Skip-if-Done 守卫**

1. 确保每个节点的产出都持久化到 DB（补充缺失字段：`domain_analysis`、`project_category`）
2. 每个 use case 加 "如果输出已存在则跳过" 的守卫
3. HITL 节点加 "如果上下文已满足则自动通过" 的守卫（不触发 interrupt）
4. 新增 `/retry/{task_id}` WebSocket endpoint，从 DB 加载状态重建 PipelineState 并重跑 graph
5. 前端在失败的 DAG 节点旁显示 Retry 按钮

### 重试流程（以 compose_script 失败为例）

```
DB State: content_model ✓ | script ✗ | blueprint ✗ | domain_analysis ✓ | repo_url ✓

用户点击 Retry
  → 前端 WebSocket → ws://localhost:18274/api/v1/task/retry/{taskId}
  → 后端从 DB 加载 task
  → 构造 PipelineState(task_id=..., repo_url=..., content_model=..., ...)
  → 跑 graph:

  github_trending      → repo_url 已是真实 URL → return PipelineState() (跳过)
  hitl_trending_review → repo_url 已设置       → auto-approve (跳过)
  analyze_repo         → content_model 存在    → return PipelineState() (跳过)
  compose_script       → script 是 None         → 正常执行 ✅
  hitl_script_review   → script 新生成          → interrupt (正常 HITL)
  ...
```

---

## 实现细节

### 0. 类型规范

**所有节点函数的返回类型统一为 `PipelineState`，不使用 `dict[str, object]`。**

现有代码中多处使用 `dict[str, object]` 作为返回类型注解，需要统一替换：

```python
# ❌ 旧写法
async def __call__(self, state: PipelineState) -> dict[str, object]:
    ...
    return {"content_model": content_model, "status": PipelineStatus.ANALYZING}

# ✅ 新写法
async def __call__(self, state: PipelineState) -> PipelineState:
    ...
    return PipelineState(content_model=content_model, status=PipelineStatus.ANALYZING)
```

同样适用于 HITL 节点函数（`hitl_trending_review_node` 等）和 `_stream_graph` 的构造。

**注意**：`PipelineState` 是 `TypedDict`，返回时构造的是部分字段。TypedDict 构造语法与 dict 一致，但类型注解明确表示这是 PipelineState 的部分更新。

### 1. DB Schema 补充

**`postgres_models.py`** 新增列：
```python
domain_analysis = Column(JSONB, nullable=True)
project_category = Column(String, nullable=True, default="github")
```

**`pipeline_task.py`** 新增字段：
```python
domain_analysis: Optional[DomainAnalysis] = None
project_category: Optional[str] = "github"
voiceover_path: Optional[str] = None  # 已在 DB 有列，domain 模型补上
bgm_path: Optional[str] = None        # 已在 DB 有列，domain 模型补上
```

**`postgres_repository.py`** save/get/update 补充新字段的序列化/反序列化。

**`usecases/analyze.py`** DB 同步块补充：
```python
task.domain_analysis = domain_analysis
task.project_category = category.value
```

**`usecases/audio_design.py`** DB 同步块补充：
```python
task.voiceover_path = voiceover_path
task.bgm_path = bgm_path
```

### 2. Skip-if-Done 守卫

每个 use case 的 `__call__` 方法开头添加：

| Use Case | 守卫条件 | 说明 |
|----------|----------|------|
| `github_trending` | `repo_url not in ("", "pending", "trending")` | 已有（line 32） |
| `analyze_repo` | `state.get("content_model") is not None` | 新增 |
| `compose_script` | `state.get("script") and not state.get("qa_script_feedback")` | 新增，有 feedback 说明需要重试 |
| `generate_diagrams` | `state.get("blueprint") is not None` | 新增，blueprint 存在说明 diagrams 已完成 |
| `generate_blueprint` | `state.get("blueprint") and not state.get("qa_blueprint_feedback")` | 新增 |
| `audio_design` | `state.get("voiceover_path") is not None` | 新增 |
| `render_compose` | `state.get("final_mp4_path") is not None` | 新增 |

**示例（analyze.py）：**
```python
async def __call__(self, state: PipelineState) -> PipelineState:
    # Skip-if-done: content_model already produced
    if state.get("content_model") is not None:
        logger.info("[UseCase] AnalyzeRepo: skipping, content_model present")
        return PipelineState()

    logger.info("[UseCase] Running AnalyzeRepo")
    # ... rest of existing code ...
```

### 3. HITL Auto-Approve 守卫

当重试时，已通过的 HITL 审查不应再次触发 `interrupt()`。

**`graph.py`** 修改三个 HITL 节点函数：

**`hitl_trending_review_node`：**
```python
async def hitl_trending_review_node(state: PipelineState) -> PipelineState:
    repo_url = state.get("repo_url", "")
    # Auto-approve if repo already selected (retry scenario)
    if repo_url and repo_url not in ("", "pending", "trending"):
        return PipelineState(
            repo_url=repo_url,
            hitl_trending_feedback=None,
            status=PipelineStatus.PENDING,
        )

    # Normal HITL flow
    decision = interrupt({...})
    # ... existing logic ...
```

**`hitl_script_review_node`：**
```python
async def hitl_script_review_node(state: PipelineState) -> PipelineState:
    script = state.get("script")
    # Auto-approve if script exists and no pending feedback (retry scenario)
    if script is not None and not state.get("qa_script_feedback"):
        return PipelineState(status=PipelineStatus.COMPOSING)

    # Normal HITL flow
    decision = interrupt({...})
    # ... existing logic ...
```

**`hitl_blueprint_review_node`：**
```python
async def hitl_blueprint_review_node(state: PipelineState) -> PipelineState:
    blueprint = state.get("blueprint")
    # Auto-approve if blueprint exists and no pending feedback (retry scenario)
    if blueprint is not None and not state.get("qa_blueprint_feedback"):
        return PipelineState(status=PipelineStatus.BLUEPRINTING)

    # Normal HITL flow
    decision = interrupt({...})
    # ... existing logic ...
```

### 4. 后端 Retry Endpoint

**`task_streamer.py`** 新增 `/retry/{task_id}`：

```python
@router.websocket("/retry/{task_id}")
async def retry_task(websocket: WebSocket, task_id: str) -> None:
    """Retry a failed task from the last successful checkpoint.

    Loads task state from DB, reconstructs PipelineState, re-runs the graph.
    Completed nodes are skipped via skip-if-done guards.
    """
    await websocket.accept()

    session_maker = _get_session_maker()
    async with session_maker() as session:
        repository = PostgresPipelineTaskRepository(session)

        # 1. Load task from DB
        uid = uuid.UUID(task_id)
        task = await repository.get_by_id(uid)
        if not task:
            await websocket.send_json({"type": "error", "content": "Task not found"})
            return

        if task.status != PipelineStatus.ERROR:
            await websocket.send_json({"type": "error", "content": "Can only retry ERROR tasks"})
            return

        # 2. Reconstruct PipelineState from DB data (typed construction)
        state_input: PipelineState = PipelineState(
            task_id=task_id,
            repo_url=task.repo_url,
            project_category=task.project_category or "github",
            status=PipelineStatus.PENDING,
            trending_repos=task.trending_repos,
            hitl_trending_feedback=None,
            content_model=task.content_model,
            material_manifest=task.material_manifest,
            script=task.script,
            domain_analysis=task.domain_analysis,
            blueprint=task.blueprint,
            qa_script=task.qa_script,
            qa_blueprint=task.qa_blueprint,
            qa_script_retry_count=0,
            qa_blueprint_retry_count=0,
            qa_script_feedback=None,
            qa_blueprint_feedback=None,
            segment_actual_durations=[],
            voiceover_path=task.voiceover_path,
            bgm_path=task.bgm_path,
            video_mp4_path=task.video_mp4_path,
            final_mp4_path=task.final_mp4_path,
            error=None,
        )

        # 3. Reset task status
        task.status = PipelineStatus.PENDING
        await repository.update(task)

        # 4. Compile graph (same pattern as stream_task)
        analyzer = LLMRepoAnalyzer()
        composer = LLMScriptComposer()
        blueprint_composer = LLMBlueprintComposer()
        video_renderer = RemotionVideoRenderer()
        media_gen = MediaGenerator()
        audio_mixer = FFmpegAudioMixer()

        checkpointer_ctx = _get_checkpointer_context()
        async with checkpointer_ctx as checkpointer:
            if checkpointer is not None:
                try:
                    await checkpointer.setup()
                except Exception as e:
                    logger.error("Checkpointer setup failed: %s", e)
                    checkpointer = None

            graph = compile_workflow(
                analyzer=analyzer,
                composer=composer,
                blueprint_composer=blueprint_composer,
                video_renderer=video_renderer,
                voiceover_gen=media_gen,
                bgm_gen=media_gen,
                audio_mixer=audio_mixer,
                repository=repository,
                semaphore=global_render_semaphore,
                checkpointer=checkpointer,
            )

            # 5. Fresh thread_id to avoid old checkpoint collision
            config = {"configurable": {"thread_id": f"{task_id}-retry"}}
            all_nodes = {
                "github_trending", "hitl_trending_review",
                "analyze_repo", "compose_script", "hitl_script_review",
                "generate_diagrams", "generate_blueprint", "hitl_blueprint_review",
                "audio_design", "render_compose",
            }

            try:
                result = await _stream_graph(graph, state_input, config, websocket, all_nodes)
                _active_graphs.pop(task_id, None)
            except WebSocketDisconnect:
                _active_graphs.pop(task_id, None)
                logger.info("Retry client disconnected for task %s", task_id)
            except Exception as e:
                _active_graphs.pop(task_id, None)
                await _mark_task_error(task_id, str(e))
                try:
                    await websocket.send_json({"type": "error", "content": str(e)})
                except Exception:
                    pass
                logger.error("Error during task retry: %s", e)

    try:
        await websocket.close()
    except Exception:
        pass
```

### 5. 前端 Retry UI

**DagStep props 新增：**
```typescript
interface DagStepProps {
  nodeId: DagNodeId
  state: NodeState
  isLast: boolean
  errorMessage?: string
  onRetry?: (nodeId: DagNodeId) => void
}
```

**handleWsMessage 补充（state_change error 时）：**
```typescript
if (status === 'error') {
    setFailedNodes(prev => new Set([...prev, node]))
    setNodeErrors(prev => ({ ...prev, [node]: detail || 'Unknown error' }))
    setCurrentNode(null)
    setPipelineStatus('error')
}
```

**新增 handleRetry 函数：**
```typescript
const handleRetry = useCallback((nodeId: DagNodeId) => {
    if (!currentTaskId) return
    // 清除失败状态
    setFailedNodes(prev => { const next = new Set(prev); next.delete(nodeId); return next })
    setNodeErrors(prev => { const next = { ...prev }; delete next[nodeId]; return next })
    setPipelineStatus('pending')
    setLogs(prev => [...prev, '> Retrying from failed node...'])
    // 连接 retry WebSocket
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/retry/${currentTaskId}`)
    wsRef.current = ws
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onclose = () => setLogs(prev => [...prev, '> Connection closed.'])
}, [currentTaskId])
```

**DagStep 组件增加 Retry 按钮和错误信息：**
```tsx
{state === 'error' && (
    <>
        <span className="text-[10px] text-red-500/70 ml-5 block">Failed</span>
        {errorMessage && (
            <span className="text-[10px] text-red-400/80 ml-5 block truncate max-w-[180px]">
                {errorMessage}
            </span>
        )}
        <button onClick={() => onRetry?.(nodeId)}
            className="mt-1 ml-5 px-2 py-0.5 rounded text-[10px] font-medium
                       bg-[var(--color-accent)] text-white hover:opacity-90
                       flex items-center gap-1">
            <Play className="w-2.5 h-2.5" /> Retry
        </button>
    </>
)}
```

**DAG 渲染传入 onRetry 和 errorMessage：**
```tsx
{DAG_NODES.map((node, i) => (
    <DagStep
        key={node}
        nodeId={node}
        state={getNodeState(node)}
        isLast={i === DAG_NODES.length - 1}
        errorMessage={nodeErrors[node]}
        onRetry={handleRetry}
    />
))}
```

---

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `backend/src/infrastructure/task/postgres_models.py` | 加 `domain_analysis`、`project_category` 列 |
| `backend/src/domain/task/pipeline_task.py` | 加字段定义 |
| `backend/src/infrastructure/task/postgres_repository.py` | 序列化/反序列化新字段 |
| `backend/src/application/usecases/analyze.py` | skip 守卫 + 持久化新字段 + 返回类型改为 PipelineState |
| `backend/src/application/usecases/compose.py` | skip 守卫 + 返回类型改为 PipelineState |
| `backend/src/application/usecases/generate_diagrams.py` | skip 守卫 + 返回类型改为 PipelineState |
| `backend/src/application/usecases/blueprint.py` | skip 守卫 + 返回类型改为 PipelineState |
| `backend/src/application/usecases/audio_design.py` | skip 守卫 + 持久化音频路径 + 返回类型改为 PipelineState |
| `backend/src/application/usecases/render_compose.py` | skip 守卫 + 返回类型改为 PipelineState |
| `backend/src/application/usecases/github_trending.py` | 返回类型改为 PipelineState |
| `backend/src/application/workflow/graph.py` | 3 个 HITL auto-approve 守卫 + 返回类型改为 PipelineState |
| `backend/src/presentation/websocket/task_streamer.py` | `/retry/{task_id}` endpoint + stream_task 的 state_input 也改为 PipelineState 构造 |
| `frontend/src/pages/TaskMonitor.tsx` | Retry 按钮 + handleRetry + nodeErrors + DagStep props |

## 验证方案

1. 跑 pipeline，让任意节点失败（如断点设错误）
2. 验证 DAG 侧边栏：失败节点显示红色 XCircle + 错误信息 + Retry 按钮
3. 点击 Retry → WebSocket 连接 `/retry/{taskId}`
4. 验证已完成节点快速跳过（日志显示 "skipping"），失败节点重新执行
5. 验证 pipeline 正常完成后流程继续
6. 测试 HITL 后的节点重试：auto-approve 不触发 interrupt
