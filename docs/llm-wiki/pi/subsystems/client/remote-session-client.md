---
id: subsys.client.remote-session-client
title: Transport-neutral 远程 session client
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/package.json
  - packages/client/src/index.ts
  - packages/client/src/types.ts
  - packages/client/src/transport.ts
  - packages/client/src/connection.ts
  - packages/client/src/client.ts
  - packages/client/src/state.ts
  - packages/client/src/errors.ts
symbols:
  - PiClient
  - ByteTransport
  - ByteTransportFactory
  - ConnectionState
related:
  - subsys.client.session-leases
  - subsys.client.unix-transport
  - subsys.protocol.wire-protocol
  - subsys.server.session-server
evidence: explicit
status: verified
updated: a8ee03b815
---

> `@earendil-works/pi-client` 的 package root 是 runtime-neutral `PiClient`：它只依赖 ordered byte transport，完成 protocol handshake、request correlation、authoritative snapshot cache、多 session attachment 与显式 reconnect。[E: packages/client/package.json:2][E: packages/client/package.json:4][E: packages/client/package.json:37][E: packages/client/src/index.ts:1][E: packages/client/src/transport.ts:1][E: packages/client/src/transport.ts:18]

## 能回答的问题

- 自定义 WebSocket/socket transport 要实现什么接口？
- `PiClient.connect()` 如何发送 hello 并接受 server snapshot？
- request id、out-of-order response 与 protocol mismatch 如何处理？
- progress event 为什么不会直接覆盖 snapshot cache？
- disconnect、reconnect、dispose 分别如何影响 request 与 session handle？

## 公开 API

root export 包含 `PiClient`、五个 structured error class、session lease types、`ByteTransport`/factory/handlers，以及 connection/client options；Node/Bun Unix transport 位于单独的 `./unix` subpath。[E: packages/client/src/index.ts:1][E: packages/client/src/index.ts:2][E: packages/client/src/index.ts:8][E: packages/client/src/index.ts:9][E: packages/client/src/index.ts:10][E: packages/client/src/index.ts:11][E: packages/client/package.json:8][E: packages/client/package.json:13][E: packages/client/package.json:17]

`ByteTransport.send()` 必须按 invocation order delivery 并返回 backpressure-aware Promise；`close()` 要幂等。factory 每次 connection attempt 创建 fresh transport，transport 通过 `onData`、`onClose`、`onError` 回报 arbitrary chunks 与 exactly one terminal outcome。[E: packages/client/src/transport.ts:1][E: packages/client/src/transport.ts:3][E: packages/client/src/transport.ts:3][E: packages/client/src/transport.ts:5][E: packages/client/src/transport.ts:5][E: packages/client/src/transport.ts:8][E: packages/client/src/transport.ts:10][E: packages/client/src/transport.ts:12][E: packages/client/src/transport.ts:14][E: packages/client/src/transport.ts:18][E: packages/client/src/transport.ts:18]

## Connection lifecycle

`Connection` 的状态机只有 `disconnected`、`connecting`、`connected`；每次 connect 生成新的 sequence id、decoder 与 handshake Promise，旧 attempt 回调通过 id 隔离。[E: packages/client/src/connection.ts:23][E: packages/client/src/connection.ts:24][E: packages/client/src/connection.ts:25][E: packages/client/src/connection.ts:27][E: packages/client/src/connection.ts:44][E: packages/client/src/connection.ts:45][E: packages/client/src/connection.ts:67][E: packages/client/src/connection.ts:71][E: packages/client/src/connection.ts:72][E: packages/client/src/connection.ts:76]

transport 创建成功后，client 先安装 transport，再立即发送 `{type:"hello", version: PROTOCOL_VERSION, token}` 的完整 frame；transport 尚未安装时收到 bytes、第一条 server message 不是 hello/hello_error，或 frame/CBOR/schema decoder 遇到 malformed input，都会成为 protocol failure 并关闭 connection。hello send Promise 尚未完成时，已安装 transport 收到的数据仍可被处理。[E: packages/client/src/connection.ts:120][E: packages/client/src/connection.ts:123][E: packages/client/src/connection.ts:133][E: packages/client/src/connection.ts:135][E: packages/client/src/connection.ts:136][E: packages/client/src/connection.ts:137][E: packages/client/src/connection.ts:146][E: packages/client/src/connection.ts:149][E: packages/client/src/connection.ts:150][E: packages/client/src/connection.ts:153][E: packages/client/src/connection.ts:158][E: packages/client/src/connection.ts:168][E: packages/client/src/connection.ts:169][E: packages/client/src/connection.ts:173][E: packages/client/src/connection.ts:174]

成功 hello 的 snapshot 先进入 state，再通知 `connected` listeners 并 resolve handshake；connection close 会调用 decoder `end()`，所以 truncated final frame 能替代普通 disconnected error。[E: packages/client/src/connection.ts:181][E: packages/client/src/connection.ts:188][E: packages/client/src/connection.ts:190][E: packages/client/src/connection.ts:196][E: packages/client/src/connection.ts:199][E: packages/client/src/connection.ts:210][E: packages/client/src/connection.ts:215][E: packages/client/src/connection.ts:217]

## Request correlation

`PiClient.#request()` 要求 connected，为每个 command 生成 `request-N` id，先登记 pending resolver，再编码 request frame 并 send。[E: packages/client/src/client.ts:190][E: packages/client/src/client.ts:191][E: packages/client/src/client.ts:192][E: packages/client/src/client.ts:193][E: packages/client/src/client.ts:194][E: packages/client/src/client.ts:195][E: packages/client/src/client.ts:198][E: packages/client/src/client.ts:199][E: packages/client/src/client.ts:206]

response 可以 out of order，因为 lookup 只依赖 response id；不存在 matching request 会把整个 connection 置为 failed，result command 与 request command 不一致也会 reject 当前 request 并 fail connection。[E: packages/client/src/client.ts:295][E: packages/client/src/client.ts:301][E: packages/client/src/client.ts:302][E: packages/client/src/client.ts:303][E: packages/client/src/client.ts:310][E: packages/client/src/client.ts:311][E: packages/client/src/client.ts:314][E: packages/client/src/client.ts:315] server error response 被包装为 `PiServerError`，保留 code 与 JSON details。[E: packages/client/src/errors.ts:3][E: packages/client/src/errors.ts:4][E: packages/client/src/errors.ts:5][E: packages/client/src/errors.ts:7][E: packages/client/src/errors.ts:10][E: packages/client/src/errors.ts:11]

## Authoritative state

`ClientState.applyResult()` 只将成功 command response 中的 full session snapshot 写入 cache；`applyEvent()` 只 reduce `server_snapshot`、`session_snapshot` 与 removal，`session_progress` 仅通知 event listeners。[E: packages/client/src/state.ts:77][E: packages/client/src/state.ts:85][E: packages/client/src/state.ts:88][E: packages/client/src/state.ts:89][E: packages/client/src/state.ts:90][E: packages/client/src/state.ts:91][E: packages/client/src/state.ts:95]

server/session snapshots 都带 revision guard，older snapshot 不会覆盖 newer authoritative state；subscriber exception 被隔离并交给 optional `onListenerError`。[E: packages/client/src/state.ts:100][E: packages/client/src/state.ts:101][E: packages/client/src/state.ts:108][E: packages/client/src/state.ts:110][E: packages/client/src/state.ts:117][E: packages/client/src/state.ts:121][E: packages/client/src/state.ts:122][E: packages/client/src/types.ts:19][E: packages/client/src/types.ts:19]

## Disconnect、reconnect 与 dispose

`PiClient` 不自动 reconnect；`reconnect()` 只是再次调用 `connect()`，factory 因此必须返回 fresh transport。[E: packages/client/src/client.ts:108][E: packages/client/src/client.ts:114][E: packages/client/src/client.ts:115] disconnect 会 clear attachment state、invalidate all leases、reject all pending requests；client snapshot 本身在下一次 connect 开始时 reset。[E: packages/client/src/client.ts:108][E: packages/client/src/client.ts:110][E: packages/client/src/client.ts:322][E: packages/client/src/client.ts:324][E: packages/client/src/client.ts:325][E: packages/client/src/client.ts:326]

`dispose()` 是 idempotent AsyncDisposable：标记 client disposed、拒绝 requests、关闭 connection、清空 state/listeners 并 invalidate leases。[E: packages/client/src/client.ts:343][E: packages/client/src/client.ts:344][E: packages/client/src/client.ts:345][E: packages/client/src/client.ts:348][E: packages/client/src/client.ts:349][E: packages/client/src/client.ts:350][E: packages/client/src/client.ts:351][E: packages/client/src/client.ts:356][E: packages/client/src/client.ts:357]

## Gotcha

- `PiClientOptions.maxFrameLength` 同时约束 inbound/outbound protocol frame，不是 transport queue 上限。[E: packages/client/src/types.ts:14][E: packages/client/src/types.ts:17][E: packages/client/src/connection.ts:49][E: packages/client/src/connection.ts:76][E: packages/client/src/connection.ts:138]
- `listSessions()` 发 request 获取 refreshed list，但 `ClientState.applyResult()` 对 list result 不更新 server snapshot；authoritative server-wide cache 由 hello/server_snapshot event 更新。[E: packages/client/src/client.ts:138][E: packages/client/src/client.ts:139][E: packages/client/src/state.ts:77][E: packages/client/src/state.ts:78][I]
- listener failure 不应改变 protocol state；`onListenerError` 自身抛错也被吞掉。[E: packages/client/src/state.ts:127][E: packages/client/src/state.ts:129][E: packages/client/src/state.ts:130][E: packages/client/src/state.ts:131]

## Sources

- packages/client/package.json
- packages/client/src/index.ts
- packages/client/src/types.ts
- packages/client/src/transport.ts
- packages/client/src/connection.ts
- packages/client/src/client.ts
- packages/client/src/state.ts
- packages/client/src/errors.ts

## 相关

- [subsys.client.session-leases](session-leases.md) - shared/exclusive ownership 与 detach/dispose 收敛。
- [subsys.client.unix-transport](unix-transport.md) - Node/Bun Unix-domain socket transport。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - command/event/snapshot schema。
- [subsys.server.session-server](../server/session-server.md) - server 端握手与 request dispatch。
