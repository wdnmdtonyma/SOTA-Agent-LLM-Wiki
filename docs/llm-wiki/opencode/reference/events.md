---
id: ref.events
title: 事件 catalog(GlobalBus + V2 session.next.* + ApiEvent)
kind: reference
tier: T3
v: shared
source:
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
updated: 92c70c9c3
---

> 这份节点是事件系统总账：V2 durable session events 是存储与 replay 语义，GlobalBus/API event envelope 是传输语义，两者不能混讲。

## 能回答的问题

- `session.next.*` 一共有多少 durable event、多少 ephemeral event？
- 哪些 event 会进入 event sourcing 表，哪些只是 live stream fragment？
- API/SSE 对外发出的 event envelope 是什么形状？
- V1 `message-v2.ts` 到底是 V1 消息转换还是 V2 event model？

## V2

### EventV2 基础结构

EventV2 ID 使用 `evt_` 前缀，`Payload` 形状是 `{ id,type,data,seq?,version?,location?,metadata?,replay? }`。[E: packages/core/src/event.ts:13][E: packages/core/src/event.ts:41][E: packages/core/src/event.ts:42][E: packages/core/src/event.ts:43][E: packages/core/src/event.ts:45][E: packages/core/src/event.ts:46][E: packages/core/src/event.ts:47][E: packages/core/src/event.ts:48][E: packages/core/src/event.ts:50] durable serialized 形状是 `{ id,type,seq,aggregateID,data }`。[E: packages/core/src/event.ts:61][E: packages/core/src/event.ts:62][E: packages/core/src/event.ts:63][E: packages/core/src/event.ts:64][E: packages/core/src/event.ts:65]

`EventV2.define` 会把 definition 注册进 `registry`；如果 definition 带 `sync`，还会按 `versionedType(type, version)` 注册进 `syncRegistry`，用于 JSON 边界 encode/decode。[E: packages/core/src/event.ts:121][E: packages/core/src/event.ts:123][E: packages/core/src/event.ts:125][E: packages/core/src/event.ts:127][E: packages/core/src/event.ts:128]

session events 的公共 base 是 `timestamp` 与 `sessionID`，默认 sync aggregate 是 `sessionID` version 1；step settlement 使用 version 2。[E: packages/core/src/session/event.ts:25][E: packages/core/src/session/event.ts:26][E: packages/core/src/session/event.ts:31][E: packages/core/src/session/event.ts:32][E: packages/core/src/session/event.ts:37][E: packages/core/src/session/event.ts:38]

### Durable `session.next.*` catalog

`DurableDefinitions` 明确列出 27 个 replayable/session-synchronized events。[E: packages/core/src/session/event.ts:471][E: packages/core/src/session/event.ts:498][I]

| # | Type | Key fields | Evidence |
|---:|---|---|---|
| 1 | `session.next.agent.switched` | `messageID`, `agent` | [E: packages/core/src/session/event.ts:51][E: packages/core/src/session/event.ts:55][E: packages/core/src/session/event.ts:56] |
| 2 | `session.next.model.switched` | `messageID`, `model` | [E: packages/core/src/session/event.ts:62][E: packages/core/src/session/event.ts:66][E: packages/core/src/session/event.ts:67] |
| 3 | `session.next.moved` | `location`, optional `subdirectory` | [E: packages/core/src/session/event.ts:73][E: packages/core/src/session/event.ts:77][E: packages/core/src/session/event.ts:78] |
| 4 | `session.next.prompted` | `messageID`, `prompt`, `delivery: steer|queue` | [E: packages/core/src/session/event.ts:84][E: packages/core/src/session/event.ts:88][E: packages/core/src/session/event.ts:89][E: packages/core/src/session/event.ts:90] |
| 5 | `session.next.prompt.admitted` | `messageID`, `prompt`, `delivery` | [E: packages/core/src/session/event.ts:97][E: packages/core/src/session/event.ts:101][E: packages/core/src/session/event.ts:102][E: packages/core/src/session/event.ts:103] |
| 6 | `session.next.prompt.promoted` | `messageID`, `prompt`, `timeCreated` | [E: packages/core/src/session/event.ts:109][E: packages/core/src/session/event.ts:113][E: packages/core/src/session/event.ts:114][E: packages/core/src/session/event.ts:115] |
| 7 | `session.next.interrupt.requested` | base only | [E: packages/core/src/session/event.ts:122][E: packages/core/src/session/event.ts:124] |
| 8 | `session.next.context.updated` | `messageID`, `text` | [E: packages/core/src/session/event.ts:129][E: packages/core/src/session/event.ts:133][E: packages/core/src/session/event.ts:134] |
| 9 | `session.next.synthetic` | `messageID`, `text` | [E: packages/core/src/session/event.ts:140][E: packages/core/src/session/event.ts:144][E: packages/core/src/session/event.ts:145] |
| 10 | `session.next.shell.started` | `messageID`, `callID`, `command` | [E: packages/core/src/session/event.ts:152][E: packages/core/src/session/event.ts:156][E: packages/core/src/session/event.ts:157][E: packages/core/src/session/event.ts:158] |
| 11 | `session.next.shell.ended` | `callID`, `output` | [E: packages/core/src/session/event.ts:164][E: packages/core/src/session/event.ts:168][E: packages/core/src/session/event.ts:169] |
| 12 | `session.next.step.started` | `assistantMessageID`, `agent`, `model`, optional `snapshot` | [E: packages/core/src/session/event.ts:177][E: packages/core/src/session/event.ts:181][E: packages/core/src/session/event.ts:182][E: packages/core/src/session/event.ts:183][E: packages/core/src/session/event.ts:184] |
| 13 | `session.next.step.ended` | `assistantMessageID`, `finish`, `cost`, `tokens`, optional `snapshot` | [E: packages/core/src/session/event.ts:190][E: packages/core/src/session/event.ts:194][E: packages/core/src/session/event.ts:195][E: packages/core/src/session/event.ts:196][E: packages/core/src/session/event.ts:197][E: packages/core/src/session/event.ts:206] |
| 14 | `session.next.step.failed` | `assistantMessageID`, `error` | [E: packages/core/src/session/event.ts:212][E: packages/core/src/session/event.ts:216][E: packages/core/src/session/event.ts:217] |
| 15 | `session.next.text.started` | `assistantMessageID`, `textID` | [E: packages/core/src/session/event.ts:225][E: packages/core/src/session/event.ts:229][E: packages/core/src/session/event.ts:230] |
| 16 | `session.next.text.ended` | `assistantMessageID`, `textID`, `text` | [E: packages/core/src/session/event.ts:248][E: packages/core/src/session/event.ts:252][E: packages/core/src/session/event.ts:253][E: packages/core/src/session/event.ts:254] |
| 17 | `session.next.tool.input.started` | `assistantMessageID`, `callID`, `name` | [E: packages/core/src/session/event.ts:308][E: packages/core/src/session/event.ts:311][E: packages/core/src/session/event.ts:312] |
| 18 | `session.next.tool.input.ended` | `assistantMessageID`, `callID`, `text` | [E: packages/core/src/session/event.ts:328][E: packages/core/src/session/event.ts:331][E: packages/core/src/session/event.ts:332] |
| 19 | `session.next.tool.called` | `assistantMessageID`, `callID`, `tool`, `input`, `provider` | [E: packages/core/src/session/event.ts:339][E: packages/core/src/session/event.ts:342][E: packages/core/src/session/event.ts:343][E: packages/core/src/session/event.ts:344][E: packages/core/src/session/event.ts:345] |
| 20 | `session.next.tool.progress` | `assistantMessageID`, `callID`, `structured`, `content` | [E: packages/core/src/session/event.ts:358][E: packages/core/src/session/event.ts:361][E: packages/core/src/session/event.ts:362][E: packages/core/src/session/event.ts:363] |
| 21 | `session.next.tool.success` | `assistantMessageID`, `callID`, `structured`, `content`, optional `outputPaths`, optional `result`, `provider` | [E: packages/core/src/session/event.ts:369][E: packages/core/src/session/event.ts:372][E: packages/core/src/session/event.ts:373][E: packages/core/src/session/event.ts:374][E: packages/core/src/session/event.ts:375][E: packages/core/src/session/event.ts:376][E: packages/core/src/session/event.ts:377] |
| 22 | `session.next.tool.failed` | `assistantMessageID`, `callID`, `error`, optional `result`, `provider` | [E: packages/core/src/session/event.ts:386][E: packages/core/src/session/event.ts:389][E: packages/core/src/session/event.ts:390][E: packages/core/src/session/event.ts:391][E: packages/core/src/session/event.ts:392] |
| 23 | `session.next.reasoning.started` | `assistantMessageID`, `reasoningID`, optional `providerMetadata` | [E: packages/core/src/session/event.ts:262][E: packages/core/src/session/event.ts:266][E: packages/core/src/session/event.ts:267][E: packages/core/src/session/event.ts:268] |
| 24 | `session.next.reasoning.ended` | `assistantMessageID`, `reasoningID`, `text`, optional `providerMetadata` | [E: packages/core/src/session/event.ts:286][E: packages/core/src/session/event.ts:290][E: packages/core/src/session/event.ts:291][E: packages/core/src/session/event.ts:292][E: packages/core/src/session/event.ts:293] |
| 25 | `session.next.retried` | `attempt`, `error` | [E: packages/core/src/session/event.ts:414][E: packages/core/src/session/event.ts:418][E: packages/core/src/session/event.ts:419] |
| 26 | `session.next.compaction.started` | `messageID`, `reason: auto|manual` | [E: packages/core/src/session/event.ts:426][E: packages/core/src/session/event.ts:430][E: packages/core/src/session/event.ts:431] |
| 27 | `session.next.compaction.ended` | `messageID`, `reason`, `text`, `recent`; sync version 2 | [E: packages/core/src/session/event.ts:458][E: packages/core/src/session/event.ts:459][E: packages/core/src/session/event.ts:462][E: packages/core/src/session/event.ts:463][E: packages/core/src/session/event.ts:464][E: packages/core/src/session/event.ts:465] |

`session.next.compaction.ended` 还有一个 `EndedV1` decoder 留在源码里，但 `DurableDefinitions` 数组只放入 `Compaction.Ended`，没有放入 `Compaction.EndedV1`。[E: packages/core/src/session/event.ts:447][E: packages/core/src/session/event.ts:448][E: packages/core/src/session/event.ts:471][E: packages/core/src/session/event.ts:498]

### Ephemeral session events

`EphemeralDefinitions` 只有 4 个：`session.next.text.delta`、`session.next.tool.input.delta`、`session.next.reasoning.delta`、`session.next.compaction.delta`。[E: packages/core/src/session/event.ts:500]

| Type | Key fields | Evidence |
|---|---|---|
| `session.next.text.delta` | `assistantMessageID`, `textID`, `delta` | [E: packages/core/src/session/event.ts:237][E: packages/core/src/session/event.ts:240][E: packages/core/src/session/event.ts:241][E: packages/core/src/session/event.ts:242] |
| `session.next.tool.input.delta` | `assistantMessageID`, `callID`, `delta` | [E: packages/core/src/session/event.ts:319][E: packages/core/src/session/event.ts:321][E: packages/core/src/session/event.ts:322] |
| `session.next.reasoning.delta` | `assistantMessageID`, `reasoningID`, `delta` | [E: packages/core/src/session/event.ts:275][E: packages/core/src/session/event.ts:278][E: packages/core/src/session/event.ts:279][E: packages/core/src/session/event.ts:280] |
| `session.next.compaction.delta` | `messageID`, `text` | [E: packages/core/src/session/event.ts:437][E: packages/core/src/session/event.ts:440][E: packages/core/src/session/event.ts:441] |

### Commit, replay, stream

Durable event commit validates expected sync version and aggregate field before assigning or checking sequence numbers.[E: packages/core/src/event.ts:229][E: packages/core/src/event.ts:237][E: packages/core/src/event.ts:279][E: packages/core/src/event.ts:311][E: packages/core/src/event.ts:312] In the same immediate DB transaction it runs commit guards, projectors, optional commit hook, updates `event_sequence`, and inserts into `event` table with versioned type and encoded data.[E: packages/core/src/event.ts:333][E: packages/core/src/event.ts:336][E: packages/core/src/event.ts:339][E: packages/core/src/event.ts:340][E: packages/core/src/event.ts:359][E: packages/core/src/event.ts:360][E: packages/core/src/event.ts:367]

`publishEvent` only calls commit for durable events; non-durable events go straight to notify.[E: packages/core/src/event.ts:387][E: packages/core/src/event.ts:395][E: packages/core/src/event.ts:404] `replay` decodes a `SerializedEvent`, sets `replay: true`, commits the given seq/aggregate, and optionally republishes.[E: packages/core/src/event.ts:468][E: packages/core/src/event.ts:469][E: packages/core/src/event.ts:471][E: packages/core/src/event.ts:472][E: packages/core/src/event.ts:473][E: packages/core/src/event.ts:477] `aggregateEvents` streams historical rows after a cursor and then live synchronized events for the same aggregate.[E: packages/core/src/event.ts:568][E: packages/core/src/event.ts:621][E: packages/core/src/event.ts:622][E: packages/core/src/event.ts:626]

## API Event envelope

Instance event stream maps EventV2 payloads to `{ id, type, properties }`, where `properties` is `event.data`.[E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:34][E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:40] The same stream starts with `server.connected`, emits heartbeat events every 10 seconds, and uses `text/event-stream` content type.[E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:63][E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:70][E: packages/opencode/src/server/routes/instance/httpapi/handlers/event.ts:78]

Global event schema wraps routing metadata `{ directory, project?, workspace?, payload }`; `payload` can be a regular `{ id,type,properties }` event, `InstanceDisposed`, or a sync envelope.[E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:37][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:38][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:39][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:44][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:47][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:48] The sync envelope has `type: "sync"`, top-level `id`, and nested `syncEvent` with versioned type, id, seq, aggregateID, and data.[E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:22][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:23][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:25][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:26][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:27][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:28][E: packages/opencode/src/server/routes/instance/httpapi/groups/global.ts:29]

## V1

V1 no longer has a Bus service in the source areas for this node; the remaining process bus is `GlobalBus`, an EventEmitter that ensures emitted payloads get an ID from `payload.syncEvent.id` or a new `evt` ID when missing.[E: packages/opencode/src/bus/global.ts:11][E: packages/opencode/src/bus/global.ts:15][E: packages/opencode/src/bus/global.ts:16][I] `EventV2Bridge` listens to EventV2 and emits the regular `{ id,type,properties }` payload; for sync events it emits an additional `type: "sync"` payload without top-level `id`, and `GlobalBus.emit` fills that ID.[E: packages/opencode/src/event-v2-bridge.ts:38][E: packages/opencode/src/event-v2-bridge.ts:46][E: packages/opencode/src/event-v2-bridge.ts:52][E: packages/opencode/src/event-v2-bridge.ts:57][E: packages/opencode/src/event-v2-bridge.ts:58][E: packages/opencode/src/bus/global.ts:16]

`packages/opencode/src/session/message-v2.ts` is a naming trap: it imports legacy `SessionID/MessageID/PartID` from `./schema` and `SessionV1` types, plus AI SDK `convertToModelMessages`; it defines legacy message-event aliases and a non-`session.next.*` live `message.part.delta` event.[E: packages/opencode/src/session/message-v2.ts:2][E: packages/opencode/src/session/message-v2.ts:3][E: packages/opencode/src/session/message-v2.ts:23][E: packages/opencode/src/session/message-v2.ts:58][E: packages/opencode/src/session/message-v2.ts:59][E: packages/opencode/src/session/message-v2.ts:60][E: packages/opencode/src/session/message-v2.ts:62][E: packages/opencode/src/session/message-v2.ts:64][E: packages/opencode/src/session/message-v2.ts:65][E: packages/opencode/src/session/message-v2.ts:66][E: packages/opencode/src/session/message-v2.ts:71]

## Sources

- `packages/core/src/session/event.ts`
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
