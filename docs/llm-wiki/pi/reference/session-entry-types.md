---
id: ref.agent.session-entry-types
title: 会话树条目类型目录(Entry)
kind: catalog
tier: T3
pkg: agent
batch: agent-core
source:
  - packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/values.ts
  - packages/agent/src/harness/session/commit.ts
symbols:
  - Entry
  - EntryBase
  - EntryType
  - MessageEntry
  - CompactionEntry
  - BranchSummaryEntry
  - CustomEntry
  - NewEntry
  - LaneConfiguration
related:
  - subsys.agent-core.session-tree
  - ref.coding-agent.session-format
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `ref.agent.session-entry-types` 是 `packages/agent/src/harness/session/types.ts` 中现行 `Entry` 导出类型的字段级目录：覆盖 `EntryBase`、全部 4 个 `Entry` variant、union 本身与写入形态 `NewEntry`。model / thinking / active tools 已从 entry 挪到 `LaneConfiguration` values。

## 能回答的问题

- `Entry` union 当前包含哪些 variant？
- 每种 entry 的 `type` discriminator、payload 字段和字段类型是什么？
- `seq` / `parentId` / `timestamp` 是谁的字段，写入前要不要带？
- `NewEntry` 与完整 `Entry` 差哪些键？
- 旧的 `model_change` / `thinking_level_change` / `active_tools_change` / `ProvisionedEntry` / `leaf` / `label` 还在这个文件里吗？

## 共同字段

| 类型名 | 字段 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `EntryType` | `"message" \| "compaction" \| "branch_summary" \| "custom"` | tree entry 的封闭 discriminator 集合。[E: packages/agent/src/harness/session/types.ts:19] | 扫描 API（`BranchScan` / `EntryScan`）用同一集合过滤。[E: packages/agent/src/harness/session/types.ts:425] | `packages/agent/src/harness/session/types.ts:16` |
| `EntryBase` | `id: string`；`parentId: string \| null`；`seq: number`；`timestamp: number`；`type: EntryType`；`customType?: string` | 所有 tree entry 的共同字段。`seq` 是 storage-assigned 共享序号；`parentId` 是正在 append 的 lane tip；`timestamp` 是 Unix ms。[E: packages/agent/src/harness/session/types.ts:20] [E: packages/agent/src/harness/session/types.ts:20] [E: packages/agent/src/harness/session/types.ts:21] [E: packages/agent/src/harness/session/types.ts:28] | 具体 variant 把 `type` 收窄为字面量。调用方提交 `NewEntry` 时必须省略 `seq` / `timestamp`，但 **要带** `id` 与 `parentId`。[E: packages/agent/src/harness/session/types.ts:59] | `packages/agent/src/harness/session/types.ts:18` |

## Entry variant 实例

| 类型名 | Discriminator / 字段 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `MessageEntry` | `type: "message"`；`message: AgentMessage`；`terminate?: true` | 把一条 `AgentMessage` 放进 session tree，同时保留 tree identity。可选 `terminate` 只能是字面量 `true`。[E: packages/agent/src/harness/session/types.ts:27] [E: packages/agent/src/harness/session/types.ts:44] [E: packages/agent/src/harness/session/types.ts:46] | `AgentMessage` 从 `../../types.ts` 导入。消息内部 role/content 由 `ref.agent.message-types` 覆盖。[E: packages/agent/src/harness/session/types.ts:487] [I] | `packages/agent/src/harness/session/types.ts:27` |
| `CompactionEntry` | `type: "compaction"`；`summary: string`；`retainedTail: AgentMessage[]`；`tokensBefore: number`；`details?: JsonValue`；`usage?: Usage`；`fromHook: boolean` | 压缩摘要 + 压缩前 token 数 + **必填** retained tail + **必填** `fromHook`。[E: packages/agent/src/harness/session/types.ts:33] [E: packages/agent/src/harness/session/types.ts:54] [E: packages/agent/src/harness/session/types.ts:53] | `retainedTail` 可以为空数组，但不能缺字段。`Usage` 来自 `@earendil-works/pi-ai`。`details` 现为 `JsonValue`，不是 `unknown`。[E: packages/agent/src/harness/session/types.ts:487] [E: packages/agent/src/harness/session/types.ts:38] | `packages/agent/src/harness/session/types.ts:33` |
| `BranchSummaryEntry` | `type: "branch_summary"`；`fromId: string \| null`；`summary: string`；`details?: JsonValue`；`usage?: Usage`；`fromHook: boolean` | 针对某个起点 `fromId` 的 branch summary；`fromId` 可为 null（未 summarize 的导航可指向 branch root）。[E: packages/agent/src/harness/session/types.ts:43] [E: packages/agent/src/harness/session/types.ts:34] [E: packages/agent/src/harness/session/types.ts:38] | `fromHook` 现为必填 boolean。空字符串 `summary` 在 context 投影中会被跳过，那是 `context.ts` 行为。[I] | `packages/agent/src/harness/session/types.ts:43` |
| `CustomEntry` | `type: "custom"`；`customType: string`；`data?: JsonValue` | 扩展型非消息 entry。`customType` 区分应用自定义形态，`data` 可选。[E: packages/agent/src/harness/session/types.ts:52] [E: packages/agent/src/harness/session/types.ts:44] [E: packages/agent/src/harness/session/types.ts:45] | `EntryProjector` 把 `CustomEntry` 转成模型消息。[E: packages/agent/src/harness/session/types.ts:59] | `packages/agent/src/harness/session/types.ts:52` |
| `Entry` | union of 上面 4 个接口 | session tree entry 的 closed set：`MessageEntry` \| `CompactionEntry` \| `BranchSummaryEntry` \| `CustomEntry`。[E: packages/agent/src/harness/session/types.ts:55] | `Storage.getEntries` / `scanBranch` / `scanEntries` 都以 `Entry` 为 contract。`LaneConfiguration`、operation state、usage row **不是** `Entry` 成员。[E: packages/agent/src/harness/session/types.ts:61] [E: packages/agent/src/harness/session/types.ts:457] | `packages/agent/src/harness/session/types.ts:64` |

## 写入形态

| 类型名 | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `NewEntry<TEntry extends Entry = Entry>` | 对每个 union member 做 `Omit<TEntry, "seq" \| "timestamp">` | 待写入 payload：去掉 storage-assigned 的序号与时间，留下 `type` / `id` / `parentId` / variant payload。[E: packages/agent/src/harness/session/types.ts:59] | 不是第 5 个 `Entry` variant。调用方必须自己提供 `id` 与 `parentId`；`insertEntry` / `materializeCommittedEntry` 在 commit 时补 `seq` / `timestamp`。[E: packages/agent/src/harness/session/types.ts:64] [E: packages/agent/src/harness/session/commit.ts:53] [I] | `packages/agent/src/harness/session/types.ts:67` |

## 不再是 Entry 的配置与元数据

下列名字**不**出现在当前 `types.ts` 的 `Entry` union 中：

| 旧名 | 当前去向 |
| --- | --- |
| `ModelChangeEntry` (`type: "model_change"`) | 不再是 entry。lane 的 provider/model 在 `LaneConfiguration.model`，存在 `pi.lane.config`。[E: packages/agent/src/harness/session/types.ts:69] [E: packages/agent/src/harness/session/values.ts:160] |
| `ThinkingLevelEntry` (`type: "thinking_level_change"`) | 不再是 entry。`LaneConfiguration.thinkingLevel`。[E: packages/agent/src/harness/session/types.ts:62] |
| `ActiveToolsEntry` (`type: "active_tools_change"`) | 不再是 entry。`LaneConfiguration.activeToolNames`。[E: packages/agent/src/harness/session/types.ts:64] |
| `ProvisionedEntry` | 改名为 `NewEntry`。省略键从 `parentId\|seq\|timestamp` 变为 `seq\|timestamp`（调用方现在要带 `parentId`）。[E: packages/agent/src/harness/session/types.ts:59] |
| `SessionTreeEntry` / `SessionTreeEntryBase` | 改名为 `Entry` / `EntryBase`。[E: packages/agent/src/harness/session/types.ts:18] [E: packages/agent/src/harness/session/types.ts:64] |
| `LeafEntry` (`type: "leaf"`) | 不再是 entry。tip 存在 `pi.branch.tip`。[E: packages/agent/src/harness/session/values.ts:158] |
| `LabelEntry` (`type: "label"`) | 不再是 entry。改用 `entryLabel` value + `Session.setLabel`。[E: packages/agent/src/harness/session/values.ts:195] [E: packages/agent/src/harness/session/types.ts:553] |
| `SessionInfoEntry` (`type: "session_info"`) | 不再是 entry。会话名用 `sessionName` value + `Session.setName`。[E: packages/agent/src/harness/session/values.ts:194] [E: packages/agent/src/harness/session/types.ts:552] |
| `CustomMessageEntry` (`type: "custom_message"`) | 已删除。扩展消息走 `CustomEntry` + `EntryProjector`，或直接 `MessageEntry`。[E: packages/agent/src/harness/session/types.ts:52] |
| `LaneRecord` / `LogItem` | 已删除。durable operation 改成 `Operation` = `{ meta, state }` values（`pi.op.meta` / `pi.op.state`），不是 tree entry。[E: packages/agent/src/harness/session/types.ts:342] [E: packages/agent/src/harness/session/values.ts:164] |

v3 JSONL 里的 `LegacyV3ModelChangeEntry` 只存在于 `jsonl/legacy-v3.ts` 的导入路径，不是现行 `Entry`。[I]

## 关系边界

`subsys.agent-core.session-tree` 解释 parent/seq/lane 组合关系与写入路径；本节点只做字段级 catalog。[I]

`ref.coding-agent.session-format` 覆盖 coding-agent 产品层 JSONL 文件（含历史 `type: "session", version: 3`）。本节点只覆盖 agent harness 的 TypeScript `Entry` 类型。[I]

`Usage` 字段出现在 `CompactionEntry` / `BranchSummaryEntry` 上，是可选的摘要生成用量；会话级 token/cost 统计来自 `UsageRow` / `scanUsage`，不是这些 entry 字段。账本流转见 `subsys.coding-agent.usage-accounting`。[E: packages/agent/src/harness/session/types.ts:52] [E: packages/agent/src/harness/session/types.ts:37] [E: packages/agent/src/harness/session/types.ts:379] [I]

## Sources

- packages/agent/src/harness/session/types.ts
- packages/agent/src/harness/session/values.ts
- packages/agent/src/harness/session/commit.ts

## 相关

- [subsys.agent-core.session-tree](../subsystems/agent-core/session-tree.md)：`Entry`、`parentId`、`seq`、`timestamp` 的模型说明。
- [ref.coding-agent.session-format](session-format.md)：coding-agent 产品层 JSONL session 文件格式。
- [subsys.coding-agent.usage-accounting](../subsystems/coding-agent/usage-accounting.md)：usage 在 entry / record / 统计 API 间的流转。
