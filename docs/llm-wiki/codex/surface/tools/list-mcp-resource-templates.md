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
updated: db887d03e1
---

> `list_mcp_resource_templates` 是本地 Function 工具，用于列出 MCP server 暴露的 parameterized resource templates；可指定单个 server 与 cursor，也可省略 server 汇总所有 configured servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:33][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:52][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:53][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:113]

## 能回答的问题

- `list_mcp_resource_templates` 的 schema 字段是什么？
- 它和 `list_mcp_resources` 的注册 gate 是否相同？
- all-server 模式如何排序和展开模板？
- 输出如何走 MCP turn item 与 truncation？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | handler 返回 plain `list_mcp_resource_templates`；spec name 也是 `list_mcp_resource_templates`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:32][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:33][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:51][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:52] |
| handler | `ListMcpResourceTemplatesHandler` 的 `spec()` 调用 `create_list_mcp_resource_templates_tool()`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:29][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:36][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:37] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool)`；`strict: false`，`defer_loading: None`，`output_schema: None`。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:51][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:54][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:55][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:57] |

## 2 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `server` | string | 否 | all servers | 指定 server 时只列该 server；省略时列所有 configured servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:36][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:38][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:113] |
| `cursor` | string | 否 | first page | 单 server 分页 cursor；无 server 时带 cursor 会报错。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:43][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:45][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:91][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:107][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:109] |

schema 没有 required 字段，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:56]

## 3 注册与执行

`add_mcp_resource_tools` 只在 `context.mcp_tools.is_some()` 时注册三件套，其中包括 `ListMcpResourceTemplatesHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:699][E: codex-rs/core/src/tools/spec_plan.rs:700][E: codex-rs/core/src/tools/spec_plan.rs:701][E: codex-rs/core/src/tools/spec_plan.rs:702][E: codex-rs/core/src/tools/spec_plan.rs:703]

handler 只接受 Function payload；参数 parse 和 optional string normalization 与 `list_mcp_resources` 共用 helper，空字符串会被 trim 后转成 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:64][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:65][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:73][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:77][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:283][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:285][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:286][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:289]

## 4 输出与事件

单 server 输出包含 `server`、camelCase `resourceTemplates` 和 `nextCursor`；all-server 输出按 server 名排序并展开为带 `server` 字段的 templates，`nextCursor` 为 none。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:148][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:151][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:152][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:154][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:157][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:158][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:165][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:167][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:171][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:174][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:176][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:179][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:186]

执行前后分别发 MCP tool-call begin/end turn item；返回内容经 JSON 序列化和 truncation 后作为 successful text output 返回。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:85][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:125][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:136][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:139][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:219][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:236][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:263]

## 5 parallel support

`ListMcpResourceTemplatesHandler::supports_parallel_tool_calls()` 返回 true。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:40][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs:41]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource_spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resource_templates.rs`

## 相关

- [list_mcp_resources 工具](list-mcp-resources.md)
- [read_mcp_resource 工具](read-mcp-resource.md)
- [MCP server](../../subsystems/mcp/server.md)
