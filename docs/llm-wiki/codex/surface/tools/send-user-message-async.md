---
id: tool.send-user-message-async
title: send_message_to_user_async 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/handlers/send_message_to_user_async.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/tests/suite/request_user_input_async.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/protocol.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [SendMessageToUserAsyncHandler, SendMessageToUserAsyncArgs, AgentMessageDelivery]
related: [tool.request-user-input, tool.request-user-input-async, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> `send_message_to_user_async` 是 opt-in 的 DirectModelOnly function tool：模型提交一条非空 `message` 后立即返回 `{"accepted":true}`，把文本作为 `AgentMessageDelivery::Async` turn item 发给客户端，**不结束当前 turn**，也不等待用户回复。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:21][E: codex-rs/core/src/tools/spec_plan.rs:1197][E: codex-rs/core/src/tools/spec_plan.rs:1199][E: codex-rs/core/tests/suite/request_user_input_async.rs:295][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:91]

## 能回答的问题

- `send_message_to_user_async` 的 wire name、ToolSpec 类型和 handler 是什么？
- 它在什么门控下才会进入 `ToolRegistry`？
- 输入 schema 只接受哪些字段，空 message 会怎样？
- 成功输出是什么，turn item 的 `delivery` / `phase` / `questions` 是什么？
- 它会不会结束当前 turn，会不会等待用户回复？
- 旧 catalog 名 `send_user_message_async` 现在还会注册这个 handler 吗？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `TOOL_NAME` / `SendMessageToUserAsyncHandler::tool_name()` 返回 plain `send_message_to_user_async`；spec 的 `ResponsesApiTool.name` 也是该常量。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:21][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:33][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:45] |
| concrete handler | 单元结构体 `SendMessageToUserAsyncHandler` 实现 `ToolExecutor<ToolInvocation>`。description **写死在** `spec()` 里，不读 model catalog。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:23][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:44] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool { ... })`，`strict: false`，`output_schema` 为 `None`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:44][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:48][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:55] |
| handler exposure | planner 用 `registry.add_with_exposure(..., ToolExposure::DirectModelOnly)` 注册，因此它出现在初始模型工具面，不会成为 code-mode nested tool。[E: codex-rs/core/src/tools/spec_plan.rs:1199] |

旧名 `send_user_message_async` **不是**本 handler 的 wire name。模型 catalog 仍广告该旧名时，planner 注册的是 `RequestUserInputAsyncHandler`（questions schema），见 [request_user_input_async 工具](request-user-input-async.md)。[E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/src/tools/spec_plan.rs:1181]

## 2 用途定位

内置 description 要求：向用户发送需要立即注意的简短消息（关键 blocker、可能改方向的发现、进行中工作里收到的提问/状态请求）。工具立即返回，不结束 turn，也不等待回复；日常进度用 commentary。用户若回复，会作为新的 user message 异步到达。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:44]

它和阻塞版 `request_user_input`、异步问答 `request_user_input_async` 都不同：本工具只投递一条 `message` 文本，turn item 的 `questions` 为 `None`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:92] 集成测试确认 user-visible item 不会把这段文本再注入成模型 context 里的合成 assistant message。[E: codex-rs/core/tests/suite/request_user_input_async.rs:301][E: codex-rs/core/tests/suite/request_user_input_async.rs:307]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `message` | string | 是 | 无 | 发给用户的简短问题/说明。 | schema required 只含 `message`；`additional_properties` 关闭；`SendMessageToUserAsyncArgs` 使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:26][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:26][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:48][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:52] |

handler 对 `message` 做 `trim()`；空字符串返回 `message must not be empty`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:77][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:80][E: codex-rs/core/tests/suite/request_user_input_async.rs:298]

## 4 输出 schema & 截断

`output_schema` 为 `None`。成功时 `FunctionToolOutput` 正文是固定 JSON `{"accepted":true}`，`success` 为 `Some(true)`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:55][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:94][E: codex-rs/core/tests/suite/request_user_input_async.rs:295]

真实用户可见内容走 turn item，不在 tool output 里：`TurnItem::AgentMessage`，`delivery: Some(AgentMessageDelivery::Async)`，`phase: Some(MessagePhase::FinalAnswer)`，`questions: None`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:84][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:89][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:91][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:92][E: codex-rs/protocol/src/items.rs:132]

## 5 ToolSpec 类型

`ToolSpec::Function`。它不是 namespace tool，也不是 freeform / hosted search。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:44]

## 6 注册与门控

`add_core_utility_tools` 同时要求：

1. `!turn_context.session_source.is_non_root_agent()`。`is_non_root_agent()` 对 `SessionSource::Internal(_)` 与 `SessionSource::SubAgent(_)` 为真，因此 subagent / internal session 不注册。[E: codex-rs/core/src/tools/spec_plan.rs:1192][E: codex-rs/protocol/src/protocol.rs:2879][E: codex-rs/protocol/src/protocol.rs:2882]
2. `model_info.experimental_supported_tools` **精确包含**字符串 `"send_message_to_user_async"`。[E: codex-rs/core/src/tools/spec_plan.rs:1197]

两个条件都满足时，`registry.add_with_exposure(SendMessageToUserAsyncHandler, ToolExposure::DirectModelOnly)`。[E: codex-rs/core/src/tools/spec_plan.rs:1199]

仅广告旧名 `"send_user_message_async"` 或新问答名 `"request_user_input_async"` **不会**注册本工具。[E: codex-rs/core/tests/suite/request_user_input_async.rs:124][E: codex-rs/core/tests/suite/request_user_input_async.rs:125][E: codex-rs/core/tests/suite/request_user_input_async.rs:171]

Guardian reviewer turn 在 `add_core_tool_sources` 因 `is_basic_session_source` 提前 `return`，不会走到 `add_core_utility_tools`，因此不会暴露本工具。[E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:1029]

集成测试覆盖：root 且模型未声明则不可见；root + 精确声明 `send_message_to_user_async` 才可见；subagent 即使声明也不注册。[E: codex-rs/core/tests/suite/request_user_input_async.rs:123][E: codex-rs/core/tests/suite/request_user_input_async.rs:126][E: codex-rs/core/tests/suite/request_user_input_async.rs:127]

effective exposure 以 `finalize_tool_router` 后的 registry 为准。[E: codex-rs/core/src/tools/spec_plan.rs:188]

## 7 parallel-safe

`SendMessageToUserAsyncHandler` 没有覆写 `supports_parallel_tool_calls()`，因此使用 `ToolExecutor` 默认 `false`。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## 8 handler 走读

1. 只接受 `ToolPayload::Function { arguments }`，否则返回 `send_message_to_user_async handler received unsupported payload`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:71]
2. 反序列化 `SendMessageToUserAsyncArgs`，trim 后拒绝空 `message`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:76][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:79]
3. 构造 `TurnItem::AgentMessage`，`id` 用当前 `call_id`，然后 `emit_turn_item_started` / `emit_turn_item_completed`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:84][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:94]
4. 立即返回 `{"accepted":true}`。handler 不订阅用户回复，也不 abort turn；后续模型采样会继续，测试看到后续 `/responses` 请求。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:97][E: codex-rs/core/tests/suite/request_user_input_async.rs:273][E: codex-rs/core/tests/suite/request_user_input_async.rs:274]

`CoreToolRuntime::is_builtin_control_tool()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:107]

## 9 设计动机·edge·历史

- 本工具从旧 `send_user_message_async` **拆出**：wire name 改为 `send_message_to_user_async`，schema 仍是 `{message: string}`。旧 catalog 名留给 questions-shaped 的 `request_user_input_async`。[E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/src/tools/spec_plan.rs:1197]
- 门控绑在模型 `experimental_supported_tools` 的**新名字**，而不是独立 feature flag，也不是旧名。[E: codex-rs/core/src/tools/spec_plan.rs:1197][I]
- 禁止 non-root agent 使用，避免子线程把异步消息发到用户主会话。[E: codex-rs/core/src/tools/spec_plan.rs:1192][E: codex-rs/core/tests/suite/request_user_input_async.rs:127][I]
- catalog `tools.send_user_message_async.description` 覆盖的是 `request_user_input_async`，不是本工具；本工具 description 始终是 handler 内置文案（测试断言含 “report a critical blocker”）。[E: codex-rs/core/tests/suite/request_user_input_async.rs:281][E: codex-rs/core/tests/suite/request_user_input_async.rs:286]

## Sources

- `codex-rs/core/src/tools/handlers/send_message_to_user_async.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/tests/suite/request_user_input_async.rs`
- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [request_user_input 工具](request-user-input.md)
- [request_user_input_async 工具](request-user-input-async.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
