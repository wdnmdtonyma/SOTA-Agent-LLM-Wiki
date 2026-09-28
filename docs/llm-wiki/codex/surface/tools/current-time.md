---
id: tool.current-time
title: curr_time 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/handlers/current_time.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/core/src/context/current_time_reminder.rs, codex-rs/core/src/current_time.rs, codex-rs/features/src/lib.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [CurrentTimeHandler, CurrentTimeOutput, CurrentTimeReminder, TimeProvider, SystemTimeProvider, Feature::CurrentTimeReminder]
related: [tool.sleep, subsys.core.tool-system, ref.feature-flags]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `clock.curr_time` 是无参数的当前 UTC 时间工具。它从 session 的 `TimeProvider` 读取时间，普通 tool call 返回 reminder 文本，code mode 则返回结构化的 `{"current_time": ...}`。注册是双门控：`Feature::CurrentTimeReminder` **或** 模型 `experimental_supported_tools` 含 `"clock"`。

## 能回答的问题

- `clock.curr_time` 的 wire name、ToolSpec 类型和 handler 是什么？
- 它在 `Feature::CurrentTimeReminder` 与模型 `"clock"` capability 下如何注册？
- 输出格式是什么，code mode 与普通 tool call 有何不同？
- 启用 `curr_time` 是否必然暴露 `clock.sleep`？
- Guardian reviewer turn 会不会看到该工具？

## Identity 与 schema

`CurrentTimeHandler::tool_name` 返回 namespace `clock`、name `curr_time`；spec 是 `ToolSpec::Namespace` 中的 function，输入 object 不接受额外字段。[E: codex-rs/core/src/tools/handlers/current_time.rs:24][E: codex-rs/core/src/tools/handlers/current_time.rs:25][E: codex-rs/core/src/tools/handlers/current_time.rs:52][E: codex-rs/core/src/tools/handlers/current_time.rs:53][E: codex-rs/core/src/tools/handlers/current_time.rs:57][E: codex-rs/core/src/tools/handlers/current_time.rs:65]

输出 schema 只有必填字符串 `current_time`，格式说明为 `YYYY-MM-DD HH:MM:SS UTC`；code-mode result 使用同一个字段。[E: codex-rs/core/src/tools/handlers/current_time.rs:42][E: codex-rs/core/src/tools/handlers/current_time.rs:44][E: codex-rs/core/src/tools/handlers/current_time.rs:70][E: codex-rs/core/src/tools/handlers/current_time.rs:75]

## 执行与门控

handler 只接受 function payload，通过 session service 的 `time_provider.current_time(thread_id)` 取值，再包装为 `CurrentTimeReminder`。provider 失败默认 fatal；`Feature::NonfatalClockReadErrors` 开启时改为 `RespondToModel`。[E: codex-rs/core/src/tools/handlers/current_time.rs:90][E: codex-rs/core/src/tools/handlers/current_time.rs:100][E: codex-rs/core/src/tools/handlers/current_time.rs:107][E: codex-rs/core/src/tools/handlers/current_time.rs:119]

`add_core_utility_tools` 在 `Feature::CurrentTimeReminder` 启用 **或** `model_info.experimental_supported_tools` 含 `"clock"` 时注册 `CurrentTimeHandler`。`Feature::CurrentTimeReminder` 当前是 UnderDevelopment，默认关闭。[E: codex-rs/core/src/tools/spec_plan.rs:1225][E: codex-rs/core/src/tools/spec_plan.rs:1230][E: codex-rs/core/src/tools/spec_plan.rs:1231][E: codex-rs/features/src/lib.rs:1717][E: codex-rs/features/src/lib.rs:1719][E: codex-rs/features/src/lib.rs:1720]

同一函数里 `sleep` 另受 `Feature::SleepTool` + `SleepToolMode` 门控，所以启用 `curr_time` 不等于必然暴露 `clock.sleep`。[E: codex-rs/core/src/tools/spec_plan.rs:1234]

`add_core_tool_sources` 在 `require_managed_sandbox` 且（thread profile 不是 Managed，或任一 turn environment 不是 Managed）时 early return，跳过全部 core sources（含 `add_core_utility_tools` 里的 `CurrentTimeHandler`）。[E: codex-rs/core/src/tools/spec_plan.rs:1018][E: codex-rs/core/src/tools/spec_plan.rs:1022][E: codex-rs/core/src/tools/spec_plan.rs:1028][E: codex-rs/core/src/tools/spec_plan.rs:1034]

`CurrentTimeHandler` 没有覆写 parallel 能力，沿用 `ToolExecutor` 默认的 `false`。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

`CoreToolRuntime::is_builtin_control_tool()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/current_time.rs:127]

## Sources

- `codex-rs/core/src/tools/handlers/current_time.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/spec_plan_tests.rs`
- `codex-rs/core/src/context/current_time_reminder.rs`
- `codex-rs/core/src/current_time.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [sleep 工具](sleep.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Feature flags](../../reference/feature-flags.md)
