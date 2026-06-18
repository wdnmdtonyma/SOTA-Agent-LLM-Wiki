---
id: ref.tool-wire-protocol
title: Tool Wire Protocol Reference
kind: reference
tier: T3
v: shared
source:
  - packages/llm/src/schema/messages.ts
  - packages/llm/src/tool-runtime.ts
status: verified
updated: 355a0bcf5
evidence: explicit
symbols:
  - ToolDefinition
  - ToolCallPart
  - ToolResultPart
  - ToolResultValue
  - ToolOutput
  - ToolRuntime.dispatch
related:
  - model-layer.llm-tools
---

# Tool Wire Protocol Reference

本节点描述 `packages/llm` 的 provider-neutral tool wire shape。该 shape 对 V1 是 optional native LLM seam 的协议数据结构，对 V2 是 core runner 与 provider protocol adapter 的工具调用基础；它不是 V1 `Tool.Def` 也不是 V2 `Tool.Definition` 本身。

## V1

V1 当前主线仍通过 Vercel AI SDK 工具接口活跑；当启用 native LLM seam 时，V1 可以把本地 tool definition 降到 `packages/llm/src/schema/messages.ts` 的 `ToolDefinition` 与 tool parts。[I] 在这个语境里，`ToolDefinition.inputSchema` 对应 V1 `json-schema.ts/fromTool` 产物，而 `ToolResultPart.result` 承载已执行工具的 provider-neutral result value。[E: packages/llm/src/schema/messages.ts:239] [E: packages/llm/src/schema/messages.ts:247] [E: packages/llm/src/schema/messages.ts:153]

## V2

V2 `Tool.make` 产生的 opaque tool 在 registry materialization 时被派生成 `ToolDefinition`，provider 返回的 tool call 再交给 `ToolRuntime.dispatch` 或 core registry settlement 解释。[E: packages/core/src/tool/tool.ts:65] [E: packages/core/src/tool/tool.ts:73] [E: packages/llm/src/tool-runtime.ts:23] V2 的核心差异是 tool execution 先经过 typed codec settlement，再投影成 `ToolOutput`，而 wire protocol 只承载 provider-facing definition、call part 和 result part。[E: packages/core/src/tool/tool.ts:80] [E: packages/core/src/tool/tool.ts:95]

## Wire Data Types

| 类型 | 字段 | 形状 | 语义 |
| --- | --- | --- | --- |
| `ToolTextContent` | `type` | literal `text` | model-facing content block 的文本变体。[E: packages/llm/src/schema/messages.ts:42] |
| `ToolTextContent` | `text` | string | 文本内容。[E: packages/llm/src/schema/messages.ts:44] |
| `ToolFileContent` | `type` | literal `file` | model-facing content block 的文件变体。[E: packages/llm/src/schema/messages.ts:48] |
| `ToolFileContent` | `uri` | string | 文件 URI。[E: packages/llm/src/schema/messages.ts:50] |
| `ToolFileContent` | `mime` | string | 文件 MIME type。[E: packages/llm/src/schema/messages.ts:51] |
| `ToolFileContent` | `name?` | string | 可选文件名。[E: packages/llm/src/schema/messages.ts:52] |
| `ToolResultValue` | variants | `json/text/error/content` | tool result value 可以是结构化 JSON、文本、错误文本或 content blocks。[E: packages/llm/src/schema/messages.ts:65] [E: packages/llm/src/schema/messages.ts:83] |
| `ToolOutput` | `structured` | `unknown` | 保留 typed/structured output。[E: packages/llm/src/schema/messages.ts:95] |
| `ToolOutput` | `content` | `ToolContent[]` | provider-facing content blocks。[E: packages/llm/src/schema/messages.ts:96] |
| `ToolCallPart` | `type/id/name/input` | literal `tool-call`, string id/name, unknown input | assistant message 中的 canonical local/provider tool call part。[E: packages/llm/src/schema/messages.ts:137] [E: packages/llm/src/schema/messages.ts:145] |
| `ToolCallPart` | `providerExecuted?` | boolean | provider-hosted tool call 的标志。[E: packages/llm/src/schema/messages.ts:146] |
| `ToolCallPart` | `metadata?` | record | opencode/tool runtime metadata。[E: packages/llm/src/schema/messages.ts:144] |
| `ToolResultPart` | `type/id/name/result` | literal `tool-result`, string id/name, `ToolResultValue` | tool result part 的 canonical shape。[E: packages/llm/src/schema/messages.ts:153] [E: packages/llm/src/schema/messages.ts:158] |
| `ToolResultPart` | `providerExecuted?` | boolean | result 属于 provider-hosted tool 时可标 true。[E: packages/llm/src/schema/messages.ts:159] |
| `ToolDefinition` | `name` | string | provider-facing tool name。[E: packages/llm/src/schema/messages.ts:239] [E: packages/llm/src/schema/messages.ts:241] |
| `ToolDefinition` | `description` | string | provider-facing tool description。[E: packages/llm/src/schema/messages.ts:242] |
| `ToolDefinition` | `inputSchema` | `Record<string, unknown>` | provider-facing input JSON schema。[E: packages/llm/src/schema/messages.ts:243] |
| `ToolDefinition` | `outputSchema?` | `Record<string, unknown>` | 可选 output JSON schema。[E: packages/llm/src/schema/messages.ts:244] |
| `ToolDefinition` | `cache?` | boolean | definition cache hint。[E: packages/llm/src/schema/messages.ts:245] |
| `ToolDefinition` | `metadata?` | record | opencode metadata。[E: packages/llm/src/schema/messages.ts:246] |
| `ToolDefinition` | `native?` | unknown | provider-native hosted tool payload escape hatch。[E: packages/llm/src/schema/messages.ts:247] |
| `ToolChoice` | variants | `auto/none/required/tool` | provider request 可表达自动、禁用、必须、指定工具。[E: packages/llm/src/schema/messages.ts:256] [E: packages/llm/src/schema/messages.ts:259] |
| `LLMRequest` | `tools?` | `ToolDefinition[]` | 每个 provider turn 的工具定义数组。[E: packages/llm/src/schema/messages.ts:286] [E: packages/llm/src/schema/messages.ts:293] |
| `LLMRequest` | `toolChoice?` | `ToolChoice` | 每个 provider turn 的 tool choice。[E: packages/llm/src/schema/messages.ts:294] |

## ToolRuntime State Machine

| 步骤 | 条件 | 输出事件/结果 |
| --- | --- | --- |
| 1 | `dispatch` 接收一个 canonical `ToolCallPart` 和 handler map。[E: packages/llm/src/tool-runtime.ts:23] [E: packages/llm/src/tool-runtime.ts:24] | 用 call `name` 查找 handler。 |
| 2 | 找不到 handler 或 handler 没有 `execute`。[E: packages/llm/src/tool-runtime.ts:24] [E: packages/llm/src/tool-runtime.ts:26] | 直接生成 error `tool-result`，错误文本分别是 `Unknown tool: ${call.name}` 或 `Tool has no execute handler: ${call.name}`。[E: packages/llm/src/tool-runtime.ts:25] [E: packages/llm/src/tool-runtime.ts:27] |
| 3 | 找到 handler 后进入 `decodeAndExecute`，先调用可选 `_decode`。[E: packages/llm/src/tool-runtime.ts:37] [E: packages/llm/src/tool-runtime.ts:38] | `_decode` 抛错会变成 `ToolFailure("Invalid tool input: ...")`。[E: packages/llm/src/tool-runtime.ts:39] |
| 4 | handler `execute(decoded, { id, name })` 返回 raw output。[E: packages/llm/src/tool-runtime.ts:41] | raw output 再进入 optional `_encode`。[E: packages/llm/src/tool-runtime.ts:43] |
| 5 | `_encode` 抛错。[E: packages/llm/src/tool-runtime.ts:43] [E: packages/llm/src/tool-runtime.ts:44] | 变成 `ToolFailure("Tool returned an invalid value for its success schema: ...")`。[E: packages/llm/src/tool-runtime.ts:47] |
| 6 | encoded output 已经是 legacy result value。[E: packages/llm/src/tool-runtime.ts:53] | 用 `ToolOutput.fromResultValue` 兼容转成 `ToolOutput`。[E: packages/llm/src/tool-runtime.ts:54] |
| 7 | encoded output 是普通结构化值。[E: packages/llm/src/tool-runtime.ts:55] | structured=encoded，content=projected content。[E: packages/llm/src/tool-runtime.ts:56] |
| 8 | settlement result type 为 `error`。[E: packages/llm/src/tool-runtime.ts:69] | emits `tool-error`，并返回 error `tool-result`。[E: packages/llm/src/tool-runtime.ts:71] [E: packages/llm/src/tool-runtime.ts:72] |
| 9 | 非 error settlement。[E: packages/llm/src/tool-runtime.ts:74] | 返回 success `tool-result` event。 |

## Result Conversion Helpers

`ToolOutput.fromResultValue` 把 `json` 写入 structured、把 `text` 写入 text content、把 `content` 直接写入 content array；`error` result 不生成 success `ToolOutput`。[E: packages/llm/src/schema/messages.ts:107] [E: packages/llm/src/schema/messages.ts:116] `ToolOutput.toResultValue` 执行反向转换，并由 `toolResultText` 把 non-string 值转成 JSON 或 string。[E: packages/llm/src/schema/messages.ts:119] [E: packages/llm/src/schema/messages.ts:128]

## Sources

- packages/llm/src/schema/messages.ts
- packages/llm/src/tool-runtime.ts
- packages/core/src/tool/tool.ts

## Related

- model-layer.llm-tools
