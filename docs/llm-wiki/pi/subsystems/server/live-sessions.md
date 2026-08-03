---
id: subsys.server.live-sessions
title: Live session runtime 管理
kind: subsystem
tier: T2
pkg: server
source:
  - packages/server/src/types.ts
  - packages/server/src/sessions.ts
  - packages/server/src/snapshots.ts
  - packages/server/src/errors.ts
  - packages/server/test/sessions.test.ts
symbols:
  - PiSessionBackend
  - PiSessionRuntime
  - PiSessionRuntimeEvent
  - LiveSessionManager
related:
  - subsys.server.session-server
  - subsys.client.session-leases
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: a8ee03b815
---

> `LiveSessionManager` 把 durable `PiSessionBackend` 与 protocol connection attachments 组合为 singleton live runtime：backend 负责 list/create/open，runtime 负责 snapshot、phase、mutation、events 与 dispose。[E: packages/server/src/types.ts:43][E: packages/server/src/types.ts:43][E: packages/server/src/types.ts:44][E: packages/server/src/types.ts:45][E: packages/server/src/types.ts:46][E: packages/server/src/types.ts:51][E: packages/server/src/types.ts:52][E: packages/server/src/types.ts:56][E: packages/server/src/types.ts:56][E: packages/server/src/types.ts:57][E: packages/server/src/types.ts:59][E: packages/server/src/types.ts:60]

## 能回答的问题

- server-assigned session id 如何传给 backend？
- 一个 durable session 是否会为每个 client 打开独立 runtime？
- 多 connection attachment 如何影响 `attached`/`locked`？
- prompt、steer、abort 为什么可以并发到达但 backend 不应排队 conflict？
- detached busy runtime 何时 dispose？
- progress、snapshot、runtime error 分别广播什么？

## Backend/runtime contract

`createSession()` 接收 server 生成的 collision-resistant id，backend 必须持久化 exact id；`openSession()` 返回 exclusively acquired durable runtime。[E: packages/server/src/types.ts:28][E: packages/server/src/types.ts:30][E: packages/server/src/types.ts:30][E: packages/server/src/types.ts:56][E: packages/server/src/types.ts:59][E: packages/server/src/types.ts:60]

runtime mutation contract 明确要求 conflicting operations reject rather than queue；phase vocabulary 直接复用 protocol `SessionPhase`。[E: packages/server/src/types.ts:43][E: packages/server/src/types.ts:45][E: packages/server/src/types.ts:46][E: packages/server/src/types.ts:47][E: packages/server/src/types.ts:48][E: packages/server/src/types.ts:49][E: packages/server/src/types.ts:50]

runtime event 有 `snapshot`、`progress`、`error` 三类；error 必须是安全跨 protocol boundary 的 `PiServerError`。[E: packages/server/src/types.ts:37][E: packages/server/src/types.ts:38][E: packages/server/src/types.ts:39][E: packages/server/src/types.ts:40]

## Command dispatch

`executeCommand()` 对 9 个 protocol command 做 exhaustive switch。create 使用 `randomUUID()` 生成 id并 acquire backend runtime；attach lazy-open persisted runtime；prompt/steer/abort/model/thinking mutation 都要求 requesting connection 已 attach。[E: packages/server/src/sessions.ts:52][E: packages/server/src/sessions.ts:53][E: packages/server/src/sessions.ts:57][E: packages/server/src/sessions.ts:58][E: packages/server/src/sessions.ts:65][E: packages/server/src/sessions.ts:71][E: packages/server/src/sessions.ts:72][E: packages/server/src/sessions.ts:95][E: packages/server/src/sessions.ts:103][E: packages/server/src/sessions.ts:108][E: packages/server/src/sessions.ts:113][E: packages/server/src/sessions.ts:118]

`acquire()` 对同 id 的 concurrent opens 用 `openingSessions` deduplicate；已有 live runtime 被所有 attachments 共享，而不是每 connection 重新 open。[E: packages/server/src/sessions.ts:43][E: packages/server/src/sessions.ts:45][E: packages/server/src/sessions.ts:46][E: packages/server/src/sessions.ts:193][E: packages/server/src/sessions.ts:195][E: packages/server/src/sessions.ts:202][E: packages/server/src/sessions.ts:204][E: packages/server/src/sessions.ts:205][E: packages/server/src/sessions.ts:206][E: packages/server/src/sessions.ts:207]

backend 返回 runtime 后，manager 先读取 snapshot 并验证 snapshot id 等于 server-assigned id；不匹配会 dispose runtime 并返回 `invalid_request`。[E: packages/server/src/sessions.ts:216][E: packages/server/src/sessions.ts:217][E: packages/server/src/sessions.ts:224][E: packages/server/src/sessions.ts:225][E: packages/server/src/sessions.ts:226][E: packages/server/src/sessions.ts:228][E: packages/server/src/sessions.ts:244][E: packages/server/src/sessions.ts:247][E: packages/server/src/sessions.ts:251]

## Attachment 与 snapshot 视角

attach 同时写入 `connection.sessionIds` 与 `live.connections`；同一 live runtime 可以有多个 connections。[E: packages/server/src/sessions.ts:307][E: packages/server/src/sessions.ts:308][E: packages/server/src/sessions.ts:312][E: packages/server/src/sessions.ts:313] `requireAttached()` 拒绝未 attach connection，即使目标 runtime 已被其它 connection 打开。[E: packages/server/src/sessions.ts:316][E: packages/server/src/sessions.ts:317][E: packages/server/src/sessions.ts:318][E: packages/server/src/sessions.ts:320][E: packages/server/src/sessions.ts:322]

normalized live snapshot 强制 phase 来自 runtime getter、`locked: true`，全局 attached 由 live connection count 得出；response 再把 attached 改成相对 requesting connection 的值。[E: packages/server/src/sessions.ts:283][E: packages/server/src/sessions.ts:284][E: packages/server/src/sessions.ts:288][E: packages/server/src/sessions.ts:290][E: packages/server/src/sessions.ts:291][E: packages/server/src/sessions.ts:292][E: packages/server/src/sessions.ts:296][E: packages/server/src/sessions.ts:297]

server-wide list 先读 persisted summaries，再覆盖 live snapshots；`attached` 对每个 requesting connection 单独计算，persisted-only session 固定 false。[E: packages/server/src/sessions.ts:139][E: packages/server/src/sessions.ts:140][E: packages/server/src/sessions.ts:141][E: packages/server/src/sessions.ts:147][E: packages/server/src/sessions.ts:149][E: packages/server/src/sessions.ts:151][E: packages/server/src/sessions.ts:153][E: packages/server/src/sessions.ts:154]

## Events 与 disposal

runtime progress 只发给 attached connections；snapshot signal 触发 full `session_snapshot` broadcast。runtime error 标记 terminal，报告 server error，关闭并 disconnect 所有 attached connections，然后 dispose。[E: packages/server/src/sessions.ts:255][E: packages/server/src/sessions.ts:256][E: packages/server/src/sessions.ts:260][E: packages/server/src/sessions.ts:263][E: packages/server/src/sessions.ts:265][E: packages/server/src/sessions.ts:267][E: packages/server/src/sessions.ts:272][E: packages/server/src/sessions.ts:274][E: packages/server/src/sessions.ts:275][E: packages/server/src/sessions.ts:278][E: packages/server/src/sessions.ts:279][E: packages/server/src/sessions.ts:280]

runtime 只有在没有 connections、没有 active operation，且 terminal 或 phase=`idle` 时才 dispose；因此 client disconnect 后仍在运行的 prompt 被保留，下一次回到 idle 才释放 backend lock。[E: packages/server/src/sessions.ts:331][E: packages/server/src/sessions.ts:336][E: packages/server/src/sessions.ts:337][E: packages/server/src/sessions.ts:338][E: packages/server/src/sessions.ts:342][E: packages/server/src/sessions.ts:345][E: packages/server/src/sessions.ts:347][E: packages/server/test/sessions.test.ts:313]

## Gotcha

- client-side exclusive lease 不是 server-wide mutex；源码和 tests 都允许每个 attached client control 同一个 singleton runtime，conflict 由 runtime phase/error policy 拒绝。[E: packages/server/test/sessions.test.ts:223][E: packages/server/src/types.ts:43][I]
- operation count 只保护 runtime disposal，不串行化 commands；prompt 未完成时 steer/abort 可以被并发 dispatch。[E: packages/server/src/sessions.ts:178][E: packages/server/src/sessions.ts:183][E: packages/server/src/sessions.ts:185][E: packages/server/src/sessions.ts:188][E: packages/server/test/sessions.test.ts:260][I]
- protocol 定义 `session_removed`，但 `LiveSessionManager` 没有 delete/remove command 或该 event producer。[I]

## Sources

- packages/server/src/types.ts
- packages/server/src/sessions.ts
- packages/server/src/snapshots.ts
- packages/server/src/errors.ts
- packages/server/test/sessions.test.ts

## 相关

- [subsys.server.session-server](session-server.md) - handshake、request envelope 与 connection lifecycle。
- [subsys.client.session-leases](../client/session-leases.md) - client 端 local attachment ownership。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - session snapshot、phase 与 progress schemas。
