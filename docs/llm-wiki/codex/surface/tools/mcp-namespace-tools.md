---
id: tool.mcp-namespace-tools
title: MCP namespace 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/mcp_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/responses_api.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/mcp.rs, codex-rs/protocol/src/tool_name.rs]
symbols: [parse_mcp_tool, mcp_call_tool_result_output_schema, mcp_tool_to_responses_api_tool, ResponsesApiNamespace, ResponsesApiNamespaceTool, ToolHandlerKind::Mcp, McpHandler, ToolName]
related: [tool.tool-search, tool.list-mcp-resources, tool.dynamic-tools, subsys.mcp.client, subsys.mcp.name-qualification, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> MCP namespace tools 是 Codex 把已加载 MCP server tools 合并成 Responses API `namespace` ToolSpec 的工具面；每个 MCP tool 必须保留 namespace，并注册到同一个本地 `McpHandler` 转发执行。[E: codex-rs/tools/src/tool_registry_plan.rs:497][E: codex-rs/tools/src/tool_registry_plan.rs:503][E: codex-rs/tools/src/tool_registry_plan.rs:548][E: codex-rs/core/src/tools/spec.rs:228][E: codex-rs/core/src/tools/handlers/mcp.rs:47]

## 能回答的问题

- MCP tool 为什么必须 namespaced？
- MCP tool 的 input schema 和 output schema 如何转换成 Responses API tool？
- namespace description 如何从 MCP namespace metadata 或默认描述生成？
- registry 如何把同一 namespace 的多个 MCP tool 合并为一个 `ToolSpec::Namespace`？
- MCP namespace tools 与 deferred `tool_search` MCP tools 有什么区别？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | 动态 namespaced；顶层 spec name 是 MCP namespace，namespace 内 tool name 是 callable name。 | `ToolSpec::name()` 对 `Namespace` 返回 namespace name；registry push `ToolSpec::Namespace(ResponsesApiNamespace { name: namespace, ... })`。[E: codex-rs/tools/src/tool_spec.rs:64][E: codex-rs/tools/src/tool_registry_plan.rs:548][E: codex-rs/tools/src/tool_registry_plan.rs:549] |
| aliases | 无静态 alias；每个 MCP tool 以 `ToolName { namespace, name }` 注册。 | registry 对每个成功转换的 MCP tool 调用 `plan.register_handler(tool.name, ToolHandlerKind::Mcp)`。[E: codex-rs/tools/src/tool_registry_plan.rs:532][E: codex-rs/tools/src/tool_registry_plan.rs:535] |
| ToolSpec 类型 | `ToolSpec::Namespace(ResponsesApiNamespace)` | namespace spec 包含 `name/description/tools` 三个字段。[E: codex-rs/tools/src/responses_api.rs:53][E: codex-rs/tools/src/responses_api.rs:54][E: codex-rs/tools/src/responses_api.rs:55] |
| ToolHandlerKind | `ToolHandlerKind::Mcp` | `ToolHandlerKind` enum 定义 `Mcp`，core match 将该 kind 绑定到 `mcp_handler`。[E: codex-rs/tools/src/tool_registry_plan_types.rs:25][E: codex-rs/core/src/tools/spec.rs:227][E: codex-rs/core/src/tools/spec.rs:228] |
| core handler | `McpHandler` | `McpHandler.kind()` 返回 `ToolKind::Mcp`，handle 时只接受 `ToolPayload::Mcp`。[E: codex-rs/core/src/tools/handlers/mcp.rs:18][E: codex-rs/core/src/tools/handlers/mcp.rs:30] |
| 所属 crate | schema 转换在 `codex-tools`，执行转发在 `codex-core`。 | `parse_mcp_tool` 生成 `ToolDefinition`，`McpHandler` 调用 `handle_mcp_tool_call`。[E: codex-rs/tools/src/mcp_tool.rs:6][E: codex-rs/core/src/tools/handlers/mcp.rs:47] |

## 2 用途定位

MCP namespace tools 用于把当前 turn 已经可用的 MCP tool 直接暴露给模型；registry 会按 namespace 分组，将每组 MCP tools 放进一个 Responses API namespace spec。[E: codex-rs/tools/src/tool_registry_plan.rs:497][E: codex-rs/tools/src/tool_registry_plan.rs:514][E: codex-rs/tools/src/tool_registry_plan.rs:548]  
没有 namespace 的 MCP tool 会被跳过并记录 error，因为 registry 明确要求 MCP tools must be namespaced。[E: codex-rs/tools/src/tool_registry_plan.rs:502][E: codex-rs/tools/src/tool_registry_plan.rs:506]  
这些 direct MCP namespace tools 与 deferred MCP discovery 不同：direct path 直接 push `ToolSpec::Namespace`；deferred path 的 registry block 为 deferred MCP tools 注册 `ToolHandlerKind::Mcp`，但可发现性入口由 `tool_search` 暴露。[E: codex-rs/tools/src/tool_registry_plan.rs:546][E: codex-rs/tools/src/tool_registry_plan.rs:293][E: codex-rs/tools/src/tool_registry_plan.rs:295][I]

## 3 输入 schema 表

MCP namespace tool 的每个函数 schema 来自 MCP server 提供的 `rmcp::model::Tool.input_schema`，Codex 会先转成 JSON object，再调用统一的 `parse_tool_input_schema`。[E: codex-rs/tools/src/mcp_tool.rs:7][E: codex-rs/tools/src/mcp_tool.rs:21]

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| MCP tool input schema | JSON schema object | 由 MCP tool 定义决定 | 无 | 被转换成 `ResponsesApiTool.parameters`。 | 如果 `properties` 缺失或为 null，Codex 插入空 object 以满足 OpenAI models 要求。[E: codex-rs/tools/src/mcp_tool.rs:13][E: codex-rs/tools/src/mcp_tool.rs:17] |
| MCP tool description | string / absent | 否 | `""` | 被转换成 `ResponsesApiTool.description`。 | `parse_mcp_tool` 对缺失 description 使用空字符串。[E: codex-rs/tools/src/mcp_tool.rs:29][E: codex-rs/tools/src/mcp_tool.rs:30] |
| callable name | string | 是 | 无 | namespace 内 Function tool 的 name。 | `mcp_tool_to_responses_api_tool` 用 `tool.name` 重命名 parsed MCP tool，确保注册名与 callable name 一致。[E: codex-rs/tools/src/responses_api.rs:122][E: codex-rs/tools/src/responses_api.rs:128] |

`ResponsesApiTool.strict` 固定为 false，`defer_loading` 只有 `ToolDefinition.defer_loading` 为 true 时才序列化；direct MCP conversion 的 `parse_mcp_tool` 把 `defer_loading` 设置为 false。[E: codex-rs/tools/src/responses_api.rs:146][E: codex-rs/tools/src/responses_api.rs:147][E: codex-rs/tools/src/mcp_tool.rs:35]

## 4 输出 schema & 截断

MCP tool output schema 被包装为一个 object，包含 `content`、`structuredContent`、`isError` 和 `_meta` properties。[E: codex-rs/tools/src/mcp_tool.rs:41][E: codex-rs/tools/src/mcp_tool.rs:49][E: codex-rs/tools/src/mcp_tool.rs:50][E: codex-rs/tools/src/mcp_tool.rs:53]  
`content` 是唯一 required 字段，`additionalProperties` 为 false。[E: codex-rs/tools/src/mcp_tool.rs:57][E: codex-rs/tools/src/mcp_tool.rs:58]  
如果 MCP tool 有 output schema，Codex 把它作为 `structuredContent` 的 schema；没有 output schema 时使用空 object。[E: codex-rs/tools/src/mcp_tool.rs:22][E: codex-rs/tools/src/mcp_tool.rs:26]  
`McpHandler` 返回 `McpToolOutput { result, wall_time, original_image_detail_supported }`，具体截断/格式化由 MCP tool call handling 与输出转换链路处理，不在 `mcp_tool.rs` schema conversion 中完成。[E: codex-rs/core/src/tools/handlers/mcp.rs:57][E: codex-rs/core/src/tools/handlers/mcp.rs:61][I]

## 5 ToolSpec 类型

顶层 MCP 工具面使用 `ToolSpec::Namespace`，namespace 内每个 tool 使用 `ResponsesApiNamespaceTool::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/tool_registry_plan.rs:548][E: codex-rs/tools/src/responses_api.rs:62][E: codex-rs/tools/src/responses_api.rs:66]  
`ResponsesApiNamespace` 的字段是 `name`、`description` 和 `tools`，所以 MCP namespace 不是一个普通 Function，而是一个包含多个 function tools 的 namespace 容器。[E: codex-rs/tools/src/responses_api.rs:51][E: codex-rs/tools/src/responses_api.rs:55]  
`parse_mcp_tool` 返回的 `ToolDefinition.output_schema` 总是 `Some(mcp_call_tool_result_output_schema(...))`，因此 MCP function tools 有显式 output schema 数据保存在 `ResponsesApiTool.output_schema` 中，虽然该字段 serde skip 不直接序列化进普通 request JSON。[E: codex-rs/tools/src/mcp_tool.rs:32][E: codex-rs/tools/src/responses_api.rs:36][E: codex-rs/tools/src/responses_api.rs:37]

## 6 注册与门控

MCP namespace tools 的 registry gate 是 `params.mcp_tools` 是否为 `Some`；如果没有 MCP tools 集合，该 block 不运行。[E: codex-rs/tools/src/tool_registry_plan.rs:497]  
registry 先按 `tool.name.display()` 排序，再用 `BTreeMap` 按 namespace 分组，保证 namespace 输出顺序稳定。[E: codex-rs/tools/src/tool_registry_plan.rs:498][E: codex-rs/tools/src/tool_registry_plan.rs:500][I]  
namespace description 优先使用 `params.tool_namespaces[namespace].description` 的非空 trim 结果；否则使用 `default_namespace_description(namespace_name)`。[E: codex-rs/tools/src/tool_registry_plan.rs:516][E: codex-rs/tools/src/tool_registry_plan.rs:528]  
每个成功转换的 MCP tool 都注册到 `ToolHandlerKind::Mcp`；如果转换失败，只记录 error 并跳过该 tool。[E: codex-rs/tools/src/tool_registry_plan.rs:532][E: codex-rs/tools/src/tool_registry_plan.rs:540]  
只有 namespace 内至少有一个成功转换的 tool 时，registry 才 push `ToolSpec::Namespace`。[E: codex-rs/tools/src/tool_registry_plan.rs:546][E: codex-rs/tools/src/tool_registry_plan.rs:555]

## 7 parallel-safe

MCP namespace tool specs 的 `supports_parallel_tool_calls` 实际值是 `false`。[E: codex-rs/tools/src/tool_registry_plan.rs:547][E: codex-rs/tools/src/tool_registry_plan.rs:553]  
该设置对整个 namespace spec 生效；源码没有按单个 MCP tool 的 side-effect 属性单独标注 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:546][E: codex-rs/tools/src/tool_registry_plan.rs:555][I]

## 8 handler 走读

1. `build_tool_registry_plan` 读取 `params.mcp_tools`，复制成 entries 并按 display name 排序。[E: codex-rs/tools/src/tool_registry_plan.rs:497][E: codex-rs/tools/src/tool_registry_plan.rs:499]
2. registry 跳过没有 namespace 的 MCP tool，并把有 namespace 的 tool 放进 `namespace_entries`。[E: codex-rs/tools/src/tool_registry_plan.rs:502][E: codex-rs/tools/src/tool_registry_plan.rs:511]
3. 对每个 namespace，registry 再按 tool name 排序，并计算 namespace description。[E: codex-rs/tools/src/tool_registry_plan.rs:514][E: codex-rs/tools/src/tool_registry_plan.rs:529]
4. registry 调用 `mcp_tool_to_responses_api_tool(&tool.name, tool.tool)`，把 MCP schema 转成 Responses API function tool。[E: codex-rs/tools/src/tool_registry_plan.rs:532][E: codex-rs/tools/src/responses_api.rs:122]
5. 转换成功后，registry 把 function tool 加入 namespace tools，并注册 `ToolHandlerKind::Mcp`。[E: codex-rs/tools/src/tool_registry_plan.rs:533][E: codex-rs/tools/src/tool_registry_plan.rs:535]
6. core build 阶段遇到 `ToolHandlerKind::Mcp` 时，把该 name 注册到共享 `mcp_handler`。[E: codex-rs/core/src/tools/spec.rs:227][E: codex-rs/core/src/tools/spec.rs:228]
7. 模型调用 MCP namespace tool 时，handler 只接受 `ToolPayload::Mcp { server, tool, raw_arguments }`，然后调用 `handle_mcp_tool_call` 转发到 MCP 连接。[E: codex-rs/core/src/tools/handlers/mcp.rs:30][E: codex-rs/core/src/tools/handlers/mcp.rs:47]

## 9 设计动机·edge·历史

强制 namespace 可以避免来自不同 MCP server 或 connector 的 tool name 冲突；源码在遇到无 namespace MCP tool 时直接跳过并记录 error。[E: codex-rs/tools/src/tool_registry_plan.rs:502][E: codex-rs/tools/src/tool_registry_plan.rs:506][I]  
给缺失 `properties` 的 MCP input schema 注入空 object 是为了满足 OpenAI models 对 schema 的要求；源码注释还说明该行为对齐 Agents SDK。[E: codex-rs/tools/src/mcp_tool.rs:9][E: codex-rs/tools/src/mcp_tool.rs:11][E: codex-rs/tools/src/mcp_tool.rs:17]  
direct MCP tools 使用 `mcp_tool_to_responses_api_tool`，不会设置 `defer_loading`；deferred MCP tools 使用 `mcp_tool_to_deferred_responses_api_tool`，会调用 `into_deferred()` 并设置 `defer_loading: true`。[E: codex-rs/tools/src/responses_api.rs:122][E: codex-rs/tools/src/responses_api.rs:131][E: codex-rs/tools/src/responses_api.rs:138]  
`ToolName::display()` 目前把 namespace 与 name 直接拼接，没有分隔符；registry 排序与 error 文本都使用这个 display 结果。[E: codex-rs/protocol/src/tool_name.rs:35][E: codex-rs/tools/src/tool_registry_plan.rs:498]

## Sources

- `codex-rs/tools/src/mcp_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/mcp.rs`
- `codex-rs/protocol/src/tool_name.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [list_mcp_resources 工具](list-mcp-resources.md)
- [dynamic 工具](dynamic-tools.md)
- [MCP client](../../subsystems/mcp/client.md)
- [工具名限定](../../subsystems/mcp/name-qualification.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
