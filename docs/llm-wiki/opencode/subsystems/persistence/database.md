---
id: persistence.database
title: V2 数据库(Drizzle/SQLite + 迁移)
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/database/database.ts
  - packages/core/src/database/migration.ts
  - packages/core/src/database/migration/
  - packages/core/src/event.ts
  - packages/opencode/src/storage/schema.ts
symbols:
  - Database.Service
  - Database.layer
  - DatabaseMigration.apply
  - Sqlite.Native
  - Sqlite.Drizzle
related:
  - ref.db-schema
  - peripheral.effect-sqlite
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 数据库是 `packages/core/src/database/` 中的 Effect-native Drizzle/SQLite service：`@opencode/v2/storage/Database` 提供 Effect Drizzle client，启动时设置 SQLite PRAGMAs 并应用 TypeScript migrations。

## 能回答的问题

- V2 database path 如何由 `OPENCODE_DB`、installation channel 和 data dir 决定。
- Bun 和 Node SQLite driver 如何通过 `#sqlite` 条件导入切换。
- migration journal 表和旧 Drizzle journal seed 行为是什么。
- 当前 core schema 表分散在哪些 `*.sql.ts` 文件。
- 为什么细表字段不放在本节点，而交给 `reference/db-schema`。

## 职责边界

`persistence.database` 覆盖 database runtime、driver split、migration engine 和表定义入口。逐列 DB schema、index、migration SQL 细节属于 `reference/db-schema`；V1 JSON KV 属于 `persistence.storage-v1`。

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `packages/core/src/database/database.ts` | Database service、SQLite PRAGMAs、path selection、default layer。 |
| `packages/core/src/database/sqlite.ts` | `Sqlite.Native` 与 `Sqlite.Drizzle` Context service tags。 |
| `packages/core/src/database/sqlite.bun.ts` | Bun `bun:sqlite` driver layer。 |
| `packages/core/src/database/sqlite.node.ts` | Node `node:sqlite` driver layer。 |
| `packages/core/src/database/migration.ts` | TypeScript migration journal 和 apply loop。 |
| `packages/core/src/database/migration.gen.ts` | 38 个 migration module 的 generated import list。 |
| `packages/core/src/**/*.sql.ts` | Drizzle table definitions。 |

## 数据模型

| 实体 | 字段/行为 | 证据 |
| --- | --- | --- |
| `Database.Service` | service tag 是 `@opencode/v2/storage/Database`，接口只暴露 `db: DatabaseShape`。 | [E: packages/core/src/database/database.ts:16][E: packages/core/src/database/database.ts:17][E: packages/core/src/database/database.ts:20] |
| `DatabaseShape` | `DatabaseShape` 是 `EffectDrizzleSqlite.makeWithDefaults()` 的 success type。 | [E: packages/core/src/database/database.ts:13][E: packages/core/src/database/database.ts:14] |
| `Sqlite.Native` | native SQLite handle context tag。 | [E: packages/core/src/database/sqlite.ts:7] |
| `Sqlite.Drizzle` | Drizzle client context tag，type 为 `ReturnType<typeof drizzle>`。 | [E: packages/core/src/database/sqlite.ts:4][E: packages/core/src/database/sqlite.ts:6][E: packages/core/src/database/sqlite.ts:8] |
| `DatabaseMigration.Migration` | migration record 是 `{ id: string; up(tx): Effect<void> }`。 | [E: packages/core/src/database/migration.ts:13][E: packages/core/src/database/migration.ts:14][E: packages/core/src/database/migration.ts:15] |
| `Timestamps` | shared SQL fragment 定义 `time_created` default `Date.now()` 与 `time_updated` on-update `Date.now()`。 | [E: packages/core/src/database/schema.sql.ts:4][E: packages/core/src/database/schema.sql.ts:6][E: packages/core/src/database/schema.sql.ts:7][E: packages/core/src/database/schema.sql.ts:9] |

## Runtime 控制流

1. `Database.layer` 先 yield `makeDatabase` 获取 Effect Drizzle SQLite client。[E: packages/core/src/database/database.ts:22][E: packages/core/src/database/database.ts:25]
2. startup 设置 SQLite PRAGMAs：WAL、NORMAL synchronous、busy_timeout 5000、cache_size -64000、foreign_keys ON、wal_checkpoint(PASSIVE)。[E: packages/core/src/database/database.ts:27][E: packages/core/src/database/database.ts:28][E: packages/core/src/database/database.ts:29][E: packages/core/src/database/database.ts:30][E: packages/core/src/database/database.ts:31][E: packages/core/src/database/database.ts:32]
3. PRAGMA 后调用 `DatabaseMigration.apply(db)`，再返回 `{ db }`。[E: packages/core/src/database/database.ts:33][E: packages/core/src/database/database.ts:35]
4. `layerFromPath(filename)` 把 core database layer 和 `#sqlite` resolved sqlite layer 组合起来。[E: packages/core/src/database/database.ts:39][E: packages/core/src/database/database.ts:40]
5. `Database.node` 在 `makeGlobalNode` 中调用 `path()`，再用 `layerFromPath(path())` 装配全局 database layer。[E: packages/core/src/database/database.ts:57]

## Path selection

| 条件 | 路径 | 证据 |
| --- | --- | --- |
| `OPENCODE_DB=":memory:"` 或 absolute path | 直接返回 flag value。 | [E: packages/core/src/database/database.ts:43][E: packages/core/src/database/database.ts:45] |
| `OPENCODE_DB` 是 relative path | 返回 `Global.Path.data/<OPENCODE_DB>`。 | [E: packages/core/src/database/database.ts:46] |
| channel 是 `latest`/`beta`/`prod`，或 `OPENCODE_DISABLE_CHANNEL_DB` 为 `1`/`true` | 返回 `Global.Path.data/opencode.db`。 | [E: packages/core/src/database/database.ts:49][E: packages/core/src/database/database.ts:50][E: packages/core/src/database/database.ts:51][E: packages/core/src/database/database.ts:53] |
| 其他 channel | 返回 `Global.Path.data/opencode-<sanitized-channel>.db`。 | [E: packages/core/src/database/database.ts:54] |

## Driver split

`packages/core/package.json` 的 `imports` 把 `#sqlite` 映射到 Bun/Node 两个 runtime-specific files：`bun` 和 `default` 指向 `sqlite.bun.ts`，`node` 指向 `sqlite.node.ts`。[E: packages/core/package.json:25][E: packages/core/package.json:26][E: packages/core/package.json:27][E: packages/core/package.json:28][E: packages/core/package.json:29]

### Bun driver

`sqlite.bun.ts` 使用 `bun:sqlite` 的 `Database` 和 `drizzle-orm/bun-sqlite`。[E: packages/core/src/database/sqlite.bun.ts:1][E: packages/core/src/database/sqlite.bun.ts:2] native layer 创建 `new Database(config.filename, { readonly, readwrite, create })`，finalizer close，默认执行 `PRAGMA journal_mode = WAL;`。[E: packages/core/src/database/sqlite.bun.ts:158][E: packages/core/src/database/sqlite.bun.ts:159][E: packages/core/src/database/sqlite.bun.ts:160][E: packages/core/src/database/sqlite.bun.ts:161][E: packages/core/src/database/sqlite.bun.ts:163][E: packages/core/src/database/sqlite.bun.ts:164] Bun driver 的 Effect SQL client 用一个 `Semaphore.make(1)` 串行 connection acquisition。[E: packages/core/src/database/sqlite.bun.ts:121][E: packages/core/src/database/sqlite.bun.ts:122]

### Node driver

`sqlite.node.ts` 使用 Node `node:sqlite` 的 `DatabaseSync` 和 `drizzle-orm/node-sqlite`。[E: packages/core/src/database/sqlite.node.ts:1][E: packages/core/src/database/sqlite.node.ts:2] native layer 创建 `new DatabaseSync(config.filename, { readOnly, timeout, allowExtension, enableForeignKeyConstraints, open })`，finalizer close；非 readonly 且未禁用 WAL 时执行 `PRAGMA journal_mode = WAL;`。[E: packages/core/src/database/sqlite.node.ts:151][E: packages/core/src/database/sqlite.node.ts:152][E: packages/core/src/database/sqlite.node.ts:153][E: packages/core/src/database/sqlite.node.ts:154][E: packages/core/src/database/sqlite.node.ts:155][E: packages/core/src/database/sqlite.node.ts:156][E: packages/core/src/database/sqlite.node.ts:158][E: packages/core/src/database/sqlite.node.ts:159] Node driver 也用 `Semaphore.make(1)` 保护 connection acquisition 和 transaction acquisition。[E: packages/core/src/database/sqlite.node.ts:115][E: packages/core/src/database/sqlite.node.ts:116][E: packages/core/src/database/sqlite.node.ts:117][E: packages/core/src/database/sqlite.node.ts:121]

## Migration engine

1. `DatabaseMigration.apply(db)` 用 module-level semaphore lock 包住 migration startup，避免同进程并发 apply。[E: packages/core/src/database/migration.ts:11][E: packages/core/src/database/migration.ts:18][E: packages/core/src/database/migration.ts:19]
2. startup 先枚举非 SQLite internal tables；已有 `session` 表时走 `applyOnly(db, migrations)`，有其它表但没有 `session` 时直接 die。[E: packages/core/src/database/migration.ts:21][E: packages/core/src/database/migration.ts:24][E: packages/core/src/database/migration.ts:25]
3. 空库路径在 transaction 里执行 generated `schema.up(tx)`，创建 `migration(id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)` journal 表，并把当前所有 migration id 写入 journal。[E: packages/core/src/database/migration.ts:26][E: packages/core/src/database/migration.ts:28][E: packages/core/src/database/migration.ts:30][E: packages/core/src/database/migration.ts:32][E: packages/core/src/database/migration.ts:34]
4. `applyOnly` 先创建 journal 表，已完成 migration IDs 从 `migration` 表读取成 Set。[E: packages/core/src/database/migration.ts:43][E: packages/core/src/database/migration.ts:45][E: packages/core/src/database/migration.ts:46][E: packages/core/src/database/migration.ts:48][E: packages/core/src/database/migration.ts:49]
5. 如果新 journal 为空，但存在旧 Drizzle `__drizzle_migrations` 表，migration engine 会把旧 journal 的 `name` seed 到新 `migration` 表；这样做避免 replay old SQL migrations 是由 source comment 和 seed 行为推断出的兼容动机。[E: packages/core/src/database/migration.ts:51][E: packages/core/src/database/migration.ts:55][E: packages/core/src/database/migration.ts:58][E: packages/core/src/database/migration.ts:59][E: packages/core/src/database/migration.ts:60][I]
6. 对每个 input migration，如果 ID 已完成则 skip；否则在 transaction 中执行 `migration.up(tx)` 并插入 journal row。[E: packages/core/src/database/migration.ts:69][E: packages/core/src/database/migration.ts:70][E: packages/core/src/database/migration.ts:71][E: packages/core/src/database/migration.ts:73][E: packages/core/src/database/migration.ts:75]
7. `migration.gen.ts` 用 generated `Promise.all([...imports])` 聚合 migration modules；当前 import list 从 `20260127222353_familiar_lady_ursula` 到 `20260622202450_simplify_session_input`，按文件逐项计数为 38 个 migration modules。[E: packages/core/src/database/migration.gen.ts:4][E: packages/core/src/database/migration.gen.ts:5][E: packages/core/src/database/migration.gen.ts:42][I]

## Table families

当前 core Drizzle schema 按 19 个 `sqliteTable` export 分散在多个 domain files，逐列字段以 `reference/db-schema` 为权威 catalog。[I]

| Family | Tables | 证据 |
| --- | --- | --- |
| Account | `account`, `account_state`, legacy `control_account`。 | [E: packages/core/src/account/sql.ts:6][E: packages/core/src/account/sql.ts:16][E: packages/core/src/account/sql.ts:26] |
| Project | `project`, `project_directory`。 | [E: packages/core/src/project/sql.ts:6][E: packages/core/src/project/sql.ts:21] |
| Session V1/V2 projection | `session`, `message`, `part`, `todo`, `session_message`, `session_input`, `session_context_epoch`。 | [E: packages/core/src/session/sql.ts:22][E: packages/core/src/session/sql.ts:68][E: packages/core/src/session/sql.ts:82][E: packages/core/src/session/sql.ts:100][E: packages/core/src/session/sql.ts:119][E: packages/core/src/session/sql.ts:140][E: packages/core/src/session/sql.ts:168] |
| EventV2 | `event_sequence`, `event`。 | [E: packages/core/src/event/sql.ts:4][E: packages/core/src/event/sql.ts:11] |
| Permission | `permission`。 | [E: packages/core/src/permission/sql.ts:8] |
| Share | `session_share`。 | [E: packages/core/src/share/sql.ts:5] |
| Control plane | `workspace`。 | [E: packages/core/src/control-plane/workspace.sql.ts:6] |
| Credential | `credential`。 | [E: packages/core/src/credential/sql.ts:8] |
| Data migration | `data_migration`。 | [E: packages/core/src/data-migration.sql.ts:3] |

## 设计动机与权衡

- storage spec 把 `@opencode-ai/effect-drizzle-sqlite` 定位成 vendored Drizzle Effect SQLite adapter，而不是 opencode domain storage abstraction。[E: specs/storage/effect-sqlite-package.md:5][E: specs/storage/effect-sqlite-package.md:7]
- storage spec 要求 public surface 尽量 mirror Drizzle Effect adapters，query builders 是 Effect-yieldable，transactions 是 Effect values。[E: specs/storage/effect-sqlite-package.md:53][E: specs/storage/effect-sqlite-package.md:54][E: specs/storage/effect-sqlite-package.md:60]
- root `AGENTS.md` 要求 Drizzle schema field names 用 snake_case，避免 column names 再写 string；当前 table files 如 `project_id`、`time_created`、`workspace_id` 遵循这个约束。[E: AGENTS.md:123][E: packages/core/src/project/sql.ts:23][E: packages/core/src/session/sql.ts:29][E: packages/core/src/database/schema.sql.ts:4]
- `specs/storage/remove-opencode-db.md` 说明 legacy `packages/opencode/src/storage/db.ts` 已删除，schema ownership 保留在 `packages/core/src/**/*.sql.ts`；V1 package 的 `storage/schema.ts` 当前 re-export core table definitions，属于兼容入口而非独立 V1 JSON schema。[E: specs/storage/remove-opencode-db.md:49][E: specs/storage/remove-opencode-db.md:220][E: specs/storage/remove-opencode-db.md:233][E: packages/opencode/src/storage/schema.ts:1][E: packages/opencode/src/storage/schema.ts:2][E: packages/opencode/src/storage/schema.ts:3][E: packages/opencode/src/storage/schema.ts:4][E: packages/opencode/src/storage/schema.ts:5][I]

## Gotchas

- migration directory 名字是单数 `packages/core/src/database/migration/`，不是 `migrations/`；`migration.gen.ts` import paths 也使用 `./migration/...`。[E: packages/core/src/database/migration.gen.ts:5]
- `Database.path()` 对 non-latest channel 默认隔离 DB file；设置 `OPENCODE_DISABLE_CHANNEL_DB` 会把 non-latest channel 也压回 `opencode.db`。[E: packages/core/src/database/database.ts:49][E: packages/core/src/database/database.ts:50][E: packages/core/src/database/database.ts:51][E: packages/core/src/database/database.ts:53]
- Bun 和 Node driver 都在 client 层用 semaphore 限制 connection acquisition；这不是 application-level transaction serialization，EventV2 另行用 immediate transaction、projectors、`EventSequenceTable` upsert 和 `EventTable` insert 做 durable event ordering。[E: packages/core/src/database/sqlite.bun.ts:121][E: packages/core/src/database/sqlite.node.ts:115][E: packages/core/src/event.ts:240][E: packages/core/src/event.ts:320][E: packages/core/src/event.ts:324][E: packages/core/src/event.ts:336][E: packages/core/src/event.ts:351][I]

## Sources

- `packages/core/src/database/database.ts`
- `packages/core/src/database/sqlite.ts`
- `packages/core/src/database/sqlite.bun.ts`
- `packages/core/src/database/sqlite.node.ts`
- `packages/core/src/database/migration.ts`
- `packages/core/src/database/migration.gen.ts`
- `packages/core/src/database/migration/`
- `packages/core/src/database/schema.sql.ts`
- `packages/core/src/event.ts`
- `packages/core/src/account/sql.ts`
- `packages/core/src/project/sql.ts`
- `packages/core/src/session/sql.ts`
- `packages/core/src/event/sql.ts`
- `packages/core/src/permission/sql.ts`
- `packages/core/src/share/sql.ts`
- `packages/core/src/control-plane/workspace.sql.ts`
- `packages/core/src/credential/sql.ts`
- `packages/core/src/data-migration.sql.ts`
- `packages/core/package.json`
- `packages/opencode/src/storage/schema.ts`
- `specs/storage/effect-sqlite-package.md`
- `specs/storage/remove-opencode-db.md`
- `AGENTS.md`

## 相关

- [V1 JSON 键值存储](storage-v1.md)
- [DB schema catalog](../../reference/db-schema.md)
- [effect-(drizzle-)sqlite 适配包](../peripheral/effect-sqlite.md)
