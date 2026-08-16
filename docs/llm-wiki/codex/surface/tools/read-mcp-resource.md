---
id: tool.read-mcp-resource
title: read_mcp_resource 工具
kind: tool
tier: T1
source: [codex-rs/core/src/session/step_context.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp_resource_spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs, codex-rs/codex-mcp/src/binding.rs, codex-rs/codex-mcp/src/binding_clients.rs, codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs, codex-rs/codex-mcp/src/resource_client.rs]
symbols: [create_read_mcp_resource_tool, ReadMcpResourceHandler, ReadResourceArgs, ReadResourcePayload]
related: [tool.list-mcp-resources, tool.list-mcp-resource-templates, subsys.mcp.server, subsys.mcp.client]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `read_mcp_resource` 是本地 Function 工具，用给定 server 名和 resource URI 读取单个 MCP resource。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:80][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:82][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:79][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:80]

## 能回答的问题

- `read_mcp_resource` 的必填参数是什么？
- server/uri 如何被 trim 和校验？
- 输出如何包装 server、uri 和 MCP read result？
- 它与 list resource tools 的注册 gate 是否一致？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | handler 返回 plain `read_mcp_resource`；spec name 也是 `read_mcp_resource`。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:25][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:80] |
| handler | `ReadMcpResourceHandler` 的 `spec()` 调用 `create_read_mcp_resource_tool()`。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:29] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool)`；`strict: false`，`defer_loading: None`，`output_schema: None`。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:79][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:85][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:91] |

## 2 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `server` | string | 是 | 无 | MCP server name，必须与 `list_mcp_resources` 返回的 server 字段匹配。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:66][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:88] |
| `uri` | string | 是 | 无 | 要读取的 resource URI。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:73][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:88] |

schema required 是 `server` 和 `uri`，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:86][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:88][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:89]

## 3 注册与执行

`add_mcp_resource_tools` 在当前 step binding 报告 `has_servers()` 时注册三件套，其中包括 `ReadMcpResourceHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:1025][E: codex-rs/core/src/tools/spec_plan.rs:1026][E: codex-rs/core/src/tools/spec_plan.rs:1029]

handler 只接受 Function payload；它把 arguments 反序列化成 `ReadResourceArgs`，再对 `server` 和 `uri` 使用 `normalize_required_string`，该 helper 先 trim，空字符串会返回 `{field} must be provided`。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:56][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:66][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:68][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:337][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:340]

执行阶段会按 turn config 过滤 `codex_apps` server：`orchestrator_mcp_enabled` 为 false 时，`ensure_model_can_access_mcp_server` 会把该 server 读请求拒绝为模型可见错误。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:43][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:47][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:54][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:78]

read 从本 sampling step 捕获的 `McpBinding` 进入。有 step-ready client 时使用它，server 不在该集合中时回退 binding 持有的 live connection set。注册门控检查 connection set 的 `has_servers()`，因此本步 ready-client map 为空时 read handler 仍可能注册。供 extension 使用的 thread-owned `McpResourceClient` 则每次直接跟随 runtime 最新 publication，两者生命周期不同。[E: codex-rs/core/src/session/step_context.rs:42][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:54][E: codex-rs/codex-mcp/src/binding.rs:90][E: codex-rs/codex-mcp/src/binding.rs:141][E: codex-rs/codex-mcp/src/binding.rs:144][E: codex-rs/core/src/tools/spec_plan.rs:1026][I]

read 与两种 list handler 共用 `run_resource_operation`：统一发 begin/end turn item、序列化输出并应用模型 truncation policy，而各 handler 只负责参数校验和具体 binding 调用。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:280][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:293][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:309]

## 4 输出与事件

读取成功后，payload 包含 `server`、`uri`，并 flatten MCP `ReadResourceResult`。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:189][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:192][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:193][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:86]

执行由共享 `run_resource_operation` 包装：开始与完成各发 MCP tool-call turn item，payload 经 JSON 序列化和 truncation 后作为 successful function output 返回。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:77][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:216][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:233][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:309]

## 5 parallel support

`ReadMcpResourceHandler::supports_parallel_tool_calls()` 返回 true。[E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:32][E: codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs:33]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource_spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource/read_mcp_resource.rs`
- `codex-rs/codex-mcp/src/binding.rs`
- `codex-rs/codex-mcp/src/binding_clients.rs`
- `codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs`
- `codex-rs/codex-mcp/src/resource_client.rs`

## 相关

- [list_mcp_resources 工具](list-mcp-resources.md)
- [list_mcp_resource_templates 工具](list-mcp-resource-templates.md)
- [MCP server](../../subsystems/mcp/server.md)
