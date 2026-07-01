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
updated: db887d03e1
---

> `codex-rs/thread-store` is the storage-neutral boundary around thread persistence. The public surface exports the `ThreadStore` trait, `LiveThread`, and `LocalThreadStore`; the local implementation stores config, live rollout recorders, and an optional state DB handle, while `LiveThread` holds a `ThreadStore` plus metadata-sync state.[E: codex-rs/thread-store/src/lib.rs:19][E: codex-rs/thread-store/src/lib.rs:21][E: codex-rs/thread-store/src/lib.rs:23][E: codex-rs/thread-store/src/local/mod.rs:59][E: codex-rs/thread-store/src/local/mod.rs:60][E: codex-rs/thread-store/src/local/mod.rs:61][E: codex-rs/thread-store/src/local/mod.rs:62][E: codex-rs/thread-store/src/live_thread.rs:33][E: codex-rs/thread-store/src/live_thread.rs:35][E: codex-rs/thread-store/src/live_thread.rs:36]

## 能回答的问题

- `ThreadStore` trait 当前要求实现哪些 thread lifecycle/read/list/update 方法？
- `LiveThread` 如何封装 create/resume/append/persist/flush/shutdown/discard？
- `LocalThreadStore` 如何把 live writer 操作映射到 `RolloutRecorder`？
- list/read/search/update metadata 在本地如何走 rollout 与 SQLite？
- 哪些 trait 方法仍是默认 unsupported？

## 职责边界

- `ThreadStore` is a trait boundary, not a persistence format; implementations resolve `ThreadId` to backing storage.[E: codex-rs/thread-store/src/store.rs:33][E: codex-rs/thread-store/src/store.rs:46][E: codex-rs/thread-store/src/store.rs:49][E: codex-rs/thread-store/src/store.rs:55]
- `LiveThread` is the active thread handle for session code; it delegates storage to `ThreadStore` and owns metadata-sync bookkeeping.[E: codex-rs/thread-store/src/live_thread.rs:33][E: codex-rs/thread-store/src/live_thread.rs:35][E: codex-rs/thread-store/src/live_thread.rs:36]
- `LocalThreadStore` combines local configuration, live rollout recorders, and an optional state DB handle; local append filters raw items through rollout policy and writes canonical items to the recorder.[E: codex-rs/thread-store/src/local/mod.rs:59][E: codex-rs/thread-store/src/local/mod.rs:60][E: codex-rs/thread-store/src/local/mod.rs:61][E: codex-rs/thread-store/src/local/mod.rs:62][E: codex-rs/thread-store/src/local/live_writer.rs:118][E: codex-rs/thread-store/src/local/live_writer.rs:124]
- The current public crate surface exports `InMemoryThreadStore`, `LiveThread`, `LocalThreadStore`, and the trait/types; this node's implementation evidence is scoped to that public surface and the local implementation.[E: codex-rs/thread-store/src/lib.rs:17][E: codex-rs/thread-store/src/lib.rs:19][E: codex-rs/thread-store/src/lib.rs:21][E: codex-rs/thread-store/src/lib.rs:23]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/thread-store/src/store.rs` | Trait API for create/resume/append/read/list/update/archive/delete.[E: codex-rs/thread-store/src/store.rs:46][E: codex-rs/thread-store/src/store.rs:49][E: codex-rs/thread-store/src/store.rs:55][E: codex-rs/thread-store/src/store.rs:80][E: codex-rs/thread-store/src/store.rs:91][E: codex-rs/thread-store/src/store.rs:127][E: codex-rs/thread-store/src/store.rs:133] |
| `codex-rs/thread-store/src/live_thread.rs` | Active-thread lifecycle wrapper and metadata sync bridge.[E: codex-rs/thread-store/src/live_thread.rs:90][E: codex-rs/thread-store/src/live_thread.rs:105][E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:190] |
| `codex-rs/thread-store/src/types.rs` | Create/resume/append params, persistence metadata, stored thread model, metadata patch schema.[E: codex-rs/thread-store/src/types.rs:52][E: codex-rs/thread-store/src/types.rs:69][E: codex-rs/thread-store/src/types.rs:105][E: codex-rs/thread-store/src/types.rs:415][E: codex-rs/thread-store/src/types.rs:527] |
| `codex-rs/thread-store/src/local/*` | Local rollout/state DB adapters for live writing, read/list/search/update/archive/delete.[E: codex-rs/thread-store/src/local/mod.rs:240][E: codex-rs/thread-store/src/local/mod.rs:245][E: codex-rs/thread-store/src/local/mod.rs:280][E: codex-rs/thread-store/src/local/mod.rs:293][E: codex-rs/thread-store/src/local/mod.rs:304] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ThreadPersistenceMetadata` | cwd, model provider, memory mode | Metadata required when opening live persistence.[E: codex-rs/thread-store/src/types.rs:52][E: codex-rs/thread-store/src/types.rs:56][E: codex-rs/thread-store/src/types.rs:58][E: codex-rs/thread-store/src/types.rs:60] |
| `CreateThreadParams` | thread id, fork/parent ids, source, thread source, base instructions, dynamic tools, multi-agent version, metadata | New-thread persistence input passed to `LocalThreadStore` and `RolloutRecorderParams::new`.[E: codex-rs/thread-store/src/types.rs:69][E: codex-rs/thread-store/src/types.rs:71][E: codex-rs/thread-store/src/types.rs:73][E: codex-rs/thread-store/src/types.rs:77][E: codex-rs/thread-store/src/types.rs:79][E: codex-rs/thread-store/src/types.rs:81][E: codex-rs/thread-store/src/types.rs:83][E: codex-rs/thread-store/src/types.rs:87][E: codex-rs/thread-store/src/types.rs:89][E: codex-rs/thread-store/src/types.rs:94][E: codex-rs/thread-store/src/types.rs:100] |
| `ResumeThreadParams` | thread id, optional rollout path, optional history, include_archived, metadata | Resume input can avoid rereading history/path if the caller already knows them.[E: codex-rs/thread-store/src/types.rs:105][E: codex-rs/thread-store/src/types.rs:107][E: codex-rs/thread-store/src/types.rs:109][E: codex-rs/thread-store/src/types.rs:111][E: codex-rs/thread-store/src/types.rs:113][E: codex-rs/thread-store/src/types.rs:115] |
| `StoredThread` | rollout path, parent/fork ids, preview/name, model/provider/effort, timestamps, cwd/source/agent/git/approval/profile/tokens/history | Unified read/list response model for stored threads.[E: codex-rs/thread-store/src/types.rs:415][E: codex-rs/thread-store/src/types.rs:417][E: codex-rs/thread-store/src/types.rs:421][E: codex-rs/thread-store/src/types.rs:423][E: codex-rs/thread-store/src/types.rs:425][E: codex-rs/thread-store/src/types.rs:427][E: codex-rs/thread-store/src/types.rs:429][E: codex-rs/thread-store/src/types.rs:431][E: codex-rs/thread-store/src/types.rs:433][E: codex-rs/thread-store/src/types.rs:437][E: codex-rs/thread-store/src/types.rs:439][E: codex-rs/thread-store/src/types.rs:441][E: codex-rs/thread-store/src/types.rs:443][E: codex-rs/thread-store/src/types.rs:445][E: codex-rs/thread-store/src/types.rs:449][E: codex-rs/thread-store/src/types.rs:453][E: codex-rs/thread-store/src/types.rs:455][E: codex-rs/thread-store/src/types.rs:457][E: codex-rs/thread-store/src/types.rs:459][E: codex-rs/thread-store/src/types.rs:461][E: codex-rs/thread-store/src/types.rs:463][E: codex-rs/thread-store/src/types.rs:465][E: codex-rs/thread-store/src/types.rs:467][E: codex-rs/thread-store/src/types.rs:471] |
| `ThreadMetadataPatch` | name, rollout path, preview/title/model/source/git fields and other metadata fields | Literal metadata patch; omitted fields leave values unchanged.[E: codex-rs/thread-store/src/types.rs:527][E: codex-rs/thread-store/src/types.rs:534][E: codex-rs/thread-store/src/types.rs:536][E: codex-rs/thread-store/src/types.rs:538][E: codex-rs/thread-store/src/types.rs:540][E: codex-rs/thread-store/src/types.rs:542][E: codex-rs/thread-store/src/types.rs:544][E: codex-rs/thread-store/src/types.rs:546][E: codex-rs/thread-store/src/types.rs:554][E: codex-rs/thread-store/src/types.rs:584][E: codex-rs/thread-store/src/types.rs:588][E: codex-rs/thread-store/src/types.rs:590][E: codex-rs/thread-store/src/types.rs:592][E: codex-rs/thread-store/src/types.rs:594][E: codex-rs/thread-store/src/types.rs:596][E: codex-rs/thread-store/src/types.rs:598] |

## Trait API

1. The required lifecycle methods are create, resume, append, persist, flush, shutdown, and discard.[E: codex-rs/thread-store/src/store.rs:46][E: codex-rs/thread-store/src/store.rs:49][E: codex-rs/thread-store/src/store.rs:55][E: codex-rs/thread-store/src/store.rs:58][E: codex-rs/thread-store/src/store.rs:61][E: codex-rs/thread-store/src/store.rs:64][E: codex-rs/thread-store/src/store.rs:71]
2. Read/list methods cover history load, read by id, deprecated read by rollout path, list, and search.[E: codex-rs/thread-store/src/store.rs:74][E: codex-rs/thread-store/src/store.rs:80][E: codex-rs/thread-store/src/store.rs:85][E: codex-rs/thread-store/src/store.rs:91][E: codex-rs/thread-store/src/store.rs:94]
3. `search_threads`, `list_turns`, and `list_items` have default unsupported bodies at the trait layer; `LocalThreadStore` overrides search while leaving turn/item listing on the default path.[E: codex-rs/thread-store/src/store.rs:94][E: codex-rs/thread-store/src/store.rs:99][E: codex-rs/thread-store/src/store.rs:106][E: codex-rs/thread-store/src/store.rs:108][E: codex-rs/thread-store/src/store.rs:115][E: codex-rs/thread-store/src/store.rs:117][E: codex-rs/thread-store/src/local/mod.rs:297]
4. Metadata/archive/delete methods are part of the trait surface.[E: codex-rs/thread-store/src/store.rs:127][E: codex-rs/thread-store/src/store.rs:133][E: codex-rs/thread-store/src/store.rs:136][E: codex-rs/thread-store/src/store.rs:139]

## 控制流：LiveThread

1. `LiveThread::create` captures the thread id, builds create metadata sync, calls `thread_store.create_thread`, then returns the live handle.[E: codex-rs/thread-store/src/live_thread.rs:90][E: codex-rs/thread-store/src/live_thread.rs:94][E: codex-rs/thread-store/src/live_thread.rs:95][E: codex-rs/thread-store/src/live_thread.rs:96][E: codex-rs/thread-store/src/live_thread.rs:97]
2. `LiveThread::resume` calls `resume_thread`; if history was not supplied, it loads history and discards the live writer on load failure.[E: codex-rs/thread-store/src/live_thread.rs:105][E: codex-rs/thread-store/src/live_thread.rs:110][E: codex-rs/thread-store/src/live_thread.rs:113][E: codex-rs/thread-store/src/live_thread.rs:114][E: codex-rs/thread-store/src/live_thread.rs:116][E: codex-rs/thread-store/src/live_thread.rs:124]
3. `append_items` computes canonical persisted items for metadata observation, delegates the raw append to the store, and applies a metadata patch only when canonical items produce one.[E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:151][E: codex-rs/thread-store/src/live_thread.rs:155][E: codex-rs/thread-store/src/live_thread.rs:157][E: codex-rs/thread-store/src/live_thread.rs:175][E: codex-rs/thread-store/src/live_thread.rs:176]
4. `persist`, `flush`, `shutdown`, and `discard` are thin lifecycle calls, with pending metadata flushes around durable operations.[E: codex-rs/thread-store/src/live_thread.rs:190][E: codex-rs/thread-store/src/live_thread.rs:192][E: codex-rs/thread-store/src/live_thread.rs:195][E: codex-rs/thread-store/src/live_thread.rs:201][E: codex-rs/thread-store/src/live_thread.rs:207]

## 控制流：LocalThreadStore

1. `LocalThreadStore` stores config, live `RolloutRecorder`s keyed by `ThreadId`, and an optional state DB handle.[E: codex-rs/thread-store/src/local/mod.rs:59][E: codex-rs/thread-store/src/local/mod.rs:60][E: codex-rs/thread-store/src/local/mod.rs:61][E: codex-rs/thread-store/src/local/mod.rs:62]
2. Local trait implementation delegates create/resume/append/persist/flush/shutdown/discard/read/list/search/update to local modules.[E: codex-rs/thread-store/src/local/mod.rs:245][E: codex-rs/thread-store/src/local/mod.rs:249][E: codex-rs/thread-store/src/local/mod.rs:253][E: codex-rs/thread-store/src/local/mod.rs:257][E: codex-rs/thread-store/src/local/mod.rs:261][E: codex-rs/thread-store/src/local/mod.rs:265][E: codex-rs/thread-store/src/local/mod.rs:269][E: codex-rs/thread-store/src/local/mod.rs:280][E: codex-rs/thread-store/src/local/mod.rs:293][E: codex-rs/thread-store/src/local/mod.rs:297][E: codex-rs/thread-store/src/local/mod.rs:304]
3. Local create requires a cwd, builds `RolloutConfig`, and creates a `RolloutRecorder` with base instructions and dynamic tools.[E: codex-rs/thread-store/src/local/create_thread.rs:11][E: codex-rs/thread-store/src/local/create_thread.rs:15][E: codex-rs/thread-store/src/local/create_thread.rs:21][E: codex-rs/thread-store/src/local/create_thread.rs:23][E: codex-rs/thread-store/src/local/create_thread.rs:28][E: codex-rs/thread-store/src/local/create_thread.rs:30][E: codex-rs/thread-store/src/local/create_thread.rs:39][E: codex-rs/thread-store/src/local/create_thread.rs:40]
4. Local resume can take an explicit rollout path or resolve it via `read_thread`; it also requires a cwd before opening `RolloutRecorderParams::resume`.[E: codex-rs/thread-store/src/local/live_writer.rs:37][E: codex-rs/thread-store/src/local/live_writer.rs:44][E: codex-rs/thread-store/src/local/live_writer.rs:54][E: codex-rs/thread-store/src/local/live_writer.rs:69][E: codex-rs/thread-store/src/local/live_writer.rs:85][E: codex-rs/thread-store/src/local/live_writer.rs:90][E: codex-rs/thread-store/src/local/live_writer.rs:99]
5. Local append filters raw items with `persisted_rollout_items` and writes canonical items with `record_canonical_items`.[E: codex-rs/thread-store/src/local/live_writer.rs:114][E: codex-rs/thread-store/src/local/live_writer.rs:118][E: codex-rs/thread-store/src/local/live_writer.rs:119][E: codex-rs/thread-store/src/local/live_writer.rs:124]
6. `read_thread` prefers SQLite metadata when it can safely satisfy archive/history requirements, otherwise resolves and reads the rollout path.[E: codex-rs/thread-store/src/local/read_thread.rs:30][E: codex-rs/thread-store/src/local/read_thread.rs:35][E: codex-rs/thread-store/src/local/read_thread.rs:42][E: codex-rs/thread-store/src/local/read_thread.rs:71][E: codex-rs/thread-store/src/local/read_thread.rs:75][E: codex-rs/thread-store/src/local/read_thread.rs:81]
7. `list_threads` converts ThreadStore sort/cursor params, calls rollout listing, converts items to `StoredThread`, then merges titles from state DB and legacy name index.[E: codex-rs/thread-store/src/local/list_threads.rs:22][E: codex-rs/thread-store/src/local/list_threads.rs:30][E: codex-rs/thread-store/src/local/list_threads.rs:52][E: codex-rs/thread-store/src/local/list_threads.rs:67][E: codex-rs/thread-store/src/local/list_threads.rs:72][E: codex-rs/thread-store/src/local/list_threads.rs:85][E: codex-rs/thread-store/src/local/list_threads.rs:97]
8. `search_threads` requires a non-empty term, uses the configured `rg` binary to find rollout matches, and then scans rollout pages to produce search results.[E: codex-rs/thread-store/src/local/search_threads.rs:35][E: codex-rs/thread-store/src/local/search_threads.rs:39][E: codex-rs/thread-store/src/local/search_threads.rs:71][E: codex-rs/thread-store/src/local/search_threads.rs:88][E: codex-rs/thread-store/src/local/search_threads.rs:106]
9. Metadata update applies SQLite first, persists live rollout compatibility when needed, reconciles the rollout, and supports git patch application through rollout and SQLite updates.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:39][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:57][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:73][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:81][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:98][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:135][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:147]

## Gotcha

- Do not describe local create/resume/append/load-history as unsupported; current `LocalThreadStore` implements them through `live_writer` and `load_history`.[E: codex-rs/thread-store/src/local/mod.rs:245][E: codex-rs/thread-store/src/local/mod.rs:249][E: codex-rs/thread-store/src/local/mod.rs:253][E: codex-rs/thread-store/src/local/mod.rs:273]
- `LiveThread::append_items` passes raw items to the store but observes only canonical persisted items for metadata sync.[E: codex-rs/thread-store/src/live_thread.rs:146][E: codex-rs/thread-store/src/live_thread.rs:151][E: codex-rs/thread-store/src/live_thread.rs:155][E: codex-rs/thread-store/src/live_thread.rs:173]
- Git metadata patch is no longer an unimplemented local case; the update path reads existing DB metadata, resolves the git patch, writes rollout compatibility, and applies SQLite git info.[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:98][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:121][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:135][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:147]

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
