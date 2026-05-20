# DenisSergeevitch/agents-best-practices

- **GitHub 地址**：https://github.com/DenisSergeevitch/agents-best-practices
- **一句话定位**：一套面向 AI Agent 系统的运行时纪律与架构参考，教你如何构建"模型提议、Harness 执行"的生产级 Agent
- **编程语言**：无（知识/Skill 仓库，Markdown 为主）
- **Star 总数**：854（本期增长：过去 5 天新建，增速 ≈ 170 star/天）
- **许可证**：MIT License
- **官方简介**：Provider-neutral Agent Skill for Codex, Claude Code, and agentic harness design.
- **使用领域标签**：AI Agent、Agent 架构、工具权限、提示工程、MCP、Agent Skill、运行时安全
- **核心功能**：
  1. **MVP Agent 蓝图生成**：给定业务领域，输出最小可用的生产级 Agent 架构，含工具定义、权限分级和上线门槛
  2. **已有 Harness 审计**：诊断 Agent 循环失控、上下文丢失、工具过宽等问题，给出修复优先级
  3. **工具与权限设计**：将 API 按风险等级拆分为窄类型工具，每次调用带结构化结果和确定性权限检查
  4. **上下文与记忆管理**：指导如何在压缩中保留活跃审批状态，如何构建缓存友好的上下文布局
  5. **安全评估与上线 Checklist**：覆盖注入攻击、工具结果缺失、预算耗尽等场景的评估清单
- **目标用户**：正在构建或计划构建 AI Agent 系统的开发者与团队，尤其是涉及工具调用、权限管控和上线流程的场景
- **快速上手**：`npx skills add DenisSergeevitch/agents-best-practices -g` 即可全局安装为 Agent Skill，兼容 Codex 和 Claude Code
- **应用场景举例**：
  - 构建 CRM 自动化 Agent 时需要设计审批门控和工具权限
  - Agent 在长对话中上下文压缩后丢失关键状态，需要持久化方案
  - 多个 Agent 需要通过 MCP 连接外部系统，需要连接器治理策略
- **更多信息**：
  - Fork 数：78
  - 开放 Issue 数：4
  - 官网：无
  - 创建时间：2026-05-15  最后更新：2026-05-20
