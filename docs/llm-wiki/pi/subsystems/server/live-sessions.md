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
  - PiServerService
  - PiSessionRuntime
  - PiSessionRuntimeEvent
  - LiveSessionManager
related:
  - subsys.server.session-server
  - subsys.client.session-leases
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: 086c32e745
---

> `LiveSessionManager` 把 durable `PiServerService` 与 protocol connection attachments 组合为 singleton live runtime：service 负责 `listSessions`/`createSession`/`openSession`，runtime 负责 snapshot、phase、mutation、events 与 dispose。[E: packages/server/src/types.ts:42][E: packages/server/src/types.ts:55][E: packages/server/src/types.ts:56][E: packages/server/src/types.ts:58][E: packages/server/src/types.ts:59]

## 能回答的问题

- server-assigned session id 如何传给 service？
- 一个 durable session 是否会为每个 client 打开独立 runtime？
- 多 connection attachment 如何影响 `attached`/`locked`？
- prompt、steer、abort 为什么可以并发到达但 service 不应排队 conflict？
- detached busy runtime 何时 dispose？
- progress、snapshot、runtime error 分别广播什么？
- `listSessions()` 返回的是 `SessionMetadata` 还是 live snapshot？

## Service/runtime contract

`PiServerService.createSession()` 接收 server 生成的 collision-resistant id，service 必须持久化 exact id；`openSession()` 返回 exclusively acquired durable runtime；`listSessions()` 返回 `SessionMetadata[]`。[E: packages/server/src/types.ts:27][E: packages/server/src/types.ts:27][E: packages/server/src/types.ts:55][E: packages/server/src/types.ts:56][E: packages/server/src/types.ts:58][E: packages/server/src/types.ts:59]

runtime mutation contract 明确要求 conflicting operations reject rather than queue；phase vocabulary 直接复用 protocol `SessionPhase`。[E: packages/server/src/types.ts:42][E: packages/server/src/types.ts:44][E: packages/server/src/types.ts:45][E: packages/server/src/types.ts:46][E: packages/server/src/types.ts:47][E: packages/server/src/types.ts:48][E: packages/server/src/types.ts:49]

runtime event 有 `snapshot`、`progress`、`error` 三类；error 必须是安全跨 protocol boundary 的 `PiServerError`。[E: packages/server/src/types.ts:36][E: packages/server/src/types.ts:37][E: packages/server/src/types.ts:38][E: packages/server/src/types.ts:39]

## Command dispatch

`executeCommand()` 对 9 个 protocol command 做 exhaustive switch。create 使用 `randomUUID()` 生成 id 并 `service.createSession()`；attach lazy-open persisted runtime；prompt/steer/abort/model/thinking mutation 都要求 requesting connection 已 attach。[E: packages/server/src/sessions.ts:47][E: packages/server/src/sessions.ts:52][E: packages/server/src/sessions.ts:60][E: packages/server/src/sessions.ts:67][E: packages/server/src/sessions.ts:90][E: packages/server/src/sessions.ts:98][E: packages/server/src/sessions.ts:103][E: packages/server/src/sessions.ts:108][E: packages/server/src/sessions.ts:113]

`acquire()` 对同 id 的 concurrent opens 用 `openingSessions` deduplicate；已有 live runtime 被所有 attachments 共享，而不是每 connection 重新 open。[E: packages/server/src/sessions.ts:38][E: packages/server/src/sessions.ts:40][E: packages/server/src/sessions.ts:41][E: packages/server/src/sessions.ts:186][E: packages/server/src/sessions.ts:188][E: packages/server/src/sessions.ts:195][E: packages/server/src/sessions.ts:197][E: packages/server/src/sessions.ts:198][E: packages/server/src/sessions.ts:199][E: packages/server/src/sessions.ts:200]

service 返回 runtime 后，manager 先读取 snapshot 并验证 snapshot id 等于 server-assigned id；不匹配会 dispose runtime 并返回 `invalid_request`(`Service returned session ...`)。[E: packages/server/src/sessions.ts:210][E: packages/server/src/sessions.ts:217][E: packages/server/src/sessions.ts:221]

## Attachment 与 snapshot 视角

attach 同时写入 `connection.sessionIds` 与 `live.connections`；同一 live runtime 可以有多个 connections。[E: packages/server/src/sessions.ts:300][E: packages/server/src/sessions.ts:301][E: packages/server/src/sessions.ts:305][E: packages/server/src/sessions.ts:306] `requireAttached()` 拒绝未 attach connection，即使目标 runtime 已被其它 connection 打开。[E: packages/server/src/sessions.ts:309][E: packages/server/src/sessions.ts:310][E: packages/server/src/sessions.ts:311][E: packages/server/src/sessions.ts:313][E: packages/server/src/sessions.ts:315]

normalized live snapshot 强制 phase 来自 runtime getter、`locked: true`，全局 attached 由 live connection count 得出；response 再把 attached 改成相对 requesting connection 的值。[E: packages/server/src/sessions.ts:276][E: packages/server/src/sessions.ts:277][E: packages/server/src/sessions.ts:281][E: packages/server/src/sessions.ts:283][E: packages/server/src/sessions.ts:284][E: packages/server/src/sessions.ts:285][E: packages/server/src/sessions.ts:289][E: packages/server/src/sessions.ts:290]

server-wide list 先读 `service.listSessions()` 的 `SessionMetadata[]`,再用 live snapshot 的 durable 字段覆盖同 id 项;`toMetadata()` 只保留 `id`/`createdAt`/`updatedAt`/`sessionName`/`cwd`,不把 phase/model/lock 写进 list。[E: packages/server/src/sessions.ts:28][E: packages/server/src/sessions.ts:134][E: packages/server/src/sessions.ts:135][E: packages/server/src/sessions.ts:142][E: packages/server/src/sessions.ts:146][E: packages/server/src/sessions.ts:148]

## Events 与 disposal

runtime progress 只发给 attached connections；snapshot signal 触发 full `session_snapshot` broadcast。runtime error 标记 terminal，报告 server error，关闭并 disconnect 所有 attached connections，然后 dispose。[E: packages/server/src/sessions.ts:248][E: packages/server/src/sessions.ts:249][E: packages/server/src/sessions.ts:253][E: packages/server/src/sessions.ts:256][E: packages/server/src/sessions.ts:258][E: packages/server/src/sessions.ts:260][E: packages/server/src/sessions.ts:265][E: packages/server/src/sessions.ts:267][E: packages/server/src/sessions.ts:268][E: packages/server/src/sessions.ts:271][E: packages/server/src/sessions.ts:272][E: packages/server/src/sessions.ts:273]

runtime 只有在没有 connections、没有 active operation，且 terminal 或 phase=`idle` 时才 dispose；因此 client disconnect 后仍在运行的 prompt 被保留，下一次回到 idle 才释放 service lock。[E: packages/server/src/sessions.ts:324][E: packages/server/src/sessions.ts:329][E: packages/server/src/sessions.ts:330][E: packages/server/src/sessions.ts:331][E: packages/server/src/sessions.ts:335][E: packages/server/src/sessions.ts:338][E: packages/server/src/sessions.ts:340]

## Gotcha

- client-side exclusive lease 不是 server-wide mutex；源码和 tests 都允许每个 attached client control 同一个 singleton runtime，conflict 由 runtime phase/error policy 拒绝。[E: packages/server/test/sessions.test.ts:257][E: packages/server/src/types.ts:42][I]
- operation count 只保护 runtime disposal，不串行化 commands；prompt 未完成时 steer/abort 可以被并发 dispatch。[E: packages/server/src/sessions.ts:171][E: packages/server/src/sessions.ts:176][E: packages/server/src/sessions.ts:178][E: packages/server/src/sessions.ts:181][E: packages/server/test/sessions.test.ts:300][I]
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
