---
id: tool.spawn-agent-v2
title: spawn_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/protocol/src/agent_path.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_spawn_agent_tool_v2, SpawnAgentHandlerV2, multi_agents_v2::spawn::Handler, multi_agents_v2::SpawnAgentArgs]
related: [spine.trace-subagent, subsys.core.tool-system, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `spawn_agent` V2 是 MultiAgentV2 协作工具集中创建子 agent 的 function tool；它用 `task_name` 生成 canonical task path，并在 `collab_tools_enabled && multi_agent_v2_enabled` 的注册分支出现。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `spawn_agent`，由 V2 handler 的 `tool_name()` 返回。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:27] |
| spec builder | `create_spawn_agent_tool_v2` 返回 `ToolSpec::Function(ResponsesApiTool)`，工具名同样是 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:80][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:130][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:131] |
| handler | `multi_agents_v2.rs` re-export `spawn::Handler as SpawnAgentHandler`，`spec_plan.rs` 用别名 `SpawnAgentHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:33][E: codex-rs/core/src/tools/spec_plan.rs:810] |
| payload kind | handler 只匹配 `ToolPayload::Function`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:167][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:169] |

## 注册与门控

`add_collaboration_tools` 先检查 `collab_tools_enabled(turn_context)`，再在 `multi_agent_v2_enabled(turn_context)` 分支注册 V2 工具；`spawn_agent`、`send_message`、`followup_task`、`wait_agent`、`interrupt_agent`、`list_agents` 同批加入。[E: codex-rs/core/src/tools/spec_plan.rs:827][E: codex-rs/core/src/tools/spec_plan.rs:828][E: codex-rs/core/src/tools/spec_plan.rs:841][E: codex-rs/core/src/tools/spec_plan.rs:859][E: codex-rs/core/src/tools/spec_plan.rs:863][E: codex-rs/core/src/tools/spec_plan.rs:841][E: codex-rs/core/src/tools/spec_plan.rs:876][E: codex-rs/core/src/tools/spec_plan.rs:880]

V2 协作工具的 exposure 取决于 `multi_agent_v2.non_code_mode_only`：true 时是 `DirectModelOnly`，否则是 `Direct`。[E: codex-rs/core/src/tools/spec_plan.rs:829][E: codex-rs/core/src/tools/spec_plan.rs:830][E: codex-rs/core/src/tools/spec_plan.rs:832]

如果 namespace tools 开启并配置了 `multi_agent_v2.tool_namespace`，`multi_agent_v2_handler` 会把 function spec 包进 namespace spec，并把工具名改成 namespaced name；否则直接使用原 handler。[E: codex-rs/core/src/tools/spec_plan.rs:834][E: codex-rs/core/src/tools/spec_plan.rs:835][E: codex-rs/core/src/tools/spec_plan.rs:1056][E: codex-rs/core/src/tools/spec_plan.rs:1060][E: codex-rs/core/src/tools/spec_plan.rs:1076][E: codex-rs/core/src/tools/spec_plan.rs:1080]

## 输入与 schema

| 字段 | 必填 | 运行时语义 |
|---|---:|---|
| `task_name` | 是 | schema 描述要求小写字母、数字和 `_`；handler 把它传给 `thread_spawn_source(..., Some(args.task_name.clone()))`，公共 helper 再调用 `AgentPath::join` 做名称校验。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:122][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:124][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:96][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:110][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:123][E: codex-rs/protocol/src/agent_path.rs:54][E: codex-rs/protocol/src/agent_path.rs:55] |
| `message` | 是 | schema 加密字符串；handler 用 `message_content` 解密/提取内容，V2 spawn 不接受 V1 的 `items` 字段。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:634][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:638][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:58] |
| `agent_type` | 否 | 空白会被 trim 后忽略；非 full-history fork 分支才应用 role config。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:53][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:82] |
| `fork_turns` | 否 | 默认 `all`；`none` 表示不 fork，`all` 表示 `FullHistory`，正整数字符串表示 `LastNTurns(n)`；`fork_context` 字段会被显式拒绝。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:647][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:649][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:188][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:190][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:204][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:205][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:208][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:219] |
| `model` / `reasoning_effort` / `service_tier` | 否 | model/reasoning override 在 full-history 与非 full-history 路径都经 helper 验证并应用；full-history 只禁止 `agent_type`。`service_tier` 另经 helper 处理。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:67][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:70][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:81] |

`create_spawn_agent_tool_v2` 的 required 字段只有 `task_name` 和 `message`，additional properties 为 false；`SpawnAgentArgs` 也用 `#[serde(deny_unknown_fields)]` 收紧运行时解析。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:140][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:142][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:143][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:180]

schema 暴露是可配的：没有 agent roles 时移除 `agent_type`；`expose_spawn_agent_model_overrides` 为 false 时移除 `model` / `reasoning_effort`；`hide_spawn_agent_metadata` 还会移除 `service_tier` 并简化输出。[E: codex-rs/core/src/tools/spec_plan.rs:839][E: codex-rs/core/src/tools/spec_plan.rs:846][E: codex-rs/core/src/tools/spec_plan.rs:847][E: codex-rs/core/src/tools/spec_plan.rs:848][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:109][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:110][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:113][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:116]

## Handler 流程

handler 解析 function arguments、计算 fork mode、从父 turn 构建子 agent config，再用 `thread_spawn_source` 生成带 canonical path 的 `SessionSource::SubAgent`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:50][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:52][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:62][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:91]

它用父 agent path 作 author、新 canonical path 作 recipient，直接构造 `InterAgentCommunication`，并附上 `AgentCommunicationKind::Spawn` 的日志上下文。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:102][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:106][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:107]

真正创建与首次投递由 `agent_control.spawn_agent_with_communication` 完成；`SpawnAgentOptions` 带 fork call id/mode、parent thread 和 environments。成功后发送 `SubAgentActivityKind::Started` turn item 并记录 `codex.multi_agent.spawn` telemetry，其中 version tag 是 `v2`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:108][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:112][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:117][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:137][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:144][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:149][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:152]

## 输出与 parallel

默认输出 schema 是 `{ task_name, nickname }`；如果 `hide_spawn_agent_metadata` 为 true，schema 和 handler 输出都只保留 `task_name`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:412][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:414][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:424][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:427][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:431][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:156][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:158][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:160][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:161]

`spawn_agent` handler 没有覆写 `supports_parallel_tool_calls`；按 `ToolExecutor` 默认实现，它不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/protocol/src/agent_path.rs
- codex-rs/tools/src/tool_executor.rs
