---
id: subsys.agent-core.turn-control
title: 轮次控制循环
kind: subsystem
tier: T2
pkg: agent
source: [packages/agent/src/agent-loop.ts, packages/agent/src/agent.ts, packages/agent/src/types.ts, packages/agent/CHANGELOG.md]
symbols: [runLoop, prepareNextTurn, prepareNextTurnWithContext, shouldStopAfterTurn]
related: [spine.agent-loop, subsys.agent-core.message-queue, subsys.agent-core.hooks, subsys.coding-agent.agent-session]
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.agent-core.turn-control` 聚焦 `runLoop` 如何在一次 agent run 中决定何时开始下一轮 provider request、何时注入 queued messages、何时停止，以及 `prepareNextTurn` 只在还会再开一轮 assistant turn 之后运行。

## 能回答的问题

- `runLoop` 的外层 loop 和内层 loop 分别控制什么？
- steering messages 和 follow-up messages 分别在哪些 drain 点进入对话？
- assistant response 出错或被 abort 时，turn 和 agent 如何结束？
- `prepareNextTurn` 和 `shouldStopAfterTurn` 的先后关系是什么？终局 turn 还会不会调用 `prepareNextTurn`？
- tool result 的 `terminate` 对下一轮 assistant response 有什么影响？
- 同一 run 内 tool 执行与下一轮模型请求之间如何插入 compaction？

## 职责边界

`runLoop` 是 `agent-loop.ts` 中新 prompt 与 continuation 的共享轮次控制核心：`runAgentLoop` 和 `runAgentLoopContinue` 都在发出 `agent_start`/`turn_start` 后调用同一个 `runLoop`。[E: packages/agent/src/agent-loop.ts:117] [E: packages/agent/src/agent-loop.ts:142] `runLoop` 不负责把初始 prompt 放入 context，也不负责校验 continuation 是否能继续；这些入口差异分别由 `runAgentLoop` 和 `runAgentLoopContinue` 在进入 `runLoop` 前处理。[E: packages/agent/src/agent-loop.ts:104] [E: packages/agent/src/agent-loop.ts:107] [E: packages/agent/src/agent-loop.ts:128] [E: packages/agent/src/agent-loop.ts:132]

`runLoop` 的直接职责是维护本次 run 的 `currentContext`、`config`、`lastCompletedTurn` 和 `pendingMessages`，然后在 assistant response、tool calls、turn hooks、steering queue 与 follow-up queue 之间调度下一步。[E: packages/agent/src/agent-loop.ts:164] [E: packages/agent/src/agent-loop.ts:165] [E: packages/agent/src/agent-loop.ts:166] [E: packages/agent/src/agent-loop.ts:168] [E: packages/agent/src/agent-loop.ts:212] [E: packages/agent/src/agent-loop.ts:233] [E: packages/agent/src/agent-loop.ts:252] [E: packages/agent/src/agent-loop.ts:257]

## 关键文件

- `packages/agent/src/agent-loop.ts`：定义 `runLoop`、assistant streaming、tool-call execution，以及 `runLoop` 依赖的事件发射顺序。[E: packages/agent/src/agent-loop.ts:156] [E: packages/agent/src/agent-loop.ts:212] [E: packages/agent/src/agent-loop.ts:409]
- `packages/agent/src/agent.ts`：把 `prepareNextTurnWithContext` / `prepareNextTurn` 包装进 `AgentLoopConfig.prepareNextTurn`。[E: packages/agent/src/agent.ts:463] [E: packages/agent/src/agent.ts:466] [E: packages/agent/src/agent.ts:469]
- `packages/agent/src/types.ts`：`shouldStopAfterTurn` 与 `prepareNextTurn` 的 hook 签名。[E: packages/agent/src/types.ts:223] [E: packages/agent/src/types.ts:230]

## 数据模型

`runLoop` 的状态模型很小：`currentContext` 是下一次 provider request 使用的 agent context，`newMessages` 是调用方最终返回并随 `agent_end` 发送的新消息数组，`config` 是可被 `prepareNextTurn` 局部替换的运行配置，`lastCompletedTurn` 是上一轮完成后的 `PrepareNextTurnContext`。[E: packages/agent/src/agent-loop.ts:117] [E: packages/agent/src/agent-loop.ts:142] [E: packages/agent/src/agent-loop.ts:156] [E: packages/agent/src/agent-loop.ts:164] [E: packages/agent/src/agent-loop.ts:165] [E: packages/agent/src/agent-loop.ts:166] [E: packages/agent/src/agent-loop.ts:245] [E: packages/agent/src/agent-loop.ts:272]

`pendingMessages` 表示下一次 assistant response 前要注入 context 的 queued messages；它在 loop 开始时来自 `getSteeringMessages`，在每轮 `shouldStopAfterTurn` 通过后再来自 `getSteeringMessages`，而 follow-up messages 只在 agent 本来要停时被转成 `pendingMessages`。[E: packages/agent/src/agent-loop.ts:168] [E: packages/agent/src/agent-loop.ts:201] [E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:261] [E: packages/agent/src/agent-loop.ts:264]

`hasMoreToolCalls` 是内层循环的续跑信号：每个外层 pass 初始为 `true`，没有 tool calls 时会保持 `false`，有 tool calls 时由 `executeToolCalls` / `failToolCallsFromTruncatedMessage` 返回的 batch-level `terminate` 反向决定。[E: packages/agent/src/agent-loop.ts:172] [E: packages/agent/src/agent-loop.ts:175] [E: packages/agent/src/agent-loop.ts:225] [E: packages/agent/src/agent-loop.ts:235]

## 控制流

1. `runLoop@packages/agent/src/agent-loop.ts:156` 初始化当前 context、配置和 `lastCompletedTurn`，并在第一轮 assistant response 前先检查 steering queue。[E: packages/agent/src/agent-loop.ts:164] [E: packages/agent/src/agent-loop.ts:165] [E: packages/agent/src/agent-loop.ts:166] [E: packages/agent/src/agent-loop.ts:168]

2. 外层 `while (true)` 表示“agent 停止点”循环；它只在内层 tool/steering 工作耗尽后检查 follow-up messages，若存在 follow-up 就把它们设为 `pendingMessages` 并重新进入内层循环。[E: packages/agent/src/agent-loop.ts:171] [E: packages/agent/src/agent-loop.ts:261] [E: packages/agent/src/agent-loop.ts:262] [E: packages/agent/src/agent-loop.ts:264] [E: packages/agent/src/agent-loop.ts:265]

3. 内层 `while (hasMoreToolCalls || pendingMessages.length > 0)` 表示“需要再请求 provider”的循环。除本 run 的第一轮 assistant 外，每次进入内层且 `lastCompletedTurn` 已设置时，先跑 `prepareNextTurn`，再发新的 `turn_start`。[E: packages/agent/src/agent-loop.ts:175] [E: packages/agent/src/agent-loop.ts:176] [E: packages/agent/src/agent-loop.ts:177] [E: packages/agent/src/agent-loop.ts:197]

4. 如果存在 `pendingMessages`，`runLoop` 先为每条 queued message 发 `message_start`/`message_end`，再同步追加到 `currentContext.messages` 和 `newMessages`，最后清空 pending 队列。[E: packages/agent/src/agent-loop.ts:201] [E: packages/agent/src/agent-loop.ts:203] [E: packages/agent/src/agent-loop.ts:204] [E: packages/agent/src/agent-loop.ts:205] [E: packages/agent/src/agent-loop.ts:206] [E: packages/agent/src/agent-loop.ts:208]

5. `streamAssistantResponse@packages/agent/src/agent-loop.ts:279` 完成 provider request 并返回 assistant message；`runLoop` 把该 assistant message 放入 `newMessages`，如果 `stopReason` 是 `"error"` 或 `"aborted"`，则发 `turn_end` 与 `agent_end` 后立即返回，不调用 `prepareNextTurn`。[E: packages/agent/src/agent-loop.ts:212] [E: packages/agent/src/agent-loop.ts:213] [E: packages/agent/src/agent-loop.ts:215] [E: packages/agent/src/agent-loop.ts:216] [E: packages/agent/src/agent-loop.ts:217] [E: packages/agent/src/agent-loop.ts:218]

6. 正常 assistant message 会筛出 `toolCall` content；`stopReason === "length"` 时整批失败而不执行工具，否则执行 `executeToolCalls@packages/agent/src/agent-loop.ts:409`，并把返回的 tool result messages 追加到 context 与 `newMessages`。[E: packages/agent/src/agent-loop.ts:222] [E: packages/agent/src/agent-loop.ts:230] [E: packages/agent/src/agent-loop.ts:233] [E: packages/agent/src/agent-loop.ts:237] [E: packages/agent/src/agent-loop.ts:238] [E: packages/agent/src/agent-loop.ts:239]

7. `executeToolCalls` 的 `terminate` 只控制是否因当前 tool batch 自动继续下一次 assistant response；`shouldTerminateToolBatch()` 在全部 finalized result 都带 `terminate === true` 时返回 true,loop 再写成 `hasMoreToolCalls = !executedToolBatch.terminate`。[E: packages/agent/src/agent-loop.ts:235] [E: packages/agent/src/agent-loop.ts:483] [E: packages/agent/src/agent-loop.ts:559] [E: packages/agent/src/agent-loop.ts:589] [E: packages/agent/src/agent-loop.ts:590] steering 或 follow-up messages 仍能通过内外层循环条件让 run 继续。[E: packages/agent/src/agent-loop.ts:175] [E: packages/agent/src/agent-loop.ts:261] [E: packages/agent/src/agent-loop.ts:262] [E: packages/agent/src/agent-loop.ts:264]

8. 非 error/aborted 路径下，每轮 assistant/tool 阶段结束后 `runLoop` 发 `turn_end`，把 assistant、toolResults、当前 context 和 `newMessages` 写入 `lastCompletedTurn`，**先**检查 `shouldStopAfterTurn`。[E: packages/agent/src/agent-loop.ts:243] [E: packages/agent/src/agent-loop.ts:245] [E: packages/agent/src/agent-loop.ts:252] 如果它返回 true，`runLoop` 发 `agent_end` 并退出，不再 polling steering / follow-up，也**不**调用 `prepareNextTurn`。[E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:254] [E: packages/agent/CHANGELOG.md:18]

9. 如果没有 graceful stop，`runLoop` 再读取 steering messages 并回到内层条件。只有内层或 follow-up 决定还会再开一轮 assistant turn 时，下一轮循环入口才调用 `prepareNextTurn(lastCompletedTurn)`，允许替换 context、model 和 reasoning。[E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:176] [E: packages/agent/src/agent-loop.ts:177] [E: packages/agent/src/agent-loop.ts:179] [E: packages/agent/src/agent-loop.ts:182] `prepareNextTurn` 可以是长任务（例如 compaction）；完成后若 pending 仍为空会再 poll 一次 steering，避免 one-at-a-time 模式在长准备期间漏掉一条、或把两条塞进同一 turn。[E: packages/agent/src/agent-loop.ts:194] [E: packages/agent/src/agent-loop.ts:195]

10. 如果内层循环和 follow-up 检查都没有更多工作，最终在函数末尾发 `agent_end`，此时同样不调用 `prepareNextTurn`。[E: packages/agent/src/agent-loop.ts:269] [E: packages/agent/src/agent-loop.ts:272] [E: packages/agent/CHANGELOG.md:18]

## 设计动机与 gotcha

`runLoop` 把 follow-up 设计成外层停止点检查，而不是每个 turn 后都和 steering 一起注入；这让 follow-up messages 等到 tool-call 驱动的自然续轮耗尽之后才进入 context。[E: packages/agent/src/agent-loop.ts:171] [E: packages/agent/src/agent-loop.ts:175] [E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:261] [E: packages/agent/src/agent-loop.ts:262] [I]

`prepareNextTurn` 的 `thinkingLevel: "off"` 不会把 config.reasoning 写成字符串 `"off"`，而是映射成 `undefined`；其他 thinking level 会直接成为下一轮 config.reasoning。[E: packages/agent/src/agent-loop.ts:183] [E: packages/agent/src/agent-loop.ts:184] [E: packages/agent/src/agent-loop.ts:186] [E: packages/agent/src/agent-loop.ts:187] [E: packages/agent/src/agent-loop.ts:188]

`shouldStopAfterTurn` 是 graceful stop gate，不会打断当前 assistant response 或当前 tool batch；它的检查点在 `turn_end` 之后、`prepareNextTurn` 之前。0.84.4 起 `prepareNextTurn` / `prepareNextTurnWithContext` 只在决定还会再开一轮 assistant turn 之后运行；终局 / terminating turn 不再调用，end-of-run 工作应放到 `agent_end`。[E: packages/agent/src/agent-loop.ts:243] [E: packages/agent/src/agent-loop.ts:252] [E: packages/agent/src/agent-loop.ts:176] [E: packages/agent/src/agent.ts:463] [E: packages/agent/CHANGELOG.md:18]

`stopReason === "error"` 或 `"aborted"` 是 hard-stop path：它在 tool-call 检查和 turn hooks 之前返回，只发一个空 toolResults 的 `turn_end`，随后发 `agent_end`。[E: packages/agent/src/agent-loop.ts:215] [E: packages/agent/src/agent-loop.ts:216] [E: packages/agent/src/agent-loop.ts:217] [E: packages/agent/src/agent-loop.ts:218]

同一 run 内，tool batch 追加进 context 之后、下一轮 `streamAssistantResponse` 之前，`prepareNextTurn` 可以改写 context。coding-agent 把 threshold auto-compaction 挂在 `prepareNextTurnWithContext` 上，因此大 tool result 不必先发给下一轮模型再 compact。[E: packages/agent/src/agent-loop.ts:177] [E: packages/agent/src/agent-loop.ts:194] [E: packages/agent/src/agent.ts:466] [I]

## 跨包边界

`subsys.agent-core.message-queue` 覆盖 queued message 的来源、drain mode 和产品交互语义；本节点只记录 `runLoop` 何时调用 `getSteeringMessages`/`getFollowUpMessages`，以及返回 messages 如何进入 context。[E: packages/agent/src/agent-loop.ts:168] [E: packages/agent/src/agent-loop.ts:257] [E: packages/agent/src/agent-loop.ts:261] [I]

`subsys.agent-core.hooks` 覆盖 hook 类型和调用者注入策略；本节点只记录 turn-control 层如何调用 `prepareNextTurn` 与 `shouldStopAfterTurn`，以及 hook 返回值如何影响下一轮或停止。[E: packages/agent/src/agent-loop.ts:177] [E: packages/agent/src/agent-loop.ts:252] [E: packages/agent/src/types.ts:223] [E: packages/agent/src/types.ts:230] [I]

`subsys.coding-agent.agent-session` 覆盖产品层 `_installAgentNextTurnRefresh` 如何在 `prepareNextTurnWithContext` 里先跑 `_compactBeforeNextAssistantResponse`。[I]

`spine.agent-loop` 是端到端视角，覆盖入口、provider streaming、tool invocation 和状态归约；本节点收窄到 `runLoop` 的 while 条件、queue drain 点和 stop gates。[E: packages/agent/src/agent-loop.ts:156] [E: packages/agent/src/agent-loop.ts:175] [E: packages/agent/src/agent-loop.ts:252] [I]

## Sources

- packages/agent/src/agent-loop.ts
- packages/agent/src/agent.ts
- packages/agent/src/types.ts
- packages/agent/CHANGELOG.md

## 相关

- spine.agent-loop
- subsys.agent-core.message-queue
- subsys.agent-core.hooks
- [subsys.coding-agent.agent-session](../coding-agent/agent-session.md)
