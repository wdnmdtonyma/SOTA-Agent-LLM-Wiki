---
id: tool.followup-task
title: followup_task 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/agent/agent_resolver.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_followup_task_tool, FollowupTaskHandlerV2, multi_agents_v2::followup_task::Handler, MessageDeliveryMode::TriggerTurn]
related: [tool.spawn-agent-v2, tool.send-message, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: db887d03e1
---

> `followup_task` 是 MultiAgentV2 的 trigger-turn 消息工具：它给现有非 root agent 投递纯文本任务，并让目标 agent 处理该任务。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `followup_task`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:12][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:203][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:204] |
| handler | V2 module re-export `followup_task::Handler as FollowupTaskHandler`；`spec_plan.rs` 用 `FollowupTaskHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:28][E: codex-rs/core/src/tools/spec_plan.rs:826] |
| spec | function tool，`strict: false`、`defer_loading: None`，无 output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:185][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:203][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:207][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:208][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:210] |

## 注册与门控

`followup_task` 与其他 V2 协作工具一起注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支，并经过相同的 exposure/namespace 包装。[E: codex-rs/core/src/tools/spec_plan.rs:792][E: codex-rs/core/src/tools/spec_plan.rs:794][E: codex-rs/core/src/tools/spec_plan.rs:795][E: codex-rs/core/src/tools/spec_plan.rs:801][E: codex-rs/core/src/tools/spec_plan.rs:826][E: codex-rs/core/src/tools/spec_plan.rs:1047][E: codex-rs/core/src/tools/spec_plan.rs:1051][E: codex-rs/core/src/tools/spec_plan.rs:1052][E: codex-rs/core/src/tools/spec_plan.rs:1056]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与运行流

| 字段 | 必填 | 说明 |
|---|---:|---|
| `target` | 是 | agent id 或 canonical task name；运行时走 `resolve_agent_target`，先支持 thread id，后支持当前 agent path 下的相对/绝对路径解析。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:187][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:190][E: codex-rs/core/src/agent/agent_resolver.rs:14][E: codex-rs/core/src/agent/agent_resolver.rs:18][E: codex-rs/core/src/agent/agent_resolver.rs:21] |
| `message` | 是 | 加密 string；共享 handler 会拒绝 trim 后为空的消息。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:195][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:199][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:49][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:50] |

schema required 为 `target` 和 `message`，additional properties 为 false；runtime args 使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:209][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:44][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:42]

`followup_task::Handler` 解析 arguments 后调用共享 `handle_message_string_tool`，传入 `MessageDeliveryMode::TriggerTurn`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:29][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:30][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:31][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:33]

共享 handler 在 TriggerTurn 模式下禁止 root agent target；如果目标 path 是 root，会返回 model-facing error `Follow-up tasks can't target the root agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:78][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:84][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:85]

`TriggerTurn` 会把 communication 的 `trigger_turn` 设为 true；投递路径与 `send_message` 共用 `send_inter_agent_communication`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:107]

## 输出与边界

成功投递后返回空文本 function output，success 为 `Some(true)`；schema 层没有 JSON output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:125][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:210]

`send_message` 和 `followup_task` 共用 `handle_message_string_tool` submission path；差异由 `MessageDeliveryMode::apply` 写入 `InterAgentCommunication.trigger_turn`，`QueueOnly` 为 false、`TriggerTurn` 为 true。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:19][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:22][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs:59][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:31][E: codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs:33]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/followup_task.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/message_tool.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/agent/agent_resolver.rs
- codex-rs/tools/src/tool_executor.rs
