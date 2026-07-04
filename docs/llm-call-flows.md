# OpenClaw LLM 调用链总结（UI→Gateway→Agent→Provider）

本文沉淀两条与大模型（LLM）交互的核心调用链：

- 通用 UI→LLM 调用链（Control UI 聊天/功能共用）
- GEO 流（品牌可见度体检）对上述通用链路的复用

目标：帮助开发者快速定位端到端路径、关键扩展点与安全边界；并提供最短验证路径。

---

## 1) 通用 UI → LLM 调用链

步骤概览：

1. 前端构造消息/附件并发起 chat.send
   - 聊天控制器组装并发送 RPC：[requestChatSend()](ui/src/ui/controllers/chat.ts:828) → [GatewayBrowserClient.request()](ui/src/ui/gateway.ts:996)
2. Gateway 服务端处理 chat.send
   - 入口处理器：[chatHandlers["chat.send"]](src/gateway/server-methods/chat.ts:2883)
   - 参数校验/权限门控/文本清洗/附件标准化；会话与 Agent 选择；模型与鉴权 Provider 解析
     - 文本清洗：[sanitizeChatSendMessageInput()](src/gateway/server-methods/chat.ts:2945)
     - 会话装载与 Agent 选择：[loadSessionEntry()](src/gateway/server-methods/chat.ts:2998)、[validateChatSelectedAgent()](src/gateway/server-methods/chat.ts:3008)、[resolveSessionAgentId()](src/gateway/server-methods/chat.ts:3031)
     - 模型与鉴权 Provider 解析：[resolveSessionModelRef()](src/gateway/server-methods/chat.ts:3041)、[resolveProviderIdForAuth()](src/gateway/server-methods/chat.ts:3042)
     - 发送策略与 STOP 命令：[resolveSendPolicy()](src/gateway/server-methods/chat.ts:3058)、[isChatStopCommandText()](src/gateway/server-methods/chat.ts:3074)
   - 大附件/图片“预分段-离线化”（claim‑check）：
     - 预落盘并将图片转换为 media:// 引用，错误可同步暴露为 5xx：[prestage 注释](src/gateway/server-methods/chat.ts:1063)
     - OpenAI 适配器图片支持策略说明：[openai-chatgpt-provider 注释](extensions/openai/openai-chatgpt-provider.ts:160)
3. Agent 运行时选择 Provider/模型并调用外部 LLM
   - 解析链路（显式覆盖 → 当前运行模型 → Agent 默认模型 → 插件兜底），在插件中实现（示例：Active Memory）
   - Provider 适配器将通用上下文映射到具体 API 并进行流式调用（示例：Bedrock）
     - Bedrock 流式驱动：[streamBedrock()](extensions/amazon-bedrock/stream.runtime.ts:54)
     - 思考强度映射与能力检测：[supportsAdaptiveThinking()](extensions/amazon-bedrock/stream.runtime.ts:473)、[mapThinkingLevelToEffort()](extensions/amazon-bedrock/stream.runtime.ts:489)
4. Gateway 将增量/终态事件推送回 UI
   - UI 接收并渲染事件流：[handleGatewayEvent()](ui/src/ui/app-gateway.ts:975) → [handleChatGatewayEvent()](ui/src/ui/app-gateway.ts:1104) → [handleChatEvent()](ui/src/ui/controllers/chat.ts:1086)

安全与凭证边界：

- UI 只携带网关鉴权信息，不传递第三方 Provider API Key。
- Provider 凭证仅在服务端解析与使用（示例：BytePlus 密钥解析）[resolveApiKeyForProvider()](extensions/byteplus/video-generation-provider.ts:278)。

最短验证路径：

- 在浏览器触发一次聊天/命令，检查 Network/WS 中的 chat.send 请求与事件流。
- 观察服务端 chat.send 日志、选择一个 Provider 配置后检查流式回传是否到达 UI。

---

## 2) GEO 流对通用链路的复用（开始体验→体检）

GEO 属于“提示工程 + 会话管理”，底层完全沿用通用 chat.send 调用链。

关键步骤：

1. 构造 GEO 技能提示与触发运行
   - 构造提示：[buildGeoSkillPrompt()](ui/src/ui/geo-skill-runner.ts:69)
   - 发起/等待本次技能会话运行：[runGeoSkill()](ui/src/ui/geo-skill-runner.ts:235)（内部使用统一聊天通道）
   - 统一聊天发送入口（队列/ACK/首字节计时/重试等）：[handleSendChat()](ui/src/ui/app-chat.ts:1522)
2. 发送 RPC 与服务端处理
   - 与通用链路一致：由聊天控制器发起 [requestChatSend()](ui/src/ui/controllers/chat.ts:828) → Gateway 端 [chatHandlers["chat.send"]](src/gateway/server-methods/chat.ts:2883)
3. Provider/模型选择与调用
   - 复用会话与 Agent 决策、模型解析与 Provider 适配器调用（见通用链路第 3 步）
4. 流式事件回传与 UI 同步
   - GEO Runner 在流完成/阶段性输出后，同步 GEO 领域状态（如体检报告、品牌故事等），底层事件通道与渲染路径与通用聊天相同

补充：开始体验入口

- 点击开始后立即进入体检相位并发起评估：GEO 控制器启动流程（相位与历史管理）后走聊天通道完成首轮评估。

---

## 参考代码索引（按出现顺序）

- 前端发送与事件处理
  - [requestChatSend()](ui/src/ui/controllers/chat.ts:828)
  - [GatewayBrowserClient.request()](ui/src/ui/gateway.ts:996)
  - [handleGatewayEvent()](ui/src/ui/app-gateway.ts:975)
  - [handleChatGatewayEvent()](ui/src/ui/app-gateway.ts:1104)
  - [handleChatEvent()](ui/src/ui/controllers/chat.ts:1086)
- 服务端 chat.send 与前置处理
  - [chatHandlers["chat.send"]](src/gateway/server-methods/chat.ts:2883)
  - [sanitizeChatSendMessageInput()](src/gateway/server-methods/chat.ts:2945)
  - [loadSessionEntry()](src/gateway/server-methods/chat.ts:2998)
  - [validateChatSelectedAgent()](src/gateway/server-methods/chat.ts:3008)
  - [resolveSessionAgentId()](src/gateway/server-methods/chat.ts:3031)
  - [resolveSessionModelRef()](src/gateway/server-methods/chat.ts:3041)
  - [resolveProviderIdForAuth()](src/gateway/server-methods/chat.ts:3042)
  - [resolveSendPolicy()](src/gateway/server-methods/chat.ts:3058)
  - [isChatStopCommandText()](src/gateway/server-methods/chat.ts:3074)
  - 预分段/图片 claim‑check：[prestage 注释](src/gateway/server-methods/chat.ts:1063)
  - OpenAI 图片输入策略注记：[openai-chatgpt-provider 注释](extensions/openai/openai-chatgpt-provider.ts:160)
- GEO 流复用
  - [buildGeoSkillPrompt()](ui/src/ui/geo-skill-runner.ts:69)
  - [runGeoSkill()](ui/src/ui/geo-skill-runner.ts:235)
  - [handleSendChat()](ui/src/ui/app-chat.ts:1522)
- Provider 适配器（示例：Bedrock）
  - [streamBedrock()](extensions/amazon-bedrock/stream.runtime.ts:54)
  - [supportsAdaptiveThinking()](extensions/amazon-bedrock/stream.runtime.ts:473)
  - [mapThinkingLevelToEffort()](extensions/amazon-bedrock/stream.runtime.ts:489)

---

## 附：安全与维护建议

- UI 永不传第三方 Provider 密钥；统一从服务端解析并按 Agent 工作目录隔离。
- 对高风险附件（大图/容器文件）坚持“预分段-离线化”策略，避免在 Provider 阶段才失败。
- 为通用与 GEO 流各自保留最短验证用例，升级 Provider/模型或网关策略时先跑验证用例。
