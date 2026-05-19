---
name: github-repo-video-recorder
description: >
  全自动录制 GitHub 仓库浏览视频。从仓库首页平滑滚动到页脚（60fps requestAnimationFrame），
  自动裁剪页面加载等待时间，智能过滤并提取页面素材图片（三级过滤，支持 GitHub camo 图片），
  自动转码为 MP4，生成 animated intro/outro 片段，最终合成一条完整演示视频。
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

# GitHub 仓库浏览视频自动录制 Skill

你是一个专业的自动化视频制作助手。执行时严格遵循以下流程，所有脚本位于 `gh-video-recorder/scripts/` 目录。

## 〇、环境检查与安装

### 1. 检查工具版本

```bash
node --version        # Node.js >= 18
python3 --version     # Python >= 3.9
ffmpeg -version       # ffmpeg (with libx264)
```

### 2. 安装 Node.js 依赖

```bash
cd gh-video-recorder && npm install
```

### 3. 安装 Playwright 浏览器

若浏览器未安装或版本不匹配：

```bash
# 使用代理加速（如已配置 proxy.json 会自动走代理）
npx playwright install chromium

# 国内网络慢时可使用镜像：
# PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npx playwright install chromium
```

## 〇、代理配置（页面加载慢时需要）

**代理影响所有网络请求**：Playwright 页面加载、图片下载、intro/outro Google Fonts 加载。

`proxy.json` 已在 `.gitignore` 中，**每台设备各自维护自己的配置**，不会同步到 Git。

首次使用时，检测当前设备是否已有 `gh-video-recorder/proxy.json`。若没有，询问用户：
- **代理地址**：代理主机 IP
- **代理端口**：代理端口号

> 不同设备的代理地址不同，需根据实际网络环境设置。常见场景：
> - **WSL2 + Windows 代理**：宿主机 IP（如 `172.28.0.1`）+ 代理端口（如 `10808`）
> - **macOS / Linux 本机代理**：`127.0.0.1` + 代理端口（如 `7890`）
> - **无代理**：跳过此步骤

配置后保存到本地，该设备下次自动复用：

```bash
cat > gh-video-recorder/proxy.json << 'EOF'
{
  "enabled": true,
  "host": "172.28.0.1",
  "port": 10808
}
EOF
```

若要关闭代理，将 `enabled` 改为 `false` 或删除该文件。

## 一、输入与信息获取

用户提供：
- **`REPO_URL`**（必填）：仓库地址，如 `https://github.com/owner/repo`
- **`TOTAL_DURATION`**（必填）：目标视频总时长（秒），建议 120~180
- **`CONTENT_DIR`**（可选）：`gh-trending-recommend` 输出目录路径，用于生成有内容的 intro/outro

从 `REPO_URL` 解析 `owner` 和 `repo`。

可选：通过 `gh api repos/{owner}/{repo}` 获取仓库信息，如果仓库有 `homepage` 字段（官网/Demo），将其作为额外 URL 传入。

## 二、运行 recorder.mjs（录制 + 截图 + 转码 + 裁剪 + 清单）

脚本自动完成：
1. 页面录制（`domcontentloaded` 等待 DOM 就绪，`load`/`networkidle` 会因 GitHub JS 资源超时）
2. **自动裁剪**：记录滚动开始时间，用 ffmpeg 裁掉页面加载等待（保留 1.5s 缓冲），同时裁掉末尾图片提取阶段
3. 平滑滚动：`mouse.wheel()` + `easeInOutCubic` 缓动曲线，60fps 逐帧发送
4. 图片提取：三级过滤（尺寸 ≥ 200px、文件 ≥ 10KB、URL 黑名单 + `data-canonical-src` 检查 camo 图片）
5. **图片下载走代理**：通过 Playwright 页面上下文 fetch（自动走 `proxy.json` 配置的代理），不使用 Node.js 原生 fetch
6. SVG→PNG 转换
7. webm→mp4 转码
8. 生成 `manifest_full.json`

输出目录自动生成在 `gh-video-recorder/output/{YYYYMMDD-HHmm-owner_repo}/`。

```bash
cd gh-video-recorder/scripts

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
| `TOTAL_DURATION` | 否 | 目标总时长（秒），默认 180，影响滚动时长上限 |
| `OUTPUT_DIR` | 否 | 输出目录，默认自动生成在 `gh-video-recorder/output/` |
| `URLS` | 否 | 逗号分隔的额外 URL（官网/Demo 页面） |

**输出文件**（以自动生成的目录为例）：
- `gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo/` — 输出目录
- `output/` 目录已在 `.gitignore` 中

## 三、运行 allocate.py（时长分配 + intro/outro + concat 列表）

脚本自动完成：生成 animated intro/outro（10秒）→ 时长分配 → 图片转视频片段 → 生成 `concat_list.txt`。

```bash
cd gh-video-recorder/scripts

python3 allocate.py \
  "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo/manifest_full.json" \
  180 \
  --output-dir "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo" \
  --repo-url "https://github.com/{owner}/{repo}" \
  --content-dir "gh-trending-recommend/content/YYYY-MM-DD/"   # 可选
```

**参数说明**：
- 第 1 个参数：`manifest_full.json` 的路径
- 第 2 个参数：目标总时长（秒）
- `--output-dir`：输出目录，与 recorder 的输出目录一致
- `--repo-url`：仓库地址，用于生成 intro/outro
- `--content-dir`：仓库档案目录（有内容时显示标题+要点+总结）

**输出文件**：
- `intro.mp4` — 开头片段（10 秒，CSS 动画）
- `outro.mp4` — 结尾片段（10 秒，CSS 动画）
- `timeline.json` — 时间线分配详情
- `concat_list.txt` — ffmpeg concat 所需列表（文件已裁剪到精确时长）

## 四、合成最终视频

单条 ffmpeg concat 命令：

```bash
cd "gh-video-recorder/output/YYYYMMDD-HHmm-owner_repo"

ffmpeg -f concat -safe 0 -i concat_list.txt \
  -c:v libx264 -preset fast -pix_fmt yuv420p \
  "overview.mp4"
```

## 五、汇报

完成后报告：
1. 录制的页面 URL 列表
2. 提取的素材图片数量
3. 最终视频时长与路径
4. intro/outro 是否包含项目内容
5. 裁剪掉的加载等待时长

---

## CONTENT_DIR 联动说明

- 如果是从 `gh-trending-recommend` 触发的录制，`CONTENT_DIR` 指向 `gh-trending-recommend/content/YYYY-MM-DD/`
- 脚本从中读取仓库档案（`{repo_name}.md`）和口播脚本（`{repo_name}-口播脚本.md`），用于生成有内容的 intro/outro
- intro 显示：项目名称 + 一句话定位 + 核心要点
- outro 显示：项目地址 + Star/Fork 数据 + 总结语
- 如果独立使用（无 `CONTENT_DIR`），intro/outro 只显示项目名和 URL

## 异常处理

- 无官网：不传 `URLS`，仅录制仓库页面
- Cookie 弹窗：recorder.mjs 自动尝试关闭常见弹窗
- README 过短：滚动时长自动缩短（基于页面高度）
- Playwright 未安装：步骤零会检查并安装
- ffmpeg 缺失：recorder.mjs 启动时前置检查，缺失则报错退出
- GitHub camo 图片：通过 `data-canonical-src` 属性检测原始 URL，正确过滤 star-history 等图片
- 页面加载慢：使用 `domcontentloaded` 而非 `networkidle`/`load`，避免 GitHub JS 资源永不完成导致超时；录制后自动裁剪 pre-scroll 等待时间
- 图片下载超时：通过 Playwright 页面上下文下载（自动走代理），15s 超时
- intro/outro 字体：注入 Google Fonts (Inter + Noto Sans SC)，通过 Playwright 代理加载
