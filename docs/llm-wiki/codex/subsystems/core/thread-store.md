---
id: subsys.core.thread-store
title: ThreadStore 抽象层
kind: subsystem
tier: T2
source: [codex-rs/thread-store/src/lib.rs, codex-rs/thread-store/src/store.rs, codex-rs/thread-store/src/live_thread.rs, codex-rs/thread-store/src/types.rs, codex-rs/thread-store/src/local/mod.rs, codex-rs/thread-store/src/local/create_thread.rs, codex-rs/thread-store/src/local/live_writer.rs, codex-rs/thread-store/src/local/model_context.rs, codex-rs/thread-store/src/local/paginated_fork.rs, codex-rs/thread-store/src/local/rollout_lineage.rs, codex-rs/thread-store/src/local/writer_lock.rs, codex-rs/thread-store/src/local/thread_history/segment_paging.rs, codex-rs/thread-store/src/local/thread_history_materialization.rs, codex-rs/thread-store/src/local/thread_history/read.rs, codex-rs/thread-store/src/local/thread_history/search.rs, codex-rs/thread-store/src/local/read_thread.rs, codex-rs/thread-store/src/local/list_threads.rs, codex-rs/thread-store/src/local/search_threads.rs, codex-rs/thread-store/src/local/update_thread_metadata.rs]
symbols: [ThreadStore, LiveThread, LiveThreadInitGuard, LocalThreadStore, LocalThreadStoreConfig, StoredThread, StoredThreadHistory, StoredModelContext, ThreadMetadataPatch, PrepareForkParams, PreparedFork, ForkBoundary, WriterLockCoordinator, CreateThreadParams, ResumeThreadParams, AppendThreadItemsParams, RolloutWriteOp, materialize_to_sqlite]
related: [subsys.core.rollout-persistence, subsys.core.state-db, subsys.core.realtime-conversation]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `codex-rs/thread-store` 是 thread persistence 的 storage-neutral boundary。local 实现仍以 JSONL rollout 为 durable source of truth；当 history mode 是 `Paginated` 时，它在 durable write 后把完整 JSONL records 投影进 rebuildable `thread_history_1.sqlite`，供 turn/item pagination、occurrence search 与 bounded model-context resume 使用。[E: codex-rs/thread-store/src/local/live_writer.rs:310][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:24]

## 能回答的问题

- `ThreadStore` trait 当前要求实现哪些 thread lifecycle/read/list/update 方法？
- `LiveThread` 如何封装 create/resume/append/persist/flush/shutdown/discard？
- `LocalThreadStore` 如何把 live writer 操作映射到 `RolloutRecorder`？
- list/read/search/update metadata 在本地如何走 rollout 与 SQLite？
- 哪些 trait 方法仍是默认 unsupported？
- paginated fork 如何冻结 lineage/boundary/model context？
- 单 writer 与 pinning 怎样持久化？

## 职责边界

- `ThreadStore` is a trait boundary, not a persistence format; implementations resolve `ThreadId` to backing storage.[E: codex-rs/thread-store/src/store.rs:40][E: codex-rs/thread-store/src/store.rs:53][E: codex-rs/thread-store/src/store.rs:56][E: codex-rs/thread-store/src/store.rs:62]
- `LiveThread` is the active thread handle for session code; it delegates storage to `ThreadStore` and owns metadata-sync bookkeeping.[E: codex-rs/thread-store/src/live_thread.rs:35][E: codex-rs/thread-store/src/live_thread.rs:38][E: codex-rs/thread-store/src/live_thread.rs:39]
- `LocalThreadStore` combines local config, live rollout recorders, metadata State DB handle, and lazy thread-history DB pool；append 先按 thread history mode 过滤，再 durable JSONL write，Paginated 模式最后更新 SQLite projection。[E: codex-rs/thread-store/src/local/mod.rs:86][E: codex-rs/thread-store/src/local/mod.rs:92][E: codex-rs/thread-store/src/local/live_writer.rs:288][E: codex-rs/thread-store/src/local/live_writer.rs:301][E: codex-rs/thread-store/src/local/live_writer.rs:316]
- The current public crate surface exports `InMemoryThreadStore`, `LiveThread`, `LocalThreadStore`, and the trait/types; this node's implementation evidence is scoped to that public surface and the local implementation.[E: codex-rs/thread-store/src/lib.rs:17][E: codex-rs/thread-store/src/lib.rs:19][E: codex-rs/thread-store/src/lib.rs:21][E: codex-rs/thread-store/src/lib.rs:23]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/thread-store/src/store.rs` | Trait API for create/resume/append/read/list/update/archive/delete.[E: codex-rs/thread-store/src/store.rs:53][E: codex-rs/thread-store/src/store.rs:56][E: codex-rs/thread-store/src/store.rs:62][E: codex-rs/thread-store/src/store.rs:112][E: codex-rs/thread-store/src/store.rs:123][E: codex-rs/thread-store/src/store.rs:176][E: codex-rs/thread-store/src/store.rs:182] |
| `codex-rs/thread-store/src/live_thread.rs` | Active-thread lifecycle wrapper and metadata sync bridge.[E: codex-rs/thread-store/src/live_thread.rs:93][E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:243] |
| `codex-rs/thread-store/src/types.rs` | Create/resume/append params, persistence metadata, stored thread model, metadata patch schema.[E: codex-rs/thread-store/src/types.rs:54][E: codex-rs/thread-store/src/types.rs:71][E: codex-rs/thread-store/src/types.rs:111][E: codex-rs/thread-store/src/types.rs:538][E: codex-rs/thread-store/src/types.rs:652] |
| `codex-rs/thread-store/src/local/*` | Local rollout/state DB adapters for live writing, read/list/search/update/archive/delete.[E: codex-rs/thread-store/src/local/mod.rs:386][E: codex-rs/thread-store/src/local/mod.rs:391][E: codex-rs/thread-store/src/local/mod.rs:437][E: codex-rs/thread-store/src/local/mod.rs:450][E: codex-rs/thread-store/src/local/mod.rs:480] |
| `codex-rs/thread-store/src/local/thread_history_*` | Paginated history 的 JSONL→SQLite materialization、turn/item pagination 与 visible-message occurrence search。[E: codex-rs/thread-store/src/local/thread_history_materialization.rs:24][E: codex-rs/thread-store/src/local/thread_history/read.rs:70][E: codex-rs/thread-store/src/local/thread_history/read.rs:118][E: codex-rs/thread-store/src/local/thread_history/search.rs:51] |
| `codex-rs/thread-store/src/local/model_context.rs` | 对未压缩 Paginated rollout 做 reverse scan，只重建最新 model-visible context；Legacy/压缩文件保持 full-history path。[E: codex-rs/thread-store/src/local/model_context.rs:61][E: codex-rs/thread-store/src/local/model_context.rs:70] |
| `paginated_fork.rs` / `rollout_lineage.rs` | 冻结 source lineage，解析 Latest/ThroughTurn/BeforeTurn 边界并构造 child reference/model context。[E: codex-rs/thread-store/src/local/paginated_fork.rs:15][E: codex-rs/thread-store/src/local/paginated_fork.rs:40][E: codex-rs/thread-store/src/local/paginated_fork.rs:81][E: codex-rs/thread-store/src/local/paginated_fork.rs:155] |
| `writer_lock.rs` | Paginated live thread 的 process 间 advisory file lock；第二个 active writer 返回 `ThreadStoreError::Conflict`。[E: codex-rs/thread-store/src/local/live_writer.rs:25][E: codex-rs/thread-store/src/local/live_writer.rs:33][E: codex-rs/thread-store/src/local/live_writer.rs:106][E: codex-rs/thread-store/src/local/writer_lock.rs:17][E: codex-rs/thread-store/src/local/writer_lock.rs:68] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ThreadPersistenceMetadata` | cwd, model provider, memory mode | Metadata required when opening live persistence.[E: codex-rs/thread-store/src/types.rs:54][E: codex-rs/thread-store/src/types.rs:58][E: codex-rs/thread-store/src/types.rs:60][E: codex-rs/thread-store/src/types.rs:62] |
| `CreateThreadParams` | thread id, fork/parent ids, source, thread source, base instructions, dynamic tools, multi-agent version, metadata | New-thread persistence input passed to `LocalThreadStore` and `RolloutRecorderParams::new`.[E: codex-rs/thread-store/src/types.rs:71][E: codex-rs/thread-store/src/types.rs:73][E: codex-rs/thread-store/src/types.rs:75][E: codex-rs/thread-store/src/types.rs:79][E: codex-rs/thread-store/src/types.rs:81][E: codex-rs/thread-store/src/types.rs:83][E: codex-rs/thread-store/src/types.rs:85][E: codex-rs/thread-store/src/types.rs:89][E: codex-rs/thread-store/src/types.rs:91][E: codex-rs/thread-store/src/types.rs:96][E: codex-rs/thread-store/src/types.rs:106] |
| `ResumeThreadParams` | thread id, optional rollout path, optional history, include_archived, metadata | Resume input can avoid rereading history/path if the caller already knows them.[E: codex-rs/thread-store/src/types.rs:111][E: codex-rs/thread-store/src/types.rs:113][E: codex-rs/thread-store/src/types.rs:115][E: codex-rs/thread-store/src/types.rs:117][E: codex-rs/thread-store/src/types.rs:119][E: codex-rs/thread-store/src/types.rs:121] |
| `StoredThread` | rollout path, parent/fork ids, preview/name, model/provider/effort, timestamps, pin state, cwd/source/agent/git/approval/profile/tokens/history | Unified read/list response model；`is_pinned` 是持久字段而非 UI 临时态。[E: codex-rs/thread-store/src/types.rs:538][E: codex-rs/thread-store/src/types.rs:568][E: codex-rs/thread-store/src/types.rs:596] |
| `ThreadMetadataPatch` | name、pin state、rollout path、preview/title/model/source/git 等 | literal patch；`is_pinned: Some(bool)` 更新 pin，省略则不变。[E: codex-rs/thread-store/src/types.rs:651][E: codex-rs/thread-store/src/types.rs:652][E: codex-rs/thread-store/src/types.rs:726][E: codex-rs/thread-store/src/types.rs:730] |

## Trait API

1. The required lifecycle methods are create, resume, append, persist, flush, shutdown, and discard.[E: codex-rs/thread-store/src/store.rs:53][E: codex-rs/thread-store/src/store.rs:56][E: codex-rs/thread-store/src/store.rs:62][E: codex-rs/thread-store/src/store.rs:65][E: codex-rs/thread-store/src/store.rs:68][E: codex-rs/thread-store/src/store.rs:71][E: codex-rs/thread-store/src/store.rs:78]
2. Read/list methods cover history load, read by id, deprecated read by rollout path, list, and search.[E: codex-rs/thread-store/src/store.rs:81][E: codex-rs/thread-store/src/store.rs:112][E: codex-rs/thread-store/src/store.rs:117][E: codex-rs/thread-store/src/store.rs:123][E: codex-rs/thread-store/src/store.rs:131]
3. Trait 包含 `default_history_mode`、targeted `load_latest_model_context`、`prepare_fork`、`supports_paginated_history_lists` 与 per-thread occurrence search；这些方法有兼容 default（Legacy/false/unsupported）。[E: codex-rs/thread-store/src/store.rs:48][E: codex-rs/thread-store/src/store.rs:49][E: codex-rs/thread-store/src/store.rs:89][E: codex-rs/thread-store/src/store.rs:106][E: codex-rs/thread-store/src/store.rs:126][E: codex-rs/thread-store/src/store.rs:148]
4. `search_threads`、occurrence search、`list_turns`、`list_items` 在 trait 层仍可 unsupported，但 `LocalThreadStore` 全部 override，并宣告支持 paginated history lists。[E: codex-rs/thread-store/src/local/mod.rs:454][E: codex-rs/thread-store/src/local/mod.rs:458][E: codex-rs/thread-store/src/local/mod.rs:473]
5. Metadata/archive/delete methods remain part of the trait surface.[E: codex-rs/thread-store/src/store.rs:176][E: codex-rs/thread-store/src/store.rs:182][E: codex-rs/thread-store/src/store.rs:205][E: codex-rs/thread-store/src/store.rs:208]

## 控制流：LiveThread

1. `LiveThread::create` captures both thread id and `history_mode`; all later filtering follows this persisted mode rather than a global policy。[E: codex-rs/thread-store/src/live_thread.rs:93][E: codex-rs/thread-store/src/live_thread.rs:97][E: codex-rs/thread-store/src/live_thread.rs:98][E: codex-rs/thread-store/src/live_thread.rs:103]
2. `create_with_inherited_model_context` 先计算 canonical prefix 长度并写入 `subagent_history_start_ordinal`，再创建 child 和持久化 inherited prefix；SQLite projection 因而能跳过 child-own history boundary 之前的 inherited records。[E: codex-rs/thread-store/src/live_thread.rs:119][E: codex-rs/thread-store/src/live_thread.rs:121][E: codex-rs/thread-store/src/live_thread.rs:131][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:27][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:40]
3. `LiveThread::resume` calls `resume_thread`; if history was not supplied, it loads history and discards the live writer on load failure。[E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:155][E: codex-rs/thread-store/src/live_thread.rs:164][E: codex-rs/thread-store/src/live_thread.rs:166]
4. `append_items` 用当前 `history_mode` 计算 canonical persisted items 供 metadata observation，但仍把 raw batch 交给 store，让具体 store 在 durable boundary 做同一 mode-aware filter。[E: codex-rs/thread-store/src/live_thread.rs:189][E: codex-rs/thread-store/src/live_thread.rs:223][E: codex-rs/thread-store/src/live_thread.rs:228][E: codex-rs/thread-store/src/live_thread.rs:230]

## 控制流：LocalThreadStore

1. `LocalThreadStore` stores config, live `RolloutRecorder`s keyed by `ThreadId`, and an optional state DB handle.[E: codex-rs/thread-store/src/local/mod.rs:86][E: codex-rs/thread-store/src/local/mod.rs:87][E: codex-rs/thread-store/src/local/mod.rs:88][E: codex-rs/thread-store/src/local/mod.rs:91]
2. Local trait implementation delegates create/resume/append/persist/flush/shutdown/discard/read/list/search/update to local modules.[E: codex-rs/thread-store/src/local/mod.rs:391][E: codex-rs/thread-store/src/local/mod.rs:395][E: codex-rs/thread-store/src/local/mod.rs:399][E: codex-rs/thread-store/src/local/mod.rs:403][E: codex-rs/thread-store/src/local/mod.rs:407][E: codex-rs/thread-store/src/local/mod.rs:411][E: codex-rs/thread-store/src/local/mod.rs:415][E: codex-rs/thread-store/src/local/mod.rs:437][E: codex-rs/thread-store/src/local/mod.rs:450][E: codex-rs/thread-store/src/local/mod.rs:466][E: codex-rs/thread-store/src/local/mod.rs:480]
3. Local create requires a cwd, builds `RolloutConfig`, and creates a `RolloutRecorder` with base instructions and dynamic tools.[E: codex-rs/thread-store/src/local/create_thread.rs:10][E: codex-rs/thread-store/src/local/create_thread.rs:15][E: codex-rs/thread-store/src/local/create_thread.rs:19][E: codex-rs/thread-store/src/local/create_thread.rs:21][E: codex-rs/thread-store/src/local/create_thread.rs:26][E: codex-rs/thread-store/src/local/create_thread.rs:28][E: codex-rs/thread-store/src/local/create_thread.rs:37][E: codex-rs/thread-store/src/local/create_thread.rs:38]
4. Local resume can take an explicit rollout path or resolve it via `read_thread`; it also requires a cwd before opening `RolloutRecorderParams::resume`.[E: codex-rs/thread-store/src/local/live_writer.rs:44][E: codex-rs/thread-store/src/local/live_writer.rs:52][E: codex-rs/thread-store/src/local/live_writer.rs:62][E: codex-rs/thread-store/src/local/live_writer.rs:76][E: codex-rs/thread-store/src/local/live_writer.rs:92][E: codex-rs/thread-store/src/local/live_writer.rs:97][E: codex-rs/thread-store/src/local/live_writer.rs:111]
5. Local append/persist/flush 汇入 `write_and_project`：先 mode-aware filter，保证 JSONL durable/flush barrier 成功；仅 Paginated 模式随后按上次 byte offset materialize SQLite，所以 projection 可以落后但绝不会领先 canonical JSONL。[E: codex-rs/thread-store/src/local/live_writer.rs:288][E: codex-rs/thread-store/src/local/live_writer.rs:301][E: codex-rs/thread-store/src/local/live_writer.rs:310][E: codex-rs/thread-store/src/local/live_writer.rs:317]
6. `read_thread` prefers SQLite metadata when it can safely satisfy archive/history requirements, otherwise resolves and reads the rollout path.[E: codex-rs/thread-store/src/local/read_thread.rs:32][E: codex-rs/thread-store/src/local/read_thread.rs:37][E: codex-rs/thread-store/src/local/read_thread.rs:44][E: codex-rs/thread-store/src/local/read_thread.rs:74][E: codex-rs/thread-store/src/local/read_thread.rs:78][E: codex-rs/thread-store/src/local/read_thread.rs:84]
7. `list_threads` converts ThreadStore sort/cursor params, calls rollout listing, converts items to `StoredThread`, then merges titles from state DB and legacy name index.[E: codex-rs/thread-store/src/local/list_threads.rs:19][E: codex-rs/thread-store/src/local/list_threads.rs:27][E: codex-rs/thread-store/src/local/list_threads.rs:49][E: codex-rs/thread-store/src/local/list_threads.rs:64][E: codex-rs/thread-store/src/local/list_threads.rs:69][E: codex-rs/thread-store/src/local/list_threads.rs:84][E: codex-rs/thread-store/src/local/list_threads.rs:97]
8. Cross-thread `search_threads` 仍可经 rollout/`rg` 路径；单 thread `search_thread_occurrences` 则查询 SQLite 中的 user messages 与每 turn final agent item，并返回 occurrence 与 turn cursor。[E: codex-rs/thread-store/src/local/search_threads.rs:32][E: codex-rs/thread-store/src/local/thread_history/search.rs:51][E: codex-rs/thread-store/src/local/thread_history/search.rs:121][E: codex-rs/thread-store/src/local/thread_history/search.rs:144]
9. Metadata update applies SQLite first, persists live rollout compatibility when needed, reconciles the rollout, and supports git patch application through rollout and SQLite updates.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:38][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:57][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:76][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:123][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:140][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:185][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:197]

## Paginated fork 与单 writer

`LocalThreadStore::prepare_fork` 委托 `paginated_fork::prepare`。它先取得 source lifecycle shared reservation，把 live writer 持久化并解析完整 rollout lineage；source projection 始终在 writer lock 下 materialize，只有非 `Latest` boundary 才先 materialize ancestor segments。[E: codex-rs/thread-store/src/local/mod.rs:433][E: codex-rs/thread-store/src/local/paginated_fork.rs:15][E: codex-rs/thread-store/src/local/paginated_fork.rs:40][E: codex-rs/thread-store/src/local/paginated_fork.rs:47][E: codex-rs/thread-store/src/local/paginated_fork.rs:62][E: codex-rs/thread-store/src/local/paginated_fork.rs:68]

fork boundary 有 `Latest`、`ThroughTurn(turn_id)`、`BeforeTurn(turn_id)` 三种。ThroughTurn 拒绝 in-progress turn；BeforeTurn 要求 persisted start boundary。最终 `PreparedFork` 保存 source id、history position、重建的 model context 和 lifecycle reservation，直到 child reference durable。[E: codex-rs/thread-store/src/local/paginated_fork.rs:81][E: codex-rs/thread-store/src/local/paginated_fork.rs:125][E: codex-rs/thread-store/src/local/paginated_fork.rs:148][E: codex-rs/thread-store/src/local/paginated_fork.rs:155]

进程内 `ThreadCoordination` 把 writer mutex 与 lifecycle rwlock 分离：fork 可持 shared lifecycle lease，同时 source 继续写；archive/delete 需 exclusive lifecycle。需要两把锁的路径固定先 lifecycle 后 writer，避免反向锁序。[E: codex-rs/thread-store/src/local/mod.rs:104][E: codex-rs/thread-store/src/local/mod.rs:119]

跨进程 file lock 只加在 Paginated live thread：create/resume 检出 history mode 后才通过 `WriterLockCoordinator` acquire，并把 guard 随 live recorder 持有；Legacy path 不获取该 lock。已有 Paginated active writer 时返回 conflict，guard drop 时关闭并删除锁文件。[E: codex-rs/thread-store/src/local/live_writer.rs:25][E: codex-rs/thread-store/src/local/live_writer.rs:33][E: codex-rs/thread-store/src/local/live_writer.rs:40][E: codex-rs/thread-store/src/local/live_writer.rs:106][E: codex-rs/thread-store/src/local/live_writer.rs:117][E: codex-rs/thread-store/src/local/writer_lock.rs:85][E: codex-rs/thread-store/src/local/writer_lock.rs:168][E: codex-rs/thread-store/src/local/writer_lock.rs:188]

## Persisted pinning

pin state 贯穿 `StoredThread.is_pinned`、`ThreadMetadataPatch.is_pinned`、SQLite metadata update 与 list filter，不只是 app-server response 装饰字段。[E: codex-rs/thread-store/src/types.rs:568][E: codex-rs/thread-store/src/types.rs:568][E: codex-rs/thread-store/src/types.rs:726][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:392][E: codex-rs/thread-store/src/local/list_threads.rs:100]

多 segment lineage 的 page/materialization 仍有严格边界：不能把“可分页读取继承 history”推广成任意 incremental item replay 都受支持。[U]

## Gotcha

- Do not describe local create/resume/append/load-history as unsupported; current `LocalThreadStore` implements them through `live_writer` and `load_history`.[E: codex-rs/thread-store/src/local/mod.rs:391][E: codex-rs/thread-store/src/local/mod.rs:395][E: codex-rs/thread-store/src/local/mod.rs:399][E: codex-rs/thread-store/src/local/mod.rs:419]
- `LiveThread::append_items` passes raw items to the store but observes only canonical persisted items for metadata sync.[E: codex-rs/thread-store/src/live_thread.rs:189][E: codex-rs/thread-store/src/live_thread.rs:223][E: codex-rs/thread-store/src/live_thread.rs:231][E: codex-rs/thread-store/src/live_thread.rs:240]
- `list_turns` / `list_items` 不是 local unsupported：Local store 已 override；调用前会验证目标确为 Paginated thread。[E: codex-rs/thread-store/src/local/mod.rs:454][E: codex-rs/thread-store/src/local/mod.rs:458][E: codex-rs/thread-store/src/local/mod.rs:462][E: codex-rs/thread-store/src/local/thread_history/read.rs:74]
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
- `codex-rs/thread-store/src/local/thread_history/segment_paging.rs`
- `codex-rs/thread-store/src/local/thread_history_materialization.rs`
- `codex-rs/thread-store/src/local/thread_history/read.rs`
- `codex-rs/thread-store/src/local/thread_history/search.rs`
- `codex-rs/thread-store/src/local/read_thread.rs`
- `codex-rs/thread-store/src/local/list_threads.rs`
- `codex-rs/thread-store/src/local/search_threads.rs`
- `codex-rs/thread-store/src/local/update_thread_metadata.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- [State DB](state-db.md)
- [Realtime conversation](realtime-conversation.md)
