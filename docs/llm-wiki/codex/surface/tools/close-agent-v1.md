---
id: tool.close-agent-v1
title: close_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs]
symbols: [create_close_agent_tool_v1, ToolHandlerKind::CloseAgentV1, multi_agents::close_agent::Handler]
related: [tool.spawn-agent-v1, tool.close-agent-v2, tool.resume-agent-v1]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `close_agent` V1 是 legacy collab tool 中按 agent id 关闭子 agent 的 function tool；它返回关闭请求前观察到的目标状态。

## 能回答的问题

- `close_agent` V1 的 `target` 是什么格式？
- `close_agent` V1 返回的 `previous_status` 怎么得到？
- `close_agent` V1 在什么门控下注册？
- `close_agent` V1 和 V2 的 target 解析差异是什么？
- `close_agent` V1 是否支持 task path？

## 1 Identity

- Wire name: `close_agent`。[E: codex-rs/tools/src/agent_tool.rs:257]
- Handler kind: `ToolHandlerKind::CloseAgentV1`；core registry 映射为 `CloseAgentHandler`。[E: codex-rs/tools/src/tool_registry_plan.rs:476][E: codex-rs/core/src/tools/spec.rs:198]
- 所属套件: V1 legacy collab branch。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:469]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:256]

## 2 用途定位

`close_agent` V1 用于关闭不再需要的 agent 及其 open descendants，并返回 shutdown 请求前的 status；该描述由工具 description 和 output schema 共同给出。[E: codex-rs/tools/src/agent_tool.rs:258][E: codex-rs/tools/src/agent_tool.rs:465]

V1 target 是 `spawn_agent` 返回的 agent id，handler 直接用 `parse_agent_id_target` 解析，没有调用 V2 task path resolver。[E: codex-rs/tools/src/agent_tool.rs:253][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:26]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `target` | string | 是 | 无 | 来自 `spawn_agent` 的 agent id；handler 用 `parse_agent_id_target` 转 `ThreadId`，没有相对 task name resolver。[E: codex-rs/tools/src/agent_tool.rs:252][E: codex-rs/tools/src/agent_tool.rs:253][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:26] |

parameters required 为 `["target"]`，additionalProperties 为 false。[E: codex-rs/tools/src/agent_tool.rs:261]

## 4 输出 schema & 截断

输出 schema 是 object，包含 required `previous_status`，其 schema 是 `agent_status_output_schema()`。[E: codex-rs/tools/src/agent_tool.rs:462][E: codex-rs/tools/src/agent_tool.rs:464][E: codex-rs/tools/src/agent_tool.rs:466][E: codex-rs/tools/src/agent_tool.rs:469]

`agent_status_output_schema()` 允许 string 状态、completed object、errored object。[E: codex-rs/tools/src/agent_tool.rs:288][E: codex-rs/tools/src/agent_tool.rs:294][E: codex-rs/tools/src/agent_tool.rs:304]

handler 返回 `CloseAgentResult { previous_status }`，`to_response_item` 调用 `tool_output_response_item(..., Some(true), "close_agent")`；该工具没有在 schema 或 handler 中暴露输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:92][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:113]

## 5 ToolSpec 类型

`close_agent` V1 是 function tool，`strict: false`、`defer_loading: None`、object parameters。[E: codex-rs/tools/src/agent_tool.rs:256][E: codex-rs/tools/src/agent_tool.rs:259][E: codex-rs/tools/src/agent_tool.rs:260][E: codex-rs/tools/src/agent_tool.rs:261]

handler 返回 `ToolKind::Function`，并只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:9][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:13]

## 6 注册与门控

`close_agent` V1 注册在 `config.collab_tools` true 且 `config.multi_agent_v2` false 的 branch。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:469]

注册 plan 中 `create_close_agent_tool_v1()` 的 `supports_parallel_tool_calls` 为 false，并把 `close_agent` 绑定到 `ToolHandlerKind::CloseAgentV1`。[E: codex-rs/tools/src/tool_registry_plan.rs:469][E: codex-rs/tools/src/tool_registry_plan.rs:470][E: codex-rs/tools/src/tool_registry_plan.rs:476]

## 7 parallel-safe

`close_agent` V1 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:470]

handler 订阅 status、调用 `close_agent(agent_id)` 改变 agent 生命周期，并发送 close begin/end events。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:35][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:72][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:79]

## 8 handler 走读

1. Core registry 把 `ToolHandlerKind::CloseAgentV1` 注册为 `CloseAgentHandler`。[E: codex-rs/core/src/tools/spec.rs:198]
2. Handler 解析 arguments 为 `CloseAgentArgs`，并把 `target` 解析成 `ThreadId`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:26]
3. Handler 获取 receiver metadata，发送 `CollabCloseBeginEvent`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:30][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:35]
4. Handler 通过 `subscribe_status` 读取关闭前 status；如果订阅失败，则发送 end event 后返回错误。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:49][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:51]
5. Handler 调用 `agent_control.close_agent(agent_id)`，发送 close end event，返回 `previous_status`。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:72][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:79][E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:92]

## 9 设计动机、edge、历史

V1 close 是 id-based[I]：V1 handler 使用 `parse_agent_id_target`，V2 close 使用 `resolve_agent_target`，并额外拒绝 root target。[E: codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs:35]

V1 和 V2 共用 wire name `close_agent`，但 registry 按 `multi_agent_v2` 分支绑定到不同 handler kind。[E: codex-rs/tools/src/agent_tool.rs:257][E: codex-rs/tools/src/agent_tool.rs:275][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:436][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:476]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents/close_agent.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/close_agent.rs

## 相关

- [spawn_agent (V1) 工具](spawn-agent-v1.md)
- [close_agent (V2) 工具](close-agent-v2.md)
- [resume_agent (V1) 工具](resume-agent-v1.md)
