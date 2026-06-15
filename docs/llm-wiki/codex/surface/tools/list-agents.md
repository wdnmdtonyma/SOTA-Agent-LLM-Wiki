---
id: tool.list-agents
title: list_agents 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs, codex-rs/core/src/agent/control.rs]
symbols: [create_list_agents_tool, ToolHandlerKind::ListAgentsV2, multi_agents_v2::list_agents::Handler]
related: [tool.spawn-agent-v2, tool.wait-agent-v2, tool.close-agent-v2]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `list_agents` 是 MultiAgentV2 的协作树查询工具：它列出当前 root thread tree 中的 live agents，并可按 task-path prefix 过滤。

## 能回答的问题

- `list_agents` 在哪些门控下出现？
- `list_agents` 的 `path_prefix` 怎么解析？
- `list_agents` 输出的 `agent_name`、`agent_status`、`last_task_message` 来自哪里？
- `list_agents` 为什么只属于 V2？
- `list_agents` 是否会列出 root agent 和 closed agent？

## 1 Identity

- Wire name: `list_agents`。[E: codex-rs/tools/src/agent_tool.rs:239]
- Handler kind: `ToolHandlerKind::ListAgentsV2`；core registry 映射为 `ListAgentsHandlerV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:437][E: codex-rs/core/src/tools/spec.rs:222]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:238]
- 所属套件: `list_agents` 在 `multi_agent_v2` 分支注册；registry 测试断言 V1 collab tools 不含 `list_agents`。[E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:428][E: codex-rs/tools/src/tool_registry_plan_tests.rs:178]

## 2 用途定位

`list_agents` 用于列出当前 root thread tree 中的 live agents；工具描述说明可选 `path_prefix` 过滤 task-path prefix。[E: codex-rs/tools/src/agent_tool.rs:240][E: codex-rs/tools/src/agent_tool.rs:241]

输出字段让模型可以看到 agent canonical name、最后状态和最近任务消息；schema required 明确这三个字段都存在。[E: codex-rs/tools/src/agent_tool.rs:390][E: codex-rs/tools/src/agent_tool.rs:392][E: codex-rs/tools/src/agent_tool.rs:397][E: codex-rs/tools/src/agent_tool.rs:401]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `path_prefix` | string | 否 | 无过滤 | 可选 task-path prefix；schema description 写明“不以 trailing slash 结尾”并接受相对或绝对 task-path 语法；运行时在当前 session source 的 agent path 上 resolve prefix。[E: codex-rs/tools/src/agent_tool.rs:231][E: codex-rs/tools/src/agent_tool.rs:233][E: codex-rs/core/src/agent/control.rs:836][E: codex-rs/core/src/agent/control.rs:839] |

parameters 没有 required 字段，additionalProperties 为 false。[E: codex-rs/tools/src/agent_tool.rs:245]

## 4 输出 schema & 截断

输出 schema 是 object，包含 `agents` array。[E: codex-rs/tools/src/agent_tool.rs:381][E: codex-rs/tools/src/agent_tool.rs:383][E: codex-rs/tools/src/agent_tool.rs:384]

每个 agent item 必含 `agent_name`、`agent_status`、`last_task_message`；`agent_name` 描述为 canonical task name，缺失时回退 agent id；`last_task_message` 可为 string 或 null。[E: codex-rs/tools/src/agent_tool.rs:388][E: codex-rs/tools/src/agent_tool.rs:390][E: codex-rs/tools/src/agent_tool.rs:397][E: codex-rs/tools/src/agent_tool.rs:401]

`agent_status` 复用 `agent_status_output_schema()`，允许 string 状态、completed object 或 errored object。[E: codex-rs/tools/src/agent_tool.rs:392][E: codex-rs/tools/src/agent_tool.rs:394][E: codex-rs/tools/src/agent_tool.rs:288][E: codex-rs/tools/src/agent_tool.rs:294][E: codex-rs/tools/src/agent_tool.rs:304]

handler 返回 `ListAgentsResult { agents }`，`to_response_item` 调用 `tool_output_response_item(..., Some(true), "list_agents")`；该工具没有在 schema 或 handler 中暴露输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:37][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:62]

## 5 ToolSpec 类型

`list_agents` 是 function tool，`strict: false`、`defer_loading: None`、object parameters。[E: codex-rs/tools/src/agent_tool.rs:238][E: codex-rs/tools/src/agent_tool.rs:243][E: codex-rs/tools/src/agent_tool.rs:244][E: codex-rs/tools/src/agent_tool.rs:245]

handler 返回 `ToolKind::Function`，只匹配 function payload，并解析 JSON arguments。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:10][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:14][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:25]

## 6 注册与门控

`list_agents` 注册在 `config.collab_tools && config.multi_agent_v2` 分支。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:428]

注册 plan 中 `create_list_agents_tool()` 的 `supports_parallel_tool_calls` 为 false，并把 `list_agents` 绑定到 `ToolHandlerKind::ListAgentsV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:428][E: codex-rs/tools/src/tool_registry_plan.rs:429][E: codex-rs/tools/src/tool_registry_plan.rs:437]

## 7 parallel-safe

`list_agents` 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:429]

handler 虽以读取为主，但会先 `register_session_root`，再查询 agent control 的当前 live agents；这会触碰协作树 registry 状态[I]。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:29][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:33]

## 8 handler 走读

1. Core registry 将 `ToolHandlerKind::ListAgentsV2` 注册为 `ListAgentsHandlerV2`。[E: codex-rs/core/src/tools/spec.rs:222]
2. Handler 解析 function arguments 为 `ListAgentsArgs`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:24][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:25]
3. Handler 注册当前 session root，然后调用 `agent_control.list_agents(&turn.session_source, path_prefix)`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs:33]
4. `AgentControl::list_agents` 先把可选 prefix resolve 到当前 agent path 下，再收集 `live_agents()` 并按 agent path/id 排序。[E: codex-rs/core/src/agent/control.rs:836][E: codex-rs/core/src/agent/control.rs:839][E: codex-rs/core/src/agent/control.rs:844][E: codex-rs/core/src/agent/control.rs:846][E: codex-rs/core/src/agent/control.rs:854]
5. 如果 root path 符合 prefix 且 registry 里有 root thread，输出会包含 `/root`，其 `last_task_message` 是 `Main thread`。[E: codex-rs/core/src/agent/control.rs:860][E: codex-rs/core/src/agent/control.rs:863][E: codex-rs/core/src/agent/control.rs:867][E: codex-rs/core/src/agent/control.rs:869]
6. 对每个 live agent，control 取 agent path 作为 `agent_name`，没有 path 时回退 thread id，并附带 thread status 与 metadata 中的 last task message。[E: codex-rs/core/src/agent/control.rs:887][E: codex-rs/core/src/agent/control.rs:890][E: codex-rs/core/src/agent/control.rs:891][E: codex-rs/core/src/agent/control.rs:892][E: codex-rs/core/src/agent/control.rs:894][E: codex-rs/core/src/agent/control.rs:895]

## 9 设计动机、edge、历史

`list_agents` 是 V2-only[I]；registry 测试断言 V1 collab tools 不含 `list_agents`，而 V2 tool set 包含 `list_agents`。[E: codex-rs/tools/src/tool_registry_plan_tests.rs:178][E: codex-rs/tools/src/tool_registry_plan_tests.rs:213][E: codex-rs/tools/src/tool_registry_plan_tests.rs:221]

`path_prefix` 支持相对路径过滤：测试从 `/root/researcher` 视角传入 `worker`，结果只返回 `/root/researcher/worker`。[E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1214][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1215][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1259][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1273][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1282][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1283]

closed agents 不应作为 live agents 列出[I]；`agent_control.list_agents` 使用 `live_agents()`，V2 测试先关闭 `worker`，随后断言输出只剩 `/root`。[E: codex-rs/core/src/agent/control.rs:844][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1326][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1343][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:1344]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/list_agents.rs
- codex-rs/core/src/agent/control.rs
- codex-rs/tools/src/tool_registry_plan_tests.rs
- codex-rs/core/src/tools/handlers/multi_agents_tests.rs

## 相关

- [spawn_agent (V2) 工具](spawn-agent-v2.md)
- [wait_agent (V2) 工具](wait-agent-v2.md)
- [close_agent (V2) 工具](close-agent-v2.md)
