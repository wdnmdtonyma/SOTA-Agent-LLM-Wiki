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
updated: 4d7a5c7c73
---

`MessageProcessor` 是当前 app-server 的 typed request dispatcher。它持有 account/apps/catalog/config/fs/mcp/plugin/thread/turn 等 specialized processors，并把 JSON-RPC request 或 in-process typed request 统一送进 `handle_client_request`/`handle_initialized_client_request` 分派表 [E: codex-rs/app-server/src/message_processor.rs:102][E: codex-rs/app-server/src/message_processor.rs:106][E: codex-rs/app-server/src/message_processor.rs:111][E: codex-rs/app-server/src/message_processor.rs:115][E: codex-rs/app-server/src/message_processor.rs:124][E: codex-rs/app-server/src/message_processor.rs:125][E: codex-rs/app-server/src/message_processor.rs:518][E: codex-rs/app-server/src/message_processor.rs:553][E: codex-rs/app-server/src/message_processor.rs:576][E: codex-rs/app-server/src/message_processor.rs:604][E: codex-rs/app-server/src/message_processor.rs:864]。

## 能回答的问题

- app-server JSON-RPC request 与 in-process typed request 如何进入同一个分派语义。
- `initialize` 与 initialized-only requests 的边界在哪里。
- thread/turn/config/fs/account 等 request families 分别由哪些 request processor 接管。
- dynamic tools 和 turn input 在进入 core 之前做哪些 app-server 层校验。

## 职责边界

- `process_request` 是 WebSocket/stdio JSON-RPC 路径：它构造 request trace/context，反序列化 `ClientRequest`，再调用 `handle_client_request`；WebSocket caller 传入 `outbound_initialized: None`，避免 shared handler 过早标记 outbound ready [E: codex-rs/app-server/src/message_processor.rs:525][E: codex-rs/app-server/src/message_processor.rs:535][E: codex-rs/app-server/src/message_processor.rs:546][E: codex-rs/app-server/src/message_processor.rs:553][E: codex-rs/app-server/src/message_processor.rs:553]。
- `process_client_request` 是 in-process embedder 的 typed path；它跳过 JSON deserialization，但仍 delegating to `handle_client_request`，并传入 `Some(outbound_initialized)`，因为 in-process 没有 WebSocket transport loop 做 post-initialize bookkeeping [E: codex-rs/app-server/src/message_processor.rs:576][E: codex-rs/app-server/src/message_processor.rs:604][E: codex-rs/app-server/src/message_processor.rs:576][E: codex-rs/app-server/src/message_processor.rs:608][E: codex-rs/app-server/src/message_processor.rs:604][E: codex-rs/app-server/src/message_processor.rs:608]。
- `handle_client_request` 先截获 `ClientRequest::Initialize`，调用 initialize processor；其它 request 必须已经 initialized，否则 `dispatch_initialized_client_request` 返回 `Not initialized`，再检查 experimental API gate 和 serialization scope [E: codex-rs/app-server/src/message_processor.rs:754][E: codex-rs/app-server/src/message_processor.rs:766][E: codex-rs/app-server/src/message_processor.rs:768][E: codex-rs/app-server/src/message_processor.rs:777][E: codex-rs/app-server/src/message_processor.rs:790][E: codex-rs/app-server/src/message_processor.rs:806][E: codex-rs/app-server/src/message_processor.rs:810][E: codex-rs/app-server/src/message_processor.rs:822]。
- initialized dispatcher 直接 match `ClientRequest` 到 specialized processors：config/external-agent/fs/remote-control 在前半段处理，thread lifecycle 在 `ThreadRequestProcessor`，turn/realtime/review 在 `TurnRequestProcessor`，account/MCP 等也在同一分派表中 [E: codex-rs/app-server/src/message_processor.rs:879][E: codex-rs/app-server/src/message_processor.rs:883][E: codex-rs/app-server/src/message_processor.rs:893][E: codex-rs/app-server/src/message_processor.rs:919][E: codex-rs/app-server/src/message_processor.rs:973][E: codex-rs/app-server/src/message_processor.rs:1023][E: codex-rs/app-server/src/message_processor.rs:1040][E: codex-rs/app-server/src/message_processor.rs:1052][E: codex-rs/app-server/src/message_processor.rs:1264][E: codex-rs/app-server/src/message_processor.rs:1279][E: codex-rs/app-server/src/message_processor.rs:1315][E: codex-rs/app-server/src/message_processor.rs:1344]。

## 关键 crate/文件

- `codex-rs/app-server/src/message_processor.rs`: top-level request dispatcher, initialize boundary, request serialization, processor wiring。
- `codex-rs/app-server/src/external_agent_migration/processor.rs`: 已从 `request_processors/` 移出的 external-agent config/migration request processor。
- `codex-rs/app-server/src/request_processors/thread_processor.rs`: thread start/resume/fork/archive/list/read and dynamic tool validation。
- `codex-rs/app-server/src/request_processors/turn_processor.rs`: turn/start, turn/steer, turn/interrupt, thread/settings/update, realtime/review turn operations。
- `codex-rs/app-server/src/request_processors/account_processor.rs`: account/login/logout/auth status and the debug-only login issuer override。

## 数据模型

- `ConnectionSessionState` contains the per-connection RPC gate and an `OnceLock<InitializedConnectionSessionState>`; initialized state stores experimental API opt-in, opted-out notifications, client name/version, and request-attestation capability [E: codex-rs/app-server/src/message_processor.rs:131][E: codex-rs/app-server/src/message_processor.rs:131][E: codex-rs/app-server/src/message_processor.rs:132][E: codex-rs/app-server/src/message_processor.rs:133][E: codex-rs/app-server/src/message_processor.rs:137][E: codex-rs/app-server/src/message_processor.rs:138][E: codex-rs/app-server/src/message_processor.rs:139][E: codex-rs/app-server/src/message_processor.rs:140][E: codex-rs/app-server/src/message_processor.rs:141][E: codex-rs/app-server/src/message_processor.rs:142]。
- `MessageProcessor::new` builds request processors once around process-scoped managers: it creates thread state/watch managers, a config-derived thread store, one shared request-serialization queue set, specialized config/external-agent/environment/fs processors, and then stores each processor on `Self`；external-agent processor 的实现已归入 `app-server/src/external_agent_migration/`。[E: codex-rs/app-server/src/message_processor.rs:246][E: codex-rs/app-server/src/message_processor.rs:250][E: codex-rs/app-server/src/message_processor.rs:311][E: codex-rs/app-server/src/message_processor.rs:318][E: codex-rs/app-server/src/message_processor.rs:319][E: codex-rs/app-server/src/message_processor.rs:458][E: codex-rs/app-server/src/message_processor.rs:459][E: codex-rs/app-server/src/message_processor.rs:470][E: codex-rs/app-server/src/message_processor.rs:472][E: codex-rs/app-server/src/message_processor.rs:482][E: codex-rs/app-server/src/message_processor.rs:493][E: codex-rs/app-server/src/external_agent_migration/processor.rs:1]。
- `ThreadRequestProcessor` owns the thread manager/store, pending unload set, thread state/watch managers, background tasks, and skills watcher; its public entrypoints include `thread_start`, `thread_unsubscribe`, `thread_resume`, `thread_fork`, and `thread_archive` [E: codex-rs/app-server/src/request_processors/thread_processor.rs:380][E: codex-rs/app-server/src/request_processors/thread_processor.rs:380][E: codex-rs/app-server/src/request_processors/thread_processor.rs:382][E: codex-rs/app-server/src/request_processors/thread_processor.rs:387][E: codex-rs/app-server/src/request_processors/thread_processor.rs:388][E: codex-rs/app-server/src/request_processors/thread_processor.rs:389][E: codex-rs/app-server/src/request_processors/thread_processor.rs:390][E: codex-rs/app-server/src/request_processors/thread_processor.rs:395][E: codex-rs/app-server/src/request_processors/thread_processor.rs:396][E: codex-rs/app-server/src/request_processors/thread_processor.rs:452][E: codex-rs/app-server/src/request_processors/thread_processor.rs:473][E: codex-rs/app-server/src/request_processors/thread_processor.rs:483][E: codex-rs/app-server/src/request_processors/thread_processor.rs:502][E: codex-rs/app-server/src/request_processors/thread_processor.rs:521]。
- `TurnRequestProcessor` owns the turn-side view of auth/thread/outgoing/config/state/watch managers; `turn_start` delegates to `turn_start_inner`, which loads a thread, rejects direct input into multi-agent v2 subagents, validates v2 input size, maps v2 input items, builds thread-setting overrides, submits `Op::UserInput`, starts memories startup when there is input, records the turn id, and returns an in-progress `Turn` [E: codex-rs/app-server/src/request_processors/turn_processor.rs:86][E: codex-rs/app-server/src/request_processors/turn_processor.rs:86][E: codex-rs/app-server/src/request_processors/turn_processor.rs:89][E: codex-rs/app-server/src/request_processors/turn_processor.rs:96][E: codex-rs/app-server/src/request_processors/turn_processor.rs:174][E: codex-rs/app-server/src/request_processors/turn_processor.rs:183][E: codex-rs/app-server/src/request_processors/turn_processor.rs:481][E: codex-rs/app-server/src/request_processors/turn_processor.rs:487][E: codex-rs/app-server/src/request_processors/turn_processor.rs:489][E: codex-rs/app-server/src/request_processors/turn_processor.rs:522][E: codex-rs/app-server/src/request_processors/turn_processor.rs:539][E: codex-rs/app-server/src/request_processors/turn_processor.rs:567][E: codex-rs/app-server/src/request_processors/turn_processor.rs:574][E: codex-rs/app-server/src/request_processors/turn_processor.rs:587][E: codex-rs/app-server/src/request_processors/turn_processor.rs:602][E: codex-rs/app-server/src/request_processors/turn_processor.rs:605]。

## 控制流

1. Client sends JSON-RPC request; app-server transport loop calls `MessageProcessor::process_request`, which deserializes `ClientRequest` and registers request context before running handler code [E: codex-rs/app-server/src/message_processor.rs:518][E: codex-rs/app-server/src/message_processor.rs:541][E: codex-rs/app-server/src/message_processor.rs:546][E: codex-rs/app-server/src/message_processor.rs:640][E: codex-rs/app-server/src/message_processor.rs:641]。
2. `initialize` runs before initialized dispatch; if it transitions the session, `thread_processor.connection_initialized` records connection capabilities [E: codex-rs/app-server/src/message_processor.rs:766][E: codex-rs/app-server/src/message_processor.rs:768][E: codex-rs/app-server/src/message_processor.rs:777][E: codex-rs/app-server/src/message_processor.rs:778][E: codex-rs/app-server/src/message_processor.rs:781]。
3. Non-initialize requests become queued initialized requests; requests with a serialization scope enter `request_serialization_queues`, otherwise they spawn immediately [E: codex-rs/app-server/src/message_processor.rs:822][E: codex-rs/app-server/src/message_processor.rs:830][E: codex-rs/app-server/src/message_processor.rs:851][E: codex-rs/app-server/src/message_processor.rs:853][E: codex-rs/app-server/src/message_processor.rs:857]。
4. thread methods are handed to `ThreadRequestProcessor`; start/resume/fork/archive/delete、list/read/turn listing、`thread/search` 与新增的 `thread/searchOccurrences`、shell/guardian helpers 都在同一 dispatcher block。[E: codex-rs/app-server/src/message_processor.rs:1023][E: codex-rs/app-server/src/message_processor.rs:1040][E: codex-rs/app-server/src/message_processor.rs:1052][E: codex-rs/app-server/src/message_processor.rs:1064][E: codex-rs/app-server/src/message_processor.rs:1069][E: codex-rs/app-server/src/message_processor.rs:1144][E: codex-rs/app-server/src/message_processor.rs:1147][E: codex-rs/app-server/src/message_processor.rs:1150][E: codex-rs/app-server/src/message_processor.rs:1158][E: codex-rs/app-server/src/message_processor.rs:1167]。
5. turn methods are handed to `TurnRequestProcessor`; `TurnStart`, injected items, steer/interrupt, realtime operations, and review start are grouped in the turn branch [E: codex-rs/app-server/src/message_processor.rs:1264][E: codex-rs/app-server/src/message_processor.rs:1276][E: codex-rs/app-server/src/message_processor.rs:1279][E: codex-rs/app-server/src/message_processor.rs:1282][E: codex-rs/app-server/src/message_processor.rs:1287][E: codex-rs/app-server/src/message_processor.rs:1315]。

## 设计动机与权衡

- JSON-RPC and in-process requests share the same typed dispatch path, but differ in readiness handoff: WebSocket JSON-RPC waits for `lib.rs` to mirror session state and send initialize notifications, while in-process can mark outbound ready in the shared handler [E: codex-rs/app-server/src/message_processor.rs:553][E: codex-rs/app-server/src/message_processor.rs:553][E: codex-rs/app-server/src/message_processor.rs:608][E: codex-rs/app-server/src/message_processor.rs:604][I]。
- dynamic tools validation now lives with thread request handling. The validator enforces identifier shape/length, rejects `mcp`/`mcp__` names, rejects reserved Responses API namespaces, requires namespaced deferred tools, and parses tool input schema through `codex_tools::parse_tool_input_schema` [E: codex-rs/app-server/src/request_processors/thread_processor.rs:232][E: codex-rs/app-server/src/request_processors/thread_processor.rs:236][E: codex-rs/app-server/src/request_processors/thread_processor.rs:237][E: codex-rs/app-server/src/request_processors/thread_processor.rs:296][E: codex-rs/app-server/src/request_processors/thread_processor.rs:297][E: codex-rs/app-server/src/request_processors/thread_processor.rs:308][E: codex-rs/app-server/src/request_processors/thread_processor.rs:314][E: codex-rs/app-server/src/request_processors/thread_processor.rs:352][E: codex-rs/app-server/src/request_processors/thread_processor.rs:355]。
- turn settings reject `permissions` combined with `sandboxPolicy`；after that, `build_thread_settings_overrides` derives a config snapshot only when permissions are present before computing override state [E: codex-rs/app-server/src/request_processors/turn_processor.rs:702][E: codex-rs/app-server/src/request_processors/turn_processor.rs:703][E: codex-rs/app-server/src/request_processors/turn_processor.rs:714][E: codex-rs/app-server/src/request_processors/turn_processor.rs:715][I]。

## gotcha

- `ClientRequest::Initialize` inside `handle_initialized_client_request` is a panic path; initialize must be handled by `handle_client_request` before initialized dispatch [E: codex-rs/app-server/src/message_processor.rs:766][E: codex-rs/app-server/src/message_processor.rs:879][E: codex-rs/app-server/src/message_processor.rs:880][E: codex-rs/app-server/src/message_processor.rs:881]。
- Client notifications are currently logged only; there is no notification-side domain dispatch in `MessageProcessor` [E: codex-rs/app-server/src/message_processor.rs:620][E: codex-rs/app-server/src/message_processor.rs:623][E: codex-rs/app-server/src/message_processor.rs:627][E: codex-rs/app-server/src/message_processor.rs:630]。
- current dispatcher additionally routes `environment/status`、`app/read`、`app/installed`，而不是把它们折叠到旧的 info/list handlers。[E: codex-rs/app-server/src/message_processor.rs:970][E: codex-rs/app-server/src/message_processor.rs:1227][E: codex-rs/app-server/src/message_processor.rs:1231]
- `CODEX_APP_SERVER_LOGIN_ISSUER` is no longer in a monolithic message processor file; it is a debug-only account login hook in `request_processors/account_processor.rs` [E: codex-rs/app-server/src/request_processors/account_processor.rs:18][E: codex-rs/app-server/src/request_processors/account_processor.rs:17][E: codex-rs/app-server/src/request_processors/account_processor.rs:18][E: codex-rs/app-server/src/request_processors/account_processor.rs:470][E: codex-rs/app-server/src/request_processors/account_processor.rs:473][E: codex-rs/app-server/src/request_processors/account_processor.rs:476]。

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
