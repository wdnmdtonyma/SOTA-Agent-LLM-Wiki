---
id: tool.list-mcp-resource-templates
title: list_mcp_resource_templates 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp_resource_spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs]
symbols: [add_mcp_resource_tools, create_list_mcp_resource_templates_tool, ListMcpResourceTemplatesHandler, ListResourceTemplatesArgs, ListResourceTemplatesPayload]
related: [tool.list-mcp-resources, tool.read-mcp-resource, subsys.mcp.server]
evidence: explicit
status: verified
updated: 5670360009
---

> `list_mcp_resource_templates` 是本地 Function 工具，用于列出 MCP server 暴露的 parameterized resource templates；可指定单个 server 与 cursor，也可省略 server 汇总所有 configured servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:33][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:52][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:53][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:85][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:108]

## 能回答的问题

- `list_mcp_resource_templates` 的 schema 字段是什么？
- 它和 `list_mcp_resources` 的注册 gate 是否相同？
- all-server 模式如何排序和展开模板？
- 输出如何走 MCP turn item 与 truncation？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | handler 返回 plain `list_mcp_resource_templates`；spec name 也是 `list_mcp_resource_templates`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:30][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:31][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:51][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:52] |
| handler | `ListMcpResourceTemplatesHandler` 的 `spec()` 调用 `create_list_mcp_resource_templates_tool()`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:27][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:34][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:35] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool)`；`strict: false`，`defer_loading: None`，`output_schema: None`。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:51][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:54][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:55][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:57] |

## 2 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `server` | string | 否 | all servers | 指定 server 时只列该 server；省略时列所有 configured servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:36][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:38][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:85][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:108] |
| `cursor` | string | 否 | first page | 单 server 分页 cursor；无 server 时带 cursor 会报错。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:43][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:45][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:86][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:102][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:104] |

schema 没有 required 字段，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:56]

## 3 注册与执行

`add_mcp_resource_tools` 只在 `context.mcp_tools.is_some()` 时注册三件套，其中包括 `ListMcpResourceTemplatesHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:680][E: codex-rs/core/src/tools/spec_plan.rs:681][E: codex-rs/core/src/tools/spec_plan.rs:682][E: codex-rs/core/src/tools/spec_plan.rs:683][E: codex-rs/core/src/tools/spec_plan.rs:684]

handler 只接受 Function payload；参数 parse 和 optional string normalization 与 `list_mcp_resources` 共用 helper，空字符串会被 trim 后转成 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:60][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:61][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:69][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:70][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:255][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:257][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:258][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:261]

## 4 输出与事件

单 server 输出包含 `server`、camelCase `resourceTemplates` 和 `nextCursor`；all-server 输出按 server 名排序并展开为带 `server` 字段的 templates，`nextCursor` 为 none。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:131][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:133][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:134][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:136][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:140][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:147][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:149][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:153][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:156][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:158][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:161][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:168]

执行前后分别发 MCP tool-call begin/end turn item；返回内容经 JSON 序列化和 truncation 后作为 successful text output 返回。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:81][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:126][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:132][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:282][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:289][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:291]

## 5 parallel support

`ListMcpResourceTemplatesHandler::supports_parallel_tool_calls()` 返回 true。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:38][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:39]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource_spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs`

## 相关

- [list_mcp_resources 工具](list-mcp-resources.md)
- [read_mcp_resource 工具](read-mcp-resource.md)
- [MCP server](../../subsystems/mcp/server.md)
