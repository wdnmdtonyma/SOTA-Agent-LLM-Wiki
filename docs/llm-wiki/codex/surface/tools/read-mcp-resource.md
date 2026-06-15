---
id: tool.read-mcp-resource
title: read_mcp_resource 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/mcp_resource_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/core/src/tools/handlers/mcp.rs, codex-rs/core/src/tools/context.rs, codex-rs/protocol/src/protocol.rs]
symbols: [create_read_mcp_resource_tool, ToolHandlerKind::McpResource, McpResourceHandler, handle_read_resource, ReadResourcePayload]
related: [tool.list-mcp-resources, tool.list-mcp-resource-templates, tool.mcp-namespace-tools, subsys.mcp.client, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `read_mcp_resource` 是 Codex 读取具体 MCP resource 内容的内建 Function 工具；模型必须提供 MCP server name 和 resource URI，handler 调用 `session.read_resource` 并返回 JSON 文本结果。[E: codex-rs/tools/src/mcp_resource_tool.rs:80][E: codex-rs/tools/src/mcp_resource_tool.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:483][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:625][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:631]

## 能回答的问题

- `read_mcp_resource` 的 `server` 和 `uri` 参数为什么都是必填？
- `read_mcp_resource` 的输出如何包含 server、uri 和 MCP read result？
- `read_mcp_resource` 与 MCP namespace tool call 有什么区别？
- `read_mcp_resource` 如何发出 MCP begin/end events？
- `read_mcp_resource` 是否支持 parallel tool calls？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `read_mcp_resource` | `ResponsesApiTool.name` 固定为 `read_mcp_resource`。[E: codex-rs/tools/src/mcp_resource_tool.rs:81] |
| aliases | 未看到独立 alias。 | registry 注册 `"read_mcp_resource"` 给 `ToolHandlerKind::McpResource`。[E: codex-rs/tools/src/tool_registry_plan.rs:211][I] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_read_mcp_resource_tool` 返回 Function ToolSpec。[E: codex-rs/tools/src/mcp_resource_tool.rs:80] |
| ToolHandlerKind | `ToolHandlerKind::McpResource` | registry 为 `read_mcp_resource` 注册 `McpResource` handler kind。[E: codex-rs/tools/src/tool_registry_plan.rs:211] |
| core handler | `McpResourceHandler` | `core/src/tools/spec.rs` 注册 `mcp_resource_handler`。[E: codex-rs/core/src/tools/spec.rs:230][E: codex-rs/core/src/tools/spec.rs:231] |
| 所属 crate | spec 在 `codex-tools`，执行在 `codex-core`，MCP call events 在 `codex-protocol`。 | `McpResourceHandler` 使用 `ReadResourceRequestParams` 并通过 `EventMsg::McpToolCallBegin` 发送事件。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:11][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:570] |

## 2 用途定位

`read_mcp_resource` 的工具描述是“given the server name and resource URI” 读取具体 resource。[E: codex-rs/tools/src/mcp_resource_tool.rs:83]  
它与 `list_mcp_resources` 配套：schema description 要求 `server` 匹配 listing 返回的 `server` 字段，`uri` 是 listing 返回的 resource URI。[E: codex-rs/tools/src/mcp_resource_tool.rs:67][E: codex-rs/tools/src/mcp_resource_tool.rs:68][E: codex-rs/tools/src/mcp_resource_tool.rs:74]  
该工具调用 MCP `resources/read` 能力并把 `ReadResourceResult` 展开到 `ReadResourcePayload` 中返回。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:483][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:487][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:176][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:498]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `server` | string | 是 | 无 | MCP server name exactly as configured。 | 顶层 required 包含 `server`；runtime 会 trim 并拒绝空字符串。[E: codex-rs/tools/src/mcp_resource_tool.rs:67][E: codex-rs/tools/src/mcp_resource_tool.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:469][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:603][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:616] |
| `uri` | string | 是 | 无 | 要读取的 resource URI。 | 顶层 required 包含 `uri`；runtime 会 trim 并拒绝空字符串。[E: codex-rs/tools/src/mcp_resource_tool.rs:74][E: codex-rs/tools/src/mcp_resource_tool.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:470][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:603][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:616] |

`ReadResourceArgs` 在 handler 中定义为 `server: String` 和 `uri: String`；该 struct 没有 cursor 字段。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:55][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:56][I]  
`normalize_required_string` 会把空白字符串 normalize 成 None 并返回 `{field} must be provided`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:613][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:616]

## 4 输出 schema & 截断

ToolSpec 不声明 output schema，`output_schema` 为 `None`。[E: codex-rs/tools/src/mcp_resource_tool.rs:92]  
handler 构造 `ReadResourcePayload { server, uri, result }`，并用 `#[serde(flatten)]` 把 `ReadResourceResult` 展开到同一 JSON object。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:176][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:177][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:496][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:498]  
序列化路径与 list 工具一致：`serde_json::to_string` 后 `FunctionToolOutput::from_text(content, Some(true))`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:625][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:631]  
源码没有专门的 token/byte 截断逻辑；输出走普通 function text output。[E: codex-rs/core/src/tools/context.rs:242][E: codex-rs/core/src/tools/context.rs:277][I]

## 5 ToolSpec 类型

`read_mcp_resource` 是 Function ToolSpec，因为参数 schema 是 JSON object，handler 在 core 中调用 `session.read_resource`。[E: codex-rs/tools/src/mcp_resource_tool.rs:80][E: codex-rs/tools/src/mcp_resource_tool.rs:87][E: codex-rs/tools/src/mcp_resource_tool.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:483]  
外部 MCP namespace tools 走 `ToolPayload::Mcp` 和 `McpHandler`；`read_mcp_resource` 走 `ToolPayload::Function` 和 `McpResourceHandler`。[E: codex-rs/core/src/tools/handlers/mcp.rs:30][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:198]

## 6 注册与门控

`build_tool_registry_plan` 在 `params.mcp_tools.is_some()` 时 push `create_read_mcp_resource_tool()`，并注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:193][E: codex-rs/tools/src/tool_registry_plan.rs:205][E: codex-rs/tools/src/tool_registry_plan.rs:211]  
`params.mcp_tools` 的 runtime 输入由 `core/src/tools/spec.rs` 的 `mcp_tools: Option<HashMap<String, ToolInfo>>` 转换而来。[E: codex-rs/core/src/tools/spec.rs:73][E: codex-rs/core/src/tools/spec.rs:114]  
如果当前没有 MCP tools context，这组 resource utility 不会注册。[I]

## 7 parallel-safe

`read_mcp_resource` 的 `supports_parallel_tool_calls` 实际值是 `true`。[E: codex-rs/tools/src/tool_registry_plan.rs:206]  
handler 是读取 MCP resource 的路径；parallel-safe 与只读定位一致。[I]  
该工具读取 MCP resource，不修改本地文件或 session permissions，parallel-safe 与只读定位一致。[I]

## 8 handler 走读

1. `McpResourceHandler.handle` 在 `tool_name.name == "read_mcp_resource"` 时调用 `handle_read_resource`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:227][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:228]
2. `handle_read_resource` 解析 `ReadResourceArgs`，然后 normalize `server` 与 `uri`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:467][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:469][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:470]
3. handler 构造 `McpInvocation { server, tool: "read_mcp_resource", arguments }` 并发出 begin event。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:473][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:474][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:475][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:478]
4. handler 调用 `session.read_resource(&server, ReadResourceRequestParams { meta: None, uri })`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:483][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:484][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:486][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:487]
5. 成功结果包装成 `ReadResourcePayload` 并序列化输出。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:495][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:504]
6. 成功、序列化错误和 read 错误都会调用 `emit_tool_call_end`，event payload 使用 `McpToolCallEndEvent`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:509][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:523][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:538][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:590]

## 9 设计动机·edge·历史

`server` 必填是为了避免同一个 URI 在多个 MCP servers 中冲突；schema description 也要求 server 精确匹配 `list_mcp_resources` 返回字段。[E: codex-rs/tools/src/mcp_resource_tool.rs:65][I]  
`uri` 必填且必须来自 listing，说明 resource read 被设计成 discover-then-read 的显式两步，而不是让模型猜 URI。[E: codex-rs/tools/src/mcp_resource_tool.rs:74][I]  
事件流复用 MCP tool call begin/end events，给 UI/telemetry 一个统一的 MCP activity surface，即使该工具本身是 Codex 内建 Function utility。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:570][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:590][I]

## Sources

- `codex-rs/tools/src/mcp_resource_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/handlers/mcp.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [list_mcp_resources 工具](list-mcp-resources.md)
- [list_mcp_resource_templates 工具](list-mcp-resource-templates.md)
- [MCP namespace 工具](mcp-namespace-tools.md)
- [MCP client](../../subsystems/mcp/client.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
