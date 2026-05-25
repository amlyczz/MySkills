---
name: script-composer
description: 从 ContentModel 分析数据编写引人入胜的旁白 Script。创建具有叙事弧线（Hook、Context、Deep Dive、Climax、Resolution）、逐段视觉类型和合理字幕拆分的结构化 Script。当你需要编写视频旁白、从项目分析创建脚本、或将结构化内容转化为引人入胜的叙事时，使用此 skill。
---

# Script Composer（脚本编写器）

将结构化的 `ContentModel` 转化为引人入胜的旁白 `Script`，包含合理的叙事弧线和视觉提示。

## 叙事弧线

每个脚本按五幕叙事结构组织：

1. **Hook（钩子）**（前 3-5 秒）：关于项目的一个令人惊讶的事实、大胆的论断或引人深思的问题
2. **Context（背景）**（5-15 秒）：这个项目解决了什么问题？为什么观众应该关注？
3. **Deep Dive（深入）**（15-40 秒）：技术架构、核心功能、设计模式——实质内容
4. **Climax（高潮）**（40-50 秒）：最令人印象深刻的方面——这个项目的独特之处
5. **Resolution（收尾）**（50-60 秒）：快速总结 + 展望性陈述

## 核心规则

### 字幕拆分
- 严格按照**标点符号**拆分每个场景的字幕（整句或短句）
- **绝对不要逐词或逐术语拆分字幕**——会导致快速闪烁和布局冲突

### 技术架构
- 至少一个段落必须解释代码库结构、技术亮点或主要设计模式
- 充分利用 ContentModel 中的源码洞察

### Segment 格式
每个 segment 包含：
- `text`：旁白文本
- `duration_est`：预估时长（秒）
- `visual_type`：取值为 "intro"、"generic"、"code"、"data"、"split"、"outro" 之一
- `visual_params`：视觉参数字典（layout_hint、primary_material_id、code_language 等）

## 输出

一个 `Script`，包含：
- `full_text`：完整旁白，作为单个字符串
- `segments`：ScriptSegment 对象列表
- `total_duration_est`：所有 segment 时长之和

## 重试支持

当提供 `qa_feedback` 时，重试指令会自动追加到 user prompt 中。

## Prompt 模板

- `references/compose-script-system.md` — 系统提示词，包含叙事弧线和规则
- `references/compose-script-user.md` — 用户提示词模板，包含内容字段
