---
id: subsys.core.tool-system
title: 工具系统机制
kind: subsystem
tier: T2
source: [codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_definition.rs, codex-rs/core/src/tools/spec.rs]
symbols: [build_tool_registry_plan, ToolSpec, ConfiguredToolSpec, ToolRegistryPlan, ToolHandlerKind, ToolDefinition, build_specs_with_discoverable_tools]
related: [spine.tool-call-anatomy, subsys.core.tool-router, subsys.core.unified-exec, tool.exec-command, tool.tool-search]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex 工具系统机制的 registry-plan ground truth 是 `codex_tools::build_tool_registry_plan` 生成的 model-visible `ToolSpec` 清单与 runtime `ToolHandlerKind` handler 清单；core 再消费这个 plan 填充 `ToolRegistryBuilder` 的 specs 与 handlers，并在 plan 之外补充 deferred/unavailable 兼容入口。[E: codex-rs/tools/src/tool_registry_plan.rs:71][E: codex-rs/tools/src/tool_registry_plan_types.rs:54][E: codex-rs/tools/src/tool_registry_plan_types.rs:55][E: codex-rs/core/src/tools/spec.rs:128][E: codex-rs/core/src/tools/spec.rs:179][E: codex-rs/core/src/tools/spec.rs:190][E: codex-rs/core/src/tools/spec.rs:295][E: codex-rs/core/src/tools/spec.rs:305]

## 能回答的问题

- `ToolSpec`、`ConfiguredToolSpec`、`ToolHandlerKind` 和 `ToolRegistryPlan` 分别负责什么？
- `build_tool_registry_plan` 怎样按 `ToolsConfig` 注册 shell、MCP、apply_patch、tool_search、web_search、image_generation、collab、dynamic tool？
- 为什么 `web_search` 和 `image_generation` 有 spec 但没有 core handler？
- code mode nested tools 怎样被递归装配并暴露为一个 namespace tool？
- deferred MCP/dynamic tool discovery 为什么需要 `tool_search`？
- parallel tool call 支持位存在哪里？

## 职责边界

`codex-rs/tools/src/tool_registry_plan.rs` 负责决定 registry plan 中“本轮有哪些工具、它们对模型的 schema 是什么、runtime 应该按哪个 `ToolHandlerKind` 调度”；`codex-rs/core/src/tools/spec.rs` 再把 plan 中的 specs 和 handlers 安装进 `ToolRegistryBuilder`，并在 plan 消费后补充 deferred MCP handler 与 unavailable placeholder。[E: codex-rs/tools/src/tool_registry_plan.rs:75][E: codex-rs/tools/src/tool_registry_plan_types.rs:100][E: codex-rs/tools/src/tool_registry_plan_types.rs:115][E: codex-rs/core/src/tools/spec.rs:179][E: codex-rs/core/src/tools/spec.rs:190][E: codex-rs/core/src/tools/spec.rs:295][E: codex-rs/core/src/tools/spec.rs:305]

`ToolSpec` 表达 Responses API 可以看到的工具形态，包括 JSON function、namespace、tool_search、local_shell、image_generation、web_search 和 freeform/custom tool。[E: codex-rs/tools/src/tool_spec.rs:22][E: codex-rs/tools/src/tool_spec.rs:24][E: codex-rs/tools/src/tool_spec.rs:26][E: codex-rs/tools/src/tool_spec.rs:27][E: codex-rs/tools/src/tool_spec.rs:33][E: codex-rs/tools/src/tool_spec.rs:35][E: codex-rs/tools/src/tool_spec.rs:43][E: codex-rs/tools/src/tool_spec.rs:56][E: codex-rs/tools/src/tool_spec.rs:57] `ConfiguredToolSpec` 在 `ToolSpec` 外再记录 `supports_parallel_tool_calls`，这让 schema 与并行安全标记分离。[E: codex-rs/tools/src/tool_spec.rs:132][E: codex-rs/tools/src/tool_spec.rs:134]

## 关键 crate/文件

- `codex-rs/tools/src/tool_registry_plan.rs`: `build_tool_registry_plan` 的主要门控分支都在这里，包含 code mode、environment shell、MCP resource、plan、JS REPL、permission request、tool search、tool suggest、list dir、test sync、apply_patch、web/image、view_image、collab、agent jobs、direct MCP、dynamic tools。[E: codex-rs/tools/src/tool_registry_plan.rs:78][E: codex-rs/tools/src/tool_registry_plan.rs:137][E: codex-rs/tools/src/tool_registry_plan.rs:193][E: codex-rs/tools/src/tool_registry_plan.rs:214][E: codex-rs/tools/src/tool_registry_plan.rs:221][E: codex-rs/tools/src/tool_registry_plan.rs:248][E: codex-rs/tools/src/tool_registry_plan.rs:263][E: codex-rs/tools/src/tool_registry_plan.rs:300][E: codex-rs/tools/src/tool_registry_plan.rs:334][E: codex-rs/tools/src/tool_registry_plan.rs:348][E: codex-rs/tools/src/tool_registry_plan.rs:312][E: codex-rs/tools/src/tool_registry_plan.rs:361][E: codex-rs/tools/src/tool_registry_plan.rs:373][E: codex-rs/tools/src/tool_registry_plan.rs:381][E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:480][E: codex-rs/tools/src/tool_registry_plan.rs:497][E: codex-rs/tools/src/tool_registry_plan.rs:560]
- `codex-rs/tools/src/tool_registry_plan_types.rs`: 定义 `ToolHandlerKind`、`ToolHandlerSpec`、`ToolRegistryPlan`、`ToolRegistryPlanParams` 和 plan 的 `push_spec`/`register_handler` 方法。[E: codex-rs/tools/src/tool_registry_plan_types.rs:12][E: codex-rs/tools/src/tool_registry_plan_types.rs:47][E: codex-rs/tools/src/tool_registry_plan_types.rs:53][E: codex-rs/tools/src/tool_registry_plan_types.rs:59][E: codex-rs/tools/src/tool_registry_plan_types.rs:100][E: codex-rs/tools/src/tool_registry_plan_types.rs:115]
- `codex-rs/tools/src/tool_spec.rs`: 定义 `ToolSpec` enum、tool name projection、Responses API JSON 生成与 built-in web/image spec。[E: codex-rs/tools/src/tool_spec.rs:22][E: codex-rs/tools/src/tool_spec.rs:60][E: codex-rs/tools/src/tool_spec.rs:87][E: codex-rs/tools/src/tool_spec.rs:99][E: codex-rs/tools/src/tool_spec.rs:150]
- `codex-rs/core/src/tools/spec.rs`: 把 plan 翻译成 `ToolRegistryBuilder`，并把每个 `ToolHandlerKind` 绑定到 concrete `ToolHandler`。[E: codex-rs/core/src/tools/spec.rs:128][E: codex-rs/core/src/tools/spec.rs:148][E: codex-rs/core/src/tools/spec.rs:179][E: codex-rs/core/src/tools/spec.rs:190]

## 数据模型

`ToolRegistryPlan` 是工具系统的中间表示，字段只有 `specs` 与 `handlers`；在工具系统节点中，`specs` 被解释为 model-facing declarations，`handlers` 被解释为 runtime-facing declarations。[E: codex-rs/tools/src/tool_registry_plan_types.rs:53][E: codex-rs/tools/src/tool_registry_plan_types.rs:54][E: codex-rs/tools/src/tool_registry_plan_types.rs:55][I] `ToolHandlerSpec` 用 `ToolName` 表示 wire name/namespace，并用 `ToolHandlerKind` 表示 handler class。[E: codex-rs/tools/src/tool_registry_plan_types.rs:48][E: codex-rs/tools/src/tool_registry_plan_types.rs:49]

`ToolHandlerKind` 是 runtime handler 的枚举总表，包含 `ApplyPatch`、`CodeModeExecute`、`DynamicTool`、`Mcp`、`McpResource`、`Plan`、`RequestPermissions`、`RequestUserInput`、`Shell`、`ShellCommand`、`ToolSearch`、`ToolSuggest`、`UnifiedExec`、`ViewImage` 等变体。[E: codex-rs/tools/src/tool_registry_plan_types.rs:12][E: codex-rs/tools/src/tool_registry_plan_types.rs:14][E: codex-rs/tools/src/tool_registry_plan_types.rs:17][E: codex-rs/tools/src/tool_registry_plan_types.rs:19][E: codex-rs/tools/src/tool_registry_plan_types.rs:25][E: codex-rs/tools/src/tool_registry_plan_types.rs:26][E: codex-rs/tools/src/tool_registry_plan_types.rs:27][E: codex-rs/tools/src/tool_registry_plan_types.rs:28][E: codex-rs/tools/src/tool_registry_plan_types.rs:29][E: codex-rs/tools/src/tool_registry_plan_types.rs:33][E: codex-rs/tools/src/tool_registry_plan_types.rs:34][E: codex-rs/tools/src/tool_registry_plan_types.rs:38][E: codex-rs/tools/src/tool_registry_plan_types.rs:39][E: codex-rs/tools/src/tool_registry_plan_types.rs:40][E: codex-rs/tools/src/tool_registry_plan_types.rs:41]

`ToolDefinition` 是轻量工具 metadata/schema 容器，字段包括 `name`、`description`、`input_schema`、`output_schema` 和 `defer_loading`；`into_deferred` 会清空 output schema 并把 `defer_loading` 设为 true。[E: codex-rs/tools/src/tool_definition.rs:7][E: codex-rs/tools/src/tool_definition.rs:8][E: codex-rs/tools/src/tool_definition.rs:9][E: codex-rs/tools/src/tool_definition.rs:10][E: codex-rs/tools/src/tool_definition.rs:11][E: codex-rs/tools/src/tool_definition.rs:12][E: codex-rs/tools/src/tool_definition.rs:21][E: codex-rs/tools/src/tool_definition.rs:22][E: codex-rs/tools/src/tool_definition.rs:23]

## 控制流

1. `build_tool_registry_plan(config, params)` 先创建 `ToolRegistryPlan::new()`，随后按 `ToolsConfig` 与 `ToolRegistryPlanParams` 分支追加 specs/handlers。[E: codex-rs/tools/src/tool_registry_plan.rs:71][E: codex-rs/tools/src/tool_registry_plan.rs:75][E: codex-rs/tools/src/tool_registry_plan_types.rs:100][E: codex-rs/tools/src/tool_registry_plan_types.rs:115]
2. code mode 分支在 `config.code_mode_enabled` 为 true 时递归调用 `build_tool_registry_plan` 生成 nested tool registry，再把 nested 工具描述塞进 `create_code_mode_tool`，并注册 `code_mode_execute` 与 `code_mode_wait` 两个 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:78][E: codex-rs/tools/src/tool_registry_plan.rs:93][E: codex-rs/tools/src/tool_registry_plan.rs:94][E: codex-rs/tools/src/tool_registry_plan.rs:109][E: codex-rs/tools/src/tool_registry_plan.rs:122][E: codex-rs/tools/src/tool_registry_plan.rs:126][E: codex-rs/tools/src/tool_registry_plan.rs:131]
3. environment shell 分支只在 `config.has_environment` 为 true 时执行，`ConfigShellToolType::UnifiedExec` 会创建 `exec_command` 和 `write_stdin` specs，并把二者都注册到 `ToolHandlerKind::UnifiedExec`。[E: codex-rs/tools/src/tool_registry_plan.rs:137][E: codex-rs/tools/src/tool_registry_plan.rs:155][E: codex-rs/tools/src/tool_registry_plan.rs:156][E: codex-rs/tools/src/tool_registry_plan.rs:164][E: codex-rs/tools/src/tool_registry_plan.rs:169][E: codex-rs/tools/src/tool_registry_plan.rs:170]
4. plan 和 request_user_input 是无条件进入 plan 的工具：`create_update_plan_tool` 与 `create_request_user_input_tool` 分别被 push spec 并注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:214][E: codex-rs/tools/src/tool_registry_plan.rs:219][E: codex-rs/tools/src/tool_registry_plan.rs:236][E: codex-rs/tools/src/tool_registry_plan.rs:243]
5. `tool_search` 只在 `config.search_tool` 为 true 且 deferred MCP source 存在或 deferred dynamic tools 非空时加入，函数会把 deferred MCP source 与 deferred dynamic source 编成 search source info，并注册 `ToolHandlerKind::ToolSearch`；若 deferred MCP source 存在，同一分支还会为每个 deferred MCP tool 注册 `ToolHandlerKind::Mcp`。[E: codex-rs/tools/src/tool_registry_plan.rs:263][E: codex-rs/tools/src/tool_registry_plan.rs:264][E: codex-rs/tools/src/tool_registry_plan.rs:266][E: codex-rs/tools/src/tool_registry_plan.rs:277][E: codex-rs/tools/src/tool_registry_plan.rs:279][E: codex-rs/tools/src/tool_registry_plan.rs:286][E: codex-rs/tools/src/tool_registry_plan.rs:291][E: codex-rs/tools/src/tool_registry_plan.rs:293][E: codex-rs/tools/src/tool_registry_plan.rs:295]
6. apply_patch 分支要求 `config.has_environment` 且 `config.apply_patch_tool_type` 存在；Freeform 与 Function 两种形态最终都注册到 `ToolHandlerKind::ApplyPatch`。[E: codex-rs/tools/src/tool_registry_plan.rs:312][E: codex-rs/tools/src/tool_registry_plan.rs:313][E: codex-rs/tools/src/tool_registry_plan.rs:316][E: codex-rs/tools/src/tool_registry_plan.rs:323][E: codex-rs/tools/src/tool_registry_plan.rs:331]
7. `web_search` 和 `image_generation` 分支只 push built-in `ToolSpec`，没有在 `ToolRegistryPlan.handlers` 中注册 core handler；它们由 Responses API/provider 侧处理的判断来自 plan 中缺少 `register_handler` 调用这一代码形态。[E: codex-rs/tools/src/tool_registry_plan.rs:366][E: codex-rs/tools/src/tool_registry_plan.rs:367][E: codex-rs/tools/src/tool_registry_plan.rs:368][E: codex-rs/tools/src/tool_registry_plan.rs:374][E: codex-rs/tools/src/tool_registry_plan.rs:375][E: codex-rs/tools/src/tool_registry_plan.rs:376][I]
8. direct MCP tools 要求 `tool.name.namespace` 存在；有效 MCP tool 会转换成 Responses API namespace function，放入 `ToolSpec::Namespace`，并注册 `ToolHandlerKind::Mcp`。[E: codex-rs/tools/src/tool_registry_plan.rs:502][E: codex-rs/tools/src/tool_registry_plan.rs:503][E: codex-rs/tools/src/tool_registry_plan.rs:531][E: codex-rs/tools/src/tool_registry_plan.rs:532][E: codex-rs/tools/src/tool_registry_plan.rs:534][E: codex-rs/tools/src/tool_registry_plan.rs:535][E: codex-rs/tools/src/tool_registry_plan.rs:546][E: codex-rs/tools/src/tool_registry_plan.rs:548]
9. dynamic tools 通过 `dynamic_tool_to_loadable_tool_spec` 变成 loadable spec，用 `ToolName::new(tool.namespace.clone(), tool.name.clone())` 注册 `ToolHandlerKind::DynamicTool`，再把 coalesced loadable specs push 到 plan。[E: codex-rs/tools/src/tool_registry_plan.rs:562][E: codex-rs/tools/src/tool_registry_plan.rs:564][E: codex-rs/tools/src/tool_registry_plan.rs:566][E: codex-rs/tools/src/tool_registry_plan.rs:576]
10. core 的 `build_specs_with_discoverable_tools` 调用 `build_tool_registry_plan` 后，先按 `ConfiguredToolSpec.supports_parallel_tool_calls` 写入 builder，再按 `ToolHandlerKind` match 注册 concrete handlers。[E: codex-rs/core/src/tools/spec.rs:128][E: codex-rs/core/src/tools/spec.rs:179][E: codex-rs/core/src/tools/spec.rs:180][E: codex-rs/core/src/tools/spec.rs:181][E: codex-rs/core/src/tools/spec.rs:190]

## 设计动机与权衡

`ToolSpec` 与 `ToolHandlerKind` 并列保存在 plan 中，使模型 schema 的变化不必等同于 runtime handler 类型变化；例如 `exec_command` 与 `write_stdin` 是两个 tool specs，但共用 `ToolHandlerKind::UnifiedExec`。[E: codex-rs/tools/src/tool_registry_plan_types.rs:54][E: codex-rs/tools/src/tool_registry_plan_types.rs:55][E: codex-rs/tools/src/tool_registry_plan.rs:156][E: codex-rs/tools/src/tool_registry_plan.rs:164][E: codex-rs/tools/src/tool_registry_plan.rs:169][E: codex-rs/tools/src/tool_registry_plan.rs:170][I]

code mode 使用递归 plan 构建 nested tools，可以让 code-mode namespace 的工具列表与普通 registry 共享同一套装配规则；code mode tool spec 在 `plan.push_spec(..., false, ...)` 注册时把 `supports_parallel_tool_calls` 设为 false，避免模型并行进入同一个代码模式执行面。[E: codex-rs/tools/src/tool_registry_plan.rs:94][E: codex-rs/tools/src/tool_registry_plan.rs:119][I]

deferred discovery 把完整工具详情推迟到 `tool_search`，目的是在工具很多时让模型先搜索再加载；源码证据是 deferred MCP/dynamic source 只在 search tool branch 中构造成 source info，并为 deferred MCP 注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:263][E: codex-rs/tools/src/tool_registry_plan.rs:264][E: codex-rs/tools/src/tool_registry_plan.rs:266][E: codex-rs/tools/src/tool_registry_plan.rs:277][E: codex-rs/tools/src/tool_registry_plan.rs:279][E: codex-rs/tools/src/tool_registry_plan.rs:291][E: codex-rs/tools/src/tool_registry_plan.rs:293][E: codex-rs/tools/src/tool_registry_plan.rs:295][I]

## gotcha

- `ToolSpec::name()` 对 namespace 工具返回 namespace 名，对 web/image/local-shell 返回固定 built-in 名；不要把 function name 解析规则套到所有 `ToolSpec` 变体上。[E: codex-rs/tools/src/tool_spec.rs:60][E: codex-rs/tools/src/tool_spec.rs:64][E: codex-rs/tools/src/tool_spec.rs:66][E: codex-rs/tools/src/tool_spec.rs:67][E: codex-rs/tools/src/tool_spec.rs:68]
- `ConfiguredToolSpec::supports_parallel_tool_calls` 只是模型并行调度的一部分，具体并行执行约束由 tool-router 节点覆盖。[E: codex-rs/tools/src/tool_spec.rs:134][I]
- `web_search` 与 `image_generation` 出现在 tool spec 清单中，不代表 core 有同名 `ToolHandlerKind`；这两个 built-in tool 没有在 plan 中注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:366][E: codex-rs/tools/src/tool_registry_plan.rs:374][I]

## Sources

- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_definition.rs`
- `codex-rs/core/src/tools/spec.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — 模型输出到 handler result 的 T0 走读。
- [Tool router 与并行执行](tool-router.md) — `ToolRouter` 如何把 `ResponseItem` 变成 `ToolCall`。
- [Unified-exec 运行时](unified-exec.md) — `exec_command` / `write_stdin` 共用 handler 的执行面。
