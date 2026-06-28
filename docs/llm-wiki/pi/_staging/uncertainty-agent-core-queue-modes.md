# uncertainty: ref.agent.queue-modes

- L2 verifier 已逐条核对 `ref.agent.queue-modes` 的 `[E]` 可核性、行号精度与过度推断风险;节点已标记 `status: verified`。
- `QueueMode` 值域由 `packages/agent/src/types.ts:49` 直接证明,当前仅覆盖 `"all"` 与 `"one-at-a-time"` 两个 literal。
- 本轮未新增 `[U]`。运行时 drain/default/setter 语义来自 `packages/agent/src/agent.ts` 和既有 `subsys.agent-core.message-queue`,均在主节点中按 source 外语义标为 `[I]`。
