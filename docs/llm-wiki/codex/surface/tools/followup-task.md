---
id: tool.followup-task
title: followup_task 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs]
symbols: [create_followup_task_tool, ToolHandlerKind::FollowupTaskV2, multi_agents_v2::followup_task::Handler]
related: [tool.spawn-agent-v2, tool.send-message, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `followup_task` 是 MultiAgentV2 的 trigger-turn 消息工具：它给非 root agent 投递纯文本任务，并让目标 agent 当前或下一轮处理该任务。

## 能回答的问题

- `followup_task` 的 `interrupt` 字段是什么意思？
- `followup_task` 和 `send_message` 的区别是什么？
- `followup_task` 为什么拒绝 root target？
- `followup_task` 在什么门控下注册？
- `followup_task` 成功时为什么没有 JSON payload？

## 1 Identity

- Wire name: `followup_task`。[E: codex-rs/tools/src/agent_tool.rs:177]
- Handler kind: `ToolHandlerKind::FollowupTaskV2`；core registry 映射为 `FollowupTaskHandlerV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:434][E: codex-rs/core/src/tools/spec.rs:213]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:176][E: codex-rs/tools/src/tool_spec.rs:24]
- 所属套件: `followup_task` 在 MultiAgentV2 分支注册；V1 分支注册 `send_input` 而不是 `followup_task`[I]。[E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:413][E: codex-rs/tools/src/tool_registry_plan.rs:453]

## 2 用途定位

`followup_task` 的工具描述是给已有 non-root agent 发送 string message 并 trigger target turn；如果 `interrupt=false` 且目标 turn 未完成，消息会 queue，等当前 turn 完成后启动目标下一 turn。[E: codex-rs/tools/src/agent_tool.rs:178]

`followup_task` 与 `send_message` 共用 V2 message submission path；module comment 明确说两个工具只在是否立即唤醒目标上不同，`followup_task` handler 传入 `MessageDeliveryMode::TriggerTurn`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:3][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:4][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:23][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:25]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `target` | string | 是 | 无 | agent id 或 canonical task name；运行时由 `resolve_agent_target` 解析。[E: codex-rs/tools/src/agent_tool.rs:156][E: codex-rs/tools/src/agent_tool.rs:158][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:90] |
| `message` | string | 是 | 无 | 发给目标 agent 的文本；空白消息会被拒绝。[E: codex-rs/tools/src/agent_tool.rs:162][E: codex-rs/tools/src/agent_tool.rs:164][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:53] |
| `interrupt` | boolean | 否 | `false` | `FollowupTaskArgs` 对该字段使用 serde default；true 时共享 handler 先调用 `interrupt_agent(receiver_thread_id)`，false 的 queue/next-turn 语义来自 schema description。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:47][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:110][E: codex-rs/tools/src/agent_tool.rs:170] |

schema required 为 `target` 和 `message`，测试断言 properties 包含 `target`、`message`、`interrupt`，且没有 V1 `items` 字段。[E: codex-rs/tools/src/agent_tool.rs:182][E: codex-rs/tools/src/agent_tool_tests.rs:187][E: codex-rs/tools/src/agent_tool_tests.rs:188][E: codex-rs/tools/src/agent_tool_tests.rs:189][E: codex-rs/tools/src/agent_tool_tests.rs:190]

## 4 输出 schema & 截断

`create_followup_task_tool` 的 `output_schema` 是 `None`。[E: codex-rs/tools/src/agent_tool.rs:183]

运行时成功返回空字符串 function output，`success` 为 `Some(true)`；该工具没有在 schema 或 handler 中暴露输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:166]

## 5 ToolSpec 类型

`followup_task` 是 function tool，`strict: false`、`defer_loading: None`、object parameters，适配固定 JSON 输入。[E: codex-rs/tools/src/agent_tool.rs:176][E: codex-rs/tools/src/agent_tool.rs:180][E: codex-rs/tools/src/agent_tool.rs:181][E: codex-rs/tools/src/agent_tool.rs:182]

handler 只接受 `ToolPayload::Function`，并把 arguments 反序列化为 `FollowupTaskArgs`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:13][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:17][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:22]

## 6 注册与门控

`followup_task` 注册在 `config.collab_tools && config.multi_agent_v2` 分支。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:413]

注册 plan 中 `create_followup_task_tool()` 的 `supports_parallel_tool_calls` 为 false，并将 `followup_task` 注册到 `ToolHandlerKind::FollowupTaskV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:413][E: codex-rs/tools/src/tool_registry_plan.rs:414][E: codex-rs/tools/src/tool_registry_plan.rs:434]

## 7 parallel-safe

`followup_task` 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:414]

handler 可 interrupt 目标 agent，并把 `InterAgentCommunication` 投递给目标 agent；这会影响目标 agent 后续调度[I]。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:110][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:141]

## 8 handler 走读

1. Core registry 将 `ToolHandlerKind::FollowupTaskV2` 映射为 `FollowupTaskHandlerV2`。[E: codex-rs/core/src/tools/spec.rs:213]
2. Handler 解析 function arguments 为 `FollowupTaskArgs`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:22]
3. Handler 调用 `handle_message_string_tool`，传入 `MessageDeliveryMode::TriggerTurn` 和 `args.interrupt`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:23][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:28]
4. 共享 handler 解析 target；如果 mode 是 `TriggerTurn` 且目标 path 是 root，则返回 “Tasks can't be assigned to the root agent”。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:90][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:96][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:100][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:103]
5. 如果 `interrupt=true`，共享 handler 先调用 `interrupt_agent(receiver_thread_id)`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:106][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:110]
6. 共享 handler 构造 `InterAgentCommunication`，`MessageDeliveryMode::TriggerTurn` 把 `trigger_turn` 保持/设为 true，然后调用 `send_inter_agent_communication`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:24][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:129][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:141]

## 9 设计动机、edge、历史

`followup_task` 是 V2 对“给子 agent 分配下一项任务”的显式工具[I]；`send_message` 的 QueueOnly 会设置 `trigger_turn: false`，`followup_task` 的 TriggerTurn 会设置 `trigger_turn: true`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:20][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:24][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:25]

root target 被拒绝可视为 V2 的任务边界保护[I]：handler 获取目标 metadata，检查目标 metadata 的 `agent_path` 是否 root，root 时返回错误；测试断言该错误路径不产生 `Interrupt` 或 `InterAgentCommunication` 操作。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:94][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:100][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:103][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1099][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1103]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/tools/src/tool_spec.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs
- codex-rs/core/src/tools/handlers/multi_agents_tests.rs

## 相关

- [spawn_agent (V2) 工具](spawn-agent-v2.md)
- [send_message 工具](send-message.md)
- [wait_agent (V2) 工具](wait-agent-v2.md)
