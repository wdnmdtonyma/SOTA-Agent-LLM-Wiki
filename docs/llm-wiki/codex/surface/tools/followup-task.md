---
id: tool.followup-task
title: followup_task 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/context/inter_agent_message.rs, codex-rs/core/src/agent/agent_resolver.rs, codex-rs/core/src/agent/control.rs, codex-rs/core/src/session/input_queue.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_followup_task_tool, FollowupTaskHandlerV2, multi_agents_v2::followup_task::Handler, MessageDeliveryMode::TriggerTurn]
related: [tool.spawn-agent-v2, tool.send-message, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `followup_task` 是 MultiAgentV2 的 trigger-turn 消息工具：它给现有非 root agent 投递纯文本任务，并让目标 agent 处理该任务。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `followup_task`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:12][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:236][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:237] |
| handler | V2 module re-export `followup_task::Handler as FollowupTaskHandler`；`spec_plan.rs` 用 `FollowupTaskHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:32][E: codex-rs/core/src/tools/spec_plan.rs:46][E: codex-rs/core/src/tools/spec_plan.rs:1171] |
| spec | function tool，`strict: false`、`defer_loading: None`，无 output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:236][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:241][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:243] |

## 注册与门控

`followup_task` 与其他 V2 协作工具一起注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支，并经过相同的 exposure/namespace 包装。leaf worker（子 agent 且当前模型 `multi_agent_version` 不是 V2）不会注册该工具。[E: codex-rs/core/src/tools/spec_plan.rs:1134][E: codex-rs/core/src/tools/spec_plan.rs:1135][E: codex-rs/core/src/tools/spec_plan.rs:607][E: codex-rs/core/src/tools/spec_plan.rs:609][E: codex-rs/core/src/tools/spec_plan.rs:1141][E: codex-rs/core/src/tools/spec_plan.rs:1170]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## 输入与运行流

| 字段 | 必填 | 说明 |
|---|---:|---|
| `target` | 是 | agent id 或 canonical task name；运行时走 `resolve_agent_target`，先支持 thread id，后支持当前 agent path 下的相对/绝对路径解析。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:222][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:223][E: codex-rs/core/src/agent/agent_resolver.rs:15][E: codex-rs/core/src/agent/agent_resolver.rs:19][E: codex-rs/core/src/agent/agent_resolver.rs:22] |
| `message` | 是 | 共享 handler 拒绝 trim 后为空的消息。direct plaintext call 产生 `NEW_TASK` assistant-role envelope；非 plaintext 来源保留 encrypted communication。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:43][E: codex-rs/core/src/tools/router.rs:41][E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:76][E: codex-rs/core/src/context/inter_agent_message.rs:46] |

schema required 为 `target` 和 `message`，additional properties 为 false；runtime args 使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:242][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:35][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:37]

`followup_task::Handler` 解析 arguments 后调用共享 `handle_message_string_tool`，传入 `MessageDeliveryMode::TriggerTurn`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:31][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:33]

共享 handler 在 TriggerTurn 模式下禁止 root agent target；如果目标 path 是 root，会返回 model-facing error `Follow-up tasks can't target the root agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:73][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:77][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:80]

`TriggerTurn` 会把 communication 的 `trigger_turn` 设为 true，并为投递构造 `AgentCommunicationKind::Followup` 上下文；投递路径与 `send_message` 共用 `send_inter_agent_communication`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:14][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:107][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:115]

followup submission 携带 parent turn id。mailbox drain 只在同批 trigger mails 的 parent id 一致时，才把它归因到新 child turn，避免混合多个 parent 的消息产生错误 lineage。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:110][E: codex-rs/core/src/agent/control.rs:219][E: codex-rs/core/src/session/input_queue.rs:84][E: codex-rs/core/src/session/input_queue.rs:160][E: codex-rs/core/src/session/input_queue.rs:164]

## 输出与边界

成功投递后会发出 `SubAgentActivityKind::Interacted` completed turn item，再返回空文本 function output，success 为 `Some(true)`；schema 层没有 JSON output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:132][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:137][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:243]

`send_message` 和 `followup_task` 共用 `handle_message_string_tool` submission path；差异由 `MessageDeliveryMode::trigger_turn` 决定：`QueueOnly` 为 false、`TriggerTurn` 为 true。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:18][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:20][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:33]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/router.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/context/inter_agent_message.rs
- codex-rs/core/src/agent/control.rs
- codex-rs/core/src/session/input_queue.rs
- codex-rs/core/src/agent/agent_resolver.rs
- codex-rs/tools/src/tool_executor.rs
