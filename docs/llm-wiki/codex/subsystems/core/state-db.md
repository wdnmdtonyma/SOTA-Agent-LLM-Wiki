---
id: subsys.core.state-db
title: State DB runtime
kind: subsystem
tier: T2
source: [codex-rs/state/src/lib.rs, codex-rs/state/src/runtime.rs, codex-rs/state/src/runtime/threads.rs, codex-rs/state/src/runtime/thread_sections.rs, codex-rs/state/src/runtime/thread_section_order.rs, codex-rs/state/src/runtime/backfill.rs, codex-rs/state/src/runtime/logs.rs, codex-rs/state/src/extract.rs, codex-rs/state/src/model/thread_metadata.rs, codex-rs/state/migrations/0042_drop_agent_jobs.sql, codex-rs/state/migrations/0045_threads_section.sql, codex-rs/state/migrations/0046_threads_section_order.sql, codex-rs/rollout/src/state_db.rs]
symbols: [StateRuntime, RuntimeDbSpec, ThreadMetadata, ThreadMetadataBuilder, ThreadsPage, ExtractionOutcome, apply_rollout_item, rollout_item_affects_thread_metadata, BackfillState, LOGS_DB_FILENAME, GOALS_DB_FILENAME, MEMORIES_DB_FILENAME, STATE_DB_FILENAME, THREAD_HISTORY_DB_FILENAME, open_thread_history_db, StateRuntime::move_thread_to_section]
related: [subsys.core.rollout-persistence, subsys.core.thread-store, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 7750465934
---

> Codex 现在有五个 SQLite path specs：metadata、logs、goals、memories，以及 rebuildable paginated history (`thread_history_1.sqlite`)。`StateRuntime::init` 自身仍只持有并打开前四类；thread-history DB 由 thread store 按需通过独立 helper 打开。[E: codex-rs/state/src/lib.rs:103][E: codex-rs/state/src/lib.rs:103][E: codex-rs/state/src/runtime.rs:145][E: codex-rs/state/src/runtime.rs:153][E: codex-rs/state/src/runtime.rs:83]

## 能回答的问题

- `StateRuntime::init` 会打开哪些 SQLite 文件？
- rollout item 哪些会影响 thread metadata？
- thread list/search/filter 的 SQLite page 如何构造？
- built-in/custom thread sections 与 section-local ordering 如何持久化？
- backfill lease、checkpoint、complete 状态在哪里维护？
- logs DB 为什么独立，retention 怎么做？

## 职责边界

- `codex-rs/state` exports local state types and database path helpers; rollout/core code accesses it through `codex-rs/rollout/src/state_db.rs` rather than owning SQLite details in the recorder.[E: codex-rs/state/src/lib.rs:22][E: codex-rs/state/src/lib.rs:90][E: codex-rs/state/src/lib.rs:103][E: codex-rs/rollout/src/state_db.rs:29]
- `StateRuntime` owns the state pool, logs pool, goal store, memory store, and process-local thread timestamp high-water marks.[E: codex-rs/state/src/runtime.rs:83][E: codex-rs/state/src/runtime.rs:86][E: codex-rs/state/src/runtime.rs:87][E: codex-rs/state/src/runtime.rs:88][E: codex-rs/state/src/runtime.rs:89][E: codex-rs/state/src/runtime.rs:90][E: codex-rs/state/src/runtime.rs:91]
- `codex-rs/rollout/src/state_db.rs` is the rollout/core-facing wrapper; it initializes or optionally opens the runtime and reconciles rollout files into it.[E: codex-rs/rollout/src/state_db.rs:45][E: codex-rs/rollout/src/state_db.rs:208][E: codex-rs/rollout/src/state_db.rs:516]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/state/src/lib.rs` | Public exports, SQLite filenames, metrics constants.[E: codex-rs/state/src/lib.rs:22][E: codex-rs/state/src/lib.rs:90][E: codex-rs/state/src/lib.rs:103] |
| `codex-rs/state/src/runtime.rs` | Runtime DB specs, `StateRuntime` fields, SQLite open/migration options, startup maintenance.[E: codex-rs/state/src/runtime.rs:114][E: codex-rs/state/src/runtime.rs:149][E: codex-rs/state/src/runtime.rs:94] |
| `codex-rs/state/src/runtime/threads.rs` | Thread metadata reads/lists/upserts and incremental rollout item application.[E: codex-rs/state/src/runtime/threads.rs:412][E: codex-rs/state/src/runtime/threads.rs:447][E: codex-rs/state/src/runtime/threads.rs:952] |
| `thread_sections.rs` / `thread_section_order.rs` | Section CRUD、cursor list、thread move、sparse position 与 renumber transaction。[E: codex-rs/state/src/runtime/thread_sections.rs:8][E: codex-rs/state/src/runtime/thread_sections.rs:24][E: codex-rs/state/src/runtime/thread_sections.rs:45][E: codex-rs/state/src/runtime/thread_section_order.rs:64][E: codex-rs/state/src/runtime/thread_section_order.rs:104][E: codex-rs/state/src/runtime/thread_section_order.rs:193] |
| `codex-rs/state/src/extract.rs` | Field projection from rollout items into `ThreadMetadata`.[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:36] |
| `codex-rs/state/src/runtime/backfill.rs` | Backfill state row, lease claim, checkpoint, completion.[E: codex-rs/state/src/runtime/backfill.rs:4][E: codex-rs/state/src/runtime/backfill.rs:23][E: codex-rs/state/src/runtime/backfill.rs:64][E: codex-rs/state/src/runtime/backfill.rs:82] |
| `codex-rs/state/src/runtime/logs.rs` | Logs insert, per-partition pruning, and startup retention maintenance.[E: codex-rs/state/src/runtime/logs.rs:3][E: codex-rs/state/src/runtime/logs.rs:11][E: codex-rs/state/src/runtime/logs.rs:44][E: codex-rs/state/src/runtime/logs.rs:296] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| runtime DB paths | `state_5.sqlite`, `logs_2.sqlite`, `goals_1.sqlite`, `memories_1.sqlite`, `thread_history_1.sqlite` | Five `RuntimeDbSpec`s are collected in `RUNTIME_DBS`; the fifth is a rebuildable projection store, not a `StateRuntime` field。[E: codex-rs/state/src/runtime.rs:114][E: codex-rs/state/src/runtime.rs:145][E: codex-rs/state/src/runtime.rs:153][E: codex-rs/state/src/runtime.rs:83] |
| `StateRuntime` | `codex_home`, `default_provider`, pools/stores, timestamp counters | It combines state/log pools with goals/memories stores and high-water marks.[E: codex-rs/state/src/runtime.rs:83][E: codex-rs/state/src/runtime.rs:224][E: codex-rs/state/src/runtime.rs:231][E: codex-rs/state/src/runtime.rs:232] |
| `ThreadMetadata` | id, rollout path, timestamps, source, model, cwd, title/preview, sandbox/approval, tokens, archive, optional section + sparse position + entered-at, git | Canonical SQLite representation combines rollout-derived fields with SQLite-only organization metadata。[E: codex-rs/state/src/model/thread_metadata.rs:100][E: codex-rs/state/src/model/thread_metadata.rs:102][E: codex-rs/state/src/model/thread_metadata.rs:104][E: codex-rs/state/src/model/thread_metadata.rs:124][E: codex-rs/state/src/model/thread_metadata.rs:130][E: codex-rs/state/src/model/thread_metadata.rs:134][E: codex-rs/state/src/model/thread_metadata.rs:138][E: codex-rs/state/src/model/thread_metadata.rs:140][E: codex-rs/state/src/model/thread_metadata.rs:144][E: codex-rs/state/src/model/thread_metadata.rs:148][E: codex-rs/state/src/model/thread_metadata.rs:150][E: codex-rs/state/src/model/thread_metadata.rs:152][E: codex-rs/state/src/model/thread_metadata.rs:154][E: codex-rs/state/src/model/thread_metadata.rs:156] |
| `ThreadMetadataBuilder` | id, rollout path, timestamps, source, cwd, provider | Builder input used when applying item batches without reparsing filenames.[E: codex-rs/state/src/model/thread_metadata.rs:165][E: codex-rs/state/src/model/thread_metadata.rs:167][E: codex-rs/state/src/model/thread_metadata.rs:169][E: codex-rs/state/src/model/thread_metadata.rs:171][E: codex-rs/state/src/model/thread_metadata.rs:173][E: codex-rs/state/src/model/thread_metadata.rs:175][E: codex-rs/state/src/model/thread_metadata.rs:177][E: codex-rs/state/src/model/thread_metadata.rs:189][E: codex-rs/state/src/model/thread_metadata.rs:191] |
| `ThreadsPage` | items, parent ids, next anchor | SQLite listing returns keyset pagination metadata and parent-thread mapping.[E: codex-rs/state/src/model/thread_metadata.rs:76][E: codex-rs/state/src/model/thread_metadata.rs:78][E: codex-rs/state/src/model/thread_metadata.rs:80][E: codex-rs/state/src/model/thread_metadata.rs:82] |

## 控制流：初始化

1. `StateRuntime::init` creates the SQLite home, constructs four migrators and opens state/logs/goals/memories；它不主动打开 thread-history DB。[E: codex-rs/state/src/runtime.rs:114][E: codex-rs/state/src/runtime.rs:204][E: codex-rs/state/src/runtime.rs:120][E: codex-rs/state/src/runtime.rs:212][E: codex-rs/state/src/runtime.rs:213]
2. It opens state, logs, goals, and memories SQLite pools in sequence; failures close pools already opened before returning an error.[E: codex-rs/state/src/runtime.rs:122][E: codex-rs/state/src/runtime.rs:229][E: codex-rs/state/src/runtime.rs:134][E: codex-rs/state/src/runtime.rs:252][E: codex-rs/state/src/runtime.rs:170]
3. After DB open, init ensures the backfill row, reads max thread updated/recency timestamps, builds `GoalStore`/`MemoryStore`, and runs logs startup maintenance best-effort.[E: codex-rs/state/src/runtime.rs:175][E: codex-rs/state/src/runtime.rs:194][E: codex-rs/state/src/runtime.rs:224][E: codex-rs/state/src/runtime.rs:225][E: codex-rs/state/src/runtime.rs:226][E: codex-rs/state/src/runtime.rs:234]
4. `open_thread_history_db` 独立创建 migrator 并复用统一 `open_sqlite` 配置；thread store 用 lazy pool 调用它。[E: codex-rs/state/src/runtime.rs:288][E: codex-rs/state/src/runtime.rs:429][E: codex-rs/thread-store/src/local/mod.rs:218][E: codex-rs/thread-store/src/local/mod.rs:165]

迁移 0042 会删除旧 `agent_job_items` 与 `agent_jobs` 表；当前 state runtime 不再导出 agent-jobs runtime API。[E: codex-rs/state/migrations/0042_drop_agent_jobs.sql:1][E: codex-rs/state/migrations/0042_drop_agent_jobs.sql:2][I]

## 控制流：rollout 投影

1. `rollout_item_affects_thread_metadata` accepts `SessionMeta`/`TurnContext`, legacy token/user/goal/settings events, plus Paginated `ItemCompleted(UserMessage)`；这让两种 history mode 都能更新 preview/title。[E: codex-rs/state/src/extract.rs:36][E: codex-rs/state/src/extract.rs:38][E: codex-rs/state/src/extract.rs:40][E: codex-rs/state/src/extract.rs:45]
2. `apply_rollout_item` dispatches by rollout item type, and response items currently do not mutate metadata.[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:20][E: codex-rs/state/src/extract.rs:24]
3. `TurnContext` updates cwd fallback, model, reasoning effort, sandbox policy, and approval mode.[E: codex-rs/state/src/extract.rs:88][E: codex-rs/state/src/extract.rs:90][E: codex-rs/state/src/extract.rs:92][E: codex-rs/state/src/extract.rs:93][E: codex-rs/state/src/extract.rs:94][E: codex-rs/state/src/extract.rs:96]
4. `UserMessage` initializes first-user-message/preview/title; `ThreadGoalUpdated` can fill preview; `TokenCount` records total tokens.[E: codex-rs/state/src/extract.rs:101][E: codex-rs/state/src/extract.rs:103][E: codex-rs/state/src/extract.rs:106][E: codex-rs/state/src/extract.rs:139][E: codex-rs/state/src/extract.rs:145][E: codex-rs/state/src/extract.rs:114][E: codex-rs/state/src/extract.rs:117]
5. `StateRuntime::apply_rollout_items` reads existing metadata or builds defaults, applies each item, preserves existing git info, updates `updated_at`, then upserts metadata and memory mode.[E: codex-rs/state/src/runtime/threads.rs:952][E: codex-rs/state/src/runtime/threads.rs:962][E: codex-rs/state/src/runtime/threads.rs:965][E: codex-rs/state/src/runtime/threads.rs:968][E: codex-rs/state/src/runtime/threads.rs:971][E: codex-rs/state/src/runtime/threads.rs:977][E: codex-rs/state/src/runtime/threads.rs:981][E: codex-rs/state/src/runtime/threads.rs:987]

## 控制流：query/backfill/logs

1. `list_threads` and relationship listing both call `list_threads_matching`, centralizing SQLite thread pagination and filters.[E: codex-rs/state/src/runtime/threads.rs:412][E: codex-rs/state/src/runtime/threads.rs:417][E: codex-rs/state/src/runtime/threads.rs:422][E: codex-rs/state/src/runtime/threads.rs:443][E: codex-rs/state/src/runtime/threads.rs:447]
2. Migration 0045 creates independently persisted `thread_sections`, seeds immutable built-in `Pinned`, and attaches threads with `ON DELETE SET NULL`; migration 0046 adds sparse position/entered-at fields and backfills one-million-step ranks。[E: codex-rs/state/migrations/0045_threads_section.sql:1][E: codex-rs/state/migrations/0045_threads_section.sql:6][E: codex-rs/state/migrations/0045_threads_section.sql:9][E: codex-rs/state/migrations/0046_threads_section_order.sql:1][E: codex-rs/state/migrations/0046_threads_section_order.sql:4][E: codex-rs/state/migrations/0046_threads_section_order.sql:12]
3. Custom section uses UUIDv7 identity；built-in Pinned cannot be renamed/deleted。Delete custom section transaction clears ordering fields before deleting the section。[E: codex-rs/state/src/runtime/thread_sections.rs:8][E: codex-rs/state/src/runtime/thread_sections.rs:10][E: codex-rs/state/src/runtime/thread_sections.rs:29][E: codex-rs/state/src/runtime/thread_sections.rs:45][E: codex-rs/state/src/runtime/thread_sections.rs:50][E: codex-rs/state/src/runtime/thread_sections.rs:52][E: codex-rs/state/src/runtime/thread_sections.rs:58]
4. Section list is stable ID cursor pagination；thread move validates destination and `before_thread_id`, uses midpoint/gap positions, and renumbers once when no gap remains。[E: codex-rs/state/src/runtime/thread_section_order.rs:64][E: codex-rs/state/src/runtime/thread_section_order.rs:75][E: codex-rs/state/src/runtime/thread_section_order.rs:104][E: codex-rs/state/src/runtime/thread_section_order.rs:110][E: codex-rs/state/src/runtime/thread_section_order.rs:138][E: codex-rs/state/src/runtime/thread_section_order.rs:154][E: codex-rs/state/src/runtime/thread_section_order.rs:168][E: codex-rs/state/src/runtime/thread_section_order.rs:193][E: codex-rs/state/src/runtime/thread_section_order.rs:221][E: codex-rs/state/src/runtime/thread_section_order.rs:250]
5. `try_claim_backfill` updates the single backfill row only when backfill is not complete and the running lease is absent or expired.[E: codex-rs/state/src/runtime/backfill.rs:23][E: codex-rs/state/src/runtime/backfill.rs:27][E: codex-rs/state/src/runtime/backfill.rs:32][E: codex-rs/state/src/runtime/backfill.rs:39]
6. `checkpoint_backfill` stores `Running` plus `last_watermark`; `mark_backfill_complete` stores `Complete`, `last_success_at`, and `updated_at`.[E: codex-rs/state/src/runtime/backfill.rs:64][E: codex-rs/state/src/runtime/backfill.rs:68][E: codex-rs/state/src/runtime/backfill.rs:82][E: codex-rs/state/src/runtime/backfill.rs:87]
7. Logs insert uses a `logs_pool` transaction and prunes within the same transaction.[E: codex-rs/state/src/runtime/logs.rs:11][E: codex-rs/state/src/runtime/logs.rs:16][E: codex-rs/state/src/runtime/logs.rs:44][E: codex-rs/state/src/runtime/logs.rs:45]
8. Logs startup maintenance deletes logs older than 10 days and runs a passive WAL checkpoint.[E: codex-rs/state/src/runtime/logs.rs:3][E: codex-rs/state/src/runtime/logs.rs:296][E: codex-rs/state/src/runtime/logs.rs:302][E: codex-rs/state/src/runtime/logs.rs:306]

## Gotcha

- 不要把 `RUNTIME_DBS` 的五个 path specs 误写成 `StateRuntime` 同时持有五个 pool：runtime 仍打开四个主库，thread-history SQLite 是 thread-store-owned、可重建的 lazy projection。[E: codex-rs/state/src/runtime.rs:153][E: codex-rs/state/src/runtime.rs:83]
- `get_state_db` in the rollout wrapper is optional and read-oriented: it requires the DB file to exist, opens the runtime, then requires startup backfill completion.[E: codex-rs/rollout/src/state_db.rs:208][E: codex-rs/rollout/src/state_db.rs:210][E: codex-rs/rollout/src/state_db.rs:218][E: codex-rs/rollout/src/state_db.rs:242]
- `ResponseItem`s are still accepted by `apply_rollout_item`, but the current response projection function is empty.[E: codex-rs/state/src/extract.rs:24]

## Sources

- `codex-rs/state/src/lib.rs`
- `codex-rs/state/src/runtime.rs`
- `codex-rs/state/src/runtime/threads.rs`
- `codex-rs/state/src/runtime/thread_sections.rs`
- `codex-rs/state/src/runtime/thread_section_order.rs`
- `codex-rs/state/src/runtime/backfill.rs`
- `codex-rs/state/src/runtime/logs.rs`
- `codex-rs/state/src/extract.rs`
- `codex-rs/state/src/model/thread_metadata.rs`
- `codex-rs/state/migrations/0042_drop_agent_jobs.sql`
- `codex-rs/state/migrations/0045_threads_section.sql`
- `codex-rs/state/migrations/0046_threads_section_order.sql`
- `codex-rs/rollout/src/state_db.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- [Thread store](thread-store.md)
- 索引 id：`subsys.core.session-lifecycle`
