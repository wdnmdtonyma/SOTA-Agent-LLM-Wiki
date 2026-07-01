---
id: tool.request-user-input
title: request_user_input 工具
kind: tool
tier: T1
source: [codex-rs/core/src/config/mod.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/request_user_input_spec.rs, codex-rs/core/src/tools/handlers/request_user_input.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/features/src/lib.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/protocol.rs]
symbols: [experimental_request_user_input_enabled, request_user_input_available_modes, create_request_user_input_tool, normalize_request_user_input_args, request_user_input_unavailable_message, RequestUserInputHandler, Session::request_user_input, Session::notify_user_input_response, RequestUserInputArgs, RequestUserInputEvent]
related: [spine.tool-call-anatomy, subsys.core.tool-system, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: db887d03e1
---

> `request_user_input` 是 Codex 让 root thread 向用户提出短问题并等待回答的本地 function tool。工具描述建议 1-3 个问题；handler 解析并规范化问题后调用 `Session::request_user_input`，该 session 方法发出 `EventMsg::RequestUserInput` 并等待 `Op::UserInputAnswer` 唤醒 pending oneshot。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:142][E: codex-rs/core/src/tools/handlers/request_user_input.rs:70][E: codex-rs/core/src/tools/handlers/request_user_input.rs:71][E: codex-rs/core/src/tools/handlers/request_user_input.rs:74][E: codex-rs/core/src/tools/handlers/request_user_input.rs:75][E: codex-rs/core/src/session/mod.rs:2445][E: codex-rs/core/src/session/mod.rs:2468][E: codex-rs/core/src/session/mod.rs:2478][E: codex-rs/core/src/session/handlers.rs:782]

## 能回答的问题

- `request_user_input` 的 schema、`autoResolutionMs` 和 option 字段是什么？
- 它的工具可见性和 collaboration mode 可用性分别由什么控制？
- 为什么 sub-agent 不能调用？
- `isOther` 为什么不是模型 schema 字段，却会在 runtime 变成 true？
- 用户回答如何从客户端回到 pending tool call？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `REQUEST_USER_INPUT_TOOL_NAME` 是 `request_user_input`；handler 的 `tool_name()` 返回该常量。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:8][E: codex-rs/core/src/tools/handlers/request_user_input.rs:23][E: codex-rs/core/src/tools/handlers/request_user_input.rs:24][E: codex-rs/core/src/tools/handlers/request_user_input.rs:25] |
| concrete handler | `RequestUserInputHandler` 保存 `available_modes: Vec<ModeKind>`，`spec()` 用当前 available modes 构造描述。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:19][E: codex-rs/core/src/tools/handlers/request_user_input.rs:20][E: codex-rs/core/src/tools/handlers/request_user_input.rs:28][E: codex-rs/core/src/tools/handlers/request_user_input.rs:29] |
| ToolSpec | `create_request_user_input_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`，`output_schema` 为 `None`。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:12][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:80][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:90] |
| exposure | `spec_plan` 用 `planned_tools.add_with_exposure(..., ToolExposure::DirectModelOnly)` 注册它。[E: codex-rs/core/src/tools/spec_plan.rs:719][E: codex-rs/core/src/tools/spec_plan.rs:720][E: codex-rs/core/src/tools/spec_plan.rs:724] |

## 2 用途定位

工具描述明确说它会请求用户回答短问题并等待响应；`autoResolutionMs` 只适合非阻塞、可按最佳判断继续的情形，取值范围是 60,000 到 240,000 毫秒。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:9][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:10][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:142]

它不是 MCP elicitation：模型调用普通 function tool，core 把它转成 `EventMsg::RequestUserInput(RequestUserInputEvent { ... })`；客户端再用 `Op::UserInputAnswer { id, response }` 返回答案，其中 `id` 是 in-flight request 的 turn id。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:50][E: codex-rs/core/src/tools/handlers/request_user_input.rs:51][E: codex-rs/core/src/session/mod.rs:2468][E: codex-rs/protocol/src/protocol.rs:605][E: codex-rs/protocol/src/protocol.rs:607][E: codex-rs/protocol/src/protocol.rs:609][E: codex-rs/protocol/src/protocol.rs:1383]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `questions` | array<object> | 是 | 无 | 要展示的问题；description 建议 1 个且不超过 3 个。 | 顶层 required 只包含 `questions`；当前 runtime 未见数量校验。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:57][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:68][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:85][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:87][I] |
| `questions[].id` | string | 是 | 无 | 映射答案的稳定 snake_case identifier。 | question required 包含 `id`。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:37][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:39][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:61] |
| `questions[].header` | string | 是 | 无 | UI 中的短 header。 | schema description 提示 12 字以内；runtime 未见长度校验。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:43][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:45][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:62][I] |
| `questions[].question` | string | 是 | 无 | 展示给用户的一句 prompt。 | question required 包含 `question`。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:49][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:51][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:63] |
| `questions[].options` | array<object> | 是 | 无 | schema description 建议 2-3 个互斥选项，推荐项放第一，并且不要传 Other。 | runtime 只要求每个问题 options 非空；未见 2-3 个数校验。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:26][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:31][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:64][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:111][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:116][I] |
| `questions[].options[].label` | string | 是 | 无 | 用户可见短 label。 | option required 包含 `label`。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:15][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:16][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:28] |
| `questions[].options[].description` | string | 是 | 无 | 描述影响或 tradeoff 的一句话。 | option required 包含 `description`。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:19][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:21][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:28] |
| `autoResolutionMs` | number | 否 | 无 | 可选自动处理等待窗口，单位毫秒。 | normalization 会 clamp 到 `MIN_AUTO_RESOLUTION_MS` 和 `MAX_AUTO_RESOLUTION_MS`。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:71][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:72][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:123][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:125][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:132] |

协议层问题类型包含 `isOther` 和 `isSecret`，但 hand-written question schema 只列出 `id/header/question/options` 并关闭 additional properties；`normalize_request_user_input_args` 会把每个 question 的 `is_other` 设置为 true。[E: codex-rs/protocol/src/request_user_input.rs:19][E: codex-rs/protocol/src/request_user_input.rs:22][E: codex-rs/protocol/src/request_user_input.rs:23][E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:35][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:54][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:60][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:66][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:119][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:120]

## 4 输出

协议响应是 `RequestUserInputResponse { answers: HashMap<String, RequestUserInputAnswer> }`，单个 answer 是 `answers: Vec<String>`。[E: codex-rs/protocol/src/request_user_input.rs:40][E: codex-rs/protocol/src/request_user_input.rs:41][E: codex-rs/protocol/src/request_user_input.rs:45][E: codex-rs/protocol/src/request_user_input.rs:46]

handler 等到 response 后把它序列化成 JSON 文本，并用 `FunctionToolOutput::from_text(content, Some(true))` 返回给模型；如果 pending request 被取消，则返回给模型 `request_user_input was cancelled before receiving a response`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:74][E: codex-rs/core/src/tools/handlers/request_user_input.rs:75][E: codex-rs/core/src/tools/handlers/request_user_input.rs:78][E: codex-rs/core/src/tools/handlers/request_user_input.rs:82][E: codex-rs/core/src/tools/handlers/request_user_input.rs:88][E: codex-rs/core/src/tools/handlers/request_user_input.rs:90]

## 5 注册与门控

工具是否加入 plan 由 `Config.experimental_request_user_input_enabled` 控制；resolver 读取 `config_toml.tools.experimental_request_user_input.enabled`，缺省时启用。[E: codex-rs/core/src/config/mod.rs:1016][E: codex-rs/core/src/config/mod.rs:2447][E: codex-rs/core/src/config/mod.rs:2449][E: codex-rs/core/src/config/mod.rs:2451][E: codex-rs/core/src/config/mod.rs:2452]

注册时，`add_core_utility_tools` 在开关开启后构造 `RequestUserInputHandler { available_modes: request_user_input_available_modes(features) }`，并将 exposure 设为 DirectModelOnly。[E: codex-rs/core/src/tools/spec_plan.rs:708][E: codex-rs/core/src/tools/spec_plan.rs:719][E: codex-rs/core/src/tools/spec_plan.rs:721][E: codex-rs/core/src/tools/spec_plan.rs:722][E: codex-rs/core/src/tools/spec_plan.rs:724]

可用 mode 是另一层 gate：`ModeKind::allows_request_user_input()` 只允许 Plan；`Feature::DefaultModeRequestUserInput` 开启时，Default mode 也会被加入可用列表。[E: codex-rs/protocol/src/config_types.rs:632][E: codex-rs/protocol/src/config_types.rs:633][E: codex-rs/tools/src/tool_config.rs:38][E: codex-rs/tools/src/tool_config.rs:42][E: codex-rs/tools/src/tool_config.rs:43][E: codex-rs/tools/src/tool_config.rs:44][E: codex-rs/features/src/lib.rs:1212][E: codex-rs/features/src/lib.rs:1213][E: codex-rs/features/src/lib.rs:1214][E: codex-rs/features/src/lib.rs:1215]

handler 还拒绝非 root agent thread，并在 mode 不可用时通过 `request_user_input_unavailable_message` 返回 `request_user_input is unavailable in ... mode`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:59][E: codex-rs/core/src/tools/handlers/request_user_input.rs:61][E: codex-rs/core/src/tools/handlers/request_user_input.rs:65][E: codex-rs/core/src/tools/handlers/request_user_input.rs:66][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:94][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:103]

## 6 parallel support

`RequestUserInputHandler` 未覆盖 `supports_parallel_tool_calls()`，因此使用 `ToolExecutor` 默认值 `false`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:23][E: codex-rs/core/src/tools/handlers/request_user_input.rs:35][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`；其它 payload 返回 unsupported payload 错误。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:50][E: codex-rs/core/src/tools/handlers/request_user_input.rs:51][E: codex-rs/core/src/tools/handlers/request_user_input.rs:53][E: codex-rs/core/src/tools/handlers/request_user_input.rs:54]
2. 它拒绝 sub-agent thread，然后读取 session 当前 collaboration mode 并检查可用 mode。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:59][E: codex-rs/core/src/tools/handlers/request_user_input.rs:65][E: codex-rs/core/src/session/mod.rs:3038][E: codex-rs/core/src/session/mod.rs:3040]
3. 参数解析和 normalize 完成后，handler 调用 `session.request_user_input(turn.as_ref(), call_id, args).await`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:70][E: codex-rs/core/src/tools/handlers/request_user_input.rs:71][E: codex-rs/core/src/tools/handlers/request_user_input.rs:72][E: codex-rs/core/src/tools/handlers/request_user_input.rs:74][E: codex-rs/core/src/tools/handlers/request_user_input.rs:75]
4. `Session::request_user_input` 以当前 `turn_context.sub_id` 写入 pending user input oneshot，并发送 `EventMsg::RequestUserInput`，其中包含 call id、turn id、questions 和 auto-resolution ms；发送前还标记本 turn 请求过 user input。[E: codex-rs/core/src/session/mod.rs:2451][E: codex-rs/core/src/session/mod.rs:2452][E: codex-rs/core/src/session/mod.rs:2459][E: codex-rs/core/src/session/mod.rs:2468][E: codex-rs/core/src/session/mod.rs:2469][E: codex-rs/core/src/session/mod.rs:2470][E: codex-rs/core/src/session/mod.rs:2471][E: codex-rs/core/src/session/mod.rs:2472][E: codex-rs/core/src/session/mod.rs:2474][E: codex-rs/core/src/session/mod.rs:2476][E: codex-rs/core/src/session/mod.rs:2477]
5. 客户端响应走 `Op::UserInputAnswer { id, response }`，其中 `id` 是 in-flight request 的 turn id；session handler 调用 `request_user_input_response`，最终 `notify_user_input_response` 按 id 移除 pending entry 并发送 response。[E: codex-rs/protocol/src/protocol.rs:605][E: codex-rs/protocol/src/protocol.rs:607][E: codex-rs/protocol/src/protocol.rs:609][E: codex-rs/core/src/session/handlers.rs:782][E: codex-rs/core/src/session/handlers.rs:783][E: codex-rs/core/src/session/handlers.rs:414][E: codex-rs/core/src/session/handlers.rs:419][E: codex-rs/core/src/session/mod.rs:2485][E: codex-rs/core/src/session/mod.rs:2495][E: codex-rs/core/src/session/mod.rs:2501][E: codex-rs/core/src/session/mod.rs:2502]

## Sources

- `codex-rs/core/src/config/mod.rs`
- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/request_user_input_spec.rs`
- `codex-rs/core/src/tools/handlers/request_user_input.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/request_user_input.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Collaboration modes](../../subsystems/core/collaboration-modes.md)
