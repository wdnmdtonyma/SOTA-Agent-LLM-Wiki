---
id: subsys.core.rollout-persistence
title: Rollout persistence 与 JSONL recorder
kind: subsystem
tier: T2
source: [codex-rs/rollout/src/recorder.rs, codex-rs/rollout/src/policy.rs, codex-rs/rollout/src/state_db.rs, codex-rs/rollout/src/lib.rs, codex-rs/history/src/lib.rs, codex-rs/history/src/rollout_payload.rs, codex-rs/state/src/runtime/threads.rs, codex-rs/state/src/extract.rs, codex-rs/app-server/src/request_processors/thread_goal_processor.rs, codex-rs/thread-store/src/local/revert_thread.rs]
symbols: [RolloutRecorder, RolloutRecorderParams, RolloutCmd, RolloutWriterTask, RolloutWriterState, persisted_rollout_items, is_persisted_rollout_item, should_persist_event_msg, load_rollout_items, list_threads_with_db_fallback, StateDbHandle, reconcile_rollout, RolloutItem, ResponseItemEnvelope]
related: [subsys.core.state-db, subsys.core.thread-store, subsys.core.rollout-migration, ref.protocol-op, ref.data-model]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Rollout persistence remains the durable JSONL replay layer。`RolloutItem` / `RolloutLine` / `InitialHistory` 的 payload 模型在 `codex-rs/history`，rollout crate re-export 它们。canonical filtering 仍按 `ThreadHistoryMode`：Legacy 记兼容事件，Paginated 记 completed `TurnItem`。[E: codex-rs/history/src/lib.rs:122][E: codex-rs/rollout/src/lib.rs:36]

## 能回答的问题

- recorder 的 create/resume 参数和 writer command 有哪些？
- 哪些 rollout item 会进入 durable JSONL？
- `persist`、`flush`、`shutdown` 对 lazy materialization 和 pending items 有什么语义？
- thread listing 如何在 filesystem scan、SQLite page、read-repair 之间切换？
- JSONL rollout 如何被 reconcile/apply 到 state DB metadata？
- `RolloutItem` 为什么定义在 history crate？
- `thread/revert` 如何换新 JSONL 而不改 thread id？

## 职责边界

- `RolloutRecorder` 只持有 command sender、writer task observability 和 rollout path；actual file I/O 由 `RolloutWriterState` 执行。[E: codex-rs/rollout/src/recorder.rs:86][E: codex-rs/rollout/src/recorder.rs:87][E: codex-rs/rollout/src/recorder.rs:88][E: codex-rs/rollout/src/recorder.rs:89][E: codex-rs/rollout/src/recorder.rs:1751]
- `RolloutRecorderParams` 只有 `Create` 和 `Resume` 两种形态；create carries thread/session metadata and dynamic tools, resume carries an existing path.[E: codex-rs/rollout/src/recorder.rs:94][E: codex-rs/rollout/src/recorder.rs:95][E: codex-rs/rollout/src/recorder.rs:96][E: codex-rs/rollout/src/recorder.rs:104][E: codex-rs/rollout/src/recorder.rs:112][E: codex-rs/rollout/src/recorder.rs:121][E: codex-rs/rollout/src/recorder.rs:122]
- `RolloutCmd` serializes `AddItems`, `Persist`, `Flush`, and `Shutdown` through the writer task.[E: codex-rs/rollout/src/recorder.rs:126][E: codex-rs/rollout/src/recorder.rs:127][E: codex-rs/rollout/src/recorder.rs:128][E: codex-rs/rollout/src/recorder.rs:132][E: codex-rs/rollout/src/recorder.rs:135]
- Policy is mode-aware: response items and executive markers stay durable in both modes；`ItemCompleted` is generally durable only in Paginated mode（Legacy 特例保留 Plan 与 extension Sleep），legacy user/assistant/reasoning/review/tool-end events 则只在 Legacy durable。[E: codex-rs/rollout/src/policy.rs:95][E: codex-rs/rollout/src/policy.rs:102][E: codex-rs/rollout/src/policy.rs:123]
- The rollout crate does not own SQLite schema details. Its state DB wrapper opens/gets a `codex_state::StateRuntime` handle and delegates list/reconcile/apply work to that runtime.[E: codex-rs/rollout/src/state_db.rs:29]
- `codex_history::RolloutItem` 用 `rollout_payload::RolloutItemWire` 做 tag=`type` 的 JSON；`ResponseItemEnvelope` 允许把 harness metadata 与 raw `ResponseItem` 分开存。[E: codex-rs/history/src/lib.rs:122][E: codex-rs/history/src/lib.rs:145][E: codex-rs/history/src/rollout_payload.rs:23][E: codex-rs/history/src/lib.rs:40]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/rollout/src/recorder.rs` | JSONL recorder, background writer, load/resume helpers, list fallback/repair path.[E: codex-rs/rollout/src/recorder.rs:86][E: codex-rs/rollout/src/recorder.rs:496][E: codex-rs/rollout/src/recorder.rs:1069][E: codex-rs/rollout/src/recorder.rs:1751] |
| `codex-rs/rollout/src/policy.rs` | Shared canonical persistence policy for `RolloutItem`, `ResponseItem`, memories, and `EventMsg`.[E: codex-rs/rollout/src/policy.rs:7][E: codex-rs/rollout/src/policy.rs:43][E: codex-rs/rollout/src/policy.rs:87] |
| `codex-rs/rollout/src/state_db.rs` | Core-facing wrapper for state runtime init/get/list/reconcile/apply/read-repair.[E: codex-rs/rollout/src/state_db.rs:45][E: codex-rs/rollout/src/state_db.rs:208][E: codex-rs/rollout/src/state_db.rs:352][E: codex-rs/rollout/src/state_db.rs:519][E: codex-rs/rollout/src/state_db.rs:664] |
| `codex-rs/state/src/runtime/threads.rs` | SQLite thread metadata listing and incremental `apply_rollout_items` target.[E: codex-rs/state/src/runtime/threads.rs:435][E: codex-rs/state/src/runtime/threads.rs:1042] |
| `codex-rs/state/src/extract.rs` | Per-item projection rules from rollout history into `ThreadMetadata`.[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:39] |

## 控制流：写入

1. `persisted_rollout_items(items, history_mode)` is the shared durable boundary；callers must supply the thread's persisted history mode before queueing canonical items。[E: codex-rs/rollout/src/policy.rs:30][E: codex-rs/rollout/src/policy.rs:34]
2. `persist` and `flush` use oneshot acknowledgements so callers wait for the writer's I/O result, not only for enqueue success.[E: codex-rs/rollout/src/recorder.rs:1031][E: codex-rs/rollout/src/recorder.rs:1032][E: codex-rs/rollout/src/recorder.rs:1034][E: codex-rs/rollout/src/recorder.rs:1052][E: codex-rs/rollout/src/recorder.rs:1053][E: codex-rs/rollout/src/recorder.rs:1055]
3. `shutdown` sends `RolloutCmd::Shutdown` and waits for the writer acknowledgement before returning.[E: codex-rs/rollout/src/recorder.rs:1154][E: codex-rs/rollout/src/recorder.rs:1155][E: codex-rs/rollout/src/recorder.rs:1156]
4. `RolloutWriterState` carries writer/deferred file info/pending items/session meta/path; `flush` and `shutdown` return early only when the writer is still deferred and there are no pending items.[E: codex-rs/rollout/src/recorder.rs:1751][E: codex-rs/rollout/src/recorder.rs:1752][E: codex-rs/rollout/src/recorder.rs:1754][E: codex-rs/rollout/src/recorder.rs:1755][E: codex-rs/rollout/src/recorder.rs:1756][E: codex-rs/rollout/src/recorder.rs:1758][E: codex-rs/rollout/src/recorder.rs:1782][E: codex-rs/rollout/src/recorder.rs:1783]
5. `load_rollout_items` reads JSONL line-by-line, skips blanks, counts parse errors, skips legacy `ghost_snapshot` lines, and treats the first `SessionMeta` as the canonical thread id.[E: codex-rs/rollout/src/recorder.rs:1069][E: codex-rs/rollout/src/recorder.rs:1079][E: codex-rs/rollout/src/recorder.rs:1087][E: codex-rs/rollout/src/recorder.rs:1091][E: codex-rs/rollout/src/recorder.rs:1114][E: codex-rs/rollout/src/recorder.rs:1117]

## 控制流：list 与 SQLite mirror

1. `list_threads_with_db_fallback` has a `StateDbOnly` repair mode that returns a DB page or an empty default if DB listing is unavailable.[E: codex-rs/rollout/src/recorder.rs:496][E: codex-rs/rollout/src/recorder.rs:508][E: codex-rs/rollout/src/recorder.rs:521][E: codex-rs/rollout/src/recorder.rs:489]
2. Normal listing scans filesystem first, overfetching where needed, so it can repair stale/missing SQLite rows before returning DB-backed or filesystem-backed pages.[E: codex-rs/rollout/src/recorder.rs:543][E: codex-rs/rollout/src/recorder.rs:550][E: codex-rs/rollout/src/recorder.rs:694][E: codex-rs/rollout/src/recorder.rs:706]
3. When metadata filters require filesystem fallback, listing records a fallback and returns a filesystem scan page enriched from state DB where possible.[E: codex-rs/rollout/src/recorder.rs:728][E: codex-rs/rollout/src/recorder.rs:733][E: codex-rs/rollout/src/recorder.rs:734]
4. If SQLite listing still fails, the recorder records a DB-error fallback and returns the filesystem page instead of failing the list.[E: codex-rs/rollout/src/recorder.rs:742][E: codex-rs/rollout/src/recorder.rs:744]
5. DB-only listing skips rows whose rollout file is missing but deliberately retains those SQLite rows；它继续从 next anchor 拉取，尽量填满 requested page，而不是因一个 stale path 提前返回短页。[E: codex-rs/rollout/src/state_db.rs:429][E: codex-rs/rollout/src/state_db.rs:432][E: codex-rs/rollout/src/state_db.rs:455][E: codex-rs/rollout/src/state_db.rs:462][E: codex-rs/rollout/src/state_db.rs:468][E: codex-rs/rollout/src/state_db.rs:472][E: codex-rs/rollout/src/state_db.rs:475]

## 控制流：state DB 投影

1. `state_db::reconcile_rollout` returns immediately without a runtime handle; with builder/items it delegates to incremental `apply_rollout_items`, otherwise it extracts metadata by scanning the rollout file.[E: codex-rs/rollout/src/state_db.rs:519][E: codex-rs/rollout/src/state_db.rs:528][E: codex-rs/rollout/src/state_db.rs:531][E: codex-rs/rollout/src/state_db.rs:545]
2. Full-file reconcile treats Paginated metadata updates as SQLite-only: rollout seeds a missing row, while an existing row keeps explicit title、git info and memory mode rather than being overwritten by stale JSONL-derived values。[E: codex-rs/rollout/src/state_db.rs:563][E: codex-rs/rollout/src/state_db.rs:567][E: codex-rs/rollout/src/state_db.rs:571][E: codex-rs/rollout/src/state_db.rs:574][E: codex-rs/rollout/src/state_db.rs:575]
3. Incremental apply requires either an explicit builder or a builder derived from the item batch; missing builder only warns and returns.[E: codex-rs/rollout/src/state_db.rs:679][E: codex-rs/rollout/src/state_db.rs:692][E: codex-rs/rollout/src/state_db.rs:694][E: codex-rs/rollout/src/state_db.rs:701]
4. `codex_state::StateRuntime::apply_rollout_items` reads or builds `ThreadMetadata`, applies each item via `apply_rollout_item`, preserves existing git info, then upserts metadata and memory mode.[E: codex-rs/state/src/runtime/threads.rs:1042][E: codex-rs/state/src/runtime/threads.rs:1053][E: codex-rs/state/src/runtime/threads.rs:1058][E: codex-rs/state/src/runtime/threads.rs:1061][E: codex-rs/state/src/runtime/threads.rs:1070][E: codex-rs/state/src/runtime/threads.rs:1074][E: codex-rs/state/src/runtime/threads.rs:1077]
5. read-repair fast path only changes rollout path/cwd normalization/archive state on an existing row；只有 row missing/unreadable 或 direct upsert failed 才从 rollout 重建 metadata。[E: codex-rs/rollout/src/state_db.rs:610][E: codex-rs/rollout/src/state_db.rs:613][E: codex-rs/rollout/src/state_db.rs:613][E: codex-rs/rollout/src/state_db.rs:618][E: codex-rs/rollout/src/state_db.rs:626][E: codex-rs/rollout/src/state_db.rs:645][E: codex-rs/rollout/src/state_db.rs:650]
6. Thread-goal mutation first verifies that SQLite points to the same plain rollout path, that the file exists, and that `SessionMeta.id` matches；只有这些条件不满足时才 reconcile rollout, preventing needless replacement of SQLite-only metadata。[E: codex-rs/app-server/src/request_processors/thread_goal_processor.rs:375]
7. `thread/revert` 创建带新 `rollout_id` 的 Paginated JSONL，再用 CAS 改 SQLite path；旧文件留下。recorder `Create` params 因此允许 `rollout_id` 与 `conversation_id` 不同。[E: codex-rs/thread-store/src/local/revert_thread.rs:111][E: codex-rs/thread-store/src/local/revert_thread.rs:125]

## Gotcha

- `record_canonical_items` does not itself filter raw input; callers that accept raw `RolloutItem`s must use the shared policy before writing durable replay history.[E: codex-rs/rollout/src/recorder.rs:1013][E: codex-rs/rollout/src/recorder.rs:1018][E: codex-rs/rollout/src/policy.rs:29]
- `load_rollout_items` is best-effort for malformed lines: bad JSON increments `parse_errors` and replay continues.[E: codex-rs/rollout/src/recorder.rs:1083][E: codex-rs/rollout/src/recorder.rs:1087][E: codex-rs/rollout/src/recorder.rs:1088]
- `should_persist_event_msg` 必须与 `history_mode` 一起解读；新 `RawResponseCompleted` 与 environment connect/disconnect 都属于 transient events，不进入 durable rollout。[E: codex-rs/rollout/src/policy.rs:93][E: codex-rs/rollout/src/policy.rs:165][E: codex-rs/rollout/src/policy.rs:169]

## Sources

- `codex-rs/rollout/src/recorder.rs`
- `codex-rs/rollout/src/policy.rs`
- `codex-rs/rollout/src/state_db.rs`
- `codex-rs/rollout/src/lib.rs`
- `codex-rs/history/src/lib.rs`
- `codex-rs/history/src/rollout_payload.rs`
- `codex-rs/thread-store/src/local/revert_thread.rs`
- `codex-rs/state/src/runtime/threads.rs`
- `codex-rs/state/src/extract.rs`
- `codex-rs/app-server/src/request_processors/thread_goal_processor.rs`

## 相关

- [State DB](state-db.md)
- [Thread store](thread-store.md)
- [Rollout migration](rollout-migration.md)
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.data-model`
