---
id: subsys.core.thread-store
title: ThreadStore 抽象层
kind: subsystem
tier: T2
source: [codex-rs/thread-store/src/lib.rs, codex-rs/thread-store/src/store.rs, codex-rs/thread-store/src/live_thread.rs, codex-rs/thread-store/src/types.rs, codex-rs/thread-store/src/queue_store.rs, codex-rs/thread-store/src/local/mod.rs, codex-rs/thread-store/src/local/create_thread.rs, codex-rs/thread-store/src/local/live_writer.rs, codex-rs/thread-store/src/local/model_context.rs, codex-rs/thread-store/src/local/paginated_fork.rs, codex-rs/thread-store/src/local/rollout_lineage.rs, codex-rs/thread-store/src/local/writer_lock.rs, codex-rs/thread-store/src/local/thread_sections.rs, codex-rs/thread-store/src/local/move_thread_to_section.rs, codex-rs/thread-store/src/local/thread_history/segment_paging.rs, codex-rs/thread-store/src/local/thread_history_materialization.rs, codex-rs/thread-store/src/local/thread_history/read.rs, codex-rs/thread-store/src/local/thread_history/search.rs, codex-rs/thread-store/src/local/read_thread.rs, codex-rs/thread-store/src/local/list_threads.rs, codex-rs/thread-store/src/local/search_threads.rs, codex-rs/thread-store/src/local/update_thread_metadata.rs, codex-rs/thread-store/src/local/pending_thread_metadata.rs, codex-rs/thread-store/src/local/revert_thread.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/thread_rollout_truncation.rs, codex-rs/history/src/lib.rs, codex-rs/rollout/src/lib.rs, codex-rs/exec/src/lib.rs, codex-rs/protocol/src/protocol.rs, codex-rs/app-server/src/request_processors/thread_processor.rs]
symbols: [ThreadStore, LiveThread, LiveThreadInitGuard, LocalThreadStore, LocalThreadStoreConfig, StoredThread, StoredThreadHistory, StoredModelContext, ThreadMetadataPatch, PrepareForkParams, PreparedFork, ForkBoundary, WriterLockCoordinator, CreateThreadParams, ResumeThreadParams, AppendThreadItemsParams, RevertThreadParams, RolloutWriteOp, materialize_to_sqlite, move_thread_to_section, PendingThreadMetadataRegistry, thread-store::QueueStore]
related: [subsys.core.rollout-persistence, subsys.core.state-db, subsys.core.realtime-conversation, subsys.core.thread-queue, subsys.core.rollout-migration]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `codex-rs/thread-store` 是 thread persistence 的 storage-neutral boundary。local 实现仍以 JSONL rollout 为 durable source of truth；当 history mode 是 `Paginated` 时，它在 durable write 后把完整 JSONL records 投影进 rebuildable `thread_history_1.sqlite`，供 turn/item pagination、occurrence search 与 bounded model-context resume 使用。[E: codex-rs/thread-store/src/local/live_writer.rs:331][E: codex-rs/thread-store/src/local/live_writer.rs:337][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:19]

## 能回答的问题

- `ThreadStore` trait 当前要求实现哪些 thread lifecycle/read/list/update 方法？
- `LiveThread` 如何封装 create/resume/append/persist/flush/shutdown/discard？
- `LocalThreadStore` 如何把 live writer 操作映射到 `RolloutRecorder`？
- list/read/search/update metadata 在本地如何走 rollout 与 SQLite？
- 哪些 trait 方法仍是默认 unsupported？
- paginated fork / revert 如何冻结 lineage 并替换 durable path？
- reserved thread ID 与 pending metadata 何时生效？
- 单 writer 与 section ordering 怎样持久化？

## 职责边界

- `ThreadStore` is a trait boundary, not a persistence format; implementations resolve `ThreadId` to backing storage.[E: codex-rs/thread-store/src/store.rs:46][E: codex-rs/thread-store/src/store.rs:60][E: codex-rs/thread-store/src/store.rs:66][E: codex-rs/thread-store/src/store.rs:67]
- `LiveThread` is the active thread handle for session code; it delegates storage to `ThreadStore` and owns metadata-sync bookkeeping.[E: codex-rs/thread-store/src/live_thread.rs:35][E: codex-rs/thread-store/src/live_thread.rs:38][E: codex-rs/thread-store/src/live_thread.rs:39]
- `LocalThreadStore` combines local config, live rollout recorders, metadata State DB handle, and lazy thread-history DB pool；append 先按 thread history mode 过滤，再 durable JSONL write，Paginated 模式最后更新 SQLite projection。[E: codex-rs/thread-store/src/local/live_writer.rs:322][E: codex-rs/thread-store/src/local/live_writer.rs:337]
- The current public crate surface exports `InMemoryThreadStore`, `LiveThread`, `LocalThreadStore`、`QueueStore`/`LocalQueueStore`、migration types 与 trait/types。[E: codex-rs/thread-store/src/lib.rs:21][E: codex-rs/thread-store/src/lib.rs:25][E: codex-rs/thread-store/src/lib.rs:33][E: codex-rs/thread-store/src/lib.rs:34]
- Durable queue 的 RPC/dispatch 权威节点是 `subsys.core.thread-queue`；Legacy→Paginated 后台迁移权威节点是 `subsys.core.rollout-migration`。`RolloutItem` payload 定义在 `codex-rs/history`，由 rollout crate re-export。[E: codex-rs/history/src/lib.rs:93][E: codex-rs/rollout/src/lib.rs:31]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/thread-store/src/store.rs` | Trait API for create/resume/append/read/list/update/archive/delete.[E: codex-rs/thread-store/src/store.rs:60][E: codex-rs/thread-store/src/store.rs:66][E: codex-rs/thread-store/src/store.rs:67][E: codex-rs/thread-store/src/store.rs:119][E: codex-rs/thread-store/src/store.rs:129][E: codex-rs/thread-store/src/store.rs:236][E: codex-rs/thread-store/src/store.rs:254] |
| `codex-rs/thread-store/src/live_thread.rs` | Active-thread lifecycle wrapper and metadata sync bridge.[E: codex-rs/thread-store/src/live_thread.rs:93][E: codex-rs/thread-store/src/live_thread.rs:144][E: codex-rs/thread-store/src/live_thread.rs:144][E: codex-rs/thread-store/src/live_thread.rs:254] |
| `codex-rs/thread-store/src/types.rs` | Create/resume/append params, persistence metadata, stored thread model, metadata patch schema.[E: codex-rs/thread-store/src/types.rs:54][E: codex-rs/thread-store/src/types.rs:71][E: codex-rs/thread-store/src/types.rs:111][E: codex-rs/thread-store/src/types.rs:542][E: codex-rs/thread-store/src/types.rs:659] |
| `codex-rs/thread-store/src/local/*` | Local rollout/state DB adapters for live writing, read/list/search/update/archive/delete.[E: codex-rs/thread-store/src/local/mod.rs:378][E: codex-rs/thread-store/src/local/mod.rs:381][E: codex-rs/thread-store/src/local/mod.rs:428][E: codex-rs/thread-store/src/local/mod.rs:440][E: codex-rs/thread-store/src/local/mod.rs:503] |
| `codex-rs/thread-store/src/local/thread_history_*` | Paginated history 的 JSONL→SQLite materialization、turn/item pagination 与 visible-message occurrence search。[E: codex-rs/thread-store/src/local/thread_history_materialization.rs:19][E: codex-rs/thread-store/src/local/thread_history/read.rs:95][E: codex-rs/thread-store/src/local/thread_history/read.rs:153][E: codex-rs/thread-store/src/local/thread_history/search.rs:51] |
| `codex-rs/thread-store/src/local/model_context.rs` | 对未压缩 Paginated rollout 做 reverse scan，只重建最新 model-visible context；Legacy/压缩文件保持 full-history path。[E: codex-rs/thread-store/src/local/model_context.rs:61][E: codex-rs/thread-store/src/local/model_context.rs:70] |
| `paginated_fork.rs` / `rollout_lineage.rs` | 冻结 source lineage，解析 Latest/ThroughTurn/BeforeTurn 边界并构造 child reference/model context。[E: codex-rs/thread-store/src/local/paginated_fork.rs:15][E: codex-rs/thread-store/src/local/paginated_fork.rs:40][E: codex-rs/thread-store/src/local/paginated_fork.rs:83][E: codex-rs/thread-store/src/local/paginated_fork.rs:160] |
| `writer_lock.rs` | 所有 history modes 的 live thread 都取得 process 间 advisory file lock；第二个 active writer 返回 `ThreadStoreError::Conflict`。[E: codex-rs/thread-store/src/local/live_writer.rs:25][E: codex-rs/thread-store/src/local/live_writer.rs:33][E: codex-rs/thread-store/src/local/live_writer.rs:40][E: codex-rs/thread-store/src/local/live_writer.rs:46][E: codex-rs/thread-store/src/local/writer_lock.rs:17][E: codex-rs/thread-store/src/local/writer_lock.rs:68] |
| `thread_sections.rs` / `move_thread_to_section.rs` | State-DB-backed section CRUD 与 thread move adapter；Local store only advertises section support when state DB exists。[E: codex-rs/thread-store/src/local/mod.rs:444][E: codex-rs/thread-store/src/local/mod.rs:450][E: codex-rs/thread-store/src/local/mod.rs:456][E: codex-rs/thread-store/src/local/mod.rs:471] |
| `pending_thread_metadata.rs` | 在 reserved thread id 真正 create 之前，暂存 host-owned `ThreadMetadataPatch`。[E: codex-rs/thread-store/src/local/pending_thread_metadata.rs:20][E: codex-rs/thread-store/src/store.rs:77] |
| `revert_thread.rs` | 对未加载 Paginated thread 写新 immutable rollout，CAS 替换 SQLite path。[E: codex-rs/thread-store/src/local/revert_thread.rs:19][E: codex-rs/thread-store/src/local/revert_thread.rs:106] |
| `queue_store.rs` | `QueueStore` / `LocalQueueStore` 适配；行为见 `subsys.core.thread-queue`。[E: codex-rs/thread-store/src/queue_store.rs:14] |
| `thread_rollout_truncation.rs` | Legacy rollout fork/rollback 边界：按 owned Vec truncation、real user/inter-agent turn boundary、synthetic/rolled-back validation 计算切点。[E: codex-rs/core/src/thread_rollout_truncation.rs:39][E: codex-rs/core/src/thread_rollout_truncation.rs:74][E: codex-rs/core/src/thread_rollout_truncation.rs:137][E: codex-rs/core/src/thread_rollout_truncation.rs:164][E: codex-rs/core/src/thread_rollout_truncation.rs:212] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ThreadPersistenceMetadata` | cwd, model provider, memory mode | Metadata required when opening live persistence.[E: codex-rs/thread-store/src/types.rs:54][E: codex-rs/thread-store/src/types.rs:58][E: codex-rs/thread-store/src/types.rs:60][E: codex-rs/thread-store/src/types.rs:62] |
| `CreateThreadParams` | thread id, fork/parent ids, source, thread source, base instructions, dynamic tools, multi-agent version, metadata | New-thread persistence input passed to `LocalThreadStore` and `RolloutRecorderParams::new`.[E: codex-rs/thread-store/src/types.rs:71][E: codex-rs/thread-store/src/types.rs:73][E: codex-rs/thread-store/src/types.rs:75][E: codex-rs/thread-store/src/types.rs:79][E: codex-rs/thread-store/src/types.rs:81][E: codex-rs/thread-store/src/types.rs:83][E: codex-rs/thread-store/src/types.rs:85][E: codex-rs/thread-store/src/types.rs:89][E: codex-rs/thread-store/src/types.rs:91][E: codex-rs/thread-store/src/types.rs:96][E: codex-rs/thread-store/src/types.rs:106] |
| `ResumeThreadParams` | thread id, optional rollout path, optional history, include_archived, metadata | Resume input can avoid rereading history/path if the caller already knows them.[E: codex-rs/thread-store/src/types.rs:111][E: codex-rs/thread-store/src/types.rs:113][E: codex-rs/thread-store/src/types.rs:115][E: codex-rs/thread-store/src/types.rs:117][E: codex-rs/thread-store/src/types.rs:119][E: codex-rs/thread-store/src/types.rs:121] |
| `StoredThread` | rollout path, parent/fork ids, preview/name, model/provider/effort, timestamps, optional section + sparse position + entered-at, cwd/source/agent/git/approval/profile/tokens/history | Unified read/list response model；section identity/order 已取代旧 `is_pinned` boolean。[E: codex-rs/thread-store/src/types.rs:542][E: codex-rs/thread-store/src/types.rs:572][E: codex-rs/thread-store/src/types.rs:574][E: codex-rs/thread-store/src/types.rs:578][E: codex-rs/thread-store/src/types.rs:606] |
| `ThreadMetadataPatch` | name、rollout path、preview/title/model/source/git 等 | literal patch；thread section move 不混入 metadata patch，而是单独 store operation。[E: codex-rs/thread-store/src/types.rs:670] |
| `RevertThreadParams` | `thread_id`, `before_turn_id` | Paginated revert 输入：新文件保留该 turn 之前的 prefix。[E: codex-rs/thread-store/src/types.rs:203] |

## Trait API

1. The required lifecycle methods are create, resume, append, persist, flush, shutdown, and discard。[E: codex-rs/thread-store/src/store.rs:71][E: codex-rs/thread-store/src/store.rs:99][E: codex-rs/thread-store/src/store.rs:105][E: codex-rs/thread-store/src/store.rs:112][E: codex-rs/thread-store/src/store.rs:119][E: codex-rs/thread-store/src/store.rs:122][E: codex-rs/thread-store/src/store.rs:129]
2. Host 可在 create 前 `stage_pending_thread_metadata` / `remove_pending_thread_metadata`；默认实现 unsupported。[E: codex-rs/thread-store/src/store.rs:77][E: codex-rs/thread-store/src/store.rs:90]
3. Trait 包含 `default_history_mode`、`load_latest_model_context`、`prepare_fork`、`revert_thread`、`supports_paginated_history_lists` 与 per-thread occurrence search；这些方法有兼容 default（Legacy/false/unsupported）。[E: codex-rs/thread-store/src/store.rs:66][E: codex-rs/thread-store/src/store.rs:140][E: codex-rs/thread-store/src/store.rs:154][E: codex-rs/thread-store/src/store.rs:169][E: codex-rs/thread-store/src/store.rs:245]
4. `search_threads`、occurrence search、`list_turns`、`list_items` 在 trait 层仍可 unsupported，但 `LocalThreadStore` 全部 override。[E: codex-rs/thread-store/src/local/mod.rs:538][E: codex-rs/thread-store/src/local/mod.rs:542][E: codex-rs/thread-store/src/local/mod.rs:546]
5. Metadata/archive/delete methods remain part of the trait surface。[E: codex-rs/thread-store/src/store.rs:299][E: codex-rs/thread-store/src/store.rs:317]

## 控制流：LiveThread

1. `LiveThread::create` captures both thread id and `history_mode`; all later filtering follows this persisted mode rather than a global policy。[E: codex-rs/thread-store/src/live_thread.rs:93][E: codex-rs/thread-store/src/live_thread.rs:97][E: codex-rs/thread-store/src/live_thread.rs:98][E: codex-rs/thread-store/src/live_thread.rs:103]
2. `create_with_inherited_model_context` 先计算 canonical prefix 长度并写入 `subagent_history_start_ordinal`，再创建 child 和持久化 inherited prefix；SQLite projection 因而能跳过 child-own history boundary 之前的 inherited records。[E: codex-rs/thread-store/src/live_thread.rs:119][E: codex-rs/thread-store/src/live_thread.rs:121][E: codex-rs/thread-store/src/live_thread.rs:130][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:22][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:41]
3. `LiveThread::resume` calls `resume_thread`; if history was not supplied, it loads history and discards the live writer on load failure。[E: codex-rs/thread-store/src/live_thread.rs:144][E: codex-rs/thread-store/src/live_thread.rs:168][E: codex-rs/thread-store/src/live_thread.rs:177][E: codex-rs/thread-store/src/live_thread.rs:179]
4. `append_items` 用当前 `history_mode` 计算 canonical persisted items 供 metadata observation，但仍把 raw batch 交给 store，让具体 store 在 durable boundary 做同一 mode-aware filter。[E: codex-rs/thread-store/src/live_thread.rs:201][E: codex-rs/thread-store/src/live_thread.rs:235][E: codex-rs/thread-store/src/live_thread.rs:241][E: codex-rs/thread-store/src/live_thread.rs:242]

## 控制流：LocalThreadStore

1. `LocalThreadStore` stores config, live `RolloutRecorder`s keyed by `ThreadId`, and an optional state DB handle.[E: codex-rs/thread-store/src/local/mod.rs:95][E: codex-rs/thread-store/src/local/mod.rs:96][E: codex-rs/thread-store/src/local/mod.rs:96][E: codex-rs/thread-store/src/local/mod.rs:111]
2. Local trait implementation delegates create/resume/append/persist/flush/shutdown/discard/read/revert 到 local modules。[E: codex-rs/thread-store/src/local/mod.rs:409][E: codex-rs/thread-store/src/local/mod.rs:439][E: codex-rs/thread-store/src/local/mod.rs:443][E: codex-rs/thread-store/src/local/mod.rs:447][E: codex-rs/thread-store/src/local/mod.rs:455][E: codex-rs/thread-store/src/local/mod.rs:459][E: codex-rs/thread-store/src/local/mod.rs:463][E: codex-rs/thread-store/src/local/mod.rs:485][E: codex-rs/thread-store/src/local/mod.rs:489]
3. Local create requires a cwd, builds `RolloutConfig`, and creates a `RolloutRecorder` with base instructions and dynamic tools.[E: codex-rs/thread-store/src/local/create_thread.rs:10][E: codex-rs/thread-store/src/local/create_thread.rs:15][E: codex-rs/thread-store/src/local/create_thread.rs:19][E: codex-rs/thread-store/src/local/create_thread.rs:21][E: codex-rs/thread-store/src/local/create_thread.rs:26][E: codex-rs/thread-store/src/local/create_thread.rs:28][E: codex-rs/thread-store/src/local/create_thread.rs:37][E: codex-rs/thread-store/src/local/create_thread.rs:38]
4. Local resume can take an explicit rollout path or resolve it via `read_thread`; it also requires a cwd before opening `RolloutRecorderParams::resume`.[E: codex-rs/thread-store/src/local/live_writer.rs:40][E: codex-rs/thread-store/src/local/live_writer.rs:49][E: codex-rs/thread-store/src/local/live_writer.rs:59][E: codex-rs/thread-store/src/local/live_writer.rs:73][E: codex-rs/thread-store/src/local/live_writer.rs:89][E: codex-rs/thread-store/src/local/live_writer.rs:94][E: codex-rs/thread-store/src/local/live_writer.rs:103]
5. Local append/persist/flush 汇入 `write_and_project`：先 mode-aware filter，保证 JSONL durable/flush barrier 成功；仅 Paginated 模式随后 materialize SQLite，所以 projection 可以落后但绝不会领先 canonical JSONL。[E: codex-rs/thread-store/src/local/live_writer.rs:309][E: codex-rs/thread-store/src/local/live_writer.rs:322][E: codex-rs/thread-store/src/local/live_writer.rs:337][E: codex-rs/thread-store/src/local/live_writer.rs:337]
6. `read_thread` prefers SQLite metadata when it can safely satisfy archive/history requirements, otherwise resolves and reads the rollout path.[E: codex-rs/thread-store/src/local/read_thread.rs:32][E: codex-rs/thread-store/src/local/read_thread.rs:37][E: codex-rs/thread-store/src/local/read_thread.rs:44][E: codex-rs/thread-store/src/local/read_thread.rs:77][E: codex-rs/thread-store/src/local/read_thread.rs:83][E: codex-rs/thread-store/src/local/read_thread.rs:89]
7. `list_threads` converts ThreadStore sort/cursor params, calls rollout listing, converts items to `StoredThread`, then merges titles from state DB and legacy name index.[E: codex-rs/thread-store/src/local/list_threads.rs:24][E: codex-rs/thread-store/src/local/list_threads.rs:35][E: codex-rs/thread-store/src/local/list_threads.rs:58][E: codex-rs/thread-store/src/local/list_threads.rs:73][E: codex-rs/thread-store/src/local/list_threads.rs:78][E: codex-rs/thread-store/src/local/list_threads.rs:93][E: codex-rs/thread-store/src/local/list_threads.rs:245]
8. Cross-thread `search_threads` 仍可经 rollout/`rg` 路径；单 thread `search_thread_occurrences` 则查询 SQLite 中的 user messages 与每 turn final agent item，并返回 occurrence 与 turn cursor。[E: codex-rs/thread-store/src/local/search_threads.rs:33][E: codex-rs/thread-store/src/local/thread_history/search.rs:51][E: codex-rs/thread-store/src/local/thread_history/search.rs:121][E: codex-rs/thread-store/src/local/thread_history/search.rs:144]
9. Metadata update applies SQLite first, persists live rollout compatibility when needed, reconciles the rollout, and supports git patch application through rollout and SQLite updates.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:38][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:55][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:76][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:124][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:140][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:185][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:197]

## Paginated fork、projection 与单 writer

`LocalThreadStore::prepare_fork` 委托 `paginated_fork::prepare`。它先取得 source lifecycle shared reservation，把 live writer 持久化并解析完整 rollout lineage；source projection 始终在 writer lock 下 materialize，只有非 `Latest` boundary 才先 materialize ancestor segments。[E: codex-rs/thread-store/src/local/mod.rs:481][E: codex-rs/thread-store/src/local/paginated_fork.rs:15][E: codex-rs/thread-store/src/local/paginated_fork.rs:40][E: codex-rs/thread-store/src/local/paginated_fork.rs:52][E: codex-rs/thread-store/src/local/paginated_fork.rs:67][E: codex-rs/thread-store/src/local/paginated_fork.rs:73]

fork boundary 有 `Latest`、`ThroughTurn(turn_id)`、`BeforeTurn(turn_id)` 三种。ThroughTurn 拒绝 in-progress turn；BeforeTurn 要求 persisted start boundary。最终 `PreparedFork` 保存 source id、history position、重建的 model context 和 lifecycle reservation，直到 child reference durable。[E: codex-rs/thread-store/src/local/paginated_fork.rs:83][E: codex-rs/thread-store/src/local/paginated_fork.rs:130][E: codex-rs/thread-store/src/local/paginated_fork.rs:151][E: codex-rs/thread-store/src/local/paginated_fork.rs:160]

进程内 `ThreadCoordination` 把 writer mutex 与 lifecycle rwlock 分离：fork 可持 shared lifecycle lease，同时 source 继续写；archive/delete 需 exclusive lifecycle。需要两把锁的路径固定先 lifecycle 后 writer，避免反向锁序。[E: codex-rs/thread-store/src/local/mod.rs:113][E: codex-rs/thread-store/src/local/mod.rs:130]

跨进程 file lock 现在适用于所有 history modes：create 在 recorder 创建前 acquire，resume 在解析 history mode 前 acquire；non-live threads 的 archive/delete/fork coordination 也可批量 acquire。guard 随 live recorder 持有，已有 active writer 时返回 conflict，drop 时关闭并删除锁文件。[E: codex-rs/thread-store/src/local/live_writer.rs:25][E: codex-rs/thread-store/src/local/live_writer.rs:33][E: codex-rs/thread-store/src/local/live_writer.rs:40][E: codex-rs/thread-store/src/local/live_writer.rs:46][E: codex-rs/thread-store/src/local/mod.rs:267][E: codex-rs/thread-store/src/local/mod.rs:275][E: codex-rs/thread-store/src/local/mod.rs:281][E: codex-rs/thread-store/src/local/mod.rs:284][E: codex-rs/thread-store/src/local/writer_lock.rs:168][E: codex-rs/thread-store/src/local/writer_lock.rs:188]

Paginated projection 只有在 state DB 存在时启用。projector 只读取 newline-terminated prefix；malformed/unknown lines 先 pending，直到 later ordinal 能解释 gap，否则 ordinal regression 或 unexplained gap 报错。对有缺失 item timestamp 的 change 才解析 line timestamp，接受的 skipped range 与 line step 一并推进 projection offset。[E: codex-rs/thread-store/src/local/thread_history_materialization.rs:24][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:107][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:118][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:135][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:188][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:200][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:213][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:239][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:251][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:263]

Turn summary list now marks `items_view=Summary` and queries first/final summary items with the turn page；synthetic interrupted fork turns only fall back to inherited summary when the projected row has no items。[E: codex-rs/thread-store/src/local/thread_history/read.rs:95][E: codex-rs/thread-store/src/local/thread_history/read.rs:123][E: codex-rs/thread-store/src/local/thread_history/read.rs:132][E: codex-rs/thread-store/src/local/thread_history/segment_paging.rs:112][E: codex-rs/thread-store/src/local/thread_history/segment_paging.rs:159][E: codex-rs/thread-store/src/local/thread_history/segment_paging.rs:165]

## Persisted sections

Local store 的 section CRUD/move 由 state DB 支持，`StoredThread` 返回 section、sparse position 与 entered-at。Section support 和 paginated history list support 都以 `state_db.is_some()` 为 gate；没有 state DB 时，thread-history DB 与 paginated fork 返回 unsupported，而 durable JSONL create/resume/write 仍可工作。[E: codex-rs/thread-store/src/types.rs:572][E: codex-rs/thread-store/src/types.rs:574][E: codex-rs/thread-store/src/types.rs:578][E: codex-rs/thread-store/src/local/mod.rs:216][E: codex-rs/thread-store/src/local/mod.rs:216][E: codex-rs/thread-store/src/local/mod.rs:444][E: codex-rs/thread-store/src/local/mod.rs:478][E: codex-rs/thread-store/src/local/paginated_fork.rs:47]

多 segment lineage 的 page/materialization 仍有严格边界：不能把“可分页读取继承 history”推广成任意 incremental item replay 都受支持。[U]

## Reserved thread ID 与 pending metadata

`ThreadManager::reserve_thread_id` 在 startup 前分配 id，让 host 先挂自己的状态。`StartThreadOptions.reserved_thread_id` 只能用于 `New` / `Cleared` / `Forked`；`Resumed` 直接 `InvalidRequest`。[E: codex-rs/core/src/thread_manager.rs:898][E: codex-rs/core/src/session/session.rs:667][E: codex-rs/core/src/thread_manager.rs:1777]

`LocalThreadStore::stage_pending_thread_metadata` 要求 state DB，禁止 patch `rollout_path`，空 patch 与重复 stage 都是 `InvalidRequest`。条目只活在内存里，直到第一次成功 metadata update 或 idle shutdown/discard 清掉。[E: codex-rs/thread-store/src/local/mod.rs:418][E: codex-rs/thread-store/src/local/mod.rs:423][E: codex-rs/thread-store/src/local/pending_thread_metadata.rs:33][E: codex-rs/thread-store/src/local/pending_thread_metadata.rs:44][E: codex-rs/thread-store/src/local/live_writer.rs:195][E: codex-rs/thread-store/src/local/live_writer.rs:207]

第一方 app-server / TUI 路径当前没有调用 `reserve_thread_id` + `stage_pending_thread_metadata`；可见用法在 core 集成测试。[U]

## Paginated revert

`revert_thread` 要求 state DB、thread 未 live、history mode 是 Paginated。它 materialize lineage，按 `ForkBoundary::BeforeTurn` 取 retained prefix，创建带新 `rollout_id` 的 replacement JSONL，再用 `replace_rollout_path_if_current` CAS 切换指针。CAS 失败会删掉 replacement 文件并返回 `Conflict`。旧 rollout 文件保留。[E: codex-rs/thread-store/src/local/revert_thread.rs:27][E: codex-rs/thread-store/src/local/revert_thread.rs:35][E: codex-rs/thread-store/src/local/revert_thread.rs:65][E: codex-rs/thread-store/src/local/revert_thread.rs:91][E: codex-rs/thread-store/src/local/revert_thread.rs:106][E: codex-rs/thread-store/src/local/revert_thread.rs:116]

Live `Op::ThreadRollback` 只服务 Legacy in-memory drop；Paginated 客户端应走 `thread/revert`。两者都不回滚磁盘文件改动。[E: codex-rs/protocol/src/protocol.rs:676][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2122]

## Persistent exec 的 paginated history

非 ephemeral `codex exec` 通过 app-server `thread/start` 时把 `history_mode` 设为 `Paginated`。若服务器拒绝 “paginated threads require thread/turns/list and thread/items/list support”，exec 去掉 `history_mode` 再试一次。resume 默认 `exclude_turns: true`，让客户端用 paginated list 补历史。[E: codex-rs/exec/src/lib.rs:1186][E: codex-rs/exec/src/lib.rs:1157][E: codex-rs/exec/src/lib.rs:1215]

## Gotcha

- Do not describe local create/resume/append/load-history as unsupported; current `LocalThreadStore` implements them through `live_writer` and `load_history`.[E: codex-rs/thread-store/src/local/mod.rs:409][E: codex-rs/thread-store/src/local/mod.rs:439][E: codex-rs/thread-store/src/local/mod.rs:443][E: codex-rs/thread-store/src/local/mod.rs:467]
- `LiveThread::append_items` passes raw items to the store but observes only canonical persisted items for metadata sync.[E: codex-rs/thread-store/src/live_thread.rs:201][E: codex-rs/thread-store/src/live_thread.rs:235][E: codex-rs/thread-store/src/live_thread.rs:244][E: codex-rs/thread-store/src/live_thread.rs:252]
- `list_turns` / `list_items` 不是 local unsupported：Local store 已 override；调用前会验证目标确为 Paginated thread。[E: codex-rs/thread-store/src/local/mod.rs:385][E: codex-rs/thread-store/src/local/mod.rs:390][E: codex-rs/thread-store/src/local/mod.rs:542][E: codex-rs/thread-store/src/local/thread_history/read.rs:99]
- Git metadata patch is no longer an unimplemented local case; the update path reads existing DB metadata, resolves the git patch, writes rollout compatibility, and applies SQLite git info.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:140][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:171][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:185][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:197]

## Sources

- `codex-rs/thread-store/src/lib.rs`
- `codex-rs/thread-store/src/store.rs`
- `codex-rs/thread-store/src/live_thread.rs`
- `codex-rs/thread-store/src/types.rs`
- `codex-rs/thread-store/src/local/mod.rs`
- `codex-rs/thread-store/src/local/create_thread.rs`
- `codex-rs/thread-store/src/local/live_writer.rs`
- `codex-rs/thread-store/src/local/model_context.rs`
- `codex-rs/thread-store/src/local/paginated_fork.rs`
- `codex-rs/thread-store/src/local/rollout_lineage.rs`
- `codex-rs/thread-store/src/local/writer_lock.rs`
- `codex-rs/thread-store/src/local/thread_sections.rs`
- `codex-rs/thread-store/src/local/move_thread_to_section.rs`
- `codex-rs/thread-store/src/local/thread_history/segment_paging.rs`
- `codex-rs/thread-store/src/local/thread_history_materialization.rs`
- `codex-rs/thread-store/src/local/thread_history/read.rs`
- `codex-rs/thread-store/src/local/thread_history/search.rs`
- `codex-rs/thread-store/src/local/read_thread.rs`
- `codex-rs/thread-store/src/local/list_threads.rs`
- `codex-rs/thread-store/src/local/search_threads.rs`
- `codex-rs/thread-store/src/local/update_thread_metadata.rs`
- `codex-rs/thread-store/src/queue_store.rs`
- `codex-rs/thread-store/src/local/pending_thread_metadata.rs`
- `codex-rs/thread-store/src/local/revert_thread.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/thread_rollout_truncation.rs`
- `codex-rs/history/src/lib.rs`
- `codex-rs/rollout/src/lib.rs`
- `codex-rs/exec/src/lib.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- [State DB](state-db.md)
- [Realtime conversation](realtime-conversation.md)
- [Thread queue](thread-queue.md)
- [Rollout migration](rollout-migration.md)
