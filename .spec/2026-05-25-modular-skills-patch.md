# AI 视频智能生成管线 — 深度逻辑与提示词补强设计 (Spec)

## 1. 背景与改进目标
根据对各 Processor 原生组件、样式规范（`skill.md`）和底层 Remotion 渲染规范的审计，现有管线在 Prompt 完备度、AI 场景编排和声学渲染质感上存在若干遗漏项。

本设计旨在通过**整洁架构（Clean Architecture）**的松耦合设计，在不污染主业务逻辑的前期下，通过替换/富化具体适配器和注入协议，完成全链路 S 级视觉与听觉调优。

---

## 2. 补强设计与变更路径

### 2.1 仓库分析域补强：源码深度扫描与 AI 模型架构可视化 (Analyzer Domain)
- **适配器文件**：[llm_analyzer.py](file:///x:/home/zand/proj/MySkills/langgraph-orchestrator/backend/src/infrastructure/analyzer/llm_analyzer.py)
- **Prompt 富化策略**：
  在 `ANALYZE_REPO_SYSTEM_PROMPT` 中注入强制性的 4-Phase 扫描规则。约束大模型产出关键目录结构、框架依赖，并填充入 `source_code_insight` 领域对象中。
  同时增加 ML/AI 模型的特殊检测：当检测到项目有 AI/LLM 属性时，强制提示 LLM 勾勒直观的网络架构模块（如 Transformer Block, hidden_size 等），并创作架构可视化图。

### 2.2 视觉蓝图域补强：AI 场景编排导演取代硬编码循环 (Blueprint Domain)
- **接口变更**：在 `src/domain/blueprint/interfaces.py` 新增 `BlueprintComposer` 协议：
  ```python
  from abc import ABC, abstractmethod
  from .entities import Blueprint
  from ..composer.entities import VideoScript
  from ..analyzer.entities import RepoAnalysis

  class BlueprintComposer(ABC):
      @abstractmethod
      async def compose_blueprint(self, script: VideoScript, analysis: RepoAnalysis) -> Blueprint:
          """AI Agent 主导的 13 维视觉编排决策"""
          pass
  ```
- **具体实现**：创建 `src/infrastructure/blueprint/llm_composer.py`，实现 `LLMBlueprintComposer`。
  - **Prompt 注入**：将 13 维编排引擎、Flex 自动防撞机制（`layout.position = "flex-child"`）、安全退场（`outFrame = scene.duration - 15`）、Stagger 错位展示（`delayPerChild: 15`）和物理弹簧（`spring`、`snappy`）等硬核规则深度转化为 System Prompts，由 LLM 强制以 `Blueprint` 结构输出。
- **UseCase 变更**：更新 [blueprint.py](file:///x:/home/zand/proj/MySkills/langgraph-orchestrator/backend/src/application/usecases/blueprint.py)，通过构造函数注入 `BlueprintComposer`。

### 2.3 剧本创作域补强：整句标点分词字幕 (Composer Domain)
- **适配器文件**：[llm_composer.py](file:///x:/home/zand/proj/MySkills/langgraph-orchestrator/backend/src/infrastructure/composer/llm_composer.py)
- **约束规则**：
  在剧本提示词中追加：在切分 `scene.subtitles.tokens` 时，**必须严格按标点符号进行整句/短句切分**，坚决禁止逐词或逐字切分，防止 Remotion 渲染时文字溢出或频闪重叠。

### 2.4 后期音视域补强：主播声线调优 (PostProducer Domain)
- **适配器文件**：[media_generator.py](file:///x:/home/zand/proj/MySkills/langgraph-orchestrator/backend/src/infrastructure/post_producer/media_generator.py)
- **调用更新**：
  在 `MediaGenerator.generate_voiceover` 适配器的 subprocess CLI 参数组装中，除了传统的 voice_id 外，强制追加 `--pitch 3` 参数。

---

## 3. 验收标准
1. `src/main.py` 静态编译正常，且所有 DDD 依赖装配链条无循环导入。
2. 导出的 `blueprint.json` 包含符合 Flex 布局规范的 `"flex-child"` 标识与精确的 `outFrame` 退场生命周期帧标记。
3. 单元测试 `tests/unit/test_usecases.py` 覆盖更新后的 `GenerateBlueprintUseCase` 并 100% 绿灯。
