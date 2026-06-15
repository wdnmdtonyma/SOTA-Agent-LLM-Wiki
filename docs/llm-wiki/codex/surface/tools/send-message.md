---
id: tool.send-message
title: send_message 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs]
symbols: [create_send_message_tool, ToolHandlerKind::SendMessageV2, multi_agents_v2::send_message::Handler]
related: [tool.spawn-agent-v2, tool.followup-task, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `send_message` 是 MultiAgentV2 的 queue-only 消息工具：它给已存在 agent 投递纯文本 mailbox message，但不触发目标 agent 新 turn。

## 能回答的问题

- `send_message` 的输入字段为什么只有 `target` 和 `message`？
- `send_message` 和 `followup_task` 的运行时差异是什么？
- `send_message` 在什么门控下注册？
- `send_message` 的输出为什么没有内容？
- `send_message` 怎样解析相对 task name 或 canonical task path？

## 1 Identity

- Wire name: `send_message`。[E: codex-rs/tools/src/agent_tool.rs:139]
- Handler kind: `ToolHandlerKind::SendMessageV2`；core registry 映射到 `SendMessageHandlerV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:433][E: codex-rs/core/src/tools/spec.rs:249]
- 所属协作套件: `send_message` 在 MultiAgentV2 分支注册，legacy V1 分支暴露的是 `send_input`。[E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:408][E: codex-rs/tools/src/tool_registry_plan.rs:453]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:138][E: codex-rs/tools/src/tool_spec.rs:24]

## 2 用途定位

`send_message` 用于向现有 agent queue 一条 string message，不唤醒目标 agent 开始新 turn；工具描述明确写成 “without triggering a new turn”。[E: codex-rs/tools/src/agent_tool.rs:140]

与 `followup_task` 相比，`send_message` 适合只留言或把信息放进目标 mailbox；真正要让目标 agent 处理新任务时使用 `followup_task`[I]。共享 module comment 说明两者共用 submission path，差异是 communication 是否立即唤醒目标。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:3][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:4]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `target` | string | 是 | 无 | 相对 task name 或 canonical task name；schema 文案写明来自 `spawn_agent`，运行时由 `resolve_agent_target` 解析，解析逻辑先尝试 `ThreadId`，再按当前 agent path 解析相对/绝对 path。[E: codex-rs/tools/src/agent_tool.rs:126][E: codex-rs/tools/src/agent_tool.rs:127][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:90][E: codex-rs/core/src/agent/agent_resolver.rs:14][E: codex-rs/core/src/agent/agent_resolver.rs:21] |
| `message` | string | 是 | 无 | 要 queue 到目标 agent 的文本；handler 会拒绝 trim 后为空的消息。[E: codex-rs/tools/src/agent_tool.rs:132][E: codex-rs/tools/src/agent_tool.rs:133][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:53] |

`send_message` schema required 为 `target` 和 `message`，测试也断言没有 `interrupt` 或 `items` 字段。[E: codex-rs/tools/src/agent_tool.rs:146][E: codex-rs/tools/src/agent_tool_tests.rs:149][E: codex-rs/tools/src/agent_tool_tests.rs:150][E: codex-rs/tools/src/agent_tool_tests.rs:162]

## 4 输出 schema & 截断

`create_send_message_tool` 把 `output_schema` 设置为 `None`。[E: codex-rs/tools/src/agent_tool.rs:149]

运行时成功时返回空文本 function output，`success` 为 `Some(true)`；该工具没有在 schema 或 handler 中暴露工具级输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:166]

## 5 ToolSpec 类型

`send_message` 是 function tool，设置 `strict: false`、`defer_loading: None`，并使用 object parameters。[E: codex-rs/tools/src/agent_tool.rs:138][E: codex-rs/tools/src/agent_tool.rs:142][E: codex-rs/tools/src/agent_tool.rs:143][E: codex-rs/tools/src/agent_tool.rs:144]

function tool 是合适形态[I]：handler 只接受 `ToolPayload::Function`，并把 JSON arguments 反序列化为 `SendMessageArgs`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:13][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:17][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:22]

## 6 注册与门控

`send_message` 与 V2 协作工具一起注册，门控是 `config.collab_tools && config.multi_agent_v2`。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:408]

注册 plan 中 `create_send_message_tool()` 的 `supports_parallel_tool_calls` 为 false，并把 wire name `send_message` 绑定到 `ToolHandlerKind::SendMessageV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:408][E: codex-rs/tools/src/tool_registry_plan.rs:409][E: codex-rs/tools/src/tool_registry_plan.rs:433]

## 7 parallel-safe

`send_message` 在 registry plan 中显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:409]

原因可以从 handler 行为推断[I]：一次调用会解析目标、发送 interaction begin/end event，并向目标 agent 投递 `InterAgentCommunication`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:90][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:117][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:141][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:152]

## 8 handler 走读

1. Core registry 把 `ToolHandlerKind::SendMessageV2` 注册为 `SendMessageHandlerV2`。[E: codex-rs/core/src/tools/spec.rs:249]
2. `send_message::Handler` 解析 function payload 为 `SendMessageArgs`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:22]
3. `send_message::Handler` 调用共享 `handle_message_string_tool`，传入 `MessageDeliveryMode::QueueOnly`，并硬编码 `interrupt=false`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:23][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:28]
4. 共享 handler 解析目标 agent，读取目标 metadata，构造 `InterAgentCommunication`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:90][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:94][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:129]
5. `MessageDeliveryMode::QueueOnly` 把 communication 的 `trigger_turn` 改为 false。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:20][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:21]
6. Handler 调用 `send_inter_agent_communication` 投递消息，并返回空文本成功 output。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:141][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:166]

## 9 设计动机、edge、历史

`send_message` 和 `followup_task` 共用 submission path，差异只在 `InterAgentCommunication` 是否应该立即 wake target；这是源文件 module-level comment 的直接描述。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:3][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:4]

V2 `send_message` 的 schema 测试明确断言没有 V1 `items` 和 `interrupt` 字段；该 schema 与 QueueOnly delivery mode 共同让工具保持 text-only queue-only 语义[I]。[E: codex-rs/tools/src/agent_tool_tests.rs:149][E: codex-rs/tools/src/agent_tool_tests.rs:150][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:20][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:21]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/tools/src/tool_spec.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs
- codex-rs/core/src/agent/agent_resolver.rs

## 相关

- [spawn_agent (V2) 工具](spawn-agent-v2.md)
- [followup_task 工具](followup-task.md)
- [wait_agent (V2) 工具](wait-agent-v2.md)
