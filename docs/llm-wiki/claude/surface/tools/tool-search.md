---
id: tool.tool-search
title: ToolSearch
kind: tool
tier: T1
path: surface/tools/tool-search.md
status: verified
source: [tools/ToolSearchTool/ToolSearchTool.ts, tools/ToolSearchTool/constants.ts, tools/ToolSearchTool/prompt.ts, utils/toolSearch.ts, utils/api.ts, services/api/claude.ts, tools.ts, Tool.ts]
symbols: [ToolSearchTool, isDeferredTool, TOOL_SEARCH_TOOL_NAME]
related: [subsys.tool-system]
updated: 2026-06-14
evidence: explicit
---

`ToolSearch` 是 dynamic tool loading 的检索工具:它自己必须先暴露给模型, 然后通过 `tool_reference` 结果把 deferred tools 的完整 schema 拉进后续 API request, 这和普通工具直接返回文本或结构化业务结果不同。[E: tools/ToolSearchTool/constants.ts:1][E: tools/ToolSearchTool/ToolSearchTool.ts:304][E: tools/ToolSearchTool/ToolSearchTool.ts:466][E: services/api/claude.ts:1154]

## 能回答的问题

- `ToolSearch` 和普通工具调用有什么差异?
- 什么工具会进入 deferred tool pool?
- `select:<tool>` 与 keyword query 分别怎样匹配?
- 为什么 `ToolSearchTool` 在 `tools.ts` 中是 optimistic 注册, 但实际 deferral 在请求时决定?

## 1 Identity

- Tool name: `ToolSearch`。[E: tools/ToolSearchTool/constants.ts:1]
- `tools.ts` import `ToolSearchTool`, 并在 `isToolSearchEnabledOptimistic()` 为 true 时把它放进 `getAllBaseTools()`。[E: tools.ts:77][E: tools.ts:249]
- `isEnabled()` 返回 `isToolSearchEnabledOptimistic()`; 这个 optimistic check 只在 mode 明确 standard 或默认 first-party proxy 不支持时返回 false, definitive check 是 request-time 的 `isToolSearchEnabled()`。[E: tools/ToolSearchTool/ToolSearchTool.ts:306][E: utils/toolSearch.ts:270][E: utils/toolSearch.ts:385]
- `isReadOnly()` 和 `isConcurrencySafe()` 都返回 true。[E: tools/ToolSearchTool/ToolSearchTool.ts:309][E: tools/ToolSearchTool/ToolSearchTool.ts:312]
- `maxResultSizeChars`: `100_000`。[E: tools/ToolSearchTool/ToolSearchTool.ts:315]
- `description()` 和 `prompt()` 都返回 `getPrompt()`。[E: tools/ToolSearchTool/ToolSearchTool.ts:317][E: tools/ToolSearchTool/ToolSearchTool.ts:320]

## 2 用途定位

`ToolSearch` 的 prompt 说它用于 fetch full schema definitions for deferred tools, 因为在 fetched 之前只有工具名已知, 没有 parameter schema, 因而不能像普通工具一样直接调用。[E: tools/ToolSearchTool/prompt.ts:27][E: tools/ToolSearchTool/prompt.ts:44] prompt 定义三种 query forms: `select:Read,Edit,Grep` 精确选择、keyword search、`+term` required term search。[E: tools/ToolSearchTool/prompt.ts:48][E: tools/ToolSearchTool/prompt.ts:49][E: tools/ToolSearchTool/prompt.ts:50][E: tools/ToolSearchTool/prompt.ts:51]

普通工具的 schema 由 `toolToAPISchema()` 直接转成 API tool definition; ToolSearch 模式下, request-time overlay 可以给 deferred tool schema 加 `defer_loading: true`, 同时 `ToolSearchTool` 结果返回 `tool_reference` blocks 而不是普通业务文本。[E: utils/api.ts:119][E: utils/api.ts:224][E: utils/api.ts:225][E: tools/ToolSearchTool/ToolSearchTool.ts:462][E: tools/ToolSearchTool/ToolSearchTool.ts:466]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `query` | `string` | 是 | 无 | 搜索 deferred tools; `select:<tool_name>` 表示 direct selection, 普通 keywords 表示 search。[E: tools/ToolSearchTool/ToolSearchTool.ts:23][E: tools/ToolSearchTool/ToolSearchTool.ts:26] |
| `max_results` | `number` | 否 | `5` | keyword search 最多返回多少条, schema default 为 5。[E: tools/ToolSearchTool/ToolSearchTool.ts:28][E: tools/ToolSearchTool/ToolSearchTool.ts:31] |

## 4 输出 & maxResultSizeChars

输出包含 `matches`、`query`、`total_deferred_tools` 和可选 `pending_mcp_servers`。[E: tools/ToolSearchTool/ToolSearchTool.ts:37][E: tools/ToolSearchTool/ToolSearchTool.ts:39][E: tools/ToolSearchTool/ToolSearchTool.ts:40][E: tools/ToolSearchTool/ToolSearchTool.ts:41][E: tools/ToolSearchTool/ToolSearchTool.ts:42] `buildSearchResult()` 只在存在 pending MCP servers 时才把 `pending_mcp_servers` 放入 data。[E: tools/ToolSearchTool/ToolSearchTool.ts:110][E: tools/ToolSearchTool/ToolSearchTool.ts:121]

`mapToolResultToToolResultBlockParam()` 在无匹配时返回文本; 有匹配时返回 array content, 每项是 `{ type: 'tool_reference', tool_name: name }`。[E: tools/ToolSearchTool/ToolSearchTool.ts:448][E: tools/ToolSearchTool/ToolSearchTool.ts:462][E: tools/ToolSearchTool/ToolSearchTool.ts:465] 这类 `tool_reference` 是 ToolSearch 与普通工具输出的关键差异: server/API 会用这些 reference 扩展出对应 tools 的 schema, 而不是把它们当作用户可读结果文本。[E: utils/toolSearch.ts:525][E: utils/toolSearch.ts:568][E: utils/toolSearch.ts:575]

## 5 行为标志

| 标志 | 实际值 | 说明 |
| --- | --- | --- |
| `isEnabled()` | optimistic | 返回 `isToolSearchEnabledOptimistic()`, 只做 registry/availability 层判断。[E: tools/ToolSearchTool/ToolSearchTool.ts:306][E: utils/toolSearch.ts:270] |
| `isReadOnly()` | `true` | ToolSearch 不改用户文件或外部状态。[E: tools/ToolSearchTool/ToolSearchTool.ts:312] |
| `isConcurrencySafe()` | `true` | 搜索 deferred tool metadata 可并发。[E: tools/ToolSearchTool/ToolSearchTool.ts:309] |
| `shouldDefer` | 不应 deferred | `isDeferredTool()` 对 `tool.name === TOOL_SEARCH_TOOL_NAME` 直接返回 false, 因为模型必须先看到 ToolSearch 才能加载其它 deferred tools。[E: tools/ToolSearchTool/prompt.ts:70][E: tools/ToolSearchTool/prompt.ts:71] |
| `alwaysLoad` | ToolSearch 自身不依赖该字段 | `isDeferredTool()` 先检查 `tool.alwaysLoad === true` 并返回 false; 该机制主要供 MCP tools opt out deferral。[E: tools/ToolSearchTool/prompt.ts:62][E: tools/ToolSearchTool/prompt.ts:65] |
| `renderToolUseMessage()` | `null` | ToolSearch 的 tool use 在普通 UI 中不展示正文。[E: tools/ToolSearchTool/ToolSearchTool.ts:436] |
| `userFacingName` | 空字符串 | 源码返回 `''`, 更像元工具而不是用户可见动作。[E: tools/ToolSearchTool/ToolSearchTool.ts:438] |

## 6 权限

`ToolSearchTool` 没有自定义 `checkPermissions()`; `buildTool` 默认 permission result 是 allow with updated input。[I][E: Tool.ts:762][E: Tool.ts:765] `ToolSearch` 的安全边界不在 filesystem permission, 而在 request-time deferral: `isToolSearchEnabled()` 检查 model support、ToolSearchTool 是否可用、mode 和 auto threshold。[E: utils/toolSearch.ts:385][E: utils/toolSearch.ts:418][E: utils/toolSearch.ts:428][E: utils/toolSearch.ts:437]

## 7 call() 走读

`call()` 从 `options.tools` 取完整工具池, 用 `tools.filter(isDeferredTool)` 计算当前 deferred tools, 并在 deferred tool 集合变化时清空 description cache。[E: tools/ToolSearchTool/ToolSearchTool.ts:328][E: tools/ToolSearchTool/ToolSearchTool.ts:331][E: tools/ToolSearchTool/ToolSearchTool.ts:332] pending MCP servers 从 `getAppState().mcp.clients` 中筛出 `type === 'pending'` 的 client name, 只在无匹配等场景返回给模型。[E: tools/ToolSearchTool/ToolSearchTool.ts:335][E: tools/ToolSearchTool/ToolSearchTool.ts:337][E: tools/ToolSearchTool/ToolSearchTool.ts:423]

`select:` query 支持 comma-separated multi-select; 对每个 name 先查 deferred tools, 再查 full tools, 找到 already-loaded tool 也会返回以避免 retry churn。[E: tools/ToolSearchTool/ToolSearchTool.ts:363][E: tools/ToolSearchTool/ToolSearchTool.ts:365][E: tools/ToolSearchTool/ToolSearchTool.ts:373][E: tools/ToolSearchTool/ToolSearchTool.ts:375] keyword search 会先处理 exact tool name fast path, 再处理 `mcp__server` prefix, 然后按 required/optional terms 对 name parts、description 和 `searchHint` 打分排序。[E: tools/ToolSearchTool/ToolSearchTool.ts:199][E: tools/ToolSearchTool/ToolSearchTool.ts:208][E: tools/ToolSearchTool/ToolSearchTool.ts:220][E: tools/ToolSearchTool/ToolSearchTool.ts:235][E: tools/ToolSearchTool/ToolSearchTool.ts:266][E: tools/ToolSearchTool/ToolSearchTool.ts:297]

## 8 渲染

`ToolSearchTool` 的 UI 渲染刻意很薄: `renderToolUseMessage()` 返回 null, `userFacingName` 为空字符串, 真正的语义在 `tool_reference` result blocks 中。[E: tools/ToolSearchTool/ToolSearchTool.ts:436][E: tools/ToolSearchTool/ToolSearchTool.ts:438][E: tools/ToolSearchTool/ToolSearchTool.ts:466] 在 fullscreen env enabled 时, `collapseReadSearch` 会把 ToolSearch 视作 absorbed silently 的 meta-operation, 不让它打断 search/read collapse group。[E: utils/collapseReadSearch.ts:180][E: utils/collapseReadSearch.ts:182][E: utils/collapseReadSearch.ts:191]

## 9 设计动机·edge·历史

- Deferred tool 判定规则是: `alwaysLoad` 先 opt out; MCP tools 总是 deferred; ToolSearch 自身永不 deferred;某些 first-turn 必须可见的工具如 fork-first Agent、Brief、SendUserFile 在特定 gate 下也 opt out;最后才用 `tool.shouldDefer === true`。[E: tools/ToolSearchTool/prompt.ts:62][E: tools/ToolSearchTool/prompt.ts:68][E: tools/ToolSearchTool/prompt.ts:71][E: tools/ToolSearchTool/prompt.ts:76][E: tools/ToolSearchTool/prompt.ts:89][E: tools/ToolSearchTool/prompt.ts:99][E: tools/ToolSearchTool/prompt.ts:107]
- `services/api/claude.ts` 在每次 request 中做 definitive `isToolSearchEnabled()`; 开启时, deferred tools 只有在 message history 中出现过 `tool_reference` 才进入 `filteredTools`, ToolSearch 自身始终保留以便继续发现更多工具。[E: services/api/claude.ts:1120][E: services/api/claude.ts:1158][E: services/api/claude.ts:1160][E: services/api/claude.ts:1163][E: services/api/claude.ts:1166]
- ToolSearch 模式会添加 beta header, 并用 `toolToAPISchema(..., { deferLoading: willDefer(tool) })` 给被 deferred 的 schema 标记 `defer_loading`。[E: services/api/claude.ts:1177][E: services/api/claude.ts:1235][E: services/api/claude.ts:1243][E: utils/api.ts:225]
- 当 ToolSearch 未开启时, API 层会移除 `ToolSearchTool`, 并从 message history 中 strip `tool_reference` blocks/caller fields, 防止不支持 tool_reference 的模型或 provider 报错。[E: services/api/claude.ts:1168][E: services/api/claude.ts:1283][E: services/api/claude.ts:1287][E: services/api/claude.ts:1290]

## Sources

- `tools/ToolSearchTool/ToolSearchTool.ts`
- `tools/ToolSearchTool/constants.ts`
- `tools/ToolSearchTool/prompt.ts`
- `utils/toolSearch.ts`
- `utils/api.ts`
- `services/api/claude.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `subsys.tool-system`
