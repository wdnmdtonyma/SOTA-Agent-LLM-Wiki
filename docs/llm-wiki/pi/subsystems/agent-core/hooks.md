---
id: subsys.agent-core.hooks
title: 代理钩子(beforeToolCall/afterToolCall/finishTurn/prepareRequest)
kind: subsystem
tier: T2
pkg: agent
source:
 - packages/agent/src/types.ts
 - packages/agent/src/agent.ts
 - packages/agent/src/agent-loop.ts
 - packages/agent/CHANGELOG.md
symbols:
 - beforeToolCall
 - afterToolCall
 - prepareNextTurn
 - prepareNextTurnWithContext
 - finishTurn
 - prepareRequest
 - peekQueuedMessages
 - transformContext
related:
 - subsys.agent-core.tool-invocation
 - subsys.agent-core.turn-control
 - subsys.coding-agent.agent-session
evidence: explicit
status: verified
updated: 6f7551516b
---

> `subsys.agent-core.hooks` 是 `pi-agent-core` 暴露给上层 runtime 的 hook contract: 它允许调用方在每次 provider 请求前改写 runtime state, 在工具执行前阻断调用, 在工具执行后覆盖结果, 在 assistant+tools finalize 之后决定是否结束本 run, 并在 loop **决定还会再开一轮 assistant turn** 之后替换下一轮 runtime state。

## 能回答的问题

- `transformContext`、`beforeToolCall`、`afterToolCall`、`prepareRequest`、`finishTurn`、`prepareNextTurn`、`prepareNextTurnWithContext` 分别接收什么输入?
- `prepareRequest` 何时运行, 第一次 provider 请求会不会调用, 它会不会 poll 队列?
- `finishTurn` 相对 `turn_end` 谁先谁后, `{ action: "end" }` 与 error/aborted hard exit 有何不同?
- `prepareNextTurn` 在终局 turn 还会不会调用?
- `beforeToolCall` 的 block 语义是什么, 被 block 的工具会不会继续执行?
- `afterToolCall` 覆盖 `content`、`details`、`isError`、`terminate` 时是深合并还是整体替换?
- `peekQueuedMessages()` 预览哪一个队列, 会不会消费消息?
- 这些 hook 的边界在哪里, 哪些行为需要去读 agent loop 或 coding-agent 装配节点?

## 职责边界

本节点覆盖 `packages/agent/src/types.ts` 中的 hook 类型、hook 输入/输出 shape, 以及 `Agent` 如何把 `finishTurn` / `prepareRequest` / `prepareNextTurn` / `prepareNextTurnWithContext` 包装进 `AgentLoopConfig`。真实 runtime 的分支、事件发射顺序、parallel/sequential 调度由 `spine.agent-loop` 与 `subsys.agent-core.turn-control` 深挖 [I]。

`AgentLoopConfig` 是这些 hook 的集中入口: `transformContext`、`finishTurn`、`prepareRequest`、`prepareNextTurn`、`beforeToolCall`、`afterToolCall` 都是 optional config fields, 调用方可以只实现其中一部分。已删除 `shouldStopAfterTurn` [E: packages/agent/src/types.ts:189] [E: packages/agent/src/types.ts:240] [E: packages/agent/src/types.ts:260] [E: packages/agent/src/types.ts:267] [E: packages/agent/src/types.ts:274] [E: packages/agent/src/types.ts:322] [E: packages/agent/src/types.ts:337] [E: packages/agent/CHANGELOG.md:11]。

## Hook 目录

| Hook | 类型位置 | 输入 | 返回 | 类型层调用时机 |
| --- | --- | --- | --- | --- |
| `transformContext` | `AgentLoopConfig.transformContext` | `AgentMessage[]`, optional `AbortSignal` | `Promise<AgentMessage[]>` | 签名工作在 `convertToLlm` 前的 `AgentMessage[]` 层 [E: packages/agent/src/types.ts:240] [I] |
| `beforeToolCall` | `AgentLoopConfig.beforeToolCall` | `BeforeToolCallContext`, optional `AbortSignal` | `Promise<BeforeToolCallResult \| undefined>` | 工具执行前、参数验证后 [E: packages/agent/src/types.ts:322] [I] |
| `afterToolCall` | `AgentLoopConfig.afterToolCall` | `AfterToolCallContext`, optional `AbortSignal` | `Promise<AfterToolCallResult \| undefined>` | 工具完成后、`tool_execution_end` 和 tool-result message events 发出前 [E: packages/agent/src/types.ts:337] [I] |
| `prepareRequest` | `AgentLoopConfig.prepareRequest` | `PrepareRequestContext`, optional `AbortSignal` | `AgentRequestUpdate \| void` | 每次 conversational provider 请求前, 含第一次; pending messages 已 append; 不 poll 队列 [E: packages/agent/src/types.ts:182] [E: packages/agent/src/types.ts:267] [E: packages/agent/src/agent-loop.ts:218] |
| `finishTurn` | `AgentLoopConfig.finishTurn` | `AgentTurnContext`, optional `AbortSignal` | `AgentTurnDecision \| void` | assistant 与全部 tool-result 已 finalize 之后、`turn_end` 之前; 决策在 `turn_end` 之后应用 [E: packages/agent/src/types.ts:151] [E: packages/agent/src/types.ts:260] [E: packages/agent/src/agent-loop.ts:285] |
| `prepareNextTurn` | `AgentLoopConfig.prepareNextTurn` | `PrepareNextTurnContext` | `AgentLoopTurnUpdate \| undefined \| Promise<...>` | 只在 loop 决定还会再开一轮 assistant turn 之后、下一轮 `turn_start` 之前 [E: packages/agent/src/types.ts:274] [E: packages/agent/src/agent-loop.ts:185] [I] |
| `prepareNextTurnWithContext` | `Agent.prepareNextTurnWithContext` | `PrepareNextTurnContext`, optional `AbortSignal` | 与 `prepareNextTurn` 相同 | `Agent.createLoopConfig` 优先于无 context 的 `Agent.prepareNextTurn(signal)` 包装成 config hook [E: packages/agent/src/agent.ts:214] [E: packages/agent/src/agent.ts:484] [E: packages/agent/src/agent.ts:487] |
| `peekQueuedMessages` | `Agent.peekQueuedMessages` | 无 | `AgentMessage[]` | 预览下一 turn 将选出的 queued batch, 不消费; 有 steering 则只看 steering, 否则看 follow-up; 遵守各自 `QueueMode` [E: packages/agent/src/agent.ts:330] [E: packages/agent/src/agent.ts:330] [E: packages/agent/src/agent.ts:159] |

## transformContext

`transformContext` 的类型签名工作在 `AgentMessage[]` 层,返回值仍是 `AgentMessage[]`;context window management、裁剪旧消息、注入外部上下文属于 hook 语义 [E: packages/agent/src/types.ts:240] [I]。

`transformContext` 的注释 contract 是不能 throw 或 reject;失败时应返回原始 messages 或其他 safe fallback。`types.ts` 只为 `transformContext` 声明这个 hook-local fallback contract, 不单独定义失败时的 runtime event sequence [I]。

边界: `transformContext` 不负责把消息转换成 provider wire message, 这个职责属于必填的 `convertToLlm(messages)`;`convertToLlm` 的输出是 `Message[] | Promise<Message[]>`, 而 `transformContext` 的输出仍是 `AgentMessage[]` [E: packages/agent/src/types.ts:218] [E: packages/agent/src/types.ts:240]。

## beforeToolCall

`beforeToolCall` 的输入是 `BeforeToolCallContext`: 包含发起工具调用的 `assistantMessage`, 原始 `toolCall` block, 已验证的 `args`, 以及准备该工具调用时的 `AgentContext` [E: packages/agent/src/types.ts:103] [E: packages/agent/src/types.ts:105] [E: packages/agent/src/types.ts:107] [E: packages/agent/src/types.ts:109] [E: packages/agent/src/types.ts:111]。

`BeforeToolCallResult` 有三个字段: `block?: boolean`、`reason?: string` 与 `terminate?: boolean`。返回 `{ block: true }` 会阻止工具执行、loop 改为发出 error tool result、`reason` 展示为 error result 文本; `terminate` 只在当前 batch 每个 finalized result 都为 true 时 early-stop [E: packages/agent/src/types.ts:66] [E: packages/agent/src/types.ts:67] [E: packages/agent/src/types.ts:68] [E: packages/agent/src/types.ts:73] [I]。

`beforeToolCall` 接收 agent abort signal, 但 honoring signal 的责任交给 hook 实现者;`types.ts` 只声明签名和责任, 不定义取消策略的具体行为 [E: packages/agent/src/types.ts:322] [I]。

## afterToolCall

`afterToolCall` 的输入是 `AfterToolCallContext`: 它包含同一条 `assistantMessage`、原始 `toolCall`、已验证 `args`、尚未应用 hook override 的 `result`、当前 `isError` 标志和 finalize 时的 `AgentContext` [E: packages/agent/src/types.ts:115] [E: packages/agent/src/types.ts:117] [E: packages/agent/src/types.ts:119] [E: packages/agent/src/types.ts:121] [E: packages/agent/src/types.ts:123] [E: packages/agent/src/types.ts:125] [E: packages/agent/src/types.ts:127]。

`AfterToolCallResult` 是 partial override: `content`、`details`、`isError`、`usage`、`terminate` 都是 optional fields;未提供字段保留原始执行结果 [E: packages/agent/src/types.ts:89] [E: packages/agent/src/types.ts:90] [E: packages/agent/src/types.ts:91] [E: packages/agent/src/types.ts:92] [E: packages/agent/src/types.ts:94] [E: packages/agent/src/types.ts:99] [I]。

`AfterToolCallResult` 对 `content`、`details` 和 `usage` 没有 deep merge;返回这些字段时是整体替换 [E: packages/agent/src/types.ts:90] [E: packages/agent/src/types.ts:91] [E: packages/agent/src/types.ts:94] [I]。

`terminate` 是一个 tool-batch 级 early-termination hint, 只有当前 batch 中每个 finalized tool result 都设置为 true 时才会 early terminate [E: packages/agent/src/types.ts:99] [I]。

## prepareRequest

`prepareRequest` 的输入 `PrepareRequestContext` 包含即将发出的 `context`、`model` 和 `thinkingLevel` [E: packages/agent/src/types.ts:169] [E: packages/agent/src/types.ts:170] [E: packages/agent/src/types.ts:171] [E: packages/agent/src/types.ts:172]。

返回值是 `AgentRequestUpdate`, 即不含 `messages` 的 `AgentLoopTurnUpdate`: 只能替换 `context` / `model` / `thinkingLevel`, 不能在此刻追加新消息 [E: packages/agent/src/types.ts:176] [E: packages/agent/src/types.ts:157]。pending messages 已经 append 并发出 lifecycle events 后才进入该 hook [E: packages/agent/src/types.ts:182] [E: packages/agent/src/agent-loop.ts:210] [E: packages/agent/src/agent-loop.ts:218]。

`prepareRequest` 覆盖每一次 conversational provider request, **包括第一次**。它不 poll steering / follow-up; 在它运行期间入队的 steering 要等到下一轮正常 steering poll [E: packages/agent/src/types.ts:267] [E: packages/agent/src/agent-loop.ts:218] [E: packages/agent/CHANGELOG.md:29] [I]。

`Agent` 把 `this.prepareRequest` 原样注入 `AgentLoopConfig.prepareRequest` [E: packages/agent/src/agent.ts:210] [E: packages/agent/src/agent.ts:244] [E: packages/agent/src/agent.ts:483]。coding-agent 用它在每次请求前把 `SessionManager.buildSessionProjection().messages` 安装为 canonical provider context; 产品装配见 `subsys.coding-agent.agent-session` [I]。

## finishTurn

`finishTurn` 的输入 `AgentTurnContext` 能看到刚完成 turn 的 assistant `message`、本 turn 的 `toolResults`、追加了 assistant/tool result 后的 `context`, 以及当前 loop invocation 若退出会返回的 `newMessages` [E: packages/agent/src/types.ts:131] [E: packages/agent/src/types.ts:133] [E: packages/agent/src/types.ts:135] [E: packages/agent/src/types.ts:137] [E: packages/agent/src/types.ts:139]。`PrepareNextTurnContext` 现在只是 `AgentTurnContext` 的别名 [E: packages/agent/src/types.ts:187]。

返回值 `AgentTurnDecision` 只有 `{ action: "continue" }` 或 `{ action: "end" }`。返回 `undefined` / `void` 保留正常调度 [E: packages/agent/src/types.ts:143] [E: packages/agent/src/types.ts:151]。

调用时序: assistant 与全部 tool-result messages 已经 emit 之后、`turn_end` 之前。决策在 `turn_end` 之后应用 [E: packages/agent/src/types.ts:151] [E: packages/agent/src/types.ts:260] [E: packages/agent/src/agent-loop.ts:285] [E: packages/agent/src/agent-loop.ts:286] [E: packages/agent/CHANGELOG.md:25]。

`{ action: "end" }` 结束正常 run: `turn_end` 之后立刻 `agent_end`, 不 poll 队列, 也不准备下一次请求 [E: packages/agent/src/types.ts:143] [E: packages/agent/src/agent-loop.ts:288]。`{ action: "continue" }` 保证还会有一次 provider 请求; 已有的 tool-result / steering / follow-up 调度可以满足该请求且不额外加一轮, 否则 loop 用当前 context 再跑一次 [E: packages/agent/src/types.ts:143] [E: packages/agent/src/agent-loop.ts:293] [E: packages/agent/src/agent-loop.ts:310]。error 与 aborted 响应仍是 hard exit: `finishTurn` 会被调用, 但决策被忽略 [E: packages/agent/src/agent-loop.ts:244] [E: packages/agent/src/agent-loop.ts:251] [E: packages/agent/CHANGELOG.md:30]。

从已删除的 `shouldStopAfterTurn` 迁移: 对正常 turn 在谓词为 true 时返回 `{ action: "end" }`; 对 error/aborted 先 return, 以免 hard-exit 路径上执行有副作用的谓词 [E: packages/agent/CHANGELOG.md:11] [E: packages/agent/CHANGELOG.md:18]。

`Agent` 把 `this.finishTurn` 原样注入 `AgentLoopConfig.finishTurn` [E: packages/agent/src/agent.ts:209] [E: packages/agent/src/agent.ts:243] [E: packages/agent/src/agent.ts:482]。coding-agent 在该 hook 里 dispatch `turn_end` extension boundary, 并可能把 extension `continue: true` 译成 `{ action: "continue" }`; 产品装配见 `subsys.coding-agent.agent-session` [I]。

## prepareNextTurn

`prepareNextTurn` 返回 `AgentLoopTurnUpdate | undefined`;非空 update 可以替换下一次 provider request 使用的 `context`、`model` 和 `thinkingLevel`, 也可以用 `messages` 在下一轮 `turn_start` 之后、`prepareRequest` 之前追加消息 [E: packages/agent/src/types.ts:157] [E: packages/agent/src/types.ts:159] [E: packages/agent/src/types.ts:161] [E: packages/agent/src/types.ts:163] [E: packages/agent/src/types.ts:165] [E: packages/agent/src/types.ts:274] [E: packages/agent/src/agent-loop.ts:188]。

`prepareNextTurn` 与 `prepareNextTurnWithContext` 只在 queued-message 检查和 `finishTurn` 决定**还会再开一轮 assistant turn** 之后运行;终局 / terminating turn 不再调用。end-of-run 工作应放到 `agent_end` 处理, 不要再写进 `prepareNextTurn` [E: packages/agent/src/types.ts:274] [E: packages/agent/src/agent-loop.ts:184] [E: packages/agent/src/agent-loop.ts:288]。

`Agent` 上有两套入口: `prepareNextTurn(signal)` 不接收 turn context; `prepareNextTurnWithContext(context, signal)` 接收 `PrepareNextTurnContext`。`createLoopConfig` 优先走 `prepareNextTurnWithContext` [E: packages/agent/src/agent.ts:211] [E: packages/agent/src/agent.ts:214] [E: packages/agent/src/agent.ts:484] [E: packages/agent/src/agent.ts:487] [E: packages/agent/src/agent.ts:490]。coding-agent 用后者在同一 run 内、下一轮模型请求前插入 threshold compaction;产品装配见 `subsys.coding-agent.agent-session` [I]。

`finishTurn` 与 `prepareNextTurn` 都位于 turn 完成后的控制平面, 但职责不同: `finishTurn` 返回 decision 请求 graceful stop 或保证再请求一次, `prepareNextTurn` 只在还会续轮时产生下一轮 runtime state replacement [E: packages/agent/src/types.ts:260] [E: packages/agent/src/types.ts:274] [I]。

## peekQueuedMessages

`Agent.peekQueuedMessages()` 调用 steering queue 的 `peek()`, 非空则返回该 batch; 否则 peek follow-up queue。`PendingMessageQueue.peek()` 在 `mode === "all"` 时复制全部消息, 在 `"one-at-a-time"` 时只返回最旧的一条。该方法不 `drain()`, 因此不会消费队列 [E: packages/agent/src/agent.ts:330] [E: packages/agent/src/agent.ts:330] [E: packages/agent/src/agent.ts:332] [E: packages/agent/src/agent.ts:159] [E: packages/agent/src/agent.ts:160] [E: packages/agent/CHANGELOG.md:31]。

## 边界与 gotcha

- 这些 hook 是 `agent` 包的 reusable runtime contract, 不是 `coding-agent` extension API 本身。产品层可以把 extension events 接到这些 hook, 但这个装配链不在 `packages/agent/src/types.ts` 中 [I]。
- `beforeToolCall` 能 block, 但它不能返回替换后的 tool result content/details;要改写结果必须使用 `afterToolCall` [E: packages/agent/src/types.ts:66] [E: packages/agent/src/types.ts:89] [I]。
- `afterToolCall` 能改写执行结果, 但类型层没有给它重新执行工具、重跑 schema validation 或改变 tool name 的能力 [E: packages/agent/src/types.ts:89] [E: packages/agent/src/types.ts:90] [E: packages/agent/src/types.ts:91] [E: packages/agent/src/types.ts:92] [E: packages/agent/src/types.ts:99] [E: packages/agent/src/types.ts:115] [I]。
- `transformContext` 影响 provider request 前的 message list, 但不直接写回 `AgentContext.messages`;是否持久化取决于 agent loop 实现, 需要读 `spine.agent-loop` 核对 [I]。
- `prepareRequest` 不能追加 messages;要在下一请求前注入消息, 使用 queue 或 `prepareNextTurn.messages` [E: packages/agent/src/types.ts:176] [E: packages/agent/src/types.ts:161] [I]。
- `prepareNextTurn` 只影响**下一轮** provider request 的 context/model/thinking state;终局 turn 不会再调用它, 因此不能用它做 end-of-run 清理 [E: packages/agent/src/types.ts:157] [E: packages/agent/src/types.ts:274] [I]。
- `finishTurn` 对 error/aborted 也会被调用, 但那些路径仍 hard exit。无条件 `{ action: "continue" }` 会在下一轮再次触发, 形成 endless loop [E: packages/agent/src/agent-loop.ts:251] [E: packages/agent/src/agent-loop.ts:310] [I]。

## 跨包边界

`subsys.agent-core.tool-invocation` 应覆盖工具 lookup、`prepareArguments`、schema validation、parallel/sequential 执行、partial update 和 tool result message 生成;本节点只覆盖 `beforeToolCall` 与 `afterToolCall` 的类型契约和边界 [E: packages/agent/src/types.ts:322] [E: packages/agent/src/types.ts:337] [I]。

`subsys.agent-core.turn-control` 应覆盖 loop 是否继续、队列 drain、`prepareRequest` / `finishTurn` / `prepareNextTurn` 的实际组合顺序;本节点只覆盖 hook 的输入输出 shape 与时序合同 [E: packages/agent/src/types.ts:131] [E: packages/agent/src/types.ts:182] [E: packages/agent/src/types.ts:260] [E: packages/agent/src/types.ts:267] [E: packages/agent/src/types.ts:274] [I]。

`subsys.coding-agent.agent-session` 覆盖产品层如何把 canonical session projection 接到 `prepareRequest`, 把 `_compactBeforeNextAssistantResponse` 接到 `prepareNextTurnWithContext`, 以及如何把 extension `turn_end` continue 接到 `finishTurn` [I]。

`spine.agent-loop` 是运行时调用点的端到端视角: 它可以证明这些 hook 在具体 loop 中的行号和事件相对顺序 [I]。

## Sources

- packages/agent/src/types.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/agent/CHANGELOG.md

## 相关

- subsys.agent-core.tool-invocation: 工具调用准备、执行、finalize 与 tool result message 生成。
- subsys.agent-core.turn-control: turn 结束后的续跑、停止和队列控制。
- subsys.coding-agent.agent-session: 产品层 next-turn compaction 与 canonical session projection 装配。
