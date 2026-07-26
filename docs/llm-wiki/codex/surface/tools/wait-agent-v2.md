---
id: tool.wait-agent-v2
title: wait_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_wait_agent_tool_v2, WaitAgentHandlerV2, multi_agents_v2::wait::Handler, multi_agents_v2::WaitAgentResult]
related: [tool.spawn-agent-v2, tool.send-message, tool.followup-task, tool.list-agents]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `wait_agent` V2 等待当前 turn 的 input queue activity：mailbox 更新、steered user input，或 timeout。它只返回摘要，不返回子 agent 消息正文。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `wait_agent`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:22][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:24][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:285][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:287] |
| handler | V2 module re-export `wait::Handler as WaitAgentHandler`；`spec_plan.rs` 用 `WaitAgentHandlerV2::new(context.wait_agent_timeouts)` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:34][E: codex-rs/core/src/tools/spec_plan.rs:842][E: codex-rs/core/src/tools/spec_plan.rs:870] |
| spec | function tool，`strict: false`、`defer_loading: None`，有 `{ message, timed_out }` output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:285][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:286][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:290][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:291][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:293] |

## 注册与门控

`wait_agent` V2 注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支，并进一步要求 `multi_agent_v2.wait_agent_enabled`；该 sub-gate 默认 true，可在不关闭其它 V2 collaboration tools 的情况下单独隐藏 wait。通过后它仍使用相同 exposure/namespace 包装。[E: codex-rs/core/src/tools/spec_plan.rs:825][E: codex-rs/core/src/tools/spec_plan.rs:827][E: codex-rs/core/src/tools/spec_plan.rs:828][E: codex-rs/core/src/tools/spec_plan.rs:867][E: codex-rs/core/src/tools/spec_plan.rs:870][E: codex-rs/core/src/config/mod.rs:1185][E: codex-rs/core/src/config/mod.rs:1209]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 timeout

| 字段 | 必填 | 说明 |
|---|---:|---|
| `timeout_ms` | 否 | schema 描述来自 `WaitAgentTimeoutOptions`；runtime 从 `turn.config.multi_agent_v2` 读取 min/max/default，低于最小或高于最大都会返回 model-facing error，未提供时使用 default。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:52][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:876][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:879][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:50][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:53][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:54][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:59][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:65] |

V2 wait parameters 没有 `targets`，required 为 `None`，additional properties 为 false；这与 V1 required `targets` schema 不同。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:848][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:869][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:871][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:876][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:885]

## Handler 流程

handler 解析 arguments 后，基于当前 active turn/sub-id 读取 `turn_state_for_sub_id`，然后订阅 input queue activity，得到 watch receiver 和可能已经 pending 的 activity。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:48][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:49][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:70][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:72][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:74]

等待期间会发出 `CollabAgentToolCall` started/completed turn items；tool 标记为 `Wait`，completed status 为 `Completed`，当前 receiver 列表与 `agents_states` 都是空集合。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:79][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:81][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:85][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:99][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:102][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:112]

`wait_for_activity` 先消费 pending activity；没有 pending 时用 deadline 等 watch receiver changed。`Mailbox` 返回 mailbox activity，`Steer` 返回 steered，超时或 receiver 关闭返回 timed out。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:178][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:183][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:185][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:186][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:189][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:194]

## 输出

`WaitAgentResult::from_outcome` 把三类 outcome 映射成三条固定 summary：`Wait completed.`、`Wait interrupted by new input.`、`Wait timed out.`；只有 timed out outcome 会把 `timed_out` 设为 true。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:139][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:141][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:142][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:143][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:144][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:148]

输出 schema 也只有 `message` 和 `timed_out`，`message` 描述明确是不含 agent final content 的 brief wait summary。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:514][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:518][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:520][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:527]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/tools/src/tool_executor.rs
