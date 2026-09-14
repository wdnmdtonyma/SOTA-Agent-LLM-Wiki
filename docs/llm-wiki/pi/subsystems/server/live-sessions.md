---
id: subsys.server.live-sessions
title: SessionRouter 与 presentation attachment
kind: subsystem
tier: T2
pkg: server
source:
  - packages/server/src/types.ts
  - packages/server/src/session-router.ts
  - packages/server/src/errors.ts
  - packages/server/src/testing/host.ts
  - packages/server/test/conformance.test.ts
symbols:
  - SessionRouter
  - ServerHost
  - RoutedSessionHandle
  - RoutedSessionAttachment
  - RoutedServerPresentation
related:
  - subsys.server.session-server
  - subsys.client.session-leases
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: 71dca871bc
---

> `SessionRouter` 把应用 `ServerHost` 与 protocol connection 组合成 hosted Session：`resolveSession` / `openSession` 拿到 process-local `RoutedSessionHandle`，每个 connection 再 `attachClient()` 得到 presentation-scoped `RoutedSessionAttachment`。旧 `LiveSessionManager` / `sessions.ts` / `snapshots.ts` 已删除 [E: packages/server/src/types.ts:51] [E: packages/server/src/types.ts:62] [E: packages/server/src/session-router.ts:34]。

## 能回答的问题

- `ServerHost` 与 `RoutedSessionHandle` 各自承担什么？
- 一个 durable session 是否会为每个 client 打开独立 handle？
- 多 connection attachment 如何共存？重复 attach 是否幂等？
- stale `{ sessionId, attachmentId }` 为什么被拒？
- disconnect 后未完成的 service call 何时 release attachment？
- router 还负责任何 snapshot / list / phase 吗？

## Service / runtime contract

`ServerHost.serverServices` 是 host 级 `RoutedServerServiceHost`，不是 per-connection endpoint；每条 connection 的 server endpoint 来自 `serverServices.attachClient(presentation)` [E: packages/server/src/types.ts:46] [E: packages/server/src/types.ts:47] [E: packages/server/src/types.ts:60]。`resolveSession(sessionId)` 返回 durable metadata 或抛 bounded routing error，`openSession(metadata)` 返回 `RoutedSessionHandle` [E: packages/server/src/types.ts:62] [E: packages/server/src/types.ts:63]。host 不在 router 里 list sessions；目录投影是应用 Chord service [E: packages/server/README.md:8]。

`RoutedSessionHandle.attachClient()` 返回 `RoutedSessionAttachment`：`invokeService(call, publish, context)` 把 opaque Chord call 转到 Session endpoint，`release()` 释放该 presentation。optional `terminated` Promise 报告意外终止 [E: packages/server/src/types.ts:18] [E: packages/server/src/types.ts:52] [E: packages/server/src/types.ts:54]。`RoutedServerPresentation` 把 `attachSession` / `detachSession` / `prepareSessionRemoval` 交给 router [E: packages/server/src/types.ts:29]。

测试 host `TestServerHost` 用 `MemorySessionRepo` 实现 resolve/open；`createTestServerServices()` 把 `pi.session-management.attach/detach` 转成 presentation 调用 [E: packages/server/src/testing/host.ts:151] [E: packages/server/src/testing/host.ts:119] [E: packages/server/src/testing/host.ts:126]。

## Attachment 生命周期

`attachClient(client, sessionId)` 在 server closing 时拒绝 `ServerDrainingError`，并按 connection 串行化 [E: packages/server/src/session-router.ts:60] [E: packages/server/src/session-router.ts:146]。`attachClientNow`：已 attach 同一 session 则直接 return（幂等）；否则 `acquire()` hosted session，release 旧 attachment，新建 `ClientAttachment`（`id: randomUUID()`），`handle.attachClient()`，再 `publishAttachment({ serverId, sessionId, attachmentId })` [E: packages/server/src/session-router.ts:163] [E: packages/server/src/session-router.ts:168] [E: packages/server/src/session-router.ts:175] [E: packages/server/src/session-router.ts:192]。

`acquire()` 对同 id 的 concurrent open 用 `openingSessions` deduplicate；已有 `HostedSession` 被所有 attachments 共享，而不是每 connection 重新 `openSession` [E: packages/server/src/session-router.ts:262] [E: packages/server/src/session-router.ts:265] [E: packages/server/src/session-router.ts:276]。`open()` 先 `resolveSession` 再 `openSession`；drain 中途若 `handle.close()` 成功则抛 `ServerDrainingError`，`close()` 自己失败才抛 `SessionCleanupError` [E: packages/server/src/session-router.ts:277] [E: packages/server/src/session-router.ts:278] [E: packages/server/src/session-router.ts:279] [E: packages/server/src/session-router.ts:281] [E: packages/server/src/session-router.ts:284] [E: packages/server/src/session-router.ts:289]。若 handle 暴露 `terminated`，resolve 后 `invalidate()` 删 hosted 并 release 剩余 attachments [E: packages/server/src/session-router.ts:293] [E: packages/server/src/session-router.ts:302]。

conformance：同一 connection 重复 attach 同一 session 不增加 `attachedClients`；两个 connection 共享一个 harness 实例且 `attachedClients === 2` [E: packages/server/test/conformance.test.ts:182] [E: packages/server/test/conformance.test.ts:191]。

## Service call 与 stale route

`executeServiceCall` 先 `runForClient` 做 admission，再返回尚未完成的 `invokeService` Promise，因此 attach/detach 与 admission 串行，实际 call 可并发 [E: packages/server/src/session-router.ts:47] [E: packages/server/src/session-router.ts:207] [E: packages/server/test/conformance.test.ts:284]。`requireAttachment()` 在 closing/disconnected 时抛 `ServerDrainingError`；target 必须是 SessionTarget，且 `sessionId`/`attachmentId` 等于该 connection 当前 attachment [E: packages/server/src/session-router.ts:225] [E: packages/server/src/session-router.ts:226] [E: packages/server/src/session-router.ts:228]。

未 attach、attach 了另一 session、或切换后仍用旧 `attachmentId`，wire 上都是 `session_not_attached` [E: packages/server/test/conformance.test.ts:223] [E: packages/server/test/conformance.test.ts:246] [E: packages/server/src/errors.ts:45]。

## Release 与 shutdown

`detachClient` / `removeSession` / `disconnect` / `close` 都走 `releaseAttachment`：等待 `attachment.operations` settle，再 `lease.release()`，最后 `clearAttachment` [E: packages/server/src/session-router.ts:234] [E: packages/server/src/session-router.ts:238] [E: packages/server/src/session-router.ts:254]。disconnect 传 `publish=false`；显式 detach/remove 会 `publishAttachment(undefined)` [E: packages/server/src/session-router.ts:96] [E: packages/server/src/session-router.ts:258]。`removeSession` 先 release 全部 attachments，再 `handle.close()` [E: packages/server/src/session-router.ts:72] [E: packages/server/src/session-router.ts:82]。

server `close()` 等 client operations 与 opening 结束后，release 全部 attachment 并 close 每个 hosted handle [E: packages/server/src/session-router.ts:108] [E: packages/server/src/session-router.ts:129]。router 不生产 `session_snapshot` / `session_progress` / phase/locked 字段。

## Gotcha

- client-side `Client.attachment` 不是 server-wide mutex；源码和 tests 都允许每个 attached presentation 调用同一 hosted handle [E: packages/server/test/conformance.test.ts:182] [I]。
- `runForClient` 只串行化每个 connection 的 attach/detach/admission，不把 Session invoke 排成单队列 [E: packages/server/src/session-router.ts:146] [E: packages/server/test/conformance.test.ts:284]。
- attachment release 失败仍会 `clearAttachment`（`finally`），connection 不再拥有该 route；错误上报给 `reportError` [E: packages/server/src/session-router.ts:248] [E: packages/server/test/conformance.test.ts:202]。
- 不要在本节点寻找 `PiServerService.listSessions` 或 live snapshot merge；那些 API 已随 `sessions.ts` 删除 [I]。

## Sources

- packages/server/src/types.ts
- packages/server/src/session-router.ts
- packages/server/src/errors.ts
- packages/server/src/testing/host.ts
- packages/server/README.md
- packages/server/test/conformance.test.ts

## 相关

- [subsys.server.session-server](session-server.md) - handshake、request envelope 与 connection lifecycle。
- [subsys.client.session-leases](../client/session-leases.md) - client 端 `SessionTarget` 与 `ServiceSubscription`。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - attachment envelope 与 opaque service payloads。
