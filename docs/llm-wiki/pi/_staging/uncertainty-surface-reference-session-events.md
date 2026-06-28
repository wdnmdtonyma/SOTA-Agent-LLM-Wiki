# uncertainty: surface/reference/session-events

本轮按 `index.json` 核验 `ref.coding-agent.session-events`,只承认以下 source 作为本节点 `[E]` ground truth:

- `packages/coding-agent/src/core/agent-session.ts`

保留为 `[U]` 的 source-scope 边界:

- `AgentSessionEvent` 通过 `Exclude<AgentEvent, { type: "agent_end" }>` 继承 9 个非 `agent_end` core events。`agent-session.ts` 能证明继承关系、pass-through 转发和 `_emitExtensionEvent()` 中处理的 discriminator,但不能单独证明 `AgentEvent` union 的完整字段 shape 或未来是否新增未在 `_emitExtensionEvent()` 特化的 inherited variant。精确 core payload catalog 由 `ref.agent.agent-events` 覆盖。
- JSON mode、RPC stdout、session header、RPC-only records、`packages/coding-agent/docs/json.md` freshness 和 `rpc-client.ts` stdout cast 都不属于本节点 index source。原草稿中这些跨文件 `[E]` 已从本节点显式证据中移除;需要核它们时应转到 `ref.coding-agent.json-events`、`surface.modes.print` 或 `surface.modes.rpc-protocol`。

本轮修正:

- frontmatter `source` 与 `## Sources` 已收敛到 `index.json` 的唯一 source。
- 事件实例目录按 17 个顶层 session event 覆盖:9 个 inherited non-`agent_end` core events、1 个 replacement `agent_end`、7 个 coding-agent own events。
- 所有 retained `[E]` 均落在 `packages/coding-agent/src/core/agent-session.ts` 当前行号;跨包字段 shape 和输出面 contract 均降级为 `[I]` 或 `[U]`。
- 主节点已置 `status: verified`。
