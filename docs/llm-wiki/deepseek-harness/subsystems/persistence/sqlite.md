---
id: subsys.persistence.sqlite
title: SQLite（session-persistence-sqlite 已退役）
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session-query/session-query-sqlite/src/index.ts
  - packages/session-query/session-query-sqlite/src/schema.ts
  - packages/session-query/session-query-sqlite/package.json
  - packages/storage/storage-sqlite/src/index.ts
  - packages/storage/storage-sqlite/src/schema.ts
  - packages/storage/storage-sqlite/package.json
  - packages/core/session/src/types.ts
symbols:
  - SqliteSessionQueryEngine
  - SESSION_QUERY_SQLITE_SCHEMA_VERSION
  - STORAGE_SQLITE_SCHEMA_VERSION
related:
  - spine.session-log
  - subsys.persistence.session-persistence
  - subsys.persistence.jsonl
  - subsys.core.session
  - subsys.persistence.checkpoint
  - subsys.persistence.session-query
  - subsys.persistence.storage
  - spine.capability-seams
evidence: explicit
status: verified
updated: d347e70390
---

> `@deepseek-ai/dsh-session-persistence-sqlite` **已删除**：shipped session 盘只剩 JSONL（`dsh-session-persistence-jsonl`）。本页保留 wiki id `subsys.persistence.sqlite`，用来挡住「SQLite 仍是可选 session persistence 后端」的旧检索；**仍活着**的 SQLite 是检索派生库 `dsh-session-query-sqlite` 与未 bundled 的非会话 KV `dsh-storage-sqlite`。

## 能回答的问题

- `session-persistence-sqlite` 还在不在仓库 / shipped bundle 里？默认 session 盘是谁？
- `session-query-sqlite` 与 `storage-sqlite` 是不是同一张库、同一个 schema？
- `SESSION_FORMAT_VERSION = 2` 跟 query schema `8`、storage-sqlite schema `1` 各钉哪一层？
- `dsh-base` 挂的 `session-query-sqlite` 为什么是 `path: ':memory:'` + `openAt: never`？
- 想换 session 盘介质，现在还能挂一份 SQLite persistence Provider 吗？

## 退役事实

`packages/session/session-persistence-sqlite` **没有** `package.json` / `src/*.ts`。工作树若还剩目录，只是 `node_modules` 空壳，不是源码。任何 shipped bundle 都没有 `session-persistence-sqlite` 行。 [I]

`dsh-base` 的 session 盘行是 `id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: !!js dshHomePath('sessions')`。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:111] [E: packages/bundle/base/cordis.patch.yml:113] `dsh-base` 的 workspace 依赖声明 jsonl，不声明 sqlite persistence。 [E: packages/bundle/base/package.json:73]

`SessionPersistence` 缝是 handle 合同：`create` / `open` 得到 `SessionHandle`。 [E: packages/session/session-persistence/src/index.ts:146] [E: packages/session/session-persistence/src/index.ts:161] JSONL 插件 `name` 覆盖成 `session-persistence-jsonl`，占住同一 `ctx.sessionPersistence`。 [E: packages/session/session-persistence-jsonl/src/index.ts:153] 仓库里**没有**第二份 shipped session persistence Provider。

叠 `dsh-base` 的 profile（`web` / `headless` / `sdk` / `acp`）继承这条 JSONL 行。`sdk-minimal` 不叠 base，自己 insert 同一 jsonl 包，`id: sessions`，`compression: none`。 [E: packages/bundle/sdk-minimal/cordis.patch.yml:164] [E: packages/bundle/sdk-minimal/cordis.patch.yml:165] [E: packages/bundle/sdk-minimal/cordis.patch.yml:168]

逻辑 header `version` 现为 `SESSION_FORMAT_VERSION = 2`。v0→v1→v2 由 format catalog 在 JSONL load 时走 adjacent 链；比 2 新的盘仍拒。那是 JSONL + catalog 的事，不是 SQLite session 盘 migration。 [E: packages/core/session/src/types.ts:86]

## 仍活着的 SQLite

两份活 SQLite **都不是** session persistence 后端，也互不共享 `application_id` / `user_version`。

| 包 | npm 名 | 角色 | shipped？ |
|---|---|---|---|
| `packages/session-query/session-query-sqlite` | `@deepseek-ai/dsh-session-query-sqlite` | `ctx.sessionQuery` 的 FTS5 派生检索库 | **是**：`dsh-base` 行 `id: session-query-sqlite` |
| `packages/storage/storage-sqlite` | `@deepseek-ai/dsh-storage-sqlite` | 非会话 KV 的 `sqlite` StorageBackend | **否**：base 挂的是 `storage` + `storage-json` + `storage-domain` |

### session-query-sqlite

插件类 `SqliteSessionQueryEngine` 继承 `SessionQueryEngine`，占 `ctx.sessionQuery`。 [E: packages/session-query/session-query-sqlite/src/index.ts:203] Config 的 `openAt` 默认 `'startup'`，union 含 `'never'`。 [E: packages/session-query/session-query-sqlite/src/index.ts:208]

`dsh-base` 写出 `path: ':memory:'`、`openAt: never`：`ctx.sessionQuery` 仍挂上（精确读 / 标题 / 血统），但搜索调用在打开 SQLite 之前失败，进程从不 `import('node:sqlite')`。 [E: packages/bundle/base/cordis.patch.yml:129] [E: packages/bundle/base/cordis.patch.yml:132] [E: packages/bundle/base/cordis.patch.yml:133] `dsh-web-app` 把同一行再写一遍，仍是 `never`。 [E: packages/bundle/web-app/cordis.patch.yml:26] [E: packages/bundle/web-app/cordis.patch.yml:29]

派生库 schema **8**，`application_id = 0x44534851`（四字符 `DSHQ`）。版本不匹配走 `resetDerivedSchema` **丢派生表重建**，不是拒盘。 [E: packages/session-query/session-query-sqlite/src/schema.ts:8] [E: packages/session-query/session-query-sqlite/src/schema.ts:11] [E: packages/session-query/session-query-sqlite/src/schema.ts:66] 实现细节在 [subsys.persistence.session-query](session-query.md)。

### storage-sqlite

`name = 'storage-sqlite'`，`inject = ['storage']`，注册到 storage hub 的 `sqlite` backend 键，不是 `ctx.sessionPersistence`。 [E: packages/storage/storage-sqlite/src/index.ts:19] [E: packages/storage/storage-sqlite/src/index.ts:21] 表布局 `STORAGE_SQLITE_SCHEMA_VERSION = 1`。 [E: packages/storage/storage-sqlite/src/schema.ts:20] `dsh-base` 挂的是 json 文件盘：`id: storage` / `storage-json` / `storage-domain`。 [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:148] [E: packages/bundle/base/cordis.patch.yml:153] 细节在 [subsys.persistence.storage](storage.md)。

## 不要混的三层 version

| 数 | 钉在哪 | 不匹配时 |
|---|---|---|
| `SESSION_FORMAT_VERSION = 2` | `SessionHeader.version`；JSONL 当前 generation `session.v2.jsonl[.zstd]` | 新于 2 → 升级 harness；历史 0/1 由 catalog 迁到当前 generation；`assertVersion` 仍只认 2 |
| query schema **8** / `0x44534851` | session-query 派生库 | **重建**派生表 |
| storage-sqlite schema **1** | 非会话 KV 库 | 拒开（该 backend 未 bundled） |

旧页里的 session-persistence-sqlite `SCHEMA_VERSION = 20` / `application_id 0x44534850` **已随包删除**。不要再把它当成活代码，也不要跟上面三行混。

## Gotcha

- **仓库曾经有 ≠ 现在能挂。** 未打自定义 patch 的进程里，`ctx.sessionPersistence` 是 JSONL handle 后端。没有 `SqliteSessionPersistence` 可 `plugin`。
- **query SQLite 打开了也不等于 session 盘换成 SQLite。** FTS 是派生读模型，源日志仍是 JSONL `SessionHandle.read`。
- **`openAt: never` 不是「没装 query」。** base 已经 insert 该行；搜索被关掉，标题 / 精确读 / 血统仍可用。
- **storage-sqlite 与 query-sqlite 不能互相打开。** 不同 `application_id`，不同 schema 政策（拒盘 vs 重建）。
- **compaction 不删 session 盘。** 模型历史靠 `surfaceOp: replace`；JSONL 行继续变长。那是 [subsys.persistence.jsonl](jsonl.md) 的文件语义，不是 SQLite DELETE。

## Seam 三角

| 角色 | 现状 |
|---|---|
| Definition | `@deepseek-ai/dsh-session-persistence` 的 `SessionPersistence` / `SessionHandle`（`ctx.sessionPersistence`） |
| Provider（session 盘） | **只有** `@deepseek-ai/dsh-session-persistence-jsonl`。本 id 曾经指向的 sqlite persistence Provider **已删除** |
| 仍活的 SQLite Provider | query：`SqliteSessionQueryEngine`（`ctx.sessionQuery`）；storage：`storage-sqlite` backend（未 bundled） |
| Consumer | checkpoint / agent-loop resume / session-query 冷读都走 JSONL handle，不走已删除的 sqlite session 盘 |

换 session 盘只能换一个实现 `SessionHandle` 的 `SessionPersistence` Provider。不能把 query 库或 storage-sqlite 静默顶替 `ctx.sessionPersistence`。

## Sources

- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/session/session-persistence/src/index.ts
- packages/session/session-persistence-jsonl/src/index.ts
- packages/session-query/session-query-sqlite/src/index.ts
- packages/session-query/session-query-sqlite/src/schema.ts
- packages/session-query/session-query-sqlite/package.json
- packages/storage/storage-sqlite/src/index.ts
- packages/storage/storage-sqlite/src/schema.ts
- packages/storage/storage-sqlite/package.json
- packages/core/session/src/types.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages`、checkpoint 落点；默认图画的是 host JSONL handle。
- [subsys.persistence.session-persistence](session-persistence.md)：`ctx.sessionPersistence` Definition 与 `SessionHandle`。
- [subsys.persistence.jsonl](jsonl.md)：shipped 唯一 session 盘。
- [subsys.core.session](../core/session.md)：`SESSION_FORMAT_VERSION = 2`、`session/flush` parallel。
- [subsys.persistence.checkpoint](checkpoint.md)：`sessions.flush` 后再 `next()`。
- [subsys.persistence.session-query](session-query.md)：仍活的 query SQLite（schema 8 / DSHQ）。
- [subsys.persistence.storage](storage.md)：base 上的 json KV；`storage-sqlite` schema 1 未 shipped。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer。
