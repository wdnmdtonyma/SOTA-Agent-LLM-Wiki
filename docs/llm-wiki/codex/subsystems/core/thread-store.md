---
id: subsys.core.thread-store
title: ThreadStore 抽象层
kind: subsystem
tier: T2
source: [codex-rs/thread-store/src/store.rs, codex-rs/thread-store/src/recorder.rs, codex-rs/thread-store/src/types.rs, codex-rs/thread-store/src/error.rs, codex-rs/thread-store/src/lib.rs, codex-rs/thread-store/src/local/mod.rs, codex-rs/thread-store/src/local/helpers.rs, codex-rs/thread-store/src/local/read_thread.rs, codex-rs/thread-store/src/local/list_threads.rs, codex-rs/thread-store/src/local/update_thread_metadata.rs, codex-rs/thread-store/src/local/archive_thread.rs, codex-rs/thread-store/src/local/unarchive_thread.rs, codex-rs/thread-store/src/remote/mod.rs, codex-rs/thread-store/src/remote/list_threads.rs, codex-rs/thread-store/src/remote/helpers.rs, codex-rs/thread-store/src/remote/proto/codex.thread_store.v1.proto]
symbols: [ThreadStore, ThreadRecorder, LocalThreadStore, RemoteThreadStore, StoredThread, StoredThreadHistory, CreateThreadParams, ListThreadsParams, UpdateThreadMetadataParams, ArchiveThreadParams]
related: [subsys.core.rollout-persistence, subsys.core.state-db, subsys.core.realtime-conversation]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> ThreadStore 是 Codex 的 storage-neutral thread persistence boundary：上层只持有 `ThreadId` 和 trait API，本地实现把 read/list/update/archive/unarchive 请求映射到 rollout JSONL/SQLite，远端实现目前只把 `list_threads` 转成 gRPC 调用。[E: codex-rs/thread-store/src/store.rs:19][E: codex-rs/thread-store/src/store.rs:47][E: codex-rs/thread-store/src/store.rs:50][E: codex-rs/thread-store/src/local/read_thread.rs:25][E: codex-rs/thread-store/src/local/list_threads.rs:14][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:56][E: codex-rs/thread-store/src/local/archive_thread.rs:51][E: codex-rs/thread-store/src/local/unarchive_thread.rs:74][E: codex-rs/thread-store/src/remote/mod.rs:84][E: codex-rs/thread-store/src/remote/list_threads.rs:40][I]

## 能回答的问题

- `ThreadStore` trait 规定了哪些 thread 操作？
- `ThreadRecorder` 和 `RolloutRecorder` 的关系是什么？
- `StoredThread` 是哪些字段的统一返回模型？
- `LocalThreadStore` 当前实现了哪些方法，哪些方法在这个 slice 中未实现？
- `RemoteThreadStore` 当前 gRPC 支持哪些操作？

## 职责边界

- `ThreadStore` trait 是存储中立边界；实现负责把 `ThreadId` 解析为 local rollout、RPC request 或其他 backing store。[E: codex-rs/thread-store/src/lib.rs:1][E: codex-rs/thread-store/src/lib.rs:3]
- `ThreadRecorder` trait 是 live append handle；注释说明 local implementation 应 wrap `codex_rollout::RolloutRecorder` 并保留 lazy materialization/filtering/flush/shutdown 行为。[E: codex-rs/thread-store/src/recorder.rs:7][E: codex-rs/thread-store/src/recorder.rs:9]
- `LocalThreadStore` 是 filesystem/SQLite-backed implementation，但这个 slice 中 create/resume/append/load_history 均返回 unsupported。[E: codex-rs/thread-store/src/local/mod.rs:30][E: codex-rs/thread-store/src/local/mod.rs:69][E: codex-rs/thread-store/src/local/mod.rs:76][E: codex-rs/thread-store/src/local/mod.rs:80][E: codex-rs/thread-store/src/local/mod.rs:87]
- `RemoteThreadStore` 是 gRPC-backed implementation；当前 trait impl 只有 `list_threads` 调用远端，其他操作返回 not implemented。[E: codex-rs/thread-store/src/remote/mod.rs:26][E: codex-rs/thread-store/src/remote/mod.rs:84][E: codex-rs/thread-store/src/remote/mod.rs:85][E: codex-rs/thread-store/src/remote/mod.rs:59][E: codex-rs/thread-store/src/remote/mod.rs:66][E: codex-rs/thread-store/src/remote/mod.rs:70]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/thread-store/src/store.rs` | `ThreadStore` trait 的 API 边界。[E: codex-rs/thread-store/src/store.rs:21][E: codex-rs/thread-store/src/store.rs:26] |
| `codex-rs/thread-store/src/recorder.rs` | `ThreadRecorder` live append trait。[E: codex-rs/thread-store/src/recorder.rs:13][E: codex-rs/thread-store/src/recorder.rs:17] |
| `codex-rs/thread-store/src/types.rs` | params、page、stored thread、metadata patch、archive params。[E: codex-rs/thread-store/src/types.rs:29][E: codex-rs/thread-store/src/types.rs:115][E: codex-rs/thread-store/src/types.rs:137][E: codex-rs/thread-store/src/types.rs:146][E: codex-rs/thread-store/src/types.rs:211][E: codex-rs/thread-store/src/types.rs:233] |
| `codex-rs/thread-store/src/local/*` | 本地 read/list/update/archive/unarchive 对 rollout/state DB 的适配。[E: codex-rs/thread-store/src/local/read_thread.rs:25][E: codex-rs/thread-store/src/local/list_threads.rs:14][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:56][E: codex-rs/thread-store/src/local/archive_thread.rs:11][E: codex-rs/thread-store/src/local/archive_thread.rs:51][E: codex-rs/thread-store/src/local/unarchive_thread.rs:15][E: codex-rs/thread-store/src/local/unarchive_thread.rs:74] |
| `codex-rs/thread-store/src/remote/*` | gRPC list request/response mapping。[E: codex-rs/thread-store/src/remote/list_threads.rs:12][E: codex-rs/thread-store/src/remote/helpers.rs:96] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ThreadStoreError` | `ThreadNotFound`、`InvalidRequest`、`Conflict`、`Internal` | store 实现共享错误分类；remote status helper 当前只把 `InvalidArgument` 映射到 `InvalidRequest`、把 `AlreadyExists`/`FailedPrecondition`/`Aborted` 映射到 `Conflict`、其他 status 映射到 `Internal`。[E: codex-rs/thread-store/src/error.rs:7][E: codex-rs/thread-store/src/error.rs:9][E: codex-rs/thread-store/src/error.rs:16][E: codex-rs/thread-store/src/error.rs:23][E: codex-rs/thread-store/src/error.rs:30][E: codex-rs/thread-store/src/remote/helpers.rs:22][E: codex-rs/thread-store/src/remote/helpers.rs:24][E: codex-rs/thread-store/src/remote/helpers.rs:27][E: codex-rs/thread-store/src/remote/helpers.rs:32] |
| `CreateThreadParams` | thread_id、forked_from_id、source、base_instructions、dynamic_tools、event_persistence_mode | 创建线程所需 metadata 与 recorder persistence mode。[E: codex-rs/thread-store/src/types.rs:31][E: codex-rs/thread-store/src/types.rs:33][E: codex-rs/thread-store/src/types.rs:35][E: codex-rs/thread-store/src/types.rs:37][E: codex-rs/thread-store/src/types.rs:39][E: codex-rs/thread-store/src/types.rs:41][E: codex-rs/thread-store/src/types.rs:43] |
| `ResumeThreadRecorderParams` | thread_id、include_archived、event_persistence_mode | 重开 live recorder 的参数。[E: codex-rs/thread-store/src/types.rs:48][E: codex-rs/thread-store/src/types.rs:50][E: codex-rs/thread-store/src/types.rs:52][E: codex-rs/thread-store/src/types.rs:54] |
| `ListThreadsParams` | page_size、cursor、sort_key、sort_direction、allowed_sources、model_providers、archived、search_term | list API 的通用过滤与分页结构。[E: codex-rs/thread-store/src/types.rs:117][E: codex-rs/thread-store/src/types.rs:119][E: codex-rs/thread-store/src/types.rs:121][E: codex-rs/thread-store/src/types.rs:123][E: codex-rs/thread-store/src/types.rs:125][E: codex-rs/thread-store/src/types.rs:127][E: codex-rs/thread-store/src/types.rs:130][E: codex-rs/thread-store/src/types.rs:132][E: codex-rs/thread-store/src/types.rs:134] |
| `StoredThread` | thread_id、rollout_path、forked_from_id、preview/name、model/provider/effort、timestamps、archive/cwd/source/git/approval/sandbox/token/history | local/remote 返回统一 thread summary，remote 的 `rollout_path` 会为 None。[E: codex-rs/thread-store/src/types.rs:148][E: codex-rs/thread-store/src/types.rs:150][E: codex-rs/thread-store/src/types.rs:152][E: codex-rs/thread-store/src/types.rs:156][E: codex-rs/thread-store/src/types.rs:160][E: codex-rs/thread-store/src/types.rs:164][E: codex-rs/thread-store/src/types.rs:166][E: codex-rs/thread-store/src/types.rs:170][E: codex-rs/thread-store/src/types.rs:172][E: codex-rs/thread-store/src/types.rs:184][E: codex-rs/thread-store/src/types.rs:186][E: codex-rs/thread-store/src/types.rs:188][E: codex-rs/thread-store/src/types.rs:190][E: codex-rs/thread-store/src/types.rs:194][E: codex-rs/thread-store/src/remote/helpers.rs:122][E: codex-rs/thread-store/src/remote/helpers.rs:124] |
| `ThreadMetadataPatch` | `name`、`memory_mode`、`git_info` | 本地 patch 当前只支持 name 或 memory_mode 中一个，git_info 在这个 slice 中未实现。[E: codex-rs/thread-store/src/types.rs:213][E: codex-rs/thread-store/src/types.rs:215][E: codex-rs/thread-store/src/types.rs:217][E: codex-rs/thread-store/src/types.rs:219][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:32][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:38] |

## Trait API

1. `ThreadStore::create_thread` 创建新 thread 并返回 live recorder。[E: codex-rs/thread-store/src/store.rs:26][E: codex-rs/thread-store/src/store.rs:27]
2. `resume_thread_recorder` 为已有 thread 重新打开 live recorder。[E: codex-rs/thread-store/src/store.rs:32][E: codex-rs/thread-store/src/store.rs:33]
3. `append_items` 在 live-recorder path 之外追加 items。[E: codex-rs/thread-store/src/store.rs:38][E: codex-rs/thread-store/src/store.rs:39]
4. `load_history` 用于 resume、fork、rollback、memory jobs。[E: codex-rs/thread-store/src/store.rs:41][E: codex-rs/thread-store/src/store.rs:42]
5. `read_thread`、`list_threads` 读取 summary/history 和列表页。[E: codex-rs/thread-store/src/store.rs:47][E: codex-rs/thread-store/src/store.rs:50]
6. `update_thread_metadata`、`archive_thread`、`unarchive_thread` 是可变 metadata/归档操作。[E: codex-rs/thread-store/src/store.rs:53][E: codex-rs/thread-store/src/store.rs:59][E: codex-rs/thread-store/src/store.rs:62]
7. `ThreadRecorder` 提供 `record_items`、`persist`、`flush`、`shutdown`，注释要求 local implementation preserve rollout recorder 的 lazy materialization、filtering、flush 和 shutdown 行为。[E: codex-rs/thread-store/src/recorder.rs:9][E: codex-rs/thread-store/src/recorder.rs:10][E: codex-rs/thread-store/src/recorder.rs:11][E: codex-rs/thread-store/src/recorder.rs:17][E: codex-rs/thread-store/src/recorder.rs:20][E: codex-rs/thread-store/src/recorder.rs:23][E: codex-rs/thread-store/src/recorder.rs:26]

## LocalThreadStore 控制流

1. `LocalThreadStore::new` 保存 rollout config；`read_thread_by_rollout_path` 可按 path 读本地 rollout-backed thread。[E: codex-rs/thread-store/src/local/mod.rs:36][E: codex-rs/thread-store/src/local/mod.rs:42]
2. local trait impl 中 `create_thread`、`resume_thread_recorder`、`append_items`、`load_history` 全部调用 `unsupported`。[E: codex-rs/thread-store/src/local/mod.rs:69][E: codex-rs/thread-store/src/local/mod.rs:76][E: codex-rs/thread-store/src/local/mod.rs:80][E: codex-rs/thread-store/src/local/mod.rs:87]
3. `read_thread` 优先尝试读取 SQLite metadata；metadata 存在且 archive 条件允许时构造 `StoredThread` 并按需 attach history。[E: codex-rs/thread-store/src/local/read_thread.rs:25][E: codex-rs/thread-store/src/local/read_thread.rs:30][E: codex-rs/thread-store/src/local/read_thread.rs:33]
4. SQLite 不可用或不满足 archive 条件时，`read_thread` 解析 active/archived rollout path，读取 rollout item 或 session meta，按需 `RolloutRecorder::load_rollout_items` attach history。[E: codex-rs/thread-store/src/local/read_thread.rs:38][E: codex-rs/thread-store/src/local/read_thread.rs:103][E: codex-rs/thread-store/src/local/read_thread.rs:110][E: codex-rs/thread-store/src/local/read_thread.rs:120][E: codex-rs/thread-store/src/local/read_thread.rs:132][E: codex-rs/thread-store/src/local/read_thread.rs:133][E: codex-rs/thread-store/src/local/read_thread.rs:161]
5. `list_threads` 把 ThreadStore sort/cursor 参数转换为 rollout list 参数，调用 active 或 archived `RolloutRecorder::list_*`，再把 rollout `ThreadItem` 转成 `StoredThread`。[E: codex-rs/thread-store/src/local/list_threads.rs:18][E: codex-rs/thread-store/src/local/list_threads.rs:27][E: codex-rs/thread-store/src/local/list_threads.rs:31][E: codex-rs/thread-store/src/local/list_threads.rs:52][E: codex-rs/thread-store/src/local/list_threads.rs:53][E: codex-rs/thread-store/src/local/list_threads.rs:71][E: codex-rs/thread-store/src/local/list_threads.rs:85]
6. `update_thread_metadata` 拒绝 git_info patch，拒绝同时 patch name 和 memory_mode；name 会追加 `EventMsg::ThreadNameUpdated` 并更新 sidecar name index，memory_mode 会追加新的 `SessionMeta` line。[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:32][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:38][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:85][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:95][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:122]
7. metadata update 后调用 `codex_rollout::state_db::reconcile_rollout` 修复 SQLite mirror，再重新 read thread 返回。[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:56][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:57][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:68]
8. `archive_thread` 要求 active rollout path 在 sessions dir 且 filename 匹配 thread id，然后 rename 到 archived sessions dir，并 best-effort 更新 SQLite `mark_archived`。[E: codex-rs/thread-store/src/local/archive_thread.rs:16][E: codex-rs/thread-store/src/local/archive_thread.rs:26][E: codex-rs/thread-store/src/local/archive_thread.rs:31][E: codex-rs/thread-store/src/local/archive_thread.rs:45][E: codex-rs/thread-store/src/local/archive_thread.rs:51]
9. `unarchive_thread` 从 archived dir 找 path，解析 filename timestamp 恢复到 `sessions/YYYY/MM/DD`，touch modified time，并 best-effort 更新 SQLite `mark_unarchived`。[E: codex-rs/thread-store/src/local/unarchive_thread.rs:20][E: codex-rs/thread-store/src/local/unarchive_thread.rs:45][E: codex-rs/thread-store/src/local/unarchive_thread.rs:54][E: codex-rs/thread-store/src/local/unarchive_thread.rs:70][E: codex-rs/thread-store/src/local/unarchive_thread.rs:74]

## RemoteThreadStore 控制流

1. proto 目前只定义 `rpc ListThreads(ListThreadsRequest) returns (ListThreadsResponse)`。[E: codex-rs/thread-store/src/remote/proto/codex.thread_store.v1.proto:5][E: codex-rs/thread-store/src/remote/proto/codex.thread_store.v1.proto:6]
2. `RemoteThreadStore::client` 用 endpoint 建立 tonic channel，失败映射为 `ThreadStoreError::Internal`。[E: codex-rs/thread-store/src/remote/mod.rs:33][E: codex-rs/thread-store/src/remote/mod.rs:40][E: codex-rs/thread-store/src/remote/mod.rs:43]
3. remote list 把 page_size、cursor、sort_key、allowed_sources、model_provider_filter、archived、search_term 映射到 proto request，再调用 `client.list_threads`。[E: codex-rs/thread-store/src/remote/list_threads.rs:16][E: codex-rs/thread-store/src/remote/list_threads.rs:24][E: codex-rs/thread-store/src/remote/list_threads.rs:30][E: codex-rs/thread-store/src/remote/list_threads.rs:37]
4. proto thread 映射回 `StoredThread` 时，remote 不提供 local rollout path，并把 approval/sandbox 固定为 `OnRequest` 和 read-only default。[E: codex-rs/thread-store/src/remote/helpers.rs:122][E: codex-rs/thread-store/src/remote/helpers.rs:124][E: codex-rs/thread-store/src/remote/helpers.rs:145][E: codex-rs/thread-store/src/remote/helpers.rs:146]

## 设计动机与权衡

- ThreadStore 把 stable `ThreadId` 作为唯一 durable handle，避免上层依赖 rollout path 或 remote storage 细节。[E: codex-rs/thread-store/src/lib.rs:1][E: codex-rs/thread-store/src/lib.rs:3][I]
- local implementation 仍大量委托 `codex_rollout::RolloutRecorder` 和 state DB mirror，说明 ThreadStore 是迁移/抽象层，而不是已经完全替换 rollout persistence。[E: codex-rs/thread-store/src/local/list_threads.rs:2][E: codex-rs/thread-store/src/local/read_thread.rs:7][E: codex-rs/thread-store/src/local/read_thread.rs:13][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:56][E: codex-rs/thread-store/src/local/archive_thread.rs:51][I]
- archive/unarchive 使用 scoped canonical path 和 filename suffix 校验，避免把任意 path 移入/移出 archive collection。[E: codex-rs/thread-store/src/local/helpers.rs:22][E: codex-rs/thread-store/src/local/helpers.rs:53][I]

## Gotcha

- `LocalThreadStore::load_history` 当前 unsupported，即使 `read_thread(include_history=true)` 能 attach history；不要把 trait 方法实现状态和 read helper 能力混为一谈。[E: codex-rs/thread-store/src/local/mod.rs:87][E: codex-rs/thread-store/src/local/read_thread.rs:80]
- remote `StoredThread` 当前没有 approval/sandbox/token/history 的真实远端映射，helper 使用默认值。[E: codex-rs/thread-store/src/remote/helpers.rs:145][E: codex-rs/thread-store/src/remote/helpers.rs:147]
- local update metadata 一次 patch 只能修改一个字段，并且 git metadata update 未实现。[E: codex-rs/thread-store/src/local/update_thread_metadata.rs:32][E: codex-rs/thread-store/src/local/update_thread_metadata.rs:38]

## Sources

- `codex-rs/thread-store/src/store.rs`
- `codex-rs/thread-store/src/recorder.rs`
- `codex-rs/thread-store/src/types.rs`
- `codex-rs/thread-store/src/error.rs`
- `codex-rs/thread-store/src/lib.rs`
- `codex-rs/thread-store/src/local/mod.rs`
- `codex-rs/thread-store/src/local/helpers.rs`
- `codex-rs/thread-store/src/local/read_thread.rs`
- `codex-rs/thread-store/src/local/list_threads.rs`
- `codex-rs/thread-store/src/local/update_thread_metadata.rs`
- `codex-rs/thread-store/src/local/archive_thread.rs`
- `codex-rs/thread-store/src/local/unarchive_thread.rs`
- `codex-rs/thread-store/src/remote/mod.rs`
- `codex-rs/thread-store/src/remote/list_threads.rs`
- `codex-rs/thread-store/src/remote/helpers.rs`
- `codex-rs/thread-store/src/remote/proto/codex.thread_store.v1.proto`

## 相关

- [Rollout persistence](rollout-persistence.md)
- [State DB](state-db.md)
- [Realtime conversation](realtime-conversation.md)
