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
updated: 5670360009
---

app-server 会话管理现在分成三层：`lib.rs` 启动 transport、remote-control、outbound router 和 processor loop；`MessageProcessor` 维护 per-connection initialize/session state；`ThreadRequestProcessor`、`ThreadStateManager` 与 `ThreadWatchManager` 管 thread subscription、listener attach、running/waiting status 和 idle unload [E: codex-rs/app-server/src/lib.rs:711][E: codex-rs/app-server/src/lib.rs:777][E: codex-rs/app-server/src/lib.rs:819][E: codex-rs/app-server/src/lib.rs:874][E: codex-rs/app-server/src/message_processor.rs:214][E: codex-rs/app-server/src/request_processors/thread_processor.rs:345][E: codex-rs/app-server/src/thread_state.rs:287][E: codex-rs/app-server/src/thread_status.rs:20]。

## 能回答的问题

- stdio / unix socket / WebSocket / remote-control transport 如何进入同一个 processor loop。
- `initialize` 如何更新 per-connection session，并何时把 outbound connection 标为 ready。
- app-server 如何维护 live connections、thread subscriptions、thread status watchers 和 pending unloads。
- connection close、graceful shutdown、thread-created auto attach 分别走哪些 cleanup/attach paths。

## 职责边界

- `run_main_with_transport_options` 根据 transport 启动 stdio、Unix socket、WebSocket 或 `Off`；随后构造 auth manager，并按 policy/state-db/explicit request 启动 remote control [E: codex-rs/app-server/src/lib.rs:717][E: codex-rs/app-server/src/lib.rs:721][E: codex-rs/app-server/src/lib.rs:728][E: codex-rs/app-server/src/lib.rs:737][E: codex-rs/app-server/src/lib.rs:747][E: codex-rs/app-server/src/lib.rs:751][E: codex-rs/app-server/src/lib.rs:754][E: codex-rs/app-server/src/lib.rs:777][E: codex-rs/app-server/src/lib.rs:789]。
- outbound router task owns `HashMap<ConnectionId, OutboundConnectionState>`; it handles opened/closed/disconnect-all control events and routes `OutgoingEnvelope` to connection writers [E: codex-rs/app-server/src/lib.rs:819][E: codex-rs/app-server/src/lib.rs:820][E: codex-rs/app-server/src/lib.rs:829][E: codex-rs/app-server/src/lib.rs:837][E: codex-rs/app-server/src/lib.rs:848][E: codex-rs/app-server/src/lib.rs:851][E: codex-rs/app-server/src/lib.rs:863][E: codex-rs/app-server/src/lib.rs:867]。
- processor loop owns connection state and `MessageProcessor`; it reacts to `TransportEvent::ConnectionOpened`, `ConnectionClosed`, and `IncomingMessage`, then separately listens for remote-control status and thread-created broadcasts [E: codex-rs/app-server/src/lib.rs:874][E: codex-rs/app-server/src/lib.rs:884][E: codex-rs/app-server/src/lib.rs:902][E: codex-rs/app-server/src/lib.rs:904][E: codex-rs/app-server/src/lib.rs:950][E: codex-rs/app-server/src/lib.rs:989][E: codex-rs/app-server/src/lib.rs:1011][E: codex-rs/app-server/src/lib.rs:1104][E: codex-rs/app-server/src/lib.rs:1118]。
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
- `ConnectionSessionState` gates initialized requests with an RPC gate and `OnceLock`; initialized state includes experimental API flag, notification opt-outs, client name/version, and request-attestation [E: codex-rs/app-server/src/message_processor.rs:213][E: codex-rs/app-server/src/message_processor.rs:214][E: codex-rs/app-server/src/message_processor.rs:215][E: codex-rs/app-server/src/message_processor.rs:216][E: codex-rs/app-server/src/message_processor.rs:220][E: codex-rs/app-server/src/message_processor.rs:221][E: codex-rs/app-server/src/message_processor.rs:222][E: codex-rs/app-server/src/message_processor.rs:223][E: codex-rs/app-server/src/message_processor.rs:224][E: codex-rs/app-server/src/message_processor.rs:225]。
- `ThreadState` stores pending interrupt/rollback state, turn summary/history, listener cancel/command channel, raw-events opt-in, listener generation, listener thread weak handle, and watch registration [E: codex-rs/app-server/src/thread_state.rs:75][E: codex-rs/app-server/src/thread_state.rs:76][E: codex-rs/app-server/src/thread_state.rs:77][E: codex-rs/app-server/src/thread_state.rs:78][E: codex-rs/app-server/src/thread_state.rs:79][E: codex-rs/app-server/src/thread_state.rs:81][E: codex-rs/app-server/src/thread_state.rs:82][E: codex-rs/app-server/src/thread_state.rs:83][E: codex-rs/app-server/src/thread_state.rs:85][E: codex-rs/app-server/src/thread_state.rs:86][E: codex-rs/app-server/src/thread_state.rs:87][E: codex-rs/app-server/src/thread_state.rs:88]。
- `ThreadStateManagerInner` maps live connections, thread entries, and reverse connection-to-thread subscriptions; `ConnectionCapabilities` currently carries request attestation into thread listener state [E: codex-rs/app-server/src/thread_state.rs:274][E: codex-rs/app-server/src/thread_state.rs:275][E: codex-rs/app-server/src/thread_state.rs:276][E: codex-rs/app-server/src/thread_state.rs:277][E: codex-rs/app-server/src/thread_state.rs:278][E: codex-rs/app-server/src/thread_state.rs:281][E: codex-rs/app-server/src/thread_state.rs:282][E: codex-rs/app-server/src/thread_state.rs:283]。
- `ThreadWatchManager` tracks runtime facts and exposes status/running-turn watchers; `RuntimeFacts` records loaded/running/waiting/error inputs and `loaded_thread_status` maps those facts to protocol `ThreadStatus` [E: codex-rs/app-server/src/thread_status.rs:20][E: codex-rs/app-server/src/thread_status.rs:21][E: codex-rs/app-server/src/thread_status.rs:23][E: codex-rs/app-server/src/thread_status.rs:302][E: codex-rs/app-server/src/thread_status.rs:303][E: codex-rs/app-server/src/thread_status.rs:304][E: codex-rs/app-server/src/thread_status.rs:421][E: codex-rs/app-server/src/thread_status.rs:422][E: codex-rs/app-server/src/thread_status.rs:423][E: codex-rs/app-server/src/thread_status.rs:424][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:426][E: codex-rs/app-server/src/thread_status.rs:429]。

## 控制流

1. On `ConnectionOpened`, processor loop creates outbound initialized/experimental/opt-out flags, sends `OutboundControlEvent::Opened`, and inserts a `ConnectionState` keyed by connection id [E: codex-rs/app-server/src/lib.rs:950][E: codex-rs/app-server/src/lib.rs:956][E: codex-rs/app-server/src/lib.rs:957][E: codex-rs/app-server/src/lib.rs:959][E: codex-rs/app-server/src/lib.rs:961][E: codex-rs/app-server/src/lib.rs:979][E: codex-rs/app-server/src/lib.rs:981]。
2. On incoming request, processor calls `MessageProcessor::process_request`, mirrors session opt-outs/experimental flag back to outbound state, then if initialize just completed sends connection-scoped initialize notifications, emits current remote-control status, calls `connection_initialized`, and finally marks outbound initialized [E: codex-rs/app-server/src/lib.rs:1011][E: codex-rs/app-server/src/lib.rs:1020][E: codex-rs/app-server/src/lib.rs:1028][E: codex-rs/app-server/src/lib.rs:1031][E: codex-rs/app-server/src/lib.rs:1051][E: codex-rs/app-server/src/lib.rs:1052][E: codex-rs/app-server/src/lib.rs:1057][E: codex-rs/app-server/src/lib.rs:1065][E: codex-rs/app-server/src/lib.rs:1073]。
3. On `ConnectionClosed`, processor removes local connection state, closes the RPC gate, notifies outbound loop, spawns processor cleanup, and exits in stdio single-client mode when no connections remain [E: codex-rs/app-server/src/lib.rs:989][E: codex-rs/app-server/src/lib.rs:990][E: codex-rs/app-server/src/lib.rs:993][E: codex-rs/app-server/src/lib.rs:994][E: codex-rs/app-server/src/lib.rs:998][E: codex-rs/app-server/src/lib.rs:1000][E: codex-rs/app-server/src/lib.rs:1007]。
4. `MessageProcessor::connection_closed` drains the per-connection RPC gate with timeout, then cleans outgoing requests, fs watches, command/process exec state, and thread subscriptions [E: codex-rs/app-server/src/message_processor.rs:769][E: codex-rs/app-server/src/message_processor.rs:774][E: codex-rs/app-server/src/message_processor.rs:787][E: codex-rs/app-server/src/message_processor.rs:788][E: codex-rs/app-server/src/message_processor.rs:789][E: codex-rs/app-server/src/message_processor.rs:792][E: codex-rs/app-server/src/message_processor.rs:795]。
5. When a core thread is created, the processor gathers initialized connection ids and calls `try_attach_thread_listener`; the thread processor upserts watch state and calls `ensure_conversation_listener` best-effort for each initialized connection [E: codex-rs/app-server/src/lib.rs:1118][E: codex-rs/app-server/src/lib.rs:1121][E: codex-rs/app-server/src/lib.rs:1123][E: codex-rs/app-server/src/lib.rs:1127][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2465][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2472][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2480][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2492][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2494]。
6. Idle unload watches both subscriber presence and thread active status; unload cancels pending server-to-client requests, removes thread state, waits for core thread shutdown, removes watch state, and sends `ThreadClosed` only on successful complete shutdown [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:18][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:32][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:36][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:54][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:75][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:406][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:419][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:422][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:425][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:426][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:435][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:438][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:441]。

## 设计动机与权衡

- `lib.rs` keeps outbound writing in a separate router task; this isolates slow writes from request dispatch while still allowing per-connection disconnect for transports that provide a disconnect token [E: codex-rs/app-server/src/lib.rs:819][E: codex-rs/app-server/src/lib.rs:863][E: codex-rs/app-server/src/transport.rs:154][E: codex-rs/app-server/src/transport.rs:157][E: codex-rs/app-server/src/transport.rs:161][I]。
- WebSocket JSON-RPC initialize readiness is finalized outside the shared handler: `process_request` passes `None`, then `lib.rs` mirrors session state, sends initialize notifications, calls `connection_initialized`, and stores outbound initialized true [E: codex-rs/app-server/src/message_processor.rs:611][E: codex-rs/app-server/src/message_processor.rs:619][E: codex-rs/app-server/src/lib.rs:1028][E: codex-rs/app-server/src/lib.rs:1051][E: codex-rs/app-server/src/lib.rs:1052][E: codex-rs/app-server/src/lib.rs:1065][E: codex-rs/app-server/src/lib.rs:1073][I]。
- `resolve_thread_status` upgrades Idle/NotLoaded to Active when a live in-progress turn is known, explicitly covering the race where running-turn events arrive before watch runtime state is observed [E: codex-rs/app-server/src/thread_status.rs:285][E: codex-rs/app-server/src/thread_status.rs:289][E: codex-rs/app-server/src/thread_status.rs:292][E: codex-rs/app-server/src/thread_status.rs:293]。

## gotcha

- `ConnectionOrigin` still exists in `app-server-transport`, but app-server-local `ConnectionState::new` names it `_origin` and does not retain it; do not infer per-origin request authorization from this layer [E: codex-rs/app-server/src/transport.rs:18][E: codex-rs/app-server/src/transport.rs:47][E: codex-rs/app-server/src/transport.rs:48][E: codex-rs/app-server/src/transport.rs:53][E: codex-rs/app-server/src/transport.rs:57][I]。
- `ensure_conversation_listener` checks `pending_thread_unloads` while subscribing; if a thread is closing, it returns an invalid request asking the caller to retry after close [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:133][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:156][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:157][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:158][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:164]。
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
