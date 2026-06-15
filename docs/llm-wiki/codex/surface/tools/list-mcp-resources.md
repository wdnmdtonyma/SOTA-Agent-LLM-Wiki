---
id: tool.list-mcp-resources
title: list_mcp_resources 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/mcp_resource_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/core/src/tools/context.rs, codex-rs/protocol/src/protocol.rs]
symbols: [create_list_mcp_resources_tool, ToolHandlerKind::McpResource, McpResourceHandler, handle_list_resources, ListResourcesPayload]
related: [tool.list-mcp-resource-templates, tool.read-mcp-resource, tool.mcp-namespace-tools, subsys.mcp.client, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `list_mcp_resources` 是 Codex 的 MCP resource discovery 工具；它列出单个 MCP server 的 paginated resources，或在不指定 server 时聚合所有 configured servers 的 resources。[E: codex-rs/tools/src/mcp_resource_tool.rs:26][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:274][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:295]

## 能回答的问题

- `list_mcp_resources` 的 `server` 和 `cursor` 参数如何工作？
- 为什么不指定 `server` 时不能传 `cursor`？
- `list_mcp_resources` 如何注册到 `McpResourceHandler`？
- `list_mcp_resources` 是否支持 parallel tool calls？
- `list_mcp_resources` 输出里为什么每个 resource 带 server 字段？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `list_mcp_resources` | `ResponsesApiTool.name` 固定为 `list_mcp_resources`。[E: codex-rs/tools/src/mcp_resource_tool.rs:25] |
| aliases | 未看到独立 alias。 | registry 注册 `"list_mcp_resources"` 给 `ToolHandlerKind::McpResource`。[E: codex-rs/tools/src/tool_registry_plan.rs:209][I] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_list_mcp_resources_tool` 返回 Function ToolSpec。[E: codex-rs/tools/src/mcp_resource_tool.rs:24] |
| ToolHandlerKind | `ToolHandlerKind::McpResource` | registry 为三个 MCP resource 工具都注册 `McpResource` handler kind。[E: codex-rs/tools/src/tool_registry_plan.rs:209][E: codex-rs/tools/src/tool_registry_plan.rs:210][E: codex-rs/tools/src/tool_registry_plan.rs:211] |
| core handler | `McpResourceHandler` | `core/src/tools/spec.rs` 创建 `McpResourceHandler` 并注册 `ToolHandlerKind::McpResource`。[E: codex-rs/core/src/tools/spec.rs:155][E: codex-rs/core/src/tools/spec.rs:231] |
| 所属 crate | spec 在 `codex-tools`，执行在 `codex-core`，事件在 `codex-protocol`。 | handler 发出 `EventMsg::McpToolCallBegin` 与 `EventMsg::McpToolCallEnd`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:570][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:590] |

## 2 用途定位

工具描述说 MCP resources 让 servers 向 language models 共享上下文，例如 files、database schemas 或 application-specific information，并建议可用时优先用 resources 而不是 web search。[E: codex-rs/tools/src/mcp_resource_tool.rs:26]  
`list_mcp_resources` 不调用任意 MCP tool；它调用 MCP resource listing API，并把资源元数据序列化为 function output JSON。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:274][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:295][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:625][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:631]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `server` | string | 否 | all servers | MCP server name；省略时列出每个 configured server 的 resources。 | schema description 明确省略时列所有 configured servers。[E: codex-rs/tools/src/mcp_resource_tool.rs:9][E: codex-rs/tools/src/mcp_resource_tool.rs:11] |
| `cursor` | string | 否 | 无 | 同一 server 上一次 `list_mcp_resources` 返回的不透明 cursor。 | schema description 要求 cursor 来自 same server 的 previous call。[E: codex-rs/tools/src/mcp_resource_tool.rs:16][E: codex-rs/tools/src/mcp_resource_tool.rs:18] |

schema 顶层没有 required 字段，因此 `{}` 或空 arguments 可经 `parse_args_with_default` 解析为默认 `ListResourcesArgs`。[E: codex-rs/tools/src/mcp_resource_tool.rs:29][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:253][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:669]  
handler 会 trim `server` 与 `cursor`，空字符串会转成 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:255][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:256][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:603][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:605]  
当未指定 server 但指定 cursor 时，handler 返回 `cursor can only be used when a server is specified`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:284][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:286]

## 4 输出 schema & 截断

ToolSpec 不声明 output schema，`output_schema` 为 `None`。[E: codex-rs/tools/src/mcp_resource_tool.rs:30]  
单 server 输出为 `{ server, resources, nextCursor? }`，`from_single_server` 把每个 MCP `Resource` 包装成带 `server` 字段的 `ResourceWithServer`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:87][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:90][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:92][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:100]  
all servers 输出把 server-resource pairs 按 server name 排序后平铺，并且 `next_cursor` 为 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:111][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:113][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:116][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:123]  
handler 用 `serde_json::to_string` 序列化 payload，再返回 `FunctionToolOutput::from_text(content, Some(true))`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:625][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:631]

## 5 ToolSpec 类型

`list_mcp_resources` 是普通 Function ToolSpec，而不是 `ToolSpec::Namespace` MCP tool：它是 Codex 自带的 MCP resource utility，handler 在 core 中直接调用 session 的 resource APIs。[E: codex-rs/tools/src/mcp_resource_tool.rs:24][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:274][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:295][I]  
它发出 MCP-style begin/end telemetry events，但模型看到的是 function call output。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:570][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:590][E: codex-rs/core/src/tools/context.rs:549]

## 6 注册与门控

`build_tool_registry_plan` 只有在 `params.mcp_tools.is_some()` 时注册 `list_mcp_resources`、`list_mcp_resource_templates` 和 `read_mcp_resource` 三个 resource utility 工具。[E: codex-rs/tools/src/tool_registry_plan.rs:193][E: codex-rs/tools/src/tool_registry_plan.rs:195][E: codex-rs/tools/src/tool_registry_plan.rs:199][E: codex-rs/tools/src/tool_registry_plan.rs:205][E: codex-rs/tools/src/tool_registry_plan.rs:209][E: codex-rs/tools/src/tool_registry_plan.rs:211]  
这个 gate 表示当前 turn 有 MCP tool context；没有 MCP tools 时 resource utility 不出现在 tool registry。[I]  
`core/src/tools/spec.rs` 将 runtime 的 `mcp_tools: Option<HashMap<String, ToolInfo>>` 映射成 `ToolRegistryPlanParams.mcp_tools`。[E: codex-rs/core/src/tools/spec.rs:73][E: codex-rs/core/src/tools/spec.rs:131]

## 7 parallel-safe

`list_mcp_resources` 的 `supports_parallel_tool_calls` 实际值是 `true`。[E: codex-rs/tools/src/tool_registry_plan.rs:196]  
它是只读 discovery 工具；parallel-safe 与其 resource listing 定位一致。[I]  
并发多个 resource listing 请求可能同时访问 MCP connection manager read guard；handler 注解说明 listing 通过 session-owned manager guard 读取。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:245][I]

## 8 handler 走读

1. `McpResourceHandler.handle` 读取 `tool_name.name`，对 `list_mcp_resources` 分支调用 `handle_list_resources`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:208][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:210]
2. `handle_list_resources` 解析默认参数并规范化 `server/cursor`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:253][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:255][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:256]
3. handler 生成 `McpInvocation { server, tool: "list_mcp_resources", arguments }` 并发出 begin event。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:258][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:260][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:264]
4. 如果指定 server，handler 构造 `PaginatedRequestParams` 并调用 `session.list_resources(&server_name, params)`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:269][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:274]
5. 如果不指定 server，handler 调用 `mcp_connection_manager.list_all_resources().await`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:290][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:295]
6. 成功、序列化失败和 listing 失败都会发出 `McpToolCallEndEvent`；成功时 result 使用 function output content 包装成 `CallToolResult`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:308][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:314][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:322][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:337]

## 9 设计动机·edge·历史

`cursor` 只允许单 server，是因为 all-server aggregation 把多个 servers 的 resources 平铺到一个 response，无法安全表达单个 opaque cursor 应该属于哪个 server。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:284][I]  
输出中的每个 resource 都带 `server` 字段；all-server mode 需要保留 resource 来源，single-server mode 也复用同一个 wrapper 类型。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:61][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:67][I]  
resource utility 与 MCP namespace tools 并存：resource utility 在 `params.mcp_tools.is_some()` block 中注册，MCP namespace tools 在后续 `params.mcp_tools` block 中分组并转换成 namespace specs。[E: codex-rs/tools/src/tool_registry_plan.rs:193][E: codex-rs/tools/src/tool_registry_plan.rs:497][E: codex-rs/tools/src/tool_registry_plan.rs:532][E: codex-rs/tools/src/tool_registry_plan.rs:548]

## Sources

- `codex-rs/tools/src/mcp_resource_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [list_mcp_resource_templates 工具](list-mcp-resource-templates.md)
- [read_mcp_resource 工具](read-mcp-resource.md)
- [MCP namespace 工具](mcp-namespace-tools.md)
- [MCP client](../../subsystems/mcp/client.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
