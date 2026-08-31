---
id: tool.send-user-message-async
title: send_user_message_async 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/handlers/send_user_message_async.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/tests/suite/send_user_message_async.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/protocol.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [SendUserMessageAsyncHandler, SendUserMessageAsyncArgs, AgentMessageDelivery]
related: [tool.request-user-input, subsys.core.tool-system]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> `send_user_message_async` 是 opt-in 的 DirectModelOnly function tool：模型提交一条 `message` 后立即返回 `{"accepted":true}`，把文本作为 `AgentMessageDelivery::Async` turn item 发给客户端，**不结束当前 turn**，也不等待用户回复。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:21][E: codex-rs/core/src/tools/spec_plan.rs:1173][E: codex-rs/core/src/tools/spec_plan.rs:1188][E: codex-rs/core/tests/suite/send_user_message_async.rs:128][E: codex-rs/core/tests/suite/send_user_message_async.rs:250]

## 能回答的问题

- `send_user_message_async` 的 wire name、ToolSpec 类型和 handler 是什么？
- 它在什么门控下才会进入 `ToolRegistry`？
- 输入 schema 只接受哪些字段，空 message 会怎样？
- 成功输出是什么，turn item 的 `delivery` / `phase` 是什么？
- 它会不会结束当前 turn，会不会等待用户回复？
- 为什么它是 DirectModelOnly，是否支持 parallel tool calls？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `SendUserMessageAsyncHandler::tool_name()` 返回 plain `send_user_message_async`；spec 的 `ResponsesApiTool.name` 也是该常量。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:21][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:34][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:47] |
| concrete handler | `SendUserMessageAsyncHandler` 实现 `ToolExecutor<ToolInvocation>`；可选 `description` 来自 model catalog 的 `tools.send_user_message_async`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:23][E: codex-rs/core/src/tools/spec_plan.rs:1181] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool { ... })`，`strict: false`，`output_schema` 为 `None`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:46][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:52][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:59] |
| handler exposure | planner 用 `registry.add_with_exposure(..., ToolExposure::DirectModelOnly)` 注册，因此它出现在初始模型工具面，不会成为 code-mode nested tool。[E: codex-rs/core/src/tools/spec_plan.rs:1180][E: codex-rs/core/src/tools/spec_plan.rs:1188] |

## 2 用途定位

默认 description 要求：在进行中的工作里向用户发送需要注意的简短消息；只用于缺失信息、偏好、约束、澄清或批准。工具立即返回，不结束 turn，也不等待回复；用户若回复，会作为新的 user message 异步到达。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:48]

它和 `request_user_input` 不同：后者阻塞等待结构化问答；本工具只投递一条异步 agent message。集成测试确认 user-visible item 不会把这段文本再注入成模型 context 里的合成 assistant message。[E: codex-rs/core/tests/suite/send_user_message_async.rs:253][E: codex-rs/core/tests/suite/send_user_message_async.rs:260]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `message` | string | 是 | 无 | 发给用户的简短问题/说明。 | schema required 只含 `message`；`additional_properties` 关闭；`SendUserMessageAsyncArgs` 使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:28][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:30][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:39][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:56] |

handler 对 `message` 做 `trim()`；空字符串返回 `message must not be empty`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:81][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:83]

## 4 输出 schema & 截断

`output_schema` 为 `None`。成功时 `FunctionToolOutput` 正文是固定 JSON `{"accepted":true}`，`success` 为 `Some(true)`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:59][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:100][E: codex-rs/core/tests/suite/send_user_message_async.rs:250]

真实用户可见内容走 turn item，不在 tool output 里：`TurnItem::AgentMessage`，`delivery: Some(AgentMessageDelivery::Async)`，`phase: Some(MessagePhase::FinalAnswer)`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:88][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:93][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:95][E: codex-rs/protocol/src/items.rs:132]

## 5 ToolSpec 类型

`ToolSpec::Function`。它不是 namespace tool，也不是 freeform / hosted search。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:46]

## 6 注册与门控

`add_core_utility_tools` 同时要求：

1. `!turn_context.session_source.is_non_root_agent()`。`is_non_root_agent()` 对 `SessionSource::Internal(_)` 与 `SessionSource::SubAgent(_)` 为真，因此 subagent / internal session 不注册。[E: codex-rs/core/src/tools/spec_plan.rs:1173][E: codex-rs/protocol/src/protocol.rs:2836][E: codex-rs/protocol/src/protocol.rs:2839]
2. `model_info.experimental_supported_tools` 含字符串 `"send_user_message_async"`。[E: codex-rs/core/src/tools/spec_plan.rs:1178]

两个条件都满足时，`registry.add_with_exposure(SendUserMessageAsyncHandler { description }, ToolExposure::DirectModelOnly)`。description 取 `model_messages.tools.send_user_message_async.description`；缺失则用 handler 内置 fallback。[E: codex-rs/core/src/tools/spec_plan.rs:1181][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:48]

Guardian reviewer turn 在 `add_core_tool_sources` 提前 `return`，不会走到 `add_core_utility_tools`，因此不会暴露本工具。[E: codex-rs/core/src/tools/spec_plan.rs:989][E: codex-rs/core/src/tools/spec_plan.rs:1036][E: codex-rs/core/src/tools/spec_plan.rs:1041]

集成测试覆盖：root + 模型声明该 tool 才可见；subagent 即使模型声明也不注册。[E: codex-rs/core/tests/suite/send_user_message_async.rs:34][E: codex-rs/core/tests/suite/send_user_message_async.rs:36]

## 7 parallel-safe

`SendUserMessageAsyncHandler` 没有覆写 `supports_parallel_tool_calls()`，因此使用 `ToolExecutor` 默认 `false`。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## 8 handler 走读

1. 只接受 `ToolPayload::Function { arguments }`，否则返回 `send_user_message_async handler received unsupported payload`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:75]
2. 反序列化 `SendUserMessageAsyncArgs`，trim 后拒绝空 `message`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:80][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:83]
3. 构造 `TurnItem::AgentMessage`，`id` 用当前 `call_id`，然后 `emit_turn_item_started` / `emit_turn_item_completed`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:88][E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:97]
4. 立即返回 `{"accepted":true}`。handler 不订阅用户回复，也不 abort turn；后续模型采样会继续，测试看到第二次 `/responses` 请求。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:100][E: codex-rs/core/tests/suite/send_user_message_async.rs:237][E: codex-rs/core/tests/suite/send_user_message_async.rs:238]

`CoreToolRuntime::is_builtin_control_tool()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/send_user_message_async.rs:109]

## 9 设计动机·edge·历史

- 门控绑在模型 `experimental_supported_tools`，而不是独立 feature flag，便于按模型 catalog 逐步放开。[E: codex-rs/core/src/tools/spec_plan.rs:1178][I]
- 禁止 non-root agent 使用，避免子线程把异步提问发到用户主会话。[E: codex-rs/core/src/tools/spec_plan.rs:1173][E: codex-rs/core/tests/suite/send_user_message_async.rs:36][I]
- catalog 可覆盖 description；空 description / 缺失 tool message 都回退到内置文案。[E: codex-rs/core/tests/suite/send_user_message_async.rs:122][E: codex-rs/core/tests/suite/send_user_message_async.rs:125]

## Sources

- `codex-rs/core/src/tools/handlers/send_user_message_async.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/tests/suite/send_user_message_async.rs`
- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [request_user_input 工具](request-user-input.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
