# uncertainty: ref.agent.message-types

本轮 rewrite `ref.agent.message-types` 未新增 `[U]`。

范围边界:标准 `user` / `assistant` / `toolResult` / `system` 字段级定义来自 `@earendil-works/pi-ai` 的 `Message` union。agent-core `CustomAgentMessages` 默认为空;`bashExecution` / `custom` / `branchSummary` / `compactionSummary` 由 coding-agent `messages.ts` declaration merging 注入;产品持久化形态在 coding-agent `session-manager.ts`。不再 cite `packages/agent/src/harness/messages.ts`。
