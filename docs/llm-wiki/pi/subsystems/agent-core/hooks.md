---
id: subsys.agent-core.hooks
title: 代理钩子(beforeToolCall/afterToolCall/prepareNextTurn)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/types.ts
symbols:
  - beforeToolCall
  - afterToolCall
  - prepareNextTurn
  - transformContext
related:
  - subsys.agent-core.tool-invocation
  - subsys.agent-core.turn-control
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.agent-core.hooks` 是 `pi-agent-core` 暴露给上层 runtime 的 hook contract: 它允许调用方在 provider request 前改写 `AgentMessage[]`, 在工具执行前阻断调用, 在工具执行后覆盖结果, 并在一个 turn 结束后替换下一轮 runtime state。

## 能回答的问题

- `transformContext`、`beforeToolCall`、`afterToolCall`、`prepareNextTurn` 分别接收什么输入?
- 哪些 hook 可以改变 tool result, 哪些 hook 只能影响下一轮 provider request?
- `beforeToolCall` 的 block 语义是什么, 被 block 的工具会不会继续执行?
- `afterToolCall` 覆盖 `content`、`details`、`isError`、`terminate` 时是深合并还是整体替换?
- `prepareNextTurn` 能替换 context、model、thinking level 中的哪些字段?
- 这些 hook 的边界在哪里, 哪些行为需要去读 agent loop 或 coding-agent 装配节点?

## 职责边界

本节点覆盖 `packages/agent/src/types.ts` 中的 hook 类型、hook 输入/输出 shape 和注释声明的调用时机。真实 runtime 的分支、事件发射顺序、parallel/sequential 调度和错误 result 生成由 `spine.agent-loop` 与 `spine.tool-call-anatomy` 深挖;因为本节点 `source` 只包含 `packages/agent/src/types.ts`, 所以除 `types.ts` 已声明的时机外, 不把 agent-loop 行号作为本节点证据 [I]。

`AgentLoopConfig` 是这些 hook 的集中入口: `transformContext`、`prepareNextTurn`、`beforeToolCall`、`afterToolCall` 都是 optional config fields, 调用方可以只实现其中一部分 [E: packages/agent/src/types.ts:140] [E: packages/agent/src/types.ts:191] [E: packages/agent/src/types.ts:220] [E: packages/agent/src/types.ts:267] [E: packages/agent/src/types.ts:281]。

## Hook 目录

| Hook | 类型位置 | 输入 | 返回 | 类型层调用时机 |
| --- | --- | --- | --- | --- |
| `transformContext` | `AgentLoopConfig.transformContext` | `AgentMessage[]`, optional `AbortSignal` | `Promise<AgentMessage[]>` | `types.ts` 注释声明在 `convertToLlm` 前应用于 agent-level messages;签名只证明 hook shape [E: packages/agent/src/types.ts:191] [I] |
| `beforeToolCall` | `AgentLoopConfig.beforeToolCall` | `BeforeToolCallContext`, optional `AbortSignal` | `Promise<BeforeToolCallResult | undefined>` | `types.ts` 注释声明在工具执行前、参数验证后调用;签名只证明 hook shape [E: packages/agent/src/types.ts:267] [I] |
| `afterToolCall` | `AgentLoopConfig.afterToolCall` | `AfterToolCallContext`, optional `AbortSignal` | `Promise<AfterToolCallResult | undefined>` | `types.ts` 注释声明在工具完成后、`tool_execution_end` 和 tool-result message events 发出前调用;签名只证明 hook shape [E: packages/agent/src/types.ts:281] [I] |
| `prepareNextTurn` | `AgentLoopConfig.prepareNextTurn` | `PrepareNextTurnContext` | `AgentLoopTurnUpdate | undefined | Promise<...>` | `types.ts` 注释声明在 `turn_end` 后、loop 决定是否再发起 provider request 前调用;签名只证明 hook shape [E: packages/agent/src/types.ts:220] [E: packages/agent/src/types.ts:222] [I] |

## transformContext

`transformContext` 的类型签名工作在 `AgentMessage[]` 层,返回值仍是 `AgentMessage[]`;context window management、裁剪旧消息、注入外部上下文和发生在 `convertToLlm` 前属于 `types.ts` 注释声明的 hook 语义 [E: packages/agent/src/types.ts:191] [I]。

`transformContext` 的注释 contract 是不能 throw 或 reject;失败时应返回原始 messages 或其他 safe fallback。`types.ts` 只为 `transformContext` 声明这个 hook-local fallback contract, 不单独定义失败时的 runtime event sequence [I]。

边界: `transformContext` 不负责把消息转换成 provider wire message, 这个职责属于必填的 `convertToLlm(messages)`;`convertToLlm` 的输出是 `Message[] | Promise<Message[]>`, 而 `transformContext` 的输出仍是 `AgentMessage[]` [E: packages/agent/src/types.ts:169] [E: packages/agent/src/types.ts:191]。

## beforeToolCall

`beforeToolCall` 的输入是 `BeforeToolCallContext`: 包含发起工具调用的 `assistantMessage`, 原始 `toolCall` block, 已验证的 `args`, 以及准备该工具调用时的 `AgentContext` [E: packages/agent/src/types.ts:89] [E: packages/agent/src/types.ts:91] [E: packages/agent/src/types.ts:93] [E: packages/agent/src/types.ts:95] [E: packages/agent/src/types.ts:97]。

`BeforeToolCallResult` 只有两个字段: `block?: boolean` 与 `reason?: string`。返回 `{ block: true }` 会阻止工具执行、loop 改为发出 error tool result、`reason` 展示为 error result 文本等语义来自 `types.ts` 注释 contract [E: packages/agent/src/types.ts:60] [E: packages/agent/src/types.ts:61] [E: packages/agent/src/types.ts:62] [I]。

`beforeToolCall` 接收 agent abort signal, 但类型注释把 honoring signal 的责任交给 hook 实现者;`types.ts` 只声明签名和责任, 不定义取消策略的具体行为 [E: packages/agent/src/types.ts:267] [I]。

## afterToolCall

`afterToolCall` 的输入是 `AfterToolCallContext`: 它包含同一条 `assistantMessage`、原始 `toolCall`、已验证 `args`、尚未应用 hook override 的 `result`、当前 `isError` 标志和 finalize 时的 `AgentContext` [E: packages/agent/src/types.ts:101] [E: packages/agent/src/types.ts:103] [E: packages/agent/src/types.ts:105] [E: packages/agent/src/types.ts:107] [E: packages/agent/src/types.ts:109] [E: packages/agent/src/types.ts:111] [E: packages/agent/src/types.ts:113]。

`AfterToolCallResult` 是 partial override: `content`、`details`、`isError`、`terminate` 都是 optional fields;完整替换和未提供字段保留原始执行结果等 merge 语义来自 `types.ts` 注释 contract [E: packages/agent/src/types.ts:77] [E: packages/agent/src/types.ts:78] [E: packages/agent/src/types.ts:79] [E: packages/agent/src/types.ts:80] [E: packages/agent/src/types.ts:85] [I]。

`AfterToolCallResult` 对 `content` 和 `details` 没有 deep merge;返回这些字段时是整体替换, 不是对数组或结构化 details 做局部 patch。代码行只证明这两个 optional override fields 的存在, merge policy 来自注释 contract [E: packages/agent/src/types.ts:78] [E: packages/agent/src/types.ts:79] [I]。

`terminate` 是一个 tool-batch 级 early-termination hint, 类型注释说明只有当前 batch 中每个 finalized tool result 都设置为 true 时才会 early terminate;代码行只证明 `terminate?: boolean` 字段存在 [E: packages/agent/src/types.ts:85]。具体 batch 聚合算法不在 `types.ts` 中, 本节点只记录类型层 contract [I]。

## prepareNextTurn

`prepareNextTurn` 的输入 `PrepareNextTurnContext` 继承 `ShouldStopAfterTurnContext`, 因此它能看到刚完成 turn 的 assistant `message`、上一 `turn_end` 携带的 `toolResults`、追加了 assistant/tool result 后的 `context`, 以及当前 loop invocation 若退出会返回的 `newMessages` [E: packages/agent/src/types.ts:117] [E: packages/agent/src/types.ts:119] [E: packages/agent/src/types.ts:121] [E: packages/agent/src/types.ts:123] [E: packages/agent/src/types.ts:125] [E: packages/agent/src/types.ts:138]。

`prepareNextTurn` 返回 `AgentLoopTurnUpdate | undefined`;非空 update 可以替换下一次 provider request 使用的 `context`、`model` 和 `thinkingLevel`, `undefined` 保持当前 context/config 的语义来自注释 contract [E: packages/agent/src/types.ts:129] [E: packages/agent/src/types.ts:131] [E: packages/agent/src/types.ts:133] [E: packages/agent/src/types.ts:135] [E: packages/agent/src/types.ts:220] [E: packages/agent/src/types.ts:222] [I]。

`prepareNextTurn` 与 `shouldStopAfterTurn` 都位于 turn 完成后的控制平面, 但职责不同: `prepareNextTurn` 产生下一轮 runtime state replacement, `shouldStopAfterTurn` 返回 boolean 请求 graceful stop [E: packages/agent/src/types.ts:213] [E: packages/agent/src/types.ts:220] [E: packages/agent/src/types.ts:222] [I]。

## 边界与 gotcha

- 这些 hook 是 `agent` 包的 reusable runtime contract, 不是 `coding-agent` extension API 本身。产品层可以把 extension events 接到这些 hook, 但这个装配链不在 `packages/agent/src/types.ts` 中 [I]。
- `beforeToolCall` 能 block, 但它不能返回替换后的 tool result content/details;要改写结果必须使用 `afterToolCall` [E: packages/agent/src/types.ts:60] [E: packages/agent/src/types.ts:77] [I]。
- `afterToolCall` 能改写执行结果, 但类型层没有给它重新执行工具、重跑 schema validation 或改变 tool name 的能力 [E: packages/agent/src/types.ts:77] [E: packages/agent/src/types.ts:78] [E: packages/agent/src/types.ts:79] [E: packages/agent/src/types.ts:80] [E: packages/agent/src/types.ts:85] [E: packages/agent/src/types.ts:101] [I]。
- `transformContext` 影响 provider request 前的 message list, 但不直接写回 `AgentContext.messages`;是否持久化取决于 agent loop 实现, 需要读 `spine.agent-loop` 核对 [I]。
- `prepareNextTurn` 只影响下一次 provider request 的 context/model/thinking state;它不是 tool-result override hook, 也不是 message conversion hook [E: packages/agent/src/types.ts:129] [E: packages/agent/src/types.ts:131] [E: packages/agent/src/types.ts:133] [E: packages/agent/src/types.ts:135] [I]。

## 跨包边界

`subsys.agent-core.tool-invocation` 应覆盖工具 lookup、`prepareArguments`、schema validation、parallel/sequential 执行、partial update 和 tool result message 生成;本节点只覆盖 `beforeToolCall` 与 `afterToolCall` 的类型契约和边界 [E: packages/agent/src/types.ts:267] [E: packages/agent/src/types.ts:281] [I]。

`subsys.agent-core.turn-control` 应覆盖 loop 是否继续、队列 drain、`prepareNextTurn` 与 `shouldStopAfterTurn` 的实际组合顺序;本节点只覆盖 turn 完成后 hook 的输入输出 shape [E: packages/agent/src/types.ts:117] [E: packages/agent/src/types.ts:138] [E: packages/agent/src/types.ts:220] [I]。

`spine.agent-loop` 是运行时调用点的端到端视角: 它可以证明这些 hook 在具体 loop 中的行号和事件相对顺序。本节点刻意不把 `packages/agent/src/agent-loop.ts` 加入 `source`, 以保持 `types.ts` reference/subsystem hybrid 的范围 [I]。

## Sources

- packages/agent/src/types.ts

## 相关

- subsys.agent-core.tool-invocation: 工具调用准备、执行、finalize 与 tool result message 生成。
- subsys.agent-core.turn-control: turn 结束后的续跑、停止和队列控制。
