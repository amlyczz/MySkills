---
name: github-repo-video-recorder
description: >
  全自动录制 GitHub 仓库浏览视频。从仓库首页用鼠标滚轮平滑滚动到页脚（确保录屏捕获），
  智能过滤并提取页面素材图片，自动转码为 MP4，生成 intro/outro 片段，最终合成一条完整演示视频。
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

## 〇、环境检查

确认以下工具已安装：

```bash
node --version        # Node.js >= 18
python3 --version     # Python >= 3.9
ffmpeg -version       # ffmpeg (with libx264)
npx playwright --version  # Playwright browsers installed
```

若 Playwright 浏览器未安装，先执行：
```bash
npx playwright install chromium
```

## 〇、代理配置（可选，页面加载慢时需要）

如果 GitHub 访问慢，需要配置代理。首次使用时询问用户：
- **运行平台**：`mac` 或 `wsl`
- **代理端口**：如 `7890`（Clash/ClashX 默认端口）

配置后保存到本地，下次自动复用：

```bash
cat > gh-video-recorder/proxy.json << 'EOF'
{
  "enabled": true,
  "platform": "mac",
  "port": 7890
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

## 二、运行 recorder.mjs（录制 + 截图 + 转码 + 清单）

脚本自动完成：页面录制（鼠标滚轮滚动）→ 图片提取（三级过滤，含 SVG→PNG 转换）→ webm→mp4 转码 → 生成 `manifest_full.json`。

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
