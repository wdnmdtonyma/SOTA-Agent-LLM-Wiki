---
id: subsys.agent-core.agent-harness-lifecycle
title: AgentHarness 操作与关闭生命周期
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/types.ts
symbols:
  - AgentHarness
  - AgentHarnessPhase
  - AgentHarnessError
  - AbortResult
related:
  - spine.agent-loop
  - subsys.agent-core.turn-control
  - subsys.agent-core.message-queue
  - subsys.agent-core.hooks
  - subsys.agent-core.compaction
  - subsys.agent-core.branch-summary
  - ref.agent.agent-events
evidence: explicit
status: verified
updated: a8ee03b815
---

> `subsys.agent-core.agent-harness-lifecycle` 说明 `AgentHarness` 如何区分长期实例状态、单次可取消 operation 与并发 mutation，并比较可恢复的 `abort()` 和永久的 shutdown。

## 能回答的问题

- prompt、compact、tree navigation 如何共享 active abort signal？
- operation 与 mutation 为什么分开跟踪？
- active turn 期间的 session mutation 在何时落盘？
- `abort()`、`waitForIdle()`、`requestShutdown()`、`waitForShutdown()` 有什么差别？
- shutdown 后哪些 API 会拒绝调用？

## 生命周期状态

`AgentHarnessPhase` 包含 idle、turn、compaction、branch_summary 与 retry；实例初始为 idle，并保存 active abort controller、按 kind 跟踪的 tasks、shutdown promise 与永久 shutdown 标志。[E: packages/agent/src/harness/types.ts:583] [E: packages/agent/src/harness/agent-harness.ts:181] [E: packages/agent/src/harness/agent-harness.ts:182] [E: packages/agent/src/harness/agent-harness.ts:183] [E: packages/agent/src/harness/agent-harness.ts:185]

`prompt()`、`skill()`、`promptFromTemplate()` 只允许从 idle 开始，并进入 turn；`compact()` 与 `navigateTree()` 也要求 idle，分别进入 compaction 与 branch_summary。[E: packages/agent/src/harness/agent-harness.ts:692] [E: packages/agent/src/harness/agent-harness.ts:694] [E: packages/agent/src/harness/agent-harness.ts:695] [E: packages/agent/src/harness/agent-harness.ts:708] [E: packages/agent/src/harness/agent-harness.ts:730] [E: packages/agent/src/harness/agent-harness.ts:785] [E: packages/agent/src/harness/agent-harness.ts:786] [E: packages/agent/src/harness/agent-harness.ts:847] [E: packages/agent/src/harness/agent-harness.ts:848]

`assertNotShutDown()` 是永久状态门：一旦 `isShutdown` 为真，受保护入口统一抛 `AgentHarnessError("invalid_state", ...)`。[E: packages/agent/src/harness/agent-harness.ts:229] [E: packages/agent/src/harness/agent-harness.ts:230] `AgentHarnessError` 提供 busy、invalid_state、session、hook、compaction、branch_summary 等稳定顶层分类。[E: packages/agent/src/harness/types.ts:246] [E: packages/agent/src/harness/types.ts:258] [E: packages/agent/src/harness/types.ts:264]

## Operation 与 Mutation 跟踪

`startOperation()` 为当前 prompt/skill/template/compact/navigation 创建 `AbortController`，把 signal 返回给实际工作，并用一个 tracked `operation` promise 表示其 lifetime；调用 finish 后清除 active controller 并结算该 promise。[E: packages/agent/src/harness/agent-harness.ts:337] [E: packages/agent/src/harness/agent-harness.ts:338] [E: packages/agent/src/harness/agent-harness.ts:340] [E: packages/agent/src/harness/agent-harness.ts:341] [E: packages/agent/src/harness/agent-harness.ts:349] [E: packages/agent/src/harness/agent-harness.ts:351]

`track(kind, operation)` 把 operation 或 mutation 加入 `activeTasks`，并在成功或失败的 finally 中删除；`waitForTasks(kind?)` 会循环等待匹配 kind 的快照，直到没有新任务。[E: packages/agent/src/harness/agent-harness.ts:357] [E: packages/agent/src/harness/agent-harness.ts:362] [E: packages/agent/src/harness/agent-harness.ts:364] [E: packages/agent/src/harness/agent-harness.ts:366] [E: packages/agent/src/harness/agent-harness.ts:371] [E: packages/agent/src/harness/agent-harness.ts:373] [E: packages/agent/src/harness/agent-harness.ts:376]

`appendMessage()`、`setModel()`、`setThinkingLevel()`、`setTools()` 与 `setActiveTools()` 等持久化 mutation 使用 `track("mutation", ...)`。[E: packages/agent/src/harness/agent-harness.ts:768] [E: packages/agent/src/harness/agent-harness.ts:770] [E: packages/agent/src/harness/agent-harness.ts:946] [E: packages/agent/src/harness/agent-harness.ts:948] [E: packages/agent/src/harness/agent-harness.ts:990] [E: packages/agent/src/harness/agent-harness.ts:992] [E: packages/agent/src/harness/agent-harness.ts:1030] [E: packages/agent/src/harness/agent-harness.ts:1032]

## Turn 内 mutation 与 save point

idle 时 mutation 直接 append 到 session；turn 进行中则先进入 `pendingSessionWrites`，避免与 agent event writes 交错。[E: packages/agent/src/harness/agent-harness.ts:772] [E: packages/agent/src/harness/agent-harness.ts:773] [E: packages/agent/src/harness/agent-harness.ts:775] model/thinking/tools 更新也采用相同分支。[E: packages/agent/src/harness/agent-harness.ts:951] [E: packages/agent/src/harness/agent-harness.ts:954] [E: packages/agent/src/harness/agent-harness.ts:973] [E: packages/agent/src/harness/agent-harness.ts:976] [E: packages/agent/src/harness/agent-harness.ts:1006] [E: packages/agent/src/harness/agent-harness.ts:1009]

`flushPendingSessionWrites()` 按队首顺序逐条映射回 `Session` append/move API，成功后才 shift。[E: packages/agent/src/harness/agent-harness.ts:554] [E: packages/agent/src/harness/agent-harness.ts:555] [E: packages/agent/src/harness/agent-harness.ts:558] [E: packages/agent/src/harness/agent-harness.ts:574] [E: packages/agent/src/harness/agent-harness.ts:576] turn_end 在发出 save_point 前 flush，agent_end 再 flush、切回 idle 并发出 settled。[E: packages/agent/src/harness/agent-harness.ts:586] [E: packages/agent/src/harness/agent-harness.ts:594] [E: packages/agent/src/harness/agent-harness.ts:596] [E: packages/agent/src/harness/agent-harness.ts:599] [E: packages/agent/src/harness/agent-harness.ts:601] [E: packages/agent/src/harness/agent-harness.ts:603]

## Signal 传播

prompt/skill/template 把 operation signal 交给 `executeTurn()`，后者继续传给 `runAgentLoop()` 与 event handler。[E: packages/agent/src/harness/agent-harness.ts:696] [E: packages/agent/src/harness/agent-harness.ts:699] [E: packages/agent/src/harness/agent-harness.ts:623] [E: packages/agent/src/harness/agent-harness.ts:662] [E: packages/agent/src/harness/agent-harness.ts:663]

compact 把同一个 signal 写入 `session_before_compact` hook event，并传给底层 compaction；navigateTree 则把 signal 写入 `session_before_tree`，并传给 branch-summary generation。[E: packages/agent/src/harness/agent-harness.ts:796] [E: packages/agent/src/harness/agent-harness.ts:801] [E: packages/agent/src/harness/agent-harness.ts:812] [E: packages/agent/src/harness/agent-harness.ts:866] [E: packages/agent/src/harness/agent-harness.ts:869] [E: packages/agent/src/harness/agent-harness.ts:882] 对应 event type 将 signal 标为必填 `AbortSignal`。[E: packages/agent/src/harness/types.ts:667] [E: packages/agent/src/harness/types.ts:672] [E: packages/agent/src/harness/types.ts:681] [E: packages/agent/src/harness/types.ts:684]

## Abort 与 Shutdown

`abort()` 是可恢复的当前工作取消：它要求 harness 尚未 shutdown，清空 steer/follow-up 队列，abort active controller，发 queue_update，等待 operation idle，再发 abort event；多个阶段错误会在结束时合并抛出。[E: packages/agent/src/harness/agent-harness.ts:1123] [E: packages/agent/src/harness/agent-harness.ts:1124] [E: packages/agent/src/harness/agent-harness.ts:1125] [E: packages/agent/src/harness/agent-harness.ts:1129] [E: packages/agent/src/harness/agent-harness.ts:1132] [E: packages/agent/src/harness/agent-harness.ts:1137] [E: packages/agent/src/harness/agent-harness.ts:1142] [E: packages/agent/src/harness/agent-harness.ts:1146]

`waitForIdle()` 只等待 kind 为 operation 的 tasks，不等待独立 mutation。[E: packages/agent/src/harness/agent-harness.ts:1153] [E: packages/agent/src/harness/agent-harness.ts:1154]

`requestShutdown()` 是永久且幂等的实例关闭：它设置 shutdown 标志，丢弃 pending writes 与三类消息队列，abort 当前 operation，并以不带 kind 的 `waitForTasks()` 等待 operation 和 mutation 全部结束。[E: packages/agent/src/harness/agent-harness.ts:1104] [E: packages/agent/src/harness/agent-harness.ts:1105] [E: packages/agent/src/harness/agent-harness.ts:1106] [E: packages/agent/src/harness/agent-harness.ts:1107] [E: packages/agent/src/harness/agent-harness.ts:1111] [E: packages/agent/src/harness/agent-harness.ts:1112]

`waitForShutdown()` 只接受已经发起的 shutdown；提前调用会以 invalid_state 拒绝，否则返回同一 shutdown promise。[E: packages/agent/src/harness/agent-harness.ts:1116] [E: packages/agent/src/harness/agent-harness.ts:1117] [E: packages/agent/src/harness/agent-harness.ts:1118] [E: packages/agent/src/harness/agent-harness.ts:1120]

## 设计动机与权衡

phase 防止两个主 operation 重叠，task tracking 则覆盖不一定改变 phase 的 mutation。于是 abort 可以只等当前 operation，而 shutdown 可以等待整个实例已经接受的工作。[E: packages/agent/src/harness/agent-harness.ts:694] [E: packages/agent/src/harness/agent-harness.ts:371] [E: packages/agent/src/harness/agent-harness.ts:1112] [E: packages/agent/src/harness/agent-harness.ts:1154] [I]

## Gotcha

- `abort()` 不清空 nextTurn 或 pending session writes；`requestShutdown()` 才清空这两者。[E: packages/agent/src/harness/agent-harness.ts:1125] [E: packages/agent/src/harness/agent-harness.ts:1128] [E: packages/agent/src/harness/agent-harness.ts:1107] [E: packages/agent/src/harness/agent-harness.ts:1110]
- shutdown 是 harness 实例级终止，不调用 session repository delete/dispose；durable session 的删除与 repository 生命周期由宿主另行管理。[E: packages/agent/src/harness/agent-harness.ts:1104] [I]
- compact 与 navigateTree 在写入 compaction/leaf 前再次检查 shutdown，避免关闭请求后提交已生成结果。[E: packages/agent/src/harness/agent-harness.ts:819] [E: packages/agent/src/harness/agent-harness.ts:820] [E: packages/agent/src/harness/agent-harness.ts:910] [E: packages/agent/src/harness/agent-harness.ts:911]

## 跨包边界

`AgentHarness` 位于 `pi-agent-core`：它组合 `Session`、agent loop、hooks、queue、compaction 与 branch summary，但不拥有具体应用的进程生命周期或 repository disposal。[E: packages/agent/src/harness/agent-harness.ts:173] [I]

## Sources

- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/types.ts

## 相关

- [spine.agent-loop](../../spine/agent-loop.md)：prompt 到 agent loop 的端到端路径。
- [subsys.agent-core.turn-control](turn-control.md)：steer/follow-up/nextTurn 语义。
- [subsys.agent-core.message-queue](message-queue.md)：消息队列 drain 规则。
- [subsys.agent-core.hooks](hooks.md)：hook registration 与 result merge。
- [subsys.agent-core.compaction](compaction.md)：compaction preparation 与执行。
- [subsys.agent-core.branch-summary](branch-summary.md)：tree navigation summary。
- [ref.agent.agent-events](../../reference/agent-events.md)：事件清单。
