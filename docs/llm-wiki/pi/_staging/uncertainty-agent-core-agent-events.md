# uncertainty: ref.agent.agent-events

L2 verifier 已逐条对照 `packages/agent/src/types.ts` 与 `packages/agent/src/harness/types.ts` 核验 `ref.agent.agent-events` 的 `[E]` 可核性、行号精度和过度推断风险;本轮未登记 `[U]`。

修正点: `AgentEvent` 数量从 9 个改为 10 个;`message_start`、`agent_end`、tool execution payload、`AgentHarnessEventResultMap` 和 session entry 关系边界均收紧为当前 source 可直接支撑的字段/union 事实。已确认 `AgentEvent` 10 个 variant 与 `AgentHarnessOwnEvent` 19 个 harness-owned variant 全覆盖,节点已置为 `status: verified`。
