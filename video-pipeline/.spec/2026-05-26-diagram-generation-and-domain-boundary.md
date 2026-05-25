# 图表生成管线 + Analyzer/Composer 边界厘清

## 问题陈述

### 1. 图表没有渲染路径

`ScriptSegment.assigned_asset` 支持填 Mermaid 代码，但整条管线没有任何环节将 Mermaid 渲染成可视资产：
- Remotion 引擎没有 Mermaid 组件
- Blueprint Composer (llm_composer.py) 只是把 assigned_asset 原文传给 LLM prompt
- 最终视频里不会出现任何流程图/架构图

用户需求：**尽可能多地用流程图、架构图等可视化手段辅助讲解，让概念有几何直观**。

### 2. RepoAnalyzer 和 ScriptComposer 职责重叠

当前两个阶段的边界模糊：

**RepoAnalyzer 做的事**：
- 抓取素材（GitHub API + Playwright）
- Deep Read → ContentModel（百科全书：architecture_breakdown, domain_specific_insights）
- DomainAnalysis（受众画像、叙事角度、信息层级）

**ScriptComposer 做的事**：
- 接收 ContentModel + DomainAnalysis
- 生成口播脚本（text + duration_est + assigned_asset + visual_hook）

**重叠点**：
1. Analyzer 的 deep_read prompt 让 LLM 做了"架构分析"和"领域洞察"（产出纯文本描述）
2. Composer 的 system prompt 又让 LLM 做"Deep Dive 推演"、"架构全景"、"代码走读"
3. Composer 重新分析了 Analyzer 已经分析过的东西，浪费 context 且可能偏离 Analyzer 的结论
4. `VisualPlanner` 接口存在但从未被调用——本来它是 Composer 和 Blueprint 之间的桥梁，但被跳过了

**结果**：Composer 用 LLM 又分析了一遍项目，而不是忠实地把 Analyzer 的结构化知识翻译成口播语言。

### 3. 架构图/流程图应该谁画？

当前没有明确定义。Analyzer 发现了架构，Composer 写了口播，但"画图"这件事没有归属。

## 设计方案

### 一、职责边界重新划分

```
┌─────────────────────────────────────────────────────────────────┐
│  RepoAnalyzer（知识提取层）                                      │
│  职责：理解项目，产出结构化知识                                    │
│  产出：ContentModel（百科全书）+ DomainAnalysis（叙事策略）          │
│  约束：只做分析和提取，不关心"怎么讲"                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ ContentModel + DomainAnalysis
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ScriptComposer（叙事翻译层）                                     │
│  职责：把结构化知识翻译成口播语言 + 视觉指令                         │
│  产出：Script（segments: text + duration + assigned_asset + hook）│
│  约束：不重新分析项目，只翻译 Analyzer 的产出                        │
│       在 assigned_asset 中声明"需要什么图"                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Script
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  DiagramGenerator（图表生成层）← NEW                              │
│  职责：读取 Script 中 assigned_asset 的 Mermaid/描述                │
│       渲染成 SVG/PNG 短片资产                                     │
│  产出：更新后的 MaterialManifest（新增 diagram 类型素材）             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Script + enriched materials
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  BlueprintComposer（视觉编排层）                                   │
│  职责：Script + 素材 → Remotion Blueprint                         │
│  产出：Blueprint（场景/元素/动画/过渡）                             │
│  变化：assigned_asset 中的图表资产已经是可用文件，不再需要解释          │
└─────────────────────────────────────────────────────────────────┘
```

### 二、DiagramGenerator 实现

**位置**：`backend/src/infrastructure/media_generator/diagram_generator.py`

**输入**：`Script`（遍历每个 segment 的 `assigned_asset`）

**处理逻辑**：
```python
class DiagramGenerator:
    async def generate(self, script: Script, output_dir: str) -> list[str]:
        """
        遍历 script.segments:
        1. 检测 assigned_asset 是否包含 Mermaid 代码（以 graph/sequenceDiagram/stateDiagram 等开头）
        2. Mermaid 代码 → 调用 mermaid-cli (mmdc) 或 kroki API → SVG
        3. SVG → (可选) PNG via sharp/svgo
        4. 保存到 output_dir/diagrams/seg_{i:03d}_{type}.svg
        5. 替换 assigned_asset 为文件路径
        """
```

**Mermaid 渲染方案**（按优先级）：
1. **Kroki API**（自托管或公共实例）：POST Mermaid text → SVG，零依赖
2. **mmdc (mermaid-cli)**：`npx @mermaid-js/mermaid-cli`，Node.js 本地渲染
3. **LLM 辅助**：如果 assigned_asset 是自然语言描述（如"画一个数据流架构图"），先调 LLM 生成 Mermaid 代码，再渲染

**图表类型引导**：在 Composer prompt 中明确指导 LLM 用 Mermaid 语法画以下类型的图：
- `graph TD` / `graph LR` — 模块依赖、数据流
- `sequenceDiagram` — 请求生命周期
- `stateDiagram-v2` — 状态机
- `flowchart` — 算法流程
- `classDiagram` — 类结构关系

### 三、ScriptComposer prompt 调整

**核心变化**：Composer 不再"重新分析"，而是"翻译 + 标注视觉需求"。

system prompt 的职责改为：
1. 读取 ContentModel 中的结构化知识（architecture_breakdown, domain_specific_insights, source_code_insight）
2. 将这些知识按叙事弧线翻译成口播语言
3. 在 assigned_asset 中标注需要的图表类型（Mermaid 代码）或已有素材路径
4. 在 visual_hook 中给出图表的动画指示（如"逐步展示流程图节点"）

**删掉的指令**：
- 删除"深挖源码亮点"类的分析指令
- 删除"架构全景"类的分析指令
- 保留"逻辑推演"的叙事要求，但推演的是 Analyzer 已经给出的结论

### 四、Graph 节点变化

```
现有：
  compose_script → generate_blueprint

改为：
  compose_script → generate_diagrams → generate_blueprint
```

`generate_diagrams` 是一个新节点，位于 compose_script 之后、generate_blueprint 之前。

## 验收标准

- [ ] Composer prompt 不再包含"分析架构"、"深挖源码"指令，改为"翻译 Analyzer 产出"
- [ ] ScriptSegment.assigned_asset 中的 Mermaid 代码在管线中被渲染为 SVG
- [ ] 新增 DiagramGenerator 基础设施类
- [ ] Graph 新增 generate_diagrams 节点（compose_script 和 generate_blueprint 之间）
- [ ] BlueprintComposer 收到的 assigned_asset 都是可用的文件路径
- [ ] RepoAnalyzer 和 ScriptComposer 的 prompt 各自职责清晰，无重叠分析
