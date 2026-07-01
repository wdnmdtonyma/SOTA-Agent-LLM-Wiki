---
id: spine.v2-provider-turn
title: V2 Provider Turn
kind: flow
tier: T0
v: v2
source: [packages/core/src/session/runner/llm.ts, packages/core/src/session/runner/publish-llm-event.ts, packages/core/src/session/runner/to-llm-message.ts, packages/core/src/session/input.ts, packages/core/src/session/context-epoch.ts, specs/v2/session.md]
symbols: [SessionRunner.run, runTurnAttempt, createLLMEventPublisher, toLLMMessages, LLM.request]
related: [spine.v2-context-epoch, session-v2.llm-event-publisher, model-layer.llm-protocol-engine]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 provider turn 是 `SessionRunner` 的单次模型调用单元:它在安全边界 promote input、准备 context epoch、构造 `LLM.request`,执行一次 `llm.stream(request)`,并把 LLM events、tool settlement、snapshot diff 投影为 durable session events。

## 能回答的问题
- V2 何时把 pending prompt promoted 给模型?
- provider request 的 system/messages/tools 在哪里组装?
- 一次 provider turn 是否会调用多次 `llm.stream`?
- local tool call 的执行与 settlement 在哪里发生?
- LLM event 如何变成 `SessionEvent.Text/Tool/Step`?

```mermaid
flowchart TD
  Run["SessionRunner.run"] --> Promote["promoteSteers / promoteNextQueued"]
  Promote --> Epoch["SessionContextEpoch.initialize/prepare"]
  Epoch --> History["history.entriesForRunner"]
  History --> Messages["toLLMMessages"]
  Messages --> Tools["tools.materialize"]
  Tools --> Request["LLM.request"]
  Request --> Compact["compactIfNeeded"]
  Compact --> Stream["llm.stream(request) once"]
  Stream --> Publisher["createLLMEventPublisher.publish"]
  Publisher --> Events["Step/Text/Reasoning/Tool events"]
  Stream --> ToolFiber["local tool settle fibers"]
  ToolFiber --> Publisher
  Publisher --> Continue["needsContinuation -> next turn"]
```

## 端到端步骤

1. `SessionRunner.run@packages/core/src/session/runner/llm.ts:378` 先检查 pending steer 与 queue;没有 pending input 且不是 forced run 时直接返回。[E: packages/core/src/session/runner/llm.ts:378][E: packages/core/src/session/runner/llm.ts:382][E: packages/core/src/session/runner/llm.ts:383][E: packages/core/src/session/runner/llm.ts:384]

2. runner 进入循环前会调用 `failInterruptedTools`,把历史中遗留的 pending/running local tool 标记为 interrupted,避免崩溃后静默重放副作用。[E: packages/core/src/session/runner/llm.ts:118][E: packages/core/src/session/runner/llm.ts:124][E: packages/core/src/session/runner/llm.ts:125][E: packages/core/src/session/runner/llm.ts:385]

3. `runTurnAttempt@packages/core/src/session/runner/llm.ts:168` 每次 provider turn 开始时读取 session,检查 location 是否还匹配,并选择当前 agent。[E: packages/core/src/session/runner/llm.ts:168][E: packages/core/src/session/runner/llm.ts:174][E: packages/core/src/session/runner/llm.ts:175][E: packages/core/src/session/runner/llm.ts:177]

4. context epoch 在 prompt promotion 前处理:runner 先尝试 `SessionContextEpoch.initialize`,随后按 promotion 类型调用 `SessionInput.promoteSteers` 或 `SessionInput.promoteNextQueued`;queue promotion 之后还会 promote 同一 cutoff 前的 steer input。[E: packages/core/src/session/runner/llm.ts:178][E: packages/core/src/session/runner/llm.ts:182][E: packages/core/src/session/runner/llm.ts:185][E: packages/core/src/session/runner/llm.ts:187][E: packages/core/src/session/runner/llm.ts:188][E: packages/core/src/session/input.ts:245][E: packages/core/src/session/input.ts:268]

5. promotion 后,runner 使用 initialized system context 或调用 `SessionContextEpoch.prepare`;当前实现没有再在同一 turn 内重新读取 session 来比较 agent/model,而是继续用 provider-turn 开始时读出的 session 与 agent selection。[E: packages/core/src/session/runner/llm.ts:174][E: packages/core/src/session/runner/llm.ts:177][E: packages/core/src/session/runner/llm.ts:192][E: packages/core/src/session/runner/llm.ts:193]

6. runner 解析模型、读取 projected history、生成 context,再按 agent step limit 决定是否 materialize tools;`tools.materialize(agent.info?.permissions)` 是本 turn 的 V2 tool availability 边界,达到 configured steps 时 tools 变为 undefined。[E: packages/core/src/session/runner/llm.ts:194][E: packages/core/src/session/runner/llm.ts:195][E: packages/core/src/session/runner/llm.ts:196][E: packages/core/src/session/runner/llm.ts:197][E: packages/core/src/session/runner/llm.ts:198]

7. `LLM.request@packages/core/src/session/runner/llm.ts:200` 组装 provider request:字段包括 `model`、OpenAI prompt cache key、render 后的 `system`、`toLLMMessages(context, model)`、tool definitions,以及 last-step 时的 `MAX_STEPS_PROMPT` 和 `toolChoice: "none"`。[E: packages/core/src/session/runner/llm.ts:199][E: packages/core/src/session/runner/llm.ts:200][E: packages/core/src/session/runner/llm.ts:202][E: packages/core/src/session/runner/llm.ts:203][E: packages/core/src/session/runner/llm.ts:206][E: packages/core/src/session/runner/llm.ts:207][E: packages/core/src/session/runner/llm.ts:208][E: packages/core/src/session/runner/to-llm-message.ts:170]

8. `toLLMMessage@packages/core/src/session/runner/to-llm-message.ts:115` 把 projected session history 转成 provider messages:user message 变 user role text 加 file media,synthetic/shell 变 user role content,system 变 system message,compaction 变 user role checkpoint,assistant history 会按 selected model 决定 provider-native reasoning 与 hosted tool metadata 是否保留。[E: packages/core/src/session/runner/to-llm-message.ts:115][E: packages/core/src/session/runner/to-llm-message.ts:120][E: packages/core/src/session/runner/to-llm-message.ts:125][E: packages/core/src/session/runner/to-llm-message.ts:132][E: packages/core/src/session/runner/to-llm-message.ts:134][E: packages/core/src/session/runner/to-llm-message.ts:136][E: packages/core/src/session/runner/to-llm-message.ts:147][E: packages/core/src/session/runner/to-llm-message.ts:70][E: packages/core/src/session/runner/to-llm-message.ts:170]

9. provider request 执行前,runner 调用 `compaction.compactIfNeeded(...)`;如果压缩发生,它会抛出 `ContinueAfterCompaction`,由 `runTurn` 的 defect handler 递归重跑 prepared turn。[E: packages/core/src/session/runner/llm.ts:210][E: packages/core/src/session/runner/llm.ts:211][E: packages/core/src/session/runner/llm.ts:364][E: packages/core/src/session/runner/llm.ts:367][E: packages/core/src/session/runner/llm.ts:372]

10. `createLLMEventPublisher@packages/core/src/session/runner/llm.ts:213` 绑定 session/model/tool call state 和 start snapshot,随后 runner 在 `const providerStream = llm.stream(request).pipe(...)` 处执行本 provider turn 唯一的 provider stream。[E: packages/core/src/session/runner/llm.ts:212][E: packages/core/src/session/runner/llm.ts:213][E: packages/core/src/session/runner/llm.ts:221][E: packages/core/src/session/runner/llm.ts:227][E: specs/v2/session.md:50]

11. stream event 循环先处理 provider context overflow failure,再调用 `publisher.publish(event)` 投影 LLM event。[E: packages/core/src/session/runner/llm.ts:231][E: packages/core/src/session/runner/llm.ts:232][E: packages/core/src/session/runner/llm.ts:237]

12. 对非 provider-executed 的 local tool call,runner 在收到完整 tool call 后通过 `toolMaterialization.settle(event)` 启动 tool execution,再把结果转回 `LLMEvent.toolResult` 交给同一个 publisher;如果 last-step 禁用了 tools,runner 会把未 settlement 的 tool 标记失败。[E: packages/core/src/session/runner/llm.ts:238][E: packages/core/src/session/runner/llm.ts:239][E: packages/core/src/session/runner/llm.ts:240][E: packages/core/src/session/runner/llm.ts:247][E: packages/core/src/session/runner/llm.ts:255][E: packages/core/src/session/runner/llm.ts:256]

13. publisher 把 text event 映射成 `SessionEvent.Text.Started/Delta/Ended`,把 tool input/call/result/error 映射成 `SessionEvent.Tool.Input.*` 与 `Tool.Called/Success/Failed`,把 step finish 暂存为 `stepSettlement`。[E: packages/core/src/session/runner/publish-llm-event.ts:246][E: packages/core/src/session/runner/publish-llm-event.ts:255][E: packages/core/src/session/runner/publish-llm-event.ts:265][E: packages/core/src/session/runner/publish-llm-event.ts:291][E: packages/core/src/session/runner/publish-llm-event.ts:313][E: packages/core/src/session/runner/publish-llm-event.ts:337][E: packages/core/src/session/runner/publish-llm-event.ts:376][E: packages/core/src/session/runner/publish-llm-event.ts:396][E: packages/core/src/session/runner/publish-llm-event.ts:400]

14. stream closure 后,runner flush publisher,等待 tool fibers;如果 provider overflow 发生在 durable assistant output 之前,runner 可以进入 overflow compaction recovery;否则 failures 会变成 provider/tool/assistant failure events 或 interrupted cleanup。[E: packages/core/src/session/runner/llm.ts:269][E: packages/core/src/session/runner/llm.ts:274][E: packages/core/src/session/runner/llm.ts:278][E: packages/core/src/session/runner/llm.ts:281][E: packages/core/src/session/runner/llm.ts:284][E: packages/core/src/session/runner/llm.ts:286][E: packages/core/src/session/runner/llm.ts:291][E: packages/core/src/session/runner/llm.ts:297]

15. 如果 publisher/context 表示需要 continuation,`runTurnAttempt` 返回 `{ needsContinuation, step }`;outer `run` 在每轮后递增 step、把下一轮 promotion 设为 `"steer"`,优先检查新的 steer input,再检查 queue input。[E: packages/core/src/session/runner/llm.ts:340][E: packages/core/src/session/runner/llm.ts:386][E: packages/core/src/session/runner/llm.ts:388][E: packages/core/src/session/runner/llm.ts:391][E: packages/core/src/session/runner/llm.ts:392][E: packages/core/src/session/runner/llm.ts:394][E: packages/core/src/session/runner/llm.ts:395][E: packages/core/src/session/runner/llm.ts:396][E: packages/core/src/session/runner/llm.ts:398][E: packages/core/src/session/runner/llm.ts:399]

## 关键决策点

- 一次 provider turn 的 provider stream 是一个显式 `llm.stream(request)` call;tool continuation、overflow recovery、steer/queue handling 都发生在 runner 的外层控制流中。[E: packages/core/src/session/runner/llm.ts:227][E: packages/core/src/session/runner/llm.ts:340][E: packages/core/src/session/runner/llm.ts:364][E: packages/core/src/session/runner/llm.ts:386]
- V2 tool call 的 durable event 顺序由 publisher 管:tool input、tool called、tool success/failure 都是 session event,local tool execution 只是 runner 在 tool call durable 后启动的 child work。[E: packages/core/src/session/runner/publish-llm-event.ts:291][E: packages/core/src/session/runner/publish-llm-event.ts:323][E: packages/core/src/session/runner/llm.ts:247]
- V2 historical assistant replay 会检查 selected model:同 provider/model 才保留 provider-native reasoning 和 hosted tool metadata,model switch 后这些 provider-native metadata 会被省略。[E: packages/core/src/session/runner/to-llm-message.ts:70][E: packages/core/src/session/runner/to-llm-message.ts:73][E: packages/core/src/session/runner/to-llm-message.ts:88]

## 深挖入口
- Context Epoch: `spine.v2-context-epoch`
- LLM event publisher: `session-v2.llm-event-publisher`
- packages/llm provider protocol engine: `model-layer.llm-protocol-engine`

## Sources
- packages/core/src/session/runner/llm.ts
- packages/core/src/session/runner/publish-llm-event.ts
- packages/core/src/session/runner/to-llm-message.ts
- packages/core/src/session/input.ts
- packages/core/src/session/context-epoch.ts
- specs/v2/session.md

## 相关
- [spine.v2-context-epoch](v2-context-epoch.md)
- [session-v2.llm-event-publisher](../subsystems/session-v2/llm-event-publisher.md)
- [model-layer.llm-protocol-engine](../subsystems/model-layer/llm-protocol-engine.md)
