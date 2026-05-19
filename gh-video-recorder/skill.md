---
name: github-repo-video-recorder
description: >
  全自动录制 GitHub 仓库浏览视频。从仓库首页平滑滚动到页脚（60fps requestAnimationFrame），
  自动裁剪页面加载等待时间，智能过滤并提取页面素材图片（三级过滤，支持 GitHub camo 图片），
  提取页面内嵌视频素材和动画 GIF，自动发现 Demo/文档关键链接并录屏，
  自动转码为 MP4，使用 Remotion 生成高质量动画 intro/outro 片段，最终合成一条完整演示视频。
triggers:
  - 录一个GitHub项目介绍视频
  - 生成项目浏览视频
  - 自动录制仓库介绍
  - 把 [仓库URL] 录成视频
tools_allowed:
  - run_terminal_cmd
  - write_file
  - read_file
---

# GitHub 仓库浏览视频自动录制 Skill (v3)

你是一个专业的自动化视频制作助手。执行时严格遵循以下流程。

- 录制脚本位于 `gh-video-recorder/scripts-v2/` 目录
- intro/outro 模板使用 Remotion（React + spring 动画），位于 `gh-video-recorder/remotion/`

## 素材类型与优先级

最终视频按以下优先级排列素材：

| 优先级 | 素材类型 | manifest type | 说明 |
|--------|---------|--------------|------|
| 最高 | 视频素材 | `extracted_video` | 页面内嵌 `<video>`、`.mp4`/`.webm` 链接、动画 GIF（自动转 MP4） |
| 中 | 图片素材 | `image` | 页面 `<img>` 三级过滤（尺寸、文件大小、URL 黑名单），Ken Burns 动效 |
| 低 | 滚动录屏 | `scroll_video` | Playwright 录制的页面平滑滚动画面 |
| 最低 | 关键链接录屏 | `link_video` | 从 README 自动发现的 Demo/文档页面录屏 |

## 〇、环境检查与安装

### 1. 检查工具版本

```bash
node --version        # Node.js >= 18
python3 --version     # Python >= 3.9
ffmpeg -version       # ffmpeg (with libx264)
npx remotion --version  # Remotion (首次需安装依赖)
```

### 2. 安装 Node.js 依赖

```bash
cd gh-video-recorder && npm install
cd remotion && npm install
```

### 3. 安装 Playwright 浏览器

若浏览器未安装或版本不匹配：

```bash
# 使用代理加速（如已配置 proxy.json 会自动走代理）
npx playwright install chromium

# 国内网络慢时可使用镜像：
# PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npx playwright install chromium
```

## 〇、代理配置（自动按设备切换）

**代理始终开启**，`recorder.mjs` 会自动检测当前设备类型并选取对应配置。

`proxy.json` 已在 `.gitignore` 中，**每台设备共享同一份配置文件**，包含所有设备的信息：

```json
{
  "mac": { "host": "127.0.0.1", "port": 7890 },
  "wsl": { "host": "172.28.0.1", "port": 10808 }
}
```

**自动检测逻辑**：
- `process.platform === 'darwin'` → 使用 `mac` 配置
- `/proc/version` 包含 `microsoft` 或 `wsl` → 使用 `wsl` 配置
- 其他 Linux → 使用 `linux` 配置（如有的话）
- 未找到对应平台的配置 → 不使用代理

首次使用时，若 `proxy.json` 不存在，询问用户各设备的代理地址和端口，一次性写入。

> 不同设备的代理地址不同：
> - **macOS 本机代理**：`127.0.0.1` + 代理端口（如 `7890`）
> - **WSL2 + Windows 代理**：宿主机 IP（如 `172.28.0.1`）+ 代理端口（如 `10808`）

## 一、输入与信息获取

用户提供：
- **`REPO_URL`**（必填）：仓库地址，如 `https://github.com/owner/repo`
- **`TOTAL_DURATION`**（必填）：目标视频总时长（秒），建议 120~180
- **`CONTENT_DIR`**（可选）：`gh-trending-recommend` 输出目录路径，用于生成有内容的 intro/outro

从 `REPO_URL` 解析 `owner` 和 `repo`。

可选：通过 `gh api repos/{owner}/{repo}` 获取仓库信息，如果仓库有 `homepage` 字段（官网/Demo），将其作为额外 URL 传入。

## 二、运行 recorder.mjs（录制 + 截图 + 转码 + 裁剪 + 视频提取 + 链接发现 + 清单）

脚本自动完成：
1. 页面录制（`domcontentloaded` 等待 DOM 就绪）
2. **自动裁剪**：记录滚动开始时间，用 ffmpeg 裁掉页面加载等待（保留 1.5s 缓冲）
3. 平滑滚动：`mouse.wheel()` + 三段式速度曲线（快速加速 → 巡航 → 减速），~250px/s 接近人类阅读速度
4. 图片提取：三级过滤（尺寸 ≥ 200px、文件 ≥ 10KB、URL 黑名单 + `data-canonical-src` 检查 camo 图片）
5. **视频提取**：提取页面内嵌 `<video>`、`.mp4`/`.webm` 链接，动画 GIF 用 ffmpeg 转 MP4
6. **关键链接发现**：解析 README 中的 Demo/文档/Playground 链接（关键词匹配），排除同域/badge/锚点
7. SVG→PNG 转换
8. webm→mp4 转码
9. 容错：每个 URL 独立 try/catch，单个失败不中断整体流程
10. 生成 `manifest_full.json`（四种素材类型：scroll_video / extracted_video / image / link_video，结构化格式含 version/$schema/createdAt）

```bash
cd gh-video-recorder/scripts-v2

export REPO_URL="https://github.com/{owner}/{repo}"
export TOTAL_DURATION="180"
# 如果有官网/Demo，追加 URL：
export URLS="https://demo.example.com"

node recorder.mjs
```

**环境变量说明**：
| 变量 | 必填 | 说明 |
|------|------|------|
| `REPO_URL` | 是 | 仓库首页地址 |
| `TOTAL_DURATION` | 否 | 目标总时长（秒），默认 180 |
| `OUTPUT_DIR` | 否 | 输出目录，默认自动生成在 `gh-video-recorder/output/` |
| `URLS` | 否 | 逗号分隔的额外 URL（官网/Demo 页面） |

## 三、运行 allocate.py（时长分配 + 优先级排序 + Remotion intro/outro + concat 列表）

脚本自动完成：使用 Remotion 渲染 animated intro/outro（6秒）→ 按优先级排序素材（视频素材 → 图片素材 → 滚动录屏 → 关键链接录屏）→ 时长按优先级分配 → 图片 Ken Burns 转视频 → 生成 `concat_list.txt`。

**优先级排序**：时间线始终按 intro → extracted_videos → images(Ken Burns) → scroll_videos → link_videos → outro 排序。

**时长分配策略**：
- 提取的视频素材：保持原始时长，超出预算时按比例裁剪
- 图片素材：目标占总时长 25%，每张 4-10s
- 滚动录屏：填充剩余预算
- 关键链接录屏：最少分配

```bash
cd gh-video-recorder/scripts-v2

python3 allocate.py \
  "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo/manifest_full.json" \
  180 \
  --output-dir "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo" \
  --repo-url "https://github.com/{owner}/{repo}" \
  --content-dir "gh-trending-recommend/content/YYYY-MM-DD/" \
  --bg-type starfield   # 可选: starfield | bokeh | geometric | pixel
  --strict              # 启用严格 manifest schema 验证（可选）
```

**参数说明**：
- 第 1 个参数：`manifest_full.json` 的路径
- 第 2 个参数：目标总时长（秒）
- `--output-dir`：输出目录，与 recorder 的输出目录一致
- `--repo-url`：仓库地址，用于生成 intro/outro
- `--content-dir`：仓库档案目录（有内容时显示标题+要点+总结）
- `--bg-type`：背景动效类型，可选 `starfield`（默认）| `bokeh` | `geometric` | `pixel`
- `--strict`：（可选）启用严格 manifest schema 验证，拒绝非标准格式

**Remotion 降级链**：intro/outro 渲染使用四级降级策略
| 级别 | 方式 | 内容 | 触发条件 |
|------|------|------|---------|
| L0 | 完整 Remotion | 标题+描述+要点+URL+stats+动态背景 | 正常 |
| L1 | 简化 Remotion | 标题+URL+背景，无要点列表 | L0 失败 |
| L2 | 纯色 ffmpeg | 深蓝色 `#1a1a2e` 静态视频 | L1 失败 |
| L3 | 纯黑 ffmpeg | 纯黑视频兜底 | L2 失败 |

**输出文件**：
- `intro.mp4` — 开头片段（6 秒，Remotion 动画）
- `outro.mp4` — 结尾片段（6 秒，Remotion 动画）
- `timeline.json` — 时间线分配详情
- `concat_list.txt` — ffmpeg concat 所需列表
- `verification_report.json` — 素材完整性验证报告

## 四、素材完整性验证（合成前推荐）

在 ffmpeg concat 前运行 `verify_output.py`，进行 8 项预检：

| # | 检查项 | 级别 |
|---|--------|------|
| 1 | intro.mp4 存在且可解码 | ERROR |
| 2 | outro.mp4 存在且可解码 | ERROR |
| 3 | concat_list.txt 引用文件均存在 | ERROR |
| 4 | 图片素材可解码 | WARNING |
| 5 | 视频素材时长 > 0 | ERROR |
| 6 | 素材总时长 >= 目标时长的 50% | WARNING |
| 7 | concat_list.txt 语法正确 | ERROR |
| 8 | 素材编码均为 h264 | WARNING |

```bash
python3 scripts-v2/verify_output.py \
  "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo" \
  180
```

## 五、合成最终视频

```bash
cd "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo"

ffmpeg -f concat -safe 0 -i concat_list.txt \
  -c:v libx264 -preset fast -pix_fmt yuv420p \
  "overview.mp4"
```

## 六、预览 intro/outro（可选）

如需在浏览器中预览 intro/outro 动画效果：

```bash
cd gh-video-recorder/remotion
npx remotion studio
```

在 Remotion Studio 中可实时预览所有 12 套主题的动画效果，调整参数后刷新即可看到变化。

## 七、汇报

完成后报告：
1. 录制的页面 URL 列表
2. 提取的素材图片数量 + 视频素材数量
3. 发现的关键链接数量及链接列表
4. 最终视频时长与路径
5. intro/outro 使用的主题编号 + 降级级别（L0-L3）
6. 裁剪掉的加载等待时长
7. 各素材类型的数量统计（scroll_video / extracted_video / image / link_video）
8. 素材验证结果（passed/warnings/errors）

---

## CONTENT_DIR 联动说明

- 如果是从 `gh-trending-recommend` 触发的录制，`CONTENT_DIR` 指向 `gh-trending-recommend/content/YYYY-MM-DD/`
- 脚本从中读取仓库档案（`{repo_name}.md`）和口播脚本（`{repo_name}-口播脚本.md`），用于生成有内容的 intro/outro
- intro 显示：项目名称 + 一句话定位 + 核心要点
- outro 显示：项目地址 + Star/Fork 数据 + 总结语
- 如果独立使用（无 `CONTENT_DIR`），intro/outro 只显示项目名和 URL

## Remotion 模板说明

- 12 套主题配色方案，每次随机选取（支持基于仓库语言的智能推荐，见 `themeMeta.ts`）
- 每套主题支持装饰层扩展：vignette、pattern（dot-grid/noise）、borderRadius、ruleStyle、fontWeightBody
- 4 种动态背景动效（`--bg-type` 选择）：
  - `starfield`：80 颗星从中心向外扩散（默认）
  - `bokeh`：15 个柔和光斑漂浮 + 脉冲
  - `geometric`：20 层旋转几何线框
  - `pixel`：像素块随机出现
- Intro 组件（三层叠加）：动态背景 → 半透明遮罩 → 内容层
  - 标题 anticipate 反向位移 + arc 弧线入场 + overshoot 回弹
  - Underline 从中心向两侧生长
  - Tagline scale + fade
  - 要点列表 stagger 节奏 + 弧线入场
- Outro 组件：URL 厚重 spring 入场 → Stats 渐显 → Underline 生长 → Summary 淡入
- KenBurnsClip：图片素材自动添加 pan/zoom 动效（5 种运动模式随机选取）
- 180 帧 × 30fps = 6 秒
- 1920×1080 分辨率

### 背景选择规则

- `--bg-type` 显式指定时使用指定类型
- 未指定时默认 `starfield`
- 建议匹配：科技/开发者工具 → `starfield` | 设计/创意类 → `bokeh` | 数据/工程类 → `geometric` | 活力/年轻类 → `pixel`

## 异常处理

- 无官网：不传 `URLS`，仅录制仓库页面
- Cookie 弹窗：recorder.mjs 自动尝试关闭常见弹窗
- README 过短：滚动时长自动缩短（基于页面高度）
- Playwright 未安装：步骤零会检查并安装
- ffmpeg 缺失：recorder.mjs 启动时前置检查，缺失则报错退出
- GitHub camo 图片：通过 `data-canonical-src` 属性检测原始 URL，正确过滤 star-history 等图片
- 页面加载慢：使用 `domcontentloaded` 而非 `networkidle`/`load`，避免超时
- 图片下载超时：通过 Playwright 页面上下文下载（自动走代理），15s 超时
- 视频下载超时：30s 超时，< 10KB 过滤
- GIF 转 MP4 失败：跳过，不影响其他素材
- 单个 URL 录制失败：主循环 try/catch 容错，继续下一个 URL
- 关键链接发现失败：不影响基础录制流程
- Remotion 渲染失败：四级降级链（L0 完整→L1 简化→L2 纯色→L3 纯黑），每级独立 try/catch，日志输出降级原因
- 素材缺失/损坏：verify_output.py 在 concat 前进行 8 项检查，ERROR 中止、WARNING 继续
- manifest 格式不匹配：allocate.py --strict 模式下拒绝非标准格式并报错
