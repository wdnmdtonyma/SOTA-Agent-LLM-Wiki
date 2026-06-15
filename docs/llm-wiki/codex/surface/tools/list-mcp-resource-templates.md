---
id: tool.list-mcp-resource-templates
title: list_mcp_resource_templates 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/mcp_resource_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/protocol/src/protocol.rs]
symbols: [create_list_mcp_resource_templates_tool, ToolHandlerKind::McpResource, McpResourceHandler, handle_list_resource_templates, ListResourceTemplatesPayload]
related: [tool.list-mcp-resources, tool.read-mcp-resource, tool.mcp-namespace-tools, subsys.mcp.client, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `list_mcp_resource_templates` 是 Codex 的 MCP resource template discovery 工具；它列出可参数化的 MCP resource templates，既支持指定 server 分页，也支持不指定 server 时聚合所有 configured servers。[E: codex-rs/tools/src/mcp_resource_tool.rs:54][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:382][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:405]

## 能回答的问题

- `list_mcp_resource_templates` 和 `list_mcp_resources` 的 schema 有什么差别？
- `cursor` 为什么只适用于指定 `server` 的调用？
- MCP resource template 输出如何携带 server 来源？
- 该工具的 registry gate 和 handler kind 是什么？
- 该工具是否支持 parallel tool calls？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `list_mcp_resource_templates` | `ResponsesApiTool.name` 固定为 `list_mcp_resource_templates`。[E: codex-rs/tools/src/mcp_resource_tool.rs:53] |
| aliases | 未看到独立 alias。 | registry 注册 `"list_mcp_resource_templates"` 给 `ToolHandlerKind::McpResource`。[E: codex-rs/tools/src/tool_registry_plan.rs:210][I] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_list_mcp_resource_templates_tool` 返回 Function ToolSpec。[E: codex-rs/tools/src/mcp_resource_tool.rs:52] |
| ToolHandlerKind | `ToolHandlerKind::McpResource` | registry 为 resource templates 工具注册 `McpResource` handler kind。[E: codex-rs/tools/src/tool_registry_plan.rs:210] |
| core handler | `McpResourceHandler` | `core/src/tools/spec.rs` 创建并注册 `McpResourceHandler`。[E: codex-rs/core/src/tools/spec.rs:155][E: codex-rs/core/src/tools/spec.rs:231] |
| 所属 crate | spec 在 `codex-tools`，执行在 `codex-core`，事件类型在 `codex-protocol`。 | handler 使用 `EventMsg::McpToolCallBegin` / `EventMsg::McpToolCallEnd` 包裹 resource template listing。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:570][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:590] |

## 2 用途定位

工具描述说明 resource templates 是 parameterized resources，可接收参数并给语言模型提供上下文，使用场景包括 files、database schemas 或 application-specific information。[E: codex-rs/tools/src/mcp_resource_tool.rs:54]  
该工具只列模板 metadata；真正读取某个具体 resource 仍由 `read_mcp_resource` 按 server 与 uri 执行。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:382][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:405][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:483][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:487]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `server` | string | 否 | all servers | MCP server name；省略时列出所有 configured servers 的 resource templates。 | schema description 明确省略时 list from all configured servers。[E: codex-rs/tools/src/mcp_resource_tool.rs:37][E: codex-rs/tools/src/mcp_resource_tool.rs:39] |
| `cursor` | string | 否 | 无 | 同一 server 上一次 `list_mcp_resource_templates` 返回的不透明 cursor。 | schema description 要求 cursor 来自 same server 的 previous call。[E: codex-rs/tools/src/mcp_resource_tool.rs:44][E: codex-rs/tools/src/mcp_resource_tool.rs:46] |

schema 顶层没有 required 字段，handler 用 `parse_args_with_default` 允许空 arguments 转成默认 `ListResourceTemplatesArgs`。[E: codex-rs/tools/src/mcp_resource_tool.rs:57][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:361][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:669]  
handler 会 trim `server` 与 `cursor`，空字符串会变成 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:363][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:364][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:603][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:605]  
未指定 server 时传 cursor 会返回 `cursor can only be used when a server is specified`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:394][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:396]

## 4 输出 schema & 截断

ToolSpec 不声明 output schema，`output_schema` 为 `None`。[E: codex-rs/tools/src/mcp_resource_tool.rs:58]  
单 server 输出为 `{ server, resourceTemplates, nextCursor? }`，`from_single_server` 把每个 `ResourceTemplate` 包装成带 `server` 字段的 `ResourceTemplateWithServer`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:130][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:133][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:135][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:143][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:146]  
all servers 输出按 server name 排序后平铺所有 templates，`next_cursor` 固定为 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:155][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:157][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:160][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:167]  
handler 使用 `serialize_function_output` 把 payload 序列化成 JSON 文本并返回 success true。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:625][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:631]

## 5 ToolSpec 类型

`list_mcp_resource_templates` 是 Codex 自带 Function utility，不是外部 MCP namespace tool；它用本地 handler 调用 MCP resource template listing API。[E: codex-rs/tools/src/mcp_resource_tool.rs:52][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:382][I]  
handler 对三个 MCP resource utility 共享一个 `McpResourceHandler`，并按 `tool_name.name` 分派。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:210][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:218][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:227]

## 6 注册与门控

`build_tool_registry_plan` 只有在 `params.mcp_tools.is_some()` 时 push `create_list_mcp_resource_templates_tool()`。[E: codex-rs/tools/src/tool_registry_plan.rs:193][E: codex-rs/tools/src/tool_registry_plan.rs:200]  
同一个 gate 中还注册 `list_mcp_resources` 与 `read_mcp_resource`；resource utility 是 MCP 工具上下文存在时的一组内建 helper。[E: codex-rs/tools/src/tool_registry_plan.rs:195][E: codex-rs/tools/src/tool_registry_plan.rs:205][I]  
`core/src/tools/spec.rs` 把 runtime `mcp_tools` 转成 `ToolRegistryPlanParams.mcp_tools` 后传给 `build_tool_registry_plan`。[E: codex-rs/core/src/tools/spec.rs:128][E: codex-rs/core/src/tools/spec.rs:131]

## 7 parallel-safe

`list_mcp_resource_templates` 的 `supports_parallel_tool_calls` 实际值是 `true`。[E: codex-rs/tools/src/tool_registry_plan.rs:201]  
handler 是只读 resource template discovery 路径；parallel-safe 与其只读 discovery 定位一致。[I]  
该工具只读 MCP resource template metadata，parallel-safe 与其只读 discovery 定位一致。[I]

## 8 handler 走读

1. `McpResourceHandler.handle` 在 `tool_name.name == "list_mcp_resource_templates"` 时调用 `handle_list_resource_templates`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:218][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:219]
2. `handle_list_resource_templates` 解析默认参数，规范化 `server/cursor`，并构造 `McpInvocation`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:361][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:363][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:364][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:366]
3. handler 发出 begin event 后记录 start time。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:372][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:373]
4. 指定 server 时，handler 构造 `PaginatedRequestParams` 并调用 `session.list_resource_templates(&server_name, params)`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:377][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:382]
5. 不指定 server 时，handler 调用 `mcp_connection_manager.list_all_resource_templates().await`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:400][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:405]
6. 成功输出和错误都会通过 `emit_tool_call_end` 发出 `McpToolCallEndEvent`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:418][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:447]

## 9 设计动机·edge·历史

resource templates 与 concrete resources 使用相同的 `server/cursor` 模式，降低模型在 MCP resource discovery 上的 schema 学习成本。[E: codex-rs/tools/src/mcp_resource_tool.rs:9][E: codex-rs/tools/src/mcp_resource_tool.rs:16][E: codex-rs/tools/src/mcp_resource_tool.rs:37][E: codex-rs/tools/src/mcp_resource_tool.rs:44][I]  
all-server mode 不返回 aggregate cursor，因为每个 MCP server 的 pagination cursor 不具备跨 server 合并语义。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:394][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:167][I]  
输出 wrapper 保留 `server` 字段，使模型能够在后续 `read_mcp_resource` 中使用准确 server 名称。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:74][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:81][I]

## Sources

- `codex-rs/tools/src/mcp_resource_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [list_mcp_resources 工具](list-mcp-resources.md)
- [read_mcp_resource 工具](read-mcp-resource.md)
- [MCP namespace 工具](mcp-namespace-tools.md)
- [MCP client](../../subsystems/mcp/client.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
