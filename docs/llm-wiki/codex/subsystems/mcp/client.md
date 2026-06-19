---
id: subsys.mcp.client
title: MCP client
kind: subsystem
tier: T2
source: [codex-rs/codex-mcp/src/connection_manager.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/codex-mcp/src/tools.rs, codex-rs/codex-mcp/src/resource_client.rs, codex-rs/codex-mcp/src/server.rs]
symbols: [McpConnectionManager, AsyncManagedClient, ManagedClient, ToolInfo, ToolFilter, list_all_tools, list_tools_for_client_uncached, call_tool]
related: [spine.extension-system, subsys.mcp.transports, subsys.mcp.oauth, subsys.mcp.name-qualification, subsys.mcp.connectors, spine.trace-mcp-call, tool.mcp-namespace-tools, tool.list-mcp-resources, tool.read-mcp-resource]
evidence: explicit
status: verified
updated: 5670360009
---

> `McpConnectionManager` owns Codex's client-side MCP server set: it starts async `RmcpClient` instances, records server metadata, aggregates tools/resources/templates, routes `tools/call`, and exposes the manager API used by `codex-core`.[E: codex-rs/codex-mcp/src/connection_manager.rs:3][E: codex-rs/codex-mcp/src/connection_manager.rs:107]

## 能回答的问题

- Codex 怎样为每个 enabled MCP server 启动并管理 client？
- MCP tools 怎样被过滤、缓存、归一化成 model-visible names？
- Codex Apps tools 为什么有 cache、schema masking 和 connector metadata？
- resources/resource templates 怎样分页聚合？
- `tools/call` 怎样从 model-visible trace 回到 raw server/tool name？

## 职责边界

`codex-mcp` 的 client 方向负责连接外部 MCP server、维护 metadata、聚合工具与资源、执行 raw MCP protocol calls；它不负责 Codex 自己作为 MCP server 暴露 `codex`/`codex-reply`，那部分在 `codex-rs/mcp-server`。[E: codex-rs/codex-mcp/src/connection_manager.rs:448][E: codex-rs/codex-mcp/src/connection_manager.rs:544][E: codex-rs/codex-mcp/src/connection_manager.rs:609][E: codex-rs/codex-mcp/src/connection_manager.rs:677]

tool registry 的 ground truth 不在本节点；当前 registry 由 `codex-rs/core/src/tools/spec_plan.rs` 生成 tool router，本节点只解释 MCP manager 怎样提供 tool/resource data 给上层。[I]

## 关键文件

- `codex-rs/codex-mcp/src/connection_manager.rs`: manager 结构体、startup、tool/resource aggregation、tool call routing。[E: codex-rs/codex-mcp/src/connection_manager.rs:107][E: codex-rs/codex-mcp/src/connection_manager.rs:120][E: codex-rs/codex-mcp/src/connection_manager.rs:448][E: codex-rs/codex-mcp/src/connection_manager.rs:677]
- `codex-rs/codex-mcp/src/rmcp_client.rs`: `AsyncManagedClient` lifecycle、startup cache、server initialize、uncached tool listing、transport selection。[E: codex-rs/codex-mcp/src/rmcp_client.rs:128][E: codex-rs/codex-mcp/src/rmcp_client.rs:141][E: codex-rs/codex-mcp/src/rmcp_client.rs:345][E: codex-rs/codex-mcp/src/rmcp_client.rs:473][E: codex-rs/codex-mcp/src/rmcp_client.rs:579]
- `codex-rs/codex-mcp/src/tools.rs`: `ToolInfo`、allow/deny filter、schema masking、model-visible name normalization。[E: codex-rs/codex-mcp/src/tools.rs:31][E: codex-rs/codex-mcp/src/tools.rs:85][E: codex-rs/codex-mcp/src/tools.rs:119][E: codex-rs/codex-mcp/src/tools.rs:149]
- `codex-rs/codex-mcp/src/resource_client.rs`: session-scoped resource adapter backed by replaceable manager handle。[E: codex-rs/codex-mcp/src/resource_client.rs:35][E: codex-rs/codex-mcp/src/resource_client.rs:61][E: codex-rs/codex-mcp/src/resource_client.rs:78][E: codex-rs/codex-mcp/src/resource_client.rs:102]

## 数据模型

- `McpConnectionManager` stores `clients`, `server_metadata`, `required_servers`, plugin provenance, host-owned Codex Apps flag, name-prefix mode, elicitation state, and startup cancellation token.[E: codex-rs/codex-mcp/src/connection_manager.rs:107]
- `ManagedClient` stores the initialized `RmcpClient`, advertised `McpServerInfo`, filtered `ToolInfo` list, timeout/filter settings, server instructions, sandbox-state support, and optional Codex Apps tool-cache context.[E: codex-rs/codex-mcp/src/rmcp_client.rs:89]
- `ToolInfo` preserves raw routing fields (`server_name`, raw `tool`) separately from model-visible `callable_namespace` and `callable_name`; `canonical_tool_name` creates the namespaced protocol `ToolName` from those model-visible parts.[E: codex-rs/codex-mcp/src/tools.rs:31][E: codex-rs/codex-mcp/src/tools.rs:59]
- Server metadata retains origin, memory-pollution behavior, parallel-tool support, default approval mode, and per-tool approval overrides after launch.[E: codex-rs/codex-mcp/src/server.rs:77][E: codex-rs/codex-mcp/src/server.rs:95]

## 启动链路

1. `McpConnectionManager::new` receives effective servers and records required enabled server names before spawning one `AsyncManagedClient` per enabled server.[E: codex-rs/codex-mcp/src/connection_manager.rs:120][E: codex-rs/codex-mcp/src/connection_manager.rs:140][E: codex-rs/codex-mcp/src/connection_manager.rs:160]
2. Startup emits `McpStartupStatus::Starting`, attaches a Codex Apps cache context for the reserved Codex Apps server, and uses runtime auth only for that reserved server when it does not use an env bearer token.[E: codex-rs/codex-mcp/src/connection_manager.rs:166][E: codex-rs/codex-mcp/src/connection_manager.rs:175][E: codex-rs/codex-mcp/src/connection_manager.rs:183][E: codex-rs/codex-mcp/src/connection_manager.rs:193]
3. `AsyncManagedClient::new` builds a `ToolFilter`, loads startup cache snapshots for Codex Apps when possible, validates the server name, creates the underlying `RmcpClient`, then calls `start_server_task`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:155][E: codex-rs/codex-mcp/src/rmcp_client.rs:159][E: codex-rs/codex-mcp/src/rmcp_client.rs:175][E: codex-rs/codex-mcp/src/rmcp_client.rs:179][E: codex-rs/codex-mcp/src/rmcp_client.rs:190]
4. `start_server_task` initializes the server with Codex client capabilities, detects the sandbox-state experimental capability, lists tools uncached, writes Codex Apps cache if applicable, filters tools, and returns `ManagedClient`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:487][E: codex-rs/codex-mcp/src/rmcp_client.rs:497][E: codex-rs/codex-mcp/src/rmcp_client.rs:502][E: codex-rs/codex-mcp/src/rmcp_client.rs:510][E: codex-rs/codex-mcp/src/rmcp_client.rs:524][E: codex-rs/codex-mcp/src/rmcp_client.rs:537][E: codex-rs/codex-mcp/src/rmcp_client.rs:539]

## Tool 列表与执行

- `list_all_tools` awaits each managed client, extends the collected `ToolInfo` with server metadata, then calls `normalize_tools_for_model_with_prefix` once over the whole set.[E: codex-rs/codex-mcp/src/connection_manager.rs:448][E: codex-rs/codex-mcp/src/connection_manager.rs:461][E: codex-rs/codex-mcp/src/connection_manager.rs:478][E: codex-rs/codex-mcp/src/connection_manager.rs:484]
- Codex Apps hard refresh bypasses the in-process cache, lists tools uncached, rewrites the cache on success, applies the tool filter, masks model-visible file path schemas, and normalizes names before returning.[E: codex-rs/codex-mcp/src/connection_manager.rs:492][E: codex-rs/codex-mcp/src/connection_manager.rs:503][E: codex-rs/codex-mcp/src/connection_manager.rs:519][E: codex-rs/codex-mcp/src/connection_manager.rs:530][E: codex-rs/codex-mcp/src/connection_manager.rs:533][E: codex-rs/codex-mcp/src/connection_manager.rs:536]
- `call_tool` resolves the raw server client, rejects disabled raw tool names, calls `RmcpClient::call_tool(tool, arguments, meta, timeout)`, then converts MCP content/structured content/error/meta into Codex protocol `CallToolResult`.[E: codex-rs/codex-mcp/src/connection_manager.rs:677][E: codex-rs/codex-mcp/src/connection_manager.rs:684][E: codex-rs/codex-mcp/src/connection_manager.rs:685][E: codex-rs/codex-mcp/src/connection_manager.rs:691][E: codex-rs/codex-mcp/src/connection_manager.rs:706]

## Resources

- `list_all_resources` and `list_all_resource_templates` fan out across clients, follow pagination cursors, reject duplicate cursors, and warn rather than failing the whole aggregate when one server fails.[E: codex-rs/codex-mcp/src/connection_manager.rs:544][E: codex-rs/codex-mcp/src/connection_manager.rs:561][E: codex-rs/codex-mcp/src/connection_manager.rs:572][E: codex-rs/codex-mcp/src/connection_manager.rs:575][E: codex-rs/codex-mcp/src/connection_manager.rs:596][E: codex-rs/codex-mcp/src/connection_manager.rs:609][E: codex-rs/codex-mcp/src/connection_manager.rs:622][E: codex-rs/codex-mcp/src/connection_manager.rs:639][E: codex-rs/codex-mcp/src/connection_manager.rs:663]
- `McpResourceClient` keeps an `ArcSwap<McpConnectionManager>` rather than a snapshot, so resource reads/lists use the currently published manager after startup or refresh replacement.[E: codex-rs/codex-mcp/src/resource_client.rs:30][E: codex-rs/codex-mcp/src/resource_client.rs:35][E: codex-rs/codex-mcp/src/resource_client.rs:61][E: codex-rs/codex-mcp/src/resource_client.rs:78][E: codex-rs/codex-mcp/src/resource_client.rs:102]

## Sources

- codex-rs/codex-mcp/src/connection_manager.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
- codex-rs/codex-mcp/src/tools.rs
- codex-rs/codex-mcp/src/resource_client.rs
- codex-rs/codex-mcp/src/server.rs

## 相关

- [Ext 扩展插件系统](../../spine/extension-system.md)
- [trace:MCP 工具调用](../../spine/trace-mcp-call.md)
- [MCP namespace 工具](../../surface/tools/mcp-namespace-tools.md)
