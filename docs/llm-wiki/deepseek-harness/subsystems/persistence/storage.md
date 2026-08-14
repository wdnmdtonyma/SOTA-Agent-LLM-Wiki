---
id: subsys.persistence.storage
title: 非会话 storage
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/storage/storage/src/index.ts
  - packages/storage/storage/src/backend.ts
  - packages/storage/storage/src/registry.ts
  - packages/storage/storage/tests/registry.spec.ts
  - packages/storage/storage-domain/src/index.ts
  - packages/storage/storage-domain/src/domain.ts
  - packages/storage/storage-domain/src/spec.ts
  - packages/storage/storage-domain/src/events.ts
  - packages/storage/storage-domain/tests/domain.spec.ts
  - packages/storage/storage-json/src/index.ts
  - packages/storage/storage-json/src/atomic.ts
  - packages/storage/storage-json/src/unit.ts
  - packages/storage/storage-json/src/format.ts
  - packages/storage/storage-json/tests/json-backend.spec.ts
  - packages/storage/storage-sqlite/src/index.ts
  - packages/storage/storage-sqlite/src/schema.ts
  - packages/storage/storage-sqlite/src/unit.ts
  - packages/storage/storage-sqlite/tests/sqlite-backend.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/cordis.patch.yml
  - packages/workspace/workspace/src/index.ts
  - packages/workspace/workspace/src/spec.ts
  - packages/session/session-projection-cache/src/index.ts
  - packages/session/session-projection-cache/src/spec.ts
  - packages/feedback/message-feedback/src/index.ts
  - packages/feedback/message-feedback/src/spec.ts
  - packages/util/home-paths/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/index.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session-query/session-query-sqlite/src/schema.ts
  - packages/settings/settings/src/index.ts
  - packages/settings/settings/tests/settings.spec.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - Storage
  - DomainFacility
  - defineDomain
  - SqliteStorageBackend
  - STORAGE_SQLITE_SCHEMA_VERSION
related:
  - spine.capability-seams
  - subsys.persistence.workspace
  - subsys.persistence.projection
  - subsys.persistence.jsonl
  - subsys.persistence.session-query
  - spine.overview
  - spine.session-log
  - subsys.core.session
  - subsys.interaction.feedback
  - surface.profiles.web
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.storage` 是 **host 面**、只挂在 `dsh-web-app` 的非会话 KV hub：hub 自己不做 IO；`storage-json` 把 backend 名 `json` 指到 `$DSH_HOME/storages/<unit>.json`；`storage-domain` 把 form `domain` 与 `ctx.storageDomain` 叠在这条 backend 上。消费者用 `defineDomain` 声明 schema，经 `DomainFacility.open` 打开，写路径是「先耐久、再改内存、再 `domain/changed` emit」。这不是 append-only session log，也不是 `deriveMessages()` 的另一份 chat 数组。

## 能回答的问题

- `ctx.storage` / `ctx.storage.domain` / `ctx.storageDomain` 各是什么？谁做 IO，谁做 schema？
- 为什么 `dsh web` 才有这条缝，base / headless 没有？盘文件落在哪？
- domain 写一条 record 时谁必须先成功？`domain/changed` 是 emit、parallel 还是 waterfall？有没有 `next()`？
- `storage-sqlite` 的 `STORAGE_SQLITE_SCHEMA_VERSION = 1` 拒盘规则是什么？它和 session 盘 15、query 盘 8、event `version` 0 是不是同一个旋钮？
- `workspace` / `session_projcache` / `message_feedback` 怎样作为消费者 unit 打开自己的 domain？

## 职责边界

本包拥有：hub `Storage`（`ctx.storage`）上的 named `BackendRegistry` 与 form mount；data form `domain`（`DomainFacility` / `ctx.storageDomain`）；backend `json`（shipped）与 backend `sqlite`（仓库有、bundle 没有）；`defineDomain` 在模块加载期钉死的名字 / version / 非空 global schema；单 domain 写链与 `domain/changed` emit。

本包**不**拥有：append-only `SessionEvent` log 与 `deriveMessages()`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；`ctx.sessionPersistence` 的 write-behind / crash-tail（[subsys.persistence.session-persistence](session-persistence.md)）；shipped session 盘 JSONL（[subsys.persistence.jsonl](jsonl.md)）；仓库有、bundle 没有的 session SQLite 盘 `SCHEMA_VERSION = 15`（[subsys.persistence.sqlite](sqlite.md)）；`llm/stream` / top-level `tools/execute` 上先 `sessions.flush` 再 `next()`（[subsys.persistence.checkpoint](checkpoint.md)）；workspace 实体语义、realpath 唯一、header-only bootstrap（[subsys.persistence.workspace](workspace.md)）；projection registry 的 fold 与 cache 的 watermark 合同（[subsys.persistence.projection](projection.md)）；message feedback 的 rating / note 产品规则（[subsys.interaction.feedback](../interaction/feedback.md)）；settings 分层与 `.credentials.yaml`（[subsys.persistence.settings](settings.md)、[subsys.persistence.credentials](credentials.md)）。

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `0`）。跨 version **没有**自动 migration。这跟 domain spec 的 `version`、跟 `STORAGE_SQLITE_SCHEMA_VERSION` 都不是同一个字段。 [E: packages/core/session/src/types.ts:56]
- SQLite **session 盘** `SCHEMA_VERSION = 15`：`user_version` 非 0 且不等于 15 → 拒开，原地不迁。该 backend **不**在任何 shipped bundle。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108] [E: packages/session/session-persistence-sqlite/src/schema.ts:109]
- session-query 派生盘 `SESSION_QUERY_SQLITE_SCHEMA_VERSION = 8`：版本不匹配时 `resetDerivedSchema` 丢派生表重建，与 session 盘 / storage-sqlite 的「拒盘」都不同。 [E: packages/session-query/session-query-sqlite/src/schema.ts:8] [E: packages/session-query/session-query-sqlite/src/schema.ts:66]
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete。storage 不改 log。 [E: packages/core/session/src/types.ts:372] [E: packages/core/session/src/types.ts:374]
- settings 分层：schema defaults → composition `base` → 用户文档 section。`SettingsScope.get` 读的是 `resolve` 的结果。 [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/src/index.ts:458] [E: packages/settings/settings/src/index.ts:705] [E: packages/settings/settings/tests/settings.spec.ts:95]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。`.credentials.yaml` 写入 map 的是非空 secret 字符串，不是 ref。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/credentials/credentials-local/src/index.ts:183]
- shipped JSONL 后端挂在 base：`id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。headless / web 继承这一行，自己不重挂。`ctx.storage` 的盘是 `$DSH_HOME/storages/`，不是 `$DSH_HOME/sessions/`。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101]
- shipped `session-query-sqlite` 写出 `openAt: never`（base 挂载；web-app 用同一键重述）。search 默认关，不 import/open sqlite。这不是 `ctx.storage` 的 backend。 [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:33]

`ctx.storage` 是 **host 面**进程级服务。agent-preset 面不得另造一份 hub。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI 包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/storage/storage/src/index.ts` | hub `Storage`；`ctx.storage`；`mount` / `form` / `domain` getter |
| `packages/storage/storage/src/backend.ts` | `StorageBackend` / `KvFacet` / `KvUnit` / `UNIT_NAME_RE` |
| `packages/storage/storage/src/registry.ts` | `BackendRegistry.register` / `get`；stale disposer 守卫 |
| `packages/storage/storage/tests/registry.spec.ts` | 重复名、form mount、stale disposer |
| `packages/storage/storage-domain/src/index.ts` | `DomainFacility`；`apply` 等 backend lifecycle 再 `provide('storageDomain')` |
| `packages/storage/storage-domain/src/domain.ts` | 单写链：先 `unit.*` 耐久，再改内存，再 emit |
| `packages/storage/storage-domain/src/spec.ts` | `defineDomain` / `descriptorOf` |
| `packages/storage/storage-domain/src/events.ts` | `domain/changed` emit（无 `next`） |
| `packages/storage/storage-domain/tests/domain.spec.ts` | open 校验、写链、耐久失败不改内存、plugin 等 backend |
| `packages/storage/storage-json/src/index.ts` | `JsonStorageBackend`；盘 `<root>/<unit>.json` |
| `packages/storage/storage-json/src/atomic.ts` | `writeAtomic`：tmp + fsync + `rename` |
| `packages/storage/storage-json/src/unit.ts` | 缺文件延后物化；publish 失败回滚 unit 内存 |
| `packages/storage/storage-json/src/format.ts` | pretty JSON；header `unit.version` 精确匹配 |
| `packages/storage/storage-sqlite/src/index.ts` | `SqliteStorageBackend`；注册名 `sqlite` |
| `packages/storage/storage-sqlite/src/schema.ts` | `STORAGE_SQLITE_SCHEMA_VERSION = 1`；空盘 stamp，其它拒 |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: session-persistence-jsonl` `root: dshHomePath('sessions')`；同层 `session-query-sqlite` `openAt: never` |
| `packages/bundle/web-app/cordis.patch.yml` | 只 web：`storage` + `storage-json` + `storage-domain`；重述 `openAt: never` |
| `packages/workspace/workspace/src/spec.ts` | 消费者 domain `workspace` v2 |
| `packages/session/session-projection-cache/src/spec.ts` | 消费者 domain `session_projcache` v3 |
| `packages/feedback/message-feedback/src/spec.ts` | 消费者 domain `message_feedback` v0 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `Storage` | Cordis `Service`，键 `ctx.storage`。持有 `backend: BackendRegistry` 与 form 表。hub 不碰盘。 [E: packages/storage/storage/src/index.ts:47] [E: packages/storage/storage/src/index.ts:54] |
| `StorageForms` | declaration merge 的 form 表。domain 包 merge `domain: DomainFacility`。`ctx.storage.domain` 是 `form('domain')` 的语法糖。 [E: packages/storage/storage/src/index.ts:41] [E: packages/storage/storage-domain/src/index.ts:30] [E: packages/storage/storage/src/index.ts:90] |
| `storageBackendServiceKey(name)` | 返回 `storage.backend.${name}`。domain 插件用这些 lifecycle 键等 backend 先 `provide`。 [E: packages/storage/storage/src/index.ts:26] [E: packages/storage/storage/src/index.ts:27] |
| `UNIT_NAME_RE` | `/^[a-z][a-z0-9_]*$/`。domain 名、table 名、JSON 文件名段、SQLite 标识段共用。 [E: packages/storage/storage/src/backend.ts:10] |
| `KvUnitDescriptor` | `{ name, version, tables, hasGlobal }`。`defineDomain` 经 `descriptorOf` 投影出来。 [E: packages/storage/storage-domain/src/spec.ts:105] |
| `DomainSpec` | `{ name, version, global?, tables }`。record schema 是 zod；plugin `Config` 是 schemastery。 [E: packages/storage/storage-domain/src/spec.ts:35] |
| `DomainChanged` | `put`（带新整值）或 `deleted`（无 value）。global 写的 `table` / `key` 都是 `''`。 [E: packages/storage/storage-domain/src/events.ts:21] [E: packages/storage/storage-domain/src/events.ts:28] [E: packages/storage/storage-domain/src/index.ts:132] [E: packages/storage/storage-domain/tests/domain.spec.ts:242] |
| `STORAGE_SQLITE_SCHEMA_VERSION` | 物理布局 version，现为 `1`，存在 `PRAGMA user_version`。与每个 unit 自己的 `descriptor.version` 正交。 [E: packages/storage/storage-sqlite/src/schema.ts:20] |
| shipped 消费者 domain | `workspace` version 2；`session_projcache` version 3；`message_feedback` version 0。盘上各是一个 `<name>.json`。 [E: packages/workspace/workspace/src/spec.ts:68] [E: packages/workspace/workspace/src/spec.ts:69] [E: packages/session/session-projection-cache/src/spec.ts:67] [E: packages/session/session-projection-cache/src/spec.ts:68] [E: packages/feedback/message-feedback/src/spec.ts:85] [E: packages/feedback/message-feedback/src/spec.ts:86] |

`StorageError.code`：`backend-not-found` / `form-not-mounted` / `duplicate-backend` / `duplicate-mount` / `version-mismatch` / `malformed-medium` / `closed`。`DomainError.code`：`already-open` / `facet-unsupported` / `invalid-record` / `missing-key` / `closed`。backend 的 `version-mismatch` 原样穿过 domain 层，不改包一层。

## 控制流

1. **只 web-app 挂这三行。** `dsh-web-app` insert `id: storage` / `@deepseek-ai/dsh-storage`，再 `id: storage-json` / `@deepseek-ai/dsh-storage-json`（`root: !!js dshHomePath('storages')`），再 `id: storage-domain` / `@deepseek-ai/dsh-storage-domain`（`backend: json`）。`dshHomePath(...segments)` 是 `join(resolveDshHome(), ...segments)`；`resolveDshHome()` 取非空 `$DSH_HOME`，否则 `join(homedir(), '.dsh')`。web-app `package.json` 依赖这三包，**没有** `@deepseek-ai/dsh-storage-sqlite`。headless 自己的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。session 盘是 **base** 行 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`；web / headless **不**重挂。同层 shipped `session-query-sqlite` 是 `openAt: never`（base 写出，web-app 同键再写一遍仍是 `never`）。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:54] [E: packages/bundle/web-app/cordis.patch.yml:57] [E: packages/bundle/web-app/cordis.patch.yml:59] [E: packages/bundle/web-app/cordis.patch.yml:62] [E: packages/util/home-paths/src/index.ts:99] [E: packages/util/home-paths/src/index.ts:88] [E: packages/util/home-paths/src/index.ts:89] [E: packages/util/home-paths/src/index.ts:90] [E: packages/util/home-paths/src/index.ts:62] [E: packages/util/home-paths/src/index.ts:12] [E: packages/bundle/web-app/package.json:100] [E: packages/bundle/web-app/package.json:101] [E: packages/bundle/web-app/package.json:102] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:33]

2. **hub 先占 `ctx.storage`。** `Storage` 构造 `super(ctx, 'storage')`。`BackendRegistry.register` 同名第二次抛 `duplicate-backend`；`mount` 同 form 第二次抛 `duplicate-mount`。disposer 只删自己那一次登记，后挂上的后继不会被 stale disposer 拆掉。测试：`ctx.plugin(Storage)` 之后 `ctx.storage` 是实例；`dispose()` 卸 form 之后 `form('domain')` 抛 `form-not-mounted`。 [E: packages/storage/storage/src/index.ts:54] [E: packages/storage/storage/src/index.ts:64] [E: packages/storage/storage/src/index.ts:66] [E: packages/storage/storage/src/registry.ts:26] [E: packages/storage/storage/src/registry.ts:27] [E: packages/storage/storage/tests/registry.spec.ts:36] [E: packages/storage/storage/tests/registry.spec.ts:46]

3. **json backend 登记名 `json`，并 `provide` lifecycle 键。** `storage-json` 的 `inject = ['storage']`。`apply` 构造 `JsonStorageBackend(config.root)`，`ctx.storage.backend.register('json', backend)`，再 `ctx.provide(storageBackendServiceKey('json'), backend)`，即 `storage.backend.json`。`root` 在 schema 上 `required()`，没有 cwd 默认。打开 unit 时 `mkdir(root, { recursive: true, mode: 0o700 })`，路径是 `join(root, `${descriptor.name}.json`)`。 [E: packages/storage/storage-json/src/index.ts:19] [E: packages/storage/storage-json/src/index.ts:34] [E: packages/storage/storage-json/src/index.ts:64] [E: packages/storage/storage-json/src/index.ts:65] [E: packages/storage/storage-json/src/index.ts:107] [E: packages/storage/storage-json/src/index.ts:113]

4. **domain form 等 backend lifecycle，不是靠 yml 行序。** `storage-domain` 的 plugin `inject = ['storage']`。`apply` 把 `config.backend` 与 `routes` 里出现过的名字都映射成 `storage.backend.*`，再 `ctx.inject(backendServices, …)`：里面才 `new DomainFacility`、`storage.mount('domain', facility)`、`provide('storageDomain', facility)`。测试：先 `plugin` domain 行时 `ctx.get('storageDomain')` 仍是 `undefined`，`form('domain')` 抛 not mounted；`register` + `provide('storage.backend.memory')` 之后 `ctx.storageDomain` 才是 `DomainFacility`，且 `ctx.storage.domain === ctx.storageDomain`。卸掉 backend 服务，form 跟着卸。 [E: packages/storage/storage-domain/src/index.ts:44] [E: packages/storage/storage-domain/src/index.ts:206] [E: packages/storage/storage-domain/src/index.ts:209] [E: packages/storage/storage-domain/src/index.ts:217] [E: packages/storage/storage-domain/tests/domain.spec.ts:177] [E: packages/storage/storage-domain/tests/domain.spec.ts:178] [E: packages/storage/storage-domain/tests/domain.spec.ts:179] [E: packages/storage/storage-domain/tests/domain.spec.ts:184] [E: packages/storage/storage-domain/tests/domain.spec.ts:185]

5. **消费者 `inject` `storageDomain` 再 `open(spec)`。** 调用方拥有返回的 `Domain`，通常用自己的 `ctx.effect` 在 unload 时 `domain.close()`。facility 不把 domain 绑到消费者 fiber；facility 自己 unmount 时 `closeAll()`。三个 shipped 消费者：`WorkspaceRegistry.inject = ['storageDomain', 'sessionPersistence']`，打开 `workspaceDomainSpec`（`name: 'workspace'`，`version: 2`）；`SessionProjectionCache.inject = ['storageDomain', 'sessionProjections', 'sessionPersistence', 'sessions']`，打开 `projectionCacheDomainSpec`（`name: 'session_projcache'`，`version: 3`）；`MessageFeedbackService.inject = ['storageDomain', 'sessionPersistence', 'sessions']`，打开 `messageFeedbackDomainSpec`（`name: 'message_feedback'`，`version: 0`）。web-app 同层还 insert 了这三行消费者。 [E: packages/workspace/workspace/src/index.ts:93] [E: packages/workspace/workspace/src/index.ts:120] [E: packages/workspace/workspace/src/spec.ts:67] [E: packages/session/session-projection-cache/src/index.ts:72] [E: packages/session/session-projection-cache/src/index.ts:85] [E: packages/session/session-projection-cache/src/spec.ts:66] [E: packages/feedback/message-feedback/src/index.ts:151] [E: packages/feedback/message-feedback/src/index.ts:174] [E: packages/feedback/message-feedback/src/spec.ts:84] [E: packages/bundle/web-app/cordis.patch.yml:64] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76]

6. **`DomainFacility.open`：占名 → 路由 → `kv.open` → `loadAll` → 每条 zod parse。** 已 reserved 的名字抛 `already-open`。路由是 `config.routes?.[spec.name] ?? config.backend`；未登记的 backend 名让 hub 抛 `backend-not-found`。没有 `kv` facet 抛 `facet-unsupported`。然后 `backend.kv.open(descriptorOf(spec))`。`loadAll` 之后对每个 table / 每个 key 跑 `valueSchema.parse`；失败变 `invalid-record` 并带 `{ table, key }`（测试钉 `items`/`bad`）。stored global 为 `null` 表示从未写过，内存里用 spec 的 `initial`，**不**先物化。parse 失败会 `unit.close()` 并释放 reserved 名。`defineDomain` 在拥有者模块加载时就拒非法名字、非整数 version、以及 `safeParse(null).success` 的 global schema（`null` 是介质「从未写过」哨兵）。 [E: packages/storage/storage-domain/src/index.ts:101] [E: packages/storage/storage-domain/src/index.ts:106] [E: packages/storage/storage-domain/src/index.ts:107] [E: packages/storage/storage-domain/src/index.ts:114] [E: packages/storage/storage-domain/src/index.ts:121] [E: packages/storage/storage-domain/src/index.ts:130] [E: packages/storage/storage-domain/src/spec.ts:79] [E: packages/storage/storage-domain/src/spec.ts:91] [E: packages/storage/storage-domain/tests/domain.spec.ts:125] [E: packages/storage/storage-domain/tests/domain.spec.ts:127]

7. **JSON 打开：缺文件不建盘，坏文件拒。** `openJsonUnit` 读 `<root>/<name>.json`；`ENOENT` 得到空 `UnitState`（`global: null`、每张表空 Map），第一笔 write 才 `writeAtomic`。已有文件走 `parse`：不是 JSON / header 名不对 → `malformed-medium`；`unit.version !== descriptor.version` → `version-mismatch`。写出是 `JSON.stringify(..., null, 2)` 再加尾换行。测试：刚 `open` 完读文件仍是 `ENOENT`；落盘文本等于 pretty JSON + `\n`。 [E: packages/storage/storage-json/src/unit.ts:31] [E: packages/storage/storage-json/src/unit.ts:33] [E: packages/storage/storage-json/src/format.ts:34] [E: packages/storage/storage-json/src/format.ts:62] [E: packages/storage/storage-json/src/format.ts:63] [E: packages/storage/storage-json/tests/json-backend.spec.ts:53] [E: packages/storage/storage-json/tests/json-backend.spec.ts:41] [E: packages/storage/storage-json/tests/json-backend.spec.ts:45]

8. **写路径：domain 单链，先耐久再改自己的内存。** `KvTable.put` / `update` / `delete` 与 `global.set` 都进 `DomainImpl.enqueue`。job 里先 `await unit.putRecord` / `deleteRecord` / `setGlobal`，成功后才 `records.set` / `delete`，最后 `emitChanged`。backend 拒写则内存保持旧值、不发事件。`delete` 在自己的 chain 槽位上看见 key 不存在时返回 `false`，不写盘也不发事件。`update` 缺 key 抛 `missing-key`。 [E: packages/storage/storage-domain/src/domain.ts:263] [E: packages/storage/storage-domain/src/domain.ts:307] [E: packages/storage/storage-domain/src/domain.ts:309] [E: packages/storage/storage-domain/src/domain.ts:310] [E: packages/storage/storage-domain/src/domain.ts:311] [E: packages/storage/storage-domain/src/domain.ts:319] [E: packages/storage/storage-domain/src/domain.ts:336] [E: packages/storage/storage-domain/tests/domain.spec.ts:257] [E: packages/storage/storage-domain/tests/domain.spec.ts:262]

9. **`domain/changed` 是 emit，没有 `next()`。** 声明是 `(change) => void`。`emitChanged` 在耐久 + 内存都提交之后 `this.ctx.emit('domain/changed', change)`；同步 listener 抛错只 `logger.warn`，不能把已提交的写打成失败。测试：hostile observer 之后 `put` 仍 resolve，内存与介质都是新值，写链还能继续 `delete`。这不是 waterfall：没有人必须 `next()`。邻接的 `llm/stream` / `tools/execute` / `agent/pre-step` 才是 waterfall，漏 `next()` 会停整条链。 [E: packages/storage/storage-domain/src/events.ts:46] [E: packages/storage/storage-domain/src/domain.ts:253] [E: packages/storage/storage-domain/src/domain.ts:259] [E: packages/storage/storage-domain/tests/domain.spec.ts:349] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:242]

10. **JSON 单次 publish：tmp + fsync + `rename`。** `writeAtomic` 在同目录写 `.${uuid}.tmp`（`wx` / `0o600`），`writeFile` 后 `handle.sync()`，再 `rename(tmp, path)`，POSIX 再 fsync 父目录。unit 在 publish 前先改自己的 Map；`publish` 失败则把该 key / global 滚回，避免下一次成功 publish 把拒写带上盘。测试：把目标换成目录逼失败后，`loadAll` 仍是 committed 快照，后来的成功文件不含 `rejected`。 [E: packages/storage/storage-json/src/atomic.ts:25] [E: packages/storage/storage-json/src/atomic.ts:27] [E: packages/storage/storage-json/src/atomic.ts:30] [E: packages/storage/storage-json/src/atomic.ts:34] [E: packages/storage/storage-json/src/unit.ts:77] [E: packages/storage/storage-json/tests/json-backend.spec.ts:103] [E: packages/storage/storage-json/tests/json-backend.spec.ts:108]

11. **`storage-sqlite` 实现了但未 shipped。** `SqliteStorageBackend` 登记名 `sqlite`。`openDatabase`：`user_version === 0` 才在建完 `units` / `unit_globals` 之后 `PRAGMA user_version = 1`；`onDisk !== 0 && onDisk !== STORAGE_SQLITE_SCHEMA_VERSION` 抛 `version-mismatch`（文案 `incompatible with this build`）。没有 `application_id` 门（那是 session-persistence-sqlite 的 `0x44534850`）。journal 默认 `wal`，允许 `delete|truncate|persist`。每个 unit 的 format version 另存在 `units` 行：已 stamp 且不等于 `descriptor.version` 也是 `version-mismatch`。测试：先把盘 stamp 成 `999`，再 `kv.open` 拒。 [E: packages/storage/storage-sqlite/src/schema.ts:20] [E: packages/storage/storage-sqlite/src/schema.ts:83] [E: packages/storage/storage-sqlite/src/schema.ts:84] [E: packages/storage/storage-sqlite/src/schema.ts:106] [E: packages/storage/storage-sqlite/src/index.ts:47] [E: packages/storage/storage-sqlite/src/index.ts:106] [E: packages/storage/storage-sqlite/src/index.ts:161] [E: packages/storage/storage-sqlite/tests/sqlite-backend.spec.ts:78] [E: packages/storage/storage-sqlite/tests/sqlite-backend.spec.ts:84]

12. **cache 消费者写盘时还会 `sessions.flush`（不是本缝的门）。** `SessionProjectionCache.write` 先 `checkpoint(session)`，若 session 仍 live 则 `await ctx.sessions.flush(session)`，再 `this.put` 整 record。`session/flush` 签名没有 `next`，实现是 `Promise.allSettled`（parallel）。这是「cache 行不得领先 log」的屏障，不是 checkpoint 那两道副作用门。`write()` 本身不吞错；定时 / 计数 / detach 走 `flushSoft`。 [E: packages/session/session-projection-cache/src/index.ts:140] [E: packages/session/session-projection-cache/src/index.ts:150] [E: packages/session/session-projection-cache/src/index.ts:151] [E: packages/session/session-projection-cache/src/index.ts:246] [E: packages/core/session/src/index.ts:85] [E: packages/core/session/src/index.ts:1026]

13. **关闭：新写立刻拒，已入队的写排干，事件仍发。** `Domain.close` 置 `disposing`，`await this.chain` 再 `unit.close()`，最后 `onClosed` 释放名字。facility unmount 先 `closeAll` 再 `unmount()`，好让排干期间的 `domain/changed` 仍能经 hub 解析到 form。双开同一名字是调用方 bug。 [E: packages/storage/storage-domain/src/domain.ts:236] [E: packages/storage/storage-domain/src/domain.ts:240] [E: packages/storage/storage-domain/src/index.ts:213] [E: packages/storage/storage-domain/tests/domain.spec.ts:317]

## 设计动机

DSH 把「模型下一轮看见的 messages」钉在 append-only session log 上（**model-visible ⟺ logged**），把「Web 宿主要的可变实体」钉在另一条 schema-validated KV 上。workspace 名单、projection cache 行、message feedback sidecar 都不是对话历史，也不该挤进 `SessionEventMap`。peer harness 常见的「内存里改 workspace / 统计，事后再写盘」在这里拆成两层：backend 保证单次调用在介质上原子且耐久；domain 保证读面与介质在每次 `await` 之后一致，并且 `domain/changed` 带的是提交后整值。

capability 三角刻意切开：hub 不知道 `workspace` 是什么；json backend 不知道 zod；`defineDomain` 的拥有者不知道文件路径。换 backend 名（或给某个 domain 配 `routes`）只换介质。卸掉 `storage-domain`，`ctx.storageDomain` 消失，消费者挂起，不是静默写到别处。

只挂 web-app：headless 一轮任务不需要 workspace 注册表、listing cache、feedback sidecar。默认安装是 `dsh web`，这条缝跟 `webserver` / `api-gateway` 同层出现。

JSON 默认介质选可读整文件，是因为 shipped 三个 domain 都是低频、整值替换、人要能打开看。`storage-sqlite` 留给高频单 key 更新，所以实现了但没有 shipped 行。

## Gotcha

- **这不是 session log。** `$DSH_HOME/sessions/` 是 JSONL（base 行 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`）；`$DSH_HOME/storages/<unit>.json` 是这条缝。compaction 的 `replace` 不删 log，也碰不到 storages 目录。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101]
- **shipped session-query 默认 `openAt: never`。** base 挂 `session-query-sqlite`；web-app 同键再写一遍仍是 `never`。不是本缝开了 FTS，也不是 `ctx.storage` 的 sqlite backend。 [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:33]
- **`domain/changed` 没有 `next()`。** 把它当 waterfall、指望「不调用 next 就挡住写」是错的。写在 emit 之前已经提交。
- **打开时 zod 校验每一条。** 盘上有一条坏 table record，整个 `open` 失败（`invalid-record`），`detail` 是该 table/key（测试钉 `items`/`bad`），不是跳过该 key。 [E: packages/storage/storage-domain/tests/domain.spec.ts:125] [E: packages/storage/storage-domain/tests/domain.spec.ts:127]
- **global 坏记录的 marker 是空串。** 盘上 global 通不过 schema 时同样整次 `open` 失败（`invalid-record`），`detail.table` / `detail.key` 都是 `''`。 [E: packages/storage/storage-domain/src/index.ts:132] [E: packages/storage/storage-domain/tests/domain.spec.ts:136] [E: packages/storage/storage-domain/tests/domain.spec.ts:138]
- **`null` global 不能当业务值。** `defineDomain` 拒接受 `null` 的 global schema；介质用 `null` 表示从未 `set`。 [E: packages/storage/storage-domain/src/spec.ts:91]
- **JSON 缺文件 ≠ 坏盘。** 第一次 `open` 不创建 `<unit>.json`；第一笔成功 write 才物化。 [E: packages/storage/storage-json/tests/json-backend.spec.ts:53]
- **两套 version 不要混。** JSON / sqlite **unit** 的 `descriptor.version` 是 domain spec 的 `version`（workspace 2 / projcache 3 / feedback 0）。sqlite **数据库** 的 `user_version` 是 `STORAGE_SQLITE_SCHEMA_VERSION = 1`。session 盘 15、query 盘 8、event `version` 0 是另外三套。
- **`storage-sqlite` 不是 `dsh web` 默认。** 仓库有包，web-app 依赖列表与 insert 都只有 json。要走 sqlite 必须自己登记 backend 并把 `storage-domain` 的 `backend` / `routes` 指过去。
- **双开同一 domain / 同一 unit 是调用方 bug。** facility 抛 `already-open`；json / sqlite backend 抛 already open。先 `close` 才能再 `open`。
- **JSON `rename` 是 last-write-wins。** 这跟 session JSONL 的 POSIX `link()+unlink()` 无覆盖协议不同：一个 unit 每进程只有一个 writer。
- **storage-sqlite 拒盘不迁。** `user_version` 非 0 且不等于 1 直接 `version-mismatch`。失败的半截物化故意不 stamp，修完障碍再开仍是 0。 [E: packages/storage/storage-sqlite/tests/sqlite-backend.spec.ts:143]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | base | web-app | headless |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-storage`（`Storage` + `StorageForms` + `KvUnit`） | `ctx.storage`；form 经 `mount` / `form` | **无** | 行 `id: storage` | **无** |
| Definition（domain form） | `@deepseek-ai/dsh-storage-domain`（`defineDomain` / `DomainFacility`） | `ctx.storage.domain` 与 `ctx.storageDomain` 同一实例；`open(spec)` | **无** | 行 `id: storage-domain`，`backend: json` | **无** |
| Provider（shipped 介质） | `@deepseek-ai/dsh-storage-json`（`JsonStorageBackend`） | 登记名 `json`；lifecycle `storage.backend.json`；根 `dshHomePath('storages')` | **无** | 行 `id: storage-json` | **无** |
| Provider（未 shipped） | `@deepseek-ai/dsh-storage-sqlite`（`SqliteStorageBackend`） | 登记名 `sqlite`；`STORAGE_SQLITE_SCHEMA_VERSION = 1` 拒旧盘 | **无** | **无** | **无** |
| Consumer | `dsh-workspace` / `dsh-session-projection-cache` / `dsh-message-feedback` | `inject` `storageDomain`；`open` 各自 spec | **无** | 行 `workspace` / `session-projection-cache` / `message-feedback` | **无** |

换 json → sqlite 只换 backend 登记名与 `storage-domain` 的 `backend` / `routes`。换 loop 或换 session JSONL 后端不影响这条缝。preset 需要私有 Provider 时必须 `isolate`；`storage` 不是那种私有服务。shipped log 介质是 base 行 `session-persistence-jsonl`（`root: dshHomePath('sessions')`）。同层 `session-query-sqlite` 写 `openAt: never`。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:121]

## Sources

- packages/storage/storage/src/index.ts
- packages/storage/storage/src/backend.ts
- packages/storage/storage/src/registry.ts
- packages/storage/storage/tests/registry.spec.ts
- packages/storage/storage-domain/src/index.ts
- packages/storage/storage-domain/src/domain.ts
- packages/storage/storage-domain/src/spec.ts
- packages/storage/storage-domain/src/events.ts
- packages/storage/storage-domain/tests/domain.spec.ts
- packages/storage/storage-json/src/index.ts
- packages/storage/storage-json/src/atomic.ts
- packages/storage/storage-json/src/unit.ts
- packages/storage/storage-json/src/format.ts
- packages/storage/storage-json/tests/json-backend.spec.ts
- packages/storage/storage-sqlite/src/index.ts
- packages/storage/storage-sqlite/src/schema.ts
- packages/storage/storage-sqlite/src/unit.ts
- packages/storage/storage-sqlite/tests/sqlite-backend.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/headless/cordis.patch.yml
- packages/workspace/workspace/src/index.ts
- packages/workspace/workspace/src/spec.ts
- packages/session/session-projection-cache/src/index.ts
- packages/session/session-projection-cache/src/spec.ts
- packages/feedback/message-feedback/src/index.ts
- packages/feedback/message-feedback/src/spec.ts
- packages/util/home-paths/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/index.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session-query/session-query-sqlite/src/schema.ts
- packages/settings/settings/src/index.ts
- packages/settings/settings/tests/settings.spec.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/credentials/credentials-local/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer；host 面 vs agent-preset 面。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；默认产品路径是 `dsh web`。
- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages()`、`surfaceOp` replace。本缝不写那条 log。
- [subsys.persistence.jsonl](jsonl.md)：base 挂 `session-persistence-jsonl`，`root: dshHomePath('sessions')`。本缝的盘是 `storages/`。
- [subsys.persistence.session-query](session-query.md)：shipped `openAt: never`；不是 `ctx.storage` 的 sqlite backend。
- [subsys.persistence.workspace](workspace.md)：只 web-app 的 workspace 实体；domain `workspace` v2 落在 `storages/workspace.json`。
- [subsys.persistence.projection](projection.md)：`ctx.sessionProjections` 是权威 fold；cache 用 domain `session_projcache` v3 做 shortcut。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/flush` parallel、`SESSION_FORMAT_VERSION`。
- [subsys.interaction.feedback](../interaction/feedback.md)：message feedback 产品规则；本缝只提供 domain `message_feedback` v0。
- [surface.profiles.web](../../surface/profiles/web.md)：`dsh web` 组合面；storage 三行出现在这一层。
