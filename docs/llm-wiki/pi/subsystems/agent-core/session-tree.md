---
id: subsys.agent-core.session-tree
title: 会话树模型
kind: subsystem
tier: T2
pkg: agent
source: [packages/agent/src/harness/types.ts, packages/agent/src/harness/session/uuid.ts]
symbols: [SessionTreeEntry, MessageEntry, LeafEntry, uuidv7]
related: [spine.session-state-model, subsys.agent-core.tree-navigation, ref.agent.session-entry-types]
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.agent-core.session-tree` 定义 pi-agent-core 的 append-only session tree entry 形状: 所有 entry 都有 `id`、`parentId`、`timestamp`, 具体变体用 `type` 区分; `uuidv7()` 提供默认 entry id 形态。

## 能回答的问题

- `SessionTreeEntry` 有哪些 entry variants?
- `MessageEntry`、`LeafEntry` 和普通状态 entry 在数据模型里分别保存什么?
- `parentId`、message、leaf pointer 如何共同描述当前分支?
- `uuidv7()` 如何把时间戳、单调 sequence 和随机字节编码成 UUID 字符串?
- 这个节点和 `spine.session-state-model` 的边界在哪里?

## 职责边界

本节点只覆盖 `packages/agent/src/harness/types.ts` 中的 session tree 类型声明和 `packages/agent/src/harness/session/uuid.ts` 中的 id 生成器。`SessionTreeEntryBase` 给每个 entry 定义 `type`、`id`、`parentId`、`timestamp` 四个共同字段 [E: packages/agent/src/harness/types.ts:335] [E: packages/agent/src/harness/types.ts:336] [E: packages/agent/src/harness/types.ts:337] [E: packages/agent/src/harness/types.ts:338]。

`spine.session-state-model` 是读时 projection 的脊柱节点: 它说明 storage 如何沿当前 leaf 构建 branch path、如何把 entry 投影成 `SessionContext.messages`、`thinkingLevel`、`model`、`activeToolNames`。本节点只从类型层面说明 `SessionContext` 的四个输出字段存在，不描述 `buildSessionContext()` 算法细节 [E: packages/agent/src/harness/types.ts:422] [E: packages/agent/src/harness/types.ts:423] [E: packages/agent/src/harness/types.ts:424] [E: packages/agent/src/harness/types.ts:425] [E: packages/agent/src/harness/types.ts:426] [I]。

## 数据模型

### 基础 entry 关系

`id` 是 entry 自身标识，`parentId` 是指向父 entry 的可空引用，`timestamp` 是 entry 时间戳字符串，`type` 是 discriminated union 的分派字段 [E: packages/agent/src/harness/types.ts:335] [E: packages/agent/src/harness/types.ts:336] [E: packages/agent/src/harness/types.ts:337] [E: packages/agent/src/harness/types.ts:338]。根 entry 或无父上下文的 entry 可以用 `parentId: null` 表示，因为字段类型是 `string | null` [E: packages/agent/src/harness/types.ts:337]。

源码窗口里没有 `children` 或 `childIds` 字段; child relation 是 `parentId` 的反向索引概念，而不是 entry 自身存储的字段 [I]。storage contract 暴露 `getPathToRoot(leafId)`，说明导航 API 以 leaf id 为输入返回 path，而不是要求 entry 保存 child list [E: packages/agent/src/harness/types.ts:452] [I]。

### Entry variants

| Variant | 关键字段 | 数据含义 |
| --- | --- | --- |
| `message` | `message: AgentMessage` | 一条进入 session tree 的 agent message payload [E: packages/agent/src/harness/types.ts:341] [E: packages/agent/src/harness/types.ts:342] [E: packages/agent/src/harness/types.ts:343] |
| `thinking_level_change` | `thinkingLevel: string` | branch 上的 thinking level 状态变更 entry [E: packages/agent/src/harness/types.ts:346] [E: packages/agent/src/harness/types.ts:347] [E: packages/agent/src/harness/types.ts:348] |
| `model_change` | `provider`, `modelId` | branch 上的 provider/model 状态变更 entry [E: packages/agent/src/harness/types.ts:351] [E: packages/agent/src/harness/types.ts:352] [E: packages/agent/src/harness/types.ts:353] [E: packages/agent/src/harness/types.ts:354] |
| `active_tools_change` | `activeToolNames: string[]` | branch 上的 active tool name set 变更 entry [E: packages/agent/src/harness/types.ts:357] [E: packages/agent/src/harness/types.ts:358] [E: packages/agent/src/harness/types.ts:359] |
| `compaction` | `summary`, `firstKeptEntryId`, `tokensBefore`, optional `details`, `fromHook` | 压缩摘要 entry, 并记录从哪条 entry 开始保留原始上下文 [E: packages/agent/src/harness/types.ts:362] [E: packages/agent/src/harness/types.ts:363] [E: packages/agent/src/harness/types.ts:364] [E: packages/agent/src/harness/types.ts:365] [E: packages/agent/src/harness/types.ts:366] [E: packages/agent/src/harness/types.ts:367] [E: packages/agent/src/harness/types.ts:368] |
| `branch_summary` | `fromId`, `summary`, optional `details`, `fromHook` | 针对某个 branch 起点的 summary entry [E: packages/agent/src/harness/types.ts:371] [E: packages/agent/src/harness/types.ts:372] [E: packages/agent/src/harness/types.ts:373] [E: packages/agent/src/harness/types.ts:374] [E: packages/agent/src/harness/types.ts:375] [E: packages/agent/src/harness/types.ts:376] |
| `custom` | `customType`, optional `data` | 扩展自定义状态 entry [E: packages/agent/src/harness/types.ts:379] [E: packages/agent/src/harness/types.ts:380] [E: packages/agent/src/harness/types.ts:381] [E: packages/agent/src/harness/types.ts:382] |
| `custom_message` | `customType`, `content`, optional `details`, `display` | 扩展自定义消息 entry, content 可以是字符串或 text/image content 数组 [E: packages/agent/src/harness/types.ts:385] [E: packages/agent/src/harness/types.ts:386] [E: packages/agent/src/harness/types.ts:387] [E: packages/agent/src/harness/types.ts:388] [E: packages/agent/src/harness/types.ts:389] [E: packages/agent/src/harness/types.ts:390] |
| `label` | `targetId`, `label` | 给目标 entry 写 label 或把 label 置为 `undefined` [E: packages/agent/src/harness/types.ts:393] [E: packages/agent/src/harness/types.ts:394] [E: packages/agent/src/harness/types.ts:395] [E: packages/agent/src/harness/types.ts:396] |
| `session_info` | optional `name` | legacy session metadata entry, 源码注释标明 legacy name kept for backwards compatibility [E: packages/agent/src/harness/types.ts:399] [E: packages/agent/src/harness/types.ts:400] [E: packages/agent/src/harness/types.ts:401] |
| `leaf` | `targetId: string | null` | 记录当前 session-tree leaf 应移动到哪个 entry 或清空到 `null` [E: packages/agent/src/harness/types.ts:404] [E: packages/agent/src/harness/types.ts:405] [E: packages/agent/src/harness/types.ts:406] |

`SessionTreeEntry` union 明确把这些 interfaces 组成一个 closed set: `MessageEntry`、`ThinkingLevelChangeEntry`、`ModelChangeEntry`、`ActiveToolsChangeEntry`、`CompactionEntry`、`BranchSummaryEntry`、`CustomEntry`、`CustomMessageEntry`、`LabelEntry`、`SessionInfoEntry`、`LeafEntry` [E: packages/agent/src/harness/types.ts:409] [E: packages/agent/src/harness/types.ts:410] [E: packages/agent/src/harness/types.ts:411] [E: packages/agent/src/harness/types.ts:412] [E: packages/agent/src/harness/types.ts:413] [E: packages/agent/src/harness/types.ts:414] [E: packages/agent/src/harness/types.ts:415] [E: packages/agent/src/harness/types.ts:416] [E: packages/agent/src/harness/types.ts:417] [E: packages/agent/src/harness/types.ts:418] [E: packages/agent/src/harness/types.ts:419] [E: packages/agent/src/harness/types.ts:420]。

### Message、leaf、parent 的组合关系

`MessageEntry` 只在 variant payload 中增加 `message: AgentMessage`; 它仍继承 `SessionTreeEntryBase` 的 `id`、`parentId`、`timestamp`，所以消息既是 payload 也是 tree node [E: packages/agent/src/harness/types.ts:341] [E: packages/agent/src/harness/types.ts:343] [E: packages/agent/src/harness/types.ts:334]。

`LeafEntry` 的 `targetId` 是 `string | null`，它和普通 entry 的 `parentId` 是两种不同指针: `parentId` 描述 entry 在树中的父节点，`targetId` 描述当前 leaf pointer 应指向哪条 entry 或空 leaf [E: packages/agent/src/harness/types.ts:337] [E: packages/agent/src/harness/types.ts:404] [E: packages/agent/src/harness/types.ts:405] [E: packages/agent/src/harness/types.ts:406]。`SessionStorage` contract 也把 `getLeafId()` / `setLeafId()` 与 `appendEntry()` / `getPathToRoot()` 分开建模，说明 leaf pointer 是 storage 层的一等状态，而不只是普通 message payload [E: packages/agent/src/harness/types.ts:442] [E: packages/agent/src/harness/types.ts:444] [E: packages/agent/src/harness/types.ts:446] [E: packages/agent/src/harness/types.ts:452]。

`PendingSessionWrite` 是 `SessionTreeEntry` 去掉 `id`、`parentId`、`timestamp` 后的待写入形态; 这暗示 harness/storage 边界会在写入时补齐 tree identity 和位置字段，而调用方只提交 variant payload [E: packages/agent/src/harness/types.ts:494] [E: packages/agent/src/harness/types.ts:495] [E: packages/agent/src/harness/types.ts:496] [E: packages/agent/src/harness/types.ts:497] [I]。

## uuidv7

`uuidv7()` 先创建 16 字节随机数组，并用 `fillRandomBytes(random)` 填充; `fillRandomBytes()` 优先调用 `globalThis.crypto.getRandomValues(bytes)`，否则退回 `Math.random()` 循环填 byte [E: packages/agent/src/harness/session/uuid.ts:15] [E: packages/agent/src/harness/session/uuid.ts:16] [E: packages/agent/src/harness/session/uuid.ts:17] [E: packages/agent/src/harness/session/uuid.ts:5] [E: packages/agent/src/harness/session/uuid.ts:6] [E: packages/agent/src/harness/session/uuid.ts:7] [E: packages/agent/src/harness/session/uuid.ts:10] [E: packages/agent/src/harness/session/uuid.ts:11]。

id 的时间成分来自 `Date.now()`; 当新 timestamp 大于 `lastTimestamp` 时，sequence 从随机 byte 6-9 组装并更新 `lastTimestamp`; 当 timestamp 未前进时，sequence 自增，溢出为 0 时人工推进 `lastTimestamp` [E: packages/agent/src/harness/session/uuid.ts:18] [E: packages/agent/src/harness/session/uuid.ts:20] [E: packages/agent/src/harness/session/uuid.ts:21] [E: packages/agent/src/harness/session/uuid.ts:22] [E: packages/agent/src/harness/session/uuid.ts:24] [E: packages/agent/src/harness/session/uuid.ts:25] [E: packages/agent/src/harness/session/uuid.ts:26]。

输出 bytes 的前 6 字节编码 `lastTimestamp`; byte 6 设置 version nibble `0x70`，byte 8 设置 variant bits `0x80`，后续字节混入 sequence 和 random bytes [E: packages/agent/src/harness/session/uuid.ts:31] [E: packages/agent/src/harness/session/uuid.ts:32] [E: packages/agent/src/harness/session/uuid.ts:33] [E: packages/agent/src/harness/session/uuid.ts:34] [E: packages/agent/src/harness/session/uuid.ts:35] [E: packages/agent/src/harness/session/uuid.ts:36] [E: packages/agent/src/harness/session/uuid.ts:37] [E: packages/agent/src/harness/session/uuid.ts:39] [E: packages/agent/src/harness/session/uuid.ts:41] [E: packages/agent/src/harness/session/uuid.ts:42] [E: packages/agent/src/harness/session/uuid.ts:43] [E: packages/agent/src/harness/session/uuid.ts:44] [E: packages/agent/src/harness/session/uuid.ts:45] [E: packages/agent/src/harness/session/uuid.ts:46]。

`formatUuid(bytes)` 把每个 byte 转成 2 位 hex，再输出 `8-4-4-4-12` 分组的 UUID 字符串 [E: packages/agent/src/harness/session/uuid.ts:52] [E: packages/agent/src/harness/session/uuid.ts:53]。因此 `uuidv7()` 的结果按 timestamp/sequence 大体单调，且仍保留随机尾部; “严格全局有序”或“跨进程单调”不在这两个源码文件里成立 [I]。

## Gotcha

- `SessionTreeEntryBase.type` 是宽泛 `string`，但 union 成员把具体 `type` 收窄成 literal; 需要做 variant 判断时应以 union 成员为准 [E: packages/agent/src/harness/types.ts:335] [E: packages/agent/src/harness/types.ts:342] [E: packages/agent/src/harness/types.ts:409]。
- `LeafEntry` 自身也是 `SessionTreeEntry` union 的一个成员，不等同于 `SessionStorage.getLeafId()` 返回的 leaf pointer; 前者是可持久化 entry，后者是 storage API 暴露的当前 pointer [E: packages/agent/src/harness/types.ts:404] [E: packages/agent/src/harness/types.ts:420] [E: packages/agent/src/harness/types.ts:442]。
- `uuidv7()` 的 fallback 使用 `Math.random()`，因此没有 `crypto.getRandomValues` 的运行时随机性更弱; 这是代码路径事实，不应把所有运行时都描述为 cryptographically strong [E: packages/agent/src/harness/session/uuid.ts:5] [E: packages/agent/src/harness/session/uuid.ts:6] [E: packages/agent/src/harness/session/uuid.ts:10] [E: packages/agent/src/harness/session/uuid.ts:11] [I]。

## 跨包边界

[spine.session-state-model](../../spine/session-state-model.md) 负责解释 session tree 如何被读成当前 LLM context; 本节点负责 entry data model 和 id generator [I]。

[subsys.agent-core.tree-navigation](tree-navigation.md) 应负责 `getPathToRoot()`、branch navigation、current leaf 变化的控制流; 本节点只说明 storage contract 中存在这些 API [E: packages/agent/src/harness/types.ts:442] [E: packages/agent/src/harness/types.ts:444] [E: packages/agent/src/harness/types.ts:452] [I]。

[ref.agent.session-entry-types](../../reference/session-entry-types.md) 应作为 catalog 全覆盖每个 entry variant 的字段; 本节点给 data model 关系和边界解释 [I]。

## Sources

- packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/uuid.ts

## 相关

- [spine.session-state-model](../../spine/session-state-model.md): session tree 到 `SessionContext` 的读时 projection、compaction 读法和 agent/coding-agent 边界。
- [subsys.agent-core.tree-navigation](tree-navigation.md): leaf/path navigation 和 branch 操作控制流。
- [ref.agent.session-entry-types](../../reference/session-entry-types.md): entry variant 字段 catalog。
