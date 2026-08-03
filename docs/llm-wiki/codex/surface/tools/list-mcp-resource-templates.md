---
id: tool.list-mcp-resource-templates
title: list_mcp_resource_templates 工具
kind: tool
tier: T1
source: [codex-rs/core/src/session/step_context.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp_resource_spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs, codex-rs/codex-mcp/src/binding.rs, codex-rs/codex-mcp/src/binding_clients.rs, codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs, codex-rs/codex-mcp/src/pagination.rs]
symbols: [create_list_mcp_resource_templates_tool, ListMcpResourceTemplatesHandler, ListResourceTemplatesPayload]
related: [tool.list-mcp-resources, tool.read-mcp-resource, subsys.mcp.server, subsys.mcp.client]
evidence: explicit
status: verified
updated: 7750465934
---

> `list_mcp_resource_templates` 是本地 Function 工具，用于列出 MCP server 暴露的 parameterized resource templates；可指定单个 server 与 cursor。wire description 把省略 server 描述为 every configured server，但执行时只汇总本 model step 捕获到 exact ready client 的 servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:33][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:38][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:52][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:87][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:218][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:247][E: codex-rs/codex-mcp/src/binding.rs:127]

## 能回答的问题

- `list_mcp_resource_templates` 的 schema 字段是什么？
- 它和 `list_mcp_resources` 的注册 gate 是否相同？
- all-server 模式如何排序和展开模板？
- 输出如何走 MCP turn item 与 truncation？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | handler 返回 plain `list_mcp_resource_templates`；spec name 也是 `list_mcp_resource_templates`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:21][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:22][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:51][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:52] |
| handler | `ListMcpResourceTemplatesHandler` 的 `spec()` 调用 `create_list_mcp_resource_templates_tool()`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:18][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:25][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:26] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool)`；`strict: false`，`defer_loading: None`，`output_schema: None`。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:51][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:54][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:55][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:57] |

## 2 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `server` | string | 否 | omitted | 指定 server 时只列该 server；省略时 wire 文案称“所有已配置 server”，实际汇总 step-ready servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:36][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:38][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:87][E: codex-rs/codex-mcp/src/binding.rs:127] |
| `cursor` | string | 否 | first page | 单 server 分页 cursor；无 server 时带 cursor 会报错。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:43][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:45][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:76][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:83][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:90] |

schema 没有 required 字段，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:56]

## 3 注册与执行

`add_mcp_resource_tools` 在当前 step binding 报告 `has_servers()` 时注册三件套，其中包括 `ListMcpResourceTemplatesHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:783][E: codex-rs/core/src/tools/spec_plan.rs:784][E: codex-rs/core/src/tools/spec_plan.rs:786]

handler 只接受 Function payload；参数 parse 和 optional string normalization 与 `list_mcp_resources` 共用 helper，空字符串会被 trim 后转成 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:53][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:54][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:62][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:64][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:326][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:328][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:329][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:332]

模板 list 从 `StepContext.mcp` 进入；capture 过程只把 exact ready clients 插入 `McpBindingClients`。指定 server 在该集合中时固定用它，否则回退 binding 持有的 live connection set；all-server 汇总只遍历 step-ready clients。注册门控检查 connection set 的 `has_servers()`，不检查 ready-client map，所以 handler 可在本步没有 ready client 时仍被注册。[E: codex-rs/core/src/session/step_context.rs:20][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:50][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:218][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:247][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:251][E: codex-rs/codex-mcp/src/binding.rs:90][E: codex-rs/codex-mcp/src/binding.rs:118][E: codex-rs/codex-mcp/src/binding.rs:121][E: codex-rs/codex-mcp/src/binding.rs:127][E: codex-rs/core/src/tools/spec_plan.rs:784]

单 server 模式返回一页和 `nextCursor`；all-server 模式通过共享 pagination collector 取完每个 server 的所有页，并受 100 页、2,048 项、64 KiB cursor、重复 cursor 和整体超时保护。[E: codex-rs/codex-mcp/src/binding_clients.rs:108][E: codex-rs/codex-mcp/src/binding_clients.rs:122][E: codex-rs/codex-mcp/src/pagination.rs:9][E: codex-rs/codex-mcp/src/pagination.rs:30][E: codex-rs/codex-mcp/src/pagination.rs:40][E: codex-rs/codex-mcp/src/pagination.rs:50][E: codex-rs/codex-mcp/src/pagination.rs:55]

## 4 输出与事件

单 server 输出包含 `server`、camelCase `resourceTemplates` 和 `nextCursor`；all-server 输出按 server 名排序并展开为带 `server` 字段的 templates，`nextCursor` 为 none。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:162][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:164][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:165][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:167][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:171][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:173][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:174][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:175][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:179][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:181][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:182][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:183]

执行由共享 `run_resource_operation` 包装：开始与完成各发 MCP tool-call turn item，payload 经 JSON 序列化和 truncation 后作为 successful function output 返回。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:72][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:216][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:233][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:260][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:290][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:293][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:309]

## 5 parallel support

`ListMcpResourceTemplatesHandler::supports_parallel_tool_calls()` 返回 true。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:29][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:30]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource_spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs`
- `codex-rs/codex-mcp/src/binding.rs`
- `codex-rs/codex-mcp/src/binding_clients.rs`
- `codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs`
- `codex-rs/codex-mcp/src/pagination.rs`

## 相关

- [list_mcp_resources 工具](list-mcp-resources.md)
- [read_mcp_resource 工具](read-mcp-resource.md)
- [MCP server](../../subsystems/mcp/server.md)
