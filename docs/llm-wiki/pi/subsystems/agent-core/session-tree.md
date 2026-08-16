---
id: subsys.agent-core.session-tree
title: 会话树模型(Entry union)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/session.ts
symbols:
  - Entry
  - EntryBase
  - MessageEntry
  - ModelChangeEntry
  - ThinkingLevelEntry
  - ActiveToolsEntry
  - CompactionEntry
  - BranchSummaryEntry
  - CustomEntry
  - ProvisionedEntry
related:
  - spine.session-state-model
  - subsys.agent-core.tree-navigation
  - ref.agent.session-entry-types
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.agent-core.session-tree` 定义 v4 append-only session tree：每个 `Entry` 都有 `id`、storage-assigned 的 `seq` / `parentId` / `timestamp`，并用 `type` 区分为 7 个变体。字段级 catalog 在 [ref.agent.session-entry-types](../../reference/session-entry-types.md)。

## 能回答的问题

- `Entry` union 当前包含哪些 variant？
- `seq`、`parentId`、`timestamp` 由谁写入，调用方提交什么？
- `message` 与 `custom` 如何成为 tree node？
- compaction / branch_summary 在数据模型里保存什么？
- 旧的 `leaf` / `label` / `session_info` / `custom_message` entry 还在吗？

## 职责边界

本节点覆盖 `packages/agent/src/harness/session/types.ts` 中的 `Entry` 数据模型，以及 `Session` 如何把 message/custom 写成 provisioned entry。lane 指针、record 日志、name/label fact **不是** `Entry` 成员，由 [subsys.agent-core.session-storage](session-storage.md) 说明。[E: packages/agent/src/harness/session/types.ts:14] [E: packages/agent/src/harness/session/types.ts:67] [E: packages/agent/src/harness/session/types.ts:203]

`spine.session-state-model` 负责读时投影到 LLM context。本节点只从类型上说明 7 个 variant 的 payload，不展开 `buildSessionContext()`。[I]

默认 entry id 由 `Session` 的 `IdGenerator` 生成，缺省实现是 `@earendil-works/pi-ai` 的 `uuidv7()`。[E: packages/agent/src/harness/session/session.ts:1] [E: packages/agent/src/harness/session/session.ts:108]

## 数据模型

### EntryBase：id / seq / parentId / timestamp

`EntryBase` 四个共同字段：`type: string`、`id: string`、`seq: number`、`parentId: string | null`、`timestamp: number`。[E: packages/agent/src/harness/session/types.ts:14] [E: packages/agent/src/harness/session/types.ts:15] [E: packages/agent/src/harness/session/types.ts:16] [E: packages/agent/src/harness/session/types.ts:17] [E: packages/agent/src/harness/session/types.ts:18] [E: packages/agent/src/harness/session/types.ts:19]

- `seq`：跨 entry / record / lane / fact 的共享序号，storage 在 append 时分配，从 1 起连续递增。[E: packages/agent/src/harness/session/types.ts:17]
- `parentId`：storage 写成“当时正在 append 的那条 lane 的 leaf”；根为 `null`。[E: packages/agent/src/harness/session/types.ts:18]
- `timestamp`：Unix 毫秒，storage 分配，不是 ISO 字符串。[E: packages/agent/src/harness/session/types.ts:19]

`ProvisionedEntry<TEntry>` 对 union 做 distributive `Omit<..., "parentId" | "seq" | "timestamp">`。调用方必须自带 `type` 与 `id`（以及 variant payload），不能自己填位置字段。[E: packages/agent/src/harness/session/types.ts:76]

源码没有 `children` / `childIds` 字段。child 关系是 `parentId` 的反向索引，由 `findEntriesOnBranch` 在读时走出来。[E: packages/agent/src/harness/session/types.ts:18] [I]

### 七个 Entry variant

| Variant `type` | 接口 | 关键 payload | 数据含义 |
| --- | --- | --- | --- |
| `message` | `MessageEntry` | `message: AgentMessage`；可选 `terminate?: true` | 一条进入 tree 的 agent message；可选标记 terminate。[E: packages/agent/src/harness/session/types.ts:22] [E: packages/agent/src/harness/session/types.ts:24] [E: packages/agent/src/harness/session/types.ts:25] |
| `model_change` | `ModelChangeEntry` | `provider`、`modelId` | branch 上的 provider/model 状态变更。[E: packages/agent/src/harness/session/types.ts:28] [E: packages/agent/src/harness/session/types.ts:30] [E: packages/agent/src/harness/session/types.ts:31] |
| `thinking_level_change` | `ThinkingLevelEntry` | `thinkingLevel: string` | branch 上的 thinking level 变更；类型是 string，不是字面量 union。[E: packages/agent/src/harness/session/types.ts:34] [E: packages/agent/src/harness/session/types.ts:36] |
| `active_tools_change` | `ActiveToolsEntry` | `activeToolNames: string[]` | branch 上的 active tool name 列表。[E: packages/agent/src/harness/session/types.ts:39] [E: packages/agent/src/harness/session/types.ts:41] |
| `compaction` | `CompactionEntry` | `summary`、`retainedTail: AgentMessage[]`、`tokensBefore`；可选 `details`、`usage` | 压缩摘要 + 必须携带的 retained tail；可附 LLM usage。[E: packages/agent/src/harness/session/types.ts:44] [E: packages/agent/src/harness/session/types.ts:46] [E: packages/agent/src/harness/session/types.ts:47] [E: packages/agent/src/harness/session/types.ts:48] |
| `branch_summary` | `BranchSummaryEntry` | `fromId`、`summary`；可选 `details`、`usage` | 从某个起点离开时的摘要。[E: packages/agent/src/harness/session/types.ts:53] [E: packages/agent/src/harness/session/types.ts:55] [E: packages/agent/src/harness/session/types.ts:56] |
| `custom` | `CustomEntry` | `customType: string`；可选 `data?: unknown` | 扩展点。类型层不约束 `customType` 命名空间或 `data` schema。[E: packages/agent/src/harness/session/types.ts:61] [E: packages/agent/src/harness/session/types.ts:63] [E: packages/agent/src/harness/session/types.ts:64] |

`Entry` 是上述 7 个接口的 closed union。[E: packages/agent/src/harness/session/types.ts:67] [E: packages/agent/src/harness/session/types.ts:68] [E: packages/agent/src/harness/session/types.ts:74]

当前 **不是** `Entry` 成员、也不再作为 tree node 存在的旧 variant：`leaf`、`label`、`session_info`、`custom_message`。leaf 改由 lane mutation 表达；label / name 改由 fact 表达。[E: packages/agent/src/harness/session/types.ts:67] [E: packages/agent/src/harness/session/types.ts:321]

### Message、parent、lane leaf 的组合

`MessageEntry` 在 base 字段之外只加 `message` 与可选 `terminate`。它既是 payload 也是 tree node：`Session.appendMessage` 写成 `{ type: "message", id, message }`，storage 再填 `parentId` / `seq` / `timestamp`，并把该 lane 的 leaf 推进到新 id。[E: packages/agent/src/harness/session/types.ts:22] [E: packages/agent/src/harness/session/session.ts:272]

`Session.appendCustomEntry` 在 `data === undefined` 时省略 `data` 字段，否则带上 `data`。[E: packages/agent/src/harness/session/session.ts:277]

同一 session 可以有多条 lane 指向不同 leaf，因此同一 `parentId` 下可以长出多条物理孩子；“当前分支”由调用方选择的 lane（或 `view(lane)`）决定，而不是由 entry 上的某个 current 标志决定。[E: packages/agent/src/harness/session/types.ts:273] [I]

## 控制流（写入）

1. `Session.appendMessage@packages/agent/src/harness/session/session.ts:178` → `appendMessageToLane("main", message)` → `commitEntry({ type: "message", id: idGenerator.next(), message }, lane)`。[E: packages/agent/src/harness/session/session.ts:179] [E: packages/agent/src/harness/session/session.ts:272]
2. `commitEntry@packages/agent/src/harness/session/session.ts:286` 先 `assertJsonSerializable(entry)`（拒绝非有限数字、循环、sparse array、accessor、非 plain object 等），再 `storage.appendEntry`。[E: packages/agent/src/harness/session/session.ts:287] [E: packages/agent/src/harness/session/session.ts:42]
3. 任意 variant 都可通过 `Session.appendEntry(provisioned, lane)` 写入，不仅是 message/custom。[E: packages/agent/src/harness/session/session.ts:198]
4. 写入成功后返回的是完整 `TEntry`（已含 storage-assigned 字段）；`appendMessage` / `appendCustomEntry` 只把 `entry.id` 交给调用方。[E: packages/agent/src/harness/session/session.ts:198] [E: packages/agent/src/harness/session/session.ts:273]

## 设计动机与权衡

tree 只保留“对模型或 UI 有长期意义的节点”。操作恢复（`operation_started`）、用量账本（`usage` record）、导航（lane mutation）从 entry union 里拆出去，避免再出现 `type: "leaf"` 这种“为了改指针而追加的伪节点”。[E: packages/agent/src/harness/session/types.ts:67] [E: packages/agent/src/harness/session/types.ts:203] [I]

`CompactionEntry.retainedTail` 现在是必填 `AgentMessage[]`，不再使用 `firstKeptEntryId` storage anchor。读 context 时直接展开 tail，而不是再去 tree 上找 first-kept 边界。[E: packages/agent/src/harness/session/types.ts:47] [I]

## Gotcha

- `EntryBase.type` 在 base 上是宽 `string`，判断 variant 时应以 union member 的字面量 `type` 为准。[E: packages/agent/src/harness/session/types.ts:15] [E: packages/agent/src/harness/session/types.ts:23]
- `timestamp` 是 `number`（Unix ms）。旧模型里的 ISO 字符串 timestamp 不再出现在 `EntryBase`。[E: packages/agent/src/harness/session/types.ts:19]
- `custom` entry 默认不进入 LLM messages；只有 `buildSessionContext` 的 `entryProjectors[customType]` 才能投影。不要把 `CustomEntry` 与已删除的 `custom_message` entry 当成同一形态。[E: packages/agent/src/harness/session/types.ts:61] [I]
- id 空间与 record 共享：同一 `id` 不能既是 entry 又是 record。[I]

## 跨包边界

[spine.session-state-model](../../spine/session-state-model.md) 解释 tree 如何被读成当前 LLM context。[subsys.agent-core.tree-navigation](tree-navigation.md) 覆盖 `view` / branch walk / `buildSessionContext()`。[ref.agent.session-entry-types](../../reference/session-entry-types.md) 是每个字段的 catalog。

`AgentMessage` 内部 role/content 由 [ref.agent.message-types](../../reference/message-types.md) 覆盖。

## Sources

- packages/agent/src/harness/session/types.ts
- packages/agent/src/harness/session/session.ts

## 相关

- [spine.session-state-model](../../spine/session-state-model.md)：session tree 到 `SessionContext` 的读时投影。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：lane view、branch 查询与 context 流水线。
- [ref.agent.session-entry-types](../../reference/session-entry-types.md)：每个 `Entry` variant 的字段 catalog。
