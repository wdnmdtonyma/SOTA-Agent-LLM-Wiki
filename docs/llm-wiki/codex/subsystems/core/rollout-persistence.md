---
id: subsys.core.rollout-persistence
title: Rollout persistence 与 JSONL recorder
kind: subsystem
tier: T2
source: [codex-rs/rollout/src/recorder.rs, codex-rs/rollout/src/policy.rs, codex-rs/rollout/src/state_db.rs, codex-rs/state/src/runtime/threads.rs, codex-rs/state/src/extract.rs]
symbols: [RolloutRecorder, RolloutRecorderParams, RolloutCmd, RolloutWriterTask, RolloutWriterState, persisted_rollout_items, is_persisted_rollout_item, should_persist_event_msg, load_rollout_items, list_threads_with_db_fallback, StateDbHandle, reconcile_rollout]
related: [subsys.core.state-db, subsys.core.thread-store, ref.protocol-op, ref.data-model]
evidence: explicit
status: verified
updated: db887d03e1
---

> Rollout persistence is the local JSONL replay layer: `RolloutRecorder` owns a writer command queue and rollout path, shared policy decides which `RolloutItem`s are canonical, and `rollout/src/state_db.rs` mirrors rollout metadata into the SQLite state runtime when that runtime is available.[E: codex-rs/rollout/src/recorder.rs:78][E: codex-rs/rollout/src/recorder.rs:79][E: codex-rs/rollout/src/recorder.rs:81][E: codex-rs/rollout/src/policy.rs:6][E: codex-rs/rollout/src/state_db.rs:27]

## 能回答的问题

- recorder 的 create/resume 参数和 writer command 有哪些？
- 哪些 rollout item 会进入 durable JSONL？
- `persist`、`flush`、`shutdown` 对 lazy materialization 和 pending items 有什么语义？
- thread listing 如何在 filesystem scan、SQLite page、read-repair 之间切换？
- JSONL rollout 如何被 reconcile/apply 到 state DB metadata？

## 职责边界

- `RolloutRecorder` 只持有 command sender、writer task observability 和 rollout path；actual file I/O 由 `RolloutWriterState` 执行。[E: codex-rs/rollout/src/recorder.rs:78][E: codex-rs/rollout/src/recorder.rs:79][E: codex-rs/rollout/src/recorder.rs:80][E: codex-rs/rollout/src/recorder.rs:81][E: codex-rs/rollout/src/recorder.rs:1550]
- `RolloutRecorderParams` 只有 `Create` 和 `Resume` 两种形态；create carries thread/session metadata and dynamic tools, resume carries an existing path.[E: codex-rs/rollout/src/recorder.rs:85][E: codex-rs/rollout/src/recorder.rs:86][E: codex-rs/rollout/src/recorder.rs:88][E: codex-rs/rollout/src/recorder.rs:95][E: codex-rs/rollout/src/recorder.rs:97][E: codex-rs/rollout/src/recorder.rs:101][E: codex-rs/rollout/src/recorder.rs:102]
- `RolloutCmd` serializes `AddItems`, `Persist`, `Flush`, and `Shutdown` through the writer task.[E: codex-rs/rollout/src/recorder.rs:106][E: codex-rs/rollout/src/recorder.rs:107][E: codex-rs/rollout/src/recorder.rs:108][E: codex-rs/rollout/src/recorder.rs:112][E: codex-rs/rollout/src/recorder.rs:115]
- The policy module is the canonical filter for persisted rollout history; `ResponseItem::Other`, `ResponseItem::CompactionTrigger`, realtime conversation streaming events and many begin/delta/runtime events are intentionally not durable rollout items.[E: codex-rs/rollout/src/policy.rs:21][E: codex-rs/rollout/src/policy.rs:24][E: codex-rs/rollout/src/policy.rs:49][E: codex-rs/rollout/src/policy.rs:51][E: codex-rs/rollout/src/policy.rs:124][E: codex-rs/rollout/src/policy.rs:126][E: codex-rs/rollout/src/policy.rs:149][E: codex-rs/rollout/src/policy.rs:168]
- The rollout crate does not own SQLite schema details. Its state DB wrapper opens/gets a `codex_state::StateRuntime` handle and delegates list/reconcile/apply work to that runtime.[E: codex-rs/rollout/src/state_db.rs:27][E: codex-rs/rollout/src/state_db.rs:43][E: codex-rs/rollout/src/state_db.rs:217][E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:630]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/rollout/src/recorder.rs` | JSONL recorder, background writer, load/resume helpers, list fallback/repair path.[E: codex-rs/rollout/src/recorder.rs:78][E: codex-rs/rollout/src/recorder.rs:401][E: codex-rs/rollout/src/recorder.rs:933][E: codex-rs/rollout/src/recorder.rs:1550] |
| `codex-rs/rollout/src/policy.rs` | Shared canonical persistence policy for `RolloutItem`, `ResponseItem`, memories, and `EventMsg`.[E: codex-rs/rollout/src/policy.rs:6][E: codex-rs/rollout/src/policy.rs:21][E: codex-rs/rollout/src/policy.rs:33][E: codex-rs/rollout/src/policy.rs:81] |
| `codex-rs/rollout/src/state_db.rs` | Core-facing wrapper for state runtime init/get/list/reconcile/apply/read-repair.[E: codex-rs/rollout/src/state_db.rs:43][E: codex-rs/rollout/src/state_db.rs:217][E: codex-rs/rollout/src/state_db.rs:360][E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:630] |
| `codex-rs/state/src/runtime/threads.rs` | SQLite thread metadata listing and incremental `apply_rollout_items` target.[E: codex-rs/state/src/runtime/threads.rs:402][E: codex-rs/state/src/runtime/threads.rs:906] |
| `codex-rs/state/src/extract.rs` | Per-item projection rules from rollout history into `ThreadMetadata`.[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:36] |

## 控制流：写入

1. Callers queue already-canonical items with `record_canonical_items`; an empty slice is a no-op, otherwise it sends `RolloutCmd::AddItems` to the writer task.[E: codex-rs/rollout/src/recorder.rs:877][E: codex-rs/rollout/src/recorder.rs:878][E: codex-rs/rollout/src/recorder.rs:882]
2. `persist` and `flush` use oneshot acknowledgements so callers wait for the writer's I/O result, not only for enqueue success.[E: codex-rs/rollout/src/recorder.rs:895][E: codex-rs/rollout/src/recorder.rs:896][E: codex-rs/rollout/src/recorder.rs:898][E: codex-rs/rollout/src/recorder.rs:916][E: codex-rs/rollout/src/recorder.rs:917][E: codex-rs/rollout/src/recorder.rs:919]
3. `shutdown` sends `RolloutCmd::Shutdown` and waits for the writer acknowledgement before returning.[E: codex-rs/rollout/src/recorder.rs:1018][E: codex-rs/rollout/src/recorder.rs:1020][E: codex-rs/rollout/src/recorder.rs:1021]
4. `RolloutWriterState` carries writer/deferred file info/pending items/session meta/path; `flush` and `shutdown` return early only when the writer is still deferred and there are no pending items.[E: codex-rs/rollout/src/recorder.rs:1550][E: codex-rs/rollout/src/recorder.rs:1551][E: codex-rs/rollout/src/recorder.rs:1552][E: codex-rs/rollout/src/recorder.rs:1553][E: codex-rs/rollout/src/recorder.rs:1554][E: codex-rs/rollout/src/recorder.rs:1556][E: codex-rs/rollout/src/recorder.rs:1597][E: codex-rs/rollout/src/recorder.rs:1604]
5. `load_rollout_items` reads JSONL line-by-line, skips blanks, counts parse errors, skips legacy `ghost_snapshot` lines, and treats the first `SessionMeta` as the canonical thread id.[E: codex-rs/rollout/src/recorder.rs:933][E: codex-rs/rollout/src/recorder.rs:942][E: codex-rs/rollout/src/recorder.rs:943][E: codex-rs/rollout/src/recorder.rs:951][E: codex-rs/rollout/src/recorder.rs:955][E: codex-rs/rollout/src/recorder.rs:967][E: codex-rs/rollout/src/recorder.rs:969]

## 控制流：list 与 SQLite mirror

1. `list_threads_with_db_fallback` has a `StateDbOnly` repair mode that returns a DB page or an empty default if DB listing is unavailable.[E: codex-rs/rollout/src/recorder.rs:401][E: codex-rs/rollout/src/recorder.rs:425][E: codex-rs/rollout/src/recorder.rs:426][E: codex-rs/rollout/src/recorder.rs:442]
2. Normal listing scans filesystem first, overfetching where needed, so it can repair stale/missing SQLite rows before returning DB-backed or filesystem-backed pages.[E: codex-rs/rollout/src/recorder.rs:445][E: codex-rs/rollout/src/recorder.rs:452][E: codex-rs/rollout/src/recorder.rs:454][E: codex-rs/rollout/src/recorder.rs:620][E: codex-rs/rollout/src/recorder.rs:636]
3. When metadata filters require filesystem fallback, listing records a fallback and returns a filesystem scan page enriched from state DB where possible.[E: codex-rs/rollout/src/recorder.rs:624][E: codex-rs/rollout/src/recorder.rs:629][E: codex-rs/rollout/src/recorder.rs:630]
4. If SQLite listing still fails, the recorder records a DB-error fallback and returns the filesystem page instead of failing the list.[E: codex-rs/rollout/src/recorder.rs:654][E: codex-rs/rollout/src/recorder.rs:655]

## 控制流：state DB 投影

1. `state_db::reconcile_rollout` returns immediately without a runtime handle; with builder/items it delegates to incremental `apply_rollout_items`, otherwise it extracts metadata by scanning the rollout file.[E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:500][E: codex-rs/rollout/src/state_db.rs:503][E: codex-rs/rollout/src/state_db.rs:517]
2. Reconcile preserves existing git/title metadata where appropriate, then upserts the thread and stores memory mode.[E: codex-rs/rollout/src/state_db.rs:531][E: codex-rs/rollout/src/state_db.rs:532][E: codex-rs/rollout/src/state_db.rs:533][E: codex-rs/rollout/src/state_db.rs:544][E: codex-rs/rollout/src/state_db.rs:551]
3. Incremental apply requires either an explicit builder or a builder derived from the item batch; missing builder only warns and returns.[E: codex-rs/rollout/src/state_db.rs:630][E: codex-rs/rollout/src/state_db.rs:643][E: codex-rs/rollout/src/state_db.rs:645][E: codex-rs/rollout/src/state_db.rs:648][E: codex-rs/rollout/src/state_db.rs:653]
4. `codex_state::StateRuntime::apply_rollout_items` reads or builds `ThreadMetadata`, applies each item via `apply_rollout_item`, preserves existing git info, then upserts metadata and memory mode.[E: codex-rs/state/src/runtime/threads.rs:906][E: codex-rs/state/src/runtime/threads.rs:916][E: codex-rs/state/src/runtime/threads.rs:919][E: codex-rs/state/src/runtime/threads.rs:922][E: codex-rs/state/src/runtime/threads.rs:925][E: codex-rs/state/src/runtime/threads.rs:935][E: codex-rs/state/src/runtime/threads.rs:941]

## Gotcha

- `record_canonical_items` does not itself filter raw input; callers that accept raw `RolloutItem`s must use the shared policy before writing durable replay history.[E: codex-rs/rollout/src/recorder.rs:877][E: codex-rs/rollout/src/recorder.rs:882][E: codex-rs/rollout/src/policy.rs:21][E: codex-rs/rollout/src/policy.rs:24]
- `load_rollout_items` is best-effort for malformed lines: bad JSON increments `parse_errors` and replay continues.[E: codex-rs/rollout/src/recorder.rs:947][E: codex-rs/rollout/src/recorder.rs:951][E: codex-rs/rollout/src/recorder.rs:952]
- Event persistence is represented by the `should_persist_event_msg` allow/deny function in `policy.rs`; persisted true variants and false variants are both explicit in that match.[E: codex-rs/rollout/src/policy.rs:81][E: codex-rs/rollout/src/policy.rs:83][E: codex-rs/rollout/src/policy.rs:100][E: codex-rs/rollout/src/policy.rs:111][E: codex-rs/rollout/src/policy.rs:168]

## Sources

- `codex-rs/rollout/src/recorder.rs`
- `codex-rs/rollout/src/policy.rs`
- `codex-rs/rollout/src/state_db.rs`
- `codex-rs/state/src/runtime/threads.rs`
- `codex-rs/state/src/extract.rs`

## 相关

- [State DB](state-db.md)
- [Thread store](thread-store.md)
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.data-model`
