---
id: subsys.agent-core.turn-control
title: 轮次控制循环
kind: subsystem
tier: T2
pkg: agent
source: [packages/agent/src/agent-loop.ts]
symbols: [runLoop]
related: [spine.agent-loop, subsys.agent-core.message-queue, subsys.agent-core.hooks]
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.agent-core.turn-control` 聚焦 `runLoop` 如何在一次 agent run 中决定何时开始下一轮 provider request、何时注入 queued messages、何时停止。

## 能回答的问题

- `runLoop` 的外层 loop 和内层 loop 分别控制什么？
- steering messages 和 follow-up messages 分别在哪些 drain 点进入对话？
- assistant response 出错或被 abort 时，turn 和 agent 如何结束？
- `prepareNextTurn` 和 `shouldStopAfterTurn` 的先后关系是什么？
- tool result 的 `terminate` 对下一轮 assistant response 有什么影响？
- `agent` 包的轮次控制和产品层消息队列、hook 装配边界在哪里？

## 职责边界

`runLoop` 是 `agent-loop.ts` 中新 prompt 与 continuation 的共享轮次控制核心：`runAgentLoop` 和 `runAgentLoopContinue` 都在发出 `agent_start`/`turn_start` 后调用同一个 `runLoop`。[E: packages/agent/src/agent-loop.ts:116] [E: packages/agent/src/agent-loop.ts:141] `runLoop` 不负责把初始 prompt 放入 context，也不负责校验 continuation 是否能继续；这些入口差异分别由 `runAgentLoop` 和 `runAgentLoopContinue` 在进入 `runLoop` 前处理。[E: packages/agent/src/agent-loop.ts:103] [E: packages/agent/src/agent-loop.ts:106] [E: packages/agent/src/agent-loop.ts:127] [E: packages/agent/src/agent-loop.ts:131]

`runLoop` 的直接职责是维护本次 run 的 `currentContext`、`config`、`firstTurn` 和 `pendingMessages`，然后在 assistant response、tool calls、turn hooks、steering queue 与 follow-up queue 之间调度下一步。[E: packages/agent/src/agent-loop.ts:163] [E: packages/agent/src/agent-loop.ts:164] [E: packages/agent/src/agent-loop.ts:165] [E: packages/agent/src/agent-loop.ts:167] [E: packages/agent/src/agent-loop.ts:193] [E: packages/agent/src/agent-loop.ts:208] [E: packages/agent/src/agent-loop.ts:226] [E: packages/agent/src/agent-loop.ts:241] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:257]

## 关键文件

- `packages/agent/src/agent-loop.ts`：定义 `runLoop`、assistant streaming、tool-call execution，以及 `runLoop` 依赖的事件发射顺序。[E: packages/agent/src/agent-loop.ts:155] [E: packages/agent/src/agent-loop.ts:193] [E: packages/agent/src/agent-loop.ts:373]

## 数据模型

`runLoop` 的状态模型很小：`currentContext` 是下一次 provider request 使用的 agent context，`newMessages` 是调用方最终返回并随 `agent_end` 发送的新消息数组，`config` 是可被 `prepareNextTurn` 局部替换的运行配置。[E: packages/agent/src/agent-loop.ts:116] [E: packages/agent/src/agent-loop.ts:117] [E: packages/agent/src/agent-loop.ts:141] [E: packages/agent/src/agent-loop.ts:142] [E: packages/agent/src/agent-loop.ts:155] [E: packages/agent/src/agent-loop.ts:157] [E: packages/agent/src/agent-loop.ts:163] [E: packages/agent/src/agent-loop.ts:164] [E: packages/agent/src/agent-loop.ts:228] [E: packages/agent/src/agent-loop.ts:229] [E: packages/agent/src/agent-loop.ts:268]

`pendingMessages` 表示下一次 assistant response 前要注入 context 的 queued messages；它在 loop 开始时来自 `getSteeringMessages`，在每轮结束后也可再次来自 `getSteeringMessages`，而 follow-up messages 只在 agent 本来要停时被转成 `pendingMessages`。[E: packages/agent/src/agent-loop.ts:167] [E: packages/agent/src/agent-loop.ts:182] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:260]

`hasMoreToolCalls` 是内层循环的续跑信号：每个外层 pass 初始为 `true`，没有 tool calls 时会保持 `false`，有 tool calls 时由 `executeToolCalls` 返回的 batch-level `terminate` 反向决定。[E: packages/agent/src/agent-loop.ts:171] [E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:206] [E: packages/agent/src/agent-loop.ts:208] [E: packages/agent/src/agent-loop.ts:210]

## 控制流

1. `runLoop@packages/agent/src/agent-loop.ts:155` 初始化当前 context、配置和 first-turn 标志，并在第一轮 assistant response 前先检查 steering queue。[E: packages/agent/src/agent-loop.ts:163] [E: packages/agent/src/agent-loop.ts:164] [E: packages/agent/src/agent-loop.ts:165] [E: packages/agent/src/agent-loop.ts:167]

2. 外层 `while (true)` 表示“agent 停止点”循环；它只在内层 tool/steering 工作耗尽后检查 follow-up messages，若存在 follow-up 就把它们设为 `pendingMessages` 并重新进入内层循环。[E: packages/agent/src/agent-loop.ts:170] [E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:258] [E: packages/agent/src/agent-loop.ts:260] [E: packages/agent/src/agent-loop.ts:261]

3. 内层 `while (hasMoreToolCalls || pendingMessages.length > 0)` 表示“需要再请求 provider”的循环；除第一轮外，每次进入内层都会发出新的 `turn_start`。[E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:175] [E: packages/agent/src/agent-loop.ts:176] [E: packages/agent/src/agent-loop.ts:178]

4. 如果存在 `pendingMessages`，`runLoop` 先为每条 queued message 发 `message_start`/`message_end`，再同步追加到 `currentContext.messages` 和 `newMessages`，最后清空 pending 队列。[E: packages/agent/src/agent-loop.ts:182] [E: packages/agent/src/agent-loop.ts:184] [E: packages/agent/src/agent-loop.ts:185] [E: packages/agent/src/agent-loop.ts:186] [E: packages/agent/src/agent-loop.ts:187] [E: packages/agent/src/agent-loop.ts:189]

5. `streamAssistantResponse@packages/agent/src/agent-loop.ts:275` 完成 provider request 并返回 assistant message；`runLoop` 把该 assistant message 放入 `newMessages`，如果 `stopReason` 是 `"error"` 或 `"aborted"`，则发 `turn_end` 与 `agent_end` 后立即返回。[E: packages/agent/src/agent-loop.ts:193] [E: packages/agent/src/agent-loop.ts:194] [E: packages/agent/src/agent-loop.ts:196] [E: packages/agent/src/agent-loop.ts:197] [E: packages/agent/src/agent-loop.ts:198] [E: packages/agent/src/agent-loop.ts:199]

6. 正常 assistant message 会筛出 `toolCall` content；有 tool calls 时执行 `executeToolCalls@packages/agent/src/agent-loop.ts:373`，并把返回的 tool result messages 追加到 context 与 `newMessages`。[E: packages/agent/src/agent-loop.ts:203] [E: packages/agent/src/agent-loop.ts:205] [E: packages/agent/src/agent-loop.ts:208] [E: packages/agent/src/agent-loop.ts:212] [E: packages/agent/src/agent-loop.ts:213] [E: packages/agent/src/agent-loop.ts:214]

7. `executeToolCalls` 的 `terminate` 只控制是否因当前 tool batch 自动继续下一次 assistant response；当所有 finalized tool result 都带 `terminate === true` 时，`hasMoreToolCalls` 会变成 `false`。[E: packages/agent/src/agent-loop.ts:210] [E: packages/agent/src/agent-loop.ts:544] [E: packages/agent/src/agent-loop.ts:545] steering 或 follow-up messages 仍能通过内外层循环条件让 run 继续。[E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:258] [E: packages/agent/src/agent-loop.ts:260] [E: packages/agent/src/agent-loop.ts:261]

8. 非 error/aborted 路径下，每轮 assistant/tool 阶段结束后，`runLoop` 发 `turn_end`，随后构造 `nextTurnContext` 交给 `prepareNextTurn`，允许替换下一次 provider request 的 context、model 和 reasoning。[E: packages/agent/src/agent-loop.ts:196] [E: packages/agent/src/agent-loop.ts:218] [E: packages/agent/src/agent-loop.ts:220] [E: packages/agent/src/agent-loop.ts:226] [E: packages/agent/src/agent-loop.ts:228] [E: packages/agent/src/agent-loop.ts:231] [E: packages/agent/src/agent-loop.ts:232]

9. `prepareNextTurn` 之后才检查 `shouldStopAfterTurn`；如果它返回 true，`runLoop` 发 `agent_end` 并退出，不再 polling steering 或 follow-up queues。[E: packages/agent/src/agent-loop.ts:241] [E: packages/agent/src/agent-loop.ts:249] [E: packages/agent/src/agent-loop.ts:250] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:257]

10. 如果没有 graceful stop，`runLoop` 在 turn 末尾再次读取 steering messages；若内层循环和 follow-up 检查都没有更多工作，最终在函数末尾发 `agent_end`。[E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:265] [E: packages/agent/src/agent-loop.ts:268]

## 设计动机与 gotcha

`runLoop` 把 follow-up 设计成外层停止点检查，而不是每个 turn 后都和 steering 一起注入；这让 follow-up messages 等到 tool-call 驱动的自然续轮耗尽之后才进入 context。[E: packages/agent/src/agent-loop.ts:170] [E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:258] [I]

`prepareNextTurn` 的 `thinkingLevel: "off"` 不会把 config.reasoning 写成字符串 `"off"`，而是映射成 `undefined`；其他 thinking level 会直接成为下一轮 config.reasoning。[E: packages/agent/src/agent-loop.ts:231] [E: packages/agent/src/agent-loop.ts:233] [E: packages/agent/src/agent-loop.ts:235] [E: packages/agent/src/agent-loop.ts:236] [E: packages/agent/src/agent-loop.ts:237]

`shouldStopAfterTurn` 是 graceful stop gate，不会打断当前 assistant response 或当前 tool batch；它的检查点在 `turn_end` 和 `prepareNextTurn` 之后。[E: packages/agent/src/agent-loop.ts:218] [E: packages/agent/src/agent-loop.ts:226] [E: packages/agent/src/agent-loop.ts:241] [I]

`stopReason === "error"` 或 `"aborted"` 是 hard-stop path：它在 tool-call 检查和 turn hooks 之前返回，只发一个空 toolResults 的 `turn_end`，随后发 `agent_end`。[E: packages/agent/src/agent-loop.ts:196] [E: packages/agent/src/agent-loop.ts:197] [E: packages/agent/src/agent-loop.ts:198] [E: packages/agent/src/agent-loop.ts:199] [E: packages/agent/src/agent-loop.ts:203] [E: packages/agent/src/agent-loop.ts:226] [E: packages/agent/src/agent-loop.ts:241] [I]

## 跨包边界

`subsys.agent-core.message-queue` 覆盖 queued message 的来源、drain mode 和产品交互语义；本节点只记录 `runLoop` 何时调用 `getSteeringMessages`/`getFollowUpMessages`，以及返回 messages 如何进入 context。[E: packages/agent/src/agent-loop.ts:167] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:257] [I]

`subsys.agent-core.hooks` 覆盖 hook 类型和调用者注入策略；本节点只记录 turn-control 层如何调用 `prepareNextTurn` 与 `shouldStopAfterTurn`，以及 hook 返回值如何影响下一轮或停止。[E: packages/agent/src/agent-loop.ts:226] [E: packages/agent/src/agent-loop.ts:228] [E: packages/agent/src/agent-loop.ts:241] [I]

`spine.agent-loop` 是端到端视角，覆盖入口、provider streaming、tool invocation 和状态归约；本节点收窄到 `runLoop` 的 while 条件、queue drain 点和 stop gates。[E: packages/agent/src/agent-loop.ts:155] [E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:257] [I]

## Sources

- packages/agent/src/agent-loop.ts

## 相关

- spine.agent-loop
- subsys.agent-core.message-queue
- subsys.agent-core.hooks
