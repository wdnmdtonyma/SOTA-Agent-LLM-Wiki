---
id: subsys.agent-core.memory-storage
title: 内存会话仓库(InMemorySessionRepo)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/memory.ts
  - packages/agent/src/harness/session/state.ts
  - packages/agent/src/harness/session/session.ts
symbols:
  - InMemorySessionRepo
  - InMemorySessionStorage
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.tree-navigation
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.agent-core.memory-storage` 描述进程内 v4 session backend：`InMemorySessionRepo` 用 `Map<id, InMemorySessionStorage>` 保存会话；每个 storage 持有一份 `SessionState`，并通过 `structuredClone` 隔离调用方与内部状态。

## 能回答的问题

- 内存 backend 保存什么，重启后还在吗？
- `InMemorySessionStorage` 如何赋值 `parentId` / `seq` / `timestamp`？
- create / open / list / delete / fork 如何操作 Map？
- 它与 JSONL backend 共享哪些 mutation 语义？
- 已打开的 `Session` 在 `delete` 之后会怎样？

## 职责边界

`InMemorySessionRepo` 实现无类型参数特化的 `SessionRepo`（默认 `SessionMetadata` / `SessionCreateOptions` / `void` list options）。它只拥有进程内 `Map`，没有文件系统、header 或 disposal 协议。[E: packages/agent/src/harness/session/memory.ts:148] [E: packages/agent/src/harness/session/memory.ts:149]

`InMemorySessionStorage` 实现 `SessionStorage`：所有写操作直接 `SessionState.applyMutation()`；读操作返回 `structuredClone` 副本。[E: packages/agent/src/harness/session/memory.ts:25] [E: packages/agent/src/harness/session/memory.ts:68] [E: packages/agent/src/harness/session/memory.ts:93]

`create` / `open` / `fork` 都 `new Session(storage)`，因此调用方面与 JSONL 相同。[E: packages/agent/src/harness/session/memory.ts:160] [E: packages/agent/src/harness/session/memory.ts:164] [E: packages/agent/src/harness/session/memory.ts:184]

`SessionState` 的连续 `seq`、lane leaf、open-operation 集合、stats 与 fork mutation 生成由 [subsys.agent-core.session-storage](session-storage.md) 权威说明；本节点只写内存封装差异。[E: packages/agent/src/harness/session/state.ts:50] [E: packages/agent/src/harness/session/state.ts:97]

## 关键文件

- `packages/agent/src/harness/session/memory.ts`：`InMemorySessionStorage` 与 `InMemorySessionRepo`。[E: packages/agent/src/harness/session/memory.ts:25] [E: packages/agent/src/harness/session/memory.ts:148]
- `packages/agent/src/harness/session/state.ts`：共享 mutation 引擎与 `createForkMutations()`。[E: packages/agent/src/harness/session/state.ts:260]
- `packages/agent/src/harness/session/session.ts`：`Session` 包装与 `assertJsonSerializable`（由 `Session.commitEntry` 调用，不在 storage 内重复）。[E: packages/agent/src/harness/session/session.ts:286]

## 数据模型

每个 storage 保存一份 `structuredClone` 过的 `SessionMetadata`（`id` / `createdAt` / 可选 `parentSessionId`）和一份私有 `SessionState`。[E: packages/agent/src/harness/session/memory.ts:26] [E: packages/agent/src/harness/session/memory.ts:27] [E: packages/agent/src/harness/session/memory.ts:30]

repo 的 `sessions: Map<string, InMemorySessionStorage>` 以 session id 为键。没有 cwd、path、`sourceFormat` 或 application metadata 字段。[E: packages/agent/src/harness/session/memory.ts:149]

`appendEntry` 用 `requireLane(lane)` 取当前 leaf 作为 `parentId`，`nextSequence` 作为 `seq`，`Date.now()` 作为 `timestamp`，然后 apply `{ kind: "entry", lane, entry }`。[E: packages/agent/src/harness/session/memory.ts:60] [E: packages/agent/src/harness/session/memory.ts:62] [E: packages/agent/src/harness/session/memory.ts:68]

`appendRecord` 同样补 `seq` / `timestamp`。若新 record 是 `operation_started` 且该 lane 已有 open operation，抛 `SessionError("storage", ... already has an open operation ...)`。[E: packages/agent/src/harness/session/memory.ts:75] [E: packages/agent/src/harness/session/memory.ts:77]

## 控制流

1. `InMemorySessionRepo.create@packages/agent/src/harness/session/memory.ts:151`：`id = options.id ?? uuidv7()`；Map 已有该 id 则 `already_exists`。新建 storage 的 `createdAt = Date.now()`，可选继承 `parentSessionId`。[E: packages/agent/src/harness/session/memory.ts:152] [E: packages/agent/src/harness/session/memory.ts:153] [E: packages/agent/src/harness/session/memory.ts:156]
2. `open@packages/agent/src/harness/session/memory.ts:163` 按 `metadata.id` 取 storage；缺失则 `not_found`。[E: packages/agent/src/harness/session/memory.ts:164] [E: packages/agent/src/harness/session/memory.ts:189]
3. `list@packages/agent/src/harness/session/memory.ts:167` 对 Map 中每个 storage `getMetadata()`，无过滤、无排序约定写在代码里（遍历顺序即 Map 插入顺序）。[E: packages/agent/src/harness/session/memory.ts:168]
4. `delete@packages/agent/src/harness/session/memory.ts:171` 直接 `sessions.delete(metadata.id)`，不存在也不报错。[E: packages/agent/src/harness/session/memory.ts:172]
5. `fork@packages/agent/src/harness/session/memory.ts:175`：目标 id 同样判重；`parentSessionId` 默认 `source.id`；`sourceStorage.fork` 新建空 storage，再对 `createForkMutations(options)` 逐条 `applyMutation`。[E: packages/agent/src/harness/session/memory.ts:177] [E: packages/agent/src/harness/session/memory.ts:180] [E: packages/agent/src/harness/session/memory.ts:33] [E: packages/agent/src/harness/session/memory.ts:35]
6. `createLane` / `moveLane` / `setName` / `setLabel` 都先 validate，再 apply 一条带 `nextSequence` 的 lane 或 fact mutation。[E: packages/agent/src/harness/session/memory.ts:48] [E: packages/agent/src/harness/session/memory.ts:54] [E: packages/agent/src/harness/session/memory.ts:125] [E: packages/agent/src/harness/session/memory.ts:133]

## 设计动机与权衡

内存与 JSONL 共用 `SessionState`，因此 branch walk、duplicate id、lane 链接、open-operation 集合、stats 投影与 fork 选择语义一致；差别只在 durable 写入、metadata 形状、以及 JSONL 的文件修复/并发预约。[E: packages/agent/src/harness/session/memory.ts:27] [E: packages/agent/src/harness/session/state.ts:50] [I]

每次读都 `structuredClone`，避免调用方 mutate 返回值污染内部 index。这比共享引用安全，但大 session 上有复制成本。[E: packages/agent/src/harness/session/memory.ts:93] [E: packages/agent/src/harness/session/memory.ts:97] [I]

## Gotcha

- 这是易失仓库：进程或 repo 实例结束后没有可重建介质，不能用它验证 reopen-from-disk、torn-tail 或 `renameFile` 行为。[E: packages/agent/src/harness/session/memory.ts:149] [I]
- `delete` 只从 Map 移除。已经拿着该 storage 的 `Session` handle 仍指向同一对象，后续 append/read 会继续成功；这与“按 id 再 `open` 会 `not_found`”不同。[E: packages/agent/src/harness/session/memory.ts:172] [E: packages/agent/src/harness/session/memory.ts:164] [E: packages/agent/src/harness/session/memory.ts:189]
- 内存 storage **没有** JSONL 那种 `enqueue` tail。同一 storage 上的并发 await 可能交错执行 `nextSequence` 与 `applyMutation`；conformance 测试按顺序 await，不覆盖这个竞态。[E: packages/agent/src/harness/session/memory.ts:59] [E: packages/agent/src/harness/session/memory.ts:68] [U]
- `InMemorySessionRepo` 不实现 `AsyncDisposable`，也没有 disposed 开关；旧文档里的 disposal / `KeyedOperationQueue` 不再适用。[E: packages/agent/src/harness/session/memory.ts:148]
- list 没有 cwd 过滤：内存 metadata 根本没有 `cwd`。[E: packages/agent/src/harness/session/memory.ts:167]

## 跨包边界

本节点属于 `pi-agent-core` 通用 harness，适合测试与无需落盘的宿主。产品级 coding-agent session 文件与 JSONL v4 磁盘布局分别见 [ref.coding-agent.session-format](../../reference/session-format.md) 与 [subsys.agent-core.jsonl-storage](jsonl-storage.md)。[I]

`session/index.ts` 通过 `export * from "./memory.ts"` 导出这两个 class，再由 `packages/agent/src/index.ts` 进入公共 API。[E: packages/agent/src/harness/session/index.ts:11]

## Sources

- packages/agent/src/harness/session/memory.ts
- packages/agent/src/harness/session/state.ts
- packages/agent/src/harness/session/session.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：`SessionRepo` / `SessionStorage` / `SessionState` 契约。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：lane view、branch query、context 投影。
