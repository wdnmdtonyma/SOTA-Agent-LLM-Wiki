---
id: subsys.core.thread-store
title: ThreadStore 抽象层
kind: subsystem
tier: T2
source: [codex-rs/thread-store/src/lib.rs, codex-rs/thread-store/src/store.rs, codex-rs/thread-store/src/live_thread.rs, codex-rs/thread-store/src/types.rs, codex-rs/thread-store/src/queue_store.rs, codex-rs/thread-store/src/thread_attachments.rs, codex-rs/thread-store/src/local/mod.rs, codex-rs/thread-store/src/local/create_thread.rs, codex-rs/thread-store/src/local/live_writer.rs, codex-rs/thread-store/src/local/model_context.rs, codex-rs/thread-store/src/local/paginated_fork.rs, codex-rs/thread-store/src/local/rollout_lineage.rs, codex-rs/rollout/src/writer_lock.rs, codex-rs/thread-store/src/local/thread_sections.rs, codex-rs/thread-store/src/local/move_thread_to_section.rs, codex-rs/thread-store/src/local/thread_history/segment_paging.rs, codex-rs/thread-store/src/local/thread_history_materialization.rs, codex-rs/thread-store/src/local/thread_history/read.rs, codex-rs/thread-store/src/local/thread_history/search.rs, codex-rs/thread-store/src/local/read_thread.rs, codex-rs/thread-store/src/local/list_threads.rs, codex-rs/thread-store/src/local/search_threads.rs, codex-rs/thread-store/src/local/update_thread_metadata.rs, codex-rs/thread-store/src/local/pending_thread_metadata.rs, codex-rs/thread-store/src/local/revert_thread.rs, codex-rs/thread-store/src/local/thread_attachments.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/thread_rollout_truncation.rs, codex-rs/history/src/lib.rs, codex-rs/rollout/src/lib.rs, codex-rs/exec/src/lib.rs, codex-rs/protocol/src/protocol.rs, codex-rs/app-server/src/request_processors/thread_processor.rs, codex-rs/app-server/src/request_processors/thread_attachments.rs, codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/attachment-store/src/lib.rs]
symbols: [ThreadStore, LiveThread, LiveThreadInitGuard, LocalThreadStore, LocalThreadStoreConfig, StoredThread, StoredThreadHistory, StoredModelContext, ThreadMetadataPatch, PrepareForkParams, PreparedFork, ForkBoundary, WriterLockCoordinator, CreateThreadParams, ResumeThreadParams, AppendThreadItemsParams, RevertThreadParams, RolloutWriteOp, materialize_to_sqlite, move_thread_to_section, PendingThreadMetadataRegistry, thread-store::QueueStore, AttachmentStore, InlineAttachmentStore, AddThreadAttachmentParams, ListThreadAttachmentsParams, RemoveThreadAttachmentParams]
related: [subsys.core.rollout-persistence, subsys.core.state-db, subsys.core.realtime-conversation, subsys.core.thread-queue, subsys.core.rollout-migration]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `codex-rs/thread-store` 是 thread persistence 的 storage-neutral boundary。local 实现以 JSONL rollout 为 durable source of truth；Paginated 模式在 durable write 成功后再投影 SQLite。client RPC `rollout/compress` 标 experimental，当前 processor 对不支持的 store 返回 unsupported。[E: codex-rs/thread-store/src/local/live_writer.rs:345][E: codex-rs/app-server-protocol/src/protocol/common.rs:710][E: codex-rs/app-server-protocol/src/protocol/common.rs:712]

## 能回答的问题

- `ThreadStore` trait 当前要求实现哪些 thread lifecycle/read/list/update 方法？
- `LiveThread` 如何封装 create/resume/append/persist/flush/shutdown/discard？
- `LocalThreadStore` 如何把 live writer 操作映射到 `RolloutRecorder`？
- list/read/search/update metadata 在本地如何走 rollout 与 SQLite？
- 哪些 trait 方法仍是默认 unsupported？
- paginated fork / revert 如何冻结 lineage 并替换 durable path？
- reserved thread ID 与 pending metadata 何时生效？
- 单 writer 与 section ordering 怎样持久化？
- thread attachments 存在哪里，谁在 durable write 之外持有它们？

## 职责边界

- `ThreadStore` is a trait boundary, not a persistence format; implementations resolve `ThreadId` to backing storage.[E: codex-rs/thread-store/src/store.rs:93][E: codex-rs/thread-store/src/store.rs:106]
- `codex-attachment-store` is a separate injectable persistence trait for attachment bytes. `ThreadManagerState` holds `image_store: Arc<dyn AttachmentStore>` (default `InlineAttachmentStore` inlines data URLs). Do not treat it as a ThreadStore implementation or a new wiki node.[E: codex-rs/attachment-store/src/lib.rs:28][E: codex-rs/attachment-store/src/lib.rs:161][E: codex-rs/core/src/thread_manager.rs:35][E: codex-rs/core/src/thread_manager.rs:420]
- `LiveThread` is the active thread handle for session code; it delegates storage to `ThreadStore` and owns metadata-sync bookkeeping.[E: codex-rs/thread-store/src/live_thread.rs:38][E: codex-rs/thread-store/src/live_thread.rs:40][E: codex-rs/thread-store/src/live_thread.rs:41]
- `LocalThreadStore` combines local config, live rollout recorders, metadata State DB handle, and lazy thread-history DB pool；append 先按 thread history mode 过滤，再 durable JSONL write，Paginated 模式最后更新 SQLite projection。[E: codex-rs/thread-store/src/local/live_writer.rs:330][E: codex-rs/thread-store/src/local/live_writer.rs:345]
- The current public crate surface exports `InMemoryThreadStore`, `LiveThread`, `LocalThreadStore`、`QueueStore`/`LocalQueueStore`、migration types 与 trait/types。[E: codex-rs/thread-store/src/lib.rs:29][E: codex-rs/thread-store/src/lib.rs:33][E: codex-rs/thread-store/src/lib.rs:53][E: codex-rs/thread-store/src/lib.rs:54]
- Durable queue 的 RPC/dispatch 权威节点是 `subsys.core.thread-queue`；Legacy→Paginated 后台迁移权威节点是 `subsys.core.rollout-migration`。`RolloutItem` payload 定义在 `codex-rs/history`，由 rollout crate re-export。[E: codex-rs/history/src/lib.rs:201][E: codex-rs/rollout/src/lib.rs:37]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/thread-store/src/store.rs` | Trait API for create/resume/append/read/list/update/archive/delete.[E: codex-rs/thread-store/src/store.rs:95][E: codex-rs/thread-store/src/store.rs:101][E: codex-rs/thread-store/src/store.rs:102][E: codex-rs/thread-store/src/store.rs:176][E: codex-rs/thread-store/src/store.rs:187][E: codex-rs/thread-store/src/store.rs:509][E: codex-rs/thread-store/src/store.rs:536] |
| `codex-rs/thread-store/src/live_thread.rs` | Active-thread lifecycle wrapper and metadata sync bridge.[E: codex-rs/thread-store/src/live_thread.rs:136][E: codex-rs/thread-store/src/live_thread.rs:182][E: codex-rs/thread-store/src/live_thread.rs:238] |
| `codex-rs/thread-store/src/types.rs` | Create/resume/append params, persistence metadata, stored thread model, metadata patch schema.[E: codex-rs/thread-store/src/types.rs:57][E: codex-rs/thread-store/src/types.rs:74][E: codex-rs/thread-store/src/types.rs:123][E: codex-rs/thread-store/src/types.rs:598][E: codex-rs/thread-store/src/types.rs:727] |
| `codex-rs/thread-store/src/local/*` | Local rollout/state DB adapters for live writing, read/list/search/update/archive/delete.[E: codex-rs/thread-store/src/local/mod.rs:483][E: codex-rs/thread-store/src/local/mod.rs:502][E: codex-rs/thread-store/src/local/mod.rs:527][E: codex-rs/thread-store/src/local/mod.rs:585][E: codex-rs/thread-store/src/local/mod.rs:599] |
| `codex-rs/thread-store/src/local/thread_history_*` | Paginated history 的 JSONL→SQLite materialization、turn/item pagination 与 visible-message occurrence search。[E: codex-rs/thread-store/src/local/thread_history_materialization.rs:23][E: codex-rs/thread-store/src/local/thread_history/read.rs:101][E: codex-rs/thread-store/src/local/thread_history/read.rs:159][E: codex-rs/thread-store/src/local/thread_history/search.rs:51] |
| `codex-rs/thread-store/src/local/model_context.rs` | 对未压缩 Paginated rollout 做 reverse scan，只重建最新 model-visible context；Legacy/压缩文件保持 full-history path。[E: codex-rs/thread-store/src/local/model_context.rs:67][E: codex-rs/thread-store/src/local/model_context.rs:69][E: codex-rs/thread-store/src/local/model_context.rs:168] |
| `paginated_fork.rs` / `rollout_lineage.rs` | 冻结 source lineage，解析 Latest/ThroughTurn/BeforeTurn 边界并构造 child reference/model context。[E: codex-rs/thread-store/src/local/paginated_fork.rs:15][E: codex-rs/thread-store/src/local/paginated_fork.rs:23][E: codex-rs/thread-store/src/local/paginated_fork.rs:79][E: codex-rs/thread-store/src/local/paginated_fork.rs:83] |
| `codex-rs/rollout/src/writer_lock.rs` | `WriterLockCoordinator` 现属于 rollout crate。所有 history modes 的 live thread 都取得 process 间 advisory file lock；第二个 active writer 返回 `ThreadStoreError::Conflict`。[E: codex-rs/thread-store/src/local/live_writer.rs:33][E: codex-rs/thread-store/src/local/live_writer.rs:46][E: codex-rs/thread-store/src/local/mod.rs:335][E: codex-rs/rollout/src/writer_lock.rs:21][E: codex-rs/rollout/src/writer_lock.rs:43] |
| `thread_attachments.rs` / `local/thread_attachments.rs` | thread-owned attachment 参数与 State DB adapter。`LocalThreadStore` 仅在 `state_db` 存在时 `supports_thread_attachments`；add/remove 持 lifecycle reservation。[E: codex-rs/thread-store/src/store.rs:303][E: codex-rs/thread-store/src/local/mod.rs:634][E: codex-rs/thread-store/src/local/thread_attachments.rs:33][E: codex-rs/thread-store/src/local/thread_attachments.rs:37] |
| `thread_sections.rs` / `move_thread_to_section.rs` | State-DB-backed section CRUD 与 thread move adapter；Local store only advertises section support when state DB exists。[E: codex-rs/thread-store/src/local/mod.rs:602][E: codex-rs/thread-store/src/local/mod.rs:606][E: codex-rs/thread-store/src/local/mod.rs:613][E: codex-rs/thread-store/src/local/mod.rs:620] |
| `pending_thread_metadata.rs` | 在 reserved thread id 真正 create 之前，暂存 host-owned `ThreadMetadataPatch`。[E: codex-rs/thread-store/src/local/pending_thread_metadata.rs:21][E: codex-rs/thread-store/src/store.rs:112] |
| `revert_thread.rs` | 对未加载 Paginated thread 写新 immutable rollout，CAS 替换 SQLite path。[E: codex-rs/thread-store/src/local/revert_thread.rs:19][E: codex-rs/thread-store/src/local/revert_thread.rs:133] |
| `queue_store.rs` | `QueueStore` / `LocalQueueStore` 适配；行为见 `subsys.core.thread-queue`。[E: codex-rs/thread-store/src/queue_store.rs:14] |
| `codex-rs/attachment-store` | Injectable `AttachmentStore` on `ThreadManager`; not a ThreadStore backend.[E: codex-rs/attachment-store/src/lib.rs:28][E: codex-rs/core/src/thread_manager.rs:420] |
| `thread_rollout_truncation.rs` | Replay 已持久化的 `ThreadRolledBack` marker：按 user/inter-agent turn boundary 计算 fork/truncation 切点。这不是活 `Op::ThreadRollback`。[E: codex-rs/core/src/thread_rollout_truncation.rs:44][E: codex-rs/core/src/thread_rollout_truncation.rs:57][E: codex-rs/core/src/thread_rollout_truncation.rs:79] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ThreadPersistenceMetadata` | cwd, model provider, memory mode | Metadata required when opening live persistence.[E: codex-rs/thread-store/src/types.rs:57][E: codex-rs/thread-store/src/types.rs:61][E: codex-rs/thread-store/src/types.rs:63][E: codex-rs/thread-store/src/types.rs:65] |
| `CreateThreadParams` | thread id, fork/parent ids, source, thread source, base instructions, dynamic tools, multi-agent version, metadata | New-thread persistence input passed to `LocalThreadStore` and `RolloutRecorderParams::new`.[E: codex-rs/thread-store/src/types.rs:74][E: codex-rs/thread-store/src/types.rs:82][E: codex-rs/thread-store/src/types.rs:84][E: codex-rs/thread-store/src/types.rs:88][E: codex-rs/thread-store/src/types.rs:90][E: codex-rs/thread-store/src/types.rs:92][E: codex-rs/thread-store/src/types.rs:94][E: codex-rs/thread-store/src/types.rs:98][E: codex-rs/thread-store/src/types.rs:100][E: codex-rs/thread-store/src/types.rs:105][E: codex-rs/thread-store/src/types.rs:118] |
| `ResumeThreadParams` | thread id, optional rollout path, optional history, include_archived, metadata | Resume input can avoid rereading history/path if the caller already knows them.[E: codex-rs/thread-store/src/types.rs:123][E: codex-rs/thread-store/src/types.rs:125][E: codex-rs/thread-store/src/types.rs:127][E: codex-rs/thread-store/src/types.rs:129][E: codex-rs/thread-store/src/types.rs:131][E: codex-rs/thread-store/src/types.rs:133] |
| `StoredThread` | rollout path, parent/fork ids, preview/name, model/provider/effort, timestamps, optional section + sparse position + entered-at, cwd/source/agent/git/approval/profile/tokens/history | Unified read/list response model；section identity/order 已取代旧 `is_pinned` boolean。[E: codex-rs/thread-store/src/types.rs:598][E: codex-rs/thread-store/src/types.rs:607][E: codex-rs/thread-store/src/types.rs:631][E: codex-rs/thread-store/src/types.rs:634][E: codex-rs/thread-store/src/types.rs:637] |
| `ThreadMetadataPatch` | name、rollout path、preview/title/model/source/git 等 | literal patch；thread section move 不混入 metadata patch，而是单独 store operation。[E: codex-rs/thread-store/src/types.rs:727] |
| `RevertThreadParams` | `thread_id`, `before_turn_id` | Paginated revert 输入：新文件保留该 turn 之前的 prefix。[E: codex-rs/thread-store/src/types.rs:215] |

## Trait API

1. The required lifecycle methods are create, resume, append, persist, flush, shutdown, and discard。[E: codex-rs/thread-store/src/store.rs:106][E: codex-rs/thread-store/src/store.rs:142][E: codex-rs/thread-store/src/store.rs:148][E: codex-rs/thread-store/src/store.rs:169][E: codex-rs/thread-store/src/store.rs:176][E: codex-rs/thread-store/src/store.rs:180][E: codex-rs/thread-store/src/store.rs:187]
2. Host 可在 create 前 `stage_pending_thread_metadata` / `remove_pending_thread_metadata`；默认实现 unsupported。[E: codex-rs/thread-store/src/store.rs:112][E: codex-rs/thread-store/src/store.rs:133]
3. Trait 包含 `default_history_mode`、`load_latest_model_context`、`prepare_fork`、`revert_thread`、`supports_paginated_history_lists` 与 per-thread occurrence search；这些方法有兼容 default（Legacy/false/unsupported）。[E: codex-rs/thread-store/src/store.rs:101][E: codex-rs/thread-store/src/store.rs:198][E: codex-rs/thread-store/src/store.rs:212][E: codex-rs/thread-store/src/store.rs:227][E: codex-rs/thread-store/src/store.rs:425]
4. `search_threads`、occurrence search、`list_turns`、`list_items` 在 trait 层仍可 unsupported，但 `LocalThreadStore` 全部 override。[E: codex-rs/thread-store/src/local/mod.rs:727][E: codex-rs/thread-store/src/local/mod.rs:715][E: codex-rs/thread-store/src/local/mod.rs:719]
5. Metadata/archive/delete methods remain part of the trait surface。[E: codex-rs/thread-store/src/store.rs:491][E: codex-rs/thread-store/src/store.rs:509]

## 控制流：LiveThread

1. `LiveThread::create` captures both thread id and `history_mode`; all later filtering follows this persisted mode rather than a global policy。[E: codex-rs/thread-store/src/live_thread.rs:136][E: codex-rs/thread-store/src/live_thread.rs:140][E: codex-rs/thread-store/src/live_thread.rs:141][E: codex-rs/thread-store/src/live_thread.rs:146]
2. `create_with_inherited_model_context` 先计算 canonical prefix 长度并写入 `subagent_history_start_ordinal`，再创建 child 和持久化 inherited prefix；SQLite projection 因而能跳过 child-own history boundary 之前的 inherited records。[E: codex-rs/thread-store/src/live_thread.rs:157][E: codex-rs/thread-store/src/live_thread.rs:165][E: codex-rs/thread-store/src/live_thread.rs:135][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:26][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:55]
3. `LiveThread::resume` calls `resume_thread`; if history was not supplied, it loads history and discards the live writer on load failure。[E: codex-rs/thread-store/src/live_thread.rs:182][E: codex-rs/thread-store/src/live_thread.rs:204][E: codex-rs/thread-store/src/live_thread.rs:205][E: codex-rs/thread-store/src/live_thread.rs:214]
4. `append_items` 用当前 `history_mode` 计算 canonical persisted items 供 metadata observation，但仍把 raw batch 交给 store，让具体 store 在 durable boundary 做同一 mode-aware filter。[E: codex-rs/thread-store/src/live_thread.rs:238][E: codex-rs/thread-store/src/live_thread.rs:270][E: codex-rs/thread-store/src/live_thread.rs:276][E: codex-rs/thread-store/src/live_thread.rs:277]

## 控制流：LocalThreadStore

1. `LocalThreadStore` stores config, live `RolloutRecorder`s keyed by `ThreadId`, and an optional state DB handle.[E: codex-rs/thread-store/src/local/mod.rs:140][E: codex-rs/thread-store/src/local/mod.rs:141][E: codex-rs/thread-store/src/local/mod.rs:142][E: codex-rs/thread-store/src/local/mod.rs:146]
2. Local trait implementation delegates create/resume/append/persist/flush/shutdown/discard/read/revert 到 local modules。[E: codex-rs/thread-store/src/local/mod.rs:483][E: codex-rs/thread-store/src/local/mod.rs:526][E: codex-rs/thread-store/src/local/mod.rs:530][E: codex-rs/thread-store/src/local/mod.rs:534][E: codex-rs/thread-store/src/local/mod.rs:551][E: codex-rs/thread-store/src/local/mod.rs:555][E: codex-rs/thread-store/src/local/mod.rs:559][E: codex-rs/thread-store/src/local/mod.rs:581][E: codex-rs/thread-store/src/local/mod.rs:585]
3. Local create requires a cwd, builds `RolloutConfig`, and creates a `RolloutRecorder` with base instructions and dynamic tools.[E: codex-rs/thread-store/src/local/create_thread.rs:11][E: codex-rs/thread-store/src/local/create_thread.rs:17][E: codex-rs/thread-store/src/local/create_thread.rs:21][E: codex-rs/thread-store/src/local/create_thread.rs:23][E: codex-rs/thread-store/src/local/create_thread.rs:28][E: codex-rs/thread-store/src/local/create_thread.rs:28][E: codex-rs/thread-store/src/local/create_thread.rs:39][E: codex-rs/thread-store/src/local/create_thread.rs:40]
4. Local resume can take an explicit rollout path or resolve it via `read_thread`; it also requires a cwd before opening `RolloutRecorderParams::resume`.[E: codex-rs/thread-store/src/local/live_writer.rs:40][E: codex-rs/thread-store/src/local/live_writer.rs:49][E: codex-rs/thread-store/src/local/live_writer.rs:59][E: codex-rs/thread-store/src/local/live_writer.rs:73][E: codex-rs/thread-store/src/local/live_writer.rs:89][E: codex-rs/thread-store/src/local/live_writer.rs:94][E: codex-rs/thread-store/src/local/live_writer.rs:103]
5. Local append/persist/flush 汇入 `write_and_project`：先 mode-aware filter，保证 JSONL durable/flush barrier 成功；仅 Paginated 模式随后 materialize SQLite，所以 projection 可以落后但绝不会领先 canonical JSONL。[E: codex-rs/thread-store/src/local/live_writer.rs:317][E: codex-rs/thread-store/src/local/live_writer.rs:330][E: codex-rs/thread-store/src/local/live_writer.rs:345][E: codex-rs/thread-store/src/local/live_writer.rs:345]
6. `read_thread` prefers SQLite metadata when it can safely satisfy archive/history requirements, otherwise resolves and reads the rollout path.[E: codex-rs/thread-store/src/local/read_thread.rs:33][E: codex-rs/thread-store/src/local/read_thread.rs:45][E: codex-rs/thread-store/src/local/read_thread.rs:52][E: codex-rs/thread-store/src/local/read_thread.rs:89][E: codex-rs/thread-store/src/local/read_thread.rs:95][E: codex-rs/thread-store/src/local/read_thread.rs:101]
7. `list_threads` converts ThreadStore sort/cursor params, calls rollout listing, converts items to `StoredThread`, then merges titles from state DB and legacy name index.[E: codex-rs/thread-store/src/local/list_threads.rs:24][E: codex-rs/thread-store/src/local/list_threads.rs:35][E: codex-rs/thread-store/src/local/list_threads.rs:58][E: codex-rs/thread-store/src/local/list_threads.rs:73][E: codex-rs/thread-store/src/local/list_threads.rs:78][E: codex-rs/thread-store/src/local/list_threads.rs:93][E: codex-rs/thread-store/src/local/list_threads.rs:253]
8. Cross-thread `search_threads` 仍可经 rollout/`rg` 路径；单 thread `search_thread_occurrences` 则查询 SQLite 中的 user messages 与每 turn final agent item，并返回 occurrence 与 turn cursor。[E: codex-rs/thread-store/src/local/search_threads.rs:36][E: codex-rs/thread-store/src/local/thread_history/search.rs:51][E: codex-rs/thread-store/src/local/thread_history/search.rs:121][E: codex-rs/thread-store/src/local/thread_history/search.rs:144]
9. Metadata update applies SQLite first, persists live rollout compatibility when needed, reconciles the rollout, and supports git patch application through rollout and SQLite updates.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:42][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:64][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:85][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:152][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:167][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:225][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:237]

## Paginated fork、projection 与单 writer

`LocalThreadStore::prepare_fork` 委托 `paginated_fork::prepare`。它先取得 source lifecycle shared reservation，把 live writer 持久化并解析完整 rollout lineage；source projection 始终在 writer lock 下 materialize，只有非 `Latest` boundary 才先 materialize ancestor segments。[E: codex-rs/thread-store/src/local/mod.rs:577][E: codex-rs/thread-store/src/local/paginated_fork.rs:15][E: codex-rs/thread-store/src/local/paginated_fork.rs:40][E: codex-rs/thread-store/src/local/paginated_fork.rs:52][E: codex-rs/thread-store/src/local/paginated_fork.rs:67][E: codex-rs/thread-store/src/local/paginated_fork.rs:73]

fork boundary 有 `Latest`、`ThroughTurn(turn_id)`、`BeforeTurn(turn_id)` 三种。ThroughTurn 拒绝 in-progress turn；BeforeTurn 要求 persisted start boundary。最终 `PreparedFork` 保存 source id、history position、重建的 model context 和 lifecycle reservation，直到 child reference durable。[E: codex-rs/thread-store/src/local/paginated_fork.rs:79][E: codex-rs/thread-store/src/local/paginated_fork.rs:83][E: codex-rs/thread-store/src/local/paginated_fork.rs:115][E: codex-rs/thread-store/src/local/paginated_fork.rs:140]

进程内 `ThreadCoordination` 把 writer mutex 与 lifecycle rwlock 分离：fork 可持 shared lifecycle lease，同时 source 继续写；archive/delete 需 exclusive lifecycle。需要两把锁的路径固定先 lifecycle 后 writer，避免反向锁序。[E: codex-rs/thread-store/src/local/mod.rs:175][E: codex-rs/thread-store/src/local/mod.rs:182]

跨进程 file lock 现在适用于所有 history modes，实现位于 `codex-rs/rollout/src/writer_lock.rs`：create 在 recorder 创建前 acquire，resume 在打开 recorder 前 acquire；non-live threads 的 archive/delete/fork coordination 也可批量 acquire。guard 随 live recorder 持有，已有 active writer 时 `WouldBlock` 映射为 `ThreadStoreError::Conflict`，drop 时关闭并删除锁文件。[E: codex-rs/thread-store/src/local/live_writer.rs:30][E: codex-rs/thread-store/src/local/live_writer.rs:33][E: codex-rs/thread-store/src/local/live_writer.rs:44][E: codex-rs/thread-store/src/local/live_writer.rs:46][E: codex-rs/thread-store/src/local/mod.rs:335][E: codex-rs/thread-store/src/local/mod.rs:352][E: codex-rs/rollout/src/writer_lock.rs:65][E: codex-rs/rollout/src/writer_lock.rs:174]

Paginated projection 只有在 state DB 存在时启用。projector 只读取 newline-terminated prefix；malformed/unknown lines 跳过并推进 byte checkpoint。ordinal 回退/重复记 anomaly 后跳过，不报错；forward gap 记成 `SkippedOrdinalRange`。对有缺失 item timestamp 的 change（或非 inherited RealtimeItem）才解析 line timestamp，接受的 skipped range 与 line step 一并推进 projection offset。[E: codex-rs/thread-store/src/local/thread_history_materialization.rs:28][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:125][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:134][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:149][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:186][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:206][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:229][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:268][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:282][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:294]

Turn summary list now marks `items_view=Summary` and queries first/final summary items with the turn page；synthetic interrupted fork turns only fall back to inherited summary when the projected row has no items。[E: codex-rs/thread-store/src/local/thread_history/read.rs:101][E: codex-rs/thread-store/src/local/thread_history/read.rs:129][E: codex-rs/thread-store/src/local/thread_history/read.rs:138][E: codex-rs/thread-store/src/local/thread_history/segment_paging.rs:113][E: codex-rs/thread-store/src/local/thread_history/segment_paging.rs:164][E: codex-rs/thread-store/src/local/thread_history/segment_paging.rs:170]

## Persisted sections

Local store 的 section CRUD/move 由 state DB 支持，`StoredThread` 返回 section、sparse position 与 entered-at。Section support 和 paginated history list support 都以 `state_db.is_some()` 为 gate；没有 state DB 时，thread-history DB 与 paginated fork 返回 unsupported，而 durable JSONL create/resume/write 仍可工作。[E: codex-rs/thread-store/src/types.rs:631][E: codex-rs/thread-store/src/types.rs:634][E: codex-rs/thread-store/src/types.rs:637][E: codex-rs/thread-store/src/local/mod.rs:602][E: codex-rs/thread-store/src/local/mod.rs:711][E: codex-rs/thread-store/src/local/paginated_fork.rs:47]

多 segment lineage 的 page/materialization 仍有严格边界：不能把“可分页读取继承 history”推广成任意 incremental item replay 都受支持。[U]

## Thread attachments

`ThreadStore` 默认不支持 attachments；`LocalThreadStore` 仅在 state DB 存在时 override `supports_thread_attachments` / `add` / `list` / `remove`。payload 存在 State DB，不是 JSONL rollout。RPC 入口是 `thread/attachment/{add,list,remove}`，变更后广播 `thread/attachment/updated`。[E: codex-rs/thread-store/src/store.rs:303][E: codex-rs/thread-store/src/local/mod.rs:634][E: codex-rs/thread-store/src/local/thread_attachments.rs:37][E: codex-rs/app-server/src/request_processors/thread_attachments.rs:36][E: codex-rs/app-server-protocol/src/protocol/common.rs:665][E: codex-rs/app-server-protocol/src/protocol/common.rs:1928]

这与 `codex-attachment-store` 的 image/data-URL `AttachmentStore` 不是同一条路径：后者挂在 `ThreadManagerState.image_store`，给模型看图；前者是 thread-owned 元数据 attachment。[E: codex-rs/attachment-store/src/lib.rs:28][E: codex-rs/core/src/thread_manager.rs:420]

## Reserved thread ID 与 pending metadata

`ThreadManager::reserve_thread_id` 在 startup 前分配 id，让 host 先挂自己的状态。`StartThreadOptions.reserved_thread_id` 只能用于 `New` / `Cleared` / `Forked`；`Resumed` 直接 `InvalidRequest`。[E: codex-rs/core/src/thread_manager.rs:1105][E: codex-rs/core/src/session/session.rs:852][E: codex-rs/core/src/thread_manager.rs:2103]

`LocalThreadStore::stage_pending_thread_metadata` 要求 state DB，禁止 patch `rollout_path`，空 patch 与重复 stage 都是 `InvalidRequest`。条目只活在内存里，直到第一次成功 metadata update 或 idle shutdown/discard 清掉。[E: codex-rs/thread-store/src/local/mod.rs:492][E: codex-rs/thread-store/src/local/mod.rs:497][E: codex-rs/thread-store/src/local/pending_thread_metadata.rs:33][E: codex-rs/thread-store/src/local/pending_thread_metadata.rs:44][E: codex-rs/thread-store/src/local/live_writer.rs:199][E: codex-rs/thread-store/src/local/live_writer.rs:211]

第一方 app-server / TUI 路径当前没有调用 `reserve_thread_id` + `stage_pending_thread_metadata`；可见用法在 core 集成测试。[U]

## Paginated revert

`Op::ThreadRollback` 已从 protocol `Op` 删除；`ThreadStore` 的磁盘撤销入口是 `revert_thread`。[E: codex-rs/protocol/src/protocol.rs:590][E: codex-rs/thread-store/src/store.rs:227] `LocalThreadStore::revert_thread` 委托 `revert_thread::revert`。[E: codex-rs/thread-store/src/local/mod.rs:581][E: codex-rs/thread-store/src/local/revert_thread.rs:19] 该路径要求 state DB、thread 未 live、history mode 是 Paginated。它 materialize lineage，按 `ForkBoundary::BeforeTurn` 取 retained prefix，创建带新 `rollout_id` 的 replacement JSONL，再用 `replace_rollout_path_if_current` CAS 切换指针。CAS 失败会删掉 replacement 文件并返回 `Conflict`。旧 rollout 文件保留。[E: codex-rs/thread-store/src/local/revert_thread.rs:28][E: codex-rs/thread-store/src/local/revert_thread.rs:36][E: codex-rs/thread-store/src/local/revert_thread.rs:66][E: codex-rs/thread-store/src/local/revert_thread.rs:106][E: codex-rs/thread-store/src/local/revert_thread.rs:134][E: codex-rs/thread-store/src/local/revert_thread.rs:143]

app-server `thread/revert` 是这条 store API 的 client RPC。没有 `thread/rollback` RPC。该路径只替换 persisted rollout / SQLite path，不回滚 workspace 文件改动。[I]

`ClientRequest::RolloutCompress` wire 名 `rollout/compress`；实现要求 experimentalApi，未接线的 store 返回 “not supported yet”。[E: codex-rs/app-server-protocol/src/protocol/common.rs:712]

已写入 rollout 的 `EventMsg::ThreadRolledBack` 仍由 `user_message_positions_in_rollout` / `fork_turn_positions_in_rollout` 在读 history、fork 与 truncation 时应用，这是 replay，不是活 Op。[E: codex-rs/protocol/src/protocol.rs:1404][E: codex-rs/core/src/thread_rollout_truncation.rs:57]

## Persistent exec 的 paginated history

非 ephemeral `codex exec` 通过 app-server `thread/start` 时把 `history_mode` 设为 `Paginated`。若服务器拒绝 “paginated threads require thread/turns/list and thread/items/list support”，exec 去掉 `history_mode` 再试一次。resume 默认 `exclude_turns: true`，让客户端用 paginated list 补历史。[E: codex-rs/exec/src/lib.rs:1380][E: codex-rs/exec/src/lib.rs:1348][E: codex-rs/exec/src/lib.rs:1409]

## Gotcha

- Do not describe local create/resume/append/load-history as unsupported; current `LocalThreadStore` implements them through `live_writer` and `load_history`.[E: codex-rs/thread-store/src/local/mod.rs:483][E: codex-rs/thread-store/src/local/mod.rs:526][E: codex-rs/thread-store/src/local/mod.rs:530][E: codex-rs/thread-store/src/local/mod.rs:563]
- `LiveThread::append_items` passes raw items to the store but observes only canonical persisted items for metadata sync.[E: codex-rs/thread-store/src/live_thread.rs:238][E: codex-rs/thread-store/src/live_thread.rs:270][E: codex-rs/thread-store/src/live_thread.rs:279][E: codex-rs/thread-store/src/live_thread.rs:282]
- `list_turns` / `list_items` 不是 local unsupported：Local store 已 override；调用前会验证目标确为 Paginated thread。[E: codex-rs/thread-store/src/local/mod.rs:447][E: codex-rs/thread-store/src/local/mod.rs:452][E: codex-rs/thread-store/src/local/mod.rs:715][E: codex-rs/thread-store/src/local/thread_history/read.rs:105]
- Git metadata patch is no longer an unimplemented local case; the update path reads existing DB metadata, resolves the git patch, writes rollout compatibility, and applies SQLite git info.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:167][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:211][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:225][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:237]

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
- `codex-rs/rollout/src/writer_lock.rs`
- `codex-rs/thread-store/src/thread_attachments.rs`
- `codex-rs/thread-store/src/local/thread_attachments.rs`
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
- `codex-rs/app-server/src/request_processors/thread_attachments.rs`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/attachment-store/src/lib.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- [State DB](state-db.md)
- [Realtime conversation](realtime-conversation.md)
- [Thread queue](thread-queue.md)
- [Rollout migration](rollout-migration.md)
