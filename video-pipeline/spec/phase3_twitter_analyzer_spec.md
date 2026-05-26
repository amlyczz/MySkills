# 阶段 3: Twitter 链接分析器与 Agent 驱动数据抓取 (V3)

## 一、 新增项目类型：Twitter URL

为了扩展系统的信息源输入能力，在原有的 `Github Trending` 和 `Github URL` 基础上，新增 `Twitter URL` 作为一级项目输入源。该类型的核心逻辑类似于 `Repo Analyzer`，但针对社交媒体碎片的特征进行了深度适配。

## 二、 信息源抓取：Agent 驱动的 OpenCLI 动态执行

Twitter 数据抓取存在极大的不确定性（如网络延迟、UI 结构变更、反爬弹窗、元素未加载等）。因此，**绝对不能使用硬编码的静态爬虫脚本**。

### 1. 抓取策略 (Agentic Scraper)
我们将引入一个专门负责数据抓取的 **Scraper Agent**（爬虫智能体），由大模型直接驱动 `opencli` (或其他 CLI 工具) 进行操作：
- **动态闭环**：Agent 根据当前状态生成 `opencli` 命令 -> 执行 -> 读取返回的 stdout/stderr（甚至可以借助 `opencli` 的截图能力查看当前页面） -> 决定下一步动作。
- **错误恢复与重试**：
  - 如果 `opencli` 报 "Element not found"（未找到推文主体），Agent 会判断是否需要注入 `wait` 命令等待加载，或向下滚动页面。
  - 如果页面弹出 "Login to continue"，Agent 会识别并决定是执行登录流程的宏命令，还是退避并切换 fallback 方案。
  - 如果抓取到的信息被截断（如长 Thread 被折叠），Agent 会自主决定执行 "点击 'Show replies' 或 'Show more'" 的命令以展开内容后再抓取。

### 2. 需要抓取的核心素材清单
Agent 在操作浏览器时，目标是收集以下五类核心素材存入原始语料池：
1. **主推文 (Main Tweet)**：纯文本、图片 URL、视频 URL。
2. **长文 Thread (Thread Context)**：顺着作者的回复链向下遍历抓取，确保逻辑流不丢失。
3. **高赞评论 (Top Replies)**：展开高热度评论区，抓取网友视角的补充信息或纠错。
4. **引用转发 (Quote Retweets)**：抓取带有附加评论的转发内容，增加多元视角的解读。
5. **推文整体截图 (Full Tweet Screenshot)**：利用 OpenCLI (或无头浏览器) 的截图能力，对核心主推文和高赞评论进行全页/局部截图。这能完美保留 Twitter 的原生排版和 UI，是极佳的视频展示素材。
---

## 三、 输出数据模型映射：复用与独有扩展

`Twitter Analyzer` 的最终输出是一份大模型提炼后的结构化 JSON (`TwitterEncyclopedia`)。我们最大程度复用了 `Repo Analyzer` 的模型体系，并针对 Twitter 增加了特有维度。

### 1. 从 Repo Analyzer 复用的维度 (Reusable Dimensions)

在处理社交博文时，依然能套用开源项目的分析框架：
- **标题与作者 (Title & Author)**：博文作者、Handle (`@username`) 及身份认证标记。
- **核心摘要 (Tagline / Quick Start)**：提炼该篇博文的“一句话核心价值”或“行动倡议”。
- **技术领域分类 (Tech Domain / Project Category)**：继续使用原有的 `TechDomain` 枚举，将推文内容归类为 AI, Web3, Design, Meme 等。
- **核心数据指标 (Stats Text)**：将 GitHub 的 Stars/Forks 替换为 Twitter 的 Views (浏览量), Likes (点赞), Reposts (转发), Bookmarks (收藏)。
- **精选多媒体素材池 (Candidate Materials & Covers)**：提取推文自带的视频直链 (`.mp4`)、配图、外挂文章预览图。供后续节点下载、裁剪及剧本创作使用。

### 2. Twitter 独有输出维度 (Twitter-Specific Dimensions)

推特平台具有强互动性和碎片化特征，`TwitterEncyclopedia` 将新增以下专有维度：
- **Thread 完整脉络 (Thread Narrative)**：区别于单点介绍，这里需要大模型将多条断裂的推文合并为**长文逻辑流**，提炼出文章的“起、承、转、合”。
- **社区风向与补充视角 (Community Sentiment)**：根据抓取到的评论，分析大众对该推文的态度（如：赞同、质疑、提供新案例）。提取具有高价值的“排坑”或“延伸视角”供视频解说使用。
- **外部外链与实体扩展 (External Links & Entities)**：结构化提取博文中指向的外部产品链接、新闻出处或提及的其他工具/人物。

---

## 四、 整体工作流总结 (Workflow)

1. **入口 (Input)**：系统接收到 `https://x.com/...` 的链接。
2. **多源素材动态抓取 (Agent Scrape Phase)**：
   - `Scraper Agent` 启动，使用 `opencli` 挂载本地浏览器或容器浏览器。
   - 动态执行命令、滚动、点击展开，收集完整的主文本、图片/视频链接、Thread 和高赞评论。
   - 若遇阻，Agent 根据错误日志动态调整爬取策略。将最终成功拉取的内容打包为原始长文本素材 (Raw Material)。
3. **大模型聚合分析 (Analyzer Phase)**：
   - 核心 LLM 分析原始长文本素材。
   - (可选) 若博文描述了复杂的事件或架构，赋予大模型**架构绘图师**的权限，使用 Mermaid 语法动态生成**事件时序图**或**概念关系图**。
   - 提炼并生成混合了复用维度与特有维度的 `TwitterEncyclopedia`。
4. **精选素材按需下载 (On-demand Fetching)**：
   - 将确认高优的媒体 URL 交给 Downloader，落地到 `output/twitter_id/assets/` 下。
5. **进入后续管线 (Next Phase)**：
   - 带有深度上下文、社区观点、Mermaid 结构图和本地高清图片/视频的豪华数据包，传递给剧本创作器 (Script Composer)。
