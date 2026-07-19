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
  - executeToolCallsSequential
  - executeToolCallsParallel
  - prepareToolCall
related:
  - spine.tool-call-anatomy
  - subsys.agent-core.hooks
  - ref.agent.tool-execution-modes
evidence: explicit
status: verified
updated: 3da591ab
---

> `subsys.agent-core.tool-invocation` 描述 `pi-agent-core` 如何把 assistant message 里的 `toolCall` blocks 准备、校验、执行成 `toolResult` messages,并在 sequential/parallel 两种调度模式之间划清事件和结果顺序边界。

## 能回答的问题

- `executeToolCallsSequential` 和 `executeToolCallsParallel` 分别保证什么顺序?
- `prepareToolCall` 在执行工具前做哪些 lookup、prepare、validate 和 hook 检查?
- missing tool、schema validation error、`beforeToolCall` block 和 abort 怎样变成 tool result?
- `AgentTool.execute()` 的 `onUpdate` 怎样变成 `tool_execution_update` event?
- `afterToolCall` 可以覆盖 tool result 的哪些字段,它在 `tool_execution_end` 前还是后运行?
- `toolResult` message 的字段从哪里来,early termination 的批次条件是什么?

## 职责边界

`executeToolCalls` 是 assistant message 到 tool-result 批次的入口:它从 `assistantMessage.content` 过滤 `type === "toolCall"` 的 blocks,再按全局 `config.toolExecution` 或任一目标 `AgentTool.executionMode === "sequential"` 决定整批走 sequential 或 parallel [E: packages/agent/src/agent-loop.ts:413] [E: packages/agent/src/agent-loop.ts:420] [E: packages/agent/src/agent-loop.ts:421] [E: packages/agent/src/agent-loop.ts:422] [E: packages/agent/src/agent-loop.ts:424]。

本子系统只覆盖 agent-core 的运行时调用边界:可用工具来自 `AgentContext.tools`,每个工具符合 `AgentTool` contract [E: packages/agent/src/types.ts:399] [E: packages/agent/src/types.ts:405] [E: packages/agent/src/types.ts:373] [E: packages/agent/src/types.ts:395]。[I] 产品层如何注册内置工具、扩展工具、prompt snippet 或 renderer 不由本节点的两个 source 文件展开。

## 关键文件

- `packages/agent/src/agent-loop.ts`: 定义 `executeToolCallsSequential`、`executeToolCallsParallel`、`prepareToolCall`、`executePreparedToolCall`、`finalizeExecutedToolCall`、`createToolResultMessage` 和 tool execution events 的 emit 点 [E: packages/agent/src/agent-loop.ts:435] [E: packages/agent/src/agent-loop.ts:491] [E: packages/agent/src/agent-loop.ts:602] [E: packages/agent/src/agent-loop.ts:668] [E: packages/agent/src/agent-loop.ts:711] [E: packages/agent/src/agent-loop.ts:774]。
- `packages/agent/src/types.ts`: 定义 `AgentLoopConfig.toolExecution`、`beforeToolCall`、`afterToolCall`、`AgentToolResult`、`AgentTool`、`AgentContext` 和 tool execution event variants [E: packages/agent/src/types.ts:259] [E: packages/agent/src/types.ts:267] [E: packages/agent/src/types.ts:281] [E: packages/agent/src/types.ts:350] [E: packages/agent/src/types.ts:373] [E: packages/agent/src/types.ts:399] [E: packages/agent/src/types.ts:428]。

## 数据模型

`AgentTool` extends the provider-facing `Tool` shape and adds a UI label, optional `prepareArguments`, `execute(toolCallId, params, signal, onUpdate)`, and optional per-tool `executionMode` [E: packages/agent/src/types.ts:373] [E: packages/agent/src/types.ts:375] [E: packages/agent/src/types.ts:380] [E: packages/agent/src/types.ts:382] [E: packages/agent/src/types.ts:395]。

`AgentToolResult<T>` is the envelope shared by final and partial results: it contains text/image `content`, structured `details`, optional `addedToolNames` for tools introduced at this transcript point, and an optional `terminate` hint whose batch semantics require every finalized result to opt in [E: packages/agent/src/types.ts:350] [E: packages/agent/src/types.ts:352] [E: packages/agent/src/types.ts:354] [E: packages/agent/src/types.ts:356] [E: packages/agent/src/types.ts:361] [E: packages/agent/src/agent-loop.ts:584] [E: packages/agent/src/agent-loop.ts:585]。

`PreparedToolCall` is internal to `agent-loop.ts` and carries the original `toolCall`, resolved `AgentTool`, and validated `args`; `ImmediateToolCallOutcome` carries an immediate result plus an `isError` flag for calls that should not execute [E: packages/agent/src/agent-loop.ts:558] [E: packages/agent/src/agent-loop.ts:560] [E: packages/agent/src/agent-loop.ts:561] [E: packages/agent/src/agent-loop.ts:562] [E: packages/agent/src/agent-loop.ts:565] [E: packages/agent/src/agent-loop.ts:567] [E: packages/agent/src/agent-loop.ts:568]。

## 控制流

1. `executeToolCalls@packages/agent/src/agent-loop.ts:373` filters assistant content to tool calls, detects any requested sequential tool by looking up `currentContext.tools`, and dispatches the entire batch to `executeToolCallsSequential` or `executeToolCallsParallel` [E: packages/agent/src/agent-loop.ts:420] [E: packages/agent/src/agent-loop.ts:421] [E: packages/agent/src/agent-loop.ts:422] [E: packages/agent/src/agent-loop.ts:424] [E: packages/agent/src/agent-loop.ts:425] [E: packages/agent/src/agent-loop.ts:427]。
2. `executeToolCallsSequential@packages/agent/src/agent-loop.ts:395` iterates tool calls in assistant source order, emits `tool_execution_start`, prepares one call, executes and finalizes it when preparation succeeds, then emits `tool_execution_end` and the corresponding tool-result message before moving to the next call [E: packages/agent/src/agent-loop.ts:446] [E: packages/agent/src/agent-loop.ts:447] [E: packages/agent/src/agent-loop.ts:454] [E: packages/agent/src/agent-loop.ts:456] [E: packages/agent/src/agent-loop.ts:463] [E: packages/agent/src/agent-loop.ts:464] [E: packages/agent/src/agent-loop.ts:474] [E: packages/agent/src/agent-loop.ts:475] [E: packages/agent/src/agent-loop.ts:476]。
3. Sequential mode stops early on abort after it has emitted and stored the current call's finalized result; the returned batch contains accumulated `messages` and `terminate: shouldTerminateToolBatch(finalizedCalls)` [E: packages/agent/src/agent-loop.ts:477] [E: packages/agent/src/agent-loop.ts:478] [E: packages/agent/src/agent-loop.ts:480] [E: packages/agent/src/agent-loop.ts:481] [E: packages/agent/src/agent-loop.ts:485] [E: packages/agent/src/agent-loop.ts:487]。
4. `executeToolCallsParallel@packages/agent/src/agent-loop.ts:451` still emits `tool_execution_start` and runs `prepareToolCall` one call at a time in assistant source order; immediate failures are finalized and ended immediately, while prepared calls are stored as async thunks [E: packages/agent/src/agent-loop.ts:499] [E: packages/agent/src/agent-loop.ts:501] [E: packages/agent/src/agent-loop.ts:502] [E: packages/agent/src/agent-loop.ts:509] [E: packages/agent/src/agent-loop.ts:510] [E: packages/agent/src/agent-loop.ts:516] [E: packages/agent/src/agent-loop.ts:517] [E: packages/agent/src/agent-loop.ts:524]。
5. Parallel mode executes prepared thunks through `Promise.all`, so `tool_execution_end` for real executions is emitted when each thunk finalizes; only after all entries resolve does the loop create and emit `ToolResultMessage` artifacts in the `orderedFinalizedCalls` array order [E: packages/agent/src/agent-loop.ts:525] [E: packages/agent/src/agent-loop.ts:526] [E: packages/agent/src/agent-loop.ts:534] [E: packages/agent/src/agent-loop.ts:542] [E: packages/agent/src/agent-loop.ts:546] [E: packages/agent/src/agent-loop.ts:547] [E: packages/agent/src/agent-loop.ts:548]。
6. `prepareToolCall@packages/agent/src/agent-loop.ts:562` resolves the tool by name; if no tool matches, it returns an immediate error result instead of throwing [E: packages/agent/src/agent-loop.ts:609] [E: packages/agent/src/agent-loop.ts:610] [E: packages/agent/src/agent-loop.ts:611] [E: packages/agent/src/agent-loop.ts:613] [E: packages/agent/src/agent-loop.ts:614]。
7. The prepare boundary runs `prepareToolCallArguments`, then `validateToolArguments`, then optional `config.beforeToolCall`; the optional `prepareArguments` hook can rewrite raw model arguments before validation [E: packages/agent/src/agent-loop.ts:588] [E: packages/agent/src/agent-loop.ts:592] [E: packages/agent/src/agent-loop.ts:596] [E: packages/agent/src/agent-loop.ts:598] [E: packages/agent/src/agent-loop.ts:619] [E: packages/agent/src/agent-loop.ts:620] [E: packages/agent/src/agent-loop.ts:621] [E: packages/agent/src/types.ts:380]。
8. `beforeToolCall` receives assistant message, original tool call, validated args, current context, and abort signal; abort or `{ block: true }` becomes an immediate error result, which the schedulers finalize through the non-executing immediate branch [E: packages/agent/src/agent-loop.ts:456] [E: packages/agent/src/agent-loop.ts:463] [E: packages/agent/src/agent-loop.ts:510] [E: packages/agent/src/agent-loop.ts:524] [E: packages/agent/src/agent-loop.ts:622] [E: packages/agent/src/agent-loop.ts:624] [E: packages/agent/src/agent-loop.ts:625] [E: packages/agent/src/agent-loop.ts:626] [E: packages/agent/src/agent-loop.ts:627] [E: packages/agent/src/agent-loop.ts:629] [E: packages/agent/src/agent-loop.ts:631] [E: packages/agent/src/agent-loop.ts:638] [E: packages/agent/src/types.ts:267]。
9. Validation or hook exceptions are caught inside `prepareToolCall` and converted to immediate error tool results, so the scheduler handles them through the same finalized-result path as missing or blocked tools [E: packages/agent/src/agent-loop.ts:659] [E: packages/agent/src/agent-loop.ts:660] [E: packages/agent/src/agent-loop.ts:662] [E: packages/agent/src/agent-loop.ts:663]。
10. `executePreparedToolCall@packages/agent/src/agent-loop.ts:628` calls `prepared.tool.execute(prepared.toolCall.id, prepared.args, signal, onUpdate)`, turns accepted `onUpdate` callbacks into `tool_execution_update` events, waits for queued update event promises, and converts thrown errors into error-shaped `AgentToolResult` values [E: packages/agent/src/agent-loop.ts:677] [E: packages/agent/src/agent-loop.ts:678] [E: packages/agent/src/agent-loop.ts:679] [E: packages/agent/src/agent-loop.ts:680] [E: packages/agent/src/agent-loop.ts:681] [E: packages/agent/src/agent-loop.ts:685] [E: packages/agent/src/agent-loop.ts:697] [E: packages/agent/src/agent-loop.ts:699] [E: packages/agent/src/agent-loop.ts:703]。
11. `finalizeExecutedToolCall@packages/agent/src/agent-loop.ts:671` runs `afterToolCall` after `AgentTool.execute()` and before `tool_execution_end`; the hook can replace `content`, `details`, `terminate`, and `isError`, and omitted fields keep their original values [E: packages/agent/src/agent-loop.ts:463] [E: packages/agent/src/agent-loop.ts:464] [E: packages/agent/src/agent-loop.ts:474] [E: packages/agent/src/agent-loop.ts:525] [E: packages/agent/src/agent-loop.ts:526] [E: packages/agent/src/agent-loop.ts:534] [E: packages/agent/src/agent-loop.ts:722] [E: packages/agent/src/agent-loop.ts:724] [E: packages/agent/src/agent-loop.ts:729] [E: packages/agent/src/agent-loop.ts:735] [E: packages/agent/src/agent-loop.ts:738] [E: packages/agent/src/agent-loop.ts:739] [E: packages/agent/src/agent-loop.ts:740] [E: packages/agent/src/agent-loop.ts:742] [E: packages/agent/src/types.ts:78] [E: packages/agent/src/types.ts:79] [E: packages/agent/src/types.ts:80] [E: packages/agent/src/types.ts:85]。
12. `emitToolExecutionEnd@packages/agent/src/agent-loop.ts:723` emits the finalized result and `isError`; `createToolResultMessage@packages/agent/src/agent-loop.ts:733` then builds a provider-visible `role: "toolResult"` message with `toolCallId`, `toolName`, `content`, `details`, `isError`, and `timestamp` [E: packages/agent/src/agent-loop.ts:765] [E: packages/agent/src/agent-loop.ts:766] [E: packages/agent/src/agent-loop.ts:769] [E: packages/agent/src/agent-loop.ts:770] [E: packages/agent/src/agent-loop.ts:774] [E: packages/agent/src/agent-loop.ts:776] [E: packages/agent/src/agent-loop.ts:777] [E: packages/agent/src/agent-loop.ts:778] [E: packages/agent/src/agent-loop.ts:781] [E: packages/agent/src/agent-loop.ts:782] [E: packages/agent/src/agent-loop.ts:784] [E: packages/agent/src/agent-loop.ts:785]。
13. assistant message 若以 `stopReason: "length"` 结束，loop 不执行其中任何 tool call；它把整批视为可能含截断 arguments 并生成失败结果，只有非 length 才进入普通 sequential/parallel scheduler [E: packages/agent/src/agent-loop.ts:206] [E: packages/agent/src/agent-loop.ts:211] [E: packages/agent/src/agent-loop.ts:212] [E: packages/agent/src/agent-loop.ts:213] [E: packages/agent/src/agent-loop.ts:214]。

## 设计动机与权衡

The scheduling rule is conservative: one sequential target upgrades the whole assistant batch to sequential mode, which prevents a tool that declares `executionMode: "sequential"` from interleaving with parallel peers in the same batch [E: packages/agent/src/agent-loop.ts:421] [E: packages/agent/src/agent-loop.ts:422] [E: packages/agent/src/agent-loop.ts:424] [E: packages/agent/src/types.ts:41] [E: packages/agent/src/types.ts:395]。

Most local failure paths are represented as `AgentToolResult` envelopes rather than escaping the scheduler: missing tools, validation failures, block decisions, aborts, execute throws, and `afterToolCall` throws can still become `toolResult` messages [E: packages/agent/src/agent-loop.ts:613] [E: packages/agent/src/agent-loop.ts:641] [E: packages/agent/src/agent-loop.ts:649] [E: packages/agent/src/agent-loop.ts:662] [E: packages/agent/src/agent-loop.ts:703] [E: packages/agent/src/agent-loop.ts:745] [E: packages/agent/src/agent-loop.ts:774]。

Partial updates stay on the event path in `executePreparedToolCall`: `onUpdate` emits `tool_execution_update`, and the final model-visible message is built later from the finalized `AgentToolResult` [E: packages/agent/src/agent-loop.ts:681] [E: packages/agent/src/agent-loop.ts:685] [E: packages/agent/src/agent-loop.ts:690] [E: packages/agent/src/agent-loop.ts:697] [E: packages/agent/src/agent-loop.ts:774] [E: packages/agent/src/agent-loop.ts:781]。

## Gotcha

Parallel mode does not parallelize preparation: lookup, `prepareArguments`, schema validation, and `beforeToolCall` all run sequentially before prepared calls are wrapped for concurrent execution [E: packages/agent/src/agent-loop.ts:501] [E: packages/agent/src/agent-loop.ts:509] [E: packages/agent/src/agent-loop.ts:524]。

`prepareToolCall` returns the original `toolCall` object in the prepared outcome even when `prepareArguments` has rewritten `preparedToolCall.arguments`; the validated `args` are passed to `AgentTool.execute()`, while start/update event `args` remain based on the original tool call object used by the scheduler [E: packages/agent/src/agent-loop.ts:596] [E: packages/agent/src/agent-loop.ts:598] [E: packages/agent/src/agent-loop.ts:653] [E: packages/agent/src/agent-loop.ts:655] [E: packages/agent/src/agent-loop.ts:657] [E: packages/agent/src/agent-loop.ts:689]。

`terminate` is a batch-level all-of condition, not a per-tool immediate stop: `shouldTerminateToolBatch` returns true only when the finalized call list is non-empty and every finalized result has `terminate === true` [E: packages/agent/src/agent-loop.ts:584] [E: packages/agent/src/agent-loop.ts:585]。

## 跨包边界

`spine.tool-call-anatomy` is the cross-cutting flow that connects this agent-core subsystem to coding-agent tool registration: this node owns `AgentTool` invocation semantics and treats the product-side mapping into `AgentContext.tools` as a related-node boundary [E: packages/agent/src/types.ts:399] [E: packages/agent/src/types.ts:405] [I]。

`subsys.agent-core.hooks` should own the broader hook catalog [I]; tool invocation owns the local placement of `beforeToolCall` after validation and `afterToolCall` before `tool_execution_end` [E: packages/agent/src/agent-loop.ts:620] [E: packages/agent/src/agent-loop.ts:621] [E: packages/agent/src/agent-loop.ts:722] [E: packages/agent/src/agent-loop.ts:764]。

`ref.agent.tool-execution-modes` should catalog `ToolExecutionMode` values [I], while this node owns how those values affect a concrete assistant tool-call batch [E: packages/agent/src/types.ts:41] [E: packages/agent/src/types.ts:259] [E: packages/agent/src/agent-loop.ts:424]。

## Sources

- packages/agent/src/agent-loop.ts
- packages/agent/src/types.ts

## 相关

- spine.tool-call-anatomy
- subsys.agent-core.hooks
- ref.agent.tool-execution-modes
