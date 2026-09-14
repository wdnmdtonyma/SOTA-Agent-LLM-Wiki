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
  - rpc.thread-methods
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

`MessageProcessor` 是当前 app-server 的 typed request dispatcher。它持有 account/apps/catalog/config/fs/mcp/plugin/thread/thread-queue/turn 等 specialized processors，并把 JSON-RPC request 或 in-process typed request 统一送进 `handle_client_request`/`handle_initialized_client_request` 分派表。[E: codex-rs/app-server/src/message_processor.rs:141][E: codex-rs/app-server/src/message_processor.rs:148][E: codex-rs/app-server/src/message_processor.rs:167][E: codex-rs/app-server/src/message_processor.rs:168][E: codex-rs/app-server/src/message_processor.rs:169][E: codex-rs/app-server/src/message_processor.rs:621][E: codex-rs/app-server/src/message_processor.rs:661][E: codex-rs/app-server/src/message_processor.rs:684][E: codex-rs/app-server/src/message_processor.rs:1074]

## 能回答的问题

- app-server JSON-RPC request 与 in-process typed request 如何进入同一个分派语义。
- `initialize` 与 initialized-only requests 的边界在哪里。
- `server/diagnostics` 以及 thread/turn/config/fs/account 等 request families 分别由哪些 processor 接管。
- dynamic tools 和 turn input 在进入 core 之前做哪些 app-server 层校验。

## 职责边界

- `process_request` 是 WebSocket/stdio JSON-RPC 路径：它构造 request trace/context，反序列化 `ClientRequest`，再调用 `handle_client_request`；WebSocket caller 传入 `outbound_initialized: None`，避免 shared handler 过早标记 outbound ready。[E: codex-rs/app-server/src/message_processor.rs:621][E: codex-rs/app-server/src/message_processor.rs:654][E: codex-rs/app-server/src/message_processor.rs:661][E: codex-rs/app-server/src/message_processor.rs:666]
- `process_client_request` 是 in-process embedder 的 typed path；它跳过 JSON deserialization，但仍 delegating to `handle_client_request`，并传入 `Some(outbound_initialized)`，因为 in-process 没有 WebSocket transport loop 做 post-initialize bookkeeping。[E: codex-rs/app-server/src/message_processor.rs:684][E: codex-rs/app-server/src/message_processor.rs:717][E: codex-rs/app-server/src/message_processor.rs:722]
- `handle_client_request` 先截获 `ClientRequest::Initialize`，调用 initialize processor；其它 request 必须已经 initialized，否则 `dispatch_initialized_client_request` 返回 `Not initialized`，再检查 experimental API gate 和 serialization scope。[E: codex-rs/app-server/src/message_processor.rs:927][E: codex-rs/app-server/src/message_processor.rs:930][E: codex-rs/app-server/src/message_processor.rs:951][E: codex-rs/app-server/src/message_processor.rs:967][E: codex-rs/app-server/src/message_processor.rs:971][E: codex-rs/app-server/src/message_processor.rs:1013]
- initialized dispatcher 直接 match `ClientRequest` 到 specialized processors：`server/diagnostics` 走 `read_server_diagnostics()`，config/external-agent/fs/remote-control 在前半段处理，`modelProvider/capabilities/read` 走 config processor，thread lifecycle 与 `threadSection/*` / `thread/section/move` 在 `ThreadRequestProcessor`，queue 的 6 个方法在 `ThreadQueueRequestProcessor`，turn/realtime/review 在 `TurnRequestProcessor`，`project/{list,read,create,import,update,move,delete}` 走 `ProjectRequestProcessor`。逐方法 catalog 见 [`rpc.thread-methods`](../../surface/app-server/thread-methods.md)，本节点只记分派边界。[E: codex-rs/app-server/src/message_processor.rs:1125][E: codex-rs/app-server/src/message_processor.rs:1126][E: codex-rs/app-server/src/message_processor.rs:1266][E: codex-rs/app-server/src/message_processor.rs:1354][E: codex-rs/app-server/src/message_processor.rs:1400][E: codex-rs/app-server/src/message_processor.rs:1415][E: codex-rs/app-server/src/message_processor.rs:1465]
- `connection_closed` is the domain cleanup boundary after transport state has been removed: it waits for the connection RPC gate to drain with a bounded timeout, then clears pending outgoing requests, fs watches, command/process exec state, and thread subscriptions。[E: codex-rs/app-server/src/message_processor.rs:856][E: codex-rs/app-server/src/message_processor.rs:868][E: codex-rs/app-server/src/message_processor.rs:880][E: codex-rs/app-server/src/message_processor.rs:881][E: codex-rs/app-server/src/message_processor.rs:888]

## 关键 crate/文件

- `codex-rs/app-server/src/message_processor.rs`: top-level request dispatcher, initialize boundary, request serialization, processor wiring。
- `codex-rs/app-server/src/request_processors/diagnostics.rs`: process-local `server/diagnostics` snapshot。
- `codex-rs/app-server/src/external_agent_migration/processor.rs`: 已从 `request_processors/` 移出的 external-agent config/migration request processor。
- `codex-rs/app-server/src/request_processors/thread_processor.rs`: thread start/resume/fork/archive/list/read and dynamic tool validation。
- `codex-rs/app-server/src/request_processors/turn_processor.rs`: turn/start, turn/steer, turn/interrupt, thread/settings/update, realtime/review turn operations。
- `codex-rs/app-server/src/request_processors/account_processor.rs`: account/login/logout/auth status and the debug-only login issuer override。

## 数据模型

- `ConnectionSessionState` contains the per-connection RPC gate and an `OnceLock<InitializedConnectionSessionState>`；initialized state stores experimental API opt-in, opted-out notifications, client name/version, request-attestation capability, and MCP extension flags。[E: codex-rs/app-server/src/message_processor.rs:175][E: codex-rs/app-server/src/message_processor.rs:183][E: codex-rs/app-server/src/message_processor.rs:184][E: codex-rs/app-server/src/message_processor.rs:188][E: codex-rs/app-server/src/message_processor.rs:189]
- `MessageProcessor::new` builds request processors once around process-scoped managers: it creates thread state/watch managers, a config-derived thread store, optional SQLite `QueueStore`，specialized config/external-agent/environment/fs processors, and then stores each processor on `Self`。[E: codex-rs/app-server/src/message_processor.rs:273][E: codex-rs/app-server/src/message_processor.rs:294][E: codex-rs/app-server/src/message_processor.rs:299][E: codex-rs/app-server/src/message_processor.rs:302][E: codex-rs/app-server/src/message_processor.rs:606]
- `ThreadRequestProcessor` owns the thread manager/store, pending unload set, thread state/watch managers, background tasks, and skills watcher; its public entrypoints include `thread_start`。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:439][E: codex-rs/app-server/src/request_processors/thread_processor.rs:447][E: codex-rs/app-server/src/request_processors/thread_processor.rs:448][E: codex-rs/app-server/src/request_processors/thread_processor.rs:520]
- `thread/settings/update` 不走 thread processor，而是 `TurnRequestProcessor::thread_settings_update`。[E: codex-rs/app-server/src/message_processor.rs:1415][E: codex-rs/app-server/src/message_processor.rs:1416]

## 控制流

1. Client sends JSON-RPC request; app-server transport loop calls `MessageProcessor::process_request`, which deserializes `ClientRequest` and registers request context before running handler code。[E: codex-rs/app-server/src/message_processor.rs:621][E: codex-rs/app-server/src/message_processor.rs:654][E: codex-rs/app-server/src/message_processor.rs:661]
2. `initialize` runs before initialized dispatch; if it transitions the session, `thread_processor.connection_initialized` records connection capabilities。[E: codex-rs/app-server/src/message_processor.rs:927][E: codex-rs/app-server/src/message_processor.rs:938][E: codex-rs/app-server/src/message_processor.rs:939]
3. Non-initialize requests become queued initialized requests; requests with a serialization scope enter `request_serialization_queues`，otherwise they spawn immediately。[E: codex-rs/app-server/src/message_processor.rs:1013][E: codex-rs/app-server/src/message_processor.rs:1018]
4. queue 的 6 个方法走 `ThreadQueueRequestProcessor`；其余 thread methods（含 `thread/revert`、`thread/approveGuardianDeniedAction`、`thread/timeline/list`，以及 `threadSection/{list,create,update,delete}` 与 `thread/section/move`）交给 `ThreadRequestProcessor`。`thread/rollback` RPC 已删除。[E: codex-rs/app-server/src/message_processor.rs:1354][E: codex-rs/app-server/src/message_processor.rs:1379][E: codex-rs/app-server/src/message_processor.rs:1400][E: codex-rs/app-server/src/message_processor.rs:1403][E: codex-rs/app-server/src/message_processor.rs:1452][E: codex-rs/app-server/src/message_processor.rs:1511][E: codex-rs/app-server/src/message_processor.rs:1668]
5. turn methods are handed to `TurnRequestProcessor`；`TurnStart`、injected items、steer/interrupt、`turn/settings/update`、realtime operations 和 review start 都在 turn branch。[E: codex-rs/app-server/src/message_processor.rs:1415][E: codex-rs/app-server/src/message_processor.rs:1633]
6. `project/{list,read,create,import,update,move,delete}` 交给 `ProjectRequestProcessor`，与 thread store 分离。[E: codex-rs/app-server/src/message_processor.rs:163][E: codex-rs/app-server/src/message_processor.rs:1465][E: codex-rs/app-server/src/message_processor.rs:1484]
7. When transport reports a closed connection, the outer loop first closes admission through the RPC gate and then invokes `MessageProcessor::connection_closed`；the method drains in-flight RPCs before fan-out cleanup。[E: codex-rs/app-server/src/lib.rs:1133][E: codex-rs/app-server/src/lib.rs:1141][E: codex-rs/app-server/src/message_processor.rs:856][E: codex-rs/app-server/src/message_processor.rs:868][I]

## 设计动机与权衡

- JSON-RPC and in-process requests share the same typed dispatch path, but differ in readiness handoff: WebSocket JSON-RPC waits for `lib.rs` to mirror session state and send initialize notifications, while in-process can mark outbound ready in the shared handler。[E: codex-rs/app-server/src/message_processor.rs:661][E: codex-rs/app-server/src/message_processor.rs:666][E: codex-rs/app-server/src/message_processor.rs:717][E: codex-rs/app-server/src/message_processor.rs:722][I]
- dynamic tools validation lives with thread request handling. The validator enforces identifier shape/length, rejects `mcp`/`mcp__` names, rejects reserved Responses API namespaces, requires namespaced deferred tools, and parses tool input schema through `codex_tools::parse_tool_input_schema`。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:411][E: codex-rs/app-server/src/request_processors/thread_processor.rs:414]
- `server/diagnostics` 故意不经过 thread/account processors：它只读 `codex_diagnostics::snapshot()` 的 process/gauge 快照。[E: codex-rs/app-server/src/message_processor.rs:1125][E: codex-rs/app-server/src/request_processors/diagnostics.rs:5][E: codex-rs/app-server/src/request_processors/diagnostics.rs:6]

## gotcha

- `ClientRequest::Initialize` inside `handle_initialized_client_request` is a panic path; initialize must be handled by `handle_client_request` before initialized dispatch。[E: codex-rs/app-server/src/message_processor.rs:927][E: codex-rs/app-server/src/message_processor.rs:1075][E: codex-rs/app-server/src/message_processor.rs:1076]
- Client notifications are currently logged only; there is no notification-side domain dispatch in `MessageProcessor`。[E: codex-rs/app-server/src/message_processor.rs:734][E: codex-rs/app-server/src/message_processor.rs:737]
- current dispatcher additionally routes `environment/status`、`app/read`、`app/installed`，而不是把它们折叠到旧的 info/list handlers。[E: codex-rs/app-server/src/message_processor.rs:1218][E: codex-rs/app-server/src/message_processor.rs:1578][E: codex-rs/app-server/src/message_processor.rs:1582]
- `CODEX_APP_SERVER_LOGIN_ISSUER` is a debug-only account login hook in `request_processors/account_processor.rs`，不是 message processor 文件内的常量。[E: codex-rs/app-server/src/request_processors/account_processor.rs:25]

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
- `rpc.thread-methods`: thread / threadSection client RPC catalog。
