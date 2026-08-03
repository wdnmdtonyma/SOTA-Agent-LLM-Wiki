---
id: subsys.tools.codemode
title: Code Mode confined orchestration 子系统
kind: subsystem
tier: T2
v: v1
source:
  - packages/codemode/package.json
  - packages/codemode/src/index.ts
  - packages/codemode/src/codemode.ts
  - packages/codemode/src/tool.ts
  - packages/codemode/src/tool-runtime.ts
  - packages/codemode/src/tool-schema.ts
  - packages/codemode/src/interpreter/model.ts
  - packages/codemode/src/interpreter/runtime.ts
  - packages/codemode/src/openapi/index.ts
  - packages/codemode/src/openapi/spec.ts
  - packages/codemode/src/openapi/runtime.ts
  - packages/opencode/src/tool/code-mode.ts
symbols: [CodeMode, CodeMode.make, CodeMode.execute, Tool.make, OpenAPI.fromSpec, executeWithLimits]
related: [tool.execute, subsys.tools.v1, integrations.mcp-client, ref.package-index]
evidence: explicit
status: verified
updated: 89130db6b0
---

> `@opencode-ai/codemode` 是 Effect-native confined code execution package：host 显式提供 schema-described tool tree，程序在受限 JavaScript interpreter 内编排调用，没有 ambient application authority。

## 能回答的问题

- 为什么 `packages/codemode/` 值得独立 wiki 节点，而不是并入某个工具段落？
- `CodeMode.execute` 与 `CodeMode.make` 的 API/生命周期差异是什么？
- tool schema 如何跨 host/interpreter data boundary？
- catalog budget、`tools.$codemode.search` 与 namespace fairness 如何工作？
- timeout、tool-call count、output bytes 在哪一层 enforced？
- OpenAPI 3.x document 如何变成 Code Mode tools，哪些 operation 会被跳过？

## 1 职责边界与建节点判定

`packages/codemode` 的 package 名为 `@opencode-ai/codemode`，description 是 “Effect-native confined code execution over schema-described tools”，当前标记 `private: true`，root export 指向 `src/index.ts`。[E: packages/codemode/package.json:2][E: packages/codemode/package.json:4][E: packages/codemode/package.json:5][E: packages/codemode/package.json:8] `src/index.ts` 对外暴露 `CodeMode`、`Tool`、`OpenAPI` 与 `ToolError` 四组 API。[E: packages/codemode/src/index.ts:1][E: packages/codemode/src/index.ts:4]

它有独立 interpreter、standard-library adapters、tool runtime/schema、OpenAPI adapter 和 package tests，不是单个 V1 leaf helper。[E: packages/codemode/src/interpreter/runtime.ts:115][E: packages/codemode/src/tool-runtime.ts:316][E: packages/codemode/src/openapi/index.ts:39] 当前 opencode product wiring 只存在于 V1 `tool.execute` adapter，所以本节点标 `v: v1`；package API 本身不依赖 V1 session types。[E: packages/opencode/src/tool/code-mode.ts:4][E: packages/opencode/src/tool/code-mode.ts:188][I]

## 2 关键文件

| 文件 | 作用 |
|---|---|
| `src/codemode.ts` | Public schemas/types、limits、one-shot `execute`、reusable `make`。 |
| `src/interpreter/runtime.ts` | TypeScript→JavaScript parse、AST evaluator、promise/tool-call fibers、diagnostic normalization、output bounding。 |
| `src/tool.ts` / `src/tool-schema.ts` | Host tool definition；Effect Schema validation 与 render-only JSON Schema signature。 |
| `src/tool-runtime.ts` | Tool tree、plain-data boundary、catalog/search/instructions、call budget/hooks。 |
| `src/openapi/{index,spec,runtime}.ts` | OpenAPI operation planning、schema projection、auth/request/response runtime。 |
| `packages/opencode/src/tool/code-mode.ts` | V1 MCP adapter；不是 package generic API 的一部分。 |

## 3 Public 数据模型

`CodeMode.ExecutionLimits` 有三个独立 optional budget：`timeoutMs`、`maxToolCalls`、`maxOutputBytes`；不提供就没有该项 limit。[E: packages/codemode/src/codemode.ts:10][E: packages/codemode/src/codemode.ts:16] `resolveExecutionLimits` 要求 timeout 至少 1，其余两项至少 0，且都必须是 safe integer。[E: packages/codemode/src/codemode.ts:119][E: packages/codemode/src/codemode.ts:125][E: packages/codemode/src/codemode.ts:130][E: packages/codemode/src/codemode.ts:133]

`Result` 是 `Success | Failure` 的 Effect Schema union。success 带 JSON `value`、optional logs/truncated 与 admitted `toolCalls`；failure 带 normalized `Diagnostic` 和同样的 audit fields。Program/schema/tool/limit failures是 result data，不占 Effect failure channel，host interruption仍保持 interruption。[E: packages/codemode/src/codemode.ts:62][E: packages/codemode/src/codemode.ts:72][E: packages/codemode/src/codemode.ts:87][E: packages/codemode/src/codemode.ts:97][E: packages/codemode/src/codemode.ts:108][E: packages/codemode/src/interpreter/runtime.ts:3394][E: packages/codemode/src/interpreter/runtime.ts:3405]

`Tool.make` 接受 description、input、optional output 与 Effect-returning `run`。Effect Schema 会做 input decode/output encode-decode；JSON Schema 只渲染 model-visible signature，不负责 runtime validation，authorization 与 durable side effects 仍属于 host。[E: packages/codemode/src/tool.ts:33][E: packages/codemode/src/tool.ts:41][E: packages/codemode/src/tool.ts:51][E: packages/codemode/src/tool.ts:88][E: packages/codemode/src/tool.ts:95][E: packages/codemode/src/tool-schema.ts:290][E: packages/codemode/src/tool-schema.ts:298]

## 4 执行控制流

1. one-shot `CodeMode.execute(options)` 校验 reserved namespace，解析 limits，然后直接调用 `executeWithLimits`；`CodeMode.make(options)` 则预计算 tool catalog/search/instructions，返回可重复使用的 runtime。[E: packages/codemode/src/codemode.ts:137][E: packages/codemode/src/codemode.ts:142][E: packages/codemode/src/codemode.ts:146][E: packages/codemode/src/codemode.ts:157]
2. `parseProgram` 先把 body 包进 implicit async function 交给 TypeScript transpiler，再用 Acorn 解析允许 top-level return/await 的 script AST；parse diagnostics 规范化为 `ParseError`。[E: packages/codemode/src/interpreter/runtime.ts:115][E: packages/codemode/src/interpreter/runtime.ts:127][E: packages/codemode/src/interpreter/runtime.ts:133][E: packages/codemode/src/interpreter/runtime.ts:142]
3. `Interpreter` 只 seed explicit globals 与 `tools` reference；它保存的是 tool path reference 与 invoke/keys callbacks，不持有 host tool tree 本体。[E: packages/codemode/src/interpreter/runtime.ts:602][E: packages/codemode/src/interpreter/runtime.ts:604][E: packages/codemode/src/interpreter/runtime.ts:607][E: packages/codemode/src/interpreter/runtime.ts:622][E: packages/codemode/src/interpreter/runtime.ts:651]
4. tool call 在 call site 立即 fork supervised child fiber，并受 concurrency semaphore 限制；未 await 的 pending settlement 会在 program completion 时 drain，未观察到的 failure 会成为明确的 unhandled-rejection diagnostic。[E: packages/codemode/src/interpreter/runtime.ts:611][E: packages/codemode/src/interpreter/runtime.ts:628][E: packages/codemode/src/interpreter/runtime.ts:705][E: packages/codemode/src/interpreter/runtime.ts:713][E: packages/codemode/src/interpreter/runtime.ts:726][E: packages/codemode/src/interpreter/runtime.ts:738]
5. `ToolRuntime.make` 在调用前复制/验证 plain data、record call budget、执行 input decode 与 start hook；settle 后 decode output，并用 end hook记录 success/failure。[E: packages/codemode/src/tool-runtime.ts:748][E: packages/codemode/src/tool-runtime.ts:768][E: packages/codemode/src/tool-runtime.ts:771][E: packages/codemode/src/tool-runtime.ts:791][E: packages/codemode/src/tool-runtime.ts:796]
6. 最终 result 再经过 data-boundary copy。配置 timeout 时用 `Effect.timeoutOrElse` 返回 `TimeoutExceeded`；配置 `maxOutputBytes` 时才调用 `boundOutput`，超限标 `truncated: true` 而不把成功改为失败。[E: packages/codemode/src/interpreter/runtime.ts:3366][E: packages/codemode/src/interpreter/runtime.ts:3375][E: packages/codemode/src/interpreter/runtime.ts:3378][E: packages/codemode/src/interpreter/runtime.ts:3389][E: packages/codemode/src/interpreter/runtime.ts:3405][E: packages/codemode/src/interpreter/runtime.ts:3427]

## 5 Tool discovery

runtime 会递归 tool tree 生成 dotted path 与 TypeScript signature。[E: packages/codemode/src/tool-runtime.ts:316][E: packages/codemode/src/tool-runtime.ts:332] catalog 默认只给完整 entries 约 2,000 estimated tokens；每个 namespace 总会列出 count，full signatures 按 namespace round-robin 尝试装入 budget，避免一个大 namespace 吞完额度。[E: packages/codemode/src/tool-runtime.ts:85][E: packages/codemode/src/tool-runtime.ts:495][E: packages/codemode/src/tool-runtime.ts:527][E: packages/codemode/src/tool-runtime.ts:532][E: packages/codemode/src/tool-runtime.ts:536]

`tools.$codemode.search` 始终注册，但只有 catalog partial 时才在 instructions 中广告。search 支持 query、namespace、limit、offset；score 按 exact path/segment、path substring、description、searchable schema text 累加，结果按 score 后 path 排序。[E: packages/codemode/src/tool-runtime.ts:386][E: packages/codemode/src/tool-runtime.ts:410][E: packages/codemode/src/tool-runtime.ts:437][E: packages/codemode/src/tool-runtime.ts:451][E: packages/codemode/src/tool-runtime.ts:475][E: packages/codemode/src/tool-runtime.ts:620][E: packages/codemode/src/tool-runtime.ts:638] host 不能占用 `$codemode` 顶层 namespace。[E: packages/codemode/src/tool-runtime.ts:478][E: packages/codemode/src/tool-runtime.ts:480]

## 6 OpenAPI adapter

`OpenAPI.fromSpec` 同步遍历 OpenAPI paths/HTTP methods，每个 representable operation 生成一个 `Tool.make` definition，并返回 `{ tools, skipped }`；auth resolver只在 host side使用，不进入 model-visible schema。[E: packages/codemode/src/openapi/index.ts:39][E: packages/codemode/src/openapi/index.ts:50][E: packages/codemode/src/openapi/index.ts:105][E: packages/codemode/src/openapi/index.ts:115]

operation/server/input/security/output 任一不能安全表示时会进入 `skipped`，而不是产生半工作的 tool。[E: packages/codemode/src/openapi/index.ts:62][E: packages/codemode/src/openapi/index.ts:74][E: packages/codemode/src/openapi/index.ts:78][E: packages/codemode/src/openapi/index.ts:85] WebSocket、SSE 与 binary responses 当前明确不支持。[E: packages/codemode/src/openapi/spec.ts:311][E: packages/codemode/src/openapi/spec.ts:321][E: packages/codemode/src/openapi/spec.ts:327]

runtime 在 auth resolution 前先验证/构造 model-controlled URL/body/headers/query；非 2xx response 变成带 status 与截断 body summary 的 safe tool failure，response body 上限 50 MiB。[E: packages/codemode/src/openapi/runtime.ts:8][E: packages/codemode/src/openapi/runtime.ts:9][E: packages/codemode/src/openapi/runtime.ts:15][E: packages/codemode/src/openapi/runtime.ts:17][E: packages/codemode/src/openapi/runtime.ts:36][E: packages/codemode/src/openapi/runtime.ts:45][E: packages/codemode/src/openapi/runtime.ts:60][E: packages/codemode/src/openapi/runtime.ts:67][E: packages/codemode/src/openapi/runtime.ts:297][E: packages/codemode/src/openapi/runtime.ts:303][E: packages/codemode/src/openapi/runtime.ts:304]

## 7 设计权衡与 gotchas

- confinement 依赖 interpreter allowlist + explicit host tool tree；它不是 OS sandbox。没有 ambient `fetch`/process/filesystem authority，但 host tool 的 `run` 自己仍可拥有 Effect services，permission必须由 host adapter实施。[E: packages/codemode/src/codemode.ts:40][E: packages/codemode/src/tool.ts:41][E: packages/codemode/src/tool-runtime.ts:604][E: packages/codemode/src/tool-runtime.ts:609][I]
- plain-data boundary 限制深度为 32，拒绝 circular values、blocked `__proto__/constructor/prototype` members 与 un-awaited promise data，从而不把 opaque host objects泄漏到解释器。[E: packages/codemode/src/tool-runtime.ts:122][E: packages/codemode/src/tool-runtime.ts:152][E: packages/codemode/src/tool-runtime.ts:181][E: packages/codemode/src/tool-runtime.ts:204][E: packages/codemode/src/tool-runtime.ts:205]
- output limit 默认不是隐含安全上限；host不传 `maxOutputBytes` 就不做 package-level bounding。[E: packages/codemode/src/codemode.ts:16][E: packages/codemode/src/interpreter/runtime.ts:3405]
- OpenAPI redirect policy由注入的 `HttpClient` 所有；adapter会加 auth header/query，但源码没有在此层声明跨 origin redirect stripping。[E: packages/codemode/src/openapi/runtime.ts:17][E: packages/codemode/src/openapi/runtime.ts:23][I]

## Sources

- packages/codemode/package.json
- packages/codemode/src/index.ts
- packages/codemode/src/codemode.ts
- packages/codemode/src/tool.ts
- packages/codemode/src/tool-runtime.ts
- packages/codemode/src/tool-schema.ts
- packages/codemode/src/interpreter/model.ts
- packages/codemode/src/interpreter/runtime.ts
- packages/codemode/src/openapi/index.ts
- packages/codemode/src/openapi/spec.ts
- packages/codemode/src/openapi/runtime.ts
- packages/opencode/src/tool/code-mode.ts

## 相关

- [Execute / Code Mode 工具](../../surface/tools/execute.md)
- [V1 工具系统](v1.md)
- [MCP 客户端](../integrations/mcp-client.md)
- [Package Index](../../reference/package-index.md)
