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
updated: 4d7a5c7c73
---

> `close_agent` V1 是 `multi_agent_v1` namespace 下的关闭工具；它按 agent thread id 关闭目标 agent 及其 live descendants，并返回关闭前观察到的 status。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "close_agent")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:8][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14] |
| spec builder | `create_close_agent_tool_v1` 返回 namespace spec，内部 function name 是 `close_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:318][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:321][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:328] |
| handler | `multi_agents.rs` re-export `close_agent::Handler as CloseAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:130][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:132] |

## 注册与门控

`close_agent` 注册在 V1 collaboration 分支：`collab_tools_enabled` true 且 `multi_agent_v2_enabled` false；V1 exposure 只受 `search_tool_enabled` 控制，search 开启时是 `Deferred`，否则是 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:786][E: codex-rs/core/src/tools/spec_plan.rs:788][E: codex-rs/core/src/tools/spec_plan.rs:789][E: codex-rs/core/src/tools/spec_plan.rs:846][E: codex-rs/core/src/tools/spec_plan.rs:847][E: codex-rs/core/src/tools/spec_plan.rs:849][E: codex-rs/core/src/tools/spec_plan.rs:867]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:17][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:18][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 handler

schema 只有 required `target`，描述为来自 `spawn_agent` 的 agent id；handler 用 `parse_agent_id_target` 把它解析为 `ThreadId`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:319][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:321][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:332][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:39][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:40][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:41]

handler 发出 `CollabAgentToolCall` started item，订阅目标 status 以取得关闭前状态；如果 thread 不存在但 metadata 已知，会退回 `get_status`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:45][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:48][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:62][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:65][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:69]

关闭动作由 `agent_control.close_agent(agent_id)` 执行；成功或失败后都会发出 completed item，带 receiver metadata 与状态映射，成功返回 `CloseAgentResult { previous_status }`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:98][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:102][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:105][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:111][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:119][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:123][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:125]

`AgentControl::close_agent` 会在 persisted state 可用时尝试把目标 spawn-edge status 标为 `Closed`；unknown `ThreadNotFound` 不做持久化标记，live-thread 持久化失败只 warn，而 stale known-agent 的持久化失败会返回 fatal。随后它调用 `shutdown_agent_tree`，该函数关闭目标并遍历 live descendants 逐个 shutdown。[E: codex-rs/core/src/agent/control/legacy.rs:29][E: codex-rs/core/src/agent/control/legacy.rs:35][E: codex-rs/core/src/agent/control/legacy.rs:37][E: codex-rs/core/src/agent/control/legacy.rs:39][E: codex-rs/core/src/agent/control/legacy.rs:43][E: codex-rs/core/src/agent/control/legacy.rs:46][E: codex-rs/core/src/agent/control/legacy.rs:49][E: codex-rs/core/src/agent/control/legacy.rs:51][E: codex-rs/core/src/agent/control/legacy.rs:55][E: codex-rs/core/src/agent/control/legacy.rs:60][E: codex-rs/core/src/agent/control/legacy.rs:65][E: codex-rs/core/src/agent/control/legacy.rs:75][E: codex-rs/core/src/agent/control/legacy.rs:76][E: codex-rs/core/src/agent/control/legacy.rs:77][E: codex-rs/core/src/agent/control/legacy.rs:78]

## 输出

输出 schema 是 `{ previous_status }`，其 status 形态复用通用 `agent_status_output_schema`；handler 以 success true 写回 function output。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:333][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:532][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:536][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:538][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:541][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:150][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:151]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs
- codex-rs/core/src/agent/control/legacy.rs
- codex-rs/tools/src/tool_executor.rs
