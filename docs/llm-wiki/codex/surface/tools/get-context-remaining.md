---
id: tool.get-context-remaining
title: get_context_remaining 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/get_context_remaining.rs, codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [GetContextRemainingHandler, create_get_context_remaining_tool, GET_CONTEXT_REMAINING_TOOL_NAME, Feature::TokenBudget]
related: [tool.new-context, subsys.core.tool-system, subsys.core.context-manager]
evidence: explicit
status: verified
updated: db887d03e1
---

> `get_context_remaining` 查询当前 context window 剩余 token 数,在 token-budget feature 下与 `new_context` 同时注册。

## 能回答的问题

- `get_context_remaining` 返回什么字段?
- context window 不可得时返回什么?
- `get_context_remaining` 的注册 gate 是什么?
- `get_context_remaining` 在 code-mode 中如何表达结果?

## 1 Identity

`GET_CONTEXT_REMAINING_TOOL_NAME` 的值是 `get_context_remaining`,handler 是 `GetContextRemainingHandler`。[E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:8] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:59]

`GetContextRemainingHandler::tool_name` 返回 plain `get_context_remaining`,`spec()` 返回 `create_get_context_remaining_tool()`。[E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:62] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:63] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:66] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:67]

## 2 用途定位

`get_context_remaining` 的模型描述是获取当前 context window 剩余 token 数。[E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:13]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| 无 | object | 否 | 空对象 | spec 使用空 object 参数,无 required 字段,且 `additionalProperties=false`。[E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:16] |

## 4 输出 schema & 截断

`get_context_remaining` 的 output schema 是 object,包含必填 `tokens_left`;该字段可以是 integer 或 null。[E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:17] [E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:23] [E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:25] [E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:27] [E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:28] [E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:33]

handler 调用 `context_window_token_status(session, turn)` 取得当前 context-window 状态,并把 `tokens_until_compaction` 作为 `tokens_left` 输出；该值不可得时保持为 `null`。[E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:78] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:79] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:80] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:84] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:85]

## 5 ToolSpec 类型

`get_context_remaining` 是 `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:10] [E: codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs:11]

## 6 注册与门控

`add_core_utility_tools` 在 `Feature::TokenBudget` 开启时注册 `NewContextWindowHandler` 和 `GetContextRemainingHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:732] [E: codex-rs/core/src/tools/spec_plan.rs:733] [E: codex-rs/core/src/tools/spec_plan.rs:734]

## 7 parallel-safe

`GetContextRemainingHandler` 没有覆写 `supports_parallel_tool_calls`,因此使用 `ToolExecutor` 默认值 `false`。[E: codex-rs/tools/src/tool_executor.rs:64] [E: codex-rs/tools/src/tool_executor.rs:65]

## 8 handler 走读

handler 只接受 function payload,随后读取 session 与 turn 的 context-window token 状态,最后返回 `GetContextRemainingOutput`。[E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:72] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:78] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:79] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:84]

`GetContextRemainingOutput` 会把普通 tool output 渲染成上下文片段文本,但 code-mode result 是 JSON `{ "tokens_left": ... }`。[E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:28] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:47] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:48] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:53] [E: codex-rs/core/src/tools/handlers/get_context_remaining.rs:54]

## 9 设计动机·edge·历史

`get_context_remaining` 与 `new_context` 同属 token-budget surface;前者只读剩余预算,后者请求切换新 context window。[I]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/get_context_remaining.rs
- codex-rs/core/src/tools/handlers/get_context_remaining_spec.rs
- codex-rs/tools/src/tool_executor.rs

## 相关

- `tool.new-context`
- `subsys.core.tool-system`
- `subsys.core.context-manager`
