---
id: subsys.protocol.wire-protocol
title: 远程服务 routed envelope protocol
kind: subsystem
tier: T2
pkg: protocol
source:
  - packages/protocol/package.json
  - packages/protocol/README.md
  - packages/protocol/src/index.ts
  - packages/protocol/src/protocol.ts
  - packages/protocol/src/codec.ts
  - packages/protocol/test/protocol.test.ts
symbols:
  - PROTOCOL_VERSION
  - ClientMessage
  - ClientHello
  - ServerMessage
  - RpcTarget
  - SessionTarget
  - ProtocolError
  - isServerId
related:
  - subsys.protocol.cbor-framing
  - subsys.client.remote-session-client
  - subsys.server.session-server
evidence: explicit
status: verified
updated: 71dca871bc
---

> `@earendil-works/pi-protocol` 定义实验性远程 Pi 的 transport-neutral routed envelope、TypeBox runtime schema 与 validated codec。协议版本固定为 `8`。envelope object schema 拒绝未知字段；`call` / `result` / `update` 只要求 strict JSON，语义由 Chord 与应用解析 [E: packages/protocol/package.json:2] [E: packages/protocol/src/protocol.ts:5] [E: packages/protocol/src/protocol.ts:9] [E: packages/protocol/test/protocol.test.ts:30]。

## 能回答的问题

- client/server 握手、request/response、cancel、attachment、service_update 分别是什么形状？
- `RpcTarget` 的 server 形态与 Session 形态差在哪？
- protocol 还枚举 prompt/attach 等 command 吗？`SessionSnapshot` 还在吗？
- error code 是封闭枚举还是 opaque string？
- transport 层拿到的是 JSON、CBOR payload，还是完整 frame？

## 包边界与公开面

`@earendil-works/pi-protocol` 只有 package root export；`src/index.ts` re-export CBOR、codec、framing，以及 `protocol.ts` 的 envelope 类型 [E: packages/protocol/package.json:8] [E: packages/protocol/src/index.ts:1] [E: packages/protocol/src/index.ts:3]。旧 `schemas.ts` 已删除，权威 schema 在 `protocol.ts`。包不提供 socket transport；`encodeClientMessage()` / `encodeServerMessage()` 返回完整 length-prefixed CBOR frame，增量 decoder 接受任意 fragmentation/coalescing [E: packages/protocol/src/codec.ts:56] [E: packages/protocol/src/codec.ts:61] [E: packages/protocol/src/codec.ts:83] [E: packages/protocol/README.md:21]。

依赖 `@earendil-works/chord` 只为 `JsonValue` / `isJsonValue`；protocol 不 export Chord 的 `{ serviceId, member, args }` 语法 [E: packages/protocol/package.json:42] [E: packages/protocol/README.md:15]。

## 数据模型

### Handshake 与 target

`ClientHello` 是 `{ type: "hello", version: 非负整数 }`。`ServerHello` 成功时是 `{ type: "hello", version: 8, serverId }`，`serverId` 必须是 canonical lowercase UUIDv4 [E: packages/protocol/src/protocol.ts:29] [E: packages/protocol/src/protocol.ts:65] [E: packages/protocol/src/protocol.ts:12]。`isServerId()` 用同一 pattern 做 runtime 检查 [E: packages/protocol/src/protocol.ts:17]。`isSupportedProtocolVersion()` 只接受整数 `8` [E: packages/protocol/src/codec.ts:139] [E: packages/protocol/test/protocol.test.ts:30]。

`ServerTarget` = `{ serverId }`；`SessionTarget` = `{ serverId, sessionId, attachmentId }`，后两者是非空字符串。`RpcTarget` 是二者的 union [E: packages/protocol/src/protocol.ts:36] [E: packages/protocol/src/protocol.ts:40] [E: packages/protocol/src/protocol.ts:46]。

### Client / server envelopes

| 方向 | type | 关键字段 |
|---|---|---|
| client | `hello` | `version` |
| client | `request` | `id`, `target`, `call`（opaque JSON） |
| client | `cancel` | `id`, `target` |
| server | `hello` | `version: 8`, `serverId` |
| server | `hello_error` | `error: { code, message }` |
| server | `response` | `id`, `ok: true` 可选 `result`，或 `ok: false` + `error` |
| server | `service_update` | `subscriptionId`, `update`（opaque JSON） |
| server | `attachment` | `attachment: SessionTarget \| null` |

`ClientMessageSchema` / `ServerMessageSchema` 是这些 type 的 union [E: packages/protocol/src/protocol.ts:62] [E: packages/protocol/src/protocol.ts:98]。void 成功 response 可以没有 `result` 字段 [E: packages/protocol/test/protocol.test.ts:176]。`call` / `result` / `update` 在 schema 层是 `Unknown` + codec 的 `isJsonValue`；任意 application JSON 都可通过 envelope，包括非 Chord 形状 [E: packages/protocol/src/protocol.ts:8] [E: packages/protocol/src/protocol.ts:53] [E: packages/protocol/test/protocol.test.ts:67]。

`ProtocolError.code` 是 `minLength: 1` 的 string，类型别名 `ProtocolErrorCode = string`。测试接受 `wrong_server` / `cancelled` / `service_not_found` / `application_error` 等；空 code 被拒 [E: packages/protocol/src/protocol.ts:21] [E: packages/protocol/src/protocol.ts:25] [E: packages/protocol/test/protocol.test.ts:192] [E: packages/protocol/test/protocol.test.ts:187]。不再有封闭的七项 catalog，也没有 wire-level `auth` code。

协议不再定义 `Command`、`SessionSnapshot`、`SessionMetadata`、`ServerSnapshot`、`TranscriptItem` 或 `session_progress`。那些值是应用 Chord service 的 opaque payload [E: packages/protocol/README.md:17] [I]。

## Codec

`parseClientMessage()` / `parseServerMessage()` 校验 already-decoded value，不解析 JSON string；失败抛 `ProtocolValidationError` [E: packages/protocol/src/codec.ts:20] [E: packages/protocol/src/codec.ts:27] [E: packages/protocol/test/protocol.test.ts:210]。encoder 先 parse 再 CBOR + length prefix；decoder `push` 后遇到错误会标 failed，后续 push 再抛 “decoder has failed” [E: packages/protocol/src/codec.ts:56] [E: packages/protocol/src/codec.ts:88] [E: packages/protocol/test/protocol.test.ts:269]。

非 JSON opaque payload（byte array、NaN、`undefined` property、cycle）在 parse 时拒绝 [E: packages/protocol/test/protocol.test.ts:99]。

## Gotcha

- 所有 envelope object schemas 都是 `additionalProperties: false`。给 hello/request 加未声明字段会被拒。自由 JSON 只允许出现在 `call` / `result` / `update` [E: packages/protocol/src/protocol.ts:9] [E: packages/protocol/test/protocol.test.ts:45]。
- protocol version 没有协商范围：client hello 可带任意非负整数供 server 判断，但 `isSupportedProtocolVersion()` 与 `ServerHello.version` 只认 `8` [E: packages/protocol/src/protocol.ts:31] [E: packages/protocol/src/protocol.ts:67] [E: packages/protocol/src/codec.ts:139] [E: packages/protocol/test/protocol.test.ts:37]。
- 旧 version-1 command/snapshot client 与现行 version-8 envelope 不兼容；上游不给兼容保证 [E: packages/protocol/README.md:41] [I]。
- peer authentication 不是本包的职责。Unix 可靠 filesystem ACL；网络 transport 必须在交换 protocol bytes 前完成认证 [E: packages/protocol/README.md:39]。
- `ModelMetadata.authenticated` / transcript DTO 已不在 protocol 包。不要把 Chord service 字段误写成 wire schema [I]。

## 跨包边界

`subsys.client.remote-session-client` 用这些 envelope 做 version handshake、`serverId` 校验、request/cancel correlation 与 attachment 缓存。`subsys.server.session-server` 在 listener 交付已授权 connection 后校验 hello version，把 `call` 交给 Chord `parseServiceCall`，再路由到 server 或 Session attachment。`subsys.server.protocol-adapters` 说明 pi-ai DTO mapper 已删除，载荷语义在 Chord/应用边界。

## Sources

- packages/protocol/package.json
- packages/protocol/README.md
- packages/protocol/src/index.ts
- packages/protocol/src/protocol.ts
- packages/protocol/src/codec.ts
- packages/protocol/test/protocol.test.ts

## 相关

- [subsys.protocol.cbor-framing](cbor-framing.md) - CBOR subset、frame limits 与 incremental decoder。
- [subsys.client.remote-session-client](../client/remote-session-client.md) - transport-neutral `Client` 与 Chord service 调用。
- [subsys.server.session-server](../server/session-server.md) - composable listener、version handshake 与 request dispatch。
