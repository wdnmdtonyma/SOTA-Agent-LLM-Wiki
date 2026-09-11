---
id: subsys.client.session-leases
title: Session attachment 与 service subscription
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/src/client.ts
  - packages/client/src/types.ts
  - packages/client/src/errors.ts
  - packages/client/test/client.test.ts
  - packages/protocol/src/protocol.ts
  - packages/server/src/session-router.ts
symbols:
  - Client
  - ServiceSubscription
  - createClientServiceTransport
  - AttachmentChangeListener
  - SessionTarget
related:
  - subsys.client.remote-session-client
  - subsys.server.live-sessions
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `Client` 不再持有 `PiSessionHandle` / shared-exclusive lease。现行 attachment 是 server 发布的 `SessionTarget`（`{ serverId, sessionId, attachmentId }`）；服务观察走 `subscribeService()` 返回的 `ServiceSubscription`。`session-handle.ts` 与 `state.ts` 已删除 [E: packages/client/src/client.ts:113] [E: packages/protocol/src/protocol.ts:40] [E: packages/client/src/types.ts:16]。

## 能回答的问题

- attach / detach 是 protocol command 还是 application service？
- `Client.attachment` 如何更新？`attachmentId` 防什么？
- `subscribeService()` 的 snapshot、`start()`、buffered update、`dispose()` 顺序是什么？
- disconnect / dispose 如何作废 pending request 与 subscription？
- 一个 `Client` 能否同时持有多个 Session attachment？

## 数据模型

`SessionTarget` 是 session 调用的完整路由：logical `serverId` + durable `sessionId` + live `attachmentId` [E: packages/protocol/src/protocol.ts:40] [E: packages/protocol/src/protocol.ts:42] [E: packages/protocol/src/protocol.ts:43]。server-wide 调用只用 `{ serverId }` [E: packages/protocol/src/protocol.ts:36]。`Client` 只缓存当前一条 `#attachment`，没有 per-session handle map [E: packages/client/src/client.ts:73] [E: packages/client/src/client.ts:113]。

`ServiceSubscription` 暴露 `id`、`target`、hydrate 完成的 `snapshot`、`start()` 与 `dispose()`。`start()` 在调用方装好 snapshot 之后才释放 hydration 期间缓冲的 update [E: packages/client/src/types.ts:16] [E: packages/client/src/types.ts:21] [E: packages/client/src/types.ts:22]。

server 侧 `SessionRouter` 为每个 connection 最多保留一条 `ClientAttachment`（`attachmentsByClient`），`attachment.id` 是 `randomUUID()`；同一 durable session 可以有多个 connection attachment [E: packages/server/src/session-router.ts:38] [E: packages/server/src/session-router.ts:168] [E: packages/server/src/session-router.ts:173]。

## Acquisition（应用服务 + OOB attachment）

protocol 没有 `attach` / `detach` / `create` command。测试与 README 约定的路径是：对 `{ serverId }` 发 Chord call `pi.session-management.attach(sessionId)`，业务 result 不带 routing id；server 另发 `{ type: "attachment", attachment: SessionTarget | null }` [E: packages/client/test/client.test.ts:28] [E: packages/client/test/client.test.ts:36] [E: packages/protocol/src/protocol.ts:94]。

`Client.#handleMessage` 遇到 `attachment` 时校验 `serverId`，再 `#setAttachment`；相同 `serverId`/`sessionId`/`attachmentId` 不重复通知 [E: packages/client/src/client.ts:305] [E: packages/client/src/client.ts:310] [E: packages/client/src/client.ts:400]。`onAttachmentChange` 把新 `SessionTarget | undefined` 交给调用方 [E: packages/client/src/client.ts:175] [E: packages/client/src/types.ts:14]。

切换 session 后，旧 `{ sessionId, attachmentId }` 在 server 上变成 stale：`SessionRouter.requireAttachment()` 要求 connection 当前 attachment 的 session id 与 attachment id 都匹配，否则 `session_not_attached` [E: packages/server/src/session-router.ts:226] [E: packages/server/src/session-router.ts:228]。

不要把这套路由当成跨 process exclusive lock：多个 presentation 可以同时 attach 同一 hosted session；冲突由应用 / worker 拒绝，而不是 client lease mode [I]。

## Service subscription

`subscribeService()` 分配 `service-N` subscription id，登记 `ActiveServiceListener`（Chord `createServiceStateDecoder()` + wire/update 队列），再发 `createServiceSubscribeCall` [E: packages/client/src/client.ts:243] [E: packages/client/src/client.ts:183] [E: packages/client/src/client.ts:195]。snapshot 尚未 decode 完时到达的 `service_update` 进 `queuedWireUpdates`；hydrate 后、`start()` 前的 decoded update 进 `queued` [E: packages/client/src/client.ts:313] [E: packages/client/src/client.ts:317] [E: packages/client/src/client.ts:330]。

`start()` 幂等：标 `ready` 并按序 `#deliverServiceUpdate`。`dispose()` 从 map 删除 listener；若仍 `connected` 且 `#targetIsCurrent(target)`，再发 unsubscribe；最后等待 `deliveryTail` [E: packages/client/src/client.ts:315] [E: packages/client/src/client.ts:221] [E: packages/client/src/client.ts:314]。session target 的 “current” 要求 attachment 三元组全等；server target 只比 `hello.serverId` [E: packages/client/src/client.ts:423] [E: packages/client/src/client.ts:427]。

`createClientServiceTransport()` 把 `subscribeService` 映射为 Chord transport 的 `activate` / `close` [E: packages/client/src/client.ts:459] [E: packages/client/src/client.ts:469]。测试锁住：snapshot 到达前的 update 不投递；`activate()` 之后才释放 buffer [E: packages/client/test/client.test.ts:81] [E: packages/client/test/client.test.ts:112]。

## Release 与 invalidation

disconnect 时 hello/attachment 清空、pending request reject、`#serviceListeners.clear()`——不再补发 unsubscribe [E: packages/client/src/client.ts:346] [E: packages/client/src/client.ts:348] [E: packages/client/src/client.ts:350]。`dispose()` 同样清 attachment 与 listeners，后续 `request` 得 `ClientDisposedError` [E: packages/client/src/client.ts:463] [E: packages/client/src/client.ts:387] [E: packages/client/test/client.test.ts:241]。

server disconnect 会等该 connection 已 admitted 的 invoke settle，再 `release()` attachment；`publish=false`，避免对已死连接再发 attachment event [E: packages/server/src/session-router.ts:91] [E: packages/server/src/session-router.ts:96] [E: packages/server/src/session-router.ts:238]。client README 明确：本地 reject 不等于远程工作立刻停止 [E: packages/client/README.md:34]。

## Gotcha

- 不存在 `PiSessionHandle`、`SessionLeaseMode`、`acquireSession()`。不要在 wiki 或调用代码里发明这些符号 [E: packages/client/src/index.ts:1]。
- `Client.attachment` 是当前 presentation route，不是 durable session 列表，也不是 authoritative transcript snapshot [E: packages/client/src/client.ts:113]。
- 一个 `Client` 同时只跟踪一条 attachment。要观察另一 session，需经应用 `attach` 让 server 发布新 route [E: packages/client/src/client.ts:73] [I]。
- subscription id 是 client 生成的 `service-N`；server 用它关联 `service_update`。未知 `subscriptionId` 的 update 被忽略，不 fail connection [E: packages/client/src/client.ts:314] [E: packages/client/src/client.ts:315]。

## Sources

- packages/client/src/client.ts
- packages/client/src/types.ts
- packages/client/src/errors.ts
- packages/client/src/index.ts
- packages/client/README.md
- packages/client/test/client.test.ts
- packages/protocol/src/protocol.ts
- packages/server/src/session-router.ts

## 相关

- [subsys.client.remote-session-client](remote-session-client.md) - `Client` 连接、request correlation 与 Chord transport adapter。
- [subsys.server.live-sessions](../server/live-sessions.md) - `SessionRouter` 多 connection attachment、stale route 与 disposal。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - `SessionTarget` 与 out-of-band `attachment` envelope。
