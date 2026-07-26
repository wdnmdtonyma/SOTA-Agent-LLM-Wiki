---
id: tool.tool-search
title: tool_search 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/tool_search_spec.rs, codex-rs/core/src/tools/handlers/tool_search.rs, codex-rs/core/src/tools/handlers/dynamic.rs, codex-rs/core/src/tools/handlers/extension_tools.rs, codex-rs/core/src/tools/handlers/mcp.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/spawn.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/context/world_state/tools.rs, codex-rs/core/src/session/world_state.rs, codex-rs/tools/src/tool_discovery.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_search.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/responses_api.rs, codex-rs/protocol/src/models.rs]
symbols: [append_tool_search_executor, create_tool_search_tool, ToolSearchHandler, ToolSearchHandlerCache, ToolSearchInfo, ToolSearchEntry, ToolSearchOutput, ToolPayload::ToolSearch, ToolSpec::ToolSearch]
related: [tool.list-available-plugins-to-install, tool.request-plugin-install, tool.mcp-namespace-tools, tool.dynamic-tools, subsys.core.tool-system, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `tool_search` 是 Codex 的 deferred tool discovery runtime。当前 planner 从 exposure 为 `Deferred` 的 tool runtime 收集 `search_info()`，当模型支持 search tool 且 provider 支持 namespace tools 时，追加一个 BM25-backed `ToolSearchHandler`，让模型按查询把匹配的 deferred tools 暴露到下一次调用。[E: codex-rs/core/src/tools/spec_plan.rs:962][E: codex-rs/core/src/tools/spec_plan.rs:967][E: codex-rs/core/src/tools/spec_plan.rs:971][E: codex-rs/core/src/tools/spec_plan.rs:974][E: codex-rs/core/src/tools/spec_plan.rs:947][E: codex-rs/core/src/tools/spec_plan.rs:993][E: codex-rs/core/src/tools/handlers/tool_search.rs:95][E: codex-rs/core/src/tools/handlers/tool_search.rs:101]

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
| concrete handler | `ToolSearchHandler` 持有 `search_infos`、已构造的 `spec` 和 BM25 `search_engine`。[E: codex-rs/core/src/tools/handlers/tool_search.rs:26][E: codex-rs/core/src/tools/handlers/tool_search.rs:27][E: codex-rs/core/src/tools/handlers/tool_search.rs:29][E: codex-rs/core/src/tools/handlers/tool_search.rs:30] |
| ToolSpec | `create_tool_search_tool` 返回 `ToolSpec::ToolSearch { execution: "client", description, parameters }`。[E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:13][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:68][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:69][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:70][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:71] |
| payload shape | router 只把 `execution == "client"` 且有 `call_id` 的 `ResponseItem::ToolSearchCall` 转成 `ToolPayload::ToolSearch`。[E: codex-rs/core/src/tools/router.rs:144][E: codex-rs/core/src/tools/router.rs:149][E: codex-rs/core/src/tools/router.rs:156][E: codex-rs/core/src/tools/router.rs:157][E: codex-rs/core/src/tools/router.rs:159] |

## 2 用途定位

工具描述写明它搜索 deferred tool metadata，并把匹配工具暴露给下一次模型调用；描述还会列出当前可搜索的 sources，空列表时显示 `None currently enabled.`。[E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:45][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:46][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:64][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:65]

MCP、dynamic、extension adapter、multi-agent v1 handler 等 runtime 通过 `ToolExecutor::search_info()` 进入 search index；默认实现从 function/namespace spec 派生 metadata，具体 handler 也可以覆盖 source info 或 search text。[E: codex-rs/tools/src/tool_executor.rs:26][E: codex-rs/tools/src/tool_executor.rs:59][E: codex-rs/tools/src/tool_executor.rs:61][E: codex-rs/core/src/tools/handlers/dynamic.rs:98][E: codex-rs/core/src/tools/handlers/dynamic.rs:102][E: codex-rs/core/src/tools/handlers/dynamic.rs:103][E: codex-rs/core/src/tools/handlers/extension_tools.rs:53][E: codex-rs/core/src/tools/handlers/extension_tools.rs:54][E: codex-rs/core/src/tools/handlers/mcp.rs:89][E: codex-rs/core/src/tools/handlers/mcp.rs:108][E: codex-rs/core/src/tools/handlers/mcp.rs:109][E: codex-rs/core/src/tools/handlers/multi_agents.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:33]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `query` | string | 是 | 无 | deferred tools 的搜索查询。 | schema required 包含 `query`；handler trim 后拒绝空 query。[E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:20][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:21][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:73][E: codex-rs/core/src/tools/handlers/tool_search.rs:147][E: codex-rs/core/src/tools/handlers/tool_search.rs:148][E: codex-rs/core/src/tools/handlers/tool_search.rs:150] |
| `limit` | number / usize | 否 | `8` | 最大返回工具数。 | 默认常量为 8；handler `unwrap_or` 到默认值，并拒绝 0。[E: codex-rs/tools/src/tool_discovery.rs:7][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:24][E: codex-rs/core/src/tools/handlers/tool_search_spec.rs:26][E: codex-rs/core/src/tools/handlers/tool_search.rs:153][E: codex-rs/core/src/tools/handlers/tool_search.rs:155][E: codex-rs/core/src/tools/handlers/tool_search.rs:157] |

协议 `SearchToolCallParams` 对应 `query: String` 和 optional `limit: Option<usize>`；tool payload enum 中 `ToolSearch` 也直接保存该类型。[E: codex-rs/protocol/src/models.rs:1791][E: codex-rs/protocol/src/models.rs:1792][E: codex-rs/protocol/src/models.rs:1795][E: codex-rs/tools/src/tool_payload.rs:3][E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:9]

## 4 输出

成功输出是 `ToolSearchOutput { tools: Vec<LoadableToolSpec> }`；response item 是 `ResponseInputItem::ToolSearchOutput { status: "completed", execution: "client", tools }`。[E: codex-rs/core/src/tools/context.rs:151][E: codex-rs/core/src/tools/context.rs:152][E: codex-rs/core/src/tools/context.rs:169][E: codex-rs/core/src/tools/context.rs:173][E: codex-rs/core/src/tools/context.rs:174][E: codex-rs/core/src/tools/context.rs:176][E: codex-rs/core/src/tools/context.rs:177][E: codex-rs/core/src/tools/context.rs:178]

`LoadableToolSpec` 只包含 `Function(ResponsesApiTool)` 和 `Namespace(ResponsesApiNamespace)` 两种；handler 输出前调用 `coalesce_loadable_tool_specs` 合并同名 namespace。[E: codex-rs/tools/src/responses_api.rs:40][E: codex-rs/tools/src/responses_api.rs:43][E: codex-rs/tools/src/responses_api.rs:46][E: codex-rs/tools/src/responses_api.rs:48][E: codex-rs/core/src/tools/handlers/tool_search.rs:193][E: codex-rs/core/src/tools/handlers/tool_search.rs:194][E: codex-rs/tools/src/responses_api.rs:77][E: codex-rs/tools/src/responses_api.rs:86][E: codex-rs/tools/src/responses_api.rs:97]

如果调用被中止并走 `AbortedToolOutput`，它会对 `ToolPayload::ToolSearch` 生成一个 completed、client、空 `tools` 的 `ToolSearchOutput`，而不是普通 function output。[E: codex-rs/core/src/tools/context.rs:281][E: codex-rs/core/src/tools/context.rs:282][E: codex-rs/core/src/tools/context.rs:290][E: codex-rs/core/src/tools/context.rs:294][E: codex-rs/core/src/tools/context.rs:296][E: codex-rs/core/src/tools/context.rs:298][E: codex-rs/core/src/tools/context.rs:299][E: codex-rs/core/src/tools/context.rs:300]

## 5 注册与门控

`append_tool_search_executor` 只有在 `search_tool_enabled(turn_context)` 为 true 时继续；当前 `search_tool_enabled` 要求 `turn_context.model_info.supports_search_tool` 且 provider 支持 namespace tools。[E: codex-rs/core/src/tools/spec_plan.rs:962][E: codex-rs/core/src/tools/spec_plan.rs:967][E: codex-rs/core/src/tools/spec_plan.rs:333][E: codex-rs/core/src/tools/spec_plan.rs:334][E: codex-rs/core/src/tools/spec_plan.rs:344][E: codex-rs/core/src/tools/spec_plan.rs:345]

它只收集 exposure 为 `Deferred` 的 runtimes，并且只有 `search_infos` 非空才通过 `ToolSearchHandlerCache::get_or_build(search_infos)` 加入 planned tools。[E: codex-rs/core/src/tools/spec_plan.rs:971][E: codex-rs/core/src/tools/spec_plan.rs:974][E: codex-rs/core/src/tools/spec_plan.rs:975][E: codex-rs/core/src/tools/spec_plan.rs:977][E: codex-rs/core/src/tools/spec_plan.rs:947][E: codex-rs/core/src/tools/spec_plan.rs:993]

同一 planner 会把所有 runtime 放进 registry，但只有 `exposure.is_direct()` 的 runtime 才进入初始 model-visible specs；model-visible namespace specs 还要求 provider 支持 namespace tools。[E: codex-rs/core/src/tools/spec_plan.rs:254][E: codex-rs/core/src/tools/spec_plan.rs:258][E: codex-rs/core/src/tools/spec_plan.rs:259][E: codex-rs/core/src/tools/spec_plan.rs:261][E: codex-rs/core/src/tools/spec_plan.rs:272][E: codex-rs/core/src/tools/spec_plan.rs:273][E: codex-rs/core/src/tools/spec_plan.rs:275][E: codex-rs/core/src/tools/spec_plan.rs:276][E: codex-rs/tools/src/tool_executor.rs:38][E: codex-rs/tools/src/tool_executor.rs:40]

当 search + namespace gates 开启且已有 deferred runtime 时，planner 还会提前保留 `tool_search` 这个名字，避免后续 extension tool 与发现工具冲突。[E: codex-rs/core/src/tools/spec_plan.rs:1024][E: codex-rs/core/src/tools/spec_plan.rs:1028][E: codex-rs/core/src/tools/spec_plan.rs:1030]

`DeferredToolWorldState` 是相邻但不同的提示面：开启时，每个 step 把当前 deferred namespace 及其 description 首行快照为 `<tools>` section，并在后续只渲染 added/removed diff。description 上限 250 chars，整段上限 4 KiB；它只帮助模型知道可搜索的 namespace，并不等价于 `tool_search` 已加载具体 tool spec。[E: codex-rs/core/src/session/world_state.rs:109][E: codex-rs/core/src/session/world_state.rs:114][E: codex-rs/core/src/context/world_state/tools.rs:11][E: codex-rs/core/src/context/world_state/tools.rs:22][E: codex-rs/core/src/context/world_state/tools.rs:42][E: codex-rs/core/src/context/world_state/tools.rs:70][E: codex-rs/core/src/context/world_state/tools.rs:77]

## 6 搜索索引与结果

`ToolSearchHandler::new` 用每个 `search_info.entry.search_text` 构造 BM25 documents，并把 source info 传给 `create_tool_search_tool` 生成描述。[E: codex-rs/core/src/tools/handlers/tool_search.rs:76][E: codex-rs/core/src/tools/handlers/tool_search.rs:86][E: codex-rs/core/src/tools/handlers/tool_search.rs:79][E: codex-rs/core/src/tools/handlers/tool_search.rs:95][E: codex-rs/core/src/tools/handlers/tool_search.rs:97][E: codex-rs/core/src/tools/handlers/tool_search.rs:99][E: codex-rs/core/src/tools/handlers/tool_search.rs:102]

`ToolSearchInfo::from_tool_spec` / `from_spec` 会把 Function 和 Namespace 转成 loadable outputs，并为 deferred 结果设置 `defer_loading: Some(true)`、清空 `output_schema`；ToolSearch、WebSearch、Freeform 不会生成 search info。旧 hosted ImageGeneration 变体已经不在 `ToolSpec` match 中。[E: codex-rs/tools/src/tool_search.rs:21][E: codex-rs/tools/src/tool_search.rs:22][E: codex-rs/tools/src/tool_search.rs:35][E: codex-rs/tools/src/tool_search.rs:37][E: codex-rs/tools/src/tool_search.rs:38][E: codex-rs/tools/src/tool_search.rs:47][E: codex-rs/tools/src/tool_search.rs:48][E: codex-rs/tools/src/tool_search.rs:52]

handle 时，handler 搜索 BM25 `search_engine.search(query, limit)`，按 result document id 回取 `search_infos`，再把 entry output coalesce 成返回工具列表。[E: codex-rs/core/src/tools/handlers/tool_search.rs:165][E: codex-rs/core/src/tools/handlers/tool_search.rs:179][E: codex-rs/core/src/tools/handlers/tool_search.rs:181][E: codex-rs/core/src/tools/handlers/tool_search.rs:183][E: codex-rs/core/src/tools/handlers/tool_search.rs:184][E: codex-rs/core/src/tools/handlers/tool_search.rs:186][E: codex-rs/core/src/tools/handlers/tool_search.rs:193][E: codex-rs/core/src/tools/handlers/tool_search.rs:194]

## 7 parallel support

`ToolSearchHandler::supports_parallel_tool_calls()` 显式返回 true。[E: codex-rs/core/src/tools/handlers/tool_search.rs:122][E: codex-rs/core/src/tools/handlers/tool_search.rs:123]

## 8 handler 走读

1. router 解析 Responses `ToolSearchCall`，将 JSON arguments 反序列化为 `SearchToolCallParams`。[E: codex-rs/core/src/tools/router.rs:144][E: codex-rs/core/src/tools/router.rs:150][E: codex-rs/core/src/tools/router.rs:151]
2. handler 只接受 `ToolPayload::ToolSearch`，收到其它 payload 是 fatal unsupported payload。[E: codex-rs/core/src/tools/handlers/tool_search.rs:138][E: codex-rs/core/src/tools/handlers/tool_search.rs:139][E: codex-rs/core/src/tools/handlers/tool_search.rs:141][E: codex-rs/core/src/tools/handlers/tool_search.rs:142]
3. 空 query 和 `limit == 0` 会返回给模型的错误；空 search index 会成功返回空 tools。[E: codex-rs/core/src/tools/handlers/tool_search.rs:147][E: codex-rs/core/src/tools/handlers/tool_search.rs:148][E: codex-rs/core/src/tools/handlers/tool_search.rs:155][E: codex-rs/core/src/tools/handlers/tool_search.rs:161][E: codex-rs/core/src/tools/handlers/tool_search.rs:162]
4. 非空索引则执行 BM25 search 并返回 `ToolSearchOutput { tools }`。[E: codex-rs/core/src/tools/handlers/tool_search.rs:165][E: codex-rs/core/src/tools/handlers/tool_search.rs:167][E: codex-rs/core/src/tools/handlers/tool_search.rs:179][E: codex-rs/core/src/tools/handlers/tool_search.rs:181]

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
- `codex-rs/core/src/context/world_state/tools.rs`
- `codex-rs/core/src/session/world_state.rs`
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
