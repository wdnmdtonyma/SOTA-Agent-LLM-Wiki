---
id: subsys.core.state-db
title: State DB runtime
kind: subsystem
tier: T2
source: [codex-rs/state/src/runtime.rs, codex-rs/state/src/runtime/threads.rs, codex-rs/state/src/runtime/backfill.rs, codex-rs/state/src/runtime/logs.rs, codex-rs/state/src/runtime/agent_jobs.rs, codex-rs/state/src/extract.rs, codex-rs/state/src/model/thread_metadata.rs, codex-rs/state/src/model/graph.rs, codex-rs/state/src/lib.rs, codex-rs/rollout/src/state_db.rs]
symbols: [StateRuntime, ThreadMetadata, ThreadMetadataBuilder, ThreadsPage, apply_rollout_item, rollout_item_affects_thread_metadata, BackfillState, DirectionalThreadSpawnEdgeStatus, init, get_state_db]
related: [subsys.core.rollout-persistence, subsys.core.thread-store, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> State DB runtime 是 Codex 的 SQLite-backed 本地状态层：它从 rollout JSONL mirror thread metadata、spawn edges 和 dynamic tools，也用独立写入路径保存 runtime logs 与 agent jobs；rollout wrapper 还能把 rollout file reconcile 回 SQLite mirror。[E: codex-rs/state/src/lib.rs:1][E: codex-rs/state/src/lib.rs:3][E: codex-rs/state/src/runtime/logs.rs:10][E: codex-rs/state/src/runtime/logs.rs:16][E: codex-rs/state/src/runtime/agent_jobs.rs:5][E: codex-rs/state/src/runtime/agent_jobs.rs:22][E: codex-rs/rollout/src/state_db.rs:325][I]

## 能回答的问题

- `StateRuntime::init` 会创建哪些 SQLite 文件，如何迁移和清理旧版本？
- rollout item 哪些会影响 thread metadata？
- thread list/search/filter 如何在 SQLite 中执行？
- backfill 状态如何 claim、checkpoint、complete？
- logs DB 为什么独立，retention 怎么做？

## 职责边界

- `codex-rs/state` crate 聚焦 SQLite-backed rollout metadata；注释说明 backfill orchestration 和 rollout scanning 在 `codex-core`/rollout 层。[E: codex-rs/state/src/lib.rs:1][E: codex-rs/state/src/lib.rs:3]
- `StateRuntime` 拥有 state DB pool、logs DB pool、codex_home、default_provider 和 thread updated-at high-water mark。[E: codex-rs/state/src/runtime.rs:77][E: codex-rs/state/src/runtime.rs:81][E: codex-rs/state/src/runtime.rs:83]
- `codex-rs/rollout/src/state_db.rs` 是 core-facing wrapper；它负责 init/get/list/reconcile 时的 backfill gate、filesystem stale path 过滤和 warn。[E: codex-rs/rollout/src/state_db.rs:53][E: codex-rs/rollout/src/state_db.rs:75][E: codex-rs/rollout/src/state_db.rs:97][E: codex-rs/rollout/src/state_db.rs:240][E: codex-rs/rollout/src/state_db.rs:246][E: codex-rs/rollout/src/state_db.rs:325]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/state/src/runtime.rs` | 初始化 SQLite pools、迁移、legacy DB 清理、路径函数。[E: codex-rs/state/src/runtime.rs:92][E: codex-rs/state/src/runtime.rs:155][E: codex-rs/state/src/runtime.rs:221] |
| `codex-rs/state/src/runtime/threads.rs` | thread metadata CRUD、spawn edge、list filters、dynamic tools、archive/unarchive。[E: codex-rs/state/src/runtime/threads.rs:7][E: codex-rs/state/src/runtime/threads.rs:86][E: codex-rs/state/src/runtime/threads.rs:386][E: codex-rs/state/src/runtime/threads.rs:861] |
| `codex-rs/state/src/extract.rs` | rollout item 到 `ThreadMetadata` 的字段投影。[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:45] |
| `codex-rs/state/src/runtime/backfill.rs` | backfill state row、lease claim、checkpoint、complete。[E: codex-rs/state/src/runtime/backfill.rs:4][E: codex-rs/state/src/runtime/backfill.rs:23][E: codex-rs/state/src/runtime/backfill.rs:64] |
| `codex-rs/state/src/runtime/logs.rs` | logs insert/query/retention，使用单独 logs DB pool。[E: codex-rs/state/src/runtime/logs.rs:6][E: codex-rs/state/src/runtime/logs.rs:49][E: codex-rs/state/src/runtime/logs.rs:296] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| DB filenames | `state_5.sqlite`、`logs_2.sqlite` | base names 和版本常量分别是 `state`/5、`logs`/2，filename helper 组装 `<base>_<version>.sqlite`。[E: codex-rs/state/src/lib.rs:60][E: codex-rs/state/src/lib.rs:61][E: codex-rs/state/src/lib.rs:62][E: codex-rs/state/src/lib.rs:63][E: codex-rs/state/src/runtime.rs:201][E: codex-rs/state/src/runtime.rs:205][E: codex-rs/state/src/runtime.rs:213] |
| `StateRuntime` | `codex_home`、`default_provider`、`pool`、`logs_pool`、`thread_updated_at_millis` | state 和 logs 使用两个 pool，logs 单独文件用于降低锁竞争。[E: codex-rs/state/src/runtime.rs:79][E: codex-rs/state/src/runtime.rs:80][E: codex-rs/state/src/runtime.rs:81][E: codex-rs/state/src/runtime.rs:82][E: codex-rs/state/src/runtime.rs:83][E: codex-rs/state/src/runtime.rs:90][E: codex-rs/state/src/runtime.rs:91] |
| `ThreadMetadata` | id、rollout_path、created/updated、source、agent fields、model provider/model/effort、cwd、title、sandbox/approval、tokens、first user message、archive/git fields | SQLite thread row 的 canonical Rust model。[E: codex-rs/state/src/model/thread_metadata.rs:58][E: codex-rs/state/src/model/thread_metadata.rs:60][E: codex-rs/state/src/model/thread_metadata.rs:77][E: codex-rs/state/src/model/thread_metadata.rs:87][E: codex-rs/state/src/model/thread_metadata.rs:97] |
| `ThreadMetadataBuilder` | id、rollout_path、created_at、source、defaults | builder 的默认 sandbox 是 read-only，approval 是 OnRequest，model provider 缺失时用 default provider。[E: codex-rs/state/src/model/thread_metadata.rs:107][E: codex-rs/state/src/model/thread_metadata.rs:146][E: codex-rs/state/src/model/thread_metadata.rs:166][E: codex-rs/state/src/model/thread_metadata.rs:167][E: codex-rs/state/src/model/thread_metadata.rs:197] |
| `DirectionalThreadSpawnEdgeStatus` | `Open`、`Closed` | spawned thread edge 的方向性生命周期状态。[E: codex-rs/state/src/model/graph.rs:5][E: codex-rs/state/src/model/graph.rs:8][E: codex-rs/state/src/model/graph.rs:9][E: codex-rs/state/src/model/graph.rs:10] |
| `ThreadsPage` | `items`、`next_anchor`、`num_scanned_rows` | SQLite listing 使用 keyset anchor；rollout wrapper 把 legacy cursor 转成 state DB anchor。[E: codex-rs/state/src/model/thread_metadata.rs:38][E: codex-rs/state/src/model/thread_metadata.rs:40][E: codex-rs/state/src/model/thread_metadata.rs:42][E: codex-rs/state/src/model/thread_metadata.rs:44][E: codex-rs/rollout/src/state_db.rs:117] |

## 控制流：初始化

1. `StateRuntime::init` 创建 codex_home，构造 state/logs migrators，删除 legacy DB files，然后分别打开 state DB 和 logs DB。[E: codex-rs/state/src/runtime.rs:92][E: codex-rs/state/src/runtime.rs:93][E: codex-rs/state/src/runtime.rs:94][E: codex-rs/state/src/runtime.rs:98][E: codex-rs/state/src/runtime.rs:112]
2. `base_sqlite_options` 对两个 DB 都设置 create-if-missing、WAL journal、Normal synchronous、5 秒 busy timeout，并关闭 statement log。[E: codex-rs/state/src/runtime.rs:155][E: codex-rs/state/src/runtime.rs:158][E: codex-rs/state/src/runtime.rs:159][E: codex-rs/state/src/runtime.rs:160][E: codex-rs/state/src/runtime.rs:161][E: codex-rs/state/src/runtime.rs:162]
3. state DB pool 最大连接数 5，运行 migration，并在 auto_vacuum 不是 incremental 时尝试设置 incremental + VACUUM；初始化后还 best-effort 执行 incremental_vacuum。[E: codex-rs/state/src/runtime.rs:165][E: codex-rs/state/src/runtime.rs:168][E: codex-rs/state/src/runtime.rs:171][E: codex-rs/state/src/runtime.rs:175][E: codex-rs/state/src/runtime.rs:185]
4. logs DB 也使用 incremental auto_vacuum 和 max connections 5，并运行 logs migrator。[E: codex-rs/state/src/runtime.rs:191][E: codex-rs/state/src/runtime.rs:193][E: codex-rs/state/src/runtime.rs:197]
5. init 会读取 `MAX(threads.updated_at_ms)` 初始化 process-local high-water mark，然后运行 logs startup maintenance。[E: codex-rs/state/src/runtime.rs:128][E: codex-rs/state/src/runtime.rs:138][E: codex-rs/state/src/runtime.rs:140]
6. legacy cleanup 会删除同 base name 的 unversioned 或非当前数字版本 sqlite 及 sidecars，但保留当前版本和不匹配文件名；源码只按当前文件名与数字后缀判断，不比较版本大小。[E: codex-rs/state/src/runtime.rs:221][E: codex-rs/state/src/runtime.rs:278][E: codex-rs/state/src/runtime.rs:286][E: codex-rs/state/src/runtime.rs:290][E: codex-rs/state/src/runtime.rs:294][E: codex-rs/state/src/runtime.rs:301]

## 控制流：rollout item 投影

1. `rollout_item_affects_thread_metadata` 只把 `SessionMeta`、`TurnContext`、`TokenCount`、`UserMessage`、`ThreadNameUpdated` 标为会影响 metadata；其他 event/response/compacted 不影响。[E: codex-rs/state/src/extract.rs:32][E: codex-rs/state/src/extract.rs:35][E: codex-rs/state/src/extract.rs:36][E: codex-rs/state/src/extract.rs:39]
2. `apply_rollout_item` 按 item 类型分发到 session meta、turn context、event msg、response item；response item 当前不修改 metadata。[E: codex-rs/state/src/extract.rs:15][E: codex-rs/state/src/extract.rs:20][E: codex-rs/state/src/extract.rs:111]
3. session meta 只在 id 匹配 canonical thread id 时应用；它更新 source、agent nickname/role/path、model provider、cli version、cwd、git fields。[E: codex-rs/state/src/extract.rs:45][E: codex-rs/state/src/extract.rs:46][E: codex-rs/state/src/extract.rs:52][E: codex-rs/state/src/extract.rs:56][E: codex-rs/state/src/extract.rs:65]
4. turn context 设置 latest model/reasoning effort/sandbox policy/approval mode；cwd 只在 metadata cwd 为空时从 turn context 回填。[E: codex-rs/state/src/extract.rs:72][E: codex-rs/state/src/extract.rs:73][E: codex-rs/state/src/extract.rs:76][E: codex-rs/state/src/extract.rs:78]
5. `EventMsg::UserMessage` 首次设置 first_user_message，并在 title 为空时设置 title；image-only user message 使用 `[Image]` placeholder。[E: codex-rs/state/src/extract.rs:89][E: codex-rs/state/src/extract.rs:90][E: codex-rs/state/src/extract.rs:93][E: codex-rs/state/src/extract.rs:120][E: codex-rs/state/src/extract.rs:131]
6. `ThreadNameUpdated` 会用非空 trimmed thread name 覆盖 title；`TokenCount` 写入 total token usage。[E: codex-rs/state/src/extract.rs:84][E: codex-rs/state/src/extract.rs:86][E: codex-rs/state/src/extract.rs:100][E: codex-rs/state/src/extract.rs:104]
7. `StateRuntime::apply_rollout_items` 读取已有 row 或 builder default，逐项 apply，保留 existing non-null Git info，更新 updated_at，然后 upsert thread、memory mode、dynamic tools。[E: codex-rs/state/src/runtime/threads.rs:816][E: codex-rs/state/src/runtime/threads.rs:821][E: codex-rs/state/src/runtime/threads.rs:824][E: codex-rs/state/src/runtime/threads.rs:827][E: codex-rs/state/src/runtime/threads.rs:836][E: codex-rs/state/src/runtime/threads.rs:843][E: codex-rs/state/src/runtime/threads.rs:850]

## 控制流：query/list/backfill/logs

1. `StateRuntime::list_threads` 构造 SELECT、filters、order/limit，取 `page_size + 1` rows；extra row 只用于判断是否有下一页，`next_anchor` 来自 pop extra row 后保留下来的最后一个 item。[E: codex-rs/state/src/runtime/threads.rs:386][E: codex-rs/state/src/runtime/threads.rs:392][E: codex-rs/state/src/runtime/threads.rs:399][E: codex-rs/state/src/runtime/threads.rs:400][E: codex-rs/state/src/runtime/threads.rs:402][E: codex-rs/state/src/runtime/threads.rs:408][E: codex-rs/state/src/runtime/threads.rs:409][E: codex-rs/state/src/runtime/threads.rs:411]
2. filters 总是按 archived flag 过滤，并排除 `first_user_message == ''`；allowed_sources、model_providers、search_term 和 anchor 追加条件。[E: codex-rs/state/src/runtime/threads.rs:1011][E: codex-rs/state/src/runtime/threads.rs:1025][E: codex-rs/state/src/runtime/threads.rs:1030][E: codex-rs/state/src/runtime/threads.rs:1031][E: codex-rs/state/src/runtime/threads.rs:1049][E: codex-rs/state/src/runtime/threads.rs:1054]
3. `allocate_thread_updated_at` 用 process-local high-water mark 保证 hot writes 在同一秒 bucket 内获得唯一毫秒 updated_at；老的 backfill/repair timestamps 可以保留历史时间。[E: codex-rs/state/src/runtime/threads.rs:581][E: codex-rs/state/src/runtime/threads.rs:595][E: codex-rs/state/src/runtime/threads.rs:607][E: codex-rs/state/src/runtime/threads.rs:613]
4. backfill claim 通过单行 `backfill_state` lease 更新实现；complete 状态阻止新的 claim，running 状态只有过期后才能被抢占。[E: codex-rs/state/src/runtime/backfill.rs:18][E: codex-rs/state/src/runtime/backfill.rs:23][E: codex-rs/state/src/runtime/backfill.rs:27][E: codex-rs/state/src/runtime/backfill.rs:32][E: codex-rs/state/src/runtime/backfill.rs:33][E: codex-rs/state/src/runtime/backfill.rs:38]
5. `checkpoint_backfill` 写 running + last_watermark；`mark_backfill_complete` 写 complete、last_success_at、updated_at。[E: codex-rs/state/src/runtime/backfill.rs:64][E: codex-rs/state/src/runtime/backfill.rs:69][E: codex-rs/state/src/runtime/backfill.rs:73][E: codex-rs/state/src/runtime/backfill.rs:89][E: codex-rs/state/src/runtime/backfill.rs:90][E: codex-rs/state/src/runtime/backfill.rs:91][E: codex-rs/state/src/runtime/backfill.rs:92][E: codex-rs/state/src/runtime/backfill.rs:96]
6. logs 插入在 `logs_pool` 事务中执行，并在同一事务内按 thread/process/null-process partitions 执行 retention prune。[E: codex-rs/state/src/runtime/logs.rs:10][E: codex-rs/state/src/runtime/logs.rs:16][E: codex-rs/state/src/runtime/logs.rs:44][E: codex-rs/state/src/runtime/logs.rs:49]
7. logs startup maintenance 删除 10 天前的 logs，并执行 WAL checkpoint truncate 与 incremental vacuum。[E: codex-rs/state/src/runtime/logs.rs:3][E: codex-rs/state/src/runtime/logs.rs:296][E: codex-rs/state/src/runtime/logs.rs:302][E: codex-rs/state/src/runtime/logs.rs:303]
8. agent job state 也在 state DB 中：`create_agent_job` 在一个 transaction 中插入 `agent_jobs` 和 `agent_job_items`。[E: codex-rs/state/src/runtime/agent_jobs.rs:5][E: codex-rs/state/src/runtime/agent_jobs.rs:22][E: codex-rs/state/src/runtime/agent_jobs.rs:59]

## 设计动机与权衡

- state/logs 分库降低 logs 写入与 thread metadata 查询之间的锁竞争，这是 init 注释直接说明的设计动机。[E: codex-rs/state/src/runtime.rs:87][E: codex-rs/state/src/runtime.rs:89]
- rollout wrapper 的 `get_state_db` 要求 SQLite 文件存在且 backfill complete；这使 SQLite list/search 在迁移完成前不会被当成 authoritative fast path。[E: codex-rs/rollout/src/state_db.rs:63][E: codex-rs/rollout/src/state_db.rs:65][E: codex-rs/rollout/src/state_db.rs:93][E: codex-rs/rollout/src/state_db.rs:98][I]
- `read_repair_rollout_path` 允许 filesystem fallback 成功后修复 stale/missing DB row，体现 JSONL rollout 在迁移期仍可修复 SQLite mirror。[E: codex-rs/rollout/src/state_db.rs:411][E: codex-rs/rollout/src/state_db.rs:422][E: codex-rs/rollout/src/state_db.rs:455][I]

## Gotcha

- SQLite thread list 会过滤 `threads.first_user_message <> ''`；空 first user message 的 thread 不会出现在普通 DB list page 中。[E: codex-rs/state/src/runtime/threads.rs:1030]
- session meta id mismatch 会被 `apply_session_meta_from_item` 忽略；forked rollout 中嵌入的 source session metadata 不会覆盖 canonical child metadata。[E: codex-rs/state/src/extract.rs:46][E: codex-rs/state/src/extract.rs:49]
- `prefer_existing_git_info` 会保留已有 non-null Git fields，所以 rollout reconcile 不一定覆盖 DB 中已有 Git metadata。[E: codex-rs/state/src/model/thread_metadata.rs:218][E: codex-rs/state/src/model/thread_metadata.rs:221]

## Sources

- `codex-rs/state/src/runtime.rs`
- `codex-rs/state/src/runtime/threads.rs`
- `codex-rs/state/src/runtime/backfill.rs`
- `codex-rs/state/src/runtime/logs.rs`
- `codex-rs/state/src/runtime/agent_jobs.rs`
- `codex-rs/state/src/extract.rs`
- `codex-rs/state/src/model/thread_metadata.rs`
- `codex-rs/state/src/model/graph.rs`
- `codex-rs/state/src/lib.rs`
- `codex-rs/rollout/src/state_db.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- [Thread store](thread-store.md)
- 索引 id：`subsys.core.session-lifecycle`
