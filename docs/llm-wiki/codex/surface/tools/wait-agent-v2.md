---
id: tool.wait-agent-v2
title: wait_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/config/mod.rs, codex-rs/core/src/session/multi_agents.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_wait_agent_tool_v2, WaitAgentHandlerV2, multi_agents_v2::wait::Handler, multi_agents_v2::WaitAgentResult]
related: [tool.spawn-agent-v2, tool.send-message, tool.followup-task, tool.list-agents]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `wait_agent` V2 等待当前 turn 的 input queue activity：mailbox 更新、steered user input，或 timeout。它只返回摘要，不返回子 agent 消息正文。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `wait_agent`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:24][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:287] |
| handler | V2 module re-export `wait::Handler as WaitAgentHandler`；`spec_plan.rs` 用 `WaitAgentHandlerV2::new(context.wait_agent_timeouts)` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:37][E: codex-rs/core/src/tools/spec_plan.rs:51][E: codex-rs/core/src/tools/spec_plan.rs:1177] |
| spec | function tool，`strict: false`、`defer_loading: None`，有 `{ message, timed_out }` output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:286][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:290][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:293] |

## 注册与门控

`wait_agent` V2 注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支，并进一步要求 `multi_agent_v2.wait_agent_enabled`；该 sub-gate 默认 true，可在不关闭其它 V2 collaboration tools 的情况下单独隐藏 wait。通过后它仍使用相同 exposure/namespace 包装。[E: codex-rs/core/src/tools/spec_plan.rs:1134][E: codex-rs/core/src/tools/spec_plan.rs:1135][E: codex-rs/core/src/tools/spec_plan.rs:1174][E: codex-rs/core/src/tools/spec_plan.rs:1176][E: codex-rs/core/src/config/mod.rs:1225][E: codex-rs/core/src/config/mod.rs:1244]

V2 wait 的 schema/runtime timeout 默认来自 `multi_agent_v2`：default 30_000ms，min 10_000ms，max 3_600_000ms。[E: codex-rs/core/src/tools/spec_plan.rs:656][E: codex-rs/core/src/tools/spec_plan.rs:658][E: codex-rs/core/src/config/mod.rs:213][E: codex-rs/core/src/config/mod.rs:214][E: codex-rs/core/src/config/mod.rs:215]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## 输入与 timeout

| 字段 | 必填 | 说明 |
|---|---:|---|
| `timeout_ms` | 否 | schema 描述来自 `WaitAgentTimeoutOptions`；runtime 从 `turn.config.multi_agent_v2` 读取 min/max/default。高于 max 会返回 model-facing error；低于 min 会被 clamp 到 min，并在成功输出里追加 clamp 说明；未提供时使用 default。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:879][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:50][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:55][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:61][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:147] |

V2 `timeout_ms` schema 只写 defaults/min/max，不再内嵌 “prefer longer waits” 文案。分钟级等待建议改由 world-state usage hint 的 `DEFAULT_MULTI_AGENT_V2_WAIT_AGENT_USAGE_HINT_TEXT` 在 `wait_agent_enabled` 时追加。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:879][E: codex-rs/core/src/session/multi_agents.rs:51][E: codex-rs/core/src/session/multi_agents.rs:111]

V2 wait parameters 没有 `targets`，required 为 `None`，additional properties 为 false；这与 V1 required `targets` schema 不同。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:869][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:876][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:885]

## Handler 流程

handler 解析 arguments 后，基于当前 active turn/sub-id 读取 `turn_state_for_sub_id`，然后订阅 input queue activity，得到 watch receiver 和可能已经 pending 的 activity。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:49][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:66][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:70]

等待期间会发出 `CollabAgentToolCall` started/completed turn items；tool 标记为 `Wait`，completed status 为 `Completed`，当前 receiver 列表与 `agents_states` 都是空集合。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:78][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:80][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:81][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:100][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:101][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:108]

`wait_for_activity` 先消费 pending activity；没有 pending 时用 deadline 等 watch receiver changed。`Mailbox` 返回 mailbox activity，`Steer` 返回 steered，超时或 receiver 关闭返回 timed out。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:189][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:191][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:195][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:197][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:200]

## 输出

`WaitAgentResult::from_outcome` 把三类 outcome 映射成三条固定 summary：`Wait completed.`、`Wait interrupted by new input.`、`Wait timed out.`；只有 timed out outcome 会把 `timed_out` 设为 true。若请求值被 clamp 到 min，还会追加 `Requested timeout of {n}ms was clamped to the minimum of {min}ms.`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:142][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:143][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:144][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:147][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:154]

输出 schema 也只有 `message` 和 `timed_out`，`message` 描述明确是不含 agent final content 的 brief wait summary，并可包含 timeout adjustment。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:518][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:520][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:524]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/config/mod.rs
- codex-rs/core/src/session/multi_agents.rs
- codex-rs/tools/src/tool_executor.rs
