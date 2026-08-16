---
id: subsys.app-server.message-processor
title: Message processor
kind: subsystem
tier: T2
source:
  - codex-rs/app-server/src/message_processor.rs
  - codex-rs/app-server/src/external_agent_migration/processor.rs
  - codex-rs/app-server/src/request_processors/thread_processor.rs
  - codex-rs/app-server/src/request_processors/turn_processor.rs
  - codex-rs/app-server/src/request_processors/account_processor.rs
  - codex-rs/app-server/src/request_processors/diagnostics.rs
  - codex-rs/app-server/src/lib.rs
symbols:
  - MessageProcessor
  - MessageProcessor::process_request
  - MessageProcessor::process_client_request
  - MessageProcessor::handle_initialized_client_request
  - MessageProcessor::connection_closed
  - ThreadRequestProcessor
  - ThreadQueueRequestProcessor
  - TurnRequestProcessor
  - ExternalAgentConfigRequestProcessor
related:
  - subsys.app-server.session-management
  - subsys.app-server.transport
  - subsys.app-server.client-libs
  - tool.dynamic-tools
  - subsys.core.thread-queue
  - subsys.platform.diagnostics
evidence: explicit
status: verified
updated: 9ded177ce7
---

`MessageProcessor` 是当前 app-server 的 typed request dispatcher。它持有 account/apps/catalog/config/fs/mcp/plugin/thread/thread-queue/turn 等 specialized processors，并把 JSON-RPC request 或 in-process typed request 统一送进 `handle_client_request`/`handle_initialized_client_request` 分派表。[E: codex-rs/app-server/src/message_processor.rs:104][E: codex-rs/app-server/src/message_processor.rs:108][E: codex-rs/app-server/src/message_processor.rs:126][E: codex-rs/app-server/src/message_processor.rs:127][E: codex-rs/app-server/src/message_processor.rs:128][E: codex-rs/app-server/src/message_processor.rs:556][E: codex-rs/app-server/src/message_processor.rs:591][E: codex-rs/app-server/src/message_processor.rs:614][E: codex-rs/app-server/src/message_processor.rs:917]

## 能回答的问题

- app-server JSON-RPC request 与 in-process typed request 如何进入同一个分派语义。
- `initialize` 与 initialized-only requests 的边界在哪里。
- `server/diagnostics` 以及 thread/turn/config/fs/account 等 request families 分别由哪些 processor 接管。
- dynamic tools 和 turn input 在进入 core 之前做哪些 app-server 层校验。

## 职责边界

- `process_request` 是 WebSocket/stdio JSON-RPC 路径：它构造 request trace/context，反序列化 `ClientRequest`，再调用 `handle_client_request`；WebSocket caller 传入 `outbound_initialized: None`，避免 shared handler 过早标记 outbound ready。[E: codex-rs/app-server/src/message_processor.rs:556][E: codex-rs/app-server/src/message_processor.rs:584][E: codex-rs/app-server/src/message_processor.rs:591][E: codex-rs/app-server/src/message_processor.rs:596]
- `process_client_request` 是 in-process embedder 的 typed path；它跳过 JSON deserialization，但仍 delegating to `handle_client_request`，并传入 `Some(outbound_initialized)`，因为 in-process 没有 WebSocket transport loop 做 post-initialize bookkeeping。[E: codex-rs/app-server/src/message_processor.rs:614][E: codex-rs/app-server/src/message_processor.rs:641][E: codex-rs/app-server/src/message_processor.rs:646]
- `handle_client_request` 先截获 `ClientRequest::Initialize`，调用 initialize processor；其它 request 必须已经 initialized，否则 `dispatch_initialized_client_request` 返回 `Not initialized`，再检查 experimental API gate 和 serialization scope。[E: codex-rs/app-server/src/message_processor.rs:804][E: codex-rs/app-server/src/message_processor.rs:807][E: codex-rs/app-server/src/message_processor.rs:828][E: codex-rs/app-server/src/message_processor.rs:844][E: codex-rs/app-server/src/message_processor.rs:848][E: codex-rs/app-server/src/message_processor.rs:860]
- initialized dispatcher 直接 match `ClientRequest` 到 specialized processors：`server/diagnostics` 走 `read_server_diagnostics()`，config/external-agent/fs/remote-control 在前半段处理，thread lifecycle 在 `ThreadRequestProcessor`，queue 在 `ThreadQueueRequestProcessor`，turn/realtime/review 在 `TurnRequestProcessor`。[E: codex-rs/app-server/src/message_processor.rs:921][E: codex-rs/app-server/src/message_processor.rs:922][E: codex-rs/app-server/src/message_processor.rs:1144][E: codex-rs/app-server/src/message_processor.rs:1192][E: codex-rs/app-server/src/message_processor.rs:1269]
- `connection_closed` is the domain cleanup boundary after transport state has been removed: it waits for the connection RPC gate to drain with a bounded timeout, then clears pending outgoing requests, fs watches, command/process exec state, and thread subscriptions。[E: codex-rs/app-server/src/message_processor.rs:745][E: codex-rs/app-server/src/message_processor.rs:751][E: codex-rs/app-server/src/message_processor.rs:763][E: codex-rs/app-server/src/message_processor.rs:764][E: codex-rs/app-server/src/message_processor.rs:771]

## 关键 crate/文件

- `codex-rs/app-server/src/message_processor.rs`: top-level request dispatcher, initialize boundary, request serialization, processor wiring。
- `codex-rs/app-server/src/request_processors/diagnostics.rs`: process-local `server/diagnostics` snapshot。
- `codex-rs/app-server/src/external_agent_migration/processor.rs`: 已从 `request_processors/` 移出的 external-agent config/migration request processor。
- `codex-rs/app-server/src/request_processors/thread_processor.rs`: thread start/resume/fork/archive/list/read and dynamic tool validation。
- `codex-rs/app-server/src/request_processors/turn_processor.rs`: turn/start, turn/steer, turn/interrupt, thread/settings/update, realtime/review turn operations。
- `codex-rs/app-server/src/request_processors/account_processor.rs`: account/login/logout/auth status and the debug-only login issuer override。

## 数据模型

- `ConnectionSessionState` contains the per-connection RPC gate and an `OnceLock<InitializedConnectionSessionState>`；initialized state stores experimental API opt-in, opted-out notifications, client name/version, request-attestation capability, and MCP extension flags。[E: codex-rs/app-server/src/message_processor.rs:134][E: codex-rs/app-server/src/message_processor.rs:140][E: codex-rs/app-server/src/message_processor.rs:141][E: codex-rs/app-server/src/message_processor.rs:145][E: codex-rs/app-server/src/message_processor.rs:146]
- `MessageProcessor::new` builds request processors once around process-scoped managers: it creates thread state/watch managers, a config-derived thread store, optional SQLite `QueueStore`，specialized config/external-agent/environment/fs processors, and then stores each processor on `Self`。[E: codex-rs/app-server/src/message_processor.rs:232][E: codex-rs/app-server/src/message_processor.rs:252][E: codex-rs/app-server/src/message_processor.rs:256][E: codex-rs/app-server/src/message_processor.rs:259][E: codex-rs/app-server/src/message_processor.rs:541]
- `ThreadRequestProcessor` owns the thread manager/store, pending unload set, thread state/watch managers, background tasks, and skills watcher; its public entrypoints include `thread_start`。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:425][E: codex-rs/app-server/src/request_processors/thread_processor.rs:433][E: codex-rs/app-server/src/request_processors/thread_processor.rs:434][E: codex-rs/app-server/src/request_processors/thread_processor.rs:497]
- `thread/settings/update` 不走 thread processor，而是 `TurnRequestProcessor::thread_settings_update`。[E: codex-rs/app-server/src/message_processor.rs:1192][E: codex-rs/app-server/src/message_processor.rs:1193]

## 控制流

1. Client sends JSON-RPC request; app-server transport loop calls `MessageProcessor::process_request`, which deserializes `ClientRequest` and registers request context before running handler code。[E: codex-rs/app-server/src/message_processor.rs:556][E: codex-rs/app-server/src/message_processor.rs:584][E: codex-rs/app-server/src/message_processor.rs:591]
2. `initialize` runs before initialized dispatch; if it transitions the session, `thread_processor.connection_initialized` records connection capabilities。[E: codex-rs/app-server/src/message_processor.rs:804][E: codex-rs/app-server/src/message_processor.rs:815][E: codex-rs/app-server/src/message_processor.rs:816]
3. Non-initialize requests become queued initialized requests; requests with a serialization scope enter `request_serialization_queues`，otherwise they spawn immediately。[E: codex-rs/app-server/src/message_processor.rs:860][E: codex-rs/app-server/src/message_processor.rs:868]
4. thread methods are handed to `ThreadRequestProcessor`；queue 的 6 个方法走 `ThreadQueueRequestProcessor`；`thread/rollback`、`thread/revert`、`thread/approveGuardianDeniedAction` 仍由 thread processor 处理。[E: codex-rs/app-server/src/message_processor.rs:1144][E: codex-rs/app-server/src/message_processor.rs:1169][E: codex-rs/app-server/src/message_processor.rs:1226][E: codex-rs/app-server/src/message_processor.rs:1231][E: codex-rs/app-server/src/message_processor.rs:1269]
5. turn methods are handed to `TurnRequestProcessor`；`TurnStart`、injected items、steer/interrupt、realtime operations 和 review start 都在 turn branch。[E: codex-rs/app-server/src/message_processor.rs:1192]
6. When transport reports a closed connection, the outer loop first closes admission through the RPC gate and then invokes `MessageProcessor::connection_closed`；the method drains in-flight RPCs before fan-out cleanup。[E: codex-rs/app-server/src/lib.rs:1018][E: codex-rs/app-server/src/lib.rs:1026][E: codex-rs/app-server/src/message_processor.rs:745][E: codex-rs/app-server/src/message_processor.rs:751][I]

## 设计动机与权衡

- JSON-RPC and in-process requests share the same typed dispatch path, but differ in readiness handoff: WebSocket JSON-RPC waits for `lib.rs` to mirror session state and send initialize notifications, while in-process can mark outbound ready in the shared handler。[E: codex-rs/app-server/src/message_processor.rs:591][E: codex-rs/app-server/src/message_processor.rs:596][E: codex-rs/app-server/src/message_processor.rs:641][E: codex-rs/app-server/src/message_processor.rs:646][I]
- dynamic tools validation lives with thread request handling. The validator enforces identifier shape/length, rejects `mcp`/`mcp__` names, rejects reserved Responses API namespaces, requires namespaced deferred tools, and parses tool input schema through `codex_tools::parse_tool_input_schema`。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:397][E: codex-rs/app-server/src/request_processors/thread_processor.rs:400]
- `server/diagnostics` 故意不经过 thread/account processors：它只读 `codex_diagnostics::snapshot()` 的 process/gauge 快照。[E: codex-rs/app-server/src/message_processor.rs:921][E: codex-rs/app-server/src/request_processors/diagnostics.rs:5][E: codex-rs/app-server/src/request_processors/diagnostics.rs:6]

## gotcha

- `ClientRequest::Initialize` inside `handle_initialized_client_request` is a panic path; initialize must be handled by `handle_client_request` before initialized dispatch。[E: codex-rs/app-server/src/message_processor.rs:804][E: codex-rs/app-server/src/message_processor.rs:918][E: codex-rs/app-server/src/message_processor.rs:919]
- Client notifications are currently logged only; there is no notification-side domain dispatch in `MessageProcessor`。[E: codex-rs/app-server/src/message_processor.rs:658][E: codex-rs/app-server/src/message_processor.rs:661]
- current dispatcher additionally routes `environment/status`、`app/read`、`app/installed`，而不是把它们折叠到旧的 info/list handlers。[E: codex-rs/app-server/src/message_processor.rs:1014][E: codex-rs/app-server/src/message_processor.rs:1327][E: codex-rs/app-server/src/message_processor.rs:1331]
- `CODEX_APP_SERVER_LOGIN_ISSUER` is a debug-only account login hook in `request_processors/account_processor.rs`，不是 message processor 文件内的常量。[E: codex-rs/app-server/src/request_processors/account_processor.rs:21]

## Sources

- `codex-rs/app-server/src/message_processor.rs`
- `codex-rs/app-server/src/external_agent_migration/processor.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`
- `codex-rs/app-server/src/request_processors/turn_processor.rs`
- `codex-rs/app-server/src/request_processors/account_processor.rs`
- `codex-rs/app-server/src/request_processors/diagnostics.rs`
- `codex-rs/app-server/src/lib.rs`

## 相关

- `subsys.app-server.session-management`
- `subsys.app-server.transport`
- `subsys.app-server.client-libs`
- `tool.dynamic-tools`
- `subsys.core.thread-queue`
- `subsys.platform.diagnostics`
