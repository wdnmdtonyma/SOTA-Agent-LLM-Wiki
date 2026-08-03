---
id: tool.request-user-input
title: request_user_input 工具
kind: tool
tier: T1
source: [codex-rs/core/src/config/mod.rs, codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/request_user_input_spec.rs, codex-rs/core/src/tools/handlers/request_user_input.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/features/src/lib.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/protocol.rs]
symbols: [RequestUserInputToolArgs, RequestUserInputHandler, normalize_request_user_input_tool_args, RequestUserInputArgs, RequestUserInputEvent]
related: [spine.tool-call-anatomy, subsys.core.tool-system, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 7750465934
---

> `request_user_input` 的模型输入现在只有 `questions`。`isBlocking` 与 deprecated `autoResolutionMs` 属于 core→client protocol event，不是 model-call schema：handler 根据 collaboration mode 设置 blocking，并始终把 auto resolution 设为 `None`。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:11][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:13][E: codex-rs/core/src/tools/handlers/request_user_input.rs:74][E: codex-rs/core/src/tools/handlers/request_user_input.rs:77][E: codex-rs/protocol/src/request_user_input.rs:31]

## Identity 与 exposure

wire name 是 plain `request_user_input`，spec 是 non-strict Function tool，`output_schema` 为 `None`。planner 以 `DirectModelOnly` exposure 注册，因此它不会成为 code-mode nested tool。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:9][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:77][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:87][E: codex-rs/core/src/tools/spec_plan.rs:813][E: codex-rs/core/src/tools/spec_plan.rs:818]

handler 仅允许 root thread，并检查当前 collaboration mode；默认允许 Plan，feature 可把 Default mode 加入 available modes。它没有覆写 parallel contract，因而默认不并行。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:60][E: codex-rs/core/src/tools/handlers/request_user_input.rs:68][E: codex-rs/tools/src/tool_config.rs:38][E: codex-rs/tools/src/tool_config.rs:44][E: codex-rs/tools/src/tool_executor.rs:73]

## 模型输入 schema

顶层只允许一个必填字段 `questions`，additional properties 关闭；schema 建议 1 个问题，最多 3 个，但 runtime 没有数量 clamp。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:61][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:75][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:82][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:85]

| 字段 | 必填 | 说明 |
|---|---:|---|
| `questions[].id` | 是 | stable snake_case answer key。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:41][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:65] |
| `questions[].header` | 是 | UI 短标题，文案建议不超过 12 字符。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:47][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:66] |
| `questions[].question` | 是 | 单句用户提示。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:53][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:67] |
| `questions[].options` | 是 | 文案建议 2–3 个互斥选项，推荐项第一且 label 后缀为 `(Recommended)`；模型不要添加 Other。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:30][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:35][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:68] |
| `questions[].options[].label` | 是 | 1–5 words 的 user-facing label。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:19][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:20][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:32] |
| `questions[].options[].description` | 是 | 一句 impact/tradeoff 说明。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:23][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:32] |

normalization 的真实校验只有“每个问题 options 非空”，然后把 protocol question 的 `is_other` 设为 true，让客户端提供 free-form Other；`isOther`/`isSecret` 本身不在模型 schema 中。[E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:105][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:113][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:116][E: codex-rs/protocol/src/request_user_input.rs:19][E: codex-rs/protocol/src/request_user_input.rs:26]

## Protocol event 与 blocking

handler 构造 protocol `RequestUserInputArgs` 时，Plan mode 设置 `isBlocking=true`，其他获准 mode 设置 false；`auto_resolution_ms` 固定为 `None`。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:66][E: codex-rs/core/src/tools/handlers/request_user_input.rs:74][E: codex-rs/core/src/tools/handlers/request_user_input.rs:77]

protocol 为兼容旧 client 仍保留 deprecated `autoResolutionMs` 字段。`RequestUserInputEvent` 缺少 `isBlocking` 时反序列化为 true；这不意味着模型可提交这两个字段。[E: codex-rs/protocol/src/request_user_input.rs:34][E: codex-rs/protocol/src/request_user_input.rs:41][E: codex-rs/protocol/src/request_user_input.rs:63][E: codex-rs/protocol/src/request_user_input.rs:70][E: codex-rs/protocol/src/request_user_input.rs:90][E: codex-rs/protocol/src/request_user_input.rs:96]

session 发出 `RequestUserInputEvent` 并等待 pending oneshot；client 用 `Op::UserInputAnswer` 回传。handler 将 `RequestUserInputResponse` 序列化为成功 JSON tool output，取消时返回 model error。[E: codex-rs/core/src/tools/handlers/request_user_input.rs:79][E: codex-rs/core/src/tools/handlers/request_user_input.rs:86][E: codex-rs/core/src/tools/handlers/request_user_input.rs:88][E: codex-rs/core/src/tools/handlers/request_user_input.rs:94][E: codex-rs/protocol/src/request_user_input.rs:44][E: codex-rs/protocol/src/request_user_input.rs:50]

## Sources

- `codex-rs/core/src/tools/handlers/request_user_input_spec.rs`
- `codex-rs/core/src/tools/handlers/request_user_input.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/protocol/src/request_user_input.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
