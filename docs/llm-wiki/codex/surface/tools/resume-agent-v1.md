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
updated: 61a44880a8
---

> `resume_agent` V1 是 `multi_agent_v1` namespace 下的恢复工具；它按 agent id 尝试从 recorded rollout 重新加载当前 not-live/missing 的 agent，并返回恢复后的 status。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "resume_agent")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:11][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:13][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14] |
| spec builder | `create_resume_agent_tool` 返回 namespace spec，内部 function name 是 `resume_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:247][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:253][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:257] |
| handler | `multi_agents.rs` re-export `resume_agent::Handler as ResumeAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:75][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:154][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:156] |

## 注册与门控

`resume_agent` 注册在 V1 collaboration 分支：`collab_tools_enabled` true 且 `multi_agent_v2_enabled` false；V1 exposure 在 `search_tool_enabled` true 时是 deferred，否则 direct。[E: codex-rs/core/src/tools/spec_plan.rs:825][E: codex-rs/core/src/tools/spec_plan.rs:827][E: codex-rs/core/src/tools/spec_plan.rs:884][E: codex-rs/core/src/tools/spec_plan.rs:887][E: codex-rs/core/src/tools/spec_plan.rs:888][E: codex-rs/core/src/tools/spec_plan.rs:890][E: codex-rs/core/src/tools/spec_plan.rs:905]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:20][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:21][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 handler

schema 只有 required `id`，描述为 agent id；handler 直接用 `ThreadId::from_string` 解析该 id。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:248][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:250][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:263][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:42][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:43][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:44]

handler 读取目标 metadata，检查当前 spawn depth 是否超过 `agent_max_depth`，然后发出 `CollabAgentToolCall` started item。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:47][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:52][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:53][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:54][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:63]

如果当前 status 是 `NotFound`，handler 调用 `try_resume_closed_agent`；该 helper 用 `build_agent_resume_config` 构造 resume config，`build_agent_resume_config` 先构造 shared config 再把 `config.base_instructions` 置为 `None`，然后 handler 调用 `resume_agent_from_rollout`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:87][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:88][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:188][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:194][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:185][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:186][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:188][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:195]

`AgentControl::resume_agent_from_rollout` 会恢复单个 recorded rollout；当配置或恢复出来的版本是 V2 时直接返回，否则继续遍历 persisted open spawn children 并恢复 legacy descendants。[E: codex-rs/core/src/agent/control/spawn.rs:717][E: codex-rs/core/src/agent/control/spawn.rs:723][E: codex-rs/core/src/agent/control/spawn.rs:724][E: codex-rs/core/src/agent/control/spawn.rs:729][E: codex-rs/core/src/agent/control/spawn.rs:732][E: codex-rs/core/src/agent/control/spawn.rs:738][E: codex-rs/core/src/agent/control/spawn.rs:741][E: codex-rs/core/src/agent/control/spawn.rs:743]

## 输出

无论是否真正执行恢复尝试，handler 都会发出 completed item，带最终 status 和 receiver metadata；若 helper 返回 error 则向 model 返回错误，否则记录 `codex.multi_agent.resume` telemetry 并返回 `{ status }`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:123][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:126][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:132][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:140][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:145][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:148][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:151]

输出 schema 是 `{ status }`，status 复用通用 agent status schema；handler 以 success true 写回 function output。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:264][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:484][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:488][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:490][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:179][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:180]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/control/spawn.rs
- codex-rs/tools/src/tool_executor.rs
