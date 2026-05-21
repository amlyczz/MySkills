# GitHub Repo → 视频 Pipeline 架构设计

> 最后更新：2026-05-20（v2）
> 实现状态：Phase 1 ✅ + Phase 2 ✅ + Phase 3 ✅ + Phase 4 ✅ + Phase 5 ✅ — 全部 5 阶段完成

## 目标

从"输入一个 GitHub 仓库 URL"到"输出一条完整解说视频"，全流程可按需组合、独立复用。

---

## 整体架构

```
                    ┌──────────────────────┐
                    │   用户手动录屏/截图    │
                    │   (带时间/位置标注)    │
                    └──────────┬───────────┘
                               │
┌──────────────────────────────────────────────────────────────┐
│ Layer 0: 内容生成 (Content Generator)                         │
│                                                              │
│ 输入: GitHub repo API 数据 + README + 关键源码文件              │
│ 输出: 结构化文案 (content.json)                               │
│                                                              │
│  ├─ 标题 (多选)        ├─ 口播脚本 (分段)                     │
│  ├─ 一句话定位         ├─ 核心功能列表                        │
│  ├─ 封面提示词 (3:4 & 16:9)                                 │
│  ├─ 发布文案 (统一一份，全平台通用)                            │
│  └─ 源码洞察 (架构模式/设计决策/代码亮点)                      │
└──────────────────────┬───────────────────────────────────────┘
                       │ content.json
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: 素材采集 (Material Collector)                        │
│                                                              │
│ 输入: GitHub repo URL + 官网 URL + 用户手动素材               │
│ 输出: material_manifest.json (含来源/类型/定位元数据)          │
│                                                              │
│  素材类型:                                                    │
│  ├─ scroll_video     滚动录屏 (GitHub 页面)                    │
│  ├─ link_video       外部链接录屏 (Demo/官网)                  │
│  ├─ manual_video     用户手动录屏                              │
│  ├─ manual_image     用户手动截图                              │
│  ├─ image            README 内嵌图片 (架构图/Demo/图表)         │
│  ├─ extracted_video  README 内嵌视频/GIF                       │
│  ├─ screenshot       精华定位截图 (自动截取)                    │
│  ├─ code_snippet     README 代码块 (Quick Start/API/配置)      │
│  ├─ source_code      关键源码文件 (架构/核心逻辑)               │
│  ├─ doc_page         /docs 目录文档 (如果存在)                  │
│  ├─ repo_tree        仓库目录结构                              │
│  ├─ repo_stats       Star/Commit/Contributor 统计图表          │
│  ├─ changelog        Release 版本亮点                          │
│  ├─ social_proof     知名用户/Testimonial/引用                  │
│  └─ comparison       README 中提及的竞品对比                   │
└──────────────────────┬───────────────────────────────────────┘
                       │ material_manifest.json
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 2: 时间线编排 (Timeline Composer)                       │
│                                                              │
│ 输入: content.json + material_manifest.json                   │
│ 输出: timeline.json (分段时间轴 + 章节标记 + BGM/SFX + 字幕)   │
│                                                              │
│  ├─ 口播分段 (文本 → 时间估计)                                │
│  ├─ 素材-口播匹配 (哪个素材配合哪段话)                         │
│  ├─ 时长分配 (口播 + 素材展示 + 转场缓冲)                      │
│  ├─ BGM/SFX 编排 (段落级音轨 + 关键帧音效)                     │
│  ├─ 字幕生成 (口播 → SRT)                                    │
│  └─ 章节标记 (用于进度条)                                     │
└──────────────────────┬───────────────────────────────────────┘
                       │ timeline.json
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: Remotion 渲染 (Remotion Composer)                   │
│                                                              │
│ 输入: timeline.json + 所有素材文件                             │
│ 输出: video.mp4 (带章节元数据)                                │
│                                                              │
│  ├─ 场景渲染 (每 seg 一个 <Sequence>)                         │
│  ├─ 模板匹配 (seg.type → layout/motion/theme)                │
│  ├─ 代码模板 (code_snippet → 语法高亮+打字动画)              │
│  ├─ 章节进度条 (底部 overlay, 可配置样式)                     │
│  └─ 降级链 (L0完整→L1简化→L2纯色→L3纯黑)                    │
└──────────────────────┬───────────────────────────────────────┘
                       │ video.mp4 + audio tracks
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 4: 后期合成 (Post-Production)                           │
│                                                              │
│  ├─ 音频混音 (口播 + BGM + SFX, 闪避压缩)                     │
│  ├─ 字幕烧录/软字幕 (SRT → ffmpeg subtitles)                  │
│  ├─ 封面生成 (提示词 → AI 图片 → 嵌入元数据)                  │
│  └─ 最终合成 → final.mp4                                     │
└──────────────────────────────────────────────────────────────┘
```

### 各层可独立使用

| 场景 | 走哪些层 |
|------|---------|
| "给 facebook/react 生成口播脚本和封面" | Layer 0 |
| "把 vercel/ai 的素材采集下来" | Layer 1 |
| "我只想录个滚动视频" | Layer 1 (只用 scroll_video) |
| "给我已有素材+脚本，生成时间线" | Layer 2 |
| "给我时间线+素材，渲染视频" | Layer 3 + Layer 4 |
| "全自动推荐+制作" | Layer 0 → 1 → 2 → 3 → 4 |

---

## Layer 0: 内容生成

### 为什么独立？

口播脚本、标题、封面提示词的生成与"素材采集"无关。它只需要 repo 的文本信息（API 数据 + README + 关键源码）。独立后可以：
- 给任意 repo 生成内容，不管要不要做视频
- 口播脚本生成了再决定要不要录视频
- 换 LLM、换风格，不影响管道其他层

### 输入

```
gh api repos/{owner}/{repo}           → 仓库元信息（stars/forks/language/topics/license）
gh api repos/{owner}/{repo}/readme    → README 文本
gh api repos/{owner}/{repo}/contents  → 目录结构
gh api repos/{owner}/{repo}/releases  → Release 列表
[关键源码文件]                         → 按评分选取的源码文件（见下文）
```

### 源码分析（Source Code Insight）—— 4 维度框架

不只是读 README，还要像 code reviewer 一样深入代码。

#### 采集策略：Top-15 文件选取

```
Step 1: 目录扫描 → 识别项目类型
  gh api repos/{owner}/{repo}/contents/ → 获取根目录
  递归展开 src/ / lib/ / app/ 的二级目录

Step 2: 关键文件评分选取 (Top-15)
  按优先级打分，选出 15 个最有分析价值的源码文件：

  入口文件 (main.go / index.ts / app.py ...)           权重 1.0
  类型/接口定义 (types.ts / schema.py / model.go ...)   权重 0.9
  核心业务逻辑 (service/ / handler/ / controller/ ...)  权重 0.9
  路由/API 定义 (router.ts / handler.go / views.py ...) 权重 0.8
  配置文件 (config.ts / settings.py / .env.example ...) 权重 0.6
  中间件/插件 (middleware/ / plugin/ ...)               权重 0.7
  依赖文件 (package.json / go.mod / Cargo.toml ...)     权重 1.0 (必取)
  CI/CD 配置 (.github/workflows/ ...)                  权重 0.5
  Assets/Static → 排除                                 权重 0.0

Step 3: 获取文件内容
  gh api repos/{owner}/{repo}/contents/{file_path} → base64 解码
  带行号传给 LLM 分析
```

#### 分析维度

```
维度1: 技术栈与架构设计（骨架怎么搭的？）
  ├─ 目录结构: 根目录清晰度、模块划分逻辑（src/docs/tests/bin）
  ├─ 依赖关系: 核心三方库、底层技术选型（看了 package.json 就知道了）
  └─ 架构模式: 单体/微服务？MVC/MVVM/DDD？模块间解耦方式（事件/MQ/直接调用）

维度2: 核心业务逻辑与数据流（怎么跑起来的？）
  ├─ 入口点: main()/index.js/引导类 → 项目的发动机
  ├─ 幸福路径: 挑一个最核心的场景（如"一次HTTP请求的全过程"），顺调用栈走到底
  └─ 数据流向: 输入 → 中间状态流转 → 持久化/输出的完整链路

维度3: 代码质量与工程化规范（代码写得漂亮吗？）
  ├─ 设计模式: 单例/工厂/观察者等使用是否克制、命名是否见名知意
  ├─ 工程基建: 自动化测试覆盖率、Linter/Formatter 配置
  └─ CI/CD: .github/workflows 里的自动化流水线（提交时跑测试/编译/安全扫描）

维度4: 性能、安全与扩展性（能上生产吗？）
  ├─ 性能并发: 高并发处理方式、锁设计、线程模型、缓存策略
  ├─ 健壮安全: 异常处理、SQL注入/XSS/内存泄漏防御
  └─ 扩展性: 插件机制/中间件支持、开闭原则符合度
```

#### 写入 content.json

```json
"source_code_insight": {
  "analyzed_files": 15,
  "total_lines": 3420,
  "dimensions": {
    "tech_stack": "LLM 自由展开的技术栈与架构分析文本（目录结构、依赖关系、架构模式等）...",
    "core_flow": "LLM 自由展开的核心业务逻辑与数据流分析文本（入口点、幸福路径、数据流向等）...",
    "code_quality": "LLM 自由展开的代码质量与工程化分析文本（设计模式、测试覆盖率、CI/CD等）...",
    "production_readiness": "LLM 自由展开的性能、安全与扩展性分析文本（并发处理、安全性、插件机制等）..."
  }
}
```

4 个维度由 LLM 各自展开，不固化子字段。口播脚本引用这些分析文本时，由 code agent 自行提取关键信息。

### 输出：content.json

```
gh api repos/{owner}/{repo}  ──→  Layer 0  ──→  content.json
gh api repos/{owner}/{repo}/readme
gh api repos/{owner}/{repo}/contents/{src/**}
```

```json
{
  "repo": {
    "full_name": "owner/repo",
    "url": "https://github.com/...",
    "language": "TypeScript",
    "stars": 854,
    "forks": 78,
    "topics": ["ai", "agent"]
  },
  "content": {
    "title": "agents-best-practices",
    "tagline": "一套面向 AI Agent 系统的运行时纪律与架构参考",
    "points": [
      "MVP Agent 蓝图生成：给定业务领域，输出最小可用生产级架构",
      "已有 Harness 审计：诊断循环失控、上下文丢失等问题"
    ],
    "summary": "如果你下一个迭代涉及 Agent 的工具调用...",
    "stats_text": "854 Stars（过去 5 天新建，增速 ≈ 170 star/天）",
    "target_users": "构建 AI Agent 系统的开发者与团队",
    "domains": "AI Agent、工具权限、提示工程"
  },
  "script": {
    "full_text": "5天时间，854个Star...",
    "segments": [
      { "text": "5天时间，854个Star...", "duration_est": 7.5 },
      { "text": "这个项目的核心命题...", "duration_est": 9.0 },
      { "text": "如果你下一个迭代...", "duration_est": 8.5 }
    ],
    "total_duration_est": 130
  },
  "covers": {
    "3x4": { "prompt_zh": "...", "prompt_en": "..." },
    "16x9": { "prompt_zh": "...", "prompt_en": "..." }
  },
  "publish_copy": {
    "titles": [
      { "full": "零代码仓库，5天850Star", "short": "零代码仓库，5天850Star" },
      { "full": "...", "short": "..." }
    ],
    "body": "一段 100-200 字的统一发布文案，精炼说清项目是什么、解决什么、为什么值得关注。附 GitHub 链接。全平台通用，不区分 B站/小红书/抖音格式。",
    "tags": ["#AIAgent", "#开源项目", "#GitHub"]
  },
  "source_code_insight": {
    "architecture": "Plugin-based microkernel",
    "patterns": ["Factory Pattern", "Observer"],
    "highlights": [
      "使用 Proxy 实现惰性连接池",
      "递归下降解析器不到 200 行"
    ],
    "api_style": "RESTful",
    "analyzed_files": ["src/core/engine.ts", "src/types/index.ts"],
    "total_files_analyzed": 10,
    "total_lines_analyzed": 2340
  }
  "meta": {
    "generated_at": "2026-05-20T10:43:00",
    "source": "gh-trending"
  }
}
```

---

## Layer 1: 素材采集

### 素材类型全景

```
                        素材分类
                          │
          ┌───────────────┼────────────────┐
          │               │                 │
    视觉素材            文本素材          代码素材
          │               │                 │
    ┌─────┴─────┐    ┌────┴────┐    ┌─────┴──────┐
    │ 录屏类     │    │ README  │    │ code_block │
    │ 截图类     │    │ /docs   │    │ config     │
    │ 图片类     │    │ repo    │    │ API 示例   │
    │ 视频类     │    │  tree   │    │ QuickStart │
    └───────────┘    └─────────┘    └────────────┘
```

### 采集源 & 采集方式

| # | 来源 | 方式 | 素材 type | 触发条件 |
|---|------|------|----------|---------|
| 1 | GitHub README 文本 | `gh api` | `readme_text` | 必有 |
| 2 | GitHub 页面滚动录屏 | Playwright 无头 | `scroll_video` | 必有 |
| 3 | README 内嵌图片 | HTML 解析 + 三级过滤 | `image` | 有则采 |
| 4 | README 内嵌视频/GIF | HTML 解析 + 下载转码 | `extracted_video` | 有则采 |
| 5 | README 代码块 | Markdown AST 解析 | `code_snippet` | 有则采 |
| 6 | 精华位置截图 | CSS selector 定位 + 截图 | `screenshot` | 识别到则采 |
| 7 | 官网/Demo 页面录屏 | Playwright 无头 | `link_video` | README 含外链则采 |
| 8 | `/docs` 目录文档 | `gh api` 遍历 | `doc_page` | 探测存在则采 |
| 9 | 仓库目录结构 | `gh api` tree | `repo_tree` | 必有 |
| 10 | 关键源码文件 | `gh api` 读取 + 评分选取 | `source_code` | 必有 |
| 11 | Star/Commit 趋势 | `gh api` stats + chart 截图 | `repo_stats` | 有数据则采 |
| 12 | Release / Changelog | `gh api releases` | `changelog` | 有则采 |
| 13 | 知名用户/Testimonial | README 解析 "Used by" / "Adopters" | `social_proof` | 识别到则采 |
| 14 | 竞品对比 | README 解析 "Comparison" / "vs" 段落 | `comparison` | 识别到则采 |
| 15 | 用户手动录屏 | 用户提供文件 + 时间范围 | `manual_video` | 用户提供则采 |
| 16 | 用户手动截图 | 用户提供文件路径 | `manual_image` | 用户提供则采 |
| 17 | ~~Issues/PR~~ | — | — | **不做** |

### 素材元数据（每项必须记录）

每个 material 条目必须包含：

```json
{
  "id": "mat_001",
  "type": "image",
  "path": "architecture.png",
  "source": {
    "type": "readme_embedded",
    "url": "https://github.com/owner/repo",
    "original_url": "https://raw.githubusercontent.com/.../architecture.png",
    "element_selector": "#readme img[alt='Architecture']",
    "section": "## Architecture",
    "line_number": 156
  },
  "capture": {
    "method": "playwright_download",
    "timestamp": "2026-05-20T11:30:05",
    "duration_ms": 450,
    "retries": 0
  },
  "dimensions": [1200, 800],
  "file_size_kb": 245,
  "duration": null,
  "metadata": {
    "alt_text": "System Architecture Diagram",
    "is_camo_url": true,
    "filter_reason": null
  }
}
```

**字段说明**：
- `source` — 素材的原始来源（URL、页面位置、所属 section、行号）
- `capture` — 采集方式（playwright_download / playwright_screenshot / gh_api / gh_clone / user_provided）、耗时、重试次数
- `metadata` — 类型特定的附加信息（alt_text、highlight_score、过滤原因、转换记录）

### 代码块的特殊处理

READEME 中的代码块不当作"截图"，而是作为独立素材类型 `code_snippet`，在 Layer 3 用 Remotion 的 **CodeDisplay** 模板渲染。

**代码块采集**：
```
1. Markdown AST 解析 README → 提取所有 ``` 代码块
2. 推断语言：``` 后的标识符（如 ```python）
3. 分类评分：
   - Quick Start / Installation 章节 → 高优先级
   - API 示例（含 fetch/curl/request 关键词）→ 高优先级
   - 配置文件（yaml/json/toml）→ 中优先级
   - 长输出/日志 → 排除
   - CI/CD 配置 → 排除
   - License 文本 → 排除
4. 记录：所属 section、行号、推断语言、评分
```

**Remotion CodeDisplay 模板**：
```
Props:
  - code: string           // 代码文本
  - language: string       // 语法高亮语言
  - highlightLines: int[]  // 高亮行
  - showLineNumbers: bool  // 是否显示行号
  - animation: "type" | "fade" | "scroll"  // 入场动画
  - maxVisibleLines: int   // 最多显示行数（超长滚动）

渲染效果：
  - 深色终端风格背景（带 macOS 三色圆点）
  - syntax highlighting（Prism/Shiki）
  - 打字动画逐行出现，或整块淡入
  - 关键行高亮脉冲
```

### `/docs` 目录 — 探测式采集

不是每个 repo 都有 `/docs`。先探测，不存在则跳过：

```
1. gh api repos/{owner}/{repo}/contents/docs → 检查是否存在
2. 如果存在，遍历目录得到 .md 文件列表
3. 对每个 .md 文件：
   - gh api 获取内容（base64 解码）
   - 记录文件路径、标题、长度
   - 不录制视频（成本太高），只保留文本
4. 如果不存在 /docs → 检查根目录是否有 docs/ 或 guide/ 文件夹
5. 都没有 → 跳过，不影响流程
```

### 新增素材类型详细说明

**`source_code` — 关键源码文件**

```
采集方式: gh api 读取文件 + Layer 0 评分选取的 Top-10 文件
内容: 完整源码文本 + 路径 + 行数 + 所属模块
用途: Layer 3 CodeDisplay 渲染（源码分析段）
      Layer 0 的 source_code_insight 也来自这里
```

**`repo_stats` — 仓库统计图表**

```
采集方式: gh api /stats/contributors + /stats/commit_activity → 截图
内容: Star 增长曲线、Commit 热力图、Contributor Top-10
用途: Layer 3 stat-highlight 模板（数据冲击段）
注意: 社区健康度差的 repo（单次提交、单人维护）跳过
```

**`changelog` — Release 版本亮点**

```
采集方式: gh api releases → 解析最近 3 个 Release 的 body
内容: 版本号 + 发布日期 + Release Notes 摘要 + Breaking Changes
用途: Layer 3 card-grid 模板（版本演进段，展示项目活跃度）
```

**`social_proof` — 知名用户/Testimonial**

```
采集方式: README 解析 "Used by" / "Adopters" / "Trusted by" 段落
         提取 logo 图片 + 组织名 + 引述
内容: 使用方列表、Twitter/博客引用原文
用途: Layer 3 quote-style 模板（公信力段）
```

**`comparison` — 竞品对比**

```
采集方式: README 解析 "Comparison" / "vs" / "Alternatives" 表格
内容: 功能×竞品的对比矩阵（结构化表格）
用途: Layer 3 stat-highlight 模板（差异化段）
```

### 采集失败处理

| 失败场景 | 处理 |
|---------|------|
| `/docs` 不存在 | 跳过，不报错 |
| README 无图片 | `images: []`，不报错 |
| 外链页面超时 | 跳过该链接，继续其他 |
| GIF 转 MP4 失败 | 跳过，记 warning |
| 图片下载超时 | 跳过，记 warning |
| `source_code` 评分无合格文件 | 跳过，不报错 |
| `repo_stats` 无数据 | 跳过，不报错 |
| `changelog` 无 Release | 跳过，不报错 |
| `social_proof` 未识别到 | 跳过，不报错 |
| `comparison` 未识别到表格 | 跳过，不报错 |
| 用户手动素材路径不存在 | **报错**，要求用户确认 |

---

## Layer 2: 时间线编排

### 输入

- `content.json`（Layer 0 输出 — 口播脚本、标题、要点）
- `material_manifest.json`（Layer 1 输出 — 所有素材）

### 输出：timeline.json（v2）

```json
{
  "version": "2",
  "repo": { "full_name": "owner/repo", "url": "..." },
  "global": {
    "title": "agents-best-practices",
    "total_duration": 67.5,
    "resolution": [1920, 1080],
    "fps": 30,
    "bgm_track": "bgm_ambient_tech",
    "bgm_volume": 0.2
  },
  "segments": [
    {
      "id": "seg_001",
      "type": "hook",
      "label": "开篇",
      "time_start": 0.0,
      "time_end": 8.0,
      "duration": 8.0,
      "voiceover": {
        "text": "5天时间，854个Star...",
        "duration_est": 7.5
      },
      "primary_material": null,
      "material_refs": [],
      "layout": { "layout_id": "hero-center", "motion_map": { "headline": "bounce-in" } },
      "style": { "theme_id": "dark-purple", "bg_type": "geometric" },
      "audio": {
        "bgm_volume": 0.3,
        "bgm_fade_in": 0.5,
        "sfx": [
          { "id": "whoosh", "time": 0.2, "volume": 0.6 }
        ]
      },
      "transition_in": "fade",
      "transition_out": "dissolve"
    },
    {
      "id": "seg_002",
      "type": "showcase",
      "label": "滚动浏览",
      "time_start": 8.0,
      "time_end": 36.5,
      "duration": 28.5,
      "voiceover": {
        "text": "这个项目的核心理念是...",
        "duration_est": 10.0,
        "splits": [
          { "text": "这个项目的核心理念是模型提出动作...", "time_offset": 0.0 },
          { "text": "Harness负责验证、授权...", "time_offset": 5.0 }
        ]
      },
      "primary_material": "mat_scroll_001",
      "material_refs": ["mat_scroll_001"],
      "material_time_range": { "start": 3.0, "end": 31.5 },
      "layout": { "layout_id": "media-full", "motion_map": {} },
      "audio": {
        "bgm_volume": 0.25,
        "sfx": []
      }
    },
    {
      "id": "seg_003",
      "type": "code_showcase",
      "label": "安装配置",
      "time_start": 36.5,
      "time_end": 49.5,
      "duration": 13.0,
      "voiceover": {
        "text": "安装只需要一行命令...",
        "duration_est": 6.0
      },
      "primary_material": "mat_code_002",
      "material_refs": ["mat_code_002"],
      "code_template": {
        "language": "bash",
        "highlight_lines": [1],
        "animation": "type",
        "show_line_numbers": false
      },
      "layout": { "layout_id": "code-display", "motion_map": {} },
      "audio": {
        "bgm_volume": 0.25,
        "sfx": [
          { "id": "keypress", "time": 0.1, "volume": 0.3, "repeat_every": 0.3 }
        ]
      }
    },
    {
      "id": "seg_004",
      "type": "features",
      "label": "核心功能",
      "time_start": 49.5,
      "time_end": 57.5,
      "duration": 8.0,
      "voiceover": {
        "text": "项目覆盖了从MVP蓝图到上线Checklist...",
        "duration_est": 7.0
      },
      "primary_material": null,
      "material_refs": ["mat_img_arch"],
      "layout": { "layout_id": "card-grid", "motion_map": { "cards": "spring-slide-up" } },
      "audio": {
        "bgm_volume": 0.3,
        "sfx": [
          { "id": "pop", "time": 0.5, "volume": 0.5 },
          { "id": "pop", "time": 3.0, "volume": 0.5 }
        ]
      }
    },
    {
      "id": "seg_005",
      "type": "cta",
      "label": "结尾",
      "time_start": 57.5,
      "time_end": 67.5,
      "duration": 10.0,
      "voiceover": {
        "text": "如果你下一个迭代涉及Agent的工具调用...",
        "duration_est": 8.5
      },
      "primary_material": null,
      "material_refs": [],
      "layout": { "layout_id": "hero-center", "motion_map": { "title": "spring-slide-up" } },
      "audio": {
        "bgm_volume": 0.3,
        "bgm_fade_out": 2.0,
        "sfx": []
      }
    }
  ],
  "chapters": [
    { "label": "开篇", "time": 0.0 },
    { "label": "滚动浏览", "time": 8.0 },
    { "label": "安装配置", "time": 36.5 },
    { "label": "核心功能", "time": 49.5 },
    { "label": "结尾", "time": 57.5 }
  ],
  "subtitles": [
    { "text": "5天时间，854个Star", "time_start": 0.0, "time_end": 3.5 },
    { "text": "一个没有一行可执行代码的仓库", "time_start": 3.5, "time_end": 6.5 }
  ]
}
```

### 素材-口播匹配逻辑

```
输入: content.json.script.segments[] + material_manifest.materials[]

Step 1: 口播分句
  把每段口播文本按句号/分号拆成"语音单元"
  → 中文 ≈ 4 字/秒估算每个单元时长

Step 2: 关键词提取
  对每个语音单元提取关键词：
    - 英文术语（Agent, API, CLI, MVP 等）
    - README 章节标题（Installation, Quick Start, API）
    - 功能名（从 content.json.points 获取）

Step 3: 素材匹配
  对每个语音单元，遍历所有素材：
    code_snippet: 匹配所属 section == 当前提及的概念
    image: 匹配 alt_text 含有关键词
    scroll_video: 匹配 README 滚动位置（某 section 的 Y 坐标）
    screenshot: 匹配 highlight_score 最高
    link_video: 匹配 URL 关键词

Step 4: 组装 seg
  连续匹配到同一素材的单元 → 合并为一个 seg
  primary_material = 最佳匹配素材
  无匹配 → 用纯文字布局（hero-center）
```

### 章节进度条

从 `timeline.json.chapters[]` 生成。在 Layer 3 的 Remotion 中作为一个 overlay 组件渲染在视频底部。

**支持的样式**（`progress_bar_style`）：

| 样式 ID | 效果 |
|---------|------|
| `minimal-dots` | 底部一排圆点，当前章节高亮，已完成变灰 |
| `labeled-bar` | 细条 + 章节名标签，当前章节名放大 |
| `gradient-fill` | 渐变色填充条，随进度延长 |
| `segment-blocks` | 分段色块，每段不同颜色，当前段脉冲 |
| `timeline-ticks` | 时间轴风格，刻度+标签 |

进度条组件从 `timeline.json` 的 `global` + `chapters` + `segments` 自动生成标签和时间点。

---

## Layer 3: Remotion 渲染

### seg.type → 模板匹配表

| seg.type | layout_id | 默认 motion | 说明 |
|----------|-----------|------------|------|
| `hook` | `hero-center` | `bounce-in` | 标题冲击 |
| `problem` | `hero-center` | `scale-fade` | 痛点文字 |
| `solution` | `split-left-text` | `arc-entrance` | 文字+配图 |
| `features` | `card-grid` | `spring-slide-up` | 多功能卡片 |
| `showcase` | `media-full` | `fade` | 全屏录屏/素材 |
| `code_showcase` | `code-display` | `type` | 代码展示 |
| `source_highlight` | `code-display` | `fade` | 源码分析 |
| `stats_showcase` | `stat-highlight` | `scale-bounce` | Star/Commit 趋势 |
| `changelog_showcase` | `card-grid` | `spring-slide-up` | Release 亮点 |
| `social_proof` | `quote-style` | `fade` | 知名用户引用 |
| `comparison` | `stat-highlight` | `scale-bounce` | 竞品对比 |
| `cta` | `hero-center` | `spring-slide-up` | 结尾引导 |
| `manual` | `media-full` | `fade` | 用户手动录屏 |

### 新模板：CodeDisplay

```
┌──────────────────────────────────────────┐
│ ● ● ●  install.sh                        │  ← macOS 三色圆点
│                                          │
│  1  │  npx skills add \                  │  ← 行号 + 语法高亮
│  2  │    DenisSergeevitch/agents- \      │
│  3  │    best-practices -g               │  ← 高亮行（脉冲发光）
│  4  │                                    │
│  5  │  # Installed successfully          │  ← 普通行
│                                          │
└──────────────────────────────────────────┘

Props:
  - code: string
  - language: "bash" | "python" | "js" | ...
  - highlightLines: [3]
  - showLineNumbers: true
  - animation: "type" (逐字) | "fade" (淡入) | "scroll" (滚动)
  - maxLines: 20
```

### 章节进度条渲染

在整个 Remotion Composition 的最上层叠加一个 `<ChapterProgressBar>`：

```tsx
<AbsoluteFill>
  {/* 正常场景渲染 */}
  {segments.map(seg => <Sequence ...><SceneComponent /></Sequence>)}

  {/* 最上层：进度条 overlay */}
  <ChapterProgressBar
    chapters={timeline.chapters}
    currentTime={useCurrentFrame() / fps}
    style="labeled-bar"
    position="bottom"
  />
</AbsoluteFill>
```

进度条不占用视频内容空间，叠加在底部 60px 半透明黑底上。

---

## Layer 4: 后期合成

同 v1，略。

---

## 实施路线

### Phase 1: 接口标准化（不动行为）— 100% 完成 ✅
- [x] 定义 `content.json` schema → 替代当前 markdown 文件约定 → `schemas/content.schema.json`
- [x] 定义 `material_manifest.json` v2 schema（含 source/capture 完整元数据）→ `schemas/material_manifest.schema.json`
- [x] 定义 `timeline.json` v2 schema（含 chapters/segments/subtitles）→ `schemas/timeline.schema.json`
- [x] 让 `allocate.py` 读 JSON 而非正则解析 markdown → `read_content()` JSON 优先，markdown 回退

### Phase 2: Layer 0 独立 — 100% 完成
- [x] 从 `gh-trending-recommend` 抽出内容生成逻辑 → skill.md 新增"文件 0"输出 `content.json`
- [x] 输出 `content.json` → 格式见 `schemas/content.schema.json`
- [x] 保留 markdown 文件作为人类可读副本 → 4 个 .md 文件不受影响

### Phase 3: Layer 1 增强 — 100% 完成 ✅
- [x] 新增 `code_snippet` 采集 → `recorder.mjs` `collectCodeSnippets()`（README 代码块解析 + 分类评分）
- [x] 新增精华截图（CSS selector 定位 + Playwright screenshot）→ `recorder.mjs` `captureScreenshots()`（架构图/对比表/关键 section 自动截图）
- [x] 新增 `/docs` 探测式采集 → `recorder.mjs` `probeDocs()`（gh api 检查 docs 目录）
- [x] 完善 material 元数据（source/capture/metadata 字段）→ 图片 alt_text/dimensions/section + code language/lines + screenshot highlight_score
- [x] recorder.mjs 输出 material_manifest.json v2 → `generateV2Manifest()`（并行输出 v1 manifest_full.json + v2 material_manifest.json）
- [x] 用户手动素材支持 → `allocate.py --manual-image/--manual-video`（CLI 注入 manual_image/manual_video）

### Phase 4: Layer 2 独立 — 100% 完成
- [x] 实现口播-素材匹配算法 → `timeline_composer.py` `_match_materials()` / `_score_material()`
- [x] 实现章节自动划分 → `_divide_chapters()` (从 seg label 生成)
- [x] 实现 BGM/SFX 编排 → `_build_layout_and_audio()` (hook→whoosh, code→keypress, features→pop, cta→fade_out)
- [x] 输出 timeline.json v2 → 完整 schema 验证通过
- [x] SRT 字幕输出 → `_write_srt()` 自动生成 `.srt` 文件

### Phase 5: Layer 3/4 增强 — 100% 完成 ✅
- [x] 新增 CodeDisplay 模板 → `layouts/CodeDisplay.tsx`（终端风格 + 语法高亮 + type/fade/scroll 动画）
- [x] 新增 ChapterProgressBar 组件（5 种样式）→ `components/ChapterProgressBar.tsx`
- [x] VideoComposer 支持动态 seg 序列（不再硬编码 funnel）
- [x] 字幕烧录管道 → `allocate.py --srt` + `burn_subtitles()`
- [x] 音频混音管道 → `audio_mixer.py`（voiceover + BGM sidechain ducking + SFX placement + final mux）
