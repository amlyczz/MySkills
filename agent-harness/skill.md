## 触发规则

- **Spec 驱动工作流 (Plan Mode)**：当用户以"Plan Mode"、需求描述、重构或触发一个大功能等你认为需要写 spec 的情况 → 详见 [`spec-workflow.md`](spec-workflow.md)
- **AI 操作日志 (.memory/)**：任何大功能任务、重要技术决策、架构变更、依赖变更等 → 详见 [`memory-logs.md`](memory-logs.md)

---

## 原则

- **索引不承载细节**：CLAUDE.md / AGENTS.md 中不写冗长的流程和规范，只引用具体文件路径。
- **单一职责**：每条规则只在一个地方定义，其他位置只引用。

---

## 混合代理逻辑

### 分工模型

| 层级 | 执行者 | 决策方式 | 产物 |
|------|--------|---------|------|
| 数据处理 | Python 脚本 | 确定性算法 | content.json, material_manifest.json |
| 编排决策 | Agent (LLM) | 读 skill.md 规则 + 上下文理解 | timeline.json, video_config.json |
| 渲染 | Remotion (Node.js) | 确定性渲染 | video.mp4 |
| 合成 | ffmpeg | 确定性 | final.mp4 |

### Agent 决策范围

Agent **负责**：
- 读取 timeline.json + content.json + material_manifest.json
- 逐场景选择 layoutId / motionMap / wrapperType
- 逐场景分配素材（content.visual / content.code）
- 逐场景选择 bgType（默认用全局，特定场景覆盖）
- 写入 video_config.json

Agent **不负责**：
- 生成 voiceover 文本（由 RepoAnalyzer / content.json 提供初稿）
- 素材下载（由 content-ingester 负责）
- Remotion 渲染参数
- 后期合成参数

### Agent 回退策略

当 Agent 决策产生无效 video_config.json（校验失败）：
1. 输出校验错误列表
2. Agent 逐条修复（不改的给出理由）
3. 最多重试 3 次
4. 3 次失败后使用上次成功的 config 做 baseline，仅修复必填字段
