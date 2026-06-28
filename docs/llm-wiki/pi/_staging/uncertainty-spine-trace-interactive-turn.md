# Uncertainty staging: spine.trace-interactive-turn

- [I] `AgentSession._runAgentPrompt()` 明确调用 `this.agent.prompt(messages)`,而 `runAgentLoop` 的行为在 `packages/agent/src/agent-loop.ts` 中明确;但 `Agent.prompt -> runAgentLoop` 的直接中间 call site 位于 stateful `Agent` 包装器,不在本节点 index 给出的 source 列中,所以正文把这一步作为跨文件桥接推断而非 `[E]`。
- [I] `pi-agent-core` 不认识 TUI containers、slash command UI 或 session manager 是由本节点三份 source 的职责分布归纳得出;本页未枚举整个 `agent` 包的所有 imports 来做反证式证明。
- [I] `runAgentLoop` 不直接改 TUI 是由本节点证据窗口中的 event emit chain 与 UI rendering 位于 `InteractiveMode.handleEvent` 归纳得出;正文对应句子保留 `[E]` 给事件链,并用 `[I]` 标出负面边界判断。
