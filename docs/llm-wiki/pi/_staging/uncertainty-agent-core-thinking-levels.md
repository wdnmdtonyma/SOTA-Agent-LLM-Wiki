# uncertainty · ref.agent.thinking-levels

batch: agent-core
node: ref.agent.thinking-levels
updated: 5a073885

## 当前状态

- L2 verifier 已逐条核对 `ref.agent.thinking-levels` 的 `[E]` 可核性、行号精度和过度推断风险;节点已置 `status: verified`。
- `ThinkingLevel` 当前六个值已按 `packages/agent/src/types.ts:289` 确认为完整 union 覆盖:`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`。
- 本轮未留下需要并入 `reference/uncertainty.md` 的 `[U]` 项。
- 节点按 `source=[packages/agent/src/types.ts]` 收窄证据:所有 provider/model support、`SimpleStreamOptions.reasoning` 字段细节、`"off"` 到 provider request 的 runtime 转换都标为 `[I]`,没有用 source 外文件作 `[E]`。L2 将 `AgentLoopConfig` 边界收紧为本文件只证明继承 imported `SimpleStreamOptions` shape,不把具体 `reasoning` 字段写成当前 source 可直接证明。
