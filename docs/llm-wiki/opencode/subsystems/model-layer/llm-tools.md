---
id: model-layer.llm-tools
title: LLM Tools
kind: subsystem
tier: T1
v: shared
source: [packages/llm/src/tool.ts, packages/llm/src/tool-runtime.ts]
symbols: [Tool.make, ToolDefinition, ToolRuntime.dispatch, ToolFailure, ToolOutput]
related: [ref.tool-wire-protocol, subsys.tools.v2]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> `packages/llm/src/tool.ts` 定义 native LLM engine 的 tool schema 与 projection,`tool-runtime.ts` 定义本地 tool call 的 decode/execute/encode/settle 流程。它把 provider-facing `ToolDefinition`、runtime `execute`、model-visible `ToolOutput` 分成三层。

## 能回答的问题
- typed tool 与 dynamic tool 在 schema/execute/projection 上有什么差异?
- `ToolDefinition` 的 wire name 从哪里来?
- 本地 tool call 如何变成 `tool-result` 或 `tool-error` event?
- `toModelOutput` 与 `toStructuredOutput` 的优先级是什么?
- V1 与 V2 的工具注册表 ground truth 为什么不能混用?

## V1

V1 当前工具 ground truth 是 `packages/opencode/src/tool/registry.ts`,默认 AI SDK loop 并不以 `packages/llm/src/tool-runtime.ts` 作为工具执行器。[I] 因此这个节点描述的是 native LLM package 的 tool runtime,不是 V1 活跑工具注册表本身。[I]

## V2

V2 工具 ground truth 是 `packages/core/src/tool/tools.ts` 与 `packages/core/src/tool/builtins.ts`;native LLM tool schema/runtime 用于 provider-facing definitions 与 local settlement 语义。[I] V2 session runner 会把 LLM tool events 投影为 durable session tool events,但 durable event catalog 不等同于 `LLMEvent`。[I]

## Tool Schema

`ToolSchema` 是 Effect schema codec,类型参数把 decode/encode services 约束为 `never`。[E: packages/llm/src/tool.ts:15] `ToolExecuteContext` 只包含 call `id` 与 tool `name`,execute 函数接收 schema-decoded params 并返回 success schema 的 result。[E: packages/llm/src/tool.ts:17][E: packages/llm/src/tool.ts:18][E: packages/llm/src/tool.ts:22][E: packages/llm/src/tool.ts:24]

`Tool` interface 分成三类字段:

- human/schema 字段:description、parameters、success。[E: packages/llm/src/tool.ts:49][E: packages/llm/src/tool.ts:51]
- optional runtime/projection 字段:execute、toModelOutput、toStructuredOutput。[E: packages/llm/src/tool.ts:52][E: packages/llm/src/tool.ts:54]
- internal compiled 字段:`_decode/_encode/_project/_legacyResult/_definition`,由 `Tool.make` 填好。[E: packages/llm/src/tool.ts:56][E: packages/llm/src/tool.ts:58][E: packages/llm/src/tool.ts:60][E: packages/llm/src/tool.ts:66][E: packages/llm/src/tool.ts:68]

`Tool.make` 支持 typed 与 dynamic 两种模式。dynamic 模式传 JSON Schema,parameters/success 都是 Unknown,decode/encode 直接 succeed,没有 projection 时 `_legacyResult` 为 true。[E: packages/llm/src/tool.ts:166][E: packages/llm/src/tool.ts:178] typed 模式用 Effect Schema decode input、encode output,并把 schema 转成 JSON Schema 生成 `ToolDefinition`。[E: packages/llm/src/tool.ts:194][E: packages/llm/src/tool.ts:203]

## Wire Definition

`Tools` 是 `Record<string, AnyTool>`。[E: packages/llm/src/tool.ts:211] `toDefinitions` 会用 record key 作为 provider wire name,并复制 cached definition 的 description/inputSchema/outputSchema。[E: packages/llm/src/tool.ts:223][E: packages/llm/src/tool.ts:228]

这意味着 tool object 自身没有最终 wire name;registry key 才是 provider 看见的 name。[E: packages/llm/src/tool.ts:223][E: packages/llm/src/tool.ts:225]

## Runtime Control Flow

1. `ToolRuntime.dispatch` 先按 call.name 查 tool,找不到直接返回 error result;有 tool 但没有 execute handler 也返回 error result。[E: packages/llm/src/tool-runtime.ts:24][E: packages/llm/src/tool-runtime.ts:27]

2. decode 阶段用 tool 的 `_decode`;失败会被包装成 `ToolFailure` message `Invalid tool input`。[E: packages/llm/src/tool-runtime.ts:38][E: packages/llm/src/tool-runtime.ts:39]

3. execute 阶段用 `{ id, name }` 作为 context 调用 handler,然后用 `_encode` 校验 success output;success schema encode 失败会变成 `Tool returned an invalid value for its success schema`。[E: packages/llm/src/tool-runtime.ts:41][E: packages/llm/src/tool-runtime.ts:47]

4. projection 阶段优先 `toStructuredOutput`,其次 `toModelOutput`,最后把 string output 构造成 text `ToolOutput`。[E: packages/llm/src/tool.ts:245][E: packages/llm/src/tool.ts:248]

5. result settlement 会 always 生成 `tool-result`;如果是 error result,会先发 `tool-error`,再发带 error output 的 `tool-result`。[E: packages/llm/src/tool-runtime.ts:69][E: packages/llm/src/tool-runtime.ts:74]

## 设计动机

Tool schema 把 provider wire contract 和 local execution 分离:provider definition 由 `toDefinitions` 输出,local runtime 才需要 decode/execute/encode/project。[E: packages/llm/src/tool.ts:221][E: packages/llm/src/tool-runtime.ts:37][E: packages/llm/src/tool-runtime.ts:56] dynamic mode 允许 raw JSON Schema path,其具体来源是 caller 决定的。[E: packages/llm/src/tool.ts:166][I]

`_legacyResult` 保留旧 tool result shape:dynamic tool 没有 model/structured projection 时 `_legacyResult` 为 true,dispatch 会在 encoded value 已经是 `ToolResultValue` 时直接转换成 `ToolOutput.fromResultValue(encoded)`。[E: packages/llm/src/tool.ts:178][E: packages/llm/src/tool-runtime.ts:53][E: packages/llm/src/tool-runtime.ts:54]

## 易错点

- `ToolFailure` 是 tool runtime domain error;dispatch 捕获它并转成 tool-error/tool-result events。[E: packages/llm/src/schema/errors.ts:203][E: packages/llm/src/tool-runtime.ts:31][E: packages/llm/src/tool-runtime.ts:32]
- `ToolDefinition.name` 来自 record key,不是 `Tool.make` 参数里的某个 name 字段。[E: packages/llm/src/tool.ts:223][E: packages/llm/src/tool.ts:225]
- V1/V2 工具 ground truth 不在 `packages/llm/src/tool.ts`;这个文件是 native LLM engine 的 tool abstraction,不是产品级 tool registry。[I]

## Sources
- packages/llm/src/tool.ts
- packages/llm/src/tool-runtime.ts
- packages/opencode/src/tool/registry.ts
- packages/core/src/tool/tools.ts
- packages/core/src/tool/builtins.ts

## Related
- ref.tool-wire-protocol
- subsys.tools.v2
