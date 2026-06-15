---
id: tool.spawn-agent-v1
title: spawn_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/agent/role.rs, codex-rs/core/src/tools/handlers/multi_agents_tests.rs, codex-rs/tools/src/agent_tool_tests.rs]
symbols: [create_spawn_agent_tool_v1, ToolHandlerKind::SpawnAgentV1, multi_agents::spawn::Handler]
related: [tool.spawn-agent-v2, tool.send-input-v1, tool.wait-agent-v1, tool.resume-agent-v1]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `spawn_agent` V1 是 legacy collab tool 中创建子 agent 的 function tool；它返回 `agent_id`，并用 `fork_context` 表示是否 fork 父线程完整历史。

## 能回答的问题

- `spawn_agent` V1 的输入字段有哪些？
- `spawn_agent` V1 为什么返回 `agent_id` 而不是 task path？
- `fork_context` 在 V1 中如何影响 role/model/reasoning overrides？
- `spawn_agent` V1 在什么门控下注册？
- `spawn_agent` V1 和 V2 的主要差异是什么？

## 1 Identity

- Wire name: `spawn_agent`；V1 与 V2 同名，但 V1 注册到 `ToolHandlerKind::SpawnAgentV1`。[E: codex-rs/tools/src/agent_tool.rs:39][E: codex-rs/tools/src/tool_registry_plan.rs:473]
- Handler kind: `ToolHandlerKind::SpawnAgentV1`；core registry 映射到 `SpawnAgentHandler`。[E: codex-rs/tools/src/tool_registry_plan_types.rs:35][E: codex-rs/core/src/tools/spec.rs:258]
- 所属套件: legacy collab tools，即 `config.collab_tools` true 且 `config.multi_agent_v2` false 的分支。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:438]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:38]

## 2 用途定位

`spawn_agent` V1 用于在 legacy branch 创建一个 sub-agent，并返回 thread identifier 格式的 `agent_id` 和可选 nickname；schema 输出描述把 `agent_id` 明确称为 spawned agent 的 thread identifier。[E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:442][E: codex-rs/tools/src/agent_tool.rs:596][E: codex-rs/tools/src/agent_tool.rs:319][E: codex-rs/tools/src/agent_tool.rs:321][E: codex-rs/tools/src/agent_tool.rs:323][E: codex-rs/tools/src/agent_tool.rs:324]

V1 没有 `task_name` 字段，handler 调用 `thread_spawn_source(..., /*task_name*/ None)`；V1 `send_input`、`resume_agent`、`wait_agent`、`close_agent` 的 target/id schema 都描述为 agent id。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:96][E: codex-rs/tools/src/agent_tool.rs:92][E: codex-rs/tools/src/agent_tool.rs:190][E: codex-rs/tools/src/agent_tool.rs:724][E: codex-rs/tools/src/agent_tool.rs:253]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `message` | string | 否 | 与 `items` 二选一 | 初始纯文本任务；schema 描述要求 “Use either message or items”，handler 通过 `parse_collab_input` 校验二选一且非空。[E: codex-rs/tools/src/agent_tool.rs:512][E: codex-rs/tools/src/agent_tool.rs:514][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:38][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:167][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:170][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:174][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:176] |
| `items` | array<object> | 否 | 与 `message` 二选一 | 结构化输入项数组，支持 text、image、local_image、skill、mention；`parse_collab_input` 会拒绝空数组。[E: codex-rs/tools/src/agent_tool.rs:518][E: codex-rs/tools/src/agent_tool.rs:474][E: codex-rs/tools/src/agent_tool.rs:479][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:186] |
| `agent_type` | string | 否 | default role | role 描述来自 `agent_type_description`；省略时 `apply_role_to_config` 使用 default role，非 `fork_context` 分支调用 `apply_role_to_config`。[E: codex-rs/tools/src/agent_tool.rs:521][E: codex-rs/core/src/agent/role.rs:28][E: codex-rs/core/src/agent/role.rs:44][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:33][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:37][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:78] |
| `fork_context` | boolean | 否 | `false` | serde default 为 false；true 时 fork 当前线程完整历史，handler 在该分支拒绝 `agent_type`、`model`、`reasoning_effort` overrides，并设置 `SpawnAgentForkMode::FullHistory`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:185][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:186][E: codex-rs/tools/src/agent_tool.rs:524][E: codex-rs/tools/src/agent_tool.rs:526][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:100][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:244][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:246] |
| `model` | string | 否 | 继承父 agent 当前模型 | schema 说明默认继承父模型；非 `fork_context` 分支才调用 `apply_requested_spawn_agent_model_overrides`。[E: codex-rs/tools/src/agent_tool.rs:531][E: codex-rs/tools/src/agent_tool.rs:9][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:70] |
| `reasoning_effort` | string | 否 | 继承父 agent 当前 reasoning effort | schema 说明替换继承的 reasoning effort；公共 config helper 会从当前 turn 复制 reasoning 状态，非 `fork_context` 分支才允许应用 override。[E: codex-rs/tools/src/agent_tool.rs:539][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:226][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:230][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:75] |

V1 schema 的 top-level required 是 `None`，因为 “message 或 items 二选一” 是 handler 级校验，不是 JSON Schema required 表达。[E: codex-rs/tools/src/agent_tool.rs:48][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:167][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:170]

## 4 输出 schema & 截断

输出 schema 是 object，包含 `agent_id: string` 和 `nickname: string|null`，required 为 `["agent_id", "nickname"]`。[E: codex-rs/tools/src/agent_tool.rs:317][E: codex-rs/tools/src/agent_tool.rs:320][E: codex-rs/tools/src/agent_tool.rs:324][E: codex-rs/tools/src/agent_tool.rs:328]

handler 返回 `SpawnAgentResult { agent_id, nickname }`，`to_response_item` 调用 `tool_output_response_item(..., Some(true), "spawn_agent")`；该工具没有在 schema 或 handler 中暴露输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:172][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:173][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:191][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:192][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:205]

## 5 ToolSpec 类型

`create_spawn_agent_tool_v1` 返回 function tool，`strict: false`、`defer_loading: None`，并使用 `spawn_agent_common_properties_v1` 生成 schema。[E: codex-rs/tools/src/agent_tool.rs:38][E: codex-rs/tools/src/agent_tool.rs:46][E: codex-rs/tools/src/agent_tool.rs:47][E: codex-rs/tools/src/agent_tool.rs:33]

handler 返回 `ToolKind::Function`，并只接受 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:16][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:20]

## 6 注册与门控

`spawn_agent` V1 注册在 `config.collab_tools` true 且 `config.multi_agent_v2` false 的 `else` 分支。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:442]

`ToolsConfig::new` 使用 `Feature::Collab` 计算 `collab_tools`，使用 `Feature::MultiAgentV2` 计算 `multi_agent_v2`。[E: codex-rs/tools/src/tool_config.rs:146][E: codex-rs/tools/src/tool_config.rs:147]

注册时 `supports_parallel_tool_calls` 为 false，并把 `spawn_agent` 绑定到 `ToolHandlerKind::SpawnAgentV1`。[E: codex-rs/tools/src/tool_registry_plan.rs:442][E: codex-rs/tools/src/tool_registry_plan.rs:449][E: codex-rs/tools/src/tool_registry_plan.rs:473]

## 7 parallel-safe

`spawn_agent` V1 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:449]

handler 创建子线程、可 fork 父历史、发送 spawn begin/end events，并记录 telemetry；这些动作会改变协作树状态[I]。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:88][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:100][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:149][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:165]

## 8 handler 走读

1. Core registry 把 `ToolHandlerKind::SpawnAgentV1` 注册为 `SpawnAgentHandler`。[E: codex-rs/core/src/tools/spec.rs:258]
2. Handler 解析 `SpawnAgentArgs`，trim `agent_type`，并用 `parse_collab_input` 构造初始 `Op`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:36][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:38]
3. Handler 检查 child depth 是否超过 `agent_max_depth`。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:41][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:43]
4. Handler 发送 `CollabAgentSpawnBeginEvent`，然后构建子 agent config。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:61]
5. `fork_context=true` 时，handler 调用 `reject_full_fork_spawn_overrides`；否则应用模型/reasoning override 和 role config。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:70][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:78]
6. Handler 再应用 runtime overrides 和 spawn overrides，调用 `spawn_agent_with_metadata`，并在 V1 session source 中不设置 task name。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:83][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:88][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:96]
7. Handler 发送 spawn end event，返回 `agent_id` 和 nickname。[E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:149][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:172][E: codex-rs/core/src/tools/handlers/multi_agents/spawn.rs:173]

## 9 设计动机、edge、历史

V1 是 legacy id-based 协作工具[I]；测试覆盖 V1 `spawn_agent` 输出有 `agent_id`、没有 `task_name`。[E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:635][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:636]

V1 使用 `fork_context`，V2 使用 `fork_turns`；schema 测试断言 V1 有 `fork_context` 且没有 `fork_turns`，V2 有 `fork_turns` 且没有 `fork_context`。[E: codex-rs/tools/src/agent_tool_tests.rs:118][E: codex-rs/tools/src/agent_tool_tests.rs:119][E: codex-rs/tools/src/agent_tool_tests.rs:73][E: codex-rs/tools/src/agent_tool_tests.rs:75][E: codex-rs/tools/src/agent_tool.rs:557]

V1 与 V2 在 registry plan 中互斥[I]：V2 分支注册 task-name 工具组，legacy 分支注册 `spawn_agent`、`send_input`、`resume_agent`、`wait_agent`、`close_agent`。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:397][E: codex-rs/tools/src/tool_registry_plan.rs:408][E: codex-rs/tools/src/tool_registry_plan.rs:413][E: codex-rs/tools/src/tool_registry_plan.rs:418][E: codex-rs/tools/src/tool_registry_plan.rs:423][E: codex-rs/tools/src/tool_registry_plan.rs:428][E: codex-rs/tools/src/tool_registry_plan.rs:432][E: codex-rs/tools/src/tool_registry_plan.rs:437][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:442][E: codex-rs/tools/src/tool_registry_plan.rs:453][E: codex-rs/tools/src/tool_registry_plan.rs:458][E: codex-rs/tools/src/tool_registry_plan.rs:464][E: codex-rs/tools/src/tool_registry_plan.rs:469][E: codex-rs/tools/src/tool_registry_plan.rs:473][E: codex-rs/tools/src/tool_registry_plan.rs:476]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/tools/src/tool_config.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/role.rs
- codex-rs/core/src/tools/handlers/multi_agents_tests.rs
- codex-rs/tools/src/agent_tool_tests.rs

## 相关

- [spawn_agent (V2) 工具](spawn-agent-v2.md)
- [send_input (V1) 工具](send-input-v1.md)
- [wait_agent (V1) 工具](wait-agent-v1.md)
- [resume_agent (V1) 工具](resume-agent-v1.md)
