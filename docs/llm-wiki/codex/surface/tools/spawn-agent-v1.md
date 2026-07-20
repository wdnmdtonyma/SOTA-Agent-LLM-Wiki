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
updated: 4d7a5c7c73
---

> `spawn_agent` V1 是 `multi_agent_v1` namespace 下的子 agent 创建工具；当 collaboration tools 开启但 MultiAgentV2 分支未启用时注册。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "spawn_agent")`，其中 namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:23][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14] |
| spec builder | `create_spawn_agent_tool_v1` 返回 `ToolSpec::Namespace`，namespace 内的 function name 是 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:84][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:88] |
| handler | `multi_agents.rs` re-export `spawn::Handler as SpawnAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:77][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:219][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:221] |

## 注册与门控

`add_collaboration_tools` 在 `collab_tools_enabled` 为 true 后分流：`multi_agent_v2_enabled` 为 false 时进入 V1 注册路径，注册 `SpawnAgentHandler`、`SendInputHandler`、`ResumeAgentHandler`、`WaitAgentHandler` 和 `CloseAgentHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:788][E: codex-rs/core/src/tools/spec_plan.rs:789][E: codex-rs/core/src/tools/spec_plan.rs:851][E: codex-rs/core/src/tools/spec_plan.rs:863][E: codex-rs/core/src/tools/spec_plan.rs:866][E: codex-rs/core/src/tools/spec_plan.rs:867]

V1 exposure 在 search tool 和 namespace tools 同时开启时是 `Deferred`，否则是 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:846][E: codex-rs/core/src/tools/spec_plan.rs:847][E: codex-rs/core/src/tools/spec_plan.rs:849]

handler 提供 `search_info()`，其 source name/description 来自 `multi_agent_tool_search_info`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:33][E: codex-rs/core/src/tools/handlers/multi_agents.rs:36][E: codex-rs/core/src/tools/handlers/multi_agents.rs:64]

## 输入

| 字段 | 必填 | 说明 |
|---|---:|---|
| `message` / `items` | 否，但二选一 | schema 同时提供 legacy plain-text `message` 和 structured `items`；runtime `parse_collab_input` 要求两者二选一，不能都传，也不能都缺。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:589][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:592][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:564][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:133][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:138][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:141] |
| `agent_type` | 否 | 非空白 agent type 会在非 full-history fork 分支应用 role config；full-history fork 只拒绝这个 role override。当配置没有 agent roles 时，spec 会隐藏该字段。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:75][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:76][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:93][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:105] |
| `fork_context` | 否 | 默认 false；true 表示 full-history fork。此时继承父 agent type 并拒绝显式 `agent_type`，但 model / reasoning override 仍可按请求应用。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:603][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:605][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:93][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:94][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:96][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:205][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:210] |
| `model` / `reasoning_effort` / `service_tier` | 否 | model/reasoning override 在 fork 与非 fork 路径都经公共 helper 验证并应用；`service_tier` 再经 service-tier helper 处理。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:610][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:616][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:623][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:90][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:96][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:107] |

V1 schema 没有 required 字段，additional properties 为 false；这是因为 required 约束由 `parse_collab_input` 的二选一逻辑在 runtime 实现。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:96]

## Handler 流程与输出

handler 解析 arguments、生成 input preview、检查 agent depth limit，随后发送 spawn begin event。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:54][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:61][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:62][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:66][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:71]

spawn config 来自父 turn 的 effective config；公共 helper 会刷新 model/provider/reasoning/developer instructions，并复制 approval policy、cwd、permission profile 等 runtime state。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:88][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:173][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:177][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:192][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:193][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:199][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:220][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:234]

V1 spawn 调用 `spawn_agent_with_metadata`，但传给 `thread_spawn_source` 的 `task_name` 是 `None`，所以它返回 thread id 风格的 `agent_id`，不是 V2 canonical task path。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:116][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:119][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:213][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:214]

输出 schema 是 `{ agent_id, nickname }`；handler 的 `ToolOutput` 以 success true 写回 function output。handler 没有覆写 `supports_parallel_tool_calls`，按默认 trait 不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:391][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:395][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:399][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:404][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:252][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:253][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/tools/src/tool_executor.rs
