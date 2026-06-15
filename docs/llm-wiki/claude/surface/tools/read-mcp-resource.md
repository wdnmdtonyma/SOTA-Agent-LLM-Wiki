---
id: tool.read-mcp-resource
path: surface/tools/read-mcp-resource.md
title: ReadMcpResource
kind: tool
tier: T1
status: verified
source: [tools/ReadMcpResourceTool/ReadMcpResourceTool.ts, tools/ReadMcpResourceTool/prompt.ts, tools/ReadMcpResourceTool/UI.tsx, services/mcp/client.ts, tools.ts]
symbols: [ReadMcpResourceTool]
related: [subsys.mcp]
updated: 2026-06-14
evidence: explicit
---

`ReadMcpResourceTool` 按 MCP server name 和 resource URI 读取单个 MCP resource; text content 直接返回, binary blob 会保存到磁盘并把 base64 blob 替换成 file path/message。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:49][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:75][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:95][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:108][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:114][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:115][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:130][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:131]

## 能回答的问题

- `ReadMcpResourceTool` 的 `server` 和 `uri` 字段如何校验?
- `ReadMcpResourceTool` 如何处理 server 不存在、未连接、不支持 resources?
- binary MCP resource 为什么不会把 base64 直接塞进 context?
- `ReadMcpResourceTool` 为什么和 `ListMcpResourcesTool` 一起动态加入?

## 1 Identity

- Tool name: `ReadMcpResourceTool`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:60]
- `ReadMcpResourceTool` 在 `getAllBaseTools()` 中注册, 但 `getTools()` 的 `specialTools` set 会剔除它。[E: tools.ts:246][E: tools.ts:301][E: tools.ts:303][E: tools.ts:307]
- MCP reconnect path 中, supports resources 且未已有 resource helper tool 时会把 `ReadMcpResourceTool` 和 `ListMcpResourcesTool` 加入 `resourceTools`。[E: services/mcp/client.ts:2182][E: services/mcp/client.ts:2185][E: services/mcp/client.ts:2189]
- `searchHint`: `read a specific MCP resource by URI`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:61]
- `userFacingName()`: `readMcpResource`。[E: tools/ReadMcpResourceTool/UI.tsx:16][E: tools/ReadMcpResourceTool/UI.tsx:17]
- `maxResultSizeChars`: `100_000`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:62]

## 2 用途定位

Prompt 描述 `ReadMcpResourceTool` 通过 server name 和 resource URI 读取 MCP server 的特定 resource。[E: tools/ReadMcpResourceTool/prompt.ts:10][E: tools/ReadMcpResourceTool/prompt.ts:11] 该工具通常与 `ListMcpResourcesTool` 配套: 先枚举 resource URI, 再读取具体 resource。[I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `server` | `string` | 是 | 无 | MCP server name。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:24] |
| `uri` | `string` | 是 | 无 | 要读取的 MCP resource URI。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:25] |

## 4 输出 & maxResultSizeChars

输出 object 包含 `contents` array; 每个 content item 有 `uri`、可选 `mimeType`、可选 `text` 和可选 `blobSavedTo`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:30][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:32][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:34][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:35][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:36][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:37]

`mapToolResultToToolResultBlockParam()` 对完整 output 做 `jsonStringify(content)` 并写入 `tool_result.content`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:151][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:155] `isResultTruncated()` 对 stringified output 调用 `isOutputLineTruncated()`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:148][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:149]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isReadOnly()` | `true` | 源码直接返回 `true`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:53] |
| `isConcurrencySafe()` | `true` | 源码直接返回 `true`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:50] |
| `shouldDefer` | `true` | 工具定义显式设置。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:59] |
| `isDestructive` | 默认 `false` | 工具定义未声明; `buildTool` 默认 false。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:49][E: Tool.ts:761] |
| `toAutoClassifierInput(input)` | `${server} ${uri}` | Auto classifier input 拼接 server 和 URI。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:56] |

## 6 权限

`ReadMcpResourceTool` 没有自定义 `checkPermissions()`, 因此 `buildTool` 默认返回 `{ behavior: 'allow', updatedInput }`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:49][E: Tool.ts:762][E: Tool.ts:766] Auto mode allowlist 显式包含字符串 `ReadMcpResourceTool`。[E: utils/permissions/classifierDecision.ts:65]

## 7 call() 走读

`call()` 从 `mcpClients` 中按 `client.name === serverName` 查找 server; 找不到时抛出 available servers error, client 非 connected 时抛出 `is not connected`, client 不支持 resources 时抛出 `does not support resources`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:75][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:78][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:80][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:82][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:86][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:87][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:90][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:91]

通过基础校验后, `call()` 先 `ensureConnectedClient(client)`, 再向 MCP server 发送 `resources/read` request, params 只包含 `uri`, response 用 `ReadResourceResultSchema` 校验。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:94][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:95][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:97][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:98][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:100]

`result.contents` 中带 `text` 的 item 会返回 `{ uri, mimeType, text }`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:106][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:108][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:109] 没有 string `blob` 的 item 只返回 `{ uri, mimeType }`。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:111][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:112] string `blob` 会 base64 decode, 调 `persistBinaryContent(...)`, 成功时返回 `blobSavedTo` 和 `getBinaryBlobSavedMessage(...)` 生成的 text, 失败时 text 写保存失败原因。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:114][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:115][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:116][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:120][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:124][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:130][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:131]

## 8 渲染

`renderToolUseMessage()` 只有在 `server` 和 `uri` 都存在时显示 `Read resource "<uri>" from server "<server>"`, 否则返回 `null`。[E: tools/ReadMcpResourceTool/UI.tsx:10][E: tools/ReadMcpResourceTool/UI.tsx:11][E: tools/ReadMcpResourceTool/UI.tsx:14] result UI 对 empty `contents` 显示 `(No content)`, 非 empty output pretty JSON 后用 `OutputLine` 渲染。[E: tools/ReadMcpResourceTool/UI.tsx:24][E: tools/ReadMcpResourceTool/UI.tsx:27][E: tools/ReadMcpResourceTool/UI.tsx:34][E: tools/ReadMcpResourceTool/UI.tsx:35]

## 9 设计动机·edge·历史

- Binary blob 被写到磁盘并替换为 path/message, 避免 base64 直接 stringified 进 context。[E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:106][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:115][E: tools/ReadMcpResourceTool/ReadMcpResourceTool.ts:130][I]
- resource helper tools 的动态加入逻辑要求任意 resource-capable MCP server 成功连接; 因此该工具的可见性依赖 MCP connection state, 不是单纯由 `getAllBaseTools()` 决定。[E: tools.ts:246][E: tools.ts:307][E: services/mcp/client.ts:2182][E: services/mcp/client.ts:2189][I]

## Sources

- `tools/ReadMcpResourceTool/ReadMcpResourceTool.ts`
- `tools/ReadMcpResourceTool/prompt.ts`
- `tools/ReadMcpResourceTool/UI.tsx`
- `services/mcp/client.ts`
- `tools.ts`
- `Tool.ts`
- `utils/permissions/classifierDecision.ts`

## 相关

- `subsys.mcp`
