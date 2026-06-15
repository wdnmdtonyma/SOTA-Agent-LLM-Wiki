---
id: tool.web-search
path: surface/tools/web-search.md
title: WebSearch
kind: tool
tier: T1
status: verified
source: [tools/WebSearchTool/WebSearchTool.ts, tools/WebSearchTool/prompt.ts, tools/WebSearchTool/UI.tsx, tools.ts]
symbols: [WebSearchTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`WebSearch` 是 server-managed web search 工具: Claude Code 本地 wrapper 不直接爬网页, 而是在一次 secondary model streaming call 中注入 Anthropic `web_search_20250305` extra tool schema, 再解析 `server_tool_use` 和 `web_search_tool_result` blocks。[E: tools/WebSearchTool/WebSearchTool.ts:76][E: tools/WebSearchTool/WebSearchTool.ts:268][E: tools/WebSearchTool/WebSearchTool.ts:284][E: tools/WebSearchTool/WebSearchTool.ts:311][E: tools/WebSearchTool/WebSearchTool.ts:369]

## 能回答的问题

- `WebSearch` 为什么是 server-managed, 而不是本地 HTTP search?
- `WebSearch` 支持哪些输入字段和 domain filtering?
- `WebSearch` 的 provider/model gating、权限和 result formatting 是什么?
- `WebSearch` 如何把 server tool progress 转成 UI progress?

## 1 Identity

- Tool name: `WebSearch`, 来自 `WEB_SEARCH_TOOL_NAME` 常量。[E: tools/WebSearchTool/prompt.ts:3][E: tools/WebSearchTool/WebSearchTool.ts:153]
- `WebSearchTool` 在 `getAllBaseTools()` 的 base tool array 中注册。[E: tools.ts:209]
- `searchHint`: `search the web for current information`。[E: tools/WebSearchTool/WebSearchTool.ts:154]
- `userFacingName()`: `Web Search`。[E: tools/WebSearchTool/WebSearchTool.ts:160]
- `maxResultSizeChars`: `100_000`。[E: tools/WebSearchTool/WebSearchTool.ts:155]
- `shouldDefer`: `true`。[E: tools/WebSearchTool/WebSearchTool.ts:156]

## 2 用途定位

`WebSearch` prompt 定位为访问 knowledge cutoff 之外的 current information, 并要求回答末尾包含 `Sources:` section 和 markdown hyperlinks。[E: tools/WebSearchTool/prompt.ts:8][E: tools/WebSearchTool/prompt.ts:11][E: tools/WebSearchTool/prompt.ts:14][E: tools/WebSearchTool/prompt.ts:16] prompt 还声明 domain filtering 支持 include/block websites, 且 Web search 只在 US available。[E: tools/WebSearchTool/prompt.ts:27][E: tools/WebSearchTool/prompt.ts:28]

`WebSearch` 的特殊性是 server-managed: `makeToolSchema()` 构造 `BetaWebSearchTool20250305` with `type: 'web_search_20250305'`, `name: 'web_search'`, domain filters 和 `max_uses: 8`; `call()` 把该 schema 放入 `extraToolSchemas`, 同时把普通 `tools` 设为空数组。[E: tools/WebSearchTool/WebSearchTool.ts:76][E: tools/WebSearchTool/WebSearchTool.ts:78][E: tools/WebSearchTool/WebSearchTool.ts:79][E: tools/WebSearchTool/WebSearchTool.ts:80][E: tools/WebSearchTool/WebSearchTool.ts:82][E: tools/WebSearchTool/WebSearchTool.ts:276][E: tools/WebSearchTool/WebSearchTool.ts:284]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `query` | `string.min(2)` | 是 | 无 | Search query。[E: tools/WebSearchTool/WebSearchTool.ts:27] | `validateInput()` 对 empty string 返回 `Error: Missing query`, 但 schema 自身已经要求 min length 2。[E: tools/WebSearchTool/WebSearchTool.ts:235][E: tools/WebSearchTool/WebSearchTool.ts:237][E: tools/WebSearchTool/WebSearchTool.ts:240] |
| `allowed_domains` | `string[]` | 否 | `undefined` | 只包含这些 domains 的结果。[E: tools/WebSearchTool/WebSearchTool.ts:28][E: tools/WebSearchTool/WebSearchTool.ts:31] | 不能和 `blocked_domains` 同时提供。[E: tools/WebSearchTool/WebSearchTool.ts:244] |
| `blocked_domains` | `string[]` | 否 | `undefined` | 排除这些 domains 的结果。[E: tools/WebSearchTool/WebSearchTool.ts:32][E: tools/WebSearchTool/WebSearchTool.ts:35] | 不能和 `allowed_domains` 同时提供, 否则 errorCode 2。[E: tools/WebSearchTool/WebSearchTool.ts:244][E: tools/WebSearchTool/WebSearchTool.ts:248][E: tools/WebSearchTool/WebSearchTool.ts:249] |

## 4 输出 & maxResultSizeChars

输出包含 `query`、`results` 和 `durationSeconds`; `results` 是 `SearchResult` object 或 summary string 的数组。[E: tools/WebSearchTool/WebSearchTool.ts:56][E: tools/WebSearchTool/WebSearchTool.ts:60][E: tools/WebSearchTool/WebSearchTool.ts:62] `SearchResult` object 包含 `tool_use_id` 和 search hit array, 每个 hit 有 `title` 和 `url`。[E: tools/WebSearchTool/WebSearchTool.ts:43][E: tools/WebSearchTool/WebSearchTool.ts:48][E: tools/WebSearchTool/WebSearchTool.ts:50]

`makeOutputFromSearchResponse()` 把 `web_search_tool_result` 成功 content 映射成 `{ title, url }` hits, 把非数组 error content 映射成 `Web search error: <error_code>` string, 并保留 text blocks 作为 summary string。[E: tools/WebSearchTool/WebSearchTool.ts:115][E: tools/WebSearchTool/WebSearchTool.ts:118][E: tools/WebSearchTool/WebSearchTool.ts:124][E: tools/WebSearchTool/WebSearchTool.ts:125][E: tools/WebSearchTool/WebSearchTool.ts:131][E: tools/WebSearchTool/WebSearchTool.ts:142]

`mapToolResultToToolResultBlockParam()` 为模型构造 plain text result: 先写 query, string entry 原样追加, result object 写 `Links: <json>`, 最后强制追加 sources reminder。[E: tools/WebSearchTool/WebSearchTool.ts:401][E: tools/WebSearchTool/WebSearchTool.ts:404][E: tools/WebSearchTool/WebSearchTool.ts:413][E: tools/WebSearchTool/WebSearchTool.ts:419][E: tools/WebSearchTool/WebSearchTool.ts:426]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isEnabled()` | provider/model dependent | firstParty 和 foundry 直接 enabled; vertex 只在 model 包含 `claude-opus-4`、`claude-sonnet-4` 或 `claude-haiku-4` 时 enabled; 其它 provider disabled。[E: tools/WebSearchTool/WebSearchTool.ts:168][E: tools/WebSearchTool/WebSearchTool.ts:173][E: tools/WebSearchTool/WebSearchTool.ts:178][E: tools/WebSearchTool/WebSearchTool.ts:180][E: tools/WebSearchTool/WebSearchTool.ts:184][E: tools/WebSearchTool/WebSearchTool.ts:188][E: tools/WebSearchTool/WebSearchTool.ts:192] |
| `isReadOnly()` | `true` | 源码直接返回 `true`。[E: tools/WebSearchTool/WebSearchTool.ts:203] |
| `isConcurrencySafe()` | `true` | 源码直接返回 `true`。[E: tools/WebSearchTool/WebSearchTool.ts:200] |
| `isDestructive` | 默认 `false` | `WebSearchTool` 未声明 `isDestructive`; `buildTool` 默认 false。[E: tools/WebSearchTool/WebSearchTool.ts:152][E: Tool.ts:761] |
| `shouldDefer` | `true` | 工具定义显式设置。[E: tools/WebSearchTool/WebSearchTool.ts:156] |
| `toAutoClassifierInput(input)` | `input.query` | Auto classifier input 只取 search query。[E: tools/WebSearchTool/WebSearchTool.ts:206] |
| `extractSearchText()` | `''` | 源码返回空字符串, 防止 UI search index 收录未显示的 `results[]` content。[E: tools/WebSearchTool/WebSearchTool.ts:229][E: tools/WebSearchTool/WebSearchTool.ts:233] |

## 6 权限

`checkPermissions()` 返回 `behavior: 'passthrough'`, message 是 `WebSearchTool requires permission.`, suggestion 是把 `WebSearch` allow rule 写到 `localSettings`。[E: tools/WebSearchTool/WebSearchTool.ts:209][E: tools/WebSearchTool/WebSearchTool.ts:211][E: tools/WebSearchTool/WebSearchTool.ts:212][E: tools/WebSearchTool/WebSearchTool.ts:216][E: tools/WebSearchTool/WebSearchTool.ts:218]

## 7 call() 走读

`call()` 先创建一条 user message: `Perform a web search for the query: ${query}`。[E: tools/WebSearchTool/WebSearchTool.ts:254][E: tools/WebSearchTool/WebSearchTool.ts:257] 它根据 GrowthBook feature `tengu_plum_vx3` 决定是否用 small fast model 且强制 `toolChoice: { type: 'tool', name: 'web_search' }`; 否则沿用 main loop model 和 thinking config。[E: tools/WebSearchTool/WebSearchTool.ts:262][E: tools/WebSearchTool/WebSearchTool.ts:273][E: tools/WebSearchTool/WebSearchTool.ts:280][E: tools/WebSearchTool/WebSearchTool.ts:281]

`queryModelWithStreaming()` 的 options 设置 `querySource: 'web_search_tool'`, `extraToolSchemas: [toolSchema]`, `mcpTools: []`, `tools: []`; 这说明 web search 是通过 provider/server tool schema 执行, 不是本地 registered tool 再递归调用。[E: tools/WebSearchTool/WebSearchTool.ts:268][E: tools/WebSearchTool/WebSearchTool.ts:276][E: tools/WebSearchTool/WebSearchTool.ts:284][E: tools/WebSearchTool/WebSearchTool.ts:285][E: tools/WebSearchTool/WebSearchTool.ts:287]

stream loop 收集 assistant message content blocks; 当 stream event 的 content block 是 `server_tool_use` 时记录 `currentToolUseId`, 当 `input_json_delta` 累积出完整 query field 时发 `query_update` progress。[E: tools/WebSearchTool/WebSearchTool.ts:299][E: tools/WebSearchTool/WebSearchTool.ts:301][E: tools/WebSearchTool/WebSearchTool.ts:307][E: tools/WebSearchTool/WebSearchTool.ts:311][E: tools/WebSearchTool/WebSearchTool.ts:327][E: tools/WebSearchTool/WebSearchTool.ts:336][E: tools/WebSearchTool/WebSearchTool.ts:347][E: tools/WebSearchTool/WebSearchTool.ts:350] 当 stream event 的 content block 是 `web_search_tool_result` 时, wrapper 发 `search_results_received` progress, 其中 `resultCount` 来自 result content length。[E: tools/WebSearchTool/WebSearchTool.ts:365][E: tools/WebSearchTool/WebSearchTool.ts:369][E: tools/WebSearchTool/WebSearchTool.ts:377][E: tools/WebSearchTool/WebSearchTool.ts:380][E: tools/WebSearchTool/WebSearchTool.ts:381]

stream 结束后, `call()` 用 `makeOutputFromSearchResponse(allContentBlocks, query, durationSeconds)` 生成 data 并返回。[E: tools/WebSearchTool/WebSearchTool.ts:391][E: tools/WebSearchTool/WebSearchTool.ts:394][E: tools/WebSearchTool/WebSearchTool.ts:399]

## 8 渲染

`renderToolUseMessage()` 非空 query 时显示 `"query"`; verbose 模式追加 allowed 或 blocked domains。[E: tools/WebSearchTool/UI.tsx:38][E: tools/WebSearchTool/UI.tsx:43][E: tools/WebSearchTool/UI.tsx:45][E: tools/WebSearchTool/UI.tsx:47][E: tools/WebSearchTool/UI.tsx:50] progress UI 对 `query_update` 显示 `Searching: <query>`, 对 `search_results_received` 显示 result count 和 query。[E: tools/WebSearchTool/UI.tsx:64][E: tools/WebSearchTool/UI.tsx:66][E: tools/WebSearchTool/UI.tsx:69][E: tools/WebSearchTool/UI.tsx:72] result UI 只显示 `Did N searches in X`, search count 来自非 string result object 的数量。[E: tools/WebSearchTool/UI.tsx:8][E: tools/WebSearchTool/UI.tsx:15][E: tools/WebSearchTool/UI.tsx:79][E: tools/WebSearchTool/UI.tsx:83][E: tools/WebSearchTool/UI.tsx:87]

## 9 设计动机·edge·历史

- `max_uses: 8` 是 hardcoded maximum, 因此一次 `WebSearch` wrapper 调用可以触发多个 server-side web searches, 但上限是 8。[E: tools/WebSearchTool/WebSearchTool.ts:82]
- `allowed_domains` 和 `blocked_domains` 直接传入 server tool schema, 不是 Claude Code 本地 post-filter。[E: tools/WebSearchTool/WebSearchTool.ts:80][E: tools/WebSearchTool/WebSearchTool.ts:81][I]
- `mapToolResultToToolResultBlockParam()` 的 sources reminder 是模型可见 tool result 内容的一部分, 与 prompt 中的 `Sources:` 要求形成双重提醒。[E: tools/WebSearchTool/prompt.ts:14][E: tools/WebSearchTool/WebSearchTool.ts:426][I]

## Sources

- `tools/WebSearchTool/WebSearchTool.ts`
- `tools/WebSearchTool/prompt.ts`
- `tools/WebSearchTool/UI.tsx`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.web-fetch`
