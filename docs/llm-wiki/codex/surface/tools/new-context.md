---
id: tool.new-context
title: new_context 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/new_context_window.rs, codex-rs/core/src/tools/handlers/new_context_window_spec.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [NewContextWindowHandler, create_new_context_window_tool, NEW_CONTEXT_WINDOW_TOOL_NAME, Feature::TokenBudget]
related: [tool.get-context-remaining, subsys.core.tool-system, subsys.core.context-manager]
evidence: explicit
status: verified
updated: 5670360009
---

> `new_context` 是 token-budget 工具族的一员,用于请求开启新的 context window;当前 handler 的成功文本声明不会总结会话历史。

## 能回答的问题

- `new_context` 的 wire name 和 handler 是什么?
- `new_context` 在什么 gate 下注册?
- `new_context` 的输入和输出是什么?
- 为什么 `new_context` 是 DirectModelOnly?

## 1 Identity

`NEW_CONTEXT_WINDOW_TOOL_NAME` 的值是 `new_context`,handler 是 `NewContextWindowHandler`。[E: codex-rs/core/src/tools/handlers/new_context_window_spec.rs:6] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:16]

`NewContextWindowHandler::tool_name` 返回 plain `new_context`,`spec()` 返回 `create_new_context_window_tool()`。[E: codex-rs/core/src/tools/handlers/new_context_window.rs:18] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:20] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:23] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:24]

## 2 用途定位

`new_context` 的模型描述是 `Start a new context window.`,handler 成功返回固定消息 `A new context window will start without summarizing conversation history.`[E: codex-rs/core/src/tools/handlers/new_context_window_spec.rs:11] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:14]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| 无 | object | 否 | 空对象 | `create_new_context_window_tool` 使用空 `BTreeMap` 参数表,无 required 字段,且 `additionalProperties=false`。[E: codex-rs/core/src/tools/handlers/new_context_window_spec.rs:14] |

## 4 输出 schema & 截断

`new_context` 没有 structured `output_schema`;handler 调用 `request_new_context_window()` 后返回固定文本并标记 success。[E: codex-rs/core/src/tools/handlers/new_context_window_spec.rs:15] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:13] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:14] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:35] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:37] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:38] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:39]

## 5 ToolSpec 类型

`new_context` 是 `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/core/src/tools/handlers/new_context_window_spec.rs:8] [E: codex-rs/core/src/tools/handlers/new_context_window_spec.rs:9]

## 6 注册与门控

`add_core_utility_tools` 在 `Feature::TokenBudget` 开启时注册 `NewContextWindowHandler`,并把 exposure 设置为 `ToolExposure::DirectModelOnly`;同一个 gate 也注册 `GetContextRemainingHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:709] [E: codex-rs/core/src/tools/spec_plan.rs:710] [E: codex-rs/core/src/tools/spec_plan.rs:711]

## 7 parallel-safe

`NewContextWindowHandler` 没有覆写 `supports_parallel_tool_calls`,因此使用 `ToolExecutor` 默认值 `false`。[E: codex-rs/tools/src/tool_executor.rs:64] [E: codex-rs/tools/src/tool_executor.rs:65]

## 8 handler 走读

handler 只接受 function payload;收到其他 payload 会返回 `new_context handler received unsupported payload`。合法调用会触发 session 的 `request_new_context_window().await`,再返回固定成功文本。[E: codex-rs/core/src/tools/handlers/new_context_window.rs:27] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:29] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:31] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:35] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:37] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:38] [E: codex-rs/core/src/tools/handlers/new_context_window.rs:39]

## 9 设计动机·edge·历史

`new_context` 通过 `DirectModelOnly` 暴露,表示它在初始模型工具面可见,但不会作为 code-mode nested tool 暴露。[E: codex-rs/tools/src/tool_executor.rs:32] [E: codex-rs/tools/src/tool_executor.rs:31] [E: codex-rs/core/src/tools/spec_plan.rs:710]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/new_context_window.rs
- codex-rs/core/src/tools/handlers/new_context_window_spec.rs
- codex-rs/tools/src/tool_executor.rs

## 相关

- `tool.get-context-remaining`
- `subsys.core.tool-system`
- `subsys.core.context-manager`
