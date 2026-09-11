---
id: subsys.server.protocol-adapters
title: Chord 服务载荷与 envelope 边界
kind: subsystem
tier: T2
pkg: server
source:
  - packages/server/src/server.ts
  - packages/server/src/errors.ts
  - packages/protocol/src/protocol.ts
  - packages/protocol/src/codec.ts
  - packages/server/test/conformance.test.ts
  - packages/server/test/protocol.test.ts
symbols:
  - parseServiceCall
  - decodeServiceControlCall
  - createServiceStateEncoder
  - ServerError
related:
  - subsys.server.session-server
  - subsys.server.live-sessions
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: bbb61e34aa
---

> 旧的 `packages/server/src/protocol.ts` pi-ai DTO adapter（`toProtocolJsonValue` / `toProtocolAssistantMessage` 等）已删除。现行 anti-corruption 层是：`pi-protocol` 只校验 routed envelope + strict JSON；server 用 Chord 解析 `$chord.service` 控制词汇并编码 subscription snapshot/update；应用 payload 保持 opaque [E: packages/protocol/src/codec.ts:21] [E: packages/server/src/server.ts:318] [E: packages/server/src/server.ts:332]。

## 能回答的问题

- 为什么 protocol package 不直接复用 `pi-ai` types？
- `toProtocol*` helpers 还在吗？transcript/model 谁映射到 wire？
- envelope 合法但 `call` 不是 Chord `ServiceCall` 时发生什么？
- 未知 Error 与 `ServerError` / `RemoteServiceError` 如何变成 protocol error？
- subscribe 的 snapshot/update 在哪一层编码？

## 退役的 pi-ai mapper

`packages/server/src/protocol.ts` 与其中的 `ExactKeys` drift guards、`sanitizeProtocolDetails`、assistant `stopReason` → status 映射、`toProtocolToolResultMessage` 都不存在。`packages/server/src/index.ts` 只 re-export errors / listener / `Server` / types [E: packages/server/src/index.ts:1] [E: packages/server/src/index.ts:3]。server 的 `package.json` 依赖 chord、agent-core、protocol，不再依赖 `pi-ai` [E: packages/server/package.json:50]。

transcript / models / session directory 作为普通 Chord service 观察值传输；server 不拥有这些业务 schema [E: packages/server/README.md:13]。item id、usage、thinking level 不再由 server adapter 生成。

## Envelope vs Chord 载荷

`protocol.ts` 把 `call` / `result` / `update` 标成 `OpaqueJsonValueSchema`（`Type.Unknown`），codec 再用 Chord `isJsonValue()` 拒绝 NaN、cycle、byte array、`undefined` [E: packages/protocol/src/protocol.ts:8] [E: packages/protocol/src/protocol.ts:53] [E: packages/protocol/src/codec.ts:21]。envelope 合法并不表示 `call` 是 Chord `ServiceCall`。

`Server.handleRequest` 对 `envelope.call` 调 `parseServiceCall()`；失败立即 `invalid_request` / `Invalid service call`，不碰 host [E: packages/server/src/server.ts:316] [E: packages/server/src/server.ts:318] [E: packages/server/src/server.ts:324]。conformance 用 `{ arbitrary: true }` 锁住这条路径 [E: packages/server/test/conformance.test.ts:90] [E: packages/server/test/conformance.test.ts:99]。

`decodeServiceControlCall(call)` 识别 subscribe/unsubscribe。subscribe 用 `createServiceStateEncoder()` 把 host 返回的 snapshot 编成 wire JSON，并按 `subscriptionId` 缓存 encoder；后续 `publish` 走 `encodeUpdate` 再发 `service_update` [E: packages/server/src/server.ts:332] [E: packages/server/src/server.ts:361] [E: packages/server/src/server.ts:363] [E: packages/server/src/server.ts:445]。unsubscribe 删除 encoder [E: packages/server/src/server.ts:365]。subscribe 若没返回 snapshot，抛 `ProtocolValidationError` [E: packages/server/src/server.ts:360]。

Session 路由只校验 `RpcTarget` attachment，不 decode 业务 args [E: packages/server/README.md:11]。opaque result 原样回到 `response.result`；host 抛普通 `Error("private adapter detail")` 时 client 只看到 sanitized `internal_error` / `Internal server error` [E: packages/server/test/conformance.test.ts:264] [E: packages/server/test/conformance.test.ts:277] [E: packages/server/src/errors.ts:11]。

## Error 边界

`toProtocolError()`：`ServerError` 与 Chord `RemoteServiceError` 透传 `code`/`message`；`ProtocolValidationError` → `invalid_request`；其余先 `onError`，再返回 `internal_error` + 固定文案 [E: packages/server/src/server.ts:512] [E: packages/server/src/server.ts:513] [E: packages/server/src/server.ts:516] [E: packages/server/src/server.ts:520]。server 操作码还包括 `wrong_server` / `session_not_found` / `session_ambiguous` / `session_not_attached` / `server_draining` [E: packages/server/src/errors.ts:3]。

handshake / framing 失败走 `hello_error`，不是 per-request adapter [E: packages/server/src/server.ts:474]。request 已成功 respond 之后的 publish/encode 失败会 `reportError` 并断开连接 [E: packages/server/src/server.ts:387]。

## Gotcha

- 不要在 server 包里找 `toProtocolUsage` / `toProtocolModelMetadata`。那些符号已删除；模型 metadata 若出现在 wire 上，也只是某个 Chord service 的 JSON [I]。
- protocol 接受任意 strict-JSON `call`，Chord `parseServiceCall` 才是 service 语法边界。只做 envelope 校验不够 [E: packages/server/src/server.ts:318] [E: packages/server/test/conformance.test.ts:90]。
- subscribe 的 snapshot 必须能被 `parseServiceSubscriptionSnapshot` 接受，再经 `ServiceStateEncoder`；这是 Chord 复制状态，不是旧 `SessionSnapshot` DTO [E: packages/server/src/server.ts:361] [E: packages/server/src/server.ts:362]。
- `packages/server/test/protocol.test.ts` 现在测 handshake/framing conformance，不再测 pi-ai field manifests [E: packages/server/test/protocol.test.ts:51]。

## Sources

- packages/server/src/server.ts
- packages/server/src/errors.ts
- packages/server/src/index.ts
- packages/server/package.json
- packages/server/README.md
- packages/protocol/src/protocol.ts
- packages/protocol/src/codec.ts
- packages/server/test/conformance.test.ts
- packages/server/test/protocol.test.ts

## 相关

- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - envelope schema 与 opaque JSON 字段。
- [subsys.server.session-server](session-server.md) - request dispatch 与 handshake。
- [subsys.server.live-sessions](live-sessions.md) - attachment 路由，不解码业务 payload。
