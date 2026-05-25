---
name: qa-evaluator
description: 使用严格的 QA 评分体系评估视频脚本和视觉 Blueprint。采用扣分制评分（从 100 分起扣，发现缺陷即扣分），覆盖多个评估维度。为重试循环提供可操作的反馈。当你需要评估、打分或审查生成的脚本或 Blueprint 时，或需要为生成式内容实现 QA 反馈循环时，使用此 skill。
---

# QA Evaluator（质量评估器）

使用扣分制评分系统，对脚本和视觉 Blueprint 进行独立、严格的质量评估。

## 评分理念

- **从 100 分起扣**：起始 100 分，发现每项缺陷即扣分
- **默认状态是"找问题"**：不给任何侥幸分
- **无利他偏差**：一个"看起来还行"的结果是 70-75 分，不是 85 分
- **85+ 仅当所有维度都达到生产就绪标准**

## 评估模式

### 脚本评估
4 个扣分维度（各 25 分）：
1. **Technical Accuracy（技术准确性）** — 技术论断是否正确？
2. **Narrative Pacing（叙事节奏）** — 段落是否均衡，过渡是否流畅？
3. **Audience Engagement（观众参与度）** — 是否能吸引并保持观众的兴趣？
4. **Structure Completeness（结构完整性）** — 是否包含开场 + 技术架构 + 结尾？

### Blueprint 评估
6 个扣分维度：
1. **Element Completeness（元素完整性）**（0-20 分） — 丰富、类型正确的 ElementConfig 树
2. **Animation Quality（动画质量）**（0-20 分） — 正确的 inFrame/outFrame、stagger、easing
3. **Flex Layout Compliance（Flex 布局合规性）**（0-15 分） — 所有元素使用 position "flex-child"
4. **Safe Exit OutFrame（安全退出帧）**（0-15 分） — outFrame = durationInFrames - 15
5. **Subtitle Quality（字幕质量）**（0-15 分） — 按标点符号拆分，而非逐词拆分
6. **Visual Cohesion（视觉一致性）**（0-15 分） — 统一的主题、过渡和配色方案

## 反馈模板

当评分低于 80 分时，生成结构化反馈用于重试：
```
## 上一次 QA 审查（评分：{score}/100）
独立 QA 评估员发现以下缺陷：
{reasoning}
### 重试指令：
你必须逐一解决上述每项缺陷。
```

## Prompt 模板

- `references/script-qa-system.md` — 脚本评估系统提示词
- `references/script-qa-user.md` — 脚本评估用户提示词
- `references/blueprint-qa-system.md` — Blueprint 评估系统提示词
- `references/blueprint-qa-user.md` — Blueprint 评估用户提示词
