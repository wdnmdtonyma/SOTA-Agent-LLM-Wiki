---
id: tool.list-agents
title: list_agents 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/agent/control.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_list_agents_tool, ListAgentsHandlerV2, multi_agents_v2::list_agents::Handler, AgentControl::list_agents]
related: [tool.spawn-agent-v2, tool.wait-agent-v2, tool.interrupt-agent-v2]
evidence: explicit
status: verified
updated: db887d03e1
---

> `list_agents` 是 MultiAgentV2 的协作树查询工具：它列出当前 root thread tree 中的 live agents，并可按 task-path prefix 过滤。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `list_agents`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:9][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:273][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:274] |
| handler | V2 module re-export `list_agents::Handler as ListAgentsHandler`；`spec_plan.rs` 用 `ListAgentsHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:30][E: codex-rs/core/src/tools/spec_plan.rs:49][E: codex-rs/core/src/tools/spec_plan.rs:841] |
| spec | function tool，`strict: false`、`defer_loading: None`，有 `agents` output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:273][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:278][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:279][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:281] |

## 注册与门控

`list_agents` 注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支；旧 V1 分支没有对应的 `list_agents` add 调用[I]。[E: codex-rs/core/src/tools/spec_plan.rs:792][E: codex-rs/core/src/tools/spec_plan.rs:794][E: codex-rs/core/src/tools/spec_plan.rs:795][E: codex-rs/core/src/tools/spec_plan.rs:840][E: codex-rs/core/src/tools/spec_plan.rs:841]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与输出 schema

| 字段 | 必填 | 说明 |
|---|---:|---|
| `path_prefix` | 否 | task-path prefix 过滤器；schema 文案要求不带 trailing slash，runtime 在当前 session source 的 agent path 上 resolve。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:266][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:268][E: codex-rs/core/src/agent/control.rs:336][E: codex-rs/core/src/agent/control.rs:342][E: codex-rs/core/src/agent/control.rs:347][E: codex-rs/core/src/agent/control.rs:350] |

parameters 没有 required 字段，additional properties 为 false；runtime args 使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:280][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:57][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:58]

输出是 `{ agents: [...] }`，每个 item 必含 `agent_name`、`agent_status`、`last_task_message`；`agent_status` 复用通用 agent status schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:424][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:429][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:431][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:435][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:437][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:439][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:444]

## Handler 流程

handler 解析 arguments，先把当前 thread 在 root 场景注册进 agent control，再调用 `agent_control.list_agents(&turn.session_source, args.path_prefix.as_deref())`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:33][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:34][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:35][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:38][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:42]

`AgentControl::register_session_root` 只在当前 turn 没有 parent thread 时登记 root thread。[E: codex-rs/core/src/agent/control.rs:241][E: codex-rs/core/src/agent/control.rs:246][E: codex-rs/core/src/agent/control.rs:247]

`AgentControl::list_agents` 会 resolve 可选 prefix、读取 live agents、按 path/id 排序；如果 root path 匹配且 root thread 可取，会把 `/root` 加入输出，`last_task_message` 是 `ROOT_LAST_TASK_MESSAGE`。[E: codex-rs/core/src/agent/control.rs:336][E: codex-rs/core/src/agent/control.rs:342][E: codex-rs/core/src/agent/control.rs:352][E: codex-rs/core/src/agent/control.rs:353][E: codex-rs/core/src/agent/control.rs:366][E: codex-rs/core/src/agent/control.rs:368][E: codex-rs/core/src/agent/control.rs:370][E: codex-rs/core/src/agent/control.rs:371][E: codex-rs/core/src/agent/control.rs:372][E: codex-rs/core/src/agent/control.rs:375][E: codex-rs/core/src/agent/control.rs:377]

对每个 live agent，control 跳过没有 thread id 的 metadata，按 prefix 过滤，拿 thread status，并优先用 agent path 作为 `agent_name`，缺失 path 时回退 thread id。[E: codex-rs/core/src/agent/control.rs:381][E: codex-rs/core/src/agent/control.rs:382][E: codex-rs/core/src/agent/control.rs:385][E: codex-rs/core/src/agent/control.rs:392][E: codex-rs/core/src/agent/control.rs:395][E: codex-rs/core/src/agent/control.rs:399][E: codex-rs/core/src/agent/control.rs:403]

成功输出由 `ListAgentsResult { agents }` 序列化；`to_response_item` 传入 `Some(true)`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:76][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:77]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/agent/control.rs
- codex-rs/tools/src/tool_executor.rs
