---
id: tool.spawn-agent-v2
title: spawn_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/protocol/src/agent_path.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_spawn_agent_tool_v2, SpawnAgentHandlerV2, multi_agents_v2::spawn::Handler, SpawnAgentArgs]
related: [spine.trace-subagent, subsys.core.tool-system, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: db887d03e1
---

> `spawn_agent` V2 是 MultiAgentV2 协作工具集中创建子 agent 的 function tool；它用 `task_name` 生成 canonical task path，并在 `collab_tools_enabled && multi_agent_v2_enabled` 的注册分支出现。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `spawn_agent`，由 V2 handler 的 `tool_name()` 返回。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:27] |
| spec builder | `create_spawn_agent_tool_v2` 返回 `ToolSpec::Function(ResponsesApiTool)`，工具名同样是 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:80][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:97][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:98] |
| handler | `multi_agents_v2.rs` re-export `spawn::Handler as SpawnAgentHandler`，`spec_plan.rs` 用别名 `SpawnAgentHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:32][E: codex-rs/core/src/tools/spec_plan.rs:777] |
| payload kind | handler 只匹配 `ToolPayload::Function`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:179][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:181] |

## 注册与门控

`add_collaboration_tools` 先检查 `collab_tools_enabled(turn_context)`，再在 `multi_agent_v2_enabled(turn_context)` 分支注册 V2 工具；`spawn_agent`、`send_message`、`followup_task`、`wait_agent`、`interrupt_agent`、`list_agents` 同批加入。[E: codex-rs/core/src/tools/spec_plan.rs:794][E: codex-rs/core/src/tools/spec_plan.rs:795][E: codex-rs/core/src/tools/spec_plan.rs:806][E: codex-rs/core/src/tools/spec_plan.rs:821][E: codex-rs/core/src/tools/spec_plan.rs:825][E: codex-rs/core/src/tools/spec_plan.rs:829][E: codex-rs/core/src/tools/spec_plan.rs:836][E: codex-rs/core/src/tools/spec_plan.rs:840]

V2 协作工具的 exposure 取决于 `multi_agent_v2.non_code_mode_only`：true 时是 `DirectModelOnly`，否则是 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:796][E: codex-rs/core/src/tools/spec_plan.rs:797][E: codex-rs/core/src/tools/spec_plan.rs:799]

如果 namespace tools 开启并配置了 `multi_agent_v2.tool_namespace`，`multi_agent_v2_handler` 会把 function spec 包进 namespace spec，并把工具名改成 namespaced name；否则直接使用原 handler。[E: codex-rs/core/src/tools/spec_plan.rs:801][E: codex-rs/core/src/tools/spec_plan.rs:802][E: codex-rs/core/src/tools/spec_plan.rs:1047][E: codex-rs/core/src/tools/spec_plan.rs:1051][E: codex-rs/core/src/tools/spec_plan.rs:1067][E: codex-rs/core/src/tools/spec_plan.rs:1071]

## 输入与 schema

| 字段 | 必填 | 运行时语义 |
|---|---:|---|
| `task_name` | 是 | schema 描述要求小写字母、数字和 `_`；handler 把它传给 `thread_spawn_source(..., Some(args.task_name.clone()))`，公共 helper 再调用 `AgentPath::join` 做名称校验。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:89][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:96][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:101][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:137][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:150][E: codex-rs/protocol/src/agent_path.rs:54][E: codex-rs/protocol/src/agent_path.rs:55] |
| `message` | 是 | schema 加密字符串；handler 只把 `message` 传给 `parse_collab_input(Some(args.message), None)`，V2 spawn 不接受 V1 的 `items` 字段。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:600][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:605][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:59][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:60] |
| `agent_type` | 否 | 空白会被 trim 后忽略；非 full-history fork 分支才应用 role config。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:53][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:82] |
| `fork_turns` | 否 | 默认 `all`；`none` 表示不 fork，`all` 表示 `FullHistory`，正整数字符串表示 `LastNTurns(n)`；`fork_context` 字段会被显式拒绝。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:609][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:611][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:200][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:202][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:216][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:217][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:220][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:231] |
| `model` / `reasoning_effort` / `service_tier` | 否 | full-history fork 会拒绝 `agent_type`、`model`、`reasoning_effort` 覆盖；非 full-history fork 才应用 model/reasoning/role 覆盖，`service_tier` 另行写入 config 并经 helper 处理。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:65][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:69][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:75][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:87] |

`create_spawn_agent_tool_v2` 的 required 字段只有 `task_name` 和 `message`，additional properties 为 false；`SpawnAgentArgs` 也用 `#[serde(deny_unknown_fields)]` 收紧运行时解析。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:107][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:109][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:110][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:192]

## Handler 流程

handler 解析 function arguments、计算 fork mode、从父 turn 构建子 agent config，再用 `thread_spawn_source` 生成带 canonical path 的 `SessionSource::SubAgent`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:50][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:52][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:96]

当初始 operation 是纯文本 `UserInput` 时，handler 会把它改写成 `Op::InterAgentCommunication`，用父 agent path 做 author、新 agent path 做 recipient，并把 `source_call_id` 写入 metadata。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:111][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:117][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:120][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:121][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:127]

真正创建由 `agent_control.spawn_agent_with_metadata` 完成；成功后发送 `SubAgentActivityKind::Started` 事件并记录 `codex.multi_agent.spawn` telemetry，其中 version tag 是 `v2`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:108][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:109][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:152][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:160][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:166][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:169]

## 输出与 parallel

默认输出 schema 是 `{ task_name, nickname }`；如果 `hide_spawn_agent_metadata` 为 true，schema 和 handler 输出都只保留 `task_name`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:379][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:381][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:391][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:394][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:398][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:168][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:170][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:172][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:173]

`spawn_agent` handler 没有覆写 `supports_parallel_tool_calls`；按 `ToolExecutor` 默认实现，它不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/protocol/src/agent_path.rs
- codex-rs/tools/src/tool_executor.rs
