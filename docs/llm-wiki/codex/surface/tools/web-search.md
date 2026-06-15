---
id: tool.web-search
title: web_search 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/config/mod.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/stream_events_utils.rs, codex-rs/tools/src/tool_discovery.rs, codex-rs/core/src/tools/spec.rs]
symbols: [ToolSpec::WebSearch, create_web_search_tool, WebSearchToolOptions, WebSearchMode, WebSearchToolType, WebSearchConfig]
related: [tool.tool-search, tool.local-shell, subsys.providers.responses-api, subsys.core.tool-system, subsys.config-auth.features-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `web_search` 是 Codex 传给 OpenAI Responses API 的 built-in ToolSpec；Codex 在本地 registry 中只 push `ToolSpec::WebSearch`，没有在该 block 为 `web_search` 注册 `ToolHandlerKind`，因此搜索执行由模型/provider 侧处理而不是本地 Function handler 处理。[E: codex-rs/tools/src/tool_spec.rs:44][E: codex-rs/tools/src/tool_registry_plan.rs:366][E: codex-rs/tools/src/tool_registry_plan.rs:370][I]

## 能回答的问题

- `web_search` 为什么是 `ToolSpec::WebSearch` built-in，而不是普通 Function？
- `external_web_access`、`filters`、`user_location`、`search_context_size`、`search_content_types` 从哪里来？
- `Cached`、`Live`、`Disabled` 三种 `WebSearchMode` 如何映射到 Responses API tool spec？
- `web_search` 为什么没有本地 `ToolHandlerKind`？
- `web_search` 与 `tool_search` 的边界是什么？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `web_search` | `ToolSpec::WebSearch` 的 serde rename 是 `web_search`，`ToolSpec::name()` 对该变体返回 `web_search`。[E: codex-rs/tools/src/tool_spec.rs:43][E: codex-rs/tools/src/tool_spec.rs:68] |
| aliases | 无本地 alias。 | `build_tool_registry_plan` 只 push `web_search_tool`，该 block 没有 `plan.register_handler(...)` 调用。[E: codex-rs/tools/src/tool_registry_plan.rs:366][E: codex-rs/tools/src/tool_registry_plan.rs:370][I] |
| ToolSpec 类型 | `ToolSpec::WebSearch` built-in | `ToolSpec` enum 明确定义 `WebSearch { external_web_access, filters, user_location, search_context_size, search_content_types }`。[E: codex-rs/tools/src/tool_spec.rs:44][E: codex-rs/tools/src/tool_spec.rs:54] |
| ToolHandlerKind | 无本地 handler kind | `web_search` registry block push spec 后结束，没有注册 handler；Codex 本地 tools build 只遍历 `plan.handlers` 注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:366][E: codex-rs/tools/src/tool_registry_plan.rs:370][E: codex-rs/core/src/tools/spec.rs:189][I] |
| core handler | 无 Function handler | Codex protocol 定义 `WebSearchBegin`/`WebSearchEnd` events，end event 字段是 `call_id/query/action`；这些事件来自 provider/model 流式响应路径。[E: codex-rs/protocol/src/protocol.rs:1514][E: codex-rs/protocol/src/protocol.rs:2492][E: codex-rs/protocol/src/protocol.rs:2494][I] |
| 所属 crate | ToolSpec 在 `codex-tools`，模式/配置在 `codex-protocol` 与 `codex-core` config。 | `WebSearchMode` 在 protocol config types 中定义，`create_web_search_tool` 在 `tool_spec.rs` 中消费它。[E: codex-rs/protocol/src/config_types.rs:128][E: codex-rs/tools/src/tool_spec.rs:99] |

## 2 用途定位

`web_search` 让模型通过 Responses API built-in web search capability 获取 cached 或 live web content；Codex 的本地代码负责把配置序列化成 tool spec，而不是自己发起网页检索。[E: codex-rs/tools/src/tool_spec.rs:99][E: codex-rs/tools/src/tool_registry_plan.rs:361][I]  
`ToolSpec::WebSearch` 的源码注释说明 `external_web_access` 字段决定 web search 使用 cached 还是 live content。[E: codex-rs/tools/src/tool_spec.rs:40]  
`tool_search` 是搜索 deferred tool metadata 的 Codex 工具，`web_search` 是 Responses API 的 web 检索 built-in；二者名称相近但功能面完全不同。[E: codex-rs/tools/src/tool_discovery.rs:191][E: codex-rs/tools/src/tool_spec.rs:44]

## 3 输入 schema 表

`web_search` 没有 Codex Function-style JSON input schema；模型侧调用 built-in tool 时产生 `WebSearchCall` response item，Codex 不解析 JSON arguments。[E: codex-rs/core/src/stream_events_utils.rs:359][E: codex-rs/core/src/stream_events_utils.rs:423][I]  
以下表格描述 Codex 发送给 Responses API 的 tool spec 字段，而不是模型传给本地 handler 的参数。

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `external_web_access` | boolean | 是，启用时存在 | `Cached` -> `false`；`Live` -> `true` | 控制 cached/live web access。 | `Disabled` 或 `None` 会让 `create_web_search_tool` 通过 `?` 返回 `None`，因此不暴露工具。[E: codex-rs/tools/src/tool_spec.rs:101][E: codex-rs/tools/src/tool_spec.rs:104] |
| `filters` | object / null | 否 | `None` | 来自 `WebSearchConfig.filters`。 | `ResponsesApiWebSearchFilters` 当前只序列化 `allowed_domains`。[E: codex-rs/tools/src/tool_spec.rs:118][E: codex-rs/tools/src/tool_spec.rs:169] |
| `user_location` | object / null | 否 | `None` | 来自 `WebSearchConfig.user_location`。 | location 字段包括 `type/country/region/city/timezone`，`type` 默认是 `Approximate`。[E: codex-rs/tools/src/tool_spec.rs:123][E: codex-rs/protocol/src/config_types.rs:210][E: codex-rs/protocol/src/config_types.rs:214] |
| `search_context_size` | `Low` / `Medium` / `High` | 否 | `None` | 控制 web search context size。 | Rust enum 是 `WebSearchContextSize`，可取 `Low/Medium/High`。[E: codex-rs/tools/src/tool_spec.rs:126][E: codex-rs/protocol/src/config_types.rs:138] |
| `search_content_types` | string array / null | 否 | `None` | 当模型 metadata 声明 text+image web search 时传 `["text","image"]`。 | `WebSearchToolType::Text` 映射为 `None`，`TextAndImage` 映射为常量数组。[E: codex-rs/tools/src/tool_spec.rs:16][E: codex-rs/tools/src/tool_spec.rs:107][E: codex-rs/tools/src/tool_spec.rs:113] |

`WebSearchToolOptions` 明确包含 `web_search_mode`、`web_search_config` 和 `web_search_tool_type` 三个输入来源。[E: codex-rs/tools/src/tool_spec.rs:94][E: codex-rs/tools/src/tool_spec.rs:96]

## 4 输出 schema & 截断

`web_search` 没有 Function output schema；Codex protocol 为 UI/telemetry 定义 `WebSearchBeginEvent { call_id }` 与 `WebSearchEndEvent { call_id, query, action }`。[E: codex-rs/protocol/src/protocol.rs:2485][E: codex-rs/protocol/src/protocol.rs:2494]  
`EventMsg` 中对应事件名是 `WebSearchBegin` 和 `WebSearchEnd`。[E: codex-rs/protocol/src/protocol.rs:1514][E: codex-rs/protocol/src/protocol.rs:1516]  
stream utils 把 `ResponseItem::WebSearchCall` 归入 non-tool response item 解析路径，而不是 `FunctionCallOutput`、`CustomToolCallOutput` 或 `ToolSearchOutput` 路径。[E: codex-rs/core/src/stream_events_utils.rs:359][E: codex-rs/core/src/stream_events_utils.rs:423][E: codex-rs/core/src/stream_events_utils.rs:425]  
源码中没有为 `web_search` 定义本地输出截断逻辑；输出内容由 provider/model 侧以 response item 形式进入 Codex 流式处理。[E: codex-rs/core/src/stream_events_utils.rs:348][E: codex-rs/core/src/stream_events_utils.rs:421][I]

## 5 ToolSpec 类型

`web_search` 使用专门的 `ToolSpec::WebSearch` 变体，而不是 `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/tool_spec.rs:24][E: codex-rs/tools/src/tool_spec.rs:44]  
`ToolSpec` enum 使用 `#[serde(tag = "type")]`，所以该变体序列化时会带 `type: "web_search"`。[E: codex-rs/tools/src/tool_spec.rs:21][E: codex-rs/tools/src/tool_spec.rs:43]  
源码注释记录了 Responses API web search 兼容性 TODO，并说明 `external_web_access` 负责 cached/live 选择；这表明该变体是在适配 OpenAI built-in web search tool，而不是 Codex 自有 function schema。[E: codex-rs/tools/src/tool_spec.rs:37][E: codex-rs/tools/src/tool_spec.rs:40][I]

## 6 注册与门控

`build_tool_registry_plan` 调用 `create_web_search_tool(WebSearchToolOptions { web_search_mode, web_search_config, web_search_tool_type })`，只有返回 `Some` 时才 push spec。[E: codex-rs/tools/src/tool_registry_plan.rs:361][E: codex-rs/tools/src/tool_registry_plan.rs:366]  
`create_web_search_tool` 对 `Some(WebSearchMode::Disabled)` 和 `None` 返回 `None`，因此 disabled/缺省到 disabled 时不会暴露 `web_search`。[E: codex-rs/tools/src/tool_spec.rs:100][E: codex-rs/tools/src/tool_spec.rs:104]  
`ToolsConfig::new` 把 per-turn 的 `web_search_mode` 写入 `ToolsConfig.web_search_mode`，并从 `ModelInfo.web_search_tool_type` 写入 `web_search_tool_type`。[E: codex-rs/tools/src/tool_config.rs:213][E: codex-rs/tools/src/tool_config.rs:215]  
`TurnContext::new` 在构造 `ToolsConfigParams` 时传入 `per_turn_config.web_search_mode.value()`，再通过 `with_web_search_config` 附加 web search 配置。[E: codex-rs/core/src/session/turn_context.rs:398][E: codex-rs/core/src/session/turn_context.rs:408]  
配置解析中，显式 profile/config 的 `web_search` 优先；否则 `Feature::WebSearchCached` 使默认模式为 `Cached`，`Feature::WebSearchRequest` 使默认模式为 `Live`。[E: codex-rs/core/src/config/mod.rs:1436][E: codex-rs/core/src/config/mod.rs:1443]

## 7 parallel-safe

`web_search` 的 `supports_parallel_tool_calls` 实际值是 `false`。[E: codex-rs/tools/src/tool_registry_plan.rs:366][E: codex-rs/tools/src/tool_registry_plan.rs:368]  
由于 `web_search` 没有本地 handler，`supports_parallel_tool_calls: false` 主要影响请求给模型的 parallel tool calling capability，而不是 Codex 本地调度互斥。[E: codex-rs/tools/src/tool_registry_plan.rs:366][E: codex-rs/core/src/tools/spec.rs:180][E: codex-rs/core/src/tools/spec.rs:185][I]

## 8 handler 走读

1. session/turn 构造时，core 把 resolved `web_search_mode`、模型的 `web_search_tool_type` 和可选 `web_search_config` 写进 `ToolsConfig`。[E: codex-rs/core/src/session/turn_context.rs:398][E: codex-rs/tools/src/tool_config.rs:213]
2. `build_tool_registry_plan` 用这些值调用 `create_web_search_tool`。[E: codex-rs/tools/src/tool_registry_plan.rs:361][E: codex-rs/tools/src/tool_registry_plan.rs:365]
3. `create_web_search_tool` 把 `Cached` 转成 `external_web_access: false`，把 `Live` 转成 `external_web_access: true`，把 disabled/none 变成 `None`。[E: codex-rs/tools/src/tool_spec.rs:101][E: codex-rs/tools/src/tool_spec.rs:104]
4. `create_web_search_tool` 根据 `WebSearchToolType` 决定是否加入 `search_content_types: ["text","image"]`。[E: codex-rs/tools/src/tool_spec.rs:107][E: codex-rs/tools/src/tool_spec.rs:113]
5. `create_web_search_tool` 从 `WebSearchConfig` 复制 filters、user location 和 search context size。[E: codex-rs/tools/src/tool_spec.rs:118][E: codex-rs/tools/src/tool_spec.rs:126]
6. registry push `ToolSpec::WebSearch`，但该 block 不注册 handler；core 后续只会注册 `plan.handlers` 中存在的 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:366][E: codex-rs/tools/src/tool_registry_plan.rs:370][E: codex-rs/core/src/tools/spec.rs:189]
7. provider/model 流式返回 web search call 时，Codex 把 `ResponseItem::WebSearchCall` 当作 non-tool response item 解析，并通过 protocol event surfaces 展示 begin/end。[E: codex-rs/core/src/stream_events_utils.rs:359][E: codex-rs/core/src/stream_events_utils.rs:361][E: codex-rs/protocol/src/protocol.rs:1514]

## 9 设计动机·edge·历史

把 `web_search` 建成 built-in `ToolSpec` 可以让 Codex 直接使用 Responses API 的 web search 能力，而无需把查询、抓取和结果格式做成本地 Function contract。[E: codex-rs/tools/src/tool_spec.rs:44][E: codex-rs/tools/src/tool_registry_plan.rs:361][I]  
`resolve_web_search_mode_for_turn` 在 `DangerFullAccess` sandbox 且 preferred 不是 disabled 时优先尝试 `Live`，否则按 preferred、cached、live、disabled 的顺序选择可用模式。[E: codex-rs/core/src/config/mod.rs:1511][E: codex-rs/core/src/config/mod.rs:1538]  
`WebSearchToolType` 由模型 metadata 提供，默认是 `Text`，只有 `TextAndImage` 才会把 image content type 暴露给 built-in tool。[E: codex-rs/protocol/src/openai_models.rs:202][E: codex-rs/protocol/src/openai_models.rs:273][E: codex-rs/tools/src/tool_spec.rs:107]  
`web_search` 与 `tool_search` 共享 “search” 命名但 registry gate 完全不同：`tool_search` 受 `model_info.supports_search_tool && Feature::ToolSearch` 和 deferred tools 存在性控制，`web_search` 受 `WebSearchMode` 是否能生成 built-in ToolSpec 控制。[E: codex-rs/tools/src/tool_config.rs:151][E: codex-rs/tools/src/tool_registry_plan.rs:263][E: codex-rs/tools/src/tool_spec.rs:99]

## Sources

- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/core/src/stream_events_utils.rs`
- `codex-rs/tools/src/tool_discovery.rs`
- `codex-rs/core/src/tools/spec.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [local_shell 工具](local-shell.md)
- [Responses API](../../subsystems/providers/responses-api.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Feature 系统](../../subsystems/config-auth/features-system.md)
