---
id: persistence.storage-v1
title: V1 JSON 键值存储
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/storage/storage.ts
  - packages/opencode/src/storage/schema.ts
symbols:
  - Storage.Service
  - Storage.layer
  - Storage.NotFoundError
related:
  - persistence.database
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 JSON 键值存储是 `packages/opencode/src/storage/storage.ts` 中的 file-backed `@opencode/Storage` service：key 是 string array，落盘路径是 `Global.Path.data/storage/<key...>.json`。

## 能回答的问题

- V1 JSON KV 的 key 如何映射到 `.json` 文件路径。
- `read/write/update/remove/list` 的并发锁和 NotFound 行为是什么。
- V1 JSON storage 自带的两个 migration 在迁移什么。
- 为什么 `packages/opencode/src/storage/schema.ts` 不是 V1 JSON KV schema。
- V1 JSON KV 与 V2 Drizzle/SQLite database 的关系是什么。

## 职责边界

`persistence.storage-v1` 只覆盖 V1 JSON KV service；V2 SQLite/Drizzle、tables、migrations 是 database scope。[I] `packages/opencode/src/storage/schema.ts` 是一个命名陷阱：它 re-export 的是 core Drizzle table definitions，而不是 `storage.ts` 的 JSON KV schema。[E: packages/opencode/src/storage/schema.ts:1][E: packages/opencode/src/storage/schema.ts:2][E: packages/opencode/src/storage/schema.ts:3][E: packages/opencode/src/storage/schema.ts:4][E: packages/opencode/src/storage/schema.ts:5][I]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `packages/opencode/src/storage/storage.ts` | V1 JSON KV service、JSON read/write/update/list、两个 filesystem migrations。 |
| `packages/opencode/src/storage/schema.ts` | Drizzle table re-export compatibility file，不是 JSON KV schema。 |

## 数据模型

| 实体 | 字段/行为 | 证据 |
| --- | --- | --- |
| `Storage.NotFoundError` | tagged error `"NotFoundError"`，携带 `message: string`，并提供 `isInstance` helper。 | [E: packages/opencode/src/storage/storage.ts:11][E: packages/opencode/src/storage/storage.ts:12][E: packages/opencode/src/storage/storage.ts:14] |
| `Storage.Interface` | 暴露 `remove/read/update/write/list`；所有 key 都是 `string[]`。 | [E: packages/opencode/src/storage/storage.ts:53][E: packages/opencode/src/storage/storage.ts:54][E: packages/opencode/src/storage/storage.ts:55][E: packages/opencode/src/storage/storage.ts:56][E: packages/opencode/src/storage/storage.ts:57][E: packages/opencode/src/storage/storage.ts:58] |
| `Service` | service tag 是 `@opencode/Storage`。 | [E: packages/opencode/src/storage/storage.ts:61] |
| Path mapping | `file(dir, key)` 等于 `path.join(dir, ...key) + ".json"`。 | [E: packages/opencode/src/storage/storage.ts:63][E: packages/opencode/src/storage/storage.ts:64] |
| Root directory | runtime state 把 storage root 定为 `path.join(Global.Path.data, "storage")`。 | [E: packages/opencode/src/storage/storage.ts:222][E: packages/opencode/src/storage/storage.ts:224] |
| Migration marker | migration marker 文件是 `<storage root>/migration`，缺失或 parse 失败从 0 开始。 | [E: packages/opencode/src/storage/storage.ts:76][E: packages/opencode/src/storage/storage.ts:77][E: packages/opencode/src/storage/storage.ts:78][E: packages/opencode/src/storage/storage.ts:225][E: packages/opencode/src/storage/storage.ts:226][E: packages/opencode/src/storage/storage.ts:227][E: packages/opencode/src/storage/storage.ts:228][E: packages/opencode/src/storage/storage.ts:229] |
| Per-file lock | `RcMap` 按 resolved target filepath 创建 `TxReentrantLock`，每个 target 有独立 read/write lock。 | [E: packages/opencode/src/storage/storage.ts:218][E: packages/opencode/src/storage/storage.ts:219][E: packages/opencode/src/storage/storage.ts:261][E: packages/opencode/src/storage/storage.ts:262] |

## 控制流

1. `layer` 启动时取 `FSUtil.Service` 与 `Git.Service`，并创建 path-keyed `RcMap` locks。[E: packages/opencode/src/storage/storage.ts:213][E: packages/opencode/src/storage/storage.ts:216][E: packages/opencode/src/storage/storage.ts:217][E: packages/opencode/src/storage/storage.ts:218]
2. state 初始化读取 `<data>/storage/migration`，parse 当前 migration index；缺失视为 0。[E: packages/opencode/src/storage/storage.ts:224][E: packages/opencode/src/storage/storage.ts:225][E: packages/opencode/src/storage/storage.ts:226][E: packages/opencode/src/storage/storage.ts:227][E: packages/opencode/src/storage/storage.ts:228]
3. 对 `MIGRATIONS` 中未完成项逐个运行；每个成功 step 后写 marker 为 `i + 1`，失败则记录 log 并停止后续 migration。[E: packages/opencode/src/storage/storage.ts:231][E: packages/opencode/src/storage/storage.ts:234][E: packages/opencode/src/storage/storage.ts:235][E: packages/opencode/src/storage/storage.ts:236][E: packages/opencode/src/storage/storage.ts:237][E: packages/opencode/src/storage/storage.ts:239]
4. `withResolved(key, fn)` 在 scoped effect 中把 key 解析为 target `.json` 文件，并取 target 对应 lock 后调用 fn。[E: packages/opencode/src/storage/storage.ts:255][E: packages/opencode/src/storage/storage.ts:259][E: packages/opencode/src/storage/storage.ts:261][E: packages/opencode/src/storage/storage.ts:262]
5. `remove(key)` 持 write lock 删除 target；missing 被吞掉为 `Effect.void`。[E: packages/opencode/src/storage/storage.ts:266][E: packages/opencode/src/storage/storage.ts:268]
6. `read<T>(key)` 持 read lock 调 `fs.readJson(target)`；missing 被 `wrap` 转成 `NotFoundError`。[E: packages/opencode/src/storage/storage.ts:272][E: packages/opencode/src/storage/storage.ts:275][E: packages/opencode/src/storage/storage.ts:245][E: packages/opencode/src/storage/storage.ts:249]
7. `update<T>(key, fn)` 持 write lock 读 JSON、用传入 mutator 修改同一个 object、写回 pretty JSON，并返回被修改后的 value。[E: packages/opencode/src/storage/storage.ts:251][E: packages/opencode/src/storage/storage.ts:252][E: packages/opencode/src/storage/storage.ts:280][E: packages/opencode/src/storage/storage.ts:283][E: packages/opencode/src/storage/storage.ts:286][E: packages/opencode/src/storage/storage.ts:287][E: packages/opencode/src/storage/storage.ts:288][E: packages/opencode/src/storage/storage.ts:289]
8. `write(key, content)` 持 write lock 写 pretty JSON。[E: packages/opencode/src/storage/storage.ts:296][E: packages/opencode/src/storage/storage.ts:298][E: packages/opencode/src/storage/storage.ts:251][E: packages/opencode/src/storage/storage.ts:252]
9. `list(prefix)` 从 `<storage root>/<prefix...>` 下 glob `**/*` file，missing 或 glob error 返回空数组。[E: packages/opencode/src/storage/storage.ts:301][E: packages/opencode/src/storage/storage.ts:303][E: packages/opencode/src/storage/storage.ts:305][E: packages/opencode/src/storage/storage.ts:307][E: packages/opencode/src/storage/storage.ts:309]
10. `list(prefix)` 对 glob 返回的每个 file path 去掉最后 5 个字符后转回 key array，并按 joined path 排序；调用方期望这些 files 是 `.json` storage files。[E: packages/opencode/src/storage/storage.ts:311][E: packages/opencode/src/storage/storage.ts:312][I]

## Migrations

| Index | 作用 | 证据 |
| --- | --- | --- |
| 1 | 从旧 `../project/<projectDir>/storage/...` 结构迁移 project/session/message/part JSON 文件；如果能从 message JSON 发现 git root，则用 git root commit 作为新 project ID。 | [E: packages/opencode/src/storage/storage.ts:82][E: packages/opencode/src/storage/storage.ts:83][E: packages/opencode/src/storage/storage.ts:97][E: packages/opencode/src/storage/storage.ts:101][E: packages/opencode/src/storage/storage.ts:102][E: packages/opencode/src/storage/storage.ts:104][E: packages/opencode/src/storage/storage.ts:109][E: packages/opencode/src/storage/storage.ts:119][E: packages/opencode/src/storage/storage.ts:121][E: packages/opencode/src/storage/storage.ts:139][E: packages/opencode/src/storage/storage.ts:143][E: packages/opencode/src/storage/storage.ts:150][E: packages/opencode/src/storage/storage.ts:154][E: packages/opencode/src/storage/storage.ts:165][E: packages/opencode/src/storage/storage.ts:169] |
| 2 | 从 migrated session JSON 中抽出 `summary.diffs` 写到 `session_diff/<session>.json`，并把 session summary 改成 additions/deletions aggregate。 | [E: packages/opencode/src/storage/storage.ts:182][E: packages/opencode/src/storage/storage.ts:183][E: packages/opencode/src/storage/storage.ts:190][E: packages/opencode/src/storage/storage.ts:191][E: packages/opencode/src/storage/storage.ts:192][E: packages/opencode/src/storage/storage.ts:200][E: packages/opencode/src/storage/storage.ts:201][E: packages/opencode/src/storage/storage.ts:202] |

## 设计动机与权衡

- 这个 service 是 file-backed KV，不是 relational database；key array 映射到 path 的设计让 caller 自己定义 namespace，例如 `["message", messageID, partID]` 这样的层级。[E: packages/opencode/src/storage/storage.ts:63][I]
- per-target `TxReentrantLock` 让同一 JSON file 的 read/update/write 串行化；不同 target 使用不同 lock 是由 lock key 为 resolved filepath 推断出的并发边界。[E: packages/opencode/src/storage/storage.ts:218][E: packages/opencode/src/storage/storage.ts:262][E: packages/opencode/src/storage/storage.ts:275][E: packages/opencode/src/storage/storage.ts:283][E: packages/opencode/src/storage/storage.ts:298][I]
- migration marker 写在 storage root 内，使 migrations 与 JSON KV 数据同生命周期；它独立于 V2 SQL migration journal。[E: packages/opencode/src/storage/storage.ts:224][E: packages/opencode/src/storage/storage.ts:225][E: packages/opencode/src/storage/storage.ts:239][I]

## Gotchas

- `packages/opencode/src/storage/schema.ts` 的 `SessionTable/MessageTable/PartTable/TodoTable` 来自 `@opencode-ai/core/session/sql`，所以看到 `storage/schema.ts` 不能推断 V1 JSON KV 有 Drizzle schema。[E: packages/opencode/src/storage/schema.ts:3][I]
- `Storage.update` 的 callback 是 mutating draft style；源码直接把 `fs.readJson` 得到的 object 传给 `fn(content as T)`，没有在这个函数里包 Immer draft。[E: packages/opencode/src/storage/storage.ts:286][E: packages/opencode/src/storage/storage.ts:287][I]
- `missing()` 同时识别 Node `ENOENT` 和 Effect platform `NotFound` reason；JSON KV 因此可以把这两类 filesystem missing errors 统一映射成 `Storage.NotFoundError`。[E: packages/opencode/src/storage/storage.ts:67][E: packages/opencode/src/storage/storage.ts:69][E: packages/opencode/src/storage/storage.ts:70][E: packages/opencode/src/storage/storage.ts:71][E: packages/opencode/src/storage/storage.ts:245][E: packages/opencode/src/storage/storage.ts:249][I]

## Sources

- `packages/opencode/src/storage/storage.ts`
- `packages/opencode/src/storage/schema.ts`

## 相关

- [V2 数据库](database.md)
- [DB schema catalog](../../reference/db-schema.md)
