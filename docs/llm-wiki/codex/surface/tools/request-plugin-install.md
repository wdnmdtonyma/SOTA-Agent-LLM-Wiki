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
updated: 5670360009
---

> `request_plugin_install` 向用户发起 plugin/connector 安装确认;用户接受后,connector 和非远程 plugin 会走完成验证,远程 marketplace plugin suggestion 会直接返回 completed。

## 能回答的问题

- `request_plugin_install` 的两个 presentation mode 有什么输入差异?
- 什么时候会出现 `request_plugin_install`?
- 为什么 `request_plugin_install` 要求不要并行调用?
- 用户拒绝且选择 always 时会持久化什么?

## 1 Identity

wire name 常量是 `REQUEST_PLUGIN_INSTALL_TOOL_NAME`,值为 `request_plugin_install`;handler 是 `RequestPluginInstallHandler`。[E: codex-rs/tools/src/tool_discovery.rs:9] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:50]

handler 的 `tool_name()` 返回该常量,`spec()` 根据 `ToolSuggestPresentation` 调用 `create_request_plugin_install_tool`。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:67] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:69] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:72] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:73]

## 2 用途定位

`ListTool` presentation 的描述要求只能在 `list_available_plugins_to_install` 返回完全匹配的候选后使用,并要求原样传递 `tool_type` 和 `id`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:47] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:48]

`RecommendationContext` presentation 使用 `<recommended_plugins>` 里的 `plugin_id` 和 `suggest_reason`,用于推荐插件安装。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:51] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:54] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:60] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:67] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:68]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `tool_type` | string | ListTool 是 | 无 | discoverable tool 类型,文案要求用 `connector` 或 `plugin`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:17] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:18] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:19] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:42] |
| `action_type` | string | ListTool 是 | 无 | 当前只支持 `install`;handler 对其它 action 返回错误。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:24] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:25] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:26] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:43] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:110] |
| `tool_id` | string | ListTool 是 | 无 | connector 或 plugin id;必须匹配可发现候选。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:30] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:31] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:44] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:146] |
| `plugin_id` | string | RecommendationContext 是 | 无 | `<recommended_plugins>` 中的 plugin id;runtime 也接受 `tool_id` 作为 serde alias。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:54] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:56] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:67] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:45] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:46] |
| `suggest_reason` | string | 是 | 无 | 给用户看的简短原因;handler trim 后不允许为空。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:34] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:35] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:36] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:45] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:60] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:61] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:62] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:67] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:123] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:124] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:127] |

ListTool 的 data type 是 `RequestPluginInstallArgs { tool_type, action_type, tool_id, suggest_reason }`。[E: codex-rs/tools/src/request_plugin_install.rs:21] [E: codex-rs/tools/src/request_plugin_install.rs:22] [E: codex-rs/tools/src/request_plugin_install.rs:23] [E: codex-rs/tools/src/request_plugin_install.rs:24] [E: codex-rs/tools/src/request_plugin_install.rs:25]

## 4 输出 schema & 截断

`request_plugin_install` 没有 structured output schema,handler 返回 JSON 文本序列化的 `RequestPluginInstallResult`,字段包含 `completed`、`user_confirmed`、`tool_type`、`action_type`、`tool_id`、`tool_name`、`suggest_reason`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:78] [E: codex-rs/tools/src/request_plugin_install.rs:29] [E: codex-rs/tools/src/request_plugin_install.rs:30] [E: codex-rs/tools/src/request_plugin_install.rs:31] [E: codex-rs/tools/src/request_plugin_install.rs:32] [E: codex-rs/tools/src/request_plugin_install.rs:33] [E: codex-rs/tools/src/request_plugin_install.rs:34] [E: codex-rs/tools/src/request_plugin_install.rs:35] [E: codex-rs/tools/src/request_plugin_install.rs:36] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:228] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:243] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:244]

## 5 ToolSpec 类型

`request_plugin_install` 是 `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:72]

## 6 注册与门控

`tool_suggest_enabled` 要求 `Feature::ToolSuggest`、`Feature::Apps`、`Feature::Plugins` 全部开启。[E: codex-rs/core/src/tools/spec_plan.rs:331] [E: codex-rs/core/src/tools/spec_plan.rs:333] [E: codex-rs/core/src/tools/spec_plan.rs:334] [E: codex-rs/core/src/tools/spec_plan.rs:335]

`add_core_utility_tools` 要求存在非空 tool suggest candidates,并会注册 `RequestPluginInstallHandler`;只有 `ListTool` presentation 才额外注册 `list_available_plugins_to_install`。[E: codex-rs/core/src/tools/spec_plan.rs:718] [E: codex-rs/core/src/tools/spec_plan.rs:721] [E: codex-rs/core/src/tools/spec_plan.rs:723] [E: codex-rs/core/src/tools/spec_plan.rs:724] [E: codex-rs/core/src/tools/spec_plan.rs:728]

spec tests 证明即使 `tool_search` 不可见,`request_plugin_install` 仍可见,因为安装请求工具不依赖 search tool capability。[E: codex-rs/core/src/tools/spec_plan_tests.rs:909] [E: codex-rs/core/src/tools/spec_plan_tests.rs:912] [E: codex-rs/core/src/tools/spec_plan_tests.rs:925] [E: codex-rs/core/src/tools/spec_plan_tests.rs:927] [E: codex-rs/core/src/tools/spec_plan_tests.rs:929]

## 7 parallel-safe

`RequestPluginInstallHandler` 实现上返回 `supports_parallel_tool_calls() == true`,但 `ListTool` 模式的模型描述明确要求不要和其它工具并行调用;写节点时要同时保留这两个事实。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:76] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:77] [E: codex-rs/core/src/tools/handlers/request_plugin_install_spec.rs:48]

## 8 handler 走读

handler 解析 presentation-specific 参数,拒绝非 `install` action 和空 `suggest_reason`,在 codex-tui 客户端拒绝 plugin 安装请求,再从可发现候选中精确匹配请求的 tool。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:107] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:110] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:119] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:123] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:126] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:129] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:130] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:131] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:133] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:134] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:146] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:149] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:152]

找到候选后,handler 构造 MCP server elicitation request,等待用户响应;若用户接受则调用 `verify_request_plugin_install_completed`。connector 走 accessible connector 刷新验证;plugin 分支中 remote marketplace suggestion 直接返回完成,非 remote plugin 才 reload config 并用 plugin manager 验证。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:175] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:176] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:183] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:190] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:195] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:196] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:311] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:318] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:326] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:327] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:329] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:330] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:331] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:334] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:336] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:339] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:354] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:357] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:403] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:409] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:415]

如果用户 decline 且 elicitation meta 的 `persist` 是 `always`,handler 会把该 tool 写入 disabled tool suggestion 配置并 reload user config layer。[E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:252] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:258] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:262] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:271] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:274] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:277] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:287] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:290] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:295] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:297] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:298] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:299] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:304] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:305] [E: codex-rs/core/src/tools/handlers/request_plugin_install.rs:307]

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
