---
id: tool.sleep
title: sleep 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/sleep.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [SleepHandler, create_sleep_tool, SleepArgs, Feature::SleepTool, SleepToolMode]
related: [tool.current-time, subsys.core.tool-system, subsys.core.tool-router, ref.feature-flags]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `sleep` 是 `clock` namespace 下的 Responses function 工具，让模型在当前 turn 内等待指定毫秒数；如果 active turn 收到新输入，等待会提前结束。注册需要 `Feature::SleepTool`，再按 `SleepToolMode` 与 clock 模型门控决定是否真正加入 registry。

## 能回答的问题

- `clock.sleep` 工具在什么 feature / `SleepToolMode` / clock 门控下出现？
- `clock.sleep.duration_ms` 的范围是多少？
- `clock.sleep` 被新用户输入打断时会怎样返回？
- `clock.sleep` 是否支持 parallel tool calls？
- 为什么它是 DirectModelOnly？

## 1 Identity

`sleep` 的 namespace 来自 `NAMESPACE = "clock"`，function wire name 来自 `TOOL_NAME = "sleep"`，handler 是 `SleepHandler`。[E: codex-rs/core/src/tools/handlers/sleep.rs:26][E: codex-rs/core/src/tools/handlers/sleep.rs:27][E: codex-rs/core/src/tools/handlers/sleep.rs:30]

`SleepHandler::tool_name` 返回 `ToolName::namespaced(NAMESPACE, TOOL_NAME)`，因此工具全名是 `clock.sleep`。[E: codex-rs/core/src/tools/handlers/sleep.rs:66][E: codex-rs/core/src/tools/handlers/sleep.rs:67]

`SleepHandler::exposure()` 显式返回 `ToolExposure::DirectModelOnly`，因此它会出现在初始模型工具面，但不会作为 code-mode nested tool。[E: codex-rs/core/src/tools/handlers/sleep.rs:74][E: codex-rs/core/src/tools/handlers/sleep.rs:75]

## 2 用途定位

`sleep` 的模型描述是暂停指定时长，并说明新输入会提前结束等待，返回 elapsed wall-clock time。[E: codex-rs/core/src/tools/handlers/sleep.rs:51]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `duration_ms` | number/u64 | 是 | 无 | 等待毫秒数，文案要求在 `1..=MAX_SLEEP_DURATION_MS` 范围内；当前常量是 12 小时。[E: codex-rs/core/src/tools/handlers/sleep.rs:28][E: codex-rs/core/src/tools/handlers/sleep.rs:35][E: codex-rs/core/src/tools/handlers/sleep.rs:41][E: codex-rs/core/src/tools/handlers/sleep.rs:42][E: codex-rs/core/src/tools/handlers/sleep.rs:57] |

handler 使用 `SleepArgs { duration_ms }` 解析参数，并拒绝不在 `1..=MAX_SLEEP_DURATION_MS` 内的值。[E: codex-rs/core/src/tools/handlers/sleep.rs:34][E: codex-rs/core/src/tools/handlers/sleep.rs:35][E: codex-rs/core/src/tools/handlers/sleep.rs:96]

## 4 输出 schema & 截断

`sleep` 的 `ToolSpec` 没有声明 structured `output_schema`，handler 返回文本形式的 `Wall time: ... seconds` 加 `Sleep interrupted by new input.` 或 `Sleep completed.`。[E: codex-rs/core/src/tools/handlers/sleep.rs:60][E: codex-rs/core/src/tools/handlers/sleep.rs:149][E: codex-rs/core/src/tools/handlers/sleep.rs:152][E: codex-rs/core/src/tools/handlers/sleep.rs:155]

执行时会把 sleep 包装为 `TurnItem::Extension(ExtensionItem::Sleep(SleepItem { id, duration_ms }))`，再发出 started/completed 生命周期。[E: codex-rs/core/src/tools/handlers/sleep.rs:103][E: codex-rs/core/src/tools/handlers/sleep.rs:107][E: codex-rs/core/src/tools/handlers/sleep.rs:135]

## 5 ToolSpec 类型

`sleep` 是 `ToolSpec::Namespace(ResponsesApiNamespace)` 里的 `ResponsesApiNamespaceTool::Function`，因为它和 `curr_time` 共享 `clock` namespace。[E: codex-rs/core/src/tools/handlers/sleep.rs:46][E: codex-rs/core/src/tools/handlers/sleep.rs:49][E: codex-rs/core/src/tools/handlers/sleep.rs:50]

## 6 注册与门控

`add_core_utility_tools` 先计算 `current_time_reminder_enabled` 与 `model_has_clock`（`experimental_supported_tools` 含 `"clock"`）。`curr_time` 在两者任一为真时注册；`sleep` 还要额外满足：[E: codex-rs/core/src/tools/spec_plan.rs:1225][E: codex-rs/core/src/tools/spec_plan.rs:1230][E: codex-rs/core/src/tools/spec_plan.rs:1231]

1. `Feature::SleepTool` 开启（stage Stable，默认 true）。[E: codex-rs/core/src/tools/spec_plan.rs:1234][E: codex-rs/features/src/lib.rs:975][E: codex-rs/features/src/lib.rs:977][E: codex-rs/features/src/lib.rs:978]
2. `SleepToolMode`：`AlwaysOn` 直接注册；默认 `ModelDriven` 则：若 `CurrentTimeReminder` 开，看 `current_time_reminder.sleep_tool`；否则看 `model_has_clock`。[E: codex-rs/core/src/tools/spec_plan.rs:1235][E: codex-rs/features/src/feature_configs.rs:438][E: codex-rs/features/src/feature_configs.rs:439][E: codex-rs/features/src/feature_configs.rs:441]

`add_core_tool_sources` 在 `require_managed_sandbox` 且（thread `permission_profile()` 不是 `PermissionProfile::Managed`，或任一 turn environment 不是 Managed）时 early return，跳过全部 core sources：`add_shell_tools`、`add_mcp_resource_tools`、`add_core_utility_tools`、`add_collaboration_tools`（含 Sleep）。[E: codex-rs/core/src/tools/spec_plan.rs:1018][E: codex-rs/core/src/tools/spec_plan.rs:1022][E: codex-rs/core/src/tools/spec_plan.rs:1028][E: codex-rs/core/src/tools/spec_plan.rs:1032][E: codex-rs/core/src/tools/spec_plan.rs:1034][E: codex-rs/core/src/tools/spec_plan.rs:1035]

`spec_plan_tests::sleep_tool_follows_current_time_config` 覆盖了只开 `CurrentTimeReminder` 时默认只有 `clock.curr_time`，再把 `current_time_reminder.sleep_tool=true` 后暴露 `clock.sleep`。[E: codex-rs/core/src/tools/spec_plan_tests.rs:1390][E: codex-rs/core/src/tools/spec_plan_tests.rs:1395][E: codex-rs/core/src/tools/spec_plan_tests.rs:1408]

`sleep_tool_stays_direct_and_outside_code_mode` 进一步确认它即使在 code mode 下仍保持 DirectModelOnly。[E: codex-rs/core/src/tools/spec_plan_tests.rs:1414][E: codex-rs/core/src/tools/spec_plan_tests.rs:1447]

## 7 parallel-safe

`SleepHandler` 没有覆写 `supports_parallel_tool_calls`，因此使用 `ToolExecutor` 默认值 `false`。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## 8 handler 走读

handler 解析 `ToolPayload::Function` 参数，记录开始时间，订阅 active turn activity；已有 pending activity 时立即当作 interrupted，否则在 `time_provider.sleep` 与 `activity_rx.changed()` 之间 `tokio::select!`。`Feature::NonfatalClockReadErrors` 开启时 sleep 失败返回模型可读错误，否则 fatal。[E: codex-rs/core/src/tools/handlers/sleep.rs:90][E: codex-rs/core/src/tools/handlers/sleep.rs:96][E: codex-rs/core/src/tools/handlers/sleep.rs:116][E: codex-rs/core/src/tools/handlers/sleep.rs:124][E: codex-rs/core/src/tools/handlers/sleep.rs:137]

`CoreToolRuntime::is_builtin_control_tool()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/sleep.rs:164]

## 9 设计动机·edge·历史

`sleep` 是面向 turn 调度的等待工具，并会因用户新输入提前结束；它替代不了 shell 执行。clock/sleep 拆成两道门：时间读取可以只靠模型 `"clock"` capability，sleep 还要 `SleepTool` + mode。[I]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/sleep.rs`
- `codex-rs/core/src/tools/spec_plan_tests.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [curr_time 工具](current-time.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Tool router](../../subsystems/core/tool-router.md)
- [Feature flags](../../reference/feature-flags.md)
