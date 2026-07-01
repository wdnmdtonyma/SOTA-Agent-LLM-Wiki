---
id: tool.sleep
title: sleep 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/sleep.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [SleepHandler, create_sleep_tool, SleepArgs, Feature::CurrentTimeReminder]
related: [subsys.core.tool-system, subsys.core.tool-router, ref.feature-flags]
evidence: explicit
status: verified
updated: db887d03e1
---

> `sleep` 是 `clock` namespace 下的 Responses function 工具,让模型在当前 turn 内等待指定毫秒数;如果 active turn 收到新输入,等待会提前结束。

## 能回答的问题

- `clock.sleep` 工具在什么 feature/config gate 下出现?
- `clock.sleep.duration_ms` 的范围是多少?
- `clock.sleep` 被新用户输入打断时会怎样返回?
- `clock.sleep` 是否支持 parallel tool calls?

## 1 Identity

`sleep` 的 namespace 来自 `NAMESPACE = "clock"`,function wire name 来自 `TOOL_NAME = "sleep"`,handler 是 `SleepHandler`,并通过 `CoreToolRuntime` 暴露给 tool registry。[E: codex-rs/core/src/tools/handlers/sleep.rs:22] [E: codex-rs/core/src/tools/handlers/sleep.rs:23] [E: codex-rs/core/src/tools/handlers/sleep.rs:26] [E: codex-rs/core/src/tools/handlers/sleep.rs:150]

`SleepHandler::tool_name` 返回 `ToolName::namespaced(NAMESPACE, TOOL_NAME)`,因此工具全名是 `clock.sleep`。[E: codex-rs/core/src/tools/handlers/sleep.rs:61] [E: codex-rs/core/src/tools/handlers/sleep.rs:62] [E: codex-rs/core/src/tools/handlers/sleep.rs:63]

## 2 用途定位

`sleep` 的模型描述是暂停指定时长,并说明新输入会提前结束等待,返回 elapsed wall-clock time。[E: codex-rs/core/src/tools/handlers/sleep.rs:42] [E: codex-rs/core/src/tools/handlers/sleep.rs:47]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `duration_ms` | number/u64 | 是 | 无 | 等待毫秒数,文案要求在 `1..=MAX_SLEEP_DURATION_MS` 范围内;当前常量是 12 小时。[E: codex-rs/core/src/tools/handlers/sleep.rs:24] [E: codex-rs/core/src/tools/handlers/sleep.rs:31] [E: codex-rs/core/src/tools/handlers/sleep.rs:37] [E: codex-rs/core/src/tools/handlers/sleep.rs:38] [E: codex-rs/core/src/tools/handlers/sleep.rs:53] |

handler 使用 `SleepArgs { duration_ms }` 解析参数,并拒绝不在 `1..=MAX_SLEEP_DURATION_MS` 内的值。[E: codex-rs/core/src/tools/handlers/sleep.rs:28] [E: codex-rs/core/src/tools/handlers/sleep.rs:31] [E: codex-rs/core/src/tools/handlers/sleep.rs:84] [E: codex-rs/core/src/tools/handlers/sleep.rs:85]

## 4 输出 schema & 截断

`sleep` 的 `ToolSpec` 没有声明 structured `output_schema`,handler 返回文本形式的 `Wall time: ... seconds` 加 `Sleep interrupted by new input.` 或 `Sleep completed.`。[E: codex-rs/core/src/tools/handlers/sleep.rs:56] [E: codex-rs/core/src/tools/handlers/sleep.rs:136] [E: codex-rs/core/src/tools/handlers/sleep.rs:139] [E: codex-rs/core/src/tools/handlers/sleep.rs:142] [E: codex-rs/core/src/tools/handlers/sleep.rs:143]

执行时会发出 `TurnItem::Sleep(SleepItem { id, duration_ms })` 的 started/completed 生命周期事件。[E: codex-rs/core/src/tools/handlers/sleep.rs:92] [E: codex-rs/core/src/tools/handlers/sleep.rs:93] [E: codex-rs/core/src/tools/handlers/sleep.rs:94] [E: codex-rs/core/src/tools/handlers/sleep.rs:96] [E: codex-rs/core/src/tools/handlers/sleep.rs:133]

## 5 ToolSpec 类型

`sleep` 是 `ToolSpec::Namespace(ResponsesApiNamespace)` 里的 `ResponsesApiNamespaceTool::Function`,因为它和 `curr_time` 共享 `clock` namespace。[E: codex-rs/core/src/tools/handlers/sleep.rs:42] [E: codex-rs/core/src/tools/handlers/sleep.rs:45] [E: codex-rs/core/src/tools/handlers/sleep.rs:46]

## 6 注册与门控

`add_core_utility_tools` 只在 `Feature::CurrentTimeReminder` 启用且 `current_time_reminder.sleep_tool` 为真时加入 `SleepHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:737] [E: codex-rs/core/src/tools/spec_plan.rs:741] [E: codex-rs/core/src/tools/spec_plan.rs:743] [E: codex-rs/core/src/tools/spec_plan.rs:745]

`spec_plan_tests::sleep_tool_follows_current_time_config` 覆盖了默认只暴露 `clock.curr_time`,开启 `sleep_tool` 后暴露 `clock.curr_time` 和 `clock.sleep` 的行为。[E: codex-rs/core/src/tools/spec_plan_tests.rs:729] [E: codex-rs/core/src/tools/spec_plan_tests.rs:731] [E: codex-rs/core/src/tools/spec_plan_tests.rs:734] [E: codex-rs/core/src/tools/spec_plan_tests.rs:737] [E: codex-rs/core/src/tools/spec_plan_tests.rs:740] [E: codex-rs/core/src/tools/spec_plan_tests.rs:747]

## 7 parallel-safe

`SleepHandler` 没有覆写 `supports_parallel_tool_calls`,因此使用 `ToolExecutor` 默认值 `false`。[E: codex-rs/tools/src/tool_executor.rs:64] [E: codex-rs/tools/src/tool_executor.rs:65]

## 8 handler 走读

handler 解析 `ToolPayload::Function` 参数,记录开始时间,订阅 active turn activity,然后在 sleep future 和 activity channel 之间 `tokio::select!`;activity 到达时返回 interrupted,否则等待完整时长。[E: codex-rs/core/src/tools/handlers/sleep.rs:79] [E: codex-rs/core/src/tools/handlers/sleep.rs:84] [E: codex-rs/core/src/tools/handlers/sleep.rs:91] [E: codex-rs/core/src/tools/handlers/sleep.rs:101] [E: codex-rs/core/src/tools/handlers/sleep.rs:103] [E: codex-rs/core/src/tools/handlers/sleep.rs:105] [E: codex-rs/core/src/tools/handlers/sleep.rs:108] [E: codex-rs/core/src/tools/handlers/sleep.rs:113] [E: codex-rs/core/src/tools/handlers/sleep.rs:119]

## 9 设计动机·edge·历史

`sleep` 属于当前 HEAD 新增工具节点,替代不了 shell 执行;它是面向 turn 调度的等待工具,并会因用户新输入提前结束。[I]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/sleep.rs
- codex-rs/core/src/tools/spec_plan_tests.rs
- codex-rs/tools/src/tool_executor.rs

## 相关

- `subsys.core.tool-system`
- `subsys.core.tool-router`
- `ref.feature-flags`
