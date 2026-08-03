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
updated: 7750465934
---

app-server 会话管理分成三层：`lib.rs` 启动 transport、remote-control、outbound router 和 processor loop；`MessageProcessor` 维护 per-connection initialize/session state；`ThreadRequestProcessor`、`ThreadStateManager` 与 `ThreadWatchManager` 管 subscription、listener、状态和 idle unload，并把 paginated history 的 turns/items/search-occurrences 与 resume bootstrap 接到 `ThreadStore`。[E: codex-rs/app-server/src/lib.rs:712][E: codex-rs/app-server/src/lib.rs:819][E: codex-rs/app-server/src/message_processor.rs:126][E: codex-rs/app-server/src/message_processor.rs:1177][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2515][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2579][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2638][E: codex-rs/app-server/src/thread_state.rs:47][E: codex-rs/app-server/src/thread_status.rs:19]。

## 能回答的问题

- stdio / unix socket / WebSocket / remote-control transport 如何进入同一个 processor loop。
- `initialize` 如何更新 per-connection session，并何时把 outbound connection 标为 ready。
- app-server 如何维护 live connections、thread subscriptions、thread status watchers 和 pending unloads。
- paginated thread history 如何列 turns/items、搜索 occurrence，并兼容旧客户端的 full hydration。
- paginated thread resume 如何生成 initial page、合并 active turn 并返回 backwards cursors。
- connection close、graceful shutdown、thread-created auto attach 分别走哪些 cleanup/attach paths。

## 职责边界

- `run_main_with_transport_options` 根据 transport 启动 stdio、Unix socket、WebSocket 或 `Off`；随后构造 auth manager，并按 policy/state-db/explicit request 启动 remote control [E: codex-rs/app-server/src/lib.rs:717][E: codex-rs/app-server/src/lib.rs:721][E: codex-rs/app-server/src/lib.rs:728][E: codex-rs/app-server/src/lib.rs:737][E: codex-rs/app-server/src/lib.rs:747][E: codex-rs/app-server/src/lib.rs:751][E: codex-rs/app-server/src/lib.rs:754][E: codex-rs/app-server/src/lib.rs:777][E: codex-rs/app-server/src/lib.rs:790]。
- outbound router task owns `HashMap<ConnectionId, OutboundConnectionState>`; it handles opened/closed/disconnect-all control events and routes `OutgoingEnvelope` to connection writers [E: codex-rs/app-server/src/lib.rs:819][E: codex-rs/app-server/src/lib.rs:820][E: codex-rs/app-server/src/lib.rs:829][E: codex-rs/app-server/src/lib.rs:837][E: codex-rs/app-server/src/lib.rs:848][E: codex-rs/app-server/src/lib.rs:851][E: codex-rs/app-server/src/lib.rs:863][E: codex-rs/app-server/src/lib.rs:867]。
- processor loop owns connection state and `MessageProcessor`; it reacts to `TransportEvent::ConnectionOpened`, `ConnectionClosed`, and `IncomingMessage`, then separately listens for remote-control status and thread-created broadcasts [E: codex-rs/app-server/src/lib.rs:874][E: codex-rs/app-server/src/lib.rs:884][E: codex-rs/app-server/src/lib.rs:903][E: codex-rs/app-server/src/lib.rs:905][E: codex-rs/app-server/src/lib.rs:951][E: codex-rs/app-server/src/lib.rs:990][E: codex-rs/app-server/src/lib.rs:1013][E: codex-rs/app-server/src/lib.rs:1106][E: codex-rs/app-server/src/lib.rs:1120]。
- app-server-local transport is now a single `transport.rs` glue file; it re-exports `codex_app_server_transport` and defines only connection/outbound state plus outbound filtering/routing glue [E: codex-rs/app-server/src/transport.rs:15][E: codex-rs/app-server/src/transport.rs:27][E: codex-rs/app-server/src/transport.rs:31][E: codex-rs/app-server/src/transport.rs:35][E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:64][E: codex-rs/app-server/src/transport.rs:100][E: codex-rs/app-server/src/transport.rs:200]。

## 关键 crate/文件

- `codex-rs/app-server/src/lib.rs`: runtime startup, transport acceptor wiring, outbound loop, processor loop, graceful drain。
- `codex-rs/app-server/src/message_processor.rs`: connection session state, initialize boundary, cleanup hooks。
- `codex-rs/app-server/src/transport.rs`: re-exports current transport crate and stores outbound connection state。
- `codex-rs/app-server/src/thread_state.rs`: live connection to subscribed thread mapping and listener state。
- `codex-rs/app-server/src/thread_status.rs`: loaded/running/waiting status derivation。
- `codex-rs/app-server/src/request_processors/thread_lifecycle.rs`: listener attach, idle unload, shutdown/remove/ThreadClosed path。

## 数据模型

- `ConnectionState` now retains `ConnectionOrigin` together with outbound flags, opted-out notification methods, and the per-connection session. The processor loop uses the retained origin to distinguish a closed stdio client from WebSocket/remote-control connections [E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:40][E: codex-rs/app-server/src/transport.rs:48][E: codex-rs/app-server/src/transport.rs:49][E: codex-rs/app-server/src/transport.rs:54][E: codex-rs/app-server/src/transport.rs:55][E: codex-rs/app-server/src/lib.rs:990][E: codex-rs/app-server/src/lib.rs:994]。
- `ConnectionSessionState` gates initialized requests with an RPC gate and `OnceLock`; initialized state includes experimental API flag, notification opt-outs, client name/version, and request-attestation [E: codex-rs/app-server/src/message_processor.rs:126][E: codex-rs/app-server/src/message_processor.rs:126][E: codex-rs/app-server/src/message_processor.rs:127][E: codex-rs/app-server/src/message_processor.rs:128][E: codex-rs/app-server/src/message_processor.rs:132][E: codex-rs/app-server/src/message_processor.rs:133][E: codex-rs/app-server/src/message_processor.rs:134][E: codex-rs/app-server/src/message_processor.rs:135][E: codex-rs/app-server/src/message_processor.rs:136][E: codex-rs/app-server/src/message_processor.rs:137]。
- `ThreadState` stores pending interrupt/rollback state, turn summary/history, listener cancel/command channel, raw-events opt-in, listener generation, listener thread weak handle, and watch registration [E: codex-rs/app-server/src/thread_state.rs:92][E: codex-rs/app-server/src/thread_state.rs:92][E: codex-rs/app-server/src/thread_state.rs:93][E: codex-rs/app-server/src/thread_state.rs:94][E: codex-rs/app-server/src/thread_state.rs:95][E: codex-rs/app-server/src/thread_state.rs:97][E: codex-rs/app-server/src/thread_state.rs:98][E: codex-rs/app-server/src/thread_state.rs:99][E: codex-rs/app-server/src/thread_state.rs:101][E: codex-rs/app-server/src/thread_state.rs:102][E: codex-rs/app-server/src/thread_state.rs:103][E: codex-rs/app-server/src/thread_state.rs:104]。
- running thread 的 pending resume 另存 paginated turns、普通/预留 active slot 的 initial page，以及用于临发送时刷新 backwards cursors 的 `ThreadStore` handle。[E: codex-rs/app-server/src/thread_state.rs:47][E: codex-rs/app-server/src/thread_state.rs:48][E: codex-rs/app-server/src/thread_state.rs:49][E: codex-rs/app-server/src/thread_state.rs:51]
- `ThreadStateManagerInner` maps live connections, thread entries, and reverse connection-to-thread subscriptions; `ConnectionCapabilities` currently carries request attestation into thread listener state [E: codex-rs/app-server/src/thread_state.rs:303][E: codex-rs/app-server/src/thread_state.rs:303][E: codex-rs/app-server/src/thread_state.rs:304][E: codex-rs/app-server/src/thread_state.rs:305][E: codex-rs/app-server/src/thread_state.rs:306][E: codex-rs/app-server/src/thread_state.rs:310][E: codex-rs/app-server/src/thread_state.rs:310][E: codex-rs/app-server/src/thread_state.rs:311]。
- `ThreadWatchManager` tracks runtime facts and exposes status/running-turn watchers; `RuntimeFacts` records loaded/running/waiting/error inputs and `loaded_thread_status` maps those facts to protocol `ThreadStatus` [E: codex-rs/app-server/src/thread_status.rs:19][E: codex-rs/app-server/src/thread_status.rs:20][E: codex-rs/app-server/src/thread_status.rs:22][E: codex-rs/app-server/src/thread_status.rs:304][E: codex-rs/app-server/src/thread_status.rs:305][E: codex-rs/app-server/src/thread_status.rs:306][E: codex-rs/app-server/src/thread_status.rs:423][E: codex-rs/app-server/src/thread_status.rs:424][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:426][E: codex-rs/app-server/src/thread_status.rs:427][E: codex-rs/app-server/src/thread_status.rs:428][E: codex-rs/app-server/src/thread_status.rs:431]。

## Paginated history 与搜索

- 创建 `historyMode=paginated` thread 时，底层 store 必须同时支持 turns/items 分页列表，否则直接返回 invalid request；paginated thread 也不再允许 `thread/read(includeTurns=true)` 把完整历史塞进单次响应。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:1017][E: codex-rs/app-server/src/request_processors/thread_processor.rs:1020][E: codex-rs/app-server/src/request_processors/thread_processor.rs:1023][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2377][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2381][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2384]
- `thread/turns/list` 识别 paginated history 后直接调用 `ThreadStore::list_turns`；summary/not-loaded 原样下推，旧客户端请求 `itemsView=full` 时则逐 turn 循环 `list_items` 做兼容 hydration，并防止 store 返回重复 cursor 造成死循环。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2515][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2517][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2638][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2659][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2683][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2719][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2739]
- `thread/searchOccurrences` 校验非空 search term，把 cursor/limit 交给 store，并返回 turn/item id、snippet、匹配范围和 turn cursor。[E: codex-rs/app-server/src/message_processor.rs:1177][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2579][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2591][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2600][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2619][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2623][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2631][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2634]
- resume 的兼容层可把所有 turn 分页 materialize 给旧客户端，也可只构造 initial turns page；running resume 会给 active turn 预留一个 page slot。最终 listener 合并 durable page 与 active turn、规范化状态，并在发送前从 store 重新取得 turns/items backwards cursors。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2758][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2779][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2803][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2821][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:560][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:570][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:587][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:596][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:601][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:660]

## 控制流

1. On `ConnectionOpened`, processor loop creates outbound initialized/experimental/opt-out flags, sends `OutboundControlEvent::Opened`, and inserts a `ConnectionState` keyed by connection id [E: codex-rs/app-server/src/lib.rs:951][E: codex-rs/app-server/src/lib.rs:957][E: codex-rs/app-server/src/lib.rs:958][E: codex-rs/app-server/src/lib.rs:960][E: codex-rs/app-server/src/lib.rs:962][E: codex-rs/app-server/src/lib.rs:980][E: codex-rs/app-server/src/lib.rs:982]。
2. On incoming request, processor calls `MessageProcessor::process_request`, mirrors session opt-outs/experimental flag back to outbound state, then if initialize just completed sends connection-scoped initialize notifications, emits current remote-control status, calls `connection_initialized`, and finally marks outbound initialized [E: codex-rs/app-server/src/lib.rs:1013][E: codex-rs/app-server/src/lib.rs:1022][E: codex-rs/app-server/src/lib.rs:1030][E: codex-rs/app-server/src/lib.rs:1033][E: codex-rs/app-server/src/lib.rs:1053][E: codex-rs/app-server/src/lib.rs:1054][E: codex-rs/app-server/src/lib.rs:1059][E: codex-rs/app-server/src/lib.rs:1067][E: codex-rs/app-server/src/lib.rs:1075]。
3. On `ConnectionClosed`, processor removes local connection state, closes the RPC gate, notifies outbound loop, spawns processor cleanup, and exits in stdio single-client mode [E: codex-rs/app-server/src/lib.rs:990][E: codex-rs/app-server/src/lib.rs:991][E: codex-rs/app-server/src/lib.rs:995][E: codex-rs/app-server/src/lib.rs:996][E: codex-rs/app-server/src/lib.rs:1000][E: codex-rs/app-server/src/lib.rs:1002][E: codex-rs/app-server/src/lib.rs:1009][E: codex-rs/app-server/src/lib.rs:1010]。
4. `MessageProcessor::connection_closed` drains the per-connection RPC gate with timeout, then cleans outgoing requests, fs watches, command/process exec state, and thread subscriptions [E: codex-rs/app-server/src/message_processor.rs:714][E: codex-rs/app-server/src/message_processor.rs:719][E: codex-rs/app-server/src/message_processor.rs:732][E: codex-rs/app-server/src/message_processor.rs:733][E: codex-rs/app-server/src/message_processor.rs:734][E: codex-rs/app-server/src/message_processor.rs:737][E: codex-rs/app-server/src/message_processor.rs:740]。
5. When a core thread is created, the processor gathers initialized connection ids and calls `try_attach_thread_listener`; the thread processor upserts watch state and calls `ensure_conversation_listener` best-effort for each initialized connection [E: codex-rs/app-server/src/lib.rs:1120][E: codex-rs/app-server/src/lib.rs:1123][E: codex-rs/app-server/src/lib.rs:1125][E: codex-rs/app-server/src/lib.rs:1129][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3006][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3012][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3024][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3028][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3030]。
6. Idle unload watches both subscriber presence and thread active status; unload cancels pending server-to-client requests, removes thread state, waits for core thread shutdown, removes watch state, and sends `ThreadClosed` only on successful complete shutdown [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:20][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:34][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:38][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:56][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:77][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:402][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:415][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:418][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:421][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:422][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:431][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:434][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:437]。

## 设计动机与权衡

- `lib.rs` keeps outbound writing in a separate router task; this isolates slow writes from request dispatch while still allowing per-connection disconnect for transports that provide a disconnect token [E: codex-rs/app-server/src/lib.rs:819][E: codex-rs/app-server/src/lib.rs:863][E: codex-rs/app-server/src/transport.rs:156][E: codex-rs/app-server/src/transport.rs:159][E: codex-rs/app-server/src/transport.rs:163][I]。
- WebSocket JSON-RPC initialize readiness is finalized outside the shared handler: `process_request` passes `None`, then `lib.rs` mirrors session state, sends initialize notifications, calls `connection_initialized`, and stores outbound initialized true [E: codex-rs/app-server/src/message_processor.rs:560][E: codex-rs/app-server/src/lib.rs:1030][E: codex-rs/app-server/src/lib.rs:1053][E: codex-rs/app-server/src/lib.rs:1054][E: codex-rs/app-server/src/lib.rs:1067][E: codex-rs/app-server/src/lib.rs:1075][I]。
- `resolve_thread_status` upgrades Idle/NotLoaded to Active when a live in-progress turn is known, explicitly covering the race where running-turn events arrive before watch runtime state is observed [E: codex-rs/app-server/src/thread_status.rs:287][E: codex-rs/app-server/src/thread_status.rs:294][E: codex-rs/app-server/src/thread_status.rs:294][E: codex-rs/app-server/src/thread_status.rs:295]。
- paginated JSONL 是 canonical history，但兼容旧 resume payload 前会先刷新 SQLite projection；这把持久化恢复与 API hydration 的一致性成本留在 app-server boundary。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:3248][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3251][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3643][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3647][I]

## gotcha

- Retained `ConnectionOrigin` is currently consumed for stdio close lifecycle, not a general per-origin authorization policy; request authorization must still be inferred from the explicit auth/session gates rather than this field alone [E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:40][E: codex-rs/app-server/src/lib.rs:994][E: codex-rs/app-server/src/lib.rs:1009][I]。
- `ensure_conversation_listener` checks `pending_thread_unloads` while subscribing; if a thread is closing, it returns an invalid request asking the caller to retry after close [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:139][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:158][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:159][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:160][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:166]。
- `ThreadWatchActiveGuard` decrements pending permission/user-input counters asynchronously in `Drop`; leaked guards would keep waiting flags visible, which follows from the drop-triggered release path and `loaded_thread_status` active flag derivation [E: codex-rs/app-server/src/thread_status.rs:25][E: codex-rs/app-server/src/thread_status.rs:47][E: codex-rs/app-server/src/thread_status.rs:52][E: codex-rs/app-server/src/thread_status.rs:437][E: codex-rs/app-server/src/thread_status.rs:440][E: codex-rs/app-server/src/thread_status.rs:444][I]。
- `itemsView=full` 和 resume 不带 `excludeTurns` 都仍会分页读完整历史，是明确的旧客户端 slow path；新客户端应使用 turns/items 分页与 initial page bootstrap。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2758]

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
