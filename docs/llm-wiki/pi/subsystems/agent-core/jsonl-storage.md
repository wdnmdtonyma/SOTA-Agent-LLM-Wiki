---
id: subsys.agent-core.jsonl-storage
title: JSONL 会话仓库与存储
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/jsonl-repo.ts
  - packages/agent/src/harness/session/array-session-index.ts
  - packages/agent/src/harness/session/keyed-operation-queue.ts
  - packages/agent/src/harness/session/session.ts
symbols:
  - JsonlSessionRepository
  - JsonlSessionBackend
  - loadJsonlSessionMetadata
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.tree-navigation
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: 305c014dcc
---

> `subsys.agent-core.jsonl-storage` 描述 `pi-agent-core` 的 durable JSONL 实现：公开的 `JsonlSessionRepository` 返回 `Session`，内部 `JsonlSessionBackend` 负责文件、共享索引与并发队列。

## 能回答的问题

- JSONL header 与 entry 如何校验？
- create/open/list/append/fork 如何映射到文件操作？
- 同一 session 与不同 session 的并发如何约束？
- malformed 文件、重复 entry id 和 disposal 如何表现？

## 职责边界

`JsonlSessionRepository` 实现 `SessionRepository`，公开 `create/open/list/delete/fork` 并拥有 backend 生命周期；`create/open/fork` 都经 `createSession()` 包装 storage。[E: packages/agent/src/harness/session/jsonl-repo.ts:445] [E: packages/agent/src/harness/session/jsonl-repo.ts:457] [E: packages/agent/src/harness/session/jsonl-repo.ts:461] [E: packages/agent/src/harness/session/jsonl-repo.ts:473] [E: packages/agent/src/harness/session/jsonl-repo.ts:484]

`JsonlSessionBackend` 是实现细节：它维护 path → `ArraySessionIndex`、path → operation key，并以 `KeyedOperationQueue` 协调文件操作。[E: packages/agent/src/harness/session/jsonl-repo.ts:209] [E: packages/agent/src/harness/session/jsonl-repo.ts:213] [E: packages/agent/src/harness/session/jsonl-repo.ts:215]

## 文件格式与解析

首行 header 固定 `type: "session"`、`version: 3`，并记录 id、timestamp、cwd，可选 parentSession 与 metadata。[E: packages/agent/src/harness/session/jsonl-repo.ts:48] [E: packages/agent/src/harness/session/jsonl-repo.ts:50] [E: packages/agent/src/harness/session/jsonl-repo.ts:55] `parseHeader()` 会校验版本与每个必需字段；metadata 必须是非数组 object。[E: packages/agent/src/harness/session/jsonl-repo.ts:78] [E: packages/agent/src/harness/session/jsonl-repo.ts:88] [E: packages/agent/src/harness/session/jsonl-repo.ts:101] [E: packages/agent/src/harness/session/jsonl-repo.ts:105]

后续每个非空行是一条 entry。解析至少验证 type、id、parentId、timestamp，并额外验证 leaf 的 targetId；完整 load 还会拒绝重复 entry id。[E: packages/agent/src/harness/session/jsonl-repo.ts:118] [E: packages/agent/src/harness/session/jsonl-repo.ts:134] [E: packages/agent/src/harness/session/jsonl-repo.ts:140] [E: packages/agent/src/harness/session/jsonl-repo.ts:175] [E: packages/agent/src/harness/session/jsonl-repo.ts:177]

`loadJsonlSessionMetadata()` 只读首行，因此 list 不需要加载全部 history。[E: packages/agent/src/harness/session/jsonl-repo.ts:157] [E: packages/agent/src/harness/session/jsonl-repo.ts:162] [E: packages/agent/src/harness/session/jsonl-repo.ts:166]

## Repository 控制流

1. create 生成 UUIDv7 session id 与 timestamp，把 id 做 URI 编码后拼进 `.jsonl` 文件名；cwd 则编码为 sessions root 下的目录名。[E: packages/agent/src/harness/session/jsonl-repo.ts:186] [E: packages/agent/src/harness/session/jsonl-repo.ts:190] [E: packages/agent/src/harness/session/jsonl-repo.ts:195] [E: packages/agent/src/harness/session/jsonl-repo.ts:200]
2. `createDocument()` 递归创建目录，拒绝覆盖同一路径，写入 header 与初始 entries，并建立内存索引。[E: packages/agent/src/harness/session/jsonl-repo.ts:355] [E: packages/agent/src/harness/session/jsonl-repo.ts:363] [E: packages/agent/src/harness/session/jsonl-repo.ts:371] [E: packages/agent/src/harness/session/jsonl-repo.ts:383] [E: packages/agent/src/harness/session/jsonl-repo.ts:385]
3. open 完整加载文件并以文件内容 replace 既有 index；不存在的 path 返回 `not_found`。[E: packages/agent/src/harness/session/jsonl-repo.ts:242] [E: packages/agent/src/harness/session/jsonl-repo.ts:246] [E: packages/agent/src/harness/session/jsonl-repo.ts:248] [E: packages/agent/src/harness/session/jsonl-repo.ts:250]
4. append 在同一 operation key 内检查文件与重复 id，然后先 append JSON line、再更新共享 index。[E: packages/agent/src/harness/session/jsonl-repo.ts:275] [E: packages/agent/src/harness/session/jsonl-repo.ts:277] [E: packages/agent/src/harness/session/jsonl-repo.ts:288] [E: packages/agent/src/harness/session/jsonl-repo.ts:290] [E: packages/agent/src/harness/session/jsonl-repo.ts:293]
5. storage facade 的 head/read/query/projection 全部从 `ArraySessionIndex` 读取，只有 append 落盘。[E: packages/agent/src/harness/session/jsonl-repo.ts:390] [E: packages/agent/src/harness/session/jsonl-repo.ts:395] [E: packages/agent/src/harness/session/jsonl-repo.ts:401] [E: packages/agent/src/harness/session/jsonl-repo.ts:407]

## List、Fork 与并发

`list()` 是全局 queue barrier：它枚举 cwd 目录中的所有 `.jsonl`，逐个读取 header，再按 createdAt 降序返回。[E: packages/agent/src/harness/session/jsonl-repo.ts:255] [E: packages/agent/src/harness/session/jsonl-repo.ts:257] [E: packages/agent/src/harness/session/jsonl-repo.ts:266] [E: packages/agent/src/harness/session/jsonl-repo.ts:270] [E: packages/agent/src/harness/session/jsonl-repo.ts:272]

同一 document key 的操作串行；跨 key 默认最多同时执行 4 个操作，调用方可通过 `maxConcurrentOperations` 覆盖。[E: packages/agent/src/harness/session/jsonl-repo.ts:28] [E: packages/agent/src/harness/session/jsonl-repo.ts:46] [E: packages/agent/src/harness/session/jsonl-repo.ts:222] [E: packages/agent/src/harness/session/keyed-operation-queue.ts:18]

fork 在 source key 上重读与选取 entries，在新 document key 上创建目标文件；默认继承 source path 为 parentSessionPath，并在未覆盖时继承 metadata。[E: packages/agent/src/harness/session/jsonl-repo.ts:309] [E: packages/agent/src/harness/session/jsonl-repo.ts:316] [E: packages/agent/src/harness/session/jsonl-repo.ts:324] [E: packages/agent/src/harness/session/jsonl-repo.ts:331] [E: packages/agent/src/harness/session/jsonl-repo.ts:332]

## 设计动机与权衡

磁盘是 durable truth，`ArraySessionIndex` 是每次 create/open 后建立的进程内加速层。append-only 文件保留历史，而 leaf、label、name 与 stats 由 entry projection 计算。[E: packages/agent/src/harness/session/jsonl-repo.ts:248] [E: packages/agent/src/harness/session/jsonl-repo.ts:293] [E: packages/agent/src/harness/session/array-session-index.ts:24] [I]

## Gotcha

- list 不会跳过坏文件：循环直接 await 每个 `loadJsonlSessionMetadata()`，任一 malformed header 都会使整个 list 拒绝。[E: packages/agent/src/harness/session/jsonl-repo.ts:263] [E: packages/agent/src/harness/session/jsonl-repo.ts:270]
- 文件名中的 session id 是 `encodeURIComponent(id)`，不能假设原始 id 可直接当文件名片段。[E: packages/agent/src/harness/session/jsonl-repo.ts:193] [E: packages/agent/src/harness/session/jsonl-repo.ts:200]
- disposal 先标记 disposed，再 drain 已接收操作；之后任何新入口都会抛 storage error。[E: packages/agent/src/harness/session/jsonl-repo.ts:339] [E: packages/agent/src/harness/session/jsonl-repo.ts:341] [E: packages/agent/src/harness/session/jsonl-repo.ts:348]

## 跨包边界

本节点是 `pi-agent-core` 的通用 harness storage，不是 `pi-coding-agent` 的产品 session 文件实现；两者虽然都是 JSONL/树状历史，但格式与 manager API 各自独立。[I]

## Sources

- packages/agent/src/harness/session/jsonl-repo.ts
- packages/agent/src/harness/session/array-session-index.ts
- packages/agent/src/harness/session/keyed-operation-queue.ts
- packages/agent/src/harness/session/session.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：repository/storage/Session 三层 contract。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：branch path、leaf 和 context projection。
- [ref.coding-agent.session-format](../../reference/session-format.md)：产品级 coding-agent session 格式。
