# Doorman11991/smallcode

- **GitHub 地址**：https://github.com/Doorman11991/smallcode
- **一句话定位**：专为小模型（7B-20B）设计的终端 AI 编码 Agent，4B 活跃参数跑出 87% benchmark，完全本地运行无需云端 API
- **编程语言**：JavaScript
- **Star 总数**：730（2 天新建，增长迅猛）
- **许可证**：MIT License
- **官方简介**：AI coding agent optimized for small LLMs. 87% benchmark with 4B-active model.
- **使用领域标签**：AI 编码、本地 LLM、开发工具、终端 Agent、小模型优化
- **核心功能**：
  1. **小模型优先架构**：从工具调用解析到上下文管理，每一层都针对 7B-20B 模型的局限性做了补偿设计
  2. **MarrowScript 认知层**：50 行声明式代码编译出 1400+ 行 TypeScript，自动获得缓存、重试、验证、预算管控
  3. **上下文预算引擎**：自动管理 token 预算，工具结果 4k 字符封顶，中轮淘汰旧结果，语义压缩替代粗暴截断
  4. **两阶段工具路由**：先选类别再展开工具 schema，将上下文开销减半，对 8-16k context 窗口至关重要
  5. **宽容的 Tool Call 解析器**：兼容 JSON/YAML/XML/Hermes/纯文本五种格式的工具调用输出，自动修复常见错误
  6. **Patch-First 编辑**：搜索替换作为主要编辑原语，避免小模型重写整个文件时的截断和幻觉问题
  7. **Model Escalation**：本地模型硬失败时可选择性升级到 Claude/GPT/DeepSeek 等云端模型，完全 opt-in
- **目标用户**：本地 LLM 用户、隐私敏感开发者、消费级硬件用户、Agent 架构研究者
- **快速上手**：
  ```bash
  npm install -g smallcode
  cd my-project
  # 配置 .env: SMALLCODE_MODEL=your-model SMALLCODE_BASE_URL=http://localhost:1234/v1
  smallcode
  ```
- **应用场景举例**：
  - 在没有网络的离线环境中用本地 7B 模型完成日常编码任务
  - 用 LM Studio 或 Ollama 跑 Qwen/Gemma 等开源模型作为编码助手，保护代码隐私
  - 在 CI 中用 SmallCode 的编程式 API 自动执行代码修改任务
- **更多信息**：
  - Fork 数：42
  - 开放 Issue 数：1
  - 官网：无
  - 创建时间：2026-05-18  最后更新：2026-05-19
