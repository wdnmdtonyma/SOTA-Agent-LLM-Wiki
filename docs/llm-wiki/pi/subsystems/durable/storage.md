---
id: subsys.durable.storage
title: Durable Memory / JSONL / SQLite storage
kind: subsystem
tier: T2
pkg: durable
source:
  - packages/durable/package.json
  - packages/durable/README.md
  - packages/durable/src/ids.ts
  - packages/durable/src/storage/memory.ts
  - packages/durable/src/storage/jsonl/index.ts
  - packages/durable/src/storage/jsonl/storage.ts
  - packages/durable/src/storage/jsonl/node.ts
  - packages/durable/src/storage/sqlite/index.ts
  - packages/durable/src/storage/sqlite/storage.ts
  - packages/durable/src/storage/sqlite/node.ts
  - packages/durable/src/storage/sqlite/database.ts
  - packages/durable/src/storage/sqlite/migrations.ts
  - packages/durable/src/env/index.ts
  - packages/durable/src/env/node.ts
  - packages/durable/src/testing/index.ts
  - packages/durable/src/testing/runner.ts
  - packages/durable/src/testing/storage-conformance.ts
  - packages/durable/src/testing/storage-benchmark.ts
  - packages/durable/src/testing/types.ts
  - packages/durable/test/memory-storage.test.ts
  - packages/durable/test/jsonl-storage.test.ts
  - packages/durable/test/sqlite-storage.test.ts
  - packages/durable/test/storage.bench.ts
  - packages/durable/test/storage-runtime-boundary.test.ts
  - packages/durable/vitest.benchmark.config.ts
  - packages/coding-agent/src/core/session-manager.ts
symbols:
  - MemoryStorage
  - JsonlStorage
  - JsonlStorageOptions
  - openNodeJsonlStorage
  - SqliteStorage
  - SqliteDatabase
  - SqliteExecutor
  - openNodeSqliteStorage
  - openNodeSqliteDatabase
  - NodeSqliteDatabase
  - idFromNumber
  - seqFromNumber
  - registerStorageConformance
  - createStorageConformance
  - seedStorageBenchmark
  - STORAGE_READ_BENCHMARKS
  - STORAGE_WRITE_BENCHMARKS
related:
  - subsys.durable.runtime
  - subsys.durable.harness
  - spine.layered-architecture
  - ref.package-index
  - subsys.coding-agent.session-manager
  - subsys.chord.runtime
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `@earendil-works/pi-durable` 的 `Storage` 有三份 shipped 实现：detached `MemoryStorage`、portable `JsonlStorage`（`fsync` 默认 `false`）、portable `SqliteStorage`（**异步** `SqliteDatabase` facade；Node 适配 WAL + `synchronous = NORMAL`）。JSONL / SQLite 的 Node 绑定走子路径 `storage/jsonl/node` 与 `storage/sqlite/node`。这套 backend **不是** coding-agent `SessionManager` JSONL。

## 能回答的问题

- `MemoryStorage` / `JsonlStorage` / `SqliteStorage` 各自实现哪一层，谁包装谁？
- Node 应用该 import 哪个 subpath？portable 核心为什么不含 `node:`？
- JSONL `fsync` 默认是什么，打开后怎样落盘？
- SQLite facade 为什么是 async？Node adapter 怎样串行化 `BEGIN IMMEDIATE`？
- Node SQLite 为什么设 WAL 与 `synchronous = NORMAL`，close 时做什么？
- `mintId` / commit seq 怎样带上 `Id` / `Seq` brand？
- conformance 与 bench 从哪个 export / npm script 进？

## 职责边界

`Storage` 契约在 `types.ts`（权威节点 [subsys.durable.runtime](runtime.md)）。本节点只覆盖三份实现、Node adapters、ID 铸造边界、测试入口。`packages/durable/docs/pico*` 不是 shipped 存储实现。

package exports 把存储拆成显式 subpath：

| subpath | 源 | 角色 |
|---|---|---|
| `.` / `./storage/memory` | `src/storage/memory.ts` | `MemoryStorage`；根 barrel 也再导出 |
| `./storage/jsonl` | `src/storage/jsonl/index.ts` | portable `JsonlStorage` + `FileSystem` |
| `./storage/jsonl/node` | `src/storage/jsonl/node.ts` | `openNodeJsonlStorage()` |
| `./storage/sqlite` | `src/storage/sqlite/index.ts` | portable `SqliteStorage` + async `SqliteDatabase` facade + migrations |
| `./storage/sqlite/node` | `src/storage/sqlite/node.ts` | `openNodeSqliteStorage()` / `NodeSqliteDatabase` |
| `./testing` | `src/testing/index.ts` | conformance + benchmark seeds |
| `./env` / `./env/node` | `src/env/index.ts` / `node.ts` | portable `FileSystem` / `NodeExecutionEnv` |

[E: packages/durable/package.json:33] [E: packages/durable/package.json:39] [E: packages/durable/package.json:45] [E: packages/durable/package.json:51] [E: packages/durable/package.json:57] [E: packages/durable/package.json:63] [E: packages/durable/package.json:15] [E: packages/durable/package.json:21]

根 import 图不得进入 `storage/jsonl`、`storage/sqlite` 或 `env`；portable SQLite subpath 不得 import `storage/sqlite/node.ts`。[E: packages/durable/test/storage-runtime-boundary.test.ts:26] [E: packages/durable/test/storage-runtime-boundary.test.ts:28] [E: packages/durable/test/storage-runtime-boundary.test.ts:33] [E: packages/durable/test/storage-runtime-boundary.test.ts:35]

本包 JSONL 目录里的 `JsonlStorage` 实现 durable `Storage`（conversation / entry / task / document writes）。coding-agent 产品会话文件仍是 `SessionManager` JSONL（`CURRENT_SESSION_VERSION = 3`），schema 不同。[E: packages/coding-agent/src/core/session-manager.ts:41]

## 关键文件

- `packages/durable/src/storage/memory.ts`：`MemoryStorage`、`prepareCommit()`。[E: packages/durable/src/storage/memory.ts:219] [E: packages/durable/src/storage/memory.ts:250]
- `packages/durable/src/storage/jsonl/storage.ts`：`JsonlStorage`、`JsonlStorageOptions.fsync`。[E: packages/durable/src/storage/jsonl/storage.ts:76] [E: packages/durable/src/storage/jsonl/storage.ts:241]
- `packages/durable/src/storage/jsonl/node.ts`：`openNodeJsonlStorage()`。[E: packages/durable/src/storage/jsonl/node.ts:6]
- `packages/durable/src/storage/sqlite/database.ts`：**异步** `SqliteDatabase` / `SqliteExecutor` facade。[E: packages/durable/src/storage/sqlite/database.ts:11] [E: packages/durable/src/storage/sqlite/database.ts:35]
- `packages/durable/src/storage/sqlite/storage.ts`：`SqliteStorage.open()` / `commit()`。[E: packages/durable/src/storage/sqlite/storage.ts:144] [E: packages/durable/src/storage/sqlite/storage.ts:162]
- `packages/durable/src/storage/sqlite/node.ts`：WAL / `synchronous = NORMAL` / checkpoint。[E: packages/durable/src/storage/sqlite/node.ts:190] [E: packages/durable/src/storage/sqlite/node.ts:191] [E: packages/durable/src/storage/sqlite/node.ts:167]
- `packages/durable/src/testing/index.ts`：`registerStorageConformance`、`createStorageConformance`、benchmark exports。[E: packages/durable/src/testing/index.ts:2] [E: packages/durable/src/testing/index.ts:15]

## 数据模型

### branded ID 铸造

三份 backend 的 `mintId<I extends Id<string>>()` 都返回 `idFromNumber<I>(…)`，不直接把裸 `number` 交给 Session。[E: packages/durable/src/storage/memory.ts:397] [E: packages/durable/src/storage/memory.ts:400] [E: packages/durable/src/storage/sqlite/storage.ts:218] [E: packages/durable/src/storage/sqlite/storage.ts:221] JSONL 转调内部 `MemoryStorage.mintId`。[E: packages/durable/src/storage/jsonl/storage.ts:307] `prepareCommit` / SQLite `commit` 用 `seqFromNumber` 给 commit 序号打 `Seq` brand。[E: packages/durable/src/storage/memory.ts:244] [E: packages/durable/src/storage/sqlite/storage.ts:204] JSONL recover 也会对 sidecar 文件名里的数字 `idFromNumber<TaskId>` / `DocumentId`。[E: packages/durable/src/storage/jsonl/storage.ts:734] [E: packages/durable/src/storage/jsonl/storage.ts:737]

### `MemoryStorage`

完全在进程内实现 `Storage`。读写都 `clone()`，以匹配序列化 backend 的所有权边界，而不是做额外 validation。[E: packages/durable/src/storage/memory.ts:219] `nextId` 从 `2` 起（ID `1` 留给 `ROOT_CONVERSATION_ID`），`nextSeq` 从 `1` 起。[E: packages/durable/src/storage/memory.ts:241] [E: packages/durable/src/storage/memory.ts:242]

`prepareCommit(writes)` 先 clone/freeze、校验 global ID 与 document actions，再返回 `{ seq, writes, apply() }`；`apply()` 才改 observable state。[E: packages/durable/src/storage/memory.ts:250] 普通 `commit()` 就是 `prepareCommit(writes).apply()`。[E: packages/durable/src/storage/memory.ts:245] JSONL 复用这条 prepare 路径，先把 marker 写到磁盘再 `apply()`。

### `JsonlStorage`

portable JSONL：持有一份内部 `MemoryStorage`，目录里写 `main.jsonl` 与 `doc-<id>.jsonl` / `task-<id>.jsonl` sidecar。[E: packages/durable/src/storage/jsonl/storage.ts:29] [E: packages/durable/src/storage/jsonl/storage.ts:100] [E: packages/durable/src/storage/jsonl/storage.ts:246] 打开时需要 `FileSystem` capability（`@earendil-works/pi-durable/env`），`open()` 递归建目录、recover 已有 marker。[E: packages/durable/src/env/index.ts:96] [E: packages/durable/src/storage/jsonl/storage.ts:260] [E: packages/durable/src/storage/jsonl/storage.ts:273]

`JsonlStorageOptions.fsync` 默认 `false`：constructor 写 `this.fsync = options.fsync ?? false`。[E: packages/durable/src/storage/jsonl/storage.ts:78] [E: packages/durable/src/storage/jsonl/storage.ts:256] `fsync: true` 时，先 `flushFile` 每个受影响 sidecar，再 append `main.jsonl` 的 commit marker。[E: packages/durable/src/storage/jsonl/storage.ts:294] [E: packages/durable/src/storage/jsonl/storage.ts:300] reclaim 前也会 `flushFile(mainPath)`，临时 sidecar 在 rename 前 flush。[E: packages/durable/src/storage/jsonl/storage.ts:509] [E: packages/durable/src/storage/jsonl/storage.ts:527]

`openNodeJsonlStorage(directory, context, options?)` 用 `NodeExecutionEnv` 调 `JsonlStorage.open`。[E: packages/durable/src/storage/jsonl/node.ts:6] [E: packages/durable/src/storage/jsonl/node.ts:11] **第二个**参数是 Chord `Context`（典型调用传 `BACKGROUND_CONTEXT`）；第三个才是 `JsonlStorageOptions`。[E: packages/durable/src/storage/jsonl/node.ts:8] [E: packages/durable/src/storage/jsonl/node.ts:9]

源码不实现跨进程 file lock。JSONL 与 SQLite 都要求 **一个** owner 串行化对该目录 / 文件的 writes；`mintId()` 是实例内存计数器，跨进程 ID allocation 不支持。[E: packages/durable/README.md:527] [E: packages/durable/src/storage/memory.ts:410] SQLite Node adapter 只对 competing file lock 设了 `busyTimeoutMs`（默认 5_000 ms），那不是 ID 分配协议。[E: packages/durable/src/storage/sqlite/node.ts:13] [E: packages/durable/src/storage/sqlite/node.ts:17]

### 异步 `SqliteDatabase`

portable 核心吃 **异步** `SqliteDatabase` facade：`exec` / `run` / `get` / `all` / `transaction` / `close` 全部返回 `Promise`。[E: packages/durable/src/storage/sqlite/database.ts:12] [E: packages/durable/src/storage/sqlite/database.ts:13] [E: packages/durable/src/storage/sqlite/database.ts:36] [E: packages/durable/src/storage/sqlite/database.ts:37] `run` / `get` / `all` 用 SQL 文本加 positional bindings；adapter 可按 SQL 文本缓存 prepared statement。[E: packages/durable/src/storage/sqlite/database.ts:13] [E: packages/durable/src/storage/sqlite/node.ts:107]

`transaction(callback)` 把 callback 接到 transaction handle；callback 内的工作必须用该 handle，handle 在 callback settle 后失效。[E: packages/durable/src/storage/sqlite/database.ts:36] Node adapter 用 `SerialOperationQueue` 排队无关操作与其它 transaction，直到当前事务结束——因此在 callback 里再调 `database.transaction()` / `close()` 会等待自己，永不 settle。[E: packages/durable/src/storage/sqlite/node.ts:27] [E: packages/durable/src/storage/sqlite/node.ts:140] callback reject 时 Node adapter 先 `ROLLBACK` 再以同一 error reject；rollback 失败则 `AggregateError`。[E: packages/durable/src/storage/sqlite/node.ts:152] [E: packages/durable/src/storage/sqlite/node.ts:154]

设计目标是 Node、Bun、Cloudflare Durable Object SQLite：异步 facade 让 adapter 可以在 harness runtime 之外执行 SQL。[E: packages/durable/src/storage/sqlite/database.ts:36] [E: packages/durable/README.md:527]

`SqliteStorage.open(db)` 先 `applySqliteMigrations(db)`，再读 `durable_metadata`。[E: packages/durable/src/storage/sqlite/storage.ts:144] [E: packages/durable/src/storage/sqlite/storage.ts:146] 初始 schema 插入 `next_id = '2'`、`next_seq = 1`；`CURRENT_SQLITE_SCHEMA_VERSION` 来自 `SQLITE_MIGRATIONS` 最后一项（现在是 version 1）。[E: packages/durable/src/storage/sqlite/migrations.ts:15] [E: packages/durable/src/storage/sqlite/migrations.ts:88] [E: packages/durable/src/storage/sqlite/migrations.ts:90]

`commit()` 在 `db.transaction()` 里校验 ID、apply table writes 与 document actions，再更新 metadata 的 `next_id` / `next_seq`。[E: packages/durable/src/storage/sqlite/storage.ts:162] [E: packages/durable/src/storage/sqlite/storage.ts:166]

### Node SQLite：WAL + `NORMAL`

`openNodeSqliteDatabase(path, options?)` 在非 `:memory:` 路径上 `mkdir`，然后：

1. `PRAGMA journal_mode = WAL`[E: packages/durable/src/storage/sqlite/node.ts:190]
2. `PRAGMA synchronous = NORMAL`[E: packages/durable/src/storage/sqlite/node.ts:191]
3. `PRAGMA wal_autocheckpoint = ${checkpointPages}`，默认 1_000 页；`0` 关闭自动 checkpoint。[E: packages/durable/src/storage/sqlite/node.ts:11] [E: packages/durable/src/storage/sqlite/node.ts:16] [E: packages/durable/src/storage/sqlite/node.ts:192]

`NodeSqliteDatabase` 用 `SerialOperationQueue` 按调用顺序执行；异步操作占住队列直到 settle。[E: packages/durable/src/storage/sqlite/node.ts:27] [E: packages/durable/src/storage/sqlite/node.ts:132] `transaction()` 发 `BEGIN IMMEDIATE`，`await callback(...)`，成功 `COMMIT`，失败 `ROLLBACK`；rollback 再失败则 `AggregateError`。[E: packages/durable/src/storage/sqlite/node.ts:140] [E: packages/durable/src/storage/sqlite/node.ts:142] [E: packages/durable/src/storage/sqlite/node.ts:147] [E: packages/durable/src/storage/sqlite/node.ts:154]

`NodeSqliteDatabase.close()` 先 `PRAGMA wal_checkpoint(TRUNCATE)` 再 `database.close()`。[E: packages/durable/src/storage/sqlite/node.ts:167] [E: packages/durable/src/storage/sqlite/node.ts:169] `openNodeSqliteStorage(path, options?)` 是 `SqliteStorage.open(await openNodeSqliteDatabase(...))`，**不**接收 `Context`。[E: packages/durable/src/storage/sqlite/node.ts:205] [E: packages/durable/src/storage/sqlite/node.ts:209]

`synchronous = NORMAL` 下，已 acknowledge 的 commit 能挺过进程崩溃；掉电 / host failure 仍可能丢掉最新 commits。这是 adapter 选择，不是 `Storage` 契约保证。[E: packages/durable/README.md:524]

## 控制流

1. 调用方选 backend：测试用 `new MemoryStorage()`；Node 文件用 `openNodeJsonlStorage(dir, context)` 或 `openNodeSqliteStorage(path)`。[E: packages/durable/src/storage/memory.ts:219] [E: packages/durable/src/storage/jsonl/node.ts:6] [E: packages/durable/src/storage/sqlite/node.ts:205]
2. `createSession(storage)` 把该 `Storage` 交给 Session kernel（见 [subsys.durable.runtime](runtime.md)）。
3. JSONL `commit`：`memory.prepareCommit` → encode sidecar + marker → append sidecars → 可选 `flushFile` → append `main.jsonl` → `prepared.apply()` → 尽力 reclaim sidecar。[E: packages/durable/src/storage/jsonl/storage.ts:277] [E: packages/durable/src/storage/jsonl/storage.ts:279] [E: packages/durable/src/storage/jsonl/storage.ts:302]
4. SQLite `commit`：prepare document actions → `db.transaction(async …)`（Node adapter 内 `BEGIN IMMEDIATE`）→ 校验 / apply → bump `next_seq`。[E: packages/durable/src/storage/sqlite/storage.ts:166] [E: packages/durable/src/storage/sqlite/node.ts:142]
5. 打开已有 JSONL 目录时 `recover()` 重放完整 marker、截掉 torn line / 未确认 sidecar tail。[E: packages/durable/src/storage/jsonl/storage.ts:273] [E: packages/durable/src/storage/jsonl/storage.ts:534] [E: packages/durable/src/storage/jsonl/storage.ts:730] [E: packages/durable/src/storage/jsonl/storage.ts:801]
6. `close()` 后后续操作拒绝：Memory 抛 `MemoryStorage is closed`，JSONL 抛 `JsonlStorage is closed`，SQLite 抛 `SqliteStorage is closed`。[E: packages/durable/src/storage/memory.ts:808] [E: packages/durable/src/storage/jsonl/storage.ts:842] [E: packages/durable/src/storage/sqlite/storage.ts:868] SQLite `close()` 会等 admitted reads 排空再关底层 db。[E: packages/durable/src/storage/sqlite/storage.ts:506] [E: packages/durable/src/storage/sqlite/storage.ts:514]

## 设计动机与权衡

JSONL 把大 payload（live task、document content）放到 sidecar，`main.jsonl` 只留 commit marker 与 ordinal，recover 时以 marker 为准确认 sidecar 记录。[E: packages/durable/src/storage/jsonl/storage.ts:42] `fsync` 默认关闭，避免每个 commit 都 flush；需要 marker 前 sidecar 持久化时再打开。[E: packages/durable/src/storage/jsonl/storage.ts:256] [E: packages/durable/README.md:525]

SQLite 核心保持 **async** facade，这样 Bun / DO 可以不引入 Node `node:sqlite`，也可以把 SQL 执行放到 runtime 之外。[E: packages/durable/src/storage/sqlite/database.ts:36] Node 适配显式选 WAL + `NORMAL`：承认掉电窗口，换取默认吞吐。[E: packages/durable/src/storage/sqlite/node.ts:190] [E: packages/durable/src/storage/sqlite/node.ts:191]

`MemoryStorage.prepareCommit` 让 JSONL 能在磁盘 append 失败时不污染内存态：先 prepare，append 成功才 `apply()`。[E: packages/durable/src/storage/jsonl/storage.ts:279] [E: packages/durable/src/storage/jsonl/storage.ts:302]

## gotcha

- JSONL append sidecar 或 main marker 失败会 `poison`：之后必须 reopen，错误类型 `JsonlStoragePoisonedError`。[E: packages/durable/src/storage/jsonl/storage.ts:88] [E: packages/durable/src/storage/jsonl/storage.ts:836]
- `mintId()` 在 Memory / SQLite 上都是实例字段 `nextId++`，commit 时才把看到的最大 ID 写回。两个进程打开同一文件会分配冲突。[E: packages/durable/src/storage/memory.ts:410] [E: packages/durable/src/storage/sqlite/storage.ts:187]
- Node SQLite transaction callback **就是** async：`await callback(new NodeSqliteTransaction(...))`。不要再写成“callback 必须同步 / thenable 抛 TypeError”——那是旧同步 facade。[E: packages/durable/src/storage/sqlite/node.ts:145] [E: packages/durable/src/storage/sqlite/database.ts:36]
- 不要把本包的 `openNodeJsonlStorage("./session")` 目录当成 `~/.pi/agent/sessions/*.jsonl`。产品会话文件仍由 coding-agent `SessionManager` 管理。[E: packages/coding-agent/src/core/session-manager.ts:41]
- 不要把 durable SQLite 表（`durable_metadata` / `conversations` / `entries` / `documents`）写成其它包的 session schema。[E: packages/durable/src/storage/sqlite/migrations.ts:10]

## conformance / bench 入口

`@earendil-works/pi-durable/testing` 导出：

- `registerStorageConformance(runner, name, withStorage)`：接受 Vitest/Jest 风格 `{ describe, expect, it }`，内部 `createExpectAssertions` + `createStorageConformance`。[E: packages/durable/src/testing/runner.ts:12] [E: packages/durable/src/testing/index.ts:2]
- `createStorageConformance({ assertions, withStorage })`：runner-independent cases。`withStorage` 必须恰好 `await use(storage)` 一次。[E: packages/durable/src/testing/storage-conformance.ts:91] [E: packages/durable/src/testing/types.ts:12]
- `seedStorageBenchmark` / `seedStorageWriteBenchmark` / `STORAGE_READ_BENCHMARKS` / `STORAGE_WRITE_BENCHMARKS` / `STORAGE_MEMORY_SCALES`。[E: packages/durable/src/testing/index.ts:11] [E: packages/durable/src/testing/storage-benchmark.ts:88] [E: packages/durable/src/testing/storage-benchmark.ts:284] [E: packages/durable/src/testing/storage-benchmark.ts:409]

内置适配器用同一套 cases 注册：

- Memory：`registerStorageConformance(..., "MemoryStorage", (use) => use(new MemoryStorage()))`[E: packages/durable/test/memory-storage.test.ts:8]
- JSONL：`registerStorageConformance(..., "JsonlStorage", ...)`[E: packages/durable/test/jsonl-storage.test.ts:123]
- SQLite：`registerStorageConformance(..., "SqliteStorage", ...)`[E: packages/durable/test/sqlite-storage.test.ts:113]

npm scripts：`bench:storage` = `vitest bench --config vitest.benchmark.config.ts`（include `test/**/*.bench.ts`）；`bench:storage:memory` 跑 `test/storage-memory.ts` 足迹套件。[E: packages/durable/package.json:81] [E: packages/durable/package.json:82] [E: packages/durable/vitest.benchmark.config.ts:7] timing suite 在 `test/storage.bench.ts` 对 memory / sqlite / jsonl 跑同一组 read/write benchmarks。[E: packages/durable/test/storage.bench.ts:18] [E: packages/durable/test/storage.bench.ts:7] [E: packages/durable/test/storage.bench.ts:8]

这些 workload 是回归基线，不是生产容量上限，也不是 CI pass/fail 门槛。[I]

## 跨包边界

- Session kernel 与 tokens：[subsys.durable.runtime](runtime.md)。
- JSONL `FileSystem` 操作带 Chord `Context`；Node JSONL open 必须传入 `Context`。[E: packages/durable/src/storage/jsonl/node.ts:1] [E: packages/durable/src/storage/jsonl/node.ts:8]
- 产品 JSONL：[subsys.coding-agent.session-manager](../coding-agent/session-manager.md)。
- Harness 把任一 `Storage` 当 backend，不实现 SQLite：[subsys.durable.harness](harness.md)。
- 分层位置：[spine.layered-architecture](../../spine/layered-architecture.md)。

## Sources

- packages/durable/package.json
- packages/durable/README.md
- packages/durable/src/ids.ts
- packages/durable/src/storage/memory.ts
- packages/durable/src/storage/jsonl/index.ts
- packages/durable/src/storage/jsonl/storage.ts
- packages/durable/src/storage/jsonl/node.ts
- packages/durable/src/storage/sqlite/index.ts
- packages/durable/src/storage/sqlite/storage.ts
- packages/durable/src/storage/sqlite/node.ts
- packages/durable/src/storage/sqlite/database.ts
- packages/durable/src/storage/sqlite/migrations.ts
- packages/durable/src/env/index.ts
- packages/durable/src/env/node.ts
- packages/durable/src/testing/index.ts
- packages/durable/src/testing/runner.ts
- packages/durable/src/testing/storage-conformance.ts
- packages/durable/src/testing/storage-benchmark.ts
- packages/durable/src/testing/types.ts
- packages/durable/test/memory-storage.test.ts
- packages/durable/test/jsonl-storage.test.ts
- packages/durable/test/sqlite-storage.test.ts
- packages/durable/test/storage.bench.ts
- packages/durable/test/storage-runtime-boundary.test.ts
- packages/durable/vitest.benchmark.config.ts
- packages/coding-agent/src/core/session-manager.ts

## 相关

- [subsys.durable.runtime](runtime.md) - `createSession` / document tokens / `ROOT_CONVERSATION_ID`。
- [subsys.durable.harness](harness.md) - Harness 把 SQLite / JSONL / Memory 当 `Storage`。
- [spine.layered-architecture](../../spine/layered-architecture.md) - durable 插在 ai 与 agent 之间。
- [ref.package-index](../../reference/package-index.md) - workspace / exports / build 顺序。
- [subsys.coding-agent.session-manager](../coding-agent/session-manager.md) - 产品 JSONL `SessionManager` v3。
- [subsys.chord.runtime](../chord/runtime.md) - JSONL open 使用的 `Context`。
