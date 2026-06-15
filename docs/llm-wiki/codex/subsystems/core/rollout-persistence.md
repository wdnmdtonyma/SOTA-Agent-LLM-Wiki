---
id: subsys.core.rollout-persistence
title: Rollout persistence 与 JSONL recorder
kind: subsystem
tier: T2
source: [codex-rs/rollout/src/recorder.rs, codex-rs/rollout/src/policy.rs, codex-rs/rollout/src/state_db.rs, codex-rs/state/src/runtime.rs, codex-rs/state/src/runtime/threads.rs, codex-rs/state/src/extract.rs]
symbols: [RolloutRecorder, RolloutRecorderParams, RolloutCmd, RolloutWriterTask, RolloutWriterState, JsonlWriter, sanitize_rollout_item_for_persistence, load_rollout_items, list_threads_with_db_fallback, sync_thread_state_after_write]
related: [subsys.core.state-db, subsys.core.thread-store, ref.protocol-op, ref.data-model]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Rollout persistence 是 Codex 把 session metadata、response items、turn context 和 selected events 写成 JSONL rollout，并同步投影到 SQLite thread state 的后台 writer 状态机。[E: codex-rs/rollout/src/recorder.rs:68][E: codex-rs/rollout/src/recorder.rs:1298]

## 能回答的问题

- 新 session 和 resume session 的 recorder 初始化有什么差异？
- `record_items` 何时过滤 item，Extended mode 如何裁剪 exec output？
- `persist`、`flush`、`shutdown` 对 lazy materialization 和 pending items 有什么语义？
- rollout list 为什么先走 filesystem 再 repair SQLite？
- JSONL rollout 如何同步到 state DB thread metadata？

## 职责边界

- `RolloutRecorder` 拥有 JSONL 写入队列、writer task、rollout path、optional state DB handle 和 event persistence mode。[E: codex-rs/rollout/src/recorder.rs:77][E: codex-rs/rollout/src/recorder.rs:82]
- writer task 只在收到 command 后写文件；新 session 可以 deferred materialization，resume session 立即 append 打开已有文件。[E: codex-rs/rollout/src/recorder.rs:459][E: codex-rs/rollout/src/recorder.rs:464]
- `codex-rs/rollout/src/state_db.rs` 是 rollout crate 到 `codex_state::StateRuntime` 的 wrapper，负责 feature/backfill gate、fallback、warn 而不是 schema migration 本身。[E: codex-rs/rollout/src/state_db.rs:22][E: codex-rs/rollout/src/state_db.rs:25]
- `codex-rs/state/src/runtime/threads.rs` 是 thread metadata 的 SQLite runtime；rollout writer 通过 rollout crate 的 state DB wrapper 调用它。[E: codex-rs/rollout/src/state_db.rs:477][E: codex-rs/state/src/runtime/threads.rs:805]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/rollout/src/recorder.rs` | JSONL recorder、writer task、list/resume helpers、state DB sync。[E: codex-rs/rollout/src/recorder.rs:77][E: codex-rs/rollout/src/recorder.rs:668][E: codex-rs/rollout/src/recorder.rs:1391] |
| `codex-rs/rollout/src/state_db.rs` | `StateDbHandle` alias、state DB init/get/list/reconcile/apply helpers。[E: codex-rs/rollout/src/state_db.rs:22][E: codex-rs/rollout/src/state_db.rs:26][E: codex-rs/rollout/src/state_db.rs:185][E: codex-rs/rollout/src/state_db.rs:477] |
| `codex-rs/state/src/runtime/threads.rs` | SQLite thread metadata upsert/list/apply/archive/unarchive。[E: codex-rs/state/src/runtime/threads.rs:386][E: codex-rs/state/src/runtime/threads.rs:457][E: codex-rs/state/src/runtime/threads.rs:805] |
| `codex-rs/state/src/extract.rs` | rollout item 到 thread metadata 的字段投影规则。[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:32] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `RolloutRecorderParams` | `Create` 或 `Resume` | Create 带 conversation id、fork source、source、base instructions、dynamic tools、event persistence mode；Resume 带 path 和 persistence mode。[E: codex-rs/rollout/src/recorder.rs:86][E: codex-rs/rollout/src/recorder.rs:96] |
| `RolloutCmd` | `AddItems`、`Persist`、`Flush`、`Shutdown` | writer task 通过 bounded channel 串行处理写入、barrier 和关闭。[E: codex-rs/rollout/src/recorder.rs:102][E: codex-rs/rollout/src/recorder.rs:107][E: codex-rs/rollout/src/recorder.rs:1324] |
| `RolloutWriterTask` | `handle`、`terminal_failure` | recorder clone 共享 task observability；terminal failure 会被 future API call 返回。[E: codex-rs/rollout/src/recorder.rs:116][E: codex-rs/rollout/src/recorder.rs:141][E: codex-rs/rollout/src/recorder.rs:150] |
| `RolloutWriterState` | writer、deferred info、pending items、meta、state DB context/builder | pending items 只有成功写入后才 drain；失败会丢 writer handle 保留 unwritten suffix。[E: codex-rs/rollout/src/recorder.rs:1092][E: codex-rs/rollout/src/recorder.rs:1094][E: codex-rs/rollout/src/recorder.rs:1097] |
| `RolloutLineRef` | `timestamp` + flatten `RolloutItem` | 每行 JSONL 写入 UTC timestamp 和 rollout item。[E: codex-rs/rollout/src/recorder.rs:1461][E: codex-rs/rollout/src/recorder.rs:1477] |

## 控制流：写入与恢复

1. `RolloutRecorder::new(Create)` 预计算 `~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<thread>.jsonl` 路径，构造 `SessionMeta`，但 file 为 None，因此文件创建延迟到 persist/flush。[E: codex-rs/rollout/src/recorder.rs:471][E: codex-rs/rollout/src/recorder.rs:481][E: codex-rs/rollout/src/recorder.rs:516]
2. `RolloutRecorder::new(Resume)` 立即以 append 打开传入 path；meta 为 None，表示不会重写 session meta。[E: codex-rs/rollout/src/recorder.rs:524][E: codex-rs/rollout/src/recorder.rs:528][E: codex-rs/rollout/src/recorder.rs:536]
3. recorder 创建 bounded channel 256，并 spawn `rollout_writer`；writer 负责 async file I/O，避免 caller 线程做 blocking I/O。[E: codex-rs/rollout/src/recorder.rs:544][E: codex-rs/rollout/src/recorder.rs:547][E: codex-rs/rollout/src/recorder.rs:557]
4. `record_items` 逐个过滤 `is_persisted_response_item`；Extended mode 下 `ExecCommandEnd.aggregated_output` 会被截到 10,000 bytes，stdout/stderr/formatted_output 清空。[E: codex-rs/rollout/src/recorder.rs:600][E: codex-rs/rollout/src/recorder.rs:606][E: codex-rs/rollout/src/recorder.rs:190][E: codex-rs/rollout/src/recorder.rs:201][E: codex-rs/rollout/src/recorder.rs:208]
5. `Persist`、`Flush`、`Shutdown` 都通过 oneshot ack 建立 barrier；API future 等待 writer 返回 I/O result。[E: codex-rs/rollout/src/recorder.rs:630][E: codex-rs/rollout/src/recorder.rs:651][E: codex-rs/rollout/src/recorder.rs:753]
6. writer 收到 `AddItems` 时先 append 到 pending；如果 writer 已经 materialized 才自动 flush，否则等待 persist/flush/shutdown。[E: codex-rs/rollout/src/recorder.rs:1326][E: codex-rs/rollout/src/recorder.rs:1327][E: codex-rs/rollout/src/recorder.rs:1328][E: codex-rs/rollout/src/recorder.rs:1330][E: codex-rs/rollout/src/recorder.rs:1333][E: codex-rs/rollout/src/recorder.rs:1336]
7. `write_pending_with_recovery` 首次写失败会进入 recovery mode、drop writer 并 retry；第二次仍失败才返回错误，pending items 不会提前丢弃。[E: codex-rs/rollout/src/recorder.rs:1173][E: codex-rs/rollout/src/recorder.rs:1180][E: codex-rs/rollout/src/recorder.rs:1187]
8. `write_pending_once` 确保 writer open、必要时写 session meta、写 pending items，然后 flush file。[E: codex-rs/rollout/src/recorder.rs:1253][E: codex-rs/rollout/src/recorder.rs:1255][E: codex-rs/rollout/src/recorder.rs:1259]
9. `write_pending_items_once` 每成功写一个 item 计数；成功的前缀 drain 后调用 `sync_thread_state_after_write`，失败的 suffix 留在 pending。[E: codex-rs/rollout/src/recorder.rs:1270][E: codex-rs/rollout/src/recorder.rs:1281][E: codex-rs/rollout/src/recorder.rs:1283]
10. `load_rollout_items` 逐行解析 JSONL，空行跳过，解析失败只累加 `parse_errors` 并继续；第一个 `SessionMeta` 的 id 被作为 canonical thread id。[E: codex-rs/rollout/src/recorder.rs:668][E: codex-rs/rollout/src/recorder.rs:680][E: codex-rs/rollout/src/recorder.rs:686][E: codex-rs/rollout/src/recorder.rs:696][E: codex-rs/rollout/src/recorder.rs:699]
11. `get_rollout_history` 要求 load 后能得到 thread id；成功返回 `InitialHistory::Resumed`，携带 conversation id、history 和 rollout path。[E: codex-rs/rollout/src/recorder.rs:733][E: codex-rs/rollout/src/recorder.rs:735][E: codex-rs/rollout/src/recorder.rs:743]

## 控制流：list 与 state DB fallback

1. `list_threads_with_db_fallback` 先尝试获取 state DB context；search term 查询优先走 SQLite，因为搜索是 SQLite optimized path。[E: codex-rs/rollout/src/recorder.rs:274][E: codex-rs/rollout/src/recorder.rs:287][E: codex-rs/rollout/src/recorder.rs:290]
2. 非 search 或 DB 不满足时，filesystem-first listing overfetches，随后对每个 filesystem hit 调 `read_repair_rollout_path` 修复 SQLite stale/missing path。[E: codex-rs/rollout/src/recorder.rs:313][E: codex-rs/rollout/src/recorder.rs:356][E: codex-rs/rollout/src/recorder.rs:358]
3. DB 可用且 repair 后 query 成功时返回 DB page；DB 仍失败时返回 filesystem page，而不是让 list 失败。[E: codex-rs/rollout/src/recorder.rs:367][E: codex-rs/rollout/src/recorder.rs:381][E: codex-rs/rollout/src/recorder.rs:383]
4. `find_latest_thread_path` 优先分页扫描 DB page 并按 cwd filter 选 resume path；DB 失败或耗尽后回退 filesystem `get_threads`。[E: codex-rs/rollout/src/recorder.rs:394][E: codex-rs/rollout/src/recorder.rs:406][E: codex-rs/rollout/src/recorder.rs:437]

## 控制流：同步 SQLite

1. `write_session_meta` 收集 git info，构造 `SessionMetaLine`，如果有 state DB context 就从 session meta 初始化 `ThreadMetadataBuilder`。[E: codex-rs/rollout/src/recorder.rs:1352][E: codex-rs/rollout/src/recorder.rs:1362][E: codex-rs/rollout/src/recorder.rs:1367][E: codex-rs/rollout/src/recorder.rs:1371]
2. session meta 写入 JSONL 后立即调用 `sync_thread_state_after_write`，并在 memories 关闭时写入 `memory_mode: disabled`。[E: codex-rs/rollout/src/recorder.rs:1375][E: codex-rs/rollout/src/recorder.rs:1379][E: codex-rs/rollout/src/recorder.rs:1385]
3. `sync_thread_state_after_write` 如果 item 会影响 thread metadata 或 memory mode，就调用 `state_db::apply_rollout_items`；否则先尝试只 touch updated_at，失败再做 full apply。[E: codex-rs/rollout/src/recorder.rs:1399][E: codex-rs/rollout/src/recorder.rs:1400][E: codex-rs/rollout/src/recorder.rs:1403][E: codex-rs/rollout/src/recorder.rs:1405][E: codex-rs/rollout/src/recorder.rs:1422][E: codex-rs/rollout/src/recorder.rs:1427]
4. rollout wrapper `apply_rollout_items` 会使用给定 builder，或从 items 里推导 builder；缺 builder 时 warn 并返回。[E: codex-rs/rollout/src/state_db.rs:477][E: codex-rs/rollout/src/state_db.rs:492][E: codex-rs/rollout/src/state_db.rs:494][E: codex-rs/rollout/src/state_db.rs:497]
5. `StateRuntime::apply_rollout_items` 读取现有 metadata 或从 builder 构造，逐个 item 应用 `apply_rollout_item`，保留已有 Git info，再 upsert thread、memory mode 和 dynamic tools。[E: codex-rs/state/src/runtime/threads.rs:805][E: codex-rs/state/src/runtime/threads.rs:816][E: codex-rs/state/src/runtime/threads.rs:821][E: codex-rs/state/src/runtime/threads.rs:824][E: codex-rs/state/src/runtime/threads.rs:836][E: codex-rs/state/src/runtime/threads.rs:843][E: codex-rs/state/src/runtime/threads.rs:850]

## 设计动机与权衡

- lazy materialization 让空 session 不必马上创建 rollout file；`persist` 是显式 barrier，用于需要保证文件存在或 durable 的路径。[E: codex-rs/rollout/src/recorder.rs:459][E: codex-rs/rollout/src/recorder.rs:626][I]
- writer task 使用 pending queue 和 retry，而不是同步失败即丢 item；这提升了短暂 I/O 错误下的可恢复性。[E: codex-rs/rollout/src/recorder.rs:1094][E: codex-rs/rollout/src/recorder.rs:1179][I]
- list path “filesystem-first repair then DB page” 是迁移期设计：保留旧 JSONL 为 source of truth，同时让 SQLite 成为搜索和分页加速层。[E: codex-rs/rollout/src/recorder.rs:313][E: codex-rs/rollout/src/recorder.rs:356][E: codex-rs/rollout/src/recorder.rs:367][I]

## Gotcha

- `record_items` 只 queue 已通过 `is_persisted_response_item` 的 item；policy 中 `event_msg_persistence_mode` 对部分 runtime event 返回 `None`，所以不是所有 runtime event 都会进入 rollout。[E: codex-rs/rollout/src/recorder.rs:606][E: codex-rs/rollout/src/policy.rs:14][E: codex-rs/rollout/src/policy.rs:91][E: codex-rs/rollout/src/policy.rs:92][E: codex-rs/rollout/src/policy.rs:117][E: codex-rs/rollout/src/policy.rs:134]
- Extended persistence 会保留 bounded `aggregated_output`，但会清空 raw stdout/stderr/formatted_output；debug 消费者不能指望 rollout JSONL 保存完整命令输出。[E: codex-rs/rollout/src/recorder.rs:203][E: codex-rs/rollout/src/recorder.rs:208]
- `load_rollout_items` 遇到坏行会跳过并累加 parse_errors，因此恢复 history 可能是 best-effort 而不是全文件全有或全无。[E: codex-rs/rollout/src/recorder.rs:686][E: codex-rs/rollout/src/recorder.rs:718]

## Sources

- `codex-rs/rollout/src/recorder.rs`
- `codex-rs/rollout/src/policy.rs`
- `codex-rs/rollout/src/state_db.rs`
- `codex-rs/state/src/runtime.rs`
- `codex-rs/state/src/runtime/threads.rs`
- `codex-rs/state/src/extract.rs`

## 相关

- [State DB](state-db.md)
- [Thread store](thread-store.md)
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.data-model`
