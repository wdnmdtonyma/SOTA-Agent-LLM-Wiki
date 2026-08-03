---
id: subsys.protocol.wire-protocol
title: 远程会话 wire protocol
kind: subsystem
tier: T2
pkg: protocol
source:
  - packages/protocol/package.json
  - packages/protocol/src/index.ts
  - packages/protocol/src/schemas.ts
  - packages/protocol/src/codec.ts
symbols:
  - PROTOCOL_VERSION
  - Command
  - ClientMessage
  - ServerMessage
  - SessionSnapshot
  - ServerSnapshot
related:
  - subsys.protocol.cbor-framing
  - subsys.client.remote-session-client
  - subsys.server.session-server
evidence: explicit
status: verified
updated: a8ee03b815
---

> `@earendil-works/pi-protocol` 定义实验性远程 Pi session 的 transport-neutral wire DTO、TypeBox runtime schema 与 validated codec；协议版本固定为 `2`，所有 object schema 都拒绝未知字段。[E: packages/protocol/package.json:2][E: packages/protocol/package.json:4][E: packages/protocol/src/schemas.ts:3][E: packages/protocol/src/schemas.ts:7][E: packages/protocol/src/schemas.ts:8]

## 能回答的问题

- client/server 握手、request/response 和 event envelope 分别是什么形状？
- 当前远程 session 支持哪些 command、result 与 error code？
- `ServerSnapshot`、`SessionSnapshot` 与 progress event 谁是权威状态？
- transcript 如何表示 user、assistant、tool 与 streaming lifecycle？
- transport 层拿到的是 JSON、CBOR payload，还是完整 frame？

## 包边界与公开面

`@earendil-works/pi-protocol` 只有 package root export；`src/index.ts` 统一 re-export CBOR、codec、framing 与 schema 模块。[E: packages/protocol/package.json:8][E: packages/protocol/package.json:9][E: packages/protocol/package.json:8][E: packages/protocol/src/index.ts:1][E: packages/protocol/src/index.ts:2][E: packages/protocol/src/index.ts:3][E: packages/protocol/src/index.ts:4] 包不提供 socket/WebSocket transport；`encodeClientMessage()`/`encodeServerMessage()` 返回完整 length-prefixed CBOR frame，增量 decoder 接受任意 fragmentation/coalescing。[E: packages/protocol/src/codec.ts:79][E: packages/protocol/src/codec.ts:79][E: packages/protocol/src/codec.ts:84][E: packages/protocol/src/codec.ts:84][E: packages/protocol/src/codec.ts:102][E: packages/protocol/src/codec.ts:106]

## 数据模型

### Transcript 与 session snapshot

`TranscriptItem` 是 user、assistant、tool 三类 item 的 union；assistant lifecycle 区分 `streaming`、`complete`、`error`、`aborted`，tool lifecycle 区分 `running`、`complete`、`error`，且 terminal progress 只能携带 terminal assistant/tool item。[E: packages/protocol/src/schemas.ts:120][E: packages/protocol/src/schemas.ts:156][E: packages/protocol/src/schemas.ts:188][E: packages/protocol/src/schemas.ts:193][E: packages/protocol/src/schemas.ts:204][E: packages/protocol/src/schemas.ts:221]

`SessionSummary` 包含 session identity、cwd、timestamps、phase、model、thinking level，以及 connection/runtime 视角的 `attached`、`locked`；`SessionSnapshot` 在 summary 上增加非负整数 revision、authoritative transcript、queued steer items 与 count。schema 不单独保证 revision 单调性，client runtime 会防止 stale snapshot 覆盖较新 cache。[E: packages/protocol/src/schemas.ts:233][E: packages/protocol/src/schemas.ts:242][E: packages/protocol/src/schemas.ts:243][E: packages/protocol/src/schemas.ts:246][E: packages/protocol/src/schemas.ts:247][E: packages/protocol/src/schemas.ts:249][E: packages/protocol/src/schemas.ts:250][E: packages/protocol/src/schemas.ts:251][E: packages/protocol/src/schemas.ts:252][I]

`ServerSnapshot` 由 `serverId`、literal protocol version、revision、session summaries 和 authenticated model metadata 组成。[E: packages/protocol/src/schemas.ts:257][E: packages/protocol/src/schemas.ts:258][E: packages/protocol/src/schemas.ts:259][E: packages/protocol/src/schemas.ts:260][E: packages/protocol/src/schemas.ts:261][E: packages/protocol/src/schemas.ts:262]

### Command 与 result catalog

| command | 输入重点 | success result |
|---|---|---|
| `list` | 无 | `sessions: SessionSummary[]` |
| `create` | optional cwd/name/model/thinkingLevel | `session: SessionSnapshot` |
| `attach` / `detach` | `sessionId` | snapshot / detached id |
| `prompt` / `steer` | `sessionId`, text | snapshot |
| `abort` | `sessionId` | snapshot |
| `set_model` | `sessionId`, model | snapshot |
| `set_thinking` | `sessionId`, thinkingLevel | snapshot |

这 9 个 command 由 `CommandSchema` 的 union 明确枚举，`CommandResultSchema` 按相同 command discriminator 返回结果；`ResultForCommand<T>` 在类型层把 request 映射到对应 result。[E: packages/protocol/src/schemas.ts:287][E: packages/protocol/src/schemas.ts:288][E: packages/protocol/src/schemas.ts:295][E: packages/protocol/src/schemas.ts:296][E: packages/protocol/src/schemas.ts:297][E: packages/protocol/src/schemas.ts:298][E: packages/protocol/src/schemas.ts:299][E: packages/protocol/src/schemas.ts:300][E: packages/protocol/src/schemas.ts:305][E: packages/protocol/src/schemas.ts:310][E: packages/protocol/src/schemas.ts:353][E: packages/protocol/src/schemas.ts:361][E: packages/protocol/src/schemas.ts:374]

当前 mutation payload 只接受 text；image 是 transcript content 类型，不是 `prompt`/`steer` command 输入字段。[E: packages/protocol/src/schemas.ts:75][E: packages/protocol/src/schemas.ts:84][E: packages/protocol/src/schemas.ts:282][E: packages/protocol/src/schemas.ts:297][E: packages/protocol/src/schemas.ts:298]

### Envelope 与 error

client 第一条消息是 `{type:"hello", version, token}`；后续消息是带 request id 的 `{type:"request", request: Command}`。[E: packages/protocol/src/schemas.ts:381][E: packages/protocol/src/schemas.ts:381][E: packages/protocol/src/schemas.ts:383][E: packages/protocol/src/schemas.ts:384][E: packages/protocol/src/schemas.ts:388][E: packages/protocol/src/schemas.ts:389][E: packages/protocol/src/schemas.ts:390][E: packages/protocol/src/schemas.ts:391][E: packages/protocol/src/schemas.ts:394]

server 第一条消息是成功 `hello` 或 `hello_error`；ready 状态使用 correlated `response` 与 uncorrelated `event`。success response 携带 `CommandResult`，failure response 携带 `ProtocolError`。[E: packages/protocol/src/schemas.ts:409][E: packages/protocol/src/schemas.ts:415][E: packages/protocol/src/schemas.ts:419][E: packages/protocol/src/schemas.ts:421][E: packages/protocol/src/schemas.ts:423][E: packages/protocol/src/schemas.ts:424][E: packages/protocol/src/schemas.ts:427][E: packages/protocol/src/schemas.ts:429][E: packages/protocol/src/schemas.ts:430][E: packages/protocol/src/schemas.ts:433][E: packages/protocol/src/schemas.ts:437]

error code catalog 是 `auth`、`version`、`busy`、`session_locked`、`not_found`、`invalid_request`。[E: packages/protocol/src/schemas.ts:266][E: packages/protocol/src/schemas.ts:267][E: packages/protocol/src/schemas.ts:268][E: packages/protocol/src/schemas.ts:269][E: packages/protocol/src/schemas.ts:270][E: packages/protocol/src/schemas.ts:271][E: packages/protocol/src/schemas.ts:272] server backend/runtime 公共错误只暴露后四个 operation code，握手层生成 `auth`/`version`；该跨包分工由 server 节点负责直证。[I]

## Snapshot 与 progress 语义

server event 只有 `server_snapshot`、`session_snapshot`、`session_progress`、`session_removed` 四类。[E: packages/protocol/src/schemas.ts:397][E: packages/protocol/src/schemas.ts:398][E: packages/protocol/src/schemas.ts:399][E: packages/protocol/src/schemas.ts:401][E: packages/protocol/src/schemas.ts:405] `TranscriptProgress` 是 normalized incremental activity，schema 注释明确声明 snapshot 才是 authoritative；client 不应把 progress 直接提交成新的 authoritative snapshot。[E: packages/protocol/src/schemas.ts:204][E: packages/protocol/src/schemas.ts:204]

`session_removed` 已进入 schema 和 client handling，但目标 server 的 event producer 只发 `server_snapshot`、`session_snapshot` 与 `session_progress`；因此不能从当前 server 实现推断存在 delete/remove command。[E: packages/protocol/src/schemas.ts:405][E: packages/protocol/src/schemas.ts:310][I]

## Gotcha

- 所有结构化 DTO object schemas 都是 strict objects；向现有 message DTO 添加未声明字段会被 runtime validation 拒绝。自由键 `JsonValue` record 不属于这一限定。[E: packages/protocol/src/schemas.ts:7][E: packages/protocol/src/schemas.ts:8]
- `parseClientMessage()` / `parseServerMessage()` 校验 already-decoded value，不解析 JSON string；失败统一抛 `ProtocolValidationError`。[E: packages/protocol/src/codec.ts:18][E: packages/protocol/src/codec.ts:41][E: packages/protocol/src/codec.ts:42][E: packages/protocol/src/codec.ts:48][E: packages/protocol/src/codec.ts:49]
- protocol version 没有协商范围；`isSupportedProtocolVersion()` 只接受整数 `2`。[E: packages/protocol/src/codec.ts:170][E: packages/protocol/src/codec.ts:171]

## 跨包边界

`subsys.client.remote-session-client` 消费这些 schemas 做握手、request correlation 与 authoritative cache；`subsys.server.session-server` 认证 hello、执行 command 并发布 snapshots；`subsys.server.protocol-adapters` 负责把 `pi-ai` domain objects 转成 wire DTO，避免 protocol package 依赖 `pi-ai`。[I]

## Sources

- packages/protocol/package.json
- packages/protocol/src/index.ts
- packages/protocol/src/schemas.ts
- packages/protocol/src/codec.ts

## 相关

- [subsys.protocol.cbor-framing](cbor-framing.md) - CBOR subset、frame limits 与 incremental decoder。
- [subsys.client.remote-session-client](../client/remote-session-client.md) - transport-neutral client 与 authoritative state cache。
- [subsys.server.session-server](../server/session-server.md) - composable listener、认证握手与 request dispatch。
