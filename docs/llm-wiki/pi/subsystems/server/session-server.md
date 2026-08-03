---
id: subsys.server.session-server
title: Composable protocol session server
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
  - packages/server/src/snapshots.ts
  - packages/server/src/types.ts
  - packages/server/src/errors.ts
  - packages/server/src/testing/index.ts
  - packages/server/src/testing/client.ts
  - packages/server/src/testing/server.ts
  - packages/server/test/conformance.test.ts
symbols:
  - PiServer
  - PiServerListener
  - PiServerOptions
  - PiSessionBackend
related:
  - subsys.server.live-sessions
  - subsys.server.unix-transport
  - subsys.server.protocol-adapters
  - subsys.protocol.wire-protocol
  - subsys.server.supervisor
evidence: explicit
status: verified
updated: 305c014dcc
---

> `PiServer` 是 `@earendil-works/pi-server` 新增的 transport-composable remote session core：listener 完成 transport-specific authentication/authorization 后提供 ordered byte connections，server core 负责 protocol version handshake、request dispatch、snapshot publication 与 lifecycle cleanup。[E: packages/server/src/server.ts:34][E: packages/server/src/server.ts:49][E: packages/server/src/listener.ts:4][E: packages/server/src/listener.ts:8][E: packages/server/README.md:42]

## 能回答的问题

- custom transport 如何接入 `PiServer`？
- transport authentication、protocol version 与 handshake timeout 的责任如何划分？
- listener startup/rollback 与 server close 如何收敛？
- request 是否保证按到达顺序完成？
- server snapshot revision、session summary 与 model list 如何发布？
- 新 server 与 legacy supervisor/CLI 是否已经互相替换？

## 公开 API 与迁移边界

package root 现在同时 re-export new errors/listener/protocol adapters/`PiServer`/backend types 与 `legacy/index.ts`；另有 `./unix`、`./testing`、`./legacy` 三个 export subpath。[E: packages/server/src/index.ts:1][E: packages/server/src/index.ts:2][E: packages/server/src/index.ts:3][E: packages/server/src/index.ts:4][E: packages/server/src/index.ts:5][E: packages/server/src/index.ts:6][E: packages/server/package.json:8][E: packages/server/package.json:13][E: packages/server/package.json:17][E: packages/server/package.json:21]

new session server 是 additive migration；现有 `server` bin 仍指向 `dist/legacy/cli.js`，README 明确说 CBOR session protocol 尚未替换 JSONL IPC、child-process supervisor、CLI 或 Radius。[E: packages/server/package.json:26][E: packages/server/package.json:27][E: packages/server/README.md:15][E: packages/server/README.md:42][E: packages/server/README.md:54][E: packages/server/README.md:56]

## Listener 与 connection contract

`PiServerListener.start(accept)` 只向 server 交付已经建立并授权的 `ByteConnection`；connection 必须公开 `closed`、ordered async `send()` 与可携 final frame 的 `close()`，handler 接收 data/close/error。WebSocket listener 可在 HTTP upgrade 校验凭据，Unix listener 则依赖 socket filesystem permissions。[E: packages/server/src/listener.ts:4][E: packages/server/src/listener.ts:8][E: packages/server/src/connection.ts:6][E: packages/server/src/connection.ts:7][E: packages/server/src/connection.ts:8][E: packages/server/src/connection.ts:9][E: packages/server/src/connection.ts:12][E: packages/server/src/connection.ts:13][E: packages/server/src/connection.ts:14][E: packages/server/src/connection.ts:15][E: packages/server/README.md:42]

connection stage 是 `awaitingHello | handshaking | ready | closing | closed`，state 同时追踪 decoder、attached session ids、handshake Promise/timeout 与 disconnect flags。[E: packages/server/src/connection.ts:20][E: packages/server/src/connection.ts:22][E: packages/server/src/connection.ts:23][E: packages/server/src/connection.ts:25][E: packages/server/src/connection.ts:26][E: packages/server/src/connection.ts:27][E: packages/server/src/connection.ts:28][E: packages/server/src/connection.ts:30][E: packages/server/src/connection.ts:31]

## Start 与 close

`start()` 逐个启动 configured listeners；任一 start 失败时关闭已经启动的 listeners 和 server state。server 拒绝重复/concurrent start 与 close 后 start。[E: packages/server/src/server.ts:80][E: packages/server/src/server.ts:81][E: packages/server/src/server.ts:82][E: packages/server/src/server.ts:83][E: packages/server/src/server.ts:88][E: packages/server/src/server.ts:91][E: packages/server/src/server.ts:92][E: packages/server/src/server.ts:97][E: packages/server/src/server.ts:99][E: packages/server/src/server.ts:100]

`close()` 幂等：先禁止新 accept，关闭全部 listeners/connections，再断开 session attachments 并 dispose live runtimes。[E: packages/server/src/server.ts:147][E: packages/server/src/server.ts:148][E: packages/server/src/server.ts:149][E: packages/server/src/server.ts:154][E: packages/server/src/server.ts:158][E: packages/server/src/server.ts:160][E: packages/server/src/server.ts:325][E: packages/server/src/server.ts:331][E: packages/server/src/server.ts:332][E: packages/server/src/server.ts:334]

## Handshake

accept 时创建 `ClientMessageDecoder` 与默认 5-second timeout；first client message 必须是 hello。[E: packages/server/src/server.ts:30][E: packages/server/src/server.ts:117][E: packages/server/src/server.ts:118][E: packages/server/src/server.ts:123][E: packages/server/src/server.ts:128][E: packages/server/src/server.ts:130][E: packages/server/src/server.ts:180][E: packages/server/src/server.ts:181][E: packages/server/src/server.ts:182][E: packages/server/src/server.ts:185]

server core 不再读取 token；`PiServerOptions` 也没有 credential field。它只要求 version 由 protocol helper 接受；version/invalid handshake 失败时编码 final `hello_error` frame、close 并 disconnect，成功 hello 携 connection id 与 connection-relative server snapshot。[E: packages/server/src/types.ts:14][E: packages/server/src/types.ts:15][E: packages/server/src/types.ts:16][E: packages/server/src/types.ts:18][E: packages/server/src/server.ts:216][E: packages/server/src/server.ts:217][E: packages/server/src/server.ts:218][E: packages/server/src/server.ts:219][E: packages/server/src/server.ts:220][E: packages/server/src/server.ts:225][E: packages/server/src/server.ts:227][E: packages/server/src/server.ts:228][E: packages/server/src/server.ts:229][E: packages/server/src/server.ts:230][E: packages/server/src/server.ts:231][E: packages/server/src/server.ts:310][E: packages/server/src/server.ts:314][E: packages/server/src/server.ts:317][E: packages/server/src/server.ts:321][E: packages/server/src/server.ts:322][E: packages/server/test/conformance.test.ts:53][E: packages/server/test/conformance.test.ts:57][E: packages/server/test/conformance.test.ts:59]

handshake 期间如果全局 server snapshot revision 已变化，server 在 hello 后再发 current `server_snapshot` event，避免新 client 固化过时 snapshot。[E: packages/server/src/server.ts:233][E: packages/server/src/server.ts:235][E: packages/server/src/server.ts:237][E: packages/server/src/server.ts:238][E: packages/server/src/server.ts:239][E: packages/server/src/server.ts:241]

## Request 与 error

ready state 对每个 request fire-and-forget `handleRequest()`；多个 async operations 可以 out-of-order 完成。response id 仅用于 request/response correlation：server 不保证完成顺序，也不强制 client request id 唯一。[E: packages/server/src/server.ts:204][E: packages/server/src/server.ts:205][E: packages/server/src/server.ts:247][E: packages/server/src/server.ts:249][E: packages/server/src/server.ts:250][E: packages/server/src/server.ts:252][I]

`PiServerError` 的 operation code 只允许 `busy`、`session_locked`、`not_found`、`invalid_request`；未知 internal error 被 server-side `onError` 观察，但 client 只收到 sanitized `invalid_request / Internal server error`。[E: packages/server/src/errors.ts:3][E: packages/server/src/errors.ts:5][E: packages/server/src/errors.ts:9][E: packages/server/src/errors.ts:10][E: packages/server/src/server.ts:346][E: packages/server/src/server.ts:347][E: packages/server/src/server.ts:352][E: packages/server/src/server.ts:355][E: packages/server/src/server.ts:356]

## Server snapshot publisher

publisher snapshot 包含 server id、protocol version、当前 revision、connection-relative sessions 与 model list；broadcast 通过 Promise tail 串行化，每次有 ready connections 时才 increment revision。[E: packages/server/src/snapshots.ts:21][E: packages/server/src/snapshots.ts:23][E: packages/server/src/snapshots.ts:24][E: packages/server/src/snapshots.ts:34][E: packages/server/src/snapshots.ts:36][E: packages/server/src/snapshots.ts:37][E: packages/server/src/snapshots.ts:38][E: packages/server/src/snapshots.ts:39][E: packages/server/src/snapshots.ts:40][E: packages/server/src/snapshots.ts:44][E: packages/server/src/snapshots.ts:45][E: packages/server/src/snapshots.ts:50][E: packages/server/src/snapshots.ts:55]

## Gotcha

- listener 数组允许为空；`PiServer` 不会自己选择 transport，常见 Unix preset 由 `subsys.server.unix-transport` 提供。[E: packages/server/src/types.ts:14][E: packages/server/src/types.ts:15][E: packages/server/src/server.ts:368][E: packages/server/src/server.ts:369]
- transport authorization 是进入 `PiServer.accept()` 前的前置条件，不是 server core 的可选第二层；如果 custom listener 未认证 network peer，protocol hello 不会补救这一缺口。[E: packages/server/README.md:42][E: packages/server/src/types.ts:14][E: packages/server/src/types.ts:15][I]
- 这个 authorization contract 由 listener 实现者负责，签名本身没有 runtime proof：`accept()` 是 public method，收到任何 `ByteConnection` 都会直接建立 decoder/handshake state。旧 custom listener 可能仍可编译但不再受 core token check 保护。[E: packages/server/src/server.ts:107][E: packages/server/src/server.ts:117][E: packages/server/src/server.ts:125][E: packages/server/src/server.ts:128][I]
- testing API 同步 breaking：`TEST_TOKEN` 不再导出，`ProtocolTestClient.hello()` 只接 optional version，`createTestServer()` 也不再提供 token default。[E: packages/server/src/testing/index.ts:1][E: packages/server/src/testing/index.ts:3][E: packages/server/src/testing/client.ts:43][E: packages/server/src/testing/client.ts:45][E: packages/server/src/testing/server.ts:5][E: packages/server/src/testing/server.ts:15][E: packages/server/src/testing/server.ts:18][E: packages/server/src/testing/server.ts:19][E: packages/server/src/testing/server.ts:23]
- runtime terminal error 不映射成 per-session protocol error event；server 记录错误并关闭所有 attached connections。[I]

## Sources

- packages/server/package.json
- packages/server/README.md
- packages/server/src/index.ts
- packages/server/src/listener.ts
- packages/server/src/connection.ts
- packages/server/src/server.ts
- packages/server/src/snapshots.ts
- packages/server/src/types.ts
- packages/server/src/errors.ts
- packages/server/src/testing/index.ts
- packages/server/src/testing/client.ts
- packages/server/src/testing/server.ts
- packages/server/test/conformance.test.ts

## 相关

- [subsys.server.live-sessions](live-sessions.md) - backend/runtime acquisition、attachment 与 disposal。
- [subsys.server.unix-transport](unix-transport.md) - Unix listener 与 preset。
- [subsys.server.protocol-adapters](protocol-adapters.md) - `pi-ai` domain object 到 wire DTO。
- [subsys.server.supervisor](supervisor.md) - 仍保留的 legacy child-process control plane。
