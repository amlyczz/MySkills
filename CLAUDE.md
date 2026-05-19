# MySkills — AI 操作指南

## 触发规则

- **Plan Mode / Spec 驱动**：任何新功能、重构、或你认为需要设计方案的变更 → 先写 spec，详见 `.spec/` 目录下的已有 spec 文件，命名格式 `.spec/<简短描述>.md`，包含问题陈述、设计方案、验收标准
- **TDD 流程**：spec 确认后，按测试驱动开发实施
- **AI 操作日志**：大功能任务、技术决策、架构变更使用 `@agent-harness/memory-logs.md` 规范记录（.memory/YYYY-MM-DD.md）
