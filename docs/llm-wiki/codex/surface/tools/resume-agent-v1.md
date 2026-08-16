---
id: tool.resume-agent-v1
title: resume_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/agent/control/spawn.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_resume_agent_tool, ResumeAgentHandler, multi_agents::resume_agent::Handler, AgentControl::resume_agent_from_rollout]
related: [tool.spawn-agent-v1, tool.close-agent-v1, tool.send-input-v1]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `resume_agent` V1 是 `multi_agent_v1` namespace 下的恢复工具；它按 agent id 尝试从 recorded rollout 重新加载当前 not-live/missing 的 agent，并返回恢复后的 status。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "resume_agent")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:14][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14] |
| spec builder | `create_resume_agent_tool` 返回 namespace spec，内部 function name 是 `resume_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:247][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:257] |
| handler | `multi_agents.rs` re-export `resume_agent::Handler as ResumeAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:75][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:158][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:159] |

## 注册与门控

`resume_agent` 注册在 V1 collaboration 分支：`collab_tools_enabled` true 且 `multi_agent_v2_enabled` false；V1 exposure 在 `search_tool_enabled` true 时是 deferred，否则 direct。[E: codex-rs/core/src/tools/spec_plan.rs:1134][E: codex-rs/core/src/tools/spec_plan.rs:1135][E: codex-rs/core/src/tools/spec_plan.rs:1191][E: codex-rs/core/src/tools/spec_plan.rs:1194][E: codex-rs/core/src/tools/spec_plan.rs:1197][E: codex-rs/core/src/tools/spec_plan.rs:1212]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:22][E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## 输入与 handler

schema 只有 required `id`，描述为 agent id；handler 直接用 `ThreadId::from_string` 解析该 id。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:250][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:263][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:46]

handler 读取目标 metadata，检查当前 spawn depth 是否超过 `agent_max_depth`，然后发出 `CollabAgentToolCall` started item。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:49][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:62]

如果当前 status 是 `NotFound`，handler 调用 `try_resume_closed_agent`；该 helper 用 `build_agent_resume_config` 构造 resume config，`build_agent_resume_config` 先构造 shared config 再把 `config.base_instructions` 置为 `None`，然后 handler 调用 `resume_agent_from_rollout`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:89][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:90][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:198][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:199][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:193][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:195]

`AgentControl::resume_agent_from_rollout` 会恢复单个 recorded rollout；当配置或恢复出来的版本是 V2 时直接返回，否则继续遍历 persisted open spawn children 并恢复 legacy descendants。[E: codex-rs/core/src/agent/control/spawn.rs:862][E: codex-rs/core/src/agent/control/spawn.rs:870][E: codex-rs/core/src/agent/control/spawn.rs:874][E: codex-rs/core/src/agent/control/spawn.rs:877][E: codex-rs/core/src/agent/control/spawn.rs:883]

## 输出

无论是否真正执行恢复尝试，handler 都会发出 completed item，带最终 status 和 receiver metadata；若 helper 返回 error 则向 model 返回错误，否则记录 `codex.multi_agent.resume` telemetry 并返回 `{ status }`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:126][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:148][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:151][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:154]

输出 schema 是 `{ status }`，status 复用通用 agent status schema；handler 以 success true 写回 function output。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:264][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:488][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:182][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:183]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/control/spawn.rs
- codex-rs/tools/src/tool_executor.rs
