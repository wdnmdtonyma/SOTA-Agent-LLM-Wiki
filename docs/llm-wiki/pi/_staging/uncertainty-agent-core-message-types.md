# uncertainty: ref.agent.message-types

本轮填充 `ref.agent.message-types` 未新增 `[U]`。

保留的范围边界: `user`、`assistant`、`toolResult` 三个标准 message variant 的字段级定义来自 `@earendil-works/pi-ai` 的 `Message` union,不在本节点指定 source 范围内展开;本节点只记录 `packages/agent/src/types.ts` 和 `packages/agent/src/harness/messages.ts` 中可核到的 `AgentMessage` union、custom message augmentation、harness 默认 variant 与 default `convertToLlm` 行为。

L2 verifier 结论:已逐条核对 `[E]` 的路径/行号和可支撑语义,并将外部 `Message` union 的完整角色/字段集合收窄为本 source 可核到的 pass-through 边界。`AgentMessage` custom variants 覆盖 `bashExecution`、`custom`、`branchSummary`、`compactionSummary`;helper exports 覆盖 4 个 summary boundary constants、`bashExecutionToText`、3 个 `create*Message` constructor、`convertToLlm`。未发现需要保留的新增 `[U]`。
