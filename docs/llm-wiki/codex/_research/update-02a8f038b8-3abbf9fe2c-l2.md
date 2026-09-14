# L2 / L3 — Codex Wiki `02a8f038b8` → `3abbf9fe2c`

对照源码 `codex/` @ `3abbf9fe2c`。独立 subagent 不采信 filler / `status:verified`。

## 覆盖

| 批次 | 节点数 | 结果 |
|---|---:|---|
| rollback | 8 | 1 issue：`thread/revert` empty-turns cite 落在 `ThreadRevertParams` 注释上，改到 `ThreadRevertResponse` |
| personality | 9 | 1 issue：`ResponseItem` 17→**18**，补 `ConfigurationUpdate` |
| catalogs | 9 | verified；亲手重数 147/144/28/83/166/84/11/59/102；`worktrees` Stable default true |
| tools | 8 | 5 issue：`parallel.rs:106` 不是 readiness；guardian 三工具另有 ShellTool/UnifiedExec/`ViewImage` 门控 |
| windows-tui | 8 | verified |
| leftover | 8 | 4 issue：turn-metadata attach/MCP extra keys/pending-cap 行号；`exec_command::new` 误指 `one_shot` |
| cites | 11 | 6 issue：TurnState 无独立 MCP-approval map；Linux argv0 误指 Windows MXC；`BwrapOptions.mask_wsl_interop`；compose_requirements 行号；timing guard；cloud-config loader 构造点 |

## L3 回源后仍改的项

1. `rpc.thread-methods`：empty-turns 证据改到 `ThreadRevertResponse`。
2. `ref.data-model`：`ResponseItem` **18**，含 `ConfigurationUpdate`。
3. `spine.tool-call-anatomy` / `subsys.core.tool-router` / `subsys.core.tool-system`：guardian 与 parallel readiness 行号/门控。
4. `subsys.core.turn-metadata` / `tool.exec-command`：metadata attach 与 `new` vs `one_shot`。
5. cites 批 6 处错位 `[E]`（session-tasks、linux sandbox、config-loading、turn-engine、cloud-config）。
6. Lead 修 lint：符号去重（`McpEnterpriseManagedAuthConfig`、`Feature::SendMessageToUserAsync`、`Feature::Worktrees`）以及 8 处落在注释/`*` deref/`];` 上的 `[E]`。

## 未做

其余仅 SHA bump / exact `[E]` rebase 的 C-DRIFT / D-CLEAN 节点没有逐页 L2。113 条 contextual `[E]` rebase 因 LOW_CONFIDENCE 未写；其中高价值页已由 cites/rewrite 批重核。

未跑大型 Rust/runtime 测试。
