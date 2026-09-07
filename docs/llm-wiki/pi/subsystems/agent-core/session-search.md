---
id: subsys.agent-core.session-search
title: 会话搜索接口(SessionSearchService)与退役实现
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/search/index.ts
  - packages/agent/src/index.ts
  - packages/agent/test/harness/types.test.ts
  - packages/agent/src/harness/session/types.ts
  - packages/session-backends/sqlite-node/src/sqlite/index.ts
  - packages/session-backends/sqlite-node/src/index.ts
symbols:
  - SessionSearchService
  - SearchQuery
  - SessionSearchHit
  - EntrySearchHit
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.jsonl-storage
  - subsys.agent-core.memory-storage
evidence: explicit
status: verified
updated: 9767ba275f
---

> `subsys.agent-core.session-search` 保留节点 id，改写成**接口 + 退役实现**：`pi-agent-core` 仍导出 `SessionSearchService` 类型，但 scanning 实现、`docs/search.md`、JSONL/memory search adapter 与 sqlite-node FTS backend 都已删除。

## 能回答的问题

- `SessionSearchService` 还在 `pi-agent-core` 里吗，签名是什么？
- `createScanningSessionSearch` / `scanning.ts` 还存在吗？
- 共享契约是否包含 cwd 过滤、score、snippet、AsyncIterable？
- JSONL / memory / SQLite 现在有没有可调用的 search 实现？
- 旧的 `SessionSearch.search(text)` scanning 面去哪了？

## 退役范围

下列路径在 target SHA **不存在**，禁止再当 `[E]` 引用：

- `packages/agent/src/search/scanning.ts`
- `packages/agent/docs/search.md`
- `packages/agent/test/harness/session/search.test.ts`
- `packages/session-backends/sqlite-node/src/sqlite/search-backend.ts`
- 更早的 `packages/agent/src/harness/session/search.ts`

`packages/agent/src/search/` 现在只剩 `index.ts`。[E: packages/agent/src/search/index.ts:3] `packages/agent/src/index.ts` 仍 `export *` 整个 search 模块。[E: packages/agent/src/index.ts:150]

sqlite-node 的 public barrel 只再导出 repo / sql / storage / capability types，没有 `createSqliteSessionSearch`。[E: packages/session-backends/sqlite-node/src/sqlite/index.ts:1] [E: packages/session-backends/sqlite-node/src/index.ts:123]

## 仍存在的接口

`SessionSearchService` 是类型契约，不是可 new 的 class，也没有包内 factory。[E: packages/agent/src/search/index.ts:3]

| 成员 | 签名 | 含义 |
| --- | --- | --- |
| `searchSessions` | `(query: SearchQuery) => Promise<SessionSearchHit[]>` | 按文本搜会话，返回数组，不是 `AsyncIterable`。[E: packages/agent/src/search/index.ts:21] |
| `searchEntries` | 可选 `(query: SearchQuery) => Promise<EntrySearchHit[]>` | 按文本搜 entry；实现可以不提供。[E: packages/agent/src/search/index.ts:22] |
| `sync` | `() => Promise<void>` | 设计上的全量/增量同步钩子；本包无实现。[E: packages/agent/src/search/index.ts:6] |
| `notify` | `(sessionId: string) => void` | 设计上的脏标记；本包无实现。[E: packages/agent/src/search/index.ts:24] |
| `remove` | `(sessionId: string) => Promise<void>` | 设计上随 `repo.delete` 清索引；本包无实现。[E: packages/agent/src/search/index.ts:7] |
| `close` | `() => Promise<void>` | 释放服务资源；本包无实现。[E: packages/agent/src/search/index.ts:26] |

`SearchQuery` 只有 `text` 与可选 `limit`。没有 `entryTypes`、`signal`、`cwd`。[E: packages/agent/src/search/index.ts:1] [E: packages/agent/src/search/index.ts:2]

`SessionSearchHit` 保证 `sessionId`，可选 `score` 与 `top: { entryId, snippet?, timestamp }`。[E: packages/agent/src/search/index.ts:6] `EntrySearchHit` 保证 `sessionId` / `entryId` / `timestamp`，可选 `snippet` / `score`。[E: packages/agent/src/search/index.ts:1]

公开类型测试锁定 `searchSessions` 与 `notify` 的签名。[E: packages/agent/test/harness/types.test.ts:384] [E: packages/agent/test/harness/types.test.ts:387]

旧 scanning 形状（`SessionSearch.search(text, options?) => AsyncIterable`、`createScanningSessionSearch`、`ScanningReadable`、默认 `JSON.stringify(entry)` 匹配）已不在源码里。不要把退役前的行为写成当前事实。[I]

## 实现状态

`pi-agent-core` 不提供任何 `SessionSearchService` 实现：没有 scanning helper，没有 no-op sink，没有 Elastic/FTS adapter。[E: packages/agent/src/search/index.ts:20] [I]

`@earendil-works/pi-session-backend-sqlite-node` 也不再导出 search façade。该包 README 写明 search 是独立 S3 投影；本 wiki 不以 README 为 `[E]`，只以源码缺失为准。[E: packages/session-backends/sqlite-node/src/sqlite/index.ts:1] [I]

应用若要搜索，必须自建索引并自行实现 `SessionSearchService`。JSONL `list` / 只读 `open`、memory `list` 仍可用作抓取源，但那是 `SessionRepo` 的读面，不是 search 模块。[E: packages/agent/src/harness/session/types.ts:598] [I]

`packages/agent/docs/harness.md` 仍有一份与当前 `SessionSearchService` 不完全一致的 S3 设计稿。那是内部设计文档，不是 shipped 实现，本节点不以它为 ground truth。[U]

## 设计动机与权衡

接口留在 `pi-agent-core`，是为了让将来的独立 search store 与 `SessionRepo` 解耦：repository 不暴露 `search()`。[E: packages/agent/src/search/index.ts:20] [E: packages/agent/src/harness/session/types.ts:591] [I]

实现抽空避免再维护一套全量扫描与同库 FTS 触发器。代价是 0.85.1 的 agent-core / sqlite-node **没有**可调用的会话搜索。[I]

## Gotcha

- 节点 id 没变，但 `SessionSearch` / `createScanningSessionSearch` / `SqliteSessionSearchHit` 这些符号已经不存在。按旧符号 grep 源码会落空。[E: packages/agent/src/search/index.ts:20]
- `searchSessions` 返回 `Promise<数组>`，不是边搜边 yield 的 `AsyncIterable`。[E: packages/agent/src/search/index.ts:21]
- `limit` 在类型上看是 query 字段；没有实现，也就没有“limit 计 session 还是 entry”的运行时语义。[E: packages/agent/src/search/index.ts:2] [I]
- coding-agent 的 session selector 本地模糊匹配不是这份 `SessionSearchService` API。[I]

## 跨包边界

本节点属于 `pi-agent-core` 的类型面。JSONL / memory 只是普通 `SessionRepo`；SQLite 实现见 [subsys.session-backends.sqlite-node](../session-backends/sqlite-node.md)，同样没有 search 方法。

## Sources

- packages/agent/src/search/index.ts
- packages/agent/src/index.ts
- packages/agent/test/harness/types.test.ts
- packages/agent/src/harness/session/types.ts
- packages/session-backends/sqlite-node/src/sqlite/index.ts
- packages/session-backends/sqlite-node/src/index.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：`Session` / `Storage` / `SessionRepo` 合同；search 不再复用 scanning 只读面。
- [subsys.agent-core.jsonl-storage](jsonl-storage.md)：JSONL list/open 仍在，但没有 search adapter。
- [subsys.agent-core.memory-storage](memory-storage.md)：进程内 repo 同样没有 search。
