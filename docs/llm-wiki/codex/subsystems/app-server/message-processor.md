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
updated: 5670360009
---

`MessageProcessor` 是当前 app-server 的 typed request dispatcher。它持有 account/apps/catalog/config/fs/mcp/plugin/thread/turn 等 specialized processors，并把 JSON-RPC request 或 in-process typed request 统一送进 `handle_client_request`/`handle_initialized_client_request` 分派表 [E: codex-rs/app-server/src/message_processor.rs:185][E: codex-rs/app-server/src/message_processor.rs:189][E: codex-rs/app-server/src/message_processor.rs:194][E: codex-rs/app-server/src/message_processor.rs:198][E: codex-rs/app-server/src/message_processor.rs:207][E: codex-rs/app-server/src/message_processor.rs:208][E: codex-rs/app-server/src/message_processor.rs:580][E: codex-rs/app-server/src/message_processor.rs:615][E: codex-rs/app-server/src/message_processor.rs:638][E: codex-rs/app-server/src/message_processor.rs:666][E: codex-rs/app-server/src/message_processor.rs:924]。

## 能回答的问题

- app-server JSON-RPC request 与 in-process typed request 如何进入同一个分派语义。
- `initialize` 与 initialized-only requests 的边界在哪里。
- thread/turn/config/fs/account 等 request families 分别由哪些 request processor 接管。
- dynamic tools 和 turn input 在进入 core 之前做哪些 app-server 层校验。

## 职责边界

- `process_request` 是 WebSocket/stdio JSON-RPC 路径：它构造 request trace/context，反序列化 `ClientRequest`，再调用 `handle_client_request`；WebSocket caller 传入 `outbound_initialized: None`，避免 shared handler 过早标记 outbound ready [E: codex-rs/app-server/src/message_processor.rs:587][E: codex-rs/app-server/src/message_processor.rs:597][E: codex-rs/app-server/src/message_processor.rs:608][E: codex-rs/app-server/src/message_processor.rs:611][E: codex-rs/app-server/src/message_processor.rs:615][E: codex-rs/app-server/src/message_processor.rs:619]。
- `process_client_request` 是 in-process embedder 的 typed path；它跳过 JSON deserialization，但仍 delegating to `handle_client_request`，并传入 `Some(outbound_initialized)`，因为 in-process 没有 WebSocket transport loop 做 post-initialize bookkeeping [E: codex-rs/app-server/src/message_processor.rs:634][E: codex-rs/app-server/src/message_processor.rs:636][E: codex-rs/app-server/src/message_processor.rs:638][E: codex-rs/app-server/src/message_processor.rs:662][E: codex-rs/app-server/src/message_processor.rs:666][E: codex-rs/app-server/src/message_processor.rs:670]。
- `handle_client_request` 先截获 `ClientRequest::Initialize`，调用 initialize processor；其它 request 必须已经 initialized，否则 `dispatch_initialized_client_request` 返回 `Not initialized`，再检查 experimental API gate 和 serialization scope [E: codex-rs/app-server/src/message_processor.rs:816][E: codex-rs/app-server/src/message_processor.rs:828][E: codex-rs/app-server/src/message_processor.rs:830][E: codex-rs/app-server/src/message_processor.rs:839][E: codex-rs/app-server/src/message_processor.rs:852][E: codex-rs/app-server/src/message_processor.rs:868][E: codex-rs/app-server/src/message_processor.rs:872][E: codex-rs/app-server/src/message_processor.rs:884]。
- initialized dispatcher 直接 match `ClientRequest` 到 specialized processors：config/external-agent/fs/remote-control 在前半段处理，thread lifecycle 在 `ThreadRequestProcessor`，turn/realtime/review 在 `TurnRequestProcessor`，account/MCP 等也在同一分派表中 [E: codex-rs/app-server/src/message_processor.rs:938][E: codex-rs/app-server/src/message_processor.rs:942][E: codex-rs/app-server/src/message_processor.rs:952][E: codex-rs/app-server/src/message_processor.rs:978][E: codex-rs/app-server/src/message_processor.rs:1026][E: codex-rs/app-server/src/message_processor.rs:1076][E: codex-rs/app-server/src/message_processor.rs:1092][E: codex-rs/app-server/src/message_processor.rs:1102][E: codex-rs/app-server/src/message_processor.rs:1301][E: codex-rs/app-server/src/message_processor.rs:1314][E: codex-rs/app-server/src/message_processor.rs:1350][E: codex-rs/app-server/src/message_processor.rs:1379]。

## 关键 crate/文件

- `codex-rs/app-server/src/message_processor.rs`: top-level request dispatcher, initialize boundary, request serialization, processor wiring。
- `codex-rs/app-server/src/request_processors/thread_processor.rs`: thread start/resume/fork/archive/list/read and dynamic tool validation。
- `codex-rs/app-server/src/request_processors/turn_processor.rs`: turn/start, turn/steer, turn/interrupt, thread/settings/update, realtime/review turn operations。
- `codex-rs/app-server/src/request_processors/account_processor.rs`: account/login/logout/auth status and the debug-only login issuer override。

## 数据模型

- `ConnectionSessionState` contains the per-connection RPC gate and an `OnceLock<InitializedConnectionSessionState>`; initialized state stores experimental API opt-in, opted-out notifications, client name/version, and request-attestation capability [E: codex-rs/app-server/src/message_processor.rs:213][E: codex-rs/app-server/src/message_processor.rs:214][E: codex-rs/app-server/src/message_processor.rs:215][E: codex-rs/app-server/src/message_processor.rs:216][E: codex-rs/app-server/src/message_processor.rs:220][E: codex-rs/app-server/src/message_processor.rs:221][E: codex-rs/app-server/src/message_processor.rs:222][E: codex-rs/app-server/src/message_processor.rs:223][E: codex-rs/app-server/src/message_processor.rs:224][E: codex-rs/app-server/src/message_processor.rs:225]。
- `MessageProcessor::new` builds request processors once around process-scoped managers: it creates thread state/watch managers, a config-derived thread store, specialized config/external-agent/environment/fs processors, and then stores each processor on `Self` [E: codex-rs/app-server/src/message_processor.rs:326][E: codex-rs/app-server/src/message_processor.rs:327][E: codex-rs/app-server/src/message_processor.rs:330][E: codex-rs/app-server/src/message_processor.rs:514][E: codex-rs/app-server/src/message_processor.rs:520][E: codex-rs/app-server/src/message_processor.rs:532][E: codex-rs/app-server/src/message_processor.rs:534][E: codex-rs/app-server/src/message_processor.rs:544][E: codex-rs/app-server/src/message_processor.rs:553][E: codex-rs/app-server/src/message_processor.rs:566][E: codex-rs/app-server/src/message_processor.rs:567]。
- `ThreadRequestProcessor` owns the thread manager/store, pending unload set, thread state/watch managers, background tasks, and skills watcher; its public entrypoints include `thread_start`, `thread_unsubscribe`, `thread_resume`, `thread_fork`, and `thread_archive` [E: codex-rs/app-server/src/request_processors/thread_processor.rs:344][E: codex-rs/app-server/src/request_processors/thread_processor.rs:345][E: codex-rs/app-server/src/request_processors/thread_processor.rs:347][E: codex-rs/app-server/src/request_processors/thread_processor.rs:352][E: codex-rs/app-server/src/request_processors/thread_processor.rs:353][E: codex-rs/app-server/src/request_processors/thread_processor.rs:354][E: codex-rs/app-server/src/request_processors/thread_processor.rs:355][E: codex-rs/app-server/src/request_processors/thread_processor.rs:360][E: codex-rs/app-server/src/request_processors/thread_processor.rs:361][E: codex-rs/app-server/src/request_processors/thread_processor.rs:414][E: codex-rs/app-server/src/request_processors/thread_processor.rs:433][E: codex-rs/app-server/src/request_processors/thread_processor.rs:443][E: codex-rs/app-server/src/request_processors/thread_processor.rs:460][E: codex-rs/app-server/src/request_processors/thread_processor.rs:477]。
- `TurnRequestProcessor` owns the turn-side view of auth/thread/outgoing/config/state/watch managers; `turn_start` delegates to `turn_start_inner`, which loads a thread, rejects direct input into multi-agent v2 subagents, validates v2 input size, maps v2 input items, builds thread-setting overrides, submits `Op::UserInput`, starts memories startup when there is input, records the turn id, and returns an in-progress `Turn` [E: codex-rs/app-server/src/request_processors/turn_processor.rs:11][E: codex-rs/app-server/src/request_processors/turn_processor.rs:12][E: codex-rs/app-server/src/request_processors/turn_processor.rs:14][E: codex-rs/app-server/src/request_processors/turn_processor.rs:21][E: codex-rs/app-server/src/request_processors/turn_processor.rs:98][E: codex-rs/app-server/src/request_processors/turn_processor.rs:105][E: codex-rs/app-server/src/request_processors/turn_processor.rs:388][E: codex-rs/app-server/src/request_processors/turn_processor.rs:394][E: codex-rs/app-server/src/request_processors/turn_processor.rs:396][E: codex-rs/app-server/src/request_processors/turn_processor.rs:417][E: codex-rs/app-server/src/request_processors/turn_processor.rs:430][E: codex-rs/app-server/src/request_processors/turn_processor.rs:451][E: codex-rs/app-server/src/request_processors/turn_processor.rs:459][E: codex-rs/app-server/src/request_processors/turn_processor.rs:472][E: codex-rs/app-server/src/request_processors/turn_processor.rs:484][E: codex-rs/app-server/src/request_processors/turn_processor.rs:487]。

## 控制流

1. Client sends JSON-RPC request; app-server transport loop calls `MessageProcessor::process_request`, which deserializes `ClientRequest` and registers request context before running handler code [E: codex-rs/app-server/src/message_processor.rs:580][E: codex-rs/app-server/src/message_processor.rs:603][E: codex-rs/app-server/src/message_processor.rs:608][E: codex-rs/app-server/src/message_processor.rs:702][E: codex-rs/app-server/src/message_processor.rs:703]。
2. `initialize` runs before initialized dispatch; if it transitions the session, `thread_processor.connection_initialized` records connection capabilities [E: codex-rs/app-server/src/message_processor.rs:828][E: codex-rs/app-server/src/message_processor.rs:830][E: codex-rs/app-server/src/message_processor.rs:839][E: codex-rs/app-server/src/message_processor.rs:840][E: codex-rs/app-server/src/message_processor.rs:843]。
3. Non-initialize requests become queued initialized requests; requests with a serialization scope enter `request_serialization_queues`, otherwise they spawn immediately [E: codex-rs/app-server/src/message_processor.rs:884][E: codex-rs/app-server/src/message_processor.rs:891][E: codex-rs/app-server/src/message_processor.rs:911][E: codex-rs/app-server/src/message_processor.rs:913][E: codex-rs/app-server/src/message_processor.rs:917]。
4. thread methods are handed to `ThreadRequestProcessor`; `ThreadStart`, `ThreadResume`, `ThreadFork`, `ThreadArchive`, `ThreadDelete`, list/read/turn listing, and shell/guardian helpers all sit in this same dispatcher block [E: codex-rs/app-server/src/message_processor.rs:1076][E: codex-rs/app-server/src/message_processor.rs:1092][E: codex-rs/app-server/src/message_processor.rs:1102][E: codex-rs/app-server/src/message_processor.rs:1112][E: codex-rs/app-server/src/message_processor.rs:1117][E: codex-rs/app-server/src/message_processor.rs:1192][E: codex-rs/app-server/src/message_processor.rs:1201][E: codex-rs/app-server/src/message_processor.rs:1204][E: codex-rs/app-server/src/message_processor.rs:1210]。
5. turn methods are handed to `TurnRequestProcessor`; `TurnStart`, injected items, steer/interrupt, realtime operations, and review start are grouped in the turn branch [E: codex-rs/app-server/src/message_processor.rs:1301][E: codex-rs/app-server/src/message_processor.rs:1311][E: codex-rs/app-server/src/message_processor.rs:1314][E: codex-rs/app-server/src/message_processor.rs:1317][E: codex-rs/app-server/src/message_processor.rs:1322][E: codex-rs/app-server/src/message_processor.rs:1350]。

## 设计动机与权衡

- JSON-RPC and in-process requests share the same typed dispatch path, but differ in readiness handoff: WebSocket JSON-RPC waits for `lib.rs` to mirror session state and send initialize notifications, while in-process can mark outbound ready in the shared handler [E: codex-rs/app-server/src/message_processor.rs:611][E: codex-rs/app-server/src/message_processor.rs:615][E: codex-rs/app-server/src/message_processor.rs:662][E: codex-rs/app-server/src/message_processor.rs:666][I]。
- dynamic tools validation now lives with thread request handling. The validator enforces identifier shape/length, rejects `mcp`/`mcp__` names, rejects reserved Responses API namespaces, requires namespaced deferred tools, and parses tool input schema through `codex_tools::parse_tool_input_schema` [E: codex-rs/app-server/src/request_processors/thread_processor.rs:197][E: codex-rs/app-server/src/request_processors/thread_processor.rs:201][E: codex-rs/app-server/src/request_processors/thread_processor.rs:202][E: codex-rs/app-server/src/request_processors/thread_processor.rs:261][E: codex-rs/app-server/src/request_processors/thread_processor.rs:262][E: codex-rs/app-server/src/request_processors/thread_processor.rs:273][E: codex-rs/app-server/src/request_processors/thread_processor.rs:279][E: codex-rs/app-server/src/request_processors/thread_processor.rs:317][E: codex-rs/app-server/src/request_processors/thread_processor.rs:320]。
- turn settings reject `permissions` combined with `sandboxPolicy` and warn clients to wait for `thread/settings/updated` or combine dependent partial updates, so settings updates are acknowledged before downstream observation is guaranteed [E: codex-rs/app-server/src/request_processors/turn_processor.rs:555][E: codex-rs/app-server/src/request_processors/turn_processor.rs:556][E: codex-rs/app-server/src/request_processors/turn_processor.rs:565][E: codex-rs/app-server/src/request_processors/turn_processor.rs:566][E: codex-rs/app-server/src/request_processors/turn_processor.rs:567][I]。

## gotcha

- `ClientRequest::Initialize` inside `handle_initialized_client_request` is a panic path; initialize must be handled by `handle_client_request` before initialized dispatch [E: codex-rs/app-server/src/message_processor.rs:828][E: codex-rs/app-server/src/message_processor.rs:938][E: codex-rs/app-server/src/message_processor.rs:939][E: codex-rs/app-server/src/message_processor.rs:940]。
- Client notifications are currently logged only; there is no notification-side domain dispatch in `MessageProcessor` [E: codex-rs/app-server/src/message_processor.rs:682][E: codex-rs/app-server/src/message_processor.rs:683][E: codex-rs/app-server/src/message_processor.rs:689][E: codex-rs/app-server/src/message_processor.rs:690]。
- `CODEX_APP_SERVER_LOGIN_ISSUER` is no longer in a monolithic message processor file; it is a debug-only account login hook in `request_processors/account_processor.rs` [E: codex-rs/app-server/src/request_processors/account_processor.rs:8][E: codex-rs/app-server/src/request_processors/account_processor.rs:9][E: codex-rs/app-server/src/request_processors/account_processor.rs:10][E: codex-rs/app-server/src/request_processors/account_processor.rs:353][E: codex-rs/app-server/src/request_processors/account_processor.rs:356][E: codex-rs/app-server/src/request_processors/account_processor.rs:359]。

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
