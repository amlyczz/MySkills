# 实体与 DTO 架构解耦与分文件保存方案

> 将领域实体按业务域进行物理文件拆分（一文件一实体），并将 API DTO、适配器（Adapter）中间 DTO 从核心接口与控制器中完全剥离解耦。
> 
> 同时，参考 `skill-creator` 规范，将 GitHub Trending 技能按**标准 Skill 目录结构**（`SKILL.md` + `scripts/`）组织，并移植归档入 `src` 对应的业务域模块（`domain/github_trending/github_trending_skill/`）中进行统一管理。采集器升级为**高效异步协程**直接调用，打分模型升级为 **Gemini 2.5 Flash**。

---

## 1. 现状与整洁架构映射分析

将原本在 `.claude/skills/github-trending/` 下的资产，按照标准的 Skill 目录规范移植入 `backend/src/` 对应的业务子域模块中进行管理：

* **标准 Skill 存放位置**：`backend/src/domain/github_trending/github_trending_skill/`
  - **`SKILL.md`**：保持标准结构与 YAML frontmatter（name: `github-trending`），规定打分标准。
  - **`scripts/fetch_trending.py`**：保持标准脚本路径，负责客观数据抓取。由于改用 Python 下划线包命名（`github_trending_skill`），避免了中划线无法被 Python 语法直接 `import` 的硬伤，从而支持在用例层被**异步协程**直接导入执行。
* **工作流用例节点 (`GithubTrendingUseCase`)**：
  - 依然位于 `backend/src/application/usecases/github_trending.py` 中。
  - **协程调用**：`from ...domain.github_trending.github_trending_skill.scripts.fetch_trending import fetch_trending_repos`
  - **提示词读取**：直接读取 `backend/src/domain/github_trending/github_trending_skill/SKILL.md`。

---

## 2. 设计与重构方案

### 2.1 业务域实体文件拆分 (Domain Entity Splitting)
我们在各个业务域（`domain/*`）中，将原有的 `entities.py` 拆分为职责单一、一文件一主体的实体文件，并创建 `__init__.py` 导出这些实体。同时，保留 `entities.py` 作为一个**向后兼容的导出中转站**，只做 forward-import 重新导出，以确保在不破坏现有数万行代码 import 的前提下，渐进式完成架构演进。

#### 1) `domain/github_trending`
- `subjective_evaluation.py`: 存放 `SubjectiveEvaluation` 与 `TrendingResponse`。
- `scored_repo.py`: 存放 `ScoredRepo`。
- `__init__.py`: 暴露所有实体。
- `entities.py`: 兼容式重新导出所有实体。

#### 2) `domain/task`
- `pipeline_status.py`: 存放 `PipelineStatus` (Enum)。
- `qa_scorecard.py`: 存放 `QAScorecard`。
- `pipeline_task.py`: 存放 `PipelineTask`。
- `__init__.py` & `entities.py`.

#### 3) `domain/analyzer`
- `source_metadata.py`: `SourceMeta`, `GitHubSourceMeta`, `PodcastSourceMeta`, `ProductSourceMeta`, `AnySourceMeta`
- `normalized_content.py`: `NormalizedContent`
- `script.py`: `ScriptSegment`, `Script`
- `covers.py`: `CoverVariant`, `Covers`
- `publish_copy.py`: `PublishTitle`, `PublishCopy`
- `source_code_insight.py`: `SourceCodeInsight`
- `meta.py`: `Meta`
- `content_model.py`: `ContentModel`
- `material.py`: `RepoRef`, `MaterialSource`, `CaptureInfo`, `MaterialMetadata`, `Material`, `MaterialManifest`
- `domain_analysis.py`: `AudienceProfile`, `NarrativeAngle`, `InformationHierarchy`, `DomainAnalysis`
- `project_category.py`: `ProjectCategory`
- `__init__.py` & `entities.py`.

#### 4) `domain/composer`
- `visual_plan.py`: 存放 `VisualPlan`。
- `__init__.py` & `entities.py`.

#### 5) `domain/blueprint`
- `enums.py`: 各种字面量/枚举定义。
- `motion.py`: `SpringParams`, `BezierEasing`, `SpringEasing`, `LinearEasing`, `MotionTokenEasing`, `MotionToken`
- `loop_animation.py`: `LoopConfig`
- `animation.py`: `AnimationTimeline`, `StaggerConfig`, `AnimationConfig`
- `element_layout.py`: `ElementLayout`
- `element_config.py`: `ElementConfig`
- `voiceover.py`: `VoiceoverConfig`
- `subtitles.py`: `SubtitleToken`, `SubtitleConfig`
- `sfx.py`: `SfxTrigger`
- `scene_background.py`: `SceneBackground`
- `transition.py`: `TransitionToNext`
- `scene_config.py`: `SceneConfig`
- `global_settings.py`: `SafeArea`, `TypographyConfig`, `ShapeConfig`, `ThemeConfig`, `AudioDucking`, `GlobalAudioConfig`, `GlobalSettings`
- `variables.py`: `ContentVariable`, `ThemeVariable`, `BlueprintVariables`
- `blueprint_meta.py`: `BlueprintMeta`
- `blueprint.py`: `Blueprint`
- `__init__.py` & `entities.py`.

#### 6) `domain/post_producer`
- `audio.py`: `VoiceoverSplit`, `VoiceoverSegment`, `SfxEntry`, `AudioConfig`
- `layout.py`: `LayoutConfig`
- `style.py`: `StyleConfig`
- `code_template.py`: `CodeTemplate`
- `timeline_config.py`: `GlobalTimelineConfig`, `ChapterMarker`, `SubtitleEntry`
- `timeline_segment.py`: `TimelineSegment`
- `timeline_model.py`: `TimelineModel`
- `mix_audio_request.py`: `MixAudioRequest`
- `__init__.py` & `entities.py`.

---

### 2.2 API DTO 完全剥离 (Presentation DTO Decoupling)
在表示层（`presentation`）建立专用的 `dtos` 目录，将内联在控制器中的 HTTP DTO 彻底分离：

- **新建文件** `presentation/dtos/task_dtos.py`
  - 移入 `TaskSubmitRequest` 与 `TaskResumeRequest`
- **更新控制器** `presentation/api/task_controller.py`
  - 从 `..dtos.task_dtos` 导入 DTO，使控制器只关注路由分发和用例编排。

---

### 2.3 适配器 DTO 完全剥离 (Adapter DTO Decoupling)
在基础设施层（`infrastructure`）中，属于特定第三方集成或大模型适配器的中间 Schema/DTO，应移入对应适配器子目录的 `schemas.py` 中，严禁定义在适配器的主业务流程文件中。

1. **`infrastructure/blueprint/schemas.py`**
   - 移入 `SceneFillRequest` 与 `QAResultSchema`
2. **`infrastructure/composer/schemas.py`**
   - 移入 `QAResultSchema`

---

### 2.4 GitHub Trending 技能移植、协程化与模型 Flash 化 (Coroutine & Gemini Flash)

1. **标准 Skill 规范组织与移植**：
   - 在 `backend/src/domain/github_trending/github_trending_skill/` 下建立标准结构：
     - `SKILL.md` ( frontmatter 名称 `github-trending`)
     - `scripts/fetch_trending.py`
     - `scripts/__init__.py`（使其成为合法的 Python 包，方便跨层导入）
2. **子进程改协程 (Subprocess to Coroutine)**：
   - 保持脚本的 CLI 独立调用兼容性（`if __name__ == "__main__": asyncio.run(main())` 依然保留）。
   - 用例节点 `GithubTrendingUseCase` 通过 `from ...domain.github_trending.github_trending_skill.scripts.fetch_trending import fetch_trending_repos` 直接导入并执行 `await fetch_trending_repos(limit=20)`，在异步回调中零开销运行。
3. **打分标准与模型升级**：
   - 动态加载同级目录下的 `github_trending_skill/SKILL.md` 提示词。
   - 评估打分模型彻底切换为 **Gemini 2.5 Flash (`gemini-2.5-flash`)**，极速并提供精准的 Pydantic 结构化输出。

---

## 3. 验收标准
- [ ] 所有业务域的实体分别保存在独立的实体文件中。
- [ ] 各个业务域的 `entities.py` 和 `__init__.py` 正确暴露所有内部实体，原有的 `entities.py` 导入链路保持 100% 兼容。
- [ ] 表示层的 `task_controller.py` 不再含有内联 Pydantic 请求 DTO，而是从 `presentation/dtos` 中导入。
- [ ] 基础设施层适配器文件中不再含有内联 DTO，而是从对应的 `schemas.py` 中导入。
- [ ] `github_trending_skill` 标准技能包已完整移植归入 `domain/github_trending/` 中，物理布局符合 `SKILL.md` + `scripts/` 规范。
- [ ] `GithubTrendingUseCase` 中彻底移除子进程启动代码，改为直接以异步协程方式 `import` 调用。
- [ ] 打分模型成功替换为 **Gemini 2.5 Flash**，并且可以正常读取 `github_trending_skill/SKILL.md` 的提示词完成评估打分并输出结构化 Pydantic 数据。
- [ ] 运行后端单元测试或启动服务器时，不出现任何模块循环导入或字段解析错误。
