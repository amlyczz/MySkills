# HITL Review 替代 LLM QA + 深度分析增强

## 问题陈述

1. 当前 `qa_script` 和 `qa_blueprint` 由 LLM 自动评分，用户无法在关键节点介入审核
2. 素材采集收集了不必要的配置文件/依赖信息，核心源码仅限 5 个文件，深度不足
3. 总时长目标 60 秒，无法支撑深入分析型视频（3 分钟+）

## 设计方案

### 1. 移除 LLM QA，改为 HITL 人工审核

**Graph 改动**:
```
compose_script → hitl_script_review (always) → generate_blueprint
generate_blueprint → hitl_blueprint_review (always) → audio_design
```
- 删除 `qa_script` 和 `qa_blueprint` 节点
- 删除 `route_qa_script` / `route_qa_blueprint` 路由函数
- HITL 节点始终触发，不再仅在失败 3 次时触发

**Script Review HITL** — interrupt 数据包含:
```json
{
  "reason": "script_review",
  "script": {
    "full_text": "...",
    "total_duration_est": 200,
    "segments": [
      {"text": "...", "duration_est": 20, "assigned_asset": "...", "visual_hook": "..."}
    ]
  }
}
```
用户操作: approve → generate_blueprint, reject(带feedback) → compose_script

**Blueprint Review HITL** — interrupt 数据包含:
```json
{
  "reason": "blueprint_review",
  "preview_url": "http://localhost:31200/",
  "scene_count": 8,
  "total_duration_frames": 5400
}
```
后端将 blueprint JSON 写入 `frontend/remotion/public/preview.json`，Remotion Studio 自动加载。
用户操作: approve → audio_design, reject(带feedback) → generate_blueprint

### 2. 素材采集增强

- 删除 `_fetch_config_files()` 和 `_fetch_dependency_summary()`
- 扩展 `_fetch_core_source_files()`:
  - 文件上限从 5 → 30
  - 每文件截断从 2000 → 4000 字符
  - 扫描策略: 固定模式 + 目录树模糊匹配 + 排除测试/构建/配置文件
- `analyze.py` 移除 `dependency_summary` 参数

### 3. 时长与深度控制

- `compose.py` 中 `target_duration` 从 60 → 200 秒（~3.3 分钟）
- script composer prompt 强调: 干货优先、拒绝假大空、每段必须有实质技术内容

### 4. 前端改动

- `App.tsx` DAG_NODES 移除 `qa_script`, `qa_blueprint`
- Script Review Modal: 展示完整 segments 表格（序号/文本/时长/视觉指令/素材）
- Blueprint Review Modal: 展示 Remotion Studio 链接 + 场景概览

### 5. 清理

- 删除 `QAScriptUseCase` 和 `QABlueprintUseCase`
- PipelineStatus 移除 `QA_SCRIPT_FAILED`, `QA_BLUEPRINT_FAILED`, `QA_VIDEO_FAILED`
- 删除 `qa.py` usecase 文件
- task_streamer.py 移除相关引用

## 验收标准

- [ ] 管线流程: analyze → compose → HITL script review → blueprint → HITL blueprint review → audio → render
- [ ] Script HITL 展示完整 segments 数据
- [ ] Blueprint HITL 写入 preview.json 并返回 Remotion Studio URL
- [ ] 核心源码收集 ≥ 20 个文件（中型项目）
- [ ] Script 总时长 ≥ 180 秒
- [ ] 不再有任何 LLM 自动评分环节
