---
id: tool.invalid
title: Invalid 工具(占位)
kind: tool
tier: T1
v: v1
source: [packages/opencode/src/tool/invalid.ts, packages/opencode/src/tool/registry.ts, packages/opencode/src/session/llm.ts, packages/opencode/src/tool/tool.ts, packages/core/src/tool/registry.ts, packages/core/src/tool/tool.ts, packages/core/src/tool/builtins.ts]
symbols: [InvalidTool]
related: [subsys.tools.v1]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Invalid 工具是 V1 AI SDK repair path 的占位工具：模型不应主动使用它；AI SDK tool-call repair 会把无法修复的 malformed call 改写成 `invalid` 调用，把错误作为普通 tool result 反馈给模型。

## 能回答的问题

- `invalid` 工具为什么在 builtin 列表里但 activeTools 又排除它？
- `invalid` 的输入字段是什么？
- V1 LLM 什么时候会把 tool call 改写成 `invalid`？
- InvalidTool execute 返回什么？
- V2 如何处理 unknown/stale/invalid tool call？

## 1 Identity

V1 `InvalidTool` 通过 `Tool.define("invalid", ...)` 注册，description 是 `"Do not use"`。[E: packages/opencode/src/tool/invalid.ts:9][E: packages/opencode/src/tool/invalid.ts:10][E: packages/opencode/src/tool/invalid.ts:12] V1 registry 初始化 invalid，并把 `tool.invalid` 放在 builtin 列表第一项。[E: packages/opencode/src/tool/registry.ts:92][E: packages/opencode/src/tool/registry.ts:199][E: packages/opencode/src/tool/registry.ts:220]

V2 builtins 列表没有 `invalid` entry[I]；V2 registry 对 unknown tool name 直接返回 error result，如 `Unknown tool: <name>` 或 `Stale tool call: <name>`。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:43][E: packages/core/src/tool/registry.ts:52][E: packages/core/src/tool/registry.ts:56][E: packages/core/src/tool/registry.ts:60][E: packages/core/src/tool/registry.ts:118]

## 2 用途定位

InvalidTool 的用途不是让模型主动调用，而是 V1 `LLM.stream` 的 AI SDK `experimental_repairToolCall` fallback。description 写 `Do not use`，V1 request 的 `activeTools` 排除 `"invalid"`；repair 先尝试把 tool name 小写化匹配已有工具，如果仍无法修复，就构造 `{ tool, error }` input 并把 `toolName` 改为 `"invalid"`。[E: packages/opencode/src/tool/invalid.ts:12][E: packages/opencode/src/session/llm.ts:317][E: packages/opencode/src/session/llm.ts:296][E: packages/opencode/src/session/llm.ts:297][E: packages/opencode/src/session/llm.ts:298][E: packages/opencode/src/session/llm.ts:306][E: packages/opencode/src/session/llm.ts:307][E: packages/opencode/src/session/llm.ts:308][E: packages/opencode/src/session/llm.ts:310]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `tool` | `string` | 是 | 无 | malformed/original tool name | 原始失败 tool name。[E: packages/opencode/src/tool/invalid.ts:5][E: packages/opencode/src/session/llm.ts:307] |
| `error` | `string` | 是 | 无 | malformed-call error message | AI SDK repair 捕获到的错误信息。[E: packages/opencode/src/tool/invalid.ts:6][E: packages/opencode/src/session/llm.ts:308] |

## 4 输出 & 大小/截断限制

InvalidTool execute 返回 title `"Invalid Tool"`，output 是固定前缀加 `params.error`，metadata 是 `{}`。[E: packages/opencode/src/tool/invalid.ts:14][E: packages/opencode/src/tool/invalid.ts:16][E: packages/opencode/src/tool/invalid.ts:17][E: packages/opencode/src/tool/invalid.ts:18] InvalidTool 没有专用截断[I]；V1 通用 wrapper 仍可处理 output bounding。[E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:141]

## 5 权限

InvalidTool 不调用 `ctx.ask`，execute 也不接收 Tool.Context；它只把 repair error 转成工具输出。[E: packages/opencode/src/tool/invalid.ts:14][E: packages/opencode/src/tool/invalid.ts:17] V1 LLM request 的 `activeTools` 显式排除了 `"invalid"`，因此它不是模型正常可主动选择的 active tool。[E: packages/opencode/src/session/llm.ts:317]

## 6 execute() 走读

1. V1 registry 初始化 invalid 并把它放进 builtin 列表，V1 LLM request 会把 `prepared.tools` 传给 AI SDK；repair fallback 可把失败 call 改写成 `"invalid"` 工具名。[E: packages/opencode/src/tool/registry.ts:199][E: packages/opencode/src/tool/registry.ts:220][E: packages/opencode/src/session/llm.ts:318][E: packages/opencode/src/session/llm.ts:310][I]
2. `experimental_repairToolCall` 如果发现 lower-case tool name 已存在，返回 lower-case repaired call。[E: packages/opencode/src/session/llm.ts:297][E: packages/opencode/src/session/llm.ts:298][E: packages/opencode/src/session/llm.ts:301]
3. lower-case repair 不适用时，repair 返回 `toolName: "invalid"`，input JSON 包含原 tool name 和 failed.error.message。[E: packages/opencode/src/session/llm.ts:304][E: packages/opencode/src/session/llm.ts:306][E: packages/opencode/src/session/llm.ts:307][E: packages/opencode/src/session/llm.ts:308][E: packages/opencode/src/session/llm.ts:310]
4. InvalidTool execute 把 error message 包成普通 tool result，让模型有机会重写下一次 tool input。[E: packages/opencode/src/tool/invalid.ts:17][I]

## 7 V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 占位工具 | 有 `InvalidTool`，且放入 builtin 列表但从 activeTools 排除。[E: packages/opencode/src/tool/registry.ts:199][E: packages/opencode/src/tool/registry.ts:220][E: packages/opencode/src/session/llm.ts:317] | 没有 invalid built-in；registry settlement 自己返回 Unknown/Stale error。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:43][E: packages/core/src/tool/registry.ts:56][E: packages/core/src/tool/registry.ts:60][I] |
| 输入错误 | V1 `Tool.define` wrapper 对 schema decode 失败会构造 tag 为 `"ToolInvalidArgumentsError"` 的 `InvalidArgumentsError`，repair fallback 可转到 invalid。[E: packages/opencode/src/tool/tool.ts:24][E: packages/opencode/src/tool/tool.ts:25][E: packages/opencode/src/tool/tool.ts:121][E: packages/opencode/src/tool/tool.ts:124][E: packages/opencode/src/session/llm.ts:310] | V2 `Tool.make` settle 时 schema decode 失败直接产生 `ToolFailure({ message: "Invalid tool input: ..." })`。[E: packages/core/src/tool/tool.ts:81][E: packages/core/src/tool/tool.ts:82] |
| 模型主动调用 | description 是 `Do not use`，activeTools 排除 invalid。[E: packages/opencode/src/tool/invalid.ts:12][E: packages/opencode/src/session/llm.ts:317] | 无 V2 equivalent。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:43][I] |

## 8 设计动机·edge·历史

InvalidTool 是 V1/AI-SDK 适配层的 repair shim，不是业务工具。这个设计避免 malformed call 直接让 provider turn 失败，而是把错误作为 tool result 送回模型，让模型在后续步骤重写参数；V2 registry 已把 unknown/stale/invalid input 作为 settlement error 处理，所以不需要同名占位工具。[E: packages/opencode/src/session/llm.ts:296][E: packages/opencode/src/session/llm.ts:310][E: packages/core/src/tool/registry.ts:52][E: packages/core/src/tool/tool.ts:82][I]

## Sources

- packages/opencode/src/tool/invalid.ts
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/session/llm.ts
- packages/opencode/src/tool/tool.ts
- packages/core/src/tool/registry.ts
- packages/core/src/tool/tool.ts
- packages/core/src/tool/builtins.ts

## 相关

- [V1 工具系统](../../subsystems/tools/v1.md)
