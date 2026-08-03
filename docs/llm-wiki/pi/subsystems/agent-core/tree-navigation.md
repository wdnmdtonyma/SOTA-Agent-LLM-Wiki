---
id: subsys.agent-core.tree-navigation
title: 树导航与上下文构建
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/types.ts
  - packages/agent/src/harness/session/array-session-index.ts
symbols:
  - Session
  - buildSessionContext
  - buildContextEntries
  - sessionEntryToContextMessages
  - defaultContextEntryTransform
related:
  - subsys.agent-core.session-tree
  - subsys.agent-core.session-storage
  - spine.session-state-model
evidence: explicit
status: verified
updated: c1019d9202
---

> `subsys.agent-core.tree-navigation` 说明 `Session` 如何选择 active branch、做有界查询、移动 leaf，并把 branch entries 经可扩展 transform/projector 投影成 LLM context。

## 能回答的问题

- `getBranch()`、`findEntriesOnBranch()` 与 `getEntries()` 有什么区别？
- branch query 的 stop/filter/order/limit 在什么顺序应用？
- `moveTo()` 如何以 append-only entry 表示 leaf 移动？
- compaction、custom entry 和 branch summary 如何进入 context？
- 宿主怎样追加 context transform 或 custom-entry projector？

## 职责边界

`Session` 持有一个 repository-owned `SessionStorage`，同时缓存 metadata、active leaf、context build options 与 append tail。[E: packages/agent/src/harness/session/session.ts:152] [E: packages/agent/src/harness/session/session.ts:153] [E: packages/agent/src/harness/session/session.ts:155] [E: packages/agent/src/harness/session/session.ts:157] storage 负责持久化与 path 原语；`Session` 负责默认 start、append ordering、context options 合并和面向调用方的导航 API。[E: packages/agent/src/harness/session/session.ts:184] [E: packages/agent/src/harness/session/session.ts:188] [E: packages/agent/src/harness/session/session.ts:209]

## Branch 读取与查询

`getEntries(options)` 按持久化顺序做游标读取，不解析 tree。[E: packages/agent/src/harness/session/session.ts:180] `getBranch(fromId?)` 则读取指定 entry 到 root/compaction boundary 的 path；省略参数时使用缓存 leaf，显式传 `null` 会得到空 path。[E: packages/agent/src/harness/session/session.ts:184] [E: packages/agent/src/harness/session/session.ts:185] [E: packages/agent/src/harness/session/array-session-index.ts:168]

`findEntriesOnBranch(query)` 支持：

- `start`：省略时为 active leaf，`null` 表示空结果。[E: packages/agent/src/harness/types.ts:537] [E: packages/agent/src/harness/session/session.ts:192] [E: packages/agent/src/harness/session/array-session-index.ts:122]
- `stopAtType/stopAtId`：包含命中的 boundary entry。[E: packages/agent/src/harness/types.ts:541] [E: packages/agent/src/harness/types.ts:543]
- `type/customType`：先确定 traversal bound，再过滤返回值。[E: packages/agent/src/harness/types.ts:545] [E: packages/agent/src/harness/types.ts:547]
- `order`：默认 newest-first，也可 oldest-first；`limit` 在过滤后应用。[E: packages/agent/src/harness/types.ts:549] [E: packages/agent/src/harness/types.ts:551]

共享数组索引从 start 沿 parent 走并检测 cycle/missing parent，再按 order 处理 stop、filter 与 limit。[E: packages/agent/src/harness/session/array-session-index.ts:123] [E: packages/agent/src/harness/session/array-session-index.ts:128] [E: packages/agent/src/harness/session/array-session-index.ts:138] [E: packages/agent/src/harness/session/array-session-index.ts:141] [E: packages/agent/src/harness/session/array-session-index.ts:147] [E: packages/agent/src/harness/session/array-session-index.ts:152] `findEntryOnBranch()` 是相同查询的 `limit: 1` 便利方法。[E: packages/agent/src/harness/session/session.ts:197]

## Leaf 移动

`moveTo(entryId, summary?)` 先验证非空目标存在，再 append 一条 `leaf` entry；`enqueueAppend()` 会把该 entry 的 parent 设为移动前 leaf，并在落盘成功后把缓存 leaf 设成 targetId。[E: packages/agent/src/harness/session/session.ts:400] [E: packages/agent/src/harness/session/session.ts:404] [E: packages/agent/src/harness/session/session.ts:407] [E: packages/agent/src/harness/session/session.ts:243] [E: packages/agent/src/harness/session/session.ts:247]

若传入 summary，leaf entry 之后还会 append `branch_summary`，其 `fromId` 为目标 id 或 `"root"`；该 summary entry 成为新的 active leaf。[E: packages/agent/src/harness/session/session.ts:409] [E: packages/agent/src/harness/session/session.ts:413] [E: packages/agent/src/harness/session/session.ts:414]

## Context 构建流水线

1. `deriveSessionContextState()` 扫描原始 branch path，取最后生效的 thinking level、model 和 active tool names；assistant message 自带的 provider/model 也会更新 model state。[E: packages/agent/src/harness/session/session.ts:41] [E: packages/agent/src/harness/session/session.ts:47] [E: packages/agent/src/harness/session/session.ts:51] [E: packages/agent/src/harness/session/session.ts:53]
2. `defaultContextEntryTransform()` 找最后一个 compaction。若有 `retainedTail`，只保留 compaction 与其后的 entries；否则保留 compaction、`firstKeptEntryId` 起的 pre-compaction tail，以及 compaction 后 entries。[E: packages/agent/src/harness/session/session.ts:61] [E: packages/agent/src/harness/session/session.ts:64] [E: packages/agent/src/harness/session/session.ts:74] [E: packages/agent/src/harness/session/session.ts:80] [E: packages/agent/src/harness/session/session.ts:88]
3. `buildContextEntries()` 再按注册顺序应用宿主提供的 `entryTransforms`。[E: packages/agent/src/harness/session/session.ts:94] [E: packages/agent/src/harness/session/session.ts:98] [E: packages/agent/src/harness/session/session.ts:99]
4. `sessionEntryToContextMessages()` 把 message、custom_message、compaction、非空 branch_summary 转成 model messages；custom entry 默认省略，只有对应 `customType` projector 才能输出消息。[E: packages/agent/src/harness/session/session.ts:105] [E: packages/agent/src/harness/session/session.ts:111] [E: packages/agent/src/harness/session/session.ts:125] [E: packages/agent/src/harness/session/session.ts:131] [E: packages/agent/src/harness/session/session.ts:134]
5. `buildSessionContext()` 返回由原始 path 派生的状态与转换后 entries 生成的 messages。[E: packages/agent/src/harness/session/session.ts:140] [E: packages/agent/src/harness/session/session.ts:144] [E: packages/agent/src/harness/session/session.ts:145] [E: packages/agent/src/harness/session/session.ts:149]

repository 可以为所有 session 配置默认 transform/projector，单次 `buildContextEntries()` 或 `buildContext()` 还可附加 options；默认 transform 先执行，repository defaults 再先于 call-site options 合并。[E: packages/agent/src/harness/session/session.ts:36] [E: packages/agent/src/harness/session/session.ts:38] [E: packages/agent/src/harness/session/session.ts:201] [E: packages/agent/src/harness/session/session.ts:209] [E: packages/agent/src/harness/session/session.ts:214]

## 设计动机与权衡

持久化 tree 保留完整 history，而 context pipeline 把“存什么”和“发给模型什么”分离。宿主可扩展 custom entry 的上下文化，却无需修改 storage format 或默认 entry union。[E: packages/agent/src/harness/session/session.ts:38] [E: packages/agent/src/harness/session/session.ts:134] [I]

## Gotcha

- `getBranch(fromId)` 的 `fromId` 是 path 的起始 leaf，不是向下查 children 的起点。[E: packages/agent/src/harness/session/session.ts:184] [E: packages/agent/src/harness/session/session.ts:185]
- branch query 的 stop 发生在 type/customType filter 之前；boundary 自身若不满足 filter，可以不出现在最终结果里。[E: packages/agent/src/harness/session/array-session-index.ts:142] [E: packages/agent/src/harness/session/array-session-index.ts:146] [E: packages/agent/src/harness/session/array-session-index.ts:147]
- state 从原始 path 派生，entry transform 只改变 messages 的输入集合，不会回写 thinking/model/tool state。[E: packages/agent/src/harness/session/session.ts:144] [E: packages/agent/src/harness/session/session.ts:145]

## 跨包边界

本节点属于 `pi-agent-core` 的可复用 harness。`pi-coding-agent` 的 `SessionManager` 有独立的同步 navigation/context 实现，不能把这里的 async repository contract 直接套到产品层 manager。[I]

## Sources

- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/array-session-index.ts

## 相关

- [subsys.agent-core.session-tree](session-tree.md)：entry union、parentId 与 leaf entry 数据模型。
- [subsys.agent-core.session-storage](session-storage.md)：repository/storage/Session 三层 contract。
- [spine.session-state-model](../../spine/session-state-model.md)：跨层会话状态总览。
