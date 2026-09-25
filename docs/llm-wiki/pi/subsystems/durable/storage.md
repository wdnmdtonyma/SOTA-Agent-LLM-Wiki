---
id: subsys.durable.storage
title: Durable Memory / JSONL / SQLite storage
kind: subsystem
tier: T2
pkg: durable
source:
  - packages/durable/package.json
  - packages/durable/README.md
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
symbols:
  - MemoryStorage
  - JsonlStorage
  - JsonlStorageOptions
  - openNodeJsonlStorage
  - SqliteStorage
  - SqliteDatabase
  - openNodeSqliteStorage
  - openNodeSqliteDatabase
  - NodeSqliteDatabase
  - registerStorageConformance
  - createStorageConformance
  - seedStorageBenchmark
  - STORAGE_READ_BENCHMARKS
  - STORAGE_WRITE_BENCHMARKS
related:
  - subsys.durable.runtime
  - spine.layered-architecture
  - ref.package-index
  - subsys.session-backends.sqlite-node
  - subsys.agent-core.jsonl-storage
  - subsys.agent-core.session-storage
  - subsys.chord.runtime
evidence: explicit
status: verified
updated: ff72faba28
---

> `@earendil-works/pi-durable` 的 `Storage` 有三份 shipped 实现：detached `MemoryStorage`、portable `JsonlStorage`（`fsync` 默认 `false`）、portable `SqliteStorage`（Node 适配 WAL + `synchronous = NORMAL`）。JSONL / SQLite 的 Node 绑定走子路径 `storage/jsonl/node` 与 `storage/sqlite/node`。这套 backend **不是** coding-agent `SessionManager` JSONL，也不是 `pi-session-backend-sqlite-node` 的 `SessionRepo`。

## 能回答的问题

- `MemoryStorage` / `JsonlStorage` / `SqliteStorage` 各自实现哪一层，谁包装谁？
- Node 应用该 import 哪个 subpath？portable 核心为什么不含 `node:`？
- JSONL `fsync` 默认是什么，打开后怎样落盘？
- Node SQLite 为什么设 WAL 与 `synchronous = NORMAL`，close 时做什么？
- conformance 与 bench 从哪个 export / npm script 进？

## 职责边界

`Storage` 契约在 `types.ts`（权威节点 [subsys.durable.runtime](runtime.md)）。本节点只覆盖三份实现、Node adapters、测试入口。

package exports 把存储拆成显式 subpath：

| subpath | 源 | 角色 |
|---|---|---|
| `.` / `./storage/memory` | `src/storage/memory.ts` | `MemoryStorage`；根 barrel 也再导出 |
| `./storage/jsonl` | `src/storage/jsonl/index.ts` | portable `JsonlStorage` + `FileSystem` |
| `./storage/jsonl/node` | `src/storage/jsonl/node.ts` | `openNodeJsonlStorage()` |
| `./storage/sqlite` | `src/storage/sqlite/index.ts` | portable `SqliteStorage` + `SqliteDatabase` facade + migrations |
| `./storage/sqlite/node` | `src/storage/sqlite/node.ts` | `openNodeSqliteStorage()` / `NodeSqliteDatabase` |
| `./testing` | `src/testing/index.ts` | conformance + benchmark seeds |
| `./env` / `./env/node` | `src/env/index.ts` / `node.ts` | portable `FileSystem` / `NodeExecutionEnv` |

[E: packages/durable/package.json:24] [E: packages/durable/package.json:29] [E: packages/durable/package.json:34] [E: packages/durable/package.json:39] [E: packages/durable/package.json:44] [E: packages/durable/package.json:49] [E: packages/durable/package.json:14] [E: packages/durable/package.json:19]

根 import 图不得进入 `storage/jsonl`、`storage/sqlite` 或 `env`；portable SQLite subpath 不得 import `storage/sqlite/node.ts`。[E: packages/durable/test/storage-runtime-boundary.test.ts:25] [E: packages/durable/test/storage-runtime-boundary.test.ts:27] [E: packages/durable/test/storage-runtime-boundary.test.ts:32] [E: packages/durable/test/storage-runtime-boundary.test.ts:34]

本包 JSONL 目录里的 `JsonlStorage` 实现 durable `Storage`（conversation / entry / task / document writes）。agent-core 的 `packages/agent/src/harness/session/jsonl/` 是另一套 v4 session JSONL。`pi-session-backend-sqlite-node` 实现 agent-core `SessionRepo`，表结构与 `durable_metadata` / `conversations` 不是同一 schema。

## 关键文件

- `packages/durable/src/storage/memory.ts`：`MemoryStorage`、`prepareCommit()`。[E: packages/durable/src/storage/memory.ts:211] [E: packages/durable/src/storage/memory.ts:239]
- `packages/durable/src/storage/jsonl/storage.ts`：`JsonlStorage`、`JsonlStorageOptions.fsync`。[E: packages/durable/src/storage/jsonl/storage.ts:71] [E: packages/durable/src/storage/jsonl/storage.ts:234]
- `packages/durable/src/storage/jsonl/node.ts`：`openNodeJsonlStorage()`。[E: packages/durable/src/storage/jsonl/node.ts:6]
- `packages/durable/src/storage/sqlite/database.ts`：同步 `SqliteDatabase` facade。[E: packages/durable/src/storage/sqlite/database.ts:26]
- `packages/durable/src/storage/sqlite/storage.ts`：`SqliteStorage.open()` / `commit()`。[E: packages/durable/src/storage/sqlite/storage.ts:166] [E: packages/durable/src/storage/sqlite/storage.ts:184]
- `packages/durable/src/storage/sqlite/node.ts`：WAL / `synchronous = NORMAL` / checkpoint。[E: packages/durable/src/storage/sqlite/node.ts:101] [E: packages/durable/src/storage/sqlite/node.ts:102] [E: packages/durable/src/storage/sqlite/node.ts:83]
- `packages/durable/src/testing/index.ts`：`registerStorageConformance`、`createStorageConformance`、benchmark exports。[E: packages/durable/src/testing/index.ts:2] [E: packages/durable/src/testing/index.ts:15]

## 数据模型

### `MemoryStorage`

完全在进程内实现 `Storage`。读写都 `clone()`，以匹配序列化 backend 的所有权边界，而不是做额外 validation。[E: packages/durable/src/storage/memory.ts:211] `nextId` 从 `2` 起（ID `1` 留给 `ROOT_CONVERSATION_ID`），`nextSeq` 从 `1` 起。[E: packages/durable/src/storage/memory.ts:230] [E: packages/durable/src/storage/memory.ts:231]

`prepareCommit(writes)` 先 clone/freeze、校验 global ID 与 document actions，再返回 `{ seq, writes, apply() }`；`apply()` 才改 observable state。[E: packages/durable/src/storage/memory.ts:239] [E: packages/durable/src/storage/memory.ts:249] 普通 `commit()` 就是 `prepareCommit(writes).apply()`。[E: packages/durable/src/storage/memory.ts:234] JSONL 复用这条 prepare 路径，先把 marker 写到磁盘再 `apply()`。

### `JsonlStorage`

portable JSONL：持有一份内部 `MemoryStorage`，目录里写 `main.jsonl` 与 `doc-<id>.jsonl` / `task-<id>.jsonl` sidecar。[E: packages/durable/src/storage/jsonl/storage.ts:22] [E: packages/durable/src/storage/jsonl/storage.ts:93] [E: packages/durable/src/storage/jsonl/storage.ts:239] 打开时需要 `FileSystem` capability（`@earendil-works/pi-durable/env`），`open()` 递归建目录、recover 已有 marker。[E: packages/durable/src/env/index.ts:95] [E: packages/durable/src/storage/jsonl/storage.ts:253]

`JsonlStorageOptions.fsync` 默认 `false`：constructor 写 `this.fsync = options.fsync ?? false`。[E: packages/durable/src/storage/jsonl/storage.ts:71] [E: packages/durable/src/storage/jsonl/storage.ts:249] `fsync: true` 时，先 `flushFile` 每个受影响 sidecar，再 append `main.jsonl` 的 commit marker。[E: packages/durable/src/storage/jsonl/storage.ts:287] [E: packages/durable/src/storage/jsonl/storage.ts:293]

`openNodeJsonlStorage(directory, context, options?)` 用 `NodeExecutionEnv` 调 `JsonlStorage.open`。[E: packages/durable/src/storage/jsonl/node.ts:6] [E: packages/durable/src/storage/jsonl/node.ts:11] **第二个**参数是 Chord `Context`（典型调用传 `BACKGROUND_CONTEXT`）；第三个才是 `JsonlStorageOptions`。[E: packages/durable/src/storage/jsonl/node.ts:8] [E: packages/durable/src/storage/jsonl/node.ts:9]

源码不实现跨进程 file lock。JSONL 与 SQLite 都要求 **一个** owner 串行化对该目录 / 文件的 writes；`mintId()` 是实例内存计数器，跨进程 ID allocation 不支持。[I] SQLite Node adapter 只对 competing file lock 设了 `busyTimeoutMs`（默认 5_000 ms），那不是 ID 分配协议。[E: packages/durable/src/storage/sqlite/node.ts:13] [E: packages/durable/src/storage/sqlite/node.ts:17] [E: packages/durable/src/storage/memory.ts:388]

### `SqliteStorage`

portable 核心吃同步 `SqliteDatabase` facade：`exec` / `prepare` / `transaction` / `close`。callback 必须同步；adapter 的 `transaction` 可以返回 Promise 等待结算。设计目标是 Node、Bun、Cloudflare Durable Object SQLite；远程异步 API（如 D1）不能实现这层 facade，需要另写 `Storage`。[E: packages/durable/src/storage/sqlite/database.ts:26] [E: packages/durable/src/storage/sqlite/database.ts:29] [E: packages/durable/README.md:30]

`SqliteStorage.open(db)` 先 `applySqliteMigrations(db)`，再读 `durable_metadata`。[E: packages/durable/src/storage/sqlite/storage.ts:166] [E: packages/durable/src/storage/sqlite/storage.ts:168] 初始 schema 插入 `next_id = '2'`、`next_seq = 1`；`CURRENT_SQLITE_SCHEMA_VERSION` 来自 `SQLITE_MIGRATIONS` 最后一项（现在是 version 1）。[E: packages/durable/src/storage/sqlite/migrations.ts:15] [E: packages/durable/src/storage/sqlite/migrations.ts:85] [E: packages/durable/src/storage/sqlite/migrations.ts:87]

`commit()` 在 `db.transaction()` 里校验 ID、apply table writes 与 document actions，再更新 metadata 的 `next_id` / `next_seq`。[E: packages/durable/src/storage/sqlite/storage.ts:184] [E: packages/durable/src/storage/sqlite/storage.ts:188]

### Node SQLite：WAL + `NORMAL`

`openNodeSqliteDatabase(path, options?)` 在非 `:memory:` 路径上 `mkdir`，然后：

1. `PRAGMA journal_mode = WAL`[E: packages/durable/src/storage/sqlite/node.ts:101]
2. `PRAGMA synchronous = NORMAL`[E: packages/durable/src/storage/sqlite/node.ts:102]
3. `PRAGMA wal_autocheckpoint = ${checkpointPages}`，默认 1_000 页；`0` 关闭自动 checkpoint。[E: packages/durable/src/storage/sqlite/node.ts:11] [E: packages/durable/src/storage/sqlite/node.ts:16] [E: packages/durable/src/storage/sqlite/node.ts:103]

`NodeSqliteDatabase.close()` 先 `PRAGMA wal_checkpoint(TRUNCATE)` 再 `database.close()`。[E: packages/durable/src/storage/sqlite/node.ts:79] [E: packages/durable/src/storage/sqlite/node.ts:83] `openNodeSqliteStorage(path, options?)` 是 `SqliteStorage.open(await openNodeSqliteDatabase(...))`，**不**接收 `Context`。[E: packages/durable/src/storage/sqlite/node.ts:116] [E: packages/durable/src/storage/sqlite/node.ts:120]

`synchronous = NORMAL` 下，已 acknowledge 的 commit 能挺过进程崩溃；掉电 / host failure 仍可能丢掉最新 commits。这是 adapter 选择，不是 `Storage` 契约保证。[I]

## 控制流

1. 调用方选 backend：测试用 `new MemoryStorage()`；Node 文件用 `openNodeJsonlStorage(dir, context)` 或 `openNodeSqliteStorage(path)`。[E: packages/durable/src/storage/memory.ts:211] [E: packages/durable/src/storage/jsonl/node.ts:6] [E: packages/durable/src/storage/sqlite/node.ts:116]
2. `createSession(storage)` 把该 `Storage` 交给 Session kernel（见 [subsys.durable.runtime](runtime.md)）。
3. JSONL `commit`：`memory.prepareCommit` → encode sidecar + marker → append sidecars → 可选 `flushFile` → append `main.jsonl` → `prepared.apply()` → 尽力 reclaim sidecar。[E: packages/durable/src/storage/jsonl/storage.ts:270] [E: packages/durable/src/storage/jsonl/storage.ts:272] [E: packages/durable/src/storage/jsonl/storage.ts:295]
4. SQLite `commit`：prepare document actions → `BEGIN IMMEDIATE` 事务（Node adapter）→ 校验 / apply → bump `next_seq`。[E: packages/durable/src/storage/sqlite/storage.ts:186] [E: packages/durable/src/storage/sqlite/node.ts:57]
5. 打开已有 JSONL 目录时 `recover()` 重放完整 marker、截掉 torn line / 未确认 sidecar tail。[E: packages/durable/src/storage/jsonl/storage.ts:266] [E: packages/durable/src/storage/jsonl/storage.ts:514] [E: packages/durable/src/storage/jsonl/storage.ts:710] [E: packages/durable/src/storage/jsonl/storage.ts:778]
6. `close()` 后后续操作拒绝：Memory 抛 `MemoryStorage is closed`，JSONL 抛 `JsonlStorage is closed`，SQLite 抛 `SqliteStorage is closed`。[E: packages/durable/src/storage/memory.ts:755] [E: packages/durable/src/storage/jsonl/storage.ts:819] [E: packages/durable/src/storage/sqlite/storage.ts:787]

## 设计动机与权衡

JSONL 把大 payload（live task、document content）放到 sidecar，`main.jsonl` 只留 commit marker 与 ordinal，recover 时以 marker 为准确认 sidecar 记录。[E: packages/durable/src/storage/jsonl/storage.ts:35] [E: packages/durable/src/storage/jsonl/storage.ts:743] `fsync` 默认关闭，避免每个 commit 都 flush；需要 marker 前 sidecar 持久化时再打开。

SQLite 核心保持同步 facade，这样 Bun / DO 可以不引入 Node `node:sqlite`。Node 适配显式选 WAL + `NORMAL`：承认掉电窗口，换取默认吞吐。[E: packages/durable/src/storage/sqlite/node.ts:101] [E: packages/durable/src/storage/sqlite/node.ts:102]

`MemoryStorage.prepareCommit` 让 JSONL 能在磁盘 append 失败时不污染内存态：先 prepare，append 成功才 `apply()`。[E: packages/durable/src/storage/jsonl/storage.ts:272] [E: packages/durable/src/storage/jsonl/storage.ts:295]

## gotcha

- JSONL append sidecar 或 main marker 失败会 `poison`：之后必须 reopen，错误类型 `JsonlStoragePoisonedError`。[E: packages/durable/src/storage/jsonl/storage.ts:81] [E: packages/durable/src/storage/jsonl/storage.ts:813]
- `mintId()` 在 Memory / SQLite 上都是实例字段 `nextId++`，commit 时才把看到的最大 ID 写回。两个进程打开同一文件会分配冲突。[E: packages/durable/src/storage/memory.ts:388] [E: packages/durable/src/storage/sqlite/storage.ts:207]
- Node SQLite `transaction()` 若 callback 返回 thenable 会抛 `TypeError("SQLite transaction callbacks must be synchronous")`。[E: packages/durable/src/storage/sqlite/node.ts:65]
- 不要把本包的 `openNodeJsonlStorage("./session")` 目录当成 `~/.pi/agent/sessions/*.jsonl`。产品会话文件仍由 coding-agent `SessionManager` 管理。
- 不要把 `openNodeSqliteStorage` 当成 `@earendil-works/pi-session-backend-sqlite-node`。后者的表是 agent-core v4 entries / values，不是 `durable_metadata`。[E: packages/session-backends/sqlite-node/package.json:4]

## conformance / bench 入口

`@earendil-works/pi-durable/testing` 导出：

- `registerStorageConformance(runner, name, withStorage)`：接受 Vitest/Jest 风格 `{ describe, expect, it }`，内部 `createExpectAssertions` + `createStorageConformance`。[E: packages/durable/src/testing/runner.ts:12] [E: packages/durable/src/testing/index.ts:2]
- `createStorageConformance({ assertions, withStorage })`：runner-independent cases。`withStorage` 必须恰好 `await use(storage)` 一次。[E: packages/durable/src/testing/storage-conformance.ts:80] [E: packages/durable/src/testing/types.ts:14]
- `seedStorageBenchmark` / `seedStorageWriteBenchmark` / `STORAGE_READ_BENCHMARKS` / `STORAGE_WRITE_BENCHMARKS` / `STORAGE_MEMORY_SCALES`。[E: packages/durable/src/testing/index.ts:11] [E: packages/durable/src/testing/storage-benchmark.ts:13]

内置适配器用同一套 cases 注册：

- Memory：`registerStorageConformance(..., "MemoryStorage", (use) => use(new MemoryStorage()))`[E: packages/durable/test/memory-storage.test.ts:7]
- JSONL：`registerStorageConformance(..., "JsonlStorage", ...)`[E: packages/durable/test/jsonl-storage.test.ts:101]
- SQLite：`registerStorageConformance(..., "SqliteStorage", ...)`[E: packages/durable/test/sqlite-storage.test.ts:90]

npm scripts：`bench:storage` = `vitest bench --config vitest.benchmark.config.ts`（include `test/**/*.bench.ts`）；`bench:storage:memory` 跑 `test/storage-memory.ts` 足迹套件。[E: packages/durable/package.json:66] [E: packages/durable/package.json:67] [E: packages/durable/vitest.benchmark.config.ts:7] timing suite 在 `test/storage.bench.ts` 对 memory / sqlite / jsonl 跑同一组 read/write benchmarks。[E: packages/durable/test/storage.bench.ts:18] [E: packages/durable/test/storage.bench.ts:7] [E: packages/durable/test/storage.bench.ts:8]

这些 workload 是回归基线，不是生产容量上限，也不是 CI pass/fail 门槛。[E: packages/durable/README.md:80]

## 跨包边界

- Session kernel 与 tokens：[subsys.durable.runtime](runtime.md)。
- JSONL `FileSystem` 操作带 Chord `Context`；Node JSONL open 必须传入 `Context`。[E: packages/durable/src/storage/jsonl/node.ts:1] [E: packages/durable/src/storage/jsonl/node.ts:8]
- agent-core JSONL：[subsys.agent-core.jsonl-storage](../agent-core/jsonl-storage.md)（v4 `JsonlSessionRepo`）。
- agent-core SQLite backend：[subsys.session-backends.sqlite-node](../session-backends/sqlite-node.md)。
- 分层位置：[spine.layered-architecture](../../spine/layered-architecture.md)。

## Sources

- packages/durable/package.json
- packages/durable/README.md
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

## 相关

- [subsys.durable.runtime](runtime.md) - `createSession` / document tokens / `ROOT_CONVERSATION_ID`。
- [spine.layered-architecture](../../spine/layered-architecture.md) - 11 包分层；durable 插在 ai 与 agent 之间。
- [ref.package-index](../../reference/package-index.md) - workspace / exports / build 顺序。
- [subsys.session-backends.sqlite-node](../session-backends/sqlite-node.md) - 另一套 Node SQLite，面向 agent-core `SessionRepo`。
- [subsys.agent-core.jsonl-storage](../agent-core/jsonl-storage.md) - agent-core v4 JSONL。
- [subsys.agent-core.session-storage](../agent-core/session-storage.md) - v4 `Session` / `Storage` / `SessionRepo`。
- [subsys.chord.runtime](../chord/runtime.md) - JSONL open 使用的 `Context`。
