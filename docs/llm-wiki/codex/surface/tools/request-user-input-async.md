---
id: tool.request-user-input-async
title: request_user_input_async 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/handlers/request_user_input_async.rs, codex-rs/core/src/tools/handlers/send_message_to_user_async.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/tests/suite/request_user_input_async.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/context/world_state/persistent_mode.rs]
symbols: [RequestUserInputAsyncHandler, RequestUserInputAsyncArgs, AsyncUserInputQuestion]
related: [tool.send-user-message-async, tool.request-user-input, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> `request_user_input_async` 是 opt-in 的 DirectModelOnly function tool：模型提交 `{questions: [{title, options?}]}` 后立即返回 `{"accepted":true}`，把问答渲染成 `AgentMessageDelivery::Async` turn item，**不结束当前 turn**，也不等待用户回复。模型 catalog 仍广告旧名 `"send_user_message_async"` 时，planner 注册的也是这个 handler，而不是 `SendMessageToUserAsyncHandler`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:22][E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/src/tools/spec_plan.rs:1181][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:130]

## 能回答的问题

- `request_user_input_async` 的 wire name、ToolSpec 类型和 handler 是什么？
- 旧 catalog 名 `send_user_message_async` 现在注册哪个 handler？
- 输入 schema 的 `title` / `options` 与阻塞版 `request_user_input` 有何不同？
- 成功输出是什么，turn item 怎样携带 `questions`？
- 它在什么门控下进入 `ToolRegistry`，subagent 看得到吗？
- 它会不会结束当前 turn，会不会等待用户回复？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `TOOL_NAME` / `RequestUserInputAsyncHandler::tool_name()` 返回 plain `request_user_input_async`；spec 的 `ResponsesApiTool.name` 也是该常量。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:22][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:36][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:64] |
| aliases | **没有**第二 wire name。旧 catalog 字符串 `"send_user_message_async"` 只用于 **门控与 description 查找**，模型看到的工具名仍是 `request_user_input_async`。[E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/tests/suite/request_user_input_async.rs:485][E: codex-rs/core/tests/suite/request_user_input_async.rs:503] |
| concrete handler | `RequestUserInputAsyncHandler { description: Option<String> }` 实现 `ToolExecutor<ToolInvocation>`。description 取自 model catalog `tools.send_user_message_async.description`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:24][E: codex-rs/core/src/tools/spec_plan.rs:1181][E: codex-rs/core/src/tools/spec_plan.rs:1185] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool { ... })`，`strict: false`，`output_schema` 为 `None`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:63][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:69][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:76] |
| handler exposure | planner 用 `registry.add_with_exposure(..., ToolExposure::DirectModelOnly)` 注册，因此它出现在初始模型工具面，不会成为 code-mode nested tool。[E: codex-rs/core/src/tools/spec_plan.rs:1180][E: codex-rs/core/src/tools/spec_plan.rs:1188] |

## 2 用途定位

默认 description：在进行中的工作里向用户提出一个或多个问题，只用于缺失信息、偏好、约束、澄清或批准。工具立即返回，不结束 turn，也不等待回复；用户若回复，会作为新的 user message 异步到达。UI 始终允许自由文本，即使提供了 suggested options；预选项不会自动提交。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:66]

它和阻塞版 `request_user_input` 不同：后者走 `Session::request_user_input` + `Op::UserInputAnswer`，本工具只 emit 带 `questions` 的异步 agent message。它和 `send_message_to_user_async` 也不同：后者 schema 是 `{message: string}`，turn item `questions` 为 `None`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:130][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:92]

## 3 输入 schema 表

顶层只允许必填字段 `questions`，`additional_properties` 关闭；`RequestUserInputAsyncArgs` 使用 `#[serde(deny_unknown_fields)]`。`questions` 数组 `min_items = 1`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:29][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:60][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:73]

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `questions` | array | 是 | 无 | 一组自包含问题，按展示顺序。 | handler 拒绝空数组，错误 `questions must not be empty`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:31][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:97][E: codex-rs/core/tests/suite/request_user_input_async.rs:521] |
| `questions[].title` | string | 是 | 无 | 展示给用户的完整问题（含作答所需上下文）。 | schema required 只含 `title`；trim 后为空则 `question titles must not be empty`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:47][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:50][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:105][E: codex-rs/core/tests/suite/request_user_input_async.rs:522] |
| `questions[].options` | array\<string\> | 否 | omit = 纯自由文本 | 建议答案，按展示顺序；推荐项放第一（默认预选）。不要放 Other / 自由文本占位，UI 会自动提供。 | schema `min_items = 1`；若字段存在，handler 拒绝空数组或任何 trim 后为空的 option，错误 `options must contain at least one non-empty answer`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:40][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:44][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:112][E: codex-rs/core/tests/suite/request_user_input_async.rs:523] |

协议类型是 `AsyncUserInputQuestion { title, options: Option<Vec<String>> }`，**没有**阻塞版的 `id` / `header` / `question` / `label`+`description` 结构。[E: codex-rs/protocol/src/items.rs:139][E: codex-rs/protocol/src/items.rs:140][E: codex-rs/protocol/src/items.rs:141]

## 4 输出 schema & 截断

`output_schema` 为 `None`。成功时 `FunctionToolOutput` 正文是固定 JSON `{"accepted":true}`，`success` 为 `Some(true)`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:76][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:135][E: codex-rs/core/tests/suite/request_user_input_async.rs:507]

真实用户可见内容走 turn item：`TurnItem::AgentMessage`，`delivery: Some(AgentMessageDelivery::Async)`，`phase: Some(MessagePhase::FinalAnswer)`，`questions: Some(args.questions)`。文本把每个 question 的 title 与 `- option` 行拼起来，问题之间用空行分隔。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:110][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:117][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:122][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:127][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:130][E: codex-rs/protocol/src/items.rs:132][E: codex-rs/protocol/src/items.rs:168]

无效参数只向模型返回错误字符串，**不** emit async agent message。[E: codex-rs/core/tests/suite/request_user_input_async.rs:525][E: codex-rs/core/tests/suite/request_user_input_async.rs:570]

## 5 ToolSpec 类型

`ToolSpec::Function`。它不是 namespace / freeform / hosted search。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:63]

## 6 注册与门控

`add_core_utility_tools` 同时要求：

1. `!turn_context.session_source.is_non_root_agent()`。`is_non_root_agent()` 对 `SessionSource::Internal(_)` 与 `SessionSource::SubAgent(_)` 为真。[E: codex-rs/core/src/tools/spec_plan.rs:1167][E: codex-rs/protocol/src/protocol.rs:2901][E: codex-rs/protocol/src/protocol.rs:2904]
2. `model_info.experimental_supported_tools` 含 `"request_user_input_async"` **或** `"send_user_message_async"`。源码注释写明 existing model catalogs still advertise the previous name。[E: codex-rs/core/src/tools/spec_plan.rs:1176]

两个条件都满足时注册 `RequestUserInputAsyncHandler`，exposure `DirectModelOnly`。description 取 `model_messages.tools.send_user_message_async.description`；`None` 才回退 handler 内置文案，空字符串会原样用空 description。[E: codex-rs/core/src/tools/spec_plan.rs:1181][E: codex-rs/core/src/tools/spec_plan.rs:1185][E: codex-rs/protocol/src/openai_models.rs:594][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:65][E: codex-rs/core/tests/suite/request_user_input_async.rs:341][E: codex-rs/core/tests/suite/request_user_input_async.rs:346]

本工具 **不**看 `experimental_request_user_input_enabled`（那是阻塞版 `request_user_input` 的门），也 **不**走 `Feature::SendMessageToUserAsync`（那是 sibling `send_message_to_user_async` 的 feature 半边）。[E: codex-rs/core/src/tools/spec_plan.rs:1158][E: codex-rs/core/src/tools/spec_plan.rs:1167][E: codex-rs/core/src/tools/spec_plan.rs:1193]

Guardian reviewer turn 在 `add_core_tool_sources` 提前 `return`，不会走到 `add_core_utility_tools`。[E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:1029]

集成测试：root + 旧名或新名都使 `request_user_input_async` 出现在模型 tools 里；工具面里 **没有** 名为 `send_user_message_async` 的 function。[E: codex-rs/core/tests/suite/request_user_input_async.rs:117][E: codex-rs/core/tests/suite/request_user_input_async.rs:503] subagent 即使模型声明旧名也不出现。[E: codex-rs/core/tests/suite/request_user_input_async.rs:38][E: codex-rs/core/tests/suite/request_user_input_async.rs:118]

effective exposure 以 `finalize_tool_router` 后的 registry 为准。[E: codex-rs/core/src/tools/spec_plan.rs:188]

## 7 parallel-safe

`RequestUserInputAsyncHandler` 没有覆写 `supports_parallel_tool_calls()`，因此使用 `ToolExecutor` 默认 `false`。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## 8 handler 走读

1. 只接受 `ToolPayload::Function { arguments }`，否则返回 `request_user_input_async handler received unsupported payload`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:92]
2. 反序列化 `RequestUserInputAsyncArgs`；拒绝空 `questions`、空 title、空/含空白 option。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:97][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:105][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:112]
3. 把每个 question 渲染成 title + optional `- option` 行，再用 `\n\n` 拼成一条 agent message 文本。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:110][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:119]
4. 构造 `TurnItem::AgentMessage`（`questions: Some(args.questions)`），`emit_turn_item_started` / `emit_turn_item_completed`，立即返回 `{"accepted":true}`。不订阅用户回复，也不 abort turn；测试看到第二次 `/responses` 请求。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:122][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:132][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:135][E: codex-rs/core/tests/suite/request_user_input_async.rs:478]

`CoreToolRuntime::is_builtin_control_tool()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:145]

## 9 设计动机·edge·历史

- 从旧 `send_user_message_async` **拆出 questions 形状**：live wire name 是 `request_user_input_async`；existing catalogs 仍广告 `"send_user_message_async"`，所以门控与 catalog description 都认旧名。[E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/src/tools/spec_plan.rs:1185]
- 消息形状的异步工具改名为 `send_message_to_user_async`，见 [send_message_to_user_async 工具](send-user-message-async.md)。不要把旧 catalog 名写成 `SendMessageToUserAsyncHandler` 的 wire name。
- Persistent-mode 文案插值仍检查 `experimental_supported_tools` 是否含 `"send_user_message_async"`，命中则插入 ` via functions.send_user_message_async`——即使用户可见工具名已经是 `request_user_input_async`。[E: codex-rs/core/src/session/world_state.rs:181][E: codex-rs/core/src/session/world_state.rs:188][E: codex-rs/core/src/context/world_state/persistent_mode.rs:63][E: codex-rs/core/tests/suite/request_user_input_async.rs:109]
- 禁止 non-root agent 使用，避免子线程把异步提问发到用户主会话。[E: codex-rs/core/src/tools/spec_plan.rs:1167][E: codex-rs/core/tests/suite/request_user_input_async.rs:38][I]

## Sources

- `codex-rs/core/src/tools/handlers/request_user_input_async.rs`
- `codex-rs/core/src/tools/handlers/send_message_to_user_async.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/tests/suite/request_user_input_async.rs`
- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/core/src/session/world_state.rs`
- `codex-rs/core/src/context/world_state/persistent_mode.rs`

## 相关

- [send_message_to_user_async 工具](send-user-message-async.md)
- [request_user_input 工具](request-user-input.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
