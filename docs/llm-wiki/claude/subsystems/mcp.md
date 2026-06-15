---
id: subsys.mcp
path: subsystems/mcp.md
title: MCP
kind: subsystem
tier: T2
status: verified
source: [services/mcp/]
symbols: [ScopedMcpServerConfig, MCPServerConnection, getClaudeCodeMcpConfigs, getMcpToolsCommandsAndResources, connectToServer, fetchToolsForClient, fetchCommandsForClient, fetchResourcesForClient, useManageMCPConnections, performMCPOAuthFlow]
related: [tool.mcp, tool.mcp-auth]
evidence: explicit
updated: 2026-06-14
---

> MCP 子系统负责读取和治理 MCP server config, 建立 transports, 把 MCP tools/prompts/resources 转成 Claude Code 的 Tool/Command/Resource surface, 并在 UI/headless 状态中维护连接生命周期。

## 能回答的问题

- local/user/project/enterprise/plugin/claude.ai MCP config 的 precedence 和 dedup 规则是什么?
- 一个 MCP server connection 有哪些状态?
- MCP tool 如何被包装成本地 `Tool` contract?
- list_changed notification 如何刷新 tools/prompts/resources?
- OAuth、XAA、step-up scope 和 MCP auth tool 在哪里接入?

## 职责边界

MCP 子系统负责 server config、transport、connection state、MCP protocol fetch/call 和映射为本地 tools/commands/resources; 它不负责 built-in tool catalog, 也不直接决定模型何时调用 MCP tool。MCP tools 合并进最终工具池时走 [工具系统机制](tool-system.md), 请求发送时由 [模型与 API 层](model-api.md) 转为 API tool schema。[E: services/mcp/client.ts:1743][E: services/mcp/client.ts:2226][E: tools.ts:345][I]

MCP connection state 在 interactive React tree 中由 hook 管理, 在 print/headless 模式中由 main/print path 建立 headless store 后分批写入; 两条路径共享 `getMcpToolsCommandsAndResources()` 和 fetch caches。[E: services/mcp/useManageMCPConnections.ts:143][E: main.tsx:2691][E: services/mcp/client.ts:2226][I]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `services/mcp/types.ts` | 定义 config scopes、transport schemas、server config union、connection state union、resources 和 CLI serialized state。[E: services/mcp/types.ts:10][E: services/mcp/types.ts:23][E: services/mcp/types.ts:124][E: services/mcp/types.ts:163][E: services/mcp/types.ts:221][E: services/mcp/types.ts:252] |
| `services/mcp/config.ts` | 读取各 scope MCP configs、做 env expansion、policy allow/deny、enterprise/plugin precedence、dedup 和 disabled state。[E: services/mcp/config.ts:202][E: services/mcp/config.ts:223][E: services/mcp/config.ts:281][E: services/mcp/config.ts:536][E: services/mcp/config.ts:1071][E: services/mcp/config.ts:1528] |
| `services/mcp/client.ts` | 建立 transports, fetch tools/prompts/resources, 包装 MCP tool calls, 处理大输出、session expiry、SDK MCP clients。[E: services/mcp/client.ts:595][E: services/mcp/client.ts:985][E: services/mcp/client.ts:1743][E: services/mcp/client.ts:2033][E: services/mcp/client.ts:2226][E: services/mcp/client.ts:3029][E: services/mcp/client.ts:3262] |
| `services/mcp/useManageMCPConnections.ts` | interactive lifecycle hook: 初始化 pending servers、分两阶段连接 Claude Code/claude.ai servers、批量写 AppState、处理 reconnect/toggle/list_changed。[E: services/mcp/useManageMCPConnections.ts:143][E: services/mcp/useManageMCPConnections.ts:216][E: services/mcp/useManageMCPConnections.ts:772][E: services/mcp/useManageMCPConnections.ts:858][E: services/mcp/useManageMCPConnections.ts:1046] |
| `services/mcp/MCPConnectionManager.tsx` | React context wrapper, 暴露 reconnect/toggle callbacks 给 UI。[E: services/mcp/MCPConnectionManager.tsx:7][E: services/mcp/MCPConnectionManager.tsx:38][E: services/mcp/MCPConnectionManager.tsx:48][E: services/mcp/MCPConnectionManager.tsx:64] |
| `services/mcp/auth.ts` | MCP OAuth/XAA flow、Claude auth provider、client metadata URL 和 step-up scope handling。[E: services/mcp/auth.ts:847][E: services/mcp/auth.ts:871][E: services/mcp/auth.ts:906][E: services/mcp/auth.ts:1376][E: services/mcp/auth.ts:1417][E: services/mcp/auth.ts:1445][E: services/mcp/auth.ts:1468] |

## 数据模型

`ConfigScope` 包含 local、user、project、dynamic、enterprise、claudeai、managed; `Transport` 包含 stdio、sse、sse-ide、http、ws、sdk。[E: services/mcp/types.ts:12][E: services/mcp/types.ts:13][E: services/mcp/types.ts:14][E: services/mcp/types.ts:15][E: services/mcp/types.ts:16][E: services/mcp/types.ts:17][E: services/mcp/types.ts:18][E: services/mcp/types.ts:23]

`McpServerConfigSchema` union 覆盖 stdio、SSE、SSE IDE、WebSocket IDE、HTTP、WebSocket、SDK、Claude.ai proxy; `ScopedMcpServerConfig` 在 server config 上追加 `scope` 和可选 `pluginSource`。[E: services/mcp/types.ts:28][E: services/mcp/types.ts:58][E: services/mcp/types.ts:89][E: services/mcp/types.ts:99][E: services/mcp/types.ts:108][E: services/mcp/types.ts:116][E: services/mcp/types.ts:126][E: services/mcp/types.ts:127][E: services/mcp/types.ts:128][E: services/mcp/types.ts:129][E: services/mcp/types.ts:130][E: services/mcp/types.ts:131][E: services/mcp/types.ts:132][E: services/mcp/types.ts:133][E: services/mcp/types.ts:164][E: services/mcp/types.ts:168]

`MCPServerConnection` 是 connected、failed、needs-auth、pending、disabled union; connected state 保存 SDK client、capabilities、server info、instructions、scoped config 和 cleanup function。[E: services/mcp/types.ts:181][E: services/mcp/types.ts:184][E: services/mcp/types.ts:185][E: services/mcp/types.ts:189][E: services/mcp/types.ts:190][E: services/mcp/types.ts:191][E: services/mcp/types.ts:194][E: services/mcp/types.ts:201][E: services/mcp/types.ts:207][E: services/mcp/types.ts:215][E: services/mcp/types.ts:222][E: services/mcp/types.ts:223][E: services/mcp/types.ts:224][E: services/mcp/types.ts:225][E: services/mcp/types.ts:226]

`MCPCliState` 序列化 clients、configs、tools、resources 和 normalizedNames, 用于 CLI/SDK 状态交接。[E: services/mcp/types.ts:232][E: services/mcp/types.ts:246][E: services/mcp/types.ts:253][E: services/mcp/types.ts:254][E: services/mcp/types.ts:255][E: services/mcp/types.ts:256][E: services/mcp/types.ts:257]

## 控制流

1. `getMcpServerSignature()` 用 stdio command array 或 server URL 构造 dedup signature; plugin MCP dedup 以 manual servers 优先, plugin 之间 first-loaded 优先; claude.ai connector dedup 则只用 enabled manual servers 作为 suppress target。[E: services/mcp/config.ts:202][E: services/mcp/config.ts:204][E: services/mcp/config.ts:207][E: services/mcp/config.ts:223][E: services/mcp/config.ts:246][E: services/mcp/config.ts:254][E: services/mcp/config.ts:281][E: services/mcp/config.ts:290][E: services/mcp/config.ts:300]
2. policy filtering 允许 SDK configs 直接通过, 其它 server 走 `isMcpServerAllowedByPolicy()`; env var expansion 会展开 stdio command/args/env 和 remote headers 等字段, 缺失变量产生 warning。[E: services/mcp/config.ts:536][E: services/mcp/config.ts:544][E: services/mcp/config.ts:556][E: services/mcp/config.ts:576][E: services/mcp/config.ts:577][E: services/mcp/config.ts:578][E: services/mcp/config.ts:593][E: services/mcp/config.ts:594][E: services/mcp/config.ts:1330][E: services/mcp/config.ts:1334]
3. project scope 读取当前 cwd 的 `.mcp.json`; `getMcpConfigsByScope('project')` 会沿项目路径聚合, user/local/enterprise 走各自 scope loader。[E: services/mcp/config.ts:843][E: services/mcp/config.ts:852][E: services/mcp/config.ts:854][E: services/mcp/config.ts:876][E: services/mcp/config.ts:888]
4. `getClaudeCodeMcpConfigs()` 在 enterprise MCP config 存在时只返回 enterprise filtered servers; plugin-only policy 会清空 user/project/local scopes 但保留 plugin servers; 普通 merge precedence 是 plugin < user < approved project < local, 最后再 policy filter。[E: services/mcp/config.ts:1071][E: services/mcp/config.ts:1084][E: services/mcp/config.ts:1095][E: services/mcp/config.ts:1100][E: services/mcp/config.ts:1117][E: services/mcp/config.ts:1165][E: services/mcp/config.ts:1211][E: services/mcp/config.ts:1232][E: services/mcp/config.ts:1243]
5. interactive path 的 `useManageMCPConnections()` 先把 configs 初始化为 pending/disabled 并清理 stale clients, 再启动两阶段连接: Phase 1 连接 Claude Code configs, Phase 2 等 claude.ai configs 并去重后连接。[E: services/mcp/useManageMCPConnections.ts:772][E: services/mcp/useManageMCPConnections.ts:782][E: services/mcp/useManageMCPConnections.ts:817][E: services/mcp/useManageMCPConnections.ts:858][E: services/mcp/useManageMCPConnections.ts:878][E: services/mcp/useManageMCPConnections.ts:894][E: services/mcp/useManageMCPConnections.ts:907][E: services/mcp/useManageMCPConnections.ts:916][E: services/mcp/useManageMCPConnections.ts:954]
6. hook 中 AppState 写入是 batched: connection callbacks push pending update, 16ms timer flush, disabled/failed clients 会自动清空 tools/commands/resources。[E: services/mcp/useManageMCPConnections.ts:213][E: services/mcp/useManageMCPConnections.ts:216][E: services/mcp/useManageMCPConnections.ts:222][E: services/mcp/useManageMCPConnections.ts:232][E: services/mcp/useManageMCPConnections.ts:297]
7. `connectToServer()` 以 server name + config JSON 作为 cache key, 按 config type 建立 SSE、HTTP、WebSocket、stdio、in-process Chrome/Computer Use、SDK 等 transport, 创建 MCP `Client` 并注册 roots/elicitation capability, 连接时用 timeout race 防止挂住。[E: services/mcp/client.ts:581][E: services/mcp/client.ts:595][E: services/mcp/client.ts:619][E: services/mcp/client.ts:735][E: services/mcp/client.ts:784][E: services/mcp/client.ts:920][E: services/mcp/client.ts:939][E: services/mcp/client.ts:944][E: services/mcp/client.ts:985][E: services/mcp/client.ts:1009][E: services/mcp/client.ts:1048]
8. `getMcpToolsCommandsAndResources()` 跳过 disabled servers, 把 local/remote servers 分开并分别按 batch size 并发连接; cached needs-auth 直接暴露 MCP auth tool, connected 后并行 fetch tools、commands、skills、resources, 第一个支持 resources 的 server 会补 List/Read MCP resource helper tools。[E: services/mcp/client.ts:2226][E: services/mcp/client.ts:2245][E: services/mcp/client.ts:2266][E: services/mcp/client.ts:2311][E: services/mcp/client.ts:2317][E: services/mcp/client.ts:2324][E: services/mcp/client.ts:2344][E: services/mcp/client.ts:2361][E: services/mcp/client.ts:2391]
9. `fetchToolsForClient()` 调 `tools/list`, sanitize server data, 把每个 MCP tool 包装为本地 `Tool`: name/mcpInfo/isMcp、searchHint、alwaysLoad、readOnly/concurrency/destructive/openWorld annotations、input JSON schema、passthrough permission、call wrapper、user-facing name。[E: services/mcp/client.ts:1743][E: services/mcp/client.ts:1752][E: services/mcp/client.ts:1758][E: services/mcp/client.ts:1768][E: services/mcp/client.ts:1773][E: services/mcp/client.ts:1774][E: services/mcp/client.ts:1775][E: services/mcp/client.ts:1779][E: services/mcp/client.ts:1785][E: services/mcp/client.ts:1795][E: services/mcp/client.ts:1804][E: services/mcp/client.ts:1813][E: services/mcp/client.ts:1814][E: services/mcp/client.ts:1833][E: services/mcp/client.ts:1972]
10. MCP tool call wrapper 会 `ensureConnectedClient()`, 调 `callMCPToolWithUrlElicitationRetry()`, 把 result content 放入 `ToolResult.data`, 并把 `_meta`/`structuredContent` 透传到 `mcpMeta`; session expired 会清连接 cache 后重试一次。[E: services/mcp/client.ts:1862][E: services/mcp/client.ts:1863][E: services/mcp/client.ts:1898][E: services/mcp/client.ts:1900][E: services/mcp/client.ts:1914]
11. `transformMCPResult()` 支持 toolResult、structuredContent、content array 三类返回; `processMCPResult()` 对大输出走 truncation 或持久化文件, 对包含 images 的内容回退 truncation。[E: services/mcp/client.ts:2662][E: services/mcp/client.ts:2668][E: services/mcp/client.ts:2676][E: services/mcp/client.ts:2680][E: services/mcp/client.ts:2686][E: services/mcp/client.ts:2720][E: services/mcp/client.ts:2734][E: services/mcp/client.ts:2741][E: services/mcp/client.ts:2758][E: services/mcp/client.ts:2773]
12. connected client 的 list_changed notifications 会分别刷新 tools、prompts、resources; prompts/resources 变化还会清 MCP skill cache 或 skill-search index。[E: services/mcp/useManageMCPConnections.ts:618][E: services/mcp/useManageMCPConnections.ts:631][E: services/mcp/useManageMCPConnections.ts:656][E: services/mcp/useManageMCPConnections.ts:667][E: services/mcp/useManageMCPConnections.ts:681][E: services/mcp/useManageMCPConnections.ts:688][E: services/mcp/useManageMCPConnections.ts:705][E: services/mcp/useManageMCPConnections.ts:717][E: services/mcp/useManageMCPConnections.ts:731]
13. remote transports onclose 会清 cache, 非 stdio/sdk 自动指数退避重连; manual reconnect 和 toggle enabled/disabled 通过 hook 暴露给 UI context。[E: services/mcp/useManageMCPConnections.ts:333][E: services/mcp/useManageMCPConnections.ts:336][E: services/mcp/useManageMCPConnections.ts:356][E: services/mcp/useManageMCPConnections.ts:371][E: services/mcp/useManageMCPConnections.ts:447][E: services/mcp/useManageMCPConnections.ts:1046][E: services/mcp/useManageMCPConnections.ts:1074][E: services/mcp/MCPConnectionManager.tsx:48]
14. OAuth flow 若 server 配置 `oauth.xaa`, 会要求 XAA enabled 并走 `performMCPXaaAuth()` 后直接 return; 标准 flow 会先读取 cached step-up scope/resource metadata, 清旧 token, 再启动授权流程。`ClaudeAuthProvider` 暴露 public-client metadata、CIMD client metadata URL 和 step-up pending 标记。[E: services/mcp/auth.ts:871][E: services/mcp/auth.ts:872][E: services/mcp/auth.ts:893][E: services/mcp/auth.ts:900][E: services/mcp/auth.ts:906][E: services/mcp/auth.ts:916][E: services/mcp/auth.ts:932][E: services/mcp/auth.ts:1417][E: services/mcp/auth.ts:1445][E: services/mcp/auth.ts:1468]

## 设计动机与权衡

MCP config merge 先做 content-signature dedup 再做 name precedence, 因为 plugin/claude.ai connector 的 key 会 namespaced, 仅靠 object key 合并无法发现“两个名字指向同一个 URL/command”的重复连接。[E: services/mcp/config.ts:202][E: services/mcp/config.ts:223][E: services/mcp/config.ts:281][I]

interactive path 不等待 MCP 全部连接后再渲染 REPL, 而是用 pending state 和 batched updates 逐步填充 tools/commands/resources; print path 是单 turn 常见场景, 因此会在 headless store 中等待 regular MCP 连接并对 claude.ai connector 设置 5s timeout。[E: services/mcp/useManageMCPConnections.ts:894][E: services/mcp/useManageMCPConnections.ts:923][E: main.tsx:2729][E: main.tsx:2738][E: main.tsx:2802][I]

MCP tool 的 permission 默认 `passthrough`, suggestion 是向 local settings 添加该 MCP tool 的 allow rule; 这把 server/tool identity 留给统一 permission engine, 而不是在 MCP wrapper 中特殊批准。[E: services/mcp/client.ts:1814][E: services/mcp/client.ts:1820][E: services/mcp/client.ts:1823][E: services/mcp/client.ts:1828][I]

## Gotcha

- `areMcpConfigsEqual()` 比较 config 时排除 `scope`, 因为 scope 是元数据而不是连接配置; 仅 scope 变化不应触发重连。[E: services/mcp/client.ts:1710][E: services/mcp/client.ts:1719][E: services/mcp/client.ts:1721]
- disabled built-in server 可以默认禁用且需要 enabled list opt-in, 不是所有未在 disabled list 的 MCP server 都一定启用。[E: services/mcp/config.ts:1519][E: services/mcp/config.ts:1530]
- `fetchCommandsForClient()` 把 MCP prompts 转成 `Command` 而不是 `Tool`; prompt arguments 是按空格 split 后 zip 到 MCP prompt args, 复杂参数格式需要 command 层自行约束。[E: services/mcp/client.ts:2033][E: services/mcp/client.ts:2057][E: services/mcp/client.ts:2073][E: services/mcp/client.ts:2074][E: services/mcp/client.ts:2077]

## Sources

- `services/mcp/types.ts`
- `services/mcp/config.ts`
- `services/mcp/client.ts`
- `services/mcp/useManageMCPConnections.ts`
- `services/mcp/MCPConnectionManager.tsx`
- `services/mcp/auth.ts`
- `tools.ts`
- `main.tsx`

## 相关

- [工具系统机制](tool-system.md)
- [模型与 API 层](model-api.md)
- [CLI 与运行模式](cli-modes.md)
