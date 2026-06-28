# uncertainty: subsys.agent-core.message-queue

- 本轮未新增 `[U]`。主节点只用 `packages/agent/src/agent.ts` 作为 source; 跨到 `runLoop` 具体 polling 时机、`QueueMode` 完整值域和 `pi-coding-agent` 产品入口的说法均降级为 `[I]`, 并交给 `subsys.agent-core.turn-control`、`ref.agent.queue-modes` 或后续 coding-agent 节点核验。
