---
id: tool.mcp-namespace-tools
title: MCP namespace tools
kind: tool
tier: T1
source: [codex-rs/core/src/mcp_tool_exposure.rs, codex-rs/core/src/session/step_context.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp.rs, codex-rs/core/src/mcp_tool_call.rs, codex-rs/core/src/config/mod.rs, codex-rs/codex-mcp/src/binding.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/codex-mcp/src/pagination.rs, codex-rs/codex-mcp/src/tool_catalog_cache.rs, codex-rs/rmcp-client/src/protocol_mode.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/tools/src/responses_api.rs, codex-rs/tools/src/tool_search.rs, codex-rs/features/src/lib.rs]
symbols: [append_mcp_tools, McpHandler, McpHandlerCache, create_tool_spec, mcp_tool_to_responses_api_tool, build_mcp_search_text]
related: [tool.tool-search, tool.list-mcp-resources, tool.dynamic-tools, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> MCP namespace tools 是 Codex 把 MCP server tools 适配为 Responses API namespace tools 的 runtime：`McpHandler` 根据 `ToolInfo` 构造 namespace `ToolSpec`，function call 再转发给 MCP tool call path。[E: codex-rs/core/src/tools/handlers/mcp.rs:51][E: codex-rs/core/src/tools/handlers/mcp.rs:498][E: codex-rs/core/src/tools/handlers/mcp.rs:525][E: codex-rs/core/src/tools/handlers/mcp.rs:251]

## 能回答的问题

- MCP tool 如何变成 Responses namespace tool？
- direct 与 deferred MCP tools 在 planner 中怎么注册？
- namespace description 如何进 catalog cache，又如何被 bound？
- MCP 2026 protocol mode 默认开不开？
- MCP handler 如何处理 parallel、hooks 和 tool output？

## 1 Identity

| 项 | 值 |
|---|---|
| runtime | `McpHandler { tool_info, spec, code_mode_tool_definitions }`，`tool_name()` 返回 `tool_info.canonical_tool_name()`。[E: codex-rs/core/src/tools/handlers/mcp.rs:51][E: codex-rs/core/src/tools/handlers/mcp.rs:52][E: codex-rs/core/src/tools/handlers/mcp.rs:140][E: codex-rs/core/src/tools/handlers/mcp.rs:141] |
| spec shape | `create_tool_spec` 返回 `ToolSpec::Namespace(ResponsesApiNamespace { name, description, tools })`。[E: codex-rs/core/src/tools/handlers/mcp.rs:498][E: codex-rs/core/src/tools/handlers/mcp.rs:525][E: codex-rs/core/src/tools/handlers/mcp.rs:526] |
| function conversion | namespace 内 function 由 `mcp_tool_to_responses_api_tool` 生成，底层把 MCP schema parse 后 rename 成 canonical tool name 的 function name。[E: codex-rs/core/src/tools/handlers/mcp.rs:478][E: codex-rs/tools/src/responses_api.rs:121][E: codex-rs/tools/src/responses_api.rs:125] |

## 2 注册与门控

planner 调用 `session.services.mcp_handler_cache.append_mcp_tools(...)`：`McpHandlerCache` 用 `HashMap<ToolName, CachedMcpHandler>` 存 handler；复用条件是 `tool_info` 相等、`agent_plugin` 相等、且 `schema_max_bytes` 等于当前 `tool_input_schema_max_bytes`，不是 `McpBinding` 指针身份。命中则保留已构造的 namespace description/spec。`search_tool_enabled(turn_context, model_info)` 决定是否以 Deferred 注册。[E: codex-rs/core/src/tools/spec_plan.rs:153][E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/mcp_tool_exposure.rs:27][E: codex-rs/core/src/mcp_tool_exposure.rs:100][E: codex-rs/core/src/mcp_tool_exposure.rs:102][E: codex-rs/core/src/mcp_tool_exposure.rs:103]

`append_mcp_tools` 先过滤 model-visible 的普通 MCP tools，再按 connector 可见性与 app-tool policy 补入 Codex Apps tools；它为每个 tool 构造 `McpHandler`，并在 search 开启时以 `Deferred` 注册，否则以 `Direct` 注册。agent-plugin server 另走 `McpHandler::new_agent_plugin`，单个 spec 超 8 KiB 或累计超 64 KiB 时 exposure 降为 `Hidden`。[E: codex-rs/core/src/mcp_tool_exposure.rs:80][E: codex-rs/core/src/mcp_tool_exposure.rs:85][E: codex-rs/core/src/mcp_tool_exposure.rs:100][E: codex-rs/core/src/mcp_tool_exposure.rs:108][E: codex-rs/core/src/mcp_tool_exposure.rs:135][E: codex-rs/core/src/mcp_tool_exposure.rs:151][E: codex-rs/core/src/mcp_tool_exposure.rs:18][E: codex-rs/core/src/mcp_tool_exposure.rs:19]

本轮 planner 直接构造同一个 `ToolRegistry`：先加 core tools，再依次追加 MCP、extension 与 dynamic runtimes，最后交给 `finalize_tool_router` 生成 registry 与 model-visible specs。[E: codex-rs/core/src/tools/spec_plan.rs:295][E: codex-rs/core/src/tools/spec_plan.rs:153][E: codex-rs/core/src/tools/spec_plan.rs:168][E: codex-rs/core/src/tools/spec_plan.rs:174][E: codex-rs/core/src/tools/spec_plan.rs:181]

这些 runtime 的 spec 来自 step-scoped `McpBinding`，但 `McpHandler` 只保存 `ToolInfo/spec`。实际调用时 `McpHandler::handle_call` 先 `session.prepare_mcp_call(&self.tool_info)`，再把结果交给 `handle_mcp_tool_call`；所以同名 tool 的 call-time client/metadata 可以随 publication 更新，已删除 tool 则返回 unavailable。[E: codex-rs/core/src/session/step_context.rs:39][E: codex-rs/core/src/tools/handlers/mcp.rs:200][E: codex-rs/core/src/tools/handlers/mcp.rs:251][E: codex-rs/core/src/mcp_tool_call.rs:167][E: codex-rs/core/src/mcp_tool_call.rs:176]

`namespace_tools_enabled` 同时参与 search gate，并在构建 model-visible specs 的最后过滤 `ToolSpec::Namespace`；registry 本身仍保留这些 runtime。[E: codex-rs/core/src/tools/spec_plan.rs:653][E: codex-rs/core/src/tools/spec_plan.rs:665][E: codex-rs/core/src/tools/spec_plan.rs:587][E: codex-rs/core/src/tools/spec_plan.rs:588]

server 的初始 tool catalog 也受协议模式影响：legacy 只消费第一份 `tools/list` response（`next_cursor` 被强制丢掉）；`V20260728` 会跟随 `nextCursor`，并通过公共 collector 限制 100 页、2,048 项、64 KiB cursor、重复 cursor 与整体超时。`Feature::Mcp20260728`（key `mcp_2026_07_28`）仍是 UnderDevelopment、默认关闭，因此 `Config::mcp_protocol_mode()` 默认返回 `Legacy`。[E: codex-rs/codex-mcp/src/rmcp_client.rs:675][E: codex-rs/codex-mcp/src/rmcp_client.rs:676][E: codex-rs/codex-mcp/src/rmcp_client.rs:677][E: codex-rs/codex-mcp/src/pagination.rs:9][E: codex-rs/features/src/lib.rs:1381][E: codex-rs/features/src/lib.rs:1382][E: codex-rs/features/src/lib.rs:1383][E: codex-rs/features/src/lib.rs:1384][E: codex-rs/core/src/config/mod.rs:1880][E: codex-rs/core/src/config/mod.rs:1882][E: codex-rs/core/src/config/mod.rs:1884]

进程级 `McpToolCatalogCache` 会缓存最近 32 份、TTL 30 分钟的 reusable `ToolInfo` 快照。`ToolInfo.namespace_description` 随 snapshot 一起保留；server 可通过 experimental capability 显式 disable cache。[E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:33][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:34][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:70][E: codex-rs/codex-mcp/src/rmcp_client.rs:977][E: codex-rs/codex-mcp/src/rmcp_client.rs:988][E: codex-rs/codex-mcp/src/rmcp_client.rs:1015]

## 3 search metadata 与 namespace description

`McpHandler::search_info()` 用 connector name 或 server name 构造 source name，并用 namespace description 作为 source description；search text 来自 `build_mcp_search_text(&tool_info)`。[E: codex-rs/core/src/tools/handlers/mcp.rs:162][E: codex-rs/core/src/tools/handlers/mcp.rs:169][E: codex-rs/core/src/tools/handlers/mcp.rs:173][E: codex-rs/core/src/tools/handlers/mcp.rs:161]

`create_tool_spec` 的 namespace description 优先用 `tool_info.namespace_description`，否则回退 “Tools for working with {connector}.”。普通 MCP handler 会把这段文字截到 512 KiB；agent-plugin handler 则先把 `ToolInfo.namespace_description` 截到 1,000 bytes。测试证明普通 handler 会保留完整 metadata，包括多字节字符。[E: codex-rs/core/src/tools/handlers/mcp.rs:48][E: codex-rs/core/src/tools/handlers/mcp.rs:49][E: codex-rs/core/src/tools/handlers/mcp.rs:87][E: codex-rs/core/src/tools/handlers/mcp.rs:509][E: codex-rs/core/src/tools/handlers/mcp.rs:527][E: codex-rs/core/src/tools/handlers/mcp_search_tests.rs:46][E: codex-rs/core/src/tools/handlers/mcp_search_tests.rs:63][E: codex-rs/core/src/tools/handlers/mcp_search_tests.rs:71]

`build_mcp_search_text` 拼入 flat/callable/original tool name、server name、title、description、connector name、namespace description、plugin display names 和 input schema property names。[E: codex-rs/core/src/tools/handlers/mcp.rs:551][E: codex-rs/core/src/tools/handlers/mcp.rs:563][E: codex-rs/core/src/tools/handlers/mcp.rs:568][E: codex-rs/core/src/tools/handlers/mcp.rs:572][E: codex-rs/core/src/tools/handlers/mcp.rs:577]

当 search result 被转成 loadable output 时，namespace 内每个 function 会带 `defer_loading: Some(true)` 且清空 output schema。[E: codex-rs/tools/src/tool_search.rs:99][E: codex-rs/tools/src/tool_search.rs:100][E: codex-rs/tools/src/tool_search.rs:101]

## 4 handler 走读

handler 只接受 Function payload；它调用 `handle_mcp_tool_call`，传入 session、step context、call id、完整 `ToolInfo`、hook tool name、invocation tool name 和原始 arguments。[E: codex-rs/core/src/tools/handlers/mcp.rs:235][E: codex-rs/core/src/tools/handlers/mcp.rs:251][E: codex-rs/core/src/tools/handlers/mcp.rs:235][E: codex-rs/core/src/mcp_tool_call.rs:128][E: codex-rs/core/src/mcp_tool_call.rs:127]

输出是 `McpToolOutput`，携带 MCP result、tool input、wall time、original-image-detail support 和 truncation policy。[E: codex-rs/core/src/tools/handlers/mcp.rs:266][E: codex-rs/core/src/tools/handlers/mcp.rs:268][E: codex-rs/core/src/tools/handlers/mcp.rs:274]

call request 的 2026 session 只是 wire compatibility 分支，不改变 core 的 approval/preparation authority。`resources/read` 会在 modern session 下走 typed 2026 path；默认协议仍是 Legacy。[E: codex-rs/rmcp-client/src/rmcp_client.rs:794][E: codex-rs/rmcp-client/src/rmcp_client.rs:799][E: codex-rs/rmcp-client/src/rmcp_client.rs:803][E: codex-rs/core/src/config/mod.rs:1884]

## 5 Approval 语义

执行前的 current `PreparedMcpCall` 决定 approval authority：`codex_apps` server 从 app-tool policy 计算 effective mode，普通 MCP server 使用 prepared call 的 server/tool mode；selected-plugin server 使用禁止 persistent approval 的 policy，其他 server 才允许生成 persistent key。[E: codex-rs/core/src/mcp_tool_call.rs:214][E: codex-rs/core/src/mcp_tool_call.rs:227][E: codex-rs/core/src/mcp_tool_call.rs:230][E: codex-rs/core/src/mcp_tool_call.rs:275][E: codex-rs/core/src/mcp_tool_call.rs:1195][E: codex-rs/core/src/mcp_tool_call.rs:1198]

四种 mode 的 prompt 判定是：`Auto` 按 annotations 决定；`Prompt` 总是 prompt；`Writes` 仅 read-only 跳过；`Approve` 从不 prompt。[E: codex-rs/core/src/mcp_tool_call.rs:2480][E: codex-rs/core/src/mcp_tool_call.rs:2481][E: codex-rs/core/src/mcp_tool_call.rs:2482][E: codex-rs/core/src/mcp_tool_call.rs:2483][E: codex-rs/core/src/mcp_tool_call.rs:2486]

仍需询问时，`ToolCallMcpElicitation` feature 选择 MCP elicitation，否则使用 blocking user prompt。[E: codex-rs/core/src/mcp_tool_call.rs:1633][E: codex-rs/core/src/mcp_tool_call.rs:1636][E: codex-rs/core/src/mcp_tool_call.rs:1637][E: codex-rs/core/src/mcp_tool_call.rs:1640]

## 6 parallel support

MCP handler 的 parallel 支持来自 server-level opt-in 或 MCP annotations 的 `read_only_hint`。[E: codex-rs/core/src/tools/handlers/mcp.rs:148][E: codex-rs/core/src/tools/handlers/mcp.rs:151][E: codex-rs/core/src/tools/handlers/mcp.rs:157]

## Sources

- `codex-rs/core/src/mcp_tool_exposure.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/mcp.rs`
- `codex-rs/core/src/mcp_tool_call.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/codex-mcp/src/binding.rs`
- `codex-rs/codex-mcp/src/rmcp_client.rs`
- `codex-rs/codex-mcp/src/pagination.rs`
- `codex-rs/codex-mcp/src/tool_catalog_cache.rs`
- `codex-rs/rmcp-client/src/protocol_mode.rs`
- `codex-rs/rmcp-client/src/rmcp_client.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/tools/src/tool_search.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [dynamic tools](dynamic-tools.md)
- [MCP connectors](../../subsystems/mcp/connectors.md)
