# 口播脚本 - 2026年05月18日 - html-anything

Markdown 写完文档，截图发到 Twitter 上一坨灰底黑字——这个场景在技术圈太常见了。HTML 才是人类真正该阅读的格式，但手写 CSS 排版？多数人没那个耐心。

html-anything 给出了一个相当直接的解法：你本地已经装好的 Claude Code、Cursor Agent、Codex，或者 Gemini CLI——任何一个，它启动时自动检测，复用你现有的登录会话，连 API Key 都不用填第二遍。然后你在编辑器里贴入 Markdown、CSV、甚至 SQL 查询结果，选一个模板，按 ⌘+Enter，你的本地 Agent 就开始实时生成一个出版级的单文件 HTML。

它的模板库目前有 75 个 Skill，覆盖了 9 种交付面。想做微信公众号推文，juice 内联 CSS 让你直接粘贴进去，格式零丢失。想发小红书，2 倍分辨率 PNG 直接拷到剪贴板。想做幻灯片，20 种风格从瑞士国际主义到小红书粉彩都有。甚至还有 Hyperframes 视频帧脚本，对接 Remotion 可以直接渲染 MP4。

整个生成过程是 SSE 流式推送的，Agent 写一行你就看到 HTML 渲染一行，方向不对随时中断重来。安全方面，所有生成的 HTML 都在沙箱 iframe 里运行，脚本可以执行但 cookies 和 localStorage 与宿主页面完全隔离。

这个项目 5 月 11 号才建库，一周不到 Star 数逼近 3000。背后团队就是做 open-design 的那个，4 万 Star 的项目。技术栈是 Next.js 16 + React 19 + Tailwind v4，Apache 2.0 开源。本地 pnpm dev 一键启动，Agent 始终跑在你自己的机器上，不经过任何第三方服务器。

随着 AI Agent 越来越多地接管"写"这个环节，输出格式从 Markdown 迁移到 HTML 可能只是时间问题。html-anything 把这条路径铺得相当平坦。
