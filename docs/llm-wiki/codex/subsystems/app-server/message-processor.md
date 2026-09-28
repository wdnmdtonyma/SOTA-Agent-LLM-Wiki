---
id: subsys.app-server.message-processor
title: Message processor
kind: subsystem
tier: T2
source: [codex-rs/app-server/src/message_processor.rs, codex-rs/app-server/src/external_agent_migration/processor.rs, codex-rs/app-server/src/request_processors/thread_processor.rs, codex-rs/app-server/src/request_processors/turn_processor.rs, codex-rs/app-server/src/request_processors/account_processor.rs, codex-rs/app-server/src/request_processors/diagnostics.rs, codex-rs/app-server/src/lib.rs]
symbols: [MessageProcessor, MessageProcessor::process_request, MessageProcessor::process_client_request, MessageProcessor::handle_initialized_client_request, MessageProcessor::connection_closed, ThreadRequestProcessor, TurnRequestProcessor]
related: [subsys.app-server.session-management, subsys.app-server.transport, subsys.app-server.client-libs, tool.dynamic-tools, subsys.core.thread-queue, subsys.platform.diagnostics, rpc.thread-methods]
evidence: explicit
status: verified
updated: 1cc7e23612
---

`MessageProcessor` 是当前 app-server 的 typed request dispatcher。它持有 account/apps/catalog/config/fs/mcp/plugin/thread/thread-queue/turn 等 specialized processors，并把 JSON-RPC request 或 in-process typed request 统一送进 `handle_client_request`/`handle_initialized_client_request` 分派表。[E: codex-rs/app-server/src/message_processor.rs:140][E: codex-rs/app-server/src/message_processor.rs:148][E: codex-rs/app-server/src/message_processor.rs:166][E: codex-rs/app-server/src/message_processor.rs:167][E: codex-rs/app-server/src/message_processor.rs:168][E: codex-rs/app-server/src/message_processor.rs:625][E: codex-rs/app-server/src/message_processor.rs:665][E: codex-rs/app-server/src/message_processor.rs:688][E: codex-rs/app-server/src/message_processor.rs:1078]

## 能回答的问题

- app-server JSON-RPC request 与 in-process typed request 如何进入同一个分派语义。
- `initialize` 与 initialized-only requests 的边界在哪里。
- `server/diagnostics` 以及 thread/turn/config/fs/account 等 request families 分别由哪些 processor 接管。
- dynamic tools 和 turn input 在进入 core 之前做哪些 app-server 层校验。

## 职责边界

- `process_request` 是 WebSocket/stdio JSON-RPC 路径：它构造 request trace/context，反序列化 `ClientRequest`，再调用 `handle_client_request`；WebSocket caller 传入 `outbound_initialized: None`，避免 shared handler 过早标记 outbound ready。[E: codex-rs/app-server/src/message_processor.rs:625][E: codex-rs/app-server/src/message_processor.rs:658][E: codex-rs/app-server/src/message_processor.rs:665][E: codex-rs/app-server/src/message_processor.rs:670]
- `process_client_request` 是 in-process embedder 的 typed path；它跳过 JSON deserialization，但仍 delegating to `handle_client_request`，并传入 `Some(outbound_initialized)`，因为 in-process 没有 WebSocket transport loop 做 post-initialize bookkeeping。[E: codex-rs/app-server/src/message_processor.rs:688][E: codex-rs/app-server/src/message_processor.rs:721][E: codex-rs/app-server/src/message_processor.rs:726]
- `handle_client_request` 先截获 `ClientRequest::Initialize`，调用 initialize processor；其它 request 必须已经 initialized，否则 `dispatch_initialized_client_request` 返回 `Not initialized`，再检查 experimental API gate 和 serialization scope。[E: codex-rs/app-server/src/message_processor.rs:937][E: codex-rs/app-server/src/message_processor.rs:940][E: codex-rs/app-server/src/message_processor.rs:955][E: codex-rs/app-server/src/message_processor.rs:971][E: codex-rs/app-server/src/message_processor.rs:975][E: codex-rs/app-server/src/message_processor.rs:1017]
- initialized dispatcher 直接 match `ClientRequest` 到 specialized processors：`server/diagnostics` 走 `read_server_diagnostics()`，config/external-agent/fs/remote-control 在前半段处理，`modelProvider/capabilities/read` 走 config processor，thread lifecycle 与 `threadSection/*` / `thread/section/move` 在 `ThreadRequestProcessor`，experimental `rollout/compress` 也交给 `thread_processor.rollout_compress()`，queue 的 6 个方法在 `ThreadQueueRequestProcessor`，turn/realtime/review 在 `TurnRequestProcessor`，`project/{list,read,create,import,update,move,delete}` 走 `ProjectRequestProcessor`。Gateway OAuth 三个 client RPC（`account/gatewayOAuth/{read,login,cancel}`）走 `account_processor`；`login` 若连接 opted out `account/gatewayOAuth/changed` 则 invalid request。逐方法 catalog 见 [`rpc.thread-methods`](../../surface/app-server/thread-methods.md)，本节点只记分派边界。[E: codex-rs/app-server/src/message_processor.rs:1129][E: codex-rs/app-server/src/message_processor.rs:1130][E: codex-rs/app-server/src/message_processor.rs:1270][E: codex-rs/app-server/src/message_processor.rs:1358][E: codex-rs/app-server/src/message_processor.rs:1404][E: codex-rs/app-server/src/message_processor.rs:1419][E: codex-rs/app-server/src/message_processor.rs:1431][E: codex-rs/app-server/src/message_processor.rs:1470][E: codex-rs/app-server/src/message_processor.rs:1740][E: codex-rs/app-server/src/message_processor.rs:1745][E: codex-rs/app-server/src/message_processor.rs:1748][E: codex-rs/app-server/src/message_processor.rs:1762]
- `connection_closed` is the domain cleanup boundary after transport state has been removed: it waits for the connection RPC gate to drain with a bounded timeout, then clears pending outgoing requests, fs watches, command/process exec state, and thread subscriptions。[E: codex-rs/app-server/src/message_processor.rs:864][E: codex-rs/app-server/src/message_processor.rs:878][E: codex-rs/app-server/src/message_processor.rs:890][E: codex-rs/app-server/src/message_processor.rs:891][E: codex-rs/app-server/src/message_processor.rs:898]

## 关键 crate/文件

- `codex-rs/app-server/src/message_processor.rs`: top-level request dispatcher, initialize boundary, request serialization, processor wiring。
- `codex-rs/app-server/src/request_processors/diagnostics.rs`: process-local `server/diagnostics` snapshot。
- `codex-rs/app-server/src/external_agent_migration/processor.rs`: 已从 `request_processors/` 移出的 external-agent config/migration request processor。
- `codex-rs/app-server/src/request_processors/thread_processor.rs`: thread start/resume/fork/archive/list/read and dynamic tool validation。
- `codex-rs/app-server/src/request_processors/turn_processor.rs`: turn/start, turn/steer, turn/interrupt, thread/settings/update, realtime/review turn operations。
- `codex-rs/app-server/src/request_processors/account_processor.rs`: account/login/logout/auth status and the debug-only login issuer override。

## 数据模型

- `ConnectionSessionState` contains the per-connection RPC gate and an `OnceLock<InitializedConnectionSessionState>`；initialized state stores experimental API opt-in, opted-out notifications, client name/version, request-attestation capability, and MCP extension flags。[E: codex-rs/app-server/src/message_processor.rs:174][E: codex-rs/app-server/src/message_processor.rs:182][E: codex-rs/app-server/src/message_processor.rs:183][E: codex-rs/app-server/src/message_processor.rs:187][E: codex-rs/app-server/src/message_processor.rs:188]
- `MessageProcessor::new` builds request processors once around process-scoped managers: it creates thread state/watch managers, a config-derived thread store, optional SQLite `QueueStore`，specialized config/external-agent/environment/fs processors, and then stores each processor on `Self`。[E: codex-rs/app-server/src/message_processor.rs:272][E: codex-rs/app-server/src/message_processor.rs:297][E: codex-rs/app-server/src/message_processor.rs:302][E: codex-rs/app-server/src/message_processor.rs:305][E: codex-rs/app-server/src/message_processor.rs:610]
- `ThreadRequestProcessor` owns the thread manager/store, pending unload set, thread state/watch managers, background tasks, and skills watcher; its public entrypoints include `thread_start`。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:445][E: codex-rs/app-server/src/request_processors/thread_processor.rs:453][E: codex-rs/app-server/src/request_processors/thread_processor.rs:454][E: codex-rs/app-server/src/request_processors/thread_processor.rs:526]
- `thread/settings/update` 不走 thread processor，而是 `TurnRequestProcessor::thread_settings_update`。[E: codex-rs/app-server/src/message_processor.rs:1419][E: codex-rs/app-server/src/message_processor.rs:1420]

## 控制流

1. Client sends JSON-RPC request; app-server transport loop calls `MessageProcessor::process_request`, which deserializes `ClientRequest` and registers request context before running handler code。[E: codex-rs/app-server/src/message_processor.rs:625][E: codex-rs/app-server/src/message_processor.rs:658][E: codex-rs/app-server/src/message_processor.rs:665]
2. `initialize` runs before initialized dispatch; if it transitions the session, `thread_processor.connection_initialized` records connection capabilities。[E: codex-rs/app-server/src/message_processor.rs:937][E: codex-rs/app-server/src/message_processor.rs:948][E: codex-rs/app-server/src/message_processor.rs:818]
3. Non-initialize requests become queued initialized requests; requests with a serialization scope enter `request_serialization_queues`，otherwise they spawn immediately。[E: codex-rs/app-server/src/message_processor.rs:1017][E: codex-rs/app-server/src/message_processor.rs:1022]
4. queue 的 6 个方法走 `ThreadQueueRequestProcessor`；其余 thread methods（含 `thread/revert`、`thread/approveGuardianDeniedAction`、`thread/timeline/list`，以及 `threadSection/{list,create,update,delete}` 与 `thread/section/move`）交给 `ThreadRequestProcessor`。`ClientRequest::RolloutCompress`（wire `rollout/compress`）同样走 `thread_processor.rollout_compress()`。`thread/rollback` RPC 已删除。[E: codex-rs/app-server/src/message_processor.rs:1358][E: codex-rs/app-server/src/message_processor.rs:1383][E: codex-rs/app-server/src/message_processor.rs:1404][E: codex-rs/app-server/src/message_processor.rs:1407][E: codex-rs/app-server/src/message_processor.rs:1431][E: codex-rs/app-server/src/message_processor.rs:1457][E: codex-rs/app-server/src/message_processor.rs:1516][E: codex-rs/app-server/src/message_processor.rs:1673]
5. turn methods are handed to `TurnRequestProcessor`；`TurnStart`、injected items、steer/interrupt、`turn/settings/update`、realtime operations 和 review start 都在 turn branch。[E: codex-rs/app-server/src/message_processor.rs:1419][E: codex-rs/app-server/src/message_processor.rs:1638]
6. `project/{list,read,create,import,update,move,delete}` 交给 `ProjectRequestProcessor`，与 thread store 分离。[E: codex-rs/app-server/src/message_processor.rs:162][E: codex-rs/app-server/src/message_processor.rs:1470][E: codex-rs/app-server/src/message_processor.rs:1489]
7. When transport reports a closed connection, the outer loop first closes admission through the RPC gate and then invokes `MessageProcessor::connection_closed`；the method drains in-flight RPCs before fan-out cleanup。[E: codex-rs/app-server/src/lib.rs:1150][E: codex-rs/app-server/src/lib.rs:1158][E: codex-rs/app-server/src/message_processor.rs:864][E: codex-rs/app-server/src/message_processor.rs:878][I]

## 设计动机与权衡

- JSON-RPC and in-process requests share the same typed dispatch path, but differ in readiness handoff: WebSocket JSON-RPC waits for `lib.rs` to mirror session state and send initialize notifications, while in-process can mark outbound ready in the shared handler。[E: codex-rs/app-server/src/message_processor.rs:665][E: codex-rs/app-server/src/message_processor.rs:670][E: codex-rs/app-server/src/message_processor.rs:721][E: codex-rs/app-server/src/message_processor.rs:726][I]
- dynamic tools validation lives with thread request handling. The validator enforces identifier shape/length, rejects `mcp`/`mcp__` names, rejects reserved Responses API namespaces, requires namespaced deferred tools, and parses tool input schema through `codex_tools::parse_tool_input_schema`。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:417][E: codex-rs/app-server/src/request_processors/thread_processor.rs:420]
- `server/diagnostics` 故意不经过 thread/account processors：它只读 `codex_diagnostics::snapshot()` 的 process/gauge 快照。[E: codex-rs/app-server/src/message_processor.rs:1129][E: codex-rs/app-server/src/request_processors/diagnostics.rs:5][E: codex-rs/app-server/src/request_processors/diagnostics.rs:6]

## gotcha

- `ClientRequest::Initialize` inside `handle_initialized_client_request` is a panic path; initialize must be handled by `handle_client_request` before initialized dispatch。[E: codex-rs/app-server/src/message_processor.rs:937][E: codex-rs/app-server/src/message_processor.rs:1079][E: codex-rs/app-server/src/message_processor.rs:1080]
- Client notifications are currently logged only; there is no notification-side domain dispatch in `MessageProcessor`。[E: codex-rs/app-server/src/message_processor.rs:738][E: codex-rs/app-server/src/message_processor.rs:741]
- current dispatcher additionally routes `environment/status`、`app/read`、`app/installed`，而不是把它们折叠到旧的 info/list handlers。[E: codex-rs/app-server/src/message_processor.rs:1222][E: codex-rs/app-server/src/message_processor.rs:1583][E: codex-rs/app-server/src/message_processor.rs:1587]
- `CODEX_APP_SERVER_LOGIN_ISSUER` is a debug-only account login hook in `request_processors/account_processor.rs`，不是 message processor 文件内的常量。[E: codex-rs/app-server/src/request_processors/account_processor.rs:28]

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
