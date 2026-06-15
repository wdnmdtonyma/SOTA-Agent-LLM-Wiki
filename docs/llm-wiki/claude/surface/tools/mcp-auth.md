---
id: tool.mcp-auth
path: surface/tools/mcp-auth.md
title: McpAuth
kind: tool
tier: T1
status: verified
source: [tools/McpAuthTool/McpAuthTool.ts, services/mcp/client.ts, services/mcp/mcpStringUtils.ts, services/mcp/auth.ts]
symbols: [McpAuthTool]
related: [subsys.mcp, subsys.auth]
updated: 2026-06-14
evidence: explicit
---

`McpAuth` 是按 MCP server 动态生成的 authentication pseudo-tool: `createMcpAuthTool(serverName, config)` 在 server `needs-auth` 时生成 `mcp__<server>__authenticate`; 对 `sse`/`http` server, 该 pseudo-tool 会启动 OAuth flow, 捕获 authorization URL, 并把 URL 放进返回 message 交给用户。[E: tools/McpAuthTool/McpAuthTool.ts:49][E: tools/McpAuthTool/McpAuthTool.ts:63][E: services/mcp/client.ts:2317][E: services/mcp/client.ts:2318][E: tools/McpAuthTool/McpAuthTool.ts:126][E: tools/McpAuthTool/McpAuthTool.ts:129][E: tools/McpAuthTool/McpAuthTool.ts:131][E: tools/McpAuthTool/McpAuthTool.ts:177][E: tools/McpAuthTool/McpAuthTool.ts:182][E: tools/McpAuthTool/McpAuthTool.ts:187]

## 能回答的问题

- `McpAuth` 为什么不是一个固定 name 的普通 tool?
- `McpAuth` 什么时候被加入 MCP tools list?
- `McpAuth.call()` 对 claude.ai connector、stdio、sse/http 分别怎么处理?
- OAuth 完成后 pseudo-tool 如何被真实 MCP tools 替换?

## 1 Identity

- Factory: `createMcpAuthTool(serverName, config)` 返回 `Tool<InputSchema, McpAuthOutput>`。[E: tools/McpAuthTool/McpAuthTool.ts:49][E: tools/McpAuthTool/McpAuthTool.ts:52]
- Tool name: `buildMcpToolName(serverName, 'authenticate')`, 即 `mcp__<normalized server>__authenticate`。[E: tools/McpAuthTool/McpAuthTool.ts:63][E: services/mcp/mcpStringUtils.ts:50][E: services/mcp/mcpStringUtils.ts:51]
- `isMcp`: `true`; `mcpInfo`: `{ serverName, toolName: 'authenticate' }`。[E: tools/McpAuthTool/McpAuthTool.ts:64][E: tools/McpAuthTool/McpAuthTool.ts:65]
- `userFacingName()`: `<serverName> - authenticate (MCP)`。[E: tools/McpAuthTool/McpAuthTool.ts:70]
- `maxResultSizeChars`: `10_000`。[E: tools/McpAuthTool/McpAuthTool.ts:71]

## 2 用途定位

`McpAuth` 描述字符串说明目标 server 已安装但需要 authentication, 调用后会收到 authorization URL, 用户完成 browser authorization 后 server 的真实 tools 会自动 available。[E: tools/McpAuthTool/McpAuthTool.ts:57][E: tools/McpAuthTool/McpAuthTool.ts:59][E: tools/McpAuthTool/McpAuthTool.ts:60] 该 pseudo-tool 在两类路径加入: cached/discovered needs-auth 时直接返回 `[createMcpAuthTool(name, config)]`, 或 connect result 是 `needs-auth` 时替代真实 tools。[E: services/mcp/client.ts:2307][E: services/mcp/client.ts:2317][E: services/mcp/client.ts:2318][E: services/mcp/client.ts:2326][E: services/mcp/client.ts:2330][E: services/mcp/client.ts:2331]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| none | `z.object({})` | 否 | `{}` | Tool call 不需要模型提供参数; serverName 和 config 已在 factory closure 中捕获。[E: tools/McpAuthTool/McpAuthTool.ts:23][E: tools/McpAuthTool/McpAuthTool.ts:49][E: tools/McpAuthTool/McpAuthTool.ts:50][E: tools/McpAuthTool/McpAuthTool.ts:51] |

## 4 输出 & maxResultSizeChars

`McpAuthOutput` 的 `status` 是 `auth_url`、`unsupported` 或 `error`, 必含 `message`, 可选 `authUrl`。[E: tools/McpAuthTool/McpAuthTool.ts:26][E: tools/McpAuthTool/McpAuthTool.ts:27][E: tools/McpAuthTool/McpAuthTool.ts:28][E: tools/McpAuthTool/McpAuthTool.ts:29] `mapToolResultToToolResultBlockParam()` 只把 `data.message` 写入 `tool_result.content`。[E: tools/McpAuthTool/McpAuthTool.ts:207][E: tools/McpAuthTool/McpAuthTool.ts:211]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isEnabled()` | `true` | 返回对象显式设置。[E: tools/McpAuthTool/McpAuthTool.ts:66] |
| `isReadOnly()` | `false` | 该 tool 会启动 OAuth flow 和后续 reconnect/state update, 源码显式 false。[E: tools/McpAuthTool/McpAuthTool.ts:68][E: tools/McpAuthTool/McpAuthTool.ts:126][E: tools/McpAuthTool/McpAuthTool.ts:142] |
| `isConcurrencySafe()` | `false` | 源码显式 false。[E: tools/McpAuthTool/McpAuthTool.ts:67] |
| `isMcp` | `true` | 返回对象显式设置。[E: tools/McpAuthTool/McpAuthTool.ts:64] |
| `toAutoClassifierInput()` | `serverName` | 返回 captured serverName。[E: tools/McpAuthTool/McpAuthTool.ts:69] |
| `shouldDefer` | 未声明 | factory 返回对象没有 `shouldDefer` 字段; 该对象不是 `buildTool(...)` 产物。[E: tools/McpAuthTool/McpAuthTool.ts:62][I] |

## 6 权限

`McpAuth` 的 `checkPermissions(input)` 直接返回 `{ behavior: 'allow', updatedInput: input }`。[E: tools/McpAuthTool/McpAuthTool.ts:82][E: tools/McpAuthTool/McpAuthTool.ts:83] 这与普通 MCP server tools 的 passthrough permission 不同, 因为该 pseudo-tool 的职责是启动 authentication flow。[I]

## 7 call() 走读

`call()` 首先处理 `claudeai-proxy`: 返回 `unsupported`, message 要求用户运行 `/mcp` 并选择对应 server authenticate。[E: tools/McpAuthTool/McpAuthTool.ts:85][E: tools/McpAuthTool/McpAuthTool.ts:89][E: tools/McpAuthTool/McpAuthTool.ts:92][E: tools/McpAuthTool/McpAuthTool.ts:93] 不是 `sse` 或 `http` transport 时也返回 `unsupported`, message 要求用户手动 `/mcp` authenticate。[E: tools/McpAuthTool/McpAuthTool.ts:101][E: tools/McpAuthTool/McpAuthTool.ts:104][E: tools/McpAuthTool/McpAuthTool.ts:105]

对于 `sse`/`http`, `call()` 创建 `authUrlPromise`, 调用 `performMCPOAuthFlow(serverName, config, onAuthorizationUrl, signal, { skipBrowserOpen: true })`, 只捕获 authorization URL 而不主动打开 browser。[E: tools/McpAuthTool/McpAuthTool.ts:118][E: tools/McpAuthTool/McpAuthTool.ts:119][E: tools/McpAuthTool/McpAuthTool.ts:126][E: tools/McpAuthTool/McpAuthTool.ts:129][E: tools/McpAuthTool/McpAuthTool.ts:131]

OAuth flow completion 在 background continuation 中处理: 成功后 `clearMcpAuthCache()`, `reconnectMcpServerImpl(serverName, config)`, 计算 `getMcpPrefix(serverName)`, 然后更新 `appState.mcp.clients/tools/commands/resources`。[E: tools/McpAuthTool/McpAuthTool.ts:137][E: tools/McpAuthTool/McpAuthTool.ts:139][E: tools/McpAuthTool/McpAuthTool.ts:140][E: tools/McpAuthTool/McpAuthTool.ts:141][E: tools/McpAuthTool/McpAuthTool.ts:142] 更新 tools/commands 时会 reject 掉 name 以该 prefix 开头的旧 entries 再追加 result tools/commands, 所以同 prefix 的 auth pseudo-tool 会被真实 MCP tools 替换。[E: tools/McpAuthTool/McpAuthTool.ts:149][E: tools/McpAuthTool/McpAuthTool.ts:150][E: tools/McpAuthTool/McpAuthTool.ts:151][E: tools/McpAuthTool/McpAuthTool.ts:153][E: tools/McpAuthTool/McpAuthTool.ts:154][E: tools/McpAuthTool/McpAuthTool.ts:155]

前台返回用 `Promise.race([authUrlPromise, oauthPromise.then(() => null)])`: 如果拿到 URL, 返回 `status: 'auth_url'`、`authUrl` 和让用户打开 URL 的 message; 如果 OAuth silent complete, 返回 `auth_url` status 和 silent completion message; catch 时返回 `status: 'error'`。[E: tools/McpAuthTool/McpAuthTool.ts:177][E: tools/McpAuthTool/McpAuthTool.ts:182][E: tools/McpAuthTool/McpAuthTool.ts:185][E: tools/McpAuthTool/McpAuthTool.ts:186][E: tools/McpAuthTool/McpAuthTool.ts:187][E: tools/McpAuthTool/McpAuthTool.ts:194][E: tools/McpAuthTool/McpAuthTool.ts:195][E: tools/McpAuthTool/McpAuthTool.ts:201]

## 8 渲染

`renderToolUseMessage()` 固定返回 `Authenticate <serverName> MCP server`。[E: tools/McpAuthTool/McpAuthTool.ts:72] `description()` 和 `prompt()` 都返回同一段 description 文本。[E: tools/McpAuthTool/McpAuthTool.ts:73][E: tools/McpAuthTool/McpAuthTool.ts:76]

## 9 设计动机·edge·历史

- needs-auth cache/discovery path 会跳过连接并直接暴露 auth pseudo-tool, 减少每次启动对必然失败 server 的 connect/auth discovery round-trip。[E: services/mcp/client.ts:2307][E: services/mcp/client.ts:2315][I]
- `claudeai-proxy` connector 走单独 auth flow, `McpAuth` 不会 programmatically 调用该 flow, 只指向 `/mcp`。[E: tools/McpAuthTool/McpAuthTool.ts:89][E: tools/McpAuthTool/McpAuthTool.ts:93][I]
- `performMCPOAuthFlow(..., { skipBrowserOpen: true })` 让模型把 URL 交给用户, 而不是本地自动打开浏览器。[E: tools/McpAuthTool/McpAuthTool.ts:131][I]

## Sources

- `tools/McpAuthTool/McpAuthTool.ts`
- `services/mcp/client.ts`
- `services/mcp/mcpStringUtils.ts`
- `services/mcp/auth.ts`

## 相关

- `subsys.mcp`
- `subsys.auth`
