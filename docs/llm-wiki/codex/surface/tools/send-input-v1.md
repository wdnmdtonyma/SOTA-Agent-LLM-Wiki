---
id: tool.send-input-v1
title: send_input (V1) 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents/send_input.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/tools/handlers/mod.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/tools/src/tool_registry_plan_tests.rs, codex-rs/tools/src/agent_tool_tests.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs]
symbols: [create_send_input_tool_v1, ToolHandlerKind::SendInputV1, multi_agents::send_input::Handler]
related: [tool.spawn-agent-v1, tool.wait-agent-v1, tool.send-message]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `send_input` V1 是 legacy collab tool 中给子 agent 追加输入的 function tool；它用 `agent_id` target，可发送 text 或 structured items，并可 interrupt 当前任务。

## 能回答的问题

- `send_input` V1 的 `message` 和 `items` 怎么二选一？
- `send_input` V1 的 `interrupt` 会做什么？
- `send_input` V1 返回的 `submission_id` 来自哪里？
- `send_input` V1 在什么门控下注册？
- `send_input` V1 与 V2 `send_message` / `followup_task` 有什么差异？

## 1 Identity

- Wire name: `send_input`。[E: codex-rs/tools/src/agent_tool.rs:112]
- Handler kind: `ToolHandlerKind::SendInputV1`；core registry 映射为 `SendInputHandler`。[E: codex-rs/tools/src/tool_registry_plan.rs:474][E: codex-rs/core/src/tools/spec.rs:246]
- 所属套件: V1 legacy collab branch；V2 branch 不注册 `send_input`。[E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:453][E: codex-rs/tools/src/tool_registry_plan_tests.rs:328]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:111]

## 2 用途定位

`send_input` V1 用于向已有 agent 发送输入；工具 description 明确说明 `interrupt=true` 可立即 redirect work，并建议在任务高度依赖前一任务上下文时复用 agent。[E: codex-rs/tools/src/agent_tool.rs:113]

V1 `send_input` 直接调用 `agent_control.send_input(receiver_thread_id, input_items)`，因此它是在 legacy id-based agent 上提交新的 input submission[I]。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:57]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `target` | string | 是 | 无 | 来自 `spawn_agent` 的 agent id；handler 用 `parse_agent_id_target` 转成 `ThreadId`，没有调用 V2 task-path resolver。[E: codex-rs/tools/src/agent_tool.rs:91][E: codex-rs/tools/src/agent_tool.rs:92][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:27][E: codex-rs/core/src/tools/handlers/multi_agents.rs:39] |
| `message` | string | 否 | 与 `items` 二选一 | legacy plain-text message；`parse_collab_input` 拒绝同时提供 `message` 和 `items`，也拒绝空白 message。[E: codex-rs/tools/src/agent_tool.rs:95][E: codex-rs/tools/src/agent_tool.rs:96][E: codex-rs/tools/src/agent_tool.rs:97][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:167][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:174] |
| `items` | array<object> | 否 | 与 `message` 二选一 | structured input items，支持 text/image/local_image/skill/mention；`parse_collab_input` 拒绝空数组。[E: codex-rs/tools/src/agent_tool.rs:101][E: codex-rs/tools/src/agent_tool.rs:503][E: codex-rs/tools/src/agent_tool.rs:479][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:186] |
| `interrupt` | boolean | 否 | `false` | serde default 为 false；true 时先调用 `interrupt_agent(receiver_thread_id)`；false 的 queue 语义来自 schema description。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:91][E: codex-rs/tools/src/agent_tool.rs:103][E: codex-rs/tools/src/agent_tool.rs:105][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:35][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:39] |

schema required 只有 `target`；message/items 的二选一由 handler 校验。[E: codex-rs/tools/src/agent_tool.rs:117][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:167][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:170]

## 4 输出 schema & 截断

输出 schema 是 object，包含 `submission_id: string`，required 为 `["submission_id"]`。[E: codex-rs/tools/src/agent_tool.rs:367][E: codex-rs/tools/src/agent_tool.rs:369][E: codex-rs/tools/src/agent_tool.rs:370][E: codex-rs/tools/src/agent_tool.rs:374]

handler 从 `agent_control.send_input` 的结果中取得 `submission_id` 并返回 `SendInputResult`，`to_response_item` 调用 `tool_output_response_item(..., Some(true), "send_input")`；该工具没有在 schema 或 handler 中暴露输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:57][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:80][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:110]

## 5 ToolSpec 类型

`send_input` V1 是 function tool，`strict: false`、`defer_loading: None`、object parameters。[E: codex-rs/tools/src/agent_tool.rs:111][E: codex-rs/tools/src/agent_tool.rs:115][E: codex-rs/tools/src/agent_tool.rs:116][E: codex-rs/tools/src/agent_tool.rs:117]

handler 返回 `ToolKind::Function`，只匹配 function payload，并把 function arguments 解析为 `SendInputArgs`；底层 `parse_arguments` 使用 `serde_json::from_str`。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:14][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:26][E: codex-rs/core/src/tools/handlers/mod.rs:62]

## 6 注册与门控

`send_input` V1 注册在 `config.collab_tools` true 且 `config.multi_agent_v2` false 的 legacy branch。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:453]

注册 plan 中 `create_send_input_tool_v1()` 的 `supports_parallel_tool_calls` 为 false，并把 `send_input` 绑定到 `ToolHandlerKind::SendInputV1`。[E: codex-rs/tools/src/tool_registry_plan.rs:453][E: codex-rs/tools/src/tool_registry_plan.rs:454][E: codex-rs/tools/src/tool_registry_plan.rs:474]

## 7 parallel-safe

`send_input` V1 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:454]

handler 可 interrupt 目标 agent、发送 interaction events、向目标 thread 提交输入；这些动作会改变目标 agent 状态或队列[I]。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:39][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:57]

## 8 handler 走读

1. Core registry 把 `ToolHandlerKind::SendInputV1` 注册为 `SendInputHandler`。[E: codex-rs/core/src/tools/spec.rs:246]
2. Handler 解析 arguments 为 `SendInputArgs`，把 `target` 解析为 `ThreadId`。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:27]
3. Handler 用 `parse_collab_input` 把 `message` 或 `items` 转成 input op，并生成 prompt preview。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:28][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:29]
4. 如果 `interrupt=true`，handler 调用 `interrupt_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:35][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:39]
5. Handler 发送 interaction begin event，调用 `agent_control.send_input`，再发送 interaction end event。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:57][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:68]
6. Handler 返回 `submission_id`。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:80][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:82]

## 9 设计动机、edge、历史

V1 `send_input` 比 V2 `send_message` 更宽[I]：它支持 structured `items` 和 `interrupt`，而 V2 `send_message` schema 测试断言没有这两个字段。[E: codex-rs/tools/src/agent_tool.rs:101][E: codex-rs/tools/src/agent_tool.rs:103][E: codex-rs/tools/src/agent_tool_tests.rs:149][E: codex-rs/tools/src/agent_tool_tests.rs:150]

V2 把 V1 的“发送输入”拆成 queue-only `send_message` 和 trigger-turn `followup_task`[I]；两个 V2 工具共用 `message_tool`，`send_message` 传入 `QueueOnly`，`followup_task` 传入 `TriggerTurn`，并通过 `MessageDeliveryMode` 区分是否 wake target。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:3][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:4][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:20][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:25]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents/send_input.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/tools/handlers/mod.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/tools/src/tool_registry_plan_tests.rs
- codex-rs/tools/src/agent_tool_tests.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs

## 相关

- [spawn_agent (V1) 工具](spawn-agent-v1.md)
- [wait_agent (V1) 工具](wait-agent-v1.md)
- [send_message 工具](send-message.md)
