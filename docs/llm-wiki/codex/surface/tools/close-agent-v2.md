---
id: tool.close-agent-v2
title: close_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs, codex-rs/core/src/agent/agent_resolver.rs]
symbols: [create_close_agent_tool_v2, ToolHandlerKind::CloseAgentV2, multi_agents_v2::close_agent::Handler]
related: [tool.spawn-agent-v2, tool.list-agents, tool.close-agent-v1]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `close_agent` V2 是 MultiAgentV2 的关闭工具：它按 agent id、相对 task name 或 canonical task path 定位非 root spawned agent，关闭目标及其 open descendants，并返回关闭前状态。

## 能回答的问题

- `close_agent` V2 的 `target` 可以是 task name 还是只能是 id？
- `close_agent` V2 为什么拒绝 root agent？
- `close_agent` V2 返回的 `previous_status` 是什么时候读取的？
- `close_agent` V2 在什么门控下注册？
- `close_agent` V2 和 V1 的差异是什么？

## 1 Identity

- Wire name: `close_agent`。[E: codex-rs/tools/src/agent_tool.rs:275]
- Handler kind: `ToolHandlerKind::CloseAgentV2`；core registry 映射到 `CloseAgentHandlerV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:436][E: codex-rs/core/src/tools/spec.rs:201]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:274]
- 所属套件: V2 分支注册 `close_agent`，V1 分支也注册同名工具但绑定 `ToolHandlerKind::CloseAgentV1`。[E: codex-rs/tools/src/tool_registry_plan.rs:423][E: codex-rs/tools/src/tool_registry_plan.rs:469][E: codex-rs/tools/src/tool_registry_plan.rs:476]

## 2 用途定位

`close_agent` V2 用于关闭不再需要的 agent 及其 open descendants，并返回 shutdown 请求发出前观察到的目标状态；这些语义写在工具 description 与 output schema 中。[E: codex-rs/tools/src/agent_tool.rs:276][E: codex-rs/tools/src/agent_tool.rs:465]

V2 handler 额外保护 root agent：如果目标 metadata 的 `agent_path` 是 root，handler 返回 “root is not a spawned agent”。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:35][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:37]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `target` | string | 是 | 无 | agent id 或 canonical task name；schema 文案明确允许两者，handler 使用 `resolve_agent_target`，resolver 先尝试 id，再按当前 session source 解析 task path。[E: codex-rs/tools/src/agent_tool.rs:267][E: codex-rs/tools/src/agent_tool.rs:270][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:26][E: codex-rs/core/src/agent/agent_resolver.rs:14][E: codex-rs/core/src/agent/agent_resolver.rs:21] |

schema required 为 `["target"]`，additionalProperties 为 false。[E: codex-rs/tools/src/agent_tool.rs:279]

## 4 输出 schema & 截断

输出 schema 是 object，只有 `previous_status` 字段，字段值复用 `agent_status_output_schema()`，并把 `previous_status` 放入 required。[E: codex-rs/tools/src/agent_tool.rs:462][E: codex-rs/tools/src/agent_tool.rs:464][E: codex-rs/tools/src/agent_tool.rs:466][E: codex-rs/tools/src/agent_tool.rs:469]

`agent_status_output_schema()` 允许 string 状态 `pending_init`、`running`、`interrupted`、`shutdown`、`not_found`，也允许 `{completed: string|null}` 或 `{errored: string}` object。[E: codex-rs/tools/src/agent_tool.rs:288][E: codex-rs/tools/src/agent_tool.rs:289][E: codex-rs/tools/src/agent_tool.rs:294][E: codex-rs/tools/src/agent_tool.rs:295][E: codex-rs/tools/src/agent_tool.rs:304][E: codex-rs/tools/src/agent_tool.rs:305]

handler 返回 `CloseAgentResult { previous_status }`，并在 `to_response_item` 中调用 `tool_output_response_item(..., Some(true), "close_agent")`；该工具没有在 schema 或 handler 中暴露输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:101][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:128]

## 5 ToolSpec 类型

`close_agent` V2 是 function tool，`strict: false`、`defer_loading: None`、object parameters。[E: codex-rs/tools/src/agent_tool.rs:274][E: codex-rs/tools/src/agent_tool.rs:277][E: codex-rs/tools/src/agent_tool.rs:278][E: codex-rs/tools/src/agent_tool.rs:279]

handler 只接受 function payload，并解析 JSON arguments。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:9][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:13][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:25]

## 6 注册与门控

`close_agent` V2 注册在 `config.collab_tools && config.multi_agent_v2` 分支。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:423]

注册 plan 中 `create_close_agent_tool_v2()` 的 `supports_parallel_tool_calls` 为 false，并绑定到 `ToolHandlerKind::CloseAgentV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:423][E: codex-rs/tools/src/tool_registry_plan.rs:424][E: codex-rs/tools/src/tool_registry_plan.rs:436]

## 7 parallel-safe

`close_agent` V2 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:424]

handler 会订阅当前 status、调用 `close_agent(agent_id)` 改变协作树生命周期，并发送 close begin/end events。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:44][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:55][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:81][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:88]

## 8 handler 走读

1. Core registry 把 `ToolHandlerKind::CloseAgentV2` 注册为 `CloseAgentHandlerV2`。[E: codex-rs/core/src/tools/spec.rs:201]
2. Handler 解析 function arguments 为 `CloseAgentArgs`，再用 `resolve_agent_target` 把 target 转为 thread id。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:26]
3. Handler 获取 target metadata，拒绝 root agent path。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:27][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:32]
4. Handler 发送 `CollabCloseBeginEvent`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:41][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:44]
5. Handler 调用 `subscribe_status` 并用 `borrow_and_update()` 读取关闭前 status；订阅失败时改用 `get_status` 发送 end event 后返回错误。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:55][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:58][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:75]
6. Handler 调用 `agent_control.close_agent(agent_id)`，发送 close end event，并返回 `previous_status`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:81][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:88][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:101]

## 9 设计动机、edge、历史

V2 的 target 解析兼容 legacy id 与 task path：`resolve_agent_target` 先试 `ThreadId::from_string`，失败后调用 `resolve_agent_reference`。[E: codex-rs/core/src/agent/agent_resolver.rs:14][E: codex-rs/core/src/agent/agent_resolver.rs:18]

V2 close 明确拒绝 root target；测试覆盖了用相对 `worker` 成功关闭 spawned agent，以及 `/root` 被拒绝。[E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3167][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3170][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3177][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3206][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3209][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3212]

V1 close 只把 `target` 解析成 `ThreadId`；V2 使用 resolver，所以 V2 支持 task name target。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:26]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs
- codex-rs/core/src/agent/agent_resolver.rs
- codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs
- codex-rs/core/src/tools/handlers/multi_agents_tests.rs

## 相关

- [spawn_agent (V2) 工具](spawn-agent-v2.md)
- [list_agents 工具](list-agents.md)
- [close_agent (V1) 工具](close-agent-v1.md)
