---
id: tool.read-mcp-resource
title: read_mcp_resource 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp_resource_spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs]
symbols: [add_mcp_resource_tools, create_read_mcp_resource_tool, ReadMcpResourceHandler, ReadResourceArgs, ReadResourcePayload]
related: [tool.list-mcp-resources, tool.list-mcp-resource-templates, subsys.mcp.server]
evidence: explicit
status: verified
updated: 5670360009
---

> `read_mcp_resource` 是本地 Function 工具，用给定 server 名和 resource URI 读取单个 MCP resource。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:61][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:80][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:82][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:85][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:86]

## 能回答的问题

- `read_mcp_resource` 的必填参数是什么？
- server/uri 如何被 trim 和校验？
- 输出如何包装 server、uri 和 MCP read result？
- 它与 list resource tools 的注册 gate 是否一致？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | handler 返回 plain `read_mcp_resource`；spec name 也是 `read_mcp_resource`。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:30][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:31][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:79][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:80] |
| handler | `ReadMcpResourceHandler` 的 `spec()` 调用 `create_read_mcp_resource_tool()`。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:27][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:34][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:35] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool)`；`strict: false`，`defer_loading: None`，`output_schema: None`。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:79][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:84][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:85][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:91] |

## 2 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `server` | string | 是 | 无 | MCP server name，必须与 `list_mcp_resources` 返回的 server 字段匹配。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:64][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:66][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:88] |
| `uri` | string | 是 | 无 | 要读取的 resource URI。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:71][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:73][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:88] |

schema required 是 `server` 和 `uri`，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:86][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:88][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:89]

## 3 注册与执行

`add_mcp_resource_tools` 只在 `context.mcp_tools.is_some()` 时注册三件套，其中包括 `ReadMcpResourceHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:680][E: codex-rs/core/src/tools/spec_plan.rs:681][E: codex-rs/core/src/tools/spec_plan.rs:682][E: codex-rs/core/src/tools/spec_plan.rs:683][E: codex-rs/core/src/tools/spec_plan.rs:684]

handler 只接受 Function payload；它把 arguments 反序列化成 `ReadResourceArgs`，再对 `server` 和 `uri` 使用 `normalize_required_string`，该 helper 先 trim，空字符串会返回 `{field} must be provided`。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:60][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:61][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:69][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:70][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:72][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:73][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:257][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:258][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:266][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:267][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:268][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:270]

## 4 输出与事件

读取成功后，payload 包含 `server`、`uri`，并 flatten MCP `ReadResourceResult`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:173][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:175][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:176][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:177][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:178][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:92][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:95]

执行前后分别发 MCP tool-call begin/end turn item；返回内容经 JSON 序列化和 truncation 后作为 successful text output 返回。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:81][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:107][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:113][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:282][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:289][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:291]

## 5 parallel support

`ReadMcpResourceHandler::supports_parallel_tool_calls()` 返回 true。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:38][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:39]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource_spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs`

## 相关

- [list_mcp_resources 工具](list-mcp-resources.md)
- [list_mcp_resource_templates 工具](list-mcp-resource-templates.md)
- [MCP server](../../subsystems/mcp/server.md)
