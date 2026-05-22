# RepoAnalyzer 职责重定义 — 素材发现 + 脚本初稿 + 源码分析

## 问题陈述

当前 repo-analyzer 的职责边界模糊：

1. **与架构设计矛盾**：pipeline-orchestrator 声明 RepoAnalyzer 输出"不含 script/covers/publish_copy"，但 repo-analyzer/skill.md 要求 agent 完整生成这些字段
2. **素材分析缺失**：README 中的架构图、benchmark 图表、demo GIF、安装代码段等关键素材，没有被系统性地发现和评估
3. **TimelineComposer 重复劳动**：编排阶段需要重新理解项目才能写脚本，浪费 token，且脚本技术精度不如分析阶段直接产出

## 设计方案

### 1. RepoAnalyzer 职责

| 模块 | 内容 | 产出 |
|------|------|------|
| 基础数据采集 | gh api 元信息 + README | RepoInfo |
| 源码扫描 | Top-15 文件选取 + 4 维分析 | source_code_insight |
| 内容提炼 | points/tagline/summary/stats/target_users/domains | ContentInfo |
| **素材发现与评估** | 从 README/DOM 中发现图片、视频、代码段，分类评分 | 素材评估清单 |
| **素材下载** | 将高价值素材下载到本地 materials/ 目录 | 本地素材文件 |
| **口播脚本初稿** | 基于源码理解 + 素材可用性，创作完整口播脚本 | Script |
| 封面提示词 | 根据项目定位生成封面 prompt | Covers |
| 发布文案 | 多平台发布文案 | PublishCopy |

#### 1a. 素材发现与评估（新增）

从 README 和项目页面中系统性地识别素材：

```
素材类型分类:
├── architecture_diagram     架构图（通常是 README 开头的大图）
├── benchmark_chart          Benchmark 对比图表
├── demo_gif                 Demo 演示 GIF
├── demo_video               Demo 演示视频
├── screenshot               截图
├── code_block_install       安装命令（npm install / pip install / go get 等）
├── code_block_quickstart    Quick Start 示例代码
├── code_block_api           API 使用示例
├── code_block_config        配置文件示例
└── logo                     项目 Logo

评分维度（每项 1-5）:
├── 相关性     — 是否直接展示项目核心功能
├── 视觉质量   — 清晰度、构图、是否包含关键信息
├── 视频友好度 — 作为视频素材的直接可用性（GIF > 图片 > 代码块）
└── 唯一性     — 是否是不可替代的展示素材
```

**产出**：素材评估清单（`material_discovery.json`），包含每个发现素材的 URL、类型、评分、建议用途。

#### 1b. 高价值素材下载

- 评分 >= 3 的素材自动下载到 `$OUTPUT_DIR/materials/`
- 图片格式保持原样，GIF/视频记录原始 URL 供后续引用
- 代码段以文本形式保存（`materials/code_install.sh`、`materials/code_quickstart.py` 等）

#### 1c. 口播脚本初稿

由 RepoAnalyzer 直接产出，因为此时对项目理解最深：
- 8-12 个 segments，总时长 60-180 秒
- 叙事结构：开场钩子 → 技术深潜 → 架构亮点 → Benchmark/对比 → Demo 展示 → 总结收尾
- 每条 segment 标注推荐视觉素材类型（引用 material_discovery 中的素材 ID）
- `duration_est` 按 4 字/秒估算

### 2. TimelineComposer 职责调整

不再需要从头创作脚本，而是做编排式微调：

| Step | 变更 |
|------|------|
| 口播分句 | 基于已存在的 script segments 做微调（合并/拆分） |
| 素材匹配 | 以 RepoAnalyzer 的素材评估为起点，追加 MaterialCurator 采集的素材 |
| 脚本微调 | 根据实际可用素材微调口播措辞（如"这张图展示…"→"这段演示中…"） |
| 时间线编排 | 不变 |
| 过渡/动效/BGM | 不变 |

### 3. ContentModel 调整

`Script`/`Covers`/`PublishCopy` 在 RepoAnalyzer 阶段就已填充（不再是 TimelineComposer 独占）。

TimelineComposer 可以覆盖这些字段（但通常只微调 script，因为 covers/publish_copy 不需要动）。

### 4. 产出文件清单

```
$OUTPUT_DIR/
├── -content.json            ← ContentModel（含 script/covers/publish_copy）
├── material_discovery.json  ← 素材发现与评估清单（新增）
└── materials/               ← 下载的高价值素材（新增）
    ├── architecture.png
    ├── benchmark.png
    ├── demo.gif
    ├── code_install.sh
    └── code_quickstart.py
```

### 5. 与 MaterialCurator 的关系

```
RepoAnalyzer                        MaterialCurator
     │                                    │
     │— material_discovery.json           │
     │  (发现什么值得采、在哪里、为什么)     │
     │                                    │— 读 discovery →
     │                                    │  优先采集高评分素材
     │                                    │— Playwright 录屏
     │                                    │— 截图补充
     │                                    │— 产出 material_manifest.json
```

MaterialCurator 不再盲目采集，而是以 RepoAnalyzer 的素材评估为优先级指引。

## 不涉及变更

- `TimelineModel` schema 不变
- `VideoConfig` schema 不变
- 后三层（MediaGenerator/VideoRenderer/PostProducer）不变
- Pipeline DAG 定义不变（只是每层的内部职责变化）

## 验收标准

1. RepoAnalyzer 能从 README 中识别并评分至少 3 类素材（图片/GIF/代码段）
2. 高评分素材自动下载到本地 materials/ 目录
3. 口播脚本包含素材引用标注（segments[i].suggested_media）
4. material_discovery.json 可直接被 MaterialCurator 消费作为采集优先级
5. TimelineComposer 无需重新分析项目即可完成编排
6. 全流程 pipeline 打通：RepoAnalyzer → MaterialCurator → TimelineComposer → ... → final.mp4
