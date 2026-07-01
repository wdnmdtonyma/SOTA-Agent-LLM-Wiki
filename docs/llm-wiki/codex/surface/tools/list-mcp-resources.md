---
id: tool.list-mcp-resources
title: list_mcp_resources 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp_resource_spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs]
symbols: [add_mcp_resource_tools, create_list_mcp_resources_tool, ListMcpResourcesHandler, ListResourcesArgs, ListResourcesPayload]
related: [tool.list-mcp-resource-templates, tool.read-mcp-resource, subsys.mcp.server]
evidence: explicit
status: verified
updated: db887d03e1
---

> `list_mcp_resources` 是本地 Function 工具，用于列出 MCP server 暴露的 resources；可指定单个 server 与 cursor，也可省略 server 汇总所有 configured servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:6][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:24][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:25][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:111]

## 能回答的问题

- `list_mcp_resources` 的 schema 字段和默认行为是什么？
- 何时注册这组三个 MCP resource tools？
- cursor 为什么只能和单个 server 一起使用？
- 输出如何被 JSON 序列化并截断？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | handler 返回 plain `list_mcp_resources`；spec name 也是 `list_mcp_resources`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:32][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:33][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:23][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:24] |
| handler | `ListMcpResourcesHandler` 的 `spec()` 调用 `create_list_mcp_resources_tool()`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:29][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:36][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:37] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool)`；`strict: false`，`defer_loading: None`，`output_schema: None`。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:23][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:26][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:27][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:29] |

## 2 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `server` | string | 否 | all servers | 指定 server 时只列该 server；省略时列所有 configured servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:9][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:11][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:111] |
| `cursor` | string | 否 | first page | 单 server 分页 cursor；无 server 时带 cursor 会报错。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:15][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:17][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:91][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:105][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:107] |

schema 没有 required 字段，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:28]

## 3 注册与执行

`add_mcp_resource_tools` 只在 `context.mcp_tools.is_some()` 时注册 `ListMcpResourcesHandler`、`ListMcpResourceTemplatesHandler` 和 `ReadMcpResourceHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:699][E: codex-rs/core/src/tools/spec_plan.rs:700][E: codex-rs/core/src/tools/spec_plan.rs:701][E: codex-rs/core/src/tools/spec_plan.rs:702][E: codex-rs/core/src/tools/spec_plan.rs:703]

handler 只接受 Function payload；参数先 parse 成 optional JSON，再用 default args 处理空 arguments。`server` 和 `cursor` 会 trim，空字符串会变成 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:64][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:65][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:73][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:74][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:283][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:285][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:286][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:289]

执行阶段会按 turn config 过滤 `codex_apps` server：`orchestrator_mcp_enabled` 为 false 时，指定该 server 会返回模型可见错误；汇总所有 servers 时也只列出 `model_can_access_mcp_server` 允许访问的 server。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:37][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:38][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:41][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:45][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:90][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:112][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:113]

## 4 输出与事件

单 server 输出包含 `server`、`resources` 和 camelCase `nextCursor`；all-server 输出按 server 名排序并展开为带 `server` 字段的 resources，`nextCursor` 为 none。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:106][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:108][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:109][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:111][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:115][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:122][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:124][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:128][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:130][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:133][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:135][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:142]

执行前后分别发 MCP tool-call begin/end turn item；返回内容经 JSON 序列化，再按模型 truncation policy 截断为 `FunctionToolOutput::from_text(..., Some(true))`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:85][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:128][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:134][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:310][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:317][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:319]

## 5 parallel support

`ListMcpResourcesHandler::supports_parallel_tool_calls()` 返回 true。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:40][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:41]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource_spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs`

## 相关

- [list_mcp_resource_templates 工具](list-mcp-resource-templates.md)
- [read_mcp_resource 工具](read-mcp-resource.md)
- [MCP server](../../subsystems/mcp/server.md)
