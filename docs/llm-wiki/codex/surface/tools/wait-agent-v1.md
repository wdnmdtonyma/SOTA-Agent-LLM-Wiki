---
id: tool.wait-agent-v1
title: wait_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents/wait.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs, codex-rs/core/src/tools/handlers/multi_agents_tests.rs, codex-rs/tools/src/agent_tool_tests.rs]
symbols: [create_wait_agent_tool_v1, ToolHandlerKind::WaitAgentV1, multi_agents::wait::Handler]
related: [tool.spawn-agent-v1, tool.send-input-v1, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `wait_agent` V1 是 legacy collab tool 中等待指定 agent id 到达 final status 的 function tool；它返回按 target 标识索引的 status map。

## 能回答的问题

- `wait_agent` V1 为什么要求 `targets`？
- `wait_agent` V1 的 timeout 如何 clamp？
- `wait_agent` V1 返回哪些 agent status 形态？
- `wait_agent` V1 和 V2 的差异是什么？
- `wait_agent` V1 在什么门控下注册？

## 1 Identity

- Wire name: `wait_agent`。[E: codex-rs/tools/src/agent_tool.rs:207]
- Handler kind: `ToolHandlerKind::WaitAgentV1`；core registry 映射为 `WaitAgentHandler`。[E: codex-rs/tools/src/tool_registry_plan.rs:475][E: codex-rs/core/src/tools/spec.rs:288]
- 所属套件: V1 legacy collab branch；V2 使用同名 `wait_agent` 但绑定 `WaitAgentV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:464][E: codex-rs/tools/src/tool_registry_plan.rs:418][E: codex-rs/tools/src/tool_registry_plan.rs:435]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:206]

## 2 用途定位

`wait_agent` V1 用于等待指定 agent ids 中任一 agent 到达 final status；工具描述说明 completed statuses 可能包含 final message，timeout 时返回空 status，`targets` schema 描述说明可传多个 id 且任一完成即可返回。[E: codex-rs/tools/src/agent_tool.rs:208][E: codex-rs/tools/src/agent_tool.rs:724][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:128][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:134][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:136]

handler 订阅每个 target 的 status watch，等待 final status；这与 V2 的 mailbox-seq wait 不同。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:88][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:128][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:134][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:136][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:40][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:124][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:126]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `targets` | array<string> | 是 | 无 | 要等待的 agent ids；schema 描述允许多个 id，并在任一完成时返回；handler 用 `parse_agent_id_targets` 校验非空并逐个解析为 `ThreadId`。[E: codex-rs/tools/src/agent_tool.rs:720][E: codex-rs/tools/src/agent_tool.rs:724][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:38][E: codex-rs/core/src/tools/handlers/multi_agents.rs:48][E: codex-rs/core/src/tools/handlers/multi_agents.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents.rs:39] |
| `timeout_ms` | number | 否 | `30000` | timeout 毫秒数；schema 文案包含默认 30000、最小 10000、最大 3600000；handler 对非正数报错，对正数 clamp 到 min/max。[E: codex-rs/tools/src/agent_tool.rs:730][E: codex-rs/tools/src/agent_tool.rs:732][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:29][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:30][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:31][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:62][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:69] |

parameters required 只有 `targets`，additionalProperties 为 false。[E: codex-rs/tools/src/agent_tool.rs:738][E: codex-rs/tools/src/agent_tool.rs:740][E: codex-rs/tools/src/agent_tool.rs:741]

## 4 输出 schema & 截断

输出 schema 是 object，包含 `status` object 和 `timed_out` boolean。[E: codex-rs/tools/src/agent_tool.rs:425][E: codex-rs/tools/src/agent_tool.rs:428][E: codex-rs/tools/src/agent_tool.rs:433]

schema description 把 `status` 描述成按 agent id keyed 的 final statuses map；runtime 实际使用 target label，当 metadata 有 agent path 时用 agent path，否则回退 thread id。[E: codex-rs/tools/src/agent_tool.rs:429][E: codex-rs/tools/src/agent_tool.rs:430][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:47][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:52][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:53][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:161][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:164]

`agent_status_output_schema()` 支持 string 状态、`{completed: string|null}`、`{errored: string}` 三类形态。[E: codex-rs/tools/src/agent_tool.rs:288][E: codex-rs/tools/src/agent_tool.rs:289][E: codex-rs/tools/src/agent_tool.rs:294][E: codex-rs/tools/src/agent_tool.rs:295][E: codex-rs/tools/src/agent_tool.rs:304][E: codex-rs/tools/src/agent_tool.rs:305]

handler 构造 `WaitAgentResult { status, timed_out }`，`to_response_item` 调用 `tool_output_response_item(..., None, "wait_agent")`；该工具没有在 schema 或 handler 中暴露输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:157][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:167][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:210]

## 5 ToolSpec 类型

`wait_agent` V1 是 function tool，`strict: false`、`defer_loading: None`，parameters 来自 `wait_agent_tool_parameters_v1`。[E: codex-rs/tools/src/agent_tool.rs:206][E: codex-rs/tools/src/agent_tool.rs:210][E: codex-rs/tools/src/agent_tool.rs:211][E: codex-rs/tools/src/agent_tool.rs:212]

handler 返回 `ToolKind::Function`，只匹配 function payload，并解析 JSON arguments。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:21][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:25][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:37]

## 6 注册与门控

`wait_agent` V1 注册在 `config.collab_tools` true 且 `config.multi_agent_v2` false 的 legacy branch。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:464]

注册 plan 中 `create_wait_agent_tool_v1(params.wait_agent_timeouts)` 的 `supports_parallel_tool_calls` 为 false，并把 `wait_agent` 绑定到 `ToolHandlerKind::WaitAgentV1`。[E: codex-rs/tools/src/tool_registry_plan.rs:464][E: codex-rs/tools/src/tool_registry_plan.rs:465][E: codex-rs/tools/src/tool_registry_plan.rs:475]

## 7 parallel-safe

`wait_agent` V1 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:465]

handler 发送 waiting begin/end events，并对多个 target 的 status watch 建立等待关系。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:75][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:173][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:128]

## 8 handler 走读

1. Core registry 把 `ToolHandlerKind::WaitAgentV1` 注册为 `WaitAgentHandler`。[E: codex-rs/core/src/tools/spec.rs:288]
2. Handler 解析 arguments 为 `WaitArgs`，并把 targets 转成 `ThreadId` 列表。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:37][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:38]
3. Handler 读取每个 receiver metadata，并建立 target label map，用 agent path 或 thread id 作为输出 key。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:45][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:47][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:53]
4. Handler 对 timeout 做非正数拒绝和 min/max clamp。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:62][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:69]
5. Handler 订阅每个 target status；初始状态已 final 或 target not found 会直接进入结果列表。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:88][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:97]
6. 若没有初始 final status，handler 用 `FuturesUnordered` 等待任一 status watch 变为 final 或 deadline 到达。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:125][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:128][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:133]
7. 没有任何 final status 时 `timed_out=true`；否则按 target label 返回 status map。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:154][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:157]

## 9 设计动机、edge、历史

V1 `wait_agent` 是 final-status wait[I]；测试覆盖 missing agents 返回 `not_found` 且 `timed_out=false`，非 final status 超时返回空 status 且 `timed_out=true`。[E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2624][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2626][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2629][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2661][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2662][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2663]

V2 `wait_agent` 不含 `targets`，输出也不含 status map；schema 测试断言 V2 没有 `targets` 字段，V2 output schema 只有 `message` 与 `timed_out`。[E: codex-rs/tools/src/agent_tool_tests.rs:235][E: codex-rs/tools/src/agent_tool.rs:446][E: codex-rs/tools/src/agent_tool.rs:450]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents/wait.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs
- codex-rs/core/src/tools/handlers/multi_agents_tests.rs
- codex-rs/tools/src/agent_tool_tests.rs

## 相关

- [spawn_agent (V1) 工具](spawn-agent-v1.md)
- [send_input (V1) 工具](send-input-v1.md)
- [wait_agent (V2) 工具](wait-agent-v2.md)
