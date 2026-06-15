---
id: tool.request-user-input
title: request_user_input 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/request_user_input_tool.rs, docs/tui-request-user-input.md, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/request_user_input.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/protocol.rs]
symbols: [create_request_user_input_tool, request_user_input_tool_description, normalize_request_user_input_args, request_user_input_unavailable_message, RequestUserInputHandler, Session::request_user_input, RequestUserInputArgs, RequestUserInputEvent]
related: [spine.tool-call-anatomy, subsys.core.tool-system, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `request_user_input` 是 Codex 让模型向用户提出 1-3 个短问题并等待回答的本地 Function 工具；handler 会把问题转成 `EventMsg::RequestUserInput`，再等待客户端用 `RequestUserInputResponse` 唤醒 pending turn。[E: codex-rs/core/src/session/mod.rs:2044][E: codex-rs/core/src/session/mod.rs:2050]

## 能回答的问题

- `request_user_input` 的输入 schema、问题/options 字段和 UI 约束是什么？
- `request_user_input` 只在哪些 collaboration mode 可用？
- `request_user_input` 为什么不能由 sub-agent thread 调用？
- `request_user_input` 如何把模型调用挂起并等待用户响应？
- `request_user_input` 的 `isOther` 字段为什么模型不用传？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `request_user_input` | 常量 `REQUEST_USER_INPUT_TOOL_NAME` 固定为 `request_user_input`。[E: codex-rs/tools/src/request_user_input_tool.rs:9] |
| aliases | 未看到独立 alias；registry 用 `REQUEST_USER_INPUT_TOOL_NAME` 注册同名 handler。 | `plan.register_handler(REQUEST_USER_INPUT_TOOL_NAME, ToolHandlerKind::RequestUserInput)`。[E: codex-rs/tools/src/tool_registry_plan.rs:244][E: codex-rs/tools/src/tool_registry_plan.rs:245][I] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_request_user_input_tool` 返回 `ToolSpec::Function`。[E: codex-rs/tools/src/request_user_input_tool.rs:72] |
| ToolHandlerKind | `ToolHandlerKind::RequestUserInput` | `ToolHandlerKind` enum 包含 `RequestUserInput` 变体。[E: codex-rs/tools/src/tool_registry_plan_types.rs:29] |
| core handler | `RequestUserInputHandler` | `core/src/tools/spec.rs` 创建带 `default_mode_request_user_input` 的 handler。[E: codex-rs/core/src/tools/spec.rs:159] |
| 所属 crate | spec 在 `codex-tools`，执行在 `codex-core`，payload 类型在 `codex-protocol`。 | spec 文件导入 `RequestUserInputArgs`，handler 文件导入同一协议类型。[E: codex-rs/tools/src/request_user_input_tool.rs:6][E: codex-rs/core/src/tools/handlers/request_user_input.rs:9] |

## 2 用途定位

`request_user_input_tool_description` 生成的描述说该工具会请求用户回答 1-3 个短问题并等待响应，同时把可用 mode 写进工具描述。[E: codex-rs/tools/src/request_user_input_tool.rs:118][E: codex-rs/tools/src/request_user_input_tool.rs:121]  
TUI 设计文档说明 overlay 一次渲染一个问题，并收集“已选 option”和 freeform notes。[E: docs/tui-request-user-input.md:8][E: docs/tui-request-user-input.md:10][E: docs/tui-request-user-input.md:11]  
工具定位是阻塞当前 turn 等待明确用户输入；handler 最终返回用户回答的 JSON 字符串给模型。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:59][E: codex-rs/core/src/tools/handlers/request_user_input.rs:68][I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `questions` | array<object> | 是 | 无 | 要展示给用户的问题列表。 | schema description 建议 1 个且不超过 3 个问题；顶层 required 包含 `questions`。[E: codex-rs/tools/src/request_user_input_tool.rs:67][E: codex-rs/tools/src/request_user_input_tool.rs:79] |
| `questions[].id` | string | 是 | 无 | 用于映射回答的稳定 snake_case identifier。 | question item required 包含 `id`。[E: codex-rs/tools/src/request_user_input_tool.rs:38][E: codex-rs/tools/src/request_user_input_tool.rs:60] |
| `questions[].header` | string | 是 | 无 | UI 中显示的短 header。 | schema description 要求 12 字以内。[E: codex-rs/tools/src/request_user_input_tool.rs:42][E: codex-rs/tools/src/request_user_input_tool.rs:44] |
| `questions[].question` | string | 是 | 无 | 用户可见的一句 prompt。 | question item required 包含 `question`。[E: codex-rs/tools/src/request_user_input_tool.rs:50][E: codex-rs/tools/src/request_user_input_tool.rs:62] |
| `questions[].options` | array<object> | 是 | 无 | 2-3 个互斥选项，推荐项放第一，并且不要包含 Other。 | schema description 写明 2-3 个选择、推荐项后缀和 client 自动添加 Other；question item required 包含 `options`。[E: codex-rs/tools/src/request_user_input_tool.rs:29][E: codex-rs/tools/src/request_user_input_tool.rs:30][E: codex-rs/tools/src/request_user_input_tool.rs:63] |
| `questions[].options[].label` | string | 是 | 无 | 用户可见短标签。 | option item required 包含 `label`。[E: codex-rs/tools/src/request_user_input_tool.rs:15][E: codex-rs/tools/src/request_user_input_tool.rs:27] |
| `questions[].options[].description` | string | 是 | 无 | 说明选择影响或 tradeoff 的一句话。 | option item required 包含 `description`。[E: codex-rs/tools/src/request_user_input_tool.rs:20][E: codex-rs/tools/src/request_user_input_tool.rs:27] |

协议层 `RequestUserInputQuestion` 还有 `isOther` 与 `isSecret` 字段，但工具 schema 不让模型直接传这两个字段；`normalize_request_user_input_args` 会遍历问题并把 `question.is_other = true`。[E: codex-rs/protocol/src/request_user_input.rs:22][E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/tools/src/request_user_input_tool.rs:111][E: codex-rs/tools/src/request_user_input_tool.rs:112]  
runtime 校验要求每个 question 都有非空 options；缺 options 或空 options 会返回 `request_user_input requires non-empty options for every question`。[E: codex-rs/tools/src/request_user_input_tool.rs:106][E: codex-rs/tools/src/request_user_input_tool.rs:108]

## 4 输出 schema & 截断

`ResponsesApiTool.output_schema` 为 `None`，所以工具 spec 不声明结构化 output schema。[E: codex-rs/tools/src/request_user_input_tool.rs:82]  
协议响应是 `RequestUserInputResponse { answers: HashMap<String, RequestUserInputAnswer> }`，每个 answer 持有 `answers: Vec<String>`。[E: codex-rs/protocol/src/request_user_input.rs:38][E: codex-rs/protocol/src/request_user_input.rs:43]  
handler 把 `RequestUserInputResponse` 序列化成 JSON 文本并用 `FunctionToolOutput::from_text(content, Some(true))` 返回给模型。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:68][E: codex-rs/core/src/tools/handlers/request_user_input.rs:74]  
源码没有为 `request_user_input` 输出路径设置专用截断逻辑；输出走普通 `FunctionToolOutput` 文本路径。[E: codex-rs/core/src/tools/context.rs:242][E: codex-rs/core/src/tools/context.rs:277]

## 5 ToolSpec 类型

`request_user_input` 是普通 JSON Function 工具：schema 由 `JsonSchema::object` 生成，payload 由 handler 从 `ToolPayload::Function { arguments }` 解析。[E: codex-rs/tools/src/request_user_input_tool.rs:77][E: codex-rs/core/src/tools/handlers/request_user_input.rs:35]  
它不是 MCP elicitation 工具本身；Codex core 把函数调用转成 `EventMsg::RequestUserInput`，由客户端显示 overlay 并把回答作为 `Op::UserInputAnswer` / `request_user_input_response` 送回。[E: codex-rs/core/src/session/mod.rs:2044][E: codex-rs/protocol/src/protocol.rs:607]

## 6 注册与门控

`build_tool_registry_plan` push `create_request_user_input_tool(...)`，并以 `ToolHandlerKind::RequestUserInput` 注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:237][E: codex-rs/tools/src/tool_registry_plan.rs:245]  
工具描述中的可用 mode 来自 `config.default_mode_request_user_input`，这个 config 字段由 `Feature::DefaultModeRequestUserInput` 决定。[E: codex-rs/tools/src/tool_registry_plan.rs:238][E: codex-rs/tools/src/tool_config.rs:150][E: codex-rs/tools/src/tool_config.rs:231]  
`ModeKind::allows_request_user_input` 只对 `ModeKind::Plan` 返回 true；如果 `default_mode_request_user_input` feature 开启且 mode 是 `Default`，`request_user_input_is_available` 也允许使用。[E: codex-rs/protocol/src/config_types.rs:429][E: codex-rs/tools/src/request_user_input_tool.rs:126][E: codex-rs/tools/src/request_user_input_tool.rs:127]

## 7 parallel-safe

`request_user_input` 的 `supports_parallel_tool_calls` 实际值是 `false`。[E: codex-rs/tools/src/tool_registry_plan.rs:240]  
设计动机是该工具会打开用户交互 overlay 并等待回答；多个并发 request 会造成用户交互顺序与 pending response 映射复杂化。[I]  
TUI 文档也说明 overlay 一次渲染一个问题，并在多个问题时通过 PageUp/PageDown 导航；这支持将用户交互设计成串行问题 flow。[E: docs/tui-request-user-input.md:8][E: docs/tui-request-user-input.md:32][I]

## 8 handler 走读

1. `core/src/tools/spec.rs` 创建 `RequestUserInputHandler { default_mode_request_user_input: config.default_mode_request_user_input }`。[E: codex-rs/core/src/tools/spec.rs:158][E: codex-rs/core/src/tools/spec.rs:159]
2. `ToolHandlerKind::RequestUserInput` 分支把 handler 注册给 registry。[E: codex-rs/core/src/tools/spec.rs:239][E: codex-rs/core/src/tools/spec.rs:240]
3. handler 拒绝非 Function payload，错误文本包含 `request_user_input handler received unsupported payload`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:35][E: codex-rs/core/src/tools/handlers/request_user_input.rs:38]
4. handler 拒绝 `SessionSource::SubAgent(_)`，错误为 `request_user_input can only be used by the root thread`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:43][E: codex-rs/core/src/tools/handlers/request_user_input.rs:45]
5. handler 读取当前 collaboration mode，并调用 `request_user_input_unavailable_message` 做 mode gate。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:49][E: codex-rs/core/src/tools/handlers/request_user_input.rs:51]
6. handler 解析 `RequestUserInputArgs`，normalize 后调用 `session.request_user_input(turn.as_ref(), call_id, args)`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:56][E: codex-rs/core/src/tools/handlers/request_user_input.rs:60]
7. `Session::request_user_input` 在 active turn state 中以 `sub_id` 保存 oneshot sender。[E: codex-rs/core/src/session/mod.rs:2027][E: codex-rs/core/src/session/mod.rs:2035]
8. `Session::request_user_input` 发出 `EventMsg::RequestUserInput(RequestUserInputEvent { call_id, turn_id, questions })` 并 await receiver。[E: codex-rs/core/src/session/mod.rs:2044][E: codex-rs/core/src/session/mod.rs:2050]
9. 客户端响应最终走 `request_user_input_response` handler，再调用 `Session::notify_user_input_response` 按 id 唤醒 pending oneshot。[E: codex-rs/core/src/session/handlers.rs:401][E: codex-rs/core/src/session/handlers.rs:406]

## 9 设计动机·edge·历史

该工具把“需要用户做选择”的交互集中成结构化 schema；schema 要求 2-3 个互斥 options，client 自动加 Other，这降低了模型自由设计 UI 的空间。[E: codex-rs/tools/src/request_user_input_tool.rs:29][E: codex-rs/tools/src/request_user_input_tool.rs:30][I]  
TUI overlay 会为有 options 的问题默认选中第一个 option，因此每个 option question 都有答案；没有 options 且没有 notes 的问题会作为 `skipped` 提交，但当前工具 normalize/校验路径要求 options 非空，说明现行 tool surface 选择了 option-first 交互。[E: docs/tui-request-user-input.md:14][E: docs/tui-request-user-input.md:15][E: codex-rs/tools/src/request_user_input_tool.rs:108][I]  
`RequestUserInputQuestion.isSecret` 在协议类型存在但工具 schema 不暴露；因此 secret 输入能力不是当前模型可直接声明的工具参数。[E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/tools/src/request_user_input_tool.rs:34][I]

## Sources

- `codex-rs/tools/src/request_user_input_tool.rs`
- `docs/tui-request-user-input.md`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/request_user_input.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/state/turn.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/protocol/src/request_user_input.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Collaboration modes](../../subsystems/core/collaboration-modes.md)
