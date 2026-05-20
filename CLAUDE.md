# MySkills — AI 操作指南

## 触发规则

- **Plan Mode / Spec 驱动**：任何新功能、重构、或你认为需要设计方案的变更 → 先写 spec，详见 `.spec/` 目录下的已有 spec 文件，命名格式 `.spec/<简短描述>.md`，包含问题陈述、设计方案、验收标准
- **TDD 流程**：spec 确认后，按测试驱动开发实施
- **AI 操作日志**：大功能任务、技术决策、架构变更使用 `@agent-harness/memory-logs.md` 规范记录（.memory/YYYY-MM-DD.md）

## Python 项目规范

- **包管理器**：统一使用 `uv`（`uv sync`、`uv add`、`uv run`），禁止 `pip install` 直接安装
- **数据模型**：所有 dataclass / dict → Pydantic `BaseModel`，提供 `model_dump()` / `model_dump_json()` 和类型校验
- **依赖声明**：根目录 `pyproject.toml`，`dependency-groups.dev` 放开发依赖
- **虚拟环境**：`.venv/` 由 `uv sync` 自动创建，不手动管理

## Skill 目录规范

每个 skill 是一个独立文件夹，必须包含：
- `skill.md`：YAML frontmatter（name / description / triggers / tools_allowed）+ 中文 agent 操作指南
- 脚本放在 `scripts-v2/` 子目录（如需要）
- Python 包放在 skill 根目录，用下划线命名（如 `media_generation/`）
