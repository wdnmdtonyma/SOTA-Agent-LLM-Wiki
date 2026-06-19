---
id: tool.send-input-v1
title: send_input (V1) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/send_input.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/agent/control.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_send_input_tool_v1, SendInputHandler, multi_agents::send_input::Handler, SendInputArgs]
related: [tool.spawn-agent-v1, tool.wait-agent-v1, tool.close-agent-v1]
evidence: explicit
status: verified
updated: 5670360009
---

> `send_input` V1 是 `multi_agent_v1` namespace 下的消息投递工具；它按 thread id 寻址，支持 plain `message` 或 structured `items`，并可用 `interrupt` 先打断目标 agent。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "send_input")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:9][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:11][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:11] |
| spec builder | `create_send_input_tool_v1` 返回 namespace spec，内部 function name 是 `send_input`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:118][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:141][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:145] |
| handler | `multi_agents.rs` re-export `send_input::Handler as SendInputHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:84][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:114][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:116] |

## 注册与门控

`send_input` 注册在 V1 collaboration 分支：`collab_tools_enabled` true 且 `multi_agent_v2_enabled` false。V1 exposure 在 search+namespace 同时开启时为 `Deferred`，否则为 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:761][E: codex-rs/core/src/tools/spec_plan.rs:763][E: codex-rs/core/src/tools/spec_plan.rs:814][E: codex-rs/core/src/tools/spec_plan.rs:817][E: codex-rs/core/src/tools/spec_plan.rs:819][E: codex-rs/core/src/tools/spec_plan.rs:821][E: codex-rs/core/src/tools/spec_plan.rs:833]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:18][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:19][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与运行流

| 字段 | 必填 | 说明 |
|---|---:|---|
| `target` | 是 | V1 只按 agent thread id 解析；`parse_agent_id_target` 调用 `ThreadId::from_string`，不是 V2 task path resolver。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:121][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:150][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:44][E: codex-rs/core/src/tools/handlers/multi_agents.rs:47][E: codex-rs/core/src/tools/handlers/multi_agents.rs:48] |
| `message` / `items` | 否，但二选一 | schema 同时允许 legacy text 和 structured items；runtime `parse_collab_input` 要求二选一且拒绝空文本/空 items。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:125][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:131][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:168][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:171][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:175][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:187] |
| `interrupt` | 否 | default false；true 时 handler 先调用 `agent_control.interrupt_agent(receiver_thread_id)`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:133][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:135][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:125][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:126][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:61][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:65] |

如果目标 agent 在 metadata registry 中存在，handler 会先用 resume config 调 `ensure_v2_agent_loaded`；随后发送 interaction begin event、调用 `agent_control.send_input`、读取目标 status 并发送 interaction end event。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:47][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:52][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:69][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:83][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:87][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:92]

`AgentControl::send_input` 做 execution-capacity 检查，再把 `Op` 送进目标 thread；成功后更新或清除 last task message。[E: codex-rs/core/src/agent/control.rs:125][E: codex-rs/core/src/agent/control.rs:130][E: codex-rs/core/src/agent/control.rs:131][E: codex-rs/core/src/agent/control.rs:143][E: codex-rs/core/src/agent/control.rs:153][E: codex-rs/core/src/agent/control.rs:156][E: codex-rs/core/src/agent/control.rs:158]

## 输出

输出 schema 是 `{ submission_id }`；handler 成功时返回 `SendInputResult { submission_id }`，并以 success true 写回 function output。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:411][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:415][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:420][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:108][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:110][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:143][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:144]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/send_input.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/control.rs
- codex-rs/tools/src/tool_executor.rs
