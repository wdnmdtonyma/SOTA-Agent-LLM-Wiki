---
id: tool.synthetic-output
path: surface/tools/synthetic-output.md
title: SyntheticOutput
kind: tool
tier: T1
status: verified
source: [tools/SyntheticOutputTool/SyntheticOutputTool.ts]
symbols: [SyntheticOutputTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`SyntheticOutputTool` 的模型可见名称是 `StructuredOutput`; 它是 structured output 场景临时加入工具列表的内部输出工具, 用 Ajv 校验 JSON schema 后把最终结构化结果写入 `structured_output`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:20][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:25][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:116][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:143][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:155][E: main.tsx:1885][E: main.tsx:1891]

## 能回答的问题

- `SyntheticOutputTool` 为什么不在普通 base tools 中?
- `SyntheticOutputTool` 的 input schema 为什么是 passthrough?
- JSON schema 错误或输出不匹配时如何处理?

## 1 Identity

- Tool name: `StructuredOutput`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:20][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:44]
- `searchHint`: `return the final response as structured JSON`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:45]
- `maxResultSizeChars`: `100_000`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:46]
- `isSyntheticOutputToolEnabled()` 只在 non-interactive session 返回 true。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:25]
- `tools.ts` 把 `SYNTHETIC_OUTPUT_TOOL_NAME` 作为 special tool 过滤出普通 base tools。[E: tools.ts:301][E: tools.ts:304][E: tools.ts:307]

## 2 用途定位

`SyntheticOutputTool` 的 prompt 要求模型在 response 结束时 exactly once 调用该工具, 以返回 requested structured format。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:51] `main.tsx` 在 non-interactive session 且提供 `options.jsonSchema` 时创建 synthetic output tool 并追加到 tools array。[E: main.tsx:1880][E: main.tsx:1881][E: main.tsx:1882][E: main.tsx:1886][E: main.tsx:1891]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| 任意字段 | passthrough object | 取决于 runtime JSON schema | 无 | base `inputSchema` 是 `z.object({}).passthrough()`, 具体 JSON schema 由 `createSyntheticOutputTool(jsonSchema)` 写入 `inputJSONSchema`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:11][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:140][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:141] |

## 4 输出 & maxResultSizeChars

输出 schema 是 string, 描述为 `Structured output tool result`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:15] base `call()` 返回 `data: 'Structured output provided successfully'` 和 `structured_output: input`; schema-configured `call()` 在 Ajv 校验通过后返回同样 data 与 structured output。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:62][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:63][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:154][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:155]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isMcp` | `false` | 工具定义显式设置。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:29] |
| `isEnabled()` | `true` once created | 工具对象创建后总是 enabled。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:33] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:35][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:36] |
| `isReadOnly()` | `true` | 源码直接返回 true。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:38][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:39] |
| `isOpenWorld()` | `false` | 源码直接返回 false。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:41][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:42] |
| `checkPermissions()` | 固定 allow | 源码返回 `behavior: 'allow'` 和 `updatedInput`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:69][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:70] |

## 6 权限

`SyntheticOutputTool` 不向用户请求 permission, `checkPermissions()` 固定 allow。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:69][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:70] JSON schema 有效性在 `buildSyntheticOutputTool()` 中用 Ajv `validateSchema` 与 `compile` 校验; invalid schema 返回 `{ error }` 而不是 tool。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:132][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:134][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:136]

## 7 call() 走读

`createSyntheticOutputTool(jsonSchema)` 使用 `WeakMap` identity cache, 相同 schema object 再次调用会直接返回 cached result。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:109][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:119][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:120][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:123] schema-configured tool 通过 spread `...SyntheticOutputTool` 复用基础工具, 写入 `inputJSONSchema`, 并覆盖 `call()`; 该 `call()` 用 Ajv validator 检查 input, 不匹配时抛 `TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:140][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:141][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:142][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:143][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:148][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:149][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:150]

## 8 渲染

`renderToolUseMessage()` 对空 input 返回 null, 对 1-3 个 key 返回 `key: value` 片段, 超过 3 个 key 返回字段数量和前三个 key。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:76][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:78][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:80] rejected/error/progress/result render methods 分别返回固定 string/null/output。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:83][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:86][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:89][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:92] `mapToolResultToToolResultBlockParam()` 把 string content 放进 `tool_result`。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:95][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:98]

## 9 设计动机·edge·历史

- `tools.ts` specialTools 过滤 `StructuredOutput`, 然后 `main.tsx` 在 JSON schema 条件成立后把 created tool 追加回 tools array, 表明它是 structured output implementation detail 而非普通用户工具。[E: tools.ts:301][E: tools.ts:304][E: tools.ts:307][E: main.tsx:1885][E: main.tsx:1891]
- `cli/print.ts` 的 print/headless path 也会在 init JSON schema 存在且没有 `options.jsonSchema` 时追加 synthetic output tool。[E: cli/print.ts:1493][E: cli/print.ts:1494][E: cli/print.ts:1496]
- Ajv errors 会被压缩为 instancePath/message 列表, 并同时提供 user-facing 与 telemetry-safe error strings。[E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:146][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:149][E: tools/SyntheticOutputTool/SyntheticOutputTool.ts:150]

## Sources

- `tools/SyntheticOutputTool/SyntheticOutputTool.ts`
- `tools.ts`
- `main.tsx`
- `cli/print.ts`

## 相关

- `subsys.cli-modes`
