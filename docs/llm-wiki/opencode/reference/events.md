---
id: ref.events
title: 事件 catalog(GlobalBus + V2 session.next.* + ApiEvent)
kind: reference
tier: T3
v: shared
source:
  - packages/schema/src/event.ts
  - packages/schema/src/session-event.ts
  - packages/schema/src/durable-event-manifest.ts
  - packages/schema/src/event-manifest.ts
  - packages/schema/src/v1/session.ts
  - packages/core/src/session/event.ts
  - packages/core/src/event.ts
  - packages/opencode/src/session/message-v2.ts
  - packages/opencode/src/bus/global.ts
  - packages/opencode/src/event-v2-bridge.ts
  - packages/opencode/src/server/routes/instance/httpapi/
status: verified
symbols:
  - SessionEvent
  - EventV2.Payload
  - EventV2.SerializedEvent
  - GlobalBus
  - EventV2Bridge
evidence: explicit
updated: 8b68dc0d7
---

> 这份节点是事件系统总账：V2 durable session events 是存储与 replay 语义，GlobalBus/API event envelope 是传输语义，两者不能混讲。

## 能回答的问题

- `session.next.*` 一共有多少 durable event、多少 ephemeral event？
- 哪些 event 会进入 event sourcing 表，哪些只是 live stream fragment？
- API/SSE 对外发出的 event envelope 是什么形状？
- V1 `message-v2.ts` 到底是 V1 消息转换还是 V2 event model？

## V2

### EventV2 基础结构

EventV2 ID 使用 `evt_` 前缀，schema 层的 `Payload` 形状是 `{ id,type,data,durable?,location?,metadata? }`，其中 durable sequence 不在顶层，而是在 `durable: { aggregateID, seq, version }` 内。[E: packages/schema/src/event.ts:9][E: packages/schema/src/event.ts:11][E: packages/schema/src/event.ts:29][E: packages/schema/src/event.ts:33][E: packages/schema/src/event.ts:38][E: packages/schema/src/event.ts:39] durable serialized 形状是 `{ id,type,seq,aggregateID,data }`。[E: packages/core/src/event.ts:34][E: packages/core/src/event.ts:36][E: packages/core/src/event.ts:37][E: packages/core/src/event.ts:38][E: packages/core/src/event.ts:39]

`Event.define` 现在在 schema package 内构造 typed Schema，并通过 `statics` 暴露 `type`、`durable` 和 `data`；durable lookup 由 `Event.durable()` 基于 `versionedType(type, version)` 生成只读 map。[E: packages/schema/src/event.ts:42][E: packages/schema/src/event.ts:53][E: packages/schema/src/event.ts:64][E: packages/schema/src/event.ts:65][E: packages/schema/src/event.ts:66][E: packages/schema/src/event.ts:94][E: packages/schema/src/event.ts:98][E: packages/schema/src/event.ts:102][E: packages/schema/src/event.ts:104]

`packages/core/src/session/event.ts` 现在只是 re-export `@opencode-ai/schema/session-event`；session events 的真实定义在 `packages/schema/src/session-event.ts`。[E: packages/core/src/session/event.ts:1][E: packages/core/src/session/event.ts:2][E: packages/schema/src/session-event.ts:1] session events 的公共 base 是 `timestamp` 与 `sessionID`，默认 durable aggregate 是 `sessionID` version 1；step settlement 使用 version 2。[E: packages/schema/src/session-event.ts:27][E: packages/schema/src/session-event.ts:28][E: packages/schema/src/session-event.ts:29][E: packages/schema/src/session-event.ts:38][E: packages/schema/src/session-event.ts:40][E: packages/schema/src/session-event.ts:41][E: packages/schema/src/session-event.ts:44][E: packages/schema/src/session-event.ts:46][E: packages/schema/src/session-event.ts:47]

### Durable `session.next.*` catalog

`DurableDefinitions` 明确列出 28 个 replayable/session-synchronized events；`Definitions` 在 durable 列表外再加入 4 个 live-only delta event。[E: packages/schema/src/session-event.ts:448][E: packages/schema/src/session-event.ts:476][E: packages/schema/src/session-event.ts:479][E: packages/schema/src/session-event.ts:511][I]

| # | Type | Key fields | Evidence |
|---:|---|---|---|
| 1 | `session.next.agent.switched` | `messageID`, `agent` | [E: packages/schema/src/session-event.ts:55][E: packages/schema/src/session-event.ts:59][E: packages/schema/src/session-event.ts:60] |
| 2 | `session.next.model.switched` | `messageID`, `model` | [E: packages/schema/src/session-event.ts:66][E: packages/schema/src/session-event.ts:70][E: packages/schema/src/session-event.ts:71] |
| 3 | `session.next.moved` | `location`, optional `subdirectory` | [E: packages/schema/src/session-event.ts:77][E: packages/schema/src/session-event.ts:81][E: packages/schema/src/session-event.ts:82] |
| 4 | `session.next.prompted` | `messageID`, `prompt`, `delivery` | [E: packages/schema/src/session-event.ts:88][E: packages/schema/src/session-event.ts:90][E: packages/schema/src/session-event.ts:31] |
| 5 | `session.next.prompt.admitted` | `messageID`, `prompt`, `delivery` | [E: packages/schema/src/session-event.ts:95][E: packages/schema/src/session-event.ts:97][E: packages/schema/src/session-event.ts:31] |
| 6 | `session.next.context.updated` | `messageID`, `text` | [E: packages/schema/src/session-event.ts:102][E: packages/schema/src/session-event.ts:106][E: packages/schema/src/session-event.ts:107] |
| 7 | `session.next.synthetic` | `messageID`, `text` | [E: packages/schema/src/session-event.ts:113][E: packages/schema/src/session-event.ts:117][E: packages/schema/src/session-event.ts:118] |
| 8 | `session.next.shell.started` | `messageID`, `callID`, `command` | [E: packages/schema/src/session-event.ts:125][E: packages/schema/src/session-event.ts:129][E: packages/schema/src/session-event.ts:130][E: packages/schema/src/session-event.ts:131] |
| 9 | `session.next.shell.ended` | `callID`, `output` | [E: packages/schema/src/session-event.ts:137][E: packages/schema/src/session-event.ts:141][E: packages/schema/src/session-event.ts:142] |
| 10 | `session.next.step.started` | `assistantMessageID`, `agent`, `model`, optional `snapshot` | [E: packages/schema/src/session-event.ts:150][E: packages/schema/src/session-event.ts:154][E: packages/schema/src/session-event.ts:155][E: packages/schema/src/session-event.ts:156][E: packages/schema/src/session-event.ts:157] |
| 11 | `session.next.step.ended` | `assistantMessageID`, `finish`, `cost`, `tokens`, optional `snapshot`, optional `files` | [E: packages/schema/src/session-event.ts:163][E: packages/schema/src/session-event.ts:167][E: packages/schema/src/session-event.ts:168][E: packages/schema/src/session-event.ts:169][E: packages/schema/src/session-event.ts:170][E: packages/schema/src/session-event.ts:179][E: packages/schema/src/session-event.ts:180] |
| 12 | `session.next.step.failed` | `assistantMessageID`, `error` | [E: packages/schema/src/session-event.ts:186][E: packages/schema/src/session-event.ts:190][E: packages/schema/src/session-event.ts:191] |
| 13 | `session.next.text.started` | `assistantMessageID`, `textID` | [E: packages/schema/src/session-event.ts:199][E: packages/schema/src/session-event.ts:203][E: packages/schema/src/session-event.ts:204] |
| 14 | `session.next.text.ended` | `assistantMessageID`, `textID`, `text` | [E: packages/schema/src/session-event.ts:222][E: packages/schema/src/session-event.ts:226][E: packages/schema/src/session-event.ts:227][E: packages/schema/src/session-event.ts:228] |
| 15 | `session.next.tool.input.started` | `assistantMessageID`, `callID`, `name` | [E: packages/schema/src/session-event.ts:282][E: packages/schema/src/session-event.ts:274][E: packages/schema/src/session-event.ts:276][E: packages/schema/src/session-event.ts:277][E: packages/schema/src/session-event.ts:286] |
| 16 | `session.next.tool.input.ended` | `assistantMessageID`, `callID`, `text` | [E: packages/schema/src/session-event.ts:302][E: packages/schema/src/session-event.ts:274][E: packages/schema/src/session-event.ts:276][E: packages/schema/src/session-event.ts:277][E: packages/schema/src/session-event.ts:306] |
| 17 | `session.next.tool.called` | `assistantMessageID`, `callID`, `tool`, `input`, `provider` | [E: packages/schema/src/session-event.ts:313][E: packages/schema/src/session-event.ts:274][E: packages/schema/src/session-event.ts:276][E: packages/schema/src/session-event.ts:277][E: packages/schema/src/session-event.ts:317][E: packages/schema/src/session-event.ts:318][E: packages/schema/src/session-event.ts:319] |
| 18 | `session.next.tool.progress` | `assistantMessageID`, `callID`, `structured`, `content` | [E: packages/schema/src/session-event.ts:332][E: packages/schema/src/session-event.ts:274][E: packages/schema/src/session-event.ts:276][E: packages/schema/src/session-event.ts:277][E: packages/schema/src/session-event.ts:336][E: packages/schema/src/session-event.ts:337] |
| 19 | `session.next.tool.success` | `assistantMessageID`, `callID`, `structured`, `content`, optional `outputPaths`, optional `result`, `provider` | [E: packages/schema/src/session-event.ts:343][E: packages/schema/src/session-event.ts:274][E: packages/schema/src/session-event.ts:276][E: packages/schema/src/session-event.ts:277][E: packages/schema/src/session-event.ts:347][E: packages/schema/src/session-event.ts:348][E: packages/schema/src/session-event.ts:349][E: packages/schema/src/session-event.ts:350][E: packages/schema/src/session-event.ts:351] |
| 20 | `session.next.tool.failed` | `assistantMessageID`, `callID`, `error`, optional `result`, `provider` | [E: packages/schema/src/session-event.ts:360][E: packages/schema/src/session-event.ts:274][E: packages/schema/src/session-event.ts:276][E: packages/schema/src/session-event.ts:277][E: packages/schema/src/session-event.ts:364][E: packages/schema/src/session-event.ts:365][E: packages/schema/src/session-event.ts:366] |
| 21 | `session.next.reasoning.started` | `assistantMessageID`, `reasoningID`, optional `providerMetadata` | [E: packages/schema/src/session-event.ts:236][E: packages/schema/src/session-event.ts:240][E: packages/schema/src/session-event.ts:241][E: packages/schema/src/session-event.ts:242] |
| 22 | `session.next.reasoning.ended` | `assistantMessageID`, `reasoningID`, `text`, optional `providerMetadata` | [E: packages/schema/src/session-event.ts:260][E: packages/schema/src/session-event.ts:264][E: packages/schema/src/session-event.ts:265][E: packages/schema/src/session-event.ts:266][E: packages/schema/src/session-event.ts:267] |
| 23 | `session.next.retried` | `attempt`, `error` | [E: packages/schema/src/session-event.ts:388][E: packages/schema/src/session-event.ts:392][E: packages/schema/src/session-event.ts:393] |
| 24 | `session.next.compaction.started` | `messageID`, `reason: auto|manual` | [E: packages/schema/src/session-event.ts:400][E: packages/schema/src/session-event.ts:404][E: packages/schema/src/session-event.ts:405] |
| 25 | `session.next.compaction.ended` | `messageID`, `reason`, `text`, `recent` | [E: packages/schema/src/session-event.ts:421][E: packages/schema/src/session-event.ts:425][E: packages/schema/src/session-event.ts:426][E: packages/schema/src/session-event.ts:427][E: packages/schema/src/session-event.ts:428] |
| 26 | `session.next.revert.staged` | `revert` | [E: packages/schema/src/session-event.ts:436][E: packages/schema/src/session-event.ts:438] |
| 27 | `session.next.revert.cleared` | base only | [E: packages/schema/src/session-event.ts:440] |
| 28 | `session.next.revert.committed` | `messageID` | [E: packages/schema/src/session-event.ts:442][E: packages/schema/src/session-event.ts:444] |

`SessionEvent.Durable` 是 `DurableDefinitions` 的 union/tagged union，用于把 durable session event 作为一个可 decode 的 schema 类型。[E: packages/schema/src/session-event.ts:514][E: packages/schema/src/session-event.ts:515][E: packages/schema/src/session-event.ts:516]

### Ephemeral session events

当前源码没有单独导出 `EphemeralDefinitions`；`Definitions` 在 durable catalog 之外包含 4 个没有 `...options` durable 设置的 live-only delta event：`session.next.text.delta`、`session.next.tool.input.delta`、`session.next.reasoning.delta`、`session.next.compaction.delta`。[E: packages/schema/src/session-event.ts:210][E: packages/schema/src/session-event.ts:248][E: packages/schema/src/session-event.ts:292][E: packages/schema/src/session-event.ts:410][E: packages/schema/src/session-event.ts:479][E: packages/schema/src/session-event.ts:511]

| Type | Key fields | Evidence |
|---|---|---|
| `session.next.text.delta` | `assistantMessageID`, `textID`, `delta` | [E: packages/schema/src/session-event.ts:211][E: packages/schema/src/session-event.ts:214][E: packages/schema/src/session-event.ts:215][E: packages/schema/src/session-event.ts:216] |
| `session.next.tool.input.delta` | `assistantMessageID`, `callID`, `delta` | [E: packages/schema/src/session-event.ts:293][E: packages/schema/src/session-event.ts:274][E: packages/schema/src/session-event.ts:276][E: packages/schema/src/session-event.ts:277][E: packages/schema/src/session-event.ts:296] |
| `session.next.reasoning.delta` | `assistantMessageID`, `reasoningID`, `delta` | [E: packages/schema/src/session-event.ts:249][E: packages/schema/src/session-event.ts:252][E: packages/schema/src/session-event.ts:253][E: packages/schema/src/session-event.ts:254] |
| `session.next.compaction.delta` | `messageID`, `text` | [E: packages/schema/src/session-event.ts:411][E: packages/schema/src/session-event.ts:414][E: packages/schema/src/session-event.ts:415] |

### Commit, replay, stream

Durable event commit validates the durable aggregate field, rejects aggregate mismatch/divergent replay/sequence mismatch/duplicate event IDs, then assigns or checks sequence numbers.[E: packages/core/src/event.ts:217][E: packages/core/src/event.ts:219][E: packages/core/src/event.ts:228][E: packages/core/src/event.ts:262][E: packages/core/src/event.ts:284][E: packages/core/src/event.ts:294][E: packages/core/src/event.ts:295][E: packages/core/src/event.ts:309][E: packages/core/src/event.ts:310] In the same immediate DB transaction it runs projectors, optional commit hook, updates `event_sequence`, and inserts into `event` table with versioned type and encoded data.[E: packages/core/src/event.ts:240][E: packages/core/src/event.ts:320][E: packages/core/src/event.ts:323][E: packages/core/src/event.ts:324][E: packages/core/src/event.ts:336][E: packages/core/src/event.ts:343][E: packages/core/src/event.ts:344][E: packages/core/src/event.ts:351]

`publishEvent` only calls commit for durable events; non-durable events go straight to notify.[E: packages/core/src/event.ts:378][E: packages/core/src/event.ts:379][E: packages/core/src/event.ts:393] `replay` decodes a `SerializedEvent`, commits the given seq/aggregate/owner options, and optionally republishes the committed payload with `durable` metadata.[E: packages/core/src/event.ts:446][E: packages/core/src/event.ts:452][E: packages/core/src/event.ts:455][E: packages/core/src/event.ts:457][E: packages/core/src/event.ts:458][E: packages/core/src/event.ts:459][E: packages/core/src/event.ts:463][E: packages/core/src/event.ts:467] `durable()` streams historical rows after a cursor and then live durable events for the same aggregate.[E: packages/core/src/event.ts:541][E: packages/core/src/event.ts:585][E: packages/core/src/event.ts:597][E: packages/core/src/event.ts:598][E: packages/core/src/event.ts:602]

## API Event envelope

Instance event stream maps EventV2 payloads to `{ id, type, properties }`, where `properties` is `event.data`.[E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:34][E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:40] The same stream starts with `server.connected`, emits heartbeat events every 10 seconds, and uses `text/event-stream` content type.[E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:63][E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:70][E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:78]

Global event schema wraps routing metadata `{ directory, project?, workspace?, payload }`; `payload` can be a regular `{ id,type,properties }` event, `InstanceDisposed`, or a sync envelope.[E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:37][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:38][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:39][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:42][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:45][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:46] The sync envelope has `type: "sync"`, top-level `id`, and nested `syncEvent` with versioned type, id, seq, aggregateID, and data.[E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:22][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:23][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:24][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:25][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:26][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:27][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:28]

## V1

V1 no longer has a Bus service in the source areas for this node; the remaining process bus is `GlobalBus`, an EventEmitter that ensures emitted payloads get an ID from `payload.syncEvent.id` or a new `evt` ID when missing.[E: packages/opencode/src/bus/global.ts:11][E: packages/opencode/src/bus/global.ts:15][E: packages/opencode/src/bus/global.ts:16][I] `EventV2Bridge` listens to EventV2 and emits the regular `{ id,type,properties }` payload; for durable events it emits an additional `type: "sync"` payload without top-level `id`, and `GlobalBus.emit` fills that ID.[E: packages/opencode/src/event-v2-bridge.ts:35][E: packages/opencode/src/event-v2-bridge.ts:39][E: packages/opencode/src/event-v2-bridge.ts:43][E: packages/opencode/src/event-v2-bridge.ts:45][E: packages/opencode/src/event-v2-bridge.ts:46][E: packages/opencode/src/event-v2-bridge.ts:51][E: packages/opencode/src/event-v2-bridge.ts:53][E: packages/opencode/src/event-v2-bridge.ts:57][E: packages/opencode/src/bus/global.ts:16]

`packages/opencode/src/session/message-v2.ts` is a naming trap: it imports legacy `SessionID/MessageID` from `./schema` and `SessionV1` types, plus AI SDK `convertToModelMessages`; it defines legacy message-event aliases whose `PartDelta` target is the non-`session.next.*` live `message.part.delta` schema in `packages/schema/src/v1/session.ts`.[E: packages/opencode/src/session/message-v2.ts:1][E: packages/opencode/src/session/message-v2.ts:2][E: packages/opencode/src/session/message-v2.ts:20][E: packages/opencode/src/session/message-v2.ts:55][E: packages/opencode/src/session/message-v2.ts:56][E: packages/opencode/src/session/message-v2.ts:57][E: packages/opencode/src/session/message-v2.ts:58][E: packages/opencode/src/session/message-v2.ts:59][E: packages/schema/src/v1/session.ts:632][E: packages/schema/src/v1/session.ts:633]

## Sources

- `packages/core/src/session/event.ts`
- `packages/schema/src/event.ts`
- `packages/schema/src/session-event.ts`
- `packages/schema/src/durable-event-manifest.ts`
- `packages/schema/src/event-manifest.ts`
- `packages/schema/src/v1/session.ts`
- `packages/core/src/event.ts`
- `packages/core/src/event/sql.ts`
- `packages/opencode/src/bus/global.ts`
- `packages/opencode/src/event-v2-bridge.ts`
- `packages/opencode/src/session/message-v2.ts`
- `packages/opencode/src/server/routes/instance/httpapi/groups/global.ts`
- `packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts`

## 相关

- `persistence.eventing`
- `spine.v2-event-sourcing`
- `ref.db-schema`
- `ref.data-model`
