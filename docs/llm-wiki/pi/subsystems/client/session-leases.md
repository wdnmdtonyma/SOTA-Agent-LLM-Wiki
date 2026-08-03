---
id: subsys.client.session-leases
title: Session lease 与 attachment 生命周期
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/src/client.ts
  - packages/client/src/session-handle.ts
  - packages/client/src/state.ts
  - packages/client/src/errors.ts
  - packages/client/test/sessions.test.ts
symbols:
  - SessionLease
  - PiSessionHandle
  - SessionLeaseMode
  - acquireSession
related:
  - subsys.client.remote-session-client
  - subsys.server.live-sessions
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: c1019d9202
---

> `SessionLease` 是 `PiClient` 的本地 attachment ownership token：shared leases 可并存，exclusive lease 与任意其它本地 lease 互斥；最后一个 lease release 才发送 protocol `detach`。[E: packages/client/src/session-handle.ts:13][E: packages/client/src/session-handle.ts:15][E: packages/client/src/session-handle.ts:19][E: packages/client/src/client.ts:382][E: packages/client/src/client.ts:384][E: packages/client/src/client.ts:387][E: packages/client/src/client.ts:391][E: packages/client/src/client.ts:392]

## 能回答的问题

- `createSession()`、`attachSession()`、`acquireSession()` 分别返回什么 ownership mode？
- shared/exclusive 是否是跨 process 的 server lock？
- `detach()` 与 cleanup-oriented `dispose()` 失败时为何不同？
- disconnect、server removal 与 reacquire 如何 invalidate stale handles？
- 多个 shared handles 何时真正发 protocol detach？

## 公开 handle

`SessionLease` 暴露 id、active/attached、authoritative snapshot、snapshot/event subscription，以及 prompt、steer、abort、setModel、setThinking、detach/dispose；它实现 `AsyncDisposable`。[E: packages/client/src/session-handle.ts:19][E: packages/client/src/session-handle.ts:20][E: packages/client/src/session-handle.ts:21][E: packages/client/src/session-handle.ts:22][E: packages/client/src/session-handle.ts:23][E: packages/client/src/session-handle.ts:24][E: packages/client/src/session-handle.ts:25][E: packages/client/src/session-handle.ts:26][E: packages/client/src/session-handle.ts:27][E: packages/client/src/session-handle.ts:28][E: packages/client/src/session-handle.ts:29][E: packages/client/src/session-handle.ts:30][E: packages/client/src/session-handle.ts:31][E: packages/client/src/session-handle.ts:32]

`SessionHandle` 本身只是 callbacks facade；每个 mutation 组装带 `sessionId` 的 protocol command，并从 result 提取 session snapshot。[E: packages/client/src/session-handle.ts:47][E: packages/client/src/session-handle.ts:51][E: packages/client/src/session-handle.ts:88][E: packages/client/src/session-handle.ts:89][E: packages/client/src/session-handle.ts:92][E: packages/client/src/session-handle.ts:93][E: packages/client/src/session-handle.ts:96][E: packages/client/src/session-handle.ts:100][E: packages/client/src/session-handle.ts:104]

## Acquisition

`createSession()` 在 server create 成功后直接 reserve exclusive lease；`attachSession()` 是 shared acquisition convenience；`acquireSession()` 先 reserve ownership，再等待 in-flight detachment/cleanup reconciliation，必要时只发一次 deduplicated attach request。[E: packages/client/src/client.ts:142][E: packages/client/src/client.ts:144][E: packages/client/src/client.ts:148][E: packages/client/src/client.ts:149][E: packages/client/src/client.ts:152][E: packages/client/src/client.ts:154][E: packages/client/src/client.ts:156][E: packages/client/src/client.ts:158][E: packages/client/src/client.ts:161][E: packages/client/src/client.ts:163][E: packages/client/src/client.ts:164][E: packages/client/src/client.ts:168][E: packages/client/src/client.ts:173]

exclusive/shared 只由当前 `PiClient` 的 maps/counts 实现，不会写入 protocol command；另一个 `PiClient`/connection 仍可 attach 同一 server live runtime。[E: packages/client/src/client.ts:56][E: packages/client/src/client.ts:57][E: packages/client/src/client.ts:382][E: packages/client/src/client.ts:390][I]

## Release state machine

每个 handle 的 local state 是 `active | releasing | released | invalidated`；generation mismatch 会把 active/releasing handle 变为 invalidated。[E: packages/client/src/client.ts:39][E: packages/client/src/client.ts:210][E: packages/client/src/client.ts:211][E: packages/client/src/client.ts:213][E: packages/client/src/client.ts:215][E: packages/client/src/client.ts:217][E: packages/client/src/client.ts:220]

release 开始后 command/subscription 立即通过 `assertActive()` 拒绝；当 lease count 是 1 时发送 detach，大于 1 时只减少本地 count。[E: packages/client/src/client.ts:227][E: packages/client/src/client.ts:229][E: packages/client/src/client.ts:230][E: packages/client/src/client.ts:232][E: packages/client/src/client.ts:237][E: packages/client/src/client.ts:239][E: packages/client/src/client.ts:240][E: packages/client/src/client.ts:241][E: packages/client/src/client.ts:251][E: packages/client/src/client.ts:252]

explicit `detach()` 使用 `relinquishOnFailure=false`：失败会恢复 `active` 以便 retry。cleanup-oriented `dispose()` 使用 `true`：失败仍 relinquish ownership，记录 cleanup-required；下一次 acquisition 先补发 detach reconciliation。[E: packages/client/src/client.ts:255][E: packages/client/src/client.ts:258][E: packages/client/src/client.ts:259][E: packages/client/src/client.ts:260][E: packages/client/src/client.ts:261][E: packages/client/src/client.ts:263][E: packages/client/src/client.ts:264][E: packages/client/src/client.ts:285][E: packages/client/src/client.ts:286][E: packages/client/src/client.ts:364][E: packages/client/src/client.ts:368][E: packages/client/src/client.ts:371]

## Invalidation

`session_removed` event invalidates该 session 的全部 leases；disconnect/dispose invalidate all lease generations。invalidated/released handle 的 dispose 是 no-op，不再发送 protocol cleanup。[E: packages/client/src/client.ts:234][E: packages/client/src/client.ts:295][E: packages/client/src/client.ts:297][E: packages/client/src/client.ts:322][E: packages/client/src/client.ts:325][E: packages/client/src/client.ts:403][E: packages/client/src/client.ts:407][E: packages/client/src/client.ts:410][E: packages/client/src/client.ts:411]

attach 前暂时移除旧 snapshot；attach 失败时恢复，成功 reacquire 可以接受新 runtime 的较低 revision，而不是让旧 snapshot revision guard 阻塞。[E: packages/client/src/client.ts:180][E: packages/client/src/client.ts:181][E: packages/client/src/client.ts:183][E: packages/client/src/client.ts:185][E: packages/client/src/state.ts:49][E: packages/client/src/state.ts:50][E: packages/client/src/state.ts:55][E: packages/client/src/state.ts:56][E: packages/client/test/sessions.test.ts:227]

## Gotcha

- `active` getter 与 `attached` 等价，不表示 server-wide exclusive ownership。[E: packages/client/src/session-handle.ts:56][E: packages/client/src/session-handle.ts:60][E: packages/client/src/session-handle.ts:61]
- handle snapshot 只在 active 且 client state 仍标 attached 时可见；release/invalidation 后返回 `undefined`。[E: packages/client/src/client.ts:223][E: packages/client/src/client.ts:225][E: packages/client/src/client.ts:272]
- server `session_removed` schema 已存在，但当前 composable server 没有 delete command；该 invalidation path 是 forward-compatible consumer behavior。[I]

## Sources

- packages/client/src/client.ts
- packages/client/src/session-handle.ts
- packages/client/src/state.ts
- packages/client/src/errors.ts
- packages/client/test/sessions.test.ts

## 相关

- [subsys.client.remote-session-client](remote-session-client.md) - connection、request 与 authoritative cache。
- [subsys.server.live-sessions](../server/live-sessions.md) - server 端多 connection attachment 与 runtime disposal。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - attach/detach command 与 snapshot schema。
