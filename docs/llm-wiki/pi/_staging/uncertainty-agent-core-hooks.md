# uncertainty: subsys.agent-core.hooks

- L2 verifier 通过: `subsys.agent-core.hooks` 已核到 `packages/agent/src/types.ts` 当前行号,节点状态置为 `verified`。本轮未新增 `[U]`;修正包括将 `transformContext` 失败事件序列从 `[E]` 收紧为 hook-local fallback contract + `[I]`,把所有 `[E]` 从注释行移到实际 interface/property/signature 行,并把 block/merge/batch 语义、负面能力与跨节点职责边界显式标为 `[I]`。
- [I] 本节点 `source` 按任务要求只包含 `packages/agent/src/types.ts`。`beforeToolCall`、`afterToolCall`、`prepareNextTurn`、`transformContext` 的精确 runtime 调用点和事件相对顺序需要 `packages/agent/src/agent-loop.ts` 证明;正文只对 `types.ts` 注释中直写的时机挂 `[E]`, 对需要 loop 代码才能证明的行为标 `[I]`。
- [I] `transformContext` 是否把返回的 `AgentMessage[]` 持久写回 `AgentContext.messages` 不由 `types.ts` 证明;正文只声明它在 `convertToLlm` 前提供 provider request 前的 message transform contract。
- [I] `afterToolCall.terminate` 的 batch 聚合算法不在 `types.ts` 中;正文只记录类型注释中的 “every finalized tool result in the batch” contract, 具体实现应由 agent-loop / tool-invocation 节点核证。
- [I] coding-agent extension events 如何接入 agent-core hooks 不在 `packages/agent/src/types.ts` 中;正文将其列为跨包装配边界, 未展开产品层调用链。
