---
id: tool.list-mcp-resources
title: list_mcp_resources 工具
kind: tool
tier: T1
source: [codex-rs/core/src/session/step_context.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp_resource_spec.rs, codex-rs/core/src/tools/handlers/mcp_resource.rs, codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs, codex-rs/codex-mcp/src/binding.rs, codex-rs/codex-mcp/src/binding_clients.rs, codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs, codex-rs/codex-mcp/src/pagination.rs]
symbols: [create_list_mcp_resources_tool, ListMcpResourcesHandler, ListResourceArgs, ListResourcesPayload, ResourceWithServer, run_resource_operation, collect_paginated]
related: [tool.list-mcp-resource-templates, tool.read-mcp-resource, subsys.mcp.server, subsys.mcp.client]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `list_mcp_resources` 是本地 Function 工具，用于列出 MCP server 暴露的 resources；可指定单个 server 与 cursor。wire description 把省略 server 描述为 every configured server，但执行时只汇总本 model step 捕获到的 step-ready clients。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:11][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:24][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:85][E: codex-rs/codex-mcp/src/binding.rs:106][E: codex-rs/codex-mcp/src/binding.rs:110]

## 能回答的问题

- `list_mcp_resources` 的 schema 字段和默认行为是什么？
- 何时注册这组三个 MCP resource tools？
- cursor 为什么只能和单个 server 一起使用？
- 输出如何被 JSON 序列化并截断？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | handler 返回 plain `list_mcp_resources`；spec name 也是 `list_mcp_resources`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:22][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:24] |
| handler | `ListMcpResourcesHandler` 的 `spec()` 调用 `create_list_mcp_resources_tool()`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:26] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool)`；`strict: false`，`defer_loading: None`，`output_schema: None`。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:23][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:27][E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:29] |

## 2 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `server` | string | 否 | omitted | 指定 server 时只列该 server；省略时 wire 文案称“所有已配置 server”，实际汇总 step-ready servers。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:11][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:85][E: codex-rs/codex-mcp/src/binding.rs:106] |
| `cursor` | string | 否 | first page | 单 server 分页 cursor；无 server 时带 cursor 会报错。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:17][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:89][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:90] |

schema 没有 required 字段，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/mcp_resource_spec.rs:28]

## 3 注册与执行

`add_mcp_resource_tools` 只要当前 step binding `has_servers()` 为 true 就注册 `ListMcpResourcesHandler`、`ListMcpResourceTemplatesHandler` 和 `ReadMcpResourceHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:1025][E: codex-rs/core/src/tools/spec_plan.rs:1026][E: codex-rs/core/src/tools/spec_plan.rs:1027][E: codex-rs/core/src/tools/spec_plan.rs:1028][E: codex-rs/core/src/tools/spec_plan.rs:1029]

handler 只接受 Function payload；参数先 parse 成 optional JSON，再用 default args 处理空 arguments。`server` 和 `cursor` 会 trim，空字符串会变成 `None`。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:53][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:63][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:326][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:328][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:332]

执行阶段会按 turn config 过滤 `codex_apps` server：`orchestrator_mcp_enabled` 为 false 时，指定该 server 会返回模型可见错误；汇总 step-ready servers 时也只列出 `model_can_access_mcp_server` 允许访问的 server。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:43][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:44][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:54][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:86][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:87]

handler 从 `StepContext.mcp` 取本次 sampling request 的 `McpBinding`。单 server 模式优先使用该 step 捕获的 ready client，缺失时回退 binding 持有的 live connection set；all-server 模式只遍历 step-ready clients，不走回退。注册门控 `McpBinding::has_servers()` 检查的是 connection set 是否有 server，不是 ready-client map，所以三件套可能在本步没有 ready client 时仍注册。[E: codex-rs/core/src/session/step_context.rs:42][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:51][E: codex-rs/codex-mcp/src/binding.rs:90][E: codex-rs/codex-mcp/src/binding.rs:99][E: codex-rs/codex-mcp/src/binding.rs:102][E: codex-rs/codex-mcp/src/binding.rs:106][E: codex-rs/core/src/tools/spec_plan.rs:1026]

capture 现在允许 startup 尚未完成但 `has_cached_tools()` 的 server 贡献 cached ToolInfo；这不等于 all-server resource list 一定能读到 live client，resource list 仍走 `McpBindingClients`。[E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:196][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:233][E: codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs:236][I]

三种 resource handler 共享参数/输出包装与 `run_resource_operation` 的 begin/end、JSON 序列化、截断流程。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:60][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:280]

## 4 输出与事件

单 server 输出包含 `server`、`resources` 和 camelCase `nextCursor`；all-server 输出按 server 名排序并展开为带 `server` 字段的 resources，`nextCursor` 为 none。[E: codex-rs/core/src/tools/handlers/mcp_resource.rs:133][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:137][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:139][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:147][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:155]

单 server 模式只取调用者指定 cursor 对应的一页并返回 `nextCursor`；all-server 模式会为每个 captured server 连续取完所有页。公共 collector 限制最多 100 页、2,048 项、64 KiB cursor，拒绝重复 cursor，默认整体超时 30 秒。[E: codex-rs/codex-mcp/src/binding_clients.rs:80][E: codex-rs/codex-mcp/src/binding_clients.rs:94][E: codex-rs/codex-mcp/src/pagination.rs:9][E: codex-rs/codex-mcp/src/pagination.rs:10][E: codex-rs/codex-mcp/src/pagination.rs:12][E: codex-rs/codex-mcp/src/pagination.rs:13][E: codex-rs/codex-mcp/src/pagination.rs:44][E: codex-rs/codex-mcp/src/pagination.rs:64][E: codex-rs/codex-mcp/src/pagination.rs:69]

执行由共享 `run_resource_operation` 包装：开始与完成各发 MCP tool-call turn item，payload 经 JSON 序列化并按模型 truncation policy 截断，成功时返回 boxed function output。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:72][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:290][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:293][E: codex-rs/core/src/tools/handlers/mcp_resource.rs:309]

## 5 parallel support

`ListMcpResourcesHandler::supports_parallel_tool_calls()` 返回 true。[E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:29][E: codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs:30]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource_spec.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource.rs`
- `codex-rs/core/src/tools/handlers/mcp_resource/list_mcp_resources.rs`
- `codex-rs/codex-mcp/src/binding.rs`
- `codex-rs/codex-mcp/src/binding_clients.rs`
- `codex-rs/codex-mcp/src/connection_manager/tool_catalog.rs`
- `codex-rs/codex-mcp/src/pagination.rs`

## 相关

- [list_mcp_resource_templates 工具](list-mcp-resource-templates.md)
- [read_mcp_resource 工具](read-mcp-resource.md)
- [MCP server](../../subsystems/mcp/server.md)
