---
id: subsys.client.remote-session-client
title: Chord 风格 transport-neutral Client
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/package.json
  - packages/client/README.md
  - packages/client/src/index.ts
  - packages/client/src/types.ts
  - packages/client/src/transport.ts
  - packages/client/src/connection.ts
  - packages/client/src/client.ts
  - packages/client/src/errors.ts
  - packages/client/test/client.test.ts
  - packages/protocol/test/protocol.test.ts
symbols:
  - Client
  - createClientServiceTransport
  - ByteTransport
  - ByteTransportFactory
  - ClientOptions
  - ConnectionState
related:
  - subsys.client.session-leases
  - subsys.client.unix-transport
  - subsys.protocol.wire-protocol
  - subsys.server.session-server
evidence: explicit
status: verified
updated: 71dca871bc
---

> `@earendil-works/pi-client` 的 package root 是 Chord 风格的 `Client`：它只依赖已经连接并完成 transport-specific authentication 的 ordered byte transport，完成 protocol version handshake、`serverId` 校验、routed request correlation、service catalogue/subscribe 与 out-of-band attachment。它不再导出 `PiClient` / `PiSessionHandle` [E: packages/client/package.json:2] [E: packages/client/src/index.ts:1] [E: packages/client/src/transport.ts:18]。

## 能回答的问题

- 自定义 WebSocket/socket transport 要实现什么接口？
- `Client.connect()` 如何发送 hello 并校验 logical `serverId`？
- request id、out-of-order response、cancel 与 protocol mismatch 如何处理？
- `request()` / `subscribeService()` 与 `createClientServiceTransport()` 分别是哪一层？
- disconnect、reconnect、dispose 分别如何影响 pending request 与 attachment？

## 公开 API

`@earendil-works/pi-client` 版本 `0.85.1`，依赖 `@earendil-works/chord` 与 `@earendil-works/pi-protocol` [E: packages/client/package.json:3] [E: packages/client/package.json:50] [E: packages/client/package.json:51]。root export 是 `Client`、`createClientServiceTransport`、三个 structured error，以及 `ByteTransport` / `ClientOptions` / `ServiceSubscription` 等类型；Unix factory 在单独的 `./unix` subpath [E: packages/client/src/index.ts:1] [E: packages/client/src/index.ts:4] [E: packages/client/src/index.ts:3] [E: packages/client/package.json:13]。

`ByteTransport.send()` 必须按 invocation order 投递并返回 backpressure-aware Promise；`close()` 要幂等。`ByteTransportFactory` 每次 connection attempt 创建 fresh、connected、authenticated transport，在 resolve 前完成 transport-specific authentication；transport 通过 `onData` / `onClose` / `onError` 回报 arbitrary chunks 与 exactly one terminal outcome [E: packages/client/src/transport.ts:3] [E: packages/client/src/transport.ts:5] [E: packages/client/src/transport.ts:18]。

`ClientOptions` 要求 `transportFactory` 与 canonical `serverId`，可选 `maxFrameLength` 与 `onListenerError`。没有 token / credential field；认证失败应表现为 factory/transport establishment failure，hello 仍是 `{ type: "hello", version }` [E: packages/client/src/types.ts:25] [E: packages/client/src/types.ts:26] [E: packages/client/src/types.ts:28] [E: packages/client/README.md:18]。构造函数用 `isServerId()` 拒绝非 canonical lowercase UUIDv4 [E: packages/client/src/client.ts:77] [E: packages/client/test/client.test.ts:44]。

## Connection lifecycle

`Connection` 状态机只有 `disconnected` / `connecting` / `connected`；每次 `connect()` 生成新 sequence id 与 `ServerMessageDecoder`，旧 attempt 的 data/close/error 通过 id 隔离 [E: packages/client/src/types.ts:5] [E: packages/client/src/connection.ts:67] [E: packages/client/src/connection.ts:72] [E: packages/client/src/connection.ts:76]。

factory resolve 后，client 先安装 transport，再 `encodeClientMessage({ type: "hello", version: PROTOCOL_VERSION })` 发送完整 frame [E: packages/client/src/connection.ts:133] [E: packages/client/src/connection.ts:136]。transport 尚未安装时收到 bytes、第一条 server message 不是 hello/hello_error、hello 的 `serverId` 与 options 不一致，或 decoder 遇到 malformed input，都会 fail connection [E: packages/client/src/connection.ts:147] [E: packages/client/src/connection.ts:171] [E: packages/client/src/connection.ts:174] [E: packages/client/src/connection.ts:208] [E: packages/client/test/client.test.ts:51]。

factory reject 归一成 `DisconnectedError`；已经进入 protocol 且收到 schema-valid `hello_error`（例如 `version`）时包装为 `ServerError` [E: packages/client/src/connection.ts:125] [E: packages/client/src/connection.ts:125] [E: packages/client/src/connection.ts:167] [E: packages/client/src/errors.ts:3] [E: packages/client/test/client.test.ts:305]。成功 hello 先 `onHandshake`，再通知 `connected` 并 resolve handshake Promise；close 会 `decoder.end()`，truncated final frame 能替代普通 disconnected error [E: packages/client/src/connection.ts:204] [E: packages/client/src/connection.ts:201] [E: packages/client/src/connection.ts:204] [E: packages/client/src/connection.ts:220]。

## Request correlation 与 Chord 调用

`Client.#request()` 要求未 dispose 且 `connected`；为每个 call 生成 `request-N` id，先登记 pending resolver，再把 `{ type: "request", id, target, call }` 编码为 frame 并 send [E: packages/client/src/client.ts:244] [E: packages/client/src/client.ts:245] [E: packages/client/src/client.ts:247] [E: packages/client/src/client.ts:290]。`call` 先经 Chord `parseServiceCall()` 再作为 opaque JSON 进 envelope [E: packages/client/src/client.ts:291]。

response 可以 out of order，lookup 只依赖 response id；不存在 matching request 会 `ProtocolValidationError` 并 fail connection。`ok: false` 包装为 `ServerError`，保留 code [E: packages/client/src/client.ts:334] [E: packages/client/src/client.ts:338] [E: packages/client/test/client.test.ts:168] [E: packages/client/test/client.test.ts:180]。AbortSignal 在 send 前 abort 则不发 request；send 后 abort 再发 `{ type: "cancel", id, target }`，不断开连接 [E: packages/client/src/client.ts:246] [E: packages/client/src/client.ts:256] [E: packages/client/test/client.test.ts:195] [E: packages/client/test/client.test.ts:209]。

高层 API：

| 方法 | 作用 |
|---|---|
| `request(target, call)` | 对显式 `RpcTarget` 发一次 Chord `ServiceCall` |
| `serviceCatalogue(target)` | 发 catalogue call，再用 Chord `parseServiceCatalogue()`；失败 fail connection |
| `subscribeService(target, serviceId, mode, listener)` | 发 subscribe call，hydrate snapshot，返回 `ServiceSubscription` |
| `createClientServiceTransport(client, getTarget)` | 把懒解析 target 适配成 Chord `RemoteServiceTransport` |

`serviceCatalogue` 校验失败会构造 `ProtocolValidationError` 并 `connection.fail` [E: packages/client/src/client.ts:159] [E: packages/client/src/client.ts:164] [E: packages/client/src/client.ts:167]。`Client` 不解释应用 contract，也不构造 typed service proxy [E: packages/client/README.md:30]。

## Attachment 与 disconnect

server 的 `{ type: "attachment" }` 更新 `#attachment`；attachment 的 `serverId` 必须等于 options，否则 fail connection [E: packages/client/src/client.ts:305] [E: packages/client/src/client.ts:306] [E: packages/client/src/client.ts:339]。`onAttachmentChange` 在 route 变化时回调；listener 抛错交给 `onListenerError`，diagnostics 自己抛错也被吞掉 [E: packages/client/src/client.ts:408] [E: packages/client/src/client.ts:437] [E: packages/client/src/client.ts:441]。

`Client` 不自动 reconnect；`reconnect()` 只是再调 `connect()`，factory 必须返回 fresh transport [E: packages/client/src/client.ts:134] [E: packages/client/src/client.ts:135] [E: packages/client/test/client.test.ts:314]。disconnect 清空 hello/attachment、reject 全部 pending、clear service listeners；不 replay 请求 [E: packages/client/src/client.ts:346] [E: packages/client/src/client.ts:385] [E: packages/client/src/client.ts:387] [E: packages/client/README.md:34]。`dispose()` 幂等：标 disposed、reject pending、disconnect、清 listeners [E: packages/client/src/client.ts:379] [E: packages/client/src/client.ts:381] [E: packages/client/src/client.ts:384]。

## Gotcha

- `ClientOptions.maxFrameLength` 同时约束 inbound/outbound protocol frame，不是 Unix transport queue 上限 [E: packages/client/src/types.ts:29] [E: packages/client/src/connection.ts:49] [E: packages/client/src/connection.ts:136]。
- 不要把 session bearer token 加进 hello：`ClientOptions` 不接受它，protocol strict schema 也拒绝 extra field。认证必须由每次 factory 创建 transport 的过程实现 [E: packages/client/src/types.ts:25] [E: packages/protocol/test/protocol.test.ts:42]。
- `listSessions()` / `acquireSession()` / authoritative snapshot cache 已删除。Session 列表与 transcript 是应用 Chord service；client 只缓存当前 `SessionTarget` 与 hello [E: packages/client/src/client.ts:102] [E: packages/client/src/client.ts:134] [I]。
- 已 accepted 的远程工作在 disconnect 后仍可能在 server 上跑完，再释放 attachment；client 只本地 reject pending [E: packages/client/README.md:34]。

## Sources

- packages/client/package.json
- packages/client/README.md
- packages/client/src/index.ts
- packages/client/src/types.ts
- packages/client/src/transport.ts
- packages/client/src/connection.ts
- packages/client/src/client.ts
- packages/client/src/errors.ts
- packages/client/test/client.test.ts
- packages/protocol/test/protocol.test.ts

## 相关

- [subsys.client.session-leases](session-leases.md) - `SessionTarget` attachment 与 `ServiceSubscription` hydrate/start/dispose。
- [subsys.client.unix-transport](unix-transport.md) - Node/Bun Unix-domain socket factory 与 discovery。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - version-8 envelope 与 opaque JSON payload。
- [subsys.server.session-server](../server/session-server.md) - server 端握手、request dispatch 与 attachment 发布。
