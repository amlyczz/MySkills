---
name: material-collector
description: >
  全自动素材采集。录制页面滚动视频、提取内嵌图片/视频/GIF、发现关键外链并录屏、
  提取 README 代码块、自动截图关键元素、探测 /docs 目录。输出 material_manifest.json v2
  （含完整 source/capture/metadata）。
triggers:
  - 采集项目素材
  - 录制页面视频
  - 提取页面素材
  - 抓取 README 内容
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# Material Collector — 素材采集 Skill

你是一个专业的自动化素材采集助手。输入一个 URL，输出结构化的 material_manifest.json v2。

---

## 目录结构

```
material-collector/
├── skill.md              ← 本文件
├── schema/
│   └── material_manifest.schema.json
├── scripts/
│   ├── recorder.mjs      ← Playwright 录制 + 素材提取
│   └── allocate.py       ← 时间分配 + Remotion intro/outro + concat
└── proxy.json            ← 代理配置（多平台，不提交 git）
```

---

## 〇、环境检查

```bash
node --version        # >= 18
python3 --version     # >= 3.9
ffmpeg -version
npx playwright install chromium
cd material-collector && npm install  # 如有 package.json
```

---

## 一、运行 recorder.mjs

```bash
cd material-collector/scripts

export REPO_URL="https://github.com/owner/repo"
export TOTAL_DURATION="180"
export URLS="https://demo.example.com"  # 可选

node recorder.mjs
```

**输出**：
- `manifest_full.json` — v1 格式（向后兼容）
- `material_manifest.json` — v2 格式（15 种素材类型 + source/capture/metadata）
- `materials/` — 素材文件（图片/视频/代码块/截图）
- `.mp4` — 录制视频

---

## 二、运行 allocate.py（时间分配 + intro/outro + concat）

```bash
cd material-collector/scripts

python3 allocate.py \
  "<output>/manifest_full.json" \
  180 \
  --output-dir "<output>" \
  --repo-url "https://github.com/{owner}/{repo}" \
  --content-dir "content-generator/content/YYYY-MM-DD/" \
  --bg-type starfield \
  --manual-image /path/to/extra.png \   # 用户手动素材
  --manual-video /path/to/extra.mp4
```

**参数**：
| 参数 | 说明 |
|------|------|
| `--manual-image` | 用户手动提供的图片（可重复） |
| `--manual-video` | 用户手动提供的视频（可重复） |
| `--srt` | SRT 字幕文件路径，烧录到 final.mp4 |
| `--strict` | 严格 manifest schema 验证 |

---

## 素材类型全景

15 种素材类型，按优先级排列：

| 优先级 | 类型 | 说明 |
|--------|------|------|
| 最高 | `extracted_video` | 页面内嵌视频/GIF（自动转 MP4） |
| 高 | `screenshot` | CSS selector 定位截图（架构图/对比表） |
| 高 | `code_snippet` | README 代码块（带语言/章节/评分） |
| 中 | `image` | 页面图片（三级过滤 + Ken Burns 动效） |
| 中 | `doc_page` | /docs 目录文档 |
| 低 | `scroll_video` | 页面平滑滚动录屏 |
| 低 | `link_video` | 自动发现的外链页面录屏 |
| 手动 | `manual_image` / `manual_video` | 用户提供 |
