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
updated: 4d7a5c7c73
---

> `send_input` V1 是 `multi_agent_v1` namespace 下的消息投递工具；它按 thread id 寻址，支持 plain `message` 或 structured `items`，并可用 `interrupt` 先打断目标 agent。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "send_input")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:8][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14] |
| spec builder | `create_send_input_tool_v1` 返回 namespace spec，内部 function name 是 `send_input`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:148][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:171][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:175] |
| handler | `multi_agents.rs` re-export `send_input::Handler as SendInputHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:76][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:122][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:124] |

## 注册与门控

`send_input` 注册在 V1 collaboration 分支：`collab_tools_enabled` true 且 `multi_agent_v2_enabled` false。V1 exposure 在 `search_tool_enabled` true 时为 `Deferred`，否则为 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:786][E: codex-rs/core/src/tools/spec_plan.rs:788][E: codex-rs/core/src/tools/spec_plan.rs:843][E: codex-rs/core/src/tools/spec_plan.rs:846][E: codex-rs/core/src/tools/spec_plan.rs:847][E: codex-rs/core/src/tools/spec_plan.rs:849][E: codex-rs/core/src/tools/spec_plan.rs:863]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:17][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:18][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与运行流

| 字段 | 必填 | 说明 |
|---|---:|---|
| `target` | 是 | V1 只按 agent thread id 解析；`parse_agent_id_target` 调用 `ThreadId::from_string`，不是 V2 task path resolver。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:151][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:180][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:43][E: codex-rs/core/src/tools/handlers/multi_agents.rs:39][E: codex-rs/core/src/tools/handlers/multi_agents.rs:40] |
| `message` / `items` | 否，但二选一 | schema 同时允许 legacy text 和 structured items；runtime `parse_collab_input` 要求二选一且拒绝空文本/空 items。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:155][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:161][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:138][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:141][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:145][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:156] |
| `interrupt` | 否 | default false；true 时 handler 先调用 `agent_control.interrupt_agent(receiver_thread_id)`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:163][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:165][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:133][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:134][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:64] |

如果目标 agent 在 metadata registry 中存在，handler 会先用 resume config 调 `ensure_v2_agent_loaded`；随后发出 `CollabAgentToolCall` started item、调用 `agent_control.send_input`、读取目标 status，再发出 completed item，其中带 receiver metadata 与状态映射。[E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:50][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:55][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:71][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:86][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:90][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:95][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:98][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:112]

`AgentControl::send_input` 根据输入是否开启 turn 做 execution-capacity 检查，再把 input 转成 `Op` 送进目标 thread，并统一处理 thread request 结果。[E: codex-rs/core/src/agent/control.rs:141][E: codex-rs/core/src/agent/control.rs:145][E: codex-rs/core/src/agent/control.rs:146][E: codex-rs/core/src/agent/control.rs:150][E: codex-rs/core/src/agent/control.rs:154]

## 输出

输出 schema 是 `{ submission_id }`；handler 成功时返回 `SendInputResult { submission_id }`，并以 success true 写回 function output。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:441][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:445][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:450][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:116][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:118][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:151][E: codex-rs/core/src/tools/handlers/multi_agents/send_input.rs:152]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/send_input.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/control.rs
- codex-rs/tools/src/tool_executor.rs
