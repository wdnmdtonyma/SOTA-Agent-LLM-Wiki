---
id: subsys.agent-core.memory-storage
title: 内存会话仓库(MemorySessionRepo)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/memory.ts
  - packages/agent/src/harness/session/in-memory-storage-state.ts
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/session/values.ts
  - packages/agent/src/harness/session/fork-policy.ts
symbols:
  - MemorySessionRepo
  - MemoryStorage
  - InMemoryStorageState
  - MemorySessionRepoOptions
  - MemoryStorage.fork
  - InMemoryStorageState.createFork
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.tree-navigation
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.agent-core.memory-storage` 描述进程内 v4 session backend：`MemorySessionRepo` 用 `Map<id, MemorySessionRecord>` 保存会话；每个 `MemoryStorage` 持有一份 `InMemoryStorageState`，经 `commitQueue` 串行 `commit(Write[])`。fork 是 `MemoryStorage.fork` → `InMemoryStorageState.createFork`（直接迭代 maps）。旧名 `InMemorySessionRepo` / `InMemorySessionStorage` 已删除。

## 能回答的问题

- 内存 backend 保存什么，重启后还在吗？
- `MemoryStorage` 如何赋值 `seq` / `timestamp`，`parentId` 从哪来？
- create / open / list / delete / fork 如何操作 Map？
- `MemoryStorage.fork` 与 JSONL `runJsonlFork` 共享什么、不共享什么？
- 已打开的 `Session` 在 `delete` 或二次 `open` 时会怎样？

## 职责边界

`MemorySessionRepo` 实现无类型参数特化的 `SessionRepo`（默认 `SessionMetadata` / `SessionCreateOptions` / `void` list options）。它只拥有进程内 `Map` 与 `pendingIds`，没有文件系统或 header。[E: packages/agent/src/harness/session/memory.ts:334] [E: packages/agent/src/harness/session/memory.ts:336]

`MemoryStorage` 实现 `Storage`：写操作 `prepareCommit` + `applyValidated`；读操作直接问 `InMemoryStorageState`。关闭后所有 API 抛 `MemoryStorage is closed`。[E: packages/agent/src/harness/session/memory.ts:37] [E: packages/agent/src/harness/session/memory.ts:48] [E: packages/agent/src/harness/session/memory.ts:63]

`create` / `open` / `fork` 返回 `MemorySessionFacade`，它把每次调用 `admit` 进 in-flight 集合，`close` 等待这些 promise 后再把 record 标成未打开。底层 `StorageBackedSession` 仍持有同一份 `MemoryStorage`。[E: packages/agent/src/harness/session/memory.ts:439] [E: packages/agent/src/harness/session/memory.ts:295]

`InMemoryStorageState` 的连续 `seq`、branch walk、stats 与 commit 校验由 [subsys.agent-core.session-storage](session-storage.md) 权威说明；本节点只写内存封装与 `createFork` 差异。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:78] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:141]

## 关键文件

- `packages/agent/src/harness/session/memory.ts`：`MemoryStorage`（含 `fork`）、`MemorySessionFacade`、`MemorySessionRepo`。[E: packages/agent/src/harness/session/memory.ts:37] [E: packages/agent/src/harness/session/memory.ts:112] [E: packages/agent/src/harness/session/memory.ts:334]
- `packages/agent/src/harness/session/in-memory-storage-state.ts`：共享物化态（memory 与 JSONL 共用）与 `createFork`。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:78] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:141]
- `packages/agent/src/harness/session/fork-policy.ts`：与 JSONL 共用的 `selectBranchFork` / `projectForkCurrentStateWrite`。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:10]
- `packages/agent/src/harness/session/session.ts`：`StorageBackedSession` 与 typed session errors。[E: packages/agent/src/harness/session/session.ts:224]

## 数据模型

每个 record 保存 `SessionMetadata`（`id` / `createdAt` / `storageVersion: 1` / 可选 `parentSessionId`）、一份 `MemoryStorage` 和一份 `StorageBackedSession`，以及 `open` 标志。[E: packages/agent/src/harness/session/memory.ts:138] [E: packages/agent/src/harness/session/memory.ts:350] [E: packages/agent/src/harness/session/memory.ts:136]

repo 的 `sessions` 以 session id 为键。没有 cwd、path 或 application metadata 字段。[E: packages/agent/src/harness/session/memory.ts:336]

`commit` 用 `now()`（默认 `Date.now`）作 timestamp，`prepareCommit` 从 `nextSeq` 起连续编号。`parentId` 必须已在 state 或本事务的 entry writes 里；`appendToBranch` 在 Session 层读 tip 填进去。[E: packages/agent/src/harness/session/memory.ts:51] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:97] [E: packages/agent/src/harness/session/session.ts:433]

`createFork` 新建一份 `InMemoryStorageState`：按 plan 复制 entry maps，对当前 scalar 与 list 元素调用 `projectForkCurrentStateWrite`，`destination.nextSeq = this.nextSeq`。不复制 usage rows，因此 fork 后 `stats.usage` 仍是 empty。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:148] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:191] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:93]

## 控制流

1. `MemorySessionRepo.create@packages/agent/src/harness/session/memory.ts:345`：`id = options.id ?? uuidv7(createdAt)`；`sessions` 或 `pendingIds` 已有该 id 则 `Session already exists`。新建 storage 的 `storageVersion = 1`。[E: packages/agent/src/harness/session/memory.ts:348] [E: packages/agent/src/harness/session/memory.ts:446] [E: packages/agent/src/harness/session/memory.ts:353]
2. `open@packages/agent/src/harness/session/memory.ts:375` 按 `metadata.id` 取 record；缺失 → `Unknown session`；`record.open` 已是 true → `Session is already open`。[E: packages/agent/src/harness/session/memory.ts:380] [E: packages/agent/src/harness/session/memory.ts:381]
3. `list@packages/agent/src/harness/session/memory.ts:386` 返回 Map 里每条 metadata，无过滤、无排序约定（遍历顺序即 Map 插入顺序）。[E: packages/agent/src/harness/session/memory.ts:388]
4. `delete@packages/agent/src/harness/session/memory.ts:391`：未知 id 抛错；仍 `open` 则 `Session is open`；否则先 `session.close` 再从 Map 删除。[E: packages/agent/src/harness/session/memory.ts:394] [E: packages/agent/src/harness/session/memory.ts:395]
5. `fork@packages/agent/src/harness/session/memory.ts:400`：目标 id 同样 `reserveId`；`sourceRecord.storage.fork(options)` 排在 source 的 `commitQueue` 上，内部 `storageState.createFork`；新 record 的 `parentSessionId = source.id`。[E: packages/agent/src/harness/session/memory.ts:409] [E: packages/agent/src/harness/session/memory.ts:116] [E: packages/agent/src/harness/session/memory.ts:414]
6. `close@packages/agent/src/harness/session/memory.ts:430` 关闭 repo 并 `close` 所有底层 `StorageBackedSession`。[E: packages/agent/src/harness/session/memory.ts:433]

不存在 `captureForkSource` / `MemoryStorage.fromSnapshot`。`createForkSnapshot` 仍从 session barrel 导出，但 `MemorySessionRepo` 生产路径不调用它。[I]

## 设计动机与权衡

内存与 JSONL 共用 `InMemoryStorageState`、`prepareStorageCommit` 以及 `fork-policy.ts`，因此 seq、parent 校验、branch walk、stats 与 fork 复制/排除规则一致；差别只在 durable 写入、metadata 形状、JSONL 的文件修复 / v3 升级，以及 JSONL fork 必须两趟读文件。[E: packages/agent/src/harness/session/memory.ts:51] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:10] [I]

`MemoryStorage.fork` 把 `createFork` 挂在与 `commit` 同一条 `commitQueue` 上，保证 fork 看到的是“两次 source commit 之间”的一个序列化边界。[E: packages/agent/src/harness/session/memory.ts:112] [E: packages/agent/src/harness/session/memory.ts:114]

`MemoryStorage.commit` 有 `commitQueue`，同一 storage 上的并发 commit 会串行。这与旧 wiki 里“内存 storage 没有 enqueue tail”不同。[E: packages/agent/src/harness/session/memory.ts:50] [E: packages/agent/src/harness/session/memory.ts:55]

读路径直接返回 state 里的对象引用（`getEntries` / `getValue` 不 `structuredClone`）。调用方 mutate 返回值可能污染内部 index。[E: packages/agent/src/harness/session/memory.ts:64] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:243] [I]

## Gotcha

- 这是易失仓库：进程或 repo 实例结束后没有可重建介质，不能用它验证 reopen-from-disk、torn-tail 或 `renameFile` 行为。[E: packages/agent/src/harness/session/memory.ts:336] [I]
- `delete` 要求会话已 close。仍 open 时抛 `Session is open`，不会从 Map 偷偷摘掉让旧 handle 继续写。[E: packages/agent/src/harness/session/memory.ts:395]
- 同一 id 不能被两个 facade 同时打开；第二次 `open` 抛 `Session is already open`。[E: packages/agent/src/harness/session/memory.ts:381]
- `create()` 不建 `main` branch。测试与宿主必须自己 `createBranch`。[E: packages/agent/src/harness/session/testing/conformance/session-repo.ts:159]
- list 没有 cwd 过滤：内存 metadata 默认没有 `cwd`。[E: packages/agent/src/harness/session/memory.ts:350]
- `createFork` 丢掉全部 usage；fork 后的 `getStats().usage` 不会带上源会话累计 token。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:156] [I]

## 跨包边界

本节点属于 `pi-agent-core` 通用 harness，适合测试与无需落盘的宿主。产品级 coding-agent session 文件与 JSONL v4 磁盘布局分别见 [ref.coding-agent.session-format](../../reference/session-format.md) 与 [subsys.agent-core.jsonl-storage](jsonl-storage.md)。[I]

`session/index.ts` 导出 `MemorySessionRepo` / `MemorySessionRepoOptions`，再由 `packages/agent/src/index.ts` 进入公共 API。[E: packages/agent/src/harness/session/index.ts:24]

## Sources

- packages/agent/src/harness/session/memory.ts
- packages/agent/src/harness/session/in-memory-storage-state.ts
- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/session/values.ts
- packages/agent/src/harness/session/fork-policy.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：`SessionRepo` / `Storage` / `InMemoryStorageState` 契约与 fork 复制规则。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：`Branch`、branch query、context 投影。
