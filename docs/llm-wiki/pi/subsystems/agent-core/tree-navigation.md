---
id: subsys.agent-core.tree-navigation
title: 树导航、lane view 与上下文构建
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/session/context.ts
  - packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/state.ts
symbols:
  - Session
  - SessionTree
  - buildSessionContext
  - buildContextEntries
  - sessionEntryToContextMessages
  - defaultContextEntryTransform
  - SessionContext
related:
  - subsys.agent-core.session-tree
  - subsys.agent-core.session-storage
  - spine.session-state-model
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.agent-core.tree-navigation` 说明 v4 `Session` 如何用 lane view 选择 active branch、做有界 `parentId` 回溯，以及 `context.ts` 如何把一条 path 投影成 `SessionContext`（messages + thinking/model/tools state）。

## 能回答的问题

- `findEntries()` 与 `findEntriesOnBranch()` 有什么区别？
- `Session.view(lane)` 改变哪些方法的默认 leaf？
- branch query 的 `start` / `stopAtType` / `stopAtId` / `order` / `limit` / cursor 如何组合？
- `moveLane` 与旧的 leaf entry 有什么不同？
- compaction、deferred assistant、custom entry 如何进入 LLM context？

## 职责边界

`Session` 实现 `SessionTree`，默认绑定 `"main"`。`view(lane)` 在 `lane === "main"` 时返回 `this`；其它 lane 返回只实现 `SessionTree` 的对象：branch/append/getLeafId 走该 lane，`findEntries` / name / label / stats 仍是会话级。[E: packages/agent/src/harness/session/session.ts:115] [E: packages/agent/src/harness/session/session.ts:116] [E: packages/agent/src/harness/session/session.ts:118] [E: packages/agent/src/harness/session/session.ts:125] [E: packages/agent/src/harness/session/session.ts:127]

`SessionStorage.findEntriesOnBranch` 强制调用方提供 `start`。`Session.queryBranchEntries` 在缺省时用 lane leaf 补上；leaf 为 `null` 则返回空数组。[E: packages/agent/src/harness/session/types.ts:306] [E: packages/agent/src/harness/session/session.ts:250] [E: packages/agent/src/harness/session/session.ts:251]

真正的 parent 回溯在 `SessionState.walkToRoot()`：从 start 沿 `parentId` 走到 root 或 bound，并检测环与缺失 parent。[E: packages/agent/src/harness/session/state.ts:301] [E: packages/agent/src/harness/session/state.ts:309]

context 构建已从 `Session` 类拆到 `context.ts`。`Session` 不再缓存 context options，也不再提供 `buildContext()` 实例方法；宿主拿到 path entries 后自己调用 `buildSessionContext()`。[E: packages/agent/src/harness/session/context.ts:90] [E: packages/agent/src/harness/session/session.ts:102]

导航不再追加 `type: "leaf"` entry。改 leaf 的公开原语是 `createLane` / `moveLane`。[E: packages/agent/src/harness/session/session.ts:190] [E: packages/agent/src/harness/session/session.ts:194] [E: packages/agent/src/harness/session/types.ts:295]

## 关键文件

- `packages/agent/src/harness/session/session.ts`：`view`、query 包装、lane CRUD、append 到指定 lane。[E: packages/agent/src/harness/session/session.ts:115]
- `packages/agent/src/harness/session/types.ts`：`EntryQuery`、`BranchBounds`、`SessionTree`。[E: packages/agent/src/harness/session/types.ts:223] [E: packages/agent/src/harness/session/types.ts:232]
- `packages/agent/src/harness/session/state.ts`：`findEntries` / `findEntriesOnBranch` / `walkToRoot`。[E: packages/agent/src/harness/session/state.ts:186] [E: packages/agent/src/harness/session/state.ts:198]
- `packages/agent/src/harness/session/context.ts`：`SessionContext` 与全部 builder。[E: packages/agent/src/harness/session/context.ts:5]

## 数据模型

### Query

`EntryQuery`：可选 `type`、`customType`（仅 `type: "custom"` 时有意义）、`order`（默认 newestFirst）、`limit`、`cursor.afterSeq`。[E: packages/agent/src/harness/session/types.ts:223]

`BranchBounds`：`start` 默认是 view 的 lane leaf；`stopAtType` / `stopAtId` 在命中处结束且包含该 entry。[E: packages/agent/src/harness/session/types.ts:232] [E: packages/agent/src/harness/session/types.ts:233] [E: packages/agent/src/harness/session/types.ts:234]

`limit` 必须是正整数，`afterSeq` 必须是非负整数，否则 `invalid_query`。[E: packages/agent/src/harness/session/session.ts:30] [E: packages/agent/src/harness/session/session.ts:36]

cursor 语义依赖 order：`oldestFirst` 保留 `seq > afterSeq`；默认 newestFirst 保留 `seq < afterSeq`。[E: packages/agent/src/harness/session/state.ts:326]

### SessionContext

`SessionContext` 含 `messages: AgentMessage[]`、`thinkingLevel: string`、`model: { provider, modelId } | null`、`activeToolNames: string[] | null`。[E: packages/agent/src/harness/session/context.ts:5]

`SessionContextBuildOptions` 允许 `entryTransforms` 与按 `customType` 索引的 `entryProjectors`。[E: packages/agent/src/harness/session/context.ts:20]

## 控制流

### Branch 读取

1. `Session.findEntries@packages/agent/src/harness/session/session.ts:162` 走 `queryEntries` → `storage.findEntries`，会话内全部 entry，默认 newestFirst。[E: packages/agent/src/harness/session/session.ts:163] [E: packages/agent/src/harness/session/session.ts:236]
2. `Session.findEntriesOnBranch@packages/agent/src/harness/session/session.ts:170` 默认 lane `"main"`；`view(lane).findEntriesOnBranch` 把该 lane 传入 `queryBranchEntries`。[E: packages/agent/src/harness/session/session.ts:171] [E: packages/agent/src/harness/session/session.ts:127]
3. `queryBranchEntries@packages/agent/src/harness/session/session.ts:243`：`start = query.start ?? laneLeaf`；`start === null` 返回 `[]`。[E: packages/agent/src/harness/session/session.ts:250] [E: packages/agent/src/harness/session/session.ts:251]
4. `SessionState.findEntriesOnBranch@packages/agent/src/harness/session/state.ts:198`：
   - 默认 newestFirst：`walkToRoot(start, bounds)`，边走边 filter，满 `limit` 即停。[E: packages/agent/src/harness/session/state.ts:209]
   - `oldestFirst`：先把 rootward walk **反转**成 root→start，再应用 bound；碰到 `stopAtId` / `stopAtType` 后停止（该 entry 若匹配仍计入）。[E: packages/agent/src/harness/session/state.ts:202] [E: packages/agent/src/harness/session/state.ts:204]
5. `walkToRoot@packages/agent/src/harness/session/state.ts:301`：start 不存在 → `not_found`；环 → `invalid_entry`（`Session branch contains a cycle`）；parent 缺失 → `invalid_entry`。[E: packages/agent/src/harness/session/state.ts:308] [E: packages/agent/src/harness/session/state.ts:311] [E: packages/agent/src/harness/session/state.ts:318]
6. `findEntry` / `findEntryOnBranch` 把 `resultLimit` 固定为 1，不改写调用方 query 对象上的 `limit` 字段语义之外的 cap。[E: packages/agent/src/harness/session/session.ts:167] [E: packages/agent/src/harness/session/session.ts:175]

### Lane 移动

`createLane(lane, at)` / `moveLane(lane, to)` 由 storage 写成 `kind: "lane"` mutation。`at` / `to` 必须是已有 entry 或 `null`；重复 lane 名是 `already_exists`；未知 lane 是 `invalid_lane`。[E: packages/agent/src/harness/session/session.ts:190] [E: packages/agent/src/harness/session/state.ts:83] [E: packages/agent/src/harness/session/state.ts:77] [E: packages/agent/src/harness/session/state.ts:87]

多条 lane 可以指向同一 entry，也可以从同一祖先分叉后各自 append；tree 由 `parentId` 共享，leaf 彼此独立。[E: packages/agent/src/harness/session/state.ts:121] [I]

### Context 构建流水线

1. `deriveSessionContextState@packages/agent/src/harness/session/context.ts:25` 扫描**原始** path（未做 compaction 裁剪）：默认 `thinkingLevel = "off"`、`model = null`、`activeToolNames = null`；后写覆盖先写。`thinking_level_change` / `model_change` / `active_tools_change` 更新对应字段；`message` 且 `role === "assistant"` 也会把 model 设成该消息的 `provider` / `model`。[E: packages/agent/src/harness/session/context.ts:26] [E: packages/agent/src/harness/session/context.ts:31] [E: packages/agent/src/harness/session/context.ts:35] [E: packages/agent/src/harness/session/context.ts:37]
2. `defaultContextEntryTransform@packages/agent/src/harness/session/context.ts:45` 从尾部找**最后一条** `compaction`。没有则原样复制；有则返回 `[compaction, ...compaction 之后的 entries]`。`retainedTail` 不在这一步展开。[E: packages/agent/src/harness/session/context.ts:50] [E: packages/agent/src/harness/session/context.ts:56]
3. `buildContextEntries@packages/agent/src/harness/session/context.ts:59` 先跑默认 transform，再按注册顺序应用宿主 `entryTransforms`。[E: packages/agent/src/harness/session/context.ts:60] [E: packages/agent/src/harness/session/context.ts:61]
4. `sessionEntryToContextMessages@packages/agent/src/harness/session/context.ts:65`：
   - `message`：若 assistant 且 `stopReason === "deferred"`，输出空数组；否则 `[entry.message]`。[E: packages/agent/src/harness/session/context.ts:71]
   - `compaction`：`createCompactionSummaryMessage(summary, tokensBefore, timestamp)` 加上 `retainedTail`。[E: packages/agent/src/harness/session/context.ts:75]
   - `branch_summary`：仅当 `entry.summary` 为真值时输出 `createBranchSummaryMessage(...)`。[E: packages/agent/src/harness/session/context.ts:81]
   - `custom`：查 `entryProjectors[customType]`，没有则空。[E: packages/agent/src/harness/session/context.ts:84]
   - 其它 type（model/thinking/tools change）不产生消息。[E: packages/agent/src/harness/session/context.ts:87]
5. `buildSessionContext@packages/agent/src/harness/session/context.ts:90` 把 state 与 flatMap 后的 messages 拼成 `SessionContext`。[E: packages/agent/src/harness/session/context.ts:94] [E: packages/agent/src/harness/session/context.ts:99]

## 设计动机与权衡

持久化 tree 保留完整历史与多 lane；context pipeline 把“存什么”和“发给模型什么”分开。宿主可以通过 transform 丢掉 compaction 或改写 path，也可以给特定 `customType` 注册 projector，而不必改 `Entry` union。[E: packages/agent/src/harness/session/context.ts:20] [E: packages/agent/src/harness/session/context.ts:84] [I]

state 从原始 path 派生、messages 从 transform 后的 entries 派生，因此裁掉 compaction 条目不会回滚 thinking/model/tool 状态。[E: packages/agent/src/harness/session/context.ts:94] [E: packages/agent/src/harness/session/context.ts:95] [I]

## Gotcha

- `findEntriesOnBranch({ start })` 的 `start` 是向 root 走的起点，不是向下枚举 children 的起点。entry 不存储 child 列表。[E: packages/agent/src/harness/session/state.ts:301] [E: packages/agent/src/harness/session/types.ts:345]
- newestFirst 时，`stopAtType` 在 `walkToRoot` 内部截断遍历；filter（`type` / `customType` / cursor）在截断之后应用。bound entry 若不符合 filter，可以不出现在结果里。[E: packages/agent/src/harness/session/state.ts:315] [E: packages/agent/src/harness/session/state.ts:210]
- `oldestFirst` 的 stop 语义写在反转循环里：先 yield 靠近 root 的节点，遇到 bound 就 `break`，因此 `stopAtType: "custom"` 可能返回 root…该 custom（含），而**不含** custom 之后、更靠近 start 的节点。[E: packages/agent/src/harness/session/state.ts:204]
- `view("missing")` 在第一次需要 leaf 时才抛 `invalid_lane`（`getLeafId` / branch query / append），构造 facade 本身不查 lane 表。[E: packages/agent/src/harness/session/session.ts:117] [E: packages/agent/src/harness/session/session.ts:229]
- 不存在 `getBranch()` / `moveTo()` / `ArraySessionIndex`。旧的 leaf entry 导航模型已删除。[E: packages/agent/src/harness/session/session.ts:170] [E: packages/agent/src/harness/session/session.ts:194]
- `createCompactionSummaryMessage` / `createBranchSummaryMessage` 定义在 `harness/messages.ts`，本节点只证明 `context.ts` 调用它们。[E: packages/agent/src/harness/session/context.ts:2] [E: packages/agent/src/harness/session/context.ts:77]

## 跨包边界

本节点属于 `pi-agent-core` 可复用 harness。`pi-coding-agent` 的 `SessionManager` 有独立的产品层导航/context，不能把这里的 async `SessionTree` 直接套到那套同步 API 上。[I]

跨层读时投影总览见 [spine.session-state-model](../../spine/session-state-model.md)。`Entry` 字段见 [subsys.agent-core.session-tree](session-tree.md) 与 [ref.agent.session-entry-types](../../reference/session-entry-types.md)。

## Sources

- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/session/context.ts
- packages/agent/src/harness/session/types.ts
- packages/agent/src/harness/session/state.ts

## 相关

- [subsys.agent-core.session-tree](session-tree.md)：`Entry` union、`parentId` / `seq` / `timestamp`。
- [subsys.agent-core.session-storage](session-storage.md)：lane / record / fact 契约与 `SessionRepo`。
- [spine.session-state-model](../../spine/session-state-model.md)：跨层会话状态总览。
