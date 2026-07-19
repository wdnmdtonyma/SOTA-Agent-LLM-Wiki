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
  - ThreadRequestProcessor
related:
  - subsys.app-server.message-processor
  - subsys.app-server.transport
  - subsys.app-server.client-libs
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

app-server 会话管理分成三层：`lib.rs` 启动 transport、remote-control、outbound router 和 processor loop；`MessageProcessor` 维护 per-connection initialize/session state；`ThreadRequestProcessor`、`ThreadStateManager` 与 `ThreadWatchManager` 管 subscription、listener、状态和 idle unload，并把 paginated history 的 turns/items/search-occurrences 与 resume bootstrap 接到 `ThreadStore`。[E: codex-rs/app-server/src/lib.rs:676][E: codex-rs/app-server/src/lib.rs:784][E: codex-rs/app-server/src/message_processor.rs:131][E: codex-rs/app-server/src/message_processor.rs:1150][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2496][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2560][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2619][E: codex-rs/app-server/src/thread_state.rs:43][E: codex-rs/app-server/src/thread_status.rs:20]。

## 能回答的问题

- stdio / unix socket / WebSocket / remote-control transport 如何进入同一个 processor loop。
- `initialize` 如何更新 per-connection session，并何时把 outbound connection 标为 ready。
- app-server 如何维护 live connections、thread subscriptions、thread status watchers 和 pending unloads。
- paginated thread history 如何列 turns/items、搜索 occurrence，并兼容旧客户端的 full hydration。
- paginated thread resume 如何生成 initial page、合并 active turn 并返回 backwards cursors。
- connection close、graceful shutdown、thread-created auto attach 分别走哪些 cleanup/attach paths。

## 职责边界

- `run_main_with_transport_options` 根据 transport 启动 stdio、Unix socket、WebSocket 或 `Off`；随后构造 auth manager，并按 policy/state-db/explicit request 启动 remote control [E: codex-rs/app-server/src/lib.rs:682][E: codex-rs/app-server/src/lib.rs:686][E: codex-rs/app-server/src/lib.rs:693][E: codex-rs/app-server/src/lib.rs:702][E: codex-rs/app-server/src/lib.rs:712][E: codex-rs/app-server/src/lib.rs:716][E: codex-rs/app-server/src/lib.rs:719][E: codex-rs/app-server/src/lib.rs:742][E: codex-rs/app-server/src/lib.rs:755]。
- outbound router task owns `HashMap<ConnectionId, OutboundConnectionState>`; it handles opened/closed/disconnect-all control events and routes `OutgoingEnvelope` to connection writers [E: codex-rs/app-server/src/lib.rs:784][E: codex-rs/app-server/src/lib.rs:785][E: codex-rs/app-server/src/lib.rs:794][E: codex-rs/app-server/src/lib.rs:802][E: codex-rs/app-server/src/lib.rs:813][E: codex-rs/app-server/src/lib.rs:816][E: codex-rs/app-server/src/lib.rs:828][E: codex-rs/app-server/src/lib.rs:832]。
- processor loop owns connection state and `MessageProcessor`; it reacts to `TransportEvent::ConnectionOpened`, `ConnectionClosed`, and `IncomingMessage`, then separately listens for remote-control status and thread-created broadcasts [E: codex-rs/app-server/src/lib.rs:839][E: codex-rs/app-server/src/lib.rs:849][E: codex-rs/app-server/src/lib.rs:867][E: codex-rs/app-server/src/lib.rs:869][E: codex-rs/app-server/src/lib.rs:915][E: codex-rs/app-server/src/lib.rs:954][E: codex-rs/app-server/src/lib.rs:976][E: codex-rs/app-server/src/lib.rs:1069][E: codex-rs/app-server/src/lib.rs:1083]。
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
- `ConnectionSessionState` gates initialized requests with an RPC gate and `OnceLock`; initialized state includes experimental API flag, notification opt-outs, client name/version, and request-attestation [E: codex-rs/app-server/src/message_processor.rs:131][E: codex-rs/app-server/src/message_processor.rs:131][E: codex-rs/app-server/src/message_processor.rs:132][E: codex-rs/app-server/src/message_processor.rs:133][E: codex-rs/app-server/src/message_processor.rs:137][E: codex-rs/app-server/src/message_processor.rs:138][E: codex-rs/app-server/src/message_processor.rs:139][E: codex-rs/app-server/src/message_processor.rs:140][E: codex-rs/app-server/src/message_processor.rs:141][E: codex-rs/app-server/src/message_processor.rs:142]。
- `ThreadState` stores pending interrupt/rollback state, turn summary/history, listener cancel/command channel, raw-events opt-in, listener generation, listener thread weak handle, and watch registration [E: codex-rs/app-server/src/thread_state.rs:83][E: codex-rs/app-server/src/thread_state.rs:83][E: codex-rs/app-server/src/thread_state.rs:84][E: codex-rs/app-server/src/thread_state.rs:85][E: codex-rs/app-server/src/thread_state.rs:86][E: codex-rs/app-server/src/thread_state.rs:88][E: codex-rs/app-server/src/thread_state.rs:89][E: codex-rs/app-server/src/thread_state.rs:90][E: codex-rs/app-server/src/thread_state.rs:92][E: codex-rs/app-server/src/thread_state.rs:93][E: codex-rs/app-server/src/thread_state.rs:94][E: codex-rs/app-server/src/thread_state.rs:95]。
- running thread 的 pending resume 另存 paginated turns、普通/预留 active slot 的 initial page，以及用于临发送时刷新 backwards cursors 的 `ThreadStore` handle。[E: codex-rs/app-server/src/thread_state.rs:43][E: codex-rs/app-server/src/thread_state.rs:44][E: codex-rs/app-server/src/thread_state.rs:45][E: codex-rs/app-server/src/thread_state.rs:47]
- `ThreadStateManagerInner` maps live connections, thread entries, and reverse connection-to-thread subscriptions; `ConnectionCapabilities` currently carries request attestation into thread listener state [E: codex-rs/app-server/src/thread_state.rs:284][E: codex-rs/app-server/src/thread_state.rs:284][E: codex-rs/app-server/src/thread_state.rs:285][E: codex-rs/app-server/src/thread_state.rs:286][E: codex-rs/app-server/src/thread_state.rs:287][E: codex-rs/app-server/src/thread_state.rs:291][E: codex-rs/app-server/src/thread_state.rs:291][E: codex-rs/app-server/src/thread_state.rs:292]。
- `ThreadWatchManager` tracks runtime facts and exposes status/running-turn watchers; `RuntimeFacts` records loaded/running/waiting/error inputs and `loaded_thread_status` maps those facts to protocol `ThreadStatus` [E: codex-rs/app-server/src/thread_status.rs:20][E: codex-rs/app-server/src/thread_status.rs:21][E: codex-rs/app-server/src/thread_status.rs:23][E: codex-rs/app-server/src/thread_status.rs:302][E: codex-rs/app-server/src/thread_status.rs:303][E: codex-rs/app-server/src/thread_status.rs:304][E: codex-rs/app-server/src/thread_status.rs:421][E: codex-rs/app-server/src/thread_status.rs:422][E: codex-rs/app-server/src/thread_status.rs:423][E: codex-rs/app-server/src/thread_status.rs:424][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:426][E: codex-rs/app-server/src/thread_status.rs:429]。

## Paginated history 与搜索

- 创建 `historyMode=paginated` thread 时，底层 store 必须同时支持 turns/items 分页列表，否则直接返回 invalid request；paginated thread 也不再允许 `thread/read(includeTurns=true)` 把完整历史塞进单次响应。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:977][E: codex-rs/app-server/src/request_processors/thread_processor.rs:980][E: codex-rs/app-server/src/request_processors/thread_processor.rs:983][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2358][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2362][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2365]
- `thread/turns/list` 识别 paginated history 后直接调用 `ThreadStore::list_turns`；summary/not-loaded 原样下推，旧客户端请求 `itemsView=full` 时则逐 turn 循环 `list_items` 做兼容 hydration，并防止 store 返回重复 cursor 造成死循环。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2496][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2498][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2619][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2633][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2640][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2664][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2690][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2700][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2718]
- `thread/searchOccurrences` 校验非空 search term，把 cursor/limit 交给 store，并返回 turn/item id、snippet、匹配范围和 turn cursor。[E: codex-rs/app-server/src/message_processor.rs:1150][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2560][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2572][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2581][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2600][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2604][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2612][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2615]
- resume 的兼容层可把所有 turn 分页 materialize 给旧客户端，也可只构造 initial turns page；running resume 会给 active turn 预留一个 page slot。最终 listener 合并 durable page 与 active turn、规范化状态，并在发送前从 store 重新取得 turns/items backwards cursors。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2727][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2737][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2758][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2779][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2782][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2800][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:556][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:566][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:581][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:590][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:595][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:654]

## 控制流

1. On `ConnectionOpened`, processor loop creates outbound initialized/experimental/opt-out flags, sends `OutboundControlEvent::Opened`, and inserts a `ConnectionState` keyed by connection id [E: codex-rs/app-server/src/lib.rs:915][E: codex-rs/app-server/src/lib.rs:921][E: codex-rs/app-server/src/lib.rs:922][E: codex-rs/app-server/src/lib.rs:924][E: codex-rs/app-server/src/lib.rs:926][E: codex-rs/app-server/src/lib.rs:944][E: codex-rs/app-server/src/lib.rs:946]。
2. On incoming request, processor calls `MessageProcessor::process_request`, mirrors session opt-outs/experimental flag back to outbound state, then if initialize just completed sends connection-scoped initialize notifications, emits current remote-control status, calls `connection_initialized`, and finally marks outbound initialized [E: codex-rs/app-server/src/lib.rs:976][E: codex-rs/app-server/src/lib.rs:985][E: codex-rs/app-server/src/lib.rs:993][E: codex-rs/app-server/src/lib.rs:996][E: codex-rs/app-server/src/lib.rs:1016][E: codex-rs/app-server/src/lib.rs:1017][E: codex-rs/app-server/src/lib.rs:1022][E: codex-rs/app-server/src/lib.rs:1030][E: codex-rs/app-server/src/lib.rs:1038]。
3. On `ConnectionClosed`, processor removes local connection state, closes the RPC gate, notifies outbound loop, spawns processor cleanup, and exits in stdio single-client mode when no connections remain [E: codex-rs/app-server/src/lib.rs:954][E: codex-rs/app-server/src/lib.rs:955][E: codex-rs/app-server/src/lib.rs:958][E: codex-rs/app-server/src/lib.rs:959][E: codex-rs/app-server/src/lib.rs:963][E: codex-rs/app-server/src/lib.rs:965][E: codex-rs/app-server/src/lib.rs:972]。
4. `MessageProcessor::connection_closed` drains the per-connection RPC gate with timeout, then cleans outgoing requests, fs watches, command/process exec state, and thread subscriptions [E: codex-rs/app-server/src/message_processor.rs:707][E: codex-rs/app-server/src/message_processor.rs:712][E: codex-rs/app-server/src/message_processor.rs:725][E: codex-rs/app-server/src/message_processor.rs:726][E: codex-rs/app-server/src/message_processor.rs:727][E: codex-rs/app-server/src/message_processor.rs:730][E: codex-rs/app-server/src/message_processor.rs:733]。
5. When a core thread is created, the processor gathers initialized connection ids and calls `try_attach_thread_listener`; the thread processor upserts watch state and calls `ensure_conversation_listener` best-effort for each initialized connection [E: codex-rs/app-server/src/lib.rs:1083][E: codex-rs/app-server/src/lib.rs:1086][E: codex-rs/app-server/src/lib.rs:1088][E: codex-rs/app-server/src/lib.rs:1092][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2981][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2987][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2996][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3008][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3010]。
6. Idle unload watches both subscriber presence and thread active status; unload cancels pending server-to-client requests, removes thread state, waits for core thread shutdown, removes watch state, and sends `ThreadClosed` only on successful complete shutdown [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:19][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:33][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:37][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:55][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:76][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:401][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:414][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:417][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:420][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:421][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:430][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:433][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:436]。

## 设计动机与权衡

- `lib.rs` keeps outbound writing in a separate router task; this isolates slow writes from request dispatch while still allowing per-connection disconnect for transports that provide a disconnect token [E: codex-rs/app-server/src/lib.rs:784][E: codex-rs/app-server/src/lib.rs:828][E: codex-rs/app-server/src/transport.rs:154][E: codex-rs/app-server/src/transport.rs:157][E: codex-rs/app-server/src/transport.rs:161][I]。
- WebSocket JSON-RPC initialize readiness is finalized outside the shared handler: `process_request` passes `None`, then `lib.rs` mirrors session state, sends initialize notifications, calls `connection_initialized`, and stores outbound initialized true [E: codex-rs/app-server/src/message_processor.rs:553][E: codex-rs/app-server/src/message_processor.rs:557][E: codex-rs/app-server/src/lib.rs:993][E: codex-rs/app-server/src/lib.rs:1016][E: codex-rs/app-server/src/lib.rs:1017][E: codex-rs/app-server/src/lib.rs:1030][E: codex-rs/app-server/src/lib.rs:1038][I]。
- `resolve_thread_status` upgrades Idle/NotLoaded to Active when a live in-progress turn is known, explicitly covering the race where running-turn events arrive before watch runtime state is observed [E: codex-rs/app-server/src/thread_status.rs:285][E: codex-rs/app-server/src/thread_status.rs:292][E: codex-rs/app-server/src/thread_status.rs:292][E: codex-rs/app-server/src/thread_status.rs:293]。
- paginated JSONL 是 canonical history，但兼容旧 resume payload 前会先刷新 SQLite projection；这把持久化恢复与 API hydration 的一致性成本留在 app-server boundary。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:3228][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3231][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3622][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3626][I]

## gotcha

- `ConnectionOrigin` still exists in `app-server-transport`, but app-server-local `ConnectionState::new` names it `_origin` and does not retain it; do not infer per-origin request authorization from this layer [E: codex-rs/app-server/src/transport.rs:18][E: codex-rs/app-server/src/transport.rs:47][E: codex-rs/app-server/src/transport.rs:48][E: codex-rs/app-server/src/transport.rs:53][E: codex-rs/app-server/src/transport.rs:57][I]。
- `ensure_conversation_listener` checks `pending_thread_unloads` while subscribing; if a thread is closing, it returns an invalid request asking the caller to retry after close [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:138][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:157][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:158][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:159][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:165]。
- `ThreadWatchActiveGuard` decrements pending permission/user-input counters asynchronously in `Drop`; leaked guards would keep waiting flags visible, which follows from the drop-triggered release path and `loaded_thread_status` active flag derivation [E: codex-rs/app-server/src/thread_status.rs:26][E: codex-rs/app-server/src/thread_status.rs:48][E: codex-rs/app-server/src/thread_status.rs:53][E: codex-rs/app-server/src/thread_status.rs:435][E: codex-rs/app-server/src/thread_status.rs:438][E: codex-rs/app-server/src/thread_status.rs:442][I]。
- `itemsView=full` 和 resume 不带 `excludeTurns` 都仍会分页读完整历史，是明确的旧客户端 slow path；新客户端应使用 turns/items 分页与 initial page bootstrap。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2690][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2727][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2737]

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
