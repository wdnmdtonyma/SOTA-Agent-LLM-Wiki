---
id: tool.spawn-agent-v2
title: spawn_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/protocol/src/agent_path.rs]
symbols: [create_spawn_agent_tool_v2, ToolHandlerKind::SpawnAgentV2, multi_agents_v2::spawn::Handler]
related: [spine.trace-subagent, subsys.core.tool-system, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `spawn_agent` V2 是 MultiAgentV2 协作工具集中创建子 agent 的 function tool；它用 `task_name` 生成 canonical task path，而不是把模型主要暴露给 legacy `agent_id`。

## 能回答的问题

- `spawn_agent` V2 的 wire name、`ToolHandlerKind` 和 handler 是什么？
- `spawn_agent` V2 为什么必填 `task_name` 和 `message`？
- `spawn_agent` V2 的 `fork_turns`、`model`、`reasoning_effort` 怎样影响子 agent？
- `spawn_agent` V2 在什么 feature/config 门控下注册？
- `spawn_agent` V2 和 V1 的主要差异是什么？
- `spawn_agent` V2 的输出什么时候只有 `task_name`，什么时候还有 `nickname`？

## 1 Identity

- Wire name: `spawn_agent`；V2 与 V1 复用同一个模型可见工具名，但 registry 分别绑定到 `ToolHandlerKind::SpawnAgentV2` 和 `ToolHandlerKind::SpawnAgentV1`。[E: codex-rs/tools/src/agent_tool.rs:69][E: codex-rs/tools/src/agent_tool.rs:39][E: codex-rs/tools/src/tool_registry_plan.rs:432][E: codex-rs/tools/src/tool_registry_plan.rs:473]
- Handler kind: `ToolHandlerKind::SpawnAgentV2`，core registry 把该 kind 映射为 `SpawnAgentHandlerV2`。[E: codex-rs/tools/src/tool_registry_plan_types.rs:36][E: codex-rs/core/src/tools/spec.rs:261]
- 所属 crate: schema 创建函数由 `codex-rs/tools` 导出，运行时 handler 在 `codex-rs/core` 的 `multi_agents_v2::spawn` 模块中。[E: codex-rs/tools/src/lib.rs:40][E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:34]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`；`ToolSpec` 序列化时用 `type: "function"` 表示 Responses API function tool。[E: codex-rs/tools/src/agent_tool.rs:68][E: codex-rs/tools/src/tool_spec.rs:24]

## 2 用途定位

`spawn_agent` V2 用于为一个具名 task path 创建非 root 子 agent。工具描述直接说明：当当前任务是 `/root/task1` 且 `task_name` 是 `task_3` 时，新 agent 的 canonical task name 是 `/root/task1/task_3`，并且可用相对名 `task_3` 或绝对名 `/root/task1/task_3` 引用。[E: codex-rs/tools/src/agent_tool.rs:664][E: codex-rs/tools/src/agent_tool.rs:665]

V2 子 agent 会获得与父 agent 相同的工具能力，并默认继承父 agent 当前模型；只有显式需要覆盖时才设置 `model`。[E: codex-rs/tools/src/agent_tool.rs:666][E: codex-rs/tools/src/agent_tool.rs:9]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `task_name` | string | 是 | 无 | V2 专属 task name；schema 描述要求 lowercase letters、digits、underscores，handler 通过 `thread_spawn_source(..., Some(args.task_name.clone()))` 把字段交给 path builder，`thread_spawn_source` 调用 `AgentPath::join`，`join` 会校验 name 只能使用 ASCII 小写字母、数字和 `_`。[E: codex-rs/tools/src/agent_tool.rs:63][E: codex-rs/tools/src/agent_tool.rs:79][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:109][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:149][E: codex-rs/protocol/src/agent_path.rs:54][E: codex-rs/protocol/src/agent_path.rs:140] |
| `message` | string | 是 | 无 | 初始纯文本任务；schema 把 `message` 加入 required，handler 只把 `message` 传给 `parse_collab_input`，不接受 V1 的 `items`。[E: codex-rs/tools/src/agent_tool.rs:549][E: codex-rs/tools/src/agent_tool.rs:79][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:44] |
| `agent_type` | string | 否 | inherited/default role | role 描述来自 `agent_type_description`；handler 会 trim 空白，非空时在非 full-history fork 分支调用 `apply_role_to_config`。[E: codex-rs/tools/src/agent_tool.rs:553][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:41][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:42][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:85] |
| `fork_turns` | string | 否 | `all` | V2 替代 V1 `fork_context`。空值按 `all` 处理；`none` 表示不 fork；`all` 表示 `FullHistory`；正整数字符串表示 `LastNTurns(n)`；`0` 和无法解析的字符串会返回 model-facing error。[E: codex-rs/tools/src/agent_tool.rs:557][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:252][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:254][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:258][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:261][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:266][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:272] |
| `model` | string | 否 | 继承父 agent 当前模型 | schema 描述要求只有用户明确要求或任务确实需要时才覆盖；非 full-history fork 分支调用 `apply_requested_spawn_agent_model_overrides` 解析模型名。[E: codex-rs/tools/src/agent_tool.rs:10][E: codex-rs/tools/src/agent_tool.rs:564][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:77] |
| `reasoning_effort` | string | 否 | 继承父 agent 当前 reasoning effort | schema 描述为替换继承的 reasoning effort；非 full-history fork 分支调用同一个 override helper 校验并应用该字段。[E: codex-rs/tools/src/agent_tool.rs:572][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:329][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:334] |

V2 `SpawnAgentArgs` 使用 `#[serde(deny_unknown_fields)]`，因此 legacy `items` 这类结构体未声明字段会被 serde 拒绝；`fork_context` 是结构体中的兼容字段，但 `fork_mode()` 会把它转换成 “use fork_turns instead” 的 model-facing error。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:228][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:236][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:241]

## 4 输出 schema & 截断

默认输出 schema 是 object，包含 `task_name` 和 nullable `nickname`，且 `required` 为 `["task_name", "nickname"]`。[E: codex-rs/tools/src/agent_tool.rs:349][E: codex-rs/tools/src/agent_tool.rs:351][E: codex-rs/tools/src/agent_tool.rs:356][E: codex-rs/tools/src/agent_tool.rs:360]

如果 `hide_spawn_agent_metadata` 为 true，输出 schema 只包含 `task_name`；handler 也按 `turn.config.multi_agent_v2.hide_spawn_agent_metadata` 在 `HiddenMetadata` 和 `WithNickname` 两种枚举输出之间选择。[E: codex-rs/tools/src/agent_tool.rs:334][E: codex-rs/tools/src/agent_tool.rs:338][E: codex-rs/tools/src/agent_tool.rs:343][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:215][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:217][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:219]

运行时 `ToolOutput::to_response_item` 通过 `tool_output_response_item(..., self, Some(true), "spawn_agent")` 生成 function tool output；该工具没有在 schema 或 handler 中暴露单独的输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:297][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:298]

## 5 ToolSpec 类型

`create_spawn_agent_tool_v2` 返回 `ToolSpec::Function`，设置 `name: "spawn_agent"`、`strict: false`、`defer_loading: None`，并显式声明 required 字段为 `task_name` 与 `message`。[E: codex-rs/tools/src/agent_tool.rs:68][E: codex-rs/tools/src/agent_tool.rs:69][E: codex-rs/tools/src/agent_tool.rs:75][E: codex-rs/tools/src/agent_tool.rs:76][E: codex-rs/tools/src/agent_tool.rs:79]

从实现形态看，schema 侧是 fixed JSON object function tool，运行时 handler 也只匹配 `ToolPayload::Function`。[E: codex-rs/tools/src/agent_tool.rs:68][E: codex-rs/tools/src/agent_tool.rs:77][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:19][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:24]

## 6 注册与门控

`spawn_agent` V2 在 `config.collab_tools` 为 true 且 `config.multi_agent_v2` 为 true 的分支注册；V1 注册位于同一个 `collab_tools` 分支的 `else` 分支，所以两套 handler 在该 plan 中互斥[I]。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:438]

`ToolsConfig::new` 由 `Feature::Collab` 计算 `collab_tools`，由 `Feature::MultiAgentV2` 计算 `multi_agent_v2`。[E: codex-rs/tools/src/tool_config.rs:146][E: codex-rs/tools/src/tool_config.rs:147][E: codex-rs/tools/src/tool_config.rs:226][E: codex-rs/tools/src/tool_config.rs:227]

注册时传入 `available_models`、`agent_type_description`、`hide_agent_type_model_reasoning`、`include_usage_hint`、`usage_hint_text`，然后以 `supports_parallel_tool_calls=false` 加入 plan，并把 wire name `spawn_agent` 绑定到 `ToolHandlerKind::SpawnAgentV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:398][E: codex-rs/tools/src/tool_registry_plan.rs:399][E: codex-rs/tools/src/tool_registry_plan.rs:400][E: codex-rs/tools/src/tool_registry_plan.rs:401][E: codex-rs/tools/src/tool_registry_plan.rs:402][E: codex-rs/tools/src/tool_registry_plan.rs:404][E: codex-rs/tools/src/tool_registry_plan.rs:432]

## 7 parallel-safe

`spawn_agent` V2 在 registry plan 中显式使用 `/*supports_parallel_tool_calls*/ false`。[E: codex-rs/tools/src/tool_registry_plan.rs:404]

这个选择和 handler 行为相符[I]：handler 会发送 spawn begin/end event、创建 thread-spawn session source、调用 `spawn_agent_with_metadata`、记录 telemetry。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:58][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:114][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:188][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:204]

## 8 handler 走读

1. Core registry 把 `ToolHandlerKind::SpawnAgentV2` 注册成 `SpawnAgentHandlerV2`。[E: codex-rs/core/src/tools/spec.rs:261]
2. Handler 解析 function arguments 为 `SpawnAgentArgs`，并计算 `fork_mode`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:36][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:37]
3. Handler 将 required `message` 包装为初始 `Op`，并用 `render_input_preview` 得到事件展示用 prompt。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:44][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:45]
4. Handler 计算子 agent depth，超过 `agent_max_depth` 时拒绝 spawn。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:48][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:50]
5. Handler 从父 turn 构建子 agent config；公共 helper 会复制父 turn 的 model、provider、reasoning、developer instructions、shell environment、cwd、sandbox 等运行时状态。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:226][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:227][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:228][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:232][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:267][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:269][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:272]
6. Full-history fork 会拒绝 `agent_type`、`model`、`reasoning_effort` 覆盖；非 full-history fork 才应用模型/reasoning override 和 role config。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:70][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:244][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:246][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:77][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:85]
7. Handler 注入 `SpawnAgentInstructions` 到子 agent developer instructions，然后用 `thread_spawn_source(..., Some(task_name))` 创建带 agent path 的 session source。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:97][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:109]
8. 如果初始消息是纯文本且 spawn source 有 recipient path，handler 把初始 `UserInput` 改写为 `Op::InterAgentCommunication`，并设置 `trigger_turn: true`，这样子 agent 收到的是带 author/recipient 的 inter-agent message。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:116][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:122][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:130]
9. Handler 调用 `spawn_agent_with_metadata`，发送 spawn end event，最后返回 canonical task path。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:114][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:188][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:209]

## 9 设计动机、edge、历史

V2 的核心设计是 task-path-based routing[I]：`AgentPath::resolve` 支持 root path、绝对 path 和相对 reference，`resolve_agent_target` 会先尝试把 target 解析为 legacy `ThreadId`，失败后再用当前 session source 解析 task path。[E: codex-rs/protocol/src/agent_path.rs:63][E: codex-rs/protocol/src/agent_path.rs:66][E: codex-rs/protocol/src/agent_path.rs:70][E: codex-rs/core/src/agent/agent_resolver.rs:14][E: codex-rs/core/src/agent/agent_resolver.rs:21]

V2 `SpawnAgentArgs` 的字段列表没有 `items`，而 handler 为纯文本消息构造 `InterAgentCommunication` 并设置 author、recipient、content、`trigger_turn`；这让 V2 spawn 初始消息保持 text-only inter-agent 语义[I]。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:230][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:236][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:122][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:124][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:127][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:129][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:130]

V2 与 V1 并存但互斥[I]：同一个 `spawn_agent` 名在 V2 分支绑定 `SpawnAgentV2`，在 legacy `else` 分支绑定 `SpawnAgentV1`。[E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:432][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:473]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/tools/src/tool_config.rs
- codex-rs/tools/src/tool_spec.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/protocol/src/agent_path.rs
- codex-rs/core/src/agent/agent_resolver.rs

## 相关

- [trace:spawn 子 agent](../../spine/trace-subagent.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [Collaboration modes](../../subsystems/core/collaboration-modes.md)
