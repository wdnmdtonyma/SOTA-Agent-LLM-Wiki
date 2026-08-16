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
  - packages/server/src/testing/service.ts
  - packages/server/test/conformance.test.ts
symbols:
  - PiServer
  - PiServerListener
  - PiServerOptions
  - PiServerService
  - PiSessionRuntime
related:
  - subsys.server.live-sessions
  - subsys.server.unix-transport
  - subsys.server.protocol-adapters
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: 086c32e745
---

> `PiServer` 是 `@earendil-works/pi-server` 的 transport-composable remote session core：listener 完成 transport-specific authentication/authorization 后提供 ordered byte connections，server core 负责 protocol version handshake、request dispatch、snapshot publication 与 lifecycle cleanup。[E: packages/server/src/server.ts:39][E: packages/server/src/server.ts:54][E: packages/server/src/listener.ts:4][E: packages/server/src/listener.ts:8][E: packages/server/README.md:36]

## 能回答的问题

- custom transport 如何接入 `PiServer`？
- transport authentication、protocol version 与 handshake timeout 的责任如何划分？
- listener startup/rollback 与 server close 如何收敛？
- request 是否保证按到达顺序完成？
- server snapshot revision、`SessionMetadata` 列表与 model list 如何发布？
- `PiServerService` 与 `PiSessionRuntime` 各自承担什么?

## 公开 API

package root 只 re-export errors/listener/protocol adapters/`PiServer`/service types；export subpath 是 `.`、`./testing` 与 `./unix`。没有 `./legacy`、CLI bin 或 supervisor。[E: packages/server/src/index.ts:1][E: packages/server/src/index.ts:5][E: packages/server/package.json:8][E: packages/server/package.json:13][E: packages/server/package.json:17]

README 把该包定位为 composable `PiServer`:应用提供 `PiServerService` 实现,Unix preset 是 `createUnixServer(service, { path })`。本包不提供 standalone CLI 或 coding-agent service。[E: packages/server/README.md:9][E: packages/server/README.md:12][E: packages/server/README.md:30][E: packages/server/README.md:36][E: packages/server/README.md:38]

`PiServer` 构造函数第一个参数就是 `PiServerService`;它把 service 交给 `LiveSessionManager` 与 `ServerSnapshotPublisher`。[E: packages/server/src/server.ts:54][E: packages/server/src/server.ts:61][E: packages/server/src/server.ts:70][E: packages/server/src/types.ts:55]

## Listener 与 connection contract

`PiServerListener.start(accept)` 只向 server 交付已经建立并授权的 `ByteConnection`；connection 必须公开 `closed`、ordered async `send()` 与可携 final frame 的 `close()`，handler 接收 data/close/error。WebSocket listener 可在 HTTP upgrade 校验凭据，Unix listener 则依赖 socket filesystem permissions。[E: packages/server/src/listener.ts:4][E: packages/server/src/listener.ts:8][E: packages/server/src/connection.ts:6][E: packages/server/src/connection.ts:7][E: packages/server/src/connection.ts:8][E: packages/server/src/connection.ts:9][E: packages/server/src/connection.ts:12][E: packages/server/src/connection.ts:13][E: packages/server/src/connection.ts:14][E: packages/server/src/connection.ts:15][E: packages/server/README.md:36]

connection stage 是 `awaitingHello | handshaking | ready | closing | closed`，state 同时追踪 decoder、attached session ids、handshake Promise/timeout 与 disconnect flags。[E: packages/server/src/connection.ts:20][E: packages/server/src/connection.ts:22][E: packages/server/src/connection.ts:23][E: packages/server/src/connection.ts:25][E: packages/server/src/connection.ts:26][E: packages/server/src/connection.ts:27][E: packages/server/src/connection.ts:28][E: packages/server/src/connection.ts:30][E: packages/server/src/connection.ts:31]

## Start 与 close

`start()` 逐个启动 configured listeners；任一 start 失败时关闭已经启动的 listeners 和 server state。server 拒绝重复/concurrent start 与 close 后 start。[E: packages/server/src/server.ts:85][E: packages/server/src/server.ts:86][E: packages/server/src/server.ts:87][E: packages/server/src/server.ts:88][E: packages/server/src/server.ts:93][E: packages/server/src/server.ts:96][E: packages/server/src/server.ts:97][E: packages/server/src/server.ts:102][E: packages/server/src/server.ts:104][E: packages/server/src/server.ts:105]

`close()` 幂等：先禁止新 accept，关闭全部 listeners/connections，再断开 session attachments 并 dispose live runtimes。[E: packages/server/src/server.ts:152][E: packages/server/src/server.ts:153][E: packages/server/src/server.ts:154][E: packages/server/src/server.ts:159][E: packages/server/src/server.ts:163][E: packages/server/src/server.ts:165][E: packages/server/src/server.ts:330][E: packages/server/src/server.ts:336][E: packages/server/src/server.ts:337][E: packages/server/src/server.ts:339]

## Handshake

accept 时创建 `ClientMessageDecoder` 与默认 5-second timeout；first client message 必须是 hello。[E: packages/server/src/server.ts:35][E: packages/server/src/server.ts:122][E: packages/server/src/server.ts:123][E: packages/server/src/server.ts:128][E: packages/server/src/server.ts:133][E: packages/server/src/server.ts:135][E: packages/server/src/server.ts:185][E: packages/server/src/server.ts:186][E: packages/server/src/server.ts:187][E: packages/server/src/server.ts:190]

server core 不再读取 token；`PiServerOptions` 也没有 credential field。它只要求 version 由 protocol helper 接受；version/invalid handshake 失败时编码 final `hello_error` frame、close 并 disconnect，成功 hello 携 connection id 与 connection-relative server snapshot。[E: packages/server/src/types.ts:14][E: packages/server/src/types.ts:15][E: packages/server/src/types.ts:16][E: packages/server/src/types.ts:18][E: packages/server/src/server.ts:221][E: packages/server/src/server.ts:222][E: packages/server/src/server.ts:223][E: packages/server/src/server.ts:224][E: packages/server/src/server.ts:225][E: packages/server/src/server.ts:225][E: packages/server/src/server.ts:232][E: packages/server/src/server.ts:233][E: packages/server/src/server.ts:234][E: packages/server/src/server.ts:235][E: packages/server/src/server.ts:236][E: packages/server/src/server.ts:315][E: packages/server/src/server.ts:319][E: packages/server/src/server.ts:322][E: packages/server/src/server.ts:326][E: packages/server/src/server.ts:327][E: packages/server/test/conformance.test.ts:53][E: packages/server/test/conformance.test.ts:57][E: packages/server/test/conformance.test.ts:59]

handshake 期间如果全局 server snapshot revision 已变化，server 在 hello 后再发 current `server_snapshot` event，避免新 client 固化过时 snapshot。[E: packages/server/src/server.ts:238][E: packages/server/src/server.ts:240][E: packages/server/src/server.ts:242][E: packages/server/src/server.ts:238][E: packages/server/src/server.ts:244][E: packages/server/src/server.ts:246]

## Request 与 error

ready state 对每个 request fire-and-forget `handleRequest()`；多个 async operations 可以 out-of-order 完成。response id 仅用于 request/response correlation：server 不保证完成顺序，也不强制 client request id 唯一。[E: packages/server/src/server.ts:209][E: packages/server/src/server.ts:210][E: packages/server/src/server.ts:252][E: packages/server/src/server.ts:254][E: packages/server/src/server.ts:255][E: packages/server/src/server.ts:257][I]

`PiServerError` 的 operation code 只允许 `busy`、`session_locked`、`not_found`、`invalid_request`；未知 internal error 被 server-side `onError` 观察，但 client 只收到 sanitized `invalid_request / Internal server error`。[E: packages/server/src/errors.ts:3][E: packages/server/src/errors.ts:5][E: packages/server/src/errors.ts:12][E: packages/server/src/errors.ts:13][E: packages/server/src/server.ts:351][E: packages/server/src/server.ts:356][E: packages/server/src/server.ts:364][E: packages/server/src/server.ts:367][E: packages/server/src/server.ts:356]

## Server snapshot publisher

publisher snapshot 包含 server id、protocol version、当前 revision、`SessionMetadata[]` sessions 与 model list；`sessions` 来自 `listSessions()` 回调(live manager 的 `listMetadata()`)。broadcast 通过 Promise tail 串行化，每次有 ready connections 时才 increment revision。[E: packages/server/src/snapshots.ts:16][E: packages/server/src/snapshots.ts:34][E: packages/server/src/snapshots.ts:39][E: packages/server/src/snapshots.ts:40][E: packages/server/src/snapshots.ts:44][E: packages/server/src/snapshots.ts:55]

## Gotcha

- listener 数组允许为空；`PiServer` 不会自己选择 transport，常见 Unix preset 由 `subsys.server.unix-transport` 提供。[E: packages/server/src/types.ts:14][E: packages/server/src/types.ts:15][E: packages/server/src/server.ts:380][E: packages/server/src/server.ts:381]
- transport authorization 是进入 `PiServer.accept()` 前的前置条件，不是 server core 的可选第二层；如果 custom listener 未认证 network peer，protocol hello 不会补救这一缺口。[E: packages/server/README.md:36][E: packages/server/src/types.ts:14][E: packages/server/src/types.ts:15][I]
- 这个 authorization contract 由 listener 实现者负责，签名本身没有 runtime proof：`accept()` 是 public method，收到任何 `ByteConnection` 都会直接建立 decoder/handshake state。旧 custom listener 可能仍可编译但不再受 core token check 保护。[E: packages/server/src/server.ts:112][E: packages/server/src/server.ts:122][E: packages/server/src/server.ts:130][E: packages/server/src/server.ts:133][I]
- testing helper 已 rename:`@earendil-works/pi-server/testing` 导出 `TestServerService` / `TestSessionRuntime`(文件是 `testing/service.ts`),不再叫 backend。[E: packages/server/src/testing/index.ts:5][E: packages/server/src/testing/service.ts:198][E: packages/server/README.md:44]
- `PiServerService.listSessions()` 返回 protocol `SessionMetadata`,不是 acquired runtime state;可省略 `updatedAt`、`parentSessionId`、`sessionName`、`cwd`。[E: packages/server/src/types.ts:56][E: packages/server/README.md:40]
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
- packages/server/src/testing/service.ts
- packages/server/test/conformance.test.ts

## 相关

- [subsys.server.live-sessions](live-sessions.md) - `PiServerService`/runtime acquisition、attachment 与 disposal。
- [subsys.server.unix-transport](unix-transport.md) - Unix listener 与 preset。
- [subsys.server.protocol-adapters](protocol-adapters.md) - `pi-ai` domain object 到 wire DTO。
- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - `SessionMetadata`、snapshot 与 command schema。
