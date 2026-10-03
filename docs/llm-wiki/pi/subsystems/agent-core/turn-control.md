---
id: subsys.agent-core.turn-control
title: 轮次控制循环
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/types.ts
  - packages/agent/src/stream-fn.ts
symbols:
  - runLoop
  - streamAssistantResponse
  - prepareNextTurn
  - prepareNextTurnWithContext
  - finishTurn
  - prepareRequest
related:
  - spine.agent-loop
  - subsys.agent-core.message-queue
  - subsys.agent-core.hooks
  - subsys.coding-agent.agent-session
  - ref.agent.thinking-levels
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.agent-core.turn-control` 聚焦 `runLoop` 如何在一次 agent run 中决定何时开始下一轮 provider request、何时注入 queued messages、何时停止，以及 `prepareRequest` / `finishTurn` / `prepareNextTurn` 的组合顺序。`pi-agent-core` 1.0 只保留 `Agent`、loop、proxy 与 types，没有 harness。

## 能回答的问题

- `runLoop` 的外层 loop 和内层 loop 分别控制什么？
- steering messages 和 follow-up messages 分别在哪些 drain 点进入对话？
- assistant response 出错或被 abort 时，turn 和 agent 如何结束？
- `finishTurn` 相对 `turn_end` 何时运行，决策何时应用？`{ action: "end" }` 与 `{ action: "continue" }` 有何差别？
- `prepareRequest` 是否覆盖第一次 provider 请求，它会不会 poll 队列？
- assistant message 上的 `thinkingLevel` 是谁写入的？
- tool result 的 `terminate` 对下一轮 assistant response 有什么影响？
- 同一 run 内 tool 执行与下一轮模型请求之间如何插入 compaction？

## 职责边界

`runLoop` 是 `agent-loop.ts` 中新 prompt 与 continuation 的共享轮次控制核心：`runAgentLoop` 和 `runAgentLoopContinue` 都在发出 `agent_start` / `turn_start` 后调用同一个 `runLoop`。[E: packages/agent/src/agent-loop.ts:124] [E: packages/agent/src/agent-loop.ts:149] `runLoop` 不负责把初始 prompt 放入 context，也不负责校验 continuation 是否能继续；这些入口差异分别由 `runAgentLoop` 和 `runAgentLoopContinue` 在进入 `runLoop` 前处理。[E: packages/agent/src/agent-loop.ts:110] [E: packages/agent/src/agent-loop.ts:114] [E: packages/agent/src/agent-loop.ts:135] [E: packages/agent/src/agent-loop.ts:139]

`runLoop` 的直接职责是维护本次 run 的 `currentContext`、`config`、`lastCompletedTurn`、`pendingMessages` 和 `explicitContinuation`，然后在 assistant response、tool calls、turn hooks、steering queue 与 follow-up queue 之间调度下一步。[E: packages/agent/src/agent-loop.ts:171] [E: packages/agent/src/agent-loop.ts:172] [E: packages/agent/src/agent-loop.ts:173] [E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:176] [E: packages/agent/src/agent-loop.ts:242] [E: packages/agent/src/agent-loop.ts:286] [E: packages/agent/src/agent-loop.ts:219]

本节点不覆盖已删除的 agent-core harness / session / compaction。可复用 durable session 在 `pi-durable`；产品 JSONL 会话在 `pi-coding-agent`。[I]

## 关键文件

- `packages/agent/src/agent-loop.ts`：定义 `runLoop`、`streamAssistantResponse`、tool-call execution，以及 `runLoop` 依赖的事件发射顺序。[E: packages/agent/src/agent-loop.ts:163] [E: packages/agent/src/agent-loop.ts:242] [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:508]
- `packages/agent/src/agent.ts`：把 `finishTurn` / `prepareRequest` 注入 loop config，并把 `prepareNextTurnWithContext` / `prepareNextTurn` 包装进 `AgentLoopConfig.prepareNextTurn`。[E: packages/agent/src/agent.ts:482] [E: packages/agent/src/agent.ts:483] [E: packages/agent/src/agent.ts:484] [E: packages/agent/src/agent.ts:487]
- `packages/agent/src/types.ts`：`FinishTurn`、`PrepareRequest` 与 `prepareNextTurn` 的 hook 签名。[E: packages/agent/src/types.ts:155] [E: packages/agent/src/types.ts:186] [E: packages/agent/src/types.ts:264] [E: packages/agent/src/types.ts:271] [E: packages/agent/src/types.ts:278]
- `packages/agent/src/stream-fn.ts`：caller 省略 `streamFn` 时，`runAgentLoop` / `runAgentLoopContinue` 回退到 `getDefaultStreamFn()`。[E: packages/agent/src/agent-loop.ts:124] [E: packages/agent/src/agent-loop.ts:149] [E: packages/agent/src/stream-fn.ts:15]

## 数据模型

`runLoop` 的状态模型很小：`currentContext` 是下一次 provider request 使用的 agent context，`newMessages` 是调用方最终返回并随 `agent_end` 发送的新消息数组，`config` 是可被 `prepareNextTurn` / `prepareRequest` 局部替换的运行配置，`lastCompletedTurn` 是上一轮完成后的 `PrepareNextTurnContext`，`explicitContinuation` 记录 `finishTurn` 是否要求再保证一次请求。[E: packages/agent/src/agent-loop.ts:163] [E: packages/agent/src/agent-loop.ts:171] [E: packages/agent/src/agent-loop.ts:172] [E: packages/agent/src/agent-loop.ts:173] [E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:280] [E: packages/agent/src/agent-loop.ts:294]

`pendingMessages` 表示下一次 assistant response 前要注入 context 的 queued messages；它在 loop 开始时来自 `getSteeringMessages`，在每轮 `finishTurn` 未结束 run 后再来自 `getSteeringMessages`，而 follow-up messages 只在 agent 本来要停时被转成 `pendingMessages`。[E: packages/agent/src/agent-loop.ts:176] [E: packages/agent/src/agent-loop.ts:204] [E: packages/agent/src/agent-loop.ts:295] [E: packages/agent/src/agent-loop.ts:302] [E: packages/agent/src/agent-loop.ts:306]

`hasMoreToolCalls` 是内层循环的续跑信号：每个外层 pass 初始为 `true`，没有 tool calls 时会保持 `false`，有 tool calls 时由 `executeToolCalls` / `failToolCallsFromTruncatedMessage` 返回的 batch-level `terminate` 反向决定。[E: packages/agent/src/agent-loop.ts:180] [E: packages/agent/src/agent-loop.ts:183] [E: packages/agent/src/agent-loop.ts:262] [E: packages/agent/src/agent-loop.ts:272]

`AgentTurnDecision` 只有 `{ action: "continue" }` 与 `{ action: "end" }`；返回 `undefined` / `void` 保留正常调度。[E: packages/agent/src/types.ts:147] [E: packages/agent/src/types.ts:155]

## 控制流

1. `runLoop@packages/agent/src/agent-loop.ts:163` 初始化当前 context、配置、`lastCompletedTurn` 和 `explicitContinuation`，并在第一轮 assistant response 前先检查 steering queue。[E: packages/agent/src/agent-loop.ts:171] [E: packages/agent/src/agent-loop.ts:172] [E: packages/agent/src/agent-loop.ts:173] [E: packages/agent/src/agent-loop.ts:174] [E: packages/agent/src/agent-loop.ts:176]

2. 外层 `while (true)` 表示“agent 停止点”循环；它只在内层 tool/steering 工作耗尽后检查 follow-up messages，若存在 follow-up 就把它们设为 `pendingMessages` 并重新进入内层循环。[E: packages/agent/src/agent-loop.ts:179] [E: packages/agent/src/agent-loop.ts:302] [E: packages/agent/src/agent-loop.ts:303] [E: packages/agent/src/agent-loop.ts:306]

3. 内层 `while (hasMoreToolCalls || pendingMessages.length > 0)` 表示“需要再请求 provider”的循环。除本 run 的第一轮 assistant 外，每次进入内层且 `lastCompletedTurn` 已设置时，先跑 `prepareNextTurn`，再发新的 `turn_start`。[E: packages/agent/src/agent-loop.ts:183] [E: packages/agent/src/agent-loop.ts:185] [E: packages/agent/src/agent-loop.ts:186] [E: packages/agent/src/agent-loop.ts:207] `prepareNextTurn` 还可以返回 `messages`，这些消息会和 pending queue 一起在请求前发出。[E: packages/agent/src/agent-loop.ts:189] [E: packages/agent/src/types.ts:165]

4. 如果存在 `preparedMessages` 或 `pendingMessages`，`runLoop` 先经 `declareToolChanges` 处理，再为每条 message 发 `message_start` / `message_end`，同步追加到 `currentContext.messages` 和 `newMessages`，最后清空 pending 队列。[E: packages/agent/src/agent-loop.ts:211] [E: packages/agent/src/agent-loop.ts:212] [E: packages/agent/src/agent-loop.ts:213] [E: packages/agent/src/agent-loop.ts:214] [E: packages/agent/src/agent-loop.ts:215] [E: packages/agent/src/agent-loop.ts:217]

5. `prepareRequest` 在每次 `streamAssistantResponse` 之前运行，包括本 run 的第一次请求。pending messages 此时已经 append。返回的 context / model / thinkingLevel 替换当前 config；该 hook 不 poll 队列。[E: packages/agent/src/agent-loop.ts:219] [E: packages/agent/src/agent-loop.ts:227] [E: packages/agent/src/types.ts:186] [E: packages/agent/src/types.ts:271] 传给 hook 的 `thinkingLevel` 是 `config.reasoning ?? "off"`。[E: packages/agent/src/agent-loop.ts:223]

6. `streamAssistantResponse@packages/agent/src/agent-loop.ts:381` 完成 provider request 并返回 assistant message。收尾时用 `Object.assign(await response.result(), { thinkingLevel: config.reasoning ?? "off" })` 把本轮请求级 reasoning 盖到最终 assistant message 上，不依赖具体 `streamFn` 是否自己带回该字段。[E: packages/agent/src/agent-loop.ts:409] [E: packages/agent/src/agent-loop.ts:445] `runLoop` 把该 assistant message 放入 `newMessages`。如果 `stopReason` 是 `"error"` 或 `"aborted"`，仍调用 `finishTurn`，然后发 `turn_end` 与 `agent_end` 后立即返回。这是 hard exit：`finishTurn` 决策被忽略，不调用 `prepareNextTurn`。[E: packages/agent/src/agent-loop.ts:242] [E: packages/agent/src/agent-loop.ts:245] [E: packages/agent/src/agent-loop.ts:252] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:254] [E: packages/agent/src/agent-loop.ts:255]

7. 正常 assistant message 会筛出 `toolCall` content；`stopReason === "length"` 时整批失败而不执行工具，否则执行 `executeToolCalls@packages/agent/src/agent-loop.ts:508`，并把返回的 tool result messages 追加到 context 与 `newMessages`。[E: packages/agent/src/agent-loop.ts:259] [E: packages/agent/src/agent-loop.ts:267] [E: packages/agent/src/agent-loop.ts:270] [E: packages/agent/src/agent-loop.ts:274] [E: packages/agent/src/agent-loop.ts:275] [E: packages/agent/src/agent-loop.ts:276]

8. `executeToolCalls` 的 `terminate` 只控制是否因当前 tool batch 自动继续下一次 assistant response；`shouldTerminateToolBatch()` 在全部 finalized result 都带 `terminate === true` 时返回 true，loop 再写成 `hasMoreToolCalls = !executedToolBatch.terminate`。[E: packages/agent/src/agent-loop.ts:272] [E: packages/agent/src/agent-loop.ts:689] [E: packages/agent/src/agent-loop.ts:690] steering、follow-up 或 `finishTurn` 的 `{ action: "continue" }` 仍能让 run 继续。[E: packages/agent/src/agent-loop.ts:183] [E: packages/agent/src/agent-loop.ts:294] [E: packages/agent/src/agent-loop.ts:302] [E: packages/agent/src/agent-loop.ts:311]

9. 非 error/aborted 路径下，每轮 assistant/tool 阶段结束后 `runLoop` 写入 `lastCompletedTurn`，**先**调用 `finishTurn`，**再**发 `turn_end`。[E: packages/agent/src/agent-loop.ts:280] [E: packages/agent/src/agent-loop.ts:286] [E: packages/agent/src/agent-loop.ts:287] [E: packages/agent/src/types.ts:264] 如果决策是 `{ action: "end" }`，`runLoop` 在 `turn_end` 之后发 `agent_end` 并退出，不再 polling steering / follow-up，也**不**调用 `prepareNextTurn`。[E: packages/agent/src/agent-loop.ts:289] [E: packages/agent/src/agent-loop.ts:290] [E: packages/agent/src/types.ts:264]

10. 如果没有 `{ action: "end" }`，`runLoop` 记录 `{ action: "continue" }` 为 `explicitContinuation`，再读取 steering messages 并回到内层条件。tool calls 或 pending steering 一旦已经会触发下一请求，就把 `explicitContinuation` 清掉，避免额外加一轮。[E: packages/agent/src/agent-loop.ts:294] [E: packages/agent/src/agent-loop.ts:295] [E: packages/agent/src/agent-loop.ts:296] 只有内层或 follow-up 决定还会再开一轮 assistant turn 时，下一轮循环入口才调用 `prepareNextTurn(lastCompletedTurn)`，允许替换 context、model、reasoning，以及追加 `messages`。[E: packages/agent/src/agent-loop.ts:185] [E: packages/agent/src/agent-loop.ts:186] [E: packages/agent/src/agent-loop.ts:188] [E: packages/agent/src/agent-loop.ts:192] `prepareNextTurn` 可以是长任务（例如 compaction）；完成后若 pending 仍为空会再 poll 一次 steering，避免 one-at-a-time 模式在长准备期间漏掉一条、或把两条塞进同一 turn。[E: packages/agent/src/agent-loop.ts:204]

11. 内层循环结束后若 follow-up 为空，且 `explicitContinuation` 仍为 true，外层会清掉该标志并 `continue`，用当前 context 再开一轮（没有新 pending messages 的 context-only turn）。[E: packages/agent/src/agent-loop.ts:311] [E: packages/agent/src/agent-loop.ts:313] [E: packages/agent/src/types.ts:147] 否则在函数末尾发 `agent_end`，此时同样不调用 `prepareNextTurn`。[E: packages/agent/src/agent-loop.ts:320]

## 设计动机与 gotcha

`runLoop` 把 follow-up 设计成外层停止点检查，而不是每个 turn 后都和 steering 一起注入；这让 follow-up messages 等到 tool-call 驱动的自然续轮耗尽之后才进入 context。[E: packages/agent/src/agent-loop.ts:179] [E: packages/agent/src/agent-loop.ts:183] [E: packages/agent/src/agent-loop.ts:295] [E: packages/agent/src/agent-loop.ts:302] [I]

`prepareNextTurn` 的 `thinkingLevel: "off"` 不会把 `config.reasoning` 写成字符串 `"off"`，而是映射成 `undefined`；其他 thinking level 会直接成为下一轮 `config.reasoning`。`prepareRequest` 使用同一套 mapping。[E: packages/agent/src/agent-loop.ts:193] [E: packages/agent/src/agent-loop.ts:194] [E: packages/agent/src/agent-loop.ts:196] [E: packages/agent/src/agent-loop.ts:197] [E: packages/agent/src/agent-loop.ts:232] [E: packages/agent/src/agent-loop.ts:235] `Agent.createLoopConfig` 把 `state.thinkingLevel === "off"` 编成初始 `reasoning: undefined`。[E: packages/agent/src/agent.ts:471] 因此最终写进 assistant message 的 `thinkingLevel` 对关闭态一律是 `"off"`。[E: packages/agent/src/agent-loop.ts:409]

`finishTurn` 是 graceful stop / continue gate，不会打断当前 assistant response 或当前 tool batch；它的检查点在工具 finalize 之后、`turn_end` 之前，决策在 `turn_end` 之后应用。[E: packages/agent/src/agent-loop.ts:286] [E: packages/agent/src/agent-loop.ts:287] [E: packages/agent/src/agent-loop.ts:289] `prepareNextTurn` / `prepareNextTurnWithContext` 只在决定还会再开一轮 assistant turn 之后运行；终局 / terminating turn 不再调用，end-of-run 工作应放到 `agent_end`。[E: packages/agent/src/agent-loop.ts:185] [E: packages/agent/src/agent.ts:484] [E: packages/agent/src/types.ts:278]

`stopReason === "error"` 或 `"aborted"` 是 hard-stop path：它在 tool-call 检查之前返回，只发一个空 toolResults 的 `turn_end`，随后发 `agent_end`。`finishTurn` 仍会跑，但决策被忽略。[E: packages/agent/src/agent-loop.ts:245] [E: packages/agent/src/agent-loop.ts:252] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:254] [E: packages/agent/src/agent-loop.ts:255]

无条件返回 `{ action: "continue" }` 会在下一轮 `finishTurn` 再次生效，从而形成 endless loop。[E: packages/agent/src/agent-loop.ts:294] [E: packages/agent/src/agent-loop.ts:311] [I]

同一 run 内，tool batch 追加进 context 之后、下一轮 `streamAssistantResponse` 之前，`prepareNextTurn` 可以改写 context，随后 `prepareRequest` 再在每次请求前安装 canonical context。coding-agent 把 threshold auto-compaction 挂在 `prepareNextTurnWithContext` 上，因此大 tool result 不必先发给下一轮模型再 compact。compaction 不在 agent-core。[E: packages/agent/src/agent-loop.ts:186] [E: packages/agent/src/agent-loop.ts:219] [E: packages/agent/src/agent.ts:487] [I]

## 跨包边界

[subsys.agent-core.message-queue](message-queue.md) 覆盖 queued message 的来源、drain mode 和产品交互语义；本节点只记录 `runLoop` 何时调用 `getSteeringMessages` / `getFollowUpMessages`，以及返回 messages 如何进入 context。[E: packages/agent/src/agent-loop.ts:176] [E: packages/agent/src/agent-loop.ts:295] [E: packages/agent/src/agent-loop.ts:302] [I]

[subsys.agent-core.hooks](hooks.md) 覆盖 hook 类型和调用者注入策略；本节点只记录 turn-control 层如何调用 `prepareRequest`、`finishTurn` 与 `prepareNextTurn`，以及 hook 返回值如何影响下一轮或停止。[E: packages/agent/src/agent-loop.ts:186] [E: packages/agent/src/agent-loop.ts:219] [E: packages/agent/src/agent-loop.ts:286] [E: packages/agent/src/types.ts:264] [E: packages/agent/src/types.ts:271] [E: packages/agent/src/types.ts:278] [I]

[subsys.coding-agent.agent-session](../coding-agent/agent-session.md) 覆盖产品层如何把 canonical `SessionManager` 投影接到 `prepareRequest`，以及如何在 `prepareNextTurnWithContext` 里先跑 threshold compaction。[I]

[spine.agent-loop](../../spine/agent-loop.md) 是端到端视角，覆盖入口、provider streaming、tool invocation 和状态归约；本节点收窄到 `runLoop` 的 while 条件、queue drain 点和 stop gates。[E: packages/agent/src/agent-loop.ts:163] [E: packages/agent/src/agent-loop.ts:183] [E: packages/agent/src/agent-loop.ts:286] [I]

[ref.agent.thinking-levels](../../reference/thinking-levels.md) 枚举 `ThinkingLevel` 值域；本节点证明 loop 如何把 `"off"` 映射成 `undefined` reasoning，以及如何把请求级写回 assistant message。[E: packages/agent/src/agent-loop.ts:409] [E: packages/agent/src/types.ts:349]

## Sources

- packages/agent/src/agent-loop.ts
- packages/agent/src/agent.ts
- packages/agent/src/types.ts
- packages/agent/src/stream-fn.ts

## 相关

- [spine.agent-loop](../../spine/agent-loop.md): 一次 turn 的端到端事件与 hook 插入点。
- [subsys.agent-core.message-queue](message-queue.md): steering / follow-up 队列 API 与 drain 实现。
- [subsys.agent-core.hooks](hooks.md): `finishTurn` / `prepareRequest` / `prepareNextTurn` 的类型合同。
- [subsys.coding-agent.agent-session](../coding-agent/agent-session.md): 产品层把 session projection 与 compaction 接到这些 hook。
- [ref.agent.thinking-levels](../../reference/thinking-levels.md): `ThinkingLevel` 七个 literal 与 assistant message 字段。
