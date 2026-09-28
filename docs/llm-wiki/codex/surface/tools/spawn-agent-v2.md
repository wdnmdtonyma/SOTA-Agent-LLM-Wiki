---
id: tool.spawn-agent-v2
title: spawn_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/multi_agent_tool.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/session/multi_agents.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/config/mod.rs, codex-rs/protocol/src/agent_path.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_spawn_agent_tool_v2, SpawnAgentHandlerV2, multi_agents_v2::spawn::Handler, multi_agents_v2::SpawnAgentArgs, SpawnAgentOptions, apply_spawn_agent_role, resolve_usage_hints]
related: [spine.trace-subagent, subsys.core.tool-system, subsys.core.collaboration-modes]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `spawn_agent` V2 是 MultiAgentV2 协作工具集中创建子 agent 的 function tool；它用 `task_name` 生成 canonical task path，并在 `collab_tools_enabled && multi_agent_v2_enabled` 的注册分支出现。角色文件由 `codex-rs/agent-roles` 加载，spawn 时经 `apply_spawn_agent_role` 收紧 child config。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `spawn_agent`，由 V2 handler 的 `tool_name()` 返回。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:44] |
| spec builder | `create_spawn_agent_tool_v2` 返回 `ToolSpec::Function(ResponsesApiTool)`，工具名同样是 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:126][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:127] |
| handler | `multi_agents_v2.rs` re-export `spawn::Handler as SpawnAgentHandler`，`spec_plan.rs` 用别名 `SpawnAgentHandlerV2` 注册。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:32][E: codex-rs/core/src/tools/spec_plan.rs:50][E: codex-rs/core/src/tools/spec_plan.rs:1320] |
| payload kind | handler 只匹配 `ToolPayload::Function`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:256] |

## 注册与门控

`add_collaboration_tools` 先检查 `collab_tools_enabled(turn_context, model_info)`，再在 `multi_agent_v2_enabled` 分支注册 V2 工具；`spawn_agent` 始终加入，`send_message`/`followup_task` 仅在 `!disable_direct_message` 时加入。该分支里只有 `wait_agent` 受 `wait_agent_enabled` 门控；`interrupt_agent` 与 `list_agents` 无条件注册。[E: codex-rs/core/src/tools/spec_plan.rs:1299][E: codex-rs/core/src/tools/spec_plan.rs:1302][E: codex-rs/core/src/tools/spec_plan.rs:1318][E: codex-rs/core/src/tools/spec_plan.rs:1347][E: codex-rs/core/src/tools/spec_plan.rs:1367][E: codex-rs/core/src/tools/spec_plan.rs:1378][E: codex-rs/core/src/tools/spec_plan.rs:1387]

V2 的 `collab_tools_enabled` 不是“有 agent path 就开”。子 agent（`session_source.get_agent_path()` 有值）只有在当前 `model_info.multi_agent_version == Some(MultiAgentVersion::V2)` 时才继续暴露协作工具；否则该 child 是 leaf worker，不会注册 `spawn_agent` 等 V2 工具。[E: codex-rs/core/src/tools/spec_plan.rs:679][E: codex-rs/core/src/tools/spec_plan.rs:680][E: codex-rs/core/src/tools/spec_plan.rs:681]

V2 协作工具的 exposure 取决于 `multi_agent_v2.non_code_mode_only`：true 时是 `DirectModelOnly`，否则是 `Direct`。默认 config 把 `non_code_mode_only` 设为 true。[E: codex-rs/core/src/tools/spec_plan.rs:1306][E: codex-rs/core/src/config/mod.rs:1360]

如果 namespace tools 开启并配置了 `multi_agent_v2.tool_namespace`，`multi_agent_v2_handler` 会把 function spec 包进 namespace spec，并把工具名改成 namespaced name；否则直接使用原 handler。默认 namespace 是 `collaboration`。[E: codex-rs/core/src/tools/spec_plan.rs:1311][E: codex-rs/core/src/tools/multi_agent_tool.rs:21][E: codex-rs/core/src/config/mod.rs:259][E: codex-rs/core/src/config/mod.rs:1354]

## 输入与 schema

| 字段 | 必填 | 运行时语义 |
|---|---:|---|
| `task_name` | 是 | schema 描述要求小写字母、数字和 `_`；handler 把它传给 `thread_spawn_source(..., Some(args.task_name.clone()))`，公共 helper 再调用 `AgentPath::join` 做名称校验。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:121][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:153][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:146][E: codex-rs/protocol/src/agent_path.rs:54] |
| `message` | 是 | V2 spawn 不接受 V1 的 `items`。namespace 为 `collaboration` 且 `encrypted_function_args` 为空的 direct model call 被 router 标为 plaintext source，shared helper 渲染可读 `NEW_TASK` envelope；非 plaintext 来源仍构造 encrypted communication。[E: codex-rs/core/src/tools/router.rs:46][E: codex-rs/core/src/tools/router.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:172][E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:64] |
| `agent_type` | 否 | 空白会被 trim 后忽略。非 full-history fork **或**显式提供 role 时调用 `apply_spawn_agent_role`；full-history fork 应用 role 后若 child 还没有 developer instructions，会回填父 turn 的 developer instructions。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:128][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:136][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:141] |
| `fork_turns` | 否 | 默认 `all`；`none` 表示不 fork，`all` 表示 `FullHistory`，正整数字符串表示 `LastNTurns(n)`；`fork_context` 字段会被显式拒绝。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:286][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:275][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:292][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:306] |
| `model` / `reasoning_effort` / `service_tier` | 否 | model/reasoning override 在 full-history 与非 full-history 路径都经 helper 验证并应用；`service_tier` 另经 helper 处理。V2 schema 本身不含 `service_tier` 字段。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:128][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:144][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:630] |

`create_spawn_agent_tool_v2` 的 required 字段只有 `task_name` 和 `message`，additional properties 为 false；`SpawnAgentArgs` 也用 `#[serde(deny_unknown_fields)]` 收紧运行时解析。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:138][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:262]

schema 暴露是可配的：没有 agent roles 时 `expose_agent_type` 为 false；`expose_spawn_agent_model_overrides` 为 false 时移除 `model` / `reasoning_effort`；`hide_spawn_agent_metadata` 映射成 `hide_agent_type_model_reasoning`，用来简化输出 schema（只留 `task_name`）并抑制 inherited-model guidance。默认 config 是 `hide_spawn_agent_metadata = true`、`expose_spawn_agent_model_overrides = true`。[E: codex-rs/core/src/tools/spec_plan.rs:1316][E: codex-rs/core/src/tools/spec_plan.rs:1324][E: codex-rs/core/src/tools/spec_plan.rs:1325][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:137][E: codex-rs/core/src/config/mod.rs:1355][E: codex-rs/core/src/config/mod.rs:1356]

`expose_spawn_agent_model_overrides` 为 true 时，schema description 会列出 picker-visible 且支持当前 multi-agent backend 的模型 override（最多 `MAX_SPAWN_AGENT_MODEL_OVERRIDES`）。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:104][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:790][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:34]

## 角色指令与 usage hint

V2 的模型可见协作说明不再只写在 tool description 里。`usage_hint_text()` 只对 `MultiAgentVersion::V2` 生效；config 的 `root_agent_usage_hint_text` / `subagent_usage_hint_text` 优先（空字符串抑制 fallback），否则用 catalog/composed `ResolvedMessage`。[E: codex-rs/core/src/session/multi_agents.rs:16][E: codex-rs/core/src/session/multi_agents.rs:46][E: codex-rs/core/src/session/multi_agents.rs:67]

configured 角色走 `MultiAgentRoleInstructions::Configured`；catalog 文本走 `Composed { marked: catalog_override().is_some(), ... }`。world-state 先 `with_usage_hint` 再 `add_section(multi_agent_mode)`。[E: codex-rs/core/src/session/multi_agents.rs:48][E: codex-rs/core/src/session/multi_agents.rs:55][E: codex-rs/core/src/session/world_state.rs:321][E: codex-rs/core/src/session/world_state.rs:326]

full-history fork 且当前 turn 是 V2 时，handler 才解析 child usage hints 并放进 `SpawnAgentOptions.multi_agent_v2_usage_hints`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:161][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:203]

角色文件 discovery/loader 在 `codex-rs/agent-roles`，spawn 经 `apply_spawn_agent_role` 应用；角色只能收紧 parent，不能替换 parent 权威。细节在 [Collaboration modes](../../subsystems/core/collaboration-modes.md)。[E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:187]

## Handler 流程

真正逻辑在 `handle_spawn_agent`：解析 function arguments、计算 fork mode、经 `prepare_agent_spawn_config` 从父 turn 构建子 agent config，再用 `thread_spawn_source` 生成带 canonical path 的 spawn source。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:101][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:123][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:133]

首次投递由 `agent_control.spawn(SpawnRequest { input: AgentInput::Message { mode: TriggerTurn, ... }, ... })` 完成；`SpawnAgentOptions` 带 fork call id/mode、parent/root turn、environment selections、full-history 时解析出的 child usage hints，以及父 turn 的 `cyber_access_program`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:184][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:192][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:195]

## 输出与 parallel

默认输出 schema 是 `{ task_name, nickname }`；如果 `hide_spawn_agent_metadata` 为 true，schema 和 handler 输出都只保留 `task_name`。默认 config 就是隐藏 nickname。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:142][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:243][E: codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs:245][E: codex-rs/core/src/config/mod.rs:1355]

`spawn_agent` handler 没有覆写 `supports_parallel_tool_calls`；按 `ToolExecutor` 默认实现，它不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:122]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/multi_agent_tool.rs
- codex-rs/core/src/tools/router.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/session/multi_agents.rs
- codex-rs/core/src/session/world_state.rs
- codex-rs/core/src/config/mod.rs
- codex-rs/protocol/src/agent_path.rs
- codex-rs/tools/src/tool_executor.rs
