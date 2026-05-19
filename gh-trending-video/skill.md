---
name: github-trending-video
description: >
  一键编排：从 GitHub 热门项目中挑选仓库 → 生成口播脚本和发布文案 →
  自动录制浏览视频（Remotion intro/outro + Playwright 滚动录屏 + 素材提取）→
  合成完整演示视频。串联 gh-trending-recommend 和 gh-video-recorder 两个 skill。
triggers:
  - 做一个热门项目视频
  - 一键生成项目推荐视频
  - 从推荐到视频一条龙
  - trending 项目录视频
  - 热门项目一键出视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# GitHub 热门项目视频一键生成 Skill

你是一个自动化内容制作编排器。本 skill 将 **gh-trending-recommend**（项目发现 + 内容生成）和 **gh-video-recorder**（页面录制 + 视频合成）串联为一键流程。

---

## 全局参数

询问或确认以下参数：

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `TOTAL_DURATION` | 否 | 180 | 目标视频总时长（秒），建议 120~180 |
| `BG_TYPE` | 否 | starfield | intro/outro 背景动效：starfield \| bokeh \| geometric \| pixel |

---

## Phase A：选项目 + 生成内容

> 复用 `gh-trending-recommend` skill 的完整流程（步骤 1-7）

### A1：读取去重记录

```bash
cat gh-trending-recommend/content/2026-repos.md 2>/dev/null || echo "空列表"
```

提取所有已推荐的 `owner/repo`，存入 `recommended` 列表。

### A2：搜索热门仓库

计算 7 天前日期 `YYYY-MM-DD`，搜索过去 7 天新建的高星项目：

```bash
gh search repos --created ">=YYYY-MM-DD" --sort stars --order desc --limit 10 \
  --json fullName,stargazersCount,description
```

过滤掉 `recommended` 中已有的仓库，将剩余候选展示给用户选择。

**降级策略**：若新项目星数普遍 < 100，搜索近 7 天活跃更新的高星仓库：
```bash
gh search repos --pushed ">=YYYY-MM-DD" --sort stars --order desc --limit 10 \
  --json fullName,stargazersCount,description
```

### A3：获取仓库详细信息

用户选定 `owner/repo` 后：

```bash
gh api repos/{owner}/{repo}
gh api repos/{owner}/{repo}/readme
```

从 API 返回中提取：`html_url`、`description`、`homepage`、`stargazers_count`、`forks_count`、`language`、`topics`、`license` 等。README 内容 base64 解码。

### A4：深度整理 + 生成内容

基于仓库信息和 README，生成以下 5 个文件：

| # | 文件 | 路径 |
|---|------|------|
| 1 | 仓库档案 | `gh-trending-recommend/content/YYYY-MM-DD/HHmm-{repo}.md` |
| 2 | 口播脚本 | `gh-trending-recommend/content/YYYY-MM-DD/HHmm-{repo}-口播脚本.md` |
| 3 | 封面提示词 | `gh-trending-recommend/content/YYYY-MM-DD/HHmm-{repo}-封面提示词.md` |
| 4 | 发布文案 | `gh-trending-recommend/content/YYYY-MM-DD/HHmm-{repo}-发布文案.md` |
| 5 | 去重更新 | 追加 `- {owner}/{repo}` 到 `gh-trending-recommend/content/2026-repos.md` |

**口播脚本要求**：100~750 字（30s~3min），纯旁白文本，开发者布道师基调，随机选择叙事角度（痛点前置/定义解析/数据亮点）。

**封面提示词要求**：3:4 和 16:9 两种比例，中文+英文提示词，高颗粒质感、亮色主调、文字居中。

**发布文案要求**：5 个备选标题 + B站/小红书/抖音/快手四平台描述 + 话题标签。

> 具体格式和创作规则详见 `gh-trending-recommend/skill.md` 第四至第七步。

### A5：记录关键变量

Phase A 完成后，记录以下变量供 Phase B 使用：

```
REPO_URL     = {html_url}
TOTAL_DURATION = 用户指定或 180
CONTENT_DIR  = gh-trending-recommend/content/YYYY-MM-DD/
URLS         = {homepage 或空}
```

---

## Phase B：录制 + 合成视频

> 复用 `gh-video-recorder` skill 的 v3 流程

### B1：环境检查

确认工具就绪：

```bash
node --version        # >= 18
python3 --version     # >= 3.9
ffmpeg -version       # with libx264
```

检查依赖和 Playwright：
```bash
cd gh-video-recorder && npm install
cd remotion && npm install
npx playwright install chromium  # 如需安装
```

检查代理配置 `gh-video-recorder/proxy.json` 是否存在，不存在则询问用户配置。

### B2：运行 recorder.mjs

```bash
cd gh-video-recorder/scripts-v2

export REPO_URL="{REPO_URL}"
export TOTAL_DURATION="{TOTAL_DURATION}"
{URLS:+export URLS="$URLS"}

node recorder.mjs
```

脚本自动完成：页面录制 → 滚动（三段式速度曲线 ~350px/s）→ 素材提取（图片 + 视频 + GIF）→ 关键链接发现 → 裁剪加载等待 → 转码 MP4 → 生成 `manifest_full.json`。

输出目录：`gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo/`

### B3：运行 allocate.py

```bash
cd gh-video-recorder/scripts-v2

python3 allocate.py \
  "../output/YYYYMMDD-HHmm-owner_repo/manifest_full.json" \
  {TOTAL_DURATION} \
  --output-dir "../output/YYYYMMDD-HHmm-owner_repo" \
  --repo-url "{REPO_URL}" \
  --content-dir "../../gh-trending-recommend/content/YYYY-MM-DD/" \
  --bg-type {BG_TYPE}
```

生成：Remotion intro/outro（6s） → 按优先级排序素材 → 时长分配 → Ken Burns 图片动效 → `concat_list.txt`。

### B4：素材验证（推荐）

```bash
python3 gh-video-recorder/scripts-v2/verify_output.py \
  "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo" \
  {TOTAL_DURATION}
```

### B5：合成最终视频

```bash
cd "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo"

ffmpeg -f concat -safe 0 -i concat_list.txt \
  -c:v libx264 -preset fast -pix_fmt yuv420p \
  "overview.mp4"
```

---

## Phase C：汇总报告

完成后输出以下信息：

### 内容文件
1. 仓库档案路径
2. 口播脚本路径
3. 封面提示词路径
4. 发布文案路径

### 视频文件
5. 最终视频路径 + 时长 + 大小
6. intro/outro 主题 + 降级级别（L0-L3）
7. 裁剪掉的加载等待时长

### 素材统计
8. 各类型素材数量：scroll_video / extracted_video / image / link_video
9. 素材验证结果（passed / warnings / errors）

### 快速预览
10. 口播脚本前三句预览

---

## 异常处理

- **无新项目可推荐**：告知用户本周热门均已推荐，建议换策略或手动指定仓库
- **用户手动指定仓库**：跳过 A1-A2，直接从 A3 开始（用户提供 `owner/repo`）
- **recorder.mjs 失败**：检查代理配置，重试一次
- **Remotion 渲染失败**：自动降级 L1→L2→L3（详见 gh-video-recorder skill.md）
- **ffmpeg concat 失败**：检查 concat_list.txt 引用文件是否都存在
- **代理未配置**：询问用户代理地址和端口，写入 `gh-video-recorder/proxy.json`
