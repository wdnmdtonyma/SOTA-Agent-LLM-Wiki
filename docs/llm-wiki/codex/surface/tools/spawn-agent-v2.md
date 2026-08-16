---
id: tool.spawn-agent-v2
title: spawn_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/agent/control/spawn.rs, codex-rs/core/src/session/multi_agents.rs, codex-rs/core/src/context/multi_agent_role_instructions.rs, codex-rs/core/src/context/world_state/multi_agent_usage_hint.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/config/mod.rs, codex-rs/protocol/src/agent_path.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_spawn_agent_tool_v2, SpawnAgentHandlerV2, multi_agents_v2::spawn::Handler, multi_agents_v2::SpawnAgentArgs, SpawnAgentOptions, subagent_developer_instructions, resolve_usage_hints]
related: [spine.trace-subagent, subsys.core.tool-system, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `spawn_agent` V2 是 MultiAgentV2 协作工具集中创建子 agent 的 function tool；它用 `task_name` 生成 canonical task path，并在 `collab_tools_enabled && multi_agent_v2_enabled` 的注册分支出现。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `spawn_agent`，由 V2 handler 的 `tool_name()` 返回。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:29][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:29] |
| spec builder | `create_spawn_agent_tool_v2` 返回 `ToolSpec::Function(ResponsesApiTool)`，工具名同样是 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:102][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:128][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:129] |
| handler | `multi_agents_v2.rs` re-export `spawn::Handler as SpawnAgentHandler`，`spec_plan.rs` 用别名 `SpawnAgentHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:36][E: codex-rs/core/src/tools/spec_plan.rs:50][E: codex-rs/core/src/tools/spec_plan.rs:1150] |
| payload kind | handler 只匹配 `ToolPayload::Function`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:213][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:214] |

## 注册与门控

`add_collaboration_tools` 先检查 `collab_tools_enabled(turn_context)`，再在 `multi_agent_v2_enabled(turn_context)` 分支注册 V2 工具；`spawn_agent`、`send_message`、`followup_task`、`wait_agent`、`interrupt_agent`、`list_agents` 同批加入。[E: codex-rs/core/src/tools/spec_plan.rs:1134][E: codex-rs/core/src/tools/spec_plan.rs:1135][E: codex-rs/core/src/tools/spec_plan.rs:1148][E: codex-rs/core/src/tools/spec_plan.rs:1166][E: codex-rs/core/src/tools/spec_plan.rs:1170][E: codex-rs/core/src/tools/spec_plan.rs:1174][E: codex-rs/core/src/tools/spec_plan.rs:1183][E: codex-rs/core/src/tools/spec_plan.rs:1187]

V2 的 `collab_tools_enabled` 不是“有 agent path 就开”。子 agent（`session_source.get_agent_path()` 有值）只有在当前 `model_info.multi_agent_version == Some(MultiAgentVersion::V2)` 时才继续暴露协作工具；否则该 child 是 leaf worker，不会注册 `spawn_agent` 等 V2 工具。[E: codex-rs/core/src/tools/spec_plan.rs:607][E: codex-rs/core/src/tools/spec_plan.rs:608][E: codex-rs/core/src/tools/spec_plan.rs:609][E: codex-rs/core/tests/suite/subagent_notifications.rs:1716][E: codex-rs/core/tests/suite/subagent_notifications.rs:1718]

V2 协作工具的 exposure 取决于 `multi_agent_v2.non_code_mode_only`：true 时是 `DirectModelOnly`，否则是 `Direct`。默认 config 把 `non_code_mode_only` 设为 true。[E: codex-rs/core/src/tools/spec_plan.rs:1136][E: codex-rs/core/src/tools/spec_plan.rs:1137][E: codex-rs/core/src/tools/spec_plan.rs:1139][E: codex-rs/core/src/config/mod.rs:1245]

如果 namespace tools 开启并配置了 `multi_agent_v2.tool_namespace`，`multi_agent_v2_handler` 会把 function spec 包进 namespace spec，并把工具名改成 namespaced name；否则直接使用原 handler。默认 namespace 是 `collaboration`。[E: codex-rs/core/src/tools/spec_plan.rs:1141][E: codex-rs/core/src/tools/spec_plan.rs:1142][E: codex-rs/core/src/tools/spec_plan.rs:1301][E: codex-rs/core/src/tools/spec_plan.rs:1305][E: codex-rs/core/src/tools/spec_plan.rs:1325][E: codex-rs/core/src/tools/spec_plan.rs:1328][E: codex-rs/core/src/config/mod.rs:216][E: codex-rs/core/src/config/mod.rs:1241]

## 输入与 schema

| 字段 | 必填 | 运行时语义 |
|---|---:|---|
| `task_name` | 是 | schema 描述要求小写字母、数字和 `_`；handler 把它传给 `thread_spawn_source(..., Some(args.task_name.clone()))`，公共 helper 再调用 `AgentPath::join` 做名称校验。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:122][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:123][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:103][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:108][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:112][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:125][E: codex-rs/protocol/src/agent_path.rs:54][E: codex-rs/protocol/src/agent_path.rs:55] |
| `message` | 是 | V2 spawn 不接受 V1 的 `items`。namespace 为 `collaboration` 且 `encrypted_function_args` 为空的 direct model call 被 router 标为 plaintext source，shared helper 渲染可读 `NEW_TASK` envelope；非 plaintext 来源仍构造 encrypted communication。[E: codex-rs/core/src/tools/router.rs:41][E: codex-rs/core/src/tools/router.rs:51][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:119][E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:64][E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:76] |
| `agent_type` | 否 | 空白会被 trim 后忽略。非 full-history fork 总会调用 `apply_spawn_agent_role`；full-history fork 在显式提供 role 时也会应用 role，并在 child 还没有 developer instructions 时回填父 turn 的 developer instructions。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:57][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:61][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:83][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:84] |
| `fork_turns` | 否 | 默认 `all`；`none` 表示不 fork，`all` 表示 `FullHistory`，正整数字符串表示 `LastNTurns(n)`；`fork_context` 字段会被显式拒绝。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:233][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:235][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:244][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:246][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:249][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:264] |
| `model` / `reasoning_effort` / `service_tier` | 否 | model/reasoning override 在 full-history 与非 full-history 路径都经 helper 验证并应用；`service_tier` 另经 helper 处理。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:78][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:79][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:90] |

`create_spawn_agent_tool_v2` 的 required 字段只有 `task_name` 和 `message`，additional properties 为 false；`SpawnAgentArgs` 也用 `#[serde(deny_unknown_fields)]` 收紧运行时解析。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:139][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:140][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:219]

schema 暴露是可配的：没有 agent roles 时移除 `agent_type`；`expose_spawn_agent_model_overrides` 为 false 时移除 `model` / `reasoning_effort`；`hide_spawn_agent_metadata` 会映射成 `hide_agent_type_model_reasoning`，从而移除 `service_tier` 并简化输出。默认 config 是 `hide_spawn_agent_metadata = true`、`expose_spawn_agent_model_overrides = true`。[E: codex-rs/core/src/tools/spec_plan.rs:1146][E: codex-rs/core/src/tools/spec_plan.rs:1153][E: codex-rs/core/src/tools/spec_plan.rs:1154][E: codex-rs/core/src/tools/spec_plan.rs:1155][E: codex-rs/core/src/tools/spec_plan.rs:1158][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:110][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:114][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:116][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:118][E: codex-rs/core/src/config/mod.rs:1242][E: codex-rs/core/src/config/mod.rs:1243]

`expose_spawn_agent_model_overrides` 为 true 时，schema description 会列出 picker-visible 且支持当前 multi-agent backend 的模型 override（最多 `MAX_SPAWN_AGENT_MODEL_OVERRIDES`）。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:103][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:785][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:788][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:789]

## 角色指令与 usage hint

V2 的模型可见协作说明不再只写在 tool description 里。`usage_hint_text()` 只对 `MultiAgentVersion::V2` 生效，并从 model catalog 的 `model_messages.multi_agent.role` 解析 root/subagent 文本；config 的 `root_agent_usage_hint_text` / `subagent_usage_hint_text` 优先，空字符串会抑制 bundled fallback。[E: codex-rs/core/src/session/multi_agents.rs:71][E: codex-rs/core/src/session/multi_agents.rs:75][E: codex-rs/core/src/session/multi_agents.rs:79][E: codex-rs/core/src/session/multi_agents.rs:81][E: codex-rs/core/src/session/multi_agents.rs:100][E: codex-rs/core/src/session/multi_agents.rs:133][E: codex-rs/core/src/session/multi_agents.rs:138]

catalog 命中时，这段文字被标成 `MultiAgentRoleInstructions::catalog`，world-state section `multi_agent_usage_hint` 会用 `<multi_agent_role>` 标记渲染；config/bundled fallback 则走 unmarked / `MultiAgentUsageHint`。[E: codex-rs/core/src/session/multi_agents.rs:124][E: codex-rs/core/src/session/multi_agents.rs:127][E: codex-rs/core/src/context/multi_agent_role_instructions.rs:17][E: codex-rs/core/src/context/multi_agent_role_instructions.rs:43][E: codex-rs/core/src/session/world_state.rs:289][E: codex-rs/core/src/session/world_state.rs:292][E: codex-rs/core/src/context/world_state/multi_agent_usage_hint.rs:21][E: codex-rs/core/src/context/world_state/multi_agent_usage_hint.rs:40]

full-history fork 会把 child 的 catalog role 传给 `spawn_agent_with_communication`，并在 fork 历史里过滤父/子 usage hint、从 world-state 删除 `multi_agent_usage_hint`，避免子 agent 继承父角色说明。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:127][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:146][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:166][E: codex-rs/core/src/agent/control/spawn.rs:687][E: codex-rs/core/src/agent/control/spawn.rs:794]

## Handler 流程

handler 解析 function arguments、计算 fork mode、从父 turn 构建子 agent config，再用 `thread_spawn_source` 生成带 canonical path 的 `SessionSource::SubAgent`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:54][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:55][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:65][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:103]

它用父 agent path 作 author、新 canonical path 作 recipient，直接构造 `InterAgentCommunication`，并附上 `AgentCommunicationKind::Spawn` 的日志上下文。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:119][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:126]

真正创建与首次投递由 `agent_control.spawn_agent_with_communication` 完成；`SpawnAgentOptions` 带 fork call id/mode、parent thread、parent turn、environment selections，以及 full-history 时解析出的 child usage hints。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:154][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:159][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:166]

V2 shared config 默认复制 live turn developer instructions；若配置了 `subagent_developer_instructions` 则替换之。full-history fork 会从 top-level 与 compacted replacement history 清理 inherited AgentMessage 和 usage-hint developer 片段，并替换 parent developer fragment；必要时只补入一次 child override。[E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:213][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:218][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:221][E: codex-rs/core/src/agent/control/spawn.rs:720][E: codex-rs/core/src/agent/control/spawn.rs:746][E: codex-rs/core/src/agent/control/spawn.rs:809]

## 输出与 parallel

默认输出 schema 是 `{ task_name, nickname }`；如果 `hide_spawn_agent_metadata` 为 true，schema 和 handler 输出都只保留 `task_name`。默认 config 就是隐藏 nickname。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:409][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:419][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:427][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:201][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:202][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:203][E: codex-rs/core/src/config/mod.rs:1242]

`spawn_agent` handler 没有覆写 `supports_parallel_tool_calls`；按 `ToolExecutor` 默认实现，它不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/router.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/control/spawn.rs
- codex-rs/core/src/session/multi_agents.rs
- codex-rs/core/src/context/multi_agent_role_instructions.rs
- codex-rs/core/src/context/world_state/multi_agent_usage_hint.rs
- codex-rs/core/src/session/world_state.rs
- codex-rs/core/src/config/mod.rs
- codex-rs/protocol/src/agent_path.rs
- codex-rs/tools/src/tool_executor.rs
