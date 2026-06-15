---
id: tool.tool-suggest
title: tool_suggest 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/tool_discovery.rs, codex-rs/tools/src/tool_suggest.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/features/src/lib.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/tool_suggest.rs]
symbols: [create_tool_suggest_tool, collect_tool_suggest_entries, ToolSuggestArgs, ToolSuggestResult, ToolSuggestHandler, ToolHandlerKind::ToolSuggest]
related: [tool.tool-search, subsys.mcp.connectors, subsys.config-auth.plugins, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `tool_suggest` 是 Codex 在缺少明确 connector/plugin capability 时让模型发起安装/启用建议的 Function 工具；handler 会向用户发起 MCP elicitation，并返回 suggestion 是否被用户确认及是否完成。[E: codex-rs/tools/src/tool_discovery.rs:311][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:124][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:126][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:130]

## 能回答的问题

- `tool_suggest` 的参数字段和 discoverable tool id 校验是什么？
- `tool_suggest` 何时出现在 registry，为什么依赖 Apps 与 Plugins feature？
- `tool_suggest` 和 `tool_search` 的边界是什么？
- `tool_suggest` 为什么当前只支持 `action_type="install"`？
- `tool_suggest` 的 handler 如何验证 connector/plugin 是否安装完成？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `tool_suggest` | 常量 `TOOL_SUGGEST_TOOL_NAME` 为 `tool_suggest`。[E: codex-rs/tools/src/tool_discovery.rs:18] |
| aliases | 未看到独立 alias。 | registry 注册 `TOOL_SUGGEST_TOOL_NAME` 给 `ToolHandlerKind::ToolSuggest`。[E: codex-rs/tools/src/tool_registry_plan.rs:309][I] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_tool_suggest_tool` 返回 Function ToolSpec。[E: codex-rs/tools/src/tool_discovery.rs:314] |
| ToolHandlerKind | `ToolHandlerKind::ToolSuggest` | `ToolHandlerKind` enum 包含 `ToolSuggest` 变体。[E: codex-rs/tools/src/tool_registry_plan_types.rs:39] |
| core handler | `ToolSuggestHandler` | `core/src/tools/spec.rs` 创建 `Arc::new(ToolSuggestHandler)`。[E: codex-rs/core/src/tools/spec.rs:167] |
| 所属 crate | discovery/spec/metadata 在 `codex-tools`，执行在 `codex-core`。 | `ToolSuggestArgs`/`ToolSuggestResult` 在 `tool_suggest.rs`，handler 在 core 解析这些 args。[E: codex-rs/tools/src/tool_suggest.rs:18][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:59] |

## 2 用途定位

`create_tool_suggest_tool` 的 description 把该工具限定为：用户明确需要某能力，但当前 active `tools` list 没有匹配工具，且已经尝试 `tool_search` 或其他方式仍找不到。[E: codex-rs/tools/src/tool_discovery.rs:311]  
description 要求建议只能来自 discoverable tools 列表，不能探索或推荐不在列表里的工具。[E: codex-rs/tools/src/tool_discovery.rs:311]  
`tool_suggest` 与 `tool_search` 的边界是：`tool_search` 查当前可 deferred loading 的工具，`tool_suggest` 建议缺失 connector/plugin 的安装或启用。[E: codex-rs/tools/src/tool_discovery.rs:192][E: codex-rs/tools/src/tool_discovery.rs:311]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `tool_type` | string / `DiscoverableToolType` | 是 | 无 | `connector` 或 `plugin`。 | schema description 指定 connector/plugin；协议 enum 使用 snake_case。[E: codex-rs/tools/src/tool_discovery.rs:282][E: codex-rs/tools/src/tool_discovery.rs:284][E: codex-rs/tools/src/tool_discovery.rs:44] |
| `action_type` | string / `DiscoverableToolAction` | 是 | 无 | 建议动作。 | schema 允许 install/enable，但 handler 当前只支持 install。[E: codex-rs/tools/src/tool_discovery.rs:289][E: codex-rs/tools/src/tool_discovery.rs:291][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:66] |
| `tool_id` | string | 是 | 无 | connector 或 plugin id。 | schema description 枚举 discoverable ids；handler 会在 discoverable tools 中按 type/id 查找。[E: codex-rs/tools/src/tool_discovery.rs:295][E: codex-rs/tools/src/tool_discovery.rs:297][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:105] |
| `suggest_reason` | string | 是 | 无 | 面向用户的一行建议理由。 | handler trim 后拒绝空字符串。[E: codex-rs/tools/src/tool_discovery.rs:301][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:60][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:63] |

`ToolSuggestArgs` 的 Rust struct 包含 `tool_type`、`action_type`、`tool_id` 和 `suggest_reason` 四个字段。[E: codex-rs/tools/src/tool_suggest.rs:20][E: codex-rs/tools/src/tool_suggest.rs:21][E: codex-rs/tools/src/tool_suggest.rs:22][E: codex-rs/tools/src/tool_suggest.rs:23]  
schema 顶层 required 也包含这四个字段，并且 `additionalProperties` 为 false。[E: codex-rs/tools/src/tool_discovery.rs:322][E: codex-rs/tools/src/tool_discovery.rs:325][E: codex-rs/tools/src/tool_discovery.rs:327]

## 4 输出 schema & 截断

ToolSpec 不声明 output schema，`output_schema` 为 `None`。[E: codex-rs/tools/src/tool_discovery.rs:329]  
handler 返回 `ToolSuggestResult` JSON 文本，字段包括 `completed`、`user_confirmed`、`tool_type`、`action_type`、`tool_id`、`tool_name` 和 `suggest_reason`。[E: codex-rs/tools/src/tool_suggest.rs:28][E: codex-rs/tools/src/tool_suggest.rs:34][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:142]  
`user_confirmed` 表示 elicitation action 是否为 accept；`completed` 仅在用户确认后调用 completion verification。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:126][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:131]  
输出走 `FunctionToolOutput::from_text(content, Some(true))`；源码中没有看到专门截断逻辑。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:157][I]

## 5 ToolSpec 类型

`tool_suggest` 使用普通 Function ToolSpec；core 本地 handler 解析 Function payload 后读取 auth、查询 discoverable tools、发起 elicitation 并做完成验证。[E: codex-rs/tools/src/tool_discovery.rs:314][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:51][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:79][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:87][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:124][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:131][I]  
`ToolSuggestHandler.kind()` 返回 `ToolKind::Function`，handler 只接受 `ToolPayload::Function`。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:33][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:51]

## 6 注册与门控

`ToolsConfig::new` 只有当 `Feature::ToolSuggest`、`Feature::Apps` 和 `Feature::Plugins` 都启用时，把 `tool_suggest` config 设为 true。[E: codex-rs/tools/src/tool_config.rs:153][E: codex-rs/tools/src/tool_config.rs:155]  
`Feature::ToolSuggest`、`Feature::Apps` 和 `Feature::Plugins` 都是 Stable 且默认开启的 feature specs。[E: codex-rs/features/src/lib.rs:840][E: codex-rs/features/src/lib.rs:842][E: codex-rs/features/src/lib.rs:843][E: codex-rs/features/src/lib.rs:816][E: codex-rs/features/src/lib.rs:818][E: codex-rs/features/src/lib.rs:819][E: codex-rs/features/src/lib.rs:846][E: codex-rs/features/src/lib.rs:848][E: codex-rs/features/src/lib.rs:849]  
`build_tool_registry_plan` 只有在 `config.tool_suggest` 为 true 且 `params.discoverable_tools` 存在并非空时 push spec。[E: codex-rs/tools/src/tool_registry_plan.rs:300][E: codex-rs/tools/src/tool_registry_plan.rs:302]  
该 registry block 把 parallel 参数设为 true，把 `code_mode_enabled` 参数固定为 false；因此 `tool_suggest` spec 不走 code-mode augmentation。[E: codex-rs/tools/src/tool_registry_plan.rs:306][E: codex-rs/tools/src/tool_registry_plan.rs:307][I]

## 7 parallel-safe

`tool_suggest` 的 `supports_parallel_tool_calls` 实际值是 `true`。[E: codex-rs/tools/src/tool_registry_plan.rs:306]  
parallel-safe 只表示 registry 允许并行调用；handler 本身会向用户发起 elicitation，因此模型策略仍应避免并发打扰用户。[I]  
handler 会向用户发起 elicitation；parallel-safe 只表示 registry 允许并行调用，不代表模型策略应该并发打扰用户。[I]

## 8 handler 走读

1. `ToolSuggestHandler` 解析 Function arguments 为 `ToolSuggestArgs`。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:51][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:59]
2. handler 拒绝空 `suggest_reason`。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:60][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:63]
3. handler 当前只允许 `action_type == Install`，其他 action 返回错误。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:66][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:68]
4. 如果 client 是 `codex-tui` 且 tool_type 是 Plugin，handler 返回 `plugin tool suggestions are not available in codex-tui yet`。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:71][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:75]
5. handler 读取 auth、MCP tools、accessible connectors，再查询 discoverable tools。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:79][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:87]
6. handler 对 TUI client 过滤掉 plugin discoverable tools；过滤函数在 `app_server_client_name == Some("codex-tui")` 时移除 `DiscoverableTool::Plugin`。[E: codex-rs/tools/src/tool_discovery.rs:114][E: codex-rs/tools/src/tool_discovery.rs:124]
7. handler 按 `tool_type` 与 `tool_id` 找第一个匹配 discoverable tool，不匹配则返回 `tool_id must match...`。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:105][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:107][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:110]
8. handler 构造 `tool_suggestion_{call_id}` request id，并通过 `request_mcp_server_elicitation` 向用户发起表单 elicitation。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:114][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:124]
9. 用户接受后，connector 路径刷新 connector cache 并验证 connector accessible；plugin 路径 reload config 并检查 marketplace plugin installed。[E: codex-rs/core/src/tools/handlers/tool_suggest.rs:168][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:177][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:180][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:182]

## 9 设计动机·edge·历史

`create_tool_suggest_tool` 的 prompt 文本把 plugin suggestion 设得更严格：只有用户意图非常明确匹配 plugin 本身时才建议 install plugin；connector missing suggestion 用 clear-fit 标准。[E: codex-rs/tools/src/tool_discovery.rs:311]  
`build_tool_suggestion_elicitation_request` 把 suggestion metadata 放进 `codex_approval_kind: "tool_suggestion"`；这可作为客户端识别 elicitation 类型的 metadata。[E: codex-rs/tools/src/tool_suggest.rs:16][E: codex-rs/tools/src/tool_suggest.rs:66][E: codex-rs/tools/src/tool_suggest.rs:113][I]  
当前 schema description 允许 `enable`，但 handler 只支持 install；这是 schema 与 handler 之间的历史/未来扩展不一致点。[E: codex-rs/tools/src/tool_discovery.rs:291][E: codex-rs/core/src/tools/handlers/tool_suggest.rs:66][I]

## Sources

- `codex-rs/tools/src/tool_discovery.rs`
- `codex-rs/tools/src/tool_suggest.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/tool_suggest.rs`

## 相关

- [tool_search 工具](tool-search.md)
- [Connectors](../../subsystems/mcp/connectors.md)
- [Plugins 系统](../../subsystems/config-auth/plugins.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
