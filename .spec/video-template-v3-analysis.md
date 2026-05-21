# Video Template v3 — 对标分析 & 优化方案

> 基于 Cohere Command A+ 发布视频逆向拆解的分析
> 日期：2026-05-21
> 实施状态：P0 ✅ + P1 ✅ + P2 ✅ — 全部完成

---

## 一、现有系统 vs 标杆视频对照表

| 维度 | 现有 v2 | 标杆视频 (Cohere) | 差距 |
|------|---------|-------------------|------|
| **结构模板** | 3 种 (funnel/timeline/product-showcase) | 宣告→证明→特性→愿景 4 段式 | 缺"数据证明驱动"结构 |
| **背景系统** | 4 种程序化 (starfield/bokeh/geometric/pixel) | 流体渐变 + 光学射线 + 镭射光斑 | 缺流体渐变、光射线、视频背景 |
| **数据可视化** | StatHighlight（纯文字） | 弹性生长柱状图 + 对比数据 | **完全缺失** |
| **动效物理** | damping:20 stiffness:80（保守） | damping:12 stiffness:100（明显回弹） | 弹簧参数偏保守 |
| **场景转场** | fade/dissolve/slide | 背景流体流动 + 前景缩放 | 缺流体过渡 |
| **帧率** | 30fps | 60fps | 丝滑度差距 |
| **布局** | 7 种（含 SplitLeftText） | HeroCenter + SplitLeftRight（左文右图表） | SplitLeftRight 缺 chart slot |
| **内容模型** | text + image + video | text + image + video + **chartData** | content.json 缺 chartData |

---

## 二、可吸收的优化点（6 项）

### 2.1 新结构模板：`performance-launch`（宣告-证明-特性-愿景）

```
hook(logo亮相) → proof(数据证明 ×2-3组) → features(特性卡片) → cta(品牌落版)
```

与其他结构的区别：
- **funnel**: 问题驱动（hook→problem→solution→showcase→features→cta）
- **performance-launch**: 数据驱动（hook→proof→proof→features→cta），无 problem/solution，用数据图表替代

### 2.2 AnimatedBarChart 组件

新布局 `StatHighlight` 的增强版，当前是纯文字，需要支持：
- 柱状图弹性生长（spring physics, damping:12 stiffness:100）
- 对比显示（previousValue 灰色底 + currentValue 渐变色弹性条）
- 每个柱子 15 帧 stagger 延迟
- 毛玻璃底色（backdrop-blur + border）

### 2.3 流体渐变背景（`fluid-gradient` 类型）

新增第 5 种背景类型：
- 3-4 个高饱和光斑（红/黄/蓝/紫）以不同速度流动混合
- 实现方式：CSS radial-gradient + keyframe animation 或 canvas 渲染
- 增加饱和度和对比度（filter: saturate(1.5)）

### 2.4 弹簧动效参数调优

当前弹簧偏"稳重"，新增一套"弹性"参数预设用于发布会风格：
```ts
// 现有 (保守)
{ damping: 20, stiffness: 80, mass: 0.8 }  // 几乎无回弹

// 新增 (弹性) — 对标 Cohere
{ damping: 12, stiffness: 100, mass: 0.8 }  // 明显回弹，更活泼
```

新增动效：`SmoothScaleUp`（logo 入场 0.85→1.0）、`StaggeredGrow`（柱状图逐条生长）

### 2.5 content.json 扩展：chartData

```json
{
  "content": {
    "title": "Up to 48% sharper on agentic tasks",
    "chartData": [
      { "label": "τ²-Bench Telecom", "value": 85, "previousValue": 37 },
      { "label": "AIME 25", "value": 90, "previousValue": 57 }
    ]
  }
}
```

### 2.6 视频背景支持

`StyleTemplate` 新增 `backgroundVideoUrl` 字段，支持循环视频作为背景层（替代或叠加程序化背景）。

---

## 三、暂不吸收的部分（理由）

| 内容 | 理由 |
|------|------|
| 60fps | 文件体积 ×2，30fps 对开发工具类视频足够 |
| 循环视频背景素材 | 需要预渲染视频文件，增加依赖。程序化背景可无限组合 |
| Gemini 的 JSON config 格式 | 与现有 timeline.json 设计理念不同——我们用 Layers 分离关注点，Gemini 把所有配置混在一个文件 |
| `useFluidSpring` hook | 已有机能相同的 `useEntrance` hook，只需调整参数 |

---

## 四、实施优先级

| # | 项目 | 影响 | 工作量 | 优先级 |
|---|------|------|--------|--------|
| 1 | AnimatedBarChart 组件 + chartData schema | 大幅提升数据展示表现力 | 中 | **P0** |
| 2 | `performance-launch` 结构模板 | 新增一种叙事范式 | 小 | **P0** |
| 3 | 流体渐变背景 `fluid-gradient` | 视觉质感升级 | 中 | P1 |
| 4 | 弹簧参数调优（新增 elastic 预设） | 动效更活泼 | 小 | P1 |
| 5 | 视频背景支持 | 扩展性 | 小 | P2 |
| 6 | SplitLeftRight 布局 chart slot | 布局完善 | 小 | P2 |

---

## 五、不影响现有系统的原则

- 新结构、新背景、新动效均为**增量**，不修改现有模板
- content.json 新增 `chartData` 为 optional 字段，向后兼容
- timeline.json 的 seg.type 新增 `proof` 对应 chart 场景
- 所有现有 12 套主题、3 种结构、7 种布局保持不变
