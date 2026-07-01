---
id: subsys.app-server.session-management
title: 会话管理
kind: subsystem
tier: T2
source:
  - codex-rs/app-server/src/lib.rs
  - codex-rs/app-server/src/message_processor.rs
  - codex-rs/app-server/src/transport.rs
  - codex-rs/app-server/src/thread_state.rs
  - codex-rs/app-server/src/thread_status.rs
  - codex-rs/app-server/src/request_processors/thread_processor.rs
  - codex-rs/app-server/src/request_processors/thread_lifecycle.rs
  - codex-rs/app-server/src/outgoing_message.rs
symbols:
  - run_main_with_transport_options
  - MessageProcessor
  - ConnectionSessionState
  - ConnectionState
  - ThreadStateManager
  - ThreadWatchManager
related:
  - subsys.app-server.message-processor
  - subsys.app-server.transport
  - subsys.app-server.client-libs
evidence: explicit
status: verified
updated: db887d03e1
---

app-server 会话管理现在分成三层：`lib.rs` 启动 transport、remote-control、outbound router 和 processor loop；`MessageProcessor` 维护 per-connection initialize/session state；`ThreadRequestProcessor`、`ThreadStateManager` 与 `ThreadWatchManager` 管 thread subscription、listener attach、running/waiting status 和 idle unload [E: codex-rs/app-server/src/lib.rs:714][E: codex-rs/app-server/src/lib.rs:780][E: codex-rs/app-server/src/lib.rs:822][E: codex-rs/app-server/src/lib.rs:877][E: codex-rs/app-server/src/message_processor.rs:215][E: codex-rs/app-server/src/request_processors/thread_processor.rs:350][E: codex-rs/app-server/src/thread_state.rs:291][E: codex-rs/app-server/src/thread_status.rs:20]。

## 能回答的问题

- stdio / unix socket / WebSocket / remote-control transport 如何进入同一个 processor loop。
- `initialize` 如何更新 per-connection session，并何时把 outbound connection 标为 ready。
- app-server 如何维护 live connections、thread subscriptions、thread status watchers 和 pending unloads。
- connection close、graceful shutdown、thread-created auto attach 分别走哪些 cleanup/attach paths。

## 职责边界

- `run_main_with_transport_options` 根据 transport 启动 stdio、Unix socket、WebSocket 或 `Off`；随后构造 auth manager，并按 policy/state-db/explicit request 启动 remote control [E: codex-rs/app-server/src/lib.rs:720][E: codex-rs/app-server/src/lib.rs:724][E: codex-rs/app-server/src/lib.rs:731][E: codex-rs/app-server/src/lib.rs:740][E: codex-rs/app-server/src/lib.rs:750][E: codex-rs/app-server/src/lib.rs:754][E: codex-rs/app-server/src/lib.rs:757][E: codex-rs/app-server/src/lib.rs:780][E: codex-rs/app-server/src/lib.rs:793]。
- outbound router task owns `HashMap<ConnectionId, OutboundConnectionState>`; it handles opened/closed/disconnect-all control events and routes `OutgoingEnvelope` to connection writers [E: codex-rs/app-server/src/lib.rs:822][E: codex-rs/app-server/src/lib.rs:823][E: codex-rs/app-server/src/lib.rs:832][E: codex-rs/app-server/src/lib.rs:840][E: codex-rs/app-server/src/lib.rs:851][E: codex-rs/app-server/src/lib.rs:854][E: codex-rs/app-server/src/lib.rs:866][E: codex-rs/app-server/src/lib.rs:870]。
- processor loop owns connection state and `MessageProcessor`; it reacts to `TransportEvent::ConnectionOpened`, `ConnectionClosed`, and `IncomingMessage`, then separately listens for remote-control status and thread-created broadcasts [E: codex-rs/app-server/src/lib.rs:877][E: codex-rs/app-server/src/lib.rs:887][E: codex-rs/app-server/src/lib.rs:905][E: codex-rs/app-server/src/lib.rs:907][E: codex-rs/app-server/src/lib.rs:953][E: codex-rs/app-server/src/lib.rs:992][E: codex-rs/app-server/src/lib.rs:1014][E: codex-rs/app-server/src/lib.rs:1107][E: codex-rs/app-server/src/lib.rs:1121]。
- app-server-local transport is now a single `transport.rs` glue file; it re-exports `codex_app_server_transport` and defines only connection/outbound state plus outbound filtering/routing glue [E: codex-rs/app-server/src/transport.rs:15][E: codex-rs/app-server/src/transport.rs:27][E: codex-rs/app-server/src/transport.rs:31][E: codex-rs/app-server/src/transport.rs:35][E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:62][E: codex-rs/app-server/src/transport.rs:98][E: codex-rs/app-server/src/transport.rs:198]。

## 关键 crate/文件

- `codex-rs/app-server/src/lib.rs`: runtime startup, transport acceptor wiring, outbound loop, processor loop, graceful drain。
- `codex-rs/app-server/src/message_processor.rs`: connection session state, initialize boundary, cleanup hooks。
- `codex-rs/app-server/src/transport.rs`: re-exports current transport crate and stores outbound connection state。
- `codex-rs/app-server/src/thread_state.rs`: live connection to subscribed thread mapping and listener state。
- `codex-rs/app-server/src/thread_status.rs`: loaded/running/waiting status derivation。
- `codex-rs/app-server/src/request_processors/thread_lifecycle.rs`: listener attach, idle unload, shutdown/remove/ThreadClosed path。

## 数据模型

- `ConnectionState::new` receives `_origin` but stores only outbound flags, opted-out notification set, and a fresh `ConnectionSessionState`; origin is not retained in app-server-local connection state [E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:40][E: codex-rs/app-server/src/transport.rs:41][E: codex-rs/app-server/src/transport.rs:42][E: codex-rs/app-server/src/transport.rs:43][E: codex-rs/app-server/src/transport.rs:47][E: codex-rs/app-server/src/transport.rs:48][E: codex-rs/app-server/src/transport.rs:53][E: codex-rs/app-server/src/transport.rs:57]。
- `ConnectionSessionState` gates initialized requests with an RPC gate and `OnceLock`; initialized state includes experimental API flag, notification opt-outs, client name/version, and request-attestation [E: codex-rs/app-server/src/message_processor.rs:215][E: codex-rs/app-server/src/message_processor.rs:215][E: codex-rs/app-server/src/message_processor.rs:216][E: codex-rs/app-server/src/message_processor.rs:217][E: codex-rs/app-server/src/message_processor.rs:221][E: codex-rs/app-server/src/message_processor.rs:222][E: codex-rs/app-server/src/message_processor.rs:223][E: codex-rs/app-server/src/message_processor.rs:224][E: codex-rs/app-server/src/message_processor.rs:225][E: codex-rs/app-server/src/message_processor.rs:226]。
- `ThreadState` stores pending interrupt/rollback state, turn summary/history, listener cancel/command channel, raw-events opt-in, listener generation, listener thread weak handle, and watch registration [E: codex-rs/app-server/src/thread_state.rs:78][E: codex-rs/app-server/src/thread_state.rs:78][E: codex-rs/app-server/src/thread_state.rs:79][E: codex-rs/app-server/src/thread_state.rs:80][E: codex-rs/app-server/src/thread_state.rs:81][E: codex-rs/app-server/src/thread_state.rs:83][E: codex-rs/app-server/src/thread_state.rs:84][E: codex-rs/app-server/src/thread_state.rs:85][E: codex-rs/app-server/src/thread_state.rs:87][E: codex-rs/app-server/src/thread_state.rs:88][E: codex-rs/app-server/src/thread_state.rs:89][E: codex-rs/app-server/src/thread_state.rs:90]。
- `ThreadStateManagerInner` maps live connections, thread entries, and reverse connection-to-thread subscriptions; `ConnectionCapabilities` currently carries request attestation into thread listener state [E: codex-rs/app-server/src/thread_state.rs:279][E: codex-rs/app-server/src/thread_state.rs:279][E: codex-rs/app-server/src/thread_state.rs:280][E: codex-rs/app-server/src/thread_state.rs:281][E: codex-rs/app-server/src/thread_state.rs:282][E: codex-rs/app-server/src/thread_state.rs:286][E: codex-rs/app-server/src/thread_state.rs:286][E: codex-rs/app-server/src/thread_state.rs:287]。
- `ThreadWatchManager` tracks runtime facts and exposes status/running-turn watchers; `RuntimeFacts` records loaded/running/waiting/error inputs and `loaded_thread_status` maps those facts to protocol `ThreadStatus` [E: codex-rs/app-server/src/thread_status.rs:20][E: codex-rs/app-server/src/thread_status.rs:21][E: codex-rs/app-server/src/thread_status.rs:23][E: codex-rs/app-server/src/thread_status.rs:302][E: codex-rs/app-server/src/thread_status.rs:303][E: codex-rs/app-server/src/thread_status.rs:304][E: codex-rs/app-server/src/thread_status.rs:421][E: codex-rs/app-server/src/thread_status.rs:422][E: codex-rs/app-server/src/thread_status.rs:423][E: codex-rs/app-server/src/thread_status.rs:424][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:426][E: codex-rs/app-server/src/thread_status.rs:429]。

## 控制流

1. On `ConnectionOpened`, processor loop creates outbound initialized/experimental/opt-out flags, sends `OutboundControlEvent::Opened`, and inserts a `ConnectionState` keyed by connection id [E: codex-rs/app-server/src/lib.rs:953][E: codex-rs/app-server/src/lib.rs:959][E: codex-rs/app-server/src/lib.rs:960][E: codex-rs/app-server/src/lib.rs:962][E: codex-rs/app-server/src/lib.rs:964][E: codex-rs/app-server/src/lib.rs:982][E: codex-rs/app-server/src/lib.rs:984]。
2. On incoming request, processor calls `MessageProcessor::process_request`, mirrors session opt-outs/experimental flag back to outbound state, then if initialize just completed sends connection-scoped initialize notifications, emits current remote-control status, calls `connection_initialized`, and finally marks outbound initialized [E: codex-rs/app-server/src/lib.rs:1014][E: codex-rs/app-server/src/lib.rs:1023][E: codex-rs/app-server/src/lib.rs:1031][E: codex-rs/app-server/src/lib.rs:1034][E: codex-rs/app-server/src/lib.rs:1054][E: codex-rs/app-server/src/lib.rs:1055][E: codex-rs/app-server/src/lib.rs:1060][E: codex-rs/app-server/src/lib.rs:1068][E: codex-rs/app-server/src/lib.rs:1076]。
3. On `ConnectionClosed`, processor removes local connection state, closes the RPC gate, notifies outbound loop, spawns processor cleanup, and exits in stdio single-client mode when no connections remain [E: codex-rs/app-server/src/lib.rs:992][E: codex-rs/app-server/src/lib.rs:993][E: codex-rs/app-server/src/lib.rs:996][E: codex-rs/app-server/src/lib.rs:997][E: codex-rs/app-server/src/lib.rs:1001][E: codex-rs/app-server/src/lib.rs:1003][E: codex-rs/app-server/src/lib.rs:1010]。
4. `MessageProcessor::connection_closed` drains the per-connection RPC gate with timeout, then cleans outgoing requests, fs watches, command/process exec state, and thread subscriptions [E: codex-rs/app-server/src/message_processor.rs:780][E: codex-rs/app-server/src/message_processor.rs:785][E: codex-rs/app-server/src/message_processor.rs:798][E: codex-rs/app-server/src/message_processor.rs:799][E: codex-rs/app-server/src/message_processor.rs:800][E: codex-rs/app-server/src/message_processor.rs:803][E: codex-rs/app-server/src/message_processor.rs:806]。
5. When a core thread is created, the processor gathers initialized connection ids and calls `try_attach_thread_listener`; the thread processor upserts watch state and calls `ensure_conversation_listener` best-effort for each initialized connection [E: codex-rs/app-server/src/lib.rs:1121][E: codex-rs/app-server/src/lib.rs:1124][E: codex-rs/app-server/src/lib.rs:1126][E: codex-rs/app-server/src/lib.rs:1130][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2578][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2584][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2592][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2604][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2606]。
6. Idle unload watches both subscriber presence and thread active status; unload cancels pending server-to-client requests, removes thread state, waits for core thread shutdown, removes watch state, and sends `ThreadClosed` only on successful complete shutdown [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:19][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:33][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:37][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:55][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:76][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:407][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:420][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:423][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:426][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:427][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:436][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:439][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:442]。

## 设计动机与权衡

- `lib.rs` keeps outbound writing in a separate router task; this isolates slow writes from request dispatch while still allowing per-connection disconnect for transports that provide a disconnect token [E: codex-rs/app-server/src/lib.rs:822][E: codex-rs/app-server/src/lib.rs:866][E: codex-rs/app-server/src/transport.rs:154][E: codex-rs/app-server/src/transport.rs:157][E: codex-rs/app-server/src/transport.rs:161][I]。
- WebSocket JSON-RPC initialize readiness is finalized outside the shared handler: `process_request` passes `None`, then `lib.rs` mirrors session state, sends initialize notifications, calls `connection_initialized`, and stores outbound initialized true [E: codex-rs/app-server/src/message_processor.rs:626][E: codex-rs/app-server/src/message_processor.rs:630][E: codex-rs/app-server/src/lib.rs:1031][E: codex-rs/app-server/src/lib.rs:1054][E: codex-rs/app-server/src/lib.rs:1055][E: codex-rs/app-server/src/lib.rs:1068][E: codex-rs/app-server/src/lib.rs:1076][I]。
- `resolve_thread_status` upgrades Idle/NotLoaded to Active when a live in-progress turn is known, explicitly covering the race where running-turn events arrive before watch runtime state is observed [E: codex-rs/app-server/src/thread_status.rs:285][E: codex-rs/app-server/src/thread_status.rs:292][E: codex-rs/app-server/src/thread_status.rs:292][E: codex-rs/app-server/src/thread_status.rs:293]。

## gotcha

- `ConnectionOrigin` still exists in `app-server-transport`, but app-server-local `ConnectionState::new` names it `_origin` and does not retain it; do not infer per-origin request authorization from this layer [E: codex-rs/app-server/src/transport.rs:18][E: codex-rs/app-server/src/transport.rs:47][E: codex-rs/app-server/src/transport.rs:48][E: codex-rs/app-server/src/transport.rs:53][E: codex-rs/app-server/src/transport.rs:57][I]。
- `ensure_conversation_listener` checks `pending_thread_unloads` while subscribing; if a thread is closing, it returns an invalid request asking the caller to retry after close [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:138][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:157][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:158][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:159][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:165]。
- `ThreadWatchActiveGuard` decrements pending permission/user-input counters asynchronously in `Drop`; leaked guards would keep waiting flags visible, which follows from the drop-triggered release path and `loaded_thread_status` active flag derivation [E: codex-rs/app-server/src/thread_status.rs:26][E: codex-rs/app-server/src/thread_status.rs:48][E: codex-rs/app-server/src/thread_status.rs:53][E: codex-rs/app-server/src/thread_status.rs:435][E: codex-rs/app-server/src/thread_status.rs:438][E: codex-rs/app-server/src/thread_status.rs:442][I]。

## Sources

- `codex-rs/app-server/src/lib.rs`
- `codex-rs/app-server/src/message_processor.rs`
- `codex-rs/app-server/src/transport.rs`
- `codex-rs/app-server/src/thread_state.rs`
- `codex-rs/app-server/src/thread_status.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`
- `codex-rs/app-server/src/request_processors/thread_lifecycle.rs`
- `codex-rs/app-server/src/outgoing_message.rs`

## 相关

- `subsys.app-server.message-processor`
- `subsys.app-server.transport`
- `subsys.app-server.client-libs`
