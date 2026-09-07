---
id: subsys.session-backends.sqlite-node
title: Node SQLite 会话后端
kind: subsystem
tier: T2
pkg: session-backends
source:
  - packages/session-backends/sqlite-node/package.json
  - packages/session-backends/sqlite-node/src/index.ts
  - packages/session-backends/sqlite-node/src/sqlite/index.ts
  - packages/session-backends/sqlite-node/src/sqlite/repo.ts
  - packages/session-backends/sqlite-node/src/sqlite/storage.ts
  - packages/session-backends/sqlite-node/src/sqlite/session.ts
  - packages/session-backends/sqlite-node/src/sqlite/migrations.ts
  - packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql
  - packages/session-backends/sqlite-node/src/sqlite/sql.ts
  - packages/session-backends/sqlite-node/src/sqlite/types.ts
  - packages/session-backends/sqlite-node/src/sqlite/session/session-row.ts
  - packages/session-backends/sqlite-node/src/sqlite/session/entries.ts
  - packages/session-backends/sqlite-node/src/sqlite/session/values.ts
  - packages/session-backends/sqlite-node/src/sqlite/session/session-sequences.ts
  - packages/session-backends/sqlite-node/src/sqlite/session/session-stats.ts
  - packages/session-backends/sqlite-node/src/sqlite/session/usage-ledger.ts
  - packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts
  - packages/session-backends/sqlite-node/test/adapter.test.ts
  - packages/session-backends/sqlite-node/test/repo.test.ts
  - packages/session-backends/sqlite-node/test/sql.test.ts
  - packages/session-backends/sqlite-node/test/storage-conformance.test.ts
  - packages/session-backends/sqlite-node/test/repo-conformance.test.ts
symbols:
  - createNodeSqliteFactory
  - wrapNodeSqliteDatabase
  - SqliteSessionRepo
  - SqliteSessionRepoOptions
  - SqliteStorage
  - SqliteOpenSession
  - sql
  - SqlQuery
  - joinSqlFragments
  - applyInitialSchema
  - SqliteDatabase
  - SqliteDatabaseFactory
  - SqliteRunResult
  - SqliteStatement
  - SqliteSessionMetadata
  - SqliteSessionCreateOptions
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.session-tree
  - subsys.agent-core.session-search
  - subsys.agent-core.compaction
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: 9767ba275f
---

> `@earendil-works/pi-session-backend-sqlite-node` 是 `pi-agent-core` v4 `SessionRepo` / `Storage` 的可选 Node `node:sqlite` 实现：默认每个 session 一个 `.sqlite` 文件，也可经 `databasePath` 共用一个容器；权威状态是 `entries` + `scalar_values` + `list_values` + `usage_ledger`。没有 writer lease，也没有 FTS search。

## 能回答的问题

- 这个包当前版本是什么，默认是「每 session 一个 sqlite 文件」还是共享一个 `databasePath`？
- `SqliteSessionRepo` 怎样拥有连接、`StorageBackedSession`、`SqliteOpenSession` 与 disposal？
- entries / values / usage / branch cache 各自写什么表？
- branch index 何时延长、分叉，缺 cache 会怎样？
- `createSqliteSessionSearch()` 还在吗？

## 包边界

当前发布面是 `0.85.1`，要求 Node `>=22.19.0`，运行时依赖 `@earendil-works/pi-ai` 与 `@earendil-works/pi-agent-core` 均为 `^0.85.1`。根 export 再导出 `sql` 模板、capability types 与 sqlite 实现。[E: packages/session-backends/sqlite-node/package.json:3] [E: packages/session-backends/sqlite-node/package.json:35] [E: packages/session-backends/sqlite-node/package.json:39] [E: packages/session-backends/sqlite-node/src/index.ts:123]

`SqliteSessionRepo` 实现 agent-core 的 `SessionRepo` 形状（create/open/list/delete/fork/close），内部用 `SqliteStorage` 实现 `Storage`，再包成 `StorageBackedSession` + `SqliteOpenSession`。barrel **不**导出 search。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:157] [E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:49] [E: packages/session-backends/sqlite-node/src/sqlite/index.ts:1]

默认布局是 one file per session：`directory/${id}.sqlite`（id 只含 `[A-Za-z0-9_-]` 时原样；否则 `~` + UTF-16LE 的 base64url）。传入 `databasePath` 后，多个 session 共享一个容器，用 `session_id` 区分。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:32] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:40] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:442] [E: packages/session-backends/sqlite-node/test/repo.test.ts:493]

旧路径 `sqlite/storage/*.ts`、`search-backend.ts`、`writer-leases.ts`、`branch-cache.ts` 已删除。当前物理布局是 `sqlite/storage.ts` + `sqlite/session.ts` + `sqlite/session/*`。[E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:49] [E: packages/session-backends/sqlite-node/src/sqlite/session.ts:24]

打开旧 v4-lane / FTS 时代的 SQLite 文件时，`001_initial.sql` 用 `CREATE TABLE IF NOT EXISTS`，不会改写已有同名表；本包没有 migration ledger，也没有从旧 schema 升级的代码。打开 pre-0.85 文件后的具体失败形态未固定。[U] [E: packages/session-backends/sqlite-node/src/sqlite/migrations.ts:5] [E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:9]

## Node adapter 与 `sql` 模板

`createNodeSqliteFactory()` 用 `node:sqlite` 的 `DatabaseSync` 打开文件；`open` 可创建，`openExisting` 用 `mode=rw` URL 拒绝创建，`openReadOnly` 只读。`wrapNodeSqliteDatabase()` 把已有 `DatabaseSync` 包成 `SqliteDatabase`。测试锁住「existing / read-only open 不创建文件」。[E: packages/session-backends/sqlite-node/src/index.ts:106] [E: packages/session-backends/sqlite-node/src/index.ts:111] [E: packages/session-backends/sqlite-node/src/index.ts:116] [E: packages/session-backends/sqlite-node/src/index.ts:102] [E: packages/session-backends/sqlite-node/test/adapter.test.ts:17]

`transaction()` 执行 `BEGIN IMMEDIATE` / `COMMIT`，失败时尝试 `ROLLBACK` 并重抛原错误；若回调返回 thenable 则抛 `TypeError("SQLite transaction callbacks must be synchronous")` 并回滚。[E: packages/session-backends/sqlite-node/src/index.ts:78] [E: packages/session-backends/sqlite-node/src/index.ts:82]

`sql` 模板把插值编成 `?` 参数；嵌套 `SqlQuery` 则内联 SQL 文本并按原顺序拼接参数。`joinSqlFragments()` 用分隔符连接可信片段。`exec()` 拒绝带参数的查询。[E: packages/session-backends/sqlite-node/src/sqlite/sql.ts:38] [E: packages/session-backends/sqlite-node/src/sqlite/sql.ts:43] [E: packages/session-backends/sqlite-node/src/sqlite/sql.ts:56] [E: packages/session-backends/sqlite-node/src/sqlite/sql.ts:16] [E: packages/session-backends/sqlite-node/test/sql.test.ts:5]

## 数据模型

`001_initial.sql` 一次建齐当前 schema。权威表：

| 表 | 主键 / 唯一 | 职责 |
|---|---|---|
| `sessions` | `id` | catalog + 投影：`created_at`、`parent_session_id`、`storage_version`、opaque `metadata`、`message_count`、`usage_payload`、`next_seq`。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:9] |
| `entries` | `(session_id, id)` | canonical tree：`parent_id`、`seq`、`type`、`custom_type`、`timestamp`、payload JSON。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:20] |
| `scalar_values` | `(session_id, namespace, key)` | latest-wins value（branch tip、lane config、name/label、op state）。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:35] |
| `list_values` | `(session_id, namespace, key, seq)` | append-only list。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:44] |
| `usage_ledger` | `(session_id, id)` | usage 行；与 entry 共享 id 命名空间。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:53] |
| `branch_entries` / `branch_meta` | `(session_id, branch_id, entry_id)` / `(session_id, branch_id)` | 派生 branch index；canonical 仍是 `entries.parent_id`。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:94] [E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:111] |

没有 `lanes` / `records` / `facts` / `writer_leases` / FTS 表。entry/usage 交叉重复 id 与 missing parent 由 BEFORE INSERT trigger 拦截。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:69] [E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:84]

`SqliteSessionMetadata` 在通用 `SessionMetadata` 上只加 `path`（容器/分片的绝对路径）。`name` 不再是 metadata 列；它是 `pi.session.name` value。[E: packages/session-backends/sqlite-node/src/sqlite/session/session-row.ts:17] [E: packages/session-backends/sqlite-node/src/sqlite/session/session-row.ts:63]

`storage_version` 必须恰好等于 `SQLITE_STORAGE_VERSION`（1）：更新 → newer than；更旧 → requires migrations。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:24] [E: packages/session-backends/sqlite-node/src/sqlite/session/session-row.ts:57]

`decodeEntryRow()` 按 `type` 解析 payload；custom 缺 `custom_type` 抛错。[E: packages/session-backends/sqlite-node/src/sqlite/session/entries.ts:103] [E: packages/session-backends/sqlite-node/src/sqlite/session/entries.ts:118]

## Repository 与连接生命周期

每个打开的 session 持有**自己的** `SqliteDatabase` 连接（即使共享 `databasePath` 也是另开一条）。`openStorageBackedSession` 在 `onClose` 里 `db.close()`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:406] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:288]

create / open / fork / delete 用 `pendingIds` 拒绝同一 id 的重叠所有权（`Session is already open`）。没有跨进程 lease、fence、heartbeat 或 takeover。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:437] [E: packages/session-backends/sqlite-node/test/repo.test.ts:488]

`list()` 对 per-file 布局 `readdir` 目录下的 `*.sqlite`；对共享容器只打开 `databasePath`。每个文件只读打开，坏文件 / 不兼容版本 / 无关 sqlite **skip**，不让整个 list 失败。结果按 `createdAt` 降序。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:250] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:277] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:116]

`open(metadata)` 用 `realpath(pathForSession(id))` 与 `realpath(metadata.path)` 比较；不一致则 `SQLite session metadata path is outside this repository`。fork **允许**外来 source path：只读打开那个容器，不替换本 repo 里同 id 的活 session。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:426] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:385]

可写连接设 `PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`；只读连接只设 busy_timeout。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:64] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:68]

## 没有 writer lease

`001_initial.sql` 没有 `writer_leases` 表。host 必须保证一个 session 同时只有一个可写所有者；本包只挡住**本进程**对同一 id 的重叠 create/open/fork/delete。[E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:9] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:437] [I]

`SqliteOpenSession` 在 close 时等待已 admit 的 in-flight 调用，再关底层 `Session`（从而关 db）。二次 `open` 同一 metadata 会 `already open`。[E: packages/session-backends/sqlite-node/src/sqlite/session.ts:174] [E: packages/session-backends/sqlite-node/test/repo.test.ts:488]

## Commit、values、usage

`SqliteStorage.commit` 经 `commitQueue` 串行，在 `db.transaction` 里：`readNextSeq` → `prepareStorageCommit` → 按 kind 写表 → `advanceNextSeq` → 返回带当前 `readSessionStats` 的 `CommitResult`。[E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:67] [E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:163]

- `entry`：`EntryRowWriter.insert` + `appendEntryToBranchIndex`；`type === "message"` 时 `incrementMessageCount`。[E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:171]
- `usage`：`UsageLedgerRowWriter.insert` + `addUsageToSessionStats`。[E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:176]
- `value`：`setScalarValueRow`（UPSERT）或 `deleteScalarValueRow`。[E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:182] [E: packages/session-backends/sqlite-node/src/sqlite/session/values.ts:33]
- `list`：`appendListValueRow` 或 `deleteListValueRows`。[E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:189]

`next_seq` 存在 `sessions` 行上，不是独立的 `session_sequences` 表。[E: packages/session-backends/sqlite-node/src/sqlite/session/session-sequences.ts:4] [E: packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql:17]

stats 也在 `sessions` 行：`message_count` + `usage_payload` JSON。[E: packages/session-backends/sqlite-node/src/sqlite/session/session-stats.ts:30]

## Branch index

`appendEntryToBranchIndex()`：`parentId === null` 以该 entry id 为 `branch_id` 开新 root；parent 正好是某 `branch_meta.tip_entry_id` 则延长该 tip；否则从 parent 的 membership 复制 prefix（可截到最近 compaction）再分叉。[E: packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts:166] [E: packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts:84] [E: packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts:152]

`scanBranchEntries` 用 cache 段 + SQL predicates 应用 stop/type/cursor/limit。cache 缺失时 `readBranchMembership` 抛 `Branch cache missing entry`；实现**没有** `repairBranchCache()` API。[E: packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts:61] [E: packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts:246]

## Search：已退役

本包不导出 `createSqliteSessionSearch` / `SqliteSessionSearchHit`。search 契约的现状见 [subsys.agent-core.session-search](../agent-core/session-search.md)。[E: packages/session-backends/sqlite-node/src/sqlite/index.ts:1]

## 控制流

1. `create(options)`@`repo.ts:175`：`id = options.id ?? uuidv7(createdAt)`，`reserveId`，per-file 布局用 `wx` 预约空文件，`open` + `applyInitialSchema`，transaction 里 `insertSessionRow(..., FIRST_AVAILABLE_COMMIT_SEQ)`（`next_seq = 1`），返回 `SqliteOpenSession`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:179] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:205] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:27]
2. `open(metadata)`@`repo.ts:226`：校验 path 属于本 repo，`openExisting`，读 session 行核对 `storage_version`，复用同一套 open wrapper。本进程已占用该 id 则抛 already open。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:232] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:236]
3. `list()`@`repo.ts:250`：目录不存在 → `[]`；否则只读扫 catalog，不占 `pendingIds`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:259]
4. `append` / `setValue`：经 `SqliteOpenSession` → `StorageBackedSession.mutate` → `SqliteStorage.commit` 同步 transaction。[E: packages/session-backends/sqlite-node/src/sqlite/session.ts:84] [E: packages/session-backends/sqlite-node/src/sqlite/storage.ts:163]
5. `fork(source, options)`@`repo.ts:312`：若源在本 repo 打开，snapshot 排在源 `commitQueue` 上；否则只读外来 path。目标 session 在一个 transaction 里插 session 行、entries、scalar values、stats。`parentSessionId = source.id`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:93] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:350]
6. `delete(metadata)`@`repo.ts:287`：共享容器只 `deleteSessionRows`（entries/values/lists/usage/branch/session）；per-file 布局关连接后删 `${path}`、`${path}-wal`、`${path}-shm`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:295] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:306] [E: packages/session-backends/sqlite-node/src/sqlite/session/session-row.ts:92]
7. `close()`@`repo.ts:378`：`Promise.allSettled` 关闭全部 `SqliteOpenSession`；多个失败合成 `AggregateError`。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:399]

`create()` **不**建隐式 `main` branch，与 memory/JSONL conformance 一致。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:205] [E: packages/agent/src/harness/session/testing/conformance/session-repo.ts:158]

本包通过 `storage-conformance.test.ts` / `repo-conformance.test.ts` 跑 agent-core 的 backend fixture。[E: packages/session-backends/sqlite-node/test/storage-conformance.test.ts:4] [E: packages/session-backends/sqlite-node/test/repo-conformance.test.ts:6]

## 设计动机与权衡

默认 one-file-per-session 让单个 session 的 WAL 与删除范围隔离；`databasePath` 留给要跨 session 扫 catalog 的宿主。`metadata.path` 标识容器，不再暗示“这个文件只属于一个 session”。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:442] [E: packages/session-backends/sqlite-node/test/repo.test.ts:505] [I]

writer lease 被拿掉：host（例如 experimental session worker）负责单写者。本包只做进程内 `pendingIds` 互斥，避免自己 double-open。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:437] [I]

branch index 仍是派生加速层，但重建 API 不再公开；缺 cache 的 read 直接失败。[E: packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts:61] [I]

FTS 从本包抽走，避免 canonical write 与索引同事务耦合。搜索面见已退役的 [subsys.agent-core.session-search](../agent-core/session-search.md)。[I]

## Gotcha

- 默认不是“一个 repository 一个 sqlite 文件”。测试夹具两种布局都覆盖。[E: packages/session-backends/sqlite-node/test/repo.test.ts:493]
- `open` / `delete` 校验 `metadata.path` 必须解析到本 repo 为该 id 计算的路径；fork 的 **source** 可以是外来 path。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:431] [E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:389]
- 没有 `repairBranchCache`。branch cache 缺失会让 `scanBranch` 抛错，不会隐式 rebuild。[E: packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts:61]
- transaction 回调必须同步；把 `async` 函数丢进 `db.transaction` 会回滚。[E: packages/session-backends/sqlite-node/src/index.ts:83]
- 没有跨进程写锁。两个进程同时 `openExisting` 同一文件是不受支持的双写。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:233] [I]
- `list` 对坏文件 best-effort skip；`open` 同一文件则会因 schema/version 失败。[E: packages/session-backends/sqlite-node/src/sqlite/repo.ts:277]

## 跨包边界

- `subsys.agent-core.session-storage` 定义 v4 `SessionRepo` / `Storage` / `Session`：`commit(Write[])`、values、不抢锁的 list。本包是该契约的 Node SQLite 实现。
- `subsys.agent-core.session-tree` 定义 parent-linked entries 与 branch query；SQLite cache 只是派生加速层。
- `subsys.agent-core.compaction` 的 retained-tail / `stopAtType: "compaction"` 由查询方表达；分叉复制 prefix 时可用最近 compaction 作 base。[E: packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts:155]
- `subsys.agent-core.session-search` 只剩 `SessionSearchService` 类型。本包不再实现 FTS。
- `ref.coding-agent.session-format` 描述 coding-agent 默认 JSONL 产品格式。本包是可选 agent-core backend，不是 JSONL 文件格式的替换，也不是 coding-agent 默认磁盘格式。

## Sources

- packages/session-backends/sqlite-node/package.json
- packages/session-backends/sqlite-node/src/index.ts
- packages/session-backends/sqlite-node/src/sqlite/index.ts
- packages/session-backends/sqlite-node/src/sqlite/repo.ts
- packages/session-backends/sqlite-node/src/sqlite/storage.ts
- packages/session-backends/sqlite-node/src/sqlite/session.ts
- packages/session-backends/sqlite-node/src/sqlite/migrations.ts
- packages/session-backends/sqlite-node/src/sqlite/migrations/001_initial.sql
- packages/session-backends/sqlite-node/src/sqlite/sql.ts
- packages/session-backends/sqlite-node/src/sqlite/types.ts
- packages/session-backends/sqlite-node/src/sqlite/session/session-row.ts
- packages/session-backends/sqlite-node/src/sqlite/session/entries.ts
- packages/session-backends/sqlite-node/src/sqlite/session/values.ts
- packages/session-backends/sqlite-node/src/sqlite/session/session-sequences.ts
- packages/session-backends/sqlite-node/src/sqlite/session/session-stats.ts
- packages/session-backends/sqlite-node/src/sqlite/session/usage-ledger.ts
- packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts
- packages/session-backends/sqlite-node/test/adapter.test.ts
- packages/session-backends/sqlite-node/test/repo.test.ts
- packages/session-backends/sqlite-node/test/sql.test.ts
- packages/session-backends/sqlite-node/test/storage-conformance.test.ts
- packages/session-backends/sqlite-node/test/repo-conformance.test.ts

## 相关

- [subsys.agent-core.session-storage](../agent-core/session-storage.md): v4 `SessionRepo` / `Storage` 契约（`commit`、values、不抢锁的 list）。
- [subsys.agent-core.session-tree](../agent-core/session-tree.md): parent-linked entry 与 branch query 形状。
- [subsys.agent-core.session-search](../agent-core/session-search.md): 已退役的 search 实现 + 仍在的接口。
- [subsys.agent-core.compaction](../agent-core/compaction.md): branch 窗口的 compaction 截止语义。
- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent 默认 JSONL session 文件格式。
