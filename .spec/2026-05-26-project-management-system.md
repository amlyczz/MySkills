# 视频项目管理系统设计

## 问题陈述

当前 Video Pipeline 是"一次性任务"模型：用户提交 repo URL → 管线跑完 → 结束。没有项目维度管理：
- 无法查看历史项目列表
- 无法查看某个项目的完整详情（script、blueprint、产物路径）
- 无法删除项目
- 同一个 repo 多次生成没有关联关系
- 流程没有"先创建项目"这一步

需要围绕 **Project** 维度重构：**每次流程必须先创建项目、选择类型**，然后在项目上下文内跑管线。

## 核心流程变更

### Before（当前）
```
用户输入 URL → POST /submit → WebSocket stream → 结束
```

### After（目标）
```
1. 用户创建项目（选择类型：github_repo / trending）
   → POST /projects { name, source_type, repo_url? }
   → 返回 project_id
2. 在项目内提交任务
   → POST /projects/{id}/tasks { ... }
   → WebSocket stream
3. 查看历史：项目列表 → 项目详情 → 任务详情
```

## 设计方案

### 1. 数据模型

#### Project（新增）

```python
class SourceType(str, Enum):
    GITHUB_REPO = "github_repo"
    TRENDING = "trending"
    # 未来扩展: ARTICLE, YOUTUBE, ...

class Project(BaseModel):
    id: UUID
    name: str                       # 用户起的项目名或 repo_name
    source_type: SourceType         # 来源类型
    repo_url: str | None            # github_repo 类型必填
    description: str | None
    language: str | None
    stars: int | None
    thumbnail_url: str | None
    latest_task_status: PipelineStatus | None
    task_count: int = 0
    created_at: datetime
    updated_at: datetime
```

#### Task（现有 PipelineTask 扩展）

在 `pipeline_tasks` 表加 `project_id` 外键：

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    source_type VARCHAR NOT NULL DEFAULT 'github_repo',
    repo_url VARCHAR,
    description TEXT,
    language VARCHAR,
    stars INTEGER,
    thumbnail_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pipeline_tasks ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX idx_pipeline_tasks_project_id ON pipeline_tasks(project_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
```

### 2. API 设计

| Method | Path | 描述 |
|--------|------|------|
| `POST` | `/api/v1/projects` | 创建项目（选类型 + 填 URL） |
| `GET` | `/api/v1/projects` | 项目列表（分页，按 updated_at 倒序） |
| `GET` | `/api/v1/projects/{id}` | 项目详情（含 task 列表） |
| `DELETE` | `/api/v1/projects/{id}` | 删除项目（级联） |
| `POST` | `/api/v1/projects/{id}/tasks` | 在项目内提交任务（替代原 /submit） |
| `DELETE` | `/api/v1/task/{task_id}` | 删除单个 task |

#### 创建项目

```json
POST /api/v1/projects
{
  "name": "LangChain Promo",
  "source_type": "github_repo"
  // repo_url 可选，也可后续流程中填写
}
→ { "project_id": "uuid", "name": "LangChain Promo", "source_type": "github_repo" }
```

#### 项目内提交任务

```json
POST /api/v1/projects/{id}/tasks
{
  "repo_url": "https://github.com/langchain-ai/langchain",  // 此处填 URL
  "project_type": "educational"
}
→ { "task_id": "uuid", "project_id": "uuid", "status": "created" }
```

### 3. 前端页面结构

```
/                            → 项目列表页（首页）
/projects/new                → 创建项目页（选类型 → 填信息 → 创建）
/project/:id                 → 项目详情页（task 时间线 + 操作）
/project/:id/task/:tid       → 任务监控页（DAG + log + HITL，复用现有组件）
```

#### 创建项目页 `/projects/new`（新增）

- 项目名称（必填）
- 来源类型：`GitHub Repo`（默认）/ `Trending`
- repo_url：可选（可在项目详情页提交任务时再填）
- 创建 → 跳转项目详情页

#### 项目列表页 `/`（改造首页）

- "New Project" 按钮 → 创建项目页
- 项目卡片网格：名称、来源类型 badge、最近状态、task 数、更新时间
- 搜索栏、删除按钮

#### 项目详情页 `/project/:id`

- 项目元信息
- Task 历史（时间线）
- "New Generation" → 在项目内提交新 task
- 下载视频、删除 task、重新生成

### 4. 文件变更清单

#### 后端新增
- `domain/project/entities.py` — Project + SourceType
- `domain/project/interfaces.py` — ProjectRepository ABC
- `infrastructure/project/postgres_models.py` — ProjectDB
- `infrastructure/project/postgres_repository.py` — PostgresProjectRepository
- `presentation/api/project_controller.py` — CRUD endpoints
- `presentation/dtos/project_dtos.py` — DTOs

#### 后端修改
- `infrastructure/task/postgres_models.py` — 加 project_id
- `presentation/api/task_controller.py` — submit 改为项目内提交
- `presentation/server.py` — 注册 project_router
- `application/workflow/state.py` — 加 project_id

#### 前端新增
- `src/pages/ProjectList.tsx` — 项目列表
- `src/pages/NewProject.tsx` — 创建项目
- `src/pages/ProjectDetail.tsx` — 项目详情
- `src/pages/TaskMonitor.tsx` — 从 App.tsx 提取管线监控
- `src/lib/api.ts` — API client

#### 前端修改
- `src/App.tsx` — 改为 React Router
- `package.json` — 加 react-router-dom

## 验收标准

1. 首页展示所有项目列表，支持搜索和删除
2. 创建项目页：必须选类型，默认 github_repo
3. 项目创建后跳转详情页，可在项目内提交任务
4. 任务监控（DAG + log + HITL）功能不受影响
5. 项目详情页展示所有历史 task，支持重新生成
6. 删除项目级联删除 tasks 和 output 文件
