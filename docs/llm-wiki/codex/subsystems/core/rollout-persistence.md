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
updated: 4d7a5c7c73
---

> Rollout persistence remains the durable JSONL replay layer, but canonical filtering is now parameterized by `ThreadHistoryMode`: Legacy records selected compatibility events, whereas Paginated records completed canonical `TurnItem`s for history hydration。[E: codex-rs/rollout/src/recorder.rs:84]

## 能回答的问题

- recorder 的 create/resume 参数和 writer command 有哪些？
- 哪些 rollout item 会进入 durable JSONL？
- `persist`、`flush`、`shutdown` 对 lazy materialization 和 pending items 有什么语义？
- thread listing 如何在 filesystem scan、SQLite page、read-repair 之间切换？
- JSONL rollout 如何被 reconcile/apply 到 state DB metadata？

## 职责边界

- `RolloutRecorder` 只持有 command sender、writer task observability 和 rollout path；actual file I/O 由 `RolloutWriterState` 执行。[E: codex-rs/rollout/src/recorder.rs:84][E: codex-rs/rollout/src/recorder.rs:85][E: codex-rs/rollout/src/recorder.rs:86][E: codex-rs/rollout/src/recorder.rs:87][E: codex-rs/rollout/src/recorder.rs:1580]
- `RolloutRecorderParams` 只有 `Create` 和 `Resume` 两种形态；create carries thread/session metadata and dynamic tools, resume carries an existing path.[E: codex-rs/rollout/src/recorder.rs:92][E: codex-rs/rollout/src/recorder.rs:93][E: codex-rs/rollout/src/recorder.rs:95][E: codex-rs/rollout/src/recorder.rs:102][E: codex-rs/rollout/src/recorder.rs:104][E: codex-rs/rollout/src/recorder.rs:109][E: codex-rs/rollout/src/recorder.rs:110]
- `RolloutCmd` serializes `AddItems`, `Persist`, `Flush`, and `Shutdown` through the writer task.[E: codex-rs/rollout/src/recorder.rs:114][E: codex-rs/rollout/src/recorder.rs:115][E: codex-rs/rollout/src/recorder.rs:116][E: codex-rs/rollout/src/recorder.rs:120][E: codex-rs/rollout/src/recorder.rs:123]
- Policy is mode-aware: response items and executive markers stay durable in both modes；`ItemCompleted` is generally durable only in Paginated mode（Legacy 特例保留 Plan 与 extension Sleep），legacy user/assistant/reasoning/review/tool-end events 则只在 Legacy durable。[E: codex-rs/rollout/src/policy.rs:89][E: codex-rs/rollout/src/policy.rs:95][E: codex-rs/rollout/src/policy.rs:119]
- The rollout crate does not own SQLite schema details. Its state DB wrapper opens/gets a `codex_state::StateRuntime` handle and delegates list/reconcile/apply work to that runtime.[E: codex-rs/rollout/src/state_db.rs:27][E: codex-rs/rollout/src/state_db.rs:43][E: codex-rs/rollout/src/state_db.rs:217][E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:630]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/rollout/src/recorder.rs` | JSONL recorder, background writer, load/resume helpers, list fallback/repair path.[E: codex-rs/rollout/src/recorder.rs:84][E: codex-rs/rollout/src/recorder.rs:424][E: codex-rs/rollout/src/recorder.rs:960][E: codex-rs/rollout/src/recorder.rs:1580] |
| `codex-rs/rollout/src/policy.rs` | Shared canonical persistence policy for `RolloutItem`, `ResponseItem`, memories, and `EventMsg`.[E: codex-rs/rollout/src/policy.rs:6][E: codex-rs/rollout/src/policy.rs:39][E: codex-rs/rollout/src/policy.rs:81] |
| `codex-rs/rollout/src/state_db.rs` | Core-facing wrapper for state runtime init/get/list/reconcile/apply/read-repair.[E: codex-rs/rollout/src/state_db.rs:43][E: codex-rs/rollout/src/state_db.rs:217][E: codex-rs/rollout/src/state_db.rs:360][E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:630] |
| `codex-rs/state/src/runtime/threads.rs` | SQLite thread metadata listing and incremental `apply_rollout_items` target.[E: codex-rs/state/src/runtime/threads.rs:402][E: codex-rs/state/src/runtime/threads.rs:906] |
| `codex-rs/state/src/extract.rs` | Per-item projection rules from rollout history into `ThreadMetadata`.[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:36] |

## 控制流：写入

1. `persisted_rollout_items(items, history_mode)` is the shared durable boundary；callers must supply the thread's persisted history mode before queueing canonical items。[E: codex-rs/rollout/src/policy.rs:26][E: codex-rs/rollout/src/policy.rs:30]
2. `persist` and `flush` use oneshot acknowledgements so callers wait for the writer's I/O result, not only for enqueue success.[E: codex-rs/rollout/src/recorder.rs:922][E: codex-rs/rollout/src/recorder.rs:923][E: codex-rs/rollout/src/recorder.rs:925][E: codex-rs/rollout/src/recorder.rs:943][E: codex-rs/rollout/src/recorder.rs:944][E: codex-rs/rollout/src/recorder.rs:946]
3. `shutdown` sends `RolloutCmd::Shutdown` and waits for the writer acknowledgement before returning.[E: codex-rs/rollout/src/recorder.rs:1045][E: codex-rs/rollout/src/recorder.rs:1047][E: codex-rs/rollout/src/recorder.rs:1048]
4. `RolloutWriterState` carries writer/deferred file info/pending items/session meta/path; `flush` and `shutdown` return early only when the writer is still deferred and there are no pending items.[E: codex-rs/rollout/src/recorder.rs:1580][E: codex-rs/rollout/src/recorder.rs:1581][E: codex-rs/rollout/src/recorder.rs:1582][E: codex-rs/rollout/src/recorder.rs:1583][E: codex-rs/rollout/src/recorder.rs:1584][E: codex-rs/rollout/src/recorder.rs:1586][E: codex-rs/rollout/src/recorder.rs:1610][E: codex-rs/rollout/src/recorder.rs:1617]
5. `load_rollout_items` reads JSONL line-by-line, skips blanks, counts parse errors, skips legacy `ghost_snapshot` lines, and treats the first `SessionMeta` as the canonical thread id.[E: codex-rs/rollout/src/recorder.rs:960][E: codex-rs/rollout/src/recorder.rs:969][E: codex-rs/rollout/src/recorder.rs:970][E: codex-rs/rollout/src/recorder.rs:978][E: codex-rs/rollout/src/recorder.rs:982][E: codex-rs/rollout/src/recorder.rs:994][E: codex-rs/rollout/src/recorder.rs:996]

## 控制流：list 与 SQLite mirror

1. `list_threads_with_db_fallback` has a `StateDbOnly` repair mode that returns a DB page or an empty default if DB listing is unavailable.[E: codex-rs/rollout/src/recorder.rs:424][E: codex-rs/rollout/src/recorder.rs:448][E: codex-rs/rollout/src/recorder.rs:449][E: codex-rs/rollout/src/recorder.rs:465]
2. Normal listing scans filesystem first, overfetching where needed, so it can repair stale/missing SQLite rows before returning DB-backed or filesystem-backed pages.[E: codex-rs/rollout/src/recorder.rs:468][E: codex-rs/rollout/src/recorder.rs:475][E: codex-rs/rollout/src/recorder.rs:477][E: codex-rs/rollout/src/recorder.rs:643][E: codex-rs/rollout/src/recorder.rs:659]
3. When metadata filters require filesystem fallback, listing records a fallback and returns a filesystem scan page enriched from state DB where possible.[E: codex-rs/rollout/src/recorder.rs:647][E: codex-rs/rollout/src/recorder.rs:652][E: codex-rs/rollout/src/recorder.rs:653]
4. If SQLite listing still fails, the recorder records a DB-error fallback and returns the filesystem page instead of failing the list.[E: codex-rs/rollout/src/recorder.rs:677][E: codex-rs/rollout/src/recorder.rs:678]

## 控制流：state DB 投影

1. `state_db::reconcile_rollout` returns immediately without a runtime handle; with builder/items it delegates to incremental `apply_rollout_items`, otherwise it extracts metadata by scanning the rollout file.[E: codex-rs/rollout/src/state_db.rs:491][E: codex-rs/rollout/src/state_db.rs:500][E: codex-rs/rollout/src/state_db.rs:503][E: codex-rs/rollout/src/state_db.rs:517]
2. Reconcile preserves existing git/title metadata where appropriate, then upserts the thread and stores memory mode.[E: codex-rs/rollout/src/state_db.rs:531][E: codex-rs/rollout/src/state_db.rs:532][E: codex-rs/rollout/src/state_db.rs:533][E: codex-rs/rollout/src/state_db.rs:544][E: codex-rs/rollout/src/state_db.rs:551]
3. Incremental apply requires either an explicit builder or a builder derived from the item batch; missing builder only warns and returns.[E: codex-rs/rollout/src/state_db.rs:630][E: codex-rs/rollout/src/state_db.rs:643][E: codex-rs/rollout/src/state_db.rs:645][E: codex-rs/rollout/src/state_db.rs:648][E: codex-rs/rollout/src/state_db.rs:653]
4. `codex_state::StateRuntime::apply_rollout_items` reads or builds `ThreadMetadata`, applies each item via `apply_rollout_item`, preserves existing git info, then upserts metadata and memory mode.[E: codex-rs/state/src/runtime/threads.rs:906][E: codex-rs/state/src/runtime/threads.rs:916][E: codex-rs/state/src/runtime/threads.rs:919][E: codex-rs/state/src/runtime/threads.rs:922][E: codex-rs/state/src/runtime/threads.rs:925][E: codex-rs/state/src/runtime/threads.rs:935][E: codex-rs/state/src/runtime/threads.rs:941]

## Gotcha

- `record_canonical_items` does not itself filter raw input; callers that accept raw `RolloutItem`s must use the shared policy before writing durable replay history.[E: codex-rs/rollout/src/recorder.rs:904][E: codex-rs/rollout/src/recorder.rs:909][E: codex-rs/rollout/src/policy.rs:24]
- `load_rollout_items` is best-effort for malformed lines: bad JSON increments `parse_errors` and replay continues.[E: codex-rs/rollout/src/recorder.rs:974][E: codex-rs/rollout/src/recorder.rs:978][E: codex-rs/rollout/src/recorder.rs:979]
- `should_persist_event_msg` 必须与 `history_mode` 一起解读；新 `RawResponseCompleted` 与 environment connect/disconnect 都属于 transient events，不进入 durable rollout。[E: codex-rs/rollout/src/policy.rs:87][E: codex-rs/rollout/src/policy.rs:144][E: codex-rs/rollout/src/policy.rs:148]

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
