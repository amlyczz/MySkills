---
name: repo-analyzer
description: >
  仓库智能分析引擎。接收 GitHub repo URL，完成源码分析 + README 素材发现与采集 +
  口播脚本创作 + 封面/文案生成。输出 content.json + 本地高价值素材。
triggers:
  - 生成内容
  - 写口播脚本
  - 分析项目源码
  - 生成封面提示词
  - 生成发布文案
  - 采集项目素材
  - 录制页面视频
  - 提取页面素材
  - 抓取 README 内容
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Repo Analyzer — Layer 0 仓库智能分析引擎

输入 GitHub repo URL，输出 content.json + material_discovery.json + 本地素材。

流程：数据采集 → 源码分析 → README 素材发现 → 素材下载 → 内容创作

---

## Step 1：基础数据采集

```bash
# 仓库元信息
gh api repos/{owner}/{repo}

# README 全文
gh api repos/{owner}/{repo}/readme --jq '.content' | base64 -d
```

提取 `full_name, url, language, stars, forks, topics, license, created_at, updated_at, homepage, description`。

---

## Step 2：源码采集与 4 维分析

不只是读 README，要像 code reviewer 一样深入代码。

### 2.1 目录扫描

```bash
gh api repos/{owner}/{repo}/contents/ --jq '.[].name'
gh api repos/{owner}/{repo}/contents/{subdir} --jq '.[].name'
```

### 2.2 Top-15 文件评分选取

| 文件类型 | 示例 | 权重 |
|---------|------|------|
| 入口文件 | main.go / index.ts / app.py / __init__.py | 1.0 |
| 类型/接口定义 | types.ts / schema.py / model.go | 0.9 |
| 核心业务逻辑 | service/ / handler/ / controller/ | 0.9 |
| 路由/API 定义 | router.ts / handler.go / views.py | 0.8 |
| 中间件/插件 | middleware/ / plugin/ | 0.7 |
| 配置文件 | config.py / settings.py | 0.6 |
| 依赖文件 | package.json / go.mod / Cargo.toml / pyproject.toml | 1.0 必取 |
| 测试文件 | test_*.py / *.test.ts | 0.4 |
| Assets/Static/Docs | assets/ / docs/ | 排除 |

### 2.3 获取源码内容

```bash
gh api repos/{owner}/{repo}/contents/{file_path} --jq '.content' | base64 -d
```

### 2.4 4 维源码分析

**维度 1：技术栈与架构设计**
- 目录结构清晰度、模块划分逻辑、核心三方库依赖
- 架构模式（单体/微服务/MVC/DDD？模块间如何解耦？）

**维度 2：核心业务逻辑与数据流**
- 入口点与核心调用链；数据流向完整链路

**维度 3：代码质量与工程化规范**
- 设计模式、命名规范、自动化测试、CI/CD

**维度 4：性能、安全与扩展性**
- 高并发处理、缓存策略、异常处理、插件机制

写入 `source_code_insight.dimensions`。

---

## Step 3：README 素材发现与评估（新增）

基于 README 全文 + 项目页面，系统性发现可用于视频的视觉素材，按类型分类并评分。

### 3.1 素材类型分类

从 README 中逐段扫描，识别以下素材类型：

| 类型 | 识别方式 | 示例 |
|------|---------|------|
| `architecture_diagram` | README 开头的 Markdown 图片引用 | `![](assets/arch.png)` |
| `benchmark_chart` | benchmark 章节中的统计图表 | 表格邻近区域的图片 |
| `demo_gif` | Demo 章节的 GIF 文件 | `*.gif` 引用 |
| `demo_video` | Demo 章节的 MP4/WebM 链接 | `*.mp4` 引用 |
| `screenshot` | UI/CLI 截图 | `screenshot`, `ui` 名的图片 |
| `logo` | 项目 Logo | `logo.*`, `icon.*` 图片 |
| `code_install` | 安装命令代码块 | `npm install`, `pip install`, `cargo install`, `go get` 等 |
| `code_quickstart` | Quick Start 代码块 | 紧随"Quick Start"/"快速开始"标题的代码块 |
| `code_api` | API 使用示例代码块 | `import`, `from ... import`, `use` 开头的代码块 |
| `code_config` | 配置示例代码块 | yaml/json 配置块 |

### 3.2 素材评分

每项按以下维度评分（1-5）：

| 维度 | 评分标准 |
|------|---------|
| **相关性** | 是否直接展示项目核心功能（架构图=5, 截图=3, logo=1）|
| **视觉质量** | 清晰度、信息密度、是否包含关键对比数据 |
| **视频友好度** | 作为视频素材的直接可用性（GIF=5, 图表=4, 代码块=3） |
| **唯一性** | 是否是不可替代的展示素材（benchmark 图=5, demo GIF=4）|

> 综合分 = (相关 + 视觉 + 视频 + 唯一) / 4

README 中没有图片/GIF 的项目 → 用 Playwright 截取首页/文档页/Demo 页面。

### 3.3 产出 material_discovery.json

```json
{
  "repo": "owner/repo",
  "discovered_at": "2026-05-22T10:50:00",
  "materials": [
    {
      "id": "arch-01",
      "type": "architecture_diagram",
      "source_url": "https://github.com/.../assets/arch.png",
      "title": "System Architecture Overview",
      "context": "README 第 2 节 Architecture",
      "score": 4.5,
      "recommended_for": "solution 场景视觉展示",
      "download_path": "materials/architecture.png",
      "is_downloaded": false
    }
  ],
  "stats": {
    "total_discovered": 12,
    "high_value": 5,
    "types": { "architecture_diagram": 1, "benchmark_chart": 2, "demo_gif": 4, ... }
  }
}
```

---

## Step 4：素材下载

### 4.1 自动下载高价值素材

综合评分 >= 3 的素材自动下载：

```bash
cd repo-analyzer
# 图片下载
curl -fsSL "{source_url}" -o "{OUTPUT_DIR}/materials/{filename}"

# 代码段保存为文本文件
cat > "{OUTPUT_DIR}/materials/code_install.sh" << 'CODEEOF'
# Install command from README
{code_block_content}
CODEEOF
```

输出目录结构：
```
$OUTPUT_DIR/materials/
├── architecture.png        # 架构图
├── benchmark_overview.png  # Benchmark 图表
├── demo-01.gif             # Demo GIF
├── code_install.sh         # 安装命令
└── code_quickstart.py      # Quick Start 代码
```

### 4.2 Playwright 页面采集（高优先级素材补充）

对于需要动态交互的页面（Demo、在线 Playground、文档站点），使用 recorder.mjs 采集：

```bash
source pipeline-orchestrator/scripts/proxy.sh
cd repo-analyzer
node scripts/recorder.mjs
```

环境变量：
- `REPO_URL` — GitHub 仓库 URL
- `TOTAL_DURATION` — 采集页面的最大时长（秒）
- `URLS` — 额外需要采集的 URL（空格分隔，如各文档/Demo 站点）

recorder.mjs 自动完成：页面滚动录屏 → 提取嵌入图片/视频/GIF → 发现关键外链并录屏 → 截图关键元素。

---

## Step 5：内容创作

基于前 4 步的完整理解（源码 + 素材清单 + 本地素材），一个上下文中完成全部创作。

### 5.1 内容提炼

- `tagline`：10-20 字一句话核心卖点
- `points`：必须 5 个，每个 15-25 字，具体到技术细节
- `chartData`：优先从 README benchmark 表格提取真实数据
- `summary`：30-50 字收尾反思
- `target_users`、`domains`

### 5.2 口播脚本创作

RepoAnalyzer 阶段直接产出脚脚本（此时对项目理解最深，Token 已花在源码分析上）：

- **8-12 个 segments**，总时长 60-180 秒
- 叙事结构：开场钩子 → 技术深潜 → 架构亮点 → benchmark/对比 → Demo 展示 → 总结收尾
- 每条 segment 标注 `suggested_media` 引用 material_discovery 中的素材 ID
- 4 字/秒估算 `duration_est`
- 禁止"大家好""今天给大家带来"等平庸开场

### 5.3 封面提示词

- 具体到视觉元素（颜色/材质/构图/光影/字体位置），禁止空泛描述
- 中文+英文各一份
- 无霓虹/赛博朋克元素

### 5.4 发布文案

- `titles`：5 个不同风格（悬念/数据/痛点/反常识/场景）
- `body`：100-200 字
- `tags`：6-8 个
- 多平台变体（Twitter/Weibo/LinkedIn）

### 5.5 源码洞察

- `dimensions`：4 字段各 50-100 字
- `highlights`：3-5 个具体代码亮点
- `analyzed_files`、`total_files_analyzed`、`total_lines_analyzed`

---

## Step 6：输出文件

```
$OUTPUT_DIR/
├── -content.json            ← ContentModel（含 script/covers/publish_copy）
├── material_discovery.json  ← 素材发现与评估清单（供 TimelineComposer 消费）
└── materials/               ← 下载的高价值素材
    ├── architecture.png
    ├── benchmark_overview.png
    ├── demo-01.gif
    ├── code_install.sh
    └── code_quickstart.py
```

---

## TimelineComposer 消费关系

以下产物被子层 TimelineComposer 直接消费：

| 产物 | 消费方 | 用途 |
|------|--------|------|
| `content.json.script` | TimelineComposer | 脚本初稿 → 微调后做口播分句 |
| `material_discovery.json` | TimelineComposer | 素材评分 → 决定每段口播配什么视觉 |
| `materials/` | TimelineComposer + VideoRenderer | 实际素材文件用于渲染 |
| `content.json.content` | TimelineComposer | 章节划分依据 |

TimelineComposer **不需要重新分析项目**，直接在此分析结果基础上做编排。

---

## 降级策略

- `gh` 命令失败：等 60s 重试一次
- 仓库无源码目录（如纯文档仓库）：跳过 Step 2，`source_code_insight` 基于 README 生成
- README 无图片/GIF 素材：使用 Playwright 截取首页/文档页
- 图片下载失败：记录 source_url 到 manifest，留待后续阶段重试
- 目录结构过深（>100 文件）：只取 Top-10 而非 Top-15

完成后使用 `schema/dedup.py` 的 `DedupDB().load().add(full_name).save()` 更新 `repo-analyzer/content/YYYY-repos.md` 去重记录。
