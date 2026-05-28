# OpenCLI Twitter 内容抓取方法论

## 背景

Twitter/X 页面是动态渲染的（React CSR），传统的 HTTP 请求无法获取推文文字内容。当前管线采用**多层降级策略**，逐层尝试直到拿到可用内容。

## 工具链

| 工具 | 作用 | 优势 |
|------|------|------|
| `yt-dlp` | 提取推文元数据 + 下载媒体 | 可获取文字描述、媒体 URL |
| `Playwright` ( Chromium) | 截图 + 页面渲染 | 获取 JavaScript 渲染内容 |
| `claude -p` (structured output) | 分析截图/媒体 → 结构化 JSON | Claude Vision 理解图片内容 |
| `media_downloader` | 统一媒体下载 | 统一管理媒体文件 |

## 抓取管线流程

```
URL 输入
    │
    ▼
┌─────────────────────┐
│ yt-dlp fetch_metadata │ ← primary（最快）
│ + download_media      │
└──────────┬────────────┘
           │ 成功且有内容
           ▼
    RawScrapeResult ✓
           │
           │ 失败 / 内容为空
           ▼
┌─────────────────────┐
│ Playwright screenshot │ ← fallback
│ (full_page=True)     │
└──────────┬────────────┘
           │
           ▼
    screenshot_paths ✓
           │
           ▼
┌─────────────────────┐
│ Claude Code Vision   │ ← 分析图片/视频内容
│ (structured_output)  │
└──────────┬────────────┘
           │
           ▼
    TwitterContentModel ✓
```

## 关键经验

### 1. yt-dlp 是首选但非万能

```bash
yt-dlp "https://x.com/i/status/2058938481011839240"
```

- yt-dlp 能获取 `description`（推文文字）和 `uploader`（作者）
- 但纯图片/视频推文：`description` 可能为空或只有标题
- 对嵌入式媒体（图片内嵌文字）无效

### 2. `claude -p --json-schema` 的正确用法

**核心发现**：`--output-format json` 和 `--json-schema` 一起用时：

```
# 成功响应结构
{
  "type": "result",
  "result": "Done. The JSON output has been provided via the StructuredOutput tool.",
  "structured_output": { ...实际结构化数据... },
  "subtype": "success"
}
```

**常见错误**：只读 `result` 字段 → 拿到的是文本 "Done..." 而不是 JSON
**正确做法**：优先读 `structured_output`，`result` 只是兜底的描述文本

```python
# Claude Code CLI 调用示例
cmd = [
    "claude", "-p", prompt,
    "--output-format", "json",
    "--json-schema", json.dumps(schema),
    "--allowedTools", "Read", "Glob", "Grep",
    "--dangerously-skip-permissions",
]

# 解析响应
output = json.loads(stdout)
structured = output.get("structured_output")
if structured is not None:
    data = structured  # ✓ 正确
else:
    data = output.get("result", "")  # ✗ 这是文本
```

### 3. `--json-schema` 不强制约束模型输出

`--json-schema` 只是告诉模型"我希望你输出这种格式"，模型仍可能在 `result` 里输出 markdown。只有 `structured_output` 是 SDK 验证过的结构化数据。

### 4. 多工具调用时的 `result` 是 markdown

当 Claude Code 调用了工具（如 `Bash(gh:*)`）后：
- `result` = 模型输出的自然语言总结（markdown）
- `structured_output` = 模型最终的结构化输出

**结论**：永远优先用 `structured_output`。

### 5. Markdown 表格回退策略

当模型偶尔不听话，输出 markdown 表格而非 JSON 时，需要解析表格：

```python
# 策略：从 markdown 表格提取结构化数据
table_pattern = re.compile(r"^\s*\|\s*(.+?)\s*\|\s*$", re.MULTILINE)
# 识别表头、分隔行、数据行
# 提取 owner/name/one_liner 等字段
```

### 6. Playwright 截图的 Proxy 配置

```python
def _launch_args(self) -> list[str]:
    proxy = settings.http_proxy
    args = ["--no-sandbox"]
    if proxy:
        # http proxy → socks5 转换
        proxy_arg = proxy.replace("http://", "socks5://") if "10808" in proxy else proxy
        args.append(f"--proxy-server={proxy_arg}")
    return args
```

### 7. 媒体 vs 文字的决策逻辑

```
if main_tweet_text is empty AND screenshot_paths exists:
    → 有截图，继续（Claude Vision 可分析图片内容）
elif main_tweet_text is empty AND no media:
    → 失败，无法制作视频
```

## OpenCLI 抓取命令速查

```bash
# 1. yt-dlp 元数据（最快）
yt-dlp --dump-json "https://x.com/i/status/XXXXX"

# 2. yt-dlp 下载媒体
yt-dlp -o "%(id)s.%(ext)s" "https://x.com/i/status/XXXXX"

# 3. Playwright 截图
claude -p "截取这个页面: https://x.com/i/status/XXXXX" \
  --output-format text \
  --allowedTools Bash \
  --dangerously-skip-permissions

# 4. Claude Code 结构化分析图片
claude -p "分析这张推文截图，提取：作者、内容摘要、技术话题" \
  --output-format json \
  --json-schema '{"type":"object","properties":{...}}' \
  --allowedTools Read \
  --dangerously-skip-permissions
```

## 常见错误处理

| 错误 | 原因 | 解决 |
|------|------|------|
| `Claude Code CLI exited 1` | CLI 内部错误 | 检查 stderr 输出 |
| `Could not parse Claude Code JSON` | 模型输出 markdown 而非 JSON | 加 markdown 表格解析回退 |
| `RawScrapeResult has no attribute 'text'` | 字段名错误 | 确认实体类字段名（`main_tweet_text`） |
| 文字提取为空 | CSR 页面/图片推文 | 降级到截图 + Claude Vision |
| `structured_output` 为 None | 未使用 `--json-schema` | 确认 CLI 参数 |

## 输出契约

抓取结果写入 `RawScrapeResult`：

```python
class RawScrapeResult(BaseModel):
    main_tweet_text: str = ""          # 推文主文字
    thread_texts: list[str] = []       # 线程推文
    reply_texts: list[str] = []        # 回复
    quote_retweet_texts: list[str] = [] # 引用推文
    media_urls: list[str] = []          # 媒体 URL
    screenshot_paths: list[str] = []    # 本地截图路径
    author_handle: str = ""
    author_name: str = ""
    error: Optional[str] = None
```

分析后输出 `TwitterContentModel`，包含结构化的 `title`/`summary`/`main_tweet_text`/`thread_context` 等字段，供下游 `compose_script` 使用。
