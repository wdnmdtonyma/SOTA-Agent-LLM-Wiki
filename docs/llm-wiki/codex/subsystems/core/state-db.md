---
id: subsys.core.state-db
title: State DB runtime
kind: subsystem
tier: T2
source: [codex-rs/state/src/lib.rs, codex-rs/state/src/runtime.rs, codex-rs/state/src/runtime/threads.rs, codex-rs/state/src/runtime/backfill.rs, codex-rs/state/src/runtime/logs.rs, codex-rs/state/src/extract.rs, codex-rs/state/src/model/thread_metadata.rs, codex-rs/rollout/src/state_db.rs]
symbols: [StateRuntime, RuntimeDbSpec, ThreadMetadata, ThreadMetadataBuilder, ThreadsPage, ExtractionOutcome, apply_rollout_item, rollout_item_affects_thread_metadata, BackfillState, LOGS_DB_FILENAME, GOALS_DB_FILENAME, MEMORIES_DB_FILENAME, STATE_DB_FILENAME]
related: [subsys.core.rollout-persistence, subsys.core.thread-store, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: db887d03e1
---

> State DB is Codex's SQLite-backed local state runtime. It mirrors rollout thread metadata into `state_5.sqlite`, stores logs in `logs_2.sqlite`, and opens dedicated goals and memories databases (`goals_1.sqlite`, `memories_1.sqlite`).[E: codex-rs/state/src/lib.rs:97][E: codex-rs/state/src/lib.rs:98][E: codex-rs/state/src/lib.rs:99][E: codex-rs/state/src/lib.rs:100]

## 能回答的问题

- `StateRuntime::init` 会打开哪些 SQLite 文件？
- rollout item 哪些会影响 thread metadata？
- thread list/search/filter 的 SQLite page 如何构造？
- backfill lease、checkpoint、complete 状态在哪里维护？
- logs DB 为什么独立，retention 怎么做？

## 职责边界

- `codex-rs/state` exports local state types and database path helpers; rollout/core code accesses it through `codex-rs/rollout/src/state_db.rs` rather than owning SQLite details in the recorder.[E: codex-rs/state/src/lib.rs:21][E: codex-rs/state/src/lib.rs:95][E: codex-rs/state/src/lib.rs:100][E: codex-rs/rollout/src/state_db.rs:27]
- `StateRuntime` owns the state pool, logs pool, goal store, memory store, and process-local thread timestamp high-water marks.[E: codex-rs/state/src/runtime.rs:156][E: codex-rs/state/src/runtime.rs:159][E: codex-rs/state/src/runtime.rs:160][E: codex-rs/state/src/runtime.rs:161][E: codex-rs/state/src/runtime.rs:162][E: codex-rs/state/src/runtime.rs:163][E: codex-rs/state/src/runtime.rs:164]
- `codex-rs/rollout/src/state_db.rs` is the rollout/core-facing wrapper; it initializes or optionally opens the runtime and reconciles rollout files into it.[E: codex-rs/rollout/src/state_db.rs:43][E: codex-rs/rollout/src/state_db.rs:217][E: codex-rs/rollout/src/state_db.rs:491]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/state/src/lib.rs` | Public exports, SQLite filenames, metrics constants.[E: codex-rs/state/src/lib.rs:21][E: codex-rs/state/src/lib.rs:95][E: codex-rs/state/src/lib.rs:100] |
| `codex-rs/state/src/runtime.rs` | Runtime DB specs, `StateRuntime` fields, SQLite open/migration options, startup maintenance.[E: codex-rs/state/src/runtime.rs:115][E: codex-rs/state/src/runtime.rs:147][E: codex-rs/state/src/runtime.rs:167][E: codex-rs/state/src/runtime.rs:362] |
| `codex-rs/state/src/runtime/threads.rs` | Thread metadata reads/lists/upserts and incremental rollout item application.[E: codex-rs/state/src/runtime/threads.rs:402][E: codex-rs/state/src/runtime/threads.rs:437][E: codex-rs/state/src/runtime/threads.rs:906] |
| `codex-rs/state/src/extract.rs` | Field projection from rollout items into `ThreadMetadata`.[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:36] |
| `codex-rs/state/src/runtime/backfill.rs` | Backfill state row, lease claim, checkpoint, completion.[E: codex-rs/state/src/runtime/backfill.rs:4][E: codex-rs/state/src/runtime/backfill.rs:23][E: codex-rs/state/src/runtime/backfill.rs:64][E: codex-rs/state/src/runtime/backfill.rs:82] |
| `codex-rs/state/src/runtime/logs.rs` | Logs insert, per-partition pruning, and startup retention maintenance.[E: codex-rs/state/src/runtime/logs.rs:3][E: codex-rs/state/src/runtime/logs.rs:11][E: codex-rs/state/src/runtime/logs.rs:44][E: codex-rs/state/src/runtime/logs.rs:296] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| runtime DB files | `state_5.sqlite`, `logs_2.sqlite`, `goals_1.sqlite`, `memories_1.sqlite` | Four `RuntimeDbSpec`s are collected in `RUNTIME_DBS`; runtime path helpers expose each filename/path.[E: codex-rs/state/src/runtime.rs:115][E: codex-rs/state/src/runtime.rs:123][E: codex-rs/state/src/runtime.rs:131][E: codex-rs/state/src/runtime.rs:139][E: codex-rs/state/src/runtime.rs:147][E: codex-rs/state/src/runtime.rs:479][E: codex-rs/state/src/runtime.rs:483][E: codex-rs/state/src/runtime.rs:487][E: codex-rs/state/src/runtime.rs:491][E: codex-rs/state/src/runtime.rs:495][E: codex-rs/state/src/runtime.rs:499][E: codex-rs/state/src/runtime.rs:503][E: codex-rs/state/src/runtime.rs:507][E: codex-rs/state/src/runtime.rs:511] |
| `StateRuntime` | `codex_home`, `default_provider`, pools/stores, timestamp counters | It combines state/log pools with goals/memories stores and high-water marks.[E: codex-rs/state/src/runtime.rs:156][E: codex-rs/state/src/runtime.rs:297][E: codex-rs/state/src/runtime.rs:304][E: codex-rs/state/src/runtime.rs:305] |
| `ThreadMetadata` | id, rollout path, timestamps, source, model, cwd, title/preview, sandbox/approval, tokens, archive, git | Canonical SQLite representation of thread metadata derived from rollout files.[E: codex-rs/state/src/model/thread_metadata.rs:78][E: codex-rs/state/src/model/thread_metadata.rs:80][E: codex-rs/state/src/model/thread_metadata.rs:82][E: codex-rs/state/src/model/thread_metadata.rs:84][E: codex-rs/state/src/model/thread_metadata.rs:86][E: codex-rs/state/src/model/thread_metadata.rs:88][E: codex-rs/state/src/model/thread_metadata.rs:90][E: codex-rs/state/src/model/thread_metadata.rs:102][E: codex-rs/state/src/model/thread_metadata.rs:104][E: codex-rs/state/src/model/thread_metadata.rs:108][E: codex-rs/state/src/model/thread_metadata.rs:112][E: codex-rs/state/src/model/thread_metadata.rs:114][E: codex-rs/state/src/model/thread_metadata.rs:116][E: codex-rs/state/src/model/thread_metadata.rs:118][E: codex-rs/state/src/model/thread_metadata.rs:120][E: codex-rs/state/src/model/thread_metadata.rs:124][E: codex-rs/state/src/model/thread_metadata.rs:126][E: codex-rs/state/src/model/thread_metadata.rs:128][E: codex-rs/state/src/model/thread_metadata.rs:130] |
| `ThreadMetadataBuilder` | id, rollout path, timestamps, source, cwd, provider | Builder input used when applying item batches without reparsing filenames.[E: codex-rs/state/src/model/thread_metadata.rs:135][E: codex-rs/state/src/model/thread_metadata.rs:137][E: codex-rs/state/src/model/thread_metadata.rs:139][E: codex-rs/state/src/model/thread_metadata.rs:141][E: codex-rs/state/src/model/thread_metadata.rs:143][E: codex-rs/state/src/model/thread_metadata.rs:145][E: codex-rs/state/src/model/thread_metadata.rs:147][E: codex-rs/state/src/model/thread_metadata.rs:159][E: codex-rs/state/src/model/thread_metadata.rs:161] |
| `ThreadsPage` | items, parent ids, next anchor | SQLite listing returns keyset pagination metadata and parent-thread mapping.[E: codex-rs/state/src/model/thread_metadata.rs:54][E: codex-rs/state/src/model/thread_metadata.rs:56][E: codex-rs/state/src/model/thread_metadata.rs:58][E: codex-rs/state/src/model/thread_metadata.rs:60] |

## 控制流：初始化

1. `StateRuntime::init` calls `init_inner`, which creates the SQLite home directory, constructs four migrators, and computes four DB paths.[E: codex-rs/state/src/runtime.rs:173][E: codex-rs/state/src/runtime.rs:191][E: codex-rs/state/src/runtime.rs:196][E: codex-rs/state/src/runtime.rs:197][E: codex-rs/state/src/runtime.rs:200][E: codex-rs/state/src/runtime.rs:201][E: codex-rs/state/src/runtime.rs:204]
2. It opens state, logs, goals, and memories SQLite pools in sequence; failures close pools already opened before returning an error.[E: codex-rs/state/src/runtime.rs:205][E: codex-rs/state/src/runtime.rs:212][E: codex-rs/state/src/runtime.rs:221][E: codex-rs/state/src/runtime.rs:230][E: codex-rs/state/src/runtime.rs:243]
3. After DB open, init ensures the backfill row, reads max thread updated/recency timestamps, builds `GoalStore`/`MemoryStore`, and runs logs startup maintenance best-effort.[E: codex-rs/state/src/runtime.rs:248][E: codex-rs/state/src/runtime.rs:267][E: codex-rs/state/src/runtime.rs:297][E: codex-rs/state/src/runtime.rs:298][E: codex-rs/state/src/runtime.rs:299][E: codex-rs/state/src/runtime.rs:307]
4. All runtime DBs use create-if-missing, WAL, normal synchronous mode, 5 second busy timeout, incremental auto-vacuum, and a max connection count of 5.[E: codex-rs/state/src/runtime.rs:362][E: codex-rs/state/src/runtime.rs:365][E: codex-rs/state/src/runtime.rs:366][E: codex-rs/state/src/runtime.rs:367][E: codex-rs/state/src/runtime.rs:368][E: codex-rs/state/src/runtime.rs:413][E: codex-rs/state/src/runtime.rs:416]

## 控制流：rollout 投影

1. `rollout_item_affects_thread_metadata` returns true only for `SessionMeta`, `TurnContext`, and `EventMsg::{TokenCount, UserMessage, ThreadGoalUpdated}`.[E: codex-rs/state/src/extract.rs:36][E: codex-rs/state/src/extract.rs:38][E: codex-rs/state/src/extract.rs:40][E: codex-rs/state/src/extract.rs:41]
2. `apply_rollout_item` dispatches by rollout item type, and response items currently do not mutate metadata.[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:20][E: codex-rs/state/src/extract.rs:24][E: codex-rs/state/src/extract.rs:116]
3. `TurnContext` updates cwd fallback, model, reasoning effort, sandbox policy, and approval mode.[E: codex-rs/state/src/extract.rs:80][E: codex-rs/state/src/extract.rs:82][E: codex-rs/state/src/extract.rs:84][E: codex-rs/state/src/extract.rs:85][E: codex-rs/state/src/extract.rs:86][E: codex-rs/state/src/extract.rs:88]
4. `UserMessage` initializes first-user-message/preview/title; `ThreadGoalUpdated` can fill preview; `TokenCount` records total tokens.[E: codex-rs/state/src/extract.rs:93][E: codex-rs/state/src/extract.rs:95][E: codex-rs/state/src/extract.rs:98][E: codex-rs/state/src/extract.rs:101][E: codex-rs/state/src/extract.rs:107][E: codex-rs/state/src/extract.rs:111][E: codex-rs/state/src/extract.rs:114]
5. `StateRuntime::apply_rollout_items` reads existing metadata or builds defaults, applies each item, preserves existing git info, updates `updated_at`, then upserts metadata and memory mode.[E: codex-rs/state/src/runtime/threads.rs:906][E: codex-rs/state/src/runtime/threads.rs:916][E: codex-rs/state/src/runtime/threads.rs:919][E: codex-rs/state/src/runtime/threads.rs:922][E: codex-rs/state/src/runtime/threads.rs:925][E: codex-rs/state/src/runtime/threads.rs:931][E: codex-rs/state/src/runtime/threads.rs:935][E: codex-rs/state/src/runtime/threads.rs:941]

## 控制流：query/backfill/logs

1. `list_threads` and relationship listing both call `list_threads_matching`, centralizing SQLite thread pagination and filters.[E: codex-rs/state/src/runtime/threads.rs:402][E: codex-rs/state/src/runtime/threads.rs:407][E: codex-rs/state/src/runtime/threads.rs:412][E: codex-rs/state/src/runtime/threads.rs:433][E: codex-rs/state/src/runtime/threads.rs:437]
2. `try_claim_backfill` updates the single backfill row only when backfill is not complete and the running lease is absent or expired.[E: codex-rs/state/src/runtime/backfill.rs:23][E: codex-rs/state/src/runtime/backfill.rs:27][E: codex-rs/state/src/runtime/backfill.rs:32][E: codex-rs/state/src/runtime/backfill.rs:39]
3. `checkpoint_backfill` stores `Running` plus `last_watermark`; `mark_backfill_complete` stores `Complete`, `last_success_at`, and `updated_at`.[E: codex-rs/state/src/runtime/backfill.rs:64][E: codex-rs/state/src/runtime/backfill.rs:68][E: codex-rs/state/src/runtime/backfill.rs:82][E: codex-rs/state/src/runtime/backfill.rs:87]
4. Logs insert uses a `logs_pool` transaction and prunes within the same transaction.[E: codex-rs/state/src/runtime/logs.rs:11][E: codex-rs/state/src/runtime/logs.rs:16][E: codex-rs/state/src/runtime/logs.rs:44][E: codex-rs/state/src/runtime/logs.rs:45]
5. Logs startup maintenance deletes logs older than 10 days and runs a passive WAL checkpoint.[E: codex-rs/state/src/runtime/logs.rs:3][E: codex-rs/state/src/runtime/logs.rs:296][E: codex-rs/state/src/runtime/logs.rs:302][E: codex-rs/state/src/runtime/logs.rs:306]

## Gotcha

- This node should not describe State DB as only `state` + `logs`; current `StateRuntime` opens four runtime databases and stores goals/memories through dedicated stores.[E: codex-rs/state/src/runtime.rs:147][E: codex-rs/state/src/runtime.rs:297][E: codex-rs/state/src/runtime.rs:298][E: codex-rs/state/src/runtime.rs:299]
- `get_state_db` in the rollout wrapper is optional and read-oriented: it requires the DB file to exist, opens the runtime, then requires startup backfill completion.[E: codex-rs/rollout/src/state_db.rs:217][E: codex-rs/rollout/src/state_db.rs:219][E: codex-rs/rollout/src/state_db.rs:227][E: codex-rs/rollout/src/state_db.rs:243]
- `ResponseItem`s are still accepted by `apply_rollout_item`, but the current response projection function is empty.[E: codex-rs/state/src/extract.rs:24][E: codex-rs/state/src/extract.rs:116]

## Sources

- `codex-rs/state/src/lib.rs`
- `codex-rs/state/src/runtime.rs`
- `codex-rs/state/src/runtime/threads.rs`
- `codex-rs/state/src/runtime/backfill.rs`
- `codex-rs/state/src/runtime/logs.rs`
- `codex-rs/state/src/extract.rs`
- `codex-rs/state/src/model/thread_metadata.rs`
- `codex-rs/rollout/src/state_db.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- [Thread store](thread-store.md)
- 索引 id：`subsys.core.session-lifecycle`
