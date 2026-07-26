---
id: tool.web-search
title: web_search 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/hosted_spec.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/model-provider/src/provider.rs, codex-rs/core/src/event_mapping.rs, codex-rs/core/src/stream_events_utils.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/items.rs, codex-rs/features/src/lib.rs]
symbols: [ToolSpec::WebSearch, WebSearchToolOptions, create_web_search_tool, hosted_model_tool_specs, standalone_web_search_enabled, WebSearchMode, WebSearchToolType]
related: [spine.extension-system, tool.tool-search, tool.image-generation, subsys.providers.responses-api, subsys.core.tool-system, subsys.config-auth.features-system]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `web_search` 是 Codex 发送给模型/provider 的 hosted Responses tool spec；当前源码在 `spec_plan.rs` 里把 hosted specs 直接追加到 model-visible spec 列表，而不是为 `web_search` 建本地 `ToolExecutor` runtime。[E: codex-rs/core/src/tools/spec_plan.rs:133][E: codex-rs/core/src/tools/spec_plan.rs:270][E: codex-rs/core/src/tools/spec_plan.rs:272]

## 能回答的问题

- `web_search` 现在从哪些文件生成 spec？
- hosted `web_search` 与 extension-backed standalone `web.run` 如何互斥？
- `Cached`、`Indexed`、`Live`、`Disabled` 如何映射到 Responses API tool 字段？
- `filters`、`user_location`、`search_context_size`、`search_content_types` 从哪里来？
- provider 返回的 `web_search_call` 如何进入 Codex turn/event 表面？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `web_search` | `ToolSpec::WebSearch` 使用 serde rename `web_search`，`ToolSpec::name()` 对该变体返回 `web_search`。[E: codex-rs/tools/src/tool_spec.rs:36][E: codex-rs/tools/src/tool_spec.rs:61] |
| ToolSpec 类型 | hosted `ToolSpec::WebSearch` | 该变体含 `external_web_access`、`indexed_web_access`、`filters`、`user_location`、`search_context_size`、`search_content_types` 字段。[E: codex-rs/tools/src/tool_spec.rs:36][E: codex-rs/tools/src/tool_spec.rs:39][E: codex-rs/tools/src/tool_spec.rs:41][E: codex-rs/tools/src/tool_spec.rs:49] |
| 创建函数 | `create_web_search_tool(WebSearchToolOptions)` | `WebSearchToolOptions` 携带 mode/config/tool type；创建函数返回 `Option<ToolSpec>`。[E: codex-rs/core/src/tools/hosted_spec.rs:8][E: codex-rs/core/src/tools/hosted_spec.rs:14] |
| 本地 handler | 无本地 Function handler | `hosted_specs` 由 `add_hosted_spec` 收集后直接 `specs.extend(hosted_specs)`；registry 只由 `runtimes` 构造。[E: codex-rs/core/src/tools/spec_plan.rs:133][E: codex-rs/core/src/tools/spec_plan.rs:270][E: codex-rs/core/src/tools/spec_plan.rs:272] |
| response item | `ResponseItem::WebSearchCall` | protocol model 定义 `WebSearchCall { id: Option<ResponseItemId>, status, action, internal_chat_message_metadata_passthrough }`。[E: codex-rs/protocol/src/models.rs:967][E: codex-rs/protocol/src/models.rs:970][E: codex-rs/protocol/src/models.rs:973][E: codex-rs/protocol/src/models.rs:976][E: codex-rs/protocol/src/models.rs:979] |

## 2 注册与门控

`add_tool_sources` 在 core/shell/MCP/extension/dynamic tools 之后，把 `hosted_model_tool_specs(context)` 的结果加入 `planned_tools.hosted_specs`。[E: codex-rs/core/src/tools/spec_plan.rs:608][E: codex-rs/core/src/tools/spec_plan.rs:646]

Hosted `web_search` 的核心 gate 是：

| 条件 | 结果 | 证据 |
|---|---|---|
| Responses Lite | 不发 hosted specs | `hosted_model_tool_specs` 在 `use_responses_lite` 时直接返回空 vec。[E: codex-rs/core/src/tools/spec_plan.rs:302][E: codex-rs/core/src/tools/spec_plan.rs:306] |
| standalone `web.run` 已可用 | 不发 hosted `web_search` | standalone 可用要求 `standalone_web_search_enabled` 且 extension executor 名为 `web.run`；随后 `web_search_mode` 只在 standalone 不可用且 provider 支持 web search 时取配置值。[E: codex-rs/core/src/tools/spec_plan.rs:310][E: codex-rs/core/src/tools/spec_plan.rs:319] |
| provider 不支持 web search | 不发 hosted `web_search` | `web_search_mode` 的 `.then_some(...)` 同时要求 `turn_context.provider.capabilities().web_search`。[E: codex-rs/core/src/tools/spec_plan.rs:317][E: codex-rs/model-provider/src/provider.rs:34][E: codex-rs/model-provider/src/provider.rs:37] |
| mode 为 Disabled 或 None | `create_web_search_tool` 返回 `None` | mode match 中 `Disabled`/`None` 直接返回 `None`。[E: codex-rs/core/src/tools/hosted_spec.rs:15][E: codex-rs/core/src/tools/hosted_spec.rs:19] |

Standalone web search 由 namespace tools 加 `use_responses_lite` 或 `Feature::StandaloneWebSearch` 开启；extension tool 发布阶段还会在 standalone 未开启或 web search mode 为 disabled 时跳过 `web.run`。[E: codex-rs/core/src/tools/spec_plan.rs:650][E: codex-rs/core/src/tools/spec_plan.rs:658][E: codex-rs/core/src/tools/spec_plan.rs:1033][E: codex-rs/core/src/tools/spec_plan.rs:1039]
`Feature::StandaloneWebSearch` 的 key 是 `standalone_web_search`，stage 仍是 UnderDevelopment，默认关闭。[E: codex-rs/features/src/lib.rs:129][E: codex-rs/features/src/lib.rs:935][E: codex-rs/features/src/lib.rs:937][E: codex-rs/features/src/lib.rs:938]

## 3 Tool Spec 字段

| 字段 | 来源 | 说明 |
|---|---|---|
| `external_web_access` / `indexed_web_access` | `WebSearchMode` | `Cached` -> `(false, None)`，`Indexed` -> `(true, Some(true))`，`Live` -> `(true, None)`，`Disabled`/`None` -> 不生成 tool。[E: codex-rs/core/src/tools/hosted_spec.rs:15][E: codex-rs/core/src/tools/hosted_spec.rs:16][E: codex-rs/core/src/tools/hosted_spec.rs:17][E: codex-rs/core/src/tools/hosted_spec.rs:18][E: codex-rs/core/src/tools/hosted_spec.rs:19] |
| `filters` | `WebSearchConfig.filters` | 通过 `Into` 转成 Responses API filters；config 侧当前只有 `allowed_domains`。[E: codex-rs/core/src/tools/hosted_spec.rs:32][E: codex-rs/core/src/tools/hosted_spec.rs:37][E: codex-rs/protocol/src/config_types.rs:422] |
| `user_location` | `WebSearchConfig.user_location` | location 包括 `type/country/region/city/timezone`，`type` 默认 `Approximate`。[E: codex-rs/core/src/tools/hosted_spec.rs:38][E: codex-rs/core/src/tools/hosted_spec.rs:40][E: codex-rs/protocol/src/config_types.rs:431][E: codex-rs/protocol/src/config_types.rs:433][E: codex-rs/protocol/src/config_types.rs:438][E: codex-rs/protocol/src/config_types.rs:440][E: codex-rs/protocol/src/config_types.rs:444] |
| `search_context_size` | `WebSearchConfig.search_context_size` | enum 值为 `Low/Medium/High`。[E: codex-rs/core/src/tools/hosted_spec.rs:41][E: codex-rs/core/src/tools/hosted_spec.rs:43][E: codex-rs/protocol/src/config_types.rs:357][E: codex-rs/protocol/src/config_types.rs:369][E: codex-rs/protocol/src/config_types.rs:370][E: codex-rs/protocol/src/config_types.rs:371] |
| `search_content_types` | `ModelInfo.web_search_tool_type` | `Text` 不填；`TextAndImage` 填 `["text", "image"]`。[E: codex-rs/core/src/tools/hosted_spec.rs:22][E: codex-rs/protocol/src/openai_models.rs:296][E: codex-rs/protocol/src/openai_models.rs:299] |

用户配置会先解析为 `WebSearchConfig { filters, user_location, search_context_size }`；`WebSearchToolConfig` 的 `allowed_domains/location/context_size` 分别映射到这三个字段。[E: codex-rs/protocol/src/config_types.rs:396][E: codex-rs/protocol/src/config_types.rs:399][E: codex-rs/protocol/src/config_types.rs:467][E: codex-rs/protocol/src/config_types.rs:470][E: codex-rs/protocol/src/config_types.rs:475][E: codex-rs/protocol/src/config_types.rs:476]

## 4 Runtime 与事件

Provider 返回 `ResponseItem::WebSearchCall` 后，`parse_turn_item` 将它转换为 `TurnItem::WebSearch(WebSearchItem { id, query, action })`；没有 `action` 时 action 为 `Other`、query 为空字符串。[E: codex-rs/core/src/event_mapping.rs:221][E: codex-rs/core/src/event_mapping.rs:222][E: codex-rs/core/src/event_mapping.rs:224][E: codex-rs/protocol/src/items.rs:322][E: codex-rs/protocol/src/items.rs:323][E: codex-rs/protocol/src/items.rs:325]

stream utils 把 `WebSearchCall` 视为普通 turn item 解析路径的一部分，同时把它标记为可能带外部上下文的 item，用于污染 memory mode。[E: codex-rs/core/src/stream_events_utils.rs:131][E: codex-rs/core/src/stream_events_utils.rs:422][E: codex-rs/core/src/stream_events_utils.rs:426]

legacy event 表面仍有 `WebSearchBegin` 与 `WebSearchEnd`：begin event 只携带 `call_id`，end event 携带 `call_id/query/action`。[E: codex-rs/protocol/src/protocol.rs:1375][E: codex-rs/protocol/src/protocol.rs:1377][E: codex-rs/protocol/src/protocol.rs:2498][E: codex-rs/protocol/src/protocol.rs:2503][E: codex-rs/protocol/src/protocol.rs:2506]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/hosted_spec.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/model-provider/src/provider.rs`
- `codex-rs/core/src/event_mapping.rs`
- `codex-rs/core/src/stream_events_utils.rs`
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
