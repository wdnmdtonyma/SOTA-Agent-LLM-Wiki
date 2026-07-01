---
id: tool.tool-search
title: tool_search 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/tool_search_spec.rs, codex-rs/core/src/tools/handlers/tool_search.rs, codex-rs/core/src/tools/handlers/dynamic.rs, codex-rs/core/src/tools/handlers/extension_tools.rs, codex-rs/core/src/tools/handlers/mcp.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/spawn.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/router.rs, codex-rs/tools/src/tool_discovery.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_search.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/responses_api.rs, codex-rs/protocol/src/models.rs]
symbols: [append_tool_search_executor, create_tool_search_tool, ToolSearchHandler, ToolSearchHandlerCache, ToolSearchInfo, ToolSearchEntry, ToolSearchOutput, ToolPayload::ToolSearch, ToolSpec::ToolSearch]
related: [tool.list-available-plugins-to-install, tool.request-plugin-install, tool.mcp-namespace-tools, tool.dynamic-tools, subsys.core.tool-system, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: db887d03e1
---

> `tool_search` 是 Codex 的 deferred tool discovery runtime。当前 planner 从 exposure 为 `Deferred` 的 tool runtime 收集 `search_info()`，当模型支持 search tool 且 provider 支持 namespace tools 时，追加一个 BM25-backed `ToolSearchHandler`，让模型按查询把匹配的 deferred tools 暴露到下一次调用。[E: codex-rs/core/src/tools/spec_plan.rs:964][E: codex-rs/core/src/tools/spec_plan.rs:969][E: codex-rs/core/src/tools/spec_plan.rs:973][E: codex-rs/core/src/tools/spec_plan.rs:976][E: codex-rs/core/src/tools/spec_plan.rs:983][E: codex-rs/core/src/tools/spec_plan.rs:984][E: codex-rs/core/src/tools/handlers/tool_search.rs:80][E: codex-rs/core/src/tools/handlers/tool_search.rs:86]

## 能回答的问题

- `tool_search` 为什么是 `ToolSpec::ToolSearch` 而不是普通 function？
- `query`、`limit` 的 schema、默认值和 runtime 校验是什么？
- 哪些 deferred runtime 会进入搜索索引？
- 搜索结果如何转换成 `LoadableToolSpec`，namespace 结果如何合并？
- 它何时出现在 model-visible tools 中，是否支持 parallel？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `TOOL_SEARCH_TOOL_NAME` 是 `tool_search`；`ToolSpec::name()` 对 `ToolSearch` 也返回 `tool_search`。[E: codex-rs/tools/src/tool_discovery.rs:6][E: codex-rs/tools/src/tool_spec.rs:55][E: codex-rs/tools/src/tool_spec.rs:60] |
| concrete handler | `ToolSearchHandler` 持有 `search_infos`、已构造的 `spec` 和 BM25 `search_engine`。[E: codex-rs/core/src/tools/handlers/tool_search.rs:25][E: codex-rs/core/src/tools/handlers/tool_search.rs:26][E: codex-rs/core/src/tools/handlers/tool_search.rs:27][E: codex-rs/core/src/tools/handlers/tool_search.rs:28] |
| ToolSpec | `create_tool_search_tool` 返回 `ToolSpec::ToolSearch { execution: "client", description, parameters }`。[E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:7][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:53][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:54][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:55][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:56] |
| payload shape | router 只把 `execution == "client"` 且有 `call_id` 的 `ResponseItem::ToolSearchCall` 转成 `ToolPayload::ToolSearch`。[E: codex-rs/core/src/tools/router.rs:129][E: codex-rs/core/src/tools/router.rs:134][E: codex-rs/core/src/tools/router.rs:141][E: codex-rs/core/src/tools/router.rs:142][E: codex-rs/core/src/tools/router.rs:144] |

## 2 用途定位

工具描述写明它搜索 deferred tool metadata，并把匹配工具暴露给下一次模型调用；描述还会列出当前可搜索的 sources，空列表时显示 `None currently enabled.`。[E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:36][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:37][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:49][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:50]

MCP、dynamic、extension adapter、multi-agent v1 handler 等 runtime 通过 `ToolExecutor::search_info()` 进入 search index；默认实现从 function/namespace spec 派生 metadata，具体 handler 也可以覆盖 source info 或 search text。[E: codex-rs/tools/src/tool_executor.rs:23][E: codex-rs/tools/src/tool_executor.rs:26][E: codex-rs/tools/src/tool_executor.rs:59][E: codex-rs/tools/src/tool_executor.rs:61][E: codex-rs/core/src/tools/handlers/dynamic.rs:99][E: codex-rs/core/src/tools/handlers/dynamic.rs:103][E: codex-rs/core/src/tools/handlers/dynamic.rs:104][E: codex-rs/core/src/tools/handlers/extension_tools.rs:52][E: codex-rs/core/src/tools/handlers/extension_tools.rs:53][E: codex-rs/core/src/tools/handlers/mcp.rs:89][E: codex-rs/core/src/tools/handlers/mcp.rs:108][E: codex-rs/core/src/tools/handlers/mcp.rs:109][E: codex-rs/core/src/tools/handlers/multi_agents.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents.rs:72][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:34][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:35]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `query` | string | 是 | 无 | deferred tools 的搜索查询。 | schema required 包含 `query`；handler trim 后拒绝空 query。[E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:13][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:14][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:58][E: codex-rs/core/src/tools/handlers/tool_search.rs:131][E: codex-rs/core/src/tools/handlers/tool_search.rs:132][E: codex-rs/core/src/tools/handlers/tool_search.rs:134] |
| `limit` | number / usize | 否 | `8` | 最大返回工具数。 | 默认常量为 8；handler `unwrap_or` 到默认值，并拒绝 0。[E: codex-rs/tools/src/tool_discovery.rs:7][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:17][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:19][E: codex-rs/core/src/tools/handlers/tool_search.rs:137][E: codex-rs/core/src/tools/handlers/tool_search.rs:139][E: codex-rs/core/src/tools/handlers/tool_search.rs:141] |

协议 `SearchToolCallParams` 对应 `query: String` 和 optional `limit: Option<usize>`；tool payload enum 中 `ToolSearch` 也直接保存该类型。[E: codex-rs/protocol/src/models.rs:1773][E: codex-rs/protocol/src/models.rs:1774][E: codex-rs/protocol/src/models.rs:1777][E: codex-rs/tools/src/tool_payload.rs:3][E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:9]

## 4 输出

成功输出是 `ToolSearchOutput { tools: Vec<LoadableToolSpec> }`；response item 是 `ResponseInputItem::ToolSearchOutput { status: "completed", execution: "client", tools }`。[E: codex-rs/core/src/tools/context.rs:147][E: codex-rs/core/src/tools/context.rs:148][E: codex-rs/core/src/tools/context.rs:165][E: codex-rs/core/src/tools/context.rs:169][E: codex-rs/core/src/tools/context.rs:170][E: codex-rs/core/src/tools/context.rs:172][E: codex-rs/core/src/tools/context.rs:173][E: codex-rs/core/src/tools/context.rs:174]

`LoadableToolSpec` 只包含 `Function(ResponsesApiTool)` 和 `Namespace(ResponsesApiNamespace)` 两种；handler 输出前调用 `coalesce_loadable_tool_specs` 合并同名 namespace。[E: codex-rs/tools/src/responses_api.rs:40][E: codex-rs/tools/src/responses_api.rs:43][E: codex-rs/tools/src/responses_api.rs:46][E: codex-rs/tools/src/responses_api.rs:48][E: codex-rs/core/src/tools/handlers/tool_search.rs:177][E: codex-rs/core/src/tools/handlers/tool_search.rs:178][E: codex-rs/tools/src/responses_api.rs:77][E: codex-rs/tools/src/responses_api.rs:86][E: codex-rs/tools/src/responses_api.rs:97]

如果调用被中止并走 `AbortedToolOutput`，它会对 `ToolPayload::ToolSearch` 生成一个 completed、client、空 `tools` 的 `ToolSearchOutput`，而不是普通 function output。[E: codex-rs/core/src/tools/context.rs:277][E: codex-rs/core/src/tools/context.rs:278][E: codex-rs/core/src/tools/context.rs:286][E: codex-rs/core/src/tools/context.rs:290][E: codex-rs/core/src/tools/context.rs:292][E: codex-rs/core/src/tools/context.rs:294][E: codex-rs/core/src/tools/context.rs:295][E: codex-rs/core/src/tools/context.rs:296]

## 5 注册与门控

`append_tool_search_executor` 只有在 `search_tool_enabled(turn_context)` 为 true 时继续；当前 `search_tool_enabled` 要求 `turn_context.model_info.supports_search_tool` 且 provider 支持 namespace tools。[E: codex-rs/core/src/tools/spec_plan.rs:964][E: codex-rs/core/src/tools/spec_plan.rs:969][E: codex-rs/core/src/tools/spec_plan.rs:331][E: codex-rs/core/src/tools/spec_plan.rs:332][E: codex-rs/core/src/tools/spec_plan.rs:342][E: codex-rs/core/src/tools/spec_plan.rs:343]

它只收集 exposure 为 `Deferred` 的 runtimes，并且只有 `search_infos` 非空才通过 `ToolSearchHandlerCache::get_or_build(search_infos)` 加入 planned tools。[E: codex-rs/core/src/tools/spec_plan.rs:973][E: codex-rs/core/src/tools/spec_plan.rs:976][E: codex-rs/core/src/tools/spec_plan.rs:977][E: codex-rs/core/src/tools/spec_plan.rs:979][E: codex-rs/core/src/tools/spec_plan.rs:983][E: codex-rs/core/src/tools/spec_plan.rs:984]

同一 planner 会把所有 runtime 放进 registry，但只有 `exposure.is_direct()` 的 runtime 才进入初始 model-visible specs；model-visible namespace specs 还要求 provider 支持 namespace tools。[E: codex-rs/core/src/tools/spec_plan.rs:246][E: codex-rs/core/src/tools/spec_plan.rs:250][E: codex-rs/core/src/tools/spec_plan.rs:251][E: codex-rs/core/src/tools/spec_plan.rs:253][E: codex-rs/core/src/tools/spec_plan.rs:264][E: codex-rs/core/src/tools/spec_plan.rs:265][E: codex-rs/core/src/tools/spec_plan.rs:267][E: codex-rs/core/src/tools/spec_plan.rs:268][E: codex-rs/tools/src/tool_executor.rs:38][E: codex-rs/tools/src/tool_executor.rs:40]

当 search + namespace gates 开启且已有 deferred runtime 时，planner 还会提前保留 `tool_search` 这个名字，避免后续 extension tool 与发现工具冲突。[E: codex-rs/core/src/tools/spec_plan.rs:1015][E: codex-rs/core/src/tools/spec_plan.rs:1019][E: codex-rs/core/src/tools/spec_plan.rs:1021]

## 6 搜索索引与结果

`ToolSearchHandler::new` 用每个 `search_info.entry.search_text` 构造 BM25 documents，并把 source info 传给 `create_tool_search_tool` 生成描述。[E: codex-rs/core/src/tools/handlers/tool_search.rs:74][E: codex-rs/core/src/tools/handlers/tool_search.rs:75][E: codex-rs/core/src/tools/handlers/tool_search.rs:79][E: codex-rs/core/src/tools/handlers/tool_search.rs:80][E: codex-rs/core/src/tools/handlers/tool_search.rs:82][E: codex-rs/core/src/tools/handlers/tool_search.rs:84][E: codex-rs/core/src/tools/handlers/tool_search.rs:87]

`ToolSearchInfo::from_tool_spec` / `from_spec` 会把 Function 和 Namespace 转成 loadable outputs，并为 deferred 结果设置 `defer_loading: Some(true)`、清空 `output_schema`；ToolSearch、ImageGeneration、WebSearch、Freeform 不会生成 search info。[E: codex-rs/tools/src/tool_search.rs:21][E: codex-rs/tools/src/tool_search.rs:22][E: codex-rs/tools/src/tool_search.rs:35][E: codex-rs/tools/src/tool_search.rs:37][E: codex-rs/tools/src/tool_search.rs:38][E: codex-rs/tools/src/tool_search.rs:47][E: codex-rs/tools/src/tool_search.rs:48][E: codex-rs/tools/src/tool_search.rs:52][E: codex-rs/tools/src/tool_search.rs:55]

handle 时，handler 搜索 BM25 `search_engine.search(query, limit)`，按 result document id 回取 `search_infos`，再把 entry output coalesce 成返回工具列表。[E: codex-rs/core/src/tools/handlers/tool_search.rs:149][E: codex-rs/core/src/tools/handlers/tool_search.rs:163][E: codex-rs/core/src/tools/handlers/tool_search.rs:165][E: codex-rs/core/src/tools/handlers/tool_search.rs:167][E: codex-rs/core/src/tools/handlers/tool_search.rs:168][E: codex-rs/core/src/tools/handlers/tool_search.rs:170][E: codex-rs/core/src/tools/handlers/tool_search.rs:177][E: codex-rs/core/src/tools/handlers/tool_search.rs:178]

## 7 parallel support

`ToolSearchHandler::supports_parallel_tool_calls()` 显式返回 true。[E: codex-rs/core/src/tools/handlers/tool_search.rs:106][E: codex-rs/core/src/tools/handlers/tool_search.rs:107]

## 8 handler 走读

1. router 解析 Responses `ToolSearchCall`，将 JSON arguments 反序列化为 `SearchToolCallParams`。[E: codex-rs/core/src/tools/router.rs:129][E: codex-rs/core/src/tools/router.rs:135][E: codex-rs/core/src/tools/router.rs:136]
2. handler 只接受 `ToolPayload::ToolSearch`，收到其它 payload 是 fatal unsupported payload。[E: codex-rs/core/src/tools/handlers/tool_search.rs:122][E: codex-rs/core/src/tools/handlers/tool_search.rs:123][E: codex-rs/core/src/tools/handlers/tool_search.rs:125][E: codex-rs/core/src/tools/handlers/tool_search.rs:126]
3. 空 query 和 `limit == 0` 会返回给模型的错误；空 search index 会成功返回空 tools。[E: codex-rs/core/src/tools/handlers/tool_search.rs:131][E: codex-rs/core/src/tools/handlers/tool_search.rs:132][E: codex-rs/core/src/tools/handlers/tool_search.rs:139][E: codex-rs/core/src/tools/handlers/tool_search.rs:145][E: codex-rs/core/src/tools/handlers/tool_search.rs:146]
4. 非空索引则执行 BM25 search 并返回 `ToolSearchOutput { tools }`。[E: codex-rs/core/src/tools/handlers/tool_search.rs:149][E: codex-rs/core/src/tools/handlers/tool_search.rs:151][E: codex-rs/core/src/tools/handlers/tool_search.rs:163][E: codex-rs/core/src/tools/handlers/tool_search.rs:165]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/tool_search_spec.rs`
- `codex-rs/core/src/tools/handlers/tool_search.rs`
- `codex-rs/core/src/tools/handlers/dynamic.rs`
- `codex-rs/core/src/tools/handlers/extension_tools.rs`
- `codex-rs/core/src/tools/handlers/mcp.rs`
- `codex-rs/core/src/tools/handlers/multi_agents.rs`
- `codex-rs/core/src/tools/handlers/multi_agents/spawn.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/tools/src/tool_discovery.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_payload.rs`
- `codex-rs/tools/src/tool_search.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/protocol/src/models.rs`

## 相关

- [list_available_plugins_to_install 工具](list-available-plugins-to-install.md)
- [request_plugin_install 工具](request-plugin-install.md)
- [MCP namespace 工具](mcp-namespace-tools.md)
- [dynamic 工具](dynamic-tools.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Connectors](../../subsystems/mcp/connectors.md)
