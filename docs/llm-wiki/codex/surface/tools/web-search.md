---
id: tool.web-search
title: web_search 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/hosted_spec.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/model-provider/src/provider.rs, codex-rs/core/src/event_mapping.rs, codex-rs/core/src/stream_events_utils.rs, codex-rs/ext/web-search/src/tool.rs, codex-rs/ext/items/src/web_search.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/items.rs, codex-rs/features/src/lib.rs]
symbols: [ToolSpec::WebSearch, WebSearchToolOptions, create_web_search_tool, hosted_model_tool_specs, standalone_web_search_enabled, WebSearchMode, WebSearchToolType, WebSearchItem, WebSearchEndEvent]
related: [spine.extension-system, tool.tool-search, tool.image-generation, subsys.providers.responses-api, subsys.core.tool-system, subsys.config-auth.features-system]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `web_search` 是 Codex 发送给模型/provider 的 hosted Responses tool spec；当前源码把 hosted specs 保存在 registry 之外，并在构造 model-visible spec 列表时直接追加，而不是为 `web_search` 建本地 `ToolExecutor` runtime。[E: codex-rs/core/src/tools/spec_plan.rs:166][E: codex-rs/core/src/tools/spec_plan.rs:514][E: codex-rs/core/src/tools/spec_plan.rs:549]

## 能回答的问题

- `web_search` 现在从哪些文件生成 spec？
- hosted `web_search` 与 extension-backed standalone `web.run` 如何互斥？
- `Cached`、`Indexed`、`Live`、`Disabled` 如何映射到 Responses API tool 字段？
- `filters`、`user_location`、`search_context_size`、`search_content_types` 从哪里来？
- provider 返回的 `web_search_call` 如何进入 Codex turn/event 表面？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `web_search` | serde rename 与 `ToolSpec::name()` 对该变体都返回 `web_search`。[E: codex-rs/tools/src/tool_spec.rs:39][E: codex-rs/tools/src/tool_spec.rs:64] |
| ToolSpec 类型 | hosted `ToolSpec::WebSearch` | 该变体含 `external_web_access`、`indexed_web_access`、`filters`、`user_location`、`search_context_size`、`search_content_types` 字段。[E: codex-rs/tools/src/tool_spec.rs:40][E: codex-rs/core/src/tools/hosted_spec.rs:32][E: codex-rs/core/src/tools/hosted_spec.rs:34] |
| 创建函数 | `create_web_search_tool(WebSearchToolOptions)` | `WebSearchToolOptions` 携带 mode/config/tool type；创建函数返回 `Option<ToolSpec>`。[E: codex-rs/core/src/tools/hosted_spec.rs:8][E: codex-rs/core/src/tools/hosted_spec.rs:14] |
| 本地 handler | 无本地 Function handler | `hosted_model_tool_specs` 生成独立 `Vec<ToolSpec>`；该列表与 runtime registry 分开传给 finalizer，随后由 `specs.extend(hosted_specs)` 追加。[E: codex-rs/core/src/tools/spec_plan.rs:166][E: codex-rs/core/src/tools/spec_plan.rs:514][E: codex-rs/core/src/tools/spec_plan.rs:549] |
| response item | `ResponseItem::WebSearchCall` | protocol model 定义 `WebSearchCall { id, status, action, internal_chat_message_metadata_passthrough }`。[E: codex-rs/protocol/src/models.rs:1018][E: codex-rs/protocol/src/models.rs:1021][E: codex-rs/protocol/src/models.rs:1027][E: codex-rs/protocol/src/models.rs:1030] |

## 2 注册与门控

`build_tool_router` 在注册 core、MCP、extension、dynamic runtimes 后，调用 `hosted_model_tool_specs(turn_context, standalone_web_search_tool.as_slice())` 得到独立 hosted spec 列表；finalize 时这些 specs 追加到 model-visible surface，但不进入 registry、也不产生本地 runtime。[E: codex-rs/core/src/tools/spec_plan.rs:160][E: codex-rs/core/src/tools/spec_plan.rs:165][E: codex-rs/core/src/tools/spec_plan.rs:166][E: codex-rs/core/src/tools/spec_plan.rs:514]

Hosted `web_search` 的核心 gate 是：

| 条件 | 结果 | 证据 |
|---|---|---|
| Responses Lite 或 Guardian reviewer | 不发 hosted specs | `hosted_model_tool_specs` 在 `use_responses_lite` 或 guardian reviewer source 时直接返回空 vec。[E: codex-rs/core/src/tools/spec_plan.rs:554][E: codex-rs/core/src/tools/spec_plan.rs:557] |
| standalone `web.run` 已可用 | 不发 hosted `web_search` | standalone 可用要求 `standalone_web_search_enabled` 且 extension executor 名为 `web.run`；随后 `web_search_mode` 只在 standalone 不可用且 provider 支持 web search 时取配置值。[E: codex-rs/core/src/tools/spec_plan.rs:561][E: codex-rs/core/src/tools/spec_plan.rs:565] |
| provider 不支持 web search | 不发 hosted `web_search` | `web_search_mode` 的 `.then_some(...)` 同时要求 `turn_context.provider.capabilities().web_search`。[E: codex-rs/core/src/tools/spec_plan.rs:566][E: codex-rs/model-provider/src/provider.rs:50] |
| mode 为 Disabled 或 None | `create_web_search_tool` 返回 `None` | mode match 中 `Disabled`/`None` 直接返回 `None`。[E: codex-rs/core/src/tools/hosted_spec.rs:19] |

Standalone web search 由 namespace tools 加 `use_responses_lite` 或 `Feature::StandaloneWebSearch` 开启；extension tool 发布阶段还会在 standalone 未开启或 web search mode 为 disabled 时跳过 `web.run`。[E: codex-rs/core/src/tools/spec_plan.rs:939][E: codex-rs/core/src/tools/spec_plan.rs:942][E: codex-rs/core/src/tools/spec_plan.rs:1277][E: codex-rs/core/src/tools/spec_plan.rs:1284]
`Feature::StandaloneWebSearch` 的 key 是 `standalone_web_search`，stage 仍是 UnderDevelopment，默认关闭。[E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:935][E: codex-rs/features/src/lib.rs:936][E: codex-rs/features/src/lib.rs:937]

## 3 Tool Spec 字段

| 字段 | 来源 | 说明 |
|---|---|---|
| `external_web_access` / `indexed_web_access` | `WebSearchMode` | `Cached` -> `(false, None)`，`Indexed` -> `(true, Some(true))`，`Live` -> `(true, None)`，`Disabled`/`None` -> 不生成 tool。[E: codex-rs/core/src/tools/hosted_spec.rs:16][E: codex-rs/core/src/tools/hosted_spec.rs:17][E: codex-rs/core/src/tools/hosted_spec.rs:18][E: codex-rs/core/src/tools/hosted_spec.rs:19] |
| `filters` | `WebSearchConfig.filters` | 通过 `Into` 转成 Responses API filters。[E: codex-rs/core/src/tools/hosted_spec.rs:35][E: codex-rs/protocol/src/config_types.rs:475] |
| `user_location` | `WebSearchConfig.user_location` | location 包括 `type/country/region/city/timezone`，`type` 默认 `Approximate`。[E: codex-rs/core/src/tools/hosted_spec.rs:38][E: codex-rs/protocol/src/config_types.rs:476][E: codex-rs/protocol/src/config_types.rs:483] |
| `search_context_size` | `WebSearchConfig.search_context_size` | 来自 config 的 context size 字段。[E: codex-rs/core/src/tools/hosted_spec.rs:41][E: codex-rs/protocol/src/config_types.rs:477] |
| `search_content_types` | `ModelInfo.web_search_tool_type` | `Text` 不填；`TextAndImage` 填 `["text", "image"]`。[E: codex-rs/core/src/tools/hosted_spec.rs:22][E: codex-rs/protocol/src/openai_models.rs:311][E: codex-rs/protocol/src/openai_models.rs:314] |

## 4 Runtime 与事件

Provider 返回 hosted `ResponseItem::WebSearchCall` 后，`parse_turn_item` 将它转换为 `TurnItem::WebSearch(WebSearchItem { id, query, action, results: None })`；没有 `action` 时 action 为 `Other`、query 为空字符串。standalone web-search extension 会在自己的 completed item 中填入结果。[E: codex-rs/core/src/event_mapping.rs:224][E: codex-rs/core/src/event_mapping.rs:227][E: codex-rs/core/src/event_mapping.rs:229][E: codex-rs/protocol/src/items.rs:322][E: codex-rs/ext/web-search/src/tool.rs:166][E: codex-rs/ext/web-search/src/tool.rs:170]

legacy event 表面仍有 `WebSearchBegin` 与 `WebSearchEnd`：begin event 只携带 `call_id`，end event 携带 `call_id/query/action` 与 optional `results`；standalone extension 会把 structured results 同步写入 completed item 和 end event。[E: codex-rs/protocol/src/protocol.rs:1384][E: codex-rs/protocol/src/protocol.rs:1386][E: codex-rs/protocol/src/protocol.rs:2522][E: codex-rs/protocol/src/protocol.rs:2527][E: codex-rs/ext/web-search/src/tool.rs:172][E: codex-rs/ext/web-search/src/tool.rs:176]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/hosted_spec.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/model-provider/src/provider.rs`
- `codex-rs/core/src/event_mapping.rs`
- `codex-rs/core/src/stream_events_utils.rs`
- `codex-rs/ext/web-search/src/tool.rs`
- `codex-rs/ext/items/src/web_search.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/items.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [image_generation 工具](image-generation.md)
- [Ext 扩展插件系统](../../spine/extension-system.md)
- [Responses API](../../subsystems/providers/responses-api.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
