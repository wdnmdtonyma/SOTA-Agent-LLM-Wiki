---
id: subsys.agent-core.memory-storage
title: 内存会话仓库与存储
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/memory-repo.ts
  - packages/agent/src/harness/session/array-session-index.ts
  - packages/agent/src/harness/session/keyed-operation-queue.ts
  - packages/agent/src/harness/session/session.ts
symbols:
  - InMemorySessionRepository
  - InMemorySessionBackend
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.tree-navigation
evidence: explicit
status: verified
updated: a8ee03b815
---

> `subsys.agent-core.memory-storage` 描述进程内实现：公开的 `InMemorySessionRepository` 返回统一 `Session` API，内部 backend 用 session map、`ArraySessionIndex` 和 keyed queue 保存状态。

## 能回答的问题

- 内存 backend 保存什么状态，哪些 projection 与 JSONL 共用？
- create/open/list/delete/fork 如何串行化？
- storage facade 如何读取与 append entry？
- disposal 后的 repository 如何表现？

## 职责边界

`InMemorySessionRepository` 实现通用 `SessionRepository`，私有拥有一个 `InMemorySessionBackend`；`create/open/fork` 都通过 `createSession()` 返回 `Session<SessionMetadata>`。[E: packages/agent/src/harness/session/memory-repo.ts:132] [E: packages/agent/src/harness/session/memory-repo.ts:135] [E: packages/agent/src/harness/session/memory-repo.ts:142] [E: packages/agent/src/harness/session/memory-repo.ts:146] [E: packages/agent/src/harness/session/memory-repo.ts:158]

backend 中每个 session state 由 metadata 与一个 `ArraySessionIndex` 组成，所有 session 存在进程内 `Map<string, InMemorySessionState>`；没有文件系统或外部持久化。[E: packages/agent/src/harness/session/memory-repo.ts:22] [E: packages/agent/src/harness/session/memory-repo.ts:24] [E: packages/agent/src/harness/session/memory-repo.ts:27] [E: packages/agent/src/harness/session/memory-repo.ts:28]

## Repository 控制流

1. create 采用指定 id 或生成 UUIDv7，创建 metadata 与空 `ArraySessionIndex`，再写入 sessions map。[E: packages/agent/src/harness/session/memory-repo.ts:33] [E: packages/agent/src/harness/session/memory-repo.ts:35] [E: packages/agent/src/harness/session/memory-repo.ts:37] [E: packages/agent/src/harness/session/memory-repo.ts:41]
2. open 以 metadata.id 定位现有 state，并返回绑定该 state 的 storage facade；不存在时 `getState()` 抛 `not_found`。[E: packages/agent/src/harness/session/memory-repo.ts:46] [E: packages/agent/src/harness/session/memory-repo.ts:48] [E: packages/agent/src/harness/session/memory-repo.ts:121] [E: packages/agent/src/harness/session/memory-repo.ts:123]
3. list 用 queue barrier 等待既有 keyed 操作后，投影所有 metadata；delete 则在该 session id 的 key 上执行。[E: packages/agent/src/harness/session/memory-repo.ts:51] [E: packages/agent/src/harness/session/memory-repo.ts:53] [E: packages/agent/src/harness/session/memory-repo.ts:56] [E: packages/agent/src/harness/session/memory-repo.ts:58]
4. fork 在 source id 的 key 上读取 selection 对应 entries，再在目标 id key 上构造新的 `ArraySessionIndex` 与 metadata。[E: packages/agent/src/harness/session/memory-repo.ts:63] [E: packages/agent/src/harness/session/memory-repo.ts:70] [E: packages/agent/src/harness/session/memory-repo.ts:74] [E: packages/agent/src/harness/session/memory-repo.ts:76]

## Storage facade 与索引

backend 为每个 state 创建 `SessionStorage` facade。所有 read 都重新按 metadata.id 取得当前 state，并在同一 keyed queue 中访问共享 index；append 也在该 key 上调用 `ArraySessionIndex.append()`。[E: packages/agent/src/harness/session/memory-repo.ts:91] [E: packages/agent/src/harness/session/memory-repo.ts:94] [E: packages/agent/src/harness/session/memory-repo.ts:96] [E: packages/agent/src/harness/session/memory-repo.ts:101] [E: packages/agent/src/harness/session/memory-repo.ts:110] [E: packages/agent/src/harness/session/memory-repo.ts:113]

`ArraySessionIndex` 维护 append-order array、id map、leaf 与派生 projection。普通 entry 把 leaf 指向自己，`leaf` entry 则把 active leaf 指向 targetId；重复 id 会被拒绝。[E: packages/agent/src/harness/session/array-session-index.ts:58] [E: packages/agent/src/harness/session/array-session-index.ts:60] [E: packages/agent/src/harness/session/array-session-index.ts:72] [E: packages/agent/src/harness/session/array-session-index.ts:74] [E: packages/agent/src/harness/session/array-session-index.ts:78]

name、label 与 token/cost stats 不是独立可变字段，而是 append/replace 时从 entries 更新的 projection。[E: packages/agent/src/harness/session/array-session-index.ts:24] [E: packages/agent/src/harness/session/array-session-index.ts:25] [E: packages/agent/src/harness/session/array-session-index.ts:32] [E: packages/agent/src/harness/session/array-session-index.ts:51] [E: packages/agent/src/harness/session/array-session-index.ts:54]

## 并发与生命周期

`KeyedOperationQueue` 使同一 session id 的操作排队，list barrier 则等待所有 session key；内存 backend 没有配置跨 key 的全局并发上限。[E: packages/agent/src/harness/session/memory-repo.ts:29] [E: packages/agent/src/harness/session/keyed-operation-queue.ts:18] [E: packages/agent/src/harness/session/keyed-operation-queue.ts:32] [E: packages/agent/src/harness/session/keyed-operation-queue.ts:55]

async disposal 会永久标记 backend disposed 并 drain 已接收操作；后续 storage/repository 操作会抛 `SessionError("storage", ...)`。[E: packages/agent/src/harness/session/memory-repo.ts:83] [E: packages/agent/src/harness/session/memory-repo.ts:85] [E: packages/agent/src/harness/session/memory-repo.ts:86] [E: packages/agent/src/harness/session/memory-repo.ts:117] [E: packages/agent/src/harness/session/memory-repo.ts:118]

## 设计动机与权衡

内存与 JSONL 复用 `ArraySessionIndex`，因此 branch traversal、duplicate-id、leaf 与 projection 语义一致；差别只在 durable 写入与 repository metadata。[E: packages/agent/src/harness/session/memory-repo.ts:9] [E: packages/agent/src/harness/session/memory-repo.ts:24] [I]

## Gotcha

- 这是易失的 repository：进程或 repository 实例结束后没有可重建介质，不能用它验证 reopen-from-disk 行为。[E: packages/agent/src/harness/session/memory-repo.ts:28] [I]
- storage facade 每次读都按 id 查询 map；delete 后，既有 `Session` handle 的后续读取也会得到 `not_found`。[E: packages/agent/src/harness/session/memory-repo.ts:94] [E: packages/agent/src/harness/session/memory-repo.ts:121] [E: packages/agent/src/harness/session/memory-repo.ts:123]
- `Session` 自己缓存 leaf 并串行 append；backend queue 只保证 persistence 操作按 session id 排队。[E: packages/agent/src/harness/session/session.ts:155] [E: packages/agent/src/harness/session/session.ts:237] [E: packages/agent/src/harness/session/memory-repo.ts:112]

## 跨包边界

本节点属于 `pi-agent-core` 的通用 harness，适合测试或无需 durable persistence 的宿主；`pi-coding-agent` 的产品 session manager 不由该 repository 替代。[I]

## Sources

- packages/agent/src/harness/session/memory-repo.ts
- packages/agent/src/harness/session/array-session-index.ts
- packages/agent/src/harness/session/keyed-operation-queue.ts
- packages/agent/src/harness/session/session.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：repository/storage/Session 三层 contract。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：branch path、leaf 移动与 context projection。
