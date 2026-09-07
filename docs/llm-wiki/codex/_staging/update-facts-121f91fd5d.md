# Extra architecture facts — 121f91fd5d

Filler 辅助。冲突时以源码为准，不要把本页当 `[E]`。

## mcp-server 删除

- Commit `531f3836a1`：Remove the deprecated `codex mcp-server` command (#42993).
- `codex-rs/mcp-server/` 整个 crate 不在。`codex-rs/Cargo.toml` members 无 `mcp-server`。
- `codex-rs/cli/src/main.rs` `enum Subcommand` 现 29 个变体，无 `McpServer`。
- Keep wiki id `subsys.mcp.server` as a retirement page. MCP **client** crates (`codex-mcp`, `rmcp-client`) still live.

## Tool split

`codex-rs/core/src/tools/spec_plan.rs` `add_core_utility_tools`:

- `request_user_input`：`experimental_request_user_input_enabled` → `RequestUserInputHandler` + `DirectModelOnly`.
- `request_user_input_async`：root agent 且模型 `experimental_supported_tools` 含 `"request_user_input_async"` **或** `"send_user_message_async"` → `RequestUserInputAsyncHandler`.
  - Handler file: `codex-rs/core/src/tools/handlers/request_user_input_async.rs`
  - `TOOL_NAME = "request_user_input_async"`
  - Args: `questions: Vec<AsyncUserInputQuestion>` (`title` required, `options` optional array)
  - Returns immediately; reply arrives as a new user message.
- `send_message_to_user_async`：root agent 且模型列表含 `"send_message_to_user_async"` → `SendMessageToUserAsyncHandler`.
  - Handler file: `codex-rs/core/src/tools/handlers/send_message_to_user_async.rs` (renamed from `send_user_message_async.rs`)
  - `TOOL_NAME = "send_message_to_user_async"`
  - Args: `message: String` (non-empty)
  - Immediate `accepted`, `AgentMessageDelivery::Async`, does not end the turn.

Old wiki page `tool.send-user-message-async` described the old handler+name. Rewrite it onto the **new name / same message-shaped tool**. Put the questions-shaped tool on the new page.

## New crates (fold, do not create nodes)

| crate | fold into |
|---|---|
| `attachment-store` | `subsys.core.thread-store`（ThreadManager injectable store） |
| `config-schema` | `ref.crate-index` only（writes `config.schema.json`） |
| `mxc-sandbox` | `subsys.exec-sandbox.sandbox-windows`（native Windows process security env） |
| `windows-sandbox-service` | `subsys.exec-sandbox.sandbox-windows`（`Feature::windows_sandbox_service`） |
| `otel-trace-websocket` | `subsys.platform.telemetry-otel` |
| `realtime-webrtc` + `voice-host` | `subsys.core.realtime-conversation` / `subsys.platform.realtime` |
| `utils/git-discovery` | `subsys.platform.git-utils` |

## Catalog counts at target (recount from source; these are expected)

- workspace members: **145** (`Cargo.toml` members lines 3–147)
- `Feature` enum / `FEATURES` keys: **140**
- `Op`: **29** (unchanged)
- `EventMsg`: **83** (unchanged)
- `SlashCommand`: **60** (+ `Worktree` at `slash_command.rs:38`)
- `ConfigToml` pub fields: **101** (+ `allow_symlinked_codex_home`, `thread_unload_delay_secs`)
- CLI `Subcommand`: **29** (− `McpServer`)
- client RPC (`client_request_definitions!`): **162**
- server notifications / server requests: recount from `server_notification_definitions!` / `server_request_definitions!` in `common.rs` (plus 2 legacy v1 if still in the same macro)

New feature keys: `unified_exec_tty`, `windows_sandbox_service`, `worktrees`, `mcp_oauth_refresh_coordination`, `guardianv2.thread_context`, `context_management`, `reasoning_effort_override`.

New client methods: `userVerification/status`, `userVerification/enroll`, `userVerification/delete`, `userVerification/verify`, `plugin/reconcile`.

## Code-mode host

`trace_transport.rs` is gone. Remaining: `transport.rs`, `grpc_transport.rs`, `grpc/`, `peer.rs`, `delegate.rs`.

## TUI permission profiles

HEAD `121f91fd5d` = “Enable remote named permission profile selection in the TUI”. Read current TUI + `request_permissions` + `permissions` config before repeating old “local-only profile list” sentences.
