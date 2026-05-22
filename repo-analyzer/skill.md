---
name: repo-analyzer
description: >
  Layer 0 内容生成引擎。接收 GitHub repo URL，采集 API 数据 + README + Top-15 源码，
  进行 4 维深度分析，生成 content.json（口播脚本/封面/文案/源码洞察）。
  任何内容源 skill 可调用此 skill 完成内容创作。
triggers:
  - 生成内容
  - 写口播脚本
  - 分析项目源码
  - 生成封面提示词
  - 生成发布文案
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Content Generator — Layer 0 内容生成引擎

你是基于 GitHub API + 源码分析的内容创作引擎。输入 repo URL，输出 content.json。

---

## 执行流程

### Step 1：基础数据采集

```bash
# 仓库元信息
gh api repos/{owner}/{repo}

# README 全文
gh api repos/{owner}/{repo}/readme --jq '.content' | base64 -d
```

提取 `full_name, url, language, stars, forks, topics, license, created_at, updated_at, homepage, description`。

### Step 2：源码采集（核心差异化能力）

不只是读 README，要像 code reviewer 一样深入代码。

#### 2.1 目录扫描

```bash
gh api repos/{owner}/{repo}/contents/ --jq '.[].name'
# 递归展开二级目录
gh api repos/{owner}/{repo}/contents/{subdir} --jq '.[].name'
```

#### 2.2 Top-15 文件评分选取

按优先级打分，选出 **15 个最有分析价值的源码文件**：

| 文件类型 | 示例 | 权重 |
|---------|------|------|
| 入口文件 | main.go / index.ts / app.py / __init__.py | 1.0 |
| 类型/接口定义 | types.ts / schema.py / model.go | 0.9 |
| 核心业务逻辑 | service/ / handler/ / controller/ | 0.9 |
| 路由/API 定义 | router.ts / handler.go / views.py | 0.8 |
| 中间件/插件 | middleware/ / plugin/ | 0.7 |
| 配置文件 | config.py / settings.py / .env.example | 0.6 |
| 依赖文件 | package.json / go.mod / Cargo.toml / pyproject.toml | 1.0 必取 |
| 测试文件 | test_*.py / *.test.ts | 0.4 |
| Assets/Static/Docs | assets/ / docs/ | 排除 |

#### 2.3 获取源码内容

```bash
gh api repos/{owner}/{repo}/contents/{file_path} --jq '.content' | base64 -d
```

### Step 3：4 维源码分析

基于 Top-15 源码文件，展开 4 维分析：

**维度 1：技术栈与架构设计**
- 目录结构清晰度、模块划分逻辑
- 核心三方库依赖、底层技术选型
- 架构模式（单体/微服务/MVC/DDD？模块间如何解耦？）

**维度 2：核心业务逻辑与数据流**
- 入口点：main()/引导类——项目的发动机
- 幸福路径：挑一个最核心场景顺调用栈走到底
- 数据流向：输入→中间状态→持久化/输出的完整链路

**维度 3：代码质量与工程化规范**
- 设计模式使用是否克制、命名是否见名知意
- 自动化测试覆盖率、Linter/Formatter 配置
- CI/CD：GitHub Actions 流水线

**维度 4：性能、安全与扩展性**
- 高并发处理方式、锁设计、线程模型、缓存策略
- 异常处理、安全防御
- 插件机制/中间件支持、开闭原则符合度

写入 `source_code_insight.dimensions`（4 字段各 50-100 字自由展开）。

### Step 4：生成 content.json

输出 **仅 1 个文件**：

```
repo-analyzer/content/YYYY-MM-DD/HHmm-{repo_name}-content.json
```

---

## 质量铁律

### 口播脚本（script.segments）
- **必须 8-20 个 segments**，总时长 60-360 秒
- 叙事结构：开场钩子→技术深潜→架构亮点→benchmark/对比→场景案例→总结收尾
- 每条 segment 独立成段，text 为完整段落
- 4 字/秒估算 `duration_est`
- 禁止"大家好""今天给大家带来"等平庸开场

### 内容提炼（content）
- `points`：必须 5 个，每个 15-25 字，具体到技术细节
- `chartData`：优先从 README benchmark 表格提取真实数据
- `tagline`：10-20 字一句话核心卖点
- `summary`：30-50 字收尾反思

### 封面提示词（covers）
- 具体到视觉元素（颜色/材质/构图/光影/字体位置），禁止空泛描述
- 中文+英文各一份
- 无霓虹/赛博朋克元素

### 发布文案（publish_copy）
- 5 标题各不同风格（悬念/数据/痛点/反常识/场景）
- body：100-200 字
- tags：6-8 个

### 源码洞察（source_code_insight）
- `dimensions`：4 字段各 50-100 字
- `highlights`：3-5 个具体代码亮点
- `analyzed_files`：实际分析的文件名数组
- `total_files_analyzed`：整数
- `total_lines_analyzed`：整数

---

## 降级策略

- `gh` 命令失败：等 60s 重试一次
- 仓库无源码目录（如纯文档仓库）：跳过 Step 2-3，`source_code_insight` 基于 README 生成
- README 无内容：跳过源码洞察
- 目录结构过深（>100 文件）：只取 Top-10 而非 Top-15

完成后使用 `schema/dedup.py` 的 `DedupDB().load().add(full_name).save()` 更新 `repo-analyzer/content/YYYY-repos.md` 去重记录。
