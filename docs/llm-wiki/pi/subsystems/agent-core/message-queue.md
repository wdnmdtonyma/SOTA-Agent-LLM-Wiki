---
id: subsys.agent-core.message-queue
title: 消息队列与操舵(steering/follow-up)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/agent.ts
symbols:
  - PendingMessageQueue
  - steer
  - followUp
related:
  - subsys.agent-core.turn-control
  - ref.agent.queue-modes
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.agent-core.message-queue` 是 `pi-agent-core` 的运行中消息注入层: `Agent` 持有 steering 与 follow-up 两个 `PendingMessageQueue`, 让调用方在 active run 期间排队用户消息, 再由 loop config 暴露给底层回合循环。

## 能回答的问题

- `steer()` 和 `followUp()` 分别把消息放进哪个队列?
- `QueueMode` 的 `"all"` 与默认 `"one-at-a-time"` 在 `PendingMessageQueue.drain()` 中有什么差别?
- `Agent.continue()` 从 assistant message 继续时, queued steering 和 follow-up 谁优先?
- 清空队列、查询队列、`reset()` 与 active run 并发保护分别在哪里实现?
- 这个节点与 `subsys.agent-core.turn-control` 的边界是什么?

## 职责边界

`PendingMessageQueue` 是 `packages/agent/src/agent.ts` 内部队列类: 它只保存 `AgentMessage[]`、记录一个可变 `QueueMode`, 并提供 `enqueue()`、`hasItems()`、`drain()`、`clear()` 四个操作 [E: packages/agent/src/agent.ts:123] [E: packages/agent/src/agent.ts:124] [E: packages/agent/src/agent.ts:125] [E: packages/agent/src/agent.ts:131] [E: packages/agent/src/agent.ts:135] [E: packages/agent/src/agent.ts:139] [E: packages/agent/src/agent.ts:154]。

`Agent` 层拥有两个独立队列: `steeringQueue` 与 `followUpQueue` 是私有字段, 构造时分别使用 `options.steeringMode` 和 `options.followUpMode`, 未配置时都默认 `"one-at-a-time"` [E: packages/agent/src/agent.ts:174] [E: packages/agent/src/agent.ts:175] [E: packages/agent/src/agent.ts:222] [E: packages/agent/src/agent.ts:223]。

本节点只覆盖 `Agent` wrapper 中的队列 API、队列模型和传给 loop config 的钩子。底层回合循环何时调用 `getSteeringMessages` / `getFollowUpMessages`, 以及 tool call、turn_end、prepareNextTurn 之间的精确时序, 应由 [subsys.agent-core.turn-control](turn-control.md) 权威说明 [E: packages/agent/src/agent.ts:458] [E: packages/agent/src/agent.ts:465] [I]。

## 关键文件

- `packages/agent/src/agent.ts`: `PendingMessageQueue`、`AgentOptions.steeringMode` / `followUpMode`、`Agent.steer()`、`Agent.followUp()`、clear/query API、`continue()` queue fallback 和 `createLoopConfig()` queue hooks 的唯一实现 [E: packages/agent/src/agent.ts:114] [E: packages/agent/src/agent.ts:115] [E: packages/agent/src/agent.ts:123] [E: packages/agent/src/agent.ts:274] [E: packages/agent/src/agent.ts:279] [E: packages/agent/src/agent.ts:284] [E: packages/agent/src/agent.ts:289] [E: packages/agent/src/agent.ts:300] [E: packages/agent/src/agent.ts:348] [E: packages/agent/src/agent.ts:432]。

## 数据模型

`PendingMessageQueue.messages` 是私有 `AgentMessage[]`; `enqueue(message)` 只 append, 不做 role 校验、去重或合并, 因此消息形状必须由调用方或上层 API 在入队前保证 [E: packages/agent/src/agent.ts:124] [E: packages/agent/src/agent.ts:131] [E: packages/agent/src/agent.ts:132] [I]。

`PendingMessageQueue.mode` 是公开可改字段, `Agent.steeringMode` 与 `Agent.followUpMode` 的 setter 直接改写对应队列的 `mode`, getter 直接读回该字段 [E: packages/agent/src/agent.ts:125] [E: packages/agent/src/agent.ts:256] [E: packages/agent/src/agent.ts:257] [E: packages/agent/src/agent.ts:260] [E: packages/agent/src/agent.ts:261] [E: packages/agent/src/agent.ts:265] [E: packages/agent/src/agent.ts:266] [E: packages/agent/src/agent.ts:269] [E: packages/agent/src/agent.ts:270]。

`drain()` 的 `"all"` 模式返回当前数组副本并清空队列; 非 `"all"` 分支只取第一条消息, 没有消息时返回空数组, 有消息时删除队首并返回单元素数组 [E: packages/agent/src/agent.ts:139] [E: packages/agent/src/agent.ts:140] [E: packages/agent/src/agent.ts:141] [E: packages/agent/src/agent.ts:142] [E: packages/agent/src/agent.ts:146] [E: packages/agent/src/agent.ts:147] [E: packages/agent/src/agent.ts:150] [E: packages/agent/src/agent.ts:151]。

`hasItems()` 用 `messages.length > 0` 判断队列非空; `clear()` 直接把内部数组替换为空数组 [E: packages/agent/src/agent.ts:135] [E: packages/agent/src/agent.ts:136] [E: packages/agent/src/agent.ts:154] [E: packages/agent/src/agent.ts:155]。

## 控制流

1. `Agent.constructor@packages/agent/src/agent.ts:201` 创建 mutable state 后初始化 `steeringQueue` 与 `followUpQueue`; 两个队列互不共享底层数组, 且默认 mode 都是 `"one-at-a-time"` [E: packages/agent/src/agent.ts:210] [E: packages/agent/src/agent.ts:211] [E: packages/agent/src/agent.ts:222] [E: packages/agent/src/agent.ts:223]。
2. `Agent.steer@packages/agent/src/agent.ts:264` 把传入 `AgentMessage` 追加到 steering queue; `Agent.followUp@packages/agent/src/agent.ts:269` 把传入 `AgentMessage` 追加到 follow-up queue [E: packages/agent/src/agent.ts:274] [E: packages/agent/src/agent.ts:275] [E: packages/agent/src/agent.ts:279] [E: packages/agent/src/agent.ts:280]。
3. `Agent.prompt@packages/agent/src/agent.ts:327` 在 active run 存在时拒绝启动新 prompt, 错误信息要求调用方改用 `steer()` 或 `followUp()` 入队, 这使队列成为运行中输入的公开通道 [E: packages/agent/src/agent.ts:337] [E: packages/agent/src/agent.ts:338] [E: packages/agent/src/agent.ts:339] [E: packages/agent/src/agent.ts:340] [I]。
4. `Agent.createLoopConfig@packages/agent/src/agent.ts:422` 把 steering queue 暴露成 `getSteeringMessages`; 如果调用方要求跳过首次 steering poll, 第一次调用返回空数组并只清掉本地 skip flag, 后续调用才 `drain()` steering queue [E: packages/agent/src/agent.ts:432] [E: packages/agent/src/agent.ts:433] [E: packages/agent/src/agent.ts:458] [E: packages/agent/src/agent.ts:459] [E: packages/agent/src/agent.ts:460] [E: packages/agent/src/agent.ts:461] [E: packages/agent/src/agent.ts:463]。
5. `Agent.createLoopConfig@packages/agent/src/agent.ts:422` 把 follow-up queue 暴露成 `getFollowUpMessages`, 该 hook 没有 skip flag, 每次被调用都会 drain follow-up queue [E: packages/agent/src/agent.ts:432] [E: packages/agent/src/agent.ts:465]。
6. `Agent.continue@packages/agent/src/agent.ts:338` 遇到最后一条 transcript 是 assistant 时, 先 drain steering queue; steering 非空时用 `runPromptMessages(queuedSteering, { skipInitialSteeringPoll: true })` 跑新 prompt, 避免刚交给 prompt 的 steering message 被初始 poll 再次取出 [E: packages/agent/src/agent.ts:348] [E: packages/agent/src/agent.ts:358] [E: packages/agent/src/agent.ts:359] [E: packages/agent/src/agent.ts:360] [E: packages/agent/src/agent.ts:361]。
7. `Agent.continue@packages/agent/src/agent.ts:338` 只有在 queued steering 为空时才 drain follow-up queue; follow-up 非空时用 `runPromptMessages(queuedFollowUps)` 跑新 prompt, 两个队列都空才抛出 `Cannot continue from message role: assistant` [E: packages/agent/src/agent.ts:365] [E: packages/agent/src/agent.ts:366] [E: packages/agent/src/agent.ts:367] [E: packages/agent/src/agent.ts:371]。
8. `clearSteeringQueue()`、`clearFollowUpQueue()` 分别清空自己的队列; `clearAllQueues()` 顺序调用两个清理方法; `reset()` 清 transcript/runtime state 后也清空 follow-up 与 steering queue [E: packages/agent/src/agent.ts:284] [E: packages/agent/src/agent.ts:285] [E: packages/agent/src/agent.ts:289] [E: packages/agent/src/agent.ts:290] [E: packages/agent/src/agent.ts:294] [E: packages/agent/src/agent.ts:295] [E: packages/agent/src/agent.ts:296] [E: packages/agent/src/agent.ts:324] [E: packages/agent/src/agent.ts:330] [E: packages/agent/src/agent.ts:331]。
9. `hasQueuedMessages@packages/agent/src/agent.ts:290` 对两个队列做 OR 查询; 任一队列有消息就返回 true [E: packages/agent/src/agent.ts:300] [E: packages/agent/src/agent.ts:301]。

## 设计动机与权衡

`steer()` 与 `followUp()` 共享同一个 `PendingMessageQueue` 实现, 但在 `Agent` 中保持两个队列, 让调用方能表达“尽快插入下一轮”和“等 agent 本来要停时再继续”的不同意图; 这种语义差异由两个 loop config hook 分开承载 [E: packages/agent/src/agent.ts:174] [E: packages/agent/src/agent.ts:175] [E: packages/agent/src/agent.ts:458] [E: packages/agent/src/agent.ts:465] [I]。

`"one-at-a-time"` 的实现不是显式字符串比较, 而是 `drain()` 中除 `"all"` 以外的默认分支; 这让默认 mode 每次只交付一条消息, 需要调用方或 loop 再次 poll 才会交付下一条 [E: packages/agent/src/agent.ts:140] [E: packages/agent/src/agent.ts:146] [E: packages/agent/src/agent.ts:150] [E: packages/agent/src/agent.ts:151] [I]。

`continue()` 在 assistant 结尾场景优先处理 steering, 再处理 follow-up, 说明两个队列同时存在时 steering 拥有更高恢复优先级; 该优先级只在 `Agent.continue()` 的 fallback path 中由本文件直接证明, active loop 内部的优先级应到 turn-control 节点核验 [E: packages/agent/src/agent.ts:358] [E: packages/agent/src/agent.ts:359] [E: packages/agent/src/agent.ts:365] [I]。

## Gotcha

- `steer()` / `followUp()` 本身不检查 `activeRun`; 它们只是入队。拒绝并发新 prompt 的逻辑在 `prompt()` 和 `runWithLifecycle()` 中, 不是在队列 API 内 [E: packages/agent/src/agent.ts:274] [E: packages/agent/src/agent.ts:279] [E: packages/agent/src/agent.ts:338] [E: packages/agent/src/agent.ts:469] [E: packages/agent/src/agent.ts:470] [E: packages/agent/src/agent.ts:471]。
- `drain()` 会修改队列状态; 读 queue hook、`continue()` fallback 或手动清理都可能消费或清空待处理消息, 因此不能把 `getSteeringMessages` / `getFollowUpMessages` 当成纯查询 [E: packages/agent/src/agent.ts:142] [E: packages/agent/src/agent.ts:150] [E: packages/agent/src/agent.ts:359] [E: packages/agent/src/agent.ts:365] [E: packages/agent/src/agent.ts:463] [E: packages/agent/src/agent.ts:465] [I]。
- `hasQueuedMessages()` 只看两个 queue 的当前内容, 不代表当前 run 已 idle; idle 状态仍由 `activeRun` / `waitForIdle()` 管理 [E: packages/agent/src/agent.ts:300] [E: packages/agent/src/agent.ts:319] [E: packages/agent/src/agent.ts:320] [I]。
- `reset()` 清空 follow-up 再清空 steering, 同时也清 transcript 与 streaming/pending tool state; 调用方如果只想丢弃 queued input, 应使用 `clearSteeringQueue()`、`clearFollowUpQueue()` 或 `clearAllQueues()` [E: packages/agent/src/agent.ts:324] [E: packages/agent/src/agent.ts:325] [E: packages/agent/src/agent.ts:326] [E: packages/agent/src/agent.ts:327] [E: packages/agent/src/agent.ts:328] [E: packages/agent/src/agent.ts:329] [E: packages/agent/src/agent.ts:330] [E: packages/agent/src/agent.ts:331] [I]。

## 跨包边界

[subsys.agent-core.turn-control](turn-control.md) 应说明低层 `runLoop` 的 queue polling 时机、停止条件和 tool-call 续轮规则; 本节点只证明 `Agent` 如何存储队列以及如何把 drain 函数传入 loop config [E: packages/agent/src/agent.ts:432] [E: packages/agent/src/agent.ts:458] [E: packages/agent/src/agent.ts:465] [I]。

[ref.agent.queue-modes](../../reference/queue-modes.md) 应枚举 `QueueMode` 的完整类型和值域; 本节点只根据 `PendingMessageQueue.drain()` 与构造默认值解释 `"all"` 和默认 one-at-a-time 行为 [E: packages/agent/src/agent.ts:140] [E: packages/agent/src/agent.ts:222] [E: packages/agent/src/agent.ts:223] [I]。

`pi-coding-agent` 产品层可以通过 `AgentSession`、RPC 或交互 UI 暴露 steering/follow-up, 但这些入口不在本节点 source 范围内; 本节点只覆盖可复用 `pi-agent-core` 的 `Agent` API [I]。

## Sources

- packages/agent/src/agent.ts

## 相关

- [subsys.agent-core.turn-control](turn-control.md): 低层回合循环何时 poll steering/follow-up、如何与 tool call 和 stop 条件组合。
- [ref.agent.queue-modes](../../reference/queue-modes.md): `QueueMode` 值域与队列排空模式目录。
