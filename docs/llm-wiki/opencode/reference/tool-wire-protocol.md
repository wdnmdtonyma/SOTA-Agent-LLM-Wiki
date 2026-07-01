---
id: ref.tool-wire-protocol
title: Tool Wire Protocol Reference
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/tool/tool.ts
  - packages/llm/src/schema/messages.ts
  - packages/llm/src/tool-runtime.ts
  - packages/schema/src/llm.ts
status: verified
updated: 8b68dc0d7
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

V1 当前主线仍通过 Vercel AI SDK 工具接口活跑；当启用 native LLM seam 时，V1 可以把本地 tool definition 降到 `packages/llm/src/schema/messages.ts` 的 `ToolDefinition` 与 tool parts。[I] 在这个语境里，`ToolDefinition.inputSchema` 对应 V1 `json-schema.ts/fromTool` 产物，而 `ToolResultPart.result` 承载已执行工具的 provider-neutral result value。[E: packages/llm/src/schema/messages.ts:227] [E: packages/llm/src/schema/messages.ts:143]

## V2

V2 `Tool.make` 产生的 opaque tool 在 registry materialization 时被派生成 `ToolDefinition`，provider 返回的 tool call 再交给 `ToolRuntime.dispatch` 或 core `Tool.settle` 解释。[E: packages/core/src/tool/tool.ts:76] [E: packages/core/src/tool/tool.ts:82] [E: packages/llm/src/tool-runtime.ts:23] [E: packages/core/src/tool/tool.ts:150] V2 的核心差异是 tool execution 先经过 typed codec settlement，再投影成 `ToolOutput`，而 wire protocol 只承载 provider-facing definition、call part 和 result part。[E: packages/core/src/tool/tool.ts:92] [E: packages/core/src/tool/tool.ts:113]

## Wire Data Types

| 类型 | 字段 | 形状 | 语义 |
| --- | --- | --- | --- |
| `ToolTextContent` | `type` | literal `text` | model-facing content block 的文本变体；`messages.ts` 从 schema package re-export 这个类型。[E: packages/schema/src/llm.ts:12] [E: packages/schema/src/llm.ts:13] [E: packages/llm/src/schema/messages.ts:43] |
| `ToolTextContent` | `text` | string | 文本内容。[E: packages/schema/src/llm.ts:14] |
| `ToolFileContent` | `type` | literal `file` | model-facing content block 的文件变体。[E: packages/schema/src/llm.ts:18] [E: packages/schema/src/llm.ts:19] |
| `ToolFileContent` | `uri` | string | 文件 URI。[E: packages/schema/src/llm.ts:20] |
| `ToolFileContent` | `mime` | string | 文件 MIME type。[E: packages/schema/src/llm.ts:21] |
| `ToolFileContent` | `name?` | string | 可选文件名。[E: packages/schema/src/llm.ts:22] |
| `ToolResultValue` | variants | `json/text/error/content` | tool result value 可以是结构化 JSON、文本、错误文本或 content blocks。[E: packages/llm/src/schema/messages.ts:50] [E: packages/llm/src/schema/messages.ts:53] [E: packages/llm/src/schema/messages.ts:57] [E: packages/llm/src/schema/messages.ts:61] [E: packages/llm/src/schema/messages.ts:65] |
| `ToolOutput` | `structured` | `unknown` | 保留 typed/structured output。[E: packages/llm/src/schema/messages.ts:80] [E: packages/llm/src/schema/messages.ts:81] |
| `ToolOutput` | `content` | `ToolContent[]` | provider-facing content blocks。[E: packages/llm/src/schema/messages.ts:82] |
| `ToolCallPart` | `type/id/name/input` | literal `tool-call`, string id/name, unknown input | assistant message 中的 canonical local/provider tool call part。[E: packages/llm/src/schema/messages.ts:122] [E: packages/llm/src/schema/messages.ts:124] [E: packages/llm/src/schema/messages.ts:125] [E: packages/llm/src/schema/messages.ts:126] [E: packages/llm/src/schema/messages.ts:127] |
| `ToolCallPart` | `providerExecuted?` | boolean | provider-hosted tool call 的标志。[E: packages/llm/src/schema/messages.ts:128] |
| `ToolCallPart` | `metadata?` | record | opencode/tool runtime metadata。[E: packages/llm/src/schema/messages.ts:129] |
| `ToolResultPart` | `type/id/name/result` | literal `tool-result`, string id/name, `ToolResultValue` | tool result part 的 canonical shape。[E: packages/llm/src/schema/messages.ts:138] [E: packages/llm/src/schema/messages.ts:140] [E: packages/llm/src/schema/messages.ts:141] [E: packages/llm/src/schema/messages.ts:142] [E: packages/llm/src/schema/messages.ts:143] |
| `ToolResultPart` | `providerExecuted?` | boolean | result 属于 provider-hosted tool 时可标 true。[E: packages/llm/src/schema/messages.ts:144] |
| `ToolDefinition` | `name` | string | provider-facing tool name。[E: packages/llm/src/schema/messages.ts:224] [E: packages/llm/src/schema/messages.ts:225] |
| `ToolDefinition` | `description` | string | provider-facing tool description。[E: packages/llm/src/schema/messages.ts:226] |
| `ToolDefinition` | `inputSchema` | `Record<string, unknown>` | provider-facing input JSON schema。[E: packages/llm/src/schema/messages.ts:227] |
| `ToolDefinition` | `outputSchema?` | `Record<string, unknown>` | 可选 output JSON schema。[E: packages/llm/src/schema/messages.ts:228] |
| `ToolDefinition` | `cache?` | boolean | definition cache hint。[E: packages/llm/src/schema/messages.ts:229] |
| `ToolDefinition` | `metadata?` | record | opencode metadata。[E: packages/llm/src/schema/messages.ts:230] |
| `ToolDefinition` | `native?` | unknown | provider-native hosted tool payload escape hatch。[E: packages/llm/src/schema/messages.ts:231] |
| `ToolChoice` | variants | `auto/none/required/tool` | provider request 可表达自动、禁用、必须、指定工具。[E: packages/llm/src/schema/messages.ts:241] [E: packages/llm/src/schema/messages.ts:242] |
| `LLMRequest` | `tools` | `ToolDefinition[]` | 每个 provider turn 的工具定义数组。[E: packages/llm/src/schema/messages.ts:271] [E: packages/llm/src/schema/messages.ts:276] |
| `LLMRequest` | `toolChoice?` | `ToolChoice` | 每个 provider turn 的 tool choice。[E: packages/llm/src/schema/messages.ts:277] |

## ToolRuntime State Machine

| 步骤 | 条件 | 输出事件/结果 |
| --- | --- | --- |
| 1 | `dispatch` 接收一个 canonical `ToolCallPart` 和 handler map。[E: packages/llm/src/tool-runtime.ts:23] [E: packages/llm/src/tool-runtime.ts:24] | 用 call `name` 查找 handler。 |
| 2 | 找不到 handler 或 handler 没有 `execute`。[E: packages/llm/src/tool-runtime.ts:24] [E: packages/llm/src/tool-runtime.ts:26] | 直接生成 error `tool-result`，错误文本分别是 `Unknown tool: ${call.name}` 或 `Tool has no execute handler: ${call.name}`。[E: packages/llm/src/tool-runtime.ts:25] [E: packages/llm/src/tool-runtime.ts:27] |
| 3 | 找到 handler 后进入 `decodeAndExecute`，先调用 `_decode`。[E: packages/llm/src/tool-runtime.ts:37] [E: packages/llm/src/tool-runtime.ts:38] | `_decode` 抛错会变成 `ToolFailure("Invalid tool input: ...")`。[E: packages/llm/src/tool-runtime.ts:39] |
| 4 | handler `execute(decoded, { id, name })` 返回 raw output。[E: packages/llm/src/tool-runtime.ts:41] | raw output 再进入 `_encode`。[E: packages/llm/src/tool-runtime.ts:43] |
| 5 | `_encode` 抛错。[E: packages/llm/src/tool-runtime.ts:43] [E: packages/llm/src/tool-runtime.ts:44] | 变成 `ToolFailure("Tool returned an invalid value for its success schema: ...")`。[E: packages/llm/src/tool-runtime.ts:47] |
| 6 | encoded output 已经是 legacy result value。[E: packages/llm/src/tool-runtime.ts:53] | 用 `ToolOutput.fromResultValue` 兼容转成 `ToolOutput`。[E: packages/llm/src/tool-runtime.ts:54] |
| 7 | encoded output 走普通 projection。[E: packages/llm/src/tool-runtime.ts:55] | 通过 `ToolOutput.toResultValue(output)` 得到 result，非 error result 会附带 output。[E: packages/llm/src/tool-runtime.ts:56] [E: packages/llm/src/tool-runtime.ts:57] |
| 8 | settlement result type 为 `error`。[E: packages/llm/src/tool-runtime.ts:69] | emits `tool-error`，并返回 error `tool-result`。[E: packages/llm/src/tool-runtime.ts:71] [E: packages/llm/src/tool-runtime.ts:72] |
| 9 | 非 error settlement。[E: packages/llm/src/tool-runtime.ts:74] | 返回 success `tool-result` event。 |

## Result Conversion Helpers

`ToolOutput.fromResultValue` 把 `json` 写入 structured、把 `text` 写入 text content、把 `content` 直接写入 content array；`error` result 不生成 success `ToolOutput`。[E: packages/llm/src/schema/messages.ts:92] [E: packages/llm/src/schema/messages.ts:95] [E: packages/llm/src/schema/messages.ts:97] [E: packages/llm/src/schema/messages.ts:99] [E: packages/llm/src/schema/messages.ts:101] `ToolOutput.toResultValue` 执行反向转换，并由 `toolResultText` 把 non-string 值转成 JSON 或 string。[E: packages/llm/src/schema/messages.ts:104] [E: packages/llm/src/schema/messages.ts:113] [E: packages/llm/src/schema/messages.ts:116]

## Sources

- packages/llm/src/schema/messages.ts
- packages/llm/src/tool-runtime.ts
- packages/core/src/tool/tool.ts
- packages/schema/src/llm.ts

## Related

- model-layer.llm-tools
