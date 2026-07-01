---
id: ref.agent.queue-modes
title: 队列排空模式目录
kind: reference
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
symbols:
  - QueueMode
related:
  - subsys.agent-core.message-queue
evidence: explicit
status: verified
updated: 8c943640
---

> `ref.agent.queue-modes` 是 `QueueMode` 的逐实例目录:覆盖 `"all"` 与 `"one-at-a-time"` 两个队列排空模式、它们在 steering/follow-up queue 上的默认绑定,以及 `PendingMessageQueue.drain()` 的实现语义边界。

## 能回答的问题

- `QueueMode` 当前允许哪些 literal 值?
- `"all"` 和 `"one-at-a-time"` 各自如何影响一次 queue drain?
- `AgentOptions.steeringMode` 与 `AgentOptions.followUpMode` 默认使用哪个模式?
- `Agent.steeringMode` / `Agent.followUpMode` setter 会改写什么运行时状态?
- 哪些语义是 `types.ts` 可直接证明,哪些来自 `agent.ts` 或 `subsys.agent-core.message-queue` 的实现推断?

## 覆盖摘要

`QueueMode` 在 `packages/agent/src/types.ts` 中是 closed string-literal union,目前只有 `"all"` 与 `"one-at-a-time"` 两个实例。[E: packages/agent/src/types.ts:49]

`QueueMode` 不直接保存队列内容;“排空多少条”的运行时语义由 `Agent` wrapper 的 `PendingMessageQueue.drain()` 实现证明,不在本节点 frontmatter source 内,因此按跨 source 推断标 `[I]`。[I][E: packages/agent/src/agent.ts:139][E: packages/agent/src/agent.ts:140][E: packages/agent/src/agent.ts:151][E: packages/agent/src/agent.ts:150][E: packages/agent/src/agent.ts:151]

## QueueMode 实例

| 值 | 类型证据 | 一次 drain 的语义 | 默认 / 绑定点 | 为什么存在 | 源 path |
| --- | --- | --- | --- | --- | --- |
| `"all"` | `QueueMode` union 的第一个 literal 值。[E: packages/agent/src/types.ts:49] | `PendingMessageQueue.drain()` 遇到 `mode === "all"` 时返回当前 `messages.slice()` 副本并把内部队列替换为空数组,所以该 drain point 会交付当时所有已排队消息。[I][E: packages/agent/src/agent.ts:140][E: packages/agent/src/agent.ts:151][E: packages/agent/src/agent.ts:147][E: packages/agent/src/agent.ts:148] | 不是 `Agent` 构造默认值;调用方必须通过 `AgentOptions.steeringMode`、`AgentOptions.followUpMode` 或运行时 setter 选择它。[I][E: packages/agent/src/agent.ts:114][E: packages/agent/src/agent.ts:115][E: packages/agent/src/agent.ts:222][E: packages/agent/src/agent.ts:223][E: packages/agent/src/agent.ts:266][E: packages/agent/src/agent.ts:265] | 用于把同一队列中已累积的 steering 或 follow-up messages 作为一个批次注入下一次 loop poll,避免多次 poll 才能消化积压队列。[I] | `packages/agent/src/types.ts`; implementation in `packages/agent/src/agent.ts` |
| `"one-at-a-time"` | `QueueMode` union 的第二个 literal 值。[E: packages/agent/src/types.ts:49] | `PendingMessageQueue.drain()` 的非 `"all"` 分支读取队首 `messages[0]`;队列为空返回 `[]`,队列非空时把内部数组切到 `slice(1)` 并返回单元素数组 `[first]`,所以一次 drain 只交付最老的一条消息并保留剩余消息。[I][E: packages/agent/src/agent.ts:151][E: packages/agent/src/agent.ts:147][E: packages/agent/src/agent.ts:148][E: packages/agent/src/agent.ts:150][E: packages/agent/src/agent.ts:151] | `Agent` 构造时 steering queue 与 follow-up queue 都默认使用 `"one-at-a-time"`。[I][E: packages/agent/src/agent.ts:222][E: packages/agent/src/agent.ts:223] | 用于让 queued steering/follow-up messages 逐条进入后续 drain point,使多条排队输入不会在同一个 poll 中全部并入上下文。[I] | `packages/agent/src/types.ts`; implementation in `packages/agent/src/agent.ts` |

## Public API 绑定

`AgentOptions` 暴露 `steeringMode?: QueueMode` 与 `followUpMode?: QueueMode`,两个字段分别用于构造 steering queue 与 follow-up queue 的初始 mode;这两个字段本身定义在 `agent.ts`,不是 `QueueMode` 的声明 source,所以 API 绑定语义标 `[I]`。[I][E: packages/agent/src/agent.ts:114][E: packages/agent/src/agent.ts:115][E: packages/agent/src/agent.ts:222][E: packages/agent/src/agent.ts:223]

`Agent.steeringMode` setter 直接写 `this.steeringQueue.mode`,getter 读回同一字段;`Agent.followUpMode` setter/getter 对 `followUpQueue.mode` 做同样操作。因此运行时改 mode 只影响后续 drain,不会重排或修改已经 queued 的 `AgentMessage[]` 内容。[I][E: packages/agent/src/agent.ts:266][E: packages/agent/src/agent.ts:257][E: packages/agent/src/agent.ts:270][E: packages/agent/src/agent.ts:261][E: packages/agent/src/agent.ts:265][E: packages/agent/src/agent.ts:266][E: packages/agent/src/agent.ts:269][E: packages/agent/src/agent.ts:270]

`Agent.createLoopConfig()` 把 `steeringQueue.drain()` 暴露成 `getSteeringMessages`,把 `followUpQueue.drain()` 暴露成 `getFollowUpMessages`;底层 loop 何时调用这些 hooks 属于 `subsys.agent-core.message-queue` / `subsys.agent-core.turn-control` 的控制流范围,本 reference 节点只枚举 `QueueMode` 值域与 drain 行为。[I][E: packages/agent/src/agent.ts:458][E: packages/agent/src/agent.ts:463][E: packages/agent/src/agent.ts:465]

## 边界与 Gotcha

`"one-at-a-time"` 在 `PendingMessageQueue.drain()` 中不是显式 `if (mode === "one-at-a-time")` 分支,而是除 `"all"` 以外的 fallback 分支;由于 `QueueMode` 当前只有两个 literal 值,这个 fallback 等价于 `"one-at-a-time"`。[E: packages/agent/src/types.ts:49][I][E: packages/agent/src/agent.ts:140][E: packages/agent/src/agent.ts:151]

`QueueMode` 只决定一次 drain 的 batch size,不决定 steering 与 follow-up 的优先级、active run 并发保护、或 loop 停止条件;这些由 `Agent.continue()`、`runAgentLoop` 和 message-queue/turn-control 节点解释。[I]

## Sources

- `packages/agent/src/types.ts`

## 相关

- [subsys.agent-core.message-queue](../subsystems/agent-core/message-queue.md): `PendingMessageQueue`、`steer()`、`followUp()` 与 queue drain hooks 的运行时实现。
