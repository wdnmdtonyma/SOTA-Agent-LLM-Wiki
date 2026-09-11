---
id: subsys.server.session-server
title: Composable routed-envelope Server
kind: subsystem
tier: T2
pkg: server
source:
  - packages/server/package.json
  - packages/server/README.md
  - packages/server/src/index.ts
  - packages/server/src/listener.ts
  - packages/server/src/connection.ts
  - packages/server/src/server.ts
  - packages/server/src/types.ts
  - packages/server/src/errors.ts
  - packages/server/src/testing/index.ts
  - packages/server/src/testing/host.ts
  - packages/server/src/testing/server.ts
  - packages/server/test/conformance.test.ts
symbols:
  - Server
  - ServerListener
  - ServerOptions
  - ServerHost
  - SessionRouter
related:
  - subsys.server.live-sessions
  - subsys.server.unix-transport
  - subsys.server.protocol-adapters
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `Server` 是 `@earendil-works/pi-server` 的 transport-composable remote session core：listener 完成 transport-specific authentication 后提供 ordered byte connections，server core 负责 protocol version handshake、Chord service dispatch、out-of-band attachment 与 lifecycle cleanup。公开类名不再是 `PiServer` [E: packages/server/src/server.ts:46] [E: packages/server/src/listener.ts:4] [E: packages/server/README.md:3]。

## 能回答的问题

- custom transport 如何接入 `Server`？
- transport authentication、protocol version 与 handshake timeout 的责任如何划分？
- listener startup/rollback 与 server close 如何收敛？
- request 是否保证按到达顺序完成？duplicate request id 怎么办？
- hello 还携带 session list / server snapshot 吗？
- testing helper 现在叫什么？

## 公开 API

package root re-export errors、`ServerListener`、`Server`、`ServerHost` 等 types；export subpath 是 `.`、`./testing`、`./unix`。没有 CLI bin 或 supervisor [E: packages/server/src/index.ts:1] [E: packages/server/package.json:8] [E: packages/server/package.json:13] [E: packages/server/package.json:17]。

README 把该包定位为 composable `Server`：应用提供 `ServerHost`，Unix preset 是 `createUnixServer(host, { serverId, path })`。本包不提供 standalone CLI 或 coding-agent service [E: packages/server/README.md:34] [E: packages/server/README.md:64]。构造函数第一个参数是 `ServerHost`，内部创建 `SessionRouter`，用 `publishAttachment` 发 `{ type: "attachment" }` [E: packages/server/src/server.ts:67] [E: packages/server/src/server.ts:76] [E: packages/server/src/server.ts:80]。`ServerOptions` 要求 `listeners` 与 canonical `serverId`，可选 `maxFrameLength` / `handshakeTimeoutMs` / `onConnectionCountChanged` / `onError` [E: packages/server/src/types.ts:5] [E: packages/server/src/server.ts:559]。

## Listener 与 connection contract

`ServerListener.start(accept)` 只向 server 交付已经建立并授权的 `ByteConnection`；connection 必须公开 `closed`、ordered async `send()` 与可携 final frame 的 `close()` [E: packages/server/src/listener.ts:4] [E: packages/server/src/connection.ts:8]。WebSocket listener 可在 HTTP upgrade 校验凭据，Unix listener 依赖 socket filesystem permissions [E: packages/server/README.md:77]。

connection stage 是 `awaitingHello | handshaking | ready | closing | closed`。state 同时追踪 decoder、per-subscription `ServiceStateEncoder`、handshake timeout、`serverServices` 与 `activeRequests`（id → AbortController + target）[E: packages/server/src/connection.ts:21] [E: packages/server/src/connection.ts:26]。

## Start 与 close

`start()` 逐个启动 configured listeners；任一 start 失败时关闭已启动 listeners 并 `closeServerState`。cleanup 也失败才抛 `AggregateError`；cleanup 成功则抛原始 error [E: packages/server/src/server.ts:106] [E: packages/server/src/server.ts:112] [E: packages/server/src/server.ts:115] [E: packages/server/src/server.ts:120] [E: packages/server/src/server.ts:124] [E: packages/server/src/server.ts:125] [E: packages/server/src/server.ts:130]。server 拒绝重复/concurrent start 与 close 后 start [E: packages/server/src/server.ts:96] [E: packages/server/src/server.ts:97] [E: packages/server/src/server.ts:98]。

`close()` 幂等：标 `closing`、关 listeners、关 connections、`sessions.close()` [E: packages/server/src/server.ts:176] [E: packages/server/src/server.ts:178] [E: packages/server/src/server.ts:489]。`accept()` 在 closing 时丢弃新 connection [E: packages/server/src/server.ts:137]。

## Handshake

accept 时创建 `ClientMessageDecoder` 与默认 5-second timeout（`unref`）；first client message 必须是 hello [E: packages/server/src/server.ts:42] [E: packages/server/src/server.ts:147] [E: packages/server/src/server.ts:266] [E: packages/server/test/protocol.test.ts:51]。`ServerOptions` 没有 credential field。version 必须被 `isSupportedProtocolVersion()` 接受，否则 final `hello_error` code `version` [E: packages/server/src/server.ts:263] [E: packages/server/test/protocol.test.ts:66]。

成功路径：`host.serverServices.attachClient(presentation)` 得到 connection-scoped server endpoint，再发送 `{ type: "hello", version: 8, serverId }` 并进入 `ready` [E: packages/server/src/server.ts:272] [E: packages/server/src/server.ts:287]。hello **不**带 session list 或 server snapshot；conformance 断言 handshake 后 harness 数仍为 0 [E: packages/server/test/conformance.test.ts:81] [E: packages/server/test/conformance.test.ts:87]。handshaking 期间到达的 request/cancel 会等 handshake Promise 后再处理 [E: packages/server/src/server.ts:306] [E: packages/server/src/server.ts:320]。

## Request、cancel 与 error

ready 对每个 request `void handleRequest()`，完成顺序不保证。同一 connection 上重复的 active request id 立即 `invalid_request` / `Request ID is already active` [E: packages/server/src/server.ts:249] [E: packages/server/src/server.ts:307]。`cancel` 仅当 target 与 active request 的 target 全等时 abort 该 AbortController [E: packages/server/src/server.ts:298] [E: packages/server/src/server.ts:301]。

target `serverId` 不匹配抛 `WrongServerError`。带 `sessionId` 的 target 走 `SessionRouter.executeServiceCall`；否则走 `state.serverServices.invokeService` [E: packages/server/src/server.ts:346] [E: packages/server/src/server.ts:351] [E: packages/server/src/server.ts:353]。未知内部错误经 `onError` 观察后，client 收到 sanitized `internal_error` [E: packages/server/src/server.ts:519] [E: packages/server/src/errors.ts:11]。

disconnect 会 abort 该 connection 的 active requests、clear encoders、`sessions.disconnect` + `serverServices.release` [E: packages/server/src/server.ts:422] [E: packages/server/src/server.ts:430]。

## Testing helpers

`@earendil-works/pi-server/testing` 从 `testing/host.ts` 导出 `TestServerHost` / `TestHarness` / `createTestServerServices` / `Deferred`，从 `testing/server.ts` 导出 `createTestServer`，从 `testing/client.ts` 导出 `ProtocolTestClient`。旧名 `testing/service.ts` / `TestServerService` 已删除 [E: packages/server/src/testing/index.ts:2] [E: packages/server/src/testing/index.ts:3] [E: packages/server/src/testing/server.ts:16]。

## Gotcha

- listeners 允许为空；`Server` 不会自己选择 transport。常见 Unix preset 由 `subsys.server.unix-transport` 提供 [E: packages/server/src/types.ts:6] [E: packages/server/src/server.ts:559]。
- transport authorization 是进入 `accept()` 前的前置条件。`accept()` 是 public method，收到任何 `ByteConnection` 都会建 decoder/handshake；旧 custom listener 若不再认证 peer，core 不会补 token check [E: packages/server/src/server.ts:136] [E: packages/server/README.md:77] [I]。
- 没有 `ServerSnapshotPublisher`。session 目录与模型列表是应用服务，不是 hello payload [E: packages/server/test/conformance.test.ts:81] [I]。
- runtime/host 抛出的普通 Error 不映射成 per-session protocol event；server 记录并返回 sanitized `internal_error`，严重时断开连接 [E: packages/server/src/server.ts:387] [E: packages/server/test/conformance.test.ts:277]。

## Sources

- packages/server/package.json
- packages/server/README.md
- packages/server/src/index.ts
- packages/server/src/listener.ts
- packages/server/src/connection.ts
- packages/server/src/server.ts
- packages/server/src/types.ts
- packages/server/src/errors.ts
- packages/server/src/testing/index.ts
- packages/server/src/testing/host.ts
- packages/server/src/testing/server.ts
- packages/server/src/testing/client.ts
- packages/server/test/conformance.test.ts
- packages/server/test/protocol.test.ts

## 相关

- [subsys.server.live-sessions](live-sessions.md) - `ServerHost` / `SessionRouter` acquisition、attachment 与 disposal。
- [subsys.server.unix-transport](unix-transport.md) - Unix listener 与 preset。
- [subsys.server.protocol-adapters](protocol-adapters.md) - envelope / Chord 载荷边界；pi-ai DTO mapper 已删。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - hello / request / cancel / attachment / service_update schema。
