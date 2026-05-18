# nexu-io/html-anything

- **GitHub 地址**：https://github.com/nexu-io/html-anything
- **一句话定位**：让本地 AI Agent 帮你把 Markdown / CSV / JSON 等任意内容秒变出版级 HTML，零 API Key，支持 8 种主流编程 Agent CLI 自动检测
- **编程语言**：HTML
- **Star 总数**：2965（本期增长：过去7天新建高星，从 0 到近 3000 Star）
- **许可证**：Apache License 2.0
- **官方简介**：The agentic HTML editor — your local AI agent writes the HTML, you ship it. 75 Skills × 9 Surfaces, Sandboxed preview, 1-click to WeChat / X / Zhihu / HTML / PNG, Zero API key
- **使用领域标签**：AI 编辑器、Agent 技能、HTML 生成、内容创作、微信排版、小红书卡片、幻灯片、视频帧、数据报告
- **核心功能**：
  1. **多 Agent CLI 自动检测**：启动时自动扫描 PATH 中已安装的 Claude Code / Cursor Agent / Codex / Gemini CLI / Copilot CLI / OpenCode / Qwen Coder / Aider，复用你已有的登录会话，无需额外 API Key
  2. **75 个可组合 Skill 模板**：覆盖 Web 原型、20 种幻灯片风格、10 种视频帧、社交卡片（X/小红书/Spotify/Reddit）、办公文档（PM Spec/周报/OKR/财务报告/看板等）、长文编辑等 9 大交付面
  3. **SSE 实时流式渲染**：Agent 输出通过 JSON-line → SSE → iframe srcdoc 实时追加，可随时中断重新 Prompt，不浪费完整生成
  4. **一键导出多平台**：微信（juice 内联 CSS 零格式丢失）、X/微博/小红书（2x PNG 剪贴板）、知乎（LaTeX 图片占位符自动替换）、独立 .html / .png 下载
  5. **沙箱安全预览**：用户生成的 HTML 在 iframe sandbox 中渲染，第三方脚本可用但 cookies/localStorage 与宿主隔离
- **目标用户**：内容创作者、技术博主、产品经理、需要快速出图/出稿的开发者、微信公众号运营者
- **快速上手**：
  ```bash
  git clone https://github.com/nexu-io/html-anything
  cd html-anything
  pnpm install
  pnpm dev
  # 打开 http://localhost:3000，顶栏自动检测已安装的 Agent CLI
  ```
- **应用场景举例**：
  - 用 Markdown 写一篇技术文章，一键生成排版精美的公众号推文
  - 输入 CSV 数据，自动生成 NYT 风格的数据可视化报告
  - 快速制作小红书图文卡片，直接粘贴到小红书发布
  - 用 Prompt 生成产品 Landing Page 原型，无需写 CSS
  - 制作 Hyperframes 视频帧脚本，对接 Remotion 渲染 MP4
- **更多信息**：
  - Fork 数：345
  - 开放 Issue 数：28
  - 官网：无
  - 创建时间：2026-05-11  最后更新：2026-05-18
