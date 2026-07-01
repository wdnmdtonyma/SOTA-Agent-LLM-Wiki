---
id: subsys.agent-core.tree-navigation
title: 树导航与上下文构建
kind: subsystem
tier: T2
pkg: agent
source: [packages/agent/src/harness/session/session.ts]
symbols: [Session, buildSessionContext, getPathToRoot]
related: [subsys.agent-core.session-tree, spine.session-state-model]
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.agent-core.tree-navigation` 说明 `Session` 如何把当前 leaf 或指定 entry 映射为 branch path,再由 `buildSessionContext()` 把 path 投影成 LLM 可用的 `SessionContext`。

## 能回答的问题

- `Session.getBranch()` 如何选择当前 leaf 或指定 `fromId`?
- `storage.getPathToRoot()` 在 `Session` 导航里承担什么边界?
- `buildSessionContext()` 如何从 path entries 得到 messages、thinking level、model 和 active tools?
- compaction entry 如何改变 context message 的重建范围?
- `Session.moveTo()` 如何移动 leaf,以及何时写入 branch summary?
- 本节点和 `subsys.agent-core.session-tree` 的状态模型边界在哪里?

## 职责边界

本节点权威覆盖 `packages/agent/src/harness/session/session.ts` 中的 `Session` wrapper、`Session.getBranch()`、`Session.buildContext()`、`Session.moveTo()` 和 `buildSessionContext()` projection。`Session` 保存一个 `SessionStorage<TMetadata>` 实例,构造函数只接收 storage 并赋给私有字段 [E: packages/agent/src/harness/session/session.ts:82] [E: packages/agent/src/harness/session/session.ts:83] [E: packages/agent/src/harness/session/session.ts:85] [E: packages/agent/src/harness/session/session.ts:86]。

`getPathToRoot` 在本节点中是 `Session.getBranch()` 调用的 storage 合约入口:源码只显示 `Session` 把 leaf id 交给 `this.storage.getPathToRoot(leafId)`,没有在 `session.ts` 内实现 parent walking、排序或缺失父节点处理 [E: packages/agent/src/harness/session/session.ts:109] [E: packages/agent/src/harness/session/session.ts:110] [E: packages/agent/src/harness/session/session.ts:111] [U]。

`subsys.agent-core.session-tree` 负责 entry union、`parentId`、leaf entry 等数据模型;本节点负责这些 entry 已经排成 path 后如何导航、移动 leaf 和构建 `SessionContext` [I]。

## 关键文件

- `packages/agent/src/harness/session/session.ts`: 导出 `buildSessionContext(pathEntries)` 和 `Session<TMetadata>`,并通过 `SessionStorage` 读取 metadata,读取/移动 leaf,读取 entry/label/session name,并追加 message/state entry 与 branch summary [E: packages/agent/src/harness/session/session.ts:22] [E: packages/agent/src/harness/session/session.ts:82] [E: packages/agent/src/harness/session/session.ts:89] [E: packages/agent/src/harness/session/session.ts:97] [E: packages/agent/src/harness/session/session.ts:101] [E: packages/agent/src/harness/session/session.ts:118] [E: packages/agent/src/harness/session/session.ts:122] [E: packages/agent/src/harness/session/session.ts:132] [E: packages/agent/src/harness/session/session.ts:247]。

## Session Navigation

`Session.getMetadata()`, `Session.getLeafId()`, `Session.getEntry()`, `Session.getEntries()` 和 `Session.getLabel()` 是薄 wrapper:它们直接转发到 storage;`Session.getStorage()` 直接返回 storage 实例,这些方法不在 `Session` 层缓存或重排结果 [E: packages/agent/src/harness/session/session.ts:89] [E: packages/agent/src/harness/session/session.ts:90] [E: packages/agent/src/harness/session/session.ts:93] [E: packages/agent/src/harness/session/session.ts:94] [E: packages/agent/src/harness/session/session.ts:97] [E: packages/agent/src/harness/session/session.ts:98] [E: packages/agent/src/harness/session/session.ts:101] [E: packages/agent/src/harness/session/session.ts:102] [E: packages/agent/src/harness/session/session.ts:105] [E: packages/agent/src/harness/session/session.ts:106] [E: packages/agent/src/harness/session/session.ts:118] [E: packages/agent/src/harness/session/session.ts:119]。

`Session.getBranch(fromId?)` 的 navigation rule 很小:如果 caller 传入 `fromId`,它把 `fromId` 当作 leaf id;否则先读取 storage 当前 leaf;随后统一调用 `storage.getPathToRoot(leafId)` [E: packages/agent/src/harness/session/session.ts:109] [E: packages/agent/src/harness/session/session.ts:110] [E: packages/agent/src/harness/session/session.ts:111]。因此 `Session` 层不区分“当前分支”和“指定 entry 分支”的 path-building 算法,差异只在 leaf id 来源 [I]。

`Session.moveTo(entryId, summary?)` 先验证非空 `entryId` 是否存在;不存在时抛 `SessionError("not_found", ...)` [E: packages/agent/src/harness/session/session.ts:247] [E: packages/agent/src/harness/session/session.ts:251] [E: packages/agent/src/harness/session/session.ts:252]。验证后它调用 `storage.setLeafId(entryId)` 移动当前 leaf;没有 summary 时直接返回 `undefined` [E: packages/agent/src/harness/session/session.ts:254] [E: packages/agent/src/harness/session/session.ts:255]。

`Session.moveTo()` 带 summary 时追加一条 `branch_summary` entry:entry id 来自 `storage.createEntryId()`,父节点是目标 `entryId`,`fromId` 在目标为空时写成 `"root"`,summary/details/fromHook 来自参数 [E: packages/agent/src/harness/session/session.ts:256] [E: packages/agent/src/harness/session/session.ts:257] [E: packages/agent/src/harness/session/session.ts:258] [E: packages/agent/src/harness/session/session.ts:259] [E: packages/agent/src/harness/session/session.ts:260] [E: packages/agent/src/harness/session/session.ts:261] [E: packages/agent/src/harness/session/session.ts:262] [E: packages/agent/src/harness/session/session.ts:263] [E: packages/agent/src/harness/session/session.ts:264] [E: packages/agent/src/harness/session/session.ts:265]。

## Path Root Context Build

`Session.buildContext()` 是导航和 context projection 的连接点:它先等待 `this.getBranch()`,再把 branch entries 传给 `buildSessionContext()` [E: packages/agent/src/harness/session/session.ts:114] [E: packages/agent/src/harness/session/session.ts:115]。这意味着 context build 默认从当前 leaf 的 path 开始,除非 caller 自己先用 `getBranch(fromId)` 取指定 path 并直接调用 `buildSessionContext()` [I]。

`buildSessionContext(pathEntries)` 第一遍扫描 path entries,累积四类状态:默认 `thinkingLevel` 是 `"off"`,默认 `model` 是 `null`,默认 `activeToolNames` 是 `null`,默认 `compaction` 是 `null` [E: packages/agent/src/harness/session/session.ts:22] [E: packages/agent/src/harness/session/session.ts:23] [E: packages/agent/src/harness/session/session.ts:24] [E: packages/agent/src/harness/session/session.ts:25] [E: packages/agent/src/harness/session/session.ts:26]。

第一遍扫描遇到 `thinking_level_change` 会更新 `thinkingLevel`,遇到 `model_change` 会设置 provider/modelId,遇到 assistant `message` 会用 message 自带 provider/model 覆盖模型状态,遇到 `active_tools_change` 会复制 active tool names,遇到 `compaction` 会把当前 compaction entry 记为最后看到的 compaction [E: packages/agent/src/harness/session/session.ts:28] [E: packages/agent/src/harness/session/session.ts:29] [E: packages/agent/src/harness/session/session.ts:30] [E: packages/agent/src/harness/session/session.ts:31] [E: packages/agent/src/harness/session/session.ts:32] [E: packages/agent/src/harness/session/session.ts:33] [E: packages/agent/src/harness/session/session.ts:34] [E: packages/agent/src/harness/session/session.ts:35] [E: packages/agent/src/harness/session/session.ts:36] [E: packages/agent/src/harness/session/session.ts:37] [E: packages/agent/src/harness/session/session.ts:38]。

message projection 只把三类 entry 变成 `AgentMessage`:普通 `message` 直接 push message payload;`custom_message` 通过 `createCustomMessage()` 转换;有 summary 的 `branch_summary` 通过 `createBranchSummaryMessage()` 转换 [E: packages/agent/src/harness/session/session.ts:42] [E: packages/agent/src/harness/session/session.ts:43] [E: packages/agent/src/harness/session/session.ts:44] [E: packages/agent/src/harness/session/session.ts:45] [E: packages/agent/src/harness/session/session.ts:46] [E: packages/agent/src/harness/session/session.ts:48] [E: packages/agent/src/harness/session/session.ts:49] [E: packages/agent/src/harness/session/session.ts:50] [E: packages/agent/src/harness/session/session.ts:51] [E: packages/agent/src/harness/session/session.ts:52] [E: packages/agent/src/harness/session/session.ts:53] [E: packages/agent/src/harness/session/session.ts:56] [E: packages/agent/src/harness/session/session.ts:57]。

如果 path 上存在 compaction,`buildSessionContext()` 先插入 `createCompactionSummaryMessage(compaction.summary, compaction.tokensBefore, compaction.timestamp)`,再找到 compaction entry 的 index,从 compaction 之前的 entries 中只追加自 `firstKeptEntryId` 起的 messages,最后追加 compaction entry 之后的 messages [E: packages/agent/src/harness/session/session.ts:61] [E: packages/agent/src/harness/session/session.ts:62] [E: packages/agent/src/harness/session/session.ts:63] [E: packages/agent/src/harness/session/session.ts:64] [E: packages/agent/src/harness/session/session.ts:65] [E: packages/agent/src/harness/session/session.ts:67] [E: packages/agent/src/harness/session/session.ts:68] [E: packages/agent/src/harness/session/session.ts:70] [E: packages/agent/src/harness/session/session.ts:71]。

如果 path 上没有 compaction,`buildSessionContext()` 按 path entry 顺序对所有 entries 调用 `appendMessage()`;最终返回 `{ messages, thinkingLevel, model, activeToolNames }` [E: packages/agent/src/harness/session/session.ts:73] [E: packages/agent/src/harness/session/session.ts:74] [E: packages/agent/src/harness/session/session.ts:75] [E: packages/agent/src/harness/session/session.ts:79]。

## State Model 边界

`Session` 的 append 方法把状态变化写成 tree entries,而不是直接改内存字段。`appendMessage()`, `appendThinkingLevelChange()`, `appendModelChange()`, `appendActiveToolsChange()`, `appendCompaction()`, `appendCustomEntry()`, `appendCustomMessageEntry()` 和 `appendSessionName()` 都创建新 entry,用 `storage.createEntryId()` 生成 id,用 `storage.getLeafId()` 作为 parentId,再通过 `appendTypedEntry()` 调 `storage.appendEntry(entry)` [E: packages/agent/src/harness/session/session.ts:127] [E: packages/agent/src/harness/session/session.ts:128] [E: packages/agent/src/harness/session/session.ts:132] [E: packages/agent/src/harness/session/session.ts:135] [E: packages/agent/src/harness/session/session.ts:136] [E: packages/agent/src/harness/session/session.ts:142] [E: packages/agent/src/harness/session/session.ts:145] [E: packages/agent/src/harness/session/session.ts:146] [E: packages/agent/src/harness/session/session.ts:152] [E: packages/agent/src/harness/session/session.ts:155] [E: packages/agent/src/harness/session/session.ts:156] [E: packages/agent/src/harness/session/session.ts:163] [E: packages/agent/src/harness/session/session.ts:166] [E: packages/agent/src/harness/session/session.ts:167] [E: packages/agent/src/harness/session/session.ts:173] [E: packages/agent/src/harness/session/session.ts:182] [E: packages/agent/src/harness/session/session.ts:183] [E: packages/agent/src/harness/session/session.ts:193] [E: packages/agent/src/harness/session/session.ts:196] [E: packages/agent/src/harness/session/session.ts:197] [E: packages/agent/src/harness/session/session.ts:204] [E: packages/agent/src/harness/session/session.ts:212] [E: packages/agent/src/harness/session/session.ts:213] [E: packages/agent/src/harness/session/session.ts:236] [E: packages/agent/src/harness/session/session.ts:240] [E: packages/agent/src/harness/session/session.ts:241]。

`appendLabel(targetId, label)` 是一个 validation boundary:它先用 `storage.getEntry(targetId)` 确认目标存在,目标缺失时抛 `SessionError("not_found", ...)`,然后追加 `label` entry [E: packages/agent/src/harness/session/session.ts:222] [E: packages/agent/src/harness/session/session.ts:223] [E: packages/agent/src/harness/session/session.ts:224] [E: packages/agent/src/harness/session/session.ts:226] [E: packages/agent/src/harness/session/session.ts:227] [E: packages/agent/src/harness/session/session.ts:231] [E: packages/agent/src/harness/session/session.ts:232]。

`getSessionName()` 不是 metadata getter;它查找 `session_info` entries,取最后一条的 `name`,trim 后为空则返回 `undefined` [E: packages/agent/src/harness/session/session.ts:122] [E: packages/agent/src/harness/session/session.ts:123] [E: packages/agent/src/harness/session/session.ts:124]。因此 session name 在 `Session` wrapper 里被建模为 tree entry projection,不是 `SessionMetadata` 的必填字段 [I]。

## 设计动机与权衡

`Session` 把导航、entry append 和 context projection 放在 storage facade 之上:storage 负责 leaf/path/entry 持久化,`Session` 负责把这些能力组合成 agent-core 可复用 API [E: packages/agent/src/harness/session/session.ts:83] [E: packages/agent/src/harness/session/session.ts:109] [E: packages/agent/src/harness/session/session.ts:114] [E: packages/agent/src/harness/session/session.ts:127] [I]。

`buildSessionContext()` 通过扫描 path 得到当前 thinking/tool/model 状态,其中 model 既可来自 `model_change`,也可由 assistant message 的 provider/model 覆盖;同时它把 message-like entries 投影成 LLM message list,让非 message 的 state entries 能影响后续 turn,但不会全部进入 `messages` [E: packages/agent/src/harness/session/session.ts:28] [E: packages/agent/src/harness/session/session.ts:31] [E: packages/agent/src/harness/session/session.ts:33] [E: packages/agent/src/harness/session/session.ts:35] [E: packages/agent/src/harness/session/session.ts:42] [E: packages/agent/src/harness/session/session.ts:79] [I]。

## Gotcha

- `Session.getBranch(fromId?)` 的参数名是 `fromId`,但源码把它赋给 `leafId` 并传给 `getPathToRoot()`;它不是“从这个 id 往下找 children”的 API [E: packages/agent/src/harness/session/session.ts:109] [E: packages/agent/src/harness/session/session.ts:110] [E: packages/agent/src/harness/session/session.ts:111] [I]。
- `buildSessionContext()` 只记住最后一个 compaction entry;如果 path 中有多个 compaction entry,本函数以最后一次扫描到的 `compaction` 作为 rebuild anchor [E: packages/agent/src/harness/session/session.ts:26] [E: packages/agent/src/harness/session/session.ts:37] [E: packages/agent/src/harness/session/session.ts:38] [I]。
- `Session.moveTo(null, summary)` 会把 leaf 设置为 `null`,但仍可追加 `parentId: null` 且 `fromId: "root"` 的 branch summary [E: packages/agent/src/harness/session/session.ts:247] [E: packages/agent/src/harness/session/session.ts:248] [E: packages/agent/src/harness/session/session.ts:254] [E: packages/agent/src/harness/session/session.ts:259] [E: packages/agent/src/harness/session/session.ts:261]。

## 跨包边界

`subsys.agent-core.tree-navigation` 属于 `pi-agent-core` harness 层;本节点 source 只在 `packages/agent/src/harness/session/session.ts`,该文件顶部 import 只显示 `pi-ai` 类型和本地 harness 类型/工具,不展开 `pi-coding-agent` 的 CLI、TUI 或 product session manager [E: packages/agent/src/harness/session/session.ts:1] [E: packages/agent/src/harness/session/session.ts:2] [E: packages/agent/src/harness/session/session.ts:3] [E: packages/agent/src/harness/session/session.ts:4] [E: packages/agent/src/harness/session/session.ts:19] [E: packages/agent/src/harness/session/session.ts:20] [I]。

[subsys.agent-core.session-tree](session-tree.md) 解释 `SessionTreeEntry` variants、`parentId` 和 leaf entry 的数据模型;本节点解释 `Session` 如何调用 storage 取 branch path、移动 leaf 和从 path 构建 `SessionContext` [I]。

[spine.session-state-model](../../spine/session-state-model.md) 是跨 source 的总览节点,覆盖 `session.ts`、types 和 coding-agent session manager 的整体状态模型;本节点只给 `session.ts` 内的 navigation/projection 细节 [I]。

## Sources

- packages/agent/src/harness/session/session.ts

## 相关

- [subsys.agent-core.session-tree](session-tree.md): `SessionTreeEntry`、`parentId`、leaf entry 与 entry variant 数据模型。
- [spine.session-state-model](../../spine/session-state-model.md): 会话状态、会话树和产品层 session manager 的总览。
