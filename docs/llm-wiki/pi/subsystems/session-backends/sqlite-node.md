---
id: subsys.session-backends.sqlite-node
title: Node SQLite 会话后端
kind: subsystem
tier: T2
pkg: session-backends
source:
  - packages/session-backends/sqlite-node/package.json
  - packages/session-backends/sqlite-node/CHANGELOG.md
  - packages/session-backends/sqlite-node/README.md
  - packages/session-backends/sqlite-node/src/index.ts
  - packages/session-backends/sqlite-node/src/sqlite/index.ts
  - packages/session-backends/sqlite-node/src/sqlite/repo.ts
  - packages/session-backends/sqlite-node/src/sqlite/search-backend.ts
  - packages/session-backends/sqlite-node/src/sqlite/migrations.ts
  - packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql
  - packages/session-backends/sqlite-node/src/sqlite/sql.ts
  - packages/session-backends/sqlite-node/src/sqlite/types.ts
  - packages/session-backends/sqlite-node/src/sqlite/branch-cache.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/sessions.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/entries.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/records.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/facts.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/writer-leases.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/branch-entries.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/branch-tips.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/session-sequences.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage/session-stats.ts
  - packages/session-backends/sqlite-node/test/adapter.test.ts
  - packages/session-backends/sqlite-node/test/repository.test.ts
  - packages/session-backends/sqlite-node/test/writer-leases.test.ts
  - packages/session-backends/sqlite-node/test/search.test.ts
  - packages/session-backends/sqlite-node/test/migrations.test.ts
  - packages/session-backends/sqlite-node/test/branch-cache.test.ts
  - packages/session-backends/sqlite-node/test/branch-query.test.ts
  - packages/session-backends/sqlite-node/test/facts-query.test.ts
  - packages/session-backends/sqlite-node/test/log-query.test.ts
  - packages/session-backends/sqlite-node/test/sql.test.ts
  - packages/session-backends/sqlite-node/test/conformance.test.ts
  - packages/session-backends/sqlite-node/test/test-utils.ts
symbols:
  - createNodeSqliteFactory
  - wrapNodeSqliteDatabase
  - SqliteSessionRepository
  - SqliteSessionRepositoryOptions
  - SqliteWriterLeaseOptions
  - createSqliteSessionSearch
  - SqliteSessionSearchOptions
  - SqliteSessionSearchHit
  - sql
  - SqlQuery
  - joinSqlFragments
  - applyMigrations
  - loadMigrations
  - SqliteMigration
  - SqliteDatabase
  - SqliteDatabaseFactory
  - SqliteRunResult
  - SqliteStatement
  - SqliteSessionMetadata
  - SqliteSessionCreateOptions
  - SqliteSessionListOptions
  - SqliteSessionRepositoryEnv
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.session-tree
  - subsys.agent-core.session-search
  - subsys.agent-core.compaction
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: 086c32e745
---

> `@earendil-works/pi-session-backend-sqlite-node` 是 `pi-agent-core` v4 `SessionRepo` 的可选 Node `node:sqlite` 实现：一个 repository 共用一个 SQLite 文件，按 session 行存放 lanes / entries / records / facts，并用 per-session writer lease 做写栅栏；FTS5 搜索是同库独立 façade。

## 能回答的问题

- 这个包从旧 npm 名改成了什么，v4 schema 相对旧库是否迁移？
- 一个 repository 是「每 session 一个 sqlite 文件」还是共享一个 `databasePath`？
- `SqliteSessionRepository` 怎样拥有连接、`Session`、writer lease 与 disposal？
- lanes / records / facts / 共享 sequence / writer-leases 各自写什么表？
- branch cache 何时延长、分叉、拒绝，以及谁负责 `repairBranchCache()`？
- `createSqliteSessionSearch()` 何时建 FTS5，它和 canonical 写入是否故障隔离？

## 包改名与职责边界

0.84.0 把包从 `@earendil-works/pi-storage-sqlite-node` 改名为 `@earendil-works/pi-session-backend-sqlite-node`，并把旧 SQLite schema / repository 换成 v4 lane-based `SessionRepo`；CHANGELOG 写明既有 WIP 数据库不迁移。[E: packages/session-backends/sqlite-node/CHANGELOG.md:21] [E: packages/session-backends/sqlite-node/CHANGELOG.md:22] [E: packages/session-backends/sqlite-node/package.json:2]

当前发布面是 `0.84.2`，要求 Node `>=22.19.0`，运行时依赖 `@earendil-works/pi-ai` 与 `@earendil-works/pi-agent-core` 均为 `^0.84.2`。根 export 再导出 migration、repository、search、`sql` 模板和 capability types。[E: packages/session-backends/sqlite-node/package.json:3] [E: packages/session-backends/sqlite-node/package.json:34] [E: packages/session-backends/sqlite-node/package.json:37] [E: packages/session-backends/sqlite-node/package.json:38] [E: packages/session-backends/sqlite-node/src/index.ts:114] [E: packages/session-backends/sqlite-node/src/sqlite/index.ts:1] [E: packages/session-backends/sqlite-node/src/sqlite/index.ts:3] [E: packages/session-backends/sqlite-node/src/sqlite/index.ts:7]

`SqliteSessionRepository` 实现 agent-core 的 `SessionRepo`（源码里 `import { type SessionRepo as SessionRepository }`），用内部 `SqliteSessionStorage` 实现 `SessionStorage`，再包成公开 `Session`。Search 不是 repository 方法：`createSqliteSessionSearch()` 是独立服务，repository 不暴露 `search()`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:16] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:669] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:333] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:703] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:192] [E: packages/session-backends/sqlite-node/README.md:17] [E: packages/session-backends/sqlite-node/README.md:18]

布局不是 one sqlite file per session。`SqliteSessionRepositoryOptions.databasePath` 指向**一个**共享库文件；`sessions` / `entries` / `lanes` 等表用 `session_id` 区分多会话。`SqliteSessionMetadata.path` 就是这个共享文件的绝对路径，不是 per-session 路径。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:102] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:105] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:923] [E: packages/session-backends/sqlite-node/src/sqlite/storage/sessions.ts:119] [E: packages/session-backends/sqlite-node/src/sqlite/storage/sessions.ts:127] [E: packages/session-backends/sqlite-node/test/repository.test.ts:96] [E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:1] [E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:13]

打开旧 v4 之前的 SQLite 文件时，`001_initial.sql` 用 `CREATE TABLE IF NOT EXISTS`，不会改写已有同名表；本包测试只覆盖从空库 apply 当前 schema。打开 pre-v4 文件后新旧表并存或列不匹配时的具体失败形态未固定。[U] [E: packages/session-backends/sqlite-node/CHANGELOG.md:22] [E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:1] [E: packages/session-backends/sqlite-node/test/migrations.test.ts:7]

## Node adapter 与 `sql` 模板

`createNodeSqliteFactory()` 用 `node:sqlite` 的 `DatabaseSync` 打开文件；`wrapNodeSqliteDatabase()` 把已有 `DatabaseSync` 包成 `SqliteDatabase`。`NodeSqliteStatement` 同时接受位置参数和 named parameter object。`transaction()` 执行 `BEGIN IMMEDIATE` / `COMMIT`，失败时尝试 `ROLLBACK` 并重抛原错误；若回调返回 thenable 则抛 `TypeError("SQLite transaction callbacks must be synchronous")` 并回滚。因此 factory 的 `open()` 是 Promise，statement / transaction API 是同步形状，底层也不是非阻塞 driver。[E: packages/session-backends/sqlite-node/src/index.ts:16] [E: packages/session-backends/sqlite-node/src/index.ts:62] [E: packages/session-backends/sqlite-node/src/index.ts:77] [E: packages/session-backends/sqlite-node/src/index.ts:81] [E: packages/session-backends/sqlite-node/src/index.ts:101] [E: packages/session-backends/sqlite-node/src/index.ts:105] [E: packages/session-backends/sqlite-node/src/sqlite/types.ts:20] [E: packages/session-backends/sqlite-node/src/sqlite/types.ts:24] [E: packages/session-backends/sqlite-node/test/adapter.test.ts:5] [E: packages/session-backends/sqlite-node/test/adapter.test.ts:42]

`sql` 模板把插值编成 `?` 参数；嵌套 `SqlQuery` 则内联 SQL 文本并按原顺序拼接参数。`joinSqlFragments()` 用分隔符连接可信片段。`exec()` 拒绝带参数的查询。[E: packages/session-backends/sqlite-node/src/sqlite/sql.ts:15] [E: packages/session-backends/sqlite-node/src/sqlite/sql.ts:38] [E: packages/session-backends/sqlite-node/src/sqlite/sql.ts:43] [E: packages/session-backends/sqlite-node/src/sqlite/sql.ts:56] [E: packages/session-backends/sqlite-node/test/sql.test.ts:5]

## 数据模型

`001_initial.sql` 一次建齐当前 schema。权威表：

| 表 | 主键 / 唯一 | 职责 |
|---|---|---|
| `sessions` | `id` | catalog：`created_at`、`cwd`、`parent_session_id`、opaque `metadata` JSON。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:1] |
| `entries` | `(session_id, id)`，`UNIQUE (session_id, seq)` | canonical tree：`parent_id`、`type`、`timestamp`、payload JSON。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:12] |
| `session_sequences` | `session_id` | 该 session 下一个共享 `seq`。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:27] |
| `session_stats` | `session_id` | `message_count` 与 token/cost 累加器。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:32] |
| `lanes` | `(session_id, lane)` | 当前 `leaf_id` 与至多一个 `open_operation_id`。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:58] |
| `lane_moves` | `(session_id, seq)` | create/move lane 的 log 行。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:87] |
| `records` | `(session_id, id)`，`UNIQUE (session_id, seq)` | durable operation / usage 记录。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:66] |
| `facts` | `(session_id, seq)` | append-only name/label；最新非空值生效。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:96] |
| `branch_entries` / `branch_tips` | tip：`(session_id, tip_id)` 且 `(session_id, branch_id)` 唯一 | 派生 root-to-tip cache；`entries.parent_id` 仍权威。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:43] [E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:107] |
| `writer_leases` | `session_id` | `owner_id` + 递增 `fence` + `expires_at_ms`。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:117] |
| `migrations` | `id` | ledger，由 `applyMigrations()` 建。[E: packages/session-backends/sqlite-node/src/sqlite/migrations.ts:28] |

`SqliteSessionMetadata` 在通用 `SessionMetadata` 上加 `cwd`、`path`、可选 `parentSessionId` / `name` / `metadata`。`name` 来自 latest `facts(kind='name')`，不是 `sessions` 列；application-owned `metadata` 是另一份 JSON。[E: packages/session-backends/sqlite-node/src/sqlite/types.ts:32] [E: packages/session-backends/sqlite-node/src/sqlite/storage/sessions.ts:119] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:613] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:71]

`decodeEntry()` 按 `type` 严格解析 payload：坏 JSON / 缺字段抛 `invalid_entry`。`decodeRecord()` 把 payload JSON 摊开后再写入 `seq` / `timestamp`，坏 payload 抛 `storage`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:190] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:260] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:276] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:284] [E: packages/session-backends/sqlite-node/test/repository.test.ts:326] [E: packages/session-backends/sqlite-node/test/repository.test.ts:349]

## Repository 与连接生命周期

`SqliteSessionRepository` 懒打开**一条**共享连接：`getDatabase()` 缓存 `databasePromise`；`openDatabase()` 先 `createDir` 父目录，再 `open`、设 WAL / `synchronous=FULL` / `busy_timeout=5000`，然后 `applyMigrations()`。setup 失败会 `close()` 这次打开的连接。失败的业务操作不会关掉已打开的库；只有 `close()` / `Symbol.asyncDispose` 关连接。重复 dispose 不会二次 `close()` 底层 db。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:172] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:931] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:937] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:911] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:919] [E: packages/session-backends/sqlite-node/test/repository.test.ts:158] [E: packages/session-backends/sqlite-node/test/repository.test.ts:180] [E: packages/session-backends/sqlite-node/test/repository.test.ts:208]

repository 级 create / open / list / delete / fork / `repairBranchCache` 走 `SerialOperationQueue`；一个失败的操作不会破坏 queue tail。每个打开的 session 另有自己的 `SqliteSessionStorage` 写队列。同一 repository 对同一 session 再次 `open()` 复用已有 storage，因此共享那条写队列。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:139] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:144] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:339] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:706] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:18]

`list()` 在共享文件不存在时直接返回 `[]`，不会为了空列表创建数据库。list 读 catalog 与 latest name，**不** acquire / renew writer lease，所以另一个 repository 可以在会话仍被写的时候做 inventory。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:764] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:767] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:52] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:88]

`open(metadata)` 只按 `metadata.id` 在本 repository 的 `databasePath` 上 claim；它不比较、也不切换 `metadata.path`。调用方必须保证 metadata 来自同一个共享库。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:745] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:706] [I]

## Writer leases

默认 `ttlMs=30_000`、`heartbeatIntervalMs=10_000`；ttl 必须为正整数，heartbeat 必须为正且严格小于 ttl。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:95] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:114] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:33]

`acquireWriterLease()`：`INSERT` 新行 `fence=1`；若 `session_id` 冲突，仅当现有 `expires_at_ms <= now` 才接管并 `fence + 1`。冲突且未过期则返回 `undefined`，repository 抛 `storage`「already has an active writer」。[E: packages/session-backends/sqlite-node/src/sqlite/storage/writer-leases.ts:16] [E: packages/session-backends/sqlite-node/src/sqlite/storage/writer-leases.ts:29] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:132] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:124] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:109]

每次写（含 heartbeat）在同一 transaction 里 `renewWriterLease()`：必须同时匹配 `owner_id`、`fence`，且租约尚未过期。renew 失败把 `leaseError` 记成「writer lease was lost」，后续写直接拒绝。过期租约被第二个 writer 接管后 fence 变为 2；旧 owner 的 `close()` 按旧 fence `DELETE`，删不到新行，新 owner 可继续写。[E: packages/session-backends/sqlite-node/src/sqlite/storage/writer-leases.ts:34] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:377] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:384] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:394] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:127] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:156] [E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:190]

`release()` / repository `close()` 按 `owner_id + fence` 删除租约。heartbeat 用 `unref()` 的 `setTimeout`，短暂失败会重试；真正的写仍在 transaction 内核验所有权。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:365] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:408] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:414] [E: packages/session-backends/sqlite-node/src/sqlite/storage/writer-leases.ts:51]

## Lanes、entries、records、facts

create 在同一 transaction 里插入 session 行、`createSequence`、`createStats`、`createInitialLane(..., "main")`，再 claim writer lease。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:727] [E: packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts:19]

`appendEntry(entry, lane)` 用该 lane 的当前 `leaf_id` 当 `parentId`，从共享 sequence 取 `seq`，写入 `entries`，`setLaneLeaf`，维护 branch cache；`type === "message"` 时 `incrementMessageCount`。entry / record id 在 `entries` 与 `records` 之间必须唯一。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:456] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:321] [E: packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts:55] [E: packages/session-backends/sqlite-node/src/sqlite/storage/session-stats.ts:35]

`createLane` / `moveLane` 各消耗一个 seq，并往 `lane_moves` 追加一行。`appendEntry` 只改 `lanes.leaf_id`，不写 `lane_moves`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:429] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:443] [E: packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts:71] [E: packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts:77] [E: packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts:83]

`appendRecord` 要求 lane 已存在。`operation_started` 在 `open_operation_id IS NULL` 时写入该 id，否则抛 storage「already has an open operation」。`operation_finished` 仅在 `open_operation_id` 等于该 `runId` 时清掉。`usage` 记录按 `cacheRead` / `input+cacheWrite` / `totalTokens` / `cost.total` 累加 `session_stats`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:487] [E: packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts:88] [E: packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts:97] [E: packages/session-backends/sqlite-node/src/sqlite/storage/session-stats.ts:42] [E: packages/session-backends/sqlite-node/test/repository.test.ts:411]

`findOpenOperations(lane)` 读 `lanes.open_operation_id` 对应的那一条 `operation_started` record。SQL helper 的 `limit` 参数名为 `_options`，未被使用；一条 lane 至多一个 open operation。agent-core `SessionStorage` 注释里 recovery 用 `limit: 2` 探测双开，本包既不能表示两个 open op，也不实现该 limit。[U] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:556] [E: packages/session-backends/sqlite-node/src/sqlite/storage/records.ts:73] [E: packages/session-backends/sqlite-node/src/sqlite/storage/records.ts:77]

facts 是 append-only：`setName` / `setLabel` 各写一行，清除时 `value=NULL`。读侧 `readLatestFact` 按 `(kind, key)` 取最大 seq；`readLatestLabelFacts` 只返回最新值非 NULL 的 label。list / search / `getMetadata()` 都投影这份 latest name。`setLabel` 要求目标 entry 存在。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:618] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:631] [E: packages/session-backends/sqlite-node/src/sqlite/storage/facts.ts:25] [E: packages/session-backends/sqlite-node/src/sqlite/storage/facts.ts:33] [E: packages/session-backends/sqlite-node/test/facts-query.test.ts:8] [E: packages/session-backends/sqlite-node/test/repository.test.ts:306]

`getLog({ afterSeq, limit })` 分别从 entries / records / lane_moves / facts 各取最多 `limit` 行（`seq > afterSeq`），按 seq 归并后再 slice；被裁掉的行不会 decode。测试覆盖「limit 窗口外的坏 payload 不会炸」。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:568] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:609] [E: packages/session-backends/sqlite-node/test/log-query.test.ts:8]

共享 sequence 覆盖 entry、record、fact、lane_move。`getNextSequence()` 读 `next_seq`，成功后 `advanceSequence` 写成 `seq + 1`。[E: packages/session-backends/sqlite-node/src/sqlite/storage/session-sequences.ts:9] [E: packages/session-backends/sqlite-node/src/sqlite/storage/session-sequences.ts:23]

## Branch cache 与 bounded query

`branch_entries` / `branch_tips` 是派生加速层。`appendEntryToBranchCache()`：`parentId === null` 开新 branch；parent 正是某 tip 则 compare-and-update 延长该 tip（tip 被并发改掉抛 `invalid_entry`）；parent 在某 branch 中间则复制 `entry_seq <= parent` 的 prefix 到新 branch 再追加。[E: packages/session-backends/sqlite-node/src/sqlite/branch-cache.ts:70] [E: packages/session-backends/sqlite-node/src/sqlite/branch-cache.ts:79] [E: packages/session-backends/sqlite-node/src/sqlite/branch-cache.ts:86] [E: packages/session-backends/sqlite-node/src/sqlite/branch-cache.ts:92] [E: packages/session-backends/sqlite-node/src/sqlite/storage/branch-tips.ts:21]

cache 缺失时，读 `findEntriesOnBranch` 若 start entry 存在会抛「Branch cache missing」；写 append 会抛「has no branch containing parent entry」。实现**不会**在查询路径上自动 rebuild。`repairBranchCache(metadata)` 先 release 该 session 的 storage，再短暂 claim lease，按「没有 child 的 leaf」重建全部 tip，然后立刻释放 lease。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:535] [E: packages/session-backends/sqlite-node/src/sqlite/branch-cache.ts:92] [E: packages/session-backends/sqlite-node/src/sqlite/branch-cache.ts:19] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:750] [E: packages/session-backends/sqlite-node/test/branch-cache.test.ts:83] [E: packages/session-backends/sqlite-node/test/branch-cache.test.ts:117]

`queryCachedBranchRows()` 在 SQL 里应用 `stopAtType` / `stopAtId`、cursor、type / customType 与 limit。`validateCachedBranchRows()` 只在没有 type/customType filter 时检查返回行的 parent 链；newest-first 且带 stop bound 时不验证界外 ancestor。compaction 窗口由调用方用 `stopAtType: "compaction"` 表达，cache 本身仍保存完整 root-to-tip。[E: packages/session-backends/sqlite-node/src/sqlite/storage/branch-entries.ts:49] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:292] [E: packages/session-backends/sqlite-node/test/branch-query.test.ts:8] [E: packages/session-backends/sqlite-node/test/branch-query.test.ts:88] [E: packages/session-backends/sqlite-node/test/branch-cache.test.ts:44] [E: packages/session-backends/sqlite-node/test/test-utils.ts:128]

stale cache（canonical `parent_id` 与 cache 路径不一致）在需要验证整条路径时抛 `invalid_entry`，同样不会偷偷修好。[E: packages/session-backends/sqlite-node/test/branch-cache.test.ts:172]

## Search backend

`createSqliteSessionSearch({ env, sqlite, databasePath })` 每次 `search()` 自己 `open` / `close` 同一 canonical 文件。第一次**非空**搜索才 `ensureSearchSchema()`：建 external-content FTS5 `session_search_fts(content='entries', tokenize='trigram remove_diacritics 1')` 以及 entries 的 INSERT / DELETE / UPDATE-of-payload triggers。若 FTS 表是新的且 `entries` 已存在，执行一次 `rebuild`。空白文本、`limit <= 0` 或空 `entryTypes` 直接结束，不建 FTS；纯 canonical 写入也不会初始化 FTS。[E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:65] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:70] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:87] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:135] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:187] [E: packages/session-backends/sqlite-node/test/search.test.ts:211] [E: packages/session-backends/sqlite-node/test/search.test.ts:95]

查询把 trim 后的文本 escape 成 quoted FTS phrase（`"` → `""`），按 `bm25` 排序，可选 `entryTypes` 与 `limit`。当前 `SessionSearchOptions` **没有** cwd 过滤；同一共享库里不同 cwd 的 session 都会进结果。hit 带 `SqliteSessionMetadata`（含 latest name）和 score。trigram 使子串 `"uth"` 能打中 `"auth"`。[E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:142] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:168] [E: packages/session-backends/sqlite-node/test/search.test.ts:23] [E: packages/session-backends/sqlite-node/test/search.test.ts:54] [E: packages/session-backends/sqlite-node/test/search.test.ts:113]

FTS 与 canonical 表同库、同 transaction：FTS 表被丢掉后，append 的 INSERT trigger 或 delete 的 DELETE trigger 失败会回滚整个 canonical 事务。delete session 后索引不再命中；setup 失败会关掉这次 search 连接。[E: packages/session-backends/sqlite-node/test/search.test.ts:233] [E: packages/session-backends/sqlite-node/test/search.test.ts:254] [E: packages/session-backends/sqlite-node/test/search.test.ts:151] [E: packages/session-backends/sqlite-node/test/search.test.ts:278]

## Migrations

`loadMigrations()` 目前只返回 `001_initial.sql`（`order: 1`）。`applyMigrations()` 建 ledger，按该数组顺序对未登记的 id 各开一个 transaction 执行 SQL 并插入 ledger。`order` 字段不参与排序。二次 apply 是 no-op，ledger 仍只有 `001_initial.sql`。[E: packages/session-backends/sqlite-node/src/sqlite/migrations.ts:16] [E: packages/session-backends/sqlite-node/src/sqlite/migrations.ts:35] [E: packages/session-backends/sqlite-node/src/sqlite/migrations.ts:41] [E: packages/session-backends/sqlite-node/test/migrations.test.ts:7] [E: packages/session-backends/sqlite-node/test/migrations.test.ts:15]

build 脚本 `copy-sqlite-migrations` 把 SQL 文件拷进 dist，运行时用 `import.meta.url` 相对读取。[E: packages/session-backends/sqlite-node/package.json:21] [E: packages/session-backends/sqlite-node/src/sqlite/migrations.ts:12]

## 控制流

1. `create(options)`@`repo.ts:720`：解析绝对 `databasePath`，`options.id ?? uuidv7()`，拒绝已存在 id，transaction 内写 session / sequence / stats / `main` lane / lease，返回 `new Session(storage)`。
2. `open(metadata)`@`repo.ts:745`：同库按 id claim；本进程已持有该 session 的 storage 则复用。
3. `list({ cwd? })`@`repo.ts:764`：文件不存在 → `[]`；否则按 `created_at DESC` 读 catalog，不碰 lease。
4. `appendEntry`@`repo.ts:456` / `appendRecord`@`repo.ts:487`：storage 写队列 → 续租 → 同步 transaction 写表、推进 seq。
5. `fork(source, options)`@`repo.ts:797`：`scope === "tree"` 复制全部 entries 与全部 lanes/tips；默认 branch scope 只走 `main`，目标必须是 message，`position` 默认在显式 `entryId` 时为 `"before"`、否则 `"at"`。目标 session 在**一个**外层 transaction 里重建，失败则整棵 fork 回滚。默认 `parentSessionId` 是源 id，metadata 默认真源。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:813] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:829] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:863] [E: packages/session-backends/sqlite-node/test/repository.test.ts:119]
6. `delete(metadata)`@`repo.ts:774`：先 release 该 session 的 storage，再 claim lease，按固定顺序删 branch cache / facts / lanes / records / entries / lease / stats / sequence / session 行。session 行已不在时仍清 lease。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:784] [E: packages/session-backends/sqlite-node/test/branch-cache.test.ts:198]
7. `close()`@`repo.ts:911`：drain repository 队列 → release 全部 storage（从而放租约）→ 关共享连接。之后对该 `Session` 的 append 得到「is closed」。[E: packages/session-backends/sqlite-node/test/repository.test.ts:193]

branch-scope fork 依赖源 session 的 cache：cache 缺失会 `invalid_fork_target`「not on a cached branch」，不会隐式 repair。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:834] [E: packages/session-backends/sqlite-node/test/branch-cache.test.ts:143]

append 事务失败不会发布部分状态：测试用触发器打断 `branch_tips` INSERT 后，`lanes.leaf_id` 仍为 NULL、entries 为空、`messageCount` 仍为 0，去掉触发器后可以再写。[E: packages/session-backends/sqlite-node/test/repository.test.ts:379]

本包通过 `createSessionBackendConformance()` 跑 agent-core 的 backend fixture 套件。[E: packages/session-backends/sqlite-node/test/conformance.test.ts:24] [E: packages/session-backends/sqlite-node/test/conformance.test.ts:46]

## 设计动机与权衡

共享一个 SQLite 文件让 `list()` / FTS 能跨 session 扫描，而不必每会话打开一个连接；代价是所有 session 共享 WAL 与 busy timeout，且 `metadata.path` 不再标识单个会话文件。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:102] [I]

writer lease + fence 让两个进程不能同时写同一 session，同时允许第三个进程只读 list。lease 过期可被接管，旧 owner 被 fence 挡住，避免双写。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:117] [I]

branch cache 换扫描成本，但 v4 选择「缺了就失败 + 显式 `repairBranchCache`」，避免查询路径上的隐式全量 rebuild 越过 bound。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:750] [I]

FTS 做成独立 façade、懒建 schema，是为了让纯写入路径不必付索引成本；同库 trigger 换来强一致，也换来「索引坏了连 append/delete 一起回滚」。[E: packages/session-backends/sqlite-node/README.md:19] [E: packages/session-backends/sqlite-node/test/search.test.ts:233] [I]

## Gotcha

- 不是 one-file-per-session。测试夹具一律用同一个 `sessions.sqlite` 装多个 id。[E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:175]
- `open` / `delete` / `fork` 忽略传入 `metadata.path` 去切换数据库，只信构造时的 `databasePath` + `metadata.id`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:745] [I]
- lane 的 `leaf_id` 指向缺失 entry 时，`getLanes()` 与 `open()` 都抛 storage，不会静默修好。[E: packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts:37] [E: packages/session-backends/sqlite-node/test/repository.test.ts:225]
- 缺 / stale 的 branch cache 不会在 read 或 append 时自动重建，必须 `repairBranchCache()`。[E: packages/session-backends/sqlite-node/test/branch-cache.test.ts:83]
- transaction 回调必须同步；把 `async` 函数丢进 `db.transaction` 会回滚。[E: packages/session-backends/sqlite-node/test/adapter.test.ts:42]
- malformed session `metadata` / name JSON 会让 `list()` 整表拒绝，不只跳过那一行。[E: packages/session-backends/sqlite-node/test/repository.test.ts:253] [E: packages/session-backends/sqlite-node/test/repository.test.ts:277]
- 同一 repository 内跨 session 的写仍串行经过**一条**共享 db 连接上的 lease-checked transaction；测试覆盖两个 session 并行 `appendMessage` 最终都能完成。[E: packages/session-backends/sqlite-node/test/writer-leases.test.ts:175]

## 跨包边界

- `subsys.agent-core.session-storage` 定义 v4 `SessionRepo` / `SessionStorage` / `Session`：lanes、records、facts、`list` 不抢写锁。本包是该契约的 Node SQLite 实现，并额外提供 `repairBranchCache` 与 writer-lease 选项。
- `subsys.agent-core.session-tree` 定义 parent-linked entries 与 branch query；SQLite cache 只是派生加速层，canonical 仍是 `entries.parent_id`。
- `subsys.agent-core.compaction` 的 retained-tail / `stopAtType: "compaction"` 由查询方表达；本包 cache 存完整路径。
- `subsys.agent-core.session-search` 定义独立 `SessionSearch` async iterable。本包的 FTS façade 实现同一分离：repository 没有 `search()`。
- `ref.coding-agent.session-format` 描述 coding-agent 默认 JSONL 产品格式。本包是可选 agent-core backend，不是 JSONL 文件格式的替换，也不是 coding-agent 默认磁盘格式。

## Sources

- packages/session-backends/sqlite-node/package.json
- packages/session-backends/sqlite-node/CHANGELOG.md
- packages/session-backends/sqlite-node/README.md
- packages/session-backends/sqlite-node/src/index.ts
- packages/session-backends/sqlite-node/src/sqlite/index.ts
- packages/session-backends/sqlite-node/src/sqlite/repo.ts
- packages/session-backends/sqlite-node/src/sqlite/search-backend.ts
- packages/session-backends/sqlite-node/src/sqlite/migrations.ts
- packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql
- packages/session-backends/sqlite-node/src/sqlite/sql.ts
- packages/session-backends/sqlite-node/src/sqlite/types.ts
- packages/session-backends/sqlite-node/src/sqlite/branch-cache.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/sessions.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/entries.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/lanes.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/records.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/facts.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/writer-leases.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/branch-entries.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/branch-tips.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/session-sequences.ts
- packages/session-backends/sqlite-node/src/sqlite/storage/session-stats.ts
- packages/session-backends/sqlite-node/test/adapter.test.ts
- packages/session-backends/sqlite-node/test/repository.test.ts
- packages/session-backends/sqlite-node/test/writer-leases.test.ts
- packages/session-backends/sqlite-node/test/search.test.ts
- packages/session-backends/sqlite-node/test/migrations.test.ts
- packages/session-backends/sqlite-node/test/branch-cache.test.ts
- packages/session-backends/sqlite-node/test/branch-query.test.ts
- packages/session-backends/sqlite-node/test/facts-query.test.ts
- packages/session-backends/sqlite-node/test/log-query.test.ts
- packages/session-backends/sqlite-node/test/sql.test.ts
- packages/session-backends/sqlite-node/test/conformance.test.ts
- packages/session-backends/sqlite-node/test/test-utils.ts

## 相关

- [subsys.agent-core.session-storage](../agent-core/session-storage.md): v4 `SessionRepo` / `SessionStorage` 契约（lanes、records、facts、不抢锁的 list）。
- [subsys.agent-core.session-tree](../agent-core/session-tree.md): parent-linked entry 与 branch query 形状。
- [subsys.agent-core.session-search](../agent-core/session-search.md): 与 repository 分离的 `SessionSearch` 接口。
- [subsys.agent-core.compaction](../agent-core/compaction.md): branch 窗口的 compaction 截止语义。
- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent 默认 JSONL session 文件格式。
