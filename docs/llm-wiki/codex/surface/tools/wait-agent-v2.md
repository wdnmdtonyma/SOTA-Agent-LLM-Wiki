---
id: tool.wait-agent-v2
title: wait_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/config/mod.rs, codex-rs/prompts/src/multi_agent_instructions.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_wait_agent_tool_v2, WaitAgentHandlerV2, multi_agents_v2::wait::Handler, multi_agents_v2::WaitAgentResult]
related: [tool.spawn-agent-v2, tool.send-message, tool.followup-task, tool.list-agents]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `wait_agent` V2 等待当前 turn 的 input queue activity：mailbox 更新、steered user input，或 timeout。它只返回摘要，不返回子 agent 消息正文。

## 能回答的问题

- V2 `wait_agent` 还要 `targets` 吗？
- timeout 默认/min/max 从哪读？
- 超时文案和 clamp 如何出现在输出里？
- 它能否单独关掉而不关掉其它 V2 工具？

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `wait_agent`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:24][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:286] |
| handler | V2 module re-export `wait::Handler as WaitAgentHandler`；`spec_plan.rs` 用 `WaitAgentHandlerV2::new(context.wait_agent_timeouts)` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:33][E: codex-rs/core/src/tools/spec_plan.rs:51][E: codex-rs/core/src/tools/spec_plan.rs:1370] |
| spec | function tool，`strict: false`、`defer_loading: None`，有 `{ message, timed_out }` output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:285][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:289][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:288] |

## 注册与门控

`wait_agent` V2 注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支，并进一步要求 `multi_agent_v2.wait_agent_enabled`；该 sub-gate 默认 true，可在不关闭其它 V2 collaboration tools 的情况下单独隐藏 wait。通过后它仍使用相同 exposure/namespace 包装。[E: codex-rs/core/src/tools/spec_plan.rs:1299][E: codex-rs/core/src/tools/spec_plan.rs:1302][E: codex-rs/core/src/tools/spec_plan.rs:1367][E: codex-rs/core/src/config/mod.rs:1357]

V2 wait 的 schema/runtime timeout 默认来自 `multi_agent_v2`：default 30_000ms，min 10_000ms，max 3_600_000ms。[E: codex-rs/core/src/config/mod.rs:256][E: codex-rs/core/src/config/mod.rs:257][E: codex-rs/core/src/config/mod.rs:258][E: codex-rs/core/src/tools/spec_plan.rs:768][E: codex-rs/core/src/tools/spec_plan.rs:769][E: codex-rs/core/src/tools/spec_plan.rs:770]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:122]

## 输入与 timeout

| 字段 | 必填 | 说明 |
|---|---:|---|
| `timeout_ms` | 否 | schema 描述来自 `WaitAgentTimeoutOptions`；runtime 从 `turn.config.multi_agent_v2` 读取 min/max/default。高于 max 会返回 model-facing error；低于 min 会被 clamp 到 min，并在成功输出里追加 clamp 说明；未提供时使用 default。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:880][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:58][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:150] |

V2 `timeout_ms` schema 只写 defaults/min/max，不再内嵌 “prefer longer waits” 文案。分钟级等待建议由 prompts crate 的 `DEFAULT_MULTI_AGENT_V2_WAIT_AGENT_USAGE_HINT_TEXT` 在 `wait_agent_enabled` 时追加。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:881][E: codex-rs/prompts/src/multi_agent_instructions.rs:9][E: codex-rs/prompts/src/multi_agent_instructions.rs:76]

V2 wait parameters 没有 `targets`，required 为 `None`，additional properties 为 false；这与 V1 required `targets` schema 不同。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:886][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:872]

## Handler 流程

handler 解析 arguments 后，基于当前 active turn/sub-id 读取 `turn_state_for_sub_id`，然后订阅 input queue activity，得到 watch receiver 和可能已经 pending 的 activity。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:69][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:73]

等待期间会发出 `CollabAgentToolCall` started/completed turn items；tool 标记为 `Wait`，completed status 为 `Completed`，当前 receiver 列表与 `agents_states` 都是空集合。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:81][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:104]

`wait_for_activity` 先消费 pending activity；没有 pending 时用 deadline 等 watch receiver changed。`Mailbox` 返回 mailbox activity，`Steer` 返回 steered，超时或 receiver 关闭返回 timed out。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:187][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:194][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:203]

## 输出

`WaitAgentResult::from_outcome` 把三类 outcome 映射成三条固定 summary：`Wait completed.`、`Wait interrupted by new input.`、`Wait timed out.`；只有 timed out outcome 会把 `timed_out` 设为 true。若请求值被 clamp 到 min，还会追加 `Requested timeout of {n}ms was clamped to the minimum of {min}ms.`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:145][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:157][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:150]

输出 schema 也只有 `message` 和 `timed_out`，`message` 描述明确是不含 agent final content 的 brief wait summary，并可包含 timeout adjustment。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:523][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:532]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/config/mod.rs
- codex-rs/prompts/src/multi_agent_instructions.rs
- codex-rs/tools/src/tool_executor.rs
