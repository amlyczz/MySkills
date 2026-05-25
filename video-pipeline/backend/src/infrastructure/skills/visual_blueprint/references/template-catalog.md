# 视觉模板目录

从以下模板中选择一个作为视频的基础风格。根据项目类型和叙事角度匹配模板。

## 模板列表

### 1. dark-neon
- **最适合**：技术项目、开发者工具、CLI 应用
- **氛围**：未来感、高能量、赛博朋克风格
- **配色**：深海军蓝/黑色背景，霓虹青/紫色点缀，白色文字
- **动画风格**：快速 spring 动画、故障效果（glitch）、扫描线
- **适用场景类型**：code-block、data-bar-chart、centered-statement

### 2. fluid-aurora
- **最适合**：AI/ML 项目、数据科学、研究论文
- **氛围**：有机、流动、智能
- **配色**：深蓝/青色背景，极光绿/紫色渐变，柔和白色文字
- **动画风格**：平滑贝塞尔曲线、流动过渡、轻柔 spring
- **适用场景类型**：architecture-diagram、stat-card、gradient-text

### 3. light-beam
- **最适合**：产品展示、SaaS 工具、商业应用
- **氛围**：简洁、专业、可信赖
- **配色**：浅灰/白色背景，蓝色/靛蓝点缀，深色文字
- **动画风格**：细微的 fade-up、干净的 slide-in、极简动效
- **适用场景类型**：split-ui-mockup、feature-grid、comparison-table

### 4. glassmorphism
- **最适合**：现代 Web 应用、设计系统、UI 组件库
- **氛围**：时髦、优雅、分层
- **配色**：柔和渐变背景，毛玻璃卡片，微妙阴影
- **动画风格**：平滑 scale-in、视差图层、背景模糊过渡
- **适用场景类型**：split-media、icon-grid、ai-summary-box

### 5. neon-blue
- **最适合**：性能工具、基准测试、数据库
- **氛围**：技术精准、数据导向
- **配色**：黑色背景，电光蓝主色，橙色/黄色高亮
- **动画风格**：计数器动画、柱状图揭示、脉冲效果
- **适用场景类型**：data-bar-chart、stat-card、key-point

### 6. gradient-sunset
- **最适合**：创意项目、设计工具、媒体应用
- **氛围**：温暖、亲切、艺术感
- **配色**：紫色到橙色渐变背景，暖白色文字，金色点缀
- **动画风格**：流动变形、柔和 spring、有机运动
- **适用场景类型**：coverflow-carousel、scrolling-graphic、gradient-text

### 7. minimal-mono
- **最适合**：文档工具、教育内容、教程
- **氛围**：平静、专注、易读
- **配色**：米白色背景，黑色文字，单一强调色（青色或珊瑚色）
- **动画风格**：打字机文字、简单淡入、极简动效
- **适用场景类型**：title、code-block、chapter-title、key-point

### 8. sakura-pink
- **最适合**：社区项目、开源项目、友好工具
- **氛围**：平易近人、友好、温暖
- **配色**：柔和粉色/鲑鱼色背景，白色卡片，玫瑰色点缀，深色文字
- **动画风格**：弹性 spring、花瓣般飘浮、柔和过渡
- **适用场景类型**：centered-statement、icon-grid、badge

## 选择规则

1. 若 `technical_depth` = "deep" 且 `architecture_pattern` 包含 "microservices|clean|layered" → 优先选择 **dark-neon** 或 **neon-blue**
2. 若 `narrative.angle` = "tutorial" → 优先选择 **minimal-mono** 或 **light-beam**
3. 若主要语言涉及 Python + AI/ML 关键词 → 优先选择 **fluid-aurora**
4. 若 `audience.primary` = "cto" 或 "product_manager" → 优先选择 **light-beam** 或 **glassmorphism**
5. 若 `audience.expertise_level` = "beginner" → 优先选择 **sakura-pink** 或 **gradient-sunset**
6. 默认回退：**dark-neon**
