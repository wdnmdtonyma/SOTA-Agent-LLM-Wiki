---
id: subsys.core.tool-router
title: Tool router 与并行执行
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/parallel.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/spec.rs]
symbols: [ToolRouter, ToolRouterParams, ToolCall, ToolCallRuntime, ToolRegistry, ToolRegistryBuilder]
related: [spine.tool-call-anatomy, subsys.core.tool-system, subsys.core.turn-engine, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `ToolRouter` 是 Codex core 中把 model `ResponseItem` 归一成 `ToolCall`、选择 `ToolPayload`、判断并行安全、再委托 `ToolRegistry::dispatch_any` 的 runtime 路由层。[E: codex-rs/core/src/tools/router.rs:33][E: codex-rs/core/src/tools/router.rs:178][E: codex-rs/core/src/tools/router.rs:190][E: codex-rs/core/src/tools/router.rs:200][E: codex-rs/core/src/tools/router.rs:219][E: codex-rs/core/src/tools/router.rs:231][E: codex-rs/core/src/tools/router.rs:257][E: codex-rs/core/src/tools/router.rs:167][E: codex-rs/core/src/tools/router.rs:168][E: codex-rs/core/src/tools/router.rs:304]

## 能回答的问题

- `ToolRouter::from_config` 如何从 config/MCP/dynamic tools 生成 registry 与 model-visible specs？
- Function、MCP、ToolSearch、CustomToolCall、LocalShellCall 如何映射为 `ToolPayload`？
- 为什么 namespaced tools 默认不按 `ConfiguredToolSpec.supports_parallel_tool_calls` 判断并行？
- `ToolCallRuntime` 为什么使用 `RwLock` 区分 parallel 和 non-parallel 工具？
- `ToolRegistry::dispatch_any` 在 handler 前后做了哪些统一动作？

## 职责边界

`ToolRouter` 保存 `registry`、完整 `specs`、`model_visible_specs` 和 `parallel_mcp_server_names`，但不直接执行工具逻辑；执行会经由 `ToolRegistry::dispatch_any` 查找 concrete handler 并调用 `handler.handle_any(...)`。[E: codex-rs/core/src/tools/router.rs:39][E: codex-rs/core/src/tools/router.rs:40][E: codex-rs/core/src/tools/router.rs:41][E: codex-rs/core/src/tools/router.rs:42][E: codex-rs/core/src/tools/router.rs:43][E: codex-rs/core/src/tools/router.rs:304][E: codex-rs/core/src/tools/registry.rs:307][E: codex-rs/core/src/tools/registry.rs:381] 因此 `ToolRouter` 是“模型 item 到 handler invocation”的边界，不是每个工具的业务实现。[I]

## 关键 crate/文件

- `codex-rs/core/src/tools/router.rs`: 定义 `ToolCall`、`ToolRouter`、router construction、spec lookup、parallel 判断、model output 到 `ToolPayload` 的映射和 dispatch 入口。[E: codex-rs/core/src/tools/router.rs:33][E: codex-rs/core/src/tools/router.rs:39][E: codex-rs/core/src/tools/router.rs:56][E: codex-rs/core/src/tools/router.rs:111][E: codex-rs/core/src/tools/router.rs:143][E: codex-rs/core/src/tools/router.rs:167][E: codex-rs/core/src/tools/router.rs:178][E: codex-rs/core/src/tools/router.rs:267]
- `codex-rs/core/src/tools/parallel.rs`: 定义 `ToolCallRuntime`，用 `RwLock` 在一个 runtime 实例内串行化 non-parallel tools。[E: codex-rs/core/src/tools/parallel.rs:28][E: codex-rs/core/src/tools/parallel.rs:31][E: codex-rs/core/src/tools/parallel.rs:33][E: codex-rs/core/src/tools/parallel.rs:48][E: codex-rs/core/src/tools/parallel.rs:89][E: codex-rs/core/src/tools/parallel.rs:116][E: codex-rs/core/src/tools/parallel.rs:119]
- `codex-rs/core/src/tools/registry.rs`: 定义 `ToolHandler` trait、`AnyToolResult`、`ToolRegistry` 和 `ToolRegistryBuilder`。[E: codex-rs/core/src/tools/registry.rs:42][E: codex-rs/core/src/tools/registry.rs:106][E: codex-rs/core/src/tools/registry.rs:223][E: codex-rs/core/src/tools/registry.rs:487]

## 数据模型

`ToolCall` 是 router 对 model output 的统一 runtime item，字段是 `tool_name: ToolName`、`call_id: String` 和 `payload: ToolPayload`。[E: codex-rs/core/src/tools/router.rs:33][E: codex-rs/core/src/tools/router.rs:34][E: codex-rs/core/src/tools/router.rs:35][E: codex-rs/core/src/tools/router.rs:36] `ToolRouterParams` 把 MCP tools、deferred MCP tools、unavailable tools、parallel MCP server names、discoverable tools、dynamic tools 传入 `ToolRouter::from_config`。[E: codex-rs/core/src/tools/router.rs:47][E: codex-rs/core/src/tools/router.rs:48][E: codex-rs/core/src/tools/router.rs:49][E: codex-rs/core/src/tools/router.rs:50][E: codex-rs/core/src/tools/router.rs:51][E: codex-rs/core/src/tools/router.rs:52][E: codex-rs/core/src/tools/router.rs:56][E: codex-rs/core/src/tools/router.rs:57]

`ToolHandler` trait 暴露 `kind`、`matches_kind`、`is_mutating`、pre/post hook payload、diff consumer 和 `handle`；默认 `is_mutating` 的注释要求不确定时保守返回 true，runtime 会据此等待 turn tool gate。[E: codex-rs/core/src/tools/registry.rs:45][E: codex-rs/core/src/tools/registry.rs:47][E: codex-rs/core/src/tools/registry.rs:58][E: codex-rs/core/src/tools/registry.rs:59][E: codex-rs/core/src/tools/registry.rs:67][E: codex-rs/core/src/tools/registry.rs:71][E: codex-rs/core/src/tools/registry.rs:81][E: codex-rs/core/src/tools/registry.rs:87][E: codex-rs/core/src/tools/registry.rs:359][E: codex-rs/core/src/tools/registry.rs:376][E: codex-rs/core/src/tools/registry.rs:378]

## 控制流

1. `ToolRouter::from_config` 调用 `build_specs_with_discoverable_tools`，得到 specs 与 registry builder，然后 `builder.build()` 生成 `ToolRegistry`。[E: codex-rs/core/src/tools/router.rs:56][E: codex-rs/core/src/tools/router.rs:65][E: codex-rs/core/src/tools/router.rs:73]
2. `ToolRouter::from_config` 在 `config.code_mode_only_enabled` 为 true 时从 `model_visible_specs` 中排除 code-mode nested tools，否则完整 clone specs 给 `model_visible_specs`。[E: codex-rs/core/src/tools/router.rs:74][E: codex-rs/core/src/tools/router.rs:78][E: codex-rs/core/src/tools/router.rs:79][E: codex-rs/core/src/tools/router.rs:81][E: codex-rs/core/src/tools/router.rs:86][E: codex-rs/core/src/tools/router.rs:88]
3. `find_spec` 能查 `ToolSpec::Function`、`ToolSpec::Freeform` 和 `ToolSpec::Namespace`；其他 `ToolSpec` 变体在这个按 name 查找函数中返回 None。[E: codex-rs/core/src/tools/router.rs:111][E: codex-rs/core/src/tools/router.rs:113][E: codex-rs/core/src/tools/router.rs:118][E: codex-rs/core/src/tools/router.rs:123][E: codex-rs/core/src/tools/router.rs:128][E: codex-rs/core/src/tools/router.rs:132][I]
4. `configured_tool_supports_parallel` 对 namespaced tool name 直接返回 false，非 namespaced function/freeform 才会扫描 configured specs 的 `supports_parallel_tool_calls`。[E: codex-rs/core/src/tools/router.rs:143][E: codex-rs/core/src/tools/router.rs:144][E: codex-rs/core/src/tools/router.rs:145][E: codex-rs/core/src/tools/router.rs:148][E: codex-rs/core/src/tools/router.rs:150][E: codex-rs/core/src/tools/router.rs:152][E: codex-rs/core/src/tools/router.rs:153]
5. `tool_supports_parallel` 对 MCP payload 使用 `parallel_mcp_server_names.contains(server)`；非 MCP payload 才落到 configured tool support 判断。[E: codex-rs/core/src/tools/router.rs:167][E: codex-rs/core/src/tools/router.rs:168]
6. `build_tool_call` 遇到 `ResponseItem::FunctionCall` 时创建 `ToolName`；如果 `session.resolve_mcp_tool_info(&tool_name)` 命中，payload 变成 `ToolPayload::Mcp`，否则 payload 是 `ToolPayload::Function { arguments }`。[E: codex-rs/core/src/tools/router.rs:178][E: codex-rs/core/src/tools/router.rs:185][E: codex-rs/core/src/tools/router.rs:186][E: codex-rs/core/src/tools/router.rs:190][E: codex-rs/core/src/tools/router.rs:200]
7. `build_tool_call` 只接受 `execution == "client"` 的 `ToolSearchCall`，解析成功后生成 `ToolPayload::ToolSearch`；其他 tool search call 被忽略。[E: codex-rs/core/src/tools/router.rs:204][E: codex-rs/core/src/tools/router.rs:209][E: codex-rs/core/src/tools/router.rs:210][E: codex-rs/core/src/tools/router.rs:215][E: codex-rs/core/src/tools/router.rs:217][E: codex-rs/core/src/tools/router.rs:219][E: codex-rs/core/src/tools/router.rs:222]
8. `build_tool_call` 把 `CustomToolCall` 映射为 `ToolPayload::Custom`，把 `LocalShellCall` 的 `action` 解析成 `ShellToolCallParams` 后映射为 `ToolPayload::LocalShell`。[E: codex-rs/core/src/tools/router.rs:223][E: codex-rs/core/src/tools/router.rs:229][E: codex-rs/core/src/tools/router.rs:231][E: codex-rs/core/src/tools/router.rs:233][E: codex-rs/core/src/tools/router.rs:243][E: codex-rs/core/src/tools/router.rs:245][E: codex-rs/core/src/tools/router.rs:254][E: codex-rs/core/src/tools/router.rs:257]
9. `ToolCallRuntime::handle_tool_call_with_source` 根据 `router.tool_supports_parallel(&call)` 选择 read guard 或 write guard；read guard 允许多个 parallel tools 同时运行，write guard 让 non-parallel tool 独占。[E: codex-rs/core/src/tools/parallel.rs:89][E: codex-rs/core/src/tools/parallel.rs:117][E: codex-rs/core/src/tools/parallel.rs:119]
10. `dispatch_tool_call_with_code_mode_result` 组装 `ToolInvocation`，随后调用 `registry.dispatch_any(invocation).await`。[E: codex-rs/core/src/tools/router.rs:294][E: codex-rs/core/src/tools/router.rs:304]
11. `ToolRegistry::dispatch_any` 在查 handler 前增加 active turn 的 `tool_calls` 计数；找不到 handler 时返回 model-visible error，payload kind 不匹配时返回 fatal。[E: codex-rs/core/src/tools/registry.rs:303][E: codex-rs/core/src/tools/registry.rs:307][E: codex-rs/core/src/tools/registry.rs:322][E: codex-rs/core/src/tools/registry.rs:326][E: codex-rs/core/src/tools/registry.rs:339]
12. `ToolRegistry::dispatch_any` 在 handler 前运行 PreToolUse hooks；mutating handler 等待 `turn.tool_call_gate.wait_ready()`；`success_for_logging()` 为 true 时才构造 PostToolUse payload，随后运行 PostToolUse 与 legacy AfterToolUse hooks。[E: codex-rs/core/src/tools/registry.rs:343][E: codex-rs/core/src/tools/registry.rs:359][E: codex-rs/core/src/tools/registry.rs:376][E: codex-rs/core/src/tools/registry.rs:378][E: codex-rs/core/src/tools/registry.rs:381][E: codex-rs/core/src/tools/registry.rs:384][E: codex-rs/core/src/tools/registry.rs:401][E: codex-rs/core/src/tools/registry.rs:415][E: codex-rs/core/src/tools/registry.rs:430]

## 设计动机与权衡

namespaced tools 不直接信任 configured function spec 的 parallel 标记，是因为 MCP parallel 能力按 server 粒度来自 `parallel_mcp_server_names`，而不是单个 namespaced tool spec。[E: codex-rs/core/src/tools/router.rs:145][E: codex-rs/core/src/tools/router.rs:167][I]

`ToolCallRuntime` 用一个 `RwLock<()>` 表达“parallel 可以共享、non-parallel 必须独占”的调度策略，避免每个 handler 自己实现跨工具互斥。[E: codex-rs/core/src/tools/parallel.rs:33][E: codex-rs/core/src/tools/parallel.rs:117][E: codex-rs/core/src/tools/parallel.rs:119][I]

router 把 FunctionCall 的 MCP 解析放在 `session.resolve_mcp_tool_info` 命中分支中，说明 MCP direct tools 在 model 层仍以 function-like item 出现，但 runtime payload 会被转成 `ToolPayload::Mcp`。[E: codex-rs/core/src/tools/router.rs:178][E: codex-rs/core/src/tools/router.rs:186][E: codex-rs/core/src/tools/router.rs:190][I]

## gotcha

- `model_visible_specs()` 可能不是 `specs()` 的完整集合；`code_mode_only_enabled` 会从 model-visible list 中排除 code-mode nested tools。[E: codex-rs/core/src/tools/router.rs:74][E: codex-rs/core/src/tools/router.rs:78][E: codex-rs/core/src/tools/router.rs:81][E: codex-rs/core/src/tools/router.rs:108]
- `ToolSearchCall` 只有 `execution == "client"` 时才变成 `ToolCall`；server-side tool search output 不会走 client handler。[E: codex-rs/core/src/tools/router.rs:204][E: codex-rs/core/src/tools/router.rs:209][E: codex-rs/core/src/tools/router.rs:216][E: codex-rs/core/src/tools/router.rs:219][E: codex-rs/core/src/tools/router.rs:222]
- `ToolRegistry::dispatch_any` 不是单纯调用 handler；它还负责 hooks、mutating gate、telemetry、additional context 和 output replacement。[E: codex-rs/core/src/tools/registry.rs:343][E: codex-rs/core/src/tools/registry.rs:365][E: codex-rs/core/src/tools/registry.rs:376][E: codex-rs/core/src/tools/registry.rs:378][E: codex-rs/core/src/tools/registry.rs:415][E: codex-rs/core/src/tools/registry.rs:430][E: codex-rs/core/src/tools/registry.rs:445][E: codex-rs/core/src/tools/registry.rs:466]

## Sources

- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/parallel.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/spec.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — T0 级端到端工具调用路径。
- [工具系统机制](tool-system.md) — `ToolSpec` 与 `ToolHandlerKind` 的装配源头。
- [Turn 引擎](turn-engine.md) — sampling loop 如何产生并 drain in-flight tool futures。
