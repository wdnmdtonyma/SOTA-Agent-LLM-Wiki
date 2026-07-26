---
id: subsys.storage.sqlite-node
title: Node SQLite 会话存储
kind: subsystem
tier: T2
pkg: storage
source:
  - scripts/publish.mjs
  - packages/agent/README.md
  - packages/storage/sqlite-node/package.json
  - packages/storage/sqlite-node/src/index.ts
  - packages/storage/sqlite-node/src/sqlite/repo.ts
  - packages/storage/sqlite-node/src/sqlite/storage/index.ts
  - packages/storage/sqlite-node/src/sqlite/migrations.ts
  - packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql
  - packages/storage/sqlite-node/src/sqlite/types.ts
symbols:
  - SqliteSessionRepo
  - SqliteSessionStorage
  - createNodeSqliteFactory
  - wrapNodeSqliteDatabase
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.session-tree
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: cee5ff7520
---

> `@earendil-works/pi-storage-sqlite-node` 是根发布流水线中的可发布 Node SQLite session backend：用 `node:sqlite` 适配 agent-core 的通用 `SessionRepo` / `SessionStorage` contract。[E: scripts/publish.mjs:10]

## 包与适配层

该包发布根 export，要求 Node `>=22.19.0`，依赖 `^0.82.1` 的 `pi-ai` 与 `pi-agent-core`。[E: packages/storage/sqlite-node/package.json:2] [E: packages/storage/sqlite-node/package.json:8] [E: packages/storage/sqlite-node/package.json:31] [E: packages/storage/sqlite-node/package.json:32] [E: packages/storage/sqlite-node/package.json:35] [E: packages/storage/sqlite-node/package.json:36]

`createNodeSqliteFactory()` 用 `DatabaseSync` 打开文件；wrapper 把同步 statement API 包成 Promise-shaped `SqliteDatabase`，transaction 显式执行 `BEGIN` / `COMMIT`，失败时尝试 `ROLLBACK` 后重抛原错误。[E: packages/storage/sqlite-node/src/index.ts:2] [E: packages/storage/sqlite-node/src/index.ts:48] [E: packages/storage/sqlite-node/src/index.ts:63] [E: packages/storage/sqlite-node/src/index.ts:69] [E: packages/storage/sqlite-node/src/index.ts:84] [E: packages/storage/sqlite-node/src/index.ts:88]

## Repo 生命周期

`SqliteSessionRepo` 需要访问数据库时共用 `openDatabase()`：先创建父目录，配置 WAL、`synchronous=FULL`、5 秒 busy timeout，再应用 migrations；`list()` 在数据库文件不存在时会先返回空数组，不会打开数据库。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:30] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:65] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:74] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:87] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:104] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:120] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:122] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:123] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:125] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:144] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:163]

`create()` 生成或接受 session id，建立 session、sequence 与 materialized-state 初始记录；`open()` 先按 metadata path 检查存在性，再加载 session row、active leaf/branch 和 materialized state；`list({ cwd })` 可按 cwd 筛选并按创建时间倒序返回 metadata。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:87] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:90] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:91] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:104] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:106] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:110] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:112] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:120] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:127] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:130] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:135] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:202] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:214] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:224] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:237] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:239]

`delete()` 在单个 transaction 内删除 branch、entry、materialized、sequence 与 session rows；最后一项未命中时抛 `not_found`。`fork()` 从源 storage 选出指定 entry/position 对应的 entries，关闭源 storage，创建以源 session 为默认 parent 的新 session，再依序 append 复制的 entries。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:144] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:147] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:148] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:153] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:154] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:155] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:163] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:167] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:170] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:172] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:177] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:180] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:183] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:184]

migration runner 建立 migration ledger，并按 `loadMigrations()` 返回的数组顺序，在 transaction 中执行尚未应用的 migration 与 ledger insert；migration object 虽带 `order` 字段，当前 runner 没有读取它来排序。[E: packages/storage/sqlite-node/src/sqlite/migrations.ts:5] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:15] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:25] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:34] [E: packages/storage/sqlite-node/src/sqlite/migrations.ts:40]

首个 schema migration 建立六张业务表：`sessions`、`session_entries`、`session_sequences`、`branch_entries`、`session_materialized`、`entry_materialized`，并为 session 时间/cwd/parent、entry sequence/parent/type、branch 与 materialized type/sequence 建索引。[E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:1] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:10] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:14] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:25] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:29] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:34] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:42] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:46] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:51] [E: packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql:59]

## Storage 写入、分支与读取

`SqliteSessionStorage.appendEntry()` 先 snapshot 内存 materialized state、entry map、leaf 与 active branch，再在一个 database transaction 内写 entry、推进 sequence、更新 session materialized summary、写 per-entry materialized rows、更新 active leaf 和 branch membership；失败时恢复全部内存 snapshot，并把非 `SessionError` 包成 storage error。[E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:291] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:293] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:299] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:304] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:305] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:306] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:307] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:312] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:313] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:316] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:321] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:323] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:337] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:338] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:343] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:344]

branch materialization 只在 leaf navigation 或从已有 child 的 parent 新建 fork 时重建 path；普通 linear append 只向 active branch 加新 tip。leaf entry 会将 active branch 清空，按 target leaf 重建，再把 navigation entry 追加到新 branch。[E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:146] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:151] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:157] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:160] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:164] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:167] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:169] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:176] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:180] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:326] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:328] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:329] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:331] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:332] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:334]

读取保持 JSONL-like permissive resume：单条 malformed entry 的 `getEntry()` 返回 `undefined`，批量 `findEntries()` / `getEntries()` 跳过无法 decode 的 rows；cursor 读取支持 `limit` 与 `afterEntrySeq`，查询倒序 limit 后再 reverse 为时间顺序。storage 还直接暴露 leaf、label、session name、materialized stats、当前分支 path，并由 `cleanup()` 关闭 database。[E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:35] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:36] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:39] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:43] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:348] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:357] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:358] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:361] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:362] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:366] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:375] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:377] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:380] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:384] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:391] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:395] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:399] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:405] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:407] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:410] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:423] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:427] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:432] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:434] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:443] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:446] [E: packages/storage/sqlite-node/src/sqlite/storage/index.ts:447]

## L2 证伪与边界

- 这是可发布的可选 backend，不是 coding-agent 默认 session 格式的替换；agent-core README 明确把 SQLite backend 放在独立包中，使 core 默认不拉入 runtime builtin/native SQLite dependency。[E: scripts/publish.mjs:10] [E: packages/agent/README.md:11] [E: packages/agent/README.md:13] [E: packages/storage/sqlite-node/package.json:4] [E: packages/storage/sqlite-node/src/sqlite/types.ts:52]
- Node adapter 虽返回 Promise，但底层是 `DatabaseSync`；不能把它描述为非阻塞 SQLite driver。[E: packages/storage/sqlite-node/src/index.ts:2] [E: packages/storage/sqlite-node/src/index.ts:48]
- `open(metadata)` 先检查 metadata path，却通过 repo 的 configured database path 打开数据库；metadata 与 repo 配置的一致性是调用方约束，本实现没有比较两者。[E: packages/storage/sqlite-node/src/sqlite/repo.ts:104] [E: packages/storage/sqlite-node/src/sqlite/repo.ts:110] [I]

## Sources

- scripts/publish.mjs
- packages/agent/README.md
- packages/storage/sqlite-node/package.json
- packages/storage/sqlite-node/src/index.ts
- packages/storage/sqlite-node/src/sqlite/repo.ts
- packages/storage/sqlite-node/src/sqlite/storage/index.ts
- packages/storage/sqlite-node/src/sqlite/migrations.ts
- packages/storage/sqlite-node/src/sqlite/migrations/001_initial.sql
- packages/storage/sqlite-node/src/sqlite/types.ts

## 相关

- [subsys.agent-core.session-storage](../agent-core/session-storage.md): backend 实现的通用 `SessionRepo` / `SessionStorage` contract。
- [subsys.agent-core.session-tree](../agent-core/session-tree.md): SQLite 持久化的 tree entry 模型。
- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent 默认 JSONL 产品格式，用于区分可选 backend。
