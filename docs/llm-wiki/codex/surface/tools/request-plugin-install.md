---
id: tool.request-plugin-install
title: request_plugin_install 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/request_plugin_install.rs, codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/tools/src/request_plugin_install.rs, codex-rs/tools/src/tool_discovery.rs]
symbols: [RequestPluginInstallHandler, create_request_plugin_install_tool, RequestPluginInstallArgs, RequestPluginInstallResult, ToolSuggestPresentation]
related: [tool.list-available-plugins-to-install, tool.tool-search, subsys.config-auth.plugins, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: db887d03e1
---

> `request_plugin_install` 向用户发起 plugin/connector 安装确认;用户接受后,connector 会走 accessible connector 刷新验证,remote marketplace plugin 会刷新远程插件缓存并核对关联 connectors,非远程 plugin 会 reload config 后用 plugin manager 验证。

## 能回答的问题

- `request_plugin_install` 的两个 presentation mode 有什么输入差异?
- 什么时候会出现 `request_plugin_install`?
- 为什么 `request_plugin_install` 要求不要并行调用?
- 用户拒绝且选择 always 时会持久化什么?

## 1 Identity

wire name 常量是 `REQUEST_PLUGIN_INSTALL_TOOL_NAME`,值为 `request_plugin_install`;handler 是 `RequestPluginInstallHandler`。[E: codex-rs/tools/src/tool_discovery.rs:9] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:55]

handler 的 `tool_name()` 返回该常量,`spec()` 根据 `ToolSuggestPresentation` 调用 `create_request_plugin_install_tool`。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:72] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:74] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:77] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:78]

## 2 用途定位

`ListTool` presentation 的描述要求只能在 `list_available_plugins_to_install` 返回完全匹配的候选后使用,并要求原样传递 `tool_type` 和 `id`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:47] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:48]

`RecommendationContext` presentation 使用 `<recommended_plugins>` 里的 `plugin_id` 和 `suggest_reason`,用于推荐插件安装。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:51] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:54] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:60] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:67] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:68]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `tool_type` | string | ListTool 是 | 无 | discoverable tool 类型,文案要求用 `connector` 或 `plugin`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:17] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:18] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:19] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:42] |
| `action_type` | string | ListTool 是 | 无 | 当前只支持 `install`;handler 对其它 action 返回错误。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:24] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:25] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:26] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:43] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:117] |
| `tool_id` | string | ListTool 是 | 无 | connector 或 plugin id;必须匹配可发现候选。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:30] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:31] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:44] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:153] |
| `plugin_id` | string | RecommendationContext 是 | 无 | `<recommended_plugins>` 中的 plugin id;runtime 也接受 `tool_id` 作为 serde alias。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:54] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:56] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:67] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:50] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:51] |
| `suggest_reason` | string | 是 | 无 | 给用户看的简短原因;handler trim 后不允许为空。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:34] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:35] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:36] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:45] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:60] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:61] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:62] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:67] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:130] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:131] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:134] |

ListTool 的 data type 是 `RequestPluginInstallArgs { tool_type, action_type, tool_id, suggest_reason }`。[E: codex-rs/tools/src/request_plugin_install.rs:16] [E: codex-rs/tools/src/request_plugin_install.rs:17] [E: codex-rs/tools/src/request_plugin_install.rs:18] [E: codex-rs/tools/src/request_plugin_install.rs:19] [E: codex-rs/tools/src/request_plugin_install.rs:20]

## 4 输出 schema & 截断

`request_plugin_install` 没有 structured output schema,handler 返回 JSON 文本序列化的 `RequestPluginInstallResult`,字段包含 `completed`、`user_confirmed`、`tool_type`、`action_type`、`tool_id`、`tool_name`、`suggest_reason`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:78] [E: codex-rs/tools/src/request_plugin_install.rs:24] [E: codex-rs/tools/src/request_plugin_install.rs:25] [E: codex-rs/tools/src/request_plugin_install.rs:26] [E: codex-rs/tools/src/request_plugin_install.rs:27] [E: codex-rs/tools/src/request_plugin_install.rs:28] [E: codex-rs/tools/src/request_plugin_install.rs:29] [E: codex-rs/tools/src/request_plugin_install.rs:30] [E: codex-rs/tools/src/request_plugin_install.rs:31] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:266] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:281] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:282]

## 5 ToolSpec 类型

`request_plugin_install` 是 `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:72]

## 6 注册与门控

`tool_suggest_enabled` 要求 `Feature::ToolSuggest`、`Feature::Apps`、`Feature::Plugins` 全部开启。[E: codex-rs/core/src/tools/spec_plan.rs:335] [E: codex-rs/core/src/tools/spec_plan.rs:337] [E: codex-rs/core/src/tools/spec_plan.rs:338] [E: codex-rs/core/src/tools/spec_plan.rs:339]

`add_core_utility_tools` 要求存在非空 tool suggest candidates,并会注册 `RequestPluginInstallHandler`;只有 `ListTool` presentation 才额外注册 `list_available_plugins_to_install`。[E: codex-rs/core/src/tools/spec_plan.rs:749] [E: codex-rs/core/src/tools/spec_plan.rs:752] [E: codex-rs/core/src/tools/spec_plan.rs:754] [E: codex-rs/core/src/tools/spec_plan.rs:755] [E: codex-rs/core/src/tools/spec_plan.rs:759]

spec tests 证明即使 `tool_search` 不可见,`request_plugin_install` 仍可见,因为安装请求工具不依赖 search tool capability。[E: codex-rs/core/src/tools/spec_plan_tests.rs:990] [E: codex-rs/core/src/tools/spec_plan_tests.rs:993] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1006] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1008] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1010]

## 7 parallel-safe

`RequestPluginInstallHandler` 实现上返回 `supports_parallel_tool_calls() == true`,但 `ListTool` 模式的模型描述明确要求不要和其它工具并行调用;写节点时要同时保留这两个事实。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:81] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:82] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:48]

## 8 handler 走读

handler 解析 presentation-specific 参数,拒绝非 `install` action 和空 `suggest_reason`,在 codex-tui 客户端拒绝 plugin 安装请求,再从可发现候选中精确匹配请求的 tool。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:114] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:117] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:126] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:130] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:133] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:136] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:137] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:138] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:132] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:141] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:153] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:156] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:159]

找到候选后,handler 构造 MCP server elicitation request,等待用户响应;若用户接受则调用 `verify_request_plugin_install_completed`。connector 走 accessible connector 刷新验证;plugin 分支中 remote marketplace suggestion 会刷新远程插件缓存并确认 requested connectors 被 picked up,非 remote plugin 才 reload config 并用 plugin manager 验证。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:213] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:214] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:215] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:227] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:232] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:233] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:349] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:357] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:365] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:366] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:368] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:369] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:371] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:385] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:386] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:393] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:395] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:398] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:436] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:439] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:484] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:490] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:496]

如果用户 decline 且 elicitation meta 的 `persist` 是 `always`,handler 会把该 tool 写入 disabled tool suggestion 配置并 reload user config layer。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:290] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:296] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:300] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:309] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:312] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:315] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:325] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:328] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:333] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:335] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:336] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:337] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:342] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:343] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:345]

## 9 设计动机·edge·历史

`request_plugin_install` 是旧 `tool_suggest` 的执行请求面:候选枚举和安装确认被拆成两个工具,让模型先列出精确候选再请求用户确认。[I]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
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
