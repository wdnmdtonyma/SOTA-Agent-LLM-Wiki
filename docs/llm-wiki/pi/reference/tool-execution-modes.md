---
id: ref.agent.tool-execution-modes
title: 工具执行模式目录
kind: reference
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
symbols:
  - ToolExecutionMode
related:
  - subsys.agent-core.tool-invocation
evidence: explicit
status: verified
updated: 5a073885
---

> `ref.agent.tool-execution-modes` 是 `ToolExecutionMode` 的逐实例目录:覆盖 `"sequential"` 与 `"parallel"` 两个 literal 值、全局 `AgentLoopConfig.toolExecution` 配置位、单个 `AgentTool.executionMode` override 位,以及这些值在 agent-core tool-call batch 中的调度含义边界。

## 能回答的问题

- `ToolExecutionMode` 当前允许哪些 literal 值?
- `"sequential"` 和 `"parallel"` 在类型注释中分别承诺什么调度语义?
- 全局 `AgentLoopConfig.toolExecution` 和单工具 `AgentTool.executionMode` 如何引用同一个 union?
- 省略 tool execution mode 时默认是什么?
- 哪些执行顺序细节来自 `agent-loop.ts`,不属于本节点 source 的直接类型证据?

## Ground Truth

`ToolExecutionMode` 是 TypeScript type alias,不是 runtime enum object;源码把它定义成 `"sequential" | "parallel"` 两个 literal 值的 union。[E: packages/agent/src/types.ts:41]

`AgentLoopConfig.toolExecution?: ToolExecutionMode` 是 `AgentLoopConfig` 上的可选全局 tool batch 调度配置位。[E: packages/agent/src/types.ts:140][E: packages/agent/src/types.ts:259] 其邻近注释写明默认值为 `"parallel"`,但该默认语义是 comment-level contract,不作为本节点的代码行 `[E]` 锚点。[I]

`AgentTool.executionMode?: ToolExecutionMode` 是单个 tool definition 的可选 override 字段,并引用同一个 `ToolExecutionMode` union。[E: packages/agent/src/types.ts:371][E: packages/agent/src/types.ts:393][E: packages/agent/src/types.ts:41] 邻近注释给出的 per-tool sequential/parallel 与省略默认语义属于 comment-level contract。[I]

## ToolExecutionMode Values

| 值 | 类型位置 | source 内语义 | runtime 调度边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `"sequential"` | `ToolExecutionMode` union member;也可出现在 `AgentLoopConfig.toolExecution` 和 `AgentTool.executionMode`。[E: packages/agent/src/types.ts:41][E: packages/agent/src/types.ts:259][E: packages/agent/src/types.ts:393] | 邻近注释描述为:对一个 assistant message 内的 tool calls,每个 tool call 会在下一个 tool call 开始前完成 prepare、execute、finalize;全局配置注释简写为 one by one。注释行不作为 verified `[E]` 锚点。[I] | agent-loop 的实际 dispatch 会在全局 `config.toolExecution === "sequential"` 时选择 sequential path;若任一目标 tool 的 `executionMode === "sequential"`,整批 tool calls 也会走 sequential path。这一整批升级规则来自 `agent-loop.ts`,不在本节点 source 内,所以记为推断边界。[I] | `packages/agent/src/types.ts:41` |
| `"parallel"` | `ToolExecutionMode` union member;也可出现在 `AgentLoopConfig.toolExecution` 和 `AgentTool.executionMode`。[E: packages/agent/src/types.ts:41][E: packages/agent/src/types.ts:259][E: packages/agent/src/types.ts:393] | 邻近注释描述为:tool calls 先 sequential prepare,allowed tools 随后 concurrent execute;`tool_execution_end` 按完成顺序发出,tool-result message artifacts 稍后按 assistant source order 发出。注释行不作为 verified `[E]` 锚点。[I] | agent-loop 的实际 parallel path 会先顺序 prepare,再用 concurrent execution 等待一批 prepared calls,最后按 source order 生成 tool-result messages。这一执行细节来自 `agent-loop.ts`,不在本节点 source 内,所以记为推断边界。[I] | `packages/agent/src/types.ts:41` |

## Usage Sites

| 使用点 | 字段 / 签名 | 默认 / 可选 | 含义 | 为什么存在 | 源 path |
| --- | --- | --- | --- | --- | --- |
| `AgentLoopConfig.toolExecution` | `toolExecution?: ToolExecutionMode`。[E: packages/agent/src/types.ts:259] | 字段可选;邻近注释默认 `"parallel"`。[I] | 为一次 agent loop 配置 assistant tool-call batch 的默认执行策略。[I] | 让 host app 在全局层面选择保守串行或吞吐优先并发,而无需逐个 tool 标注。[I] | `packages/agent/src/types.ts` |
| `AgentTool.executionMode` | `executionMode?: ToolExecutionMode`。[E: packages/agent/src/types.ts:393] | 字段可选;邻近注释说省略时使用默认 execution mode。[I] | 为单个 tool 声明它必须串行,或可以并行。[I] | 让有共享状态、外部副作用或互斥需求的 tool 能覆盖全局并发默认;具体整批升级到 sequential 的行为来自 agent-loop runtime,不在本 source 内。[I] | `packages/agent/src/types.ts` |

## Execution Behavior Boundary

本节点的 source 只包含 `ToolExecutionMode` 的类型声明、字段位置和注释级语义;`executeToolCalls` 如何根据 `config.toolExecution`、per-tool `executionMode` 和 assistant message 的 tool calls 选择 sequential/parallel path,属于 `subsys.agent-core.tool-invocation` 的运行时职责。[E: packages/agent/src/types.ts:41][E: packages/agent/src/types.ts:259][E: packages/agent/src/types.ts:393][I]

`"parallel"` 不是“所有步骤都并发”:source 邻近注释把 prepare 描述为 sequential,并只允许 allowed tools 并发执行;completion event order 和 tool-result artifact order 也在注释中分开。因这些是注释行,本节点按行号规则标为 comment-level contract。[I]

`"sequential"` 的语义粒度是单个 assistant message 中的 tool calls,不是跨 turn 的全局锁;这一点来自 `ToolExecutionMode` 邻近注释,不是 runtime lock 代码。[I]

## Gotcha

`AgentTool.executionMode` 的 `"parallel"` 值表示该 tool 可以并发,不是强制本批一定并发;如果全局 `AgentLoopConfig.toolExecution` 选择 `"sequential"` 或同批其他 tool 要求 `"sequential"`,实际批次调度可能仍走 sequential path,该整批选择规则来自 `agent-loop.ts` runtime 而非本 source。[I]

`ToolExecutionMode` 不定义 tool 是否允许执行、参数如何验证、hook 如何 block 或 override result;这些在 `BeforeToolCallResult`、`AfterToolCallResult`、`beforeToolCall`、`afterToolCall` 和 tool invocation runtime 中定义。[E: packages/agent/src/types.ts:60][E: packages/agent/src/types.ts:77][E: packages/agent/src/types.ts:267][E: packages/agent/src/types.ts:281][I]

## L1 自检

- 本节点 frontmatter 的 `source` 只列 `packages/agent/src/types.ts`,与用户指定 source 对齐。
- `ToolExecutionMode` 两个 union member 都在表格中逐实例覆盖;`[E: path:line]` 只锚到 type/field/interface 代码行,comment-level 语义按 `[I]` 处理。
- 来自 `agent-loop.ts` 的 runtime dispatch、整批升级、并发执行和 source-order artifact 行为均标为 `[I]`,不作为本节点 source 的 direct evidence。
- 本轮没有新增 `[U]` 断言;对应 staging 文件记录为无待并入 uncertainty 的未知项。

## Sources

- `packages/agent/src/types.ts`

## 相关

- [subsys.agent-core.tool-invocation](../subsystems/agent-core/tool-invocation.md) - 运行时如何在 sequential/parallel path 之间 dispatch,以及 tool execution events、tool-result messages 的实际 emit 顺序。
