---
id: tool.current-time
title: curr_time 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/handlers/current_time.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/core/src/context/current_time_reminder.rs, codex-rs/core/src/current_time.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [CurrentTimeHandler, CurrentTimeOutput, CurrentTimeReminder, TimeProvider, SystemTimeProvider, Feature::CurrentTimeReminder]
related: [tool.sleep, subsys.core.tool-system, ref.feature-flags]
evidence: explicit
status: verified
updated: 7750465934
---

> `clock.curr_time` 是无参数的当前 UTC 时间工具。它从 session 的 `TimeProvider` 读取时间，普通 tool call 返回 reminder 文本，code mode 则返回结构化的 `{"current_time": ...}`。

## Identity 与 schema

`CurrentTimeHandler::tool_name` 返回 namespace `clock`、name `curr_time`；spec 是 `ToolSpec::Namespace` 中的 function，输入 object 不接受额外字段。[E: codex-rs/core/src/tools/handlers/current_time.rs:22][E: codex-rs/core/src/tools/handlers/current_time.rs:23][E: codex-rs/core/src/tools/handlers/current_time.rs:50][E: codex-rs/core/src/tools/handlers/current_time.rs:52][E: codex-rs/core/src/tools/handlers/current_time.rs:55][E: codex-rs/core/src/tools/handlers/current_time.rs:69]

输出 schema 只有必填字符串 `current_time`，格式说明为 `YYYY-MM-DD HH:MM:SS UTC`；code-mode result 使用同一个字段。[E: codex-rs/core/src/tools/handlers/current_time.rs:41][E: codex-rs/core/src/tools/handlers/current_time.rs:43][E: codex-rs/core/src/tools/handlers/current_time.rs:69][E: codex-rs/core/src/tools/handlers/current_time.rs:78]

## 执行与门控

handler 只接受 function payload，通过 session service 的 `time_provider.current_time(thread_id)` 取值，再包装为 `CurrentTimeReminder`；provider 失败属于 fatal tool error。[E: codex-rs/core/src/tools/handlers/current_time.rs:84][E: codex-rs/core/src/tools/handlers/current_time.rs:100][E: codex-rs/core/src/tools/handlers/current_time.rs:101][E: codex-rs/core/src/tools/handlers/current_time.rs:102]

`add_core_utility_tools` 在 `Feature::CurrentTimeReminder` 启用时注册 `CurrentTimeHandler`；同一配置下 `sleep_tool` 另行控制 `clock.sleep`，所以启用时间提醒不等于必然暴露 sleep。[E: codex-rs/core/src/tools/spec_plan.rs:826][E: codex-rs/core/src/tools/spec_plan.rs:831][E: codex-rs/core/src/tools/spec_plan.rs:778]

`CurrentTimeHandler` 没有覆写 parallel 能力，沿用 `ToolExecutor` 默认的 `false`。[E: codex-rs/tools/src/tool_executor.rs:73][E: codex-rs/tools/src/tool_executor.rs:74]

## Sources

- `codex-rs/core/src/tools/handlers/current_time.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/spec_plan_tests.rs`
- `codex-rs/core/src/context/current_time_reminder.rs`
- `codex-rs/core/src/current_time.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [sleep 工具](sleep.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Feature flags](../../reference/feature-flags.md)
