---
id: subsys.core.tool-system
title: 工具系统机制
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/router.rs, codex-rs/tools/src/tool_spec.rs]
symbols: [build_tool_router, PlannedTools, CoreToolRuntime, ToolRegistry, ToolRouter, ToolSpec, ToolExposure]
related: [spine.tool-call-anatomy, subsys.core.tool-router, subsys.core.unified-exec, tool.exec-command, tool.tool-search, tool.web-search, tool.image-generation]
evidence: explicit
status: verified
updated: db887d03e1
---

> 当前工具系统的 ground truth 是 `codex-rs/core/src/tools/spec_plan.rs`：`build_tool_router` 同时产出 model-visible `ToolSpec` 列表和本地 `ToolRegistry`，再交给 `ToolRouter::from_parts`。[E: codex-rs/core/src/tools/spec_plan.rs:160][E: codex-rs/core/src/tools/spec_plan.rs:167]

## 能回答的问题

- 当前工具清单从哪里组装？
- `ToolSpec`、`CoreToolRuntime`、`ToolRegistry`、`ToolRouter` 的边界是什么？
- hosted `web_search` / `image_generation` 为什么没有本地 handler？
- `exec_command` / `write_stdin` 如何由 shell type 注册？
- parallel、hidden/direct exposure、dispatch registry 分别在哪里生效？

## 1 核心对象

| 对象 | 职责 | 证据 |
|---|---|---|
| `ToolSpec` | Responses API 可见的 schema 形态，包含 Function、Namespace、ToolSearch、ImageGeneration、WebSearch、Freeform。 | enum 使用 `#[serde(tag = "type")]` 并列出这些变体。[E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:52] |
| `CoreToolRuntime` | 本地执行工具的 typed runtime contract，扩展 `ToolExecutor<ToolInvocation>`，并提供 hooks、telemetry、diff、cancellation 等 core metadata。 | trait 定义在 `registry.rs`。[E: codex-rs/core/src/tools/registry.rs:48] |
| `PlannedTools` | 计划阶段的中间容器，分开保存本地 `runtimes` 和 hosted-only `hosted_specs`。 | struct 字段为 `runtimes` 与 `hosted_specs`。[E: codex-rs/core/src/tools/spec_plan.rs:105][E: codex-rs/core/src/tools/spec_plan.rs:108] |
| `ToolRegistry` | runtime dispatch map，按 `ToolName` 保存 `Arc<dyn CoreToolRuntime>`。 | `ToolRegistry` 包含 `HashMap<ToolName, Arc<dyn CoreToolRuntime>>`，`from_tools` 去重写入 map。[E: codex-rs/core/src/tools/registry.rs:322][E: codex-rs/core/src/tools/registry.rs:342] |
| `ToolRouter` | 组合 runtime registry 与 model-visible specs，并负责 dispatch tool call。 | `ToolRouter` 字段是 `registry` 和 `model_visible_specs`，`from_context` 调 `build_tool_router`。[E: codex-rs/core/src/tools/router.rs:35][E: codex-rs/core/src/tools/router.rs:61][E: codex-rs/core/src/tools/router.rs:66] |

## 2 组装流程

`ToolRouter::from_context` 调 `spec_plan::build_tool_router`；`build_tool_router` 调 `build_tool_specs_and_registry` 得到 `(model_visible_specs, registry)` 后构造 router。[E: codex-rs/core/src/tools/router.rs:61][E: codex-rs/core/src/tools/router.rs:66][E: codex-rs/core/src/tools/spec_plan.rs:160][E: codex-rs/core/src/tools/spec_plan.rs:167]

`build_tool_specs_and_registry` 把 MCP、deferred MCP、tool suggest、extension executors、dynamic tools 和 tool-search cache 收进 `CoreToolPlanContext`，再按顺序调用 `add_tool_sources`、direct-only namespace override、append tool_search executor、prepend code-mode executors。[E: codex-rs/core/src/tools/spec_plan.rs:171][E: codex-rs/core/src/tools/spec_plan.rs:202]

`add_tool_sources` 当前顺序是 shell tools、MCP resource tools、core utility tools、collaboration tools、MCP runtime tools、extension tools、dynamic tools，最后追加 hosted model tool specs。[E: codex-rs/core/src/tools/spec_plan.rs:613][E: codex-rs/core/src/tools/spec_plan.rs:622]

`build_model_visible_specs_and_registry` 遍历 runtime tools：只有 direct exposure 且未被 code-mode-only 隐藏的 runtime 会贡献 model-visible spec；hosted specs 直接追加到 specs；registry 只由 runtimes 构造。[E: codex-rs/core/src/tools/spec_plan.rs:245][E: codex-rs/core/src/tools/spec_plan.rs:264]

## 3 Source Families

| family | 当前入口 | 关键行为 |
|---|---|---|
| shell / unified exec | `add_shell_tools` | 有 environment 才注册；`ConfigShellToolType::UnifiedExec` 添加 `ExecCommandHandler` 和 `WriteStdinHandler`，并 hidden 注册 legacy `ShellCommandHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:641][E: codex-rs/core/src/tools/spec_plan.rs:673] |
| core utility | `add_core_utility_tools` | 无条件加 `PlanHandler`；feature/config/model metadata gate 决定 wait_for_environment、request_user_input、request_permissions、token budget、current_time/sleep、plugin install、apply_patch、test_sync、view_image 等。[E: codex-rs/core/src/tools/spec_plan.rs:708][E: codex-rs/core/src/tools/spec_plan.rs:713][E: codex-rs/core/src/tools/spec_plan.rs:715][E: codex-rs/core/src/tools/spec_plan.rs:719][E: codex-rs/core/src/tools/spec_plan.rs:728][E: codex-rs/core/src/tools/spec_plan.rs:732][E: codex-rs/core/src/tools/spec_plan.rs:737][E: codex-rs/core/src/tools/spec_plan.rs:745][E: codex-rs/core/src/tools/spec_plan.rs:749][E: codex-rs/core/src/tools/spec_plan.rs:765][E: codex-rs/core/src/tools/spec_plan.rs:771][E: codex-rs/core/src/tools/spec_plan.rs:780] |
| hosted tools | `hosted_model_tool_specs` | hosted `web_search`/`image_generation` 是 `hosted_specs`，不进入 runtime registry。[E: codex-rs/core/src/tools/spec_plan.rs:294][E: codex-rs/core/src/tools/spec_plan.rs:328] |
| extension tools | `add_extension_tools` | `web.run` 与 `image_gen.imagegen` 会按 standalone/web-search/image-generation gates 被跳过或注册为 `ExtensionToolAdapter`。[E: codex-rs/core/src/tools/spec_plan.rs:1024][E: codex-rs/core/src/tools/spec_plan.rs:1043] |
| dynamic tools | `add_dynamic_tools` | dynamic specs 来自 `CoreToolPlanContext.dynamic_tools` 并进入 tool source pipeline。[E: codex-rs/core/src/tools/spec_plan.rs:153][E: codex-rs/core/src/tools/spec_plan.rs:620][E: codex-rs/core/src/tools/spec_plan.rs:916][E: codex-rs/core/src/tools/spec_plan.rs:929] |

## 4 Runtime Semantics

`ToolRegistry::from_tools` 用 `ToolName` 去重；重复注册会走 `error_or_panic` 并跳过后者。[E: codex-rs/core/src/tools/registry.rs:332][E: codex-rs/core/src/tools/registry.rs:342]

parallel-safe 由 runtime 的 `supports_parallel_tool_calls()` 提供；通过 `override_tool_exposure(..., ToolExposure::Hidden)` 包装的 runtime 会把 parallel support 强制为 false，普通 registry 查询仍委托 runtime。[E: codex-rs/core/src/tools/registry.rs:267][E: codex-rs/core/src/tools/registry.rs:268][E: codex-rs/core/src/tools/registry.rs:382][E: codex-rs/core/src/tools/registry.rs:384][E: codex-rs/core/src/tools/router.rs:100]

dispatch 阶段，`ToolRouter` 把 `ToolCall` 包成 `ToolInvocation`，然后调用 registry 的 `dispatch_any_with_terminal_outcome`。[E: codex-rs/core/src/tools/router.rs:221][E: codex-rs/core/src/tools/router.rs:243]

hosted Responses tools 是 model-visible spec，不是本地 runtime：`hosted_specs` 直接 `specs.extend(...)`，而 `ToolRegistry::from_tools(runtimes)` 只看 runtime list。[E: codex-rs/core/src/tools/spec_plan.rs:262][E: codex-rs/core/src/tools/spec_plan.rs:264]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/tools/src/tool_spec.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [Tool router 与并行执行](tool-router.md)
- [Unified Exec](unified-exec.md)
- [exec_command 工具](../../surface/tools/exec-command.md)
