---
id: ref.agent.tool-execution-modes
title: 工具执行模式目录
kind: reference
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
symbols:
  - ToolExecutionMode
related:
  - subsys.agent-core.tool-invocation
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.agent.tool-execution-modes` 是 `ToolExecutionMode` 的逐实例目录:覆盖 `"sequential"` 与 `"parallel"` 两个 literal 值、全局 `AgentLoopConfig.toolExecution` 配置位、单个 `AgentTool.executionMode` override 位,以及 `Agent` 构造默认值和 loop 整批升级规则。

## 能回答的问题

- `ToolExecutionMode` 当前允许哪些 literal 值?
- `"sequential"` 和 `"parallel"` 在一个 assistant tool-call batch 里分别承诺什么调度语义?
- 全局 `AgentLoopConfig.toolExecution` 和单工具 `AgentTool.executionMode` 如何引用同一个 union?
- 省略 tool execution mode 时默认是什么?
- 整批何时从 parallel 升级为 sequential?

## Ground Truth

`ToolExecutionMode` 是 TypeScript type alias,不是 runtime enum object;源码把它定义成 `"sequential" | "parallel"` 两个 literal 值的 union。[E: packages/agent/src/types.ts:47]

`AgentLoopConfig.toolExecution?: ToolExecutionMode` 是 `AgentLoopConfig` 上的可选全局 tool batch 调度配置位。[E: packages/agent/src/types.ts:193] [E: packages/agent/src/types.ts:317]

`AgentTool.executionMode?: ToolExecutionMode` 是单个 tool definition 的可选 override 字段,并引用同一个 `ToolExecutionMode` union。[E: packages/agent/src/types.ts:464] [E: packages/agent/src/types.ts:496] [E: packages/agent/src/types.ts:47]

`Agent` 构造把 `toolExecution` 默认成 `"parallel"`。[E: packages/agent/src/agent.ts:253] `Agent.createLoopConfig` 把该字段原样注入 loop config。[E: packages/agent/src/agent.ts:479]

## ToolExecutionMode Values

| 值 | 类型位置 | source 内语义 | runtime 调度边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `"sequential"` | `ToolExecutionMode` union member;也可出现在 `AgentLoopConfig.toolExecution` 和 `AgentTool.executionMode`。[E: packages/agent/src/types.ts:47] [E: packages/agent/src/types.ts:317] [E: packages/agent/src/types.ts:496] | 对一个 assistant message 内的 tool calls,每个 call 在下一个开始前完成 prepare、execute、finalize。[I] | `executeToolCalls` 在 `config.toolExecution === "sequential"` 时选择 sequential path;若任一目标 tool 的 `executionMode === "sequential"`,整批也会走 sequential path。[E: packages/agent/src/agent-loop.ts:516] [E: packages/agent/src/agent-loop.ts:519] [E: packages/agent/src/agent-loop.ts:520] | `packages/agent/src/types.ts:47` |
| `"parallel"` | `ToolExecutionMode` union member;也可出现在 `AgentLoopConfig.toolExecution` 和 `AgentTool.executionMode`。[E: packages/agent/src/types.ts:47] [E: packages/agent/src/types.ts:317] [E: packages/agent/src/types.ts:496] | tool calls 先 sequential prepare,allowed tools 随后 concurrent execute;`tool_execution_end` 按完成顺序发出,tool-result message artifacts 稍后按 assistant source order 发出。[I] | 默认 path 是 `executeToolCallsParallel`:prepare 仍按 source order 串行,prepared thunks 用 `Promise.all` 并发,最后按 `orderedFinalizedCalls` 发 tool-result messages。[E: packages/agent/src/agent-loop.ts:522] [E: packages/agent/src/agent-loop.ts:596] [E: packages/agent/src/agent-loop.ts:646] [E: packages/agent/src/agent-loop.ts:650] | `packages/agent/src/types.ts:47` |

## Usage Sites

| 使用点 | 字段 / 签名 | 默认 / 可选 | 含义 | 为什么存在 | 源 path |
| --- | --- | --- | --- | --- | --- |
| `AgentLoopConfig.toolExecution` | `toolExecution?: ToolExecutionMode`。[E: packages/agent/src/types.ts:317] | 字段可选;`Agent` 构造默认 `"parallel"`。[E: packages/agent/src/agent.ts:253] | 为一次 agent loop 配置 assistant tool-call batch 的默认执行策略。[I] | 让 host app 在全局层面选择保守串行或吞吐优先并发,而无需逐个 tool 标注。[I] | `packages/agent/src/types.ts` |
| `AgentTool.executionMode` | `executionMode?: ToolExecutionMode`。[E: packages/agent/src/types.ts:496] | 字段可选;省略时使用全局 / 默认 execution mode。[I] | 为单个 tool 声明它必须串行,或可以并行。[I] | 让有共享状态、外部副作用或互斥需求的 tool 能覆盖全局并发默认;任一 sequential tool 会把同批升级为 sequential。[E: packages/agent/src/agent-loop.ts:516] [E: packages/agent/src/agent-loop.ts:519] | `packages/agent/src/types.ts` |
| `Agent.toolExecution` | 实例字段,构造写入 `options.toolExecution ?? "parallel"`。[E: packages/agent/src/agent.ts:228] [E: packages/agent/src/agent.ts:253] | 默认 `"parallel"`。[E: packages/agent/src/agent.ts:253] | 有状态 `Agent` 把该值注入 `createLoopConfig().toolExecution`。[E: packages/agent/src/agent.ts:479] | 让 `Agent` wrapper 的默认与 loop config 对齐。[I] | `packages/agent/src/agent.ts` |

## Execution Behavior Boundary

`executeToolCalls` 根据 `config.toolExecution`、per-tool `executionMode` 和 assistant message 的 tool calls 选择 sequential/parallel path,细节由 `subsys.agent-core.tool-invocation` 展开。[E: packages/agent/src/types.ts:47] [E: packages/agent/src/types.ts:317] [E: packages/agent/src/types.ts:496] [E: packages/agent/src/agent-loop.ts:508] [E: packages/agent/src/agent-loop.ts:519]

`"parallel"` 不是“所有步骤都并发”:prepare 仍 sequential,只有 allowed tools 的 `execute()` 并发;completion event order 和 tool-result artifact order 分开。[E: packages/agent/src/agent-loop.ts:596] [E: packages/agent/src/agent-loop.ts:619] [E: packages/agent/src/agent-loop.ts:646] [E: packages/agent/src/agent-loop.ts:650]

`"sequential"` 的语义粒度是单个 assistant message 中的 tool calls,不是跨 turn 的全局锁。[E: packages/agent/src/agent-loop.ts:508] [E: packages/agent/src/agent-loop.ts:530] [I]

## Gotcha

`AgentTool.executionMode` 的 `"parallel"` 值表示该 tool 可以并发,不是强制本批一定并发;如果全局 `AgentLoopConfig.toolExecution` 选择 `"sequential"` 或同批其他 tool 要求 `"sequential"`,实际批次调度仍走 sequential path。[E: packages/agent/src/agent-loop.ts:519]

`ToolExecutionMode` 不定义 tool 是否允许执行、参数如何验证、hook 如何 block 或 override result;这些在 `BeforeToolCallResult`、`AfterToolCallResult`、`beforeToolCall`、`afterToolCall` 和 tool invocation runtime 中定义。[E: packages/agent/src/types.ts:66] [E: packages/agent/src/types.ts:92] [E: packages/agent/src/types.ts:326] [E: packages/agent/src/types.ts:341] [I]

## Sources

- packages/agent/src/types.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts

## 相关

- [subsys.agent-core.tool-invocation](../subsystems/agent-core/tool-invocation.md): 运行时如何在 sequential/parallel path 之间 dispatch,以及 tool execution events、tool-result messages 的实际 emit 顺序。
