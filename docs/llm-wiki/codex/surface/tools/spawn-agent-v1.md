---
id: tool.spawn-agent-v1
title: spawn_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/agent/child_config.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_spawn_agent_tool_v1, SpawnAgentHandler, multi_agents::spawn::Handler, multi_agents::SpawnAgentArgs]
related: [tool.spawn-agent-v2, tool.send-input-v1, tool.wait-agent-v1, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `spawn_agent` V1 是 `multi_agent_v1` namespace 下的子 agent 创建工具；当 collaboration tools 开启但 MultiAgentV2 分支未启用时注册。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "spawn_agent")`，其中 namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:31][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14] |
| spec builder | `create_spawn_agent_tool_v1` 返回 `ToolSpec::Namespace`，namespace 内的 function name 是 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:81][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:85] |
| handler | `multi_agents.rs` re-export `spawn::Handler as SpawnAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:77][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:212] |

## 注册与门控

`add_collaboration_tools` 在 `collab_tools_enabled` 为 true 后分流：`multi_agent_v2_enabled` 为 false 时进入 V1 注册路径，注册 `SpawnAgentHandler`、`SendInputHandler`、`ResumeAgentHandler`、`WaitAgentHandler` 和 `CloseAgentHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:1299][E: codex-rs/core/src/tools/spec_plan.rs:1396][E: codex-rs/core/src/tools/spec_plan.rs:1404][E: codex-rs/core/src/tools/spec_plan.rs:1420]

V1 exposure 在 search tool 开启时是 `Deferred`，否则是 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:1399][E: codex-rs/core/src/tools/spec_plan.rs:653]

V1 spawn options 硬编码 `hide_agent_type_model_reasoning: false`、`expose_spawn_agent_model_overrides: true`，并仍会把 `multi_agent_v2.usage_hint_text` 写进 V1 tool description。[E: codex-rs/core/src/tools/spec_plan.rs:1409][E: codex-rs/core/src/tools/spec_plan.rs:1410][E: codex-rs/core/src/tools/spec_plan.rs:1412]

handler 提供 `search_info()`，其 source name/description 来自 `multi_agent_tool_search_info`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:38][E: codex-rs/core/src/tools/handlers/multi_agents.rs:67]

## 输入

| 字段 | 必填 | 说明 |
|---|---:|---|
| `message` / `items` | 否，但二选一 | schema 同时提供 legacy plain-text `message` 和 structured `items`；runtime `parse_collab_input` 要求两者二选一，不能都传，也不能都缺。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:591][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:164] |
| `agent_type` | 否 | 非空白 agent type 会传给 `prepare_agent_spawn_config`；当配置没有 agent roles 时 spec 会隐藏该字段。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:104][E: codex-rs/core/src/agent/child_config.rs:51] |
| `fork_context` | 否 | 默认 false；true 表示 full-history fork。schema 仍暴露该字段。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:608][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:224][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:112] |
| `model` / `reasoning_effort` | 否 | 经 `prepare_agent_spawn_config` 验证并应用；V1 schema 不暴露 `service_tier` 字段。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:105][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:591] |

V1 schema 没有 required 字段，additional properties 为 false；这是因为 required 约束由 `parse_collab_input` 的二选一逻辑在 runtime 实现。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:94]

## Handler 流程与输出

handler 解析 arguments、生成 input preview、检查 agent depth limit，随后发送 spawn begin event。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:71][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:76][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:82]

spawn config 来自 `prepare_agent_spawn_config`，version 固定 `SpawnConfigVersion::V1`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:98][E: codex-rs/core/src/agent/child_config.rs:51]

V1 spawn 调用 `agent_control.spawn(SpawnRequest { ... })`，传给 `thread_spawn_source` 的 `task_name` 是 `None`，所以它返回 thread id 风格的 `agent_id`，不是 V2 canonical task path。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:116][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:126]

输出 schema 是 `{ agent_id, nickname }`；handler 的 `ToolOutput` 以 success true 写回 function output。handler 没有覆写 `supports_parallel_tool_calls`，按默认 trait 不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:396][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:204][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:242][E: codex-rs/tools/src/tool_executor.rs:122]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/child_config.rs
- codex-rs/tools/src/tool_executor.rs
