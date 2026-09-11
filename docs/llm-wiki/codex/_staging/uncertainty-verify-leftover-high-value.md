# L2 verify: leftover-high-value (02a8f038b8)

Mechanical SHA bump hid stale `[E]` and a few false claims. Fixed in place.

Confirmed against source:

- No live `mcp-server` crate/subcommand. Workspace members = 147 (`Cargo.toml` L3–L149). `rmcp-client` is `:97`.
- Guardian turns do not attach `history.*` tools: `add_core_tool_sources` returns early; `append_extension_tool_executors` is in the non-guardian branch.
- These eight nodes do not retain 145 crates / 140 features / 162 client RPC / notifications 83 / shipped `SandboxReadRoot` / live `compact_remote.rs`. `CompactTask` calls `compact_remote_v2`.

Refuted and rewritten:

- `subsys.core.turn-metadata`: attach path moved to `executed_tool_calls/request_metadata.rs`; sampling attach is `turn.rs:1579–1582`, not skill-item helper `:1457`. Type is `ExecutedToolCalls`.
- `subsys.platform.network-proxy`: `NetworkMode` is `:363+`; blocked observer is `network_approval.rs:1065`; ring buffer is `runtime.rs:721`; builder/public/`remote_policy_decider`/`GIT_SSH` cites were pointing at other functions.
- `sdk.py-inputs-errors`: omitted public `ExternalMessage` and `RunInput = Input | str | ExternalMessage`.
- `ref.session-tasks`: `TurnStarted` emit is `regular.rs:49`; `TurnState` was missing MCP-approval / per-model usage / last step; `spawn_task` abort is `:276`.
- `subsys.tui.event-system`: lede `:1028` was worktree error, not the select arms; `ExitMode` comment is `:581`.
- `spine.tool-call-anatomy`: dispatch cite `:165` was timing, not `dispatch_tool_call_with_terminal_outcome`.

No remaining [U] inside this batch after retargets.
