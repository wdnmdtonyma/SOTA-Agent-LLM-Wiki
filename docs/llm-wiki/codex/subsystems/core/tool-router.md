---
id: subsys.core.tool-router
title: Tool router 与并行执行
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/parallel.rs, codex-rs/core/src/tools/registry.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [ToolRouter, ToolRouterParams, ToolCall, ToolPayload, ToolCallRuntime, ToolRegistry, CoreToolRuntime, ToolExecutor, ToolExposure, build_tool_router, add_tool_sources]
related: [spine.tool-call-anatomy, spine.extension-system, subsys.core.tool-system, subsys.core.turn-engine, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 5670360009
---

> Current Codex builds the runtime tool surface in `core/src/tools/spec_plan.rs`, stores executable runtimes in `ToolRegistry`, exposes only `model_visible_specs` from `ToolRouter`, and dispatches model `ResponseItem` values as one of three `ToolPayload` shapes: function, tool_search, or custom.[E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/tools/router.rs:35][E: codex-rs/core/src/tools/router.rs:76][E: codex-rs/tools/src/tool_payload.rs:5][E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/core/src/tools/router.rs:113]

## 能回答的问题

- `build_tool_router` 现在从哪里装配 specs 与 registry?
- `ToolRouter` 当前保存哪些状态?
- model output 怎样变成 `ToolCall` / `ToolPayload`?
- 并行工具调用在哪里串行化或放行?
- `ToolRegistry` 在 handler 前后统一做哪些 runtime 工作?

## 当前边界

`ToolRouter` 只保存 `ToolRegistry` 和 `model_visible_specs`，`from_turn_context()` 直接委托 `build_tool_router()`；旧版文档里的 `specs`、`parallel_mcp_server_names` 和 `ToolRouter::from_config` 已不是当前结构。[E: codex-rs/core/src/tools/router.rs:35][E: codex-rs/core/src/tools/router.rs:36][E: codex-rs/core/src/tools/router.rs:37][E: codex-rs/core/src/tools/router.rs:60][E: codex-rs/core/src/tools/router.rs:61][E: codex-rs/core/src/tools/router.rs:66]

`build_tool_router()` 调用 `build_tool_specs_and_registry()`，后者把 `ToolRouterParams` 展开成 `CoreToolPlanContext`，依次 `add_tool_sources()`、应用 direct-model-only overrides、追加 tool search executor、预置 code-mode executors，最后生成 model-visible specs 与 registry。[E: codex-rs/core/src/tools/spec_plan.rs:157][E: codex-rs/core/src/tools/spec_plan.rs:162][E: codex-rs/core/src/tools/spec_plan.rs:168][E: codex-rs/core/src/tools/spec_plan.rs:173][E: codex-rs/core/src/tools/spec_plan.rs:193][E: codex-rs/core/src/tools/spec_plan.rs:194][E: codex-rs/core/src/tools/spec_plan.rs:195][E: codex-rs/core/src/tools/spec_plan.rs:196][E: codex-rs/core/src/tools/spec_plan.rs:197][E: codex-rs/core/src/tools/spec_plan.rs:198]

`add_tool_sources()` 是当前工具来源的主索引：shell、MCP resource、core utility、collaboration、MCP runtime、extension、dynamic、hosted model tools 都在这里汇入 planned tools。[E: codex-rs/core/src/tools/spec_plan.rs:604][E: codex-rs/core/src/tools/spec_plan.rs:605][E: codex-rs/core/src/tools/spec_plan.rs:606][E: codex-rs/core/src/tools/spec_plan.rs:607][E: codex-rs/core/src/tools/spec_plan.rs:608][E: codex-rs/core/src/tools/spec_plan.rs:609][E: codex-rs/core/src/tools/spec_plan.rs:610][E: codex-rs/core/src/tools/spec_plan.rs:611][E: codex-rs/core/src/tools/spec_plan.rs:612]

## 数据模型

`ToolSpec` 是 Responses API tool spec union，当前 variants 是 `Function`、`Namespace`、`ToolSearch`、`ImageGeneration`、`WebSearch` 和 `Freeform`；没有 `LocalShell` variant。[E: codex-rs/tools/src/tool_spec.rs:13][E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:19][E: codex-rs/tools/src/tool_spec.rs:21][E: codex-rs/tools/src/tool_spec.rs:23][E: codex-rs/tools/src/tool_spec.rs:29][E: codex-rs/tools/src/tool_spec.rs:37][E: codex-rs/tools/src/tool_spec.rs:50]

`ToolPayload` 是 runtime 接收的 canonical payload union，只有 `Function { arguments }`、`ToolSearch { arguments }`、`Custom { input }` 三种；旧的 MCP 专用 payload variant 不存在于当前 enum。[E: codex-rs/tools/src/tool_payload.rs:5][E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/tools/src/tool_payload.rs:9][E: codex-rs/tools/src/tool_payload.rs:10]

`ToolExecutor` 把 `tool_name()`、`spec()`、`exposure()`、`search_info()`、`supports_parallel_tool_calls()` 和 `handle()` 绑定在同一个 runtime contract 上；`ToolExposure` 明确区分 `Direct`、`Deferred`、`DirectModelOnly` 与 `Hidden`。[E: codex-rs/tools/src/tool_executor.rs:13][E: codex-rs/tools/src/tool_executor.rs:15][E: codex-rs/tools/src/tool_executor.rs:20][E: codex-rs/tools/src/tool_executor.rs:26][E: codex-rs/tools/src/tool_executor.rs:32][E: codex-rs/tools/src/tool_executor.rs:35][E: codex-rs/tools/src/tool_executor.rs:44][E: codex-rs/tools/src/tool_executor.rs:49][E: codex-rs/tools/src/tool_executor.rs:51][E: codex-rs/tools/src/tool_executor.rs:53][E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:59][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:68]

`CoreToolRuntime` 是 core 对 `ToolExecutor<ToolInvocation>` 的扩展点，增加 payload kind matching、runtime-cancellation policy、telemetry tags、hook payload、hook input rewrite 和 streamed argument diff consumer。[E: codex-rs/core/src/tools/registry.rs:44][E: codex-rs/core/src/tools/registry.rs:48][E: codex-rs/core/src/tools/registry.rs:49][E: codex-rs/core/src/tools/registry.rs:56][E: codex-rs/core/src/tools/registry.rs:58][E: codex-rs/core/src/tools/registry.rs:62][E: codex-rs/core/src/tools/registry.rs:69][E: codex-rs/core/src/tools/registry.rs:103][E: codex-rs/core/src/tools/registry.rs:118][E: codex-rs/core/src/tools/registry.rs:142]

## 路由与分派

`ToolRouter::build_tool_call()` 把 `ResponseItem::FunctionCall` 转成 namespaced `ToolName` + `ToolPayload::Function`，把 client-side `ToolSearchCall` 转成 plain `tool_search` + `ToolPayload::ToolSearch`，把 `CustomToolCall` 转成 plain name + `ToolPayload::Custom`；server-side tool_search 和其他 response item 返回 `None`。[E: codex-rs/core/src/tools/router.rs:113][E: codex-rs/core/src/tools/router.rs:115][E: codex-rs/core/src/tools/router.rs:122][E: codex-rs/core/src/tools/router.rs:123][E: codex-rs/core/src/tools/router.rs:126][E: codex-rs/core/src/tools/router.rs:129][E: codex-rs/core/src/tools/router.rs:134][E: codex-rs/core/src/tools/router.rs:141][E: codex-rs/core/src/tools/router.rs:144][E: codex-rs/core/src/tools/router.rs:147][E: codex-rs/core/src/tools/router.rs:148][E: codex-rs/core/src/tools/router.rs:153][E: codex-rs/core/src/tools/router.rs:156][E: codex-rs/core/src/tools/router.rs:158]

`ToolRegistry::from_tools()` builds a `HashMap<ToolName, Arc<dyn CoreToolRuntime>>` and rejects duplicate tool names; router parallel/cancellation queries are delegated to registry methods that call each runtime's `supports_parallel_tool_calls()` and `waits_for_runtime_cancellation()`.[E: codex-rs/core/src/tools/registry.rs:322][E: codex-rs/core/src/tools/registry.rs:323][E: codex-rs/core/src/tools/registry.rs:331][E: codex-rs/core/src/tools/registry.rs:332][E: codex-rs/core/src/tools/registry.rs:335][E: codex-rs/core/src/tools/registry.rs:336][E: codex-rs/core/src/tools/registry.rs:337][E: codex-rs/core/src/tools/registry.rs:382][E: codex-rs/core/src/tools/registry.rs:384][E: codex-rs/core/src/tools/registry.rs:387][E: codex-rs/core/src/tools/registry.rs:389]

`ToolCallRuntime` stores a router/session/turn/tracker plus one `RwLock<()>`; `handle_tool_call_with_source()` asks the router if the call supports parallel execution, takes a read lock for parallel tools and a write lock for non-parallel tools, then calls `dispatch_tool_call_with_terminal_outcome()`.[E: codex-rs/core/src/tools/parallel.rs:30][E: codex-rs/core/src/tools/parallel.rs:31][E: codex-rs/core/src/tools/parallel.rs:32][E: codex-rs/core/src/tools/parallel.rs:36][E: codex-rs/core/src/tools/parallel.rs:81][E: codex-rs/core/src/tools/parallel.rs:88][E: codex-rs/core/src/tools/parallel.rs:115][E: codex-rs/core/src/tools/parallel.rs:116][E: codex-rs/core/src/tools/parallel.rs:118][E: codex-rs/core/src/tools/parallel.rs:121][E: codex-rs/core/src/tools/parallel.rs:122]

`ToolRegistry::dispatch_any_with_terminal_outcome()` increments the active turn tool-call counter before lookup, returns a model-visible unsupported-tool error if no runtime is registered, handles PreToolUse blocking/input rewrite before execution, wraps `handle_any_tool()` in telemetry logging, then runs PostToolUse hooks/additional-context recording and lifecycle finish notification.[E: codex-rs/core/src/tools/registry.rs:405][E: codex-rs/core/src/tools/registry.rs:410][E: codex-rs/core/src/tools/registry.rs:433][E: codex-rs/core/src/tools/registry.rs:437][E: codex-rs/core/src/tools/registry.rs:441][E: codex-rs/core/src/tools/registry.rs:442][E: codex-rs/core/src/tools/registry.rs:445][E: codex-rs/core/src/tools/registry.rs:457][E: codex-rs/core/src/tools/registry.rs:500][E: codex-rs/core/src/tools/registry.rs:505][E: codex-rs/core/src/tools/registry.rs:518][E: codex-rs/core/src/tools/registry.rs:545][E: codex-rs/core/src/tools/registry.rs:556][E: codex-rs/core/src/tools/registry.rs:583][E: codex-rs/core/src/tools/registry.rs:600][E: codex-rs/core/src/tools/registry.rs:625]

## Tool source gates

Shell tools are gated by `tool_environment_mode().has_environment()` and `shell_type_for_model_and_features()`; unified exec registers `exec_command`/`write_stdin` plus a dispatch-only legacy shell handler, while shell-command mode registers `ShellCommandHandler` directly.[E: codex-rs/core/src/tools/spec_plan.rs:628][E: codex-rs/core/src/tools/spec_plan.rs:631][E: codex-rs/core/src/tools/spec_plan.rs:632][E: codex-rs/core/src/tools/spec_plan.rs:645][E: codex-rs/core/src/tools/spec_plan.rs:646][E: codex-rs/core/src/tools/spec_plan.rs:647][E: codex-rs/core/src/tools/spec_plan.rs:653][E: codex-rs/core/src/tools/spec_plan.rs:655][E: codex-rs/core/src/tools/spec_plan.rs:657][E: codex-rs/core/src/tools/spec_plan.rs:659][E: codex-rs/core/src/tools/spec_plan.rs:663]

MCP resource helpers are added only when `mcp_tools` is present; runtime MCP tools are added from both direct and deferred MCP lists using `McpHandler::new`, with deferred tools marked `ToolExposure::Deferred`.[E: codex-rs/core/src/tools/spec_plan.rs:679][E: codex-rs/core/src/tools/spec_plan.rs:681][E: codex-rs/core/src/tools/spec_plan.rs:682][E: codex-rs/core/src/tools/spec_plan.rs:683][E: codex-rs/core/src/tools/spec_plan.rs:684][E: codex-rs/core/src/tools/spec_plan.rs:857][E: codex-rs/core/src/tools/spec_plan.rs:858][E: codex-rs/core/src/tools/spec_plan.rs:860][E: codex-rs/core/src/tools/spec_plan.rs:861][E: codex-rs/core/src/tools/spec_plan.rs:870][E: codex-rs/core/src/tools/spec_plan.rs:872][E: codex-rs/core/src/tools/spec_plan.rs:873]

Core utility gates currently cover plan, request_user_input, request_permissions, token-budget helpers, sleep, tool suggestion/plugin install, apply_patch, test_sync and view_image.[E: codex-rs/core/src/tools/spec_plan.rs:689][E: codex-rs/core/src/tools/spec_plan.rs:694][E: codex-rs/core/src/tools/spec_plan.rs:696][E: codex-rs/core/src/tools/spec_plan.rs:705][E: codex-rs/core/src/tools/spec_plan.rs:709][E: codex-rs/core/src/tools/spec_plan.rs:714][E: codex-rs/core/src/tools/spec_plan.rs:718][E: codex-rs/core/src/tools/spec_plan.rs:734][E: codex-rs/core/src/tools/spec_plan.rs:740][E: codex-rs/core/src/tools/spec_plan.rs:749]

Collaboration gates switch between MultiAgent V2 handlers (`spawn_agent`/`send_message`/`followup_task`/`wait_agent`/`interrupt_agent`/`list_agents`) and the older V1 handler set; agent-jobs tools are added by the same collaboration source function.[E: codex-rs/core/src/tools/spec_plan.rs:761][E: codex-rs/core/src/tools/spec_plan.rs:763][E: codex-rs/core/src/tools/spec_plan.rs:764][E: codex-rs/core/src/tools/spec_plan.rs:775][E: codex-rs/core/src/tools/spec_plan.rs:791][E: codex-rs/core/src/tools/spec_plan.rs:795][E: codex-rs/core/src/tools/spec_plan.rs:799][E: codex-rs/core/src/tools/spec_plan.rs:806][E: codex-rs/core/src/tools/spec_plan.rs:810][E: codex-rs/core/src/tools/spec_plan.rs:823][E: codex-rs/core/src/tools/spec_plan.rs:833][E: codex-rs/core/src/tools/spec_plan.rs:837][E: codex-rs/core/src/tools/spec_plan.rs:841]

## Gotchas

- MCP direct tools are still represented to the router as function payloads; `McpHandler` is the registered runtime, not a separate MCP-specific payload branch.[E: codex-rs/tools/src/tool_payload.rs:7][E: codex-rs/tools/src/tool_payload.rs:8][E: codex-rs/core/src/tools/spec_plan.rs:858][E: codex-rs/core/src/tools/spec_plan.rs:860]
- `model_visible_specs()` returns a clone of only the model-visible surface, not every dispatchable runtime; hidden/dispatch-only runtimes can exist in the registry.[E: codex-rs/core/src/tools/router.rs:76][E: codex-rs/core/src/tools/router.rs:77][E: codex-rs/tools/src/tool_executor.rs:34][E: codex-rs/tools/src/tool_executor.rs:35][E: codex-rs/core/src/tools/spec_plan.rs:655]
- Parallel safety is runtime-provided via `supports_parallel_tool_calls()` and enforced by one `RwLock` in `ToolCallRuntime`; it is not inferred from tool names in `router.rs`.[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/core/src/tools/parallel.rs:88][E: codex-rs/core/src/tools/parallel.rs:115][E: codex-rs/core/src/tools/parallel.rs:118]

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
