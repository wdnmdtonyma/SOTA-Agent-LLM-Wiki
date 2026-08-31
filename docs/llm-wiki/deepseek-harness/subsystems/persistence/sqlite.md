---
id: subsys.persistence.sqlite
title: SQLite 后端
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-persistence-sqlite/src/index.ts
  - packages/session/session-persistence-sqlite/src/store.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/session/session-persistence-sqlite/src/codec.ts
  - packages/session/session-persistence-sqlite/src/compression.ts
  - packages/session/session-persistence-sqlite/resources/sql/schema.sql
  - packages/session/session-persistence-sqlite/tests/sqlite.spec.ts
  - packages/session/session-persistence-sqlite/tests/compression.spec.ts
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-persistence/src/coordinator.ts
  - packages/session/session-persistence/src/write-behind.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/session-query/session-query-sqlite/src/schema.ts
  - packages/storage/storage-sqlite/src/schema.ts
  - vendor/cordis/src/events.ts
  - packages/settings/settings/src/index.ts
  - packages/settings/settings/tests/settings.spec.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
symbols:
  - SqliteSessionPersistence
  - SqliteStore
  - SCHEMA_VERSION
  - openDatabase
  - SESSION_PERSISTENCE_SQLITE_APPLICATION_ID
  - packChunkRuns
  - scanRows
related:
  - spine.session-log
  - subsys.persistence.session-persistence
  - subsys.persistence.jsonl
  - subsys.core.session
  - subsys.persistence.checkpoint
  - subsys.persistence.session-query
  - subsys.persistence.storage
  - subsys.persistence.workspace
  - subsys.persistence.projection
  - subsys.persistence.settings
  - subsys.persistence.credentials
  - spine.capability-seams
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `SqliteSessionPersistence` 是 **host 面** 的可选 `SessionPersistence` Provider：一张 SQLite 库用 `persistence_state` / `sessions` / `events` 三表存 `SessionHeader` + 可打包的 append-only `SessionEvent`。物理 backend 是 `SqliteStore`（`PersistenceBackend<number>`，torn marker 是物理 `seq`）；写路径交给 `PersistenceCoordinator`。仓库有这个包，**六个 shipped bundle 都不挂它**；`dsh web` / `dsh --profile headless|sdk|acp` 叠 `dsh-base` 的 JSONL，`sdk-minimal` 自己 insert JSONL。这是 Cordis 组合运行时上可替换的 session 盘，不是内置 SQLite history。

## 能回答的问题

- `session-persistence-sqlite` 在不在 `dsh web` / headless / sdk / acp / sdk-minimal 的 shipped bundle 里？默认 backend 是谁？
- `SCHEMA_VERSION = 20`、`SESSION_FORMAT_VERSION = 0`、session-query schema `8`、storage-sqlite schema `1` 各钉哪一层？拒盘还是重建？
- 空盘怎样 stamp `user_version` / `application_id`？旧盘、更新盘、错 `application_id` 会不会原地 migration？
- 为什么 `create()` 之后 `list()` 仍空、第一笔 `append` 才出现 `sessions` 行？`ensureMaterialized` 如何物化空会话？`locate` 为什么永远 `undefined`？
- schema-20 怎样把连续 `assistant/chunk` 打成 `text-chunks` / `reasoning-chunks` / `tool-call-chunks`？`scanRows` 怎样切 torn tail？
- `session/event` 是 emit、`session/flush` 是 parallel，还是 waterfall？谁必须 `next()`？
- `load` 与 `inspect` 谁才 `commitRepair`？`loadStoredFrom` 怎么 SQL seek 打包行？

## 职责边界

本包拥有：`openDatabase` 的表布局门（`SCHEMA_VERSION` + `PRAGMA application_id`）、三表 DDL、schema-20 物理 codec（`packChunkRuns`）、把逻辑事件映射成 `events` 行、**单事务** `appendBatch` / `commitRepair` / `materializeHeader`、可寻址的 `loadStoredFrom`、`scanRows` 的 torn-tail 切法。插件 `SqliteSessionPersistence` 构造 `SqliteStore` 再 `new PersistenceCoordinator(ctx, this.store)`，把 `create` / `append` / `load` / `prepare` / `inspect` / `readFrom` / `ensureMaterialized` 委托给 coordinator。 [E: packages/session/session-persistence-sqlite/src/index.ts:78] [E: packages/session/session-persistence-sqlite/src/index.ts:83]

本包**不**拥有：`ctx.sessionPersistence` 的 Service Definition 与 write-behind / prepared cache / crash-tail 编排（[subsys.persistence.session-persistence](session-persistence.md) 的 `PersistenceCoordinator`）；append-only 词汇表、`deriveMessages`、`SESSION_FORMAT_VERSION`（[subsys.core.session](../core/session.md)）；shipped 默认盘 JSONL（[subsys.persistence.jsonl](jsonl.md)）；何时 `sessions.flush`（[subsys.persistence.checkpoint](checkpoint.md)）；FTS 派生库 `SESSION_QUERY_SQLITE_SCHEMA_VERSION = 8`（[subsys.persistence.session-query](session-query.md)）；非会话 `storage` + `storage-json` + `storage-domain`（现挂 **base**）以及未 shipped 的 `storage-sqlite` schema 1（[subsys.persistence.storage](storage.md)）；**只 web-app** 的 `workspace`（[subsys.persistence.workspace](workspace.md)）；`session-projection-cache`（现挂 **base**，[subsys.persistence.projection](projection.md)）；settings 分层与 credentials 文件（[subsys.persistence.settings](settings.md)、[subsys.persistence.credentials](credentials.md)）。compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete，本包不得把 log 当成可删 chat 数组。 [E: packages/core/session/src/types.ts:359] [E: packages/core/session/src/types.ts:361]

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `0`）。别的 version **没有**自动 migration：更新的盘叫人升级 harness，更旧的盘「本 build 无升级路径」。这跟本包 `PRAGMA user_version` 正交。 [E: packages/core/session/src/types.ts:51]
- SQLite **session 盘** `SCHEMA_VERSION = 20`：`user_version` 非 0 且不等于 20 → 拒开，原地不迁。本包 **不**在任何 shipped bundle。 [E: packages/session/session-persistence-sqlite/src/schema.ts:19] [E: packages/session/session-persistence-sqlite/src/schema.ts:125] [E: packages/session/session-persistence-sqlite/src/schema.ts:126]
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- settings 分层：schema defaults → composition `base` → user document。`SettingsScope.get` 读的是 `resolved`。 [E: packages/settings/settings/src/index.ts:117] [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/tests/settings.spec.ts:89]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。`.credentials.yaml` 的 `refs` 存的是 secret **值**，不是 ref。 [E: packages/llm/llm-deepseek/src/index.ts:178] [E: packages/credentials/credentials-local/src/index.ts:269] [E: packages/credentials/credentials-local/src/index.ts:284]
- **base 已挂** `storage` + `storage-json`（`root: dshHomePath('storages')`）+ `storage-domain`、`session-projection-cache`。`workspace` **只 web-app**。`storage-sqlite` 与本包一样未 shipped。 [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:148] [E: packages/bundle/base/cordis.patch.yml:153] [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/web-app/cordis.patch.yml:61]

这是 **host 面** provider。agent-preset 面不 remount persistence。默认 GUI 入口是 `dsh web`（profile `web`）；另有 `dsh --profile headless|sdk|sdk-minimal|acp`。本仓没有 shipped TUI 包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-persistence-sqlite/src/index.ts` | `SqliteSessionPersistence`：Config、`locate`、委托 coordinator |
| `packages/session/session-persistence-sqlite/src/store.ts` | `SqliteStore`：`openDatabase`、`appendBatch` / `commitRepair` / `loadStoredFrom` |
| `packages/session/session-persistence-sqlite/src/schema.ts` | `SCHEMA_VERSION = 20`、`SESSION_PERSISTENCE_SQLITE_APPLICATION_ID`、`openDatabase` |
| `packages/session/session-persistence-sqlite/src/codec.ts` | schema-20 `packChunkRuns`、打包上限 |
| `packages/session/session-persistence-sqlite/src/compression.ts` | 物理行编解码、`scanRows` |
| `packages/session/session-persistence-sqlite/resources/sql/schema.sql` | 三表 STRICT DDL |
| `packages/session/session-persistence-sqlite/tests/sqlite.spec.ts` | 拒盘、WAL busy、stale append、`locate === undefined`、空会话物化 |
| `packages/session/session-persistence-sqlite/tests/compression.spec.ts` | torn vs committed 物理坏行 |
| `packages/session/session-persistence/src/index.ts` | Definition：`SessionPersistence` / `ctx.sessionPersistence` |
| `packages/session/session-persistence/src/coordinator.ts` | `session/created\|event\|flush\|disposed`；lazy `create`；`load` vs `inspect` |
| `packages/session/session-persistence/src/write-behind.ts` | 默认 200ms 合批 |
| `packages/core/session/src/index.ts` | `session/event` emit；`session/flush` **parallel** |
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION = 0` |
| `packages/session/session-checkpoint-policy/src/index.ts` | waterfall 里 `flush` 后再 `next()` |
| `packages/bundle/base/cordis.patch.yml` | shipped 行是 `session-persistence-jsonl`，没有 sqlite |
| `packages/bundle/web-app/cordis.patch.yml` | 不换 session 盘；重写 `session-query-sqlite`；insert `workspace` |
| `packages/bundle/headless/cordis.patch.yml` | 不重挂 persistence |
| `packages/bundle/sdk-app/cordis.patch.yml` / `acp-app` | overlay 不换盘 |
| `packages/bundle/sdk-minimal/cordis.patch.yml` | 完整 insert JSONL（不叠 base） |
| `packages/session-query/session-query-sqlite/src/schema.ts` | 派生检索 schema **8** / `0x44534851` |
| `packages/storage/storage-sqlite/src/schema.ts` | 非会话 storage schema **1**（实现了、未 shipped） |
| `packages/settings/settings/src/index.ts` | `SettingsScope.get`：schema defaults → composition `base` → user |
| `packages/llm/llm-deepseek/src/index.ts` | Config `apiKeyEnv` + `role('credential-ref')` |
| `packages/credentials/credentials-local/src/index.ts` | `refs` 存 secret 值 |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SCHEMA_VERSION` | 表布局版本，现为 `20`，写入 `PRAGMA user_version`。只在 **空盘**（`user_version === 0` 且无 user objects、`application_id === 0`）stamp。非 0 且 ≠ 20 → `incompatible with this build`，**原地不迁**。 [E: packages/session/session-persistence-sqlite/src/schema.ts:19] [E: packages/session/session-persistence-sqlite/src/schema.ts:125] [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:568] |
| `SESSION_PERSISTENCE_SQLITE_APPLICATION_ID` | `0x44534850`（四字符 `DSHP`）。当前版本盘若 `application_id` 对不上同样拒。 [E: packages/session/session-persistence-sqlite/src/schema.ts:21] [E: packages/session/session-persistence-sqlite/src/schema.ts:130] |
| `SESSION_FORMAT_VERSION` | `SessionHeader.version`，现为 `0`。新 header 必须等于 0；别的 version **没有**跨 version migration。这跟 `PRAGMA user_version` 正交。 [E: packages/core/session/src/types.ts:51] |
| `SESSION_QUERY_SQLITE_SCHEMA_VERSION` | 检索派生库为 **8**，`application_id = 0x44534851`（`DSHQ`）。版本不匹配 → `resetDerivedSchema` **丢派生表重建**，与本包「拒盘」相反。 [E: packages/session-query/session-query-sqlite/src/schema.ts:8] [E: packages/session-query/session-query-sqlite/src/schema.ts:11] [E: packages/session-query/session-query-sqlite/src/schema.ts:66] |
| `STORAGE_SQLITE_SCHEMA_VERSION` | 非会话 KV 为 **1**，不匹配也拒；`storage-sqlite` **未** 进任何 shipped bundle。shipped 的 `storage` + `storage-json` + `storage-domain` 在 **base**。 [E: packages/storage/storage-sqlite/src/schema.ts:20] [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:148] [E: packages/bundle/base/cordis.patch.yml:153] |
| `persistence_state` | 单行 `singleton = 1` + `store_id`（打开时 `INSERT` 一枚 UUID）。revision 字符串带上它。 [E: packages/session/session-persistence-sqlite/resources/sql/schema.sql:1] [E: packages/session/session-persistence-sqlite/src/schema.ts:209] |
| `sessions` | 一行一个已物化会话：整数 PK `id` + `session_key` UNIQUE（逻辑 `SessionId`）+ header 列 + `incarnation` + `revision`。行的**存在**就是物化信号。 [E: packages/session/session-persistence-sqlite/resources/sql/schema.sql:6] |
| `events` | 一条**物理**记录一行；`PRIMARY KEY (session_id, seq)`；`data` / `source_event_seqs` 可为 TEXT 或 BLOB；`surface_op` 是 JSON TEXT；`ignorable` 为 0/1 或 NULL。打包行用 `type`=`text-chunks` 等。 [E: packages/session/session-persistence-sqlite/resources/sql/schema.sql:21] [E: packages/session/session-persistence-sqlite/src/codec.ts:33] |
| `packChunkRuns` | 连续 ≥3 条同类 `assistant/chunk`（text / reasoning / tool-call delta）打成一条物理行；最多 1024 成员、数据列最多 1MiB UTF-8。 [E: packages/session/session-persistence-sqlite/src/codec.ts:42] [E: packages/session/session-persistence-sqlite/src/codec.ts:181] |
| `JournalMode` | `'wal' \| 'delete' \| 'truncate' \| 'persist'`。Config 默认 `'wal'`。禁止 `memory` / `off`（`:memory:` 路径由 SQLite 自己选 `memory` journal）。 [E: packages/session/session-persistence-sqlite/src/schema.ts:50] [E: packages/session/session-persistence-sqlite/src/index.ts:62] |
| `supportsRawArtifacts` | `false`。`locate` 恒返回 `undefined`（一库多会话，没有诚实的逐会话路径）。 [E: packages/session/session-persistence-sqlite/src/index.ts:55] [E: packages/session/session-persistence-sqlite/src/index.ts:95] |
| revision | `` `${storeIdentity}:incarnation:${row.incarnation}:revision:${row.revision}` ``。文件盘的 `storeIdentity` 含 `dev:ino:birthtimeNs` + `store_id`。每次突变事务 `revision + 1`。 [E: packages/session/session-persistence-sqlite/src/store.ts:125] [E: packages/session/session-persistence-sqlite/src/store.ts:408] |
| `tornMarker` | `number`：从该**物理** `seq` 起 DELETE 的 never-committed tail。`scanRows` 在最后一条可解析含 `turn/end` 的物理行**之后**的坏行或 seq 洞停下；洞若落在已提交区间则抛 corrupt。 [E: packages/session/session-persistence-sqlite/src/compression.ts:323] [E: packages/session/session-persistence-sqlite/src/compression.ts:335] |

`Config.path` **没有**默认值：必须显式给文件路径或测试用 `:memory:`。`preparedSessionCacheSize` 默认 5，`writeBatchMaxDelayMs` 默认 200，`busyTimeoutMs` 默认 5000。 [E: packages/session/session-persistence-sqlite/src/index.ts:61] [E: packages/session/session-persistence/src/coordinator.ts:28] [E: packages/session/session-persistence/src/coordinator.ts:31] [E: packages/session/session-persistence-sqlite/src/index.ts:33]

## 控制流

1. **组合真树不挂本包。** `dsh-base` 的 persistence 行是 `id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: dshHomePath('sessions')`。base 的 `package.json` 只声明 jsonl，不声明 sqlite。web-app **不换 session 盘**，只把检索行 `session-query-sqlite` 再写一遍（`path: ':memory:'`、`openAt: never`），并 insert **只 web-app** 的 `workspace`。headless / sdk / acp overlay 不重挂 jsonl / sqlite / checkpoint。`sdk-minimal` 不叠 base，自己 insert JSONL（`compression: none`）。要把 SQLite 当成 `ctx.sessionPersistence`，必须在用户 profile / `--patch` 里自己 `plugin`，并换掉或禁用 jsonl 行，避免两个插件抢同一个 `ctx.sessionPersistence` 键。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:111] [E: packages/bundle/base/package.json:78] [E: packages/bundle/web-app/cordis.patch.yml:26] [E: packages/bundle/web-app/cordis.patch.yml:61] [E: packages/bundle/headless/cordis.patch.yml:1] [E: packages/bundle/sdk-minimal/cordis.patch.yml:120]

2. **`openDatabase` 先持写锁再决定 stamp 或拒。** `SqliteStore.openDb`：非 `:memory:` 则 `mkdir(..., 0o700)` + `wx`/`0o600` 建文件，再 `openDatabase`。打开时先关 `trusted_schema`、关 mmap。`configureDatabase`：`PRAGMA foreign_keys = ON`，`BEGIN IMMEDIATE`，读 `user_version` / `application_id` / user object 计数。`user_version === 0` 但已有 `application_id` 或任何非 `sqlite_*` 对象 → `unversioned schema or application identity`，**不 stamp、不改 journal**。`user_version !== 0 && !== 20` → `incompatible with this build`。`user_version === 20` 但 `application_id !== 0x44534850` → 报 expected id。只有干净空盘才 `CREATE TABLE` 三表、插入 `store_id`、`PRAGMA application_id` / `user_version = 20`，然后 `COMMIT`。`journal_mode` 在这次 COMMIT **之后**才设（可 busy 重试），拒盘路径不会把别人的库改成 WAL。随后强制 `synchronous=FULL`。测试把 `user_version=16` 钉成拒盘。 [E: packages/session/session-persistence-sqlite/src/schema.ts:117] [E: packages/session/session-persistence-sqlite/src/schema.ts:122] [E: packages/session/session-persistence-sqlite/src/schema.ts:125] [E: packages/session/session-persistence-sqlite/src/schema.ts:135] [E: packages/session/session-persistence-sqlite/src/schema.ts:153] [E: packages/session/session-persistence-sqlite/src/schema.ts:179] [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:568]

3. **插件只 provide 一个 host 键。** `static inject = ['sessions']`。基类 `SessionPersistence` 以 `super(ctx, 'sessionPersistence')` 注册 `ctx.sessionPersistence`。实例 `name` 刻意写成 `'session-persistence-sqlite'`。构造函数立刻 `new SqliteStore` + `new PersistenceCoordinator(this.ctx, this.store, { preparedSessionCacheSize, writeBatchMaxDelayMs })`。`Service.init` 只 `validatePath`，真正 `openDatabase` 推迟到第一次 persistence 操作。 [E: packages/session/session-persistence-sqlite/src/index.ts:58] [E: packages/session/session-persistence/src/index.ts:107] [E: packages/session/session-persistence-sqlite/src/index.ts:83] [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:720]

4. **coordinator 安装写路径：emit / parallel，没有 `next()`。** `installWritePath` 注册：`session/created` → `initFor`（HMR 还会扫已有 live session）；`session/event` → `live.writes.enqueue(event)`（`SessionWriteBehind.enqueue` 里 `structuredClone`）；`session/flush` → `this.flush(session)`；`session/disposed` → `retire`（再 flush 一次）。`session/event` 的声明是 `@mode emit`。`session/flush` 的声明是 `@mode parallel`：`SessionStore.flush` 对全部 listener `Promise.allSettled`，**没有** `next` 参数。热路径 `append` 不碰盘；合批窗默认 200ms。 [E: packages/session/session-persistence/src/coordinator.ts:1200] [E: packages/session/session-persistence/src/coordinator.ts:1205] [E: packages/session/session-persistence/src/coordinator.ts:1211] [E: packages/session/session-persistence/src/write-behind.ts:48] [E: packages/core/session/src/index.ts:74] [E: packages/core/session/src/index.ts:83] [E: packages/core/session/src/index.ts:1024]

5. **`create` 只记意图；空会话要 `ensureMaterialized`。** coordinator `createCore`：id 已在内存或盘上有行则拒；否则 `states.set(id, { meta, cursor: 0, materialized: false })`。**不** `INSERT` `sessions`。`list()` 只读已物化行，所以 create-but-never-append 对 list 不可见。lifecycle 前端要让空会话出现在 durable list 时调用 `ensureMaterialized`：先 `flush`，再 `backend.materializeHeader`（SQLite：`BEGIN` + `upsert-session` + `COMMIT`，不发明事件）。测试钉死物化后 `list()` 含该 header、`load` 事件为空数组。 [E: packages/session/session-persistence/src/coordinator.ts:681] [E: packages/session/session-persistence/src/coordinator.ts:653] [E: packages/session/session-persistence-sqlite/src/store.ts:255] [E: packages/session/session-persistence-sqlite/src/store.ts:201] [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:713]

6. **第一笔 `appendBatch` 才物化，且与事件同一事务。** coordinator `appendCore` 先按 `state.cursor` 校验每条 `event.seq` 连续；对不上就抛 `append seq mismatch`，**不会**调用 `backend.appendBatch`。过了连续性检查才 `backend.appendBatch(meta, events, state.materialized)`。SQLite：`BEGIN IMMEDIATE` → `validateSchemaForMutation` → 若 `!isMaterialized` 则 `writeRow`（upsert，`incarnation = randomUUID()`，返回整数 session key）→ 再校验磁盘下一 seq 等于 `events[0].seq` → `packChunkRuns` 后逐条 `INSERT INTO events` → `UPDATE sessions SET revision = revision + 1` → `COMMIT`；`catch` 里 `ROLLBACK` 再抛。COMMIT 之后 coordinator 才把 `materialized = true` 并推进 cursor。两个 `SqliteStore` 打开同一文件时，输家的 append 看到 `stored next seq is N` 并回滚，赢家前缀不动（不再依赖 UNIQUE 当第一道门）。 [E: packages/session/session-persistence/src/coordinator.ts:724] [E: packages/session/session-persistence/src/coordinator.ts:728] [E: packages/session/session-persistence-sqlite/src/store.ts:182] [E: packages/session/session-persistence-sqlite/src/store.ts:188] [E: packages/session/session-persistence-sqlite/src/store.ts:193] [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:406]

7. **耐久屏障在别的 waterfall 上，那些 listener 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：不调用就不会 `shift`。`dsh-session-checkpoint-policy`（base 已挂）在三条 waterfall 上先 `await ctx.sessions.flush(session)` 再前进：`llm/stream` 有 live session 时 `afterCheckpoint` 先 flush 再 `yield* next()`（无 `sessionId` / 已脱离 store 则直接 `next()`）；`tools/execute` 仅 `exec.agent` 存在且 `exec.parent === undefined` 才 flush，flush 期间 abort → `TOOL_ABORTED_BEFORE_DISPATCH` 且 **不** `next()`，嵌套 `parent` 直接 `next()`；`agent/pre-step` flush 后 `return next()`。`SessionStore.flush` 最终打到 coordinator 的 `session/flush` parallel listener。省略 `next()` = adapter / tool body / 下一步都不跑；`session/flush` 本身没有 `next()` 可省略。 [E: vendor/cordis/src/events.ts:237] [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:65] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:73] [E: packages/session/session-checkpoint-policy/src/index.ts:80] [E: packages/session/session-checkpoint-policy/src/index.ts:81]

8. **读前缀：`scanRows` 切 torn tail，coordinator 决定是否落盘。** `loadStored` 在一个读事务里取 `sessions` 行 + 全量 `events`，再 `scanRows`。完整但未闭合的 turn（有 `turn/start`、无 `turn/end`、行都可解析）整段保留，`tornFrom` 为空——load 再补 `interruptedTurnClosers`。最后一条含 `turn/end` 的物理行之后的坏 JSON / seq 洞把 `tornFrom` 钉成该物理 `seq`；同一洞若出现在 `lastTurnEndRow` 及之前则抛 corrupt。`surfaceOp` 原样进出 JSON 列，compaction 的 `{ op: 'replace', start, end }` 只是一行事件，**不是** DELETE log。 [E: packages/session/session-persistence-sqlite/src/compression.ts:300] [E: packages/session/session-persistence-sqlite/src/compression.ts:323] [E: packages/session/session-persistence-sqlite/tests/compression.spec.ts:373] [E: packages/session/session-persistence-sqlite/tests/compression.spec.ts:381]

9. **`inspect` 不 commit；`load` / `prepare` 才 `commitRepair`。** coordinator `inspect` 走 `preparations.inspect` → `prepareCore`：内存里拼 closers、冻结 inspection，**不**写库。`load` / `prepare` 经 `reserve` + `commitPrepared`：若 `tornMarker !== undefined` 或 `closers.length > 0`，调用 `backend.commitRepair` 后 **return undefined 再读一遍**（修过的盘 revision 已变）。SQLite `commitRepair` 仍是一事务：校验 marker 仍指向当前物理 tail → `DELETE FROM events WHERE seq >= tornMarker`（若有）+ INSERT closers + `revision + 1`。空 repair（无 torn、无 closers）直接 return 不涨 revision。stale repair（别人已切掉 tail）抛 `repair is stale`。live 且 turn 仍开时 `load` 拒（`cannot load … while its live turn is open`）；`inspect` 可以借 live 快照。 [E: packages/session/session-persistence/src/coordinator.ts:818] [E: packages/session/session-persistence/src/coordinator.ts:985] [E: packages/session/session-persistence/src/coordinator.ts:1026] [E: packages/session/session-persistence/src/coordinator.ts:1064] [E: packages/session/session-persistence-sqlite/src/store.ts:220] [E: packages/session/session-persistence-sqlite/src/store.ts:231]

10. **`loadStoredFrom` 是 SQL seek，并回看打包窗口。** 物理行可能覆盖 `[seq, seq+N)`，所以 seek 从 `fromSeq - MAX_PACKED_ROW_MEMBERS + 1` 找 packed predecessors，再 `SELECT … FROM events WHERE seq >= base`。`scanRows(eventRows, base)` 后 filter `event.seq >= fromSeq`。coordinator `readFrom` 发现该钩子存在就只读后缀（非 mutate、不带 tornMarker）；后缀事件若需要更早的 legacy 身份事实，才回退整本 prefix。JSONL 没有这个钩子，走 `loadStored` + 向前跳。 [E: packages/session/session-persistence-sqlite/src/store.ts:348] [E: packages/session/session-persistence-sqlite/src/store.ts:169] [E: packages/session/session-persistence/src/coordinator.ts:929]

11. **卸载先 drain 再 `db.close()`。** coordinator 的 dispose effect 对每个 live session `flush`，等完 per-id chain，再 `backend.close()`。打开失败（空 `store_id`）会关掉句柄再抛 `no valid store identity`。从未做过 persistence 操作的 store `close()` 不创建文件。 [E: packages/session/session-persistence/src/coordinator.ts:1174] [E: packages/session/session-persistence-sqlite/src/store.ts:113] [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:748]

## 设计动机

DSH 把 session 真相放在 append-only log 上，盘只是 `PersistenceBackend`。SQLite 后端跟 JSONL 共用同一套 coordinator，所以 `create` / write-behind / `inspect`≠`load` / crash closers 语义一致；换的是介质：物理行可打包、单事务原子性、按 seq seek。这和「内存 messages + 事后写盘」差在：热路径仍然只 emit `session/event`；副作用门在 checkpoint 的 waterfall 上 `flush` 失败就不 `next()`。

拒盘而不是 migration：本包未进 shipped bundle，打开时只认当前 `SCHEMA_VERSION`。`application_id = 0x44534850`（`DSHP`）防止把别人的 SQLite 文件当成 session 盘去 `CREATE TABLE`。schema-20 的 packed codec **故意不**共享 JSONL codec，避免 JSONL 格式演进悄悄改 session 盘解释器。 [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:701] [E: packages/session/session-persistence-sqlite/src/codec.ts:12]

不进 bundle，是因为默认产品（`dsh web` 以及叠 base 的 `headless` / `sdk` / `acp`）已经用 JSONL：逐会话文件、`supportsRawArtifacts = true`、zstd。`sdk-minimal` 也是 JSONL。SQLite 留给要单库、要 SQL seek、愿意自己写 patch 的部署。

`locate` / raw artifact 故意缺席：一库多会话没有「把这个 transcript 路径交给用户」的诚实答案。`session-query-sqlite` 是另一张库（DSHQ / schema 8，web 默认甚至 `openAt: never` 不打开），不是本包的 FTS 视图。

## Gotcha

- **四个 version 不要混。** 本包 `SCHEMA_VERSION = 20`（表布局，拒盘）≠ `SessionHeader.version` / `SESSION_FORMAT_VERSION = 0`（事件格式，无跨 version migration）≠ session-query **8**（派生表，不匹配就重建）≠ storage-sqlite **1**（另一张未 shipped 库）。 [E: packages/session/session-persistence-sqlite/src/schema.ts:19] [E: packages/core/session/src/types.ts:51] [E: packages/session-query/session-query-sqlite/src/schema.ts:8] [E: packages/storage/storage-sqlite/src/schema.ts:20]
- **仓库有 ≠ 默认装。** `dsh web` / `dsh --profile headless|sdk|acp` / `sdk-minimal` 打开的是 JSONL。本页的类不会在未打 patch 的进程里占据 `ctx.sessionPersistence`。 [E: packages/bundle/base/cordis.patch.yml:110]
- **settings 分层是 schema defaults → composition `base` → user document。** `SettingsScope.get` 读 `resolved`。漏一层或颠倒顺序会污染 [subsys.persistence.settings](settings.md)。 [E: packages/settings/settings/tests/settings.spec.ts:89] [E: packages/settings/settings/src/index.ts:117]
- **credentials：配置是 `CredentialRef`，值在 `.credentials.yaml`。** 组合 / adapter Config 写 `role('credential-ref')` / `apiKeyEnv`；`refs` 存非空 secret 字符串，不是再存一份 ref。 [E: packages/llm/llm-deepseek/src/index.ts:178] [E: packages/credentials/credentials-local/src/index.ts:284]
- **storage / projection-cache 在 base；workspace 只 web-app。** `dsh-base` 才 insert `storage` + `storage-json` + `storage-domain`、`session-projection-cache`。`workspace` 仍是 web-app 行。`storage-sqlite` 与本包一样未 shipped。 [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/web-app/cordis.patch.yml:61]
- **旧盘和新盘一样拒。** `user_version` 为 16（测试钉死）或任何 ≠ 20 的非 0 都是 `incompatible with this build`。空盘才 stamp 20。错 `application_id`、有表但 `user_version = 0`，都原地不动。打开后每次 mutation 再 `validateSchemaForMutation`。 [E: packages/session/session-persistence-sqlite/src/schema.ts:125] [E: packages/session/session-persistence-sqlite/src/schema.ts:122] [E: packages/session/session-persistence-sqlite/src/schema.ts:262]
- **`locate` 永远 `undefined`，`supportsRawArtifacts === false`。** 未 override 的 `readRaw` 直接 reject `does not expose raw artifacts`。不要按 JSONL 的 `{ kind:'jsonl', path }` 去找逐会话文件。 [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:761] [E: packages/session/session-persistence/src/index.ts:144]
- **`session/flush` 不是 waterfall。** 没有 `next()` 可挡别人。耐久否决发生在 `llm/stream` / `tools/execute`：那些 listener 先 `flush` 再决定要不要 `next()`。 [E: packages/core/session/src/index.ts:83]
- **`inspect` 不修盘。** 合成 closers 只在内存。要让下一笔 append 从平衡长度继续，必须 `load` / `prepare`（或 live `flush` 后的平衡快照）。 [E: packages/session/session-persistence/src/coordinator.ts:811]
- **禁止 Config `journal_mode=memory|off`。** union 写死四种；`:memory:` 路径是测试库，期望 journal 变成 `memory`。journal pragma 在 schema 校验 COMMIT 之后才执行。 [E: packages/session/session-persistence-sqlite/src/index.ts:62] [E: packages/session/session-persistence-sqlite/src/schema.ts:172]
- **compaction 不是 DELETE。** `events` 表上的 DELETE 只出现在 torn-tail `commitRepair`。模型历史变短靠 `surfaceOp: replace`，`this.log` / `events` 行继续变长。
- **coordinator 的 seq 门 ≠ store 的 next-seq 门。** 同一 `PersistenceCoordinator` 再 append 已提交批次，`appendCore` 在 `state.cursor` 处抛 `append seq mismatch`，`appendBatch` 不跑。两个 live `SqliteStore` 打开同一文件、各自持一份过期 cursor 时，输家在 `appendBatch` 里看到 `stored next seq is N` 并 `ROLLBACK`。 [E: packages/session/session-persistence/src/coordinator.ts:724] [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:406]
- **空会话不会因 `create` 出现。** 必须 `ensureMaterialized` 或第一笔 append。 [E: packages/session/session-persistence-sqlite/tests/sqlite.spec.ts:713]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle 行：base / web-app / headless / sdk / acp / sdk-minimal |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-persistence` 的 `SessionPersistence` | `ctx.sessionPersistence`；`PersistenceBackend` hooks（`loadStored` / `appendBatch` / `commitRepair` / 可选 `loadStoredFrom` / `materializeHeader`） | **无**独立 Definition 行。缝随第一个 Provider 插件进入 host |
| Provider | `@deepseek-ai/dsh-session-persistence-sqlite` 的 `SqliteSessionPersistence` + `SqliteStore` | 实现 hooks；`supportsRawArtifacts = false`；`locate → undefined` | **六份 bundle 都不挂。** base 挂 jsonl。web / headless / sdk / acp **继承** 该 jsonl 行。sdk-minimal 自己 insert jsonl |
| Consumer | `PersistenceCoordinator`（本 Provider 构造出来）+ `SessionStore.flush` + `dsh-session-checkpoint-policy` | `session/event` **emit**（入队，无 `next`）；`session/flush` **parallel**（无 `next`）；`llm/stream` / `tools/execute` / `agent/pre-step` **waterfall**（必须 `next()`） | checkpoint 是 base 行；sdk-minimal 自带 session 面但不挂 sqlite。Consumer 不关心盘是 jsonl 还是 sqlite |

换 Provider 只换介质与 `locate` / raw / seek / packing。不能绕开 `Session` 的 append 合同或把 compaction 写成删 log。preset isolate 不得再 publish 一份 `sessionPersistence`；盘留在 host。

## Sources

- packages/session/session-persistence-sqlite/src/index.ts
- packages/session/session-persistence-sqlite/src/store.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/session/session-persistence-sqlite/src/codec.ts
- packages/session/session-persistence-sqlite/src/compression.ts
- packages/session/session-persistence-sqlite/resources/sql/schema.sql
- packages/session/session-persistence-sqlite/tests/sqlite.spec.ts
- packages/session/session-persistence-sqlite/tests/compression.spec.ts
- packages/session/session-persistence/src/index.ts
- packages/session/session-persistence/src/coordinator.ts
- packages/session/session-persistence/src/write-behind.ts
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/acp-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/session-query/session-query-sqlite/src/schema.ts
- packages/storage/storage-sqlite/src/schema.ts
- vendor/cordis/src/events.ts
- packages/settings/settings/src/index.ts
- packages/settings/settings/tests/settings.spec.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/credentials/credentials-local/src/index.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages`、checkpoint 两个副作用落点；默认图画的是 host JSONL。
- [subsys.persistence.session-persistence](session-persistence.md)：`ctx.sessionPersistence` Definition、coordinator、write-behind、`inspect`≠`load`。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend；逐会话 `session.jsonl[.zstd]`；`locate` 有路径。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`SESSION_FORMAT_VERSION = 0`、`session/flush` parallel。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` 与顶层 `tools/execute` 在 `next()` 之前 `sessions.flush`。
- [subsys.persistence.session-query](session-query.md)：另一张 SQLite（schema 8 / DSHQ）；web 默认 `openAt: never`，不是 session 盘。
- [subsys.persistence.storage](storage.md)：非会话 KV 现挂 **base**（`storage` + `storage-json` + `storage-domain`）；`storage-sqlite` schema 1 未 shipped。
- [subsys.persistence.workspace](workspace.md)：**只 web-app**；domain `workspace`，不走本页 session 盘。
- [subsys.persistence.projection](projection.md)：registry 与 `session-projection-cache` 现挂 **base**。
- [subsys.persistence.settings](settings.md)：schema defaults → composition `base` → user document。
- [subsys.persistence.credentials](credentials.md)：配置里 `CredentialRef`；`.credentials.yaml` 存 secret 值。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer；host 面 vs agent-preset 面。
