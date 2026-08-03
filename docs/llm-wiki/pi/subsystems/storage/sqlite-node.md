---
id: subsys.storage.sqlite-node
title: Node SQLite 会话存储
kind: subsystem
tier: T2
pkg: storage
source:
  - packages/storage/sqlite-node/package.json
  - packages/storage/sqlite-node/src/index.ts
  - packages/storage/sqlite-node/src/sqlite/index.ts
  - packages/storage/sqlite-node/src/sqlite/repo.ts
  - packages/storage/sqlite-node/src/sqlite/search-backend.ts
  - packages/storage/sqlite-node/src/sqlite/migrations.ts
  - packages/storage/sqlite-node/src/sqlite/migrations/002_branch_tips.sql
  - packages/storage/sqlite-node/src/sqlite/storage/index.ts
  - packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts
  - packages/storage/sqlite-node/src/sqlite/types.ts
  - packages/agent/test/harness/sqlite-node.test.ts
  - packages/agent/test/harness/sqlite-migrations.test.ts
  - packages/agent/test/harness/sqlite-branch-cache.test.ts
  - packages/agent/test/harness/branch-query.test.ts
symbols:
  - SqliteSessionRepository
  - SqliteSessionRepositoryOptions
  - createSqliteSessionSearch
  - SqliteSessionSearchOptions
  - SqliteSessionConnection
  - createNodeSqliteFactory
  - wrapNodeSqliteDatabase
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.session-tree
  - subsys.agent-core.compaction
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: c1019d9202
---

> `@earendil-works/pi-storage-sqlite-node` 是可选的 Node SQLite session backend：repository 持有 canonical session 数据，独立的 search façade 在同一数据库上维护 FTS5 projection。

## 能回答的问题

- `SqliteSessionRepository` 怎样拥有连接、session storage 与 disposal 生命周期？
- SQLite search 何时创建 FTS5 schema，它和 canonical 写入是否完全解耦？
- `002_branch_tips.sql` 升级会删除哪些数据，哪些数据仍是权威来源？
- branch cache 怎样延长、分叉、校验和从 canonical parent links 修复？
- cursor、bounded branch query、fork 与 malformed entry 的语义是什么？

## 包边界与 Node 适配

包的根 export 汇总 migration、repository、search backend 与 SQLite capability types；运行要求 Node `>=22.19.0`，`pi-ai` 与 `pi-agent-core` 依赖版本均为 `^0.83.0`。[E: packages/storage/sqlite-node/src/index.ts:97] [E: packages/storage/sqlite-node/src/sqlite/index.ts:1] [E: packages/storage/sqlite-node/src/sqlite/index.ts:3] [E: packages/storage/sqlite-node/src/sqlite/index.ts:6] [E: packages/storage/sqlite-node/package.json:32] [E: packages/storage/sqlite-node/package.json:35] [E: packages/storage/sqlite-node/package.json:36]

`createNodeSqliteFactory()` 用 `DatabaseSync` 打开文件；`NodeSqliteDatabase` 把同步 statement API 包成 Promise-shaped `SqliteDatabase`，transaction 显式执行 `BEGIN` / `COMMIT`，失败时尝试 `ROLLBACK` 并重抛原错误。因此这个 adapter 的 TypeScript API 是异步形状，底层执行不是非阻塞 driver。[E: packages/storage/sqlite-node/src/index.ts:48] [E: packages/storage/sqlite-node/src/index.ts:63] [E: packages/storage/sqlite-node/src/index.ts:64] [E: packages/storage/sqlite-node/src/index.ts:67] [E: packages/storage/sqlite-node/src/index.ts:71] [E: packages/storage/sqlite-node/src/index.ts:88] [E: packages/storage/sqlite-node/src/index.ts:91]

## Repository 与连接生命周期

`SqliteSessionRepository` 实现 agent-core 的 `SessionRepository`，并用 `contextBuildOptions` 把 backend storage 包装成通用 `Session`。内部 `SqliteSessionBackend` 懒建一个共享数据库连接，以 `writers` map 缓存每个 session 的 `SqliteSessionConnection`。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:67] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:72] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:77] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:285] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:293] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:298]

所有 repository create/open/list/read/append/delete/fork 操作经过 `SerialOperationQueue`；一个失败的操作不会破坏 queue tail。`Symbol.asyncDispose` 先拒绝新操作、等待已排队操作完成，再清 writer cache 并关闭共享连接；重复 dispose 复用同一个 promise。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:50] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:53] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:55] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:197] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:199] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:206] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:211]

打开数据库时先创建父目录，再设置 WAL、`synchronous=FULL`、5 秒 busy timeout 并应用 migrations。`list()` 在数据库文件不存在时直接返回空数组，不会为了空列表创建数据库。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:38] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:39] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:40] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:41] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:125] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:127] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:262] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:269] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:272]

`open(metadata)` 用 `metadata.path` 做存在性检查，却从 repository 配置的 `databasePath` 取得共享连接并按 metadata id 载入 session；实现没有比较两个路径是否一致，调用方需保证 metadata 属于该 repository。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:108] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:110] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:115] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:248] [I]

## Schema migration 与 FTS search

`applyMigrations()` 建 migration ledger，并按 `loadMigrations()` 数组顺序逐个 transaction 执行尚未登记的 SQL；migration 的 `order` 字段目前不参与排序。[E: packages/storage/sqlite-node/src/sqlite/migrations.ts:15] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:23] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:39] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:41] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:45] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:47]

`002_branch_tips.sql` 新建 `branch_tips(session_id, tip_id, branch_id)`：每个 session/tip 是主键，每个 session/branch 也唯一。升级会清空 `branch_tips` 与旧 `branch_entries` 并移除旧索引；它不删除 canonical `session_entries`，后续查询可从 parent links 懒修复 derived cache。[E: packages/storage/sqlite-node/src/sqlite/migrations/002_branch_tips.sql:1] [E: packages/storage/sqlite-node/src/sqlite/migrations/002_branch_tips.sql:5] [E: packages/storage/sqlite-node/src/sqlite/migrations/002_branch_tips.sql:6] [E: packages/storage/sqlite-node/src/sqlite/migrations/002_branch_tips.sql:9] [E: packages/storage/sqlite-node/src/sqlite/migrations/002_branch_tips.sql:10] [E: packages/storage/sqlite-node/src/sqlite/migrations/002_branch_tips.sql:12] [E: packages/agent/test/harness/sqlite-migrations.test.ts:161] [E: packages/agent/test/harness/sqlite-migrations.test.ts:163]

`createSqliteSessionSearch()` 返回 query-only `SessionSearch`。第一次非空搜索会打开同一个 canonical database，应用 migrations，创建 external-content FTS5 table 与 INSERT/DELETE/UPDATE triggers；新建 FTS table 时执行 `rebuild`，把既有 entries 补入索引。每次 search 最终关闭自己的连接。[E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:38] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:41] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:47] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:50] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:53] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:58] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:99] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:122] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:127]

搜索文本会 trim，空文本直接返回空数组；非空文本被转义成 quoted FTS phrase，可按 cwd 精确筛选并按 `bm25` score 排序。tokenizer 是 `trigram remove_diacritics 1`，所以测试也覆盖子串命中。[E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:100] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:101] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:104] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:107] [E: packages/storage/sqlite-node/src/sqlite/search-backend.ts:111] [E: packages/agent/test/harness/sqlite-node.test.ts:62] [E: packages/agent/test/harness/sqlite-node.test.ts:65]

search façade 与 repository 可独立组合，但 projection 不是故障隔离的旁路：FTS triggers 与 canonical table 同库，FTS table 被破坏会使 canonical append 或 delete transaction 失败并回滚。[E: packages/agent/test/harness/sqlite-node.test.ts:110] [E: packages/agent/test/harness/sqlite-node.test.ts:115] [E: packages/agent/test/harness/sqlite-node.test.ts:120] [E: packages/agent/test/harness/sqlite-node.test.ts:130] [E: packages/agent/test/harness/sqlite-node.test.ts:137] [E: packages/agent/test/harness/sqlite-node.test.ts:142]

## Branch cache 与 bounded query

`branch_entries` / `branch_tips` 是 derived root-to-tip paths，canonical `session_entries.parent_id` 始终权威。linear append 命中 parent tip 时延长原 branch 并以 compare-and-update 推进 tip；从已有 branch 中间节点分叉时复制 prefix 到新 branch，再追加新 entry 与 tip。[E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:18] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:248] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:256] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:260] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:284] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:287] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:311] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:319] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:324]

cache 缺失或 stale 时，通常会先校验 canonical parent chain，再在 SAVEPOINT 内用 recursive CTE 重建完整路径和唯一 tip；repair 失败会回滚到 savepoint。例外是 newest-first 且带 `stopAtId` / `stopAtType` 的 bounded query：cache 无效时直接走 canonical bounded traversal，不修复完整 cache，以免越过查询边界 [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:89] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:90] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:91] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:95] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:98] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:143] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:147] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:159] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:205] [E: packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts:239]。

`findEntriesOnBranch()` 支持 start、stopAtType、stopAtId、type/customType filter、顺序与 positive integer limit。边界和顺序先约束 SQL rows，随后统一 decode，最后才 filter 与 limit；所以查询范围内的 malformed entry 即使会被 filter 排除也仍抛 `invalid_entry`。newest-first 且有 stop bound 时只验证/读取 stop 到 start 的范围，不要求验证界外 ancestors。[E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:83] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:84] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:90] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:95] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:100] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:101] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:106] [E: packages/agent/test/harness/branch-query.test.ts:244] [E: packages/agent/test/harness/branch-query.test.ts:285] [E: packages/agent/test/harness/branch-query.test.ts:291]

`readPathToRootOrCompaction()` 先从 cache 中用 entry-type index 定位 compaction，再按 `retainedTail` 或 `firstKeptEntryId` 计算有效起点；若 cached path 无效则重建 canonical path 后按相同 compaction 语义裁剪。[E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:171] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:175] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:187] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:192] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:211] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:218] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:263]

## 写入、读取与 fork

`SqliteSessionConnection.appendEntry()` 先构造 next materialized state，再在同一个 transaction 中写 entry、推进 sequence、更新 summary/per-entry materialization、active leaf 与 branch cache；只有 transaction 成功后才发布内存 state 与 entry cache。非 `SessionError` 会包成带 cause 的 storage error。[E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:367] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:372] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:380] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:382] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:388] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:390] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:394] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:398] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:400] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:412] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:413] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:417]

读取采用严格 decode：单条与批量遇到坏 payload 都抛 `invalid_entry`，不再跳过 malformed rows。cursor 是正向 exclusive 语义：`entry_seq > afterEntrySeq`、升序，在 SQL 层应用 limit。[E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:37] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:44] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:421] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:435] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:439] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:445] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:450] [E: packages/agent/test/harness/sqlite-migrations.test.ts:471]

fork 在共享连接的一个外层 transaction 中读取源 selection、创建目标 session，并以 `transaction:false` 逐条复制 entries；任一复制失败会连同目标 session 一起回滚。默认 parent 是源 session，metadata 默认继承源 metadata。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:171] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:179] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:182] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:183] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:186] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:187] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:189] [E: packages/agent/test/harness/sqlite-migrations.test.ts:222] [E: packages/agent/test/harness/sqlite-migrations.test.ts:228]

和 `open(metadata)` 一样，`delete(metadata)` 与 `fork(source)` 以当前 repository 的 `databasePath` 和传入 metadata 的 `id` 操作，并不按传入 `metadata.path` 切换数据库；调用方必须保证 metadata 来自同一 repository [E: packages/storage/sqlite-node/src/sqlite/repo.ts:153] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:154] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:164] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:171] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:190] [I]。

## 跨包边界与 gotcha

- `subsys.agent-core.session-storage` 定义 repository-owned `SessionStorage` contract；SQLite storage 不再提供 per-session `cleanup()`，关闭责任在 repository 的 async disposal。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:218] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:324] [I]
- `subsys.agent-core.session-tree` 定义 parent-linked entries 与 bounded branch query；SQLite cache 只是该模型的派生加速层。
- `subsys.agent-core.compaction` 的 retained-tail / first-kept 边界直接决定 SQLite branch window。
- `ref.coding-agent.session-format` 描述 coding-agent 默认 JSONL 产品格式；SQLite 是独立可选 backend，不是 JSONL 文件格式的替换。

## Sources

- packages/storage/sqlite-node/package.json
- packages/storage/sqlite-node/src/index.ts
- packages/storage/sqlite-node/src/sqlite/index.ts
- packages/storage/sqlite-node/src/sqlite/repo.ts
- packages/storage/sqlite-node/src/sqlite/search-backend.ts
- packages/storage/sqlite-node/src/sqlite/migrations.ts
- packages/storage/sqlite-node/src/sqlite/migrations/002_branch_tips.sql
- packages/storage/sqlite-node/src/sqlite/storage/index.ts
- packages/storage/sqlite-node/src/sqlite/storage/branch-cache.ts
- packages/storage/sqlite-node/src/sqlite/types.ts
- packages/agent/test/harness/sqlite-node.test.ts
- packages/agent/test/harness/sqlite-migrations.test.ts
- packages/agent/test/harness/sqlite-branch-cache.test.ts
- packages/agent/test/harness/branch-query.test.ts

## 相关

- [subsys.agent-core.session-storage](../agent-core/session-storage.md): repository、storage 与 search 的通用 contract。
- [subsys.agent-core.session-tree](../agent-core/session-tree.md): parent-linked entry、branch query 与 fork selection。
- [subsys.agent-core.compaction](../agent-core/compaction.md): branch path 的 compaction 截止语义。
- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent 默认 JSONL session 文件格式。
