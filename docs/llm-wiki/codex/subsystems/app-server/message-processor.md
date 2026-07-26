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
symbols:
  - MessageProcessor
  - MessageProcessor::process_request
  - MessageProcessor::process_client_request
  - MessageProcessor::handle_initialized_client_request
  - ThreadRequestProcessor
  - TurnRequestProcessor
  - ExternalAgentConfigRequestProcessor
related:
  - subsys.app-server.session-management
  - subsys.app-server.transport
  - subsys.app-server.client-libs
  - tool.dynamic-tools
evidence: explicit
status: verified
updated: 61a44880a8
---

`MessageProcessor` 是当前 app-server 的 typed request dispatcher。它持有 account/apps/catalog/config/fs/mcp/plugin/thread/turn 等 specialized processors，并把 JSON-RPC request 或 in-process typed request 统一送进 `handle_client_request`/`handle_initialized_client_request` 分派表 [E: codex-rs/app-server/src/message_processor.rs:97][E: codex-rs/app-server/src/message_processor.rs:101][E: codex-rs/app-server/src/message_processor.rs:106][E: codex-rs/app-server/src/message_processor.rs:110][E: codex-rs/app-server/src/message_processor.rs:119][E: codex-rs/app-server/src/message_processor.rs:120][E: codex-rs/app-server/src/message_processor.rs:525][E: codex-rs/app-server/src/message_processor.rs:560][E: codex-rs/app-server/src/message_processor.rs:583][E: codex-rs/app-server/src/message_processor.rs:611][E: codex-rs/app-server/src/message_processor.rs:871]。

## 能回答的问题

- app-server JSON-RPC request 与 in-process typed request 如何进入同一个分派语义。
- `initialize` 与 initialized-only requests 的边界在哪里。
- thread/turn/config/fs/account 等 request families 分别由哪些 request processor 接管。
- dynamic tools 和 turn input 在进入 core 之前做哪些 app-server 层校验。

## 职责边界

- `process_request` 是 WebSocket/stdio JSON-RPC 路径：它构造 request trace/context，反序列化 `ClientRequest`，再调用 `handle_client_request`；WebSocket caller 传入 `outbound_initialized: None`，避免 shared handler 过早标记 outbound ready [E: codex-rs/app-server/src/message_processor.rs:532][E: codex-rs/app-server/src/message_processor.rs:542][E: codex-rs/app-server/src/message_processor.rs:553][E: codex-rs/app-server/src/message_processor.rs:560][E: codex-rs/app-server/src/message_processor.rs:560]。
- `process_client_request` 是 in-process embedder 的 typed path；它跳过 JSON deserialization，但仍 delegating to `handle_client_request`，并传入 `Some(outbound_initialized)`，因为 in-process 没有 WebSocket transport loop 做 post-initialize bookkeeping [E: codex-rs/app-server/src/message_processor.rs:583][E: codex-rs/app-server/src/message_processor.rs:611][E: codex-rs/app-server/src/message_processor.rs:583][E: codex-rs/app-server/src/message_processor.rs:615][E: codex-rs/app-server/src/message_processor.rs:611][E: codex-rs/app-server/src/message_processor.rs:615]。
- `handle_client_request` 先截获 `ClientRequest::Initialize`，调用 initialize processor；其它 request 必须已经 initialized，否则 `dispatch_initialized_client_request` 返回 `Not initialized`，再检查 experimental API gate 和 serialization scope [E: codex-rs/app-server/src/message_processor.rs:761][E: codex-rs/app-server/src/message_processor.rs:773][E: codex-rs/app-server/src/message_processor.rs:775][E: codex-rs/app-server/src/message_processor.rs:784][E: codex-rs/app-server/src/message_processor.rs:797][E: codex-rs/app-server/src/message_processor.rs:813][E: codex-rs/app-server/src/message_processor.rs:817][E: codex-rs/app-server/src/message_processor.rs:829]。
- initialized dispatcher 直接 match `ClientRequest` 到 specialized processors：config/external-agent/fs/remote-control 在前半段处理，thread lifecycle 在 `ThreadRequestProcessor`，turn/realtime/review 在 `TurnRequestProcessor`，account/MCP 等也在同一分派表中 [E: codex-rs/app-server/src/message_processor.rs:886][E: codex-rs/app-server/src/message_processor.rs:890][E: codex-rs/app-server/src/message_processor.rs:900][E: codex-rs/app-server/src/message_processor.rs:931][E: codex-rs/app-server/src/message_processor.rs:985][E: codex-rs/app-server/src/message_processor.rs:1035][E: codex-rs/app-server/src/message_processor.rs:1052][E: codex-rs/app-server/src/message_processor.rs:1064][E: codex-rs/app-server/src/message_processor.rs:1276][E: codex-rs/app-server/src/message_processor.rs:1291][E: codex-rs/app-server/src/message_processor.rs:1327][E: codex-rs/app-server/src/message_processor.rs:1356]。

## 关键 crate/文件

- `codex-rs/app-server/src/message_processor.rs`: top-level request dispatcher, initialize boundary, request serialization, processor wiring。
- `codex-rs/app-server/src/external_agent_migration/processor.rs`: 已从 `request_processors/` 移出的 external-agent config/migration request processor。
- `codex-rs/app-server/src/request_processors/thread_processor.rs`: thread start/resume/fork/archive/list/read and dynamic tool validation。
- `codex-rs/app-server/src/request_processors/turn_processor.rs`: turn/start, turn/steer, turn/interrupt, thread/settings/update, realtime/review turn operations。
- `codex-rs/app-server/src/request_processors/account_processor.rs`: account/login/logout/auth status and the debug-only login issuer override。

## 数据模型

- `ConnectionSessionState` contains the per-connection RPC gate and an `OnceLock<InitializedConnectionSessionState>`; initialized state stores experimental API opt-in, opted-out notifications, client name/version, and request-attestation capability [E: codex-rs/app-server/src/message_processor.rs:126][E: codex-rs/app-server/src/message_processor.rs:126][E: codex-rs/app-server/src/message_processor.rs:127][E: codex-rs/app-server/src/message_processor.rs:128][E: codex-rs/app-server/src/message_processor.rs:132][E: codex-rs/app-server/src/message_processor.rs:133][E: codex-rs/app-server/src/message_processor.rs:134][E: codex-rs/app-server/src/message_processor.rs:135][E: codex-rs/app-server/src/message_processor.rs:136][E: codex-rs/app-server/src/message_processor.rs:137]。
- `MessageProcessor::new` builds request processors once around process-scoped managers: it creates thread state/watch managers, a config-derived thread store, one shared request-serialization queue set, specialized config/external-agent/environment/fs processors, and then stores each processor on `Self`；external-agent processor 的实现已归入 `app-server/src/external_agent_migration/`。[E: codex-rs/app-server/src/message_processor.rs:243][E: codex-rs/app-server/src/message_processor.rs:247][E: codex-rs/app-server/src/message_processor.rs:318][E: codex-rs/app-server/src/message_processor.rs:325][E: codex-rs/app-server/src/message_processor.rs:326][E: codex-rs/app-server/src/message_processor.rs:465][E: codex-rs/app-server/src/message_processor.rs:466][E: codex-rs/app-server/src/message_processor.rs:477][E: codex-rs/app-server/src/message_processor.rs:479][E: codex-rs/app-server/src/message_processor.rs:489][E: codex-rs/app-server/src/message_processor.rs:500][E: codex-rs/app-server/src/external_agent_migration/processor.rs:1]。
- `ThreadRequestProcessor` owns the thread manager/store, pending unload set, thread state/watch managers, background tasks, and skills watcher; its public entrypoints include `thread_start`, `thread_unsubscribe`, `thread_resume`, `thread_fork`, and `thread_archive` [E: codex-rs/app-server/src/request_processors/thread_processor.rs:374][E: codex-rs/app-server/src/request_processors/thread_processor.rs:374][E: codex-rs/app-server/src/request_processors/thread_processor.rs:376][E: codex-rs/app-server/src/request_processors/thread_processor.rs:381][E: codex-rs/app-server/src/request_processors/thread_processor.rs:382][E: codex-rs/app-server/src/request_processors/thread_processor.rs:383][E: codex-rs/app-server/src/request_processors/thread_processor.rs:384][E: codex-rs/app-server/src/request_processors/thread_processor.rs:389][E: codex-rs/app-server/src/request_processors/thread_processor.rs:390][E: codex-rs/app-server/src/request_processors/thread_processor.rs:446][E: codex-rs/app-server/src/request_processors/thread_processor.rs:467][E: codex-rs/app-server/src/request_processors/thread_processor.rs:477][E: codex-rs/app-server/src/request_processors/thread_processor.rs:496][E: codex-rs/app-server/src/request_processors/thread_processor.rs:515]。
- `TurnRequestProcessor` owns the turn-side view of auth/thread/outgoing/config/state/watch managers; `turn_start` delegates to `turn_start_inner`, which loads a thread, rejects direct input into multi-agent v2 subagents, validates v2 input size, maps v2 input items, builds thread-setting overrides, submits `Op::UserInput`, starts memories startup when there is input, records the turn id, and returns an in-progress `Turn` [E: codex-rs/app-server/src/request_processors/turn_processor.rs:87][E: codex-rs/app-server/src/request_processors/turn_processor.rs:87][E: codex-rs/app-server/src/request_processors/turn_processor.rs:90][E: codex-rs/app-server/src/request_processors/turn_processor.rs:97][E: codex-rs/app-server/src/request_processors/turn_processor.rs:175][E: codex-rs/app-server/src/request_processors/turn_processor.rs:184][E: codex-rs/app-server/src/request_processors/turn_processor.rs:482][E: codex-rs/app-server/src/request_processors/turn_processor.rs:488][E: codex-rs/app-server/src/request_processors/turn_processor.rs:490][E: codex-rs/app-server/src/request_processors/turn_processor.rs:523][E: codex-rs/app-server/src/request_processors/turn_processor.rs:540][E: codex-rs/app-server/src/request_processors/turn_processor.rs:568][E: codex-rs/app-server/src/request_processors/turn_processor.rs:575][E: codex-rs/app-server/src/request_processors/turn_processor.rs:588][E: codex-rs/app-server/src/request_processors/turn_processor.rs:603][E: codex-rs/app-server/src/request_processors/turn_processor.rs:606]。

## 控制流

1. Client sends JSON-RPC request; app-server transport loop calls `MessageProcessor::process_request`, which deserializes `ClientRequest` and registers request context before running handler code [E: codex-rs/app-server/src/message_processor.rs:525][E: codex-rs/app-server/src/message_processor.rs:548][E: codex-rs/app-server/src/message_processor.rs:553][E: codex-rs/app-server/src/message_processor.rs:647][E: codex-rs/app-server/src/message_processor.rs:648]。
2. `initialize` runs before initialized dispatch; if it transitions the session, `thread_processor.connection_initialized` records connection capabilities [E: codex-rs/app-server/src/message_processor.rs:773][E: codex-rs/app-server/src/message_processor.rs:775][E: codex-rs/app-server/src/message_processor.rs:784][E: codex-rs/app-server/src/message_processor.rs:785][E: codex-rs/app-server/src/message_processor.rs:788]。
3. Non-initialize requests become queued initialized requests; requests with a serialization scope enter `request_serialization_queues`, otherwise they spawn immediately [E: codex-rs/app-server/src/message_processor.rs:829][E: codex-rs/app-server/src/message_processor.rs:837][E: codex-rs/app-server/src/message_processor.rs:858][E: codex-rs/app-server/src/message_processor.rs:860][E: codex-rs/app-server/src/message_processor.rs:864]。
4. thread methods are handed to `ThreadRequestProcessor`; start/resume/fork/archive/delete、list/read/turn listing、`thread/search` 与新增的 `thread/searchOccurrences`、shell/guardian helpers 都在同一 dispatcher block。[E: codex-rs/app-server/src/message_processor.rs:1035][E: codex-rs/app-server/src/message_processor.rs:1052][E: codex-rs/app-server/src/message_processor.rs:1064][E: codex-rs/app-server/src/message_processor.rs:1076][E: codex-rs/app-server/src/message_processor.rs:1081][E: codex-rs/app-server/src/message_processor.rs:1156][E: codex-rs/app-server/src/message_processor.rs:1159][E: codex-rs/app-server/src/message_processor.rs:1162][E: codex-rs/app-server/src/message_processor.rs:1170][E: codex-rs/app-server/src/message_processor.rs:1179]。
5. turn methods are handed to `TurnRequestProcessor`; `TurnStart`, injected items, steer/interrupt, realtime operations, and review start are grouped in the turn branch [E: codex-rs/app-server/src/message_processor.rs:1276][E: codex-rs/app-server/src/message_processor.rs:1288][E: codex-rs/app-server/src/message_processor.rs:1291][E: codex-rs/app-server/src/message_processor.rs:1294][E: codex-rs/app-server/src/message_processor.rs:1299][E: codex-rs/app-server/src/message_processor.rs:1327]。

## 设计动机与权衡

- JSON-RPC and in-process requests share the same typed dispatch path, but differ in readiness handoff: WebSocket JSON-RPC waits for `lib.rs` to mirror session state and send initialize notifications, while in-process can mark outbound ready in the shared handler [E: codex-rs/app-server/src/message_processor.rs:560][E: codex-rs/app-server/src/message_processor.rs:560][E: codex-rs/app-server/src/message_processor.rs:615][E: codex-rs/app-server/src/message_processor.rs:611][I]。
- dynamic tools validation now lives with thread request handling. The validator enforces identifier shape/length, rejects `mcp`/`mcp__` names, rejects reserved Responses API namespaces, requires namespaced deferred tools, and parses tool input schema through `codex_tools::parse_tool_input_schema` [E: codex-rs/app-server/src/request_processors/thread_processor.rs:226][E: codex-rs/app-server/src/request_processors/thread_processor.rs:230][E: codex-rs/app-server/src/request_processors/thread_processor.rs:231][E: codex-rs/app-server/src/request_processors/thread_processor.rs:290][E: codex-rs/app-server/src/request_processors/thread_processor.rs:291][E: codex-rs/app-server/src/request_processors/thread_processor.rs:302][E: codex-rs/app-server/src/request_processors/thread_processor.rs:308][E: codex-rs/app-server/src/request_processors/thread_processor.rs:346][E: codex-rs/app-server/src/request_processors/thread_processor.rs:349]。
- turn settings reject `permissions` combined with `sandboxPolicy`；after that, `build_thread_settings_overrides` derives a config snapshot only when permissions are present before computing override state [E: codex-rs/app-server/src/request_processors/turn_processor.rs:703][E: codex-rs/app-server/src/request_processors/turn_processor.rs:704][E: codex-rs/app-server/src/request_processors/turn_processor.rs:715][E: codex-rs/app-server/src/request_processors/turn_processor.rs:716][I]。

## gotcha

- `ClientRequest::Initialize` inside `handle_initialized_client_request` is a panic path; initialize must be handled by `handle_client_request` before initialized dispatch [E: codex-rs/app-server/src/message_processor.rs:773][E: codex-rs/app-server/src/message_processor.rs:886][E: codex-rs/app-server/src/message_processor.rs:887][E: codex-rs/app-server/src/message_processor.rs:888]。
- Client notifications are currently logged only; there is no notification-side domain dispatch in `MessageProcessor` [E: codex-rs/app-server/src/message_processor.rs:627][E: codex-rs/app-server/src/message_processor.rs:630][E: codex-rs/app-server/src/message_processor.rs:634][E: codex-rs/app-server/src/message_processor.rs:637]。
- current dispatcher additionally routes `environment/status`、`app/read`、`app/installed`，而不是把它们折叠到旧的 info/list handlers。[E: codex-rs/app-server/src/message_processor.rs:982][E: codex-rs/app-server/src/message_processor.rs:1239][E: codex-rs/app-server/src/message_processor.rs:1243]
- `CODEX_APP_SERVER_LOGIN_ISSUER` is no longer in a monolithic message processor file; it is a debug-only account login hook in `request_processors/account_processor.rs` [E: codex-rs/app-server/src/request_processors/account_processor.rs:18][E: codex-rs/app-server/src/request_processors/account_processor.rs:17][E: codex-rs/app-server/src/request_processors/account_processor.rs:18][E: codex-rs/app-server/src/request_processors/account_processor.rs:473][E: codex-rs/app-server/src/request_processors/account_processor.rs:476][E: codex-rs/app-server/src/request_processors/account_processor.rs:479]。

## Sources

- `codex-rs/app-server/src/message_processor.rs`
- `codex-rs/app-server/src/external_agent_migration/processor.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`
- `codex-rs/app-server/src/request_processors/turn_processor.rs`
- `codex-rs/app-server/src/request_processors/account_processor.rs`

## 相关

- `subsys.app-server.session-management`
- `subsys.app-server.transport`
- `subsys.app-server.client-libs`
- `tool.dynamic-tools`
