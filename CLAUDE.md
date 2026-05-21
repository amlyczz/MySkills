# MySkills — AI 操作指南

## 触发规则

- **Plan Mode / Spec 驱动**：任何新功能、重构、或你认为需要设计方案的变更 → 先写 spec，详见 `.spec/` 目录下的已有 spec 文件，命名格式 `.spec/<简短描述>.md`，包含问题陈述、设计方案、验收标准
- **TDD 流程**：spec 确认后，按测试驱动开发实施
- **AI 操作日志**：大功能任务、技术决策、架构变更使用 `@agent-harness/memory-logs.md` 规范记录（.memory/YYYY-MM-DD.md）

## Git 操作铁律

- **高风险命令必须经我许可**：以下命令执行前必须弹出确认，禁止直接运行：
  `git checkout .`、`git clean`、`git reset --hard`、`git push --force`、
  `git rebase`、`git stash drop`、`git branch -D`、`rm -rf`（针对被跟踪的目录）
- **每次大功能/修复/重构完成后**统一做一次 `git commit` + `git push`，不要每改一个文件就提交
- **禁止**在 commit message 中使用 `$(cat <<'EOF' ... EOF)` 嵌套 heredoc，直接写字符串

## Python 项目规范

- **包管理器**：统一使用 `uv`（`uv sync`、`uv add`、`uv run`），禁止 `pip install` 直接安装
- **数据模型**：所有 dataclass / dict → Pydantic `BaseModel`，提供 `model_dump()` / `model_dump_json()` 和类型校验
- **依赖声明**：根目录 `pyproject.toml`，`dependency-groups.dev` 放开发依赖
- **虚拟环境**：`.venv/` 由 `uv sync` 自动创建，不手动管理

## 视频 Pipeline（5 层）

```
content-generator/    Layer 0: 内容生成 → content.json
material-collector/   Layer 1: 素材采集 → material_manifest.json
timeline-composer/    Layer 2: 时间线编排 → timeline.json + .srt
video-renderer/       Layer 3: Remotion 渲染 → video.mp4
post-producer/        Layer 4: 音频混音 + 字幕 → final.mp4
pipeline-orchestrator/ 编排层：串联 5 层一键执行
media_generation/      横向切面：图片/语音/音乐/视频/文本生成
```

## Skill 目录规范

每个 skill 是一个独立文件夹，必须包含：
- `skill.md`：YAML frontmatter（name / description / triggers / tools_allowed）+ 中文 agent 操作指南
- `schema/`：该层的数据格式定义（JSON Schema draft-07）
- `scripts/`：可执行脚本
