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
updated: 9767ba275f
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

`executeToolCalls` 是 assistant message 到 tool-result 批次的入口:它从 `assistantMessage.content` 过滤 `type === "toolCall"` 的 blocks,再按全局 `config.toolExecution` 或任一目标 `AgentTool.executionMode === "sequential"` 决定整批走 sequential 或 parallel [E: packages/agent/src/agent-loop.ts:409] [E: packages/agent/src/agent-loop.ts:416] [E: packages/agent/src/agent-loop.ts:417] [E: packages/agent/src/agent-loop.ts:418] [E: packages/agent/src/agent-loop.ts:420]。

本子系统只覆盖 agent-core 的运行时调用边界:可用工具来自 `AgentContext.tools`,每个工具符合 `AgentTool` contract [E: packages/agent/src/types.ts:415] [E: packages/agent/src/types.ts:421] [E: packages/agent/src/types.ts:387] [E: packages/agent/src/types.ts:411]。[I] 产品层如何注册内置工具、扩展工具、prompt snippet 或 renderer 不由本节点的两个 source 文件展开。

## 关键文件

- `packages/agent/src/agent-loop.ts`: 定义 `executeToolCallsSequential`、`executeToolCallsParallel`、`prepareToolCall`、`executePreparedToolCall`、`finalizeExecutedToolCall`、`createToolResultMessage` 和 tool execution events 的 emit 点 [E: packages/agent/src/agent-loop.ts:431] [E: packages/agent/src/agent-loop.ts:487] [E: packages/agent/src/agent-loop.ts:607] [E: packages/agent/src/agent-loop.ts:677] [E: packages/agent/src/agent-loop.ts:720] [E: packages/agent/src/agent-loop.ts:784]。
- `packages/agent/src/types.ts`: 定义 `AgentLoopConfig.toolExecution`、`beforeToolCall`、`afterToolCall`、`AgentToolResult`、`AgentTool`、`AgentContext` 和 tool execution event variants [E: packages/agent/src/types.ts:269] [E: packages/agent/src/types.ts:278] [E: packages/agent/src/types.ts:293] [E: packages/agent/src/types.ts:362] [E: packages/agent/src/types.ts:387] [E: packages/agent/src/types.ts:415] [E: packages/agent/src/types.ts:444]。

## 数据模型

`AgentTool` extends the provider-facing `Tool` shape and adds a UI label, optional `prepareArguments`, `execute(toolCallId, params, signal, onUpdate)`, and optional per-tool `executionMode` [E: packages/agent/src/types.ts:387] [E: packages/agent/src/types.ts:389] [E: packages/agent/src/types.ts:394] [E: packages/agent/src/types.ts:396] [E: packages/agent/src/types.ts:411]。

`AgentToolResult<T>` is the envelope shared by final and partial results: it contains text/image `content`, structured `details`, optional `usage` from the tool execution itself, optional `addedToolNames` for tools introduced at this transcript point, and an optional `terminate` hint whose batch semantics require every finalized result to opt in [E: packages/agent/src/types.ts:362] [E: packages/agent/src/types.ts:364] [E: packages/agent/src/types.ts:366] [E: packages/agent/src/types.ts:368] [E: packages/agent/src/types.ts:370] [E: packages/agent/src/types.ts:375] [E: packages/agent/src/agent-loop.ts:589] [E: packages/agent/src/agent-loop.ts:590]。

`PreparedToolCall` is internal to `agent-loop.ts` and carries the original `toolCall`, resolved `AgentTool`, and validated `args`; `ImmediateToolCallOutcome` carries an immediate result plus an `isError` flag for calls that should not execute [E: packages/agent/src/agent-loop.ts:563] [E: packages/agent/src/agent-loop.ts:565] [E: packages/agent/src/agent-loop.ts:566] [E: packages/agent/src/agent-loop.ts:567] [E: packages/agent/src/agent-loop.ts:570] [E: packages/agent/src/agent-loop.ts:572] [E: packages/agent/src/agent-loop.ts:573]。

## 控制流

1. `executeToolCalls@packages/agent/src/agent-loop.ts:409` filters assistant content to tool calls, detects any requested sequential tool by looking up `currentContext.tools`, and dispatches the entire batch to `executeToolCallsSequential` or `executeToolCallsParallel` [E: packages/agent/src/agent-loop.ts:416] [E: packages/agent/src/agent-loop.ts:417] [E: packages/agent/src/agent-loop.ts:418] [E: packages/agent/src/agent-loop.ts:420] [E: packages/agent/src/agent-loop.ts:421] [E: packages/agent/src/agent-loop.ts:423]。
2. `executeToolCallsSequential@packages/agent/src/agent-loop.ts:431` iterates tool calls in assistant source order, emits `tool_execution_start`, prepares one call, executes and finalizes it when preparation succeeds, then emits `tool_execution_end` and the corresponding tool-result message before moving to the next call [E: packages/agent/src/agent-loop.ts:442] [E: packages/agent/src/agent-loop.ts:443] [E: packages/agent/src/agent-loop.ts:450] [E: packages/agent/src/agent-loop.ts:452] [E: packages/agent/src/agent-loop.ts:459] [E: packages/agent/src/agent-loop.ts:460] [E: packages/agent/src/agent-loop.ts:470] [E: packages/agent/src/agent-loop.ts:471] [E: packages/agent/src/agent-loop.ts:472]。
3. Sequential mode stops early on abort after it has emitted and stored the current call's finalized result; the returned batch contains accumulated `messages` and `terminate: shouldTerminateToolBatch(finalizedCalls)` [E: packages/agent/src/agent-loop.ts:473] [E: packages/agent/src/agent-loop.ts:474] [E: packages/agent/src/agent-loop.ts:476] [E: packages/agent/src/agent-loop.ts:477] [E: packages/agent/src/agent-loop.ts:481] [E: packages/agent/src/agent-loop.ts:483]。
4. `executeToolCallsParallel@packages/agent/src/agent-loop.ts:487` still emits `tool_execution_start` and runs `prepareToolCall` one call at a time in assistant source order; immediate failures are finalized and ended immediately, while prepared calls are stored as async thunks [E: packages/agent/src/agent-loop.ts:495] [E: packages/agent/src/agent-loop.ts:497] [E: packages/agent/src/agent-loop.ts:498] [E: packages/agent/src/agent-loop.ts:505] [E: packages/agent/src/agent-loop.ts:506] [E: packages/agent/src/agent-loop.ts:512] [E: packages/agent/src/agent-loop.ts:513] [E: packages/agent/src/agent-loop.ts:520]。
5. Parallel mode executes prepared thunks through `Promise.all`, so `tool_execution_end` for real executions is emitted when each thunk finalizes; only after all entries resolve does the loop create and emit `ToolResultMessage` artifacts in the `orderedFinalizedCalls` array order [E: packages/agent/src/agent-loop.ts:530] [E: packages/agent/src/agent-loop.ts:531] [E: packages/agent/src/agent-loop.ts:539] [E: packages/agent/src/agent-loop.ts:547] [E: packages/agent/src/agent-loop.ts:551] [E: packages/agent/src/agent-loop.ts:552] [E: packages/agent/src/agent-loop.ts:553]。
6. `prepareToolCall@packages/agent/src/agent-loop.ts:607` resolves the tool by name; if no tool matches, it returns an immediate error result instead of throwing [E: packages/agent/src/agent-loop.ts:614] [E: packages/agent/src/agent-loop.ts:615] [E: packages/agent/src/agent-loop.ts:616] [E: packages/agent/src/agent-loop.ts:618] [E: packages/agent/src/agent-loop.ts:619]。
7. The prepare boundary runs `prepareToolCallArguments`, then `validateToolArguments`, then optional `config.beforeToolCall`; the optional `prepareArguments` hook can rewrite raw model arguments before validation [E: packages/agent/src/agent-loop.ts:593] [E: packages/agent/src/agent-loop.ts:597] [E: packages/agent/src/agent-loop.ts:601] [E: packages/agent/src/agent-loop.ts:603] [E: packages/agent/src/agent-loop.ts:624] [E: packages/agent/src/agent-loop.ts:625] [E: packages/agent/src/agent-loop.ts:626] [E: packages/agent/src/types.ts:394]。
8. `beforeToolCall` receives assistant message, original tool call, validated args, current context, and abort signal; abort or `{ block: true }` becomes an immediate error result, which the schedulers finalize through the non-executing immediate branch [E: packages/agent/src/agent-loop.ts:452] [E: packages/agent/src/agent-loop.ts:459] [E: packages/agent/src/agent-loop.ts:506] [E: packages/agent/src/agent-loop.ts:520] [E: packages/agent/src/agent-loop.ts:627] [E: packages/agent/src/agent-loop.ts:629] [E: packages/agent/src/agent-loop.ts:630] [E: packages/agent/src/agent-loop.ts:631] [E: packages/agent/src/agent-loop.ts:632] [E: packages/agent/src/agent-loop.ts:634] [E: packages/agent/src/agent-loop.ts:636] [E: packages/agent/src/agent-loop.ts:643] [E: packages/agent/src/types.ts:278]。
9. Validation or hook exceptions are caught inside `prepareToolCall` and converted to immediate error tool results, so the scheduler handles them through the same finalized-result path as missing or blocked tools [E: packages/agent/src/agent-loop.ts:668] [E: packages/agent/src/agent-loop.ts:669] [E: packages/agent/src/agent-loop.ts:671] [E: packages/agent/src/agent-loop.ts:672]。
10. `executePreparedToolCall@packages/agent/src/agent-loop.ts:677` calls `prepared.tool.execute(prepared.toolCall.id, prepared.args, signal, onUpdate)`, turns accepted `onUpdate` callbacks into `tool_execution_update` events, waits for queued update event promises, and converts thrown errors into error-shaped `AgentToolResult` values [E: packages/agent/src/agent-loop.ts:686] [E: packages/agent/src/agent-loop.ts:687] [E: packages/agent/src/agent-loop.ts:688] [E: packages/agent/src/agent-loop.ts:689] [E: packages/agent/src/agent-loop.ts:690] [E: packages/agent/src/agent-loop.ts:694] [E: packages/agent/src/agent-loop.ts:706] [E: packages/agent/src/agent-loop.ts:708] [E: packages/agent/src/agent-loop.ts:712]。
11. `finalizeExecutedToolCall@packages/agent/src/agent-loop.ts:720` runs `afterToolCall` after `AgentTool.execute()` and before `tool_execution_end`; the hook can replace `content`, `details`, `usage`, `terminate`, and `isError`, and omitted fields keep their original values [E: packages/agent/src/agent-loop.ts:459] [E: packages/agent/src/agent-loop.ts:460] [E: packages/agent/src/agent-loop.ts:470] [E: packages/agent/src/agent-loop.ts:530] [E: packages/agent/src/agent-loop.ts:531] [E: packages/agent/src/agent-loop.ts:539] [E: packages/agent/src/agent-loop.ts:731] [E: packages/agent/src/agent-loop.ts:733] [E: packages/agent/src/agent-loop.ts:745] [E: packages/agent/src/agent-loop.ts:747] [E: packages/agent/src/agent-loop.ts:748] [E: packages/agent/src/agent-loop.ts:749] [E: packages/agent/src/agent-loop.ts:750] [E: packages/agent/src/agent-loop.ts:752] [E: packages/agent/src/types.ts:84] [E: packages/agent/src/types.ts:85] [E: packages/agent/src/types.ts:86] [E: packages/agent/src/types.ts:87] [E: packages/agent/src/types.ts:89] [E: packages/agent/src/types.ts:94]。
12. `emitToolExecutionEnd@packages/agent/src/agent-loop.ts:774` emits the finalized result and `isError`; `createToolResultMessage@packages/agent/src/agent-loop.ts:784` then builds a provider-visible `role: "toolResult"` message with `toolCallId`, `toolName`, `content`, `details`, `usage`, optional `addedToolNames` when that array is non-empty, `isError`, and `timestamp` [E: packages/agent/src/agent-loop.ts:774] [E: packages/agent/src/agent-loop.ts:776] [E: packages/agent/src/agent-loop.ts:779] [E: packages/agent/src/agent-loop.ts:780] [E: packages/agent/src/agent-loop.ts:784] [E: packages/agent/src/agent-loop.ts:786] [E: packages/agent/src/agent-loop.ts:787] [E: packages/agent/src/agent-loop.ts:788] [E: packages/agent/src/agent-loop.ts:791] [E: packages/agent/src/agent-loop.ts:792] [E: packages/agent/src/agent-loop.ts:793] [E: packages/agent/src/agent-loop.ts:794] [E: packages/agent/src/agent-loop.ts:795] [E: packages/agent/src/agent-loop.ts:796]。
13. assistant message 若以 `stopReason: "length"` 结束，loop 不执行其中任何 tool call；它把整批视为可能含截断 arguments 并生成失败结果，只有非 length 才进入普通 sequential/parallel scheduler [E: packages/agent/src/agent-loop.ts:225] [E: packages/agent/src/agent-loop.ts:230] [E: packages/agent/src/agent-loop.ts:231] [E: packages/agent/src/agent-loop.ts:232] [E: packages/agent/src/agent-loop.ts:233]。

## 设计动机与权衡

The scheduling rule is conservative: one sequential target upgrades the whole assistant batch to sequential mode, which prevents a tool that declares `executionMode: "sequential"` from interleaving with parallel peers in the same batch [E: packages/agent/src/agent-loop.ts:417] [E: packages/agent/src/agent-loop.ts:418] [E: packages/agent/src/agent-loop.ts:420] [E: packages/agent/src/types.ts:42] [E: packages/agent/src/types.ts:411]。

Most local failure paths are represented as `AgentToolResult` envelopes rather than escaping the scheduler: missing tools, validation failures, block decisions, aborts, execute throws, and `afterToolCall` throws can still become `toolResult` messages [E: packages/agent/src/agent-loop.ts:618] [E: packages/agent/src/agent-loop.ts:646] [E: packages/agent/src/agent-loop.ts:658] [E: packages/agent/src/agent-loop.ts:671] [E: packages/agent/src/agent-loop.ts:712] [E: packages/agent/src/agent-loop.ts:755] [E: packages/agent/src/agent-loop.ts:784]。

Partial updates stay on the event path in `executePreparedToolCall`: `onUpdate` emits `tool_execution_update`, and the final model-visible message is built later from the finalized `AgentToolResult` [E: packages/agent/src/agent-loop.ts:690] [E: packages/agent/src/agent-loop.ts:694] [E: packages/agent/src/agent-loop.ts:699] [E: packages/agent/src/agent-loop.ts:706] [E: packages/agent/src/agent-loop.ts:784] [E: packages/agent/src/agent-loop.ts:791]。

## Gotcha

Parallel mode does not parallelize preparation: lookup, `prepareArguments`, schema validation, and `beforeToolCall` all run sequentially before prepared calls are wrapped for concurrent execution [E: packages/agent/src/agent-loop.ts:497] [E: packages/agent/src/agent-loop.ts:505] [E: packages/agent/src/agent-loop.ts:520]。

`prepareToolCall` returns the original `toolCall` object in the prepared outcome even when `prepareArguments` has rewritten `preparedToolCall.arguments`; the validated `args` are passed to `AgentTool.execute()`, while start/update event `args` remain based on the original tool call object used by the scheduler [E: packages/agent/src/agent-loop.ts:601] [E: packages/agent/src/agent-loop.ts:603] [E: packages/agent/src/agent-loop.ts:662] [E: packages/agent/src/agent-loop.ts:664] [E: packages/agent/src/agent-loop.ts:666] [E: packages/agent/src/agent-loop.ts:698]。

`terminate` is a batch-level all-of condition, not a per-tool immediate stop: `shouldTerminateToolBatch` returns true only when the finalized call list is non-empty and every finalized result has `terminate === true` [E: packages/agent/src/agent-loop.ts:589] [E: packages/agent/src/agent-loop.ts:590]。

## 跨包边界

`spine.tool-call-anatomy` is the cross-cutting flow that connects this agent-core subsystem to coding-agent tool registration: this node owns `AgentTool` invocation semantics and treats the product-side mapping into `AgentContext.tools` as a related-node boundary [E: packages/agent/src/types.ts:415] [E: packages/agent/src/types.ts:421] [I]。

`subsys.agent-core.hooks` should own the broader hook catalog [I]; tool invocation owns the local placement of `beforeToolCall` after validation and `afterToolCall` before `tool_execution_end` [E: packages/agent/src/agent-loop.ts:625] [E: packages/agent/src/agent-loop.ts:626] [E: packages/agent/src/agent-loop.ts:731] [E: packages/agent/src/agent-loop.ts:774]。

`ref.agent.tool-execution-modes` should catalog `ToolExecutionMode` values [I], while this node owns how those values affect a concrete assistant tool-call batch [E: packages/agent/src/types.ts:42] [E: packages/agent/src/types.ts:269] [E: packages/agent/src/agent-loop.ts:420]。

## Sources

- packages/agent/src/agent-loop.ts
- packages/agent/src/types.ts

## 相关

- spine.tool-call-anatomy
- subsys.agent-core.hooks
- ref.agent.tool-execution-modes
