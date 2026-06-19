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
updated: 5670360009
---

> `resume_agent` V1 是 `multi_agent_v1` namespace 下的恢复工具；它按 agent id 尝试从 recorded rollout 重新加载当前 not-live/missing 的 agent，并返回恢复后的 status。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "resume_agent")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:12][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:11] |
| spec builder | `create_resume_agent_tool` 返回 namespace spec，内部 function name 是 `resume_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:217][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:223][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:227] |
| handler | `multi_agents.rs` re-export `resume_agent::Handler as ResumeAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:83][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:140][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:142] |

## 注册与门控

`resume_agent` 注册在 V1 collaboration 分支：`collab_tools_enabled` true 且 `multi_agent_v2_enabled` false；V1 exposure 在 search+namespace 同时开启时是 deferred，否则 direct。[E: codex-rs/core/src/tools/spec_plan.rs:761][E: codex-rs/core/src/tools/spec_plan.rs:763][E: codex-rs/core/src/tools/spec_plan.rs:814][E: codex-rs/core/src/tools/spec_plan.rs:817][E: codex-rs/core/src/tools/spec_plan.rs:819][E: codex-rs/core/src/tools/spec_plan.rs:821][E: codex-rs/core/src/tools/spec_plan.rs:834]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:19][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:20][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 handler

schema 只有 required `id`，描述为 agent id；handler 直接用 `ThreadId::from_string` 解析该 id。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:218][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:220][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:233][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:41][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:42][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:43]

handler 读取目标 metadata，检查当前 spawn depth 是否超过 `agent_max_depth`，然后发送 resume begin event。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:52][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:53][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:59]

如果当前 status 是 `NotFound`，handler 调用 `try_resume_closed_agent`；该 helper 用 `build_agent_resume_config` 保留 rollout/session 中的 base instructions，再调用 `resume_agent_from_rollout`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:79][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:80][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:174][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:180][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:213][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:216][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:181]

`AgentControl::resume_agent_from_rollout` 会恢复单个 recorded rollout；当配置或恢复出来的版本是 V2 时直接返回，否则继续遍历 persisted open spawn children 并恢复 legacy descendants。[E: codex-rs/core/src/agent/control/spawn.rs:524][E: codex-rs/core/src/agent/control/spawn.rs:530][E: codex-rs/core/src/agent/control/spawn.rs:531][E: codex-rs/core/src/agent/control/spawn.rs:536][E: codex-rs/core/src/agent/control/spawn.rs:539][E: codex-rs/core/src/agent/control/spawn.rs:548][E: codex-rs/core/src/agent/control/spawn.rs:551]

## 输出

无论是否真正执行恢复尝试，handler 都会发送 resume end event；若 helper 返回 error 则向 model 返回错误，否则记录 `codex.multi_agent.resume` telemetry 并返回 `{ status }`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:115][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:118][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:131][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:134][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:137]

输出 schema 是 `{ status }`，status 复用通用 agent status schema；handler 以 success true 写回 function output。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:234][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:458][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:462][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:464][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:165][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:166]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/control/spawn.rs
- codex-rs/tools/src/tool_executor.rs
