---
id: persistence.eventing
title: 事件系统(GlobalBus + EventV2 bridge)
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/bus/global.ts
  - packages/opencode/src/event-v2-bridge.ts
  - packages/core/src/event.ts
  - packages/schema/src/event.ts
  - packages/opencode/src/project/project.ts
  - packages/opencode/src/project/instance-store.ts
  - packages/opencode/src/worktree/index.ts
  - packages/opencode/src/cli/upgrade.ts
  - packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts
symbols:
  - GlobalBus
  - EventV2.Service
  - EventV2.define
  - EventV2Bridge.Service
related:
  - spine.v2-event-sourcing
  - ref.events
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> 事件系统节点覆盖两个同时存在的 surface：V1 host 侧只有 `GlobalBus` EventEmitter，V2 core 侧是持久 EventV2 engine，`EventV2Bridge` 把 core events 映射回 GlobalBus 兼容流。

## 能回答的问题

- V1 当前为什么是 `GlobalBus`，不是旧 `Bus` service。
- `GlobalBus` 如何给 payload 自动补 `evt_*` id。
- `EventV2.define/publish/project/replay/durable` 如何围绕 durable events 工作。
- `EventV2Bridge` 如何给 publish 注入 Instance/Location，并把 EventV2 event 重新 emit 到 GlobalBus。
- `sync/README.md` 哪些内容只是历史设计语境。

## 职责边界

本节点解释 event bus、bridge 和 core event-sourcing runtime。具体 `session.next.*` event catalog 属于 `reference/events`；V2 session projector 的消息投影属于 `subsystems/session-v2/projector`；端到端 durable event flow 属于 `spine/v2-event-sourcing`。

## V1

### GlobalBus

`GlobalBus` 是 `EventEmitter` 子类，唯一 typed event name 是 `"event"`，payload shape 是 `{ directory?, project?, workspace?, payload }`。[E: packages/opencode/src/bus/global.ts:1][E: packages/opencode/src/bus/global.ts:4][E: packages/opencode/src/bus/global.ts:5][E: packages/opencode/src/bus/global.ts:6][E: packages/opencode/src/bus/global.ts:7][E: packages/opencode/src/bus/global.ts:8][E: packages/opencode/src/bus/global.ts:11][E: packages/opencode/src/bus/global.ts:12]

`GlobalBusEmitter.emit("event", event)` 在 payload 是 object 且没有 `id` 字段时，优先使用 `event.payload.syncEvent?.id`，否则调用 `Identifier.create("evt", "ascending")` 自动生成 id。[E: packages/opencode/src/bus/global.ts:14][E: packages/opencode/src/bus/global.ts:15][E: packages/opencode/src/bus/global.ts:16] `GlobalBus` 导出的是 `new GlobalBusEmitter()` singleton。[E: packages/opencode/src/bus/global.ts:22]

本批源码读取范围内，V1 host 侧列入 Sources 的 bus implementation 是 `GlobalBus` singleton；旧 `Bus.publish/subscribe` service 不在本节点读取到的 V1 source set 中作为同级实现出现。[E: packages/opencode/src/bus/global.ts:22][I]

### V1 consumers

V1 subsystems 直接使用 GlobalBus：Project update emit、instance dispose emit、worktree failure emit、upgrade notification emit、server SSE handler `GlobalBus.on("event", handler)` 都引用 `GlobalBus`。[E: packages/opencode/src/project/project.ts:164][E: packages/opencode/src/project/instance-store.ts:81][E: packages/opencode/src/worktree/index.ts:257][E: packages/opencode/src/cli/upgrade.ts:16][E: packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts:39] 这些 consumers 说明 GlobalBus 是 V1 host 的 cross-cutting notification surface。[I]

## V2

### 数据模型

| 实体 | 字段/行为 | 证据 |
| --- | --- | --- |
| `EventV2.ID` | branded string 以 `evt_` 开头，`create()` 用 ascending identifier。 | [E: packages/schema/src/event.ts:9][E: packages/schema/src/event.ts:10][E: packages/schema/src/event.ts:11] |
| `Definition` | event definition 包含 `type`、optional `durable { version, aggregate }`、data schema。 | [E: packages/schema/src/event.ts:15][E: packages/schema/src/event.ts:19][E: packages/schema/src/event.ts:20][E: packages/schema/src/event.ts:21][E: packages/schema/src/event.ts:22][E: packages/schema/src/event.ts:24] |
| `Payload` | payload 包含 id/type/data，durable event 可带 aggregateID/seq/version，另有 location/metadata。 | [E: packages/schema/src/event.ts:29][E: packages/schema/src/event.ts:30][E: packages/schema/src/event.ts:31][E: packages/schema/src/event.ts:32][E: packages/schema/src/event.ts:33][E: packages/schema/src/event.ts:34][E: packages/schema/src/event.ts:35][E: packages/schema/src/event.ts:36][E: packages/schema/src/event.ts:38][E: packages/schema/src/event.ts:39] |
| `SerializedEvent` | durable replay row shape 是 id/type/seq/aggregateID/data。 | [E: packages/core/src/event.ts:34][E: packages/core/src/event.ts:35][E: packages/core/src/event.ts:36][E: packages/core/src/event.ts:37][E: packages/core/src/event.ts:38][E: packages/core/src/event.ts:39] |
| `EventTable` | durable synchronized events 落 `event` table，字段是 id、aggregate_id、seq、type、data，并有 aggregate seq unique index。 | [E: packages/core/src/event/sql.ts:11][E: packages/core/src/event/sql.ts:13][E: packages/core/src/event/sql.ts:14][E: packages/core/src/event/sql.ts:17][E: packages/core/src/event/sql.ts:18][E: packages/core/src/event/sql.ts:19][E: packages/core/src/event/sql.ts:22] |
| `EventSequenceTable` | 每个 aggregate 保存 latest seq 和 optional owner_id。 | [E: packages/core/src/event/sql.ts:4][E: packages/core/src/event/sql.ts:5][E: packages/core/src/event/sql.ts:6][E: packages/core/src/event/sql.ts:7] |
| `EventV2.Service` | tag 是 `@opencode/Event`，接口包含 publish、subscribe、all、durable、listen、project、replay、replayAll、remove、claim。 | [E: packages/core/src/event.ts:126][E: packages/core/src/event.ts:127][E: packages/core/src/event.ts:132][E: packages/core/src/event.ts:133][E: packages/core/src/event.ts:134][E: packages/core/src/event.ts:136][E: packages/core/src/event.ts:137][E: packages/core/src/event.ts:138][E: packages/core/src/event.ts:142][E: packages/core/src/event.ts:146][E: packages/core/src/event.ts:147][E: packages/core/src/event.ts:150] |

### EventV2.define

`EventV2.define({ type, durable?, schema })` 创建 data schema 和 payload schema，并在返回的 Schema 上附加 static `type`、optional `durable` 和 `data` metadata。[E: packages/schema/src/event.ts:42][E: packages/schema/src/event.ts:47][E: packages/schema/src/event.ts:53][E: packages/schema/src/event.ts:54][E: packages/schema/src/event.ts:58][E: packages/schema/src/event.ts:64][E: packages/schema/src/event.ts:65][E: packages/schema/src/event.ts:66][E: packages/schema/src/event.ts:67] `Event.durable(definitions)` 用 `versionedType(type, version)` 为 durable definitions 建索引，并拒绝重复 durable key。[E: packages/schema/src/event.ts:94][E: packages/schema/src/event.ts:98][E: packages/schema/src/event.ts:101][E: packages/schema/src/event.ts:102][E: packages/schema/src/event.ts:103][E: packages/schema/src/event.ts:104]

### EventV2 publish 控制流

1. `layerWith` 建立 unbounded `PubSub`：一个 all stream、aggregate-keyed durable wakeups、lazy typed streams、projector map、listeners，并取 `Database.Service`。[E: packages/core/src/event.ts:174][E: packages/core/src/event.ts:175][E: packages/core/src/event.ts:176][E: packages/core/src/event.ts:177][E: packages/core/src/event.ts:179][E: packages/core/src/event.ts:181][E: packages/core/src/event.ts:182]
2. `publish(definition, data, options?)` 读取 optional `Location.Service`，优先使用 options.location，否则从 service location 派生 location ref。[E: packages/core/src/event.ts:419][E: packages/core/src/event.ts:421][E: packages/core/src/event.ts:423][E: packages/core/src/event.ts:425]
3. publish 构造 payload：id 默认 `ID.create()`，metadata/location 按 options 和 service location 附加。[E: packages/core/src/event.ts:430][E: packages/core/src/event.ts:431][E: packages/core/src/event.ts:432][E: packages/core/src/event.ts:433][E: packages/core/src/event.ts:434]
4. `publishEvent` 判断 definition 是否 durable；非 durable event 带 local commit hook 会 die。[E: packages/core/src/event.ts:369][E: packages/core/src/event.ts:371][E: packages/core/src/event.ts:372][E: packages/core/src/event.ts:375]
5. durable event 进入 `commitDurableEvent`，成功 committed 后给 payload 加 aggregateID/seq/version，再 notify listeners/typed/all streams。[E: packages/core/src/event.ts:378][E: packages/core/src/event.ts:379][E: packages/core/src/event.ts:383][E: packages/core/src/event.ts:385][E: packages/core/src/event.ts:386][E: packages/core/src/event.ts:389]
6. non-durable event 只走 `notify(event, false)`；不写 EventTable/EventSequenceTable 是由 non-durable branch 未进入 `commitDurableEvent` 推断出的行为。[E: packages/core/src/event.ts:378][E: packages/core/src/event.ts:393][I]

### commitDurableEvent 控制流

1. `commitDurableEvent` 先读取 definition 的 durable metadata；aggregate ID 从 event.data 的 durable aggregate field 读取，必须是 string。[E: packages/core/src/event.ts:217][E: packages/core/src/event.ts:218][E: packages/core/src/event.ts:219][E: packages/core/src/event.ts:220]
2. replay input 的 aggregateID 必须等于 payload data 中的 aggregate field。[E: packages/core/src/event.ts:228][E: packages/core/src/event.ts:229][E: packages/core/src/event.ts:232]
3. commit 在 `db.transaction(..., { behavior: "immediate" })` 中执行；projectors、local commit hook、sequence upsert 和 event insert 都在该 transaction body 内。[E: packages/core/src/event.ts:239][E: packages/core/src/event.ts:240][E: packages/core/src/event.ts:320][E: packages/core/src/event.ts:323][E: packages/core/src/event.ts:324][E: packages/core/src/event.ts:336][E: packages/core/src/event.ts:351]
4. transaction 读取 `EventSequenceTable` 当前 aggregate seq/owner_id，latest default 为 -1。[E: packages/core/src/event.ts:243][E: packages/core/src/event.ts:244][E: packages/core/src/event.ts:249]
5. replay input 如果 `seq <= latest`，会读取 existing `EventTable` row 并比较 id/type/data；完全一致视为 idempotent，否则 die 为 diverged replay。[E: packages/core/src/event.ts:262][E: packages/core/src/event.ts:263][E: packages/core/src/event.ts:266][E: packages/core/src/event.ts:270][E: packages/core/src/event.ts:271][E: packages/core/src/event.ts:272][E: packages/core/src/event.ts:284][E: packages/core/src/event.ts:287]
6. 新事件 seq 是 `input.seq` 或 `latest + 1`；replay seq 必须等于 `latest + 1`。[E: packages/core/src/event.ts:294][E: packages/core/src/event.ts:295][E: packages/core/src/event.ts:299]
7. projectors 按 registration list 执行，随后执行 optional local `commit(seq)` hook。[E: packages/core/src/event.ts:320][E: packages/core/src/event.ts:321][E: packages/core/src/event.ts:323]
8. transaction upsert `EventSequenceTable` 后 insert `EventTable` row，row type 使用 `versionedType(definition.type, durable.version)`，data 使用 encoded durable data。[E: packages/core/src/event.ts:324][E: packages/core/src/event.ts:326][E: packages/core/src/event.ts:343][E: packages/core/src/event.ts:344]
9. transaction committed 后，aggregate-specific durable subscribers 收到 dirty wake signal。[E: packages/core/src/event.ts:354][E: packages/core/src/event.ts:356][E: packages/core/src/event.ts:357]

### Replay / tailing

`replay(serialized, options?)` 从 durable manifest 找 versioned type，decode stored data，构造 replay payload 并调用 `commitDurableEvent`。[E: packages/core/src/event.ts:441][E: packages/core/src/event.ts:446][E: packages/core/src/event.ts:452][E: packages/core/src/event.ts:455][E: packages/core/src/event.ts:457] `durable({ aggregateID, after })` 先订阅 aggregate dirty signal，再读取 historical rows；live tail 每次 wake 都重新 `readAfter`，而 cursor 由最后一条 durable row 更新。[E: packages/core/src/event.ts:585][E: packages/core/src/event.ts:588][E: packages/core/src/event.ts:590][E: packages/core/src/event.ts:593][E: packages/core/src/event.ts:597][E: packages/core/src/event.ts:598][E: packages/core/src/event.ts:599][E: packages/core/src/event.ts:602]

## Bridge

`EventV2Bridge.Service` 扩展并包装 `EventV2.Interface`，service tag 是 `@opencode/EventV2Bridge`。[E: packages/opencode/src/event-v2-bridge.ts:12] bridge `publish` 如果 options 已带 location，就直接调用 core events；否则尝试读取 V1 `InstanceRef` 和 `WorkspaceRef`，用 ctx 构造 `Location.Info` 再 publish。[E: packages/opencode/src/event-v2-bridge.ts:19][E: packages/opencode/src/event-v2-bridge.ts:21][E: packages/opencode/src/event-v2-bridge.ts:22][E: packages/opencode/src/event-v2-bridge.ts:24][E: packages/opencode/src/event-v2-bridge.ts:25][E: packages/opencode/src/event-v2-bridge.ts:27][E: packages/opencode/src/event-v2-bridge.ts:28][E: packages/opencode/src/event-v2-bridge.ts:30]

bridge 还注册 `events.listen(...)`，把每个 EventV2 payload 转成 GlobalBus event：payload shape 是 `{ id, type, properties: data }`。[E: packages/opencode/src/event-v2-bridge.ts:35][E: packages/opencode/src/event-v2-bridge.ts:39][E: packages/opencode/src/event-v2-bridge.ts:43] 如果 event 带 `durable` metadata，bridge 再 emit 一个 legacy `payload.type = "sync"` 的 GlobalBus event，里面带 `syncEvent { id, type: versionedType, seq, aggregateID, data }`。[E: packages/opencode/src/event-v2-bridge.ts:45][E: packages/opencode/src/event-v2-bridge.ts:46][E: packages/opencode/src/event-v2-bridge.ts:51][E: packages/opencode/src/event-v2-bridge.ts:52][E: packages/opencode/src/event-v2-bridge.ts:53][E: packages/opencode/src/event-v2-bridge.ts:54][E: packages/opencode/src/event-v2-bridge.ts:55][E: packages/opencode/src/event-v2-bridge.ts:56]

## V1 / V2 对照

| 维度 | V1 host | V2 core |
| --- | --- | --- |
| Runtime primitive | `GlobalBus` singleton `EventEmitter`，本节点读取到的 `global.ts` 不包含 durable journal write path。[E: packages/opencode/src/bus/global.ts:11][E: packages/opencode/src/bus/global.ts:22][I] | `EventV2.Service` 持有 all/durable/typed PubSub、projector lists，并写 SQLite event tables。[E: packages/core/src/event.ts:174][E: packages/core/src/event.ts:175][E: packages/core/src/event.ts:176][E: packages/core/src/event.ts:179][E: packages/core/src/event.ts:324][E: packages/core/src/event.ts:336] |
| ID | `GlobalBus.emit` 为缺 id payload 补 `Identifier.create("evt", "ascending")`。[E: packages/opencode/src/bus/global.ts:15][E: packages/opencode/src/bus/global.ts:16] | `EventV2.ID.create()` 生成 `evt_` prefixed ID。[E: packages/schema/src/event.ts:9][E: packages/schema/src/event.ts:11] |
| Compatibility | V1 `GlobalBus` exposes the `"event"` event name; compatibility subscribers therefore remain on that event stream by inference from the exposed typed event map。[E: packages/opencode/src/bus/global.ts:11][E: packages/opencode/src/bus/global.ts:12][I] | `EventV2Bridge` listen EventV2 并 emit GlobalBus event 与 legacy sync payload。[E: packages/opencode/src/event-v2-bridge.ts:35][E: packages/opencode/src/event-v2-bridge.ts:39][E: packages/opencode/src/event-v2-bridge.ts:51] |
| Durability | GlobalBus event 本身无 journal in the checked singleton implementation。[E: packages/opencode/src/bus/global.ts:22][I] | durable EventV2 写 `event_sequence` 和 `event` tables。[E: packages/core/src/event/sql.ts:4][E: packages/core/src/event/sql.ts:11][E: packages/core/src/event.ts:324][E: packages/core/src/event.ts:336] |

## 设计动机与历史

`packages/opencode/src/sync/README.md` 是历史设计说明：它描述目标是单 writer event sourcing，用 sequence number 做 total ordering，并把 sync events 自动 republish 成 bus events 以保持 backwards compatibility。[E: packages/opencode/src/sync/README.md:31][E: packages/opencode/src/sync/README.md:33][E: packages/opencode/src/sync/README.md:35][E: packages/opencode/src/sync/README.md:37][E: packages/opencode/src/sync/README.md:91] 当前 source tree 中真正的 durable implementation 是 `packages/core/src/event.ts` 的 EventV2 engine，compat republish 由 `packages/opencode/src/event-v2-bridge.ts` 执行。[E: packages/core/src/event.ts:174][E: packages/opencode/src/event-v2-bridge.ts:35][I]

V2 session spec 说明 durable event tail wakeups 是 advisory and edge-triggered；每个 active tail 重新查询 SQLite，durable rows 而不是 in-memory notifications 保存完整事件和 sequence。[E: specs/v2/session.md:173] `EventV2.durable` 的 `subscribeDurable + readAfter` 代码实现了这个模型。[E: packages/core/src/event.ts:565][E: packages/core/src/event.ts:588][E: packages/core/src/event.ts:590]

## Gotchas

- 旧 `Bus` 的 README examples 是历史语境；当前 V1 host exposed singleton 是 `GlobalBus`，V2 durability 是 `EventV2`。[E: packages/opencode/src/bus/global.ts:22][E: packages/core/src/event.ts:150][I]
- `EventV2.Service` tag 目前是 `@opencode/Event`，不是 `@opencode/v2/Event`；它仍属于 `packages/core/src` V2 engine。[E: packages/core/src/event.ts:150][I]
- `EventV2Bridge.publish` 只在缺少 explicit `options.location` 时注入 InstanceRef-derived location；已有 location 的 caller 不会被 bridge 重写。[E: packages/opencode/src/event-v2-bridge.ts:19][E: packages/opencode/src/event-v2-bridge.ts:21]

## Sources

- `packages/opencode/src/bus/global.ts`
- `packages/opencode/src/event-v2-bridge.ts`
- `packages/opencode/src/project/project.ts`
- `packages/opencode/src/project/instance-store.ts`
- `packages/opencode/src/worktree/index.ts`
- `packages/opencode/src/cli/upgrade.ts`
- `packages/opencode/src/server/routes/instance/httpapi/handlers/global.ts`
- `packages/core/src/event.ts`
- `packages/core/src/event/sql.ts`
- `packages/schema/src/event.ts`
- `packages/opencode/src/sync/README.md`
- `specs/v2/session.md`

## 相关

- [V2 EventV2 原子 publish→project→persist](../../spine/v2-event-sourcing.md)
- [事件 catalog](../../reference/events.md)
- [Session projector](../session-v2/projector.md)
