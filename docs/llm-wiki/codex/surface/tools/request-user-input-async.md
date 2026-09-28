---
id: tool.request-user-input-async
title: request_user_input_async 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/handlers/request_user_input_async.rs, codex-rs/core/src/tools/handlers/send_message_to_user_async.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/prompts/src/model_messages.rs, codex-rs/core/tests/suite/request_user_input_async.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/context/world_state/persistent_mode.rs]
symbols: [RequestUserInputAsyncHandler, RequestUserInputAsyncArgs, AsyncUserInputQuestion]
related: [tool.send-user-message-async, tool.request-user-input, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `request_user_input_async` 是 opt-in 的 DirectModelOnly function tool：模型提交 `{questions: [{title, options?}]}` 后立即返回 `{"accepted":true}`，把问答渲染成 `AgentMessageDelivery::Async` turn item，**不结束当前 turn**，也不等待用户回复。模型 catalog 仍广告旧名 `"send_user_message_async"` 时，planner 注册的也是这个 handler，而不是 `SendMessageToUserAsyncHandler`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:22][E: codex-rs/core/src/tools/spec_plan.rs:1187][E: codex-rs/core/src/tools/spec_plan.rs:1193][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:139]

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
| wire name | `TOOL_NAME` / `RequestUserInputAsyncHandler::tool_name()` 返回 plain `request_user_input_async`；spec 的 `ResponsesApiTool.name` 也是该常量。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:22][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:37][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:80] |
| aliases | **没有**第二 wire name。旧 catalog 字符串 `"send_user_message_async"` 只用于 **门控与 description 查找**，模型看到的工具名仍是 `request_user_input_async`。[E: codex-rs/core/src/tools/spec_plan.rs:1187][E: codex-rs/core/tests/suite/request_user_input_async.rs:514][E: codex-rs/core/tests/suite/request_user_input_async.rs:539] |
| concrete handler | `RequestUserInputAsyncHandler { description: String, parameters: Option<String> }` 实现 `ToolExecutor<ToolInvocation>`。description 来自 `ResolvedModelMessages::request_user_input_async_description()`（catalog `tools.send_user_message_async.description`，否则内置常量）。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:24][E: codex-rs/core/src/tools/spec_plan.rs:1193][E: codex-rs/prompts/src/model_messages.rs:150] |
| ToolSpec | `ToolSpec::Function(ResponsesApiTool { ... })`，`strict: false`，`output_schema` 为 `None`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:79][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:82][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:85] |
| handler exposure | planner 用 `registry.add_with_exposure(..., ToolExposure::DirectModelOnly)` 注册，因此它出现在初始模型工具面，不会成为 code-mode nested tool。[E: codex-rs/core/src/tools/spec_plan.rs:1192][E: codex-rs/core/src/tools/spec_plan.rs:1201] |

## 2 用途定位

默认 description（`REQUEST_USER_INPUT_ASYNC_DESCRIPTION`）：在进行中的工作里向用户提出一个或多个问题，只用于缺失信息、偏好、约束、澄清或批准。工具立即返回，不结束 turn，也不等待回复；用户若回复，会作为新的 user message 异步到达。UI 始终允许自由文本，即使提供了 suggested options；预选项不会自动提交。[E: codex-rs/prompts/src/model_messages.rs:51]

它和阻塞版 `request_user_input` 不同：后者走 `Session::request_user_input` + `Op::UserInputAnswer`，本工具只 emit 带 `questions` 的异步 agent message。它和 `send_message_to_user_async` 也不同：后者 schema 是 `{message: string}`，turn item `questions` 为 `None`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:139][E: codex-rs/core/src/tools/handlers/send_message_to_user_async.rs:92]

## 3 输入 schema 表

顶层只允许必填字段 `questions`，`additional_properties` 关闭；`RequestUserInputAsyncArgs` 使用 `#[serde(deny_unknown_fields)]`。`questions` 数组 `min_items = 1`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:30][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:61][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:65]

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `questions` | array | 是 | 无 | 一组自包含问题，按展示顺序。 | handler 拒绝空数组，错误 `questions must not be empty`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:32][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:106][E: codex-rs/core/tests/suite/request_user_input_async.rs:557] |
| `questions[].title` | string | 是 | 无 | 展示给用户的完整问题（含作答所需上下文）。 | schema required 只含 `title`；trim 后为空则 `question titles must not be empty`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:48][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:51][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:114][E: codex-rs/core/tests/suite/request_user_input_async.rs:558] |
| `questions[].options` | array\<string\> | 否 | omit = 纯自由文本 | 建议答案，按展示顺序；推荐项放第一（默认预选）。不要放 Other / 自由文本占位，UI 会自动提供。 | schema `min_items = 1`；若字段存在，handler 拒绝空数组或任何 trim 后为空的 option，错误 `options must contain at least one non-empty answer`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:41][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:45][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:121][E: codex-rs/core/tests/suite/request_user_input_async.rs:559] |

协议类型是 `AsyncUserInputQuestion { title, options: Option<Vec<String>> }`，**没有**阻塞版的 `id` / `header` / `question` / `label`+`description` 结构。[E: codex-rs/protocol/src/items.rs:140][E: codex-rs/protocol/src/items.rs:141][E: codex-rs/protocol/src/items.rs:142]

## 4 输出 schema & 截断

`output_schema` 为 `None`。成功时 `FunctionToolOutput` 正文是固定 JSON `{"accepted":true}`，`success` 为 `Some(true)`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:85][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:144][E: codex-rs/core/tests/suite/request_user_input_async.rs:543]

真实用户可见内容走 turn item：`TurnItem::AgentMessage`，`delivery: Some(AgentMessageDelivery::Async)`，`phase: Some(MessagePhase::FinalAnswer)`，`questions: Some(args.questions)`。文本把每个 question 的 title 与 `- option` 行拼起来，问题之间用空行分隔。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:119][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:126][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:131][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:136][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:139][E: codex-rs/protocol/src/items.rs:133][E: codex-rs/protocol/src/items.rs:169]

无效参数只向模型返回错误字符串，**不** emit async agent message。[E: codex-rs/core/tests/suite/request_user_input_async.rs:561][E: codex-rs/core/tests/suite/request_user_input_async.rs:606]

## 5 ToolSpec 类型

`ToolSpec::Function`。它不是 namespace / freeform / hosted search。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:79]

## 6 注册与门控

`add_core_utility_tools` 同时要求：

1. `!turn_context.session_source.is_non_root_agent()`。`is_non_root_agent()` 对 `SessionSource::Internal(_)` 与 `SessionSource::SubAgent(_)` 为真。[E: codex-rs/core/src/tools/spec_plan.rs:1178][E: codex-rs/protocol/src/protocol.rs:2962][E: codex-rs/protocol/src/protocol.rs:2965]
2. `model_info.experimental_supported_tools` 含 `"request_user_input_async"` **或** `"send_user_message_async"`。源码注释写明 existing model catalogs still advertise the previous name。[E: codex-rs/core/src/tools/spec_plan.rs:1187]

两个条件都满足时注册 `RequestUserInputAsyncHandler`，exposure `DirectModelOnly`。description 经 `request_user_input_async_description()` 读 catalog `send_user_message_async`；`None` 回退 `REQUEST_USER_INPUT_ASYNC_DESCRIPTION`。可选 `parameters` override 解析失败则告警并改用 bundled schema。[E: codex-rs/core/src/tools/spec_plan.rs:1193][E: codex-rs/prompts/src/model_messages.rs:150][E: codex-rs/prompts/src/model_messages.rs:155][E: codex-rs/protocol/src/openai_models.rs:585][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:68]

本工具 **不**看 `experimental_request_user_input_enabled`（那是阻塞版 `request_user_input` 的门），也 **不**走 `Feature::SendMessageToUserAsync`（那是 sibling `send_message_to_user_async` 的 feature 半边）。[E: codex-rs/core/src/tools/spec_plan.rs:1169][E: codex-rs/core/src/tools/spec_plan.rs:1178][E: codex-rs/core/src/tools/spec_plan.rs:1206]

`add_core_tool_sources` 在 `require_managed_sandbox` 且（thread profile 不是 Managed，或任一 turn environment 不是 Managed）时 early return，从而跳过 `add_core_utility_tools`（本 handler 在该函数里按 experimental 名注册）。[E: codex-rs/core/src/tools/spec_plan.rs:1018][E: codex-rs/core/src/tools/spec_plan.rs:1022][E: codex-rs/core/src/tools/spec_plan.rs:1028][E: codex-rs/core/src/tools/spec_plan.rs:1034][E: codex-rs/core/src/tools/spec_plan.rs:1187][E: codex-rs/core/src/tools/spec_plan.rs:1193]

集成测试：root + 旧名或新名都使 `request_user_input_async` 出现在模型 tools 里；工具面里 **没有** 名为 `send_user_message_async` 的 function。[E: codex-rs/core/tests/suite/request_user_input_async.rs:119][E: codex-rs/core/tests/suite/request_user_input_async.rs:539] subagent 即使模型声明旧名也不出现。[E: codex-rs/core/tests/suite/request_user_input_async.rs:38][E: codex-rs/core/tests/suite/request_user_input_async.rs:120]

effective exposure 以 `finalize_tool_router` 后的 registry 为准。[E: codex-rs/core/src/tools/spec_plan.rs:181]

## 7 parallel-safe

`RequestUserInputAsyncHandler` 没有覆写 `supports_parallel_tool_calls()`，因此使用 `ToolExecutor` 默认 `false`。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## 8 handler 走读

1. 只接受 `ToolPayload::Function { arguments }`，否则返回 `request_user_input_async handler received unsupported payload`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:101]
2. 反序列化 `RequestUserInputAsyncArgs`；拒绝空 `questions`、空 title、空/含空白 option。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:106][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:114][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:121]
3. 把每个 question 渲染成 title + optional `- option` 行，再用 `\n\n` 拼成一条 agent message 文本。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:119][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:128]
4. 构造 `TurnItem::AgentMessage`（`questions: Some(args.questions)`），`emit_turn_item_started` / `emit_turn_item_completed`，立即返回 `{"accepted":true}`。不订阅用户回复，也不 abort turn；测试看到第二次 `/responses` 请求。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:131][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:141][E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:144][E: codex-rs/core/tests/suite/request_user_input_async.rs:507]

`CoreToolRuntime::is_builtin_control_tool()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/request_user_input_async.rs:154]

## 9 设计动机·edge·历史

- 从旧 `send_user_message_async` **拆出 questions 形状**：live wire name 是 `request_user_input_async`；existing catalogs 仍广告 `"send_user_message_async"`，所以门控与 catalog description 都认旧名。[E: codex-rs/core/src/tools/spec_plan.rs:1184][E: codex-rs/core/src/tools/spec_plan.rs:1187]
- 消息形状的异步工具改名为 `send_message_to_user_async`，见 [send_message_to_user_async 工具](send-user-message-async.md)。不要把旧 catalog 名写成 `SendMessageToUserAsyncHandler` 的 wire name。
- Persistent-mode 文案插值仍检查 `experimental_supported_tools` 是否含 `"send_user_message_async"`，命中则插入 ` via functions.send_user_message_async`——即使用户可见工具名已经是 `request_user_input_async`。[E: codex-rs/core/src/session/world_state.rs:212][E: codex-rs/core/src/session/world_state.rs:219][E: codex-rs/core/src/context/world_state/persistent_mode.rs:58][E: codex-rs/core/tests/suite/request_user_input_async.rs:111]
- 禁止 non-root agent 使用，避免子线程把异步提问发到用户主会话。[E: codex-rs/core/src/tools/spec_plan.rs:1178][E: codex-rs/core/tests/suite/request_user_input_async.rs:38][I]

## Sources

- `codex-rs/core/src/tools/handlers/request_user_input_async.rs`
- `codex-rs/core/src/tools/handlers/send_message_to_user_async.rs`
- `codex-rs/prompts/src/model_messages.rs`
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
