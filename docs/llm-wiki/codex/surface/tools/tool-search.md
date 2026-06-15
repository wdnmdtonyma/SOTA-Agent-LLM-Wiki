---
id: tool.tool-search
title: tool_search 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/tool_discovery.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_config.rs, codex-rs/features/src/lib.rs, codex-rs/tools/src/responses_api.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/tool_search.rs, codex-rs/core/src/tools/tool_search_entry.rs, codex-rs/core/src/tools/context.rs, codex-rs/protocol/src/models.rs]
symbols: [create_tool_search_tool, ToolSpec::ToolSearch, ToolHandlerKind::ToolSearch, ToolSearchHandler, build_tool_search_entries, ToolSearchOutput]
related: [tool.tool-suggest, tool.mcp-namespace-tools, tool.dynamic-tools, subsys.core.tool-system, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `tool_search` 是 Codex 的 deferred tool discovery 工具；它用 BM25 搜索未预先暴露的 MCP/dynamic tool metadata，并把匹配到的 `LoadableToolSpec` 暴露给下一次模型调用。[E: codex-rs/tools/src/tool_discovery.rs:192][E: codex-rs/core/src/tools/handlers/tool_search.rs:85]

## 能回答的问题

- `tool_search` 为什么是 `ToolSpec::ToolSearch` 而不是普通 Function？
- `tool_search` 的参数、默认 limit 和 BM25 搜索逻辑是什么？
- 哪些 deferred MCP/dynamic tools 会进入 `tool_search`？
- `tool_search` 如何把多个 namespace tool 合并成一个 namespace spec？
- `tool_search` 的 registry gate、handler kind 和 parallel-safe 值是什么？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `tool_search` | 常量 `TOOL_SEARCH_TOOL_NAME` 为 `tool_search`，`ToolSpec::name()` 对 `ToolSearch` 也返回 `tool_search`。[E: codex-rs/tools/src/tool_discovery.rs:16][E: codex-rs/tools/src/tool_spec.rs:65] |
| aliases | 未看到独立 alias；deferred MCP tool names 会额外注册到 `ToolHandlerKind::Mcp`。 | `build_tool_registry_plan` 注册 `TOOL_SEARCH_TOOL_NAME`，再为 deferred MCP tools 注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:291][E: codex-rs/tools/src/tool_registry_plan.rs:295][I] |
| ToolSpec 类型 | `ToolSpec::ToolSearch { execution, description, parameters }` | `create_tool_search_tool` 返回 `ToolSpec::ToolSearch`，execution 固定为 `client`，并携带 description 与 parameters。[E: codex-rs/tools/src/tool_discovery.rs:195][E: codex-rs/tools/src/tool_discovery.rs:196][E: codex-rs/tools/src/tool_discovery.rs:197][E: codex-rs/tools/src/tool_discovery.rs:198] |
| ToolHandlerKind | `ToolHandlerKind::ToolSearch` | registry 注册 `ToolHandlerKind::ToolSearch`。[E: codex-rs/tools/src/tool_registry_plan.rs:291] |
| core handler | `ToolSearchHandler` | `core/src/tools/spec.rs` 在 `ToolHandlerKind::ToolSearch` 分支 lazy 构建并注册 `ToolSearchHandler`。[E: codex-rs/core/src/tools/spec.rs:266][E: codex-rs/core/src/tools/spec.rs:272][E: codex-rs/core/src/tools/spec.rs:275] |
| 所属 crate | spec/转换在 `codex-tools`，搜索执行在 `codex-core`，参数类型在 `codex-protocol`。 | `SearchToolCallParams` 定义 `query` 和 `limit`。[E: codex-rs/tools/src/tool_discovery.rs:149][E: codex-rs/core/src/tools/handlers/tool_search.rs:21][E: codex-rs/protocol/src/models.rs:948][E: codex-rs/protocol/src/models.rs:951] |

## 2 用途定位

工具描述写明 `tool_search` 搜索 deferred tool metadata，并把匹配工具暴露给下一次模型调用。[E: codex-rs/tools/src/tool_discovery.rs:192]  
description 会列出当前可搜索 sources；如果没有 sources，会显示 `None currently enabled.`；非空 sources 会被格式化成逐行列表。[E: codex-rs/tools/src/tool_discovery.rs:178][E: codex-rs/tools/src/tool_discovery.rs:181][E: codex-rs/tools/src/tool_discovery.rs:188]  
description 特别要求 MCP tool discovery 使用 `tool_search`，而不是 `list_mcp_resources` 或 `list_mcp_resource_templates`。[E: codex-rs/tools/src/tool_discovery.rs:192]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `query` | string | 是 | 无 | deferred tools 的搜索查询。 | ToolSearch schema required 包含 `query`；handler trim 后拒绝空 query。[E: codex-rs/tools/src/tool_discovery.rs:156][E: codex-rs/tools/src/tool_discovery.rs:200][E: codex-rs/core/src/tools/handlers/tool_search.rs:67][E: codex-rs/core/src/tools/handlers/tool_search.rs:70] |
| `limit` | number / usize | 否 | `8` | 最大返回工具数。 | 常量 `TOOL_SEARCH_DEFAULT_LIMIT` 为 8；handler `unwrap_or` 到默认值，并拒绝 0。[E: codex-rs/tools/src/tool_discovery.rs:17][E: codex-rs/core/src/tools/handlers/tool_search.rs:73][E: codex-rs/core/src/tools/handlers/tool_search.rs:75] |

`tool_search` 的 runtime payload 不是普通 JSON string arguments，而是 `ToolPayload::ToolSearch { arguments: SearchToolCallParams }`。[E: codex-rs/core/src/tools/context.rs:57][E: codex-rs/protocol/src/models.rs:947]  
`ToolSearchHandler` 只接受 `ToolPayload::ToolSearch`，收到其他 payload 会产生 fatal unsupported payload 错误。[E: codex-rs/core/src/tools/handlers/tool_search.rs:57][E: codex-rs/core/src/tools/handlers/tool_search.rs:60]

## 4 输出 schema & 截断

`ToolSearchOutput` 持有 `tools: Vec<LoadableToolSpec>`，输出 response item 是 `ResponseInputItem::ToolSearchOutput { status: "completed", execution: "client", tools }`。[E: codex-rs/core/src/tools/context.rs:196][E: codex-rs/core/src/tools/context.rs:218][E: codex-rs/core/src/tools/context.rs:220][E: codex-rs/core/src/tools/context.rs:222]  
每个 `LoadableToolSpec` 只能是 `Function(ResponsesApiTool)` 或 `Namespace(ResponsesApiNamespace)`。[E: codex-rs/tools/src/responses_api.rs:46][E: codex-rs/tools/src/responses_api.rs:48]  
handler 输出前调用 `coalesce_loadable_tool_specs`，把同名 namespace 的多个 tool 合并到一个 namespace spec。[E: codex-rs/core/src/tools/handlers/tool_search.rs:140][E: codex-rs/tools/src/responses_api.rs:105][E: codex-rs/tools/src/responses_api.rs:112]  
输出 telemetry preview 会把 tool specs 序列化成 JSON array 后再走 preview truncation，而模型-facing `ToolSearchOutput.tools` 本身由 response item 承载。[E: codex-rs/core/src/tools/context.rs:201][E: codex-rs/core/src/tools/context.rs:209][E: codex-rs/core/src/tools/context.rs:218][E: codex-rs/core/src/tools/context.rs:222]

## 5 ToolSpec 类型

`tool_search` 使用专门的 `ToolSpec::ToolSearch` 变体，`ToolSpec` enum 中该变体序列化 tag 为 `tool_search` 并包含 `execution/description/parameters` 字段。[E: codex-rs/tools/src/tool_spec.rs:27][E: codex-rs/tools/src/tool_spec.rs:31]  
选择这个变体的原因是 Responses API 对 tool search 输出有专门的 `ToolSearchOutput` response item；Codex core 也用 `ToolPayload::ToolSearch` 和 `ResponseInputItem::ToolSearchOutput` 区分它与普通 Function 工具。[E: codex-rs/core/src/tools/context.rs:56][E: codex-rs/core/src/tools/context.rs:218][I]

## 6 注册与门控

`ToolsConfig::new` 只有在 `model_info.supports_search_tool` 与 `Feature::ToolSearch` 都为 true 时把 `search_tool` 设为 true。[E: codex-rs/tools/src/tool_config.rs:152][E: codex-rs/tools/src/tool_config.rs:217]  
`Feature::ToolSearch` 的 feature key 是 `tool_search`，stage 是 Stable，默认开启。[E: codex-rs/features/src/lib.rs:822][E: codex-rs/features/src/lib.rs:823][E: codex-rs/features/src/lib.rs:824][E: codex-rs/features/src/lib.rs:825]  
`build_tool_registry_plan` 只有在 `config.search_tool` 且存在 `deferred_mcp_tools` 或 deferred dynamic tools 时 push `tool_search` spec。[E: codex-rs/tools/src/tool_registry_plan.rs:263][E: codex-rs/tools/src/tool_registry_plan.rs:264][E: codex-rs/tools/src/tool_registry_plan.rs:286][E: codex-rs/tools/src/tool_registry_plan.rs:288]  
deferred dynamic tools 是 `params.dynamic_tools` 中 `defer_loading == true` 的子集。[E: codex-rs/tools/src/tool_registry_plan.rs:257][E: codex-rs/tools/src/tool_registry_plan.rs:260]  
如果存在 deferred MCP tools，registry 还会为这些 tool names 注册 `ToolHandlerKind::Mcp`；这使搜索后 load 出来的 MCP 工具有本地 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:293][E: codex-rs/tools/src/tool_registry_plan.rs:295][I]

## 7 parallel-safe

`tool_search` 的 `supports_parallel_tool_calls` 实际值是 `true`。[E: codex-rs/tools/src/tool_registry_plan.rs:288]  
handler 构造 BM25 search engine 后在 handle 中复用它，parallel-safe 与只读 discovery 定位一致。[E: codex-rs/core/src/tools/handlers/tool_search.rs:28][E: codex-rs/core/src/tools/handlers/tool_search.rs:33][E: codex-rs/core/src/tools/handlers/tool_search.rs:110][I]  
`ToolSearchHandler::new` 在构造时把 entries 转成 BM25 documents。[E: codex-rs/core/src/tools/handlers/tool_search.rs:28][E: codex-rs/core/src/tools/handlers/tool_search.rs:33]

## 8 handler 走读

1. `core/src/tools/spec.rs` 收集 `deferred_dynamic_tools`，只保留 `defer_loading` 为 true 的 dynamic tools。[E: codex-rs/core/src/tools/spec.rs:161][E: codex-rs/core/src/tools/spec.rs:163]
2. `ToolHandlerKind::ToolSearch` 首次出现时，core 调用 `build_tool_search_entries(deferred_mcp_tools, &deferred_dynamic_tools)`。[E: codex-rs/core/src/tools/spec.rs:266][E: codex-rs/core/src/tools/spec.rs:268]
3. `build_tool_search_entries` 先按 canonical tool name 排序 deferred MCP tools，再追加 dynamic tools。[E: codex-rs/core/src/tools/tool_search_entry.rs:25][E: codex-rs/core/src/tools/tool_search_entry.rs:40][E: codex-rs/core/src/tools/tool_search_entry.rs:42]
4. MCP search entry 的 search text 包含 canonical name、callable name、server name、description、connector info、plugin display names 和 input schema property names。[E: codex-rs/core/src/tools/tool_search_entry.rs:79][E: codex-rs/core/src/tools/tool_search_entry.rs:83][E: codex-rs/core/src/tools/tool_search_entry.rs:92][E: codex-rs/core/src/tools/tool_search_entry.rs:126]
5. dynamic search entry 的 search text 包含 name、name 的 underscore 替换版本、description、namespace 和 input schema property names。[E: codex-rs/core/src/tools/tool_search_entry.rs:132][E: codex-rs/core/src/tools/tool_search_entry.rs:147]
6. handler trim query、应用默认 limit、拒绝空 query 或 limit 0。[E: codex-rs/core/src/tools/handlers/tool_search.rs:66][E: codex-rs/core/src/tools/handlers/tool_search.rs:70][E: codex-rs/core/src/tools/handlers/tool_search.rs:73][E: codex-rs/core/src/tools/handlers/tool_search.rs:75]
7. handler 用 BM25 `search_engine.search(query, limit)` 找 entries，并把结果转成 `LoadableToolSpec`。[E: codex-rs/core/src/tools/handlers/tool_search.rs:110][E: codex-rs/core/src/tools/handlers/tool_search.rs:141]
8. 如果默认 limit 命中 `computer-use` bucket，handler 会扩大搜索到 20 并按 bucket 限流。[E: codex-rs/core/src/tools/handlers/tool_search.rs:19][E: codex-rs/core/src/tools/handlers/tool_search.rs:119][E: codex-rs/core/src/tools/handlers/tool_search.rs:123][E: codex-rs/core/src/tools/handlers/tool_search.rs:133]

## 9 设计动机·edge·历史

`tool_search` 把低频或大量工具延迟暴露，减少初始 tool list 的上下文占用，同时仍允许模型按需求加载工具。[E: codex-rs/tools/src/tool_discovery.rs:192][I]  
MCP search result 通过 `mcp_tool_to_deferred_responses_api_tool` 设置 `defer_loading: true`，让返回的 namespace tool 仍带 deferred 标记。[E: codex-rs/tools/src/responses_api.rs:131][E: codex-rs/tools/src/responses_api.rs:138]  
dynamic tool search result 复用 `dynamic_tool_to_loadable_tool_spec`，如果 dynamic tool 有 namespace 就返回 namespace spec，否则返回 function spec。[E: codex-rs/tools/src/responses_api.rs:77][E: codex-rs/tools/src/responses_api.rs:82][E: codex-rs/tools/src/responses_api.rs:88]  
`tool_search` 与 `tool_suggest` 分工不同：`tool_search` 查找当前 thread/连接中已经可 deferred loading 的 tools，`tool_suggest` 请求用户安装或启用缺失 connector/plugin。[E: codex-rs/tools/src/tool_discovery.rs:192][E: codex-rs/tools/src/tool_discovery.rs:311]

## Sources

- `codex-rs/tools/src/tool_discovery.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/tool_search.rs`
- `codex-rs/core/src/tools/tool_search_entry.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/protocol/src/models.rs`

## 相关

- [tool_suggest 工具](tool-suggest.md)
- [MCP namespace 工具](mcp-namespace-tools.md)
- [dynamic 工具](dynamic-tools.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Connectors](../../subsystems/mcp/connectors.md)
