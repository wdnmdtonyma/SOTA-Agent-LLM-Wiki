---
id: subsys.app-server.message-processor
title: Message processor
kind: subsystem
tier: T2
source:
  - codex-rs/app-server/src/message_processor.rs
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
related:
  - subsys.app-server.session-management
  - subsys.app-server.transport
  - subsys.app-server.client-libs
  - tool.dynamic-tools
evidence: explicit
status: verified
updated: db887d03e1
---

`MessageProcessor` 是当前 app-server 的 typed request dispatcher。它持有 account/apps/catalog/config/fs/mcp/plugin/thread/turn 等 specialized processors，并把 JSON-RPC request 或 in-process typed request 统一送进 `handle_client_request`/`handle_initialized_client_request` 分派表 [E: codex-rs/app-server/src/message_processor.rs:186][E: codex-rs/app-server/src/message_processor.rs:190][E: codex-rs/app-server/src/message_processor.rs:195][E: codex-rs/app-server/src/message_processor.rs:199][E: codex-rs/app-server/src/message_processor.rs:208][E: codex-rs/app-server/src/message_processor.rs:209][E: codex-rs/app-server/src/message_processor.rs:591][E: codex-rs/app-server/src/message_processor.rs:626][E: codex-rs/app-server/src/message_processor.rs:649][E: codex-rs/app-server/src/message_processor.rs:677][E: codex-rs/app-server/src/message_processor.rs:937]。

## 能回答的问题

- app-server JSON-RPC request 与 in-process typed request 如何进入同一个分派语义。
- `initialize` 与 initialized-only requests 的边界在哪里。
- thread/turn/config/fs/account 等 request families 分别由哪些 request processor 接管。
- dynamic tools 和 turn input 在进入 core 之前做哪些 app-server 层校验。

## 职责边界

- `process_request` 是 WebSocket/stdio JSON-RPC 路径：它构造 request trace/context，反序列化 `ClientRequest`，再调用 `handle_client_request`；WebSocket caller 传入 `outbound_initialized: None`，避免 shared handler 过早标记 outbound ready [E: codex-rs/app-server/src/message_processor.rs:598][E: codex-rs/app-server/src/message_processor.rs:608][E: codex-rs/app-server/src/message_processor.rs:619][E: codex-rs/app-server/src/message_processor.rs:626][E: codex-rs/app-server/src/message_processor.rs:626][E: codex-rs/app-server/src/message_processor.rs:630]。
- `process_client_request` 是 in-process embedder 的 typed path；它跳过 JSON deserialization，但仍 delegating to `handle_client_request`，并传入 `Some(outbound_initialized)`，因为 in-process 没有 WebSocket transport loop 做 post-initialize bookkeeping [E: codex-rs/app-server/src/message_processor.rs:649][E: codex-rs/app-server/src/message_processor.rs:677][E: codex-rs/app-server/src/message_processor.rs:649][E: codex-rs/app-server/src/message_processor.rs:681][E: codex-rs/app-server/src/message_processor.rs:677][E: codex-rs/app-server/src/message_processor.rs:681]。
- `handle_client_request` 先截获 `ClientRequest::Initialize`，调用 initialize processor；其它 request 必须已经 initialized，否则 `dispatch_initialized_client_request` 返回 `Not initialized`，再检查 experimental API gate 和 serialization scope [E: codex-rs/app-server/src/message_processor.rs:827][E: codex-rs/app-server/src/message_processor.rs:839][E: codex-rs/app-server/src/message_processor.rs:841][E: codex-rs/app-server/src/message_processor.rs:850][E: codex-rs/app-server/src/message_processor.rs:863][E: codex-rs/app-server/src/message_processor.rs:879][E: codex-rs/app-server/src/message_processor.rs:883][E: codex-rs/app-server/src/message_processor.rs:895]。
- initialized dispatcher 直接 match `ClientRequest` 到 specialized processors：config/external-agent/fs/remote-control 在前半段处理，thread lifecycle 在 `ThreadRequestProcessor`，turn/realtime/review 在 `TurnRequestProcessor`，account/MCP 等也在同一分派表中 [E: codex-rs/app-server/src/message_processor.rs:952][E: codex-rs/app-server/src/message_processor.rs:956][E: codex-rs/app-server/src/message_processor.rs:966][E: codex-rs/app-server/src/message_processor.rs:992][E: codex-rs/app-server/src/message_processor.rs:1043][E: codex-rs/app-server/src/message_processor.rs:1093][E: codex-rs/app-server/src/message_processor.rs:1110][E: codex-rs/app-server/src/message_processor.rs:1122][E: codex-rs/app-server/src/message_processor.rs:1323][E: codex-rs/app-server/src/message_processor.rs:1338][E: codex-rs/app-server/src/message_processor.rs:1374][E: codex-rs/app-server/src/message_processor.rs:1403]。

## 关键 crate/文件

- `codex-rs/app-server/src/message_processor.rs`: top-level request dispatcher, initialize boundary, request serialization, processor wiring。
- `codex-rs/app-server/src/request_processors/thread_processor.rs`: thread start/resume/fork/archive/list/read and dynamic tool validation。
- `codex-rs/app-server/src/request_processors/turn_processor.rs`: turn/start, turn/steer, turn/interrupt, thread/settings/update, realtime/review turn operations。
- `codex-rs/app-server/src/request_processors/account_processor.rs`: account/login/logout/auth status and the debug-only login issuer override。

## 数据模型

- `ConnectionSessionState` contains the per-connection RPC gate and an `OnceLock<InitializedConnectionSessionState>`; initialized state stores experimental API opt-in, opted-out notifications, client name/version, and request-attestation capability [E: codex-rs/app-server/src/message_processor.rs:215][E: codex-rs/app-server/src/message_processor.rs:215][E: codex-rs/app-server/src/message_processor.rs:216][E: codex-rs/app-server/src/message_processor.rs:217][E: codex-rs/app-server/src/message_processor.rs:221][E: codex-rs/app-server/src/message_processor.rs:222][E: codex-rs/app-server/src/message_processor.rs:223][E: codex-rs/app-server/src/message_processor.rs:224][E: codex-rs/app-server/src/message_processor.rs:225][E: codex-rs/app-server/src/message_processor.rs:226]。
- `MessageProcessor::new` builds request processors once around process-scoped managers: it creates thread state/watch managers, a config-derived thread store, specialized config/external-agent/environment/fs processors, and then stores each processor on `Self` [E: codex-rs/app-server/src/message_processor.rs:333][E: codex-rs/app-server/src/message_processor.rs:337][E: codex-rs/app-server/src/message_processor.rs:337][E: codex-rs/app-server/src/message_processor.rs:525][E: codex-rs/app-server/src/message_processor.rs:531][E: codex-rs/app-server/src/message_processor.rs:543][E: codex-rs/app-server/src/message_processor.rs:545][E: codex-rs/app-server/src/message_processor.rs:555][E: codex-rs/app-server/src/message_processor.rs:564][E: codex-rs/app-server/src/message_processor.rs:577][E: codex-rs/app-server/src/message_processor.rs:578]。
- `ThreadRequestProcessor` owns the thread manager/store, pending unload set, thread state/watch managers, background tasks, and skills watcher; its public entrypoints include `thread_start`, `thread_unsubscribe`, `thread_resume`, `thread_fork`, and `thread_archive` [E: codex-rs/app-server/src/request_processors/thread_processor.rs:350][E: codex-rs/app-server/src/request_processors/thread_processor.rs:350][E: codex-rs/app-server/src/request_processors/thread_processor.rs:352][E: codex-rs/app-server/src/request_processors/thread_processor.rs:357][E: codex-rs/app-server/src/request_processors/thread_processor.rs:358][E: codex-rs/app-server/src/request_processors/thread_processor.rs:359][E: codex-rs/app-server/src/request_processors/thread_processor.rs:360][E: codex-rs/app-server/src/request_processors/thread_processor.rs:365][E: codex-rs/app-server/src/request_processors/thread_processor.rs:366][E: codex-rs/app-server/src/request_processors/thread_processor.rs:419][E: codex-rs/app-server/src/request_processors/thread_processor.rs:440][E: codex-rs/app-server/src/request_processors/thread_processor.rs:450][E: codex-rs/app-server/src/request_processors/thread_processor.rs:469][E: codex-rs/app-server/src/request_processors/thread_processor.rs:488]。
- `TurnRequestProcessor` owns the turn-side view of auth/thread/outgoing/config/state/watch managers; `turn_start` delegates to `turn_start_inner`, which loads a thread, rejects direct input into multi-agent v2 subagents, validates v2 input size, maps v2 input items, builds thread-setting overrides, submits `Op::UserInput`, starts memories startup when there is input, records the turn id, and returns an in-progress `Turn` [E: codex-rs/app-server/src/request_processors/turn_processor.rs:69][E: codex-rs/app-server/src/request_processors/turn_processor.rs:69][E: codex-rs/app-server/src/request_processors/turn_processor.rs:71][E: codex-rs/app-server/src/request_processors/turn_processor.rs:78][E: codex-rs/app-server/src/request_processors/turn_processor.rs:155][E: codex-rs/app-server/src/request_processors/turn_processor.rs:164][E: codex-rs/app-server/src/request_processors/turn_processor.rs:450][E: codex-rs/app-server/src/request_processors/turn_processor.rs:456][E: codex-rs/app-server/src/request_processors/turn_processor.rs:458][E: codex-rs/app-server/src/request_processors/turn_processor.rs:488][E: codex-rs/app-server/src/request_processors/turn_processor.rs:500][E: codex-rs/app-server/src/request_processors/turn_processor.rs:522][E: codex-rs/app-server/src/request_processors/turn_processor.rs:529][E: codex-rs/app-server/src/request_processors/turn_processor.rs:542][E: codex-rs/app-server/src/request_processors/turn_processor.rs:554][E: codex-rs/app-server/src/request_processors/turn_processor.rs:557]。

## 控制流

1. Client sends JSON-RPC request; app-server transport loop calls `MessageProcessor::process_request`, which deserializes `ClientRequest` and registers request context before running handler code [E: codex-rs/app-server/src/message_processor.rs:591][E: codex-rs/app-server/src/message_processor.rs:614][E: codex-rs/app-server/src/message_processor.rs:619][E: codex-rs/app-server/src/message_processor.rs:713][E: codex-rs/app-server/src/message_processor.rs:714]。
2. `initialize` runs before initialized dispatch; if it transitions the session, `thread_processor.connection_initialized` records connection capabilities [E: codex-rs/app-server/src/message_processor.rs:839][E: codex-rs/app-server/src/message_processor.rs:841][E: codex-rs/app-server/src/message_processor.rs:850][E: codex-rs/app-server/src/message_processor.rs:851][E: codex-rs/app-server/src/message_processor.rs:854]。
3. Non-initialize requests become queued initialized requests; requests with a serialization scope enter `request_serialization_queues`, otherwise they spawn immediately [E: codex-rs/app-server/src/message_processor.rs:895][E: codex-rs/app-server/src/message_processor.rs:903][E: codex-rs/app-server/src/message_processor.rs:924][E: codex-rs/app-server/src/message_processor.rs:926][E: codex-rs/app-server/src/message_processor.rs:930]。
4. thread methods are handed to `ThreadRequestProcessor`; `ThreadStart`, `ThreadResume`, `ThreadFork`, `ThreadArchive`, `ThreadDelete`, list/read/turn listing, and shell/guardian helpers all sit in this same dispatcher block [E: codex-rs/app-server/src/message_processor.rs:1093][E: codex-rs/app-server/src/message_processor.rs:1110][E: codex-rs/app-server/src/message_processor.rs:1122][E: codex-rs/app-server/src/message_processor.rs:1134][E: codex-rs/app-server/src/message_processor.rs:1139][E: codex-rs/app-server/src/message_processor.rs:1214][E: codex-rs/app-server/src/message_processor.rs:1223][E: codex-rs/app-server/src/message_processor.rs:1226][E: codex-rs/app-server/src/message_processor.rs:1232]。
5. turn methods are handed to `TurnRequestProcessor`; `TurnStart`, injected items, steer/interrupt, realtime operations, and review start are grouped in the turn branch [E: codex-rs/app-server/src/message_processor.rs:1323][E: codex-rs/app-server/src/message_processor.rs:1335][E: codex-rs/app-server/src/message_processor.rs:1338][E: codex-rs/app-server/src/message_processor.rs:1341][E: codex-rs/app-server/src/message_processor.rs:1346][E: codex-rs/app-server/src/message_processor.rs:1374]。

## 设计动机与权衡

- JSON-RPC and in-process requests share the same typed dispatch path, but differ in readiness handoff: WebSocket JSON-RPC waits for `lib.rs` to mirror session state and send initialize notifications, while in-process can mark outbound ready in the shared handler [E: codex-rs/app-server/src/message_processor.rs:626][E: codex-rs/app-server/src/message_processor.rs:626][E: codex-rs/app-server/src/message_processor.rs:681][E: codex-rs/app-server/src/message_processor.rs:677][I]。
- dynamic tools validation now lives with thread request handling. The validator enforces identifier shape/length, rejects `mcp`/`mcp__` names, rejects reserved Responses API namespaces, requires namespaced deferred tools, and parses tool input schema through `codex_tools::parse_tool_input_schema` [E: codex-rs/app-server/src/request_processors/thread_processor.rs:202][E: codex-rs/app-server/src/request_processors/thread_processor.rs:206][E: codex-rs/app-server/src/request_processors/thread_processor.rs:207][E: codex-rs/app-server/src/request_processors/thread_processor.rs:266][E: codex-rs/app-server/src/request_processors/thread_processor.rs:267][E: codex-rs/app-server/src/request_processors/thread_processor.rs:278][E: codex-rs/app-server/src/request_processors/thread_processor.rs:284][E: codex-rs/app-server/src/request_processors/thread_processor.rs:322][E: codex-rs/app-server/src/request_processors/thread_processor.rs:325]。
- turn settings reject `permissions` combined with `sandboxPolicy`；after that, `build_thread_settings_overrides` derives a config snapshot only when permissions are present before computing override state [E: codex-rs/app-server/src/request_processors/turn_processor.rs:625][E: codex-rs/app-server/src/request_processors/turn_processor.rs:626][E: codex-rs/app-server/src/request_processors/turn_processor.rs:638][E: codex-rs/app-server/src/request_processors/turn_processor.rs:639][I]。

## gotcha

- `ClientRequest::Initialize` inside `handle_initialized_client_request` is a panic path; initialize must be handled by `handle_client_request` before initialized dispatch [E: codex-rs/app-server/src/message_processor.rs:839][E: codex-rs/app-server/src/message_processor.rs:952][E: codex-rs/app-server/src/message_processor.rs:953][E: codex-rs/app-server/src/message_processor.rs:954]。
- Client notifications are currently logged only; there is no notification-side domain dispatch in `MessageProcessor` [E: codex-rs/app-server/src/message_processor.rs:693][E: codex-rs/app-server/src/message_processor.rs:696][E: codex-rs/app-server/src/message_processor.rs:700][E: codex-rs/app-server/src/message_processor.rs:703]。
- `CODEX_APP_SERVER_LOGIN_ISSUER` is no longer in a monolithic message processor file; it is a debug-only account login hook in `request_processors/account_processor.rs` [E: codex-rs/app-server/src/request_processors/account_processor.rs:14][E: codex-rs/app-server/src/request_processors/account_processor.rs:13][E: codex-rs/app-server/src/request_processors/account_processor.rs:14][E: codex-rs/app-server/src/request_processors/account_processor.rs:369][E: codex-rs/app-server/src/request_processors/account_processor.rs:372][E: codex-rs/app-server/src/request_processors/account_processor.rs:375]。

## Sources

- `codex-rs/app-server/src/message_processor.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`
- `codex-rs/app-server/src/request_processors/turn_processor.rs`
- `codex-rs/app-server/src/request_processors/account_processor.rs`

## 相关

- `subsys.app-server.session-management`
- `subsys.app-server.transport`
- `subsys.app-server.client-libs`
- `tool.dynamic-tools`
