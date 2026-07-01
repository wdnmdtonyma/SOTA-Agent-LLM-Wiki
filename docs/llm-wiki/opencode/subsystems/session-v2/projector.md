---
id: session-v2.projector
title: Session projector(event→读模型)
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/projector.ts, packages/core/src/session/message-updater.ts, packages/core/src/session/input.ts, packages/core/src/session/context-epoch.ts, packages/schema/src/session-event.ts, packages/core/src/session/sql.ts, specs/v2/session.md]
symbols: [SessionProjector, SessionProjector.layer, SessionMessageUpdater, insertMessage, SessionInput.projectAdmitted, SessionInput.projectPrompted]
related: [spine.v2-event-sourcing, ref.events]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Session projector 是 EventV2 到 Session read model 的集中投影接缝:它注册 V1/V2 session event projectors,把事件投影到 `session`、legacy `message/part`、V2 `session_input` 和 V2 `session_message`。[E: packages/core/src/session/projector.ts:215][E: packages/core/src/session/projector.ts:269][E: packages/core/src/session/projector.ts:320][E: packages/core/src/session/projector.ts:367][E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/projector.ts:361]

## 能回答的问题
- 哪个文件把 `session.next.*` event 变成 `session_message`?
- `PromptLifecycle.Promoted` 怎样同时标记 inbox row 并插入 user message?
- `SessionMessageUpdater` 怎样维护 assistant text/reasoning/tool state?
- `Moved`、`AgentSwitched`、`ModelSwitched`、`Compaction.Ended` 怎样触发 Context Epoch reset/replacement?
- live-only delta event 为什么不进入 durable read model?

## 职责边界

`SessionProjector.layer` 注册 `EventV2.project(...)` handlers;这些 handlers 作为 EventV2 projection hook 执行的 commit-time 语义来自 EventV2 实现,本节点只把它作为架构推断处理。[E: packages/core/src/session/projector.ts:215][E: packages/core/src/session/projector.ts:364][I] `SessionMessageUpdater.update` 只根据一个 `SessionEvent.Event` 修改 assistant/shell/current messages;DB 读写由 projector adapter 提供。[E: packages/core/src/session/message-updater.ts:102][E: packages/core/src/session/projector.ts:121][E: packages/core/src/session/projector.ts:185][E: packages/core/src/session/projector.ts:186][E: packages/core/src/session/projector.ts:187][I]

Event definitions 把 durable events 与 ephemeral deltas 分开:durable definitions 包含 started/ended/called/progress/success/failed 等 replayable boundaries,full definitions 额外包含 `Text.Delta`、`Tool.Input.Delta`、`Reasoning.Delta`、`Compaction.Delta`。[E: packages/schema/src/session-event.ts:448][E: packages/schema/src/session-event.ts:461][E: packages/schema/src/session-event.ts:462][E: packages/schema/src/session-event.ts:463][E: packages/schema/src/session-event.ts:464][E: packages/schema/src/session-event.ts:465][E: packages/schema/src/session-event.ts:466][E: packages/schema/src/session-event.ts:467][E: packages/schema/src/session-event.ts:468][E: packages/schema/src/session-event.ts:493][E: packages/schema/src/session-event.ts:499][E: packages/schema/src/session-event.ts:496][E: packages/schema/src/session-event.ts:507] Projector registers durable V2 events such as `Text.Started`/`Text.Ended` and `Tool.Input.Started`/`Tool.Input.Ended`;delta events are outside this projector registration block by absence across the inspected V2 registration list。[E: packages/core/src/session/projector.ts:384][E: packages/core/src/session/projector.ts:385][E: packages/core/src/session/projector.ts:386][E: packages/core/src/session/projector.ts:387][E: packages/schema/src/session-event.ts:493][I]

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/core/src/session/projector.ts` | EventV2 projectors 与 DB adapter。 |
| `packages/core/src/session/message-updater.ts` | event→`SessionMessage` pure-ish update interpreter。 |
| `packages/core/src/session/input.ts` | prompt lifecycle projection helper。 |
| `packages/core/src/session/context-epoch.ts` | moved/reset、switch/compaction replacement 的 store mutation。 |
| `packages/core/src/session/sql.ts` | `session`、legacy `message/part`、V2 `session_message`、`session_input` 表。 |

## 数据模型

`insertMessage` 把 encoded `SessionMessage.Message` 拆成 `id`、`type` 与 JSON `data`,并把 current event aggregate `seq` 写入 `SessionMessageTable.seq`。[E: packages/core/src/session/projector.ts:195][E: packages/core/src/session/projector.ts:198][E: packages/core/src/session/projector.ts:200][E: packages/core/src/session/projector.ts:202][E: packages/core/src/session/projector.ts:203][E: packages/core/src/session/projector.ts:205] `updateMessage` 只更新 existing `SessionMessageTable` row 的 type/time/data,where 条件包含 message id 与 session id。[E: packages/core/src/session/projector.ts:121][E: packages/core/src/session/projector.ts:125][E: packages/core/src/session/projector.ts:126]

| Read model | 写入路径 |
|---|---|
| `SessionTable` | V1 Created/Updated 写入或更新 row,V1 Deleted 删除 row,V2 Moved/AgentSwitched/ModelSwitched 更新 session metadata。[E: packages/core/src/session/projector.ts:218][E: packages/core/src/session/projector.ts:238][E: packages/core/src/session/projector.ts:247][E: packages/core/src/session/projector.ts:260][E: packages/core/src/session/projector.ts:334][E: packages/core/src/session/projector.ts:343] |
| legacy `MessageTable` / `PartTable` | V1 `MessageUpdated/Removed` 与 `PartUpdated/Removed` projection,同时维护 usage totals。[E: packages/core/src/session/projector.ts:269][E: packages/core/src/session/projector.ts:288][E: packages/core/src/session/projector.ts:290][E: packages/core/src/session/projector.ts:306][E: packages/core/src/session/projector.ts:307][E: packages/core/src/session/projector.ts:320][E: packages/core/src/session/projector.ts:327][E: packages/core/src/session/projector.ts:328] |
| `SessionInputTable` | `PromptAdmitted` 与 `Prompted` projectors 写入 admission/promoted state。[E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/projector.ts:367][E: packages/core/src/session/input.ts:83][E: packages/core/src/session/input.ts:118] |
| `SessionMessageTable` | `SessionMessageUpdater.update` 或 `insertMessage` 生成 V2 projected messages。[E: packages/core/src/session/projector.ts:189][E: packages/core/src/session/projector.ts:198][E: packages/core/src/session/projector.ts:203] |

## 控制流

1. `SessionProjector.layer@packages/core/src/session/projector.ts:211` 取得 `EventV2.Service` 与 `Database.Service.db`,然后注册 V1/V2 session projection handlers。[E: packages/core/src/session/projector.ts:211][E: packages/core/src/session/projector.ts:213][E: packages/core/src/session/projector.ts:214][E: packages/core/src/session/projector.ts:215]

2. `run@packages/core/src/session/projector.ts:112` 为当前 event 构造 adapter。adapter 的 `getCurrentAssistant` 查询最新 assistant row,只在未 completed 时返回;这避免旧 incomplete assistant 被新 turn 继续写。[E: packages/core/src/session/projector.ts:141][E: packages/core/src/session/projector.ts:143][E: packages/core/src/session/projector.ts:144][E: packages/core/src/session/projector.ts:149]

3. adapter 的 `getAssistant` 按 assistant message ID 和 session ID 查询具体 assistant row;`getCurrentShell` 按最新 shell rows 找同 callID shell。[E: packages/core/src/session/projector.ts:159][E: packages/core/src/session/projector.ts:160][E: packages/core/src/session/projector.ts:176][E: packages/core/src/session/projector.ts:177][E: packages/core/src/session/projector.ts:182]

4. `SessionMessageUpdater.update@packages/core/src/session/message-updater.ts:101` 对 `SessionEvent.All.match` 做 event type dispatch;agent/model switched append control messages,prompted append user message,context updated append system message。[E: packages/core/src/session/message-updater.ts:102][E: packages/core/src/session/message-updater.ts:105][E: packages/core/src/session/message-updater.ts:116][E: packages/core/src/session/message-updater.ts:128][E: packages/core/src/session/message-updater.ts:144]

5. `Step.Started` 先把当前未 completed assistant 标记 completed,再 append 新 `SessionMessage.Assistant` with agent/model/content/snapshot start。[E: packages/core/src/session/message-updater.ts:188][E: packages/core/src/session/message-updater.ts:192][E: packages/core/src/session/message-updater.ts:197][E: packages/core/src/session/message-updater.ts:198][E: packages/core/src/session/message-updater.ts:201][E: packages/core/src/session/message-updater.ts:202][E: packages/core/src/session/message-updater.ts:203][E: packages/core/src/session/message-updater.ts:204]

6. `Text.Started/Ended` 在 assistant content 中创建并最终写入 full text;`Text.Delta` appends the fragment to the matched assistant text and writes the assistant back via `updateOwnedAssistant`;replay boundary comes from `Text.Ended` being durable while `Text.Delta` is ephemeral。[E: packages/core/src/session/message-updater.ts:230][E: packages/core/src/session/message-updater.ts:237][E: packages/core/src/session/message-updater.ts:243][E: packages/schema/src/session-event.ts:461][E: packages/schema/src/session-event.ts:493][I]

7. Tool state 由 updater 推进:input started 创建 `ToolStatePending`,tool called 改成 `ToolStateRunning`,tool success 改成 `ToolStateCompleted`,tool failed 改成 `ToolStateError`。[E: packages/core/src/session/message-updater.ts:258][E: packages/core/src/session/message-updater.ts:278][E: packages/core/src/session/message-updater.ts:308][E: packages/core/src/session/message-updater.ts:331]

8. Tool success/failure 同时维护 provider metadata:call-side metadata 保留在 `metadata`,settlement-side metadata 写到 `resultMetadata`,`executed` 会保留 previous true。[E: packages/core/src/session/message-updater.ts:299][E: packages/core/src/session/message-updater.ts:300][E: packages/core/src/session/message-updater.ts:301][E: packages/core/src/session/message-updater.ts:322][E: packages/core/src/session/message-updater.ts:323][E: packages/core/src/session/message-updater.ts:324]

9. `Compaction.Ended` append `SessionMessage.Compaction` with `reason`、`summary` 和 `recent`;`Compaction.Started` 与 `Compaction.Delta` 不生成 message row。[E: packages/core/src/session/message-updater.ts:377][E: packages/core/src/session/message-updater.ts:379][E: packages/core/src/session/message-updater.ts:383][E: packages/core/src/session/message-updater.ts:384][E: packages/core/src/session/message-updater.ts:385]

10. `Prompted` projector 要求 durable aggregate seq,调用 `SessionInput.projectPrompted` 标记或补写 promoted inbox row,再运行 updater 追加 visible user message。[E: packages/core/src/session/projector.ts:352][E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/projector.ts:359][E: packages/core/src/session/projector.ts:361][E: packages/core/src/session/input.ts:118]

11. `PromptAdmitted` projector 只写 `session_input`;`Prompted` projector 调 `SessionInput.projectPrompted` 后通过 updater append user message。[E: packages/core/src/session/projector.ts:364][E: packages/core/src/session/projector.ts:367][E: packages/core/src/session/projector.ts:350][E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/projector.ts:361][E: packages/core/src/session/input.ts:83][E: packages/core/src/session/input.ts:118]

12. `Moved` projector 更新 session location fields 后调用 `SessionContextEpoch.reset`,删除 active context epoch; moved session 的 destination Location 必须重新 initialize baseline 是由 epoch deletion 和 initialize path 推出的结果。[E: packages/core/src/session/projector.ts:247][E: packages/core/src/session/projector.ts:250][E: packages/core/src/session/projector.ts:251][E: packages/core/src/session/projector.ts:256][E: packages/core/src/session/context-epoch.ts:111][E: packages/core/src/session/context-epoch.ts:115][I]

13. `AgentSwitched` projector 更新 `SessionTable.agent`,再运行 updater 追加 control message;当前 projector 不再调用 `SessionContextEpoch.requestReplacement`。[E: packages/core/src/session/projector.ts:331][E: packages/core/src/session/projector.ts:334][E: packages/core/src/session/projector.ts:337]

14. `ModelSwitched` projector 更新 `SessionTable.model`,再运行 updater 追加 control message;当前 projector 不再调用 `SessionContextEpoch.requestReplacement`。[E: packages/core/src/session/projector.ts:339][E: packages/core/src/session/projector.ts:343][E: packages/core/src/session/projector.ts:347]

15. `ContextUpdated` projector 直接运行 updater,把 context update event 投影成 system message。[E: packages/core/src/session/projector.ts:377][E: packages/core/src/session/message-updater.ts:140][E: packages/core/src/session/message-updater.ts:145]

16. `Compaction.Ended` projector 运行 updater append compaction message;Context Epoch replacement 由 `SessionContextEpoch.prepare` 对比 latest compaction seq 与 stored baseline seq 决定。[E: packages/core/src/session/projector.ts:395][E: packages/core/src/session/message-updater.ts:377][E: packages/core/src/session/context-epoch.ts:59][E: packages/core/src/session/context-epoch.ts:61]

## 设计动机与权衡

- Projector 是 EventV2 projection registration layer,不是本文件中的后台 polling consumer;commit-time execution 语义属于 EventV2 实现层,本节点保留为架构推断。[I] `insertMessage` 要求 synchronized event 具有 aggregate seq,缺 seq 会 die。[E: packages/core/src/session/projector.ts:195]
- V2 durable events 与 read model 用同一个 aggregate seq 排序,这让 `sessions.messages(...)` pagination 可以跟 durable event order 对齐。[E: packages/core/src/session/sql.ts:128][E: packages/core/src/session/projector.ts:203][E: specs/v2/session.md:175]
- delta events live-only,ended events replayable:durable definitions 包含 `Text.Ended`、`Tool.Input.Ended`、`Reasoning.Ended`,full definitions 额外包含对应 delta event。[E: packages/schema/src/session-event.ts:462][E: packages/schema/src/session-event.ts:464][E: packages/schema/src/session-event.ts:470][E: packages/schema/src/session-event.ts:493]

## gotcha

- `SessionProjector` 同时包含 V1 compatibility projection 与 V2 projection;legacy `MessageTable/PartTable` 不等于 V2 `SessionMessageTable`。[E: packages/core/src/session/projector.ts:269][E: packages/core/src/session/projector.ts:320][E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/sql.ts:68][E: packages/core/src/session/sql.ts:82][E: packages/core/src/session/sql.ts:119]
- `PromptAdmitted` 不运行 `SessionMessageUpdater`;spec 也要求 admitted inputs 在 serialized runner promotion 前不进入 model-visible history,因此 admitted prompt 还不是 visible user message。[E: packages/core/src/session/projector.ts:364][E: packages/core/src/session/message-updater.ts:139][E: specs/v2/session.md:35]
- `Compaction.Ended` is durable, while `Compaction.Delta` is live-only; projector only registers `Compaction.Ended`, so delta text does not create durable compaction message rows。[E: packages/schema/src/session-event.ts:473][E: packages/schema/src/session-event.ts:507][E: packages/core/src/session/projector.ts:395]

## Sources
- packages/core/src/session/projector.ts
- packages/core/src/session/message-updater.ts
- packages/core/src/session/input.ts
- packages/core/src/session/context-epoch.ts
- packages/schema/src/session-event.ts
- packages/core/src/session/sql.ts
- specs/v2/session.md

## 相关
- [spine.v2-event-sourcing](../../spine/v2-event-sourcing.md)
- [ref.events](../../reference/events.md)
