# 代码简洁性重构 — 全项目审计 & 实施计划

> 基于逐文件审计：58 源文件、~12,000 行代码
> 日期：2026-05-21

---

## 一、项目健康评分

| 目录 | 评分 | 主要问题 |
|------|------|---------|
| `timeline-composer/` | A- | 最干净，少量命名问题 |
| `media_generation/` | B- | 文件碎片化，prompt 模板重复 |
| `post-producer/scripts/` | B | verify_output 单函数过长 |
| `video-renderer/remotion/src/` | B+ | 架构合理，标准 Remotion 习惯 |
| `video-renderer/remotion/src/layouts/` | C | `getMotion` 复制 5 次 |
| `material-collector/scripts/` | C+ | 大函数，JS/Python 双重 ffmpeg 模式 |
| `video-renderer/remotion/src/scenes/` | **D+** | 7 个薄膜包装组件——最大问题 |
| `video-renderer/remotion/src/components/` | C- | ChapterProgressBar 5 合 1 文件 |

---

## 二、P0 — 必须修复（8 项）

### 2.1 scenes/index.tsx — 7 个薄膜组件 → 配置字典（D+ → B+）

**问题**：`HookScene`、`ProblemScene`、`SolutionScene`、`FeatureScene`、`ShowcaseScene`、`CtaScene`、`ProofScene` — 每个 7-15 行，仅用不同默认值包装 `<SceneBase>`。新增场景需 4 个步骤（组件+默认值+注册+类型）。

**修复**：删除 7 个组件，用一个 `createScene(type, overrides)` + 配置字典替代。

### 2.2 layouts/*.tsx — `getMotion()` 复制 5 次

**问题**：`HeroCenter`、`SplitLeftText`、`StatHighlight`、`CardGrid`、`QuoteStyle` 各定义相同的辅助函数。

**修复**：从 `motions.ts` 导出 `getMotion`，删除 5 个副本。

### 2.3 layouts/index.tsx — switch 语句 → 注册表

**问题**：16 个 `case` 的 switch，每次新增布局需编辑此文件。

**修复**：使用 `Record<LayoutType, React.FC>` 注册表对象，与 `sceneRegistry` 和 `backgrounds/index.tsx` 模式一致。

### 2.4 ChapterProgressBar.tsx — 5 合 1 文件

**问题**：`MinimalDots`、`LabeledBar`、`GradientFill`、`SegmentBlocks`、`TimelineTicks` 全在一个文件。

**修复**：拆分为 5 个独立文件 `components/progress/`，主文件只保留调度器。

### 2.5 recorder.mjs — `recordAndExtract` 183 行

**问题**：单函数覆盖导航、滚动、截图、资源收集、文件转换、ffmpeg 裁剪。

**修复**：拆分为 `navigateAndCollect()`、`processRecording()`、`finalizeOutput()`。

### 2.6 media_generation/capabilities/ — 5 个文件各 1 个模型

**问题**：`text.py`(24行)、`image.py`(32行)、`speech.py`(35行)、`music.py`(35行)、`video.py`(32行)。

**修复**：合并为 `requests.py` + `results.py`，`__init__.py` 保持相同的导出接口。

### 2.7 minimax.py / deepseek.py — 相同的 prompt 模板

**问题**：两个 Provider 的 `generate_specialized_text` 定义完全相同的 `prompts` 字典（classical_poem/lyrics/couplet/other）。

**修复**：提取到 `capabilities/text_prompts.py`，两方 import。

### 2.8 Python 子进程处理 — 3 种不同模式

**问题**：`subprocess.run`（同步）vs `asyncio.create_subprocess_exec`（异步）在 6 个文件中以不同参数模式使用。

**修复**：创建 `shared/utils/process.py` — `run_async()` + `run_sync()` 统一错误处理+超时。

---

## 三、P1 — 应该修复（6 项）

### 3.1 verify_output.py — 198 行验证函数

提取 `run_check(name, fn, is_error)` 辅助函数，检查列表注册替代顺序块。

### 3.2 audio_mixer.py — ffmpeg 表达式字符串生成

`_gen_bgm_volume_curve` 深度嵌套的 `if(lt(...))` 字符串构建 → FilterGraph 构建器类。

### 3.3 recorder.mjs — 双重 DOM 遍历模式

`collectCodeSnippets` 和 `captureScreenshots` 共享相同的 `createTreeWalker` + `prevHeading` 追踪逻辑 → 提取 `traverseReadme(page, handler)`。

### 3.4 三层 manifest schema 统一

`recorder.mjs`（v2）、`timeline_composer.py`（v2 materials[]）、`allocate.py`（v1 entries[]）定义三种不同 material 格式。

修复：统一 v2 格式为唯一来源，`allocate.py` 的 v1 支持作为兼容层保留。

### 3.5 media_generator.py — `_load_config` 静态方法

`_load_config` 标记为 `@staticmethod` 但访问实例状态。改为模块级函数。

### 3.6 HeroCenter.tsx — 277 行

提取 4 个动画部分到自定义 hooks：`useTitleAnimation`、`useTaglineAnimation`、`useUnderlineAnimation`、`usePointsAnimation`。

---

## 四、P2 — 可以考虑（4 项）

### 4.1 layouts/index.tsx — 未映射的 fallthrough 案例

`split-right-text` 和 `full-screen-text` 落到默认渲染 `<HeroCenter>`。移除或实现。

### 4.2 Root.tsx — 旧的 Composition 注册

旧的 `Intro`/`Outro`/`KenBurnsClip` Comp 在 VideoComposer 稳定后可移除。

### 4.3 audio_mixer.py — 未使用的 `import tempfile`

删除。

### 4.4 layouts/CardGrid.tsx — 冗余类型转换

`style.blendMode as React.CSSProperties['mixBlendMode']` — 用正确的 `StyleTokens` 类型替代。

---

## 五、各层影响分析

| Layer | 改什么 | 风险 |
|-------|--------|------|
| **scenes/** | 删除 7 个组件，替换为配置字典 | 中 — 需更新 VideoComposer 引用 |
| **layouts/** | `getMotion` 提取 + 注册表替代 switch | 低 — 纯重构 |
| **components/** | ChapterProgressBar 拆分 | 低 — 导出不变 |
| **recorder.mjs** | 函数拆分 | 中 — 大型 JS 文件 |
| **capabilities/** | 合并文件 | 低 — `__init__.py` 接口不变 |
| **minimax/deepseek** | 提取共享 prompt | 低 — 纯提取 |
| **shared/utils/** | 新增子进程工具模块 | 低 — 新增文件 |

---

## 六、实施路线

```
Phase 1: scenes/ (配置字典) + layouts/ (getMotion + 注册表)
Phase 2: ChapterProgressBar 拆分 + capabilities/ 合并
Phase 3: recorder.mjs 拆分 + prompt 模板 提取
Phase 4: 子进程统一 + verify_output 重构
Phase 5: P2 清理
```

**关键原则**：每个 Phase 独立验证，Python 侧 `python3 -c "import ..."` 通过，TS 侧不引入新类型错误。所有重构保持接口不变——现有 Pipeline 端到端流程不能断。
