---
id: tool.resume-agent-v1
title: resume_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/tools/src/tool_registry_plan_tests.rs]
symbols: [create_resume_agent_tool, ToolHandlerKind::ResumeAgentV1, multi_agents::resume_agent::Handler]
related: [tool.spawn-agent-v1, tool.send-input-v1, tool.close-agent-v1]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `resume_agent` V1 是 legacy collab tool 中按 agent id 恢复已关闭 agent 的 function tool；恢复后该 agent 可继续接收 `send_input` 和 `wait_agent` 调用。

## 能回答的问题

- `resume_agent` 为什么只存在于 V1？
- `resume_agent` 的输入和输出 schema 是什么？
- `resume_agent` 如何从 rollout 恢复关闭的 agent？
- `resume_agent` 在什么门控下注册？
- `resume_agent` 与 `close_agent` / `send_input` 如何配合？

## 1 Identity

- Wire name: `resume_agent`。[E: codex-rs/tools/src/agent_tool.rs:194]
- Handler kind: `ToolHandlerKind::ResumeAgentV1`；core registry 映射为 `ResumeAgentHandler`。[E: codex-rs/tools/src/tool_registry_plan.rs:462][E: codex-rs/core/src/tools/spec.rs:243]
- 所属套件: V1 legacy collab branch；V2 registry 测试断言缺少 `resume_agent`。[E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:458][E: codex-rs/tools/src/tool_registry_plan_tests.rs:329]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:193]

## 2 用途定位

`resume_agent` 用于按 id 恢复 previously closed agent，使其之后可以接收 `send_input` 和 `wait_agent` 调用；该用途写在工具 description 中。[E: codex-rs/tools/src/agent_tool.rs:196]

handler 只在当前 status 是 `AgentStatus::NotFound` 时尝试从 rollout 恢复；status 非 `NotFound` 时不调用 rollout resume，随后发送 end event、记录 telemetry，并返回该 status。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:61][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:89][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:95][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:111][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:113]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `id` | string | 是 | 无 | 要恢复的 agent id；handler 用 `ThreadId::from_string` 解析，非法 id 会返回 model-facing error。[E: codex-rs/tools/src/agent_tool.rs:189][E: codex-rs/tools/src/agent_tool.rs:190][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:28][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:29] |

parameters required 为 `["id"]`，additionalProperties 为 false。[E: codex-rs/tools/src/agent_tool.rs:200]

## 4 输出 schema & 截断

输出 schema 是 object，包含 required `status` 字段，字段值为 `agent_status_output_schema()`。[E: codex-rs/tools/src/agent_tool.rs:414][E: codex-rs/tools/src/agent_tool.rs:416][E: codex-rs/tools/src/agent_tool.rs:418]

handler 返回 `ResumeAgentResult { status }`，`to_response_item` 调用 `tool_output_response_item(..., Some(true), "resume_agent")`；该工具没有在 schema 或 handler 中暴露输出截断字段[I]。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:113][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:123][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:124][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:137]

## 5 ToolSpec 类型

`resume_agent` 是 function tool，`strict: false`、`defer_loading: None`、object parameters。[E: codex-rs/tools/src/agent_tool.rs:193][E: codex-rs/tools/src/agent_tool.rs:198][E: codex-rs/tools/src/agent_tool.rs:199][E: codex-rs/tools/src/agent_tool.rs:200]

handler 返回 `ToolKind::Function`，只匹配 function payload，并解析 arguments 为 `ResumeAgentArgs`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:11][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:15][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:26][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:27]

## 6 注册与门控

`resume_agent` 只在 `config.collab_tools` true 且 `config.multi_agent_v2` false 的 legacy branch 注册。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:438]

注册 plan 先 push `create_resume_agent_tool()`，`supports_parallel_tool_calls` 为 false，再注册 `resume_agent` 到 `ToolHandlerKind::ResumeAgentV1`。[E: codex-rs/tools/src/tool_registry_plan.rs:458][E: codex-rs/tools/src/tool_registry_plan.rs:459][E: codex-rs/tools/src/tool_registry_plan.rs:462]

## 7 parallel-safe

`resume_agent` 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:459]

handler 可能重新打开已关闭 agent、把 `thread_spawn_source(...)` 传给 rollout resume、发送 resume begin/end events，并记录 telemetry。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:47][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:95][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:111][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:155][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:158]

## 8 handler 走读

1. Core registry 把 `ToolHandlerKind::ResumeAgentV1` 注册为 `ResumeAgentHandler`。[E: codex-rs/core/src/tools/spec.rs:243]
2. Handler 解析 `ResumeAgentArgs`，把 `id` 转为 `ThreadId`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:27][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:28]
3. Handler 计算 child depth，读取 `agent_max_depth`，并检查 depth limit。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:36][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:37][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:38]
4. Handler 发送 `CollabResumeBeginEvent`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:45][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:47]
5. Handler 读取当前 status；只有 `AgentStatus::NotFound` 时调用 `try_resume_closed_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:61][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:64]
6. `try_resume_closed_agent` 构建 resume config，并调用 `resume_agent_from_rollout(config, receiver_thread_id, thread_spawn_source(...))`。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:151][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:155][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:157][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:158]
7. Handler 发送 `CollabResumeEndEvent`，若恢复过程有错误则返回错误，否则返回当前 status。[E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:95][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:107][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:108][E: codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs:113]

## 9 设计动机、edge、历史

`resume_agent` 是 V1-only[I]；V2 registry 测试断言 `resume_agent` 缺失。[E: codex-rs/tools/src/tool_registry_plan_tests.rs:329]

恢复使用 `build_agent_resume_config`，该 helper 通过 shared config builder 复制当前 turn 的 model/provider/reasoning/developer instructions 等状态并应用 spawn overrides，但把 `base_instructions` 设为 None，使 resume 保留 rollout/session metadata 中的 base instructions。[E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:216][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:226][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:227][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:230][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:232][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:217][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:219]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents/resume_agent.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/tools/src/tool_registry_plan_tests.rs

## 相关

- [spawn_agent (V1) 工具](spawn-agent-v1.md)
- [send_input (V1) 工具](send-input-v1.md)
- [close_agent (V1) 工具](close-agent-v1.md)
