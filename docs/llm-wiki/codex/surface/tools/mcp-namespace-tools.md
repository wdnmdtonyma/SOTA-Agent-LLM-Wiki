---
id: tool.mcp-namespace-tools
title: MCP namespace tools
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp.rs, codex-rs/tools/src/responses_api.rs, codex-rs/tools/src/tool_search.rs]
symbols: [add_mcp_runtime_tools, McpHandler, create_tool_spec, mcp_tool_to_responses_api_tool, ToolSearchInfo, build_mcp_search_text]
related: [tool.tool-search, tool.list-mcp-resources, tool.dynamic-tools, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: db887d03e1
---

> MCP namespace tools 是 Codex 把 MCP server tools 适配为 Responses API namespace tools 的 runtime：`McpHandler` 根据 `ToolInfo` 构造 namespace `ToolSpec`，function call 再转发给 MCP tool call path。[E: codex-rs/core/src/tools/handlers/mcp.rs:32][E: codex-rs/core/src/tools/handlers/mcp.rs:38][E: codex-rs/core/src/tools/handlers/mcp.rs:233][E: codex-rs/core/src/tools/handlers/mcp.rs:252][E: codex-rs/core/src/tools/handlers/mcp.rs:145]

## 能回答的问题

- MCP tool 如何变成 Responses namespace tool？
- direct 与 deferred MCP tools 在 planner 中怎么注册？
- search_info 的文本和 source info 来自哪里？
- MCP handler 如何处理 parallel、hooks 和 tool output？

## 1 Identity

| 项 | 值 |
|---|---|
| runtime | `McpHandler { tool_info, spec }`，`tool_name()` 返回 `tool_info.canonical_tool_name()`。[E: codex-rs/core/src/tools/handlers/mcp.rs:32][E: codex-rs/core/src/tools/handlers/mcp.rs:33][E: codex-rs/core/src/tools/handlers/mcp.rs:34][E: codex-rs/core/src/tools/handlers/mcp.rs:68][E: codex-rs/core/src/tools/handlers/mcp.rs:69] |
| spec shape | `create_tool_spec` 返回 `ToolSpec::Namespace(ResponsesApiNamespace { name, description, tools })`。[E: codex-rs/core/src/tools/handlers/mcp.rs:233][E: codex-rs/core/src/tools/handlers/mcp.rs:252][E: codex-rs/core/src/tools/handlers/mcp.rs:253][E: codex-rs/core/src/tools/handlers/mcp.rs:254][E: codex-rs/core/src/tools/handlers/mcp.rs:255] |
| function conversion | namespace 内 function 由 `mcp_tool_to_responses_api_tool` 生成，底层把 MCP schema parse 后 rename 成 canonical tool name 的 function name。[E: codex-rs/core/src/tools/handlers/mcp.rs:234][E: codex-rs/core/src/tools/handlers/mcp.rs:235][E: codex-rs/tools/src/responses_api.rs:107][E: codex-rs/tools/src/responses_api.rs:112] |

## 2 注册与门控

`add_mcp_runtime_tools` 遍历 `context.mcp_tools` 并直接 `planned_tools.add(handler)`；遍历 `context.deferred_mcp_tools` 时则用 `add_with_exposure(handler, ToolExposure::Deferred)`。[E: codex-rs/core/src/tools/spec_plan.rs:885][E: codex-rs/core/src/tools/spec_plan.rs:886][E: codex-rs/core/src/tools/spec_plan.rs:888][E: codex-rs/core/src/tools/spec_plan.rs:889][E: codex-rs/core/src/tools/spec_plan.rs:898][E: codex-rs/core/src/tools/spec_plan.rs:900][E: codex-rs/core/src/tools/spec_plan.rs:901]

deferred MCP runtime 不是无条件进入 `tool_search`：planner 先 `add_tool_sources`，再应用 direct-model-only namespace overrides，最后才 `append_tool_search_executor`；后者要求 `search_tool_enabled` 为 true，并只从 exposure 为 Deferred 的 runtimes 收集 `search_info()`。[E: codex-rs/core/src/tools/spec_plan.rs:198][E: codex-rs/core/src/tools/spec_plan.rs:199][E: codex-rs/core/src/tools/spec_plan.rs:200][E: codex-rs/core/src/tools/spec_plan.rs:205][E: codex-rs/core/src/tools/spec_plan.rs:220][E: codex-rs/core/src/tools/spec_plan.rs:224][E: codex-rs/core/src/tools/spec_plan.rs:968][E: codex-rs/core/src/tools/spec_plan.rs:969][E: codex-rs/core/src/tools/spec_plan.rs:973][E: codex-rs/core/src/tools/spec_plan.rs:976][E: codex-rs/core/src/tools/spec_plan.rs:977]

`namespace_tools_enabled` 不再是 `append_tool_search_executor` 的进入条件；它在构建 model-visible specs 的最后过滤 `ToolSpec::Namespace`，但 registry 仍由 planned runtimes 构建。[E: codex-rs/core/src/tools/spec_plan.rs:264][E: codex-rs/core/src/tools/spec_plan.rs:265][E: codex-rs/core/src/tools/spec_plan.rs:267][E: codex-rs/core/src/tools/spec_plan.rs:268][E: codex-rs/core/src/tools/spec_plan.rs:269]

## 3 search metadata

`McpHandler::search_info()` 用 connector name 或 server name 构造 source name，并用 namespace description 作为 source description；search text 来自 `build_mcp_search_text(&tool_info)`。[E: codex-rs/core/src/tools/handlers/mcp.rs:89][E: codex-rs/core/src/tools/handlers/mcp.rs:90][E: codex-rs/core/src/tools/handlers/mcp.rs:96][E: codex-rs/core/src/tools/handlers/mcp.rs:97][E: codex-rs/core/src/tools/handlers/mcp.rs:99][E: codex-rs/core/src/tools/handlers/mcp.rs:105][E: codex-rs/core/src/tools/handlers/mcp.rs:108][E: codex-rs/core/src/tools/handlers/mcp.rs:109]

`build_mcp_search_text` 拼入 flat/callable/original tool name、server name、title、description、connector name、namespace description、plugin display names 和 input schema property names。[E: codex-rs/core/src/tools/handlers/mcp.rs:267][E: codex-rs/core/src/tools/handlers/mcp.rs:277][E: codex-rs/core/src/tools/handlers/mcp.rs:278][E: codex-rs/core/src/tools/handlers/mcp.rs:279][E: codex-rs/core/src/tools/handlers/mcp.rs:280][E: codex-rs/core/src/tools/handlers/mcp.rs:281][E: codex-rs/core/src/tools/handlers/mcp.rs:283][E: codex-rs/core/src/tools/handlers/mcp.rs:288][E: codex-rs/core/src/tools/handlers/mcp.rs:293][E: codex-rs/core/src/tools/handlers/mcp.rs:298][E: codex-rs/core/src/tools/handlers/mcp.rs:303][E: codex-rs/core/src/tools/handlers/mcp.rs:311]

当 search result 被转成 loadable output 时，namespace 内每个 function 会带 `defer_loading: Some(true)` 且清空 output schema。[E: codex-rs/tools/src/tool_search.rs:41][E: codex-rs/tools/src/tool_search.rs:45][E: codex-rs/tools/src/tool_search.rs:47][E: codex-rs/tools/src/tool_search.rs:48][E: codex-rs/tools/src/tool_search.rs:50]

## 4 handler 走读

handler 只接受 Function payload；它调用 `handle_mcp_tool_call`，传入 session、step context、call id、server name、MCP tool name、hook tool name 和原始 arguments。[E: codex-rs/core/src/tools/handlers/mcp.rs:134][E: codex-rs/core/src/tools/handlers/mcp.rs:135][E: codex-rs/core/src/tools/handlers/mcp.rs:145][E: codex-rs/core/src/tools/handlers/mcp.rs:146][E: codex-rs/core/src/tools/handlers/mcp.rs:147][E: codex-rs/core/src/tools/handlers/mcp.rs:148][E: codex-rs/core/src/tools/handlers/mcp.rs:149][E: codex-rs/core/src/tools/handlers/mcp.rs:150][E: codex-rs/core/src/tools/handlers/mcp.rs:151][E: codex-rs/core/src/tools/handlers/mcp.rs:152]

输出是 `McpToolOutput`，携带 MCP result、tool input、wall time、original-image-detail support 和 truncation policy。[E: codex-rs/core/src/tools/handlers/mcp.rs:156][E: codex-rs/core/src/tools/handlers/mcp.rs:157][E: codex-rs/core/src/tools/handlers/mcp.rs:158][E: codex-rs/core/src/tools/handlers/mcp.rs:159][E: codex-rs/core/src/tools/handlers/mcp.rs:160][E: codex-rs/core/src/tools/handlers/mcp.rs:161]

## 5 parallel support

MCP handler 的 parallel 支持来自 server-level opt-in 或 MCP annotations 的 `read_only_hint`。[E: codex-rs/core/src/tools/handlers/mcp.rs:76][E: codex-rs/core/src/tools/handlers/mcp.rs:79][E: codex-rs/core/src/tools/handlers/mcp.rs:83][E: codex-rs/core/src/tools/handlers/mcp.rs:85][E: codex-rs/core/src/tools/handlers/mcp.rs:86]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/mcp.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/tools/src/tool_search.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [dynamic tools](dynamic-tools.md)
- [MCP connectors](../../subsystems/mcp/connectors.md)
