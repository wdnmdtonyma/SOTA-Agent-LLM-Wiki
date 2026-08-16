---
id: subsys.protocol.wire-protocol
title: 远程会话 wire protocol
kind: subsystem
tier: T2
pkg: protocol
source:
  - packages/protocol/package.json
  - packages/protocol/README.md
  - packages/protocol/src/index.ts
  - packages/protocol/src/schemas.ts
  - packages/protocol/src/codec.ts
  - packages/protocol/test/protocol.test.ts
symbols:
  - PROTOCOL_VERSION
  - Command
  - ClientMessage
  - ClientHello
  - ServerMessage
  - ProtocolErrorCode
  - SessionSnapshot
  - SessionMetadata
  - ServerSnapshot
related:
  - subsys.protocol.cbor-framing
  - subsys.client.remote-session-client
  - subsys.server.session-server
evidence: explicit
status: verified
updated: 086c32e745
---

> `@earendil-works/pi-protocol` 定义实验性远程 Pi session 的 transport-neutral wire DTO、TypeBox runtime schema 与 validated codec；协议版本固定为 `1`，所有结构化 DTO object schema 都拒绝未知字段。[E: packages/protocol/package.json:2][E: packages/protocol/package.json:4][E: packages/protocol/src/schemas.ts:3][E: packages/protocol/src/schemas.ts:7][E: packages/protocol/src/schemas.ts:8][E: packages/protocol/test/protocol.test.ts:55][E: packages/protocol/test/protocol.test.ts:56]

## 能回答的问题

- client/server 握手、request/response 和 event envelope 分别是什么形状？
- 当前远程 session 支持哪些 command、result 与 error code？
- `ServerSnapshot`、`SessionMetadata`、`SessionSnapshot` 与 progress event 谁是权威状态？
- transcript 如何表示 user、assistant、tool 与 streaming lifecycle？
- transport 层拿到的是 JSON、CBOR payload，还是完整 frame？

## 包边界与公开面

`@earendil-works/pi-protocol` 只有 package root export；`src/index.ts` 统一 re-export CBOR、codec、framing 与 schema 模块。[E: packages/protocol/package.json:8][E: packages/protocol/package.json:9][E: packages/protocol/package.json:8][E: packages/protocol/src/index.ts:1][E: packages/protocol/src/index.ts:2][E: packages/protocol/src/index.ts:3][E: packages/protocol/src/index.ts:4] 包不提供 socket/WebSocket transport；`encodeClientMessage()`/`encodeServerMessage()` 返回完整 length-prefixed CBOR frame，增量 decoder 接受任意 fragmentation/coalescing。[E: packages/protocol/src/codec.ts:79][E: packages/protocol/src/codec.ts:79][E: packages/protocol/src/codec.ts:84][E: packages/protocol/src/codec.ts:84][E: packages/protocol/src/codec.ts:102][E: packages/protocol/src/codec.ts:106]

## 数据模型

### Transcript 与 session snapshot

`TranscriptItem` 是 user、assistant、tool 三类 item 的 union；assistant lifecycle 区分 `streaming`、`complete`、`error`、`aborted`，tool lifecycle 区分 `running`、`complete`、`error`，且 terminal progress 只能携带 terminal assistant/tool item。[E: packages/protocol/src/schemas.ts:120][E: packages/protocol/src/schemas.ts:156][E: packages/protocol/src/schemas.ts:188][E: packages/protocol/src/schemas.ts:193][E: packages/protocol/src/schemas.ts:204][E: packages/protocol/src/schemas.ts:221]

`SessionMetadata` 是 durable list 条目：必填只有 `id` 与 `createdAt`；`updatedAt`、`parentSessionId`、`sessionName`、`cwd` 按 backing store 能力可选。它不再携带 phase、model、thinking level、`attached`、`locked` 这些 runtime 字段。[E: packages/protocol/src/schemas.ts:233][E: packages/protocol/src/schemas.ts:234][E: packages/protocol/src/schemas.ts:235][E: packages/protocol/src/schemas.ts:236][E: packages/protocol/src/schemas.ts:237][E: packages/protocol/src/schemas.ts:238][E: packages/protocol/src/schemas.ts:239][E: packages/protocol/README.md:12] `SessionSnapshot` 是 acquired session 的权威状态：identity、cwd、timestamps、phase、model、thinking level、`attached`、`locked`、非负整数 revision、transcript、queued steer items 与 count。schema 不单独保证 revision 单调性，client runtime 会防止 stale snapshot 覆盖较新 cache。[E: packages/protocol/src/schemas.ts:241][E: packages/protocol/src/schemas.ts:247][E: packages/protocol/src/schemas.ts:250][E: packages/protocol/src/schemas.ts:251][E: packages/protocol/src/schemas.ts:252][E: packages/protocol/src/schemas.ts:253][E: packages/protocol/src/schemas.ts:254][E: packages/protocol/src/schemas.ts:255][I]

`ServerSnapshot` 由 `serverId`、literal protocol version、revision、`SessionMetadata[]` 和 authenticated model metadata 组成。[E: packages/protocol/src/schemas.ts:260][E: packages/protocol/src/schemas.ts:261][E: packages/protocol/src/schemas.ts:262][E: packages/protocol/src/schemas.ts:263][E: packages/protocol/src/schemas.ts:264][E: packages/protocol/src/schemas.ts:265]

### Command 与 result catalog

| command | 输入重点 | success result |
|---|---|---|
| `list` | 无 | `sessions: SessionMetadata[]` |
| `create` | optional cwd/name/model/thinkingLevel | `session: SessionSnapshot` |
| `attach` / `detach` | `sessionId` | snapshot / detached id |
| `prompt` / `steer` | `sessionId`, text | snapshot |
| `abort` | `sessionId` | snapshot |
| `set_model` | `sessionId`, model | snapshot |
| `set_thinking` | `sessionId`, thinkingLevel | snapshot |

这 9 个 command 由 `CommandSchema` 的 union 明确枚举，`CommandResultSchema` 按相同 command discriminator 返回结果；`ResultForCommand<T>` 在类型层把 request 映射到对应 result。[E: packages/protocol/src/schemas.ts:291][E: packages/protocol/src/schemas.ts:292][E: packages/protocol/src/schemas.ts:299][E: packages/protocol/src/schemas.ts:300][E: packages/protocol/src/schemas.ts:301][E: packages/protocol/src/schemas.ts:302][E: packages/protocol/src/schemas.ts:303][E: packages/protocol/src/schemas.ts:304][E: packages/protocol/src/schemas.ts:309][E: packages/protocol/src/schemas.ts:314][E: packages/protocol/src/schemas.ts:357][E: packages/protocol/src/schemas.ts:365][E: packages/protocol/src/schemas.ts:378]

当前 mutation payload 只接受 text；image 是 transcript content 类型，不是 `prompt`/`steer` command 输入字段。[E: packages/protocol/src/schemas.ts:75][E: packages/protocol/src/schemas.ts:84][E: packages/protocol/src/schemas.ts:286][E: packages/protocol/src/schemas.ts:301][E: packages/protocol/src/schemas.ts:302]

### Envelope 与 error

client 第一条消息是仅含 `{type:"hello", version}` 的 strict DTO；后续消息是带 request id 的 `{type:"request", request: Command}`。credential 不再属于 wire hello，携 `token` 反而会被 strict validation 拒绝；transport 必须在交换 protocol bytes 前完成认证。[E: packages/protocol/src/schemas.ts:385][E: packages/protocol/src/schemas.ts:386][E: packages/protocol/src/schemas.ts:387][E: packages/protocol/src/schemas.ts:391][E: packages/protocol/src/schemas.ts:392][E: packages/protocol/src/schemas.ts:393][E: packages/protocol/src/schemas.ts:394][E: packages/protocol/src/schemas.ts:397][E: packages/protocol/README.md:10][E: packages/protocol/test/protocol.test.ts:73][E: packages/protocol/test/protocol.test.ts:75][E: packages/protocol/test/protocol.test.ts:76]

server 第一条消息是成功 `hello` 或 `hello_error`；ready 状态使用 correlated `response` 与 uncorrelated `event`。success response 携带 `CommandResult`，failure response 携带 `ProtocolError`。[E: packages/protocol/src/schemas.ts:412][E: packages/protocol/src/schemas.ts:418][E: packages/protocol/src/schemas.ts:422][E: packages/protocol/src/schemas.ts:424][E: packages/protocol/src/schemas.ts:426][E: packages/protocol/src/schemas.ts:427][E: packages/protocol/src/schemas.ts:430][E: packages/protocol/src/schemas.ts:432][E: packages/protocol/src/schemas.ts:433][E: packages/protocol/src/schemas.ts:436][E: packages/protocol/src/schemas.ts:440]

error code catalog 是 `version`、`busy`、`session_locked`、`not_found`、`invalid_request`、`not_implemented`、`internal_error` 七项；wire-level `auth` code 已删除，因为认证失败发生在 transport establishment、进入 protocol 前。[E: packages/protocol/src/schemas.ts:269][E: packages/protocol/src/schemas.ts:270][E: packages/protocol/src/schemas.ts:271][E: packages/protocol/src/schemas.ts:272][E: packages/protocol/src/schemas.ts:273][E: packages/protocol/src/schemas.ts:274][E: packages/protocol/src/schemas.ts:275][E: packages/protocol/src/schemas.ts:276][E: packages/protocol/README.md:10]

## Snapshot 与 progress 语义

server event 只有 `server_snapshot`、`session_snapshot`、`session_progress`、`session_removed` 四类。[E: packages/protocol/src/schemas.ts:400][E: packages/protocol/src/schemas.ts:401][E: packages/protocol/src/schemas.ts:402][E: packages/protocol/src/schemas.ts:404][E: packages/protocol/src/schemas.ts:408] `TranscriptProgress` 是 normalized incremental activity，schema 注释明确声明 snapshot 才是 authoritative；client 不应把 progress 直接提交成新的 authoritative snapshot。[E: packages/protocol/src/schemas.ts:204][E: packages/protocol/src/schemas.ts:204]

`session_removed` 已进入 schema 和 client handling，但目标 server 的 event producer 只发 `server_snapshot`、`session_snapshot` 与 `session_progress`；因此不能从当前 server 实现推断存在 delete/remove command。[E: packages/protocol/src/schemas.ts:408][E: packages/protocol/src/schemas.ts:314][I]

## Gotcha

- 所有结构化 DTO object schemas 都是 strict objects；向现有 message DTO 添加未声明字段会被 runtime validation 拒绝。自由键 `JsonValue` record 不属于这一限定。[E: packages/protocol/src/schemas.ts:7][E: packages/protocol/src/schemas.ts:8]
- `parseClientMessage()` / `parseServerMessage()` 校验 already-decoded value，不解析 JSON string；失败统一抛 `ProtocolValidationError`。[E: packages/protocol/src/codec.ts:18][E: packages/protocol/src/codec.ts:41][E: packages/protocol/src/codec.ts:42][E: packages/protocol/src/codec.ts:48][E: packages/protocol/src/codec.ts:49]
- protocol version 没有协商范围；`ClientHelloSchema` 接受非负整数供 server 判断，但 `isSupportedProtocolVersion()` 只接受整数 `1`。[E: packages/protocol/src/schemas.ts:387][E: packages/protocol/src/codec.ts:170][E: packages/protocol/src/codec.ts:171][E: packages/protocol/test/protocol.test.ts:55][E: packages/protocol/test/protocol.test.ts:57][E: packages/protocol/test/protocol.test.ts:58]
- protocol DTO 不再承载 credentials；network transport 可在连接建立/upgrade 时认证，Unix transport 可依赖 endpoint access controls。把 bearer token 塞回 `hello` 不是向后兼容扩展，而是 strict-schema error。[E: packages/protocol/README.md:10][E: packages/protocol/README.md:50][E: packages/protocol/test/protocol.test.ts:73][E: packages/protocol/test/protocol.test.ts:76]
- 这是 experimental lockstep 变更：旧 `{version:2, token}` client 会先因 extra credential field 被新 strict schema 拒绝，bare version `2` 才进入 version mismatch；新 version-1/tokenless client 也不满足旧 version-2/token server。上游明确不给兼容保证。[E: packages/protocol/test/protocol.test.ts:55][E: packages/protocol/test/protocol.test.ts:58][E: packages/protocol/test/protocol.test.ts:73][E: packages/protocol/test/protocol.test.ts:76][E: packages/protocol/README.md:69][I]
- `ModelMetadata.authenticated` 仍然是 model metadata 中的 boolean field；它没有因为 session connection auth 移出 protocol 而删除，不能与 peer authentication 混为同一个字段。[E: packages/protocol/src/schemas.ts:60][E: packages/protocol/src/schemas.ts:71][I]

## 跨包边界

`subsys.client.remote-session-client` 消费这些 schemas 做 version handshake、request correlation 与 authoritative cache；`subsys.server.session-server` 只接受 listener 已建立并授权的 connection，再校验 hello version、执行 command 并发布 snapshots；`subsys.server.protocol-adapters` 负责把 `pi-ai` domain objects 转成 wire DTO，避免 protocol package 依赖 `pi-ai`。[E: packages/protocol/README.md:10][I]

## Sources

- packages/protocol/package.json
- packages/protocol/README.md
- packages/protocol/src/index.ts
- packages/protocol/src/schemas.ts
- packages/protocol/src/codec.ts
- packages/protocol/test/protocol.test.ts

## 相关

- [subsys.protocol.cbor-framing](cbor-framing.md) - CBOR subset、frame limits 与 incremental decoder。
- [subsys.client.remote-session-client](../client/remote-session-client.md) - transport-neutral client 与 authoritative state cache。
- [subsys.server.session-server](../server/session-server.md) - composable listener、version handshake 与 request dispatch。
