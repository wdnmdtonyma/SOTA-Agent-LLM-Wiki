---
id: session-v2.llm-event-publisher
title: LLMEvent→durable event 翻译
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/runner/publish-llm-event.ts, packages/core/src/session/event.ts, packages/core/src/session/message-updater.ts, specs/v2/session.md]
symbols: [createLLMEventPublisher, publish, flush, failUnsettledTools, settledOutput]
related: [spine.v2-provider-turn, session-v2.projector]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> `createLLMEventPublisher` 是 V2 runner 的 event translation layer:它把 `@opencode-ai/llm` stream events 转成 `SessionEvent.Step/Text/Reasoning/Tool` events,其中包含 durable boundaries 和 ephemeral deltas;它不执行工具、不启动 continuation turn 是从 publisher 状态机范围推出的职责边界。[E: packages/core/src/session/runner/publish-llm-event.ts:303][E: packages/core/src/session/runner/publish-llm-event.ts:344][E: packages/core/src/session/event.ts:486][E: packages/core/src/session/event.ts:487][E: packages/core/src/session/event.ts:500][I]

## 能回答的问题
- `LLMEvent.text-delta` 与 durable `SessionEvent.Text.Ended` 怎样对应?
- provider tool input fragments 怎样聚合成完整 input?
- local tool result 与 provider-executed tool result 怎样被 durable 化?
- unsettled tools 在 provider error、interrupt 或 missing tool result 时怎样失败化?
- `assistantMessageID` 是什么时候创建的?

## 职责边界

`createLLMEventPublisher` 返回的 publisher API 包含 `publish`、`flush`、`failUnsettledTools` 和 assistant/provider status helpers;tool execution 和 continuation orchestration 属于 runner 调用者,不属于 publisher 内部状态机。[E: packages/core/src/session/runner/publish-llm-event.ts:403][E: packages/core/src/session/runner/publish-llm-event.ts:404][E: packages/core/src/session/runner/publish-llm-event.ts:405][E: packages/core/src/session/runner/publish-llm-event.ts:406][E: packages/core/src/session/runner/publish-llm-event.ts:407][E: packages/core/src/session/runner/publish-llm-event.ts:408][E: packages/core/src/session/runner/publish-llm-event.ts:409][I]

## 数据模型

Publisher 内部维护 `tools: Map<string, ...>`。每个 callID 记录 owning `assistantMessageID`、tool `name`、`inputEnded`、`called`、`settled`、`providerExecuted` 与 optional provider metadata。[E: packages/core/src/session/runner/publish-llm-event.ts:54][E: packages/core/src/session/runner/publish-llm-event.ts:57][E: packages/core/src/session/runner/publish-llm-event.ts:58][E: packages/core/src/session/runner/publish-llm-event.ts:59][E: packages/core/src/session/runner/publish-llm-event.ts:60][E: packages/core/src/session/runner/publish-llm-event.ts:61][E: packages/core/src/session/runner/publish-llm-event.ts:62][E: packages/core/src/session/runner/publish-llm-event.ts:63]

| 状态 | 事件边界 |
|---|---|
| assistant step absent | 第一次 text/reasoning/tool/step-finish/provider-error 需要 assistant 时调用 `startAssistant` publish `Step.Started`。[E: packages/core/src/session/runner/publish-llm-event.ts:71][E: packages/core/src/session/runner/publish-llm-event.ts:72][E: packages/core/src/session/runner/publish-llm-event.ts:73][E: packages/core/src/session/runner/publish-llm-event.ts:230][E: packages/core/src/session/runner/publish-llm-event.ts:252][E: packages/core/src/session/runner/publish-llm-event.ts:161][E: packages/core/src/session/runner/publish-llm-event.ts:381][E: packages/core/src/session/runner/publish-llm-event.ts:395] |
| text/reasoning/tool input fragments | `fragments(...)` 以 id 为 key 缓存 chunks,start/delta/end 顺序错误会 die。[E: packages/core/src/session/runner/publish-llm-event.ts:89][E: packages/core/src/session/runner/publish-llm-event.ts:92][E: packages/core/src/session/runner/publish-llm-event.ts:93][E: packages/core/src/session/runner/publish-llm-event.ts:99][E: packages/core/src/session/runner/publish-llm-event.ts:105] |
| tool call | `Tool.Called` 记录 call input 与 provider executed/metadata。[E: packages/core/src/session/runner/publish-llm-event.ts:303][E: packages/core/src/session/runner/publish-llm-event.ts:309][E: packages/core/src/session/runner/publish-llm-event.ts:311][E: packages/core/src/session/runner/publish-llm-event.ts:312] |
| tool settlement | `Tool.Success` 记录 structured/content/outputPaths/provider metadata; `Tool.Failed` 记录 error/result/provider metadata。[E: packages/core/src/session/runner/publish-llm-event.ts:333][E: packages/core/src/session/runner/publish-llm-event.ts:338][E: packages/core/src/session/runner/publish-llm-event.ts:339][E: packages/core/src/session/runner/publish-llm-event.ts:340][E: packages/core/src/session/runner/publish-llm-event.ts:344][E: packages/core/src/session/runner/publish-llm-event.ts:349][E: packages/core/src/session/runner/publish-llm-event.ts:350][E: packages/core/src/session/runner/publish-llm-event.ts:352] |

`SessionMessageUpdater` 把这些 durable events project 成 `AssistantTool` state: input started 创建 pending, tool called 改 running, success 改 completed, failed 改 error。[E: packages/core/src/session/message-updater.ts:255][E: packages/core/src/session/message-updater.ts:275][E: packages/core/src/session/message-updater.ts:305][E: packages/core/src/session/message-updater.ts:328]

## 控制流

1. `createLLMEventPublisher@packages/core/src/session/runner/publish-llm-event.ts:53` 捕获 `events`、sessionID、agent、model,初始化 `tools` map、lazy `assistantMessageID` 与 `providerFailed` flag。[E: packages/core/src/session/runner/publish-llm-event.ts:9][E: packages/core/src/session/runner/publish-llm-event.ts:10][E: packages/core/src/session/runner/publish-llm-event.ts:11][E: packages/core/src/session/runner/publish-llm-event.ts:12][E: packages/core/src/session/runner/publish-llm-event.ts:54][E: packages/core/src/session/runner/publish-llm-event.ts:67][E: packages/core/src/session/runner/publish-llm-event.ts:68]
2. `startAssistant@packages/core/src/session/runner/publish-llm-event.ts:70` 创建 `SessionMessage.ID`,发布 `SessionEvent.Step.Started` with agent/model/assistantMessageID/timestamp,并在后续调用中复用同一个 assistant ID。[E: packages/core/src/session/runner/publish-llm-event.ts:71][E: packages/core/src/session/runner/publish-llm-event.ts:72][E: packages/core/src/session/runner/publish-llm-event.ts:73][E: packages/core/src/session/runner/publish-llm-event.ts:74][E: packages/core/src/session/runner/publish-llm-event.ts:75][E: packages/core/src/session/runner/publish-llm-event.ts:76]
3. `text-start` 先 `text.start(event.id)`,再发布 `SessionEvent.Text.Started`;`text-delta` 缓存 delta 并发布 live `Text.Delta`;`text-end` 触发 fragment end handler 发布 durable `Text.Ended` full text。[E: packages/core/src/session/runner/publish-llm-event.ts:227][E: packages/core/src/session/runner/publish-llm-event.ts:228][E: packages/core/src/session/runner/publish-llm-event.ts:236][E: packages/core/src/session/runner/publish-llm-event.ts:237][E: packages/core/src/session/runner/publish-llm-event.ts:246][E: packages/core/src/session/runner/publish-llm-event.ts:117][E: packages/core/src/session/runner/publish-llm-event.ts:122]
4. reasoning fragment 路径与 text 同构,但 `Reasoning.Started/Ended` 还携带 providerMetadata。[E: packages/core/src/session/runner/publish-llm-event.ts:249][E: packages/core/src/session/runner/publish-llm-event.ts:255][E: packages/core/src/session/runner/publish-llm-event.ts:269][E: packages/core/src/session/runner/publish-llm-event.ts:134]
5. `startToolInput@packages/core/src/session/runner/publish-llm-event.ts:159` 为 callID 分配 owning assistant message,写入 tools map,启动 tool input fragment,并发布 `Tool.Input.Started`。[E: packages/core/src/session/runner/publish-llm-event.ts:161][E: packages/core/src/session/runner/publish-llm-event.ts:162][E: packages/core/src/session/runner/publish-llm-event.ts:170][E: packages/core/src/session/runner/publish-llm-event.ts:171]
6. `tool-input-delta` 校验 callID/name/inputEnded 后 append fragment,同时发布 live `Tool.Input.Delta`;`tool-input-end` dispatches to `endToolInput`,which publishes durable `Tool.Input.Ended` and sets `inputEnded = true`。[E: packages/core/src/session/runner/publish-llm-event.ts:275][E: packages/core/src/session/runner/publish-llm-event.ts:276][E: packages/core/src/session/runner/publish-llm-event.ts:277][E: packages/core/src/session/runner/publish-llm-event.ts:279][E: packages/core/src/session/runner/publish-llm-event.ts:280][E: packages/core/src/session/runner/publish-llm-event.ts:281][E: packages/core/src/session/runner/publish-llm-event.ts:290][E: packages/core/src/session/runner/publish-llm-event.ts:291][E: packages/core/src/session/runner/publish-llm-event.ts:142][E: packages/core/src/session/runner/publish-llm-event.ts:149]
7. `tool-call` 会补齐缺失的 input start/end,拒绝 name changed 或 duplicate call,然后发布 `SessionEvent.Tool.Called` with `record(event.input)` 和 provider metadata。[E: packages/core/src/session/runner/publish-llm-event.ts:294][E: packages/core/src/session/runner/publish-llm-event.ts:296][E: packages/core/src/session/runner/publish-llm-event.ts:297][E: packages/core/src/session/runner/publish-llm-event.ts:298][E: packages/core/src/session/runner/publish-llm-event.ts:299][E: packages/core/src/session/runner/publish-llm-event.ts:303][E: packages/core/src/session/runner/publish-llm-event.ts:309][E: packages/core/src/session/runner/publish-llm-event.ts:311][E: packages/core/src/session/runner/publish-llm-event.ts:312]
8. `tool-result` 要求对应 tool 已 called;duplicate error result 被忽略,duplicate non-error result 会 die;success 发布 `Tool.Success`,error 发布 `Tool.Failed`。[E: packages/core/src/session/runner/publish-llm-event.ts:319][E: packages/core/src/session/runner/publish-llm-event.ts:322][E: packages/core/src/session/runner/publish-llm-event.ts:323][E: packages/core/src/session/runner/publish-llm-event.ts:324][E: packages/core/src/session/runner/publish-llm-event.ts:333][E: packages/core/src/session/runner/publish-llm-event.ts:344]
9. `settledOutput@packages/core/src/session/runner/publish-llm-event.ts:45` 把 `ToolOutput` 或 `ToolResultValue` 转成 `structured/content`;error result 转成 unknown error message。[E: packages/core/src/session/runner/publish-llm-event.ts:46][E: packages/core/src/session/runner/publish-llm-event.ts:47][E: packages/core/src/session/runner/publish-llm-event.ts:49]
10. `step-finish` 先 `flush()` 所有 fragments,再发布 `Step.Ended`;`provider-error` 设置 `providerFailed`,flush fragments,发布 `Step.Failed`。[E: packages/core/src/session/runner/publish-llm-event.ts:377][E: packages/core/src/session/runner/publish-llm-event.ts:378][E: packages/core/src/session/runner/publish-llm-event.ts:390][E: packages/core/src/session/runner/publish-llm-event.ts:391][E: packages/core/src/session/runner/publish-llm-event.ts:392]
11. `failUnsettledTools@packages/core/src/session/runner/publish-llm-event.ts:193` 遍历未 settled tools,可按 `hostedOnly` 只失败 provider-executed tools,并发布 `Tool.Failed`。[E: packages/core/src/session/runner/publish-llm-event.ts:197][E: packages/core/src/session/runner/publish-llm-event.ts:198][E: packages/core/src/session/runner/publish-llm-event.ts:200]

## 设计动机与权衡

- text/reasoning/tool-input deltas 可 live-publish,但 durable replay 使用 full-value ended event;这是从 `Text.Ended`/`Tool.Input.Ended`/`Reasoning.Ended` 出现在 durable definitions,对应 deltas 出现在 ephemeral definitions 推出的边界。[E: packages/core/src/session/event.ts:487][E: packages/core/src/session/event.ts:489][E: packages/core/src/session/event.ts:495][E: packages/core/src/session/event.ts:500][I]
- Tool settlement events carry owning assistant message ID,因为 provider-local call IDs 可能跨 turns 重复;V2 session spec 对这一点有明确说明。[E: specs/v2/session.md:43]
- provider-executed tool result 可以把 native `event.result` 保存在 durable success event 上,这是当前 publisher 对 provider-native round-trip data 的保留点。[E: packages/core/src/session/runner/publish-llm-event.ts:351]

## gotcha

- `step-start` 是 no-op;assistant step 由 first content/tool/step-finish/provider-error 触发 lazy `startAssistant`。[E: packages/core/src/session/runner/publish-llm-event.ts:224][E: packages/core/src/session/runner/publish-llm-event.ts:225][E: packages/core/src/session/runner/publish-llm-event.ts:230][E: packages/core/src/session/runner/publish-llm-event.ts:252][E: packages/core/src/session/runner/publish-llm-event.ts:161][E: packages/core/src/session/runner/publish-llm-event.ts:381][E: packages/core/src/session/runner/publish-llm-event.ts:395]
- `finish` 事件是 no-op;durable step closure 是 `step-finish` 对应的 `Step.Ended`。[E: packages/core/src/session/runner/publish-llm-event.ts:378][E: packages/core/src/session/runner/publish-llm-event.ts:387][E: packages/core/src/session/runner/publish-llm-event.ts:388]

## Sources
- packages/core/src/session/runner/publish-llm-event.ts
- packages/core/src/session/event.ts
- packages/core/src/session/message-updater.ts
- specs/v2/session.md

## 相关
- [spine.v2-provider-turn](../../spine/v2-provider-turn.md)
- [session-v2.projector](projector.md)
