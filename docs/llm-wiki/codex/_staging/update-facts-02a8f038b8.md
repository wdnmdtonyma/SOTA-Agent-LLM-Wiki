# Extra architecture facts — 02a8f038b8

Filler 辅助。冲突时以源码为准，不要把本页当 `[E]`。

## Compact v1 删除

- `codex-rs/core/src/compact_remote.rs`、`compact_remote_request.rs`、`codex-api/src/endpoint/compact.rs`、`core/tests/suite/compact_remote_parity.rs` 已删除。
- `core/src/lib.rs`：`mod compact_remote_history`、`mod compact_remote_v2`。没有 `mod compact_remote`。
- Remote 任务：`tasks/compact.rs` → `compact_remote_v2::run_remote_compact_task`。
- Inline auto：`session/turn.rs` → `compact_remote_v2::run_inline_remote_auto_compact_task`。
- History trim / group：`compact_remote_history.rs`（`HistoryItemGroup`、`trim_function_call_history_to_fit_context_window`）。
- 本地 summarization compact 仍在 `compact.rs`。

## writer_lock

- Rename：`thread-store/src/local/writer_lock.rs` → `rollout/src/writer_lock.rs`（及 tests）。

## Guardian reviewer crate

- 新 member：`ext/guardian-reviewer`。
- `lib.rs`：owns synchronous Guardian review policy independently of the host session runtime。
- 导出：`SynchronousReview`、`ReviewHost`、`ReviewerPool`、`ReviewerRuntime`、`ReviewerConfigOverrides`、`GuardianAssessment`、`MAX_REVIEW_ATTEMPTS=3`、`REVIEW_TIMEOUT=90s`。
- `guardian-v2/src/sync_reviewer/mod.rs`：`install(registry, thread_manager)` 注册 `GuardianExtension`；`on_thread_start` 在非 internal session 上 `get_or_init(GuardianReviewSessionHost)`；`on_thread_ready` 调 `mark_ready`。
- 已删：`sync_reviewer/reviewer_config.rs`、`prompt.rs`、`async_scorer/review_evidence.rs`。
- core 侧新增 `guardian/{coverage,decision,input_budget,request_budget,review_request,review_session_*}`.rs —— 仍属 `subsys.core.approval-guardian` / v2，不要另建节点。

## user-verification crate

- 新 member：`user-verification`。
- `lib.rs`：device credentials and signing, independent of RPC routing, UI, and backend registration。
- `UserVerificationProvider`：`status` / create / delete / verify；实现不得做 network registration。
- RPC 新增 `userVerification/cancel`（`common.rs` 宏，experimental）。
- Desktop local sessions 可启用 verification（commit #44613）。写入现有 auth / config-account 页。

## Thread attachments + memory/status

- `thread/attachment/add|list|remove` 在 `client_request_definitions!`；processor：`app-server/src/request_processors/thread_attachments.rs`；store：`thread-store/src/local/thread_attachments.rs`。
- Notification：`thread/attachment/updated`。
- `memory/status`：`#[experimental("memory/status")]`；processor `memory_status.rs`；protocol `v2/memory.rs`。

## Slash / TUI

- `SlashCommand::Voice` 在 `Plan` 与 `Goal` 之间。description：`start or stop voice; use /voice settings to choose a voice`。
- popup：`flags.voice_command_enabled || *cmd != SlashCommand::Voice`。
- **没有** `SandboxReadRoot`。
- Folder consent：`tui/src/onboarding/directory_trust.rs`；`tui/src/lib.rs` 在 picker 解析 destination 之后、创建/resume task 之前调用 `check_directory_trust`。

## Features

| key | enum | stage | default |
|---|---|---|---|
| `api_key_model_discovery` | `ApiKeyModelDiscovery` | UnderDevelopment | false |
| `codex_apps_mcp_2026_07_28` | `CodexAppsMcp20260728` | UnderDevelopment | false |

## Catalog counts at target（recount from source）

- workspace members: **147**（第 3–149 行）
- Feature keys / enum: **142**
- Op **29** / EventMsg **83**
- SlashCommand **60**
- ConfigToml pub: **101**
- CLI Subcommand **29**
- client RPC **167**
- notifications **84**（83 `=> "wire"` + `AccountLoginCompleted`）
- server requests **11**（9 v2 + 2 legacy）
- tool nodes **39** / wiki nodes **185**

## 不变

- 无新/删模型可见 core tool wire name。
- `codex mcp-server` 仍退役。
- `send_message_to_user_async` / `request_user_input_async` 拆分仍成立。
- SQ/EQ 脊柱仍在。
