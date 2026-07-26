---
id: tool.send-message
title: send_message 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/agent/agent_resolver.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_send_message_tool, SendMessageHandlerV2, multi_agents_v2::send_message::Handler, MessageDeliveryMode::QueueOnly]
related: [tool.spawn-agent-v2, tool.followup-task, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `send_message` 是 MultiAgentV2 的 queue-only 消息工具：它给已存在 agent 投递纯文本 inter-agent message，但不触发目标 agent 新 turn。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `send_message`，由 handler `tool_name()` 和 spec builder 同时定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:12][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:203][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:204] |
| handler | V2 module re-export `send_message::Handler as SendMessageHandler`；`spec_plan.rs` 用 `SendMessageHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:32][E: codex-rs/core/src/tools/spec_plan.rs:860] |
| spec | `create_send_message_tool` 返回 function tool，`strict: false`、`defer_loading: None`，无 output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:186][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:203][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:207][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:208][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:214] |

## 注册与门控

`send_message` 与其他 V2 协作工具一起注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支；exposure 与 namespace override 规则继承同一层 `multi_agent_v2_handler` 包装。[E: codex-rs/core/src/tools/spec_plan.rs:825][E: codex-rs/core/src/tools/spec_plan.rs:827][E: codex-rs/core/src/tools/spec_plan.rs:828][E: codex-rs/core/src/tools/spec_plan.rs:841][E: codex-rs/core/src/tools/spec_plan.rs:1056][E: codex-rs/core/src/tools/spec_plan.rs:1079]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与运行流

| 字段 | 必填 | 说明 |
|---|---:|---|
| `target` | 是 | 相对或 canonical task name，也兼容 thread id；`resolve_agent_target` 先尝试 `ThreadId::from_string`，失败后按当前 session source 解析 agent path。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:189][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:191][E: codex-rs/core/src/agent/agent_resolver.rs:9][E: codex-rs/core/src/agent/agent_resolver.rs:15][E: codex-rs/core/src/agent/agent_resolver.rs:19] |
| `message` | 是 | 加密 string；共享 handler 会拒绝 trim 后为空的消息。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:195][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:199][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:51] |

schema required 为 `target` 和 `message`，additional properties 为 false；runtime args 也使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:209][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:211][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:212][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:37][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:35]

`send_message::Handler` 解析 arguments 后调用共享 `handle_message_string_tool`，传入 `MessageDeliveryMode::QueueOnly`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:29][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:30][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:31][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:33]

共享 handler 解析目标、确认 agent 已知、确保 V2 agent loaded，随后构造带 author/recipient 的 `InterAgentCommunication`。QueueOnly 分支还构造 `AgentCommunicationKind::Message` 上下文，一起传给 `agent_control.send_inter_agent_communication`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:75][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:79][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:98][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:105][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:107][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:109][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:115]

`QueueOnly` 会把 communication 的 `trigger_turn` 设为 false；这是它区别于 `followup_task` 的核心行为。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:13][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:23]

## 输出与事件

成功投递后，handler 发出 `SubAgentActivityKind::Interacted` completed turn item，并返回空文本 function output，success 为 `Some(true)`；schema 层没有 JSON output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:120][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:124][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:127][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:129][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:214]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/agent/agent_resolver.rs
- codex-rs/tools/src/tool_executor.rs
