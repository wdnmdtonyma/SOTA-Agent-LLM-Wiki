---
id: tool.request-plugin-install
title: request_plugin_install 工具
kind: tool
tier: T1
source: [codex-rs/core/src/session/turn.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/request_plugin_install.rs, codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/tools/src/request_plugin_install.rs, codex-rs/tools/src/tool_discovery.rs]
symbols: [RequestPluginInstallHandler, create_request_plugin_install_tool, RequestPluginInstallArgs, RequestPluginInstallResult, ToolSuggestPresentation]
related: [tool.list-available-plugins-to-install, tool.tool-search, subsys.config-auth.plugins, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `request_plugin_install` 向用户发起 plugin/connector 安装确认;用户接受后,connector 会走 accessible connector 刷新验证,remote marketplace plugin 会刷新远程插件缓存并核对关联 connectors,非远程 plugin 会 reload config 后用 plugin manager 验证。

## 能回答的问题

- `request_plugin_install` 的两个 presentation mode 有什么输入差异?
- 什么时候会出现 `request_plugin_install`?
- 为什么 `request_plugin_install` 要求不要并行调用?
- 用户拒绝且选择 always 时会持久化什么?
- 安装请求会发出哪些 analytics / telemetry?

## 1 Identity

wire name 常量是 `REQUEST_PLUGIN_INSTALL_TOOL_NAME`,值为 `request_plugin_install`;handler 是 `RequestPluginInstallHandler`。[E: codex-rs/tools/src/tool_discovery.rs:9] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:55]

handler 的 `tool_name()` 返回该常量,`spec()` 根据 `ToolSuggestPresentation` 调用 `create_request_plugin_install_tool`。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:74] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:78]

## 2 用途定位

`ListTool` presentation 的描述要求只能在 `list_available_plugins_to_install` 返回完全匹配的候选后使用,并要求原样传递 `tool_type` 和 `id`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:48]

`RecommendationContext` presentation 使用 `<recommended_plugins>` 里括号内的 `plugin_id` 和 `suggest_reason`。它的 model 描述现在要求三个条件同时成立：用户明确要求特定但未可用的 plugin，tool search 已经耗尽，且 plugin 在推荐列表中；并禁止用于邻近能力或广泛推荐。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:56] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:68] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:69]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `tool_type` | string | ListTool 是 | 无 | discoverable tool 类型,文案要求用 `connector` 或 `plugin`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:48] |
| `action_type` | string | ListTool 是 | 无 | 当前只支持 `install`;handler 对其它 action 返回错误。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:117] |
| `tool_id` | string | ListTool 是 | 无 | connector 或 plugin id;必须匹配可发现候选。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:153] |
| `plugin_id` | string | RecommendationContext 是 | 无 | `<recommended_plugins>` 中的 plugin id;runtime 也接受 `tool_id` 作为 serde alias。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:56] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:50] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:51] |
| `suggest_reason` | string | 是 | 无 | 给用户看的简短原因;handler trim 后不允许为空。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:63] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:130] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:131] |

ListTool 的 data type 是 `RequestPluginInstallArgs { tool_type, action_type, tool_id, suggest_reason }`。[E: codex-rs/tools/src/request_plugin_install.rs:16] [E: codex-rs/tools/src/request_plugin_install.rs:17] [E: codex-rs/tools/src/request_plugin_install.rs:18] [E: codex-rs/tools/src/request_plugin_install.rs:19] [E: codex-rs/tools/src/request_plugin_install.rs:20]

## 4 输出 schema & 截断

`request_plugin_install` 没有 structured output schema,handler 返回 JSON 文本序列化的 `RequestPluginInstallResult`,字段包含 `completed`、`user_confirmed`、`tool_type`、`action_type`、`tool_id`、`tool_name`、`suggest_reason`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:79] [E: codex-rs/tools/src/request_plugin_install.rs:24] [E: codex-rs/tools/src/request_plugin_install.rs:31] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:267]

## 5 ToolSpec 类型

`request_plugin_install` 是 `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:73]

## 6 注册与门控

`tool_suggest_enabled` 要求 `Feature::ToolSuggest`、`Feature::Apps`、`Feature::Plugins` 全部开启。[E: codex-rs/core/src/tools/spec_plan.rs:585] [E: codex-rs/core/src/tools/spec_plan.rs:587] [E: codex-rs/core/src/tools/spec_plan.rs:589]

`add_core_utility_tools` 要求存在非空 tool suggest candidates,并会注册 `RequestPluginInstallHandler`;只有 `ListTool` presentation 才额外注册 `list_available_plugins_to_install`。[E: codex-rs/core/src/tools/spec_plan.rs:1085] [E: codex-rs/core/src/tools/spec_plan.rs:1089] [E: codex-rs/core/src/tools/spec_plan.rs:1095]

presentation 由 turn preparation 决定：endpoint 返回 recommended plugin candidates 时直接使用 `RecommendationContext`，不会注册 legacy list tool；没有 endpoint candidates 才构造传统 discoverable set 与 `ListTool` presentation。[E: codex-rs/core/src/session/turn.rs:1495][E: codex-rs/core/src/session/turn.rs:1499][E: codex-rs/core/src/session/turn.rs:1527]

spec tests 证明即使 `tool_search` 不可见,`request_plugin_install` 仍可见,因为安装请求工具不依赖 search tool capability。[E: codex-rs/core/src/tools/spec_plan_tests.rs:1998] [E: codex-rs/core/src/tools/spec_plan_tests.rs:2001] [E: codex-rs/core/src/tools/spec_plan_tests.rs:2016]

## 7 parallel-safe

`RequestPluginInstallHandler::supports_parallel_tool_calls()` 现在显式返回 false；ListTool 和 RecommendationContext 两种 model 描述也都明确禁止与其他工具并行，runtime 与协议提示已对齐。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:81] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:82] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:48] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:69]

## 8 handler 走读

handler 解析 presentation-specific 参数,拒绝非 `install` action 和空 `suggest_reason`,在 codex-tui 客户端拒绝 plugin 安装请求,再从可发现候选中精确匹配请求的 tool。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:114] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:117] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:130] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:138] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:153]

找到候选后,handler 先发 `PluginInstallRequested` analytics（plugin 候选才发；ListTool 标 `LegacyDiscovery`，RecommendationContext 标 `EndpointRecommendation`），再构造 MCP server elicitation request 等待用户响应。用户接受后调用 `verify_request_plugin_install_completed`。elicitation 一旦发出，还会写 `record_plugin_install_suggestion` session telemetry。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:184] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:186] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:193] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:200] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:216] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:233] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:257]

这些 analytics 记录的是 install-request 生命周期，不是 `core-plugins` 的 `PluginMetricsSidecar` 脚本度量。sidecar 走独立的 plugin script execution 路径，不由本工具触发。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:193][I]

如果用户 decline 且 elicitation meta 的 `persist` 是 `always`,handler 会把该 tool 写入 disabled tool suggestion 配置并 reload user config layer。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:225] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:291] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:297] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:301] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:313]

## 9 设计动机·edge·历史

`request_plugin_install` 是旧 `tool_suggest` 的执行请求面:候选枚举和安装确认被拆成两个工具,让模型先列出精确候选再请求用户确认。[I]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/session/turn.rs
- codex-rs/core/src/tools/handlers/request_plugin_install.rs
- codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs
- codex-rs/core/src/tools/spec_plan_tests.rs
- codex-rs/tools/src/request_plugin_install.rs
- codex-rs/tools/src/tool_discovery.rs

## 相关

- `tool.list-available-plugins-to-install`
- `tool.tool-search`
- `subsys.config-auth.plugins`
- `subsys.mcp.connectors`
