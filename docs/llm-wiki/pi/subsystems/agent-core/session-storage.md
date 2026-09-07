---
id: subsys.agent-core.session-storage
title: v4 会话契约(Session/Storage/SessionRepo)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/session/values.ts
  - packages/agent/src/harness/session/in-memory-storage-state.ts
  - packages/agent/src/harness/session/commit.ts
  - packages/agent/src/harness/session/mutation-line.ts
  - packages/agent/src/harness/session/index.ts
  - packages/agent/src/index.ts
symbols:
  - Session
  - Storage
  - SessionRepo
  - Branch
  - SessionMutation
  - StorageBackedSession
  - Write
  - ForkOptions
  - InMemoryStorageState
related:
  - subsys.agent-core.jsonl-storage
  - subsys.agent-core.memory-storage
  - subsys.agent-core.session-tree
  - subsys.agent-core.tree-navigation
evidence: explicit
status: verified
updated: 9767ba275f
---

> `subsys.agent-core.session-storage` 描述 v4 harness session 三层契约：`SessionRepo` 管会话集合与打开/fork，`Storage` 是单会话 `commit(Write[])` 持久化原语，`Session` / `Branch` 把 branch tip、lane 配置和操作态落到 `values.ts` 地址上。

## 能回答的问题

- `SessionRepo`、`Storage`、`Session`、`Branch` 各自拥有哪一段生命周期？
- `Write` 有哪几种 kind，谁赋 `seq` / `timestamp`？
- `NewEntry` 与 storage-assigned 字段的边界是什么？
- fork 的 `scope: "branch"` 与 `scope: "tree"` 各复制什么？
- 公开包导出从哪里露出这些符号？

## 职责边界

`SessionRepo<TMetadata, TCreateOptions, TListOptions>` 只负责会话集合：`create` / `open` / `list` / `delete` / `fork`。返回值是 `Session<TMetadata>`，每个方法都带 `Context`。[E: packages/agent/src/harness/session/types.ts:591] [E: packages/agent/src/harness/session/types.ts:596]

`Storage` 是**一个已打开会话**的 backend contract：`commit(writes)`、`getEntries`、value/list 读写、`scanBranch` / `scanBranchStructure` / `scanEntries` / `scanUsage`、`getStats`、`close`。[E: packages/agent/src/harness/session/types.ts:454] [E: packages/agent/src/harness/session/types.ts:455] [E: packages/agent/src/harness/session/types.ts:464]

`Session` 面向调用方：读 entry/stats/values，`findEntries`，`branch` / `createBranch`，以及 `beginMutation` / `mutate` 这条 exclusive mutation barrier。`setName` / `setLabel` 是 value writer 的糖。[E: packages/agent/src/harness/session/types.ts:529] [E: packages/agent/src/harness/session/types.ts:540] [E: packages/agent/src/harness/session/types.ts:551]

`Branch` 是命名 tip 视图：`getTipId`、`findEntries` / `findEntry`、`appendMessage` / `appendCustomEntry`。tip 存在 `pi.branch.tip`，不是独立 mutation kind。[E: packages/agent/src/harness/session/types.ts:520] [E: packages/agent/src/harness/session/values.ts:158]

`StorageBackedSession` 实现 `Session`，持有一份 `Storage` 和一条 `MutationLine`。`session/index.ts` 导出它，也导出 `MemorySessionRepo` / `JsonlSessionRepo`，不导出 `InMemoryStorageState`。[E: packages/agent/src/harness/session/session.ts:224] [E: packages/agent/src/harness/session/index.ts:24] [E: packages/agent/src/harness/session/index.ts:31]

`packages/agent/src/index.ts` 通过 `export * from "./harness/session/index.ts"` 再导出 session 公共面。[E: packages/agent/src/index.ts:78]

旧符号 `SessionStorage`、`SessionTree`、`SessionState`、`LaneRecord`、`SessionError` / `SessionErrorCode`、`InMemorySessionRepo` 已删除；当前契约以本文件列出的符号为准。[E: packages/agent/src/harness/session/index.ts:23]

## 关键文件

- `packages/agent/src/harness/session/types.ts`：`Entry` / `Storage` / `Session` / `SessionRepo` / `Write`。[E: packages/agent/src/harness/session/types.ts:64] [E: packages/agent/src/harness/session/types.ts:454]
- `packages/agent/src/harness/session/session.ts`：`StorageBackedSession`、typed session errors、`Branch` facade。[E: packages/agent/src/harness/session/session.ts:45] [E: packages/agent/src/harness/session/session.ts:224]
- `packages/agent/src/harness/session/values.ts`：地址构造与 `ValueWrite` / `ListWrite`。[E: packages/agent/src/harness/session/values.ts:98] [E: packages/agent/src/harness/session/values.ts:158]
- `packages/agent/src/harness/session/commit.ts`：`prepareStorageCommit` / `validateCommittedWrites`。[E: packages/agent/src/harness/session/commit.ts:82] [E: packages/agent/src/harness/session/commit.ts:90]
- `packages/agent/src/harness/session/in-memory-storage-state.ts`：memory / JSONL 共用的物化态。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:62]

## 数据模型

### Write 与 storage-assigned 字段

`Write` 是 `entry` / `usage` / `ValueWrite` / `ListWrite` 四元 union。`NewEntry` 省略 `seq` / `timestamp`；`UsageWrite` 省略 `seq`。[E: packages/agent/src/harness/session/types.ts:387] [E: packages/agent/src/harness/session/types.ts:397] [E: packages/agent/src/harness/session/types.ts:59]

`prepareStorageCommit(writes, firstSeq, timestamp)` 按写入顺序把 `firstSeq + index` 赋给每条 write；entry 还拿到同一个 `timestamp`。[E: packages/agent/src/harness/session/commit.ts:82] [E: packages/agent/src/harness/session/commit.ts:64]

`validateCommittedWrites` 要求 seq 严格递增，entry/usage id 在已有态与本事务内不重复，且 entry 的 `parentId` 必须已存在或在本事务里刚插入。[E: packages/agent/src/harness/session/commit.ts:99] [E: packages/agent/src/harness/session/commit.ts:102] [E: packages/agent/src/harness/session/commit.ts:106]

`InMemoryStorageState` 从 `nextSeq = 1`、空 entries / values / usage 起步；message entry 增加 `messageCount`，usage write 累加 `stats.usage`。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:78] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:102] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:108]

### Branch 与 Lane

`branchTip(name)` 的值是 `string | null`。`createBranch(name, at)` 在 tip 尚不存在时 `commit([setValue(branchTip(name), at)])`；`at` 非 null 时目标 entry 必须已存在。[E: packages/agent/src/harness/session/session.ts:355] [E: packages/agent/src/harness/session/session.ts:359] [E: packages/agent/src/harness/session/session.ts:365]

`laneConfig(lane)` 存 `{ model, thinkingLevel, activeToolNames }`；`laneState(lane)` 存 `{ currentOperationId, lastOperationId, inbox }`。它们是 value，不是 tree entry。[E: packages/agent/src/harness/session/types.ts:69] [E: packages/agent/src/harness/session/types.ts:343] [E: packages/agent/src/harness/session/values.ts:160]

append 到 branch 时，storage 并不“知道”lane：`appendToBranch` 读 tip 填 `parentId`，再把 tip 写成新 entry id。[E: packages/agent/src/harness/session/session.ts:433] [E: packages/agent/src/harness/session/session.ts:448]

### Entry

`Entry` 是 4 元 union：`message` / `compaction` / `branch_summary` / `custom`。字段级 catalog 在 [ref.agent.session-entry-types](../../reference/session-entry-types.md)。[E: packages/agent/src/harness/session/types.ts:16] [E: packages/agent/src/harness/session/types.ts:64]

`message.terminate`、compaction / branch_summary 的 `fromHook` / `usage` / `details` 都在对应 entry 上。旧的 `model_change` / `thinking_level_change` / `active_tools_change` / `LaneRecord` 已不在 `types.ts`。[E: packages/agent/src/harness/session/types.ts:27] [E: packages/agent/src/harness/session/types.ts:33]

### Value / List / Usage / Stats

scalar value 是 latest-wins：同 `(namespace, key)` 再 `set` 覆盖。list 是 append-only，直到 `deleteList` 整表删掉。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:113] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:124]

`UsageRow` 有自己的 id/seq，与 entry 共享 id 命名空间。`SessionStats` 是 `{ messageCount, usage }`。[E: packages/agent/src/harness/session/types.ts:378] [E: packages/agent/src/harness/session/types.ts:449] [E: packages/agent/src/harness/session/commit.ts:102]

### Metadata 与 Fork

通用 `SessionMetadata` 是 `id`、`createdAt`、`storageVersion`，可选 `cwd` / `parentSessionId` / `legacyParentSessionPath`。[E: packages/agent/src/harness/session/types.ts:472]

`ForkOptions` 是 `{ scope: "branch"; branch; entryId?; position?; id? } | { scope: "tree"; id? }`。branch-scope 要求源 branch 是已配置 AgentLane（同时有 `laneConfig` 与 `laneState`）。[E: packages/agent/src/harness/session/types.ts:561] [E: packages/agent/src/harness/session/fork.ts:150]

`createForkSnapshot()`：tree 复制全部 entry 与全部 tip；branch 只复制所选 path。随后重建 tip / lane config / 空闲 `laneState`；`pi.op.*` / `pi.pending.*` / `pi.result` 排除。[E: packages/agent/src/harness/session/fork.ts:96] [E: packages/agent/src/harness/session/fork-policy.ts:20]

### 错误

session 层不再有 `SessionErrorCode`。`StorageBackedSession` 抛 typed Error：`SessionInvariantError`、`SessionInvalidBranchError`、`SessionBranchExistsError`、`SessionPendingAssistantMessageError`、`SessionUnknownTargetError`。repo / storage 关闭与重复打开则抛普通 `Error`。[E: packages/agent/src/harness/session/session.ts:45] [E: packages/agent/src/harness/session/session.ts:53] [E: packages/agent/src/harness/session/session.ts:66] [E: packages/agent/src/harness/session/session.ts:77] [E: packages/agent/src/harness/session/session.ts:85]

## 控制流

1. `StorageBackedSession.mutate@packages/agent/src/harness/session/session.ts:263` 先 `beginMutation`，跑 callback，再 `mutator.end`。[E: packages/agent/src/harness/session/session.ts:264] [E: packages/agent/src/harness/session/session.ts:268]
2. `beginMutation@packages/agent/src/harness/session/session.ts:243` 把一次 mutation 排进 `MutationLine`；同一时刻只有一个 `SessionMutation`。[E: packages/agent/src/harness/session/session.ts:255] [E: packages/agent/src/harness/session/mutation-line.ts:6]
3. `SessionMutation.commit@packages/agent/src/harness/session/session.ts:107` 只允许一次；pending assistant message 在 commit 前被拒绝。[E: packages/agent/src/harness/session/session.ts:109] [E: packages/agent/src/harness/session/session.ts:118]
4. `appendToBranch@packages/agent/src/harness/session/session.ts:422` 读 tip，`insertEntry` + `setValue(branchTip, id)` 一次 commit。[E: packages/agent/src/harness/session/session.ts:435] [E: packages/agent/src/harness/session/session.ts:448]
5. `createBranch@packages/agent/src/harness/session/session.ts:355`：空名或含 `\0` → `SessionInvalidBranchError`；已存在 → `SessionBranchExistsError`；`at` 缺失 → `SessionUnknownTargetError`。[E: packages/agent/src/harness/session/session.ts:466] [E: packages/agent/src/harness/session/session.ts:360] [E: packages/agent/src/harness/session/session.ts:363]
6. `findEntries@packages/agent/src/harness/session/session.ts:318` 把 `EntryQuery` 转成 `scanEntries` 的 `fromSeq` / `toSeq`（asc 用 `cursor.seq + 1`，desc 用 `cursor.seq - 1`）。[E: packages/agent/src/harness/session/session.ts:326] [E: packages/agent/src/harness/session/session.ts:335]

## 设计动机与权衡

collection lifetime（`SessionRepo`）与单会话 persistence（`Storage`）分开，使 JSONL / 内存 / SQLite 可以共享同一套 `Session` 与 `Write` 语义。[E: packages/agent/src/harness/session/types.ts:591] [E: packages/agent/src/harness/session/types.ts:454] [I]

tree write 用 entry，配置与操作恢复用 value/list，用量用独立 usage ledger。一次 `commit` 可以混合这几类 write，并共享 seq。[E: packages/agent/src/harness/session/types.ts:397] [E: packages/agent/src/harness/session/commit.ts:82] [I]

`seq` / `timestamp` 由 storage 赋值，避免调用方与 backend 对序号的看法不一致；`parentId` 由调用方（通常是 `appendToBranch`）在读到 tip 之后写入。[E: packages/agent/src/harness/session/commit.ts:64] [E: packages/agent/src/harness/session/session.ts:439] [I]

## Gotcha

- `findEntries()` 是会话范围内、按 seq 的查询；`Branch.findEntries()` 才沿 `parentId` 走向 root。storage 层的 branch API **强制** `start`。[E: packages/agent/src/harness/session/types.ts:431] [E: packages/agent/src/harness/session/session.ts:198]
- `mutate` 的 JSDoc 写明：callback 里再调公开 Session writer 会排到 callback 后面，await 会死锁。callback 只能用传入的 `mutator` 做那一次 commit。[E: packages/agent/src/harness/session/types.ts:546]
- 同一 id 不能同时用于 entry 与 usage。[E: packages/agent/src/harness/session/commit.ts:102]
- `create()` 不建默认 branch。旧文档里“空会话默认只有 `main` lane”已不成立。[E: packages/agent/src/harness/session/testing/conformance/session-repo.ts:158]
- `SessionRepo.open` 不再用 `SessionError("not_found")`；memory/JSONL/SQLite 各自抛普通 `Error`。[E: packages/agent/src/harness/session/memory.ts:390]

## 跨包边界

本节点属于可复用的 `pi-agent-core` harness。JSONL 文件布局与原子 rename 由 [subsys.agent-core.jsonl-storage](jsonl-storage.md) 权威覆盖；进程内 Map 由 [subsys.agent-core.memory-storage](memory-storage.md) 覆盖。`pi-coding-agent` 的产品级 `SessionManager` 与磁盘格式不在本契约内，对照 [ref.coding-agent.session-format](../../reference/session-format.md)。[I]

## Sources

- packages/agent/src/harness/session/types.ts
- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/session/values.ts
- packages/agent/src/harness/session/in-memory-storage-state.ts
- packages/agent/src/harness/session/commit.ts
- packages/agent/src/harness/session/mutation-line.ts
- packages/agent/src/harness/session/index.ts
- packages/agent/src/index.ts

## 相关

- [subsys.agent-core.jsonl-storage](jsonl-storage.md)：`JsonlSessionRepo`、v4 header、原子 `renameFile`、cwd-scoped id。
- [subsys.agent-core.memory-storage](memory-storage.md)：`MemorySessionRepo` / `MemoryStorage`。
- [subsys.agent-core.session-tree](session-tree.md)：`Entry` union 与 `seq` / `parentId` / `timestamp`。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：`Branch`、`scanBranch`、`buildSessionContext()`。
