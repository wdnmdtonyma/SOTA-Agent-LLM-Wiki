---
id: spine.tool-call-anatomy
title: 工具调用解剖
kind: flow
tier: T0
source: [codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/step_context.rs, codex-rs/core/src/stream_events_utils.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/parallel.rs, codex-rs/core/src/tools/registry.rs, codex-rs/features/src/lib.rs]
symbols: [ToolRouter::build_tool_call, ToolCallRuntime::handle_tool_call_with_source, ToolRegistry::dispatch_any_with_terminal_outcome]
related: [spine.turn-end-to-end, spine.shell-exec-flow, spine.trace-apply-patch, spine.trace-mcp-call, spine.trace-subagent, subsys.core.tool-system]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> 一次工具调用先在 sampling 前完成 router finalize，并把最终 router 固定到 `StepContext`；模型 output 再被归一为 `ToolCall`，执行器等待 runtime ready、通过当前 `ToolCallRuntime` 的 parallel gate，最后进入 registry dispatch。ground truth 仍是 `spec_plan.rs` 的 `add_core_tool_sources` → `finalize_tool_router`。[E: codex-rs/core/src/tools/spec_plan.rs:124][E: codex-rs/core/src/tools/spec_plan.rs:199][E: codex-rs/core/src/session/step_context.rs:31][E: codex-rs/core/src/tools/router.rs:246][E: codex-rs/core/src/tools/parallel.rs:95][E: codex-rs/core/src/tools/registry.rs:493]

```mermaid
flowchart TD
    TURN["run_sampling_request"] --> BUILD["build_tool_router"]
    BUILD --> CORE["add_core_tool_sources"]
    CORE --> REVIEW{"guardian reviewer?"}
    REVIEW -->|yes| GUARD["exec_command / write_stdin / view_image + optional history.*"]
    REVIEW -->|no| EXTRA["MCP / extension / dynamic runtimes"]
    BUILD --> HOSTED["hosted specs Vec"]
    EXTRA --> FINAL["finalize_tool_router"]
    HOSTED --> FINAL
    GUARD --> FINAL
    FINAL --> STEP["StepContext.tool_router"]
    STEP --> PROMPT["model_visible_specs"]
    MODEL["ResponseItem"] --> CALL["ToolRouter::build_tool_call"]
    CALL --> READY["runtime.wait_until_ready"]
    READY --> GATE["parallel RwLock"]
    GATE --> DISPATCH["ToolRegistry dispatch"]
```

## 端到端步骤

1. `build_tool_router` 创建 registry，先注册 core sources。非 Guardian reviewer turn 再追加 MCP、extension、dynamic runtimes；hosted specs 作为独立 `Vec<ToolSpec>` 收集，并与 registry 分开传给 `finalize_tool_router`。[E: codex-rs/core/src/tools/spec_plan.rs:152][E: codex-rs/core/src/tools/spec_plan.rs:153][E: codex-rs/core/src/tools/spec_plan.rs:170][E: codex-rs/core/src/tools/spec_plan.rs:185][E: codex-rs/core/src/tools/spec_plan.rs:191][E: codex-rs/core/src/tools/spec_plan.rs:199]
2. Guardian reviewer turn 在 `add_core_tool_sources` 提前返回：仅当 permission profile 是 `Managed` 且存在 environment 时，才可能注册 `exec_command`/`write_stdin`（还要求 `Feature::ShellTool` + `Feature::UnifiedExec` 且 shell 未 Disabled），以及 feature 打开时的 `view_image`。`build_tool_router` 同时把 hosted specs 置空，并跳过普通 MCP/extension/dynamic；thread store 若有 `GuardianReadOnlyHistoryTools`，仍会 `append_extension_tool_executors` 挂只读 `history.*`。[E: codex-rs/core/src/tools/spec_plan.rs:155][E: codex-rs/core/src/tools/spec_plan.rs:161][E: codex-rs/core/src/tools/spec_plan.rs:168][E: codex-rs/core/src/tools/spec_plan.rs:985][E: codex-rs/core/src/tools/spec_plan.rs:1005][E: codex-rs/core/src/tools/spec_plan.rs:1009][E: codex-rs/core/src/tools/spec_plan.rs:1023]
3. 普通 turn 的 `add_shell_tools` **不再注册 `shell_command`**。有 environment、`Feature::ShellTool` 打开且模型 `shell_type` 非 Disabled 时：`Feature::UnifiedExec` 开则 `registry.add(ExecCommandHandler::new)` + `WriteStdinHandler`；关则 `ExecCommandHandler::one_shot`，保留命令执行但不暴露 resumable process / `write_stdin`。`shell_command` 只作为 reserved name，阻止外部 runtime 占用。[E: codex-rs/core/src/tools/spec_plan.rs:1086][E: codex-rs/core/src/tools/spec_plan.rs:1110][E: codex-rs/core/src/tools/spec_plan.rs:1117][E: codex-rs/core/src/tools/registry.rs:362][E: codex-rs/features/src/lib.rs:911]
4. `add_core_utility_tools` 把 `update_plan` 做成 opt-in：`if turn_context.config.update_plan_enabled { registry.add(PlanHandler) }`。新工具 `send_user_message_async` 在模型 `experimental_supported_tools` 含该字符串、且 `!session_source.is_non_root_agent()` 时以 `DirectModelOnly` 注册。clock 要 `Feature::CurrentTimeReminder` 或模型含 `"clock"`；sleep 还要 `Feature::SleepTool` + `AlwaysOn | ModelDriven`。[E: codex-rs/core/src/tools/spec_plan.rs:1148][E: codex-rs/core/src/tools/spec_plan.rs:1173][E: codex-rs/core/src/tools/spec_plan.rs:1180][E: codex-rs/core/src/tools/spec_plan.rs:1207][E: codex-rs/core/src/tools/spec_plan.rs:1210][E: codex-rs/core/src/tools/spec_plan.rs:1212]
5. `finalize_tool_router` 应用 exposure override，移除要被 code mode 替代的 plain executors；只有 deferred searchable runtime 存在时才加入 `tool_search`，然后注册 code-mode executors 并构造 model-visible specs。[E: codex-rs/core/src/tools/spec_plan.rs:370][E: codex-rs/core/src/tools/spec_plan.rs:373][E: codex-rs/core/src/tools/spec_plan.rs:384][E: codex-rs/core/src/tools/spec_plan.rs:417][E: codex-rs/core/src/tools/spec_plan.rs:420]
6. finalized router 作为该 sampling request 的精确工具计划存入请求级 `StepContext`；`ToolCallRuntime` 没有第二个 router 字段。[E: codex-rs/core/src/session/step_context.rs:15][E: codex-rs/core/src/session/step_context.rs:31][E: codex-rs/core/src/tools/parallel.rs:42]
7. prompt 只收到 `model_visible_specs`；registry 可同时保留 deferred、hidden 或 dispatch-only runtime。[E: codex-rs/core/src/tools/router.rs:137][E: codex-rs/core/src/session/turn.rs:1341]
8. `ToolRouter::build_tool_call` 把 Function、client ToolSearch、Custom 三类 item 分别归一成 `ToolPayload::Function`、`ToolSearch`、`Custom`；server-side tool-search 不走本地 dispatch。[E: codex-rs/core/src/tools/router.rs:246][E: codex-rs/core/src/tools/router.rs:248][E: codex-rs/core/src/tools/router.rs:264][E: codex-rs/core/src/tools/router.rs:283][E: codex-rs/core/src/tools/router.rs:284]
9. function call 的 encrypted arguments 会随 `ToolCall` 保留；V2 spawn/send/followup 是 router 明确识别的 direct-plaintext collaboration calls。[E: codex-rs/core/src/tools/router.rs:41][E: codex-rs/core/src/tools/router.rs:46][E: codex-rs/core/src/tools/router.rs:56]
10. output item 完成后，stream handler 记录 response item，构造 tool future，并标记需要 follow-up sampling。[E: codex-rs/core/src/stream_events_utils.rs:298][E: codex-rs/core/src/stream_events_utils.rs:317][E: codex-rs/core/src/stream_events_utils.rs:321][E: codex-rs/core/src/stream_events_utils.rs:327]
11. `ToolCallRuntime` 从 `step_context.tool_router` 取 runtime 与执行策略；它在拿 parallel lock 之前先等待 runtime readiness。[E: codex-rs/core/src/tools/parallel.rs:115][E: codex-rs/core/src/tools/parallel.rs:150][E: codex-rs/core/src/tools/parallel.rs:155]
12. parallel-safe runtime 取共享 read lock，其余 runtime 取独占 write lock；随后调用同一个 step router 的 terminal-outcome dispatch。[E: codex-rs/core/src/tools/parallel.rs:155][E: codex-rs/core/src/tools/parallel.rs:167][E: codex-rs/core/src/tools/registry.rs:493]
13. registry dispatch 统一处理 unsupported tool、PreToolUse hook/input rewrite、runtime telemetry、PostToolUse hook/additional context 与 lifecycle completion。[E: codex-rs/core/src/tools/registry.rs:532][E: codex-rs/core/src/tools/registry.rs:582][E: codex-rs/core/src/tools/registry.rs:637][E: codex-rs/core/src/tools/registry.rs:723]

## 关键边界

- direct visibility 与 dispatchability 不是同一集合；registry exposure 决定模型能否直接看到工具。[E: codex-rs/core/src/tools/router.rs:137][E: codex-rs/core/src/tools/spec_plan.rs:552]
- readiness 发生在 parallel gate 前，因此等待外部 runtime 启动不会占用当前 `ToolCallRuntime` 的 read/write lock。[E: codex-rs/core/src/tools/parallel.rs:150][E: codex-rs/core/src/tools/parallel.rs:155]
- Guardian reviewer 工具面是 registry-first 的特例裁剪，不是第二条 planner；它仍然走同一套 `finalize_tool_router` 与 dispatch，并可额外挂只读 `history.*`。[E: codex-rs/core/src/tools/spec_plan.rs:155][E: codex-rs/core/src/tools/spec_plan.rs:161][E: codex-rs/core/src/tools/spec_plan.rs:985][E: codex-rs/core/src/tools/spec_plan.rs:199]
- UnifiedExec 默认全平台开启（`default_enabled: true`），因此模型默认看到 `exec_command`/`write_stdin`。`shell_command` 不再是可注册 core handler；关闭 UnifiedExec 时也只走 `ExecCommandHandler::one_shot`。[E: codex-rs/features/src/lib.rs:911][E: codex-rs/core/src/tools/spec_plan.rs:1110][E: codex-rs/core/src/tools/spec_plan.rs:1117]
- `update_plan` 不是默认始终开启；HEAD 把它改成 `update_plan_enabled` opt-in。[E: codex-rs/core/src/tools/spec_plan.rs:1148]

## Sources

- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/stream_events_utils.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/parallel.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [一次 turn 端到端](turn-end-to-end.md)
- [trace: apply_patch](trace-apply-patch.md)
- [trace: subagent](trace-subagent.md)
- [工具系统机制](../subsystems/core/tool-system.md)
