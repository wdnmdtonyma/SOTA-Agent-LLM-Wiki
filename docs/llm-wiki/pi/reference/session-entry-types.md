---
id: ref.agent.session-entry-types
title: 会话树条目类型目录
kind: catalog
tier: T3
pkg: agent
batch: agent-core
source:
  - packages/agent/src/harness/types.ts
symbols:
  - SessionTreeEntry
related:
  - subsys.agent-core.session-tree
  - ref.coding-agent.session-format
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: a8ee03b815
---

> `ref.agent.session-entry-types` 是 `packages/agent/src/harness/types.ts` 中 session tree entry exported types 的字段级目录:覆盖 `SessionTreeEntryBase`、所有 `SessionTreeEntry` variant、union 本身与 `PendingSessionWrite` 派生写入形态。

## 能回答的问题

- `SessionTreeEntry` union 当前包含哪些 entry variant?
- 每种 entry 的 `type` discriminator、payload 字段和字段类型是什么?
- `MessageEntry`、`CustomMessageEntry`、`LeafEntry` 分别保存什么,它们和普通状态变更 entry 有什么不同?
- `SessionTreeEntryBase` 的 `id`、`parentId`、`timestamp` 如何成为所有 entry 的共同字段?
- `PendingSessionWrite` 为什么不是一种持久化 entry variant,而是写入前的 payload 形态?

## Entry exported types

| 类型名 | Discriminator / 字段 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `SessionTreeEntryBase` | `type: string`; `id: string`; `parentId: string \| null`; `timestamp: string` | 所有 session tree entry 的共同字段:`type` 是 entry type 字段,`id` 标识 entry,`parentId` 指向父 entry 或空父节点,`timestamp` 保存 entry 时间字符串。[E: packages/agent/src/harness/types.ts:375][E: packages/agent/src/harness/types.ts:376][E: packages/agent/src/harness/types.ts:377][E: packages/agent/src/harness/types.ts:378][E: packages/agent/src/harness/types.ts:379] | 具体 variant 通过 `extends SessionTreeEntryBase` 继承这些字段,并把 `type` 收窄为 literal discriminator。[E: packages/agent/src/harness/types.ts:382][E: packages/agent/src/harness/types.ts:387][E: packages/agent/src/harness/types.ts:448][I] | `packages/agent/src/harness/types.ts:375` |
| `MessageEntry` | `type: "message"`; `message: AgentMessage` | 把一条 `AgentMessage` 放进 session tree,同时保留普通 entry 的 tree identity 和 parent link。[E: packages/agent/src/harness/types.ts:382][E: packages/agent/src/harness/types.ts:383][E: packages/agent/src/harness/types.ts:384] | `AgentMessage` 从 `../index.ts` 导入;消息内部 role/content 形状由 `ref.agent.message-types` 覆盖,本节点只记录 entry wrapper 字段。[E: packages/agent/src/harness/types.ts:14][I] | `packages/agent/src/harness/types.ts:382` |
| `ThinkingLevelChangeEntry` | `type: "thinking_level_change"`; `thinkingLevel: string` | 记录 branch 上 thinking level 的状态变更;字段本身是 string,不是本接口内的 literal union。[E: packages/agent/src/harness/types.ts:387][E: packages/agent/src/harness/types.ts:388][E: packages/agent/src/harness/types.ts:389] | 当前 context projection 如何选择最后一次 thinking level 变更属于 `spine.session-state-model` / session runtime 行为,不由这个类型声明单独证明。[I] | `packages/agent/src/harness/types.ts:387` |
| `ModelChangeEntry` | `type: "model_change"`; `provider: string`; `modelId: string` | 记录 branch 上 provider 与 model id 的状态变更。[E: packages/agent/src/harness/types.ts:392][E: packages/agent/src/harness/types.ts:393][E: packages/agent/src/harness/types.ts:394][E: packages/agent/src/harness/types.ts:395] | 字段只保存 provider/model 字符串;模型 catalog、model metadata 与 auth 解析不在这个 entry 类型内。[E: packages/agent/src/harness/types.ts:394][E: packages/agent/src/harness/types.ts:395][I] | `packages/agent/src/harness/types.ts:392` |
| `ActiveToolsChangeEntry` | `type: "active_tools_change"`; `activeToolNames: string[]` | 记录 branch 上 active tool name list 的状态变更。[E: packages/agent/src/harness/types.ts:398][E: packages/agent/src/harness/types.ts:399][E: packages/agent/src/harness/types.ts:400] | 该类型只保存 tool names;tool definition、execution mode 与工具实现由 agent/coding-agent tool subsystem 覆盖。[I] | `packages/agent/src/harness/types.ts:398` |
| `CompactionEntry<T = unknown>` | `type: "compaction"`; `summary`; optional `firstKeptEntryId`; `tokensBefore`; optional `retainedTail`, `details`, `usage`, `fromHook` | 记录摘要、压缩前 token 数，以及两种保留上下文表示：storage anchor 或直接保留的 message tail；还可持久化 summary LLM usage。[E: packages/agent/src/harness/types.ts:403] [E: packages/agent/src/harness/types.ts:410] | `firstKeptEntryId` 不再是必填；但 entry 也不要求 `retainedTail` 必填。具体 compaction 结果应按生成路径验证，不能假定二者总是同时存在。[E: packages/agent/src/harness/types.ts:406] [E: packages/agent/src/harness/types.ts:408] [I] | `packages/agent/src/harness/types.ts:403` |
| `BranchSummaryEntry<T = unknown>` | `type: "branch_summary"`; `fromId`; `summary`; optional `details`, `usage`, `fromHook` | 记录 branch summary payload；`usage` 保存生成该 summary 的 LLM 用量，供 host 汇总而不进入 summary 文本。[E: packages/agent/src/harness/types.ts:414] [E: packages/agent/src/harness/types.ts:419] | `fromId` 仍只是 string；usage 也可缺失，旧 entry 或 hook 未报告时不会被类型层估算补齐。[E: packages/agent/src/harness/types.ts:416] [E: packages/agent/src/harness/types.ts:419] [I] | `packages/agent/src/harness/types.ts:414` |
| `CustomEntry<T = unknown>` | `type: "custom"`; `customType: string`; `data?: T` | 扩展型非消息 entry,用 `customType` 区分 host/application 自定义 payload,`data` 可选且泛型默认 `unknown`。[E: packages/agent/src/harness/types.ts:423][E: packages/agent/src/harness/types.ts:424][E: packages/agent/src/harness/types.ts:425][E: packages/agent/src/harness/types.ts:426] | 类型层不约束 `customType` 命名空间或 `data` schema;这些约束若存在应来自调用方约定。[I] | `packages/agent/src/harness/types.ts:423` |
| `CustomMessageEntry<T = unknown>` | `type: "custom_message"`; `customType: string`; `content: string \| (TextContent \| ImageContent)[]`; `details?: T`; `display: boolean` | 扩展型消息 entry,content 可为 plain string 或 text/image content part 数组,并携带 `display` boolean flag。[E: packages/agent/src/harness/types.ts:429][E: packages/agent/src/harness/types.ts:430][E: packages/agent/src/harness/types.ts:431][E: packages/agent/src/harness/types.ts:432][E: packages/agent/src/harness/types.ts:433][E: packages/agent/src/harness/types.ts:434] | `TextContent` 与 `ImageContent` 从 `@earendil-works/pi-ai` 导入;本节点只覆盖 agent entry wrapper,content block 字段由 `ref.ai.core-types` 覆盖。`display` 如何被 UI 或转换层解释不由该 interface 单独证明。[E: packages/agent/src/harness/types.ts:10][I] | `packages/agent/src/harness/types.ts:429` |
| `LabelEntry` | `type: "label"`; `targetId: string`; `label: string \| undefined` | 给目标 entry 携带 label payload;`label` 字段类型允许 string 或 `undefined`。[E: packages/agent/src/harness/types.ts:437][E: packages/agent/src/harness/types.ts:438][E: packages/agent/src/harness/types.ts:439][E: packages/agent/src/harness/types.ts:440] | storage contract 另有 `getLabel(id)` 读取 label;`undefined` 如何被索引、覆盖或清空属于 storage implementation 行为。[E: packages/agent/src/harness/types.ts:568][I] | `packages/agent/src/harness/types.ts:437` |
| `SessionInfoEntry` | `type: "session_info"`; `name?: string` | legacy session metadata entry;源码行内注释标明 `session_info` 是 legacy name,为 backward compatibility 保留。[E: packages/agent/src/harness/types.ts:443][E: packages/agent/src/harness/types.ts:444][E: packages/agent/src/harness/types.ts:445] | 当前更完整的 metadata shape 在 `SessionMetadata` / `JsonlSessionMetadata` 中,本 entry 只保留可选 `name`。[E: packages/agent/src/harness/types.ts:481][E: packages/agent/src/harness/types.ts:486][I] | `packages/agent/src/harness/types.ts:443` |
| `LeafEntry` | `type: "leaf"`; `targetId: string \| null` | 一条 active session-tree leaf 记录:当前 leaf 指向某个 target entry,或指向 `null`。[E: packages/agent/src/harness/types.ts:448][E: packages/agent/src/harness/types.ts:449][E: packages/agent/src/harness/types.ts:450] | `LeafEntry.targetId` 不等同于每个 entry 的 `parentId`;前者是 leaf payload,后者描述 entry 自身父节点。[E: packages/agent/src/harness/types.ts:378][E: packages/agent/src/harness/types.ts:450][I] | `packages/agent/src/harness/types.ts:448` |
| `SessionTreeEntry` | union of `MessageEntry`, `ThinkingLevelChangeEntry`, `ModelChangeEntry`, `ActiveToolsChangeEntry`, `CompactionEntry`, `BranchSummaryEntry`, `CustomEntry`, `CustomMessageEntry`, `LabelEntry`, `SessionInfoEntry`, `LeafEntry` | session tree entry 的 closed union 类型;源码列出的 11 个成员就是该 union 的静态成员集合。[E: packages/agent/src/harness/types.ts:453][E: packages/agent/src/harness/types.ts:454][E: packages/agent/src/harness/types.ts:455][E: packages/agent/src/harness/types.ts:456][E: packages/agent/src/harness/types.ts:457][E: packages/agent/src/harness/types.ts:458][E: packages/agent/src/harness/types.ts:459][E: packages/agent/src/harness/types.ts:460][E: packages/agent/src/harness/types.ts:461][E: packages/agent/src/harness/types.ts:462][E: packages/agent/src/harness/types.ts:463][E: packages/agent/src/harness/types.ts:464] | `SessionStorage.readEntry()`、`readEntries()`、`appendEntry()`、`findEntriesOnBranch()`、`readPathToRootOrCompaction()` 都以 `SessionTreeEntry` 为 contract。[E: packages/agent/src/harness/types.ts:563][E: packages/agent/src/harness/types.ts:564][E: packages/agent/src/harness/types.ts:565][E: packages/agent/src/harness/types.ts:566][E: packages/agent/src/harness/types.ts:567] | `packages/agent/src/harness/types.ts:453` |

## 派生写入形态

| 类型名 | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `PendingSessionWrite` | distributive `Omit<TEntry, "id" \| "parentId" \| "timestamp">` over `SessionTreeEntry` | 待写入 payload 形态:对每个 `SessionTreeEntry` union member 去掉 tree identity 和位置字段,留下 variant-specific 字段。[E: packages/agent/src/harness/types.ts:585][E: packages/agent/src/harness/types.ts:586][E: packages/agent/src/harness/types.ts:587][E: packages/agent/src/harness/types.ts:588][E: packages/agent/src/harness/types.ts:589] | `PendingSessionWrite` 不是 `SessionTreeEntry` union 的第 12 个 variant;它是写入前 helper 类型,说明调用方提交 payload 时无需自带 `id`、`parentId`、`timestamp`。[E: packages/agent/src/harness/types.ts:453][E: packages/agent/src/harness/types.ts:464][E: packages/agent/src/harness/types.ts:585][I] | `packages/agent/src/harness/types.ts:585` |

## 关系边界

`subsys.agent-core.session-tree` 解释 `SessionTreeEntryBase`、`MessageEntry`、`LeafEntry` 与 tree/leaf/parent 模型的关系;本节点只做字段级 catalog,不展开 `uuidv7()` 或 navigation 算法。[E: packages/agent/src/harness/types.ts:375][E: packages/agent/src/harness/types.ts:448][I]

`ref.coding-agent.session-format` 应覆盖 coding-agent 产品层 JSONL 文件格式、版本/兼容字段和磁盘序列化边界;本节点只覆盖 agent harness exported TypeScript entry types。[E: packages/agent/src/harness/types.ts:453][I]

## Sources

- packages/agent/src/harness/types.ts

## 相关

- [subsys.agent-core.session-tree](../subsystems/agent-core/session-tree.md): 会话树 entry、parent link、leaf pointer 与 uuidv7 id 的模型说明。
- [ref.coding-agent.session-format](session-format.md): coding-agent 产品层 JSONL session 文件格式与兼容字段目录。
- [subsys.coding-agent.usage-accounting](../subsystems/coding-agent/usage-accounting.md): summary/tool usage 在 entry 与统计 API 间的流转。
