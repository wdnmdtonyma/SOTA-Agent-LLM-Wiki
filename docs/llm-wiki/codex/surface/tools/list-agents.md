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
updated: 7750465934
---

> `list_agents` 是 MultiAgentV2 的协作树查询工具：它列出当前 root thread tree 中的 live agents，并可按 task-path prefix 过滤。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `list_agents`，由 handler 和 spec builder 定义。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:9][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:306][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:307] |
| handler | V2 module re-export `list_agents::Handler as ListAgentsHandler`；`spec_plan.rs` 用 `ListAgentsHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:34][E: codex-rs/core/src/tools/spec_plan.rs:50][E: codex-rs/core/src/tools/spec_plan.rs:942] |
| spec | function tool，`strict: false`、`defer_loading: None`，有 `agents` output schema。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:306][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:311][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:312][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:314] |

## 注册与门控

`list_agents` 注册在 `collab_tools_enabled && multi_agent_v2_enabled` 分支；旧 V1 分支没有对应的 `list_agents` add 调用[I]。[E: codex-rs/core/src/tools/spec_plan.rs:886][E: codex-rs/core/src/tools/spec_plan.rs:888][E: codex-rs/core/src/tools/spec_plan.rs:889][E: codex-rs/core/src/tools/spec_plan.rs:941][E: codex-rs/core/src/tools/spec_plan.rs:945][E: codex-rs/core/src/tools/spec_plan.rs:953][E: codex-rs/core/src/tools/spec_plan.rs:965][E: codex-rs/core/src/tools/spec_plan.rs:969]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 返回 false。[E: codex-rs/tools/src/tool_executor.rs:73][E: codex-rs/tools/src/tool_executor.rs:74]

## 输入与输出 schema

| 字段 | 必填 | 说明 |
|---|---:|---|
| `path_prefix` | 否 | task-path prefix 过滤器；schema 文案要求不带 trailing slash，runtime 在当前 session source 的 agent path 上 resolve。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:299][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:301][E: codex-rs/core/src/agent/control.rs:383][E: codex-rs/core/src/agent/control.rs:389][E: codex-rs/core/src/agent/control.rs:394][E: codex-rs/core/src/agent/control.rs:397] |

parameters 没有 required 字段，additional properties 为 false；runtime args 使用 `#[serde(deny_unknown_fields)]`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:313][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:57][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:58]

输出是 `{ agents: [...] }`，每个 item 只要求 `agent_name` 和 `agent_status`；`agent_status` 复用通用 agent status schema。旧的 `last_task_message` 已从 schema 和 runtime 结果移除。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:455][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:461][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:464][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:468][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:473][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:474]

## Handler 流程

handler 解析 arguments，先把当前 thread 在 root 场景注册进 agent control，再调用 `agent_control.list_agents(&turn.session_source, args.path_prefix.as_deref())`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:33][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:34][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:35][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:38][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:42]

`AgentControl::register_session_root` 只在当前 turn 没有 parent thread 时登记 root thread。[E: codex-rs/core/src/agent/control.rs:288][E: codex-rs/core/src/agent/control.rs:293][E: codex-rs/core/src/agent/control.rs:294]

`AgentControl::list_agents` 会 resolve 可选 prefix、读取 live agents、按 path/id 排序；如果 root path 匹配且 root thread 可取，会把 `/root` 与它的当前 status 加入输出。[E: codex-rs/core/src/agent/control.rs:383][E: codex-rs/core/src/agent/control.rs:389][E: codex-rs/core/src/agent/control.rs:399][E: codex-rs/core/src/agent/control.rs:400][E: codex-rs/core/src/agent/control.rs:413][E: codex-rs/core/src/agent/control.rs:415][E: codex-rs/core/src/agent/control.rs:418][E: codex-rs/core/src/agent/control.rs:419][E: codex-rs/core/src/agent/control.rs:421][E: codex-rs/core/src/agent/control.rs:423]

对每个 live agent，control 跳过没有 thread id 的 metadata，按 prefix 过滤，拿 thread status，并优先用 agent path 作为 `agent_name`，缺失 path 时回退 thread id。[E: codex-rs/core/src/agent/control.rs:427][E: codex-rs/core/src/agent/control.rs:428][E: codex-rs/core/src/agent/control.rs:431][E: codex-rs/core/src/agent/control.rs:438][E: codex-rs/core/src/agent/control.rs:441][E: codex-rs/core/src/agent/control.rs:445][E: codex-rs/core/src/agent/control.rs:448]

成功输出由 `ListAgentsResult { agents }` 序列化；`to_response_item` 传入 `Some(true)`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:46][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:76][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:77]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/agent/control.rs
- codex-rs/tools/src/tool_executor.rs
