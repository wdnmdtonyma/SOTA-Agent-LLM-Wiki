---
id: subsys.agent-core.tree-navigation
title: 树导航、Branch 与上下文构建
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/session/context.ts
  - packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/in-memory-storage-state.ts
  - packages/agent/src/harness/session/values.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/test/suite/regressions/9178-tree-during-compaction.test.ts
  - packages/agent/src/harness/runtime/lane.ts
symbols:
  - Session
  - Branch
  - buildSessionContext
  - buildContextEntries
  - sessionEntryToContextMessages
  - StorageBackedSession
related:
  - subsys.agent-core.session-tree
  - subsys.agent-core.session-storage
  - spine.session-state-model
evidence: explicit
status: verified
updated: 71dca871bc
---

> `subsys.agent-core.tree-navigation` 说明 v4 `Session` 如何用命名 `Branch`（`pi.branch.tip`）选择 active path、做有界 `parentId` 回溯，以及 `context.ts` 如何把一条 path 投影成 `AgentMessage[]`。

## 能回答的问题

- `Session.findEntries()` 与 `Branch.findEntries()` 有什么区别？
- `createBranch` / `branch(name)` 改变哪些方法的默认 tip？
- branch query 的 `start` / `stopAtType` / `stopAtId` / `order` / `limit` / cursor 如何组合？
- 改 tip 与旧的 `moveLane` / leaf entry 有什么不同？
- compaction、deferred assistant、custom entry 如何进入 LLM context？
- coding-agent `AgentSession.navigateTree` 在 compaction 期间会怎样？harness `Session` / `Branch` API 有没有同一把锁？

## 职责边界

`Session` 不再实现旧的 `SessionTree` / `view(lane)`。命名 path 是 `Branch`：`branch(name)` 在 `branchTip(name)` 存在时返回 facade；`createBranch(name, at)` 写入 tip。[E: packages/agent/src/harness/session/session.ts:349] [E: packages/agent/src/harness/session/session.ts:355] [E: packages/agent/src/harness/session/types.ts:521]

`Storage.scanBranch` 强制调用方提供 `start`。`Branch.findEntries` 在缺省时用 tip 补上；tip 为 `null` 则返回空数组。[E: packages/agent/src/harness/session/types.ts:432] [E: packages/agent/src/harness/session/session.ts:198] [E: packages/agent/src/harness/session/session.ts:199]

真正的 parent 回溯在 backend。memory / JSONL 走 `InMemoryStorageState.scanBranch()`：从 start 沿 `parentId` 走到 root，缺 parent 抛 `Corrupt branch: missing parent`。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:273] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:283]

context 构建在 `context.ts`。`buildSessionContext()` 返回 `AgentMessage[]`，不再返回 thinking / model / tools；那些在 `LaneConfiguration` value 上。[E: packages/agent/src/harness/session/context.ts:47] [E: packages/agent/src/harness/session/types.ts:69]

导航不再追加 `type: "leaf"` entry，也不再有 `moveLane`。改 tip 的公开原语是 `createBranch` 或 `setValue(branchTip(name), id)`。[E: packages/agent/src/harness/session/session.ts:365] [E: packages/agent/src/harness/session/values.ts:158]

harness 的 `Session` / `Branch` / `scanBranch` **没有** `navigateTree` 方法，也没有 compaction 互斥；本轮这套树查询 API 本身未加锁。[E: packages/agent/src/harness/session/types.ts:521] [E: packages/agent/src/harness/session/session.ts:196] [I] 产品层 `pi-coding-agent` 的 `AgentSession.navigateTree()` 才在 `isCompacting`（auto/manual compaction **或** branch summarization）时 **throw** `"Wait for the current compaction or tree navigation to finish before navigating the session tree."`。[E: packages/coding-agent/src/core/agent-session.ts:984] [E: packages/coding-agent/src/core/agent-session.ts:3143] [E: packages/coding-agent/src/core/agent-session.ts:3145] [E: packages/coding-agent/test/suite/regressions/9178-tree-during-compaction.test.ts:53] [E: packages/coding-agent/test/suite/regressions/9178-tree-during-compaction.test.ts:96]

## 关键文件

- `packages/agent/src/harness/session/session.ts`：`Branch` facade、`createBranch`、`appendToBranch`、`findEntries`。[E: packages/agent/src/harness/session/session.ts:183]
- `packages/agent/src/harness/session/types.ts`：`BranchScan`、`EntryQuery`、`Branch`。[E: packages/agent/src/harness/session/types.ts:421] [E: packages/agent/src/harness/session/types.ts:486]
- `packages/agent/src/harness/session/in-memory-storage-state.ts`：`scanBranch` / `scanEntries`。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:273] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:314]
- `packages/agent/src/harness/session/context.ts`：全部 builder。[E: packages/agent/src/harness/session/context.ts:10]
- `packages/coding-agent/src/core/agent-session.ts`：产品层 `navigateTree` 的 compaction / in-flight navigation throw。[E: packages/coding-agent/src/core/agent-session.ts:3136]

## 数据模型

### Query

`EntryQuery`：可选 `type`、`customType`、`order`（`"asc" | "desc"`，默认 `"desc"`）、`limit`、`cursor.seq`。[E: packages/agent/src/harness/session/types.ts:486]

`BranchScan`：可选 `start`（`Branch.findEntries` 默认 tip）、`stopAtType` / `stopAtId`、`type` / `customType`、`order`（`"newestFirst" | "oldestFirst"`）、`limit`、`cursor`。[E: packages/agent/src/harness/session/types.ts:421]

`StorageBranchScan` 把 `start` 标成必填。[E: packages/agent/src/harness/session/types.ts:432]

cursor 语义：`Branch.scanBranch` 在 `oldestFirst` 时保留 `seq > cursor.seq`，`newestFirst` 时保留 `seq < cursor.seq`；`Session.findEntries` 把 `asc` cursor 译成 `fromSeq: cursor.seq + 1`、`desc` 译成 `toSeq: cursor.seq - 1`。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:298] [E: packages/agent/src/harness/session/session.ts:335] [E: packages/agent/src/harness/session/session.ts:336]

### Context 输出

`buildSessionContext` 的返回值是 `AgentMessage[]`，不是带 thinking/model/tools 的 `SessionContext` 对象。[E: packages/agent/src/harness/session/context.ts:51]

`SessionContextBuildOptions` 只允许按 `customType` 索引的 `entryProjectors`。[E: packages/agent/src/harness/session/context.ts:6]

## 控制流

### Branch 读取

1. `Session.findEntries@packages/agent/src/harness/session/session.ts:318` 走 `storage.scanEntries`，会话内全部 entry，默认 `order: "desc"`。[E: packages/agent/src/harness/session/session.ts:321] [E: packages/agent/src/harness/session/session.ts:326]
2. `Branch.findEntries@packages/agent/src/harness/session/session.ts:196`：`start = query.start ?? tip`；`start === null` 返回 `[]`；默认 `order: "newestFirst"`。[E: packages/agent/src/harness/session/session.ts:198] [E: packages/agent/src/harness/session/session.ts:200]
3. `InMemoryStorageState.scanBranch@packages/agent/src/harness/session/in-memory-storage-state.ts:273`：
   - 先沿 parent 收集 path（start → root）。未知 start → `Unknown branch start`；缺 parent → `Corrupt branch`。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:275] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:283]
   - `oldestFirst` 时 reverse 成 root → start。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:285]
   - 再按 walk 顺序应用 `stopAtId` / `stopAtType`（命中处包含该 entry 后 break），然后 filter type/customType/cursor，最后 `limit`。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:290] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:292]
4. `findEntry` 把 `limit` cap 成 1。[E: packages/agent/src/harness/session/session.ts:345]

### Branch 创建与 append

`createBranch(name, at)`：空名或含 `\0` → `SessionInvalidBranchError`；tip 已存在 → `SessionBranchExistsError`；`at` 非 null 且 entry 不存在 → `SessionUnknownTargetError`。[E: packages/agent/src/harness/session/session.ts:466] [E: packages/agent/src/harness/session/session.ts:360] [E: packages/agent/src/harness/session/session.ts:363]

`appendToBranch` 在 tip 缺失时抛 `SessionInvariantError("Unknown branch: …")`。pending assistant message 不能落盘。[E: packages/agent/src/harness/session/session.ts:434] [E: packages/agent/src/harness/session/session.ts:429]

多条 branch 可以指向同一 entry，也可以从同一祖先分叉后各自 append；tree 由 `parentId` 共享，tip 彼此独立。[E: packages/agent/src/harness/session/session.ts:448] [I]

### Context 构建流水线

1. `buildContextEntries@packages/agent/src/harness/session/context.ts:10` 从尾部找**最后一条** `compaction`。没有则原样复制；有则返回 `[compaction, ...compaction 之后的 entries]`。[E: packages/agent/src/harness/session/context.ts:15] [E: packages/agent/src/harness/session/context.ts:21]
2. `sessionEntryToContextMessages@packages/agent/src/harness/session/context.ts:31`：
   - `message`：assistant 且 `stopReason` 为 `error` / `aborted` / `deferred` 时输出空数组；否则 `[entry.message]`。[E: packages/agent/src/harness/session/context.ts:24] [E: packages/agent/src/harness/session/context.ts:34]
   - `compaction`：`createCompactionSummaryMessage(...)` 加上 `retainedTail` 里仍算 context 的消息。[E: packages/agent/src/harness/session/context.ts:36]
   - `branch_summary`：仅当 `entry.summary` 为真值时输出 `createBranchSummaryMessage(...)`。[E: packages/agent/src/harness/session/context.ts:41]
   - `custom`：不经 projector 时为空。[E: packages/agent/src/harness/session/context.ts:43]
3. `buildSessionContext@packages/agent/src/harness/session/context.ts:47` 对非 custom 走上表，对 custom 查 `entryProjectors[customType]`。[E: packages/agent/src/harness/session/context.ts:56] [E: packages/agent/src/harness/session/context.ts:60]

thinking / model / active tools **不**从 path 派生。旧的 `deriveSessionContextState` / `defaultContextEntryTransform` 已删除。[E: packages/agent/src/harness/session/context.ts:47] [E: packages/agent/src/harness/session/types.ts:69]

## 设计动机与权衡

持久化 tree 只保留对话与结构条目；lane 配置与操作态走 values，避免再往树上追加 `model_change` 一类 state entry。宿主仍可通过 projector 把特定 `customType` 送进模型。[E: packages/agent/src/harness/session/context.ts:6] [E: packages/agent/src/harness/session/values.ts:160] [I]

`buildContextEntries` 先截 compaction，再投影消息，因此截断窗口外的旧 message 不会进入返回数组；lane 配置不受这次截断影响，因为它根本不在 path 上。[E: packages/agent/src/harness/session/context.ts:21] [I]

## Gotcha

- `Branch.findEntries({ start })` 的 `start` 是向 root 走的起点，不是向下枚举 children 的起点。entry 不存储 child 列表。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:279] [E: packages/agent/src/harness/session/types.ts:421]
- stop bound 在 filter 之前应用：bound entry 若不符合 `type` / `customType` / cursor，可以不出现在结果里。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:288] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:292]
- `oldestFirst` 时 stop 仍按（反转后的）walk 顺序 break，因此可能返回 root…该 bound（含），而不含 bound 之后、更靠近 start 的节点。[E: packages/agent/src/harness/session/in-memory-storage-state.ts:285] [E: packages/agent/src/harness/session/in-memory-storage-state.ts:290]
- `branch("missing")` 在 tip 不存在时返回 `undefined`，不抛。已经拿到的 `Branch` 若 tip 后来被删，`getTipId` / `appendToBranch` 会 `SessionInvariantError`。[E: packages/agent/src/harness/session/session.ts:351] [E: packages/agent/src/harness/session/session.ts:418]
- 不存在 `view(lane)` / `getBranch()` / `moveLane()` / `moveTo()` / `ArraySessionIndex`。[E: packages/agent/src/harness/session/types.ts:521] [E: packages/agent/src/harness/session/session.ts:349]
- harness `Session` / `Branch` 没有 `navigateTree`；compaction 互斥只在 coding-agent `AgentSession.navigateTree`。另一次 navigation 进行中（`isCompacting` 因 branch summarization 为真）也会 throw 同一句。[E: packages/coding-agent/src/core/agent-session.ts:3143] [E: packages/coding-agent/test/suite/regressions/9178-tree-during-compaction.test.ts:96]
- `createCompactionSummaryMessage` / `createBranchSummaryMessage` 定义在 `harness/messages.ts`，本节点只证明 `context.ts` 调用它们。[E: packages/agent/src/harness/session/context.ts:3] [E: packages/agent/src/harness/session/context.ts:15]

## 跨包边界

本节点属于 `pi-agent-core` 可复用 harness。`Session` / `Branch` / `scanBranch` 本轮没有 `navigateTree`，也没有 compaction gate。[E: packages/agent/src/harness/session/types.ts:521] [I] `pi-coding-agent` 的 `SessionManager` 有独立的产品层导航/context（仍返回 `{ messages, thinkingLevel, model }`），不能把这里的 async `Branch` 直接套到那套同步 API 上。[E: packages/coding-agent/src/core/session-manager.ts:1298] [I] 产品层跳树走 `AgentSession.navigateTree`：streaming 时另一句 wait-for-response；`isCompacting` 时 throw `"Wait for the current compaction or tree navigation to finish before navigating the session tree."`。[E: packages/coding-agent/src/core/agent-session.ts:3140] [E: packages/coding-agent/src/core/agent-session.ts:3145] harness `Lane.navigateTree` 是另一套 admission convenience（`LaneBusy` / `InvalidNavigation`），不是这句 Error，也不改变本节点的 Session/Branch 查询契约。[E: packages/agent/src/harness/runtime/lane.ts:1232] [I]

跨层读时投影总览见 [spine.session-state-model](../../spine/session-state-model.md)。`Entry` 字段见 [subsys.agent-core.session-tree](session-tree.md) 与 [ref.agent.session-entry-types](../../reference/session-entry-types.md)。

## Sources

- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/session/context.ts
- packages/agent/src/harness/session/types.ts
- packages/agent/src/harness/session/in-memory-storage-state.ts
- packages/agent/src/harness/session/values.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/test/suite/regressions/9178-tree-during-compaction.test.ts
- packages/agent/src/harness/runtime/lane.ts

## 相关

- [subsys.agent-core.session-tree](session-tree.md)：`Entry` union、`parentId` / `seq` / `timestamp`。
- [subsys.agent-core.session-storage](session-storage.md)：value / commit 契约与 `SessionRepo`。
- [spine.session-state-model](../../spine/session-state-model.md)：跨层会话状态总览。
