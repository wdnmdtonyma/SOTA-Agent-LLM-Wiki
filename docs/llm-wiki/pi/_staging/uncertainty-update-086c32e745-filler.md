# update-086c32e745 filler

- `[U]` `ExtensionRunner.emitToolCall()` 仍无 try/catch;handler 抛错会直接 reject, 与 `emit()` / `emitToolResult()` / `emitInput()` 的 `emitError()` 模式不同。源码未说明这是 fail-closed 还是遗漏。本节点沿用既有 `[U]`。
- `[U]` `docs/rpc.md` 的 `get_commands` 示例仍写 `location`/`path`, 当前 `RpcSlashCommand` / `rpc-mode.ts` 输出 `sourceInfo`。这是基线已有文档滞后, 本轮 `rpc-types.ts` 命令集无增减。
- `[I]` 任务写 “theme detection delay 200ms→100ms”;`theme-controller.ts` 在 `305c014dcc` 已是 `timeoutMs: 100`。`086c32e745` 的可见变化是 `detectTerminalThemeForAuto()` 并发启动 color-scheme 与 OSC 11/`COLORFGBG` probe, 不是 timeout 从 200 改到 100。
- `[I]` `createCodingAgentHarness()` 在 `packages/coding-agent/src/server/create-harness.ts`, 不是 `AgentSession` 符号。本轮只在 `agent-session.md` 作跨包对照, 不把它收进该节点 `symbols`。
- `[I]` “inherit subagent session config” 的实现在 `packages/coding-agent/examples/extensions/subagent/index.ts`(#7897);`AgentSession` 侧对应的是 scoped-model cycle 对 undefined thinking level 的 inherit。wiki 两边都点了名, 不以 example 作为 `AgentSession` 权威源。
- `[I]` TUI wrapper 不再无限递归的修复在 `createInteractiveTuiReference()` (`interactive-mode.ts`), 不在 `extensions/runner.ts` / `extensions/wrapper.ts`。`extension-runner.md` 只写交叉指针。
- RPC: `RpcCommand` 仍为 32, `305c014dcc..086c32e745` 无增删。
