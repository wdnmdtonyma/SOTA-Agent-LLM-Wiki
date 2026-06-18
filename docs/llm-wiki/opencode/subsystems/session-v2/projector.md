---
id: session-v2.projector
title: Session projector(event→读模型)
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/projector.ts, packages/core/src/session/message-updater.ts, packages/core/src/session/input.ts, packages/core/src/session/context-epoch.ts, packages/core/src/session/event.ts, packages/core/src/session/sql.ts, specs/v2/session.md]
symbols: [SessionProjector, SessionProjector.layer, SessionMessageUpdater, insertMessage, SessionInput.projectAdmitted, SessionInput.projectPromoted]
related: [spine.v2-event-sourcing, ref.events]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Session projector 是 EventV2 到 Session read model 的集中投影接缝:它注册 V1/V2 session event projectors,把事件投影到 `session`、legacy `message/part`、V2 `session_input` 和 V2 `session_message`。[E: packages/core/src/session/projector.ts:217][E: packages/core/src/session/projector.ts:271][E: packages/core/src/session/projector.ts:322][E: packages/core/src/session/projector.ts:387][E: packages/core/src/session/projector.ts:401][E: packages/core/src/session/projector.ts:404]

## 能回答的问题
- 哪个文件把 `session.next.*` event 变成 `session_message`?
- `PromptLifecycle.Promoted` 怎样同时标记 inbox row 并插入 user message?
- `SessionMessageUpdater` 怎样维护 assistant text/reasoning/tool state?
- `Moved`、`AgentSwitched`、`ModelSwitched`、`Compaction.Ended` 怎样触发 Context Epoch reset/replacement?
- live-only delta event 为什么不进入 durable read model?

## 职责边界

`SessionProjector.layer` 注册 `EventV2.project(...)` handlers;这些 handlers 作为 EventV2 projection hook 执行的 commit-time 语义来自 EventV2 实现,本节点只把它作为架构推断处理。[E: packages/core/src/session/projector.ts:217][E: packages/core/src/session/projector.ts:383][I] `SessionMessageUpdater.update` 只根据一个 `SessionEvent.Event` 修改 assistant/shell/current messages;DB 读写由 projector adapter 提供。[E: packages/core/src/session/message-updater.ts:102][E: packages/core/src/session/projector.ts:122][E: packages/core/src/session/projector.ts:186][E: packages/core/src/session/projector.ts:187][E: packages/core/src/session/projector.ts:188][I]

Event definitions 把 durable events 与 ephemeral deltas 分开:durable definitions 包含 started/ended/called/progress/success/failed 等 replayable boundaries,ephemeral definitions 只有 `Text.Delta`、`Tool.Input.Delta`、`Reasoning.Delta`、`Compaction.Delta`。[E: packages/core/src/session/event.ts:486][E: packages/core/src/session/event.ts:487][E: packages/core/src/session/event.ts:488][E: packages/core/src/session/event.ts:489][E: packages/core/src/session/event.ts:490][E: packages/core/src/session/event.ts:491][E: packages/core/src/session/event.ts:492][E: packages/core/src/session/event.ts:493][E: packages/core/src/session/event.ts:494][E: packages/core/src/session/event.ts:495][E: packages/core/src/session/event.ts:500] Projector registers durable V2 events such as `Text.Started`/`Text.Ended` and `Tool.Input.Started`/`Tool.Input.Ended`;delta events are outside this projector registration block by absence across the inspected V2 registration list。[E: packages/core/src/session/projector.ts:421][E: packages/core/src/session/projector.ts:427][E: packages/core/src/session/projector.ts:428][E: packages/core/src/session/projector.ts:429][E: packages/core/src/session/projector.ts:430][E: packages/core/src/session/event.ts:500][I]

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/core/src/session/projector.ts` | EventV2 projectors 与 DB adapter。 |
| `packages/core/src/session/message-updater.ts` | event→`SessionMessage` pure-ish update interpreter。 |
| `packages/core/src/session/input.ts` | prompt lifecycle projection helper。 |
| `packages/core/src/session/context-epoch.ts` | moved/reset、switch/compaction replacement 的 store mutation。 |
| `packages/core/src/session/sql.ts` | `session`、legacy `message/part`、V2 `session_message`、`session_input` 表。 |

## 数据模型

`insertMessage` 把 encoded `SessionMessage.Message` 拆成 `id`、`type` 与 JSON `data`,并把 current event aggregate `seq` 写入 `SessionMessageTable.seq`。[E: packages/core/src/session/projector.ts:197][E: packages/core/src/session/projector.ts:199][E: packages/core/src/session/projector.ts:201][E: packages/core/src/session/projector.ts:203][E: packages/core/src/session/projector.ts:204][E: packages/core/src/session/projector.ts:206] `updateMessage` 只更新 existing `SessionMessageTable` row 的 type/time/data,where 条件包含 message id 与 session id。[E: packages/core/src/session/projector.ts:123][E: packages/core/src/session/projector.ts:126][E: packages/core/src/session/projector.ts:127]

| Read model | 写入路径 |
|---|---|
| `SessionTable` | V1 Created/Updated 写入或更新 row,V1 Deleted 删除 row,V2 Moved/AgentSwitched/ModelSwitched 更新 session metadata。[E: packages/core/src/session/projector.ts:220][E: packages/core/src/session/projector.ts:239][E: packages/core/src/session/projector.ts:248][E: packages/core/src/session/projector.ts:262][E: packages/core/src/session/projector.ts:337][E: packages/core/src/session/projector.ts:350] |
| legacy `MessageTable` / `PartTable` | V1 `MessageUpdated/Removed` 与 `PartUpdated/Removed` projection,同时维护 usage totals。[E: packages/core/src/session/projector.ts:271][E: packages/core/src/session/projector.ts:288][E: packages/core/src/session/projector.ts:291][E: packages/core/src/session/projector.ts:306][E: packages/core/src/session/projector.ts:308][E: packages/core/src/session/projector.ts:322][E: packages/core/src/session/projector.ts:329][E: packages/core/src/session/projector.ts:330] |
| `SessionInputTable` | `PromptLifecycle.Admitted/Promoted` 和 legacy `Prompted` bridge。[E: packages/core/src/session/projector.ts:373][E: packages/core/src/session/projector.ts:387][E: packages/core/src/session/projector.ts:404] |
| `SessionMessageTable` | `SessionMessageUpdater.update` 或 `insertMessage` 生成 V2 projected messages。[E: packages/core/src/session/projector.ts:190][E: packages/core/src/session/projector.ts:199][E: packages/core/src/session/projector.ts:204] |

## 控制流

1. `SessionProjector.layer@packages/core/src/session/projector.ts:212` 取得 `EventV2.Service` 与 `Database.Service.db`,先注册 `SessionInput.guardReservedID` before-commit guard。[E: packages/core/src/session/projector.ts:214][E: packages/core/src/session/projector.ts:215][E: packages/core/src/session/projector.ts:216]

2. `run@packages/core/src/session/projector.ts:113` 为当前 event 构造 adapter。adapter 的 `getCurrentAssistant` 查询最新 assistant row,只在未 completed 时返回;这避免旧 incomplete assistant 被新 turn 继续写。[E: packages/core/src/session/projector.ts:142][E: packages/core/src/session/projector.ts:144][E: packages/core/src/session/projector.ts:145][E: packages/core/src/session/projector.ts:150]

3. adapter 的 `getAssistant` 按 assistant message ID 和 session ID 查询具体 assistant row;`getCurrentShell` 按最新 shell rows 找同 callID shell。[E: packages/core/src/session/projector.ts:160][E: packages/core/src/session/projector.ts:161][E: packages/core/src/session/projector.ts:177][E: packages/core/src/session/projector.ts:178][E: packages/core/src/session/projector.ts:183]

4. `SessionMessageUpdater.update@packages/core/src/session/message-updater.ts:101` 对 `SessionEvent.All.match` 做 event type dispatch;agent/model switched append control messages,prompted append user message,context updated append system message。[E: packages/core/src/session/message-updater.ts:102][E: packages/core/src/session/message-updater.ts:105][E: packages/core/src/session/message-updater.ts:116][E: packages/core/src/session/message-updater.ts:128][E: packages/core/src/session/message-updater.ts:144]

5. `Step.Started` 先把当前未 completed assistant 标记 completed,再 append 新 `SessionMessage.Assistant` with agent/model/content/snapshot start。[E: packages/core/src/session/message-updater.ts:190][E: packages/core/src/session/message-updater.ts:194][E: packages/core/src/session/message-updater.ts:198][E: packages/core/src/session/message-updater.ts:199][E: packages/core/src/session/message-updater.ts:202][E: packages/core/src/session/message-updater.ts:203][E: packages/core/src/session/message-updater.ts:204][E: packages/core/src/session/message-updater.ts:205][E: packages/core/src/session/message-updater.ts:206]

6. `Text.Started/Ended` 在 assistant content 中创建并最终写入 full text;`Text.Delta` appends the fragment to the matched assistant text and writes the assistant back via `updateOwnedAssistant`;replay boundary comes from `Text.Ended` being durable while `Text.Delta` is ephemeral。[E: packages/core/src/session/message-updater.ts:230][E: packages/core/src/session/message-updater.ts:237][E: packages/core/src/session/message-updater.ts:243][E: packages/core/src/session/event.ts:487][E: packages/core/src/session/event.ts:500][I]

7. Tool state 由 updater 推进:input started 创建 `ToolStatePending`,tool called 改成 `ToolStateRunning`,tool success 改成 `ToolStateCompleted`,tool failed 改成 `ToolStateError`。[E: packages/core/src/session/message-updater.ts:255][E: packages/core/src/session/message-updater.ts:275][E: packages/core/src/session/message-updater.ts:305][E: packages/core/src/session/message-updater.ts:328]

8. Tool success/failure 同时维护 provider metadata:call-side metadata 保留在 `metadata`,settlement-side metadata 写到 `resultMetadata`,`executed` 会保留 previous true。[E: packages/core/src/session/message-updater.ts:299][E: packages/core/src/session/message-updater.ts:300][E: packages/core/src/session/message-updater.ts:301][E: packages/core/src/session/message-updater.ts:322][E: packages/core/src/session/message-updater.ts:323][E: packages/core/src/session/message-updater.ts:324]

9. `Compaction.Ended` append `SessionMessage.Compaction` with `reason`、`summary` 和 `recent`;`Compaction.Started` 与 `Compaction.Delta` 不生成 message row。[E: packages/core/src/session/message-updater.ts:370][E: packages/core/src/session/message-updater.ts:371][E: packages/core/src/session/message-updater.ts:373][E: packages/core/src/session/message-updater.ts:374][E: packages/core/src/session/message-updater.ts:378][E: packages/core/src/session/message-updater.ts:379][E: packages/core/src/session/message-updater.ts:380]

10. `Prompted` legacy projector 检查 duplicate visible message,运行 updater,再调用 `SessionInput.projectLegacyPrompted` 合成 promoted inbox row。[E: packages/core/src/session/projector.ts:360][E: packages/core/src/session/projector.ts:363][E: packages/core/src/session/projector.ts:369][E: packages/core/src/session/projector.ts:370][E: packages/core/src/session/projector.ts:373]

11. `PromptLifecycle.Admitted` projector 只写 `session_input`;`PromptLifecycle.Promoted` projector 调 `SessionInput.projectPromoted` 后 `insertMessage` user message。[E: packages/core/src/session/projector.ts:383][E: packages/core/src/session/projector.ts:387][E: packages/core/src/session/projector.ts:397][E: packages/core/src/session/projector.ts:401][E: packages/core/src/session/projector.ts:404][E: packages/core/src/session/input.ts:174][E: packages/core/src/session/input.ts:348]

12. `Moved` projector 更新 session location fields 后调用 `SessionContextEpoch.reset`,删除 active context epoch; moved session 的 destination Location 必须重新 initialize baseline 是由 epoch deletion 和 initialize path 推出的结果。[E: packages/core/src/session/projector.ts:248][E: packages/core/src/session/projector.ts:250][E: packages/core/src/session/projector.ts:251][E: packages/core/src/session/projector.ts:252][E: packages/core/src/session/projector.ts:258][E: packages/core/src/session/context-epoch.ts:183][E: packages/core/src/session/context-epoch.ts:184][I]

13. `AgentSwitched` projector 更新 `SessionTable.agent`,运行 updater,然后 `SessionContextEpoch.requestReplacement`。[E: packages/core/src/session/projector.ts:337][E: packages/core/src/session/projector.ts:342][E: packages/core/src/session/projector.ts:343]

14. `ModelSwitched` projector 更新 `SessionTable.model`,运行 updater,再 request replacement。[E: packages/core/src/session/projector.ts:346][E: packages/core/src/session/projector.ts:350][E: packages/core/src/session/projector.ts:354][E: packages/core/src/session/projector.ts:357]

15. `ContextUpdated` replay path 运行 updater 后 request replacement;非 replay 或无 seq 时只运行 updater。[E: packages/core/src/session/projector.ts:416][E: packages/core/src/session/projector.ts:418]

16. `Compaction.Ended` projector 忽略 version 1,version 2 运行 updater 并 request replacement。[E: packages/core/src/session/projector.ts:439][E: packages/core/src/session/projector.ts:443][E: packages/core/src/session/projector.ts:444]

## 设计动机与权衡

- Projector 是 EventV2 projection registration layer,不是本文件中的后台 polling consumer;commit-time execution 语义属于 EventV2 实现层,本节点保留为架构推断。[I] `insertMessage` 要求 synchronized event 具有 aggregate seq,缺 seq 会 die。[E: packages/core/src/session/projector.ts:195]
- V2 durable events 与 read model 用同一个 aggregate seq 排序,这让 `sessions.messages(...)` pagination 可以跟 durable event order 对齐。[E: packages/core/src/session/sql.ts:127][E: packages/core/src/session/projector.ts:204][E: specs/v2/session.md:169]
- delta events live-only,ended events replayable:durable definitions 包含 `Text.Ended`、`Tool.Input.Ended`、`Reasoning.Ended`,ephemeral definitions 包含对应 delta event。[E: packages/core/src/session/event.ts:487][E: packages/core/src/session/event.ts:489][E: packages/core/src/session/event.ts:495][E: packages/core/src/session/event.ts:500]

## gotcha

- `SessionProjector` 同时包含 V1 compatibility projection 与 V2 projection;legacy `MessageTable/PartTable` 不等于 V2 `SessionMessageTable`。[E: packages/core/src/session/projector.ts:271][E: packages/core/src/session/projector.ts:322][E: packages/core/src/session/projector.ts:401][E: packages/core/src/session/sql.ts:67][E: packages/core/src/session/sql.ts:81][E: packages/core/src/session/sql.ts:118]
- `PromptLifecycle.Admitted` 不运行 `SessionMessageUpdater`;spec 也要求 admitted inputs 在 serialized runner promotion 前不进入 model-visible history,因此 admitted prompt 还不是 visible user message。[E: packages/core/src/session/projector.ts:383][E: packages/core/src/session/message-updater.ts:139][E: specs/v2/session.md:30]
- `Compaction.Ended` version 1 的 decoder 仍在 event schema 中,但 projector 对 version 1 返回 `Effect.void`,不会生成 current compaction message。[E: packages/core/src/session/event.ts:447][E: packages/core/src/session/event.ts:448][E: packages/core/src/session/projector.ts:439]

## Sources
- packages/core/src/session/projector.ts
- packages/core/src/session/message-updater.ts
- packages/core/src/session/input.ts
- packages/core/src/session/context-epoch.ts
- packages/core/src/session/event.ts
- packages/core/src/session/sql.ts
- specs/v2/session.md

## 相关
- [spine.v2-event-sourcing](../../spine/v2-event-sourcing.md)
- [ref.events](../../reference/events.md)
