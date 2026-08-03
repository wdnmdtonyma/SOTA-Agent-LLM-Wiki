---
id: subsys.agent-core.session-search
title: 会话搜索(SessionSearch)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/types.ts
  - packages/agent/src/harness/session/search.ts
  - packages/agent/src/index.ts
symbols:
  - SessionSearch
  - SessionSearchOptions
  - SessionSearchHit
  - createScanningSessionSearch
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.jsonl-storage
  - subsys.agent-core.memory-storage
evidence: explicit
status: verified
updated: a8ee03b815
---

> `subsys.agent-core.session-search` 描述独立于 repository CRUD 的查询接口，以及无需维护倒排索引、直接扫描 canonical sessions 的默认实现。

## 能回答的问题

- `SessionSearch` 为什么不是 `SessionRepository` 的方法？
- text 与 cwd 如何匹配？
- 默认扫描器搜索哪些 entry 字段，返回什么 hit？
- 结果顺序、复杂度与索引一致性有什么权衡？

## 职责边界

`SessionSearch<TMetadata>` 只有 `search(options)`，返回 `SessionSearchHit<TMetadata>[]`；repository 仍只负责 create/open/list/delete/fork，因此查询能力可以独立替换。[E: packages/agent/src/harness/types.ts:519] [E: packages/agent/src/harness/types.ts:520] [I]

公开 factory `createScanningSessionSearch()` 只要求 source 实现 repository 的 `list` 与 `open`，不依赖 create/delete/fork。[E: packages/agent/src/harness/session/search.ts:42] [E: packages/agent/src/harness/session/search.ts:46] 该 factory 由 `pi-agent-core` 根入口重新导出。[E: packages/agent/src/index.ts:44]

## 数据模型

`SessionSearchOptions` 的必填 `text` 是搜索串，可选 `cwd` 是精确结构化过滤条件。[E: packages/agent/src/harness/types.ts:505] [E: packages/agent/src/harness/types.ts:506] [E: packages/agent/src/harness/types.ts:507]

每个 hit 包含 session metadata、entry id、timestamp，并可带 snippet 与 score；当前扫描实现会提供 snippet，但不设置 score。[E: packages/agent/src/harness/types.ts:510] [E: packages/agent/src/harness/types.ts:511] [E: packages/agent/src/harness/types.ts:515] [E: packages/agent/src/harness/session/search.ts:35]

## 扫描控制流

1. `search()` 对 text 做 `trim().toLowerCase()`；归一化后为空则直接返回空数组。[E: packages/agent/src/harness/session/search.ts:24] [E: packages/agent/src/harness/session/search.ts:25] [E: packages/agent/src/harness/session/search.ts:26]
2. 每次查询重新调用 source.list()，然后按 list 顺序逐个处理 metadata。[E: packages/agent/src/harness/session/search.ts:28]
3. 传入 cwd 时，扫描器读取 metadata 上的 cwd 并做严格相等比较；generic metadata 没有 cwd 时也不会命中过滤。[E: packages/agent/src/harness/session/search.ts:29] [E: packages/agent/src/harness/session/search.ts:30]
4. 对每个候选 session 调用 open()，再以 `session.getEntries()` 读取 append-order entries。[E: packages/agent/src/harness/session/search.ts:31] [E: packages/agent/src/harness/session/search.ts:32]
5. 每条 entry 先 `JSON.stringify()`，再以小写后的完整 JSON 做 substring match；命中时把完整 JSON 作为 snippet。[E: packages/agent/src/harness/session/search.ts:33] [E: packages/agent/src/harness/session/search.ts:34] [E: packages/agent/src/harness/session/search.ts:35]
6. 扫描结束直接返回 hits，没有额外排序、去重或打分阶段。[E: packages/agent/src/harness/session/search.ts:38]

## 语义与权衡

匹配对象是完整 serialized entry，因此 message 内容、custom data、entry type、id、timestamp 等任何 JSON 字段都可能命中；它不是仅面向自然语言正文的全文搜索。[E: packages/agent/src/harness/session/search.ts:33] [E: packages/agent/src/harness/session/search.ts:34] [I]

扫描器只保存 source，并在每次查询中直接 list/open/read canonical sessions，因此没有二级索引状态需要增量维护；代价是每次查询都遍历全部候选 session 与 entries。[E: packages/agent/src/harness/session/search.ts:18] [E: packages/agent/src/harness/session/search.ts:28] [E: packages/agent/src/harness/session/search.ts:31] [E: packages/agent/src/harness/session/search.ts:32] [I]

## Gotcha

- text 匹配大小写不敏感，但 cwd 比较大小写敏感且不做路径归一化。[E: packages/agent/src/harness/session/search.ts:25] [E: packages/agent/src/harness/session/search.ts:30]
- 一个 session 中每个匹配 entry 都产生一条 hit；实现不会把同一 session 聚合为单条结果。[E: packages/agent/src/harness/session/search.ts:32] [E: packages/agent/src/harness/session/search.ts:35]
- 结果顺序继承 repository.list() 顺序与 session append order，`score` 为空，调用方不能把它当相关度排序。[E: packages/agent/src/harness/session/search.ts:28] [E: packages/agent/src/harness/session/search.ts:32] [E: packages/agent/src/harness/session/search.ts:38]

## 跨包边界

本节点属于 `pi-agent-core` 的可复用 harness。JSONL 与 memory repository 都可作为扫描 source；搜索层只依赖统一 list/open/Session API，不知道 backend 的文件或 map 结构。[E: packages/agent/src/harness/session/search.ts:46] [I]

## Sources

- packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/search.ts
- packages/agent/src/index.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：repository/storage/Session contract。
- [subsys.agent-core.jsonl-storage](jsonl-storage.md)：durable JSONL source。
- [subsys.agent-core.memory-storage](memory-storage.md)：进程内 source。
