---
id: tool.list-available-plugins-to-install
title: list_available_plugins_to_install 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs, codex-rs/core/src/tools/handlers/list_available_plugins_to_install_spec.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/tools/src/tool_discovery.rs]
symbols: [ListAvailablePluginsToInstallHandler, create_list_available_plugins_to_install_tool, ListAvailablePluginsToInstallResult, RequestPluginInstallEntry]
related: [tool.request-plugin-install, tool.tool-search, subsys.config-auth.plugins, subsys.mcp.connectors]
evidence: explicit
status: verified
updated: db887d03e1
---

> `list_available_plugins_to_install` 列出当前可安装的 plugin/connector 候选,供模型再用 `request_plugin_install` 发起安装请求。

## 能回答的问题

- `list_available_plugins_to_install` 什么时候出现?
- 输出候选项里有哪些字段?
- 为什么这个工具不支持 parallel tool calls?
- 这个工具和 `request_plugin_install` 的关系是什么?

## 1 Identity

wire name 常量是 `LIST_AVAILABLE_PLUGINS_TO_INSTALL_TOOL_NAME`,值为 `list_available_plugins_to_install`;handler 是 `ListAvailablePluginsToInstallHandler`。[E: codex-rs/tools/src/tool_discovery.rs:8] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:18]

handler 的 `tool_name()` 返回该常量,`spec()` 返回 `create_list_available_plugins_to_install_tool()`。[E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:57] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:59] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:62] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:63]

## 2 用途定位

spec 描述要求仅在用户明确要求安装具体 plugin/connector 且 `tool_search` 不可用或找不到目标时使用;输出候选可传给 `request_plugin_install`。[E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install_spec.rs:7] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install_spec.rs:9]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| 无 | object | 否 | 空对象 | spec 使用空 object 参数、空 required list、`additionalProperties=false`。[E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install_spec.rs:17] |

## 4 输出 schema & 截断

handler 把 `ListAvailablePluginsToInstallResult { tools }` 序列化为 JSON 文本输出。[E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:33] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:34] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:90] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:96]

每个 `RequestPluginInstallEntry` 包含 `id`、`name`、`description`、`tool_type`、`has_skills`、`mcp_server_names`、`app_connector_ids`;handler 会把 description 截到 240 个字符边界。[E: codex-rs/tools/src/tool_discovery.rs:105] [E: codex-rs/tools/src/tool_discovery.rs:106] [E: codex-rs/tools/src/tool_discovery.rs:107] [E: codex-rs/tools/src/tool_discovery.rs:108] [E: codex-rs/tools/src/tool_discovery.rs:109] [E: codex-rs/tools/src/tool_discovery.rs:110] [E: codex-rs/tools/src/tool_discovery.rs:111] [E: codex-rs/tools/src/tool_discovery.rs:112] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:16] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:40] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:43] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:105] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:106] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:107]

## 5 ToolSpec 类型

`list_available_plugins_to_install` 是 `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install_spec.rs:12]

## 6 注册与门控

`tool_suggest_enabled` 要求 `Feature::ToolSuggest`、`Feature::Apps`、`Feature::Plugins` 全部开启。[E: codex-rs/core/src/tools/spec_plan.rs:335] [E: codex-rs/core/src/tools/spec_plan.rs:337] [E: codex-rs/core/src/tools/spec_plan.rs:338] [E: codex-rs/core/src/tools/spec_plan.rs:339]

`add_core_utility_tools` 还要求存在非空 `tool_suggest_candidates`;当 presentation 是 `ToolSuggestPresentation::ListTool` 时才注册 `ListAvailablePluginsToInstallHandler`,随后总是注册 `RequestPluginInstallHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:750] [E: codex-rs/core/src/tools/spec_plan.rs:752] [E: codex-rs/core/src/tools/spec_plan.rs:754] [E: codex-rs/core/src/tools/spec_plan.rs:755] [E: codex-rs/core/src/tools/spec_plan.rs:759]

spec tests 覆盖任一 discovery feature 关闭、候选为空时两件套不可见,以及开启后两件套可见。[E: codex-rs/core/src/tools/spec_plan_tests.rs:922] [E: codex-rs/core/src/tools/spec_plan_tests.rs:923] [E: codex-rs/core/src/tools/spec_plan_tests.rs:938] [E: codex-rs/core/src/tools/spec_plan_tests.rs:944] [E: codex-rs/core/src/tools/spec_plan_tests.rs:964] [E: codex-rs/core/src/tools/spec_plan_tests.rs:983] [E: codex-rs/core/src/tools/spec_plan_tests.rs:984] [E: codex-rs/core/src/tools/spec_plan_tests.rs:985]

## 7 parallel-safe

`ListAvailablePluginsToInstallHandler` 显式返回 `supports_parallel_tool_calls() == false`。[E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:66] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:67]

## 8 handler 走读

handler 构造时按 `name`、`id` 排序候选;调用时只接受 function payload,然后输出当前候选 JSON。[E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:23] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:25] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:27] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:80] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:81] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:82] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:90] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:96] [E: codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs:98]

## 9 设计动机·edge·历史

`list_available_plugins_to_install` 是旧 `tool_suggest` 的拆分后半:先列出可安装候选,再由 `request_plugin_install` 执行用户可确认的安装请求。[I]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/list_available_plugins_to_install.rs
- codex-rs/core/src/tools/handlers/list_available_plugins_to_install_spec.rs
- codex-rs/core/src/tools/spec_plan_tests.rs
- codex-rs/tools/src/tool_discovery.rs

## 相关

- `tool.request-plugin-install`
- `tool.tool-search`
- `subsys.config-auth.plugins`
- `subsys.mcp.connectors`
