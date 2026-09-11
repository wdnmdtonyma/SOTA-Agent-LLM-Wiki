---
id: subsys.agent-core.hooks
title: 代理钩子(beforeToolCall/afterToolCall/prepareNextTurn)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/agent.ts
  - packages/agent/CHANGELOG.md
symbols:
  - beforeToolCall
  - afterToolCall
  - prepareNextTurn
  - prepareNextTurnWithContext
  - shouldStopAfterTurn
  - transformContext
related:
  - subsys.agent-core.tool-invocation
  - subsys.agent-core.turn-control
  - subsys.coding-agent.agent-session
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.agent-core.hooks` 是 `pi-agent-core` 暴露给上层 runtime 的 hook contract: 它允许调用方在 provider request 前改写 `AgentMessage[]`, 在工具执行前阻断调用, 在工具执行后覆盖结果, 并在 loop **决定还会再开一轮 assistant turn** 之后替换下一轮 runtime state。

## 能回答的问题

- `transformContext`、`beforeToolCall`、`afterToolCall`、`prepareNextTurn`、`prepareNextTurnWithContext` 分别接收什么输入?
- `prepareNextTurn` 在 0.84.4 之后何时运行, 终局 turn 还会不会调用?
- `shouldStopAfterTurn` 与 `prepareNextTurn` 谁先谁后?
- `beforeToolCall` 的 block 语义是什么, 被 block 的工具会不会继续执行?
- `afterToolCall` 覆盖 `content`、`details`、`isError`、`terminate` 时是深合并还是整体替换?
- 这些 hook 的边界在哪里, 哪些行为需要去读 agent loop 或 coding-agent 装配节点?

## 职责边界

本节点覆盖 `packages/agent/src/types.ts` 中的 hook 类型、hook 输入/输出 shape, 以及 `Agent` 如何把 `prepareNextTurn` / `prepareNextTurnWithContext` 包装进 `AgentLoopConfig`。真实 runtime 的分支、事件发射顺序、parallel/sequential 调度由 `spine.agent-loop` 与 `subsys.agent-core.turn-control` 深挖 [I]。

`AgentLoopConfig` 是这些 hook 的集中入口: `transformContext`、`shouldStopAfterTurn`、`prepareNextTurn`、`beforeToolCall`、`afterToolCall` 都是 optional config fields, 调用方可以只实现其中一部分 [E: packages/agent/src/types.ts:149] [E: packages/agent/src/types.ts:200] [E: packages/agent/src/types.ts:223] [E: packages/agent/src/types.ts:230] [E: packages/agent/src/types.ts:278] [E: packages/agent/src/types.ts:293]。

## Hook 目录

| Hook | 类型位置 | 输入 | 返回 | 类型层调用时机 |
| --- | --- | --- | --- | --- |
| `transformContext` | `AgentLoopConfig.transformContext` | `AgentMessage[]`, optional `AbortSignal` | `Promise<AgentMessage[]>` | 签名工作在 `convertToLlm` 前的 `AgentMessage[]` 层 [E: packages/agent/src/types.ts:200] [I] |
| `beforeToolCall` | `AgentLoopConfig.beforeToolCall` | `BeforeToolCallContext`, optional `AbortSignal` | `Promise<BeforeToolCallResult \| undefined>` | 工具执行前、参数验证后 [E: packages/agent/src/types.ts:278] [I] |
| `afterToolCall` | `AgentLoopConfig.afterToolCall` | `AfterToolCallContext`, optional `AbortSignal` | `Promise<AfterToolCallResult \| undefined>` | 工具完成后、`tool_execution_end` 和 tool-result message events 发出前 [E: packages/agent/src/types.ts:293] [I] |
| `shouldStopAfterTurn` | `AgentLoopConfig.shouldStopAfterTurn` | `ShouldStopAfterTurnContext` | `boolean \| Promise<boolean>` | `turn_end` 之后; 返回 true 则发 `agent_end` 并退出, 不再 poll 队列, 也不再调用 `prepareNextTurn` [E: packages/agent/src/types.ts:223] [I] |
| `prepareNextTurn` | `AgentLoopConfig.prepareNextTurn` | `PrepareNextTurnContext` | `AgentLoopTurnUpdate \| undefined \| Promise<...>` | 只在 loop 决定还会再开一轮 assistant turn 之后、下一轮 `turn_start` 之前 [E: packages/agent/src/types.ts:230] [E: packages/agent/CHANGELOG.md:18] [I] |
| `prepareNextTurnWithContext` | `Agent.prepareNextTurnWithContext` | `PrepareNextTurnContext`, optional `AbortSignal` | 与 `prepareNextTurn` 相同 | `Agent.createLoopConfig` 优先于无 context 的 `Agent.prepareNextTurn(signal)` 包装成 config hook [E: packages/agent/src/agent.ts:200] [E: packages/agent/src/agent.ts:463] [E: packages/agent/src/agent.ts:466] |

## transformContext

`transformContext` 的类型签名工作在 `AgentMessage[]` 层,返回值仍是 `AgentMessage[]`;context window management、裁剪旧消息、注入外部上下文属于 hook 语义 [E: packages/agent/src/types.ts:200] [I]。

`transformContext` 的注释 contract 是不能 throw 或 reject;失败时应返回原始 messages 或其他 safe fallback。`types.ts` 只为 `transformContext` 声明这个 hook-local fallback contract, 不单独定义失败时的 runtime event sequence [I]。

边界: `transformContext` 不负责把消息转换成 provider wire message, 这个职责属于必填的 `convertToLlm(messages)`;`convertToLlm` 的输出是 `Message[] | Promise<Message[]>`, 而 `transformContext` 的输出仍是 `AgentMessage[]` [E: packages/agent/src/types.ts:178] [E: packages/agent/src/types.ts:200]。

## beforeToolCall

`beforeToolCall` 的输入是 `BeforeToolCallContext`: 包含发起工具调用的 `assistantMessage`, 原始 `toolCall` block, 已验证的 `args`, 以及准备该工具调用时的 `AgentContext` [E: packages/agent/src/types.ts:98] [E: packages/agent/src/types.ts:100] [E: packages/agent/src/types.ts:102] [E: packages/agent/src/types.ts:104] [E: packages/agent/src/types.ts:106]。

`BeforeToolCallResult` 有三个字段: `block?: boolean`、`reason?: string` 与 `terminate?: boolean`。返回 `{ block: true }` 会阻止工具执行、loop 改为发出 error tool result、`reason` 展示为 error result 文本; `terminate` 只在当前 batch 每个 finalized result 都为 true 时 early-stop [E: packages/agent/src/types.ts:61] [E: packages/agent/src/types.ts:62] [E: packages/agent/src/types.ts:63] [E: packages/agent/src/types.ts:68] [I]。

`beforeToolCall` 接收 agent abort signal, 但 honoring signal 的责任交给 hook 实现者;`types.ts` 只声明签名和责任, 不定义取消策略的具体行为 [E: packages/agent/src/types.ts:278] [I]。

## afterToolCall

`afterToolCall` 的输入是 `AfterToolCallContext`: 它包含同一条 `assistantMessage`、原始 `toolCall`、已验证 `args`、尚未应用 hook override 的 `result`、当前 `isError` 标志和 finalize 时的 `AgentContext` [E: packages/agent/src/types.ts:110] [E: packages/agent/src/types.ts:112] [E: packages/agent/src/types.ts:114] [E: packages/agent/src/types.ts:116] [E: packages/agent/src/types.ts:118] [E: packages/agent/src/types.ts:120] [E: packages/agent/src/types.ts:122]。

`AfterToolCallResult` 是 partial override: `content`、`details`、`isError`、`usage`、`terminate` 都是 optional fields;未提供字段保留原始执行结果 [E: packages/agent/src/types.ts:84] [E: packages/agent/src/types.ts:85] [E: packages/agent/src/types.ts:86] [E: packages/agent/src/types.ts:87] [E: packages/agent/src/types.ts:89] [E: packages/agent/src/types.ts:94] [I]。

`AfterToolCallResult` 对 `content`、`details` 和 `usage` 没有 deep merge;返回这些字段时是整体替换 [E: packages/agent/src/types.ts:85] [E: packages/agent/src/types.ts:86] [E: packages/agent/src/types.ts:89] [I]。

`terminate` 是一个 tool-batch 级 early-termination hint, 只有当前 batch 中每个 finalized tool result 都设置为 true 时才会 early terminate [E: packages/agent/src/types.ts:94] [I]。

## prepareNextTurn

`prepareNextTurn` 的输入 `PrepareNextTurnContext` 继承 `ShouldStopAfterTurnContext`, 因此它能看到刚完成 turn 的 assistant `message`、上一 `turn_end` 携带的 `toolResults`、追加了 assistant/tool result 后的 `context`, 以及当前 loop invocation 若退出会返回的 `newMessages` [E: packages/agent/src/types.ts:126] [E: packages/agent/src/types.ts:128] [E: packages/agent/src/types.ts:130] [E: packages/agent/src/types.ts:132] [E: packages/agent/src/types.ts:134] [E: packages/agent/src/types.ts:147]。

`prepareNextTurn` 返回 `AgentLoopTurnUpdate | undefined`;非空 update 可以替换下一次 provider request 使用的 `context`、`model` 和 `thinkingLevel` [E: packages/agent/src/types.ts:138] [E: packages/agent/src/types.ts:140] [E: packages/agent/src/types.ts:142] [E: packages/agent/src/types.ts:144] [E: packages/agent/src/types.ts:230] [I]。

0.84.4 breaking: `prepareNextTurn` 与 `prepareNextTurnWithContext` 只在 `shouldStopAfterTurn` 和 queued-message 检查决定**还会再开一轮 assistant turn** 之后运行;终局 / terminating turn 不再调用。end-of-run 工作应放到 `agent_end` 处理, 不要再写进 `prepareNextTurn` [E: packages/agent/CHANGELOG.md:18] [E: packages/agent/src/types.ts:223] [E: packages/agent/src/types.ts:230]。

`Agent` 上有两套入口: `prepareNextTurn(signal)` 不接收 turn context; `prepareNextTurnWithContext(context, signal)` 接收 `PrepareNextTurnContext`。`createLoopConfig` 优先走 `prepareNextTurnWithContext` [E: packages/agent/src/agent.ts:197] [E: packages/agent/src/agent.ts:200] [E: packages/agent/src/agent.ts:463] [E: packages/agent/src/agent.ts:466] [E: packages/agent/src/agent.ts:469]。coding-agent 用后者在同一 run 内、下一轮模型请求前插入 threshold compaction;产品装配见 `subsys.coding-agent.agent-session` [I]。

`shouldStopAfterTurn` 与 `prepareNextTurn` 都位于 turn 完成后的控制平面, 但职责不同: `shouldStopAfterTurn` 返回 boolean 请求 graceful stop, `prepareNextTurn` 只在还会续轮时产生下一轮 runtime state replacement [E: packages/agent/src/types.ts:223] [E: packages/agent/src/types.ts:230] [I]。

## 边界与 gotcha

- 这些 hook 是 `agent` 包的 reusable runtime contract, 不是 `coding-agent` extension API 本身。产品层可以把 extension events 接到这些 hook, 但这个装配链不在 `packages/agent/src/types.ts` 中 [I]。
- `beforeToolCall` 能 block, 但它不能返回替换后的 tool result content/details;要改写结果必须使用 `afterToolCall` [E: packages/agent/src/types.ts:61] [E: packages/agent/src/types.ts:84] [I]。
- `afterToolCall` 能改写执行结果, 但类型层没有给它重新执行工具、重跑 schema validation 或改变 tool name 的能力 [E: packages/agent/src/types.ts:84] [E: packages/agent/src/types.ts:85] [E: packages/agent/src/types.ts:86] [E: packages/agent/src/types.ts:87] [E: packages/agent/src/types.ts:94] [E: packages/agent/src/types.ts:110] [I]。
- `transformContext` 影响 provider request 前的 message list, 但不直接写回 `AgentContext.messages`;是否持久化取决于 agent loop 实现, 需要读 `spine.agent-loop` 核对 [I]。
- `prepareNextTurn` 只影响**下一轮** provider request 的 context/model/thinking state;终局 turn 不会再调用它, 因此不能用它做 end-of-run 清理 [E: packages/agent/src/types.ts:138] [E: packages/agent/src/types.ts:140] [E: packages/agent/src/types.ts:142] [E: packages/agent/src/types.ts:144] [E: packages/agent/CHANGELOG.md:18] [I]。

## 跨包边界

`subsys.agent-core.tool-invocation` 应覆盖工具 lookup、`prepareArguments`、schema validation、parallel/sequential 执行、partial update 和 tool result message 生成;本节点只覆盖 `beforeToolCall` 与 `afterToolCall` 的类型契约和边界 [E: packages/agent/src/types.ts:278] [E: packages/agent/src/types.ts:293] [I]。

`subsys.agent-core.turn-control` 应覆盖 loop 是否继续、队列 drain、`prepareNextTurn` 与 `shouldStopAfterTurn` 的实际组合顺序;本节点只覆盖 turn 完成后 hook 的输入输出 shape 与 0.84.4 时序合同 [E: packages/agent/src/types.ts:126] [E: packages/agent/src/types.ts:147] [E: packages/agent/src/types.ts:223] [E: packages/agent/src/types.ts:230] [I]。

`subsys.coding-agent.agent-session` 覆盖产品层如何把 `_compactBeforeNextAssistantResponse` 接到 `prepareNextTurnWithContext` [I]。

`spine.agent-loop` 是运行时调用点的端到端视角: 它可以证明这些 hook 在具体 loop 中的行号和事件相对顺序 [I]。

## Sources

- packages/agent/src/types.ts
- packages/agent/src/agent.ts
- packages/agent/CHANGELOG.md

## 相关

- subsys.agent-core.tool-invocation: 工具调用准备、执行、finalize 与 tool result message 生成。
- subsys.agent-core.turn-control: turn 结束后的续跑、停止和队列控制。
- subsys.coding-agent.agent-session: 产品层 next-turn compaction 装配。
