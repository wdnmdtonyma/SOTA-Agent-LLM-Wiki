---
id: subsys.agent-core.tool-invocation
title: 工具调用与分派
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/types.ts
symbols:
  - executeToolCalls
  - executeToolCallsSequential
  - executeToolCallsParallel
  - prepareToolCall
  - runToolCall
related:
  - spine.tool-call-anatomy
  - subsys.agent-core.hooks
  - ref.agent.tool-execution-modes
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.agent-core.tool-invocation` 描述 `pi-agent-core` 如何把 assistant message 里的 `toolCall` blocks 准备、校验、执行成 `toolResult` messages,并在 sequential/parallel 两种调度模式之间划清事件和结果顺序边界。本节点只覆盖 loop 层,不覆盖已删除的 harness 工具集。

## 能回答的问题

- `executeToolCallsSequential` 和 `executeToolCallsParallel` 分别保证什么顺序?
- `prepareToolCall` 在执行工具前做哪些 lookup、prepare、validate 和 hook 检查?
- missing tool、schema validation error、`beforeToolCall` block 和 abort 怎样变成 tool result?
- `AgentTool.execute()` 的 `onUpdate` 怎样变成 `tool_execution_update` event?
- `afterToolCall` 可以覆盖 tool result 的哪些字段,它在 `tool_execution_end` 前还是后运行?
- `toolResult` message 的字段从哪里来,`structuredContent` 会不会发给模型?
- `runToolCall` 与 loop 内的 scheduler 有何差别?
- early termination 的批次条件是什么?

## 职责边界

`executeToolCalls` 是 assistant message 到 tool-result 批次的入口:它从 `assistantMessage.content` 过滤 `type === "toolCall"` 的 blocks,再按全局 `config.toolExecution` 或任一目标 `AgentTool.executionMode === "sequential"` 决定整批走 sequential 或 parallel。[E: packages/agent/src/agent-loop.ts:508] [E: packages/agent/src/agent-loop.ts:515] [E: packages/agent/src/agent-loop.ts:516] [E: packages/agent/src/agent-loop.ts:519] [E: packages/agent/src/agent-loop.ts:522]

本子系统只覆盖 agent-core 的运行时调用边界:可用工具来自 `AgentContext.tools`,每个工具符合 `AgentTool` contract。[E: packages/agent/src/types.ts:500] [E: packages/agent/src/types.ts:504] [E: packages/agent/src/types.ts:464] [E: packages/agent/src/types.ts:496] 产品层如何注册内置工具、扩展工具、prompt snippet 或 renderer 不由本节点的两个 source 文件展开。[I]

## 关键文件

- `packages/agent/src/agent-loop.ts`: 定义 `executeToolCalls`、`executeToolCallsSequential`、`executeToolCallsParallel`、`prepareToolCall`、`executePreparedToolCall`、`finalizeExecutedToolCall`、`runToolCall`、`createToolResultMessage` 和 tool execution events 的 emit 点。[E: packages/agent/src/agent-loop.ts:508] [E: packages/agent/src/agent-loop.ts:530] [E: packages/agent/src/agent-loop.ts:586] [E: packages/agent/src/agent-loop.ts:707] [E: packages/agent/src/agent-loop.ts:810] [E: packages/agent/src/agent-loop.ts:820] [E: packages/agent/src/agent-loop.ts:853] [E: packages/agent/src/agent-loop.ts:922]
- `packages/agent/src/types.ts`: 定义 `AgentLoopConfig.toolExecution`、`beforeToolCall`、`afterToolCall`、`AgentToolResult`、`AgentTool`、`AgentContext` 和 tool execution event variants。[E: packages/agent/src/types.ts:317] [E: packages/agent/src/types.ts:326] [E: packages/agent/src/types.ts:341] [E: packages/agent/src/types.ts:424] [E: packages/agent/src/types.ts:464] [E: packages/agent/src/types.ts:500] [E: packages/agent/src/types.ts:527]

## 数据模型

`AgentTool` 扩展 provider-facing `Tool` shape,并加上 UI `label`、可选 `prepareArguments`、`execute(toolCallId, params, signal, onUpdate)`、可选 `outputSchema` / `replay`,以及可选 per-tool `executionMode`。[E: packages/agent/src/types.ts:464] [E: packages/agent/src/types.ts:466] [E: packages/agent/src/types.ts:471] [E: packages/agent/src/types.ts:481] [E: packages/agent/src/types.ts:496]

`AgentToolResult<T>` 是 final 与 partial result 共用的 envelope: text/image `content`、structured `details`、可选 `structuredContent`、可选 tool-local `usage`、可选 `isError`,以及可选 `terminate` hint。batch 级 early-stop 要求每个 finalized result 都 opt-in。[E: packages/agent/src/types.ts:424] [E: packages/agent/src/types.ts:426] [E: packages/agent/src/types.ts:428] [E: packages/agent/src/types.ts:433] [E: packages/agent/src/types.ts:440] [E: packages/agent/src/types.ts:445] [E: packages/agent/src/agent-loop.ts:689] [E: packages/agent/src/agent-loop.ts:690] `structuredContent` 给 programmatic caller / UI,不发给模型;`content` 才是 model-facing result。[E: packages/agent/src/types.ts:433]

`PreparedToolCall` 是 `agent-loop.ts` 内部类型,携带原始 `toolCall`、resolved `AgentTool` 和 validated `args`; `ImmediateToolCallOutcome` 携带不应执行的 immediate result 与 `isError`。[E: packages/agent/src/agent-loop.ts:662] [E: packages/agent/src/agent-loop.ts:664] [E: packages/agent/src/agent-loop.ts:665] [E: packages/agent/src/agent-loop.ts:666] [E: packages/agent/src/agent-loop.ts:669] [E: packages/agent/src/agent-loop.ts:671] [E: packages/agent/src/agent-loop.ts:672]

## 控制流

1. `executeToolCalls@packages/agent/src/agent-loop.ts:508` 过滤 assistant content 中的 tool calls,按 `currentContext.tools` lookup 检测是否有 `executionMode === "sequential"` 的目标,再把整批交给 sequential 或 parallel scheduler。[E: packages/agent/src/agent-loop.ts:515] [E: packages/agent/src/agent-loop.ts:516] [E: packages/agent/src/agent-loop.ts:519] [E: packages/agent/src/agent-loop.ts:520] [E: packages/agent/src/agent-loop.ts:522]
2. `executeToolCallsSequential@packages/agent/src/agent-loop.ts:530` 按 assistant source order 迭代:先发 `tool_execution_start`,再 prepare;prepare 成功则 execute + finalize,然后发 `tool_execution_end` 和对应 tool-result message,再进入下一个 call。[E: packages/agent/src/agent-loop.ts:541] [E: packages/agent/src/agent-loop.ts:542] [E: packages/agent/src/agent-loop.ts:549] [E: packages/agent/src/agent-loop.ts:551] [E: packages/agent/src/agent-loop.ts:558] [E: packages/agent/src/agent-loop.ts:559] [E: packages/agent/src/agent-loop.ts:569] [E: packages/agent/src/agent-loop.ts:570] [E: packages/agent/src/agent-loop.ts:571]
3. Sequential mode 在已经 emit 并存储当前 call 的 finalized result 之后,若 abort 则 `break`;返回 batch 含累积 `messages` 和 `terminate: shouldTerminateToolBatch(finalizedCalls)`。[E: packages/agent/src/agent-loop.ts:575] [E: packages/agent/src/agent-loop.ts:576] [E: packages/agent/src/agent-loop.ts:580] [E: packages/agent/src/agent-loop.ts:582]
4. `executeToolCallsParallel@packages/agent/src/agent-loop.ts:586` 仍然按 source order 逐个发 `tool_execution_start` 并 `prepareToolCall`;immediate failure 立刻 finalize 并发 end,prepared calls 存成 async thunk。[E: packages/agent/src/agent-loop.ts:596] [E: packages/agent/src/agent-loop.ts:597] [E: packages/agent/src/agent-loop.ts:604] [E: packages/agent/src/agent-loop.ts:605] [E: packages/agent/src/agent-loop.ts:611] [E: packages/agent/src/agent-loop.ts:619]
5. Parallel mode 用 `Promise.all` 执行 prepared thunks,因此真实执行的 `tool_execution_end` 按完成顺序发出;全部 resolve 之后,再按 `orderedFinalizedCalls` 数组顺序创建并发出 `ToolResultMessage` artifacts。[E: packages/agent/src/agent-loop.ts:646] [E: packages/agent/src/agent-loop.ts:650] [E: packages/agent/src/agent-loop.ts:651] [E: packages/agent/src/agent-loop.ts:652]
6. `prepareToolCall@packages/agent/src/agent-loop.ts:707` 按 name lookup 工具;找不到时返回 immediate error result,而不是 throw。[E: packages/agent/src/agent-loop.ts:715] [E: packages/agent/src/agent-loop.ts:716] [E: packages/agent/src/agent-loop.ts:719]
7. prepare 边界依次跑 `prepareToolCallArguments`、`validateToolArguments`、可选 `config.beforeToolCall`;可选 `prepareArguments` 可以在 validation 前改写 raw model arguments。[E: packages/agent/src/agent-loop.ts:725] [E: packages/agent/src/agent-loop.ts:726] [E: packages/agent/src/agent-loop.ts:727] [E: packages/agent/src/types.ts:471]
8. `beforeToolCall` 收到 assistant message、原始 tool call、validated args、current context 和 abort signal;abort 或 `{ block: true }` 变成 immediate error result,由 scheduler 走非执行的 immediate 分支。blocked result 若带 `terminate === true`,会写到 error result 上参与 batch 规则。[E: packages/agent/src/agent-loop.ts:728] [E: packages/agent/src/agent-loop.ts:737] [E: packages/agent/src/agent-loop.ts:744] [E: packages/agent/src/agent-loop.ts:746] [E: packages/agent/src/agent-loop.ts:747] [E: packages/agent/src/types.ts:66] [E: packages/agent/src/types.ts:326]
9. Validation 或 hook 异常被 `prepareToolCall` catch,转成 immediate error tool result,因此 scheduler 用与 missing/blocked tool 相同的 finalized-result 路径处理它们。[E: packages/agent/src/agent-loop.ts:769] [E: packages/agent/src/agent-loop.ts:770] [E: packages/agent/src/agent-loop.ts:772]
10. `executePreparedToolCall@packages/agent/src/agent-loop.ts:820` 调用 `prepared.tool.execute(prepared.toolCall.id, prepared.args, signal, onUpdate)`,把仍在 accept 窗口内的 `onUpdate` 变成 `tool_execution_update` events,等待 queued update promise,并把 thrown error 转成 error-shaped `AgentToolResult`。[E: packages/agent/src/agent-loop.ts:829] [E: packages/agent/src/agent-loop.ts:832] [E: packages/agent/src/agent-loop.ts:833] [E: packages/agent/src/agent-loop.ts:835] [E: packages/agent/src/agent-loop.ts:839] [E: packages/agent/src/agent-loop.ts:841] [E: packages/agent/src/agent-loop.ts:845]
11. `finalizeExecutedToolCall@packages/agent/src/agent-loop.ts:853` 在 `AgentTool.execute()` 之后、`tool_execution_end` 之前跑 `afterToolCall`。hook 可替换 `content`、`details`、`usage`、`terminate`、`isError` 和 `structuredContent`;未提供的字段保留原值。若提供了 `content` 却没带 `structuredContent`,runtime 会丢掉旧 `structuredContent`。[E: packages/agent/src/agent-loop.ts:864] [E: packages/agent/src/agent-loop.ts:877] [E: packages/agent/src/agent-loop.ts:879] [E: packages/agent/src/agent-loop.ts:881] [E: packages/agent/src/agent-loop.ts:883] [E: packages/agent/src/agent-loop.ts:884] [E: packages/agent/src/agent-loop.ts:885] [E: packages/agent/src/agent-loop.ts:886] [E: packages/agent/src/agent-loop.ts:888] [E: packages/agent/src/agent-loop.ts:890] [E: packages/agent/src/types.ts:92] [E: packages/agent/src/types.ts:95]
12. `emitToolExecutionEnd@packages/agent/src/agent-loop.ts:912` 发出 finalized `result` 和 `isError`。`createToolResultMessage@packages/agent/src/agent-loop.ts:922` 再构造 provider-visible `role: "toolResult"` message: `toolCallId`、`toolName`、`content`(`?? []`)、`details`、`usage`、`isError`、`timestamp`。它**不**复制 `structuredContent`。[E: packages/agent/src/agent-loop.ts:914] [E: packages/agent/src/agent-loop.ts:917] [E: packages/agent/src/agent-loop.ts:918] [E: packages/agent/src/agent-loop.ts:922] [E: packages/agent/src/agent-loop.ts:924] [E: packages/agent/src/agent-loop.ts:925] [E: packages/agent/src/agent-loop.ts:926] [E: packages/agent/src/agent-loop.ts:929] [E: packages/agent/src/agent-loop.ts:930] [E: packages/agent/src/agent-loop.ts:931] [E: packages/agent/src/agent-loop.ts:932] [E: packages/agent/src/agent-loop.ts:933]
13. assistant message 若以 `stopReason: "length"` 结束,loop 不执行其中任何 tool call;它把整批视为可能含截断 arguments 并生成失败结果,只有非 length 才进入普通 sequential/parallel scheduler。[E: packages/agent/src/agent-loop.ts:262] [E: packages/agent/src/agent-loop.ts:267] [E: packages/agent/src/agent-loop.ts:268] [E: packages/agent/src/agent-loop.ts:269] [E: packages/agent/src/agent-loop.ts:270]
14. 导出的 `runToolCall@packages/agent/src/agent-loop.ts:810` 走同一套 prepare / validate / `beforeToolCall` / execute / `afterToolCall`,但**不**发 events、**不**追加 messages。供工具内部再调其它工具时复用 hook(例如 permission check)。工具失败一律以 `isError: true` 返回,不 reject。[E: packages/agent/src/agent-loop.ts:810] [E: packages/agent/src/agent-loop.ts:812] [E: packages/agent/src/agent-loop.ts:813] [E: packages/agent/src/agent-loop.ts:814] [E: packages/agent/src/agent-loop.ts:816] [E: packages/agent/src/agent-loop.ts:817]

## 设计动机与权衡

调度规则偏保守:一个 sequential 目标会把整个 assistant batch 升级为 sequential,避免声明 `executionMode: "sequential"` 的工具与同批 parallel peers 交错执行。[E: packages/agent/src/agent-loop.ts:516] [E: packages/agent/src/agent-loop.ts:519] [E: packages/agent/src/types.ts:47] [E: packages/agent/src/types.ts:496]

多数局部失败路径都表示成 `AgentToolResult` envelope,而不是逃出 scheduler: missing tools、validation failures、block decisions、aborts、execute throws、以及 `afterToolCall` throws 仍能变成 `toolResult` messages。[E: packages/agent/src/agent-loop.ts:716] [E: packages/agent/src/agent-loop.ts:744] [E: packages/agent/src/agent-loop.ts:770] [E: packages/agent/src/agent-loop.ts:845] [E: packages/agent/src/agent-loop.ts:892] [E: packages/agent/src/agent-loop.ts:922]

Partial updates 留在 `executePreparedToolCall` 的 event path:`onUpdate` 发 `tool_execution_update`,最终给模型看的 message 稍后由 finalized `AgentToolResult.content` 构建。[E: packages/agent/src/agent-loop.ts:833] [E: packages/agent/src/agent-loop.ts:778] [E: packages/agent/src/agent-loop.ts:922] [E: packages/agent/src/agent-loop.ts:929]

## Gotcha

Parallel mode 并不并行化 preparation:lookup、`prepareArguments`、schema validation 和 `beforeToolCall` 都在 concurrent execute 之前按 source order 串行跑完。[E: packages/agent/src/agent-loop.ts:596] [E: packages/agent/src/agent-loop.ts:604] [E: packages/agent/src/agent-loop.ts:619]

`prepareToolCall` 在 prepared outcome 里返回的仍是原始 `toolCall` 对象,即使 `prepareArguments` 已经改写过一份 arguments;`AgentTool.execute()` 拿到的是 validated `args`,而 start/update event 的 `args` 仍基于 scheduler 使用的原始 tool call 对象。[E: packages/agent/src/agent-loop.ts:693] [E: packages/agent/src/agent-loop.ts:763] [E: packages/agent/src/agent-loop.ts:767] [E: packages/agent/src/agent-loop.ts:778]

`terminate` 是 batch-level all-of 条件,不是 per-tool 立即停:`shouldTerminateToolBatch` 只在 finalized 列表非空且每个 result 都有 `terminate === true` 时返回 true。[E: packages/agent/src/agent-loop.ts:689] [E: packages/agent/src/agent-loop.ts:690]

`createToolResultMessage` 不复制 `structuredContent`。该字段只出现在 `AgentToolResult` / `tool_execution_end.result` 上,不会进入 provider-visible `ToolResultMessage`。[E: packages/agent/src/agent-loop.ts:922] [E: packages/agent/src/agent-loop.ts:929] [E: packages/agent/src/types.ts:433]

## 跨包边界

[spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) 是把本子系统接到 coding-agent 工具注册的横切流:本节点拥有 `AgentTool` invocation 语义,把产品侧映射进 `AgentContext.tools` 视为相关节点边界。[E: packages/agent/src/types.ts:500] [E: packages/agent/src/types.ts:504] [I]

[subsys.agent-core.hooks](hooks.md) 应拥有更广的 hook catalog;[I] tool invocation 拥有 `beforeToolCall` 在 validation 之后、`afterToolCall` 在 `tool_execution_end` 之前的本地放置。[E: packages/agent/src/agent-loop.ts:726] [E: packages/agent/src/agent-loop.ts:727] [E: packages/agent/src/agent-loop.ts:864] [E: packages/agent/src/agent-loop.ts:912]

[ref.agent.tool-execution-modes](../../reference/tool-execution-modes.md) 应枚举 `ToolExecutionMode` 值;[I] 本节点拥有这些值如何影响具体 assistant tool-call batch。[E: packages/agent/src/types.ts:47] [E: packages/agent/src/types.ts:317] [E: packages/agent/src/agent-loop.ts:519]

## Sources

- packages/agent/src/agent-loop.ts
- packages/agent/src/types.ts

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md): 从 assistant toolCall block 到 toolResult message 的端到端解剖。
- [subsys.agent-core.hooks](hooks.md): `beforeToolCall` / `afterToolCall` 的类型合同。
- [ref.agent.tool-execution-modes](../../reference/tool-execution-modes.md): `"sequential"` / `"parallel"` 值域与默认绑定。
