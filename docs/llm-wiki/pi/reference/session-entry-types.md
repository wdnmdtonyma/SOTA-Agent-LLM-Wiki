---
id: ref.agent.session-entry-types
title: 会话树条目类型目录(Entry)
kind: catalog
tier: T3
pkg: agent
batch: agent-core
source:
  - packages/agent/src/harness/session/types.ts
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
  - subsys.agent-core.session-tree
  - ref.coding-agent.session-format
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: 086c32e745
---

> `ref.agent.session-entry-types` 是 `packages/agent/src/harness/session/types.ts` 中 v4 `Entry` 导出类型的字段级目录：覆盖 `EntryBase`、全部 7 个 `Entry` variant、union 本身与 `ProvisionedEntry`。

## 能回答的问题

- `Entry` union 当前包含哪些 variant？
- 每种 entry 的 `type` discriminator、payload 字段和字段类型是什么？
- `seq` / `parentId` / `timestamp` 是谁的字段，写入前要不要带？
- `ProvisionedEntry` 与完整 `Entry` 差哪些键？
- 旧的 `leaf` / `label` / `session_info` / `custom_message` / `SessionTreeEntry` 还在这个文件里吗？

## 共同字段

| 类型名 | 字段 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `EntryBase` | `type: string`；`id: string`；`seq: number`；`parentId: string \| null`；`timestamp: number` | 所有 tree entry 的共同字段。`seq` 是共享序号（read-side, storage-assigned）；`parentId` 是正在 append 的 lane 的 leaf；`timestamp` 是 Unix ms。[E: packages/agent/src/harness/session/types.ts:15] [E: packages/agent/src/harness/session/types.ts:16] [E: packages/agent/src/harness/session/types.ts:17] [E: packages/agent/src/harness/session/types.ts:18] [E: packages/agent/src/harness/session/types.ts:19] | 具体 variant 把 `type` 收窄为字面量。调用方提交 `ProvisionedEntry` 时必须省略 `seq` / `parentId` / `timestamp`。[E: packages/agent/src/harness/session/types.ts:23] [E: packages/agent/src/harness/session/types.ts:76] | `packages/agent/src/harness/session/types.ts:14` |

## Entry variant 实例

| 类型名 | Discriminator / 字段 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `MessageEntry` | `type: "message"`；`message: AgentMessage`；`terminate?: true` | 把一条 `AgentMessage` 放进 session tree，同时保留 tree identity。可选 `terminate` 只能是字面量 `true`。[E: packages/agent/src/harness/session/types.ts:22] [E: packages/agent/src/harness/session/types.ts:23] [E: packages/agent/src/harness/session/types.ts:24] [E: packages/agent/src/harness/session/types.ts:25] | `AgentMessage` 从 `../../types.ts` 导入。消息内部 role/content 由 `ref.agent.message-types` 覆盖。`stopReason === "deferred"` 的 assistant 在 context 投影时会被丢掉，那是 `context.ts` 行为，不是本类型声明。[E: packages/agent/src/harness/session/types.ts:3] [I] | `packages/agent/src/harness/session/types.ts:22` |
| `ModelChangeEntry` | `type: "model_change"`；`provider: string`；`modelId: string` | 记录 branch 上 provider 与 model id 的状态变更。[E: packages/agent/src/harness/session/types.ts:28] [E: packages/agent/src/harness/session/types.ts:29] [E: packages/agent/src/harness/session/types.ts:30] [E: packages/agent/src/harness/session/types.ts:31] | 字段只保存字符串；模型 catalog 与 auth 不在这个 entry 内。[I] | `packages/agent/src/harness/session/types.ts:28` |
| `ThinkingLevelEntry` | `type: "thinking_level_change"`；`thinkingLevel: string` | 记录 branch 上 thinking level 的状态变更。字段类型是 `string`，不是本文件内的 literal union。[E: packages/agent/src/harness/session/types.ts:34] [E: packages/agent/src/harness/session/types.ts:35] [E: packages/agent/src/harness/session/types.ts:36] | 合法取值集合属于 thinking-level 参考节点 / runtime，不由本 interface 穷举。[I] | `packages/agent/src/harness/session/types.ts:34` |
| `ActiveToolsEntry` | `type: "active_tools_change"`；`activeToolNames: string[]` | 记录 branch 上 active tool name 列表。[E: packages/agent/src/harness/session/types.ts:39] [E: packages/agent/src/harness/session/types.ts:40] [E: packages/agent/src/harness/session/types.ts:41] | 只保存名字；tool definition 与 execution mode 由 tool subsystem 覆盖。[I] | `packages/agent/src/harness/session/types.ts:39` |
| `CompactionEntry` | `type: "compaction"`；`summary: string`；`retainedTail: AgentMessage[]`；`tokensBefore: number`；`details?: unknown`；`usage?: Usage` | 压缩摘要 + 压缩前 token 数 + **必填** retained tail。可选 `details` 与生成摘要的 `Usage`。[E: packages/agent/src/harness/session/types.ts:44] [E: packages/agent/src/harness/session/types.ts:45] [E: packages/agent/src/harness/session/types.ts:46] [E: packages/agent/src/harness/session/types.ts:47] [E: packages/agent/src/harness/session/types.ts:48] [E: packages/agent/src/harness/session/types.ts:49] [E: packages/agent/src/harness/session/types.ts:50] | 不再有 `firstKeptEntryId` / `fromHook`。`retainedTail` 可以为空数组，但不能缺字段。`Usage` 来自 `@earendil-works/pi-ai`。[E: packages/agent/src/harness/session/types.ts:1] [E: packages/agent/src/harness/session/types.ts:47] | `packages/agent/src/harness/session/types.ts:44` |
| `BranchSummaryEntry` | `type: "branch_summary"`；`fromId: string`；`summary: string`；`details?: unknown`；`usage?: Usage` | 针对某个起点 `fromId` 的 branch summary；可选 details 与 LLM usage。[E: packages/agent/src/harness/session/types.ts:53] [E: packages/agent/src/harness/session/types.ts:54] [E: packages/agent/src/harness/session/types.ts:55] [E: packages/agent/src/harness/session/types.ts:56] [E: packages/agent/src/harness/session/types.ts:57] [E: packages/agent/src/harness/session/types.ts:58] | 不再有 `fromHook`。空字符串 `summary` 在 context 投影中会被跳过，那是 `context.ts` 行为。[I] | `packages/agent/src/harness/session/types.ts:53` |
| `CustomEntry` | `type: "custom"`；`customType: string`；`data?: unknown` | 扩展型非消息 entry。`customType` 区分应用自定义形态，`data` 可选。[E: packages/agent/src/harness/session/types.ts:61] [E: packages/agent/src/harness/session/types.ts:62] [E: packages/agent/src/harness/session/types.ts:63] [E: packages/agent/src/harness/session/types.ts:64] | 不再是泛型 `CustomEntry<T>`。没有并列的 `custom_message` entry；若要把 custom 变成模型消息，必须走 `entryProjectors`。[I] | `packages/agent/src/harness/session/types.ts:61` |
| `Entry` | union of 上面 7 个接口 | session tree entry 的 closed set：`MessageEntry` \| `ModelChangeEntry` \| `ThinkingLevelEntry` \| `ActiveToolsEntry` \| `CompactionEntry` \| `BranchSummaryEntry` \| `CustomEntry`。[E: packages/agent/src/harness/session/types.ts:67] [E: packages/agent/src/harness/session/types.ts:68] [E: packages/agent/src/harness/session/types.ts:69] [E: packages/agent/src/harness/session/types.ts:70] [E: packages/agent/src/harness/session/types.ts:71] [E: packages/agent/src/harness/session/types.ts:72] [E: packages/agent/src/harness/session/types.ts:73] [E: packages/agent/src/harness/session/types.ts:74] | `SessionStorage.appendEntry` / `getEntry` / `findEntries` / `findEntriesOnBranch` 都以 `Entry` 为 contract。`LaneRecord`、lane mutation、fact **不是** `Entry` 成员。[E: packages/agent/src/harness/session/types.ts:299] [E: packages/agent/src/harness/session/types.ts:203] | `packages/agent/src/harness/session/types.ts:67` |

## 写入形态

| 类型名 | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `ProvisionedEntry<TEntry extends Entry = Entry>` | 对每个 union member 做 `Omit<TEntry, "parentId" \| "seq" \| "timestamp">` | 待写入 payload：去掉 storage-assigned 的位置与序号字段，留下 `type` / `id` / variant payload。[E: packages/agent/src/harness/session/types.ts:76] [E: packages/agent/src/harness/session/types.ts:77] | 不是第 8 个 `Entry` variant。调用方必须自己提供 `id`；`Session.appendMessage` / `appendCustomEntry` 会用 `idGenerator` 代填。[E: packages/agent/src/harness/session/types.ts:67] [E: packages/agent/src/harness/session/types.ts:76] [I] | `packages/agent/src/harness/session/types.ts:76` |

## 已删除、不得再当 Entry 引用的旧符号

下列名字**不**出现在当前 `types.ts` 的 `Entry` union 中。wiki 其它节点若仍写它们，应以本表为准判过期：

| 旧名 | 当前去向 |
| --- | --- |
| `SessionTreeEntry` / `SessionTreeEntryBase` | 改名为 `Entry` / `EntryBase`。[E: packages/agent/src/harness/session/types.ts:14] [E: packages/agent/src/harness/session/types.ts:67] |
| `PendingSessionWrite` | 改名为 `ProvisionedEntry`（省略键从 `id\|parentId\|timestamp` 变为 `parentId\|seq\|timestamp`，调用方现在要带 `id`）。[E: packages/agent/src/harness/session/types.ts:76] |
| `LeafEntry` (`type: "leaf"`) | 不再是 entry。改 leaf 用 `createLane` / `moveLane`。[E: packages/agent/src/harness/session/types.ts:295] |
| `LabelEntry` (`type: "label"`) | 不再是 entry。改用 `setLabel` fact。[E: packages/agent/src/harness/session/types.ts:323] |
| `SessionInfoEntry` (`type: "session_info"`) | 不再是 entry。会话名用 `setName` fact。[E: packages/agent/src/harness/session/types.ts:321] |
| `CustomMessageEntry` (`type: "custom_message"`) | 已删除。扩展消息走 `CustomEntry` + context projector，或直接 `MessageEntry`。[E: packages/agent/src/harness/session/types.ts:61] |
| `ThinkingLevelChangeEntry` / `ActiveToolsChangeEntry` | 接口改名为 `ThinkingLevelEntry` / `ActiveToolsEntry`；discriminator 字符串未变。[E: packages/agent/src/harness/session/types.ts:34] [E: packages/agent/src/harness/session/types.ts:39] |

`LaneRecord`（`operation_started` 等 9 种）与 `LogItem` 是并列日志形态，权威说明在 [subsys.agent-core.session-storage](../subsystems/agent-core/session-storage.md)，本 catalog 不逐字段展开。[E: packages/agent/src/harness/session/types.ts:203] [E: packages/agent/src/harness/session/types.ts:278]

## 关系边界

`subsys.agent-core.session-tree` 解释 parent/seq/lane 组合关系与写入路径；本节点只做字段级 catalog。[I]

`ref.coding-agent.session-format` 覆盖 coding-agent 产品层 JSONL 文件（含历史 `type: "session", version: 3`）。本节点只覆盖 agent harness 的 TypeScript `Entry` 类型。[I]

`Usage` 字段出现在 `CompactionEntry` / `BranchSummaryEntry` 上，是可选的摘要生成用量；会话级 token/cost 统计来自 `usage` **record**，不是这些 entry 字段。账本流转见 `subsys.coding-agent.usage-accounting` 与 `SessionState` 对 `usage` record 的累加。[E: packages/agent/src/harness/session/types.ts:50] [E: packages/agent/src/harness/session/types.ts:58] [I]

## Sources

- packages/agent/src/harness/session/types.ts

## 相关

- [subsys.agent-core.session-tree](../subsystems/agent-core/session-tree.md)：`Entry`、`parentId`、`seq`、`timestamp` 的模型说明。
- [ref.coding-agent.session-format](session-format.md)：coding-agent 产品层 JSONL session 文件格式。
- [subsys.coding-agent.usage-accounting](../subsystems/coding-agent/usage-accounting.md)：usage 在 entry / record / 统计 API 间的流转。
