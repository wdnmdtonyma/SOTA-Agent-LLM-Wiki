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
updated: 5670360009
---

> Rollout persistence is the local JSONL replay layer: `RolloutRecorder` owns the writer command queue and path, shared policy decides which `RolloutItem`s are canonical, and `codex-rs/rollout/src/state_db.rs` mirrors rollout metadata into the SQLite state runtime when that runtime is available.[E: codex-rs/rollout/src/recorder.rs:75][E: codex-rs/rollout/src/recorder.rs:98][E: codex-rs/rollout/src/policy.rs:6][E: codex-rs/rollout/src/state_db.rs:27]

## 能回答的问题

- recorder 的 create/resume 参数和 writer command 有哪些？
- 哪些 rollout item 会进入 durable JSONL？
- `persist`、`flush`、`shutdown` 对 lazy materialization 和 pending items 有什么语义？
- thread listing 如何在 filesystem scan、SQLite page、read-repair 之间切换？
- JSONL rollout 如何被 reconcile/apply 到 state DB metadata？

## 职责边界

- `RolloutRecorder` 只持有 command sender、writer task observability 和 rollout path；actual file I/O 由 background writer state 执行。[E: codex-rs/rollout/src/recorder.rs:75][E: codex-rs/rollout/src/recorder.rs:113][E: codex-rs/rollout/src/recorder.rs:1459]
- `RolloutRecorderParams` 只有 `Create` 和 `Resume` 两种形态；create carries thread/session metadata and dynamic tools, resume carries an existing path.[E: codex-rs/rollout/src/recorder.rs:81][E: codex-rs/rollout/src/recorder.rs:82][E: codex-rs/rollout/src/recorder.rs:93][E: codex-rs/rollout/src/recorder.rs:159]
- `RolloutCmd` serializes `AddItems`, `Persist`, `Flush`, and `Shutdown` through the writer task.[E: codex-rs/rollout/src/recorder.rs:98][E: codex-rs/rollout/src/recorder.rs:100][E: codex-rs/rollout/src/recorder.rs:104][E: codex-rs/rollout/src/recorder.rs:107]
- The policy module is the canonical filter for persisted rollout history; `ResponseItem::Other`, `ResponseItem::CompactionTrigger`, and most begin/delta/runtime events are intentionally not durable rollout items.[E: codex-rs/rollout/src/policy.rs:19][E: codex-rs/rollout/src/policy.rs:31][E: codex-rs/rollout/src/policy.rs:47][E: codex-rs/rollout/src/policy.rs:77][E: codex-rs/rollout/src/policy.rs:107]
- The rollout crate does not own SQLite schema details. Its state DB wrapper opens/gets a `codex_state::StateRuntime` handle and delegates list/reconcile/apply work to that runtime.[E: codex-rs/rollout/src/state_db.rs:27][E: codex-rs/rollout/src/state_db.rs:43][E: codex-rs/rollout/src/state_db.rs:217][E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:630]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/rollout/src/recorder.rs` | JSONL recorder, background writer, load/resume helpers, list fallback/repair path.[E: codex-rs/rollout/src/recorder.rs:75][E: codex-rs/rollout/src/recorder.rs:344][E: codex-rs/rollout/src/recorder.rs:867][E: codex-rs/rollout/src/recorder.rs:1459] |
| `codex-rs/rollout/src/policy.rs` | Shared canonical persistence policy for `RolloutItem`, `ResponseItem`, memories, and `EventMsg`.[E: codex-rs/rollout/src/policy.rs:6][E: codex-rs/rollout/src/policy.rs:19][E: codex-rs/rollout/src/policy.rs:54][E: codex-rs/rollout/src/policy.rs:77] |
| `codex-rs/rollout/src/state_db.rs` | Core-facing wrapper for state runtime init/get/list/reconcile/apply/read-repair.[E: codex-rs/rollout/src/state_db.rs:43][E: codex-rs/rollout/src/state_db.rs:217][E: codex-rs/rollout/src/state_db.rs:360][E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:563] |
| `codex-rs/state/src/runtime/threads.rs` | SQLite thread metadata listing and incremental `apply_rollout_items` target.[E: codex-rs/state/src/runtime/threads.rs:399][E: codex-rs/state/src/runtime/threads.rs:870] |
| `codex-rs/state/src/extract.rs` | Per-item projection rules from rollout history into `ThreadMetadata`.[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:34] |

## 控制流：写入

1. Callers queue already-canonical items with `record_canonical_items`; an empty slice is a no-op, otherwise it sends `RolloutCmd::AddItems` to the writer task.[E: codex-rs/rollout/src/recorder.rs:811][E: codex-rs/rollout/src/recorder.rs:815]
2. `persist` and `flush` use oneshot acknowledgements so callers wait for the writer's I/O result, not only for enqueue success.[E: codex-rs/rollout/src/recorder.rs:825][E: codex-rs/rollout/src/recorder.rs:829][E: codex-rs/rollout/src/recorder.rs:846][E: codex-rs/rollout/src/recorder.rs:850]
3. `shutdown` drains pending items before stopping; if draining fails, comments state that the writer remains alive for retry.[E: codex-rs/rollout/src/recorder.rs:943][E: codex-rs/rollout/src/recorder.rs:946]
4. `RolloutWriterState` carries writer/deferred file info/pending items/session meta/path; `flush` and `shutdown` return early only when the writer is still deferred and there are no pending items.[E: codex-rs/rollout/src/recorder.rs:1459][E: codex-rs/rollout/src/recorder.rs:1492][E: codex-rs/rollout/src/recorder.rs:1505][E: codex-rs/rollout/src/recorder.rs:1512]
5. `load_rollout_items` reads JSONL line-by-line, skips blanks, counts parse errors, skips legacy `ghost_snapshot` lines, and treats the first `SessionMeta` as the canonical thread id.[E: codex-rs/rollout/src/recorder.rs:867][E: codex-rs/rollout/src/recorder.rs:876][E: codex-rs/rollout/src/recorder.rs:881][E: codex-rs/rollout/src/recorder.rs:889][E: codex-rs/rollout/src/recorder.rs:898]

## 控制流：list 与 SQLite mirror

1. `list_threads_with_db_fallback` has a `StateDbOnly` repair mode that returns a DB page or an empty default if DB listing is unavailable.[E: codex-rs/rollout/src/recorder.rs:344][E: codex-rs/rollout/src/recorder.rs:368][E: codex-rs/rollout/src/recorder.rs:369]
2. Normal listing scans filesystem first, overfetching where needed, so it can repair stale/missing SQLite rows before returning DB-backed or filesystem-backed pages.[E: codex-rs/rollout/src/recorder.rs:392][E: codex-rs/rollout/src/recorder.rs:395][E: codex-rs/rollout/src/recorder.rs:452]
3. When SQLite is absent, listing records a fallback and returns the filesystem scan page instead of failing.[E: codex-rs/rollout/src/recorder.rs:428][E: codex-rs/rollout/src/recorder.rs:431][E: codex-rs/rollout/src/recorder.rs:436]
4. Filesystem hits are repaired with either full `reconcile_rollout` for search or lightweight `read_repair_rollout_path` otherwise.[E: codex-rs/rollout/src/recorder.rs:455][E: codex-rs/rollout/src/recorder.rs:456][E: codex-rs/rollout/src/recorder.rs:468]
5. If SQLite listing still fails, the recorder records a DB-error fallback and returns the filesystem page.[E: codex-rs/rollout/src/recorder.rs:594][E: codex-rs/rollout/src/recorder.rs:597][E: codex-rs/rollout/src/recorder.rs:598]

## 控制流：state DB 投影

1. `state_db::reconcile_rollout` returns immediately without a runtime handle; with builder/items it delegates to incremental `apply_rollout_items`, otherwise it extracts metadata by scanning the rollout file.[E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:500][E: codex-rs/rollout/src/state_db.rs:503][E: codex-rs/rollout/src/state_db.rs:517]
2. Reconcile preserves existing git/title metadata where appropriate, then upserts the thread and stores memory mode.[E: codex-rs/rollout/src/state_db.rs:531][E: codex-rs/rollout/src/state_db.rs:544][E: codex-rs/rollout/src/state_db.rs:551]
3. Incremental apply requires either an explicit builder or a builder derived from the item batch; missing builder only warns and returns.[E: codex-rs/rollout/src/state_db.rs:630][E: codex-rs/rollout/src/state_db.rs:643][E: codex-rs/rollout/src/state_db.rs:645][E: codex-rs/rollout/src/state_db.rs:648]
4. `codex_state::StateRuntime::apply_rollout_items` reads or builds `ThreadMetadata`, applies each item via `apply_rollout_item`, preserves existing git info, then upserts metadata and memory mode.[E: codex-rs/state/src/runtime/threads.rs:870][E: codex-rs/state/src/runtime/threads.rs:880][E: codex-rs/state/src/runtime/threads.rs:885][E: codex-rs/state/src/runtime/threads.rs:888][E: codex-rs/state/src/runtime/threads.rs:898][E: codex-rs/state/src/runtime/threads.rs:905]

## Gotcha

- `record_canonical_items` does not itself filter raw input; callers that accept raw `RolloutItem`s must use the shared policy before writing durable replay history.[E: codex-rs/rollout/src/recorder.rs:811][E: codex-rs/rollout/src/policy.rs:19][E: codex-rs/rollout/src/policy.rs:22]
- `load_rollout_items` is best-effort for malformed lines: bad JSON and bad rollout-line parse increment `parse_errors` and replay continues.[E: codex-rs/rollout/src/recorder.rs:881][E: codex-rs/rollout/src/recorder.rs:884][E: codex-rs/rollout/src/recorder.rs:907]
- Event persistence is represented by the `should_persist_event_msg` allow/deny function in `policy.rs`; persisted true variants and false variants are both explicit in that match.[E: codex-rs/rollout/src/policy.rs:75][E: codex-rs/rollout/src/policy.rs:77][E: codex-rs/rollout/src/policy.rs:79][E: codex-rs/rollout/src/policy.rs:107]

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
