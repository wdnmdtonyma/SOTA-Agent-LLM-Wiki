---
id: subsys.client.remote-session-client
title: Transport-neutral 远程 session client
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
  - packages/client/src/state.ts
  - packages/client/src/errors.ts
  - packages/client/test/connection.test.ts
  - packages/protocol/test/protocol.test.ts
symbols:
  - PiClient
  - ByteTransport
  - ByteTransportFactory
  - PiClientOptions
  - ConnectionState
  - listSessions
related:
  - subsys.client.session-leases
  - subsys.client.unix-transport
  - subsys.protocol.wire-protocol
  - subsys.server.session-server
evidence: explicit
status: verified
updated: 086c32e745
---

> `@earendil-works/pi-client` 的 package root 是 runtime-neutral `PiClient`：它只依赖已经连接并完成 transport-specific authentication 的 ordered byte transport，完成 protocol version handshake、request correlation、authoritative snapshot cache、多 session attachment 与显式 reconnect。[E: packages/client/package.json:2][E: packages/client/package.json:4][E: packages/client/package.json:37][E: packages/client/src/index.ts:1][E: packages/client/src/transport.ts:1][E: packages/client/src/transport.ts:18][E: packages/client/README.md:26]

## 能回答的问题

- 自定义 WebSocket/socket transport 要实现什么接口？
- `PiClient.connect()` 如何发送 hello 并接受 server snapshot？
- request id、out-of-order response 与 protocol mismatch 如何处理？
- `listSessions()` 返回的是 `SessionMetadata` 还是带 runtime 字段的 summary？
- progress event 为什么不会直接覆盖 snapshot cache？
- disconnect、reconnect、dispose 分别如何影响 request 与 session handle？

## 公开 API

root export 包含 `PiClient`、五个 structured error class、session lease types、`ByteTransport`/factory/handlers，以及 connection/client options；Node/Bun Unix transport 位于单独的 `./unix` subpath。[E: packages/client/src/index.ts:1][E: packages/client/src/index.ts:2][E: packages/client/src/index.ts:8][E: packages/client/src/index.ts:9][E: packages/client/src/index.ts:10][E: packages/client/src/index.ts:11][E: packages/client/package.json:8][E: packages/client/package.json:13][E: packages/client/package.json:17]

`ByteTransport.send()` 必须按 invocation order delivery 并返回 backpressure-aware Promise；`close()` 要幂等。factory 每次 connection attempt 创建 fresh、connected、authenticated transport，在 resolve 前完成 transport-specific authentication；transport 通过 `onData`、`onClose`、`onError` 回报 arbitrary chunks 与 exactly one terminal outcome。[E: packages/client/src/transport.ts:1][E: packages/client/src/transport.ts:3][E: packages/client/src/transport.ts:5][E: packages/client/src/transport.ts:8][E: packages/client/src/transport.ts:10][E: packages/client/src/transport.ts:12][E: packages/client/src/transport.ts:14][E: packages/client/src/transport.ts:18][E: packages/client/README.md:26]

`PiClientOptions` 只包含 `transportFactory`、optional `maxFrameLength` 与 `onListenerError`，不再有 `token` 或替代 credential field。WebSocket 等 custom factory 可在 upgrade request 中携凭据；认证失败应表现为 factory/transport establishment failure，而不是 protocol `hello_error.auth`。hello 仍是 `{type:"hello", version}`，credential 不进 protocol bytes。[E: packages/client/src/types.ts:14][E: packages/client/src/types.ts:15][E: packages/client/src/types.ts:16][E: packages/client/src/types.ts:18][E: packages/client/README.md:26][E: packages/client/README.md:40][E: packages/client/src/connection.ts:135]

## Connection lifecycle

`Connection` 的状态机只有 `disconnected`、`connecting`、`connected`；每次 connect 生成新的 sequence id、decoder 与 handshake Promise，旧 attempt 回调通过 id 隔离。[E: packages/client/src/connection.ts:23][E: packages/client/src/connection.ts:24][E: packages/client/src/connection.ts:25][E: packages/client/src/connection.ts:27][E: packages/client/src/connection.ts:43][E: packages/client/src/connection.ts:44][E: packages/client/src/connection.ts:66][E: packages/client/src/connection.ts:70][E: packages/client/src/connection.ts:71][E: packages/client/src/connection.ts:75]

transport factory resolve 后，client 先安装 transport，再立即发送 `{type:"hello", version: PROTOCOL_VERSION}` 的完整 frame；transport 尚未安装时收到 bytes、第一条 server message 不是 hello/hello_error，或 frame/CBOR/schema decoder 遇到 malformed input，都会成为 protocol failure 并关闭 connection。hello send Promise 尚未完成时，已安装 transport 收到的数据仍可被处理。[E: packages/client/src/connection.ts:119][E: packages/client/src/connection.ts:122][E: packages/client/src/connection.ts:132][E: packages/client/src/connection.ts:134][E: packages/client/src/connection.ts:135][E: packages/client/src/connection.ts:138][E: packages/client/src/connection.ts:142][E: packages/client/src/connection.ts:145][E: packages/client/src/connection.ts:146][E: packages/client/src/connection.ts:149][E: packages/client/src/connection.ts:154][E: packages/client/src/connection.ts:164][E: packages/client/src/connection.ts:165][E: packages/client/src/connection.ts:169][E: packages/client/src/connection.ts:170][E: packages/client/test/connection.test.ts:41][E: packages/client/test/connection.test.ts:42]

factory reject 会通过 `toDisconnectedError()` 归一成 `PiDisconnectedError`；只有已经进入 protocol 且收到 schema-valid `hello_error`（例如 `version`）时才包装为 `PiServerError`。因此 transport auth failure 不再有 typed wire `auth` code。[E: packages/client/src/connection.ts:122][E: packages/client/src/connection.ts:123][E: packages/client/src/connection.ts:124][E: packages/client/src/errors.ts:53][E: packages/client/src/errors.ts:54][E: packages/client/src/errors.ts:55][E: packages/client/src/connection.ts:164][E: packages/client/src/connection.ts:165][E: packages/client/src/connection.ts:166][E: packages/client/test/connection.test.ts:179][E: packages/client/test/connection.test.ts:189][E: packages/client/test/connection.test.ts:190][E: packages/client/test/connection.test.ts:191]

成功 hello 的 snapshot 先进入 state，再通知 `connected` listeners 并 resolve handshake；connection close 会调用 decoder `end()`，所以 truncated final frame 能替代普通 disconnected error。[E: packages/client/src/connection.ts:177][E: packages/client/src/connection.ts:184][E: packages/client/src/connection.ts:186][E: packages/client/src/connection.ts:192][E: packages/client/src/connection.ts:195][E: packages/client/src/connection.ts:206][E: packages/client/src/connection.ts:211][E: packages/client/src/connection.ts:213]

## Request correlation

`PiClient.#request()` 要求 connected，为每个 command 生成 `request-N` id，先登记 pending resolver，再编码 request frame 并 send。[E: packages/client/src/client.ts:189][E: packages/client/src/client.ts:190][E: packages/client/src/client.ts:191][E: packages/client/src/client.ts:192][E: packages/client/src/client.ts:193][E: packages/client/src/client.ts:194][E: packages/client/src/client.ts:197][E: packages/client/src/client.ts:198][E: packages/client/src/client.ts:205]

response 可以 out of order，因为 lookup 只依赖 response id；不存在 matching request 会把整个 connection 置为 failed，result command 与 request command 不一致也会 reject 当前 request 并 fail connection。[E: packages/client/src/client.ts:294][E: packages/client/src/client.ts:300][E: packages/client/src/client.ts:301][E: packages/client/src/client.ts:302][E: packages/client/src/client.ts:309][E: packages/client/src/client.ts:310][E: packages/client/src/client.ts:313][E: packages/client/src/client.ts:314] server error response 被包装为 `PiServerError`，保留 code 与 JSON details。[E: packages/client/src/errors.ts:3][E: packages/client/src/errors.ts:4][E: packages/client/src/errors.ts:5][E: packages/client/src/errors.ts:7][E: packages/client/src/errors.ts:10][E: packages/client/src/errors.ts:11]

## Authoritative state

`ClientState.applyResult()` 只将成功 command response 中的 full session snapshot 写入 cache；`applyEvent()` 只 reduce `server_snapshot`、`session_snapshot` 与 removal，`session_progress` 仅通知 event listeners。[E: packages/client/src/state.ts:77][E: packages/client/src/state.ts:85][E: packages/client/src/state.ts:88][E: packages/client/src/state.ts:89][E: packages/client/src/state.ts:90][E: packages/client/src/state.ts:91][E: packages/client/src/state.ts:95]

server/session snapshots 都带 revision guard，older snapshot 不会覆盖 newer authoritative state；subscriber exception 被隔离并交给 optional `onListenerError`。[E: packages/client/src/state.ts:100][E: packages/client/src/state.ts:101][E: packages/client/src/state.ts:106][E: packages/client/src/state.ts:108][E: packages/client/src/state.ts:115][E: packages/client/src/state.ts:119][E: packages/client/src/state.ts:120][E: packages/client/src/types.ts:18][E: packages/client/src/types.ts:18]

## Disconnect、reconnect 与 dispose

`PiClient` 不自动 reconnect；`reconnect()` 只是再次调用 `connect()`，factory 因此必须返回 fresh transport。[E: packages/client/src/client.ts:107][E: packages/client/src/client.ts:113][E: packages/client/src/client.ts:114] disconnect 会 clear attachment state、invalidate all leases、reject all pending requests；client snapshot 本身在下一次 connect 开始时 reset。[E: packages/client/src/client.ts:107][E: packages/client/src/client.ts:109][E: packages/client/src/client.ts:321][E: packages/client/src/client.ts:323][E: packages/client/src/client.ts:324][E: packages/client/src/client.ts:325]

`dispose()` 是 idempotent AsyncDisposable：标记 client disposed、拒绝 requests、关闭 connection、清空 state/listeners 并 invalidate leases。[E: packages/client/src/client.ts:342][E: packages/client/src/client.ts:343][E: packages/client/src/client.ts:344][E: packages/client/src/client.ts:347][E: packages/client/src/client.ts:348][E: packages/client/src/client.ts:349][E: packages/client/src/client.ts:350][E: packages/client/src/client.ts:355][E: packages/client/src/client.ts:356]

## Gotcha

- `PiClientOptions.maxFrameLength` 同时约束 inbound/outbound protocol frame，不是 transport queue 上限。[E: packages/client/src/types.ts:14][E: packages/client/src/types.ts:16][E: packages/client/src/connection.ts:48][E: packages/client/src/connection.ts:75][E: packages/client/src/connection.ts:135][E: packages/client/src/client.ts:197]
- 不要把 session bearer token 加进 hello：client API 不接受它，protocol strict schema 也拒绝 credential field。认证必须由每次 factory 创建 transport 的过程实现。[E: packages/client/src/types.ts:14][E: packages/client/src/types.ts:18][E: packages/client/README.md:26][E: packages/protocol/test/protocol.test.ts:73][E: packages/protocol/test/protocol.test.ts:76]
- `listSessions()` 返回 `readonly SessionMetadata[]`：这是 durable list metadata（`id`/`createdAt` 必填，runtime phase/model/lock 不在此）。request 刷新 list 后，`ClientState.applyResult()` 对 list result 仍不写入 server snapshot；authoritative server-wide cache 由 hello/`server_snapshot` 更新，其 `sessions` 同样是 `SessionMetadata[]`。[E: packages/client/src/client.ts:137][E: packages/client/src/client.ts:138][E: packages/client/src/state.ts:77][E: packages/client/src/state.ts:78][E: packages/protocol/src/schemas.ts:233][E: packages/protocol/src/schemas.ts:264][E: packages/protocol/src/schemas.ts:359][E: packages/client/README.md:28][I]
- listener failure 不应改变 protocol state；`onListenerError` 自身抛错也被吞掉。[E: packages/client/src/state.ts:125][E: packages/client/src/state.ts:127][E: packages/client/src/state.ts:128][E: packages/client/src/state.ts:129]

## Sources

- packages/client/package.json
- packages/client/README.md
- packages/client/src/index.ts
- packages/client/src/types.ts
- packages/client/src/transport.ts
- packages/client/src/connection.ts
- packages/client/src/client.ts
- packages/client/src/state.ts
- packages/client/src/errors.ts
- packages/client/test/connection.test.ts
- packages/protocol/test/protocol.test.ts

## 相关

- [subsys.client.session-leases](session-leases.md) - shared/exclusive ownership 与 detach/dispose 收敛。
- [subsys.client.unix-transport](unix-transport.md) - Node/Bun Unix-domain socket transport。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - command/event/snapshot schema。
- [subsys.server.session-server](../server/session-server.md) - server 端握手与 request dispatch。
