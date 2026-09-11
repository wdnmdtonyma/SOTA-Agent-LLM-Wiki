---
id: tool.spawn-agent-v1
title: spawn_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_spawn_agent_tool_v1, SpawnAgentHandler, multi_agents::spawn::Handler, multi_agents::SpawnAgentArgs]
related: [tool.spawn-agent-v2, tool.send-input-v1, tool.wait-agent-v1, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> `spawn_agent` V1 是 `multi_agent_v1` namespace 下的子 agent 创建工具；当 collaboration tools 开启但 MultiAgentV2 分支未启用时注册。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "spawn_agent")`，其中 namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14] |
| spec builder | `create_spawn_agent_tool_v1` 返回 `ToolSpec::Namespace`，namespace 内的 function name 是 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:81][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:85] |
| handler | `multi_agents.rs` re-export `spawn::Handler as SpawnAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:77][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:221] |

## 注册与门控

`add_collaboration_tools` 在 `collab_tools_enabled` 为 true 后分流：`multi_agent_v2_enabled` 为 false 时进入 V1 注册路径，注册 `SpawnAgentHandler`、`SendInputHandler`、`ResumeAgentHandler`、`WaitAgentHandler` 和 `CloseAgentHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:1285][E: codex-rs/core/src/tools/spec_plan.rs:1344][E: codex-rs/core/src/tools/spec_plan.rs:1352][E: codex-rs/core/src/tools/spec_plan.rs:1368]

V1 exposure 在 search tool 开启时是 `Deferred`，否则是 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:1347][E: codex-rs/core/src/tools/spec_plan.rs:629]

V1 spawn options 硬编码 `hide_agent_type_model_reasoning: false`、`expose_spawn_agent_model_overrides: true`，并仍会把 `multi_agent_v2.usage_hint_text` 写进 V1 tool description。[E: codex-rs/core/src/tools/spec_plan.rs:1357][E: codex-rs/core/src/tools/spec_plan.rs:1358][E: codex-rs/core/src/tools/spec_plan.rs:1360]

handler 提供 `search_info()`，其 source name/description 来自 `multi_agent_tool_search_info`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents.rs:67]

## 输入

| 字段 | 必填 | 说明 |
|---|---:|---|
| `message` / `items` | 否，但二选一 | schema 同时提供 legacy plain-text `message` 和 structured `items`；runtime `parse_collab_input` 要求两者二选一，不能都传，也不能都缺。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:585][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:142] |
| `agent_type` | 否 | 非空白 agent type 会在非 full-history fork 分支应用 role config；`fork_context=true` 会调用 `reject_full_fork_agent_type_override`，显式 `agent_type` 被拒绝。当配置没有 agent roles 时，spec 会隐藏该字段。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:95][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:106][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:223] |
| `fork_context` | 否 | 默认 false；true 表示 full-history fork。此时继承父 agent type 并拒绝显式 `agent_type`，但 model / reasoning override 仍可按请求应用。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:598][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:233][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:97] |
| `model` / `reasoning_effort` | 否 | model/reasoning override 在 fork 与非 fork 路径都经公共 helper 验证并应用；`service_tier` 再经 service-tier helper 处理，但 V1 schema 不暴露 `service_tier` 字段。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:97][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:108][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:581] |

V1 schema 没有 required 字段，additional properties 为 false；这是因为 required 约束由 `parse_collab_input` 的二选一逻辑在 runtime 实现。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:94]

## Handler 流程与输出

handler 解析 arguments、生成 input preview、检查 agent depth limit，随后发送 spawn begin event。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:65][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:70][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:75]

spawn config 来自父 turn 的 effective config；公共 helper 会刷新 model/provider/reasoning/developer instructions，并复制 approval policy、cwd、permission profile 等 runtime state。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:93][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:177][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:238]

V1 spawn 调用 `spawn_agent_with_metadata`，但传给 `thread_spawn_source` 的 `task_name` 是 `None`，所以它返回 thread id 风格的 `agent_id`，不是 V2 canonical task path。V1 也不会解析 catalog usage hints。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:111][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:129]

输出 schema 是 `{ agent_id, nickname }`；handler 的 `ToolOutput` 以 success true 写回 function output。handler 没有覆写 `supports_parallel_tool_calls`，按默认 trait 不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:399][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:213][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:251][E: codex-rs/tools/src/tool_executor.rs:122]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/tools/src/tool_executor.rs
