---
id: peripheral.effect-sqlite
title: effect-(drizzle-)sqlite 适配包
kind: subsystem
tier: T2
v: na
source:
  - packages/effect-drizzle-sqlite/
  - packages/effect-sqlite-node/
  - specs/storage/effect-sqlite-package.md
  - packages/core/src/database/database.ts
  - packages/core/src/database/migration.ts
symbols: [EffectDrizzleSqlite, EffectSQLiteDatabase, EffectSQLiteSession, NodeSqliteClient, SqliteClient]
related: [persistence.database]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> `@opencode-ai/effect-drizzle-sqlite` 和 `@opencode-ai/effect-sqlite-node` 是两个 vendored generic adapter 包：前者把 Drizzle SQLite query builder 变成 Effect-yieldable，后者用 Node `node:sqlite` 实现 Effect `SqlClient`。

## 能回答的问题

- 为什么 opencode 自己 vendor Effect Drizzle SQLite adapter？
- `effect-drizzle-sqlite` 的 public surface 是什么？
- transaction/savepoint/rollback 如何实现？
- `effect-sqlite-node` 如何把 `DatabaseSync` 变成 Effect `SqlClient`？
- V2 `packages/core/src/database` 如何使用这两个包？

## 职责边界

storage spec 明确说明该包目标是“vendors the Drizzle `effect-sqlite` adapter shape”，不是 opencode storage abstraction [E: specs/storage/effect-sqlite-package.md:5]。同一 spec 要求包保持 generic：Drizzle + Effect + SQLite，不允许 opencode paths、migrations、tables、transaction hooks、post-commit behavior 或 domain language 进入包内 [E: specs/storage/effect-sqlite-package.md:7]。`packages/effect-drizzle-sqlite/AGENTS.md` 重复同一边界：runtime code 依赖 generic `effect/unstable/sql/SqlClient`，concrete SQLite clients 留在 tests/examples 或显式 driver helper，且不能放入 opencode-specific tables、paths、migrations、post-commit logic [E: packages/effect-drizzle-sqlite/AGENTS.md:5] [E: packages/effect-drizzle-sqlite/AGENTS.md:6] [E: packages/effect-drizzle-sqlite/AGENTS.md:7] [E: packages/effect-drizzle-sqlite/AGENTS.md:8]。

这两个包本身按本节点分类标为 `v: na`，它们不属于 V1/V2 session core 是 wiki 分层判断 [I]；但 `packages/core` 直接依赖它们，并在 V2 database layer 使用 `EffectDrizzleSqlite.makeWithDefaults()` [E: packages/core/package.json:91] [E: packages/core/package.json:92] [E: packages/core/src/database/database.ts:3] [E: packages/core/src/database/database.ts:13]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `specs/storage/effect-sqlite-package.md` | 设计动机、public surface、opencode adoption notes。 |
| `packages/effect-drizzle-sqlite/src/index.ts` | Public exports：`EffectLogger`、driver/session、migrator、namespace。 |
| `packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts` | `make`、`makeWithDefaults`、`EffectSQLiteDatabase`。 |
| `packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts` | SqlClient execution、transaction/savepoint semantics。 |
| `packages/effect-drizzle-sqlite/src/effect-sqlite/migrator.ts` | Drizzle migration file reader 到 Effect SQLite migrate 的桥。 |
| `packages/effect-sqlite-node/src/index.ts` | Node `DatabaseSync` backed Effect `SqlClient`。 |
| `packages/core/src/database/database.ts` | V2 database layer adoption。 |
| `packages/effect-drizzle-sqlite/test/sqlite.test.ts` | Adapter behavior tests。 |

## Public surface

`effect-drizzle-sqlite` package exports `EffectLogger`、`./effect-sqlite/driver`、`./effect-sqlite/session`、`migrate`，并把当前模块 namespace 作为 `EffectDrizzleSqlite` re-export [E: packages/effect-drizzle-sqlite/src/index.ts:1] [E: packages/effect-drizzle-sqlite/src/index.ts:2] [E: packages/effect-drizzle-sqlite/src/index.ts:3] [E: packages/effect-drizzle-sqlite/src/index.ts:4] [E: packages/effect-drizzle-sqlite/src/index.ts:6]。`package.json` 对外暴露 root、`./effect-sqlite`、`./effect-sqlite/migrator`、`./sqlite-core/effect` 四个 export [E: packages/effect-drizzle-sqlite/package.json:13] [E: packages/effect-drizzle-sqlite/package.json:14] [E: packages/effect-drizzle-sqlite/package.json:15] [E: packages/effect-drizzle-sqlite/package.json:16]。

spec 要求 public surface mirror Drizzle Effect adapters，示例是 `yield* EffectDrizzleSqlite.make({ relations }).pipe(Effect.provide(EffectDrizzleSqlite.DefaultServices))`、`yield* db.select().from(users)`、`yield* db.transaction(...)` [E: specs/storage/effect-sqlite-package.md:60] [E: specs/storage/effect-sqlite-package.md:63] [E: specs/storage/effect-sqlite-package.md:65] [E: specs/storage/effect-sqlite-package.md:67]。driver 中 `DefaultServices` 合并 `EffectCache.Default` 和 `EffectLogger.Default`，`makeWithDefaults` 只是 `make(config).pipe(Effect.provide(DefaultServices))` [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:28] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:75] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:77]。

## Driver 与 Session 控制流

1. `make(config)` 需要 Effect `SqlClient`、`EffectCache`、`EffectLogger` 三个 service [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:49] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:52] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:53] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:54]。
2. driver 创建 `SQLiteAsyncDialect`、relations、`EffectSQLiteSession`，再构造 `EffectSQLiteDatabase` [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:56] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:57] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:58] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:63]。
3. driver 把 `$client` 指向 generic `SqlClient`，并把 Drizzle cache invalidate 接到 Effect cache `onMutate` [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:64] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:66] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts:67]。
4. `EffectSQLiteSession.prepareQuery` 与 `prepareRelationalQuery` 都返回 `SQLiteEffectPreparedQuery`，执行函数闭包调用 `this.execute(query, params, method)` [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:62] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:63] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:86] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:87]。
5. `execute` 使用 `client.unsafe(query.sql, params)`；`values` 走 `statement.values`，`get` 取第一行，其他方法走 `withoutTransform` [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:104] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:105] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:106] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:107]。
6. transaction 若当前 fiber context 已有 transaction connection，就复用连接并增加 savepoint id；没有则 reserve 新 connection 和 scope [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:122] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:128] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:129] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:131] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:139]。
7. outer transaction 执行 `begin ${behavior ?? "deferred"}`；nested transaction 执行 `savepoint effect_sql_${id}` [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:143] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:145]。
8. success 时 outer transaction `commit`，commit 失败会 rollback 后 re-fail；nested success release savepoint [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:154] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:156] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:159] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:161] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:165]。
9. failure 时 outer transaction rollback；nested failure rollback to savepoint 后 release savepoint [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:167] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:168] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:170]。
10. `EffectSQLiteTransaction.transaction` delegates nested transaction back to session transaction [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:213] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts:217]。

## Migration adapter

`effect-sqlite/migrator.ts` 读取 Drizzle migration files，然后调用 `sqlite-core/effect/session` 的 `migrate` [E: packages/effect-drizzle-sqlite/src/effect-sqlite/migrator.ts:5] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/migrator.ts:8] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/migrator.ts:12] [E: packages/effect-drizzle-sqlite/src/effect-sqlite/migrator.ts:13]。`up-migrations/effect-sqlite.ts` 中的 `upgradeIfNeeded` 会检查 migrations table 是否存在；不存在返回 `{ newDb: true }`，存在则读取 column names 计算 migration table version 并按 version 执行 upgrade functions [E: packages/effect-drizzle-sqlite/src/up-migrations/effect-sqlite.ts:35] [E: packages/effect-drizzle-sqlite/src/up-migrations/effect-sqlite.ts:39] [E: packages/effect-drizzle-sqlite/src/up-migrations/effect-sqlite.ts:43] [E: packages/effect-drizzle-sqlite/src/up-migrations/effect-sqlite.ts:47] [E: packages/effect-drizzle-sqlite/src/up-migrations/effect-sqlite.ts:49] [E: packages/effect-drizzle-sqlite/src/up-migrations/effect-sqlite.ts:50] [E: packages/effect-drizzle-sqlite/src/up-migrations/effect-sqlite.ts:57]。

测试验证 migrations run once 并在 `__drizzle_migrations` 中记录 name：同一个 folder 调两次 `EffectDrizzleSqlite.migrate` 后只保留一条 migration name [E: packages/effect-drizzle-sqlite/test/sqlite.test.ts:152] [E: packages/effect-drizzle-sqlite/test/sqlite.test.ts:159] [E: packages/effect-drizzle-sqlite/test/sqlite.test.ts:160] [E: packages/effect-drizzle-sqlite/test/sqlite.test.ts:164] [E: packages/effect-drizzle-sqlite/test/sqlite.test.ts:165]。

## Node Sqlite Client

`@opencode-ai/effect-sqlite-node` 的 package 只 export root `./src/index.ts`，dependencies 只有 `effect` [E: packages/effect-sqlite-node/package.json:11] [E: packages/effect-sqlite-node/package.json:12] [E: packages/effect-sqlite-node/package.json:19] [E: packages/effect-sqlite-node/package.json:20]。它从 Node builtin `node:sqlite` 导入 `DatabaseSync`，并声明 `SqliteClient` 扩展 Effect `Client.SqlClient`，附带 `config` 和 `loadExtension(path)` [E: packages/effect-sqlite-node/src/index.ts:3] [E: packages/effect-sqlite-node/src/index.ts:23] [E: packages/effect-sqlite-node/src/index.ts:25] [E: packages/effect-sqlite-node/src/index.ts:26]。

`SqliteClientConfig` 包含 filename、readonly/create/readwrite、disableWAL、timeout、allowExtension、span attributes、query/result name transforms [E: packages/effect-sqlite-node/src/index.ts:33] [E: packages/effect-sqlite-node/src/index.ts:34] [E: packages/effect-sqlite-node/src/index.ts:35] [E: packages/effect-sqlite-node/src/index.ts:36] [E: packages/effect-sqlite-node/src/index.ts:37] [E: packages/effect-sqlite-node/src/index.ts:38] [E: packages/effect-sqlite-node/src/index.ts:39] [E: packages/effect-sqlite-node/src/index.ts:40] [E: packages/effect-sqlite-node/src/index.ts:41] [E: packages/effect-sqlite-node/src/index.ts:42]。`make(options)` 打开 `new DatabaseSync(options.filename, ...)`，启用 foreign key constraints，并在 scope finalizer 中 close DB [E: packages/effect-sqlite-node/src/index.ts:49] [E: packages/effect-sqlite-node/src/index.ts:59] [E: packages/effect-sqlite-node/src/index.ts:63] [E: packages/effect-sqlite-node/src/index.ts:66]。如果不是 readonly 且未禁用 WAL，它执行 `PRAGMA journal_mode = WAL;` [E: packages/effect-sqlite-node/src/index.ts:68] [E: packages/effect-sqlite-node/src/index.ts:69]。

Node client 用一个 semaphore 串行 connection access，并把 `transactionAcquirer` 绑定到当前 scope finalizer 释放 semaphore [E: packages/effect-sqlite-node/src/index.ts:132] [E: packages/effect-sqlite-node/src/index.ts:134] [E: packages/effect-sqlite-node/src/index.ts:135] [E: packages/effect-sqlite-node/src/index.ts:139]。`layer(config)` 同时向 context 提供 package-specific `SqliteClient` 和 generic `Client.SqlClient` [E: packages/effect-sqlite-node/src/index.ts:163] [E: packages/effect-sqlite-node/src/index.ts:166]。

## V2 core adoption

`packages/core/src/database/database.ts` 用 `EffectDrizzleSqlite.makeWithDefaults()` 构造 database，并在 layer 初始化时设置 WAL、synchronous NORMAL、busy_timeout 5000、cache_size -64000、foreign_keys ON、wal_checkpoint(PASSIVE)，然后执行 `DatabaseMigration.apply(db)` [E: packages/core/src/database/database.ts:13] [E: packages/core/src/database/database.ts:25] [E: packages/core/src/database/database.ts:27] [E: packages/core/src/database/database.ts:28] [E: packages/core/src/database/database.ts:29] [E: packages/core/src/database/database.ts:30] [E: packages/core/src/database/database.ts:31] [E: packages/core/src/database/database.ts:32] [E: packages/core/src/database/database.ts:33]。`layerFromPath(filename)` 通过 `#sqlite` adapter provide sqlite layer；`path()` 用 `OPENCODE_DB`、installation channel 和 `OPENCODE_DISABLE_CHANNEL_DB` 决定 database file path [E: packages/core/src/database/database.ts:4] [E: packages/core/src/database/database.ts:39] [E: packages/core/src/database/database.ts:40] [E: packages/core/src/database/database.ts:44] [E: packages/core/src/database/database.ts:50] [E: packages/core/src/database/database.ts:54]。

V2 migration layer 在 `packages/core/src/database/migration.ts` 定义 TypeScript `Migration`，创建自己的 `migration` table；它不直接用 Drizzle SQL folder migrator是从当前文件的实现形态得出的结论 [E: packages/core/src/database/migration.ts:12] [E: packages/core/src/database/migration.ts:23] [I]。发现旧 `__drizzle_migrations` 时，migration layer 会 seed 新 migration journal，避免老 SQL migrations 被重放 [E: packages/core/src/database/migration.ts:32] [E: packages/core/src/database/migration.ts:33] [E: packages/core/src/database/migration.ts:36] [E: packages/core/src/database/migration.ts:40]。每个 migration 在 `db.transaction` 中执行，且 `OPENCODE_SKIP_MIGRATIONS` 会跳过 `migration.up(tx)` 但仍写完成记录 [E: packages/core/src/database/migration.ts:47] [E: packages/core/src/database/migration.ts:49] [E: packages/core/src/database/migration.ts:51] [E: packages/core/src/database/migration.ts:53]。

## 设计动机与权衡

spec 选择先做 generic adapter，是因为 `SessionStorage` 不能解决核心 adapter 问题：如何让 Drizzle SQLite 在 repo 中 Effect-native [E: specs/storage/effect-sqlite-package.md:121] [E: specs/storage/effect-sqlite-package.md:123]。有了 Effect Drizzle SQLite package，opencode 可以在上层构建自己的 storage wrapper，并让 SessionStorage、MessageStorage、event store、projector writes 共用 transaction 和 migration model [E: specs/storage/effect-sqlite-package.md:125]。

spec 的 adoption notes 特别要求保留旧 `Database.use`/`Database.transaction` 中 nested transaction 看到当前 transaction、post-commit effects 排队等非显然语义，因为 `SyncEvent.run` 依赖 transaction composability 和 `behavior: "immediate"` sequencing correctness [E: specs/storage/effect-sqlite-package.md:87] [E: specs/storage/effect-sqlite-package.md:89] [E: specs/storage/effect-sqlite-package.md:90] [E: specs/storage/effect-sqlite-package.md:99]。当前 adapter 已用 transaction context/savepoint 实现 nested transaction，但 post-commit behavior 留给 opencode wrapper 层处理 [I]。

## Gotcha

- `effect-drizzle-sqlite` 是 private workspace package，尚不是 public npm package；`package.json` 有 `"private": true` [E: packages/effect-drizzle-sqlite/package.json:7]。
- Node client 的 `executeStream()` 目前 `Stream.die("executeStream not implemented")`，所以不要把它当完整 streaming SQL client [E: packages/effect-sqlite-node/src/index.ts:118] [E: packages/effect-sqlite-node/src/index.ts:119]。
- 测试用的是 Bun sqlite client layer `@effect/sql-sqlite-bun`，不是 `effect-sqlite-node`；Node package 是另一条 runtime adapter [E: packages/effect-drizzle-sqlite/test/sqlite.test.ts:6] [E: packages/effect-drizzle-sqlite/test/sqlite.test.ts:21] [E: packages/effect-sqlite-node/src/index.ts:3]。

## Sources

- `specs/storage/effect-sqlite-package.md`
- `packages/effect-drizzle-sqlite/AGENTS.md`
- `packages/effect-drizzle-sqlite/package.json`
- `packages/effect-drizzle-sqlite/src/index.ts`
- `packages/effect-drizzle-sqlite/src/effect-sqlite/driver.ts`
- `packages/effect-drizzle-sqlite/src/effect-sqlite/session.ts`
- `packages/effect-drizzle-sqlite/src/effect-sqlite/migrator.ts`
- `packages/effect-drizzle-sqlite/src/up-migrations/effect-sqlite.ts`
- `packages/effect-drizzle-sqlite/test/sqlite.test.ts`
- `packages/effect-sqlite-node/package.json`
- `packages/effect-sqlite-node/src/index.ts`
- `packages/core/package.json`
- `packages/core/src/database/database.ts`
- `packages/core/src/database/migration.ts`

## 相关

- `persistence.database`：V2 database layer 使用本节点的 adapter package；本节点只覆盖 generic adapter 和 adoption seam。
