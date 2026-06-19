---
id: tool.spawn-agent-v1
title: spawn_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_spawn_agent_tool_v1, SpawnAgentHandler, multi_agents::spawn::Handler, SpawnAgentArgs]
related: [tool.spawn-agent-v2, tool.send-input-v1, tool.wait-agent-v1, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 5670360009
---

> `spawn_agent` V1 是 `multi_agent_v1` namespace 下的子 agent 创建工具；当 collaboration tools 开启但 MultiAgentV2 分支未启用时注册。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "spawn_agent")`，其中 namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:27][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:11] |
| spec builder | `create_spawn_agent_tool_v1` 返回 `ToolSpec::Namespace`，namespace 内的 function name 是 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:48][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:64] |
| handler | `multi_agents.rs` re-export `spawn::Handler as SpawnAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:85][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:212][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:214] |

## 注册与门控

`add_collaboration_tools` 在 `collab_tools_enabled` 为 true 后分流：`multi_agent_v2_enabled` 为 false 时进入 V1 `else` 分支，注册 `SpawnAgentHandler`、`SendInputHandler`、`ResumeAgentHandler`、`WaitAgentHandler` 和 `CloseAgentHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:761][E: codex-rs/core/src/tools/spec_plan.rs:763][E: codex-rs/core/src/tools/spec_plan.rs:764][E: codex-rs/core/src/tools/spec_plan.rs:814][E: codex-rs/core/src/tools/spec_plan.rs:823][E: codex-rs/core/src/tools/spec_plan.rs:837]

V1 exposure 在 search tool 和 namespace tools 同时开启时是 `Deferred`，否则是 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:817][E: codex-rs/core/src/tools/spec_plan.rs:818][E: codex-rs/core/src/tools/spec_plan.rs:819][E: codex-rs/core/src/tools/spec_plan.rs:821]

handler 提供 `search_info()`，其 source name/description 来自 `multi_agent_tool_search_info`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:34][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:35][E: codex-rs/core/src/tools/handlers/multi_agents.rs:44][E: codex-rs/core/src/tools/handlers/multi_agents.rs:72]

## 输入

| 字段 | 必填 | 说明 |
|---|---:|---|
| `message` / `items` | 否，但二选一 | schema 同时提供 legacy plain-text `message` 和 structured `items`；runtime `parse_collab_input` 要求两者二选一，不能都传，也不能都缺。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:555][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:558][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:564][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:163][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:168][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:171] |
| `agent_type` | 否 | 非空白 agent type 会在非 fork 分支应用 role config。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:566][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:58][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:62][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:107] |
| `fork_context` | 否 | 默认 false；true 表示 full-history fork，并会拒绝 `agent_type`、`model`、`reasoning_effort` 覆盖。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:570][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:572][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:226][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:227][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:92][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:236][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:241] |
| `model` / `reasoning_effort` / `service_tier` | 否 | 非 fork 分支应用 model/reasoning override；`service_tier` 先写入 config，随后经 service-tier helper 处理。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:577][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:583][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:590][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:89][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:99][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:111] |

V1 schema 没有 required 字段，additional properties 为 false；这是因为 required 约束由 `parse_collab_input` 的二选一逻辑在 runtime 实现。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:72][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:74]

## Handler 流程与输出

handler 解析 arguments、生成 input preview、检查 agent depth limit，随后发送 spawn begin event。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:66][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:73]

spawn config 来自父 turn 的 effective config；公共 helper 会刷新 model/provider/reasoning/developer instructions，并复制 approval policy、cwd、permission profile 等 runtime state。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:87][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:204][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:208][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:223][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:224][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:230][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:253][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:267]

V1 spawn 调用 `spawn_agent_with_metadata`，但传给 `thread_spawn_source` 的 `task_name` 是 `None`，所以它返回 thread id 风格的 `agent_id`，不是 V2 canonical task path。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:120][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:123][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:128][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:206][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:207]

输出 schema 是 `{ agent_id, nickname }`；handler 的 `ToolOutput` 以 success true 写回 function output。handler 没有覆写 `supports_parallel_tool_calls`，按默认 trait 不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:361][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:365][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:369][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:374][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:245][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:246][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/tools/src/tool_executor.rs
