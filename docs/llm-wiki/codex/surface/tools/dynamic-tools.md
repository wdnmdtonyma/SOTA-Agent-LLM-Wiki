---
id: tool.dynamic-tools
title: dynamic 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/dynamic_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/responses_api.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/dynamic.rs, codex-rs/core/src/tools/tool_search_entry.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/tool_name.rs, codex-rs/protocol/src/protocol.rs]
symbols: [DynamicToolSpec, parse_dynamic_tool, dynamic_tool_to_loadable_tool_spec, coalesce_loadable_tool_specs, ToolHandlerKind::DynamicTool, DynamicToolHandler, DynamicToolCallRequest, DynamicToolResponse]
related: [tool.tool-search, tool.mcp-namespace-tools, tool.tool-suggest, subsys.core.tool-system, subsys.app-server.message-processor]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> dynamic tools 是运行时注入的外部工具定义；Codex 把 `DynamicToolSpec` 转成 Function 或 Namespace ToolSpec，注册到本地 `DynamicToolHandler`，并通过 protocol event/oneshot response 把调用转发给外部宿主。[E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/tools/src/tool_registry_plan.rs:561][E: codex-rs/core/src/tools/handlers/dynamic.rs:105]

## 能回答的问题

- `DynamicToolSpec` 的字段、legacy `exposeToContext` 兼容逻辑和 `deferLoading` 语义是什么？
- dynamic tool 何时是 Function，何时被放入 Namespace？
- 多个同名 namespace dynamic tools 如何 coalesce 成一个 namespace spec？
- deferred dynamic tools 如何进入 `tool_search`？
- `DynamicToolHandler` 如何把模型调用转发给外部宿主并等待结果？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | 动态；无 namespace 时为 `DynamicToolSpec.name`，有 namespace 时为 namespace spec + namespace 内 tool name。 | `parse_dynamic_tool` 使用 `tool.name`，`dynamic_tool_to_loadable_tool_spec` 在 `namespace: Some` 时返回 namespace spec。[E: codex-rs/tools/src/dynamic_tool.rs:7][E: codex-rs/tools/src/responses_api.rs:81] |
| aliases | 无静态 alias；每个 dynamic tool 用 `ToolName::new(namespace, name)` 注册。 | registry 构造 `handler_name = ToolName::new(tool.namespace.clone(), tool.name.clone())` 并注册 `ToolHandlerKind::DynamicTool`。[E: codex-rs/tools/src/tool_registry_plan.rs:564][E: codex-rs/tools/src/tool_registry_plan.rs:566] |
| ToolSpec 类型 | `ToolSpec::Function` 或 `ToolSpec::Namespace` | `dynamic_tool_to_loadable_tool_spec` 在有 namespace 时返回 `LoadableToolSpec::Namespace`，否则返回 `LoadableToolSpec::Function`。[E: codex-rs/tools/src/responses_api.rs:81][E: codex-rs/tools/src/responses_api.rs:88] |
| ToolHandlerKind | `ToolHandlerKind::DynamicTool` | `ToolHandlerKind` enum 包含 `DynamicTool`，core match 将其注册到 `dynamic_tool_handler`。[E: codex-rs/tools/src/tool_registry_plan_types.rs:19][E: codex-rs/core/src/tools/spec.rs:209] |
| core handler | `DynamicToolHandler` | `DynamicToolHandler.kind()` 返回 `ToolKind::Function`，handle 时只接受 `ToolPayload::Function`。[E: codex-rs/core/src/tools/handlers/dynamic.rs:27][E: codex-rs/core/src/tools/handlers/dynamic.rs:45] |
| 所属 crate | spec 转换在 `codex-tools`，runtime protocol 在 `codex-protocol`，执行桥接在 `codex-core`。 | `DynamicToolSpec` 与 `DynamicToolResponse` 在 protocol，handler 在 core。[E: codex-rs/protocol/src/dynamic_tools.rs:8][E: codex-rs/core/src/tools/handlers/dynamic.rs:21] |

## 2 用途定位

dynamic tools 允许 App/server/外部宿主在 turn 级别提供工具定义，而不要求这些工具被编译进 Codex 静态工具注册表。[E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/tools/src/tool_registry_plan.rs:560][I]  
Codex 对 dynamic tools 的职责是把 schema 转成 Responses API tool spec、注册可调用 handler、把调用事件发送给外部宿主并等待宿主返回 `DynamicToolResponse`。[E: codex-rs/tools/src/responses_api.rs:77][E: codex-rs/core/src/tools/handlers/dynamic.rs:104][E: codex-rs/core/src/tools/handlers/dynamic.rs:113]  
如果 dynamic tool 设置 `defer_loading: true`，它会进入 `tool_search` 的 deferred dynamic tools 集合，同时 `ResponsesApiTool.defer_loading` 会序列化为 `Some(true)`；`build_tool_registry_plan` 仍然遍历全部 `params.dynamic_tools` 并把 coalesced dynamic specs push 进 registry plan。[E: codex-rs/tools/src/tool_registry_plan.rs:257][E: codex-rs/tools/src/tool_registry_plan.rs:260][E: codex-rs/tools/src/responses_api.rs:147][E: codex-rs/tools/src/tool_registry_plan.rs:561][E: codex-rs/tools/src/tool_registry_plan.rs:576][E: codex-rs/tools/src/tool_registry_plan.rs:579]

## 3 输入 schema 表

`DynamicToolSpec` 使用 camelCase 序列化，字段由外部宿主提供。[E: codex-rs/protocol/src/dynamic_tools.rs:9][E: codex-rs/protocol/src/dynamic_tools.rs:10][I]

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `namespace` | string / null | 否 | `None` | 非空时 dynamic tool 被放进同名 namespace。 | `dynamic_tool_to_loadable_tool_spec` 只按 `tool.namespace.as_ref()` 分支，不额外验证 namespace 内容。[E: codex-rs/protocol/src/dynamic_tools.rs:11][E: codex-rs/tools/src/responses_api.rs:81][I] |
| `name` | string | 是 | 无 | callable tool name。 | `parse_dynamic_tool` 直接复制为 `ToolDefinition.name`，registry 也用它注册 handler name。[E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/tools/src/dynamic_tool.rs:7][E: codex-rs/tools/src/tool_registry_plan.rs:564] |
| `description` | string | 是 | 无 | tool description。 | `parse_dynamic_tool` 直接复制为 `ToolDefinition.description`。[E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/tools/src/dynamic_tool.rs:8] |
| `inputSchema` | JSON value | 是 | 无 | Responses API parameters 的来源。 | `parse_dynamic_tool` 调用 `parse_tool_input_schema(&tool.input_schema)`，解析失败会让 registry 记录 conversion error 并跳过该 tool。[E: codex-rs/protocol/src/dynamic_tools.rs:15][E: codex-rs/tools/src/dynamic_tool.rs:9][E: codex-rs/tools/src/tool_registry_plan.rs:568] |
| `deferLoading` | boolean | 否 | `false` | true 时 tool 进入 `tool_search` 的 deferred dynamic tools 集合，并在 Responses API tool 字段中写入 `defer_loading: true`。 | struct 字段有 serde default；custom deserialize 优先用 `deferLoading`，否则兼容 legacy `exposeToContext`。[E: codex-rs/protocol/src/dynamic_tools.rs:17][E: codex-rs/protocol/src/dynamic_tools.rs:78][E: codex-rs/tools/src/tool_registry_plan.rs:260][E: codex-rs/tools/src/responses_api.rs:147] |
| `exposeToContext` | boolean | 否 | 无 | legacy 兼容字段。 | 当 `deferLoading` 缺失时，`exposeToContext: false` 会反推为 `defer_loading: true`。[E: codex-rs/protocol/src/dynamic_tools.rs:55][E: codex-rs/protocol/src/dynamic_tools.rs:79] |

`parse_dynamic_tool` 当前不生成 output schema，`output_schema` 固定为 `None`。[E: codex-rs/tools/src/dynamic_tool.rs:10]

## 4 输出 schema & 截断

dynamic tool response contract 是 `DynamicToolResponse { content_items, success }`。[E: codex-rs/protocol/src/dynamic_tools.rs:31][E: codex-rs/protocol/src/dynamic_tools.rs:36]  
`content_items` 可包含 `InputText { text }` 或 `InputImage { image_url }` 两种 content item。[E: codex-rs/protocol/src/dynamic_tools.rs:41][E: codex-rs/protocol/src/dynamic_tools.rs:45]  
handler 把 `DynamicToolResponse.content_items` 转成 `FunctionCallOutputContentItem`，并用 `FunctionToolOutput::from_content(body, Some(success))` 返回给模型。[E: codex-rs/core/src/tools/handlers/dynamic.rs:62][E: codex-rs/core/src/tools/handlers/dynamic.rs:70]  
`DynamicToolCallResponseEvent` 记录 call id、turn id、namespace、tool、arguments、content items、success、error 和 duration，用于事件流观察。[E: codex-rs/core/src/tools/handlers/dynamic.rs:115][E: codex-rs/core/src/tools/handlers/dynamic.rs:126]  
源码未在 dynamic handler 中定义额外截断逻辑；content item 大小控制需要由外部宿主或通用输出路径承担。[E: codex-rs/core/src/tools/handlers/dynamic.rs:66][E: codex-rs/core/src/tools/handlers/dynamic.rs:70][I]

## 5 ToolSpec 类型

无 namespace 的 dynamic tool 转成 `LoadableToolSpec::Function(ResponsesApiTool)`；有 namespace 的 dynamic tool 转成 `LoadableToolSpec::Namespace(ResponsesApiNamespace)`，namespace 内只有一个 `ResponsesApiNamespaceTool::Function`。[E: codex-rs/tools/src/responses_api.rs:81][E: codex-rs/tools/src/responses_api.rs:88]  
dynamic namespace 的 description 使用 `default_namespace_description(namespace)`，因为源码注释说明用户没有为 dynamic namespace 提供 description。[E: codex-rs/tools/src/responses_api.rs:84][E: codex-rs/tools/src/responses_api.rs:85]  
`ResponsesApiTool.strict` 固定为 false，`defer_loading` 只有 `ToolDefinition.defer_loading` 为 true 时序列化为 `Some(true)`。[E: codex-rs/tools/src/responses_api.rs:146][E: codex-rs/tools/src/responses_api.rs:147]  
registry 最终把所有 coalesced `LoadableToolSpec` 转成 `ToolSpec` 后 push；`defer_loading` 不会在 `build_tool_registry_plan` 内把 dynamic tool 从 specs 列表移除，而是作为 Responses API tool 字段与 `tool_search` deferred 集合共同存在。[E: codex-rs/tools/src/tool_registry_plan.rs:576][E: codex-rs/tools/src/tool_registry_plan.rs:579][E: codex-rs/tools/src/responses_api.rs:147][E: codex-rs/tools/src/tool_spec.rs:74]

## 6 注册与门控

registry 遍历 `params.dynamic_tools`，对每个 tool 调用 `dynamic_tool_to_loadable_tool_spec`。[E: codex-rs/tools/src/tool_registry_plan.rs:560][E: codex-rs/tools/src/tool_registry_plan.rs:562]  
转换成功后，registry 先收集 loadable spec，再用 `ToolName::new(tool.namespace.clone(), tool.name.clone())` 注册 `ToolHandlerKind::DynamicTool`。[E: codex-rs/tools/src/tool_registry_plan.rs:563][E: codex-rs/tools/src/tool_registry_plan.rs:566]  
转换失败只记录 error，不会停止整个 registry plan 构建。[E: codex-rs/tools/src/tool_registry_plan.rs:568][E: codex-rs/tools/src/tool_registry_plan.rs:573]  
所有 dynamic loadable specs 在 push 前会经过 `coalesce_loadable_tool_specs`；该函数把同名 namespace 的 tool vectors append 到一个 namespace spec 中，Function spec 则原样追加。[E: codex-rs/tools/src/tool_registry_plan.rs:576][E: codex-rs/tools/src/responses_api.rs:92][E: codex-rs/tools/src/responses_api.rs:112]  
deferred dynamic tools 的搜索 gate 是 `params.dynamic_tools.iter().filter(|tool| tool.defer_loading)`；只有当 `config.search_tool` 为 true 且存在 deferred MCP 或 deferred dynamic tools 时，registry 才 push `tool_search`。[E: codex-rs/tools/src/tool_registry_plan.rs:257][E: codex-rs/tools/src/tool_registry_plan.rs:265]

## 7 parallel-safe

dynamic tool specs 的 `supports_parallel_tool_calls` 实际值是 `false`。[E: codex-rs/tools/src/tool_registry_plan.rs:576][E: codex-rs/tools/src/tool_registry_plan.rs:579]  
`DynamicToolHandler.is_mutating()` 固定返回 true，因此 registry/tool router 会把 dynamic tool 调用视为 mutating 操作处理。[E: codex-rs/core/src/tools/handlers/dynamic.rs:30][E: codex-rs/core/src/tools/handlers/dynamic.rs:31]  
dynamic tools 的副作用由外部宿主实现，Codex 无法从 `DynamicToolSpec` 中证明只读性；固定 mutating 是保守调度策略。[E: codex-rs/core/src/tools/handlers/dynamic.rs:30][I]

## 8 handler 走读

1. 外部宿主提供 `DynamicToolSpec` 列表，registry 逐个解析 input schema 并转成 loadable spec。[E: codex-rs/tools/src/tool_registry_plan.rs:561][E: codex-rs/tools/src/dynamic_tool.rs:9]
2. 有 namespace 的 dynamic spec 被包装成 `ResponsesApiNamespace`，无 namespace 的 dynamic spec 作为 Function tool。[E: codex-rs/tools/src/responses_api.rs:81][E: codex-rs/tools/src/responses_api.rs:88]
3. registry 为每个 dynamic tool 注册 `ToolHandlerKind::DynamicTool`，core build 阶段把该 kind 绑定到共享 `DynamicToolHandler`。[E: codex-rs/tools/src/tool_registry_plan.rs:566][E: codex-rs/core/src/tools/spec.rs:209]
4. 模型调用 dynamic tool 时，handler 只接受 `ToolPayload::Function { arguments }`，并把 arguments 解析成 JSON value。[E: codex-rs/core/src/tools/handlers/dynamic.rs:45][E: codex-rs/core/src/tools/handlers/dynamic.rs:53]
5. handler 在 active turn state 中插入 pending oneshot sender，用 call id 作为 key。[E: codex-rs/core/src/tools/handlers/dynamic.rs:88][E: codex-rs/core/src/tools/handlers/dynamic.rs:95]
6. handler 发送 `EventMsg::DynamicToolCallRequest`，其中包含 call id、turn id、namespace、tool 和 arguments。[E: codex-rs/core/src/tools/handlers/dynamic.rs:105][E: codex-rs/core/src/tools/handlers/dynamic.rs:110]
7. handler 等待外部宿主通过 oneshot 返回 `DynamicToolResponse`；如果 channel 关闭，则把调用视为 cancelled。[E: codex-rs/core/src/tools/handlers/dynamic.rs:113][E: codex-rs/core/src/tools/handlers/dynamic.rs:135]
8. handler 再发送 `DynamicToolCallResponse` event，并把 content items + success 转成 `FunctionToolOutput` 返回给模型。[E: codex-rs/core/src/tools/handlers/dynamic.rs:115][E: codex-rs/core/src/tools/handlers/dynamic.rs:139][E: codex-rs/core/src/tools/handlers/dynamic.rs:70]

## 9 设计动机·edge·历史

`deferLoading` 与 legacy `exposeToContext` 兼容逻辑说明 dynamic tool metadata 曾使用“是否暴露到上下文”的语义；新字段改为“是否延迟加载”，因此 legacy false 会反转成 defer true。[E: codex-rs/protocol/src/dynamic_tools.rs:48][E: codex-rs/protocol/src/dynamic_tools.rs:79][I]  
`coalesce_loadable_tool_specs` 避免同一 namespace 被重复作为多个 top-level namespace specs 发送；它会在发现同名 namespace 时 append tools。[E: codex-rs/tools/src/responses_api.rs:101][E: codex-rs/tools/src/responses_api.rs:112]  
`tool_search` 中的 dynamic entry search text 包含 name、把 underscore 替换为空格后的 name、description、namespace 和 input schema property names，说明 deferred dynamic tools 会被按自然语言 metadata 检索。[E: codex-rs/core/src/tools/tool_search_entry.rs:131][E: codex-rs/core/src/tools/tool_search_entry.rs:150]  
如果同一个 call id 已经有 pending dynamic tool response sender，handler 会覆盖并记录 warning，这是一种容忍重复 call id 的保护，而不是显式拒绝。[E: codex-rs/core/src/tools/handlers/dynamic.rs:90][E: codex-rs/core/src/tools/handlers/dynamic.rs:101][I]

## Sources

- `codex-rs/tools/src/dynamic_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/dynamic.rs`
- `codex-rs/core/src/tools/tool_search_entry.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/tool_name.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [MCP namespace 工具](mcp-namespace-tools.md)
- [tool_suggest 工具](tool-suggest.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Message processor](../../subsystems/app-server/message-processor.md)
