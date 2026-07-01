---
id: session-v2.llm-event-publisher
title: LLMEvent→durable event 翻译
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/session/runner/publish-llm-event.ts
  - packages/core/src/session/runner/llm.ts
  - packages/schema/src/session-event.ts
  - packages/core/src/session/message-updater.ts
  - specs/v2/session.md
symbols: [createLLMEventPublisher, publish, flush, failAssistant, failUnsettledTools, settledOutput]
related: [spine.v2-provider-turn, session-v2.projector]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `createLLMEventPublisher` 是 V2 runner 的 event translation layer:它把 `@opencode-ai/llm` stream events 转成 `SessionEvent.Step/Text/Reasoning/Tool` events,其中包含 durable boundaries 和 ephemeral deltas;它不执行工具、不启动 continuation turn。[E: packages/core/src/session/runner/publish-llm-event.ts:54][E: packages/core/src/session/runner/publish-llm-event.ts:239][E: packages/core/src/session/runner/llm.ts:237][E: packages/core/src/session/runner/llm.ts:247][I]

## 能回答的问题

- `LLMEvent.text-delta` 与 durable `SessionEvent.Text.Ended` 怎样对应?
- provider tool input fragments 怎样聚合成完整 input?
- local tool result 与 provider-executed tool result 怎样被 durable 化?
- unsettled tools 在 provider error、interrupt 或 missing tool result 时怎样失败化?
- `assistantMessageID` 是什么时候创建的?

## 职责边界

`createLLMEventPublisher` 返回的 publisher API 包含 `publish`、`flush`、`failAssistant`、`failUnsettledTools`、assistant/provider status helpers 和 `stepSettlement`;tool execution 和 continuation orchestration 属于 runner 调用者,不属于 publisher 内部状态机。[E: packages/core/src/session/runner/publish-llm-event.ts:411][E: packages/core/src/session/runner/publish-llm-event.ts:412][E: packages/core/src/session/runner/publish-llm-event.ts:413][E: packages/core/src/session/runner/publish-llm-event.ts:414][E: packages/core/src/session/runner/publish-llm-event.ts:415][E: packages/core/src/session/runner/publish-llm-event.ts:419][E: packages/core/src/session/runner/llm.ts:247][E: packages/core/src/session/runner/llm.ts:340]

## 数据模型

Publisher 内部维护 `tools: Map<string, ...>`。每个 callID 记录 owning `assistantMessageID`、tool `name`、`inputEnded`、`called`、`settled`、`providerExecuted` 与 optional provider metadata。[E: packages/core/src/session/runner/publish-llm-event.ts:55][E: packages/core/src/session/runner/publish-llm-event.ts:58][E: packages/core/src/session/runner/publish-llm-event.ts:59][E: packages/core/src/session/runner/publish-llm-event.ts:60][E: packages/core/src/session/runner/publish-llm-event.ts:61][E: packages/core/src/session/runner/publish-llm-event.ts:62][E: packages/core/src/session/runner/publish-llm-event.ts:63][E: packages/core/src/session/runner/publish-llm-event.ts:64]

| 状态 | 事件边界 |
|---|---|
| assistant step absent | 第一次 text/reasoning/tool/provider-error 需要 assistant 时调用 `startAssistant` publish `Step.Started`。`step-finish` 只 records settlement,runner 稍后 publish `Step.Ended`。 [E: packages/core/src/session/runner/publish-llm-event.ts:74][E: packages/core/src/session/runner/publish-llm-event.ts:78][E: packages/core/src/session/runner/publish-llm-event.ts:246][E: packages/core/src/session/runner/publish-llm-event.ts:268][E: packages/core/src/session/runner/publish-llm-event.ts:291][E: packages/core/src/session/runner/publish-llm-event.ts:396][E: packages/core/src/session/runner/llm.ts:311][E: packages/core/src/session/runner/llm.ts:321] |
| text/reasoning/tool input fragments | `fragments(...)` 以 id 为 key 缓存 chunks,start/delta/end 顺序错误会 die。 [E: packages/core/src/session/runner/publish-llm-event.ts:91][E: packages/core/src/session/runner/publish-llm-event.ts:96][E: packages/core/src/session/runner/publish-llm-event.ts:98][E: packages/core/src/session/runner/publish-llm-event.ts:102][E: packages/core/src/session/runner/publish-llm-event.ts:105][E: packages/core/src/session/runner/publish-llm-event.ts:109][E: packages/core/src/session/runner/publish-llm-event.ts:111] |
| tool call | `Tool.Called` 记录 call input 与 provider executed/metadata。 [E: packages/core/src/session/runner/publish-llm-event.ts:313][E: packages/core/src/session/runner/publish-llm-event.ts:323][E: packages/core/src/session/runner/publish-llm-event.ts:329][E: packages/core/src/session/runner/publish-llm-event.ts:330] |
| tool settlement | `Tool.Success` 记录 structured/content/outputPaths/provider metadata;`Tool.Failed` 记录 error/result/provider metadata。 [E: packages/core/src/session/runner/publish-llm-event.ts:347][E: packages/core/src/session/runner/publish-llm-event.ts:353][E: packages/core/src/session/runner/publish-llm-event.ts:359][E: packages/core/src/session/runner/publish-llm-event.ts:364][E: packages/core/src/session/runner/publish-llm-event.ts:370][E: packages/core/src/session/runner/publish-llm-event.ts:383] |

`SessionMessageUpdater` 把这些 durable events project 成 `AssistantTool` state: input started 创建 pending, tool called 改 running, success 改 completed, failed 改 error。[E: packages/core/src/session/message-updater.ts:249][E: packages/core/src/session/message-updater.ts:271][E: packages/core/src/session/message-updater.ts:297][E: packages/core/src/session/message-updater.ts:320]

## 控制流

1. `createLLMEventPublisher@packages/core/src/session/runner/publish-llm-event.ts:54` 捕获 `events`、sessionID、agent、model,初始化 `tools` map、lazy `assistantMessageID`、assistant status flags、providerFailed flag 与 optional `stepSettlement`。[E: packages/core/src/session/runner/publish-llm-event.ts:54][E: packages/core/src/session/runner/publish-llm-event.ts:67][E: packages/core/src/session/runner/publish-llm-event.ts:68][E: packages/core/src/session/runner/publish-llm-event.ts:69][E: packages/core/src/session/runner/publish-llm-event.ts:70][E: packages/core/src/session/runner/publish-llm-event.ts:71][E: packages/core/src/session/runner/publish-llm-event.ts:72]

2. `startAssistant@packages/core/src/session/runner/publish-llm-event.ts:74` 创建 `SessionMessage.ID`,发布 `SessionEvent.Step.Started` with agent/model/assistantMessageID/timestamp/snapshot,并在后续调用中复用同一个 assistant ID。[E: packages/core/src/session/runner/publish-llm-event.ts:74][E: packages/core/src/session/runner/publish-llm-event.ts:76][E: packages/core/src/session/runner/publish-llm-event.ts:78][E: packages/core/src/session/runner/publish-llm-event.ts:80][E: packages/core/src/session/runner/publish-llm-event.ts:84]

3. `text-start` 先 `text.start(event.id)`,再发布 `SessionEvent.Text.Started`;`text-delta` 缓存 delta 并发布 live `Text.Delta`;`text-end` 触发 fragment end handler 发布 durable `Text.Ended` full text。[E: packages/core/src/session/runner/publish-llm-event.ts:246][E: packages/core/src/session/runner/publish-llm-event.ts:248][E: packages/core/src/session/runner/publish-llm-event.ts:255][E: packages/core/src/session/runner/publish-llm-event.ts:257][E: packages/core/src/session/runner/publish-llm-event.ts:265][E: packages/core/src/session/runner/publish-llm-event.ts:123]

4. reasoning fragment 路径与 text 同构,但 `Reasoning.Started/Ended` 还携带 providerMetadata。[E: packages/core/src/session/runner/publish-llm-event.ts:268][E: packages/core/src/session/runner/publish-llm-event.ts:270][E: packages/core/src/session/runner/publish-llm-event.ts:288][E: packages/core/src/session/runner/publish-llm-event.ts:134][E: packages/core/src/session/runner/publish-llm-event.ts:140]

5. `startToolInput@packages/core/src/session/runner/publish-llm-event.ts:165` 为 callID 分配 owning assistant message,写入 tools map,启动 tool input fragment,并发布 `Tool.Input.Started`。[E: packages/core/src/session/runner/publish-llm-event.ts:165][E: packages/core/src/session/runner/publish-llm-event.ts:167][E: packages/core/src/session/runner/publish-llm-event.ts:168][E: packages/core/src/session/runner/publish-llm-event.ts:176][E: packages/core/src/session/runner/publish-llm-event.ts:177]

6. `tool-input-delta` 校验 callID/name/inputEnded 后 append fragment,同时发布 live `Tool.Input.Delta`;`tool-input-end` dispatches to `endToolInput`,which publishes durable `Tool.Input.Ended` and sets `inputEnded = true`。[E: packages/core/src/session/runner/publish-llm-event.ts:294][E: packages/core/src/session/runner/publish-llm-event.ts:296][E: packages/core/src/session/runner/publish-llm-event.ts:297][E: packages/core/src/session/runner/publish-llm-event.ts:299][E: packages/core/src/session/runner/publish-llm-event.ts:300][E: packages/core/src/session/runner/publish-llm-event.ts:301][E: packages/core/src/session/runner/publish-llm-event.ts:310][E: packages/core/src/session/runner/publish-llm-event.ts:148][E: packages/core/src/session/runner/publish-llm-event.ts:155]

7. `tool-call` 会补齐缺失的 input start/end,拒绝 name changed 或 duplicate call,然后发布 `SessionEvent.Tool.Called` with `record(event.input)` 和 provider metadata。[E: packages/core/src/session/runner/publish-llm-event.ts:313][E: packages/core/src/session/runner/publish-llm-event.ts:314][E: packages/core/src/session/runner/publish-llm-event.ts:316][E: packages/core/src/session/runner/publish-llm-event.ts:318][E: packages/core/src/session/runner/publish-llm-event.ts:319][E: packages/core/src/session/runner/publish-llm-event.ts:323][E: packages/core/src/session/runner/publish-llm-event.ts:329][E: packages/core/src/session/runner/publish-llm-event.ts:330]

8. `tool-result` 要求对应 tool 已 called;duplicate error result 被忽略,duplicate non-error result 会 die;success 发布 `Tool.Success`,error 发布 `Tool.Failed`。[E: packages/core/src/session/runner/publish-llm-event.ts:337][E: packages/core/src/session/runner/publish-llm-event.ts:339][E: packages/core/src/session/runner/publish-llm-event.ts:342][E: packages/core/src/session/runner/publish-llm-event.ts:343][E: packages/core/src/session/runner/publish-llm-event.ts:353][E: packages/core/src/session/runner/publish-llm-event.ts:364]

9. `settledOutput@packages/core/src/session/runner/publish-llm-event.ts:46` 把 `ToolOutput` 或 `ToolResultValue` 转成 `structured/content`;error result 转成 unknown error message。[E: packages/core/src/session/runner/publish-llm-event.ts:46][E: packages/core/src/session/runner/publish-llm-event.ts:47][E: packages/core/src/session/runner/publish-llm-event.ts:48][E: packages/core/src/session/runner/publish-llm-event.ts:50]

10. `step-finish` 先 `flush()`,再把 finish reason 与 token usage 存到 `stepSettlement`;runner 在 tool fibers settle 之后读取 `publisher.stepSettlement()` 并发布 durable `Step.Ended` with snapshot/files。[E: packages/core/src/session/runner/publish-llm-event.ts:396][E: packages/core/src/session/runner/publish-llm-event.ts:397][E: packages/core/src/session/runner/publish-llm-event.ts:400][E: packages/core/src/session/runner/llm.ts:311][E: packages/core/src/session/runner/llm.ts:313][E: packages/core/src/session/runner/llm.ts:321][E: packages/core/src/session/runner/llm.ts:328][E: packages/core/src/session/runner/llm.ts:329]

11. `provider-error` sets `providerFailed` and delegates to `failAssistant`,which flushes fragments,starts assistant if necessary,and publishes `Step.Failed`。[E: packages/core/src/session/runner/publish-llm-event.ts:404][E: packages/core/src/session/runner/publish-llm-event.ts:405][E: packages/core/src/session/runner/publish-llm-event.ts:406][E: packages/core/src/session/runner/publish-llm-event.ts:199][E: packages/core/src/session/runner/publish-llm-event.ts:205]

12. `failUnsettledTools@packages/core/src/session/runner/publish-llm-event.ts:213` 遍历未 settled tools,可按 `hostedOnly` 只失败 provider-executed tools,并发布 `Tool.Failed`。[E: packages/core/src/session/runner/publish-llm-event.ts:213][E: packages/core/src/session/runner/publish-llm-event.ts:217][E: packages/core/src/session/runner/publish-llm-event.ts:218][E: packages/core/src/session/runner/publish-llm-event.ts:220]

## 设计动机与权衡

- text/reasoning/tool-input deltas 可 live-publish,但 durable replay 使用 full-value ended event;这是从 `Text.Ended`/`Tool.Input.Ended`/`Reasoning.Ended` 出现在 durable definitions,对应 deltas 只出现在 all definitions 推出的边界。[E: packages/schema/src/session-event.ts:461][E: packages/schema/src/session-event.ts:462][E: packages/schema/src/session-event.ts:464][E: packages/schema/src/session-event.ts:470][E: packages/schema/src/session-event.ts:493][E: packages/schema/src/session-event.ts:496][E: packages/schema/src/session-event.ts:499][I]
- Tool settlement events carry owning assistant message ID,因为 provider-local call IDs 可能跨 turns 重复;V2 session spec 对这一点有明确说明。[E: specs/v2/session.md:50]
- provider-executed tool result 可以把 native `event.result` 保存在 durable success event 上,这是当前 publisher 对 provider-native round-trip data 的保留点。[E: packages/core/src/session/runner/publish-llm-event.ts:371]

## gotcha

- `step-start` 是 no-op;assistant step 由 first content/tool/provider-error 触发 lazy `startAssistant`,或由 runner publishing `Step.Ended` 时强制 start if needed。[E: packages/core/src/session/runner/publish-llm-event.ts:244][E: packages/core/src/session/runner/publish-llm-event.ts:245][E: packages/core/src/session/runner/publish-llm-event.ts:250][E: packages/core/src/session/runner/publish-llm-event.ts:272][E: packages/core/src/session/runner/publish-llm-event.ts:292][E: packages/core/src/session/runner/llm.ts:324]
- `finish` event is no-op;durable step closure is tied to `step-finish` settlement plus runner-side `SessionEvent.Step.Ended` publish。[E: packages/core/src/session/runner/publish-llm-event.ts:396][E: packages/core/src/session/runner/publish-llm-event.ts:402][E: packages/core/src/session/runner/publish-llm-event.ts:403][E: packages/core/src/session/runner/llm.ts:321]

## Sources

- packages/core/src/session/runner/publish-llm-event.ts
- packages/core/src/session/runner/llm.ts
- packages/schema/src/session-event.ts
- packages/core/src/session/message-updater.ts
- specs/v2/session.md

## 相关

- [spine.v2-provider-turn](../../spine/v2-provider-turn.md)
- [session-v2.projector](projector.md)
