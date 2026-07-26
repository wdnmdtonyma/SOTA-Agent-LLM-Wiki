---
id: subsys.core.tool-router
title: Tool router 与并行执行
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/parallel.rs, codex-rs/core/src/tools/registry.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [ToolRouter, ToolRouterParams, ToolCall, ToolPayload, ToolCallRuntime, ToolExecutor, ToolRouter::build_tool_call]
related: [spine.tool-call-anatomy, spine.extension-system, subsys.core.tool-system, subsys.core.turn-engine, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Current Codex builds the runtime tool surface in `core/src/tools/spec_plan.rs`, stores executable runtimes in `ToolRegistry`, exposes only `model_visible_specs` from `ToolRouter`, and dispatches model `ResponseItem` values as one of three `ToolPayload` shapes: function, tool_search, or custom.[E: codex-rs/core/src/tools/spec_plan.rs:158][E: codex-rs/core/src/tools/router.rs:38][E: codex-rs/core/src/tools/router.rs:87][E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/core/src/tools/router.rs:128]

## 能回答的问题

- `build_tool_router` 现在从哪里装配 specs 与 registry?
- `ToolRouter` 当前保存哪些状态?
- model output 怎样变成 `ToolCall` / `ToolPayload`?
- 并行工具调用在哪里串行化或放行?
- `ToolRegistry` 在 handler 前后统一做哪些 runtime 工作?

## 当前边界

`ToolRouter` 只保存 `ToolRegistry` 和 `model_visible_specs`，`from_context()` 直接委托 `build_tool_router()`；旧版文档里的 `specs`、`parallel_mcp_server_names` 和 `ToolRouter::from_config` 已不是当前结构。[E: codex-rs/core/src/tools/router.rs:38][E: codex-rs/core/src/tools/router.rs:39][E: codex-rs/core/src/tools/router.rs:40][E: codex-rs/core/src/tools/router.rs:64][E: codex-rs/core/src/tools/router.rs:60][E: codex-rs/core/src/tools/router.rs:65]

`build_tool_router()` 调用 `build_tool_specs_and_registry()`，后者把 `ToolRouterParams` 展开成 `CoreToolPlanContext`，依次 `add_tool_sources()`、应用 direct-model-only overrides、追加 tool search executor、预置 code-mode executors，最后生成 model-visible specs 与 registry。[E: codex-rs/core/src/tools/spec_plan.rs:158][E: codex-rs/core/src/tools/spec_plan.rs:165][E: codex-rs/core/src/tools/spec_plan.rs:176][E: codex-rs/core/src/tools/spec_plan.rs:183][E: codex-rs/core/src/tools/spec_plan.rs:205][E: codex-rs/core/src/tools/spec_plan.rs:206][E: codex-rs/core/src/tools/spec_plan.rs:207][E: codex-rs/core/src/tools/spec_plan.rs:208][E: codex-rs/core/src/tools/spec_plan.rs:209][E: codex-rs/core/src/tools/spec_plan.rs:210]

`add_tool_sources()` 是当前工具来源的主索引：shell、MCP resource、core utility、collaboration、MCP runtime、extension、dynamic、hosted model tools 都在这里汇入 planned tools。[E: codex-rs/core/src/tools/spec_plan.rs:608][E: codex-rs/core/src/tools/spec_plan.rs:636][E: codex-rs/core/src/tools/spec_plan.rs:637][E: codex-rs/core/src/tools/spec_plan.rs:638][E: codex-rs/core/src/tools/spec_plan.rs:639][E: codex-rs/core/src/tools/spec_plan.rs:643][E: codex-rs/core/src/tools/spec_plan.rs:644][E: codex-rs/core/src/tools/spec_plan.rs:645]

## 数据模型

`ToolSpec` 是 Responses API tool spec union，当前 variants 是 `Function`、`Namespace`、`ToolSearch`、`WebSearch` 和 `Freeform`；`ImageGeneration` 与 `LocalShell` 都不是 variant。[E: codex-rs/tools/src/tool_spec.rs:19][E: codex-rs/tools/src/tool_spec.rs:21][E: codex-rs/tools/src/tool_spec.rs:23][E: codex-rs/tools/src/tool_spec.rs:25][E: codex-rs/tools/src/tool_spec.rs:37][E: codex-rs/tools/src/tool_spec.rs:52]

`ToolPayload` 是 runtime 接收的 canonical payload union，只有 `Function { arguments }`、`ToolSearch { arguments }`、`Custom { input }` 三种；旧的 MCP 专用 payload variant 不存在于当前 enum。[E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/tools/src/tool_payload.rs:9][E: codex-rs/tools/src/tool_payload.rs:10]

`ToolExecutor` 把 `tool_name()`、`spec()`、`exposure()`、`search_info()`、`supports_parallel_tool_calls()` 和 `handle()` 绑定在同一个 runtime contract 上；`ToolExposure` 明确区分 `Direct`、`Deferred`、`DirectModelOnly` 与 `Hidden`。[E: codex-rs/tools/src/tool_executor.rs:15][E: codex-rs/tools/src/tool_executor.rs:20][E: codex-rs/tools/src/tool_executor.rs:26][E: codex-rs/tools/src/tool_executor.rs:32][E: codex-rs/tools/src/tool_executor.rs:35][E: codex-rs/tools/src/tool_executor.rs:49][E: codex-rs/tools/src/tool_executor.rs:51][E: codex-rs/tools/src/tool_executor.rs:53][E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:59][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:68]

`CoreToolRuntime` 是 core 对 `ToolExecutor<ToolInvocation>` 的扩展点，增加 payload kind matching、runtime-cancellation policy、telemetry tags、hook payload、hook input rewrite 和 streamed argument diff consumer。[E: codex-rs/core/src/tools/registry.rs:52][E: codex-rs/core/src/tools/registry.rs:53][E: codex-rs/core/src/tools/registry.rs:62][E: codex-rs/core/src/tools/registry.rs:66][E: codex-rs/core/src/tools/registry.rs:73][E: codex-rs/core/src/tools/registry.rs:107][E: codex-rs/core/src/tools/registry.rs:122][E: codex-rs/core/src/tools/registry.rs:146]

## 路由与分派

`ToolRouter::build_tool_call()` 把 `ResponseItem::FunctionCall` 转成 namespaced `ToolName` + `ToolPayload::Function`，把 client-side `ToolSearchCall` 转成 plain `tool_search` + `ToolPayload::ToolSearch`，把 `CustomToolCall` 转成 plain name + `ToolPayload::Custom`；server-side tool_search 和其他 response item 返回 `None`。[E: codex-rs/core/src/tools/router.rs:128][E: codex-rs/core/src/tools/router.rs:130][E: codex-rs/core/src/tools/router.rs:137][E: codex-rs/core/src/tools/router.rs:138][E: codex-rs/core/src/tools/router.rs:141][E: codex-rs/core/src/tools/router.rs:144][E: codex-rs/core/src/tools/router.rs:149][E: codex-rs/core/src/tools/router.rs:156][E: codex-rs/core/src/tools/router.rs:159][E: codex-rs/core/src/tools/router.rs:162][E: codex-rs/core/src/tools/router.rs:163][E: codex-rs/core/src/tools/router.rs:169][E: codex-rs/core/src/tools/router.rs:172][E: codex-rs/core/src/tools/router.rs:174]

`ToolRegistry::from_tools()` builds a `HashMap<ToolName, Arc<dyn CoreToolRuntime>>` and rejects duplicate tool names; router parallel/cancellation queries are delegated to registry methods that call each runtime's `supports_parallel_tool_calls()` and `waits_for_runtime_cancellation()`.[E: codex-rs/core/src/tools/registry.rs:326][E: codex-rs/core/src/tools/registry.rs:327][E: codex-rs/core/src/tools/registry.rs:335][E: codex-rs/core/src/tools/registry.rs:336][E: codex-rs/core/src/tools/registry.rs:339][E: codex-rs/core/src/tools/registry.rs:340][E: codex-rs/core/src/tools/registry.rs:341][E: codex-rs/core/src/tools/registry.rs:413][E: codex-rs/core/src/tools/registry.rs:415][E: codex-rs/core/src/tools/registry.rs:418][E: codex-rs/core/src/tools/registry.rs:420]

`ToolCallRuntime` stores a router/session/step_context/tracker plus one `RwLock<()>`; `handle_tool_call_with_source()` asks the router if the call supports parallel execution, takes a read lock for parallel tools and a write lock for non-parallel tools, then calls `dispatch_tool_call_with_terminal_outcome()`.[E: codex-rs/core/src/tools/parallel.rs:41][E: codex-rs/core/src/tools/parallel.rs:42][E: codex-rs/core/src/tools/parallel.rs:43][E: codex-rs/core/src/tools/parallel.rs:46][E: codex-rs/core/src/tools/parallel.rs:48][E: codex-rs/core/src/tools/parallel.rs:93][E: codex-rs/core/src/tools/parallel.rs:100][E: codex-rs/core/src/tools/parallel.rs:133][E: codex-rs/core/src/tools/parallel.rs:134][E: codex-rs/core/src/tools/parallel.rs:136][E: codex-rs/core/src/tools/parallel.rs:144][E: codex-rs/core/src/tools/parallel.rs:145]

`ToolRegistry::dispatch_any_with_terminal_outcome()` increments the active turn tool-call counter before lookup, returns a model-visible unsupported-tool error if no runtime is registered, handles PreToolUse blocking/input rewrite before execution, wraps `handle_any_tool()` in telemetry logging, then runs PostToolUse hooks/additional-context recording and lifecycle finish notification.[E: codex-rs/core/src/tools/registry.rs:427][E: codex-rs/core/src/tools/registry.rs:432][E: codex-rs/core/src/tools/registry.rs:455][E: codex-rs/core/src/tools/registry.rs:459][E: codex-rs/core/src/tools/registry.rs:463][E: codex-rs/core/src/tools/registry.rs:464][E: codex-rs/core/src/tools/registry.rs:467][E: codex-rs/core/src/tools/registry.rs:479][E: codex-rs/core/src/tools/registry.rs:522][E: codex-rs/core/src/tools/registry.rs:527][E: codex-rs/core/src/tools/registry.rs:540][E: codex-rs/core/src/tools/registry.rs:583][E: codex-rs/core/src/tools/registry.rs:594][E: codex-rs/core/src/tools/registry.rs:621][E: codex-rs/core/src/tools/registry.rs:638][E: codex-rs/core/src/tools/registry.rs:663]

## Tool source gates

Shell tools are gated by `tool_environment_mode(context.step_context).has_environment()` and `shell_type_for_model_and_features()`; unified exec registers `exec_command`/`write_stdin` plus a dispatch-only legacy shell handler, while shell-command mode registers `ShellCommandHandler` directly.[E: codex-rs/core/src/tools/spec_plan.rs:666][E: codex-rs/core/src/tools/spec_plan.rs:639][E: codex-rs/core/src/tools/spec_plan.rs:670][E: codex-rs/core/src/tools/spec_plan.rs:683][E: codex-rs/core/src/tools/spec_plan.rs:684][E: codex-rs/core/src/tools/spec_plan.rs:685][E: codex-rs/core/src/tools/spec_plan.rs:694][E: codex-rs/core/src/tools/spec_plan.rs:698][E: codex-rs/core/src/tools/spec_plan.rs:700][E: codex-rs/core/src/tools/spec_plan.rs:704]

MCP resource helpers are added only when the current MCP runtime manager has servers; runtime MCP tools are added from both direct and deferred MCP lists using `McpHandler::new`, with deferred tools marked `ToolExposure::Deferred`.[E: codex-rs/core/src/tools/spec_plan.rs:721][E: codex-rs/core/src/tools/spec_plan.rs:694][E: codex-rs/core/src/tools/spec_plan.rs:724][E: codex-rs/core/src/tools/spec_plan.rs:725][E: codex-rs/core/src/tools/spec_plan.rs:726][E: codex-rs/core/src/tools/spec_plan.rs:919][E: codex-rs/core/src/tools/spec_plan.rs:920][E: codex-rs/core/src/tools/spec_plan.rs:923][E: codex-rs/core/src/tools/spec_plan.rs:932][E: codex-rs/core/src/tools/spec_plan.rs:935]

Core utility gates currently cover plan, wait_for_environment, request_user_input, request_permissions, token-budget helpers, current_time/sleep, tool suggestion/plugin install, apply_patch, test_sync and view_image.[E: codex-rs/core/src/tools/spec_plan.rs:731][E: codex-rs/core/src/tools/spec_plan.rs:737][E: codex-rs/core/src/tools/spec_plan.rs:740][E: codex-rs/core/src/tools/spec_plan.rs:752][E: codex-rs/core/src/tools/spec_plan.rs:761][E: codex-rs/core/src/tools/spec_plan.rs:765][E: codex-rs/core/src/tools/spec_plan.rs:770][E: codex-rs/core/src/tools/spec_plan.rs:778][E: codex-rs/core/src/tools/spec_plan.rs:782][E: codex-rs/core/src/tools/spec_plan.rs:798][E: codex-rs/core/src/tools/spec_plan.rs:804][E: codex-rs/core/src/tools/spec_plan.rs:813]

Collaboration gates switch between MultiAgent V2 handlers (`spawn_agent`/`send_message`/`followup_task`/`wait_agent`/`interrupt_agent`/`list_agents`) and the older V1 handler set。CSV agent-job handlers 已从当前 collaboration source 移除。[E: codex-rs/core/src/tools/spec_plan.rs:825][E: codex-rs/core/src/tools/spec_plan.rs:841][E: codex-rs/core/src/tools/spec_plan.rs:859][E: codex-rs/core/src/tools/spec_plan.rs:876][E: codex-rs/core/src/tools/spec_plan.rs:892][E: codex-rs/core/src/tools/spec_plan.rs:908]

## Gotchas

- MCP direct tools are still represented to the router as function payloads; `McpHandler` is the registered runtime, not a separate MCP-specific payload branch.[E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/core/src/tools/spec_plan.rs:920]
- `model_visible_specs()` returns a clone of only the model-visible surface, not every dispatchable runtime; hidden/dispatch-only runtimes can exist in the registry.[E: codex-rs/core/src/tools/router.rs:87][E: codex-rs/core/src/tools/router.rs:88][E: codex-rs/tools/src/tool_executor.rs:35]
- Parallel safety is runtime-provided via `supports_parallel_tool_calls()` and enforced by one `RwLock` in `ToolCallRuntime`; it is not inferred from tool names in `router.rs`.[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/core/src/tools/parallel.rs:100][E: codex-rs/core/src/tools/parallel.rs:133][E: codex-rs/core/src/tools/parallel.rs:136]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/parallel.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_payload.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [Ext 扩展插件系统](../../spine/extension-system.md)
- [工具系统机制](tool-system.md)
- [Turn 引擎](turn-engine.md)
