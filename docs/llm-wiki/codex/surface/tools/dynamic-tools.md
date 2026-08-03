---
id: tool.dynamic-tools
title: Dynamic tools
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/dynamic.rs, codex-rs/tools/src/responses_api.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_search.rs, codex-rs/protocol/src/dynamic_tools.rs]
symbols: [DynamicToolSpec, DynamicToolFunctionSpec, DynamicToolNamespaceSpec, DynamicToolHandler, DynamicToolCallItem, DynamicToolResponse, append_dynamic_tool_runtimes, request_dynamic_tool]
related: [tool.tool-search, tool.mcp-namespace-tools, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 7750465934
---

> Dynamic tools 是 planner 从 `turn_context.dynamic_tools` 遍历出来的运行时工具定义。planner 把 `DynamicToolSpec::Function` 或 namespace 内 function 转成 `DynamicToolHandler`；handler 登记 pending response，通过 `DynamicToolCallItem` 发出 started/completed turn-item 生命周期，并在其间等待 response。[E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/tools/spec_plan.rs:975][E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:991][E: codex-rs/core/src/tools/handlers/dynamic.rs:182][E: codex-rs/core/src/tools/handlers/dynamic.rs:197][E: codex-rs/core/src/tools/handlers/dynamic.rs:243]

## 能回答的问题

- dynamic tool 的协议输入形态是什么？
- Function / Namespace dynamic spec 如何变成 runtime？
- `defer_loading` 如何映射到 `ToolExposure::Deferred` 和 `tool_search`？
- handler 如何发 request、等 response、再返回模型输出？

## 1 协议模型

`DynamicToolSpec` 有 `Function(DynamicToolFunctionSpec)` 和 `Namespace(DynamicToolNamespaceSpec)` 两种；function spec 包含 `name`、`description`、`input_schema` 和 `defer_loading`。[E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/protocol/src/dynamic_tools.rs:22][E: codex-rs/protocol/src/dynamic_tools.rs:23][E: codex-rs/protocol/src/dynamic_tools.rs:24][E: codex-rs/protocol/src/dynamic_tools.rs:26]

namespace spec 包含 namespace `name`、`description` 和 `tools: Vec<DynamicToolNamespaceTool>`；当前 namespace tool enum 只有 Function variant。[E: codex-rs/protocol/src/dynamic_tools.rs:32][E: codex-rs/protocol/src/dynamic_tools.rs:33][E: codex-rs/protocol/src/dynamic_tools.rs:34][E: codex-rs/protocol/src/dynamic_tools.rs:35][E: codex-rs/protocol/src/dynamic_tools.rs:41][E: codex-rs/protocol/src/dynamic_tools.rs:42]

## 2 runtime 构造

`append_dynamic_tool_runtimes` 遍历当前 turn 的 dynamic specs：Function 走 `DynamicToolHandler::new`，Namespace 则遍历 `namespace.tools` 并走 `DynamicToolHandler::new_in_namespace`。[E: codex-rs/core/src/tools/spec_plan.rs:975][E: codex-rs/core/src/tools/spec_plan.rs:976][E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:979][E: codex-rs/core/src/tools/spec_plan.rs:988][E: codex-rs/core/src/tools/spec_plan.rs:989][E: codex-rs/core/src/tools/spec_plan.rs:991]

handler construction 用 namespace/name 生成 `ToolName`，把 protocol spec 转成 `ResponsesApiTool`，再包装为 Function 或 Namespace `ToolSpec`。[E: codex-rs/core/src/tools/handlers/dynamic.rs:54][E: codex-rs/core/src/tools/handlers/dynamic.rs:58][E: codex-rs/core/src/tools/handlers/dynamic.rs:61][E: codex-rs/core/src/tools/handlers/dynamic.rs:62][E: codex-rs/core/src/tools/handlers/dynamic.rs:69][E: codex-rs/core/src/tools/handlers/dynamic.rs:71]

`dynamic_tool_to_responses_api_tool` 使用 `parse_dynamic_tool` 再转 `ResponsesApiTool`；转换后的 tool 默认 `strict: false`，`defer_loading` 字段来自 `ToolDefinition.defer_loading`。[E: codex-rs/tools/src/responses_api.rs:69][E: codex-rs/tools/src/responses_api.rs:72][E: codex-rs/tools/src/responses_api.rs:127][E: codex-rs/tools/src/responses_api.rs:131][E: codex-rs/tools/src/responses_api.rs:132]

## 3 deferral 与 search

`DynamicToolHandler` 将 `tool.defer_loading` 映射为 `ToolExposure::Deferred`，否则为 Direct；同时先清掉 Responses API tool 上的 `defer_loading` marker，由 tool search 输出时恢复。[E: codex-rs/core/src/tools/handlers/dynamic.rs:60][E: codex-rs/core/src/tools/handlers/dynamic.rs:76][E: codex-rs/core/src/tools/handlers/dynamic.rs:77][E: codex-rs/core/src/tools/handlers/dynamic.rs:79][E: codex-rs/tools/src/tool_search.rs:37][E: codex-rs/tools/src/tool_search.rs:47]

deferred dynamic tools 也不是无条件进入 `tool_search`：finalize 会先应用 direct-model-only namespace overrides；只有 search 开启且 registry 仍存在带 search info 的 `Deferred` runtime 时，才调用 `append_tool_search_executor`，该 executor 只收集仍为 `Deferred` 的条目。[E: codex-rs/core/src/tools/spec_plan.rs:242][E: codex-rs/core/src/tools/spec_plan.rs:252][E: codex-rs/core/src/tools/spec_plan.rs:255][E: codex-rs/core/src/tools/spec_plan.rs:256][E: codex-rs/core/src/tools/spec_plan.rs:260][E: codex-rs/core/src/tools/spec_plan.rs:1008][E: codex-rs/core/src/tools/spec_plan.rs:1015][E: codex-rs/core/src/tools/spec_plan.rs:1016]

`DynamicToolHandler::search_info()` 标记 source 为 “Dynamic tools”，描述为 “Tools provided by the current Codex thread.”；`ToolSearchInfo::from_tool_spec` 会为 returned loadable Function 或 Namespace tools 恢复 `defer_loading: Some(true)` 并清空 output schema。[E: codex-rs/core/src/tools/handlers/dynamic.rs:98][E: codex-rs/core/src/tools/handlers/dynamic.rs:99][E: codex-rs/core/src/tools/handlers/dynamic.rs:102][E: codex-rs/core/src/tools/handlers/dynamic.rs:103][E: codex-rs/tools/src/tool_search.rs:22][E: codex-rs/tools/src/tool_search.rs:37][E: codex-rs/tools/src/tool_search.rs:38][E: codex-rs/tools/src/tool_search.rs:41][E: codex-rs/tools/src/tool_search.rs:47][E: codex-rs/tools/src/tool_search.rs:48]

## 4 handler 走读

handler 只接受 Function payload，arguments 解析为 JSON `Value`；然后调用 `request_dynamic_tool`。[E: codex-rs/core/src/tools/handlers/dynamic.rs:126][E: codex-rs/core/src/tools/handlers/dynamic.rs:127][E: codex-rs/core/src/tools/handlers/dynamic.rs:135][E: codex-rs/core/src/tools/handlers/dynamic.rs:136]

`request_dynamic_tool` 以 call id 登记 pending dynamic response，然后发出 `DynamicToolCallItem` started：其 `status` 为 `InProgress`，记录 call id、namespace、tool 和 arguments，结果字段暂为空。[E: codex-rs/core/src/tools/handlers/dynamic.rs:180][E: codex-rs/core/src/tools/handlers/dynamic.rs:182][E: codex-rs/core/src/tools/handlers/dynamic.rs:187][E: codex-rs/core/src/tools/handlers/dynamic.rs:197][E: codex-rs/core/src/tools/handlers/dynamic.rs:200][E: codex-rs/core/src/tools/handlers/dynamic.rs:205][E: codex-rs/core/src/tools/handlers/dynamic.rs:206][E: codex-rs/core/src/tools/handlers/dynamic.rs:209]

response 到达后，completed item 按 `success` 标为 `Completed` 或 `Failed`，并带上 content items、success 与 duration；channel 取消也会产生 `Failed` item 和错误文本。这替代了旧的 `DynamicToolCallRequest` / `DynamicToolCallResponse` event pair。[E: codex-rs/core/src/tools/handlers/dynamic.rs:213][E: codex-rs/core/src/tools/handlers/dynamic.rs:215][E: codex-rs/core/src/tools/handlers/dynamic.rs:221][E: codex-rs/core/src/tools/handlers/dynamic.rs:226][E: codex-rs/core/src/tools/handlers/dynamic.rs:229][E: codex-rs/core/src/tools/handlers/dynamic.rs:231][E: codex-rs/core/src/tools/handlers/dynamic.rs:236][E: codex-rs/core/src/tools/handlers/dynamic.rs:239][E: codex-rs/core/src/tools/handlers/dynamic.rs:243][E: codex-rs/core/src/tools/handlers/dynamic.rs:244]

响应体是 `DynamicToolResponse { content_items, success }`；handler 把 content items 转成 function-call output content，并把 `success` 传给 `FunctionToolOutput::from_content`。[E: codex-rs/protocol/src/dynamic_tools.rs:60][E: codex-rs/protocol/src/dynamic_tools.rs:61][E: codex-rs/protocol/src/dynamic_tools.rs:62][E: codex-rs/core/src/tools/handlers/dynamic.rs:150][E: codex-rs/core/src/tools/handlers/dynamic.rs:154][E: codex-rs/core/src/tools/handlers/dynamic.rs:156][E: codex-rs/core/src/tools/handlers/dynamic.rs:158][E: codex-rs/core/src/tools/handlers/dynamic.rs:160]

## 5 parallel support

`ToolExecutor` 默认 `supports_parallel_tool_calls()` 为 false；`DynamicToolHandler` 未见覆盖该方法，因此实际走默认 false。[E: codex-rs/tools/src/tool_executor.rs:73][E: codex-rs/tools/src/tool_executor.rs:74][I]

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
