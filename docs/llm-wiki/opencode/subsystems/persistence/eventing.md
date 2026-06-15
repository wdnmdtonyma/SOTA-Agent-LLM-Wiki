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
updated: 92c70c9c3
---

> 事件系统节点覆盖两个同时存在的 surface：V1 host 侧只有 `GlobalBus` EventEmitter，V2 core 侧是持久 EventV2 engine，`EventV2Bridge` 把 core events 映射回 GlobalBus 兼容流。

## 能回答的问题

- V1 当前为什么是 `GlobalBus`，不是旧 `Bus` service。
- `GlobalBus` 如何给 payload 自动补 `evt_*` id。
- `EventV2.define/publish/project/replay/aggregateEvents` 如何围绕 synchronized events 工作。
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
| `EventV2.ID` | branded string 以 `evt_` 开头，`create()` 用 ascending identifier，`fromExternal()` 使用 `externalID("evt", input)`。 | [E: packages/core/src/event.ts:13][E: packages/core/src/event.ts:16][E: packages/core/src/event.ts:17] |
| `Definition` | event definition 包含 `type`、optional `sync { version, aggregate }`、data schema。 | [E: packages/core/src/event.ts:29][E: packages/core/src/event.ts:31][E: packages/core/src/event.ts:32][E: packages/core/src/event.ts:33][E: packages/core/src/event.ts:35] |
| `Payload` | payload 包含 id/type/data，durable synchronized event 可带 seq/version/location/metadata/replay。 | [E: packages/core/src/event.ts:40][E: packages/core/src/event.ts:41][E: packages/core/src/event.ts:42][E: packages/core/src/event.ts:43][E: packages/core/src/event.ts:45][E: packages/core/src/event.ts:46][E: packages/core/src/event.ts:47][E: packages/core/src/event.ts:48][E: packages/core/src/event.ts:50] |
| `SerializedEvent` | durable replay row shape 是 id/type/seq/aggregateID/data。 | [E: packages/core/src/event.ts:60][E: packages/core/src/event.ts:61][E: packages/core/src/event.ts:62][E: packages/core/src/event.ts:63][E: packages/core/src/event.ts:64][E: packages/core/src/event.ts:65] |
| `EventTable` | durable synchronized events 落 `event` table，字段是 id、aggregate_id、seq、type、data，并有 aggregate seq unique index。 | [E: packages/core/src/event/sql.ts:11][E: packages/core/src/event/sql.ts:13][E: packages/core/src/event/sql.ts:14][E: packages/core/src/event/sql.ts:17][E: packages/core/src/event/sql.ts:18][E: packages/core/src/event/sql.ts:19][E: packages/core/src/event/sql.ts:22] |
| `EventSequenceTable` | 每个 aggregate 保存 latest seq 和 optional owner_id。 | [E: packages/core/src/event/sql.ts:4][E: packages/core/src/event/sql.ts:5][E: packages/core/src/event/sql.ts:6][E: packages/core/src/event/sql.ts:7] |
| `EventV2.Service` | tag 是 `@opencode/Event`，接口包含 publish、subscribe、all、aggregateEvents、sync、listen、beforeCommit、project、replay、replayAll、remove、claim。 | [E: packages/core/src/event.ts:147][E: packages/core/src/event.ts:148][E: packages/core/src/event.ts:153][E: packages/core/src/event.ts:154][E: packages/core/src/event.ts:155][E: packages/core/src/event.ts:159][E: packages/core/src/event.ts:160][E: packages/core/src/event.ts:161][E: packages/core/src/event.ts:162][E: packages/core/src/event.ts:163][E: packages/core/src/event.ts:167][E: packages/core/src/event.ts:171][E: packages/core/src/event.ts:172][E: packages/core/src/event.ts:175] |

### EventV2.define

`EventV2.define({ type, sync?, schema })` 创建 data schema 和 payload schema；如果该 type 还没有更新版本的 sync definition，则写入 `registry`。[E: packages/core/src/event.ts:96][E: packages/core/src/event.ts:104][E: packages/core/src/event.ts:105][E: packages/core/src/event.ts:114][E: packages/core/src/event.ts:119][E: packages/core/src/event.ts:120][E: packages/core/src/event.ts:121] 带 sync metadata 的 definition 还会以 `versionedType(type, version)` 写入 `syncRegistry`，并保存 encode/decode functions。[E: packages/core/src/event.ts:81][E: packages/core/src/event.ts:123][E: packages/core/src/event.ts:124][E: packages/core/src/event.ts:125][E: packages/core/src/event.ts:127][E: packages/core/src/event.ts:128]

### EventV2 publish 控制流

1. `layerWith` 建立 unbounded `PubSub`：一个 all stream、lazy typed streams、projector map、commit guards、listeners、sync handlers，并取 `Database.Service`。[E: packages/core/src/event.ts:185][E: packages/core/src/event.ts:187][E: packages/core/src/event.ts:188][E: packages/core/src/event.ts:189][E: packages/core/src/event.ts:190][E: packages/core/src/event.ts:191][E: packages/core/src/event.ts:192][E: packages/core/src/event.ts:194][E: packages/core/src/event.ts:198][E: packages/core/src/event.ts:199]
2. `publish(definition, data, options?)` 读取 optional `Location.Service`，优先使用 options.location，否则从 service location 派生 location ref。[E: packages/core/src/event.ts:431][E: packages/core/src/event.ts:433][E: packages/core/src/event.ts:435][E: packages/core/src/event.ts:436][E: packages/core/src/event.ts:437]
3. publish 构造 payload：id 默认 `ID.create()`，sync definition 自动附加 version，location 存在时附加 location。[E: packages/core/src/event.ts:441][E: packages/core/src/event.ts:443][E: packages/core/src/event.ts:444][E: packages/core/src/event.ts:445][E: packages/core/src/event.ts:446]
4. `publishEvent` 判断 definition 是否 durable sync；非 sync event 带 commit hook 会 die。[E: packages/core/src/event.ts:385][E: packages/core/src/event.ts:387][E: packages/core/src/event.ts:388][E: packages/core/src/event.ts:389][E: packages/core/src/event.ts:392]
5. durable event 进入 `commitSyncEvent`，成功 committed 后给 payload 加 seq，先调用 sync handlers，再 notify listeners/typed/all streams。[E: packages/core/src/event.ts:395][E: packages/core/src/event.ts:396][E: packages/core/src/event.ts:398][E: packages/core/src/event.ts:399][E: packages/core/src/event.ts:400][E: packages/core/src/event.ts:420][E: packages/core/src/event.ts:425][E: packages/core/src/event.ts:426][E: packages/core/src/event.ts:427]
6. non-durable event 只走 `notify(event, false)`；不写 EventTable/EventSequenceTable 是由 non-durable branch 未进入 `commitSyncEvent` 推断出的行为。[E: packages/core/src/event.ts:395][E: packages/core/src/event.ts:404][I]

### commitSyncEvent 控制流

1. `commitSyncEvent` 先查 registry 和 sync metadata，校验 event.version 等于 definition sync version。[E: packages/core/src/event.ts:226][E: packages/core/src/event.ts:227][E: packages/core/src/event.ts:229]
2. aggregate ID 从 event.data 的 sync aggregate field 读取，必须是 string。[E: packages/core/src/event.ts:237][E: packages/core/src/event.ts:238]
3. commit 在 `db.transaction(..., { behavior: "immediate" })` 中执行；commit guards、projectors、local commit hook、sequence upsert 和 event insert 都在该 transaction body 内。[E: packages/core/src/event.ts:257][E: packages/core/src/event.ts:258][E: packages/core/src/event.ts:333][E: packages/core/src/event.ts:336][E: packages/core/src/event.ts:339][E: packages/core/src/event.ts:340][E: packages/core/src/event.ts:353][E: packages/core/src/event.ts:367]
4. transaction 读取 `EventSequenceTable` 当前 aggregate seq/owner_id，latest default 为 -1。[E: packages/core/src/event.ts:261][E: packages/core/src/event.ts:262][E: packages/core/src/event.ts:264][E: packages/core/src/event.ts:267]
5. replay input 如果 `seq <= latest`，会读取 existing `EventTable` row 并比较 id/type/data；完全一致视为 idempotent，否则 die 为 diverged replay。[E: packages/core/src/event.ts:279][E: packages/core/src/event.ts:280][E: packages/core/src/event.ts:283][E: packages/core/src/event.ts:287][E: packages/core/src/event.ts:288][E: packages/core/src/event.ts:289][E: packages/core/src/event.ts:299][E: packages/core/src/event.ts:301][E: packages/core/src/event.ts:304]
6. 新事件 seq 是 `input.seq` 或 `latest + 1`；replay seq 必须等于 `latest + 1`。[E: packages/core/src/event.ts:311][E: packages/core/src/event.ts:312]
7. commit guards 先执行，随后按 registration list 执行 projectors，再执行 optional local `commit(seq)` hook。[E: packages/core/src/event.ts:333][E: packages/core/src/event.ts:334][E: packages/core/src/event.ts:336][E: packages/core/src/event.ts:337][E: packages/core/src/event.ts:339]
8. transaction upsert `EventSequenceTable` 后 insert `EventTable` row，row type 使用 `versionedType(definition.type, sync.version)`，data 使用 encoded sync data。[E: packages/core/src/event.ts:340][E: packages/core/src/event.ts:341][E: packages/core/src/event.ts:343][E: packages/core/src/event.ts:353][E: packages/core/src/event.ts:356][E: packages/core/src/event.ts:357][E: packages/core/src/event.ts:358][E: packages/core/src/event.ts:359][E: packages/core/src/event.ts:360]
9. transaction committed 后，aggregate-specific synchronized subscribers 收到 dirty wake signal。[E: packages/core/src/event.ts:370][E: packages/core/src/event.ts:371][E: packages/core/src/event.ts:372][E: packages/core/src/event.ts:373]

### Replay / tailing

`replay(serialized, options?)` 从 `syncRegistry` 找 versioned type，decode stored data，构造 replay payload 并调用 `commitSyncEvent`。[E: packages/core/src/event.ts:453][E: packages/core/src/event.ts:458][E: packages/core/src/event.ts:464][E: packages/core/src/event.ts:468][E: packages/core/src/event.ts:469][E: packages/core/src/event.ts:471] `aggregateEvents({ aggregateID, after })` 先订阅 aggregate dirty signal，再读取 historical rows；live tail 每次 wake 都重新 `readAfter`，而 cursor 由最后一条 durable row 更新。[E: packages/core/src/event.ts:606][E: packages/core/src/event.ts:612][E: packages/core/src/event.ts:613][E: packages/core/src/event.ts:614][E: packages/core/src/event.ts:615][E: packages/core/src/event.ts:617][E: packages/core/src/event.ts:621][E: packages/core/src/event.ts:622][E: packages/core/src/event.ts:623][E: packages/core/src/event.ts:626]

## Bridge

`EventV2Bridge.Service` 扩展并包装 `EventV2.Interface`，service tag 是 `@opencode/EventV2Bridge`。[E: packages/opencode/src/event-v2-bridge.ts:15] bridge `publish` 如果 options 已带 location，就直接调用 core events；否则尝试读取 V1 `InstanceRef` 和 `WorkspaceRef`，用 ctx 构造 `Location.Info` 再 publish。[E: packages/opencode/src/event-v2-bridge.ts:22][E: packages/opencode/src/event-v2-bridge.ts:24][E: packages/opencode/src/event-v2-bridge.ts:25][E: packages/opencode/src/event-v2-bridge.ts:27][E: packages/opencode/src/event-v2-bridge.ts:28][E: packages/opencode/src/event-v2-bridge.ts:30][E: packages/opencode/src/event-v2-bridge.ts:31][E: packages/opencode/src/event-v2-bridge.ts:33]

bridge 还注册 `events.listen(...)`，把每个 EventV2 payload 转成 GlobalBus event：payload shape 是 `{ id, type, properties: data }`。[E: packages/opencode/src/event-v2-bridge.ts:38][E: packages/opencode/src/event-v2-bridge.ts:42][E: packages/opencode/src/event-v2-bridge.ts:46] 如果 registry definition 有 `sync` metadata 且 event 带 seq/version，bridge 再 emit 一个 legacy `payload.type = "sync"` 的 GlobalBus event，里面带 `syncEvent { id, type: versionedType, seq, aggregateID, data }`。[E: packages/opencode/src/event-v2-bridge.ts:48][E: packages/opencode/src/event-v2-bridge.ts:49][E: packages/opencode/src/event-v2-bridge.ts:50][E: packages/opencode/src/event-v2-bridge.ts:52][E: packages/opencode/src/event-v2-bridge.ts:57][E: packages/opencode/src/event-v2-bridge.ts:59][E: packages/opencode/src/event-v2-bridge.ts:60][E: packages/opencode/src/event-v2-bridge.ts:61][E: packages/opencode/src/event-v2-bridge.ts:62][E: packages/opencode/src/event-v2-bridge.ts:63]

## V1 / V2 对照

| 维度 | V1 host | V2 core |
| --- | --- | --- |
| Runtime primitive | `GlobalBus` singleton `EventEmitter`，本节点读取到的 `global.ts` 不包含 durable journal write path。[E: packages/opencode/src/bus/global.ts:11][E: packages/opencode/src/bus/global.ts:22][I] | `EventV2.Service` 持有 PubSub、projector lists、sync handlers，并写 SQLite event tables。[E: packages/core/src/event.ts:185][E: packages/core/src/event.ts:188][E: packages/core/src/event.ts:191][E: packages/core/src/event.ts:340][E: packages/core/src/event.ts:353] |
| ID | `GlobalBus.emit` 为缺 id payload 补 `Identifier.create("evt", "ascending")`。[E: packages/opencode/src/bus/global.ts:15][E: packages/opencode/src/bus/global.ts:16] | `EventV2.ID.create()` 生成 `evt_` prefixed ID。[E: packages/core/src/event.ts:13][E: packages/core/src/event.ts:16] |
| Compatibility | V1 `GlobalBus` exposes the `"event"` event name; compatibility subscribers therefore remain on that event stream by inference from the exposed typed event map。[E: packages/opencode/src/bus/global.ts:11][E: packages/opencode/src/bus/global.ts:12][I] | `EventV2Bridge` listen EventV2 并 emit GlobalBus event 与 legacy sync payload。[E: packages/opencode/src/event-v2-bridge.ts:38][E: packages/opencode/src/event-v2-bridge.ts:42][E: packages/opencode/src/event-v2-bridge.ts:52] |
| Durability | GlobalBus event 本身无 journal in the checked singleton implementation。[E: packages/opencode/src/bus/global.ts:22][I] | synchronized EventV2 写 `event_sequence` 和 `event` tables。[E: packages/core/src/event/sql.ts:4][E: packages/core/src/event/sql.ts:11][E: packages/core/src/event.ts:341][E: packages/core/src/event.ts:353] |

## 设计动机与历史

`packages/opencode/src/sync/README.md` 是历史设计说明：它描述目标是单 writer event sourcing，用 sequence number 做 total ordering，并把 sync events 自动 republish 成 bus events 以保持 backwards compatibility。[E: packages/opencode/src/sync/README.md:31][E: packages/opencode/src/sync/README.md:33][E: packages/opencode/src/sync/README.md:35][E: packages/opencode/src/sync/README.md:37][E: packages/opencode/src/sync/README.md:91] 当前 source tree 中真正的 durable implementation 是 `packages/core/src/event.ts` 的 EventV2 engine，compat republish 由 `packages/opencode/src/event-v2-bridge.ts` 执行。[E: packages/core/src/event.ts:175][E: packages/opencode/src/event-v2-bridge.ts:38][I]

V2 session spec 说明 durable event tail wakeups 是 advisory and edge-triggered；每个 active tail 重新查询 SQLite，durable rows 而不是 in-memory notifications 保存完整事件和 sequence。[E: specs/v2/session.md:173] `EventV2.aggregateEvents` 的 `subscribeSynchronized + readAfter` 代码实现了这个模型。[E: packages/core/src/event.ts:612][E: packages/core/src/event.ts:614][E: packages/core/src/event.ts:623]

## Gotchas

- 旧 `Bus` 的 README examples 是历史语境；当前 V1 host exposed singleton 是 `GlobalBus`，V2 durability 是 `EventV2`。[E: packages/opencode/src/bus/global.ts:22][E: packages/core/src/event.ts:175][I]
- `EventV2.Service` tag 目前是 `@opencode/Event`，不是 `@opencode/v2/Event`；它仍属于 `packages/core/src` V2 engine。[E: packages/core/src/event.ts:175][I]
- `EventV2Bridge.publish` 只在缺少 explicit `options.location` 时注入 InstanceRef-derived location；已有 location 的 caller 不会被 bridge 重写。[E: packages/opencode/src/event-v2-bridge.ts:22][E: packages/opencode/src/event-v2-bridge.ts:24]

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
- `packages/opencode/src/sync/README.md`
- `specs/v2/session.md`

## 相关

- [V2 EventV2 原子 publish→project→persist](../../spine/v2-event-sourcing.md)
- [事件 catalog](../../reference/events.md)
- [Session projector](../session-v2/projector.md)
