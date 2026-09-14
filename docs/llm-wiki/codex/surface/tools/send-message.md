---
id: tool.send-message
title: send_message 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/context/inter_agent_message.rs, codex-rs/core/src/agent/agent_resolver.rs, codex-rs/core/src/agent/control.rs, codex-rs/core/src/session/input_queue.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_send_message_tool, SendMessageHandlerV2, multi_agents_v2::send_message::Handler, MessageDeliveryMode::QueueOnly]
related: [tool.spawn-agent-v2, tool.followup-task, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> `send_message` 是 MultiAgentV2 的 queue-only 消息工具：它给已存在 agent 投递纯文本 inter-agent message，但不触发目标 agent 新 turn。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `send_message`，由 handler `tool_name()` 和 spec builder 同时定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:13][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:199] |
| handler | V2 module re-export `send_message::Handler as SendMessageHandler`；`spec_plan.rs` 用 `SendMessageHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:35][E: codex-rs/core/src/tools/spec_plan.rs:50][E: codex-rs/core/src/tools/spec_plan.rs:1321] |
| spec | `create_send_message_tool` 返回 function tool，`strict: false`、`defer_loading: None`，无 output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:198][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:202][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:209] |

## 注册与门控

`send_message` 与其他 V2 协作工具一起注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支；exposure 与 namespace override 规则继承同一层 `multi_agent_v2_handler` 包装。子 agent 若当前模型不是 V2 leaf-capable（`model_info.multi_agent_version != Some(V2)`）则不会拿到这组工具。[E: codex-rs/core/src/tools/spec_plan.rs:1286][E: codex-rs/core/src/tools/spec_plan.rs:1289][E: codex-rs/core/src/tools/spec_plan.rs:656][E: codex-rs/core/src/tools/spec_plan.rs:1320]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:122]

## 输入与运行流

| 字段 | 必填 | 说明 |
|---|---:|---|
| `target` | 是 | 相对或 canonical task name，也兼容 thread id；`resolve_agent_target` 先尝试 `ThreadId::from_string`，失败后按当前 session source 解析 agent path。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:185][E: codex-rs/core/src/agent/agent_resolver.rs:15][E: codex-rs/core/src/agent/agent_resolver.rs:22] |
| `message` | 是 | 共享 handler 拒绝 trim 后为空的消息。namespace 为 `collaboration` 且 encrypted args 为空的 direct call 被 router 标为 plaintext source 并渲染 `MESSAGE` envelope；非 plaintext 来源构造 encrypted communication。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:44][E: codex-rs/core/src/tools/router.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:80] |

schema required 为 `target` 和 `message`，additional properties 为 false；runtime args 也使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:206][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:28]

`send_message::Handler` 解析 arguments 后调用共享 `handle_message_string_tool`，传入 `MessageDeliveryMode::QueueOnly`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:41][E: codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs:43]

共享 handler 解析目标、确认 agent 已知、确保 V2 agent loaded，随后构造带 author/recipient 的 `InterAgentCommunication`。QueueOnly 分支还构造 `AgentCommunicationKind::Message` 上下文，一起传给 `agent_control.send_inter_agent_communication`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:107][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:116]

`QueueOnly` 会把 communication 的 `trigger_turn` 设为 false；这是它区别于 `followup_task` 的核心行为。因此 control 不会为 QueueOnly 做 execution-capacity 检查。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:104][E: codex-rs/core/src/agent/control.rs:231]

`parent_turn_id` 只在 `TriggerTurn` 时写入 start options；`root_turn_id` 始终从当前 turn metadata 传递。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:112][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:122]

mailbox drain 先取**最后一个** trigger mail 的 `start_options` 作为基线，再把 parent/root turn id reduce 成“所有 trigger mail 都一致”的值；QueueOnly mail 不参与这条 lineage。[E: codex-rs/core/src/session/input_queue.rs:160][E: codex-rs/core/src/session/input_queue.rs:166]

plaintext envelope 以 assistant role 注入目标 context，而不是 user role。[E: codex-rs/core/src/context/inter_agent_message.rs:51]

## 输出与事件

成功投递后，handler 发出 `SubAgentActivityKind::Interacted` completed turn item，并返回空文本 function output，success 为 `Some(true)`；schema 层没有 JSON output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:138][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:143][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:209]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/router.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/send_message.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/context/inter_agent_message.rs
- codex-rs/core/src/agent/control.rs
- codex-rs/core/src/agent/agent_resolver.rs
- codex-rs/core/src/session/input_queue.rs
- codex-rs/tools/src/tool_executor.rs
