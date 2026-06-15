---
id: tool.mcp
path: surface/tools/mcp.md
title: MCPTool
kind: tool
tier: T1
status: verified
source: [tools/MCPTool/MCPTool.ts, tools/MCPTool/UI.tsx, tools/MCPTool/classifyForCollapse.ts, tools/MCPTool/prompt.ts, services/mcp/client.ts, services/mcp/mcpStringUtils.ts]
symbols: [MCPTool]
related: [subsys.mcp]
updated: 2026-06-14
evidence: explicit
---

`MCPTool` 是路由到 MCP server tool 的 meta-tool skeleton: `tools/MCPTool/MCPTool.ts` 定义通用 shape, `services/mcp/client.ts` 在 `fetchToolsForClient()` 中把每个 server-reported tool 变成具体 Claude Code `Tool`。[E: tools/MCPTool/MCPTool.ts:27][E: services/mcp/client.ts:1752][E: services/mcp/client.ts:1766][E: services/mcp/client.ts:1770]

## 能回答的问题

- `MCPTool` 为什么不是普通固定本地工具?
- MCP server tool 的 name、schema、description、permission 和 flags 在哪里覆盖?
- MCP tool call 如何映射到 `client.callTool()`、progress、timeout、URL elicitation 和 result meta?
- MCP tool result 在 UI 中如何处理 large output、image block 和 rich text?

## 1 Identity

- Skeleton name: `mcp`; runtime conversion 会用 server tool 的 fully-qualified name 覆盖 `name`。[E: tools/MCPTool/MCPTool.ts:34][E: services/mcp/client.ts:1768][E: services/mcp/client.ts:1773]
- `isMcp`: `true`, 标记它属于 MCP tool family。[E: tools/MCPTool/MCPTool.ts:28]
- `maxResultSizeChars`: `100_000`。[E: tools/MCPTool/MCPTool.ts:35]
- skeleton `description()` 和 `prompt()` 返回空字符串常量; 真实 description/prompt 在 client conversion 时使用 MCP server 的 `tool.description`。[E: tools/MCPTool/prompt.ts:2][E: tools/MCPTool/MCPTool.ts:37][E: tools/MCPTool/MCPTool.ts:41][E: services/mcp/client.ts:1786][E: services/mcp/client.ts:1790]
- fully-qualified MCP tool name 由 `buildMcpToolName(serverName, toolName)` 生成 `mcp__<normalized server>__<normalized tool>`。[E: services/mcp/mcpStringUtils.ts:50][E: services/mcp/mcpStringUtils.ts:51]

## 2 用途定位

`MCPTool` 的本地定义接受任意 input object, 因为 skeleton input schema 是 `z.object({}).passthrough()`。[E: tools/MCPTool/MCPTool.ts:14] `fetchToolsForClient()` 调用 MCP `tools/list`, sanitize result tools, 然后对每个 server tool spread `...MCPTool` 并覆盖 name、mcpInfo、description、prompt、schema、flags、permission 和 call。[E: services/mcp/client.ts:1752][E: services/mcp/client.ts:1758][E: services/mcp/client.ts:1767][E: services/mcp/client.ts:1770]

这意味着 `tool.mcp` 节点描述的是 MCP routing contract, 不是某一个具体 server 的 local implementation。[I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| arbitrary keys | `z.object({}).passthrough()` | 由 server schema 决定 | 无 | Skeleton 允许任意 object; runtime wrapper 会把 MCP server 的 `tool.inputSchema` 暴露为 `inputJSONSchema`。[E: tools/MCPTool/MCPTool.ts:14][E: services/mcp/client.ts:1813] |

MCP server tool 的 prompt 会把 description 截断到 `MAX_MCP_DESCRIPTION_LENGTH=2048` chars。[E: services/mcp/client.ts:218][E: services/mcp/client.ts:1791][E: services/mcp/client.ts:1792]

## 4 输出 & maxResultSizeChars

Skeleton output schema 是 string: `MCP tool execution result`。[E: tools/MCPTool/MCPTool.ts:17][E: tools/MCPTool/MCPTool.ts:18] Runtime wrapper 的 `call()` 返回 `data: mcpResult.content`, 并在 MCP result 带 `_meta` 或 `structuredContent` 时同时返回 `mcpMeta`。[E: services/mcp/client.ts:1897][E: services/mcp/client.ts:1899][E: services/mcp/client.ts:1901][E: services/mcp/client.ts:1904]

`callMCPTool()` 把 SDK result 送进 `processMCPResult(...)`, 并返回 `content`、`_meta` 和 `structuredContent`。[E: services/mcp/client.ts:3171][E: services/mcp/client.ts:3173][E: services/mcp/client.ts:3174][E: services/mcp/client.ts:3175] `mapToolResultToToolResultBlockParam()` 把 content 原样写入 `tool_result.content`。[E: tools/MCPTool/MCPTool.ts:70][E: tools/MCPTool/MCPTool.ts:74]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isMcp` | `true` | Skeleton 和 runtime wrapper 都设置 `isMcp: true`。[E: tools/MCPTool/MCPTool.ts:28][E: services/mcp/client.ts:1775] |
| `isReadOnly(input)` | server annotation | Runtime wrapper 返回 `tool.annotations?.readOnlyHint ?? false`。[E: services/mcp/client.ts:1798] |
| `isConcurrencySafe(input)` | server annotation | Runtime wrapper 返回 `tool.annotations?.readOnlyHint ?? false`。[E: services/mcp/client.ts:1795] |
| `isDestructive(input)` | server annotation | Runtime wrapper 返回 `tool.annotations?.destructiveHint ?? false`。[E: services/mcp/client.ts:1804] |
| `isOpenWorld(input)` | server annotation | Runtime wrapper 返回 `tool.annotations?.openWorldHint ?? false`。[E: services/mcp/client.ts:1807] |
| `alwaysLoad` | MCP `_meta` | Runtime wrapper 设置为 `tool._meta?.['anthropic/alwaysLoad'] === true`。[E: services/mcp/client.ts:1785] |
| `searchHint` | MCP `_meta` | Runtime wrapper 读取 `_meta['anthropic/searchHint']`, collapse whitespace, empty string 变成 undefined。[E: services/mcp/client.ts:1779][E: services/mcp/client.ts:1782][E: services/mcp/client.ts:1783] |
| `isSearchOrReadCommand()` | allowlist classifier | Runtime wrapper 调 `classifyMcpToolForCollapse(client.name, tool.name)`。[E: services/mcp/client.ts:1810][E: services/mcp/client.ts:1811] |

`classifyMcpToolForCollapse()` 使用 search/read allowlists; function 只返回 `SEARCH_TOOLS.has(normalized)` 与 `READ_TOOLS.has(normalized)`, 因此不在 allowlist 的 tool name 会得到 `{ isSearch:false, isRead:false }`。[E: tools/MCPTool/classifyForCollapse.ts:14][E: tools/MCPTool/classifyForCollapse.ts:142][E: tools/MCPTool/classifyForCollapse.ts:595][E: tools/MCPTool/classifyForCollapse.ts:599][E: tools/MCPTool/classifyForCollapse.ts:601][E: tools/MCPTool/classifyForCollapse.ts:602]

## 6 权限

Skeleton `checkPermissions()` 返回 `behavior: 'passthrough'` 和 `MCPTool requires permission.`。[E: tools/MCPTool/MCPTool.ts:56][E: tools/MCPTool/MCPTool.ts:58][E: tools/MCPTool/MCPTool.ts:59] Runtime wrapper 同样返回 passthrough, 但 suggestions 会写入 fully-qualified MCP tool allow rule 到 `localSettings`。[E: services/mcp/client.ts:1814][E: services/mcp/client.ts:1816][E: services/mcp/client.ts:1823][E: services/mcp/client.ts:1827][E: services/mcp/client.ts:1828]

`mcpInfo` 保存原始 serverName/toolName, 即使 `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` 让 model invocation 使用 unprefixed tool name, permission checking 仍可依赖 `mcpInfo`。[E: services/mcp/client.ts:1761][E: services/mcp/client.ts:1773][E: services/mcp/client.ts:1774][E: services/mcp/mcpStringUtils.ts:60][E: services/mcp/mcpStringUtils.ts:64]

## 7 call() 走读

Runtime wrapper `call(args, context, ..., parentMessage, onProgress)` 先提取 tool use id, 写入 `claudecode/toolUseId` meta, 并在开始时发 `mcp_progress` status `started`。[E: services/mcp/client.ts:1833][E: services/mcp/client.ts:1840][E: services/mcp/client.ts:1842][E: services/mcp/client.ts:1846][E: services/mcp/client.ts:1850][E: services/mcp/client.ts:1851] 它调用 `ensureConnectedClient(client)` 后进入 `callMCPToolWithUrlElicitationRetry(...)`, 传入 MCP tool name、args、meta、abort signal、progress bridge 和 elicitation handler。[E: services/mcp/client.ts:1862][E: services/mcp/client.ts:1863][E: services/mcp/client.ts:1866][E: services/mcp/client.ts:1867][E: services/mcp/client.ts:1868][E: services/mcp/client.ts:1874][E: services/mcp/client.ts:1880]

成功时 wrapper 发 `completed` progress 并返回 content/meta; session expired 时最多 retry 一次; 失败时发 `failed` progress, 并把 generic `Error` 或 `McpError` 包装成 telemetry-safe error。[E: services/mcp/client.ts:1884][E: services/mcp/client.ts:1888][E: services/mcp/client.ts:1897][E: services/mcp/client.ts:1914][E: services/mcp/client.ts:1915][E: services/mcp/client.ts:1925][E: services/mcp/client.ts:1950][E: services/mcp/client.ts:1962]

底层 `callMCPTool()` 用 `Promise.race` 同时跑 `client.callTool(...)` 和 wrapper timeout; SDK progress 被映射成 `mcp_progress` with `progress`、`total` 和 `progressMessage`。[E: services/mcp/client.ts:3091][E: services/mcp/client.ts:3092][E: services/mcp/client.ts:3094][E: services/mcp/client.ts:3095][E: services/mcp/client.ts:3096][E: services/mcp/client.ts:3100][E: services/mcp/client.ts:3102][E: services/mcp/client.ts:3105][E: services/mcp/client.ts:3111] MCP tool timeout 默认 `100_000_000` ms, 可由 `MCP_TOOL_TIMEOUT` env 覆盖。[E: services/mcp/client.ts:211][E: services/mcp/client.ts:224][E: services/mcp/client.ts:226][E: services/mcp/client.ts:3070]

`callMCPToolWithUrlElicitationRetry()` 对 `ErrorCode.UrlElicitationRequired` 最多处理 3 次; 它校验 error data 中的 URL elicitations, 先跑 elicitation hooks, 再通过 `handleElicitation` 或 app state queue 等用户完成, 非 accept 时返回说明文本, accept 后回到 retry loop。[E: services/mcp/client.ts:2850][E: services/mcp/client.ts:2851][E: services/mcp/client.ts:2864][E: services/mcp/client.ts:2872][E: services/mcp/client.ts:2886][E: services/mcp/client.ts:2924][E: services/mcp/client.ts:2934][E: services/mcp/client.ts:2945][E: services/mcp/client.ts:2964][E: services/mcp/client.ts:3008]

## 8 渲染

`renderToolUseMessage()` 把 input entries 渲染为 `key: jsonStringify(value)`, 在 `MCP_RICH_OUTPUT` 且非 verbose 时会截断长 value。[E: tools/MCPTool/UI.tsx:46][E: tools/MCPTool/UI.tsx:49][E: tools/MCPTool/UI.tsx:51][E: tools/MCPTool/UI.tsx:54] progress UI 没有 progress data 时显示 `Running…`; 有 `total` 时显示 progress bar 和 percentage, 没有 `total` 时显示 `progressMessage` 或 `Processing… <progress>`。[E: tools/MCPTool/UI.tsx:57][E: tools/MCPTool/UI.tsx:60][E: tools/MCPTool/UI.tsx:74][E: tools/MCPTool/UI.tsx:81][E: tools/MCPTool/UI.tsx:88]

result UI 会先尝试 Slack send compact rendering, 然后估算 tokens 并在超过 `10_000` tokens 时显示 large MCP response warning; array output 中 image block 显示 `[Image]`, text block 走 `MCPTextOutput` 或 `OutputLine`, empty output 显示 `(No content)`。[E: tools/MCPTool/UI.tsx:21][E: tools/MCPTool/UI.tsx:100][E: tools/MCPTool/UI.tsx:110][E: tools/MCPTool/UI.tsx:111][E: tools/MCPTool/UI.tsx:116][E: tools/MCPTool/UI.tsx:119][E: tools/MCPTool/UI.tsx:124][E: tools/MCPTool/UI.tsx:132]

## 9 设计动机·edge·历史

- `fetchToolsForClient()` 对 `tool._meta['anthropic/searchHint']` collapse whitespace, 是为了避免 external MCP `_meta` 中的 newline 注入 deferred-tool list。[I]
- MCP tool call 的 `mcpMeta.structuredContent` 保留给 SDK/hook 层使用; 普通 model-visible `tool_result.content` 仍来自 processed `content`。[E: services/mcp/client.ts:1897][E: services/mcp/client.ts:1904][E: tools/MCPTool/MCPTool.ts:74][I]
- URL elicitation retry 的存在说明某些 MCP server 可能要求用户打开 URL 才能完成 tool call, 这不是本地工具自身能独立完成的普通 execution path。[E: services/mcp/client.ts:2813][E: services/mcp/client.ts:2866][I]

## Sources

- `tools/MCPTool/MCPTool.ts`
- `tools/MCPTool/UI.tsx`
- `tools/MCPTool/classifyForCollapse.ts`
- `tools/MCPTool/prompt.ts`
- `services/mcp/client.ts`
- `services/mcp/mcpStringUtils.ts`

## 相关

- `subsys.mcp`
