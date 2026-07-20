---
id: subsys.core.thread-store
title: ThreadStore 抽象层
kind: subsystem
tier: T2
source: [codex-rs/thread-store/src/lib.rs, codex-rs/thread-store/src/store.rs, codex-rs/thread-store/src/live_thread.rs, codex-rs/thread-store/src/types.rs, codex-rs/thread-store/src/local/mod.rs, codex-rs/thread-store/src/local/create_thread.rs, codex-rs/thread-store/src/local/live_writer.rs, codex-rs/thread-store/src/local/model_context.rs, codex-rs/thread-store/src/local/thread_history_materialization.rs, codex-rs/thread-store/src/local/thread_history/read.rs, codex-rs/thread-store/src/local/thread_history/search.rs, codex-rs/thread-store/src/local/read_thread.rs, codex-rs/thread-store/src/local/list_threads.rs, codex-rs/thread-store/src/local/search_threads.rs, codex-rs/thread-store/src/local/update_thread_metadata.rs]
symbols: [ThreadStore, LiveThread, LiveThreadInitGuard, LocalThreadStore, LocalThreadStoreConfig, StoredThread, StoredThreadHistory, StoredModelContext, ThreadMetadataPatch, CreateThreadParams, ResumeThreadParams, AppendThreadItemsParams, SearchThreadsParams, RolloutWriteOp, materialize_to_sqlite]
related: [subsys.core.rollout-persistence, subsys.core.state-db, subsys.core.realtime-conversation]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> `codex-rs/thread-store` 是 thread persistence 的 storage-neutral boundary。local 实现仍以 JSONL rollout 为 durable source of truth；当 history mode 是 `Paginated` 时，它在 durable write 后把完整 JSONL records 投影进 rebuildable `thread_history_1.sqlite`，供 turn/item pagination、occurrence search 与 bounded model-context resume 使用。[E: codex-rs/thread-store/src/local/live_writer.rs:300][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:17]

## 能回答的问题

- `ThreadStore` trait 当前要求实现哪些 thread lifecycle/read/list/update 方法？
- `LiveThread` 如何封装 create/resume/append/persist/flush/shutdown/discard？
- `LocalThreadStore` 如何把 live writer 操作映射到 `RolloutRecorder`？
- list/read/search/update metadata 在本地如何走 rollout 与 SQLite？
- 哪些 trait 方法仍是默认 unsupported？

## 职责边界

- `ThreadStore` is a trait boundary, not a persistence format; implementations resolve `ThreadId` to backing storage.[E: codex-rs/thread-store/src/store.rs:36][E: codex-rs/thread-store/src/store.rs:49][E: codex-rs/thread-store/src/store.rs:52][E: codex-rs/thread-store/src/store.rs:58]
- `LiveThread` is the active thread handle for session code; it delegates storage to `ThreadStore` and owns metadata-sync bookkeeping.[E: codex-rs/thread-store/src/live_thread.rs:35][E: codex-rs/thread-store/src/live_thread.rs:38][E: codex-rs/thread-store/src/live_thread.rs:39]
- `LocalThreadStore` combines local config, live rollout recorders, metadata State DB handle, and lazy thread-history DB pool；append 先按 thread history mode 过滤，再 durable JSONL write，Paginated 模式最后更新 SQLite projection。[E: codex-rs/thread-store/src/local/mod.rs:71][E: codex-rs/thread-store/src/local/mod.rs:76][E: codex-rs/thread-store/src/local/live_writer.rs:278][E: codex-rs/thread-store/src/local/live_writer.rs:291][E: codex-rs/thread-store/src/local/live_writer.rs:306]
- The current public crate surface exports `InMemoryThreadStore`, `LiveThread`, `LocalThreadStore`, and the trait/types; this node's implementation evidence is scoped to that public surface and the local implementation.[E: codex-rs/thread-store/src/lib.rs:17][E: codex-rs/thread-store/src/lib.rs:19][E: codex-rs/thread-store/src/lib.rs:21][E: codex-rs/thread-store/src/lib.rs:23]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/thread-store/src/store.rs` | Trait API for create/resume/append/read/list/update/archive/delete.[E: codex-rs/thread-store/src/store.rs:49][E: codex-rs/thread-store/src/store.rs:52][E: codex-rs/thread-store/src/store.rs:58][E: codex-rs/thread-store/src/store.rs:97][E: codex-rs/thread-store/src/store.rs:108][E: codex-rs/thread-store/src/store.rs:161][E: codex-rs/thread-store/src/store.rs:167] |
| `codex-rs/thread-store/src/live_thread.rs` | Active-thread lifecycle wrapper and metadata sync bridge.[E: codex-rs/thread-store/src/live_thread.rs:93][E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:243] |
| `codex-rs/thread-store/src/types.rs` | Create/resume/append params, persistence metadata, stored thread model, metadata patch schema.[E: codex-rs/thread-store/src/types.rs:53][E: codex-rs/thread-store/src/types.rs:70][E: codex-rs/thread-store/src/types.rs:108][E: codex-rs/thread-store/src/types.rs:468][E: codex-rs/thread-store/src/types.rs:580] |
| `codex-rs/thread-store/src/local/*` | Local rollout/state DB adapters for live writing, read/list/search/update/archive/delete.[E: codex-rs/thread-store/src/local/mod.rs:293][E: codex-rs/thread-store/src/local/mod.rs:298][E: codex-rs/thread-store/src/local/mod.rs:340][E: codex-rs/thread-store/src/local/mod.rs:353][E: codex-rs/thread-store/src/local/mod.rs:383] |
| `codex-rs/thread-store/src/local/thread_history_*` | Paginated history 的 JSONL→SQLite materialization、turn/item pagination 与 visible-message occurrence search。[E: codex-rs/thread-store/src/local/thread_history_materialization.rs:17][E: codex-rs/thread-store/src/local/thread_history/read.rs:61][E: codex-rs/thread-store/src/local/thread_history/read.rs:140][E: codex-rs/thread-store/src/local/thread_history/search.rs:48] |
| `codex-rs/thread-store/src/local/model_context.rs` | 对未压缩 Paginated rollout 做 reverse scan，只重建最新 model-visible context；Legacy/压缩文件保持 full-history path。[E: codex-rs/thread-store/src/local/model_context.rs:61][E: codex-rs/thread-store/src/local/model_context.rs:69] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ThreadPersistenceMetadata` | cwd, model provider, memory mode | Metadata required when opening live persistence.[E: codex-rs/thread-store/src/types.rs:53][E: codex-rs/thread-store/src/types.rs:57][E: codex-rs/thread-store/src/types.rs:59][E: codex-rs/thread-store/src/types.rs:61] |
| `CreateThreadParams` | thread id, fork/parent ids, source, thread source, base instructions, dynamic tools, multi-agent version, metadata | New-thread persistence input passed to `LocalThreadStore` and `RolloutRecorderParams::new`.[E: codex-rs/thread-store/src/types.rs:70][E: codex-rs/thread-store/src/types.rs:72][E: codex-rs/thread-store/src/types.rs:74][E: codex-rs/thread-store/src/types.rs:78][E: codex-rs/thread-store/src/types.rs:80][E: codex-rs/thread-store/src/types.rs:82][E: codex-rs/thread-store/src/types.rs:84][E: codex-rs/thread-store/src/types.rs:88][E: codex-rs/thread-store/src/types.rs:90][E: codex-rs/thread-store/src/types.rs:95][E: codex-rs/thread-store/src/types.rs:103] |
| `ResumeThreadParams` | thread id, optional rollout path, optional history, include_archived, metadata | Resume input can avoid rereading history/path if the caller already knows them.[E: codex-rs/thread-store/src/types.rs:108][E: codex-rs/thread-store/src/types.rs:110][E: codex-rs/thread-store/src/types.rs:112][E: codex-rs/thread-store/src/types.rs:114][E: codex-rs/thread-store/src/types.rs:116][E: codex-rs/thread-store/src/types.rs:118] |
| `StoredThread` | rollout path, parent/fork ids, preview/name, model/provider/effort, timestamps, cwd/source/agent/git/approval/profile/tokens/history | Unified read/list response model for stored threads.[E: codex-rs/thread-store/src/types.rs:468][E: codex-rs/thread-store/src/types.rs:470][E: codex-rs/thread-store/src/types.rs:474][E: codex-rs/thread-store/src/types.rs:476][E: codex-rs/thread-store/src/types.rs:478][E: codex-rs/thread-store/src/types.rs:480][E: codex-rs/thread-store/src/types.rs:482][E: codex-rs/thread-store/src/types.rs:484][E: codex-rs/thread-store/src/types.rs:486][E: codex-rs/thread-store/src/types.rs:490][E: codex-rs/thread-store/src/types.rs:492][E: codex-rs/thread-store/src/types.rs:494][E: codex-rs/thread-store/src/types.rs:496][E: codex-rs/thread-store/src/types.rs:498][E: codex-rs/thread-store/src/types.rs:502][E: codex-rs/thread-store/src/types.rs:506][E: codex-rs/thread-store/src/types.rs:508][E: codex-rs/thread-store/src/types.rs:510][E: codex-rs/thread-store/src/types.rs:512][E: codex-rs/thread-store/src/types.rs:514][E: codex-rs/thread-store/src/types.rs:516][E: codex-rs/thread-store/src/types.rs:518][E: codex-rs/thread-store/src/types.rs:520][E: codex-rs/thread-store/src/types.rs:524] |
| `ThreadMetadataPatch` | name, rollout path, preview/title/model/source/git fields and other metadata fields | Literal metadata patch; omitted fields leave values unchanged.[E: codex-rs/thread-store/src/types.rs:580][E: codex-rs/thread-store/src/types.rs:587][E: codex-rs/thread-store/src/types.rs:589][E: codex-rs/thread-store/src/types.rs:591][E: codex-rs/thread-store/src/types.rs:593][E: codex-rs/thread-store/src/types.rs:595][E: codex-rs/thread-store/src/types.rs:597][E: codex-rs/thread-store/src/types.rs:488][E: codex-rs/thread-store/src/types.rs:612][E: codex-rs/thread-store/src/types.rs:642][E: codex-rs/thread-store/src/types.rs:646][E: codex-rs/thread-store/src/types.rs:648][E: codex-rs/thread-store/src/types.rs:650][E: codex-rs/thread-store/src/types.rs:652][E: codex-rs/thread-store/src/types.rs:654][E: codex-rs/thread-store/src/types.rs:656] |

## Trait API

1. The required lifecycle methods are create, resume, append, persist, flush, shutdown, and discard.[E: codex-rs/thread-store/src/store.rs:49][E: codex-rs/thread-store/src/store.rs:52][E: codex-rs/thread-store/src/store.rs:58][E: codex-rs/thread-store/src/store.rs:61][E: codex-rs/thread-store/src/store.rs:64][E: codex-rs/thread-store/src/store.rs:67][E: codex-rs/thread-store/src/store.rs:74]
2. Read/list methods cover history load, read by id, deprecated read by rollout path, list, and search.[E: codex-rs/thread-store/src/store.rs:77][E: codex-rs/thread-store/src/store.rs:97][E: codex-rs/thread-store/src/store.rs:102][E: codex-rs/thread-store/src/store.rs:108][E: codex-rs/thread-store/src/store.rs:116]
3. Trait 新增 `default_history_mode`、targeted `load_latest_model_context`、`supports_paginated_history_lists` 与 per-thread occurrence search；这些方法有兼容 default（Legacy/false/unsupported）。[E: codex-rs/thread-store/src/store.rs:44][E: codex-rs/thread-store/src/store.rs:45][E: codex-rs/thread-store/src/store.rs:85][E: codex-rs/thread-store/src/store.rs:89][E: codex-rs/thread-store/src/store.rs:90][E: codex-rs/thread-store/src/store.rs:111][E: codex-rs/thread-store/src/store.rs:112][E: codex-rs/thread-store/src/store.rs:128][E: codex-rs/thread-store/src/store.rs:132][E: codex-rs/thread-store/src/store.rs:133]
4. `search_threads`、occurrence search、`list_turns`、`list_items` 在 trait 层仍可 unsupported，但 `LocalThreadStore` 全部 override，并宣告支持 paginated history lists。[E: codex-rs/thread-store/src/local/mod.rs:357][E: codex-rs/thread-store/src/local/mod.rs:361][E: codex-rs/thread-store/src/local/mod.rs:376]
5. Metadata/archive/delete methods remain part of the trait surface.[E: codex-rs/thread-store/src/store.rs:161][E: codex-rs/thread-store/src/store.rs:167][E: codex-rs/thread-store/src/store.rs:170][E: codex-rs/thread-store/src/store.rs:173]

## 控制流：LiveThread

1. `LiveThread::create` captures both thread id and `history_mode`; all later filtering follows this persisted mode rather than a global policy。[E: codex-rs/thread-store/src/live_thread.rs:93][E: codex-rs/thread-store/src/live_thread.rs:97][E: codex-rs/thread-store/src/live_thread.rs:98][E: codex-rs/thread-store/src/live_thread.rs:103]
2. `create_with_inherited_model_context` 先计算 canonical prefix 长度并写入 `subagent_history_start_ordinal`，再创建 child 和持久化 inherited prefix；SQLite projection 因而能跳过 child-own history boundary 之前的 inherited records。[E: codex-rs/thread-store/src/live_thread.rs:119][E: codex-rs/thread-store/src/live_thread.rs:121][E: codex-rs/thread-store/src/live_thread.rs:131][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:27][E: codex-rs/thread-store/src/local/thread_history_materialization.rs:40]
3. `LiveThread::resume` calls `resume_thread`; if history was not supplied, it loads history and discards the live writer on load failure。[E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:155][E: codex-rs/thread-store/src/live_thread.rs:164][E: codex-rs/thread-store/src/live_thread.rs:166]
4. `append_items` 用当前 `history_mode` 计算 canonical persisted items 供 metadata observation，但仍把 raw batch 交给 store，让具体 store 在 durable boundary 做同一 mode-aware filter。[E: codex-rs/thread-store/src/live_thread.rs:189][E: codex-rs/thread-store/src/live_thread.rs:223][E: codex-rs/thread-store/src/live_thread.rs:228][E: codex-rs/thread-store/src/live_thread.rs:230]

## 控制流：LocalThreadStore

1. `LocalThreadStore` stores config, live `RolloutRecorder`s keyed by `ThreadId`, and an optional state DB handle.[E: codex-rs/thread-store/src/local/mod.rs:71][E: codex-rs/thread-store/src/local/mod.rs:72][E: codex-rs/thread-store/src/local/mod.rs:73][E: codex-rs/thread-store/src/local/mod.rs:75]
2. Local trait implementation delegates create/resume/append/persist/flush/shutdown/discard/read/list/search/update to local modules.[E: codex-rs/thread-store/src/local/mod.rs:298][E: codex-rs/thread-store/src/local/mod.rs:302][E: codex-rs/thread-store/src/local/mod.rs:306][E: codex-rs/thread-store/src/local/mod.rs:310][E: codex-rs/thread-store/src/local/mod.rs:314][E: codex-rs/thread-store/src/local/mod.rs:318][E: codex-rs/thread-store/src/local/mod.rs:322][E: codex-rs/thread-store/src/local/mod.rs:340][E: codex-rs/thread-store/src/local/mod.rs:353][E: codex-rs/thread-store/src/local/mod.rs:369][E: codex-rs/thread-store/src/local/mod.rs:383]
3. Local create requires a cwd, builds `RolloutConfig`, and creates a `RolloutRecorder` with base instructions and dynamic tools.[E: codex-rs/thread-store/src/local/create_thread.rs:10][E: codex-rs/thread-store/src/local/create_thread.rs:15][E: codex-rs/thread-store/src/local/create_thread.rs:19][E: codex-rs/thread-store/src/local/create_thread.rs:21][E: codex-rs/thread-store/src/local/create_thread.rs:26][E: codex-rs/thread-store/src/local/create_thread.rs:28][E: codex-rs/thread-store/src/local/create_thread.rs:37][E: codex-rs/thread-store/src/local/create_thread.rs:38]
4. Local resume can take an explicit rollout path or resolve it via `read_thread`; it also requires a cwd before opening `RolloutRecorderParams::resume`.[E: codex-rs/thread-store/src/local/live_writer.rs:39][E: codex-rs/thread-store/src/local/live_writer.rs:47][E: codex-rs/thread-store/src/local/live_writer.rs:57][E: codex-rs/thread-store/src/local/live_writer.rs:71][E: codex-rs/thread-store/src/local/live_writer.rs:87][E: codex-rs/thread-store/src/local/live_writer.rs:92][E: codex-rs/thread-store/src/local/live_writer.rs:101]
5. Local append/persist/flush 汇入 `write_and_project`：先 mode-aware filter，保证 JSONL durable/flush barrier 成功；仅 Paginated 模式随后按上次 byte offset materialize SQLite，所以 projection 可以落后但绝不会领先 canonical JSONL。[E: codex-rs/thread-store/src/local/live_writer.rs:278][E: codex-rs/thread-store/src/local/live_writer.rs:291][E: codex-rs/thread-store/src/local/live_writer.rs:300][E: codex-rs/thread-store/src/local/live_writer.rs:307]
6. `read_thread` prefers SQLite metadata when it can safely satisfy archive/history requirements, otherwise resolves and reads the rollout path.[E: codex-rs/thread-store/src/local/read_thread.rs:30][E: codex-rs/thread-store/src/local/read_thread.rs:35][E: codex-rs/thread-store/src/local/read_thread.rs:42][E: codex-rs/thread-store/src/local/read_thread.rs:71][E: codex-rs/thread-store/src/local/read_thread.rs:75][E: codex-rs/thread-store/src/local/read_thread.rs:81]
7. `list_threads` converts ThreadStore sort/cursor params, calls rollout listing, converts items to `StoredThread`, then merges titles from state DB and legacy name index.[E: codex-rs/thread-store/src/local/list_threads.rs:22][E: codex-rs/thread-store/src/local/list_threads.rs:30][E: codex-rs/thread-store/src/local/list_threads.rs:52][E: codex-rs/thread-store/src/local/list_threads.rs:67][E: codex-rs/thread-store/src/local/list_threads.rs:72][E: codex-rs/thread-store/src/local/list_threads.rs:85][E: codex-rs/thread-store/src/local/list_threads.rs:97]
8. Cross-thread `search_threads` 仍可经 rollout/`rg` 路径；单 thread `search_thread_occurrences` 则查询 SQLite 中的 user messages 与每 turn final agent item，并返回 occurrence 与 turn cursor。[E: codex-rs/thread-store/src/local/search_threads.rs:35][E: codex-rs/thread-store/src/local/thread_history/search.rs:48][E: codex-rs/thread-store/src/local/thread_history/search.rs:88][E: codex-rs/thread-store/src/local/thread_history/search.rs:108]
9. Metadata update applies SQLite first, persists live rollout compatibility when needed, reconciles the rollout, and supports git patch application through rollout and SQLite updates.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:39][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:57][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:73][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:81][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:98][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:135][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:147]

## Gotcha

- Do not describe local create/resume/append/load-history as unsupported; current `LocalThreadStore` implements them through `live_writer` and `load_history`.[E: codex-rs/thread-store/src/local/mod.rs:298][E: codex-rs/thread-store/src/local/mod.rs:302][E: codex-rs/thread-store/src/local/mod.rs:306][E: codex-rs/thread-store/src/local/mod.rs:326]
- `LiveThread::append_items` passes raw items to the store but observes only canonical persisted items for metadata sync.[E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:151][E: codex-rs/thread-store/src/live_thread.rs:155]
- `list_turns` / `list_items` 不是 local unsupported：Local store 已 override；调用前会验证目标确为 Paginated thread。[E: codex-rs/thread-store/src/local/mod.rs:357][E: codex-rs/thread-store/src/local/mod.rs:361][E: codex-rs/thread-store/src/local/mod.rs:365][E: codex-rs/thread-store/src/local/thread_history/read.rs:65]
- Git metadata patch is no longer an unimplemented local case; the update path reads existing DB metadata, resolves the git patch, writes rollout compatibility, and applies SQLite git info.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:98][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:121][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:135][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:147]

## Sources

- `codex-rs/thread-store/src/lib.rs`
- `codex-rs/thread-store/src/store.rs`
- `codex-rs/thread-store/src/live_thread.rs`
- `codex-rs/thread-store/src/types.rs`
- `codex-rs/thread-store/src/local/mod.rs`
- `codex-rs/thread-store/src/local/create_thread.rs`
- `codex-rs/thread-store/src/local/live_writer.rs`
- `codex-rs/thread-store/src/local/model_context.rs`
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
