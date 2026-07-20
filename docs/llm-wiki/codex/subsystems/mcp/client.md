---
id: subsys.mcp.client
title: MCP client
kind: subsystem
tier: T2
source: [codex-rs/codex-mcp/src/connection_manager.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/codex-mcp/src/tools.rs, codex-rs/codex-mcp/src/codex_apps/file_params.rs, codex-rs/codex-mcp/src/tool_catalog_cache.rs, codex-rs/codex-mcp/src/openai_docs_source_attribution.rs, codex-rs/codex-mcp/src/resource_client.rs, codex-rs/codex-mcp/src/server.rs]
symbols: [McpConnectionManager, AsyncManagedClient, ManagedClient, McpToolCatalogCache, ToolInfo, ToolFilter, prepare_openai_file_params_for_model, list_all_tools, tool_info, list_tools_for_client_uncached, call_tool]
related: [spine.extension-system, subsys.mcp.transports, subsys.mcp.oauth, subsys.mcp.name-qualification, subsys.mcp.connectors, spine.trace-mcp-call, tool.mcp-namespace-tools, tool.list-mcp-resources, tool.read-mcp-resource]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> `McpConnectionManager` owns Codex's client-side MCP server set: it starts async `RmcpClient` instances, records server metadata, aggregates tools/resources/templates, routes `tools/call`, and exposes the manager API used by `codex-core`.[E: codex-rs/codex-mcp/src/connection_manager.rs:116]

## 能回答的问题

- Codex 怎样为每个 enabled MCP server 启动并管理 client？
- MCP tools 怎样被过滤、缓存、归一化成 model-visible names？
- Codex Apps tools 为什么有 cache、schema masking 和 connector metadata？
- resources/resource templates 怎样分页聚合？
- `tools/call` 怎样从 model-visible trace 回到 raw server/tool name？

## 职责边界

`codex-mcp` 的 client 方向负责连接外部 MCP server、维护 metadata、聚合工具与资源、执行 raw MCP protocol calls；它不负责 Codex 自己作为 MCP server 暴露 `codex`/`codex-reply`，那部分在 `codex-rs/mcp-server`。[E: codex-rs/codex-mcp/src/connection_manager.rs:567][E: codex-rs/codex-mcp/src/connection_manager.rs:692][E: codex-rs/codex-mcp/src/connection_manager.rs:763][E: codex-rs/codex-mcp/src/connection_manager.rs:837]

tool registry 的 ground truth 不在本节点；当前 registry 由 `codex-rs/core/src/tools/spec_plan.rs` 生成 tool router，本节点只解释 MCP manager 怎样提供 tool/resource data 给上层。[I]

## 关键文件

- `codex-rs/codex-mcp/src/connection_manager.rs`: manager 结构体、startup、tool/resource aggregation、tool call routing。[E: codex-rs/codex-mcp/src/connection_manager.rs:116][E: codex-rs/codex-mcp/src/connection_manager.rs:128][E: codex-rs/codex-mcp/src/connection_manager.rs:837]
- `codex-rs/codex-mcp/src/rmcp_client.rs`: `AsyncManagedClient` lifecycle、startup cache、server initialize、uncached tool listing、transport selection。[E: codex-rs/codex-mcp/src/rmcp_client.rs:401][E: codex-rs/codex-mcp/src/rmcp_client.rs:419][E: codex-rs/codex-mcp/src/rmcp_client.rs:625][E: codex-rs/codex-mcp/src/rmcp_client.rs:866][E: codex-rs/codex-mcp/src/rmcp_client.rs:1016]
- `codex-rs/codex-mcp/src/tools.rs`: `ToolInfo`、allow/deny filter and model-visible name normalization；Apps file-schema shaping moved to `codex_apps/file_params.rs`。[E: codex-rs/codex-mcp/src/tools.rs:25][E: codex-rs/codex-mcp/src/tools.rs:43]
- `codex-rs/codex-mcp/src/tool_catalog_cache.rs`: process-local, identity-keyed reusable stdio tool catalogs with LRU/TTL and server opt-out。[E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:27][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:72][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:106][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:129][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:224]
- `codex-rs/codex-mcp/src/openai_docs_source_attribution.rs`: exact OpenAI docs MCP URL wrapper adds `?source=codex` to unary and streaming requests。[E: codex-rs/codex-mcp/src/openai_docs_source_attribution.rs:10][E: codex-rs/codex-mcp/src/openai_docs_source_attribution.rs:13][E: codex-rs/codex-mcp/src/openai_docs_source_attribution.rs:29][E: codex-rs/codex-mcp/src/openai_docs_source_attribution.rs:36][E: codex-rs/codex-mcp/src/openai_docs_source_attribution.rs:45]
- `codex-rs/codex-mcp/src/resource_client.rs`: session-scoped resource adapter backed by replaceable manager handle。[E: codex-rs/codex-mcp/src/resource_client.rs:34][E: codex-rs/codex-mcp/src/resource_client.rs:61][E: codex-rs/codex-mcp/src/resource_client.rs:77][E: codex-rs/codex-mcp/src/resource_client.rs:101]

## 数据模型

- `McpConnectionManager` stores `clients`, `server_metadata`, `required_servers`, plugin provenance, name-prefix mode, elicitation state, and startup cancellation token.[E: codex-rs/codex-mcp/src/connection_manager.rs:116]
- `ManagedClient` stores the initialized `RmcpClient`, advertised `McpServerInfo`, filtered `ToolInfo` list, timeout/filter settings, server instructions, sandbox-state support, and optional Codex Apps tool-cache context.[E: codex-rs/codex-mcp/src/rmcp_client.rs:108]
- `ToolInfo` preserves raw routing fields (`server_name`, raw `tool`) separately from model-visible `callable_namespace`/`callable_name`, and records optional fields accepted by declared `openai/fileParams` for execution-time upload rewriting。[E: codex-rs/codex-mcp/src/tools.rs:25][E: codex-rs/codex-mcp/src/tools.rs:43][E: codex-rs/codex-mcp/src/tools.rs:58][E: codex-rs/codex-mcp/src/codex_apps/file_params.rs:47]
- Server metadata retains origin, memory-pollution behavior, parallel-tool support, default approval mode, and per-tool approval overrides after launch.[E: codex-rs/codex-mcp/src/server.rs:77][E: codex-rs/codex-mcp/src/server.rs:96]

## 启动链路

1. `McpConnectionManager::new` receives effective servers and records required enabled server names before spawning one `AsyncManagedClient` per enabled server.[E: codex-rs/codex-mcp/src/connection_manager.rs:128][E: codex-rs/codex-mcp/src/connection_manager.rs:152][E: codex-rs/codex-mcp/src/connection_manager.rs:179]
2. Startup emits `McpStartupStatus::Starting`, attaches the account/workspace Codex Apps runtime context, and uses an `AuthManager`-backed provider for the reserved Apps registration so token refreshes are visible without crossing identity boundaries；an env bearer override still suppresses ambient auth。[E: codex-rs/codex-mcp/src/connection_manager.rs:162][E: codex-rs/codex-mcp/src/connection_manager.rs:206][E: codex-rs/codex-mcp/src/connection_manager.rs:215][E: codex-rs/codex-mcp/src/connection_manager.rs:232][E: codex-rs/codex-mcp/src/connection_manager.rs:238]
3. `AsyncManagedClient::new` builds a `ToolFilter`, loads startup cache server info for Codex Apps when possible, validates the server name, creates the underlying `RmcpClient`, then calls `start_server_task`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:440][E: codex-rs/codex-mcp/src/rmcp_client.rs:444][E: codex-rs/codex-mcp/src/rmcp_client.rs:328][E: codex-rs/codex-mcp/src/rmcp_client.rs:312][E: codex-rs/codex-mcp/src/rmcp_client.rs:353]
4. `start_server_task` initializes the server with Codex client capabilities, detects the sandbox-state experimental capability, lists tools uncached, publishes Codex Apps cache if applicable, filters tools, and returns `ManagedClient`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:970][E: codex-rs/codex-mcp/src/rmcp_client.rs:890][E: codex-rs/codex-mcp/src/rmcp_client.rs:908][E: codex-rs/codex-mcp/src/rmcp_client.rs:918][E: codex-rs/codex-mcp/src/rmcp_client.rs:929][E: codex-rs/codex-mcp/src/rmcp_client.rs:950][E: codex-rs/codex-mcp/src/rmcp_client.rs:952]

## Tool 列表与执行

- `list_all_tools` awaits each managed client, extends the collected `ToolInfo` with server metadata, then calls `normalize_tools_for_model_with_prefix` once over the whole set.[E: codex-rs/codex-mcp/src/connection_manager.rs:567][E: codex-rs/codex-mcp/src/connection_manager.rs:577][E: codex-rs/codex-mcp/src/connection_manager.rs:597]
- Codex Apps hard refresh bypasses the current snapshot, lists tools uncached, then generation-guards publication so an older completion cannot replace newer runtime state；file params are shaped after deriving execution-time optional fields。[E: codex-rs/codex-mcp/src/connection_manager.rs:637][E: codex-rs/codex-mcp/src/connection_manager.rs:656][E: codex-rs/codex-mcp/src/codex_apps/file_params.rs:48][E: codex-rs/codex-mcp/src/codex_apps/file_params.rs:57]
- Regular stdio servers may reuse a 30-minute, 32-entry process-local catalog keyed by launch/environment/capability fingerprint；cached entries drop per-connection instructions and annotations, and a server capability can explicitly disable reuse。[E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:27][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:28][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:111][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:129][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:135]
- `call_tool` resolves the raw server client, rejects disabled raw tool names, calls `RmcpClient::call_tool(tool, arguments, meta, timeout)`, then converts MCP content/structured content/error/meta into Codex protocol `CallToolResult`.[E: codex-rs/codex-mcp/src/connection_manager.rs:837][E: codex-rs/codex-mcp/src/connection_manager.rs:844][E: codex-rs/codex-mcp/src/connection_manager.rs:845][E: codex-rs/codex-mcp/src/connection_manager.rs:851][E: codex-rs/codex-mcp/src/connection_manager.rs:866]

## Resources

- `list_all_resources` and `list_all_resource_templates` fan out across clients, follow pagination cursors, reject duplicate cursors, and warn rather than failing the whole aggregate when one server fails.[E: codex-rs/codex-mcp/src/connection_manager.rs:692][E: codex-rs/codex-mcp/src/connection_manager.rs:715][E: codex-rs/codex-mcp/src/connection_manager.rs:726][E: codex-rs/codex-mcp/src/connection_manager.rs:728][E: codex-rs/codex-mcp/src/connection_manager.rs:750][E: codex-rs/codex-mcp/src/connection_manager.rs:763][E: codex-rs/codex-mcp/src/connection_manager.rs:786][E: codex-rs/codex-mcp/src/connection_manager.rs:797][E: codex-rs/codex-mcp/src/connection_manager.rs:823]
- `McpResourceClient` keeps an `ArcSwap<McpConnectionManager>` rather than a snapshot, so resource reads/lists use the currently published manager after startup or refresh replacement.[E: codex-rs/codex-mcp/src/resource_client.rs:34][E: codex-rs/codex-mcp/src/resource_client.rs:61][E: codex-rs/codex-mcp/src/resource_client.rs:77][E: codex-rs/codex-mcp/src/resource_client.rs:101]

## Sources

- codex-rs/codex-mcp/src/connection_manager.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
- codex-rs/codex-mcp/src/tools.rs
- codex-rs/codex-mcp/src/codex_apps/file_params.rs
- codex-rs/codex-mcp/src/tool_catalog_cache.rs
- codex-rs/codex-mcp/src/openai_docs_source_attribution.rs
- codex-rs/codex-mcp/src/resource_client.rs
- codex-rs/codex-mcp/src/server.rs

## 相关

- [Ext 扩展插件系统](../../spine/extension-system.md)
- [trace:MCP 工具调用](../../spine/trace-mcp-call.md)
- [MCP namespace 工具](../../surface/tools/mcp-namespace-tools.md)
