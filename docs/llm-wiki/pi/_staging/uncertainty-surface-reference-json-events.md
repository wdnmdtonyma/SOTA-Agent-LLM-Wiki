# uncertainty-surface-reference-json-events

本轮核验后 `ref.coding-agent.json-events` 无遗留不确定项。

已移除的不确定项:

- `extension_error` 的 RPC-only record 可由 `packages/coding-agent/docs/rpc.md:767` 与 `packages/coding-agent/src/modes/rpc/rpc-mode.ts:347`/`:348` 直接支撑;它不属于 `AgentSessionEvent` union 这一点也由 `AgentSessionEvent` 类型定义和 `session.subscribe()` 转发边界支撑,因此无需保留不确定标记。
- L3 lint 修复把 `rpc-types.ts`、`agent-session.ts`、`agent-loop.ts`、`session-manager.ts` 中落到注释行或纯括号行的 `[E]` 锚点移到真实承载行;节点内容与 `status: verified` 不变。

已标为 `[I]` 的边界:

- `RpcResponse`、extension UI request/response 不归入本节点,而归入 `surface.modes.rpc-protocol`;这是从 index related、节点粒度和 `rpc-types.ts` 的 protocol 分层推断出的文档边界。
- `AssistantMessageEvent` nested variants 不作为顶层 JSONL record 单独写出,而是包含在 `message_update.assistantMessageEvent` 中;该结论来自 agent loop 包装逻辑和类型结构组合判断。
- `surface.modes.print`、`surface.modes.rpc-protocol`、`reference/agent-events.md` 与本节点的职责分割属于 wiki 架构解释,不是源码里的运行时事实。
