---
id: subsys.core.tool-router
title: Tool router 与并行执行
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/parallel.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/session/step_context.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_payload.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [ToolRouter, ToolCall, ToolCallRuntime, ToolRegistry, RegisteredTool, build_tool_router, finalize_tool_router, build_model_visible_specs, register_code_mode_executors]
related: [spine.tool-call-anatomy, spine.extension-system, subsys.core.tool-system, subsys.core.turn-engine, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> 当前 `build_tool_router` 先把 core、MCP、extension、dynamic runtimes 装进 `ToolRegistry`，同时单独收集 hosted specs；`finalize_tool_router` 再做最终 exposure 覆盖、`tool_search` 与 code-mode 注册，并把 hosted specs 追加到 model-visible surface。最终 router 挂在请求级 `StepContext` 上，执行期不会另存一份 router。[E: codex-rs/core/src/tools/spec_plan.rs:126][E: codex-rs/core/src/tools/spec_plan.rs:154][E: codex-rs/core/src/tools/spec_plan.rs:159][E: codex-rs/core/src/tools/spec_plan.rs:188][E: codex-rs/core/src/tools/spec_plan.rs:531][E: codex-rs/core/src/session/step_context.rs:18][E: codex-rs/core/src/session/step_context.rs:34][E: codex-rs/core/src/tools/parallel.rs:44]

## 能回答的问题

- 工具 runtime、hosted spec 与 model-visible spec 如何汇合？
- direct、deferred、direct-model-only、hidden exposure 在哪里兑现？
- model output 如何归一为 `ToolCall`？
- readiness、parallel gate 与 dispatch 的顺序是什么？
- `send_message_to_user_async` 与 `request_user_input_async` 如何进入 registry？旧名 `send_user_message_async` 指向谁？

## 装配与 finalize

`build_tool_router` 直接创建 `ToolRegistry`，先调用 `add_core_tool_sources`，然后依次注册 MCP、extension、dynamic runtimes；`hosted_model_tool_specs` 的返回值保留为独立 `Vec<ToolSpec>`，最后与 registry 一起传给 `finalize_tool_router`。旧的 `PlannedTools`、`build_tool_specs_and_registry`、`add_tool_sources` 已不在当前实现中。[E: codex-rs/core/src/tools/spec_plan.rs:153][E: codex-rs/core/src/tools/spec_plan.rs:154][E: codex-rs/core/src/tools/spec_plan.rs:159][E: codex-rs/core/src/tools/spec_plan.rs:174][E: codex-rs/core/src/tools/spec_plan.rs:180][E: codex-rs/core/src/tools/spec_plan.rs:188]

`finalize_tool_router` 的顺序具有语义：先应用 direct-model-only namespace override；若要安装 code mode，先移除旧的 plain `exec`/`wait`；只有 registry 中确有带 `search_info()` 的 deferred runtime 才注册 `tool_search`；随后注册 code-mode executors，再从最终 registry 构造 model-visible specs。[E: codex-rs/core/src/tools/spec_plan.rs:359][E: codex-rs/core/src/tools/spec_plan.rs:362][E: codex-rs/core/src/tools/spec_plan.rs:362][E: codex-rs/core/src/tools/spec_plan.rs:406][E: codex-rs/core/src/tools/spec_plan.rs:410]

`build_model_visible_specs` 读取每个 `RegisteredTool` 的有效 exposure：direct 工具可见；被 code-mode-only 隐藏的 direct 工具不进入 prompt；hosted specs 在末尾追加。registry 因而可以包含模型不可见但仍可 dispatch 的 runtime。[E: codex-rs/core/src/tools/spec_plan.rs:539][E: codex-rs/core/src/tools/spec_plan.rs:546][E: codex-rs/core/src/tools/spec_plan.rs:560][E: codex-rs/core/src/tools/registry.rs:281]

code-mode 注册遍历已经 finalize 到此阶段的 registry，把可嵌套 runtime 规范化为 JS 名称。最后把 code-mode `wait`、`exec` 依次 prepend，保证两者成为直接模型工具，而被包裹工具只在 cell 内可调用。[E: codex-rs/core/src/tools/spec_plan.rs:893][E: codex-rs/core/src/tools/spec_plan.rs:894]

## Registry 与名字规则

`ToolRegistry` 用保序 `IndexMap<ToolName, RegisteredTool>` 保存 runtime、effective exposure 等注册信息。trusted/core 重名是错误；外部 plain tool 若占用保留 shell 名（`exec_command` / `shell_command`）或与现有 tool 重名则被跳过，避免 extension/MCP 覆盖 core 行为。[E: codex-rs/core/src/tools/registry.rs:287][E: codex-rs/core/src/tools/registry.rs:364][E: codex-rs/core/src/tools/registry.rs:366]

`ToolExecutor` 默认 exposure 是 `Direct`，默认不支持 parallel；`CoreToolRuntime` 在此 contract 上增加 readiness、payload kind、cancellation、telemetry、hooks 与 streamed argument diff 能力。[E: codex-rs/tools/src/tool_executor.rs:113][E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/core/src/tools/registry.rs:55][E: codex-rs/core/src/tools/registry.rs:72]

## 输出归一与执行

`ToolRouter::build_tool_call` 把 function call 转为 canonical `ToolName` + `ToolPayload::Function`，把 client-side tool-search call 转为 plain `tool_search` + `ToolPayload::ToolSearch`，把 custom call 转为 plain name + `ToolPayload::Custom`；server-side tool-search 及无关 response item 不生成本地调用。[E: codex-rs/core/src/tools/router.rs:244][E: codex-rs/core/src/tools/router.rs:254][E: codex-rs/core/src/tools/router.rs:262][E: codex-rs/core/src/tools/router.rs:281][E: codex-rs/core/src/tools/router.rs:288]

function call 还可携带 `encrypted_function_args`；router 仅对 V2 `spawn_agent`、`send_message`、`followup_task` 标记 direct plaintext source，其他 function arguments 仍按普通来源处理。[E: codex-rs/core/src/tools/router.rs:41][E: codex-rs/core/src/tools/router.rs:46][E: codex-rs/core/src/tools/router.rs:49]

`ToolCallRuntime` 只保存 session、`StepContext`、diff tracker 与一个 `RwLock<()>`；它从 `step_context.tool_router` 查询 runtime、parallel/cancellation 策略，先等待 runtime readiness，再让 parallel-safe 调用取 read lock、其余调用取 write lock，最后经同一个 router dispatch。[E: codex-rs/core/src/tools/parallel.rs:44][E: codex-rs/core/src/tools/parallel.rs:123][E: codex-rs/core/src/tools/parallel.rs:125][E: codex-rs/core/src/tools/parallel.rs:167][E: codex-rs/core/src/tools/parallel.rs:168][E: codex-rs/core/src/tools/parallel.rs:170][E: codex-rs/core/src/tools/parallel.rs:176][E: codex-rs/core/src/tools/parallel.rs:181]

hidden runtime 在 registry 查询中强制报告不支持 parallel；dispatch 仍把 invocation 的 `cancellation_token` 传给底层 runtime。[E: codex-rs/core/src/tools/registry.rs:488][E: codex-rs/core/src/tools/registry.rs:488][E: codex-rs/core/src/tools/parallel.rs:188]

## Tool source gates

`add_core_tool_sources` 对 Guardian reviewer 使用受限分支：Managed permission profile 且有 environment 时，才可能注册 `exec_command`/`write_stdin`（还要求 `Feature::ShellTool` + `Feature::UnifiedExec` 且 shell 未 Disabled）以及 `Feature::ViewImage` 打开时的 `view_image`，随后立即返回。普通 turn 才加入 shell、MCP resource、core utility 与 collaboration families。[E: codex-rs/core/src/tools/spec_plan.rs:974][E: codex-rs/core/src/tools/spec_plan.rs:994][E: codex-rs/core/src/tools/spec_plan.rs:998][E: codex-rs/core/src/tools/spec_plan.rs:1016][E: codex-rs/core/src/tools/spec_plan.rs:1032]

shell family 首先要求 environment、`Feature::ShellTool` 和未 Disabled 的模型 shell type。**`shell_command` 不再注册**。UnifiedExec 注册 `exec_command`/`write_stdin`；关闭 UnifiedExec 时只注册 `ExecCommandHandler::one_shot`。`shell_command` 仍是 reserved name。[E: codex-rs/core/src/tools/spec_plan.rs:1079][E: codex-rs/core/src/tools/spec_plan.rs:1104][E: codex-rs/core/src/tools/spec_plan.rs:1111][E: codex-rs/core/src/tools/registry.rs:364]

`update_plan` 仅在 `update_plan_enabled` 时加入。`request_user_input_async` 仅在 root agent + 模型 experimental tool 列表含 `"request_user_input_async"` 或 `"send_user_message_async"` 时以 `DirectModelOnly` 加入（旧 catalog 名映射到 questions handler，**没有**独立 feature 门）。`send_message_to_user_async` 在 root agent 且（`Feature::SendMessageToUserAsync` **或** 列表含该新名）时加入。[E: codex-rs/core/src/tools/spec_plan.rs:1142][E: codex-rs/core/src/tools/spec_plan.rs:1167][E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/src/tools/spec_plan.rs:1192][E: codex-rs/core/src/tools/spec_plan.rs:1193][E: codex-rs/core/src/tools/spec_plan.rs:1198]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/parallel.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_payload.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](tool-system.md)
- [Turn 引擎](turn-engine.md)
