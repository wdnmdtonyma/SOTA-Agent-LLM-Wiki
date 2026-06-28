# uncertainty: ref.agent.tool-execution-modes

L2 verifier 已逐条证伪 `[E]` 可核性、行号精度与过度推断风险;节点已标记 `status: verified`。本轮未留下需要并入 `reference/uncertainty.md` 的 `[U]` 项。

- `ToolExecutionMode` 在 `packages/agent/src/types.ts:41` 仅定义 `"sequential" | "parallel"` 两个 literal 值;节点表格已覆盖两个值,未发现第三个值或遗漏值。
- `AgentLoopConfig.toolExecution` 与 `AgentTool.executionMode` 字段均能在 `packages/agent/src/types.ts` 当前代码行直接核到;默认 `"parallel"`、per-tool sequential/parallel 注释和省略时使用默认 execution mode 是 comment-level contract,节点已按行号规则标为 `[I]`。
- 按用户要求,本节点 `source` 只使用 `packages/agent/src/types.ts`;`agent-loop.ts` 中的实际 dispatch、整批升级到 sequential、parallel runtime path 和 tool-result source-order artifact 行为只在正文中标为 `[I]`,不作为本节点 source 的 direct evidence。
