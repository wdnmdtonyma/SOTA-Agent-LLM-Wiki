---
id: tool.close-agent-v1
title: close_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs, codex-rs/core/src/agent/control/legacy.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_close_agent_tool_v1, CloseAgentHandler, multi_agents::close_agent::Handler, AgentControl::close_agent]
related: [tool.spawn-agent-v1, tool.send-input-v1, tool.resume-agent-v1]
evidence: explicit
status: verified
updated: 5670360009
---

> `close_agent` V1 是 `multi_agent_v1` namespace 下的关闭工具；它按 agent thread id 关闭目标 agent 及其 live descendants，并返回关闭前观察到的 status。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "close_agent")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:9][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:11][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:11] |
| spec builder | `create_close_agent_tool_v1` 返回 namespace spec，内部 function name 是 `close_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:288][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:294][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:298] |
| handler | `multi_agents.rs` re-export `close_agent::Handler as CloseAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:114][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:116] |

## 注册与门控

`close_agent` 注册在 V1 collaboration 分支：`collab_tools_enabled` true 且 `multi_agent_v2_enabled` false；V1 exposure 在 search+namespace 同时开启时是 deferred，否则 direct。[E: codex-rs/core/src/tools/spec_plan.rs:761][E: codex-rs/core/src/tools/spec_plan.rs:763][E: codex-rs/core/src/tools/spec_plan.rs:814][E: codex-rs/core/src/tools/spec_plan.rs:817][E: codex-rs/core/src/tools/spec_plan.rs:819][E: codex-rs/core/src/tools/spec_plan.rs:821][E: codex-rs/core/src/tools/spec_plan.rs:837]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:18][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:19][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 handler

schema 只有 required `target`，描述为来自 `spawn_agent` 的 agent id；handler 用 `parse_agent_id_target` 把它解析为 `ThreadId`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:289][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:291][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:302][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:40][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:41][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:42]

handler 发送 close begin event，订阅目标 status 以取得关闭前状态；如果 thread 不存在但 metadata 已知，会退回 `get_status`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:49][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:58][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:61][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:65]

关闭动作由 `agent_control.close_agent(agent_id)` 执行；成功或失败后都会发送 close end event，成功返回 `CloseAgentResult { previous_status }`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:88][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:92][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:95][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:107][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:109][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:110]

`AgentControl::close_agent` 会在 persisted state 可用时尝试把目标 spawn-edge status 标为 `Closed`；unknown `ThreadNotFound` 不做持久化标记，live-thread 持久化失败只 warn，而 stale known-agent 的持久化失败会返回 fatal。随后它调用 `shutdown_agent_tree` 关闭目标及 in-memory spawn tree 中的 live descendants。[E: codex-rs/core/src/agent/control/legacy.rs:27][E: codex-rs/core/src/agent/control/legacy.rs:29][E: codex-rs/core/src/agent/control/legacy.rs:34][E: codex-rs/core/src/agent/control/legacy.rs:42][E: codex-rs/core/src/agent/control/legacy.rs:45][E: codex-rs/core/src/agent/control/legacy.rs:54][E: codex-rs/core/src/agent/control/legacy.rs:59][E: codex-rs/core/src/agent/control/legacy.rs:64][E: codex-rs/core/src/agent/control/legacy.rs:72][E: codex-rs/core/src/agent/control/legacy.rs:74]

## 输出

输出 schema 是 `{ previous_status }`，其 status 形态复用通用 `agent_status_output_schema`；handler 以 success true 写回 function output。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:303][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:506][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:510][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:512][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:515][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:134][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:135]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs
- codex-rs/core/src/agent/control/legacy.rs
- codex-rs/tools/src/tool_executor.rs
