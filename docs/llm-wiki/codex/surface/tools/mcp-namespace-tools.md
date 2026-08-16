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
updated: 9ded177ce7
---

> MCP namespace tools 是 Codex 把 MCP server tools 适配为 Responses API namespace tools 的 runtime：`McpHandler` 根据 `ToolInfo` 构造 namespace `ToolSpec`，function call 再转发给 MCP tool call path。[E: codex-rs/core/src/tools/handlers/mcp.rs:47][E: codex-rs/core/src/tools/handlers/mcp.rs:409][E: codex-rs/core/src/tools/handlers/mcp.rs:435][E: codex-rs/core/src/tools/handlers/mcp.rs:193]

## 能回答的问题

- MCP tool 如何变成 Responses namespace tool？
- direct 与 deferred MCP tools 在 planner 中怎么注册？
- namespace description 如何进 catalog cache，又如何被 bound？
- MCP 2026 protocol mode 默认开不开？
- MCP handler 如何处理 parallel、hooks 和 tool output？

## 1 Identity

| 项 | 值 |
|---|---|
| runtime | `McpHandler { tool_info, spec, code_mode_tool_definitions }`，`tool_name()` 返回 `tool_info.canonical_tool_name()`。[E: codex-rs/core/src/tools/handlers/mcp.rs:47][E: codex-rs/core/src/tools/handlers/mcp.rs:48][E: codex-rs/core/src/tools/handlers/mcp.rs:116][E: codex-rs/core/src/tools/handlers/mcp.rs:117] |
| spec shape | `create_tool_spec` 返回 `ToolSpec::Namespace(ResponsesApiNamespace { name, description, tools })`。[E: codex-rs/core/src/tools/handlers/mcp.rs:409][E: codex-rs/core/src/tools/handlers/mcp.rs:435][E: codex-rs/core/src/tools/handlers/mcp.rs:436] |
| function conversion | namespace 内 function 由 `mcp_tool_to_responses_api_tool` 生成，底层把 MCP schema parse 后 rename 成 canonical tool name 的 function name。[E: codex-rs/core/src/tools/handlers/mcp.rs:417][E: codex-rs/tools/src/responses_api.rs:120][E: codex-rs/tools/src/responses_api.rs:125] |

## 2 注册与门控

planner 调用 `session.services.mcp_handler_cache.append_mcp_tools(...)`：cache 按当前 `McpBinding` 指针复用已构造的 `McpHandler`，从而保留完整 namespace description 和 spec，不必每个 step 重新截断/重建。[E: codex-rs/core/src/tools/spec_plan.rs:151][E: codex-rs/core/src/mcp_tool_exposure.rs:37][E: codex-rs/core/src/mcp_tool_exposure.rs:50][E: codex-rs/core/src/mcp_tool_exposure.rs:58][E: codex-rs/core/src/mcp_tool_exposure.rs:62]

`append_mcp_tools` 先过滤 model-visible 的普通 MCP tools，再按 connector 可见性与 app-tool policy 补入 Codex Apps tools；它为每个 tool 构造 `McpHandler`，并在 search 开启时以 `Deferred` 注册，否则以 `Direct` 注册。agent-plugin server 另走 `McpHandler::new_agent_plugin`，单个 spec 超 8 KiB 或累计超 64 KiB 时 exposure 降为 `Hidden`。[E: codex-rs/core/src/mcp_tool_exposure.rs:85][E: codex-rs/core/src/mcp_tool_exposure.rs:90][E: codex-rs/core/src/mcp_tool_exposure.rs:99][E: codex-rs/core/src/mcp_tool_exposure.rs:105][E: codex-rs/core/src/mcp_tool_exposure.rs:121][E: codex-rs/core/src/mcp_tool_exposure.rs:137][E: codex-rs/core/src/mcp_tool_exposure.rs:19][E: codex-rs/core/src/mcp_tool_exposure.rs:20]

本轮 planner 直接构造同一个 `ToolRegistry`：先加 core tools，再依次追加 MCP、extension 与 dynamic runtimes，最后交给 `finalize_tool_router` 生成 registry 与 model-visible specs。[E: codex-rs/core/src/tools/spec_plan.rs:144][E: codex-rs/core/src/tools/spec_plan.rs:151][E: codex-rs/core/src/tools/spec_plan.rs:160][E: codex-rs/core/src/tools/spec_plan.rs:165][E: codex-rs/core/src/tools/spec_plan.rs:169]

这些 runtime 的 spec 来自 step-scoped `McpBinding`，但 `McpHandler` 只保存 `ToolInfo/spec`。实际调用会在 `handle_mcp_tool_call` 中 `prepare_mcp_call(server, tool)`；所以同名 tool 的 call-time client/metadata 可以随 publication 更新，已删除 tool 则返回 unavailable。[E: codex-rs/core/src/session/step_context.rs:42][E: codex-rs/core/src/tools/handlers/mcp.rs:193][E: codex-rs/core/src/mcp_tool_call.rs:146][E: codex-rs/core/src/mcp_tool_call.rs:155]

`namespace_tools_enabled` 同时参与 search gate，并在构建 model-visible specs 的最后过滤 `ToolSpec::Namespace`；registry 本身仍保留这些 runtime。[E: codex-rs/core/src/tools/spec_plan.rs:581][E: codex-rs/core/src/tools/spec_plan.rs:592][E: codex-rs/core/src/tools/spec_plan.rs:518][E: codex-rs/core/src/tools/spec_plan.rs:519]

server 的初始 tool catalog 也受协议模式影响：legacy 只消费第一份 `tools/list` response（`next_cursor` 被强制丢掉）；`V20260728` 会跟随 `nextCursor`，并通过公共 collector 限制 100 页、2,048 项、64 KiB cursor、重复 cursor 与整体超时。`Feature::Mcp20260728`（key `mcp_2026_07_28`）仍是 UnderDevelopment、默认关闭，因此 `Config::mcp_protocol_mode()` 默认返回 `Legacy`。[E: codex-rs/codex-mcp/src/rmcp_client.rs:627][E: codex-rs/codex-mcp/src/rmcp_client.rs:628][E: codex-rs/codex-mcp/src/rmcp_client.rs:629][E: codex-rs/codex-mcp/src/pagination.rs:9][E: codex-rs/features/src/lib.rs:1136][E: codex-rs/features/src/lib.rs:1137][E: codex-rs/features/src/lib.rs:1138][E: codex-rs/features/src/lib.rs:1139][E: codex-rs/core/src/config/mod.rs:1725][E: codex-rs/core/src/config/mod.rs:1727][E: codex-rs/core/src/config/mod.rs:1729]

进程级 `McpToolCatalogCache` 会缓存最近 32 份、TTL 30 分钟的 reusable `ToolInfo` 快照。`ToolInfo.namespace_description` 随 snapshot 一起保留；server 可通过 experimental capability 显式 disable cache。[E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:32][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:33][E: codex-rs/codex-mcp/src/tool_catalog_cache.rs:64][E: codex-rs/codex-mcp/src/rmcp_client.rs:890][E: codex-rs/codex-mcp/src/rmcp_client.rs:901][E: codex-rs/codex-mcp/src/rmcp_client.rs:940]

## 3 search metadata 与 namespace description

`McpHandler::search_info()` 用 connector name 或 server name 构造 source name，并用 namespace description 作为 source description；search text 来自 `build_mcp_search_text(&tool_info)`。[E: codex-rs/core/src/tools/handlers/mcp.rs:138][E: codex-rs/core/src/tools/handlers/mcp.rs:145][E: codex-rs/core/src/tools/handlers/mcp.rs:149][E: codex-rs/core/src/tools/handlers/mcp.rs:156]

`create_tool_spec` 的 namespace description 优先用 `tool_info.namespace_description`，否则回退 “Tools for working with {connector}.”。普通 MCP handler 会把这段文字截到 512 KiB；agent-plugin handler 则先把 `ToolInfo.namespace_description` 截到 1,000 bytes。测试证明普通 handler 会保留完整 metadata，包括多字节字符。[E: codex-rs/core/src/tools/handlers/mcp.rs:44][E: codex-rs/core/src/tools/handlers/mcp.rs:45][E: codex-rs/core/src/tools/handlers/mcp.rs:67][E: codex-rs/core/src/tools/handlers/mcp.rs:419][E: codex-rs/core/src/tools/handlers/mcp.rs:437][E: codex-rs/core/src/tools/handlers/mcp_search_tests.rs:46][E: codex-rs/core/src/tools/handlers/mcp_search_tests.rs:63][E: codex-rs/core/src/tools/handlers/mcp_search_tests.rs:71]

`build_mcp_search_text` 拼入 flat/callable/original tool name、server name、title、description、connector name、namespace description、plugin display names 和 input schema property names。[E: codex-rs/core/src/tools/handlers/mcp.rs:461][E: codex-rs/core/src/tools/handlers/mcp.rs:473][E: codex-rs/core/src/tools/handlers/mcp.rs:478][E: codex-rs/core/src/tools/handlers/mcp.rs:482][E: codex-rs/core/src/tools/handlers/mcp.rs:487]

当 search result 被转成 loadable output 时，namespace 内每个 function 会带 `defer_loading: Some(true)` 且清空 output schema。[E: codex-rs/tools/src/tool_search.rs:61][E: codex-rs/tools/src/tool_search.rs:62][E: codex-rs/tools/src/tool_search.rs:63]

## 4 handler 走读

handler 只接受 Function payload；它调用 `handle_mcp_tool_call`，传入 session、step context、call id、完整 `ToolInfo`、hook tool name、invocation tool name 和原始 arguments。[E: codex-rs/core/src/tools/handlers/mcp.rs:183][E: codex-rs/core/src/tools/handlers/mcp.rs:193][E: codex-rs/core/src/tools/handlers/mcp.rs:196][E: codex-rs/core/src/mcp_tool_call.rs:111][E: codex-rs/core/src/mcp_tool_call.rs:114]

输出是 `McpToolOutput`，携带 MCP result、tool input、wall time、original-image-detail support 和 truncation policy。[E: codex-rs/core/src/tools/handlers/mcp.rs:204][E: codex-rs/core/src/tools/handlers/mcp.rs:208][E: codex-rs/core/src/tools/handlers/mcp.rs:209]

call request 的 2026 session 只是 wire compatibility 分支，不改变 core 的 approval/preparation authority。`resources/read` 会在 modern session 下走 typed 2026 path；默认协议仍是 Legacy。[E: codex-rs/rmcp-client/src/rmcp_client.rs:734][E: codex-rs/rmcp-client/src/rmcp_client.rs:739][E: codex-rs/rmcp-client/src/rmcp_client.rs:743][E: codex-rs/core/src/config/mod.rs:1729]

## 5 Approval 语义

执行前的 current `PreparedMcpCall` 决定 approval authority：`codex_apps` server 从 app-tool policy 计算 effective mode，普通 MCP server 使用 prepared call 的 server/tool mode；selected-plugin server 使用禁止 persistent approval 的 policy，其他 server 才允许生成 persistent key。[E: codex-rs/core/src/mcp_tool_call.rs:168][E: codex-rs/core/src/mcp_tool_call.rs:180][E: codex-rs/core/src/mcp_tool_call.rs:183][E: codex-rs/core/src/mcp_tool_call.rs:228][E: codex-rs/core/src/mcp_tool_call.rs:1057][E: codex-rs/core/src/mcp_tool_call.rs:1060]

四种 mode 的 prompt 判定是：`Auto` 按 annotations 决定；`Prompt` 总是 prompt；`Writes` 仅 read-only 跳过；`Approve` 从不 prompt。[E: codex-rs/core/src/mcp_tool_call.rs:2218][E: codex-rs/core/src/mcp_tool_call.rs:2219][E: codex-rs/core/src/mcp_tool_call.rs:2220][E: codex-rs/core/src/mcp_tool_call.rs:2221][E: codex-rs/core/src/mcp_tool_call.rs:2224]

仍需询问时，`ToolCallMcpElicitation` feature 选择 MCP elicitation，否则使用 blocking user prompt。[E: codex-rs/core/src/mcp_tool_call.rs:1427][E: codex-rs/core/src/mcp_tool_call.rs:1430][E: codex-rs/core/src/mcp_tool_call.rs:1458]

## 6 parallel support

MCP handler 的 parallel 支持来自 server-level opt-in 或 MCP annotations 的 `read_only_hint`。[E: codex-rs/core/src/tools/handlers/mcp.rs:124][E: codex-rs/core/src/tools/handlers/mcp.rs:127][E: codex-rs/core/src/tools/handlers/mcp.rs:133]

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
