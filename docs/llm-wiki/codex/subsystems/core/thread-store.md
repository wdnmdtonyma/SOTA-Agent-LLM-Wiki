---
id: subsys.core.thread-store
title: ThreadStore 抽象层
kind: subsystem
tier: T2
source: [codex-rs/thread-store/src/lib.rs, codex-rs/thread-store/src/store.rs, codex-rs/thread-store/src/live_thread.rs, codex-rs/thread-store/src/types.rs, codex-rs/thread-store/src/local/mod.rs, codex-rs/thread-store/src/local/create_thread.rs, codex-rs/thread-store/src/local/live_writer.rs, codex-rs/thread-store/src/local/read_thread.rs, codex-rs/thread-store/src/local/list_threads.rs, codex-rs/thread-store/src/local/search_threads.rs, codex-rs/thread-store/src/local/update_thread_metadata.rs]
symbols: [ThreadStore, LiveThread, LiveThreadInitGuard, LocalThreadStore, LocalThreadStoreConfig, StoredThread, StoredThreadHistory, ThreadMetadataPatch, CreateThreadParams, ResumeThreadParams, AppendThreadItemsParams, SearchThreadsParams]
related: [subsys.core.rollout-persistence, subsys.core.state-db, subsys.core.realtime-conversation]
evidence: explicit
status: verified
updated: 5670360009
---

> `codex-rs/thread-store` is the storage-neutral boundary around thread persistence. Application code treats `ThreadId` as the durable handle; the current local implementation resolves it to rollout JSONL plus SQLite metadata, while `LiveThread` keeps active-session lifecycle calls off direct rollout paths.[E: codex-rs/thread-store/src/lib.rs:1][E: codex-rs/thread-store/src/lib.rs:3][E: codex-rs/thread-store/src/live_thread.rs:25][E: codex-rs/thread-store/src/local/mod.rs:44]

## 能回答的问题

- `ThreadStore` trait 当前要求实现哪些 thread lifecycle/read/list/update 方法？
- `LiveThread` 如何封装 create/resume/append/persist/flush/shutdown/discard？
- `LocalThreadStore` 如何把 live writer 操作映射到 `RolloutRecorder`？
- list/read/search/update metadata 在本地如何走 rollout 与 SQLite？
- 哪些 trait 方法仍是默认 unsupported？

## 职责边界

- `ThreadStore` is a trait boundary, not a persistence format; implementations resolve `ThreadId` to backing storage.[E: codex-rs/thread-store/src/store.rs:31][E: codex-rs/thread-store/src/store.rs:32]
- `LiveThread` is the active thread handle for session code; it delegates storage to `ThreadStore` and owns metadata-sync bookkeeping.[E: codex-rs/thread-store/src/live_thread.rs:25][E: codex-rs/thread-store/src/live_thread.rs:31][E: codex-rs/thread-store/src/live_thread.rs:33][E: codex-rs/thread-store/src/live_thread.rs:34]
- `LocalThreadStore` is filesystem/SQLite-backed: rollout JSONL remains durable replay, SQLite is a fast metadata index, and live appends still write canonical JSONL history.[E: codex-rs/thread-store/src/local/mod.rs:44][E: codex-rs/thread-store/src/local/mod.rs:46][E: codex-rs/thread-store/src/local/mod.rs:49][E: codex-rs/thread-store/src/local/mod.rs:52]
- The current public crate surface exports `InMemoryThreadStore`, `LiveThread`, `LocalThreadStore`, and the trait/types; this node's implementation evidence is scoped to that public surface and the local implementation.[E: codex-rs/thread-store/src/lib.rs:17][E: codex-rs/thread-store/src/lib.rs:19][E: codex-rs/thread-store/src/lib.rs:21][E: codex-rs/thread-store/src/lib.rs:23]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/thread-store/src/store.rs` | Trait API for create/resume/append/read/list/update/archive/delete.[E: codex-rs/thread-store/src/store.rs:36][E: codex-rs/thread-store/src/store.rs:39][E: codex-rs/thread-store/src/store.rs:42][E: codex-rs/thread-store/src/store.rs:70][E: codex-rs/thread-store/src/store.rs:81][E: codex-rs/thread-store/src/store.rs:114][E: codex-rs/thread-store/src/store.rs:123][E: codex-rs/thread-store/src/store.rs:129] |
| `codex-rs/thread-store/src/live_thread.rs` | Active-thread lifecycle wrapper and metadata sync bridge.[E: codex-rs/thread-store/src/live_thread.rs:86][E: codex-rs/thread-store/src/live_thread.rs:101][E: codex-rs/thread-store/src/live_thread.rs:136][E: codex-rs/thread-store/src/live_thread.rs:171] |
| `codex-rs/thread-store/src/types.rs` | Create/resume/append params, persistence metadata, stored thread model, metadata patch schema.[E: codex-rs/thread-store/src/types.rs:46][E: codex-rs/thread-store/src/types.rs:63][E: codex-rs/thread-store/src/types.rs:88][E: codex-rs/thread-store/src/types.rs:103][E: codex-rs/thread-store/src/types.rs:375][E: codex-rs/thread-store/src/types.rs:481] |
| `codex-rs/thread-store/src/local/*` | Local rollout/state DB adapters for live writing, read/list/search/update/archive/delete.[E: codex-rs/thread-store/src/local/mod.rs:1][E: codex-rs/thread-store/src/local/mod.rs:227] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ThreadPersistenceMetadata` | cwd, model provider, memory mode | Metadata required when opening live persistence.[E: codex-rs/thread-store/src/types.rs:46][E: codex-rs/thread-store/src/types.rs:52][E: codex-rs/thread-store/src/types.rs:54][E: codex-rs/thread-store/src/types.rs:56] |
| `CreateThreadParams` | thread id, fork/parent ids, source, thread source, base instructions, dynamic tools, multi-agent version, metadata | New-thread persistence input passed to `LocalThreadStore` and `RolloutRecorderParams::new`.[E: codex-rs/thread-store/src/types.rs:63][E: codex-rs/thread-store/src/types.rs:65][E: codex-rs/thread-store/src/types.rs:70][E: codex-rs/thread-store/src/types.rs:74][E: codex-rs/thread-store/src/types.rs:78][E: codex-rs/thread-store/src/types.rs:80][E: codex-rs/thread-store/src/types.rs:82] |
| `ResumeThreadParams` | thread id, optional rollout path, optional history, include_archived, metadata | Resume input can avoid rereading history/path if the caller already knows them.[E: codex-rs/thread-store/src/types.rs:88][E: codex-rs/thread-store/src/types.rs:91][E: codex-rs/thread-store/src/types.rs:93][E: codex-rs/thread-store/src/types.rs:95][E: codex-rs/thread-store/src/types.rs:97] |
| `StoredThread` | rollout path, parent/fork ids, preview/name, model/provider/effort, timestamps, cwd/source/agent/git/approval/profile/tokens/history | Unified read/list response model for stored threads.[E: codex-rs/thread-store/src/types.rs:375][E: codex-rs/thread-store/src/types.rs:382][E: codex-rs/thread-store/src/types.rs:384][E: codex-rs/thread-store/src/types.rs:388][E: codex-rs/thread-store/src/types.rs:392][E: codex-rs/thread-store/src/types.rs:398][E: codex-rs/thread-store/src/types.rs:406][E: codex-rs/thread-store/src/types.rs:420][E: codex-rs/thread-store/src/types.rs:430] |
| `ThreadMetadataPatch` | name, rollout path, preview/title/model/source/agent/git/permission/token fields | Literal metadata patch; omitted fields leave values unchanged.[E: codex-rs/thread-store/src/types.rs:481][E: codex-rs/thread-store/src/types.rs:483][E: codex-rs/thread-store/src/types.rs:488][E: codex-rs/thread-store/src/types.rs:495][E: codex-rs/thread-store/src/types.rs:497][E: codex-rs/thread-store/src/types.rs:499][E: codex-rs/thread-store/src/types.rs:501][E: codex-rs/thread-store/src/types.rs:513][E: codex-rs/thread-store/src/types.rs:528][E: codex-rs/thread-store/src/types.rs:548][E: codex-rs/thread-store/src/types.rs:550][E: codex-rs/thread-store/src/types.rs:552][E: codex-rs/thread-store/src/types.rs:556] |

## Trait API

1. The required lifecycle methods are create, resume, append, persist, flush, shutdown, and discard.[E: codex-rs/thread-store/src/store.rs:36][E: codex-rs/thread-store/src/store.rs:39][E: codex-rs/thread-store/src/store.rs:42][E: codex-rs/thread-store/src/store.rs:48][E: codex-rs/thread-store/src/store.rs:51][E: codex-rs/thread-store/src/store.rs:54][E: codex-rs/thread-store/src/store.rs:57]
2. Read/list methods cover history load, read by id, deprecated read by rollout path, list, and search.[E: codex-rs/thread-store/src/store.rs:64][E: codex-rs/thread-store/src/store.rs:70][E: codex-rs/thread-store/src/store.rs:73][E: codex-rs/thread-store/src/store.rs:81][E: codex-rs/thread-store/src/store.rs:84]
3. `search_threads`, `list_turns`, and `list_items` have default unsupported bodies at the trait layer; `LocalThreadStore` overrides search while leaving turn/item listing on the default path.[E: codex-rs/thread-store/src/store.rs:84][E: codex-rs/thread-store/src/store.rs:89][E: codex-rs/thread-store/src/store.rs:96][E: codex-rs/thread-store/src/store.rs:97][E: codex-rs/thread-store/src/store.rs:105][E: codex-rs/thread-store/src/store.rs:106][E: codex-rs/thread-store/src/local/mod.rs:284]
4. Metadata/archive/delete methods are part of the trait surface.[E: codex-rs/thread-store/src/store.rs:114][E: codex-rs/thread-store/src/store.rs:123][E: codex-rs/thread-store/src/store.rs:126][E: codex-rs/thread-store/src/store.rs:129]

## 控制流：LiveThread

1. `LiveThread::create` captures the thread id, builds create metadata sync, calls `thread_store.create_thread`, then returns the live handle.[E: codex-rs/thread-store/src/live_thread.rs:86][E: codex-rs/thread-store/src/live_thread.rs:91][E: codex-rs/thread-store/src/live_thread.rs:92][E: codex-rs/thread-store/src/live_thread.rs:93]
2. `LiveThread::resume` calls `resume_thread`; if history was not supplied, it loads history and discards the live writer on load failure.[E: codex-rs/thread-store/src/live_thread.rs:101][E: codex-rs/thread-store/src/live_thread.rs:106][E: codex-rs/thread-store/src/live_thread.rs:108][E: codex-rs/thread-store/src/live_thread.rs:110][E: codex-rs/thread-store/src/live_thread.rs:119]
3. `append_items` computes canonical persisted items for metadata observation, delegates the raw append to the store, and applies a metadata patch only when canonical items produce one.[E: codex-rs/thread-store/src/live_thread.rs:136][E: codex-rs/thread-store/src/live_thread.rs:137][E: codex-rs/thread-store/src/live_thread.rs:141][E: codex-rs/thread-store/src/live_thread.rs:150][E: codex-rs/thread-store/src/live_thread.rs:156]
4. `persist`, `flush`, `shutdown`, and `discard` are thin lifecycle calls, with pending metadata flushes around durable operations.[E: codex-rs/thread-store/src/live_thread.rs:171][E: codex-rs/thread-store/src/live_thread.rs:176][E: codex-rs/thread-store/src/live_thread.rs:182][E: codex-rs/thread-store/src/live_thread.rs:188]

## 控制流：LocalThreadStore

1. `LocalThreadStore` stores config, live `RolloutRecorder`s keyed by `ThreadId`, and an optional state DB handle.[E: codex-rs/thread-store/src/local/mod.rs:58][E: codex-rs/thread-store/src/local/mod.rs:59][E: codex-rs/thread-store/src/local/mod.rs:60][E: codex-rs/thread-store/src/local/mod.rs:61]
2. Local trait implementation now delegates create/resume/append/persist/flush/shutdown/discard/read/list/search/update/archive/unarchive/delete to local modules.[E: codex-rs/thread-store/src/local/mod.rs:227][E: codex-rs/thread-store/src/local/mod.rs:232][E: codex-rs/thread-store/src/local/mod.rs:236][E: codex-rs/thread-store/src/local/mod.rs:240][E: codex-rs/thread-store/src/local/mod.rs:244][E: codex-rs/thread-store/src/local/mod.rs:267][E: codex-rs/thread-store/src/local/mod.rs:280][E: codex-rs/thread-store/src/local/mod.rs:284][E: codex-rs/thread-store/src/local/mod.rs:291][E: codex-rs/thread-store/src/local/mod.rs:306]
3. Local create requires a cwd, builds `RolloutConfig`, and creates a `RolloutRecorder` with base instructions, dynamic tools, and multi-agent version.[E: codex-rs/thread-store/src/local/create_thread.rs:10][E: codex-rs/thread-store/src/local/create_thread.rs:14][E: codex-rs/thread-store/src/local/create_thread.rs:21][E: codex-rs/thread-store/src/local/create_thread.rs:28][E: codex-rs/thread-store/src/local/create_thread.rs:39]
4. Local resume can take an explicit rollout path or resolve it via `read_thread`; it also requires a cwd before opening `RolloutRecorderParams::resume`.[E: codex-rs/thread-store/src/local/live_writer.rs:30][E: codex-rs/thread-store/src/local/live_writer.rs:35][E: codex-rs/thread-store/src/local/live_writer.rs:38][E: codex-rs/thread-store/src/local/live_writer.rs:55][E: codex-rs/thread-store/src/local/live_writer.rs:69]
5. Local append filters raw items with `persisted_rollout_items`, writes canonical items with `record_canonical_items`, then flushes so SQLite metadata cannot get ahead of JSONL.[E: codex-rs/thread-store/src/local/live_writer.rs:77][E: codex-rs/thread-store/src/local/live_writer.rs:81][E: codex-rs/thread-store/src/local/live_writer.rs:86][E: codex-rs/thread-store/src/local/live_writer.rs:90]
6. `read_thread` prefers SQLite metadata when it can safely satisfy archive/history requirements, otherwise resolves and reads the rollout path.[E: codex-rs/thread-store/src/local/read_thread.rs:29][E: codex-rs/thread-store/src/local/read_thread.rs:34][E: codex-rs/thread-store/src/local/read_thread.rs:41][E: codex-rs/thread-store/src/local/read_thread.rs:73][E: codex-rs/thread-store/src/local/read_thread.rs:79]
7. `list_threads` converts ThreadStore sort/cursor params, calls rollout listing, converts items to `StoredThread`, then merges titles from state DB and legacy name index.[E: codex-rs/thread-store/src/local/list_threads.rs:21][E: codex-rs/thread-store/src/local/list_threads.rs:25][E: codex-rs/thread-store/src/local/list_threads.rs:51][E: codex-rs/thread-store/src/local/list_threads.rs:67][E: codex-rs/thread-store/src/local/list_threads.rs:83][E: codex-rs/thread-store/src/local/list_threads.rs:94]
8. `search_threads` requires a non-empty term, uses the configured `rg` binary to find rollout matches, and then scans rollout pages to produce search results.[E: codex-rs/thread-store/src/local/search_threads.rs:35][E: codex-rs/thread-store/src/local/search_threads.rs:39][E: codex-rs/thread-store/src/local/search_threads.rs:71][E: codex-rs/thread-store/src/local/search_threads.rs:88][E: codex-rs/thread-store/src/local/search_threads.rs:106]
9. Metadata update applies SQLite first, persists live rollout compatibility when needed, reconciles the rollout, and currently supports git patch application through rollout and SQLite updates.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:37][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:55][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:69][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:82][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:98][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:137][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:148]

## Gotcha

- Do not describe local create/resume/append/load-history as unsupported; current `LocalThreadStore` implements them through `live_writer` and `load_history`.[E: codex-rs/thread-store/src/local/mod.rs:232][E: codex-rs/thread-store/src/local/mod.rs:236][E: codex-rs/thread-store/src/local/mod.rs:240][E: codex-rs/thread-store/src/local/mod.rs:260]
- `LiveThread::append_items` passes raw items to the store but observes only canonical persisted items for metadata sync.[E: codex-rs/thread-store/src/live_thread.rs:136][E: codex-rs/thread-store/src/live_thread.rs:137][E: codex-rs/thread-store/src/live_thread.rs:141][E: codex-rs/thread-store/src/live_thread.rs:150]
- Git metadata patch is no longer an unimplemented local case; the update path reads existing DB metadata, resolves the git patch, writes rollout compatibility, and applies SQLite git info.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:98][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:125][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:137][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:148]

## Sources

- `codex-rs/thread-store/src/lib.rs`
- `codex-rs/thread-store/src/store.rs`
- `codex-rs/thread-store/src/live_thread.rs`
- `codex-rs/thread-store/src/types.rs`
- `codex-rs/thread-store/src/local/mod.rs`
- `codex-rs/thread-store/src/local/create_thread.rs`
- `codex-rs/thread-store/src/local/live_writer.rs`
- `codex-rs/thread-store/src/local/read_thread.rs`
- `codex-rs/thread-store/src/local/list_threads.rs`
- `codex-rs/thread-store/src/local/search_threads.rs`
- `codex-rs/thread-store/src/local/update_thread_metadata.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- [State DB](state-db.md)
- [Realtime conversation](realtime-conversation.md)
