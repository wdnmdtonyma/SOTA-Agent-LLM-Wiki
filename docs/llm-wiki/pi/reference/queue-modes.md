---
id: ref.agent.queue-modes
title: 队列排空模式目录
kind: reference
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/agent.ts
symbols:
  - QueueMode
related:
  - subsys.agent-core.message-queue
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.agent.queue-modes` 是 `QueueMode` 的逐实例目录:覆盖 `"all"` 与 `"one-at-a-time"` 两个队列排空模式、它们在 steering/follow-up queue 上的默认绑定,以及 `PendingMessageQueue.peek()` / `drain()` 的实现语义边界。

## 能回答的问题

- `QueueMode` 当前允许哪些 literal 值?
- `"all"` 和 `"one-at-a-time"` 各自如何影响一次 queue drain?
- `AgentOptions.steeringMode` 与 `AgentOptions.followUpMode` 默认使用哪个模式?
- `Agent.steeringMode` / `Agent.followUpMode` setter 会改写什么运行时状态?
- `peek()` 与 `drain()` 谁决定 batch size?
- 哪些语义是 `types.ts` 可直接证明,哪些来自 `agent.ts` 的实现?

## 覆盖摘要

`QueueMode` 在 `packages/agent/src/types.ts` 中是 closed string-literal union,目前只有 `"all"` 与 `"one-at-a-time"` 两个实例。[E: packages/agent/src/types.ts:55]

`QueueMode` 不直接保存队列内容;“排空多少条”的运行时语义由 `Agent` wrapper 的 `PendingMessageQueue.peek()` 决定 batch,`drain()` 再按该 batch 长度切片消费。[E: packages/agent/src/agent.ts:159] [E: packages/agent/src/agent.ts:165] [E: packages/agent/src/agent.ts:166] [E: packages/agent/src/agent.ts:167]

## QueueMode 实例

| 值 | 类型证据 | 一次 drain 的语义 | 默认 / 绑定点 | 为什么存在 | 源 path |
| --- | --- | --- | --- | --- | --- |
| `"all"` | `QueueMode` union 的第一个 literal 值。[E: packages/agent/src/types.ts:55] | `peek()` 遇到 `mode === "all"` 时返回 `messages.slice()` 副本;`drain()` 再把内部队列切到 `slice(drained.length)`,因此该 drain point 会交付当时所有已排队消息并清空队列。[E: packages/agent/src/agent.ts:160] [E: packages/agent/src/agent.ts:165] [E: packages/agent/src/agent.ts:167] | 不是 `Agent` 构造默认值;调用方必须通过 `AgentOptions.steeringMode`、`AgentOptions.followUpMode` 或运行时 setter 选择它。[E: packages/agent/src/agent.ts:134] [E: packages/agent/src/agent.ts:135] [E: packages/agent/src/agent.ts:247] [E: packages/agent/src/agent.ts:248] [E: packages/agent/src/agent.ts:281] [E: packages/agent/src/agent.ts:290] | 用于把同一队列中已累积的 steering 或 follow-up messages 作为一个批次注入下一次 loop poll,避免多次 poll 才能消化积压队列。[I] | `packages/agent/src/types.ts`; implementation in `packages/agent/src/agent.ts` |
| `"one-at-a-time"` | `QueueMode` union 的第二个 literal 值。[E: packages/agent/src/types.ts:55] | `peek()` 的非 `"all"` 分支读取队首 `messages[0]`;队列为空返回 `[]`,非空返回 `[first]`。`drain()` 按 length 0 或 1 切片,所以一次 drain 只交付最老的一条并保留剩余消息。[E: packages/agent/src/agent.ts:161] [E: packages/agent/src/agent.ts:162] [E: packages/agent/src/agent.ts:165] [E: packages/agent/src/agent.ts:167] | `Agent` 构造时 steering queue 与 follow-up queue 都默认使用 `"one-at-a-time"`。[E: packages/agent/src/agent.ts:247] [E: packages/agent/src/agent.ts:248] | 用于让 queued steering/follow-up messages 逐条进入后续 drain point,使多条排队输入不会在同一个 poll 中全部并入上下文。[I] | `packages/agent/src/types.ts`; implementation in `packages/agent/src/agent.ts` |

## Public API 绑定

`AgentOptions` 暴露 `steeringMode?: QueueMode` 与 `followUpMode?: QueueMode`,两个字段分别用于构造 steering queue 与 follow-up queue 的初始 mode。[E: packages/agent/src/agent.ts:134] [E: packages/agent/src/agent.ts:135] [E: packages/agent/src/agent.ts:247] [E: packages/agent/src/agent.ts:248]

`Agent.steeringMode` setter 直接写 `this.steeringQueue.mode`,getter 读回同一字段;`Agent.followUpMode` setter/getter 对 `followUpQueue.mode` 做同样操作。因此运行时改 mode 只影响后续 peek/drain,不会重排或修改已经 queued 的 `AgentMessage[]` 内容。[E: packages/agent/src/agent.ts:281] [E: packages/agent/src/agent.ts:282] [E: packages/agent/src/agent.ts:285] [E: packages/agent/src/agent.ts:286] [E: packages/agent/src/agent.ts:290] [E: packages/agent/src/agent.ts:291] [E: packages/agent/src/agent.ts:294] [E: packages/agent/src/agent.ts:295]

`Agent.createLoopConfig()` 把 `steeringQueue.drain()` 暴露成 `getSteeringMessages`,把 `followUpQueue.drain()` 暴露成 `getFollowUpMessages`。`Agent.peekQueuedMessages()` 走 `peek()` 而不是 `drain()`,因此预览不消费。底层 loop 何时调用这些 hooks 属于 `subsys.agent-core.message-queue` / `subsys.agent-core.turn-control` 的控制流范围。[E: packages/agent/src/agent.ts:496] [E: packages/agent/src/agent.ts:501] [E: packages/agent/src/agent.ts:503] [E: packages/agent/src/agent.ts:330]

## 边界与 Gotcha

`"one-at-a-time"` 在 `PendingMessageQueue.peek()` 中不是显式 `if (mode === "one-at-a-time")` 分支,而是除 `"all"` 以外的 fallback 分支;由于 `QueueMode` 当前只有两个 literal 值,这个 fallback 等价于 `"one-at-a-time"`。[E: packages/agent/src/types.ts:55] [E: packages/agent/src/agent.ts:160] [E: packages/agent/src/agent.ts:161]

`QueueMode` 只决定一次 drain 的 batch size,不决定 steering 与 follow-up 的优先级、active run 并发保护、或 loop 停止条件;这些由 `Agent.continue()`、`runLoop` 和 message-queue/turn-control 节点解释。[I]

`finishTurn` 返回 `{ action: "end" }` 时 loop 不再 poll 队列,因此当时还在 queue 里的消息会留到下一次 run,而不是被当前 drain 吃掉。该停止点在 turn-control,不在 `QueueMode` 本身。[I]

## Sources

- packages/agent/src/types.ts
- packages/agent/src/agent.ts

## 相关

- [subsys.agent-core.message-queue](../subsystems/agent-core/message-queue.md): `PendingMessageQueue`、`steer()`、`followUp()`、`peekQueuedMessages()` 与 queue drain hooks 的运行时实现。
