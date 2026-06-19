---
id: tool.dynamic-tools
title: Dynamic tools
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/dynamic.rs, codex-rs/tools/src/responses_api.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_search.rs, codex-rs/protocol/src/dynamic_tools.rs]
symbols: [DynamicToolSpec, DynamicToolFunctionSpec, DynamicToolNamespaceSpec, DynamicToolHandler, DynamicToolCallRequest, DynamicToolResponse, add_dynamic_tools, request_dynamic_tool]
related: [tool.tool-search, tool.mcp-namespace-tools, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 5670360009
---

> Dynamic tools 是 planner 从 `context.dynamic_tools` 遍历出来的运行时工具定义。planner 把 `DynamicToolSpec::Function` 或 namespace 内 function 转成 `DynamicToolHandler`，handler 再发送 `EventMsg::DynamicToolCallRequest` 并等待 response。[E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/core/src/tools/spec_plan.rs:888][E: codex-rs/core/src/tools/spec_plan.rs:889][E: codex-rs/core/src/tools/spec_plan.rs:891][E: codex-rs/core/src/tools/spec_plan.rs:904][E: codex-rs/core/src/tools/handlers/dynamic.rs:200][E: codex-rs/core/src/tools/handlers/dynamic.rs:208][E: codex-rs/core/src/tools/handlers/dynamic.rs:209]

## 能回答的问题

- dynamic tool 的协议输入形态是什么？
- Function / Namespace dynamic spec 如何变成 runtime？
- `defer_loading` 如何映射到 `ToolExposure::Deferred` 和 `tool_search`？
- handler 如何发 request、等 response、再返回模型输出？

## 1 协议模型

`DynamicToolSpec` 有 `Function(DynamicToolFunctionSpec)` 和 `Namespace(DynamicToolNamespaceSpec)` 两种；function spec 包含 `name`、`description`、`input_schema` 和 `defer_loading`。[E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/protocol/src/dynamic_tools.rs:22][E: codex-rs/protocol/src/dynamic_tools.rs:23][E: codex-rs/protocol/src/dynamic_tools.rs:24][E: codex-rs/protocol/src/dynamic_tools.rs:26]

namespace spec 包含 namespace `name`、`description` 和 `tools: Vec<DynamicToolNamespaceTool>`；当前 namespace tool enum 只有 Function variant。[E: codex-rs/protocol/src/dynamic_tools.rs:32][E: codex-rs/protocol/src/dynamic_tools.rs:33][E: codex-rs/protocol/src/dynamic_tools.rs:34][E: codex-rs/protocol/src/dynamic_tools.rs:35][E: codex-rs/protocol/src/dynamic_tools.rs:41][E: codex-rs/protocol/src/dynamic_tools.rs:42]

## 2 runtime 构造

`add_dynamic_tools` 遍历当前 turn 的 dynamic specs：Function 走 `DynamicToolHandler::new`，Namespace 则遍历 namespace.tools 并走 `DynamicToolHandler::new_in_namespace`。[E: codex-rs/core/src/tools/spec_plan.rs:888][E: codex-rs/core/src/tools/spec_plan.rs:891][E: codex-rs/core/src/tools/spec_plan.rs:892][E: codex-rs/core/src/tools/spec_plan.rs:899][E: codex-rs/core/src/tools/spec_plan.rs:901][E: codex-rs/core/src/tools/spec_plan.rs:902][E: codex-rs/core/src/tools/spec_plan.rs:904][E: codex-rs/core/src/tools/spec_plan.rs:913]

handler construction 用 namespace/name 生成 `ToolName`，把 protocol spec 转成 `ResponsesApiTool`，再包装为 Function 或 Namespace `ToolSpec`。[E: codex-rs/core/src/tools/handlers/dynamic.rs:55][E: codex-rs/core/src/tools/handlers/dynamic.rs:59][E: codex-rs/core/src/tools/handlers/dynamic.rs:62][E: codex-rs/core/src/tools/handlers/dynamic.rs:63][E: codex-rs/core/src/tools/handlers/dynamic.rs:70][E: codex-rs/core/src/tools/handlers/dynamic.rs:72]

`dynamic_tool_to_responses_api_tool` 使用 `parse_dynamic_tool` 再转 `ResponsesApiTool`；转换后的 tool 默认 `strict: false`，`defer_loading` 字段来自 `ToolDefinition.defer_loading`。[E: codex-rs/tools/src/responses_api.rs:69][E: codex-rs/tools/src/responses_api.rs:72][E: codex-rs/tools/src/responses_api.rs:127][E: codex-rs/tools/src/responses_api.rs:131][E: codex-rs/tools/src/responses_api.rs:132]

## 3 deferral 与 search

`DynamicToolHandler` 将 `tool.defer_loading` 映射为 `ToolExposure::Deferred`，否则为 Direct；同时先清掉 Responses API tool 上的 `defer_loading` marker，由 tool search 输出时恢复。[E: codex-rs/core/src/tools/handlers/dynamic.rs:60][E: codex-rs/core/src/tools/handlers/dynamic.rs:61][E: codex-rs/core/src/tools/handlers/dynamic.rs:77][E: codex-rs/core/src/tools/handlers/dynamic.rs:78][E: codex-rs/core/src/tools/handlers/dynamic.rs:80]

deferred dynamic tools 也不是无条件进入 `tool_search`：planner 会先应用 direct-model-only namespace overrides，再在 search + namespace gates 通过时只收集仍为 Deferred 的 runtimes。[E: codex-rs/core/src/tools/spec_plan.rs:194][E: codex-rs/core/src/tools/spec_plan.rs:195][E: codex-rs/core/src/tools/spec_plan.rs:196][E: codex-rs/core/src/tools/spec_plan.rs:201][E: codex-rs/core/src/tools/spec_plan.rs:216][E: codex-rs/core/src/tools/spec_plan.rs:219][E: codex-rs/core/src/tools/spec_plan.rs:940][E: codex-rs/core/src/tools/spec_plan.rs:941][E: codex-rs/core/src/tools/spec_plan.rs:945][E: codex-rs/core/src/tools/spec_plan.rs:948][E: codex-rs/core/src/tools/spec_plan.rs:949]

`DynamicToolHandler::search_info()` 标记 source 为 “Dynamic tools”，描述为 “Tools provided by the current Codex thread.”；`ToolSearchInfo::from_tool_spec` 会为 returned loadable Function 或 Namespace tools 恢复 `defer_loading: Some(true)` 并清空 output schema。[E: codex-rs/core/src/tools/handlers/dynamic.rs:99][E: codex-rs/core/src/tools/handlers/dynamic.rs:100][E: codex-rs/core/src/tools/handlers/dynamic.rs:103][E: codex-rs/core/src/tools/handlers/dynamic.rs:104][E: codex-rs/tools/src/tool_search.rs:22][E: codex-rs/tools/src/tool_search.rs:37][E: codex-rs/tools/src/tool_search.rs:38][E: codex-rs/tools/src/tool_search.rs:41][E: codex-rs/tools/src/tool_search.rs:47][E: codex-rs/tools/src/tool_search.rs:48]

## 4 handler 走读

handler 只接受 Function payload，arguments 解析为 JSON `Value`；然后调用 `request_dynamic_tool`。[E: codex-rs/core/src/tools/handlers/dynamic.rs:127][E: codex-rs/core/src/tools/handlers/dynamic.rs:128][E: codex-rs/core/src/tools/handlers/dynamic.rs:136][E: codex-rs/core/src/tools/handlers/dynamic.rs:137]

`request_dynamic_tool` 以 call id 存 pending dynamic response，发送 `EventMsg::DynamicToolCallRequest`，包含 call id、turn id、namespace、tool 和 arguments；response 到达后还发送 `DynamicToolCallResponse` event。[E: codex-rs/core/src/tools/handlers/dynamic.rs:181][E: codex-rs/core/src/tools/handlers/dynamic.rs:189][E: codex-rs/core/src/tools/handlers/dynamic.rs:200][E: codex-rs/core/src/tools/handlers/dynamic.rs:201][E: codex-rs/core/src/tools/handlers/dynamic.rs:202][E: codex-rs/core/src/tools/handlers/dynamic.rs:204][E: codex-rs/core/src/tools/handlers/dynamic.rs:205][E: codex-rs/core/src/tools/handlers/dynamic.rs:206][E: codex-rs/core/src/tools/handlers/dynamic.rs:212][E: codex-rs/core/src/tools/handlers/dynamic.rs:237]

响应体是 `DynamicToolResponse { content_items, success }`；handler 把 content items 转成 function-call output content，并把 `success` 传给 `FunctionToolOutput::from_content`。[E: codex-rs/protocol/src/dynamic_tools.rs:60][E: codex-rs/protocol/src/dynamic_tools.rs:61][E: codex-rs/protocol/src/dynamic_tools.rs:62][E: codex-rs/core/src/tools/handlers/dynamic.rs:151][E: codex-rs/core/src/tools/handlers/dynamic.rs:155][E: codex-rs/core/src/tools/handlers/dynamic.rs:157][E: codex-rs/core/src/tools/handlers/dynamic.rs:159][E: codex-rs/core/src/tools/handlers/dynamic.rs:161]

## 5 parallel support

`ToolExecutor` 默认 `supports_parallel_tool_calls()` 为 false；`DynamicToolHandler` 未见覆盖该方法，因此实际走默认 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65][I]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/dynamic.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_search.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [MCP namespace tools](mcp-namespace-tools.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
