---
id: subsys.agent-core.session-tree
title: 会话树模型(Entry union)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/session/commit.ts
  - packages/agent/src/harness/session/values.ts
symbols:
  - Entry
  - EntryType
  - EntryBase
  - MessageEntry
  - CompactionEntry
  - BranchSummaryEntry
  - CustomEntry
  - NewEntry
related:
  - spine.session-state-model
  - subsys.agent-core.tree-navigation
  - ref.agent.session-entry-types
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.agent-core.session-tree` 定义 v4 append-only session tree：每个 `Entry` 都有 `id`、调用方提供的 `parentId`、storage-assigned 的 `seq` / `timestamp`，并用 `EntryType` 区分为 4 个变体。字段级 catalog 在 [ref.agent.session-entry-types](../../reference/session-entry-types.md)。

## 能回答的问题

- `Entry` union 当前包含哪些 variant？
- `seq`、`parentId`、`timestamp` 由谁写入，调用方提交什么？
- `message` 与 `custom` 如何成为 tree node？
- compaction / branch_summary 在数据模型里保存什么？
- 旧的 `leaf` / `label` / `session_info` / `custom_message` / `model_change` / `thinking_level_change` / `active_tools_change` entry 还在吗？

## 职责边界

本节点覆盖 `packages/agent/src/harness/session/types.ts` 中的 `Entry` 数据模型，以及 `Branch` / `StorageBackedSession` 如何把 message/custom 写成带 `parentId` 的 `NewEntry`。lane tip、name/label 是 `values.ts` 里的 typed address，不是 `Entry` 成员；operation record 也不是 tree node。[E: packages/agent/src/harness/session/types.ts:19] [E: packages/agent/src/harness/session/types.ts:55] [E: packages/agent/src/harness/session/types.ts:108] [E: packages/agent/src/harness/session/values.ts:158] [E: packages/agent/src/harness/session/values.ts:194]

`spine.session-state-model` 负责读时投影到 LLM context。本节点只从类型上说明 4 个 variant 的 payload，不展开 context 投影。[I]

默认 entry id 由 `StorageBackedSession` 的 `IdGenerator` 生成，缺省实现是 `@earendil-works/pi-ai/utils/uuid` 的 `uuidv7()`。[E: packages/agent/src/harness/session/session.ts:1] [E: packages/agent/src/harness/session/session.ts:237]

## 数据模型

### EntryBase：id / seq / parentId / timestamp / type

`EntryBase` 共同字段：`id: string`、`parentId: string | null`、`seq: number`、`timestamp: number`、`type: EntryType`、可选 `customType?: string`。[E: packages/agent/src/harness/session/types.ts:20] [E: packages/agent/src/harness/session/types.ts:22] [E: packages/agent/src/harness/session/types.ts:20] [E: packages/agent/src/harness/session/types.ts:21] [E: packages/agent/src/harness/session/types.ts:27] [E: packages/agent/src/harness/session/types.ts:28] [E: packages/agent/src/harness/session/types.ts:29]

- `seq`：storage 在 commit 时分配，从 1 起连续递增。[E: packages/agent/src/harness/session/types.ts:21] [E: packages/agent/src/harness/session/commit.ts:64]
- `parentId`：调用方写成“当前 branch tip”；根为 `null`。append 路径读 `branchTip(name)` 再写入。[E: packages/agent/src/harness/session/types.ts:20] [E: packages/agent/src/harness/session/session.ts:433] [E: packages/agent/src/harness/session/session.ts:439]
- `timestamp`：Unix 毫秒，storage 分配，不是 ISO 字符串。[E: packages/agent/src/harness/session/types.ts:27] [E: packages/agent/src/harness/session/commit.ts:64]
- `type`：closed `EntryType`，不是宽 `string`。[E: packages/agent/src/harness/session/types.ts:16] [E: packages/agent/src/harness/session/types.ts:23]

`NewEntry<TEntry>` 对 union 做 distributive `Omit<..., "seq" | "timestamp">`。调用方必须自带 `type`、`id`、`parentId` 以及 variant payload，不能自己填 `seq` / `timestamp`。[E: packages/agent/src/harness/session/types.ts:59]

源码没有 `children` / `childIds` 字段。child 关系是 `parentId` 的反向索引，由 branch scan 在读时走出来。[E: packages/agent/src/harness/session/types.ts:20] [I]

### 四个 Entry variant

| Variant `type` | 接口 | 关键 payload | 数据含义 |
| --- | --- | --- | --- |
| `message` | `MessageEntry` | `message: AgentMessage`；可选 `terminate?: true` | 一条进入 tree 的 agent message；可选标记 terminate。[E: packages/agent/src/harness/session/types.ts:27] [E: packages/agent/src/harness/session/types.ts:29] [E: packages/agent/src/harness/session/types.ts:46] |
| `compaction` | `CompactionEntry` | `summary`、`retainedTail: AgentMessage[]`、`tokensBefore`、`fromHook`；可选 `details`、`usage` | 压缩摘要 + 必须携带的 retained tail；可附 LLM usage。[E: packages/agent/src/harness/session/types.ts:33] [E: packages/agent/src/harness/session/types.ts:35] [E: packages/agent/src/harness/session/types.ts:54] [E: packages/agent/src/harness/session/types.ts:40] |
| `branch_summary` | `BranchSummaryEntry` | `fromId`、`summary`、`fromHook`；可选 `details`、`usage` | 从某个起点离开时的摘要。[E: packages/agent/src/harness/session/types.ts:43] [E: packages/agent/src/harness/session/types.ts:45] [E: packages/agent/src/harness/session/types.ts:35] [E: packages/agent/src/harness/session/types.ts:49] |
| `custom` | `CustomEntry` | `customType: string`；可选 `data?: JsonValue` | 扩展点。类型层不约束 `customType` 命名空间；`data` 必须是 JSON 值。[E: packages/agent/src/harness/session/types.ts:52] [E: packages/agent/src/harness/session/types.ts:54] [E: packages/agent/src/harness/session/types.ts:45] |

`Entry` 是上述 4 个接口的 closed union；`EntryType` 是 `"message" | "compaction" | "branch_summary" | "custom"`。[E: packages/agent/src/harness/session/types.ts:16] [E: packages/agent/src/harness/session/types.ts:64]

当前 **不是** `Entry` 成员、也不再作为 tree node 存在的旧 variant：`leaf`、`label`、`session_info`、`custom_message`、`model_change`、`thinking_level_change`、`active_tools_change`。leaf / name / label 改由 value address 表达（`branchTip`、`sessionName`、`entryLabel`）；model / thinking / tools 是 `LaneConfiguration` 上的 lane 状态，不是 entry。[E: packages/agent/src/harness/session/types.ts:64] [E: packages/agent/src/harness/session/types.ts:69] [E: packages/agent/src/harness/session/values.ts:158] [E: packages/agent/src/harness/session/values.ts:194] [E: packages/agent/src/harness/session/values.ts:195]

### Message、parent、branch tip 的组合

`MessageEntry` 在 base 字段之外只加 `message` 与可选 `terminate`。它既是 payload 也是 tree node：`Branch.appendMessage` 交给 `StorageBackedSession.appendToBranch`，后者生成 id、把 `parentId` 写成当前 `branchTip`，再 `insertEntry` + `setValueWrite(branchTip, id)`。[E: packages/agent/src/harness/session/types.ts:27] [E: packages/agent/src/harness/session/session.ts:210] [E: packages/agent/src/harness/session/session.ts:431] [E: packages/agent/src/harness/session/session.ts:437] [E: packages/agent/src/harness/session/session.ts:448]

`Branch.appendCustomEntry` 在 `data === undefined` 时省略 `data` 字段，否则带上 `data`。[E: packages/agent/src/harness/session/session.ts:214] [E: packages/agent/src/harness/session/session.ts:217]

同一 session 可以有多条 branch 指向不同 tip，因此同一 `parentId` 下可以长出多条物理孩子；“当前分支”由调用方选择的 `Branch` 决定，而不是由 entry 上的某个 current 标志决定。[E: packages/agent/src/harness/session/types.ts:521] [E: packages/agent/src/harness/session/values.ts:158] [I]

## 控制流（写入）

1. `Branch.appendMessage@packages/agent/src/harness/session/session.ts:210` → `appendToBranch(name, { type: "message", message }, context)`。[E: packages/agent/src/harness/session/session.ts:211]
2. `appendToBranch@packages/agent/src/harness/session/session.ts:422` 拒绝 pending assistant message，生成 id，再 `mutate` 里读 tip、`commit([insertEntry({ id, parentId: tip.value, ... }), setValueWrite(branchTip(name), id)])`。[E: packages/agent/src/harness/session/session.ts:428] [E: packages/agent/src/harness/session/session.ts:431] [E: packages/agent/src/harness/session/session.ts:435] [E: packages/agent/src/harness/session/commit.ts:53]
3. `insertEntry` 只包成 `{ kind: "entry", entry }`；`seq` / `timestamp` 在 `commitWrite` 里由 storage 填。[E: packages/agent/src/harness/session/commit.ts:53] [E: packages/agent/src/harness/session/commit.ts:64]
4. 写入成功后 `appendToBranch` 只把新 `id` 交给调用方。[E: packages/agent/src/harness/session/session.ts:453]

## 设计动机与权衡

tree 只保留“对模型或 UI 有长期意义的节点”。操作恢复、用量账本、导航 tip、name/label、model/thinking/tools 从 entry union 里拆出去，避免再出现 `type: "leaf"` 或 `type: "model_change"` 这种“为了改指针/配置而追加的伪节点”。[E: packages/agent/src/harness/session/types.ts:64] [E: packages/agent/src/harness/session/types.ts:108] [E: packages/agent/src/harness/session/values.ts:194] [I]

`CompactionEntry.retainedTail` 现在是必填 `AgentMessage[]`，不再使用 `firstKeptEntryId` storage anchor。读 context 时直接展开 tail，而不是再去 tree 上找 first-kept 边界。[E: packages/agent/src/harness/session/types.ts:36] [I]

compaction / branch_summary 都要求 `fromHook: boolean`，用来区分 hook 输出与模型生成。[E: packages/agent/src/harness/session/types.ts:40] [E: packages/agent/src/harness/session/types.ts:49]

## Gotcha

- `EntryBase.type` 已是 closed `EntryType`；判断 variant 时仍应以 union member 的字面量 `type` 为准。[E: packages/agent/src/harness/session/types.ts:16] [E: packages/agent/src/harness/session/types.ts:33]
- `timestamp` 是 `number`（Unix ms）。旧模型里的 ISO 字符串 timestamp 不再出现在 `EntryBase`。[E: packages/agent/src/harness/session/types.ts:22]
- `custom` entry 默认不进入 LLM messages；只有 `EntryProjector` 才能投影。不要把 `CustomEntry` 与已删除的 `custom_message` entry 当成同一形态。[E: packages/agent/src/harness/session/types.ts:52] [E: packages/agent/src/harness/session/types.ts:59] [I]
- `NewEntry` 仍要调用方填 `parentId`；旧名 `ProvisionedEntry`（曾经 `Omit` 掉 `parentId`）已不存在。[E: packages/agent/src/harness/session/types.ts:59]
- id 空间与 usage row 共享：同一 `id` 不能既是 entry 又是 usage。[I]

## 跨包边界

[spine.session-state-model](../../spine/session-state-model.md) 解释 tree 如何被读成当前 LLM context。[subsys.agent-core.tree-navigation](tree-navigation.md) 覆盖 `branch` / branch walk / context 流水线。[ref.agent.session-entry-types](../../reference/session-entry-types.md) 是每个字段的 catalog。

`AgentMessage` 内部 role/content 由 [ref.agent.message-types](../../reference/message-types.md) 覆盖。

## Sources

- packages/agent/src/harness/session/types.ts
- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/session/commit.ts
- packages/agent/src/harness/session/values.ts

## 相关

- [spine.session-state-model](../../spine/session-state-model.md)：session tree 到 `SessionContext` 的读时投影。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：branch view、branch 查询与 context 流水线。
- [ref.agent.session-entry-types](../../reference/session-entry-types.md)：每个 `Entry` variant 的字段 catalog。
