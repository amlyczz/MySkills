# Pipeline 全流程诊断与 Skill 抽象方案

> 日期: 2026-05-25
> 视角: 顶尖科普视频制作人 + 技术架构专家 + 领域知识专家 + 视觉美学专家
> 范围: GitHub Repo → 科普视频 完整链路

---

## 一、当前流程全景

```
┌─────────────────────────────────────────────────────────────────────────┐
│  用户输入: GitHub Repo URL                                              │
└─────┬───────────────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  1. RepoScraper   │    │  Playwright 抓 README <article> + 截图       │
│  (Playwright)     │    │  截断 5000 字符                               │
└─────┬────────────┘    └──────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  2. RepoAnalyzer  │    │  LLM 一步到位生成 ContentModel               │
│  (LLM)            │    │  内含: source + content + script + insight   │
│                   │    │  但: MaterialManifest 未生成（bug）           │
└─────┬────────────┘    └──────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  3. ScriptComposer│    │  LLM 从 ContentModel 字段重写 Script          │
│  (LLM)            │    │  硬编码 target_duration=60s                  │
│                   │    │  丢弃了分析阶段已生成的 script                 │
└─────┬────────────┘    └──────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  4. QA Script     │    │  LLM 扣分制评估 (4维度, >=80 通过)           │
│  (LLM, 不同模型)  │    │  失败 x3 → HITL 人工介入                     │
└─────┬────────────┘    └──────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  5. BlueprintGen  │    │  LLM 一次性生成完整 Blueprint (13维度)        │
│  (LLM)            │    │  递归 ElementConfig 树 + 动画 + 过渡 + 字幕   │
│                   │    │  JSON > 10k 字符时截断（QA 失真）              │
└─────┬────────────┘    └──────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  6. QA Blueprint  │    │  LLM 扣分制评估 (6维度, >=80 通过)           │
│  (LLM, 不同模型)  │    │  截断的 JSON 导致无法验证完整质量              │
└─────┬────────────┘    └──────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  7. VideoRender   │    │  调用 render.py 子进程                       │
│  (Remotion)       │    │  Blueprint JSON → video.mp4                  │
└─────┬────────────┘    └──────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  8. PostProcess   │    │  TTS voiceover + BGM + SRT + ffmpeg 混音     │
│  (subprocess)     │    │  语音固定 "Chinese Male Announcer"           │
│                   │    │  BGM 固定 "tech atmospheric electronic"      │
│                   │    │  SRT 简单按 duration_est 等分（不精确）       │
└─────┬────────────┘    └──────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐
│  输出: final.mp4  │
└──────────────────┘
```

---

## 二、四维专家诊断

### 2.1 科普视频制作人视角 — 「讲故事的人」

#### 缺陷 A1: 两个 LLM 调用在写同一个 Script，互相矛盾

`RepoAnalyzer` 的 Phase 4 prompt 已要求 LLM 生成 script（含 segments + visual_type），但紧接着 `ComposeScriptUseCase` 又用另一个 LLM 调用重写 script。两个 prompt 对"好 script"的定义不同：

- Analyzer prompt: "Write an engaging narration script divided into segments"
- Composer prompt: "Create an engaging narration script based on the project content analysis"

**后果**: 分析阶段的 script 上下文丢失，composer 只看到扁平化的字段（title, tagline, summary, points），而不是完整的分析洞察。相当于一位研究员写了详细报告，导演只读了标题就重新写了一版。

#### 缺陷 A2: 没有叙事弧线设计

60 秒视频硬编码 `target_duration=60`，但没有任何叙事结构指导：
- 没有 Hook（前 3 秒必须抓人）
- 没有 Rising Action（逐步揭示）
- 没有 Climax（核心洞察的高潮呈现）
- 没有 Resolution（收尾 + CTA）

当前 prompt 只说 "Target duration is around 60 seconds"，没有告诉 LLM 怎么在 60 秒内讲好一个故事。

#### 缺陷 A3: 视觉和脚本脱钩

`visual_type` 只有 6 种（intro, generic, code, data, split, outro），但 Remotion 引擎有 60+ 种 ComponentType 和 16 种模板。Script 阶段无法指定具体的视觉表达（比如"用 kinetic-typography 展示 tagline"），到 Blueprint 阶段才做视觉决策——但此时叙事节奏已经被锁定了。

#### 缺陷 A4: 字幕与口播不同步

PostProcess 阶段的 SRT 生成是**按 duration_est 等分**：

```python
# 当前实现（post_process.py 内联）
for i, seg in enumerate(script.segments):
    start = current_time
    end = current_time + seg.duration_est
    srt_entries.append(...)
    current_time = end
```

这意味着字幕时间和实际 TTS 语音时长完全无关。实际口播语速是变化的——短句快、长句慢，但 SRT 假设匀速。结果就是字幕要么超前（还没说到就显示了），要么滞后（说完了字幕还停着）。

#### 缺陷 A5: 缺少观众模型

所有 prompt 都没有定义"谁在看这个视频"。是给开发者看的？给投资人看的？给技术管理者看的？不同观众需要完全不同的叙事策略和术语深度。

---

### 2.2 技术架构专家视角 — 「造引擎的人」

#### 缺陷 B1: MaterialManifest 永远为空

`LLMRepoAnalyzer.analyze_repo()` 签名声明返回 `tuple[ContentModel, MaterialManifest]`，但实际只返回 `ContentModel`。MaterialManifest 从未生成。

这意味着整个管线**没有任何真实素材**——没有截图、没有 logo、没有代码高亮图。Remotion 渲染出的视频是纯文字 + 抽象动画，没有一张来自项目本身的真实图片。

#### 缺陷 B2: Blueprint QA 截断导致虚假评分

```python
if len(blueprint_json) > 10000:
    blueprint_json = blueprint_json[:10000] + "\n... [truncated]"
```

一个完整的 Blueprint（5-7 个 Scene，每个 3-5 个 Element）轻松超过 10k 字符。截断后 QA 只能看到前 1-2 个 Scene，无法评估"所有场景的 outFrame"、"视觉一致性"等全局维度。评分本质上只基于 Blueprint 的开头部分。

#### 缺陷 B3: LLM 一次性生成复杂 Blueprint 可靠性极低

Blueprint 模型有 397 行定义，包含递归 ElementConfig 树、Spring 动画参数、Stagger 配置、字幕分 token 等等。让 LLM 通过 `with_structured_output(Blueprint)` 一步到位生成这个结构，相当于让一个人同时做分镜师、动画师、字幕师、音效师的工作。

实际表现：LLM 倾向于生成**最短合法路径**——每个 Scene 只有 1-2 个 Element，动画只填必填字段，subtitle token 粗暴按句号切割。这直接导致 QA 评分偏低 → 重试 → 再低 → HITL 介入的死循环。

#### 缺陷 B4: 子进程调用无 observability

Remotion render、audio mixer、media generator 全部通过 `subprocess.run()` 调用。没有超时控制、没有进度回调、没有结构化日志。子进程挂死时整个 pipeline 静默阻塞。

#### 缺陷 B5: Langfuse 配置了但从未使用

`app_config.py` 配置了 langfuse_public_key、langfuse_secret_key、langfuse_host，但没有任何 LangChain callback 或 Langfuse SDK 调用。LLM 调用全部是黑盒——不知道花了多少 token、什么 prompt 产生了什么质量、哪一步最耗时间。

#### 缺陷 B6: 没有 retry with feedback

QA 失败后重试时，只是简单地重新调用同一个 LLM，**没有把 QA 的 reasoning 传回生成器**。LLM 不知道上次被扣分的原因，大概率犯同样的错误。

---

### 2.3 领域知识专家视角 — 「懂技术的人」

#### 缺陷 C1: 输入只有 README，严重不足

当前只抓取 GitHub 页面的 `<article>` 元素（即 README），截断 5000 字符。但一个项目的技术精髓通常不在 README 里：

- **架构洞察**藏在 `src/` 目录结构和核心模块里
- **设计模式**体现在代码实现中（README 通常只提名字不展示）
- **技术亮点**需要在 `package.json`/`pyproject.toml`/`go.mod` 中看依赖栈
- **性能数据**在 benchmark 结果或 CI 配置中

仅靠 5000 字 README 生成的"技术架构"分析大概率是编造的（LLM hallucination）。

#### 缺陷 C2: 没有"事实核查"环节

QA Script 的"Technical Accuracy"维度要求 "All technical claims verified correct"，但 QA LLM 看到的也是同一份 README。它无法验证"这个项目是否真的用了 Transformer 架构"——它只能检查 script 内部逻辑是否自洽。这不是事实核查，是自洽检查。

#### 缺陷 C3: 没有代码实际分析能力

`SourceCodeInsight` 模型定义了 architecture、patterns、highlights、api_style 字段，但 LLM 从未见过一行真实代码。它只能从 README 推测项目结构，这和看宣传册猜产品架构一样不靠谱。

#### 缺陷 C4: 无法区分项目类型的技术深度

`ProjectCategory` 只有 5 种且分类逻辑极其简单（has_code_insight + points >= 5 → TECH_DEEP_DIVE）。没有区分：
- 前端 UI 库（需要展示交互、样式、组件 API）
- 后端框架（需要展示架构模式、中间件链、性能）
- CLI 工具（需要展示命令流程、输出效果）
- AI/ML 模型（需要展示架构图、参数规模、训练流程）
- DevOps 工具（需要展示部署流程、配置示例）

每种类型需要完全不同的视觉叙事策略。

---

### 2.4 视觉美学专家视角 — 「看画面的人」

#### 缺陷 D1: 美学决策全部交给一个 LLM 调用

Blueprint prompt 的"13-Dimensional Visual Decision Framework"试图让 LLM 一次决策所有视觉维度。但美学是**层次化**的：
1. **整体风格**（暗色赛博？柔和极简？渐变流体？）
2. **场景节奏**（快切？长镜头？呼吸感？）
3. **元素编排**（对齐、层次、留白）
4. **动画曲线**（spring 还是 bezier？entrance 还是 emphasis？）
5. **色彩情绪**（暖色信任、冷色科技、对比冲击）

让一个 LLM 调用同时处理这五层，结果就是"万金油"风格——什么都有一点，什么都不极致。

#### 缺陷 D2: 没有参考视频/风格板

专业视频制作流程中，视觉决策基于**参考图/风格板（moodboard）**。当前 pipeline 完全没有这个概念——LLM 凭空想象视觉风格，没有锚点。Remotion 已有 16 种模板（dark-neon, glassmorphism, sakura-pink, neon-blue 等），但 prompt 只列了 6 种背景类型，没有展示模板的实际视觉效果。

#### 缺陷 D3: 音频不是视觉的附属品

当前 BGM 是固定 prompt "tech atmospheric electronic" 生成的。但专业科普视频的音频设计是**与画面紧密配合**的：
- 场景切换 → 音效 whoosh
- 数据展示 → 上升音调
- 高潮时刻 → BGM swell
- 静态字幕 → 音量降低

Blueprint 里有 `SfxTrigger` 和 `AudioDucking` 模型，但 LLM 生成的 SFX 触发点极其公式化（每个 transition 加一个 whoosh），ducking 参数也是固定值。

#### 缺陷 D4: 后期制作与视觉蓝图脱钩

Blueprint 定义了每个 Scene 的 voiceover startFrame/endFrame，但 PostProcess 阶段完全不用这些信息。TTS 生成的 voiceover 时长是实际的（不是估计的），但 Timeline 直接按 `duration_est` 排布——导致 Blueprint 中精心计算的帧位置和实际音频完全对不上。

---

## 三、缺陷严重度矩阵

| ID | 缺陷 | 科普叙事 | 技术架构 | 领域知识 | 视觉美学 | 影响 |
|----|------|---------|---------|---------|---------|------|
| A1 | 双重 Script 生成 | ★★★ | ★★ | ★ | | 浪费 token + 上下文丢失 |
| A2 | 无叙事弧线 | ★★★★★ | | | | 视频无吸引力 |
| A3 | 视觉脚本脱钩 | ★★ | | | ★★★ | 视觉表达力受限 |
| A4 | 字幕口播不同步 | ★★★★ | ★★ | | ★★★ | 用户体验灾难 |
| A5 | 无观众模型 | ★★★★ | | ★★★ | | 叙事无方向 |
| B1 | MaterialManifest 空 | | ★★★★★ | ★★★★ | ★★★★ | 视频无真实素材 |
| B2 | QA 截断失真 | | ★★★★ | | ★★★ | QA 形同虚设 |
| B3 | 一步生成 Blueprint | ★★ | ★★★★★ | ★★ | ★★★★ | 可靠性极低 |
| B4 | 子进程无 observability | | ★★★★ | | | 运维黑盒 |
| B5 | Langfuse 未启用 | | ★★★ | | | 无法优化 |
| B6 | 重试无反馈 | ★★★ | ★★★★ | ★★ | ★★★ | 死循环 |
| C1 | 输入只有 README | ★★★ | ★★ | ★★★★★ | ★★ | 技术内容虚假 |
| C2 | 无事实核查 | ★★ | ★ | ★★★★★ | | 传播错误信息 |
| C3 | 无代码分析 | ★★ | ★★ | ★★★★★ | ★★ | 架构描述不可信 |
| C4 | 无项目类型区分 | ★★★ | ★★ | ★★★★ | ★★★ | 千篇一律 |
| D1 | 美学一步到位 | | ★★ | | ★★★★★ | 风格平庸 |
| D2 | 无参考风格板 | | | | ★★★★★ | 视觉无锚点 |
| D3 | 音频视觉脱钩 | ★★★ | ★★ | | ★★★★ | 沉浸感差 |
| D4 | 后期与蓝图脱钩 | ★★★★ | ★★★★ | | ★★★★ | 帧位全部错乱 |

---

## 四、理想流程 vs 当前流程

### 4.1 理想的科普视频制作流程

```
Phase 0: 深度信息采集
├── GitHub API: stars, forks, topics, language breakdown
├── README + docs/ + CONTRIBUTING.md
├── 目录结构分析（src/ 层级, 模块组织）
├── 核心代码文件阅读（main entry, config, 关键算法）
├── 依赖栈分析（package.json/pyproject.toml/go.mod）
├── 截图/Logo/GIF 素材采集
└── 输出: RichProjectContext (结构化 + 原始素材)

Phase 1: 领域理解与选题
├── 技术架构自动识别（MVC? Clean Architecture? Plugin?）
├── 核心创新点提炼（vs 竞品差异化）
├── 观众画像建模（开发者? CTO? 产品经理?）
├── 叙事角度选择（教程? 评测? 架构解析? 前沿介绍?）
└── 输出: StoryBrief (角度 + 观众 + 核心信息层级)

Phase 2: 分镜脚本
├── 叙事弧线设计（Hook → 展开 → 深入 → 高潮 → 收尾）
├── 每场景: 文案 + 视觉意图(不是 visual_type, 而是 visual_brief)
├── 每场景: 素材绑定（哪张图、哪段代码、哪个数据）
├── 时长分配（基于口播节奏, 不是匀速）
└── 输出: Storyboard (分镜表 + 素材绑定)

Phase 3: 视觉设计
├── 风格板选择（从 16 种模板中选择 + 微调）
├── 每场景视觉编排（Element Tree 设计）
├── 动画编排（entrance → emphasis → exit 编舞）
├── 色彩与排版方案
└── 输出: Blueprint (完整可渲染)

Phase 4: 音频设计
├── TTS 口播（基于实际 script, 获取真实时长）
├── BGM 风格匹配（基于视觉风格选择音乐类型）
├── SFX 设计（与动画关键帧对齐）
├── Audio Ducking 曲线（基于口播实际时间轴）
└── 输出: AudioAssets (voiceover.mp3 + bgm.mp3 + sfx_timeline)

Phase 5: 渲染与合成
├── Blueprint + Audio 对齐（用实际音频时长修正帧位置）
├── Remotion 渲染 video.mp4
├── ffmpeg 混音（voiceover + bgm + sfx 按 timeline 合成）
├── 字幕烧录（基于实际口播音频时间轴）
└── 输出: final.mp4
```

### 4.2 核心差距

| 理想步骤 | 当前对应 | 差距 |
|----------|---------|------|
| 深度信息采集 | Playwright 抓 README | 只看 README，无代码/目录/依赖分析 |
| 领域理解选题 | 无 | 完全缺失 |
| 分镜脚本 | ScriptComposer | 无叙事弧线，无素材绑定 |
| 视觉设计 | BlueprintComposer | 一步到位，无分层决策 |
| 音频设计 | PostProcess 内联 | TTS/BGM/SFX 全部固定参数 |
| 渲染合成 | Remotion + ffmpeg | 音画不同步 |

---

## 五、Skill 抽象方案

### 5.1 核心理念

将每个阶段抽象为标准 Skill，每个 Skill 有：

```
Skill = {
    id: string,                    // 全局唯一标识
    name: string,                  // 可读名称
    trigger: Condition,            // 何时激活
    input_contract: Type,          // 输入数据契约
    output_contract: Type,         // 输出数据契约
    prompt_templates: Prompt[],    // LLM 提示词模板（可替换）
    tools: Tool[],                 // 可调用的工具（API、CLI、文件系统）
    quality_gates: QAGate[],       // 输出质量关卡
    retry_strategy: RetryConfig,   // 重试策略（含 feedback 回传）
    config: Dict,                  // 可配置参数
}
```

### 5.2 Skill 分解

#### Skill 1: `deep-research` — 深度信息采集

```
input_contract:  RepoURL (str)
output_contract: RichProjectContext
tools:
  - github_api_tool      → 仓库元数据（stars, forks, topics, language）
  - readme_scraper       → README 全文（不截断）
  - directory_scanner    → 目录树结构
  - code_reader          → 核心文件内容（main entry, config, 关键模块）
  - dependency_analyzer  → package.json/pyproject.toml/go.mod 解析
  - screenshot_capture   → GitHub 页面截图
  - asset_downloader     → Logo, GIF, 截图等素材下载
  - contributor_analyzer → 贡献者活跃度、组织背景
```

**与当前差距**: 当前只有 `readme_scraper`，且截断 5000 字符。

#### Skill 2: `domain-analysis` — 领域理解与选题

```
input_contract:  RichProjectContext
output_contract: StoryBrief
prompt_focus:
  - 技术架构模式识别
  - 核心创新点 vs 竞品差异
  - 观众画像建模
  - 叙事角度选择
  - 信息层级排列（必须讲、值得讲、可以省略）
```

**与当前差距**: 当前完全缺失。`ProjectCategory` 的 5 种分类远不够。

#### Skill 3: `storyboard-compose` — 分镜脚本创作

```
input_contract:  RichProjectContext + StoryBrief
output_contract: Storyboard
prompt_focus:
  - 叙事弧线（Hook → Rising → Climax → Resolution）
  - 每场景: 文案 + visual_brief（视觉意图描述，不是枚举值）
  - 每场景: 素材绑定（引用 RichProjectContext 中的具体素材 ID）
  - 口播节奏控制（短句快节奏、长句留呼吸）
  - 时长基于内容密度分配，不是匀速
```

**与当前差距**: 当前 ScriptComposer 无叙事弧线、无素材绑定、硬编码 60s。

#### Skill 4: `visual-design` — 视觉设计

```
input_contract:  Storyboard + RichProjectContext
output_contract: Blueprint
prompt_focus:
  - 从模板库选择风格板（16 种现有模板 + 参数微调）
  - 分层决策: 整体风格 → 场景布局 → 元素编排 → 动画编舞
  - 素材嵌入（真实截图、代码截图、logo 等）
  - 色彩方案与排版一致性
tools:
  - template_gallery     → 浏览 16 种模板的预览图
  - component_registry   → 查询 60+ 组件的能力和参数
  - animation_catalog    → 查询动画类型和推荐用法
```

**与当前差距**: 当前一步到位，无分层，无模板选择机制。

#### Skill 5: `audio-design` — 音频设计

```
input_contract:  Storyboard + Blueprint
output_contract: AudioAssets
prompt_focus:
  - 基于视觉风格选择 BGM 类型（不是固定 prompt）
  - SFX 设计与动画关键帧对齐
  - Audio ducking 曲线基于口播实际时间轴
tools:
  - tts_engine           → TTS 生成（返回实际音频时长）
  - bgm_generator        → BGM 生成（基于风格 prompt）
  - sfx_library          → 音效库查询和匹配
```

**与当前差距**: 当前音频参数全部硬编码，SRT 按 duration_est 等分。

#### Skill 6: `render-compose` — 渲染合成

```
input_contract:  Blueprint + AudioAssets
output_contract: FinalVideo
tools:
  - frame_calibrator     → 用实际音频时长修正 Blueprint 帧位置
  - remotion_renderer    → Remotion 渲染
  - audio_mixer          → ffmpeg 多轨混音
  - subtitle_burner      → 基于实际口播时间轴烧录字幕
quality_gates:
  - 视频可解码
  - 音画同步检查
  - 字幕时间轴偏差 < 200ms
```

**与当前差距**: 当前渲染和音频完全脱钩，帧位置全部错误。

#### Skill 7: `quality-review` — 质量审核

```
input_contract:  任意阶段输出 + 该阶段的 QA 维度定义
output_contract: QAScorecard (含 per-dimension 扣分明细 + 改进建议)
retry_strategy:
  - 将 QA reasoning 注入重试 prompt（feedback loop）
  - 最多重试 3 次
  - 超过 3 次升级 HITL
```

**与当前差距**: 当前 QA 截断 Blueprint JSON、无 feedback loop、QA 维度与 Skill 不匹配。

### 5.3 Skill 与 LangGraph 节点映射

```python
# 当前 graph.py: 10 个节点
analyze_repo → compose_script → qa_script → [HITL] → generate_blueprint → qa_blueprint → [HITL] → render_video → post_process → END

# 理想 graph.py: 7 个 Skill 节点
deep_research → domain_analysis → storyboard_compose → [qa_storyboard] → visual_design → [qa_visual] → audio_design → render_compose → [qa_final] → END
#                                                              ↓ fail x3                                                          ↓ fail x3
#                                                          [HITL_script]                                                    [HITL_visual]
```

关键变化：
1. **拆分**: `analyze_repo` → `deep_research` + `domain_analysis`（信息采集 vs 理解选题）
2. **合并**: `compose_script` + `generate_blueprint` 之间增加 `storyboard_compose`（分镜表是两者的桥梁）
3. **重排**: `audio_design` 在 `render_compose` 之前（先有音频时长，再对帧）
4. **QA 贯穿**: 每个 Skill 都有对应的 QA gate，且 QA 维度与该 Skill 的 output_contract 对齐

### 5.4 Skill 的 feedback loop 设计

```
Skill 执行
  ↓
QA 评估 (quality_gates)
  ↓ score >= threshold
  ↓─────────── 通过 → 下一个 Skill
  ↓
  ↓ score < threshold
  ↓
Retry: 将 QA 的 reasoning + deduction details 注入 Skill 的重试 prompt
  ↓
  ↓ retry_count < 3
  ↓─────────── 重试（带 feedback）
  ↓
  ↓ retry_count >= 3
  ↓
HITL: 展示 QA reasoning + 改进建议，人工决策
```

**核心区别**: 当前重试时 LLM 不知道被扣了什么分。改进后 QA 的每一条扣分原因都作为 feedback 回传。

### 5.5 Skill 配置化

每个 Skill 的 prompt_templates 和 config 都是可替换的：

```yaml
skills:
  storyboard-compose:
    prompt_template: "prompts/storyboard_v2.md"  # 可替换
    config:
      target_duration: 60
      narrative_arc: "hook-rising-climax-resolution"
      audience: "developer"
      pacing: "medium"
    quality_gates:
      - dimension: "narrative_arc"
        threshold: 80
        weight: 0.3
      - dimension: "material_binding"
        threshold: 75
        weight: 0.2
```

---

## 六、优先级排序（按 ROI）

| 优先级 | 缺陷 ID | 修复 | 预期收益 |
|--------|--------|------|---------|
| P0 | A4+D4 | 音画同步：先 TTS → 用实际时长排布 Timeline + 修正 Blueprint 帧位置 | 视频可用性从 0 → 可用 |
| P0 | B1 | 素材采集：GitHub API + asset downloader → 真实素材嵌入视频 | 视频从纯文字 → 有真实内容 |
| P1 | B6 | QA feedback loop：将 QA reasoning 注入重试 prompt | 重试有效率提升 |
| P1 | A1 | 去重：让 Analyzer 只做分析，Composer 只写脚本，不重复生成 | 消除矛盾 + 省 token |
| P1 | B3 | Blueprint 分层生成：先场景骨架 → 再填充 Element → 最后加动画 | 可靠性大幅提升 |
| P2 | C1 | 深度信息采集：directory scanner + code reader + dependency analyzer | 内容质量飞跃 |
| P2 | A2 | 叙事弧线：在 Script prompt 中加入结构化叙事模板 | 视频吸引力提升 |
| P2 | B2 | QA 不截断：用分段评估或摘要策略替代粗暴截断 | QA 有效性恢复 |
| P3 | C2+C3 | 事实核查：对比 RichProjectContext 与 Script 中的技术声明 | 准确性保障 |
| P3 | D1+D2 | 视觉分层设计 + 模板选择机制 | 美学质量提升 |
| P3 | A5 | 观众模型：在 StoryBrief 中定义 target audience | 叙事精准度 |

---

## 七、Skill 抽象的技术实现路径

### 阶段 1: 修复致命问题（P0）
1. **音画同步**: PostProcess 改为先 TTS → 获取实际时长 → 生成 Timeline/SRT → 渲染/混音
2. **素材采集**: 新增 GitHub API tool + asset downloader

### 阶段 2: 架构重构（P1）
1. **消除双重 Script**: Analyzer 只输出 `RichProjectContext`（不含 script），Composer 接收完整上下文写 script
2. **QA feedback loop**: `QAUseCase` 将 reasoning 传给下游重试节点
3. **Blueprint 分层**: 先 `SceneOutline`（场景骨架），再 `SceneDetail`（逐场景填充），最后 `BlueprintAssembly`

### 阶段 3: Skill 化（P2-P3）
1. 定义标准 `Skill` 接口（input_contract, output_contract, tools, quality_gates）
2. 每个阶段实现为独立 Skill
3. Skill 注册表 + 配置化 prompt
4. LangGraph 节点从硬编码 usecase → 动态 Skill 调度

---

## 八、总结

当前 pipeline 的**骨架设计合理**（Clean Architecture + LangGraph + HITL + QA 循环），但**每个节点的实现深度不够**，存在以下系统性问题：

1. **信息贫瘠**: 只看 README 5000 字符，没有代码/目录/依赖分析
2. **一步到位幻觉**: 试图用一次 LLM 调用完成复杂的分层创作任务
3. **音画脱钩**: 音频时长是估计的，帧位置是基于估计值的，两者都不准确
4. **反馈断裂**: QA 发现问题但无法把发现传回生成器
5. **素材缺失**: 整个管线没有采集一张真实项目图片

Skill 抽象是正确的方向——它将每个阶段显式化为 input/output contract + tools + quality gates 的组合，使得每个环节可以独立优化、替换 prompt、添加 tools，而不影响上下游。
