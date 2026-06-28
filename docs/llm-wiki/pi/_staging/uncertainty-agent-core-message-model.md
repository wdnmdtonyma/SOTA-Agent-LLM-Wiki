# uncertainty: subsys.agent-core.message-model

L2 verifier 已逐条对照 `packages/agent/src/types.ts` 与 `packages/agent/src/harness/messages.ts` 核对 `subsys.agent-core.message-model` 的 `[E]`。本轮未新增 `[U]`。

收紧点:移除了落在源码注释行上的 `[E]` 锚点;把 `AgentLoopConfig.convertToLlm` 的 throw/reject contract 改为注释约定 + `[I]`;把 `ToolResultMessage` 的字段级 error 语义收回到外部 `@earendil-works/pi-ai` 边界;把 timestamp 与 system prompt 相关表述改成只依赖本节点 source 可核到的字段和 switch 分支。

保留的范围边界: `UserMessage`、`AssistantMessage`、`ToolResultMessage` 和底层 `Message` 的字段级定义来自 `@earendil-works/pi-ai`,不在本节点指定 source 范围内展开;节点只记录 `packages/agent/src/types.ts` 和 `packages/agent/src/harness/messages.ts` 中可核到的 agent-core 使用语义、custom message augmentation、tool call/result envelope 与 `convertToLlm` 边界。
