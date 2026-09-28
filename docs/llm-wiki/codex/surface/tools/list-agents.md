---
id: tool.list-agents
title: list_agents 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/agent/control.rs, codex-rs/core/src/agent/control/api.rs, codex-rs/core/src/agent/control/runtime_context.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_list_agents_tool, ListAgentsHandlerV2, multi_agents_v2::list_agents::Handler, AgentControl::list_agents]
related: [tool.spawn-agent-v2, tool.wait-agent-v2, tool.interrupt-agent-v2]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `list_agents` 是 MultiAgentV2 的协作树查询工具：它列出当前 root thread tree 中的 live agents，并可按 task-path prefix 过滤。

## 能回答的问题

- `list_agents` 只在 V2 分支注册吗？
- `path_prefix` 如何 resolve？
- 输出里有没有 `last_task_message`？
- root agent 会不会出现在结果里？

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `list_agents`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:306] |
| handler | V2 module re-export `list_agents::Handler as ListAgentsHandler`；`spec_plan.rs` 用 `ListAgentsHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:30][E: codex-rs/core/src/tools/spec_plan.rs:48][E: codex-rs/core/src/tools/spec_plan.rs:1389] |
| spec | function tool，`strict: false`、`defer_loading: None`，有 `agents` output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:305][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:310][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:309] |

## 注册与门控

`list_agents` 注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支；V1 分支注册的是 `SpawnAgentHandler` / `SendInputHandler` / `ResumeAgentHandler` / `WaitAgentHandler` / `CloseAgentHandler`，没有 `list_agents`。[E: codex-rs/core/src/tools/spec_plan.rs:1299][E: codex-rs/core/src/tools/spec_plan.rs:1302][E: codex-rs/core/src/tools/spec_plan.rs:1389][E: codex-rs/core/src/tools/spec_plan.rs:1404][E: codex-rs/core/src/tools/spec_plan.rs:1420]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:122]

## 输入与输出 schema

| 字段 | 必填 | 说明 |
|---|---:|---|
| `path_prefix` | 否 | task-path prefix 过滤器；schema 文案要求不带 trailing slash，runtime 在当前 session source 的 agent path 上 resolve。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:300][E: codex-rs/core/src/agent/control.rs:354] |

parameters 没有 required 字段，additional properties 为 false；runtime args 使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:312][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:78]

输出是 `{ agents: [...] }`，每个 item 只要求 `agent_name` 和 `agent_status`；`agent_status` 复用通用 agent status schema。旧的 `last_task_message` 已从 schema 和 runtime 结果移除。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:478][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:484]

## Handler 流程

handler 解析 arguments 后调用 `agent_control.list(session.thread_id, turn.parent_thread_id, &turn.session_source, args.path_prefix.as_deref())`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:50]

`list` API 先 `register_session_root`，再调用 `list_agents`。`register_session_root` 只在当前 turn 没有 parent thread 时登记 root thread。[E: codex-rs/core/src/agent/control/api.rs:204][E: codex-rs/core/src/agent/control/api.rs:205][E: codex-rs/core/src/agent/control/runtime_context.rs:20]

`AgentControl::list_agents` 会 resolve 可选 prefix、读取 live agents、按 path/id 排序；如果 root path 匹配且 root thread 可取，会把 root 与它的当前 status 加入输出。[E: codex-rs/core/src/agent/control.rs:348][E: codex-rs/core/src/agent/control.rs:378][E: codex-rs/core/src/agent/control.rs:386]

对每个 live agent，control 跳过没有 thread id 的 metadata，按 prefix 过滤，拿 thread status。[E: codex-rs/core/src/agent/control.rs:398][E: codex-rs/core/src/agent/control.rs:411]

handler 优先用 agent path 作为 `agent_name`，缺失 path 时回退 thread id。成功输出由 `ListAgentsResult { agents }` 序列化；`to_response_item` 传入 `Some(true)`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:60][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:67][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:104]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/agent/control.rs
- codex-rs/core/src/agent/control/api.rs
- codex-rs/core/src/agent/control/runtime_context.rs
- codex-rs/tools/src/tool_executor.rs
