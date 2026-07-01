---
id: tool.wait-agent-v2
title: wait_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_wait_agent_tool_v2, WaitAgentHandlerV2, multi_agents_v2::wait::Handler, WaitAgentResult]
related: [tool.spawn-agent-v2, tool.send-message, tool.followup-task, tool.list-agents]
evidence: explicit
status: verified
updated: db887d03e1
---

> `wait_agent` V2 等待当前 turn 的 input queue activity：mailbox 更新、steered user input，或 timeout。它只返回摘要，不返回子 agent 消息正文。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `wait_agent`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:23][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:252][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:254] |
| handler | V2 module re-export `wait::Handler as WaitAgentHandler`；`spec_plan.rs` 用 `WaitAgentHandlerV2::new(context.wait_agent_timeouts)` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:33][E: codex-rs/core/src/tools/spec_plan.rs:830][E: codex-rs/core/src/tools/spec_plan.rs:831] |
| spec | function tool，`strict: false`、`defer_loading: None`，有 `{ message, timed_out }` output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:252][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:253][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:257][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:258][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:260] |

## 注册与门控

`wait_agent` V2 注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支，并经过相同的 exposure/namespace 包装。[E: codex-rs/core/src/tools/spec_plan.rs:792][E: codex-rs/core/src/tools/spec_plan.rs:794][E: codex-rs/core/src/tools/spec_plan.rs:795][E: codex-rs/core/src/tools/spec_plan.rs:830][E: codex-rs/core/src/tools/spec_plan.rs:831][E: codex-rs/core/src/tools/spec_plan.rs:1047][E: codex-rs/core/src/tools/spec_plan.rs:1070]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 timeout

| 字段 | 必填 | 说明 |
|---|---:|---|
| `timeout_ms` | 否 | schema 描述来自 `WaitAgentTimeoutOptions`；runtime 从 `turn.config.multi_agent_v2` 读取 min/max/default，低于最小或高于最大都会返回 model-facing error，未提供时使用 default。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:31][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:834][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:837][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:54][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:55][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:66] |

V2 wait parameters 没有 `targets`，required 为 `None`，additional properties 为 false；这与 V1 required `targets` schema 不同。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:806][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:827][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:829][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:834][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:843]

## Handler 流程

handler 解析 arguments 后，基于当前 active turn/sub-id 读取 `turn_state_for_sub_id`，然后订阅 input queue activity，得到 watch receiver 和可能已经 pending 的 activity。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:49][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:50][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:69][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:71][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:73][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:75]

等待期间会发送 begin/end collab waiting event；V2 当前填充的 `receiver_thread_ids`、`receiver_agents`、`agent_statuses` 和 `statuses` 都是空集合。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:78][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:81][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:84][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:96][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:103][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:104]

`wait_for_activity` 先消费 pending activity；没有 pending 时用 deadline 等 watch receiver changed。`Mailbox` 返回 mailbox activity，`Steer` 返回 steered，超时或 receiver 关闭返回 timed out。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:171][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:176][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:178][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:179][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:182][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:187]

## 输出

`WaitAgentResult::from_outcome` 把三类 outcome 映射成三条固定 summary：`Wait completed.`、`Wait interrupted by new input.`、`Wait timed out.`；只有 timed out outcome 会把 `timed_out` 设为 true。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:132][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:134][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:135][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:136][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:137][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:141]

输出 schema 也只有 `message` 和 `timed_out`，`message` 描述明确是不含 agent final content 的 brief wait summary。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:485][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:489][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:491][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:496][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:498]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/tools/src/tool_executor.rs
