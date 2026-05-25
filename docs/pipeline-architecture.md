# MySkills 视频管线架构文档

> 完整业务流、数据流与系统架构说?> 最后更? 2026-05-22

---

## 目录

1. [系统概述](#1-系统概述)
2. [整体架构](#2-整体架构)
3. [Pipeline 业务流](#3-pipeline-业务?
4. [层间数据契约](#4-层间数据契约)
5. [Remotion 渲染引擎](#5-remotion-渲染引擎)
6. [布局系统](#6-布局系统)
7. [动画系统](#7-动画系统)
8. [过渡系统](#8-过渡系统)
9. [音频系统](#9-音频系统)
10. [样式系统](#10-样式系统)
11. [文件索引](#11-文件索引)

---

## 1. 系统概述

MySkills 是一?*从输入到最终视?*的全自动视频生成管线。支持多种输入（GitHub 仓库 URL、已有素材、纯文案），输出结构化的项目演示视频（`final.mp4`）?
### 核心设计原则

- **Processor 架构**：每个功能单元是一?Processor，输入契?+ 处理逻辑 + 输出契约，不关心上下?- **Pipeline DAG 编排**：管线由 `pipelines/*.json` 定义 DAG 连接关系，Orchestrator 拓扑排序后顺序执?- **AI 决策 + 机械执行**：创作类任务?AI agent 主导，确定性任务由脚本自动完成
- **无降?*：每阶段必须成功，失败即报错退出，不静默跳?- **契约驱动**：所有跨层数据使?`contracts/pipeline_contracts/` Pydantic/Zod 类型约束
- **断点续跑**：checkpoint 机制，重跑时跳过已完成的 Processor
- **全走代理**：所有网络命令先 `source proxy.sh`

### 适用场景

- GitHub 项目推广视频
- 技术产品演示视?- 开源项目介?- 性能/功能发布视频

---

## 2. 整体架构

```
┌──────────────────────────────────────────────────────────────────?? pipelines/*.json ?Pipeline 定义文件                            ?? github-promo / manual-production / podcast-clip                ?? 处理?DAG: RepoAnalyzer→ScriptTimelineComposer                 ??            →MediaGenerator→VideoRenderer→PostProducer          ?└──────────────────────────────────────────────────────────────────?                               ?                               ?┌──────────────────────────────────────────────────────────────────??               Pipeline Orchestrator                             ?? 读定??拓扑排序 ?按序执行 Processor + 断点续跑               ?└──────────────────────────────────────────────────────────────────?                               ?                               ?┌──────────────────────────────────────────────────────────────────?? ┌────────────────────?   ┌──────────────────────?             ?? ?RepoAnalyzer       ?   ?ScriptTimeline       ?             ?? ?content-ingester/     │───→│ Composer             ?             ?? ?GitHub URL ?      ?   ?timeline-composer/   ?             ?? ?ContentModel +     ?   ?Content+Material ?  ?             ?? ?material_discovery ?   ?TimelineModel        ?             ?? ?+ materials/       ?   ?+ VideoConfig        ?             ?? └────────────────────?   └──────────┬───────────?             ??                                      ?                         ??                                      ?                         ??                             ┌──────────────────?               ??                             ?MediaGenerator    │───?          ??                             ??voiceover+bgm   ?  ?          ??                             └──────────────────?  ?          ??                             ┌──────────────────?  ?          ??                             ?VideoRenderer     │───?          ??                             ??video.mp4       ?  ?          ??                             └──────────────────?  ?          ??                             ┌──────────────────?  ?          ??                             ?PostProducer      │←──?          ??                             ??final.mp4 ?   ?              ??                             └──────────────────?              ?└──────────────────────────────────────────────────────────────────?
┌──────────────────────────────────────────────────────────────────?? 数据契约? contracts/pipeline_contracts/ (Pydantic + Zod)      ?? 多语言共享枚举: contracts/enums/*.json                          ?└──────────────────────────────────────────────────────────────────?```

### 3 ?Pipeline

| Pipeline | 适用场景 | Processor 序列 |
|----------|---------|---------------|
| `github-promo` | GitHub 仓库 ?视频 | RepoAnalyzer ?ScriptTimelineComposer ?MediaGenerator ?VideoRenderer ?PostProducer |
| `manual-production` | 已有素材 ?视频 | ScriptTimelineComposer ?MediaGenerator ?VideoRenderer ?PostProducer |
| `podcast-clip` | 纯文??音频 | ScriptTimelineComposer ?MediaGenerator ?PostProducer |

### Processor 一?
| Processor | 输入 | 输出 |
|-----------|------|------|
| **RepoAnalyzer** | GitHub URL ?`content-ingester/` | ContentModel + material_discovery.json + materials/ |
| **ScriptTimelineComposer** | ContentModel + material_discovery.json ?`timeline-composer/` | TimelineModel + VideoConfig + .srt |
| **MediaGenerator** | Script ?`media_generation/` | voiceover.mp3 + bgm.mp3 |
| **VideoRenderer** | VideoConfig + Timeline ?`video-pipeline/video-renderer/remotion/` | video.mp4 |
| **PostProducer** | video.mp4 + audio + timeline ?`video-pipeline/post-producer/` | final.mp4 |

---

## 3. Pipeline 业务?
### Processor: RepoAnalyzer（分?+ 素材发现 + 内容创作 ?AI 决策?
**角色**：AI agent 主导，一个上下文完成全部分析 + 创作

**输入**：GitHub 仓库 URL

**处理流程**?
1. **基础数据采集**：通过 `gh api` 获取仓库元数据（stars, forks, topics, license, README?2. **源码扫描**：扫描仓库，?4 维评分选取?15 个最有价值的源码文件
3. **4 维深度分?*?   - 技术栈与架构设?   - 核心业务逻辑与数据流
   - 代码质量与工程化规范
   - 性能、安全与扩展?4. **README 素材发现与评?*：从 README 中识别架构图/benchmark/demo GIF/截图/代码段等，按 4 维度评分
5. **高价值素材下?*：评?>= 3 的素材自动下载到本地 materials/ 目录
6. **内容创作**：生成口播脚本（8-20 segments）、封面提示词、发布文案、源码洞?
**输出文件**?- `content-ingester/content/YYYY-MM-DD/HHmm-{repo_name}-content.json`（含 script/covers/publish_copy?- `material_discovery.json` ?素材发现与评估清单（?TimelineComposer 消费?- `materials/` ?下载的高价值素?
**质量铁律**?- 口播 8-20 segments，总时?60-360 ?- 4 ?秒估?duration_est
- 封面提示词中英文各一份，具体到视觉元?- 去重记录写入 `content-ingester/content/YYYY-repos.md`（通过 `DedupDB().load().add(full_name).save()` 维护?
---

### Processor: ScriptTimelineComposer（时间线编排 ?机械执行?
**角色**：`timeline_composer.py`（~720 行编排引擎）

**输入**：`content.json` + `material_discovery.json` + 总时?
基于 RepoAnalyzer 已产出的口播脚本初稿 + 素材评估清单，做编排式微调：

**8 步编排流水线**?
| 步骤 | 方法 | 功能 |
|------|------|------|
| 1 | `_split_voiceover()` | 按标点把口播拆分?utterances |
| 2 | `_extract_keywords()` | 从每?utterance 提取关键词（英文术语 + 功能 + 领域标签?|
| 3 | `_match_materials()` | 关键?素材评分匹配（代?图片/视频/截图各有权重?|
| 4 | `_merge_into_segments()` | 合并同一素材的连?utterances ?TimelineSegment |
| 5 | `_assign_seg_types()` | 按位置和素材类型分配场景类型 |
| 6 | `_build_layout_and_audio()` | ?seg type 分配 layout + motion + 音频 |
| 7 | `_divide_chapters()` | ?segment boundaries 创建章节标记 |
| 8 | `_generate_subtitles()` | ?voiceover 文本生成 15 ?段字幕条?|

**场景类型 ?布局映射**（数据源：`contracts/enums/layouts.json` ?`scene_type_default_layout` ?matching.ts 中消费）?
```
hook             ?hero-center
problem          ?hero-center
solution         ?split-left-text
features         ?card-grid
showcase         ?media-full
code_showcase    ?code-display
source_highlight ?code-display
stats_showcase   ?stat-highlight
proof            ?stat-highlight
social_proof     ?quote-style
comparison       ?stat-highlight
cta              ?hero-center
manual           ?media-full
origin           ?full-screen-text
milestones       ?card-grid
today            ?full-screen-text
demo             ?media-full
```

**输出文件**?- `timeline.json` ?完整时间线（segments + chapters + subtitles?- `timeline.srt` ?字幕文件
- `timeline.bgm_curve.json` ?预计?BGM 音量曲线（消?bgmCurve.ts / audio_mixer.py 重复逻辑?- `video_config.json` ?Remotion 渲染的直接输入，包含预计算的 `audio.bgm.volumeCurve`

---

### Processor: MediaGenerator（音频生??机械执行?
**角色**：`media_generator` CLI

**输入**：content.json + 总时?
```
python -m media_generator voiceover --from-content content.json --output voiceover.mp3
python -m media_generator bgm --duration $TOTAL_DURATION --output bgm.mp3
```

**输出文件**?- `voiceover.mp3` ?口播录音
- `bgm.mp3` ?背景音乐

**底层 Provider**：MiniMax（通过 mmx CLI），支持?provider 降级?
---

### Processor: VideoRenderer（Remotion 渲染 ?机械执行?
**角色**：Remotion + React 组件?
**输入**：`video_config.json`

```bash
source pipeline-orchestrator/scripts/proxy.sh
cd video-pipeline/video-renderer/remotion

npx remotion render VideoComposer "$OUTPUT_DIR/video.mp4" \
  --props="$OUTPUT_DIR/video_config.json" --codec h264 --crf 18

cd "$OLDPWD"
```

**输出文件**：`video.mp4`（h264, CRF 18, 1080p@30fps?
详见?5 ?[Remotion 渲染引擎](#5-remotion-渲染引擎)?
---

### Processor: PostProducer（后期合??机械执行?
**角色**：`video-pipeline/post-producer` 脚本

**输入文件**?- `video.mp4`（VideoRenderer?- `voiceover.mp3` + `bgm.mp3`（MediaGenerator?- `timeline.json` + `.srt` + `.bgm_curve.json`（ScriptTimelineComposer?
**处理流程**?
1. **verify_output.py**：检查所有必需文件是否存在
2. **audio_mixer.py**：音频混音管?   - Voiceover: loudnorm 标准化到 -16 LUFS
   - BGM: 优先使用预计算的 `bgm_volume_curve.json`（`--bgm-curve`），消除?bgmCurve.ts 的重复实现；回退?segment 级音量包?   - **Sidechain ducking**: voiceover 激活时 BGM 自动闪避
   - **SFX 放置**: ?timeline 时间点放置音?   - **Mux**: video + mixed audio ?最终输?
**输出文件**?*`final.mp4`** ?
---

## 4. 层间数据契约

所有跨层数据模型统一?`contracts/pipeline_contracts/` 包中定义（Pydantic BaseModel），TypeScript 侧使?Zod schema 保持一致性。多语言共享枚举放在 `contracts/enums/*.json`?
| 枚举文件 | 用?|
|---------|------|
| `layouts.json` | 15 个布局 ID + 26 ?scene_type→layout 默认映射 |
| `motions.json` | 18 个动?ID + 元素角色→动效默认映?|
| `transitions.json` | 5 个过渡类?|
| `styles.json` | 12 个样式主?ID |
| `structures.json` | 5 个结构模?ID |
| `materials.json` | 15 个素材类?+ 9 个来?+ 5 个采集方?|
| `sfx.json` | 11 个动效→音效文件映射 |

### ?Processor 数据契约

| Processor | 输入 | 输出 | 模型 |
|-----------|------|------|------|
| RepoAnalyzer | GitHub repo URL | `content.json` + `material_discovery.json` + `materials/` | `ContentModel` + `MaterialManifest` (Pydantic) |
| ScriptTimelineComposer | ContentModel + material_discovery.json | `timeline.json` + `.srt` + `video_config.json` + `.bgm_curve.json` | `TimelineModel` + Zod `VideoConfig` |
| VideoRenderer | `video_config.json` | `video.mp4` | Zod `videoConfigSchema` |
| PostProducer | video.mp4 + audio + timeline | `final.mp4` | `TimelineModel` + `MixAudioRequest` |
| MediaGenerator | 文本/提示?| 媒体文件 | ?capability 模型 |

### ContentModel（RepoAnalyzer 输出 ?Python Pydantic?
```python
class ContentModel(BaseModel):
    repo:        RepoInfo     # full_name, url, language, stars, forks, topics, license
    content:     ContentInfo   # title, tagline, points[3-5], summary, chartData, domains
    script:      Script        # full_text, segments[{text, duration_est}], total_duration_est
    covers:      Covers        # 3x4 + 16x9, 中英文各一?    publish_copy:PublishCopy   # titles[{full, short}], body[100-200字], tags[6-8]
    source_code_insight: ...   # 可选：4 维源码分析结?    meta:        Meta          # generated_at, source
```

### MaterialManifest（RepoAnalyzer 附带输出 ?Python Pydantic?
RepoAnalyzer 在素材发现阶段产?`material_discovery.json`（含评分），同时?materials/ 目录下产?`material_manifest.json`（含已下载素材列表）供下游消费?
```python
class MaterialManifest(BaseModel):
    version:    str = "2"
    repo:       RepoRef | None
    created_at: str | None
    materials:  list[Material]    # Material: id, type, path, duration?, dimensions?
```

### TimelineSegment（ScriptTimelineComposer 内部模型 ?Python Pydantic?
```python
class TimelineSegment(BaseModel):
    id:               str     # "seg_001"
    type:             str     # hook/problem/solution/features/showcase/...
    label:            str     # 中文标签
    time_start:       float   # 起始时间（秒?    time_end:         float   # 结束时间（秒?    duration:         float   # 时长（秒?    voiceover:        dict    # text, duration_est, splits[]
    primary_material: str | None
    material_refs:    str[]   # 素材 ID 列表
    layout:           dict    # {layout_id, motion_map}
    audio:            dict    # bgm_volume, sfx[]
    transition_in:    str     # crossfade/slide-in/whip-pan/none
    transition_out:   str
```

### VideoConfig（VideoRenderer 输入 ?TypeScript Zod 约束?
```typescript
interface VideoConfig {
  generated_by?: { phase, layer, timestamp, version };
  structureId: "funnel" | "timeline" | "product-showcase" | "performance-launch";
  styleId: string;
  bgType: "starfield" | "bokeh" | "geometric" | "pixel" | "fluid-gradient" | "none";
  sceneConfigs: Record<string, SceneConfig>;
  audio: { sfxEnabled, voiceover[], voiceoverEnabled, bgm? };
}

interface SceneConfig {
  layoutId: LayoutType;      // 15 种枚?  motionMap: Record<string, MotionType>;  // 18 种枚?  content: Record<string, string | string[]>;
  durationSeconds?: number;  // 1-300
  chartData?: BarChartItem[];
  cameraAction?: { type: "pan-and-zoom", ... };
  wrapperType?: "glow" | "device-frame";
  transitionIn?: { type: TransitionType, direction?, durationFrames };
  transitionOut?: { type: TransitionType, direction?, durationFrames };
}
```

### 全局参数计算

```
total_seconds = max(60, min(300, ceil(total_duration_est * 1.2 + 30)))
```

最?60 秒，最?300 秒。公?= 口播时长 × 1.2 ?+ 30 秒余量?
### 输出目录结构

```
$OUTPUT_DIR/                          # content-ingester/content/YYYY-MM-DD/HHmm-{repo_name}
  -content.json                       # RepoAnalyzer 产出（含全部字段?  material_discovery.json             # RepoAnalyzer 素材发现与评估清?  materials/                          # RepoAnalyzer 下载的素材文?  material_manifest.json              # RepoAnalyzer 素材 manifest（已下载素材列表?  timeline.json                       # ScriptTimelineComposer 产出
  timeline.srt                        # ScriptTimelineComposer 产出字幕
  timeline.bgm_curve.json             # ScriptTimelineComposer 产出 BGM 曲线
  video_config.json                   # ScriptTimelineComposer 产出（覆?RepoAnalyzer 初始值）
  voiceover.mp3                       # MediaGenerator 产出
  bgm.mp3                             # MediaGenerator 产出
  video.mp4                           # VideoRenderer 产出
  final.mp4                           # PostProducer 产出 ?  .pipeline_checkpoints.json          # 断点续跑状?```

---

## 5. Remotion 渲染引擎

> 路径: `video-pipeline/video-renderer/remotion/src/`

### 5.1 渲染?
```
<RemotionRoot>
  <Composition id="VideoComposer">
    <VideoComposer config={videoConfig}>
      <AbsoluteFill>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={N}>
            <SceneBase>
              <AbsoluteFill>
                {/* Layer 0: 可选视频背?*/}
                {/* Layer 1: BackgroundLayer 动态背?*/}
                {/* Layer 2: 半透明遮罩 overlay */}
                {/* Layer 3: LayoutDispatcher ?具体布局组件 */}
              </AbsoluteFill>
            </SceneBase>
          </TransitionSeries.Sequence>

          <TransitionSeries.Transition presentation={fade/slide/whipPan} />

          <TransitionSeries.Sequence durationInFrames={N}>
            <SceneBase>...</SceneBase>
          </TransitionSeries.Sequence>

          ... 更多场景
        </TransitionSeries>

        {/* 始终可见?overlay */}
        <ChapterProgressBar />
        <BgmWithCurve />        {/* BGM 音量曲线 */}
        <Audio />               {/* 逐场?voiceover */}
      </AbsoluteFill>
    </VideoComposer>
  </Composition>
</RemotionRoot>
```

### 5.2 场景注册?
VideoComposer 接收 `timeline-adaptive` 结构时，?`sceneConfigs` 动态派生场景列表。每个场景的 `type` 字段告诉注册表使用哪?Scene 组件?
注册表位?`scenes/index.tsx`，包?7 个场景组件：

| 场景组件 | 默认布局 | 默认动效 | 用?|
|---------|---------|---------|------|
| `HookScene` | hero-center | title: bounce-in | 开篇钩?|
| `ProblemScene` | hero-center | defaultMotionMap | 问题描述 |
| `SolutionScene` | split-left-text | defaultMotionMap | 方案展示 |
| `FeatureScene` | hero-center | defaultMotionMap | 功能亮点 |
| `ShowcaseScene` | media-full | title: none | 素材展示 |
| `CtaScene` | hero-center | underline=true, bullet=false | 行动呼吁 |
| `ProofScene` | stat-highlight | stats: scale-fade | 数据证明 |

### 5.3 SceneBase 架构

每个场景 = 4 层叠加：

1. **Layer 0 ?视频背景**（可选）：`style.backgroundVideoUrl`，循环播放，覆盖程序化背?2. **Layer 1 ?动态背?*：`BackgroundLayer` 组件? 种类?3. **Layer 2 ?半透明遮罩**：渐?overlay?0 帧内淡入
4. **Layer 3 ?内容布局**：`LayoutDispatcher` 根据 `layoutId` 派发

### 5.4 VideoComposer 数据?
```
VideoConfig JSON
  ?  ├─ Zod 运行时验?(validateVideoConfig)
  ?  ├─ 查找结构模板 (getStructure)
  ?  ├─ 查找样式模板 (styleTemplates.find)
  ?  ├─ 构建 SceneRenderData[]
  ?  ├─ timeline-adaptive: ?sceneConfigs 键派?  ?  └─ 其他结构: ?structure.scenes 构建
  ?  ├─ 计算过渡 presentations (buildTransitionPresentation)
  ?  ├─ 计算调整后帧位置 (扣除过渡重叠)
  ?  ├─ 构建 TransitionSeries 子节?  ?  └─ 渲染 (Remotion 逐帧输出)
```

---

## 6. 布局系统

15 种布局，通过 `layouts/index.tsx` ?`LayoutDispatcher` 派发?
| 布局 ID | 组件 | 视觉说明 | 适用场景 |
|---------|------|---------|---------|
| `hero-center` | HeroCenter | 居中单列，标题→下划线→副标题→要点 | hook, problem, cta |
| `split-left-text` | SplitLeftText | ?1/3 文案 + ?2/3 素材/图表 | solution, feature |
| `split-right-text` | SplitLeftText `direction="right"` | ?1/3 文案 + ?2/3 素材 | solution（镜像） |
| `full-screen-text` | FullScreenText | 全屏极简文字，居?| hook |
| `card-grid` | CardGrid | 3 列毛玻璃卡片网格 | feature |
| `quote-style` | QuoteStyle | 大引?+ 引用文字 | proof |
| `stat-highlight` | StatHighlight | 大数?+ 说明文字 | proof |
| `media-full` | MediaFull | 全屏视频/图片展示 | showcase |
| `code-display` | CodeDisplay | macOS 终端风格代码窗口 | code showcase |
| `center-focus-video` | CenterFocusVideo | 视频 + 标题覆盖 + 摄像机运?| showcase |
| `kinetic-typography` | KineticText | 打字/高亮/删除/替换状态机 | hook |
| `floating-grid` | FloatingGrid | 卡片从随机角度飞入网?| feature |
| `fly-through` | ZAxisFlyThrough | CSS 3D Z 轴穿?| showcase |
| `prompt-input` | PromptInput | AI 对话输入模拟 | showcase |
| `sandwich-text` | SandwichText | 3 层深度夹心（背景→文字→浮动卡片?| showcase |

### LayoutProps 接口

所有布局接收统一 Props?
```typescript
interface LayoutProps {
  title?: string;
  subtitle?: string;
  body?: string;
  points?: string[];
  mediaUrl?: string;
  stats?: string;
  code?: string;
  language?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  codeAnimation?: "type" | "fade" | "scroll";
  style: StyleTokens;
  theme: StyleTemplate;
  motionMap: Record<string, MotionType>;
  showUnderline?: boolean;
  showBullet?: boolean;
  chartData?: BarChartItem[];
  cameraAction?: CameraAction;
  wrapperType?: "glow" | "device-frame";
}
```

### LayoutType ?SceneType 映射（timeline-adaptive?
VideoComposer 中的 `layoutTypeToSceneType()`?
```
hero-center, kinetic-typography, full-screen-text ?hook
split-left-text, split-right-text                 ?solution
card-grid, floating-grid                          ?feature
stat-highlight                                    ?proof
其余（media-full, code-display, 所?showcase 类） ?showcase
```

---

## 7. 动画系统

### 7.1 动画分层

```
L1 动效?├── Entrance (入场) ?10 ??  ├── spring-slide-up     弹簧上滑
?  ├── spring-slide-left   弹簧左滑
?  ├── arc-entrance        弧线入场
?  ├── scale-fade          缩放淡入
?  ├── typewriter          打字机效??  ├── reveal-mask         遮罩揭示
?  ├── bounce-in           弹跳入场
?  ├── blur-focus          模糊对焦
?  ├── spring-elastic      弹性进??  ├── smooth-scale-up     平滑放大
?  └── staggered-grow      交错增长
?├── Idle (驻留) ?2 ??  ├── subtle-float        微浮??  └── glow-pulse          辉光脉冲
?└── Exit (退? ?4 ?    ├── fade-out             淡出
    ├── slide-out-left       左滑?    ├── scale-down-out       缩小淡出
    └── blur-out             模糊淡出
```

### 7.2 动画 Hook

| Hook | 阶段 | 用?|
|------|------|------|
| `useEntrance` | 仅入?| 大多数布局的元素入场。轻量，API 简?|
| `useLifecycle` | 入场+驻留+退?| 需?idle/outro 的长驻元素。三阶段状态机 |
| `useBezierAnim` | 入场 | CSS cubic-bezier 曲线动画 |
| `useAudioEnergy` | 始终 | FFT 音频能量提取（用?AudioReactive wrapper?|

**Hero 专用 Hooks**（HeroCenter 布局独有）：

| Hook | 效果 |
|------|------|
| `useHeroTitle` | 标题入场 + 预期微移位（-5px X, 3px Y, 6帧） |
| `useHeroUnderline` | 下划线从中心向外生长 |
| `useHeroTagline` | 副标题缩放淡?|
| `useHeroPoints` | 要点列表 staggered 入场，按索引 12 度角度展 |

### 7.3 动效预设

`motions.ts` 定义 `defaultMotionMap`（元素角??默认动效）：

```
title       ?arc-entrance
subtitle    ?scale-fade
tagline     ?scale-fade
headline    ?scale-fade
points      ?spring-slide-up
body        ?spring-slide-up
url         ?spring-slide-up
summary     ?spring-slide-up
stats       ?scale-fade
underline   ?none
```

### 7.4 Timing 常量?0fps?
| 常量 | 帧范?| 说明 |
|------|--------|------|
| `OVERLAY_FADE` | [0, 20] | 背景遮罩淡入 |
| `TITLE_INTRO` | [20, 75] | 标题入场 |
| `UNDERLINE_GROW` | [60, 110] | 下划线生?|
| `TAGLINE_INTRO` | [80, 130] | 副标题入?|
| `POINTS_START` | 110 | 第一个要?|
| `POINTS_STAGGER` | 18 | 要点间隔帧数 |
| `STATS_INTRO` | [60, 110] | 数据入场 |

---

## 8. 过渡系统

### 8.1 架构

使用 `@remotion/transitions` ?`<TransitionSeries>` 管理场景间过渡。取代了旧的手动 `<Sequence>` overlap?
### 8.2 过渡类型

| 类型 | 默认方向 | Remotion 实现 | 视觉效果 |
|------|---------|--------------|---------|
| `none` | - | 零时?transition | 硬切 |
| `crossfade` | - | `fade({ shouldFadeOutExitingScene: true })` | 淡入淡出 |
| `slide-in` | left | `slide({ direction: from-left })` | 从方向滑?|
| `slide-out` | left | `slide({ direction: from-right })` 反向 | 旧场景滑出，新场景反向滑?|
| `whip-pan` | left | 自定?`whipPanPresentation` | 方向模糊转场 |

### 8.3 帧计?
- 每个场景有原?`durationFrames`
- 过渡重叠的帧数从总时长中扣除（`adjustedFrame -= trans.durationFrames`?- Voiceover 和时间使用调整后的帧位置
- `ChapterProgressBar` 也使用调整后的时?
### 8.4 WhipPan 实现

自定?transition presentation（`whipPanPresentation.tsx`）：

- 速度在中间点达到峰值（正弦曲线?- 进入场景从外部滑入（方向反侧?- 退出场景向外部滑出（方向同侧）
- 最大速度时应?12px 模糊

---

## 9. 音频系统

### 9.1 三层音频架构

| ?| 类型 | 生成方式 | 渲染方式 |
|---|------|---------|---------|
| BGM | 背景音乐 | MediaGenerator | `Audio` + volume curve |
| Voiceover | 口播 | MediaGenerator | 逐场?`Audio` ?|
| SFX | 音效 | sfxLibrary 模板匹配 | `SfxPlayer` 组件触发 |

### 9.2 SFX 绑定

11 个动效类型关联音效，?`motions.ts` 模块加载时自动绑定：

```
arc-entrance       ?whoosh-soft.mp3   (0.6)
spring-slide-up    ?swoosh-up.mp3     (0.4)
spring-slide-left  ?swoosh-up.mp3     (0.4)
scale-fade         ?pop-soft.mp3      (0.4)
bounce-in          ?bounce.mp3        (0.5)
typewriter         ?type-keystroke.mp3 (0.3)
reveal-mask        ?swoosh-reveal.mp3  (0.5)
spring-elastic     ?bounce.mp3        (0.5)
smooth-scale-up    ?pop-soft.mp3      (0.4)
staggered-grow     ?swoosh-up.mp3     (0.4)
blur-focus         ?whoosh-soft.mp3   (0.6)
```

### 9.3 BGM 音量曲线

BGM 音量曲线?**ScriptTimelineComposer** 阶段预计算，写入 `video_config.json` ?`audio.bgm.volumeCurve` 和独立文?`bgm_volume_curve.json`。消?bgmCurve.ts / audio_mixer.py 之间重复实现?
规则（继?bgmCurve.ts 语义）：

- **hook 场景**：从 0 淡入?0.5（如?voiceover ?0.15），1.5 ?- **?voiceover 场景**：闪避到 0.15
- **?voiceover 场景**：保持在 0.5
- **cta 场景**：最?1.5 秒从 0.3 淡出?0

消费方：
- **VideoComposer.tsx**：优先使?`config.audio.bgm?.volumeCurve`，回退到运行时 `generateBgmCurve()`
- **audio_mixer.py**：`--bgm-curve` 参数读取预计算曲线，`_curve_to_ffmpeg_expr()` 转换?ffmpeg 表达?
### 9.4 Voiceover 对齐

`alignVoiceoverToScene()` 按标点分割脚本，分配到内容槽位：

- ?1 ??title/headline（帧 20/30 = 0.67s?- ?2 ??subtitle/tagline（帧 80/30 = 2.67s?- ?3 ? ?points（帧 110 + N*18 = ~3.67s?- 最后一??summary（cta 场景，帧 120/30 = 4s?
---

## 10. 样式系统

### 10.1 12 个样式模?
| ID | Family | 配色 | 背景 | 适合 |
|----|--------|------|------|------|
| `dark-purple` | tech | 深紫 | geometric | 通用技?|
| `light-teal` | business | 浅青 | bokeh | 商业产品 |
| `warm-orange` | playful | 暖橙 | pixel | 创意工具 |
| `dark-red` | business | 深红 | starfield | 性能发布 |
| `glassmorphism` | creative | 毛玻?| bokeh | 现代 UI |
| `minimal-bw` | minimal | 黑白 | geometric | 极简 |
| `nature-green` | business | 自然?| starfield | 环保/数据 |
| `tech-grid` | tech | 深色网格 | geometric | 技术深?|
| `warm-yellow` | playful | 暖黄 | pixel | 工具?|
| `sakura-pink` | creative | 樱花?| bokeh | 社区/创意 |
| `neon-blue` | tech | 霓虹?| pixel | 硬核技?|
| `matte-metal` | minimal | 金属?| starfield | 工业/基础设施 |

### 10.2 60-30-10 配色法则

- **60%**：`colors.background` ?主背景色
- **30%**：`colors.surface` ?辅面色（卡片、面板）
- **10%**：`colors.accent` ?强调色（按钮、图表、下划线?
### 10.3 Typography

- 主字体：Inter?00-800 weight?- 中文字体：Noto Sans SC
- Serif：Playfair Display（dark-red 主题?- Monospace：JetBrains Mono（code-display、tech-grid?
---

## 11. 文件索引

### 数据契约?
| 路径 | 用?|
|------|------|
| `contracts/pipeline_contracts/__init__.py` | 包入口，导出所有模?|
| `contracts/pipeline_contracts/content.py` | ContentModel, RepoInfo, ContentInfo |
| `contracts/pipeline_contracts/material.py` | MaterialManifest, Material |
| `contracts/pipeline_contracts/timeline.py` | TimelineModel, TimelineSegment |
| `contracts/pipeline_contracts/audio.py` | VoiceoverSegment, AudioConfig |
| `contracts/pipeline_contracts/video_config.py` | VideoConfig (Python ? |
| `contracts/pipeline_contracts/enums.py` | JSON 枚举加载?|
| `contracts/pipeline_contracts/utils.py` | ffprobe 工具函数 |
| `contracts/pipeline_contracts/pipeline.py` | PipelineDef, ProcessorDef |
| `contracts/enums/layouts.json` | 布局 ID + 映射 |
| `contracts/enums/motions.json` | 动效 ID + 映射 |
| `contracts/enums/transitions.json` | 过渡类型 |
| `contracts/enums/styles.json` | 样式主题 |
| `contracts/enums/structures.json` | 结构模板 |
| `contracts/enums/materials.json` | 素材类型 |
| `contracts/enums/sfx.json` | 动效→音效映?|

### Pipeline 定义

| 路径 | 用?|
|------|------|
| `pipelines/github-promo.json` | 标准 GitHub 推广管线 DAG（→ ScriptTimelineComposer?|
| `pipelines/manual-production.json` | 手动素材输入管线 |
| `pipelines/podcast-clip.json` | 纯文案音频管?|

### Processor 声明

| 路径 | 用?|
|------|------|
| `content-ingester/processor.json` | RepoAnalyzer 声明 |
| `timeline-composer/processor.json` | ScriptTimelineComposer 声明 |
| `video-pipeline/video-renderer/processor.json` | VideoRenderer 声明 |
| `video-pipeline/post-producer/processor.json` | PostProducer 声明 |
| `media_generator/processor.json` | MediaGenerator 声明 |

### Pipeline ?
| 路径 | 用?|
|------|------|
| `content-ingester/skill.md` | RepoAnalyzer AI 操作指南（含素材发现 + 下载 + 脚本创作?|
| `content-ingester/schema/models.py` | import 重定向到 pipeline_contracts |
| `content-ingester/schema/dedup.py` | DedupDB 去重管理 |
| `content-ingester/scripts/recorder.mjs` | Playwright 录制（素材发现补充） |
| `content-ingester/scripts/allocate.py` | 素材验证编排 |
| `content-ingester/scripts/manifest_validator.py` | Manifest 校验 |
| `github-trending/skill.md` | 内容源入?|
| `timeline-composer/skill.md` | ScriptTimelineComposer 操作指南 |
| `timeline-composer/scripts/timeline_composer.py` | 编排引擎（~720 行） |
| `video-pipeline/video-renderer/skill.md` | VideoRenderer 操作指南 |
| `video-pipeline/post-producer/skill.md` | PostProducer 操作指南 |
| `video-pipeline/post-producer/schema/models.py` | import 重定向到 pipeline_contracts |
| `video-pipeline/post-producer/scripts/audio_mixer.py` | 音频混音（支?--bgm-curve?|
| `video-pipeline/post-producer/scripts/verify_output.py` | 输出验证 |
| `pipeline-orchestrator/skill.md` | 编排层操作指?|
| `pipeline-orchestrator/scripts/proxy.sh` | 统一网络代理 |
| `pipeline-orchestrator/scripts/proxy.json` | 代理配置（mac/WSL?|
| `media_generator/__main__.py` | 媒体生成 CLI |

### Remotion 核心

| 路径 | 用?|
|------|------|
| `video-pipeline/video-renderer/remotion/src/index.ts` | 入口 |
| `video-pipeline/video-renderer/remotion/src/Root.tsx` | Composition 注册 |
| `video-pipeline/video-renderer/remotion/src/VideoComposer.tsx` | 主渲染器 |
| `video-pipeline/video-renderer/remotion/src/types.ts` | 所有类型定?|
| `video-pipeline/video-renderer/remotion/src/structures.ts` | 5 个结构模?|
| `video-pipeline/video-renderer/remotion/src/styles.ts` | 12 个样式模?|
| `video-pipeline/video-renderer/remotion/src/motions.ts` | 动效预设 + SFX 绑定 |
| `video-pipeline/video-renderer/remotion/src/animations.ts` | 动画 timing 常量 |
| `video-pipeline/video-renderer/remotion/src/layout.ts` | 排版常量 |
| `video-pipeline/video-renderer/remotion/src/tokens.ts` | 样式 token 解析 |
| `video-pipeline/video-renderer/remotion/src/fonts.ts` | Google Fonts 加载 |
| `video-pipeline/video-renderer/remotion/src/matching.ts` | 匹配引擎（数据源: src/enums/layouts.json?|
| `video-pipeline/video-renderer/remotion/src/enums/layouts.json` | ?contracts/enums/ 同步的布局枚举 |
| `video-pipeline/video-renderer/remotion/scripts/sync-enums.sh` | 枚举同步脚本 |
| `video-pipeline/video-renderer/remotion/src/schemas/VideoConfig.schema.ts` | Zod schema |
| `video-pipeline/video-renderer/remotion/src/schemas/validate.ts` | 运行时验?|

### Remotion 场景

| 路径 | 用?|
|------|------|
| `scenes/index.tsx` | 场景注册?|
| `scenes/SceneBase.tsx` | 场景通用外壳 |

### Remotion 布局

| 路径 | 用?|
|------|------|
| `layouts/index.tsx` | 布局调度?|
| `layouts/HeroCenter.tsx` | 居中单列 |
| `layouts/SplitLeftText.tsx` | 文案+素材分栏 |
| `layouts/MediaFull.tsx` | 全屏媒体 |
| `layouts/FullScreenText.tsx` | 全屏文字 |
| `layouts/StatHighlight.tsx` | 数据高亮 |
| `layouts/CardGrid.tsx` | 卡片网格 |
| `layouts/QuoteStyle.tsx` | 引用?|
| `layouts/CodeDisplay.tsx` | 代码展示 |
| `layouts/CenterFocusVideo.tsx` | 视频+运镜 |
| `layouts/KineticText.tsx` | 动态排?|
| `layouts/FloatingGrid.tsx` | 飞行卡片 |
| `layouts/ZAxisFlyThrough.tsx` | Z 轴穿?|
| `layouts/PromptInput.tsx` | AI 对话模拟 |
| `layouts/SandwichText.tsx` | 景深夹心 |

### Remotion 背景

| 路径 | 用?|
|------|------|
| `backgrounds/index.tsx` | 背景调度?|
| `backgrounds/Starfield.tsx` | 星场 |
| `backgrounds/BokehCircles.tsx` | 散景光斑 |
| `backgrounds/FluidGradient.tsx` | 流动渐变 |
| `backgrounds/GeometricPatterns.tsx` | 几何图形 |
| `backgrounds/PixelTransition.tsx` | 像素过渡 |

### Remotion Wrappers

| 路径 | 用?|
|------|------|
| `wrappers/GlowContainer.tsx` | 4 色渐变动画边界辉?|
| `wrappers/DeviceFrame.tsx` | 3D 设备外壳（MacBook/iPhone?|
| `wrappers/AudioReactive.tsx` | 音频响应式视觉效?|
| `wrappers/GenerativeReveal.tsx` | AI 生成模拟揭示 |
| `wrappers/LayoutAnimationWrapper.tsx` | 布局级入场动画包裹器 |
| `wrappers/TransitionWrapper.tsx` | 场景入场过渡（被 @remotion/transitions 替代?|
| `wrappers/whipPanPresentation.tsx` | WhipPan transition presentation |

### Remotion Hooks

| 路径 | 用?|
|------|------|
| `hooks/useEntrance.ts` | 入场动效（通用?|
| `hooks/useLifecycle.ts` | 三阶段生命周?|
| `hooks/useBezierAnim.ts` | Bezier 曲线动画 |
| `hooks/useAudioEnergy.ts` | 音频能量提取 |
| `hooks/useHeroTitle.ts` | Hero 标题（预期微移位?|
| `hooks/useHeroUnderline.ts` | Hero 下划线生?|
| `hooks/useHeroTagline.ts` | Hero 副标?|
| `hooks/useHeroPoints.ts` | Hero 要点列表 |

### Remotion 组件

| 路径 | 用?|
|------|------|
| `components/SfxPlayer.tsx` | SFX 音频触发 |
| `components/VirtualCamera.tsx` | Ken Burns 运镜 |
| `components/AnimatedBarChart.tsx` | 弹簧动画柱状?|
| `components/ChapterProgressBar.tsx` | 章节进度?|
| `components/WhipPanTransition.tsx` | WhipPan 组件（独立版?|

### Remotion 音频

| 路径 | 用?|
|------|------|
| `audio/sfxLibrary.ts` | 11 ?SFX 条目 |
| `audio/bgmLibrary.ts` | 5 ?BGM 条目 |
| `audio/bgmCurve.ts` | BGM 音量曲线生成 |
| `audio/voiceoverAlign.ts` | Voiceover 对齐 |
| `audio/types.ts` | 音频内部类型 |

---

## 附录 A: 去重系统

`content-ingester/schema/dedup.py` ?`DedupDB` 类管理跨会话去重?
**数据文件**：`content-ingester/content/YYYY-repos.md`

每行存储 `- owner/repo`?
**两个写入入口**?
1. `github-trending` ?推荐前用 `is_duplicate()` 过滤
2. `content-ingester` ?生成后调?`add(full_name).save()` 追加

---

## 附录 B: checkpoint 机制

?Processor 状态保存在 `$OUTPUT_DIR/.pipeline_checkpoints.json`?
```json
{
  "RepoAnalyzer": true,
  "ScriptTimelineComposer": false,
  "MediaGenerator": false,
  "VideoRenderer": false,
  "PostProducer": false
}
```

?Processor 完成后更新。重跑时检查并跳过已完成步骤?
---

## 附录 C: 质量铁律

- **无降?*：所有阶段必须成功，`|| exit 1` 替代 `|| log_warn`
- **最高质?*：Remotion CRF 18, 1080p@30fps
- **Schema 校验**：每阶段输出后立即校验，失败即报?- **全走代理**：所有网络命令先 `source proxy.sh`
- **TDD 流程**：spec 确认后，按测试驱动开发实?
