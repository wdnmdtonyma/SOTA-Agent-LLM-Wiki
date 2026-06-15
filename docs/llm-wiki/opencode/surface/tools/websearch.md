---
id: tool.websearch
title: WebSearch 工具(Exa/Parallel)
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/websearch.ts, packages/opencode/src/tool/mcp-websearch.ts, packages/opencode/src/tool/websearch.txt, packages/opencode/src/tool/registry.ts, packages/opencode/src/effect/runtime-flags.ts, packages/core/src/tool/websearch.ts, packages/core/src/tool/builtins.ts]
symbols: [WebSearchTool, selectWebSearchProvider, webSearchEnabled, McpWebSearch]
related: [ref.tool-catalog]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> WebSearch 工具是 opencode 的本地 web search provider 工具；V1 通过 registry gate 按 provider/flags 暴露，V2 core 内建保留 Exa/Parallel MCP-JSON 调用以实现 launch parity。

## 能回答的问题

- V1 `websearch` 什么时候会出现在工具列表里？
- V1 `selectWebSearchProvider()` 如何在 Exa 与 Parallel 之间选择？
- WebSearch 调 Exa/Parallel 的 MCP-JSON payload 长什么样？
- V2 WebSearch 的字段限制与响应大小上限是什么？
- V2 本地 WebSearch 与 provider-hosted web search 是同一个东西吗？

## V1

### 1 Identity

V1 `WebSearchTool` 通过 `Tool.define("websearch", ...)` 注册，`ToolRegistry` 初始化 `websearch` 并加入 builtin 列表。[E: packages/opencode/src/tool/websearch.ts:99][E: packages/opencode/src/tool/websearch.ts:100][E: packages/opencode/src/tool/registry.ts:100][E: packages/opencode/src/tool/registry.ts:209][E: packages/opencode/src/tool/registry.ts:231] 但 V1 registry 后续会过滤：只有 `webSearchEnabled(input.providerID, { exa: flags.enableExa, parallel: flags.enableParallel })` 为 true 时才把 `websearch` 暴露给模型。[E: packages/opencode/src/tool/registry.ts:269][E: packages/opencode/src/tool/registry.ts:270]

### 2 用途定位

V1 WebSearch 用于查找知识截止后或 current events 信息；prompt 会把当前年份插入 `{{year}}`，要求模型搜索 recent/current 信息时使用当前年份。[E: packages/opencode/src/tool/websearch.txt:2][E: packages/opencode/src/tool/websearch.txt:4][E: packages/opencode/src/tool/websearch.txt:13][E: packages/opencode/src/tool/websearch.ts:107]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `query` | `string` | 是 | 无 | 无额外 schema 约束 | 搜索 query。[E: packages/opencode/src/tool/websearch.ts:11] |
| `numResults` | optional `number` | 否 | Exa payload 默认 `8` | V1 schema 未限制最大值 | Exa 返回结果数量。[E: packages/opencode/src/tool/websearch.ts:12][E: packages/opencode/src/tool/websearch.ts:91] |
| `livecrawl` | optional `"fallback" | "preferred"` | 否 | `"fallback"` | Exa live crawl mode。[E: packages/opencode/src/tool/websearch.ts:15][E: packages/opencode/src/tool/websearch.ts:92] |
| `type` | optional `"auto" | "fast" | "deep"` | 否 | `"auto"` | Exa search type。[E: packages/opencode/src/tool/websearch.ts:19][E: packages/opencode/src/tool/websearch.ts:90] |
| `contextMaxCharacters` | optional `number` | 否 | 无本地 fallback，provider 可自行默认[I] | V1 schema 未限制最大值 | Exa context 字符数上限。[E: packages/opencode/src/tool/websearch.ts:22][E: packages/opencode/src/tool/websearch.ts:93] |

### 4 输出 & 大小/截断限制

V1 provider call 返回的 text 直接作为 `output`，如果 provider 没有返回 text，则输出 `No search results found. Please try a different query.`。[E: packages/opencode/src/tool/websearch.ts:133][E: packages/opencode/src/tool/websearch.ts:136] `Tool.define` wrapper 仍会对 result output 做 V1 通用截断。[E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:138]

### 5 权限

V1 execute 先记录 tool metadata，然后 `ctx.ask` 请求 `permission: "websearch"`，`patterns` 是 query，`always` 是 `["*"]`，metadata 包含 query、参数和 provider。[E: packages/opencode/src/tool/websearch.ts:117][E: packages/opencode/src/tool/websearch.ts:119][E: packages/opencode/src/tool/websearch.ts:120][E: packages/opencode/src/tool/websearch.ts:121][E: packages/opencode/src/tool/websearch.ts:122][E: packages/opencode/src/tool/websearch.ts:124][E: packages/opencode/src/tool/websearch.ts:125][E: packages/opencode/src/tool/websearch.ts:126][E: packages/opencode/src/tool/websearch.ts:127][E: packages/opencode/src/tool/websearch.ts:128][E: packages/opencode/src/tool/websearch.ts:129]

### 6 execute() 走读

1. `webSearchEnabled()` 的逻辑是：provider id 是 `opencode`，或 Exa flag 开启，或 Parallel flag 开启。[E: packages/opencode/src/tool/registry.ts:56][E: packages/opencode/src/tool/registry.ts:57]
2. V1 `RuntimeFlags` 把 `OPENCODE_EXPERIMENTAL`、`OPENCODE_ENABLE_EXA`、`OPENCODE_EXPERIMENTAL_EXA` 合成 `enableExa`，把 `OPENCODE_ENABLE_PARALLEL`、`OPENCODE_EXPERIMENTAL_PARALLEL` 合成 `enableParallel`。[E: packages/opencode/src/effect/runtime-flags.ts:10][E: packages/opencode/src/effect/runtime-flags.ts:31][E: packages/opencode/src/effect/runtime-flags.ts:33][E: packages/opencode/src/effect/runtime-flags.ts:34][E: packages/opencode/src/effect/runtime-flags.ts:35][E: packages/opencode/src/effect/runtime-flags.ts:36][E: packages/opencode/src/effect/runtime-flags.ts:37][E: packages/opencode/src/effect/runtime-flags.ts:38][E: packages/opencode/src/effect/runtime-flags.ts:39]
3. `selectWebSearchProvider()` 先读 `OPENCODE_WEBSEARCH_PROVIDER` override；没有 override 时优先 parallel flag，再优先 exa flag，最后用 session checksum 奇偶在 `"exa"` 和 `"parallel"` 间分流。[E: packages/opencode/src/tool/websearch.ts:30][E: packages/opencode/src/tool/websearch.ts:31][E: packages/opencode/src/tool/websearch.ts:32][E: packages/opencode/src/tool/websearch.ts:33][E: packages/opencode/src/tool/websearch.ts:34][E: packages/opencode/src/tool/websearch.ts:36]
4. Parallel provider 调 `McpWebSearch.call()` 的 tool name 是 `web_search`，payload 是 `objective`、`search_queries`、`session_id`、`model_name`，timeout 是 `25 seconds`。[E: packages/opencode/src/tool/websearch.ts:66][E: packages/opencode/src/tool/websearch.ts:67][E: packages/opencode/src/tool/websearch.ts:70][E: packages/opencode/src/tool/websearch.ts:73][E: packages/opencode/src/tool/websearch.ts:74][E: packages/opencode/src/tool/websearch.ts:75][E: packages/opencode/src/tool/websearch.ts:76][E: packages/opencode/src/tool/websearch.ts:78]
5. Exa provider 调 `web_search_exa`，payload 是 query/type/numResults/livecrawl/contextMaxCharacters，timeout 也是 `25 seconds`。[E: packages/opencode/src/tool/websearch.ts:83][E: packages/opencode/src/tool/websearch.ts:86][E: packages/opencode/src/tool/websearch.ts:89][E: packages/opencode/src/tool/websearch.ts:90][E: packages/opencode/src/tool/websearch.ts:91][E: packages/opencode/src/tool/websearch.ts:92][E: packages/opencode/src/tool/websearch.ts:93][E: packages/opencode/src/tool/websearch.ts:95]
6. `mcp-websearch.ts` 把 provider request 编码成 JSON-RPC 2.0 `tools/call`，HTTP Accept 是 `application/json, text/event-stream`，response 可以是 direct JSON 或 SSE `data: ` 行。[E: packages/opencode/src/tool/mcp-websearch.ts:31][E: packages/opencode/src/tool/mcp-websearch.ts:32][E: packages/opencode/src/tool/mcp-websearch.ts:33][E: packages/opencode/src/tool/mcp-websearch.ts:58][E: packages/opencode/src/tool/mcp-websearch.ts:60][E: packages/opencode/src/tool/mcp-websearch.ts:62][E: packages/opencode/src/tool/mcp-websearch.ts:80][E: packages/opencode/src/tool/mcp-websearch.ts:35][E: packages/opencode/src/tool/mcp-websearch.ts:36]

## V2

### 1 Identity

V2 `WebSearchTool` name 是 `"websearch"`，`BuiltInTools.locationLayer` 将 `WebSearchTool.layer` 连同 `WebSearchTool.defaultConfigLayer` 合入内建工具层。[E: packages/core/src/tool/websearch.ts:14][E: packages/core/src/tool/builtins.ts:42] V2 `BuiltInTools` 当前没有 V1 的 `webSearchEnabled()` 过滤[I]；该工具作为 core built-in 注册，然后在 execute 内选择 Exa/Parallel provider。[E: packages/core/src/tool/websearch.ts:192][E: packages/core/src/tool/websearch.ts:193][E: packages/core/src/tool/websearch.ts:199]

### 2 用途定位

V2 description 明确说这是 provider-independent local tool，后端是 Exa 或 Parallel；provider-hosted web search tools 是独立概念，由 model provider 执行。[E: packages/core/src/tool/websearch.ts:28][E: packages/core/src/tool/websearch.ts:30]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `query` | `string` | 是 | 无 | 无额外 schema 约束 | 搜索 query。[E: packages/core/src/tool/websearch.ts:37] |
| `numResults` | optional positive int | 否 | Exa payload 默认 `8` | `<= 20` | 结果数量。[E: packages/core/src/tool/websearch.ts:18][E: packages/core/src/tool/websearch.ts:38][E: packages/core/src/tool/websearch.ts:216] |
| `livecrawl` | optional `"fallback" | "preferred"` | 否 | `"fallback"` | Exa live crawl mode。[E: packages/core/src/tool/websearch.ts:41][E: packages/core/src/tool/websearch.ts:217] |
| `type` | optional `"auto" | "fast" | "deep"` | 否 | `"auto"` | Exa search type。[E: packages/core/src/tool/websearch.ts:45][E: packages/core/src/tool/websearch.ts:215] |
| `contextMaxCharacters` | optional positive int | 否 | 无本地 fallback，provider 可自行默认[I] | `<= 50000` | Exa context 字符数上限。[E: packages/core/src/tool/websearch.ts:19][E: packages/core/src/tool/websearch.ts:48][E: packages/core/src/tool/websearch.ts:218] |

### 4 输出 & 大小/截断限制

V2 output schema 是 `{ provider, text }`，`toModelOutput` 只把 `output.text` 发成 text content。[E: packages/core/src/tool/websearch.ts:179][E: packages/core/src/tool/websearch.ts:180][E: packages/core/src/tool/websearch.ts:181][E: packages/core/src/tool/websearch.ts:197] V2 MCP response body 在 parse 前限制为 `MAX_RESPONSE_BYTES = 256 * 1024`，超限会失败。[E: packages/core/src/tool/websearch.ts:20][E: packages/core/src/tool/websearch.ts:168][E: packages/core/src/tool/websearch.ts:169]

### 5 权限

V2 WebSearch 使用 `PermissionV2.Service.assert`，`action` 是 `websearch`，`resources` 是 query，`save` 是 `["*"]`，metadata 合并 input 与 provider。[E: packages/core/src/tool/websearch.ts:14][E: packages/core/src/tool/websearch.ts:189][E: packages/core/src/tool/websearch.ts:201][E: packages/core/src/tool/websearch.ts:202][E: packages/core/src/tool/websearch.ts:203][E: packages/core/src/tool/websearch.ts:204][E: packages/core/src/tool/websearch.ts:205]

### 6 execute() 走读

1. `defaultConfigLayer` 读取 `OPENCODE_WEBSEARCH_PROVIDER` override、Exa/Parallel enable flags 与 API keys。[E: packages/core/src/tool/websearch.ts:69][E: packages/core/src/tool/websearch.ts:72][E: packages/core/src/tool/websearch.ts:75][E: packages/core/src/tool/websearch.ts:76][E: packages/core/src/tool/websearch.ts:77][E: packages/core/src/tool/websearch.ts:78]
2. `selectProvider()` 规则与 V1 对齐：override 优先，然后 Parallel flag、Exa flag，最后按 session checksum 奇偶分流。[E: packages/core/src/tool/websearch.ts:82][E: packages/core/src/tool/websearch.ts:87][E: packages/core/src/tool/websearch.ts:88][E: packages/core/src/tool/websearch.ts:89][E: packages/core/src/tool/websearch.ts:90]
3. V2 MCP request 也是 JSON-RPC 2.0 `tools/call`，POST body 里包含 `params: { name: tool, arguments: value }`。[E: packages/core/src/tool/websearch.ts:131][E: packages/core/src/tool/websearch.ts:133][E: packages/core/src/tool/websearch.ts:135][E: packages/core/src/tool/websearch.ts:155][E: packages/core/src/tool/websearch.ts:158][E: packages/core/src/tool/websearch.ts:162]
4. Exa URL 会在有 `EXA_API_KEY` 时附加 `exaApiKey` query param；Parallel 有 `PARALLEL_API_KEY` 时发送 Bearer Authorization。[E: packages/core/src/tool/websearch.ts:140][E: packages/core/src/tool/websearch.ts:142][E: packages/core/src/tool/websearch.ts:232][E: packages/core/src/tool/websearch.ts:233]
5. 任何 execute error 都会映射成 `ToolFailure({ message: "Unable to search the web for <query>" })`。[E: packages/core/src/tool/websearch.ts:240]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 门控 | `webSearchEnabled()` 要求 provider 是 `opencode` 或 Exa/Parallel flag 开启。[E: packages/opencode/src/tool/registry.ts:56][E: packages/opencode/src/tool/registry.ts:57] | V2 builtins 注册 websearch；源码没有 V1 registry 的 provider gate。[E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/websearch.ts:192][I] |
| Provider 选择 | `selectWebSearchProvider()` 使用 env override、flags、session checksum。[E: packages/opencode/src/tool/websearch.ts:31][E: packages/opencode/src/tool/websearch.ts:32][E: packages/opencode/src/tool/websearch.ts:33][E: packages/opencode/src/tool/websearch.ts:34][E: packages/opencode/src/tool/websearch.ts:36] | `selectProvider()` 使用 config override、flags、session checksum。[E: packages/core/src/tool/websearch.ts:87][E: packages/core/src/tool/websearch.ts:88][E: packages/core/src/tool/websearch.ts:89][E: packages/core/src/tool/websearch.ts:90] |
| 字段限制 | V1 `numResults` 与 `contextMaxCharacters` 是 optional number，没有 max schema check。[E: packages/opencode/src/tool/websearch.ts:12][E: packages/opencode/src/tool/websearch.ts:22] | V2 限制 `numResults <= 20`、`contextMaxCharacters <= 50000`。[E: packages/core/src/tool/websearch.ts:18][E: packages/core/src/tool/websearch.ts:38][E: packages/core/src/tool/websearch.ts:48] |
| Parallel payload | V1 会传 `model_name`。[E: packages/opencode/src/tool/websearch.ts:76] | V2 Parallel payload 只含 `objective`、`search_queries`、`session_id`，不含 model name。[E: packages/core/src/tool/websearch.ts:226][E: packages/core/src/tool/websearch.ts:227][E: packages/core/src/tool/websearch.ts:228][I] |

## 设计动机·edge·历史

V2 WebSearch 的 description 把它称为 provider-independent local tool，并明确 provider-hosted web search 是 separate，这说明 V2 暂时保留产品后端直连，而不是把所有 web search 统一进 provider route。[E: packages/core/src/tool/websearch.ts:28][E: packages/core/src/tool/websearch.ts:30][I]

## Sources

- packages/opencode/src/tool/websearch.ts
- packages/opencode/src/tool/mcp-websearch.ts
- packages/opencode/src/tool/websearch.txt
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/effect/runtime-flags.ts
- packages/core/src/tool/websearch.ts
- packages/core/src/tool/builtins.ts

## 相关

- [全工具字段 catalog](../../reference/tool-catalog.md)
