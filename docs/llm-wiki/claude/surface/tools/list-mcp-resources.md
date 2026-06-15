---
id: tool.list-mcp-resources
path: surface/tools/list-mcp-resources.md
title: ListMcpResources
kind: tool
tier: T1
status: verified
source: [tools/ListMcpResourcesTool/ListMcpResourcesTool.ts, tools/ListMcpResourcesTool/prompt.ts, tools/ListMcpResourcesTool/UI.tsx, services/mcp/client.ts, tools.ts]
symbols: [ListMcpResourcesTool]
related: [subsys.mcp]
updated: 2026-06-14
evidence: explicit
---

`ListMcpResourcesTool` 列出 connected MCP servers 暴露的 resources, 可按 server name 过滤; 它是 deferred read-only helper tool, 但普通 `getTools()` 会把它从默认 built-in tool pool 中剔除, 再由 MCP resource-capable server connection 动态加入。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:40][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:66][E: tools.ts:245][E: tools.ts:301][E: tools.ts:307][E: services/mcp/client.ts:2182]

## 能回答的问题

- `ListMcpResourcesTool` 输入/输出 schema 是什么?
- 为什么 `ListMcpResourcesTool` 在 `getAllBaseTools()` 中存在, 但不总在普通 tool list 中?
- `ListMcpResourcesTool.call()` 如何处理 disconnected server、reconnect 和 per-server failure?
- empty resources 时模型实际看到什么?

## 1 Identity

- Tool name: `ListMcpResourcesTool`, 来自 `LIST_MCP_RESOURCES_TOOL_NAME`。[E: tools/ListMcpResourcesTool/prompt.ts:1][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:51]
- `ListMcpResourcesTool` 在 `getAllBaseTools()` 中注册, 但 `getTools()` 的 `specialTools` set 会剔除它。[E: tools.ts:245][E: tools.ts:301][E: tools.ts:302][E: tools.ts:307]
- MCP reconnect path 中, 当 server supports resources 且没有其它同名 resource tools 时, 会把 `ListMcpResourcesTool` 和 `ReadMcpResourceTool` 加入 `resourceTools`。[E: services/mcp/client.ts:2182][E: services/mcp/client.ts:2185][E: services/mcp/client.ts:2189]
- `searchHint`: `list resources from connected MCP servers`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:52]
- `userFacingName()`: `listMcpResources`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:103]
- `maxResultSizeChars`: `100_000`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:53]

## 2 用途定位

Prompt 描述 `ListMcpResourcesTool` 返回 configured MCP servers 的 resources, 每个 resource 会带标准 MCP resource fields 和 `server` 字段。[E: tools/ListMcpResourcesTool/prompt.ts:12][E: tools/ListMcpResourcesTool/prompt.ts:14] `server` 参数可选; 未提供时返回 all servers 的 resources。[E: tools/ListMcpResourcesTool/prompt.ts:17][E: tools/ListMcpResourcesTool/prompt.ts:18]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `server` | `string` | 否 | `undefined` | Optional server name, 用于只列某个 MCP server 的 resources。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:16][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:20] |

## 4 输出 & maxResultSizeChars

输出是 resource object array; 每个 resource 包含 `uri`、`name`、可选 `mimeType`、可选 `description` 和 `server`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:25][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:28][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:29][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:30][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:31][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:32]

`mapToolResultToToolResultBlockParam()` 在 output empty 时返回以 `No resources found.` 开头的说明文本; 非空时返回 JSON stringified resources。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:108][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:109][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:114][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:120] `isResultTruncated()` 对 `jsonStringify(output)` 调用 `isOutputLineTruncated()`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:105][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:106]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isReadOnly()` | `true` | 源码直接返回 `true`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:44] |
| `isConcurrencySafe()` | `true` | 源码直接返回 `true`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:41] |
| `shouldDefer` | `true` | 工具定义显式设置。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:50] |
| `isDestructive` | 默认 `false` | 工具定义未声明; `buildTool` 默认 `isDestructive` 为 false。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:40][E: Tool.ts:761] |
| `toAutoClassifierInput(input)` | `input.server ?? ''` | Auto classifier input 只包含 server filter。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:47] |

## 6 权限

`ListMcpResourcesTool` 没有自定义 `checkPermissions()`, 因此 `buildTool` 默认 `checkPermissions` 返回 `{ behavior: 'allow', updatedInput }`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:40][E: Tool.ts:762][E: Tool.ts:766] Auto mode allowlist 也显式包含 `LIST_MCP_RESOURCES_TOOL_NAME`。[E: utils/permissions/classifierDecision.ts:64]

## 7 call() 走读

`call(input, { options: { mcpClients } })` 读取 optional `server` filter; 有 filter 时只处理 name exact match 的 client, 无 filter 时处理所有 `mcpClients`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:66][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:67][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:69][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:71] filter 指向不存在的 server 时抛出包含 available server names 的 error。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:73][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:75]

每个 client 分支中, 非 connected client 返回空数组; connected client 先 `ensureConnectedClient(client)`, 再 `fetchResourcesForClient(fresh)`。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:84][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:86][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:88][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:89] 单个 server reconnect/fetch 失败会 `logMCPError` 并返回空数组, 不让一个 server failure sink whole result。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:90][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:92][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:93]

`fetchResourcesForClient()` 只对 connected 且 `capabilities.resources` 存在的 client 请求 MCP `resources/list`; 返回结果会给每个 resource 增加 `server: client.name`。[E: services/mcp/client.ts:2001][E: services/mcp/client.ts:2002][E: services/mcp/client.ts:2005][E: services/mcp/client.ts:2009][E: services/mcp/client.ts:2017][E: services/mcp/client.ts:2019]

## 8 渲染

`renderToolUseMessage()` 对有 server filter 的 input 显示 `List MCP resources from server "<server>"`, 否则显示 `List all MCP resources`。[E: tools/ListMcpResourcesTool/UI.tsx:9][E: tools/ListMcpResourcesTool/UI.tsx:12] result UI 对 empty output 显示 `(No resources found)`, 非 empty output 用 pretty JSON 和 `OutputLine` 渲染。[E: tools/ListMcpResourcesTool/UI.tsx:19][E: tools/ListMcpResourcesTool/UI.tsx:21][E: tools/ListMcpResourcesTool/UI.tsx:26][E: tools/ListMcpResourcesTool/UI.tsx:27]

## 9 设计动机·edge·历史

- `ListMcpResourcesTool` 从 `getTools()` 默认列表剔除, 但在 resource-capable MCP server 连接成功后动态加入; 这种两阶段装配避免没有 MCP resources 时暴露无用 helper tool。[E: tools.ts:301][E: tools.ts:307][E: services/mcp/client.ts:2182][E: services/mcp/client.ts:2189][I]
- `call()` 对 per-server failure 返回 empty list 而不是 throw, 因此多 server 场景下一个坏连接不会阻止其它 server resources 返回。[E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:90][E: tools/ListMcpResourcesTool/ListMcpResourcesTool.ts:93][I]

## Sources

- `tools/ListMcpResourcesTool/ListMcpResourcesTool.ts`
- `tools/ListMcpResourcesTool/prompt.ts`
- `tools/ListMcpResourcesTool/UI.tsx`
- `services/mcp/client.ts`
- `tools.ts`
- `Tool.ts`
- `utils/permissions/classifierDecision.ts`

## 相关

- `subsys.mcp`
