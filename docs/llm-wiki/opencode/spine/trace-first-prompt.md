---
id: spine.trace-first-prompt
title: Trace: V2 First Prompt
kind: flow
tier: T0
v: v2
source: [packages/core/src/session.ts, packages/core/src/session/input.ts, packages/core/src/session/context-epoch.ts, packages/core/src/system-context/index.ts, packages/core/src/session/projector.ts, packages/core/src/session/execution/local.ts, packages/core/src/session/run-coordinator.ts, packages/core/src/session/runner/llm.ts, packages/core/src/session/runner/publish-llm-event.ts, specs/v2/session.md]
symbols: [SessionV2.create, SessionV2.prompt, SessionInput.admit, SessionExecutionLocal.layer, SessionContextEpoch.initialize, SessionRunner.run]
related: [spine.v2-admission, spine.v2-provider-turn]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> 这条 trace 走读 V2 新 session 的第一次 prompt:session 已创建后,用户 prompt 先进入 durable inbox,execution wake 触发 runner,runner 初始化 Context Epoch,再执行第一轮 provider turn。

## 能回答的问题
- V2 first prompt 从 API 到模型调用的最短路径是什么?
- `PromptAdmitted` 与 `Prompted` 在 first prompt 中先后如何出现?
- 首次 System Context baseline 是在 prompt 可见前还是可见后初始化?
- 第一轮 provider stream 结束后怎样判断是否继续?

```mermaid
flowchart TD
  Create["SessionV2.create"] --> Created["SessionV1.Event.Created projected SessionTable"]
  Created --> Prompt["SessionV2.prompt"]
  Prompt --> Admit["SessionInput.admit -> PromptAdmitted"]
  Prompt --> Wake["enqueueWake -> SessionExecution.wake"]
  Wake --> Coord["SessionRunCoordinator.wake"]
  Coord --> Drain["SessionExecutionLocal.drain"]
  Drain --> Run["SessionRunner.run"]
  Run --> Init["SessionContextEpoch.initialize"]
  Init --> Promote["promoteSteers"]
  Promote["Prompted projection"] --> Request["LLM.request"]
  Request --> Stream["llm.stream(request)"]
  Stream --> Publish["publish Step/Text/Tool events"]
```

## 端到端步骤

1. `SessionV2.create@packages/core/src/session.ts:208` 为未提供 id 的 caller 生成 session id,先查 `SessionStore`,再解析 project 并发布 `SessionV1.Event.Created` 以投影 session read model。[E: packages/core/src/session.ts:208][E: packages/core/src/session.ts:209][E: packages/core/src/session.ts:210][E: packages/core/src/session.ts:212][E: packages/core/src/session.ts:242]

2. caller 调 `SessionV2.prompt@packages/core/src/session.ts:360` 时,service 先确认 session 存在,解析 prompt,后续在 `resume !== false` 时调用 `execution.wake(admitted.sessionID)`。[E: packages/core/src/session.ts:360][E: packages/core/src/session.ts:363][E: packages/core/src/session.ts:364][E: packages/core/src/session.ts:382]

3. prompt id 未传入时,`SessionV2.prompt` 生成 `SessionMessage.ID`;delivery 未传入时默认 `"steer"`。[E: packages/core/src/session.ts:365][E: packages/core/src/session.ts:366]

4. `SessionInput.admit@packages/core/src/session.ts:368` 写入 durable admission;底层 `SessionInput.admit` 发布 `PromptAdmitted`,并把 durable event seq 写成 `Admitted.admittedSeq`。[E: packages/core/src/session.ts:368][E: packages/core/src/session/input.ts:55][E: packages/core/src/session/input.ts:67][E: packages/core/src/session/input.ts:68]

5. `SessionV2.prompt` 在 `resume !== false` 时只把 session id 交给 `execution.wake`;`SessionExecution.wake` 的接口是按 session id 注册新 work,重复 wake 可以 coalesce。[E: packages/core/src/session.ts:382][E: packages/core/src/session/execution.ts:15]

6. 在 local execution layer 里,`wake` 映射到 `SessionRunCoordinator.wake`;如果 session idle,coordinator 会创建 entry 并 start owner fiber。[E: packages/core/src/session/execution/local.ts:35][E: packages/core/src/session/run-coordinator.ts:81][E: packages/core/src/session/run-coordinator.ts:89][E: packages/core/src/session/run-coordinator.ts:91]

7. owner fiber 的 drain 是 `SessionExecutionLocal.drain`:它通过 `SessionStore.get` 读取 session,用 `LocationServiceMap.get(session.location)` 取得 location-scoped services,再调用 `SessionRunner.run({ sessionID, force: mode === "run" })`。[E: packages/core/src/session/execution/local.ts:16][E: packages/core/src/session/execution/local.ts:18][E: packages/core/src/session/execution/local.ts:21]

8. `SessionRunner.run@packages/core/src/session/runner/llm.ts:378` 看到 pending steer 后进入 active loop;第一次 logical turn 的 promotion 值为 `"steer"`。[E: packages/core/src/session/runner/llm.ts:378][E: packages/core/src/session/runner/llm.ts:382][E: packages/core/src/session/runner/llm.ts:386]

9. `runTurnAttempt@packages/core/src/session/runner/llm.ts:168` 读取 session,选择 agent,然后在 promotion 之前调用 `SessionContextEpoch.initialize`。[E: packages/core/src/session/runner/llm.ts:168][E: packages/core/src/session/runner/llm.ts:174][E: packages/core/src/session/runner/llm.ts:177][E: packages/core/src/session/runner/llm.ts:178]

10. 首次 epoch 不存在时,`initializeOnce` 调 `SystemContext.initialize` 并 insert baseline/snapshot;runner 在 prompt promotion 前调用 initialize,随后把 `system.baseline` 放入 provider request system parts。[E: packages/core/src/session/context-epoch.ts:80][E: packages/core/src/session/context-epoch.ts:85][E: packages/core/src/session/context-epoch.ts:86][E: packages/core/src/session/context-epoch.ts:87][E: packages/core/src/session/runner/llm.ts:178][E: packages/core/src/session/runner/llm.ts:203]

11. runner 取得 cutoff seq 后调用 `SessionInput.promoteSteers`;promotion publish helper 发布 `Prompted`,projector 再通过 `projectPrompted` 标记 inbox row promoted,并调用通用 projection `run(db,event)` 写入可见 Session message。[E: packages/core/src/session/runner/llm.ts:183][E: packages/core/src/session/runner/llm.ts:185][E: packages/core/src/session/input.ts:245][E: packages/core/src/session/input.ts:251][E: packages/core/src/session/input.ts:258][E: packages/core/src/session/input.ts:265][E: packages/core/src/session/input.ts:225][E: packages/core/src/session/projector.ts:350][E: packages/core/src/session/projector.ts:353][E: packages/core/src/session/projector.ts:361]

12. runner 重新解析 model/history,materialize tools,构造 `LLM.request`,并把 `system.baseline` 放入 provider system parts。[E: packages/core/src/session/runner/llm.ts:194][E: packages/core/src/session/runner/llm.ts:195][E: packages/core/src/session/runner/llm.ts:198][E: packages/core/src/session/runner/llm.ts:200][E: packages/core/src/session/runner/llm.ts:203]

13. provider turn 在 `llm.stream(request)` 处打开一次 stream;每个 LLM event 经过 `publisher.publish(event)` 投影成 session events。[E: packages/core/src/session/runner/llm.ts:227][E: packages/core/src/session/runner/llm.ts:237]

14. publisher 在收到 text start/delta/end 时发布 Text events,step finish 时 flush 并记录 settlement;runner 随后发布 `SessionEvent.Step.Ended`。[E: packages/core/src/session/runner/publish-llm-event.ts:246][E: packages/core/src/session/runner/publish-llm-event.ts:248][E: packages/core/src/session/runner/publish-llm-event.ts:255][E: packages/core/src/session/runner/publish-llm-event.ts:265][E: packages/core/src/session/runner/publish-llm-event.ts:396][E: packages/core/src/session/runner/llm.ts:321]

15. stream 成功结束且没有 provider error 时,runner 返回 `needsContinuation`;outer loop 若没有 continuation 也没有新的 steer,再检查 queue,没有 queue 就退出 drain。[E: packages/core/src/session/runner/llm.ts:340][E: packages/core/src/session/runner/llm.ts:392][E: packages/core/src/session/runner/llm.ts:396][E: packages/core/src/session/runner/llm.ts:398]

## 关键决策点

- first prompt 的 user text 在 `Prompted` 前只是 durable inbox;V2 spec 明确说 admitted inputs 在 runner 发布 `Prompted` 前不进入 model-visible Session history。[E: packages/core/src/session/input.ts:21][E: packages/core/src/session/input.ts:245][E: specs/v2/session.md:35]
- first prompt 的 baseline 初始化早于 prompt promotion;如果 context source unavailable,`SystemContext.initialize` 会阻塞 initialization,runner 不会把 pending prompt 提前变成 model-visible history。[E: packages/core/src/session/runner/llm.ts:178][E: packages/core/src/system-context/index.ts:198]
- execution wake 是 advisory:prompt admission 返回 `Admitted`,而 `SessionRunCoordinator.wake` 只注册/启动 drain,不会把 provider turn 结果作为 prompt 返回值。[E: packages/core/src/session.ts:382][E: packages/core/src/session/run-coordinator.ts:81]

## Sources
- packages/core/src/session.ts
- packages/core/src/session/input.ts
- packages/core/src/session/context-epoch.ts
- packages/core/src/system-context/index.ts
- packages/core/src/session/projector.ts
- packages/core/src/session/execution/local.ts
- packages/core/src/session/run-coordinator.ts
- packages/core/src/session/runner/llm.ts
- packages/core/src/session/runner/publish-llm-event.ts
- specs/v2/session.md

## 相关
- [spine.v2-admission](v2-admission.md)
- [spine.v2-provider-turn](v2-provider-turn.md)
