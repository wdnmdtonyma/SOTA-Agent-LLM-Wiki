---
id: spine.trace-steer-mid-turn
title: Trace: V2 Steer Mid Turn
kind: flow
tier: T0
v: v2
source: [packages/core/src/session.ts, packages/core/src/session/input.ts, packages/core/src/session/run-coordinator.ts, packages/core/src/session/runner/llm.ts]
symbols: [SessionV2.prompt, SessionInput.admit, SessionRunCoordinator.wake, SessionRunner.run]
related: [spine.v2-coordinator, session-v2.inbox]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 mid-turn steer 是把新的 user prompt 作为 durable steer input 入列,再通过 coordinator wake/coalesce 让当前或下一次 safe boundary promote;它不会直接改写已经打开的 provider stream。[I]

## 能回答的问题
- 用户在 V2 provider turn 进行中再次 prompt 会发生什么?
- active drain 中的 wake 如何 coalesce?
- steer prompt 在哪个安全边界进入 model-visible history?
- mid-turn steer 会不会直接插入正在进行的 provider stream?

```mermaid
flowchart TD
  Provider["active llm.stream(request)"] --> Events["current provider events continue"]
  User2["second prompt delivery=steer"] --> Admit["PromptAdmitted"]
  Admit --> Wake["execution.wake(sessionID)"]
  Wake --> Active["Coordinator active entry exists"]
  Active --> Pending["entry.pendingWake = true"]
  Events --> TurnEnd["provider turn settles"]
  TurnEnd --> RunnerCheck["runner checks pending steer"]
  RunnerCheck --> Promote["promoteSteers(cutoff)"]
  Promote --> NextTurn["next provider turn sees steered prompt"]
```

## 端到端步骤

1. mid-turn user input still enters through `SessionV2.prompt@packages/core/src/session.ts:360`;the method requires the session to exist, generates/uses a message id, and defaults delivery to `"steer"` if caller omits delivery。[E: packages/core/src/session.ts:360][E: packages/core/src/session.ts:363][E: packages/core/src/session.ts:365][E: packages/core/src/session.ts:366]

2. `SessionInput.admit@packages/core/src/session.ts:368` calls the admission path that publishes `PromptAdmitted`;the projector stores the input row without `promoted_seq`, pending checks look for `promoted_seq IS NULL`, and promotion is the path that sets `promoted_seq`。[E: packages/core/src/session.ts:368][E: packages/core/src/session/input.ts:55][E: packages/core/src/session/input.ts:68][E: packages/core/src/session/input.ts:101][E: packages/core/src/session/input.ts:129][E: packages/core/src/session/input.ts:181]

3. `SessionV2.prompt` calls `execution.wake(admitted.sessionID)` unless `resume === false`;`SessionExecution.wake` registers newly recorded work by session id。[E: packages/core/src/session.ts:382][E: packages/core/src/session/execution.ts:15]

4. 如果同一 session 的 drain 正在 active,`SessionRunCoordinator.wake` 会读取 active entry,把 `entry.pendingWake` 置为 true,然后返回而不启动第二个 owner fiber。[E: packages/core/src/session/run-coordinator.ts:81][E: packages/core/src/session/run-coordinator.ts:83][E: packages/core/src/session/run-coordinator.ts:85][E: packages/core/src/session/run-coordinator.ts:86]

5. wake coalesce 是布尔 pending 语义:多个 steer wake 在同一 active drain 中会合并成一个 `pendingWake`,不再保存 admitted seq。[E: packages/core/src/session/run-coordinator.ts:20][E: packages/core/src/session/run-coordinator.ts:52][E: packages/core/src/session/run-coordinator.ts:53]

6. 当前 provider stream 的 event loop 仍围绕已经构造好的 `request` 运行;源码中的 stream loop只处理 provider event、publisher 与 local tool settle,没有读取新的 inbox row 来修改当前 request。[E: packages/core/src/session/runner/llm.ts:245][E: packages/core/src/session/runner/llm.ts:255][I]

7. 当前 provider turn 结束后,outer runner loop 把下一轮 promotion 设为 `"steer"`;如果本轮没有 continuation,它会调用 `SessionInput.hasPending(..., "steer")` 检查是否已有新 steer input。[E: packages/core/src/session/runner/llm.ts:395][E: packages/core/src/session/runner/llm.ts:396]

8. 当 runner 进入下一次 `runTurnAttempt` 且 promotion 为 `"steer"` 时,它先读取 latest seq 作为 cutoff,再调用 `SessionInput.promoteSteers(db, events, session.id, cutoff)`。[E: packages/core/src/session/runner/llm.ts:183][E: packages/core/src/session/runner/llm.ts:185]

9. `promoteSteers@packages/core/src/session/input.ts:245` 选择当前 session 中 `promoted_seq IS NULL`、delivery 为 `"steer"`、且 `admitted_seq <= cutoff` 的 rows,按 admitted seq 升序交给 `publish`,而 `publish` 对每行发布 `Prompted`。[E: packages/core/src/session/input.ts:245][E: packages/core/src/session/input.ts:251][E: packages/core/src/session/input.ts:256][E: packages/core/src/session/input.ts:257][E: packages/core/src/session/input.ts:258][E: packages/core/src/session/input.ts:259][E: packages/core/src/session/input.ts:262][E: packages/core/src/session/input.ts:265][E: packages/core/src/session/input.ts:225]

10. 如果当前 drain 在看到 pending steer 前已经完全结束,coordinator `settle` 会在成功且未 stopping 且 `entry.pendingWake` 为 true 时清除 flag 并 start successor drain。[E: packages/core/src/session/run-coordinator.ts:51][E: packages/core/src/session/run-coordinator.ts:52][E: packages/core/src/session/run-coordinator.ts:53][E: packages/core/src/session/run-coordinator.ts:54]

11. interrupt 会改变这条路径:coordinator `interrupt` 把 active entry 标记为 stopping,清掉 `pendingWake`,并 interrupt owner fiber。[E: packages/core/src/session/run-coordinator.ts:94][E: packages/core/src/session/run-coordinator.ts:96][E: packages/core/src/session/run-coordinator.ts:98][E: packages/core/src/session/run-coordinator.ts:99][E: packages/core/src/session/run-coordinator.ts:100]

## 关键决策点

- steer 是 durable inbox 语义: admission 先发布 `PromptAdmitted` 并投影到 `SessionInputTable`,之后 promotion 才把 row 提升到 model-visible message;它不是 provider stream 的即时 stdin,因为当前 stream loop 只消费已建立的 `llm.stream(request)` 事件。[E: packages/core/src/session/input.ts:55][E: packages/core/src/session/input.ts:101][E: packages/core/src/session/input.ts:225][E: packages/core/src/session/runner/llm.ts:183][E: packages/core/src/session/runner/llm.ts:227][I]
- coordinator pending wake 是兜底机制:当前 drain 如果自己看到 pending steer 会继续,如果没看到也会由 pending successor drain 重新检查。[E: packages/core/src/session/runner/llm.ts:396][E: packages/core/src/session/run-coordinator.ts:52]
- `resume: false` 会跳过 `execution.wake`,因此只 admission 而不主动唤醒 runner。[E: packages/core/src/session.ts:382]

## Sources
- packages/core/src/session.ts
- packages/core/src/session/input.ts
- packages/core/src/session/run-coordinator.ts
- packages/core/src/session/runner/llm.ts

## 相关
- [spine.v2-coordinator](v2-coordinator.md)
- [session-v2.inbox](../subsystems/session-v2/inbox.md)
