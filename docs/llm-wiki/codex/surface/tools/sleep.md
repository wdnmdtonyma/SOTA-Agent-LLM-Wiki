---
id: tool.sleep
title: sleep 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/sleep.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [SleepHandler, create_sleep_tool, SleepArgs, Feature::SleepTool]
related: [subsys.core.tool-system, subsys.core.tool-router, ref.feature-flags]
evidence: explicit
status: verified
updated: 5670360009
---

> `sleep` 是一个 Responses `Function` 工具,让模型在当前 turn 内等待指定毫秒数;如果 active turn 收到新输入,等待会提前结束。

## 能回答的问题

- `sleep` 工具在什么 feature gate 下出现?
- `sleep.duration_ms` 的范围是多少?
- `sleep` 被新用户输入打断时会怎样返回?
- `sleep` 是否支持 parallel tool calls?

## 1 Identity

`sleep` 的 wire name 来自 `SLEEP_TOOL_NAME`,handler 是 `SleepHandler`,并通过 `CoreToolRuntime` 暴露给 tool registry。[E: codex-rs/core/src/tools/handlers/sleep.rs:20] [E: codex-rs/core/src/tools/handlers/sleep.rs:23] [E: codex-rs/core/src/tools/handlers/sleep.rs:131]

`SleepHandler::tool_name` 返回 plain `sleep`,因此它不是 namespace 工具。[E: codex-rs/core/src/tools/handlers/sleep.rs:54] [E: codex-rs/core/src/tools/handlers/sleep.rs:56]

## 2 用途定位

`sleep` 的模型描述是暂停指定时长,并说明新输入会提前结束等待,返回 elapsed wall-clock time。[E: codex-rs/core/src/tools/handlers/sleep.rs:39] [E: codex-rs/core/src/tools/handlers/sleep.rs:41]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `duration_ms` | number/u64 | 是 | 无 | 等待毫秒数,文案要求在 `1..=3_600_000` 范围内。[E: codex-rs/core/src/tools/handlers/sleep.rs:21] [E: codex-rs/core/src/tools/handlers/sleep.rs:28] [E: codex-rs/core/src/tools/handlers/sleep.rs:33] [E: codex-rs/core/src/tools/handlers/sleep.rs:35] [E: codex-rs/core/src/tools/handlers/sleep.rs:47] |

handler 使用 `SleepArgs { duration_ms }` 解析参数,并拒绝不在 `1..=MAX_SLEEP_DURATION_MS` 内的值。[E: codex-rs/core/src/tools/handlers/sleep.rs:27] [E: codex-rs/core/src/tools/handlers/sleep.rs:28] [E: codex-rs/core/src/tools/handlers/sleep.rs:77] [E: codex-rs/core/src/tools/handlers/sleep.rs:78]

## 4 输出 schema & 截断

`sleep` 的 `ToolSpec` 没有声明 structured `output_schema`,handler 返回文本形式的 `Wall time: ... seconds` 加 `Sleep interrupted by new input.` 或 `Sleep completed.`。[E: codex-rs/core/src/tools/handlers/sleep.rs:50] [E: codex-rs/core/src/tools/handlers/sleep.rs:118] [E: codex-rs/core/src/tools/handlers/sleep.rs:120] [E: codex-rs/core/src/tools/handlers/sleep.rs:124]

执行时会发出 `TurnItem::Sleep(SleepItem { id, duration_ms })` 的 started/completed 生命周期事件。[E: codex-rs/core/src/tools/handlers/sleep.rs:85] [E: codex-rs/core/src/tools/handlers/sleep.rs:86] [E: codex-rs/core/src/tools/handlers/sleep.rs:87] [E: codex-rs/core/src/tools/handlers/sleep.rs:89] [E: codex-rs/core/src/tools/handlers/sleep.rs:115]

## 5 ToolSpec 类型

`sleep` 是 `ToolSpec::Function(ResponsesApiTool)` 而不是 freeform 或 namespace 工具。[E: codex-rs/core/src/tools/handlers/sleep.rs:39]

## 6 注册与门控

`add_core_utility_tools` 只在 `features.enabled(Feature::SleepTool)` 为真时加入 `SleepHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:689] [E: codex-rs/core/src/tools/spec_plan.rs:714] [E: codex-rs/core/src/tools/spec_plan.rs:715]

`spec_plan_tests::sleep_tool_follows_feature_gate` 覆盖了关闭时不可见、开启时可见的行为。[E: codex-rs/core/src/tools/spec_plan_tests.rs:661] [E: codex-rs/core/src/tools/spec_plan_tests.rs:666] [E: codex-rs/core/src/tools/spec_plan_tests.rs:672]

## 7 parallel-safe

`SleepHandler` 没有覆写 `supports_parallel_tool_calls`,因此使用 `ToolExecutor` 默认值 `false`。[E: codex-rs/tools/src/tool_executor.rs:64] [E: codex-rs/tools/src/tool_executor.rs:65]

## 8 handler 走读

handler 解析 `ToolPayload::Function` 参数,记录开始时间,订阅 active turn activity,然后在 sleep future 和 activity channel 之间 `tokio::select!`;activity 到达时返回 interrupted,否则等待完整时长。[E: codex-rs/core/src/tools/handlers/sleep.rs:72] [E: codex-rs/core/src/tools/handlers/sleep.rs:84] [E: codex-rs/core/src/tools/handlers/sleep.rs:94] [E: codex-rs/core/src/tools/handlers/sleep.rs:101] [E: codex-rs/core/src/tools/handlers/sleep.rs:103] [E: codex-rs/core/src/tools/handlers/sleep.rs:104] [E: codex-rs/core/src/tools/handlers/sleep.rs:105] [E: codex-rs/core/src/tools/handlers/sleep.rs:107] [E: codex-rs/core/src/tools/handlers/sleep.rs:109]

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
