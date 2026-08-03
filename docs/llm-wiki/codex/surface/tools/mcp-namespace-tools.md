---
id: tool.mcp-namespace-tools
title: MCP namespace tools
kind: tool
tier: T1
source: [codex-rs/core/src/mcp_tool_exposure.rs, codex-rs/core/src/session/step_context.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mcp.rs, codex-rs/core/src/mcp_tool_call.rs, codex-rs/codex-mcp/src/binding.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/codex-mcp/src/pagination.rs, codex-rs/rmcp-client/src/protocol_mode.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/tools/src/responses_api.rs, codex-rs/tools/src/tool_search.rs]
symbols: [append_mcp_tools, McpHandler, create_tool_spec, mcp_tool_to_responses_api_tool, build_mcp_search_text]
related: [tool.tool-search, tool.list-mcp-resources, tool.dynamic-tools, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: 7750465934
---

> MCP namespace tools 是 Codex 把 MCP server tools 适配为 Responses API namespace tools 的 runtime：`McpHandler` 根据 `ToolInfo` 构造 namespace `ToolSpec`，function call 再转发给 MCP tool call path。[E: codex-rs/core/src/tools/handlers/mcp.rs:36][E: codex-rs/core/src/tools/handlers/mcp.rs:42][E: codex-rs/core/src/tools/handlers/mcp.rs:240][E: codex-rs/core/src/tools/handlers/mcp.rs:259][E: codex-rs/core/src/tools/handlers/mcp.rs:149]

## 能回答的问题

- MCP tool 如何变成 Responses namespace tool？
- direct 与 deferred MCP tools 在 planner 中怎么注册？
- search_info 的文本和 source info 来自哪里？
- MCP handler 如何处理 parallel、hooks 和 tool output？

## 1 Identity

| 项 | 值 |
|---|---|
| runtime | `McpHandler { tool_info, spec }`，`tool_name()` 返回 `tool_info.canonical_tool_name()`。[E: codex-rs/core/src/tools/handlers/mcp.rs:36][E: codex-rs/core/src/tools/handlers/mcp.rs:37][E: codex-rs/core/src/tools/handlers/mcp.rs:38][E: codex-rs/core/src/tools/handlers/mcp.rs:72][E: codex-rs/core/src/tools/handlers/mcp.rs:73] |
| spec shape | `create_tool_spec` 返回 `ToolSpec::Namespace(ResponsesApiNamespace { name, description, tools })`。[E: codex-rs/core/src/tools/handlers/mcp.rs:240][E: codex-rs/core/src/tools/handlers/mcp.rs:259][E: codex-rs/core/src/tools/handlers/mcp.rs:260][E: codex-rs/core/src/tools/handlers/mcp.rs:254][E: codex-rs/core/src/tools/handlers/mcp.rs:262] |
| function conversion | namespace 内 function 由 `mcp_tool_to_responses_api_tool` 生成，底层把 MCP schema parse 后 rename 成 canonical tool name 的 function name。[E: codex-rs/core/src/tools/handlers/mcp.rs:241][E: codex-rs/core/src/tools/handlers/mcp.rs:242][E: codex-rs/tools/src/responses_api.rs:107][E: codex-rs/tools/src/responses_api.rs:112] |

## 2 注册与门控

planner 调用 `append_mcp_tools(mcp.tools(), ...)`：helper 先过滤 model-visible 的普通 MCP tools，再按 connector 可见性与 app-tool policy 补入 Codex Apps tools；它为每个 tool 构造 `McpHandler`，并在 search 开启时以 `Deferred` 注册，否则以 `Direct` 注册。[E: codex-rs/core/src/tools/spec_plan.rs:145][E: codex-rs/core/src/tools/spec_plan.rs:146][E: codex-rs/core/src/mcp_tool_exposure.rs:19][E: codex-rs/core/src/mcp_tool_exposure.rs:27][E: codex-rs/core/src/mcp_tool_exposure.rs:28][E: codex-rs/core/src/mcp_tool_exposure.rs:31][E: codex-rs/core/src/mcp_tool_exposure.rs:36][E: codex-rs/core/src/mcp_tool_exposure.rs:38][E: codex-rs/core/src/mcp_tool_exposure.rs:40]

本轮 planner 直接构造同一个 `ToolRegistry`：先加 core tools，再依次追加 MCP、extension 与 dynamic runtimes，最后交给 `finalize_tool_router` 生成 registry 与 model-visible specs。[E: codex-rs/core/src/tools/spec_plan.rs:138][E: codex-rs/core/src/tools/spec_plan.rs:139][E: codex-rs/core/src/tools/spec_plan.rs:145][E: codex-rs/core/src/tools/spec_plan.rs:152][E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/tools/spec_plan.rs:161][E: codex-rs/core/src/tools/spec_plan.rs:165]

这些 runtime 的 spec 来自 step-scoped `McpBinding`，但 `McpHandler` 只保存 `ToolInfo/spec`。实际调用会在 `handle_mcp_tool_call` 中 refresh 并从 current binding 重新 `prepare_call(server, tool)`；所以同名 tool 的 call-time client/metadata 可以随 publication 更新，已删除 tool 则返回 unavailable。[E: codex-rs/core/src/session/step_context.rs:20][E: codex-rs/core/src/tools/handlers/mcp.rs:36][E: codex-rs/core/src/tools/handlers/mcp.rs:149][E: codex-rs/core/src/mcp_tool_call.rs:143][E: codex-rs/core/src/mcp_tool_call.rs:145][E: codex-rs/core/src/mcp_tool_call.rs:152]

deferred MCP runtime 不是无条件进入 `tool_search`：finalizer 先应用 direct-model-only namespace overrides，随后仅在 search gate 开启且 registry 至少有一个带 `search_info()` 的 Deferred runtime 时追加 search executor；executor 再从 registry 收集全部 Deferred search infos。[E: codex-rs/core/src/tools/spec_plan.rs:242][E: codex-rs/core/src/tools/spec_plan.rs:252][E: codex-rs/core/src/tools/spec_plan.rs:253][E: codex-rs/core/src/tools/spec_plan.rs:255][E: codex-rs/core/src/tools/spec_plan.rs:256][E: codex-rs/core/src/tools/spec_plan.rs:260][E: codex-rs/core/src/tools/spec_plan.rs:1013][E: codex-rs/core/src/tools/spec_plan.rs:1015][E: codex-rs/core/src/tools/spec_plan.rs:1016]

`namespace_tools_enabled` 同时参与 search gate，并在构建 model-visible specs 的最后过滤 `ToolSpec::Namespace`；registry 本身仍保留这些 runtime。[E: codex-rs/core/src/tools/spec_plan.rs:383][E: codex-rs/core/src/tools/spec_plan.rs:384][E: codex-rs/core/src/tools/spec_plan.rs:301][E: codex-rs/core/src/tools/spec_plan.rs:318][E: codex-rs/core/src/tools/spec_plan.rs:320][E: codex-rs/core/src/tools/spec_plan.rs:321]

server 的初始 tool catalog 也受协议模式影响：legacy 只消费第一份 `tools/list` response；`V20260728` 会跟随 `nextCursor`，并通过公共 collector 限制 100 页、2,048 项、64 KiB cursor、重复 cursor 与整体超时。两种模式最终都进入同一 normalization/namespace runtime。[E: codex-rs/codex-mcp/src/rmcp_client.rs:587][E: codex-rs/codex-mcp/src/rmcp_client.rs:596][E: codex-rs/codex-mcp/src/rmcp_client.rs:603][E: codex-rs/codex-mcp/src/rmcp_client.rs:607][E: codex-rs/codex-mcp/src/pagination.rs:9][E: codex-rs/codex-mcp/src/pagination.rs:14]

## 3 search metadata

`McpHandler::search_info()` 用 connector name 或 server name 构造 source name，并用 namespace description 作为 source description；search text 来自 `build_mcp_search_text(&tool_info)`。[E: codex-rs/core/src/tools/handlers/mcp.rs:93][E: codex-rs/core/src/tools/handlers/mcp.rs:94][E: codex-rs/core/src/tools/handlers/mcp.rs:100][E: codex-rs/core/src/tools/handlers/mcp.rs:101][E: codex-rs/core/src/tools/handlers/mcp.rs:103][E: codex-rs/core/src/tools/handlers/mcp.rs:110][E: codex-rs/core/src/tools/handlers/mcp.rs:113][E: codex-rs/core/src/tools/handlers/mcp.rs:114]

`build_mcp_search_text` 拼入 flat/callable/original tool name、server name、title、description、connector name、namespace description、plugin display names 和 input schema property names。[E: codex-rs/core/src/tools/handlers/mcp.rs:278][E: codex-rs/core/src/tools/handlers/mcp.rs:288][E: codex-rs/core/src/tools/handlers/mcp.rs:289][E: codex-rs/core/src/tools/handlers/mcp.rs:290][E: codex-rs/core/src/tools/handlers/mcp.rs:291][E: codex-rs/core/src/tools/handlers/mcp.rs:292][E: codex-rs/core/src/tools/handlers/mcp.rs:294][E: codex-rs/core/src/tools/handlers/mcp.rs:299][E: codex-rs/core/src/tools/handlers/mcp.rs:304][E: codex-rs/core/src/tools/handlers/mcp.rs:309][E: codex-rs/core/src/tools/handlers/mcp.rs:314][E: codex-rs/core/src/tools/handlers/mcp.rs:322]

当 search result 被转成 loadable output 时，namespace 内每个 function 会带 `defer_loading: Some(true)` 且清空 output schema。[E: codex-rs/tools/src/tool_search.rs:41][E: codex-rs/tools/src/tool_search.rs:45][E: codex-rs/tools/src/tool_search.rs:47][E: codex-rs/tools/src/tool_search.rs:48][E: codex-rs/tools/src/tool_search.rs:50]

## 4 handler 走读

handler 只接受 Function payload；它调用 `handle_mcp_tool_call`，传入 session、step context、call id、server name、MCP tool name、hook tool name 和原始 arguments。[E: codex-rs/core/src/tools/handlers/mcp.rs:139][E: codex-rs/core/src/tools/handlers/mcp.rs:140][E: codex-rs/core/src/tools/handlers/mcp.rs:149][E: codex-rs/core/src/tools/handlers/mcp.rs:150][E: codex-rs/core/src/tools/handlers/mcp.rs:151][E: codex-rs/core/src/tools/handlers/mcp.rs:152][E: codex-rs/core/src/tools/handlers/mcp.rs:153][E: codex-rs/core/src/tools/handlers/mcp.rs:154][E: codex-rs/core/src/tools/handlers/mcp.rs:155][E: codex-rs/core/src/tools/handlers/mcp.rs:156]

输出是 `McpToolOutput`，携带 MCP result、tool input、wall time、original-image-detail support 和 truncation policy。[E: codex-rs/core/src/tools/handlers/mcp.rs:160][E: codex-rs/core/src/tools/handlers/mcp.rs:161][E: codex-rs/core/src/tools/handlers/mcp.rs:162][E: codex-rs/core/src/tools/handlers/mcp.rs:163][E: codex-rs/core/src/tools/handlers/mcp.rs:164][E: codex-rs/core/src/tools/handlers/mcp.rs:165]

call request `_meta` 在两种协议下都保留：现代 2026 session 直接写入 typed `CallToolRequestParams.meta`，legacy session 则通过 peer request options 发送；这只是 wire compatibility 分支，不改变 core 的 approval/preparation authority。[E: codex-rs/rmcp-client/src/rmcp_client.rs:700][E: codex-rs/rmcp-client/src/rmcp_client.rs:717][E: codex-rs/rmcp-client/src/rmcp_client.rs:728][E: codex-rs/rmcp-client/src/rmcp_client.rs:734][E: codex-rs/rmcp-client/src/rmcp_client.rs:738][E: codex-rs/rmcp-client/src/rmcp_client.rs:742]

## 5 Approval 语义

执行前的 current `PreparedMcpCall` 决定 approval authority：`codex_apps` server 从 app-tool policy 计算 effective mode，普通 MCP server 使用 prepared call 的 server/tool mode；selected-plugin server 使用禁止 persistent approval 的 policy，其他 server 才允许生成 persistent key。[E: codex-rs/core/src/mcp_tool_call.rs:162][E: codex-rs/core/src/mcp_tool_call.rs:165][E: codex-rs/core/src/mcp_tool_call.rs:177][E: codex-rs/core/src/mcp_tool_call.rs:180][E: codex-rs/core/src/mcp_tool_call.rs:225][E: codex-rs/core/src/mcp_tool_call.rs:226][E: codex-rs/core/src/mcp_tool_call.rs:228][E: codex-rs/core/src/mcp_tool_call.rs:1032][E: codex-rs/core/src/mcp_tool_call.rs:1035][E: codex-rs/core/src/mcp_tool_call.rs:1039][E: codex-rs/core/src/mcp_tool_call.rs:1042]

四种 mode 的 prompt 判定是：`Auto` 按 annotations 决定，明确 destructive 会 prompt，明确 read-only 会跳过，缺 hints 默认 prompt；`Prompt` 总是 prompt；`Writes` 仅 read-only 跳过；`Approve` 从不 prompt。[E: codex-rs/core/src/mcp_tool_call.rs:2161][E: codex-rs/core/src/mcp_tool_call.rs:2163][E: codex-rs/core/src/mcp_tool_call.rs:2167][E: codex-rs/core/src/mcp_tool_call.rs:2170][E: codex-rs/core/src/mcp_tool_call.rs:2174][E: codex-rs/core/src/mcp_tool_call.rs:2184][E: codex-rs/core/src/mcp_tool_call.rs:2185][E: codex-rs/core/src/mcp_tool_call.rs:2186][E: codex-rs/core/src/mcp_tool_call.rs:2187][E: codex-rs/core/src/mcp_tool_call.rs:2190]

approval pipeline 先应用 permission-profile auto-approval 和 mode 判定；session remember key 只为 `Auto` 生成，permission hooks 可直接 allow/deny，guardian `AutoReview` 只在 `OnRequest`/`Granular` approval policy 下运行。仍需询问时，`ToolCallMcpElicitation` feature 选择 MCP elicitation，否则使用 blocking `request_user_input`；可返回 accept、session remember、persistent remember、decline 或 cancel。persistent 选项还同时要求该 feature 和 selected-plugin 之外可生成的 persistent key。[E: codex-rs/core/src/mcp_tool_call.rs:1009][E: codex-rs/core/src/mcp_tool_call.rs:1010][E: codex-rs/core/src/mcp_tool_call.rs:1011][E: codex-rs/core/src/mcp_tool_call.rs:1012][E: codex-rs/core/src/mcp_tool_call.rs:1013][E: codex-rs/core/src/mcp_tool_call.rs:1014][E: codex-rs/core/src/mcp_tool_call.rs:1265][E: codex-rs/core/src/mcp_tool_call.rs:1271][E: codex-rs/core/src/mcp_tool_call.rs:1272][E: codex-rs/core/src/mcp_tool_call.rs:1295][E: codex-rs/core/src/mcp_tool_call.rs:1305][E: codex-rs/core/src/mcp_tool_call.rs:1317][E: codex-rs/core/src/mcp_tool_call.rs:1323][E: codex-rs/core/src/mcp_tool_call.rs:1337][E: codex-rs/core/src/mcp_tool_call.rs:1340][E: codex-rs/core/src/mcp_tool_call.rs:1353][E: codex-rs/core/src/mcp_tool_call.rs:1356][E: codex-rs/core/src/mcp_tool_call.rs:1398][E: codex-rs/core/src/mcp_tool_call.rs:1432][E: codex-rs/core/src/mcp_tool_call.rs:1459][E: codex-rs/core/src/mcp_tool_call.rs:1464]

## 6 parallel support

MCP handler 的 parallel 支持来自 server-level opt-in 或 MCP annotations 的 `read_only_hint`。[E: codex-rs/core/src/tools/handlers/mcp.rs:80][E: codex-rs/core/src/tools/handlers/mcp.rs:83][E: codex-rs/core/src/tools/handlers/mcp.rs:87][E: codex-rs/core/src/tools/handlers/mcp.rs:89][E: codex-rs/core/src/tools/handlers/mcp.rs:90]

## Sources

- `codex-rs/core/src/mcp_tool_exposure.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/mcp.rs`
- `codex-rs/core/src/mcp_tool_call.rs`
- `codex-rs/codex-mcp/src/binding.rs`
- `codex-rs/codex-mcp/src/rmcp_client.rs`
- `codex-rs/codex-mcp/src/pagination.rs`
- `codex-rs/rmcp-client/src/protocol_mode.rs`
- `codex-rs/rmcp-client/src/rmcp_client.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/tools/src/tool_search.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [dynamic tools](dynamic-tools.md)
- [MCP connectors](../../subsystems/mcp/connectors.md)
