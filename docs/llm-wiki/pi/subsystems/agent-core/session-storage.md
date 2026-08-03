---
id: subsys.agent-core.session-storage
title: 会话仓库与存储接口(SessionRepository/SessionStorage)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/types.ts
  - packages/agent/src/harness/session/repository.ts
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/session/array-session-index.ts
  - packages/agent/src/harness/session/keyed-operation-queue.ts
symbols:
  - SessionRepository
  - SessionStorage
  - SessionForkSelection
  - SessionBranchQuery
  - ArraySessionIndex
  - KeyedOperationQueue
related:
  - subsys.agent-core.jsonl-storage
  - subsys.agent-core.memory-storage
  - subsys.agent-core.session-tree
  - subsys.agent-core.tree-navigation
evidence: explicit
status: verified
updated: c1019d9202
---

> `subsys.agent-core.session-storage` 描述两层边界：`SessionRepository` 管会话集合与资源寿命，`SessionStorage` 只管一个已打开会话的持久化原语；`Session` 在两者之间提供面向调用方的状态、导航和 append API。

## 能回答的问题

- `SessionRepository` 与 `SessionStorage` 各自拥有哪一段生命周期？
- entry id、当前 leaf 和 append 串行化现在由谁负责？
- fork、游标读取和 branch query 的契约是什么？
- 内存与 JSONL backend 复用哪些索引和并发原语？

## 职责边界

`SessionRepository<TMetadata, TCreateOptions, TListOptions>` 继承 `AsyncDisposable`，提供 `create/open/list/delete/fork`；`create/open/fork` 都返回 `Session<TMetadata>`，而不是把底层 storage 暴露给调用方。[E: packages/agent/src/harness/session/repository.ts:22] [E: packages/agent/src/harness/session/repository.ts:26] [E: packages/agent/src/harness/session/repository.ts:27] [E: packages/agent/src/harness/session/repository.ts:31]

`SessionStorage<TMetadata>` 是一个已打开会话的完整 backend contract。它暴露只读 metadata，以及 head、entry、游标读取、append、branch 查询、compaction-boundary path、label/name/stats；其 lifetime 明确由 repository 拥有。[E: packages/agent/src/harness/types.ts:559] [E: packages/agent/src/harness/types.ts:560] [E: packages/agent/src/harness/types.ts:562] [E: packages/agent/src/harness/types.ts:570]

`Session` 不再是纯转发 facade：构造器被标成 repository 内部入口，它缓存 metadata 和 active leaf，并持有 `appendTail`。[E: packages/agent/src/harness/session/session.ts:152] [E: packages/agent/src/harness/session/session.ts:155] [E: packages/agent/src/harness/session/session.ts:157] [E: packages/agent/src/harness/session/session.ts:160] `createSession()` 从 storage 的 `readHead()` 初始化该缓存。[E: packages/agent/src/harness/session/session.ts:425] [E: packages/agent/src/harness/session/session.ts:429]

## 核心契约

### Metadata、游标和 head

通用 metadata 只有 `id` 与 `createdAt`；JSONL metadata 额外携带 `cwd/path/parentSessionPath/metadata`。[E: packages/agent/src/harness/types.ts:481] [E: packages/agent/src/harness/types.ts:486] [E: packages/agent/src/harness/types.ts:490]

`readEntries({ afterEntrySeq, limit })` 使用零基序号游标：`afterEntrySeq` 表示已经消费的 entry 数，backend 从该位置开始切片。[E: packages/agent/src/harness/types.ts:493] [E: packages/agent/src/harness/session/array-session-index.ts:112] [E: packages/agent/src/harness/session/array-session-index.ts:115] `readHead()` 若发现非空 leaf 没有对应 entry，必须以 `invalid_session` 拒绝；共享数组索引实现了这项校验。[E: packages/agent/src/harness/types.ts:562] [E: packages/agent/src/harness/session/array-session-index.ts:101] [E: packages/agent/src/harness/session/array-session-index.ts:103]

### Fork selection

fork 有三种显式 selection：复制全部 entry、复制到目标 user message 之前、复制到目标 entry（含目标）。[E: packages/agent/src/harness/types.ts:529] [E: packages/agent/src/harness/types.ts:533] [E: packages/agent/src/harness/types.ts:535] 兼容的 `SessionForkOptions` 被转成该 union；`before_user_message` 会验证目标确为 user message，并以目标 parent 的 active path 作为结果。[E: packages/agent/src/harness/session/repository.ts:51] [E: packages/agent/src/harness/session/repository.ts:67] [E: packages/agent/src/harness/session/repository.ts:70]

### Branch query

`SessionBranchQuery` 可指定 start、按 type/id 截止、entry type/custom type 过滤、顺序和 limit；默认从 active leaf 开始且顺序为 newest-first。[E: packages/agent/src/harness/types.ts:537] [E: packages/agent/src/harness/types.ts:549] [E: packages/agent/src/harness/types.ts:551] `Session.findEntriesOnBranch()` 补上缺省 start，`findEntryOnBranch()` 则固定 `limit: 1`。[E: packages/agent/src/harness/session/session.ts:188] [E: packages/agent/src/harness/session/session.ts:192] [E: packages/agent/src/harness/session/session.ts:197]

共享 `ArraySessionIndex` 从 start 沿 `parentId` 向上走，检测环与缺失 parent，再应用 traversal bound、filter 和 limit；非正整数 limit 会立即抛 `RangeError`。[E: packages/agent/src/harness/session/array-session-index.ts:118] [E: packages/agent/src/harness/session/array-session-index.ts:128] [E: packages/agent/src/harness/session/array-session-index.ts:138] [E: packages/agent/src/harness/session/array-session-index.ts:146] [E: packages/agent/src/harness/session/array-session-index.ts:152]

## Append 与派生索引

entry id 生成、parent 绑定、持久化和 leaf 缓存更新都在 `Session.enqueueAppend()` 中按 `appendTail` 串行完成；storage 只接收已经完整构造的 entry。[E: packages/agent/src/harness/session/session.ts:229] [E: packages/agent/src/harness/session/session.ts:237] [E: packages/agent/src/harness/session/session.ts:243] [E: packages/agent/src/harness/session/session.ts:246] [E: packages/agent/src/harness/session/session.ts:250] `moveTo()` 也通过 append 一条 `leaf` entry 表示导航，而不是就地改写旧记录。[E: packages/agent/src/harness/session/session.ts:257] [E: packages/agent/src/harness/session/session.ts:262] [E: packages/agent/src/harness/session/session.ts:407]

`ArraySessionIndex` 是内存与 JSONL backend 共用的有序 entry/index/projection：它维护 id map、leaf、session name、labels 和 usage stats，并拒绝重复 entry id。[E: packages/agent/src/harness/session/array-session-index.ts:58] [E: packages/agent/src/harness/session/array-session-index.ts:60] [E: packages/agent/src/harness/session/array-session-index.ts:73] [E: packages/agent/src/harness/session/array-session-index.ts:78] [E: packages/agent/src/harness/session/array-session-index.ts:163]

`KeyedOperationQueue` 让同一 session key 的操作顺序执行，并用 barrier 等待所有既有 key；可选的全局 permit 再限制跨 key 并发。[E: packages/agent/src/harness/session/keyed-operation-queue.ts:18] [E: packages/agent/src/harness/session/keyed-operation-queue.ts:20] [E: packages/agent/src/harness/session/keyed-operation-queue.ts:32] [E: packages/agent/src/harness/session/keyed-operation-queue.ts:45]

## 设计动机与权衡

collection lifetime、单会话 persistence 和用户态状态机被拆成 repository → storage → `Session` 三层，使 backend 可以共享同一套 `Session` 行为，同时 repository disposal 能停止新操作并等待已接收操作结束。[E: packages/agent/src/harness/session/repository.ts:26] [E: packages/agent/src/harness/session/session.ts:425] [I]

## Gotcha

- `Session.getEntries()` 是 append-order 游标读取；`getBranch()` 与 `findEntriesOnBranch()` 才是沿 parent 链的 active-path 查询，三者不能互换。[E: packages/agent/src/harness/session/session.ts:180] [E: packages/agent/src/harness/session/session.ts:184] [E: packages/agent/src/harness/session/session.ts:188]
- `SessionStorage` 不再负责 `createEntryId` 或 `setLeafId`；调用方也没有公开的 `getStorage()` 逃生口。entry identity 与 leaf movement 都由 `Session` 编排。[E: packages/agent/src/harness/types.ts:559] [E: packages/agent/src/harness/session/session.ts:229] [E: packages/agent/src/harness/session/session.ts:257]
- `ArraySessionIndex.readPathToRootOrCompaction()` 会在 compaction 的 retained-tail 或 first-kept 边界截断，不保证总能回到根。[E: packages/agent/src/harness/session/array-session-index.ts:167] [E: packages/agent/src/harness/session/array-session-index.ts:176] [E: packages/agent/src/harness/session/array-session-index.ts:178]

## 跨包边界

本节点属于可复用的 `pi-agent-core` harness。`pi-coding-agent` 仍有自己的产品级 `SessionManager` 和文件格式；二者应按各自 entry model 与 persistence contract 分开理解。[I]

## Sources

- packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/repository.ts
- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/session/array-session-index.ts
- packages/agent/src/harness/session/keyed-operation-queue.ts

## 相关

- [subsys.agent-core.jsonl-storage](jsonl-storage.md)：durable JSONL repository/backend。
- [subsys.agent-core.memory-storage](memory-storage.md)：进程内 repository/backend。
- [subsys.agent-core.session-tree](session-tree.md)：entry union 与 parent/leaf 数据模型。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：branch 查询、leaf 移动与 context projection。
