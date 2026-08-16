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
  - subsys.core.thread-queue
evidence: explicit
status: verified
updated: 9ded177ce7
---

app-server 会话管理分成三层：`lib.rs` 启动 transport、remote-control、outbound router 和 processor loop；`MessageProcessor` 维护 per-connection initialize/session state；`ThreadRequestProcessor`、`ThreadQueueRequestProcessor`、`ThreadStateManager` 与 `ThreadWatchManager` 管 subscription、listener、状态、idle unload 和 durable queue，并把 paginated history 的 turns/items/search-occurrences 与 resume bootstrap 接到 `ThreadStore`。[E: codex-rs/app-server/src/lib.rs:722][E: codex-rs/app-server/src/lib.rs:860][E: codex-rs/app-server/src/message_processor.rs:126][E: codex-rs/app-server/src/message_processor.rs:134][E: codex-rs/app-server/src/message_processor.rs:1144][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2819][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2883][E: codex-rs/app-server/src/thread_state.rs:48][E: codex-rs/app-server/src/thread_status.rs:19]。

## 能回答的问题

- stdio / unix socket / WebSocket / remote-control transport 如何进入同一个 processor loop。
- `initialize` 如何更新 per-connection session，并何时把 outbound connection 标为 ready。
- app-server 如何维护 live connections、thread subscriptions、thread status watchers 和 pending unloads。
- paginated thread history 如何列 turns/items、搜索 occurrence，并兼容旧客户端的 full hydration。
- paginated thread resume 如何生成 initial page、合并 active turn 并返回 backwards cursors。
- connection close、graceful shutdown、thread-created auto attach 分别走哪些 cleanup/attach paths。

## 职责边界

- `run_main_with_transport_options` 根据 transport 启动 stdio、Unix socket、WebSocket 或 `Off`；随后构造 auth manager，并按 policy/state-db/explicit request 启动 remote control [E: codex-rs/app-server/src/lib.rs:722][E: codex-rs/app-server/src/lib.rs:730][E: codex-rs/app-server/src/lib.rs:741]。
- outbound router task owns `HashMap<ConnectionId, OutboundConnectionState>`; it handles opened/closed/disconnect-all control events and routes `OutgoingEnvelope` to connection writers [E: codex-rs/app-server/src/lib.rs:854][E: codex-rs/app-server/src/lib.rs:860][E: codex-rs/app-server/src/lib.rs:872][E: codex-rs/app-server/src/lib.rs:875]。
- processor loop owns connection state and `MessageProcessor`; it reacts to `TransportEvent::ConnectionOpened`, `ConnectionClosed`, and `IncomingMessage`, then separately listens for remote-control status and thread-created broadcasts [E: codex-rs/app-server/src/lib.rs:1004][E: codex-rs/app-server/src/lib.rs:1014][E: codex-rs/app-server/src/lib.rs:1038]。
- app-server-local transport is now a single `transport.rs` glue file; it re-exports `codex_app_server_transport` and defines only connection/outbound state plus outbound filtering/routing glue [E: codex-rs/app-server/src/transport.rs:15][E: codex-rs/app-server/src/transport.rs:27][E: codex-rs/app-server/src/transport.rs:31][E: codex-rs/app-server/src/transport.rs:35][E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:64][E: codex-rs/app-server/src/transport.rs:100][E: codex-rs/app-server/src/transport.rs:200]。

## 关键 crate/文件

- `codex-rs/app-server/src/lib.rs`: runtime startup, transport acceptor wiring, outbound loop, processor loop, graceful drain。
- `codex-rs/app-server/src/message_processor.rs`: connection session state, initialize boundary, cleanup hooks。
- `codex-rs/app-server/src/transport.rs`: re-exports current transport crate and stores outbound connection state。
- `codex-rs/app-server/src/thread_state.rs`: live connection to subscribed thread mapping and listener state。
- `codex-rs/app-server/src/thread_status.rs`: loaded/running/waiting status derivation。
- `codex-rs/app-server/src/request_processors/thread_lifecycle.rs`: listener attach, idle unload, shutdown/remove/ThreadClosed path。

## 数据模型

- `ConnectionState` now retains `ConnectionOrigin` together with outbound flags, opted-out notification methods, and the per-connection session. The processor loop uses the retained origin to distinguish a closed stdio client from WebSocket/remote-control connections [E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:40][E: codex-rs/app-server/src/lib.rs:1014][E: codex-rs/app-server/src/lib.rs:1018]。
- `ConnectionSessionState` gates initialized requests with an RPC gate and `OnceLock`; initialized state includes experimental API flag, notification opt-outs, client name/version, request-attestation 与 MCP extension flags [E: codex-rs/app-server/src/message_processor.rs:134][E: codex-rs/app-server/src/message_processor.rs:140][E: codex-rs/app-server/src/message_processor.rs:141][E: codex-rs/app-server/src/message_processor.rs:146]。
- `ThreadState` stores pending interrupt/rollback state, turn summary/history, listener cancel/command channel, raw-events opt-in, listener generation, listener thread weak handle, and watch registration [E: codex-rs/app-server/src/thread_state.rs:94][E: codex-rs/app-server/src/thread_state.rs:95][E: codex-rs/app-server/src/thread_state.rs:96][E: codex-rs/app-server/src/thread_state.rs:102][E: codex-rs/app-server/src/thread_state.rs:103][E: codex-rs/app-server/src/thread_state.rs:106][E: codex-rs/app-server/src/thread_state.rs:108][E: codex-rs/app-server/src/thread_state.rs:109]。
- running thread 的 pending resume 另存 paginated turns、普通/预留 active slot 的 initial page，以及用于临发送时刷新 backwards cursors 的 `ThreadStore` handle。[E: codex-rs/app-server/src/thread_state.rs:48][E: codex-rs/app-server/src/thread_state.rs:49][E: codex-rs/app-server/src/thread_state.rs:50][E: codex-rs/app-server/src/thread_state.rs:51]
- `ThreadStateManagerInner` maps live connections, thread entries, and reverse connection-to-thread subscriptions; `ConnectionCapabilities` currently carries request attestation into thread listener state [E: codex-rs/app-server/src/thread_state.rs:319][E: codex-rs/app-server/src/thread_state.rs:320][E: codex-rs/app-server/src/thread_state.rs:322][E: codex-rs/app-server/src/thread_state.rs:326]。
- `ThreadWatchManager` tracks runtime facts and exposes status/running-turn watchers; `RuntimeFacts` records loaded/running/waiting/error inputs and `loaded_thread_status` maps those facts to protocol `ThreadStatus` [E: codex-rs/app-server/src/thread_status.rs:19][E: codex-rs/app-server/src/thread_status.rs:20][E: codex-rs/app-server/src/thread_status.rs:22][E: codex-rs/app-server/src/thread_status.rs:303][E: codex-rs/app-server/src/thread_status.rs:303][E: codex-rs/app-server/src/thread_status.rs:303][E: codex-rs/app-server/src/thread_status.rs:422][E: codex-rs/app-server/src/thread_status.rs:422][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:431]。

## Paginated history 与搜索

- 创建 `historyMode=paginated` thread 时，底层 store 必须同时支持 turns/items 分页列表，否则直接返回 invalid request。paginated `thread/read(includeTurns=true)` 不再读完整 rollout，而是走 `paginated_thread_full_turns` 兼容 hydration。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:1089][E: codex-rs/app-server/src/request_processors/thread_processor.rs:1091][E: codex-rs/app-server/src/request_processors/thread_processor.rs:1094][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2672][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2676]
- `thread/turns/list` 识别 paginated history 后走 `paginated_thread_turns_list_response`，内部调用 `ThreadStore::list_turns`。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2819][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2821][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2965]
- `thread/searchOccurrences` 校验非空 search term，把 cursor/limit 交给 store，并返回 turn/item id、snippet、匹配范围和 turn cursor。[E: codex-rs/app-server/src/message_processor.rs:1247][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2883][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2895][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2906]
- resume 的兼容层可把所有 turn 分页 materialize 给旧客户端，也可只构造 initial turns page；running resume 会给 active turn 预留一个 page slot。最终 listener 合并 durable page 与 active turn、规范化状态，并在发送前从 store 重新取得 turns/items backwards cursors。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2758][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2779][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2803][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2821][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:560][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:570][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:587][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:596][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:601][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:660]

## 控制流

1. On `ConnectionOpened`, processor loop creates outbound initialized/experimental/opt-out flags, sends `OutboundControlEvent::Opened`, and inserts a `ConnectionState` keyed by connection id [E: codex-rs/app-server/src/lib.rs:980][E: codex-rs/app-server/src/lib.rs:987][E: codex-rs/app-server/src/lib.rs:1004]。
2. On incoming request, processor calls `MessageProcessor::process_request`, mirrors session opt-outs/experimental flag back to outbound state, then if initialize just completed sends connection-scoped initialize notifications, emits current remote-control status, calls `connection_initialized`, and finally marks outbound initialized [E: codex-rs/app-server/src/lib.rs:1046][E: codex-rs/app-server/src/lib.rs:1057][E: codex-rs/app-server/src/lib.rs:1077][E: codex-rs/app-server/src/lib.rs:1091][E: codex-rs/app-server/src/lib.rs:1099]。
3. On `ConnectionClosed`, processor removes local connection state, closes the RPC gate, notifies outbound loop, spawns processor cleanup, and exits in stdio single-client mode [E: codex-rs/app-server/src/lib.rs:1014][E: codex-rs/app-server/src/lib.rs:1018][E: codex-rs/app-server/src/lib.rs:1020][E: codex-rs/app-server/src/lib.rs:1026][E: codex-rs/app-server/src/lib.rs:1033]。
4. `MessageProcessor::connection_closed` drains the per-connection RPC gate with timeout, then cleans outgoing requests, fs watches, command/process exec state, and thread subscriptions [E: codex-rs/app-server/src/message_processor.rs:745][E: codex-rs/app-server/src/message_processor.rs:751][E: codex-rs/app-server/src/message_processor.rs:763][E: codex-rs/app-server/src/message_processor.rs:764][E: codex-rs/app-server/src/message_processor.rs:771]。
5. When a core thread is created, the processor gathers initialized connection ids and calls `try_attach_thread_listener`; the thread processor upserts watch state and calls `ensure_conversation_listener` best-effort for each initialized connection [E: codex-rs/app-server/src/lib.rs:1154][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3310][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3318][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3334]。
6. Idle unload watches both subscriber presence and thread active status after `THREAD_UNLOADING_DELAY`；`UnloadingState` 同时订阅 connections 与 `ThreadStatus`。[E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:7][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:22][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:58]

## 设计动机与权衡

- `lib.rs` keeps outbound writing in a separate router task; this isolates slow writes from request dispatch while still allowing per-connection disconnect for transports that provide a disconnect token [E: codex-rs/app-server/src/lib.rs:860][E: codex-rs/app-server/src/transport.rs:156][E: codex-rs/app-server/src/transport.rs:159][E: codex-rs/app-server/src/transport.rs:163][I]。
- WebSocket JSON-RPC initialize readiness is finalized outside the shared handler: `process_request` passes `None`, then `lib.rs` mirrors session state, sends initialize notifications, calls `connection_initialized`, and stores outbound initialized true [E: codex-rs/app-server/src/message_processor.rs:596][E: codex-rs/app-server/src/lib.rs:1077][E: codex-rs/app-server/src/lib.rs:1091][E: codex-rs/app-server/src/lib.rs:1099][I]。
- `resolve_thread_status` 在已知 live in-progress turn 时会升级 Idle/NotLoaded 到 Active。[E: codex-rs/app-server/src/thread_status.rs:294]
- paginated JSONL 是 canonical history；paginated resume 在发送前会重新取 backwards cursors。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:3647][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3648][I]

## gotcha

- Retained `ConnectionOrigin` is currently consumed for stdio close lifecycle, not a general per-origin authorization policy; request authorization must still be inferred from the explicit auth/session gates rather than this field alone [E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:40][E: codex-rs/app-server/src/lib.rs:1018][E: codex-rs/app-server/src/lib.rs:1033][I]。
- `ensure_conversation_listener` checks `pending_thread_unloads` while subscribing; if a thread is closing, it returns an invalid request asking the caller to retry after close [E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:141][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:160][E: codex-rs/app-server/src/request_processors/thread_lifecycle.rs:162]。
- `ThreadWatchActiveGuard` 在 `Drop` 里异步释放 pending permission/user-input counters；leaked guards 会让 waiting flags 残留。[E: codex-rs/app-server/src/thread_status.rs:25][E: codex-rs/app-server/src/thread_status.rs:438][I]。
- `itemsView=full` 和 resume/`thread/read(includeTurns=true)` 仍会分页读完整历史，是明确的旧客户端 slow path；新客户端应使用 turns/items 分页与 initial page bootstrap。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:3054][E: codex-rs/app-server/src/request_processors/thread_processor.rs:3054]

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
- `subsys.core.thread-queue`
