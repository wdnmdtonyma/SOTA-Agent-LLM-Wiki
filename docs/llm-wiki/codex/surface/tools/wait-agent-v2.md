---
id: tool.wait-agent-v2
title: wait_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs, codex-rs/core/src/tools/handlers/multi_agents_common.rs, codex-rs/core/src/agent/mailbox.rs, codex-rs/core/src/session/mod.rs]
symbols: [create_wait_agent_tool_v2, ToolHandlerKind::WaitAgentV2, multi_agents_v2::wait::Handler]
related: [tool.spawn-agent-v2, tool.send-message, tool.followup-task, tool.list-agents]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `wait_agent` V2 是 MultiAgentV2 的 mailbox wait 工具：它等待任一 live agent 产生 mailbox 更新或超时，只返回摘要，不返回子 agent 内容。

## 能回答的问题

- `wait_agent` V2 为什么没有 `targets` 参数？
- `wait_agent` V2 等待的到底是 agent final status 还是 mailbox update？
- `wait_agent` V2 的 timeout 默认值、最小值和最大值从哪里来？
- `wait_agent` V2 的输出为什么没有 agent message 内容？
- `wait_agent` V2 与 V1 的 `wait_agent` 有什么差异？

## 1 Identity

- Wire name: `wait_agent`；V2 与 V1 复用同名工具，但 registry 分别绑定到 `ToolHandlerKind::WaitAgentV2` 和 `ToolHandlerKind::WaitAgentV1`。[E: codex-rs/tools/src/agent_tool.rs:219][E: codex-rs/tools/src/agent_tool.rs:207][E: codex-rs/tools/src/tool_registry_plan.rs:435][E: codex-rs/tools/src/tool_registry_plan.rs:475]
- Handler kind: `ToolHandlerKind::WaitAgentV2`；core registry 映射为 `WaitAgentHandlerV2`。[E: codex-rs/tools/src/tool_registry_plan_types.rs:43][E: codex-rs/core/src/tools/spec.rs:291]
- 所属套件: `wait_agent` V2 在 `collab_tools && multi_agent_v2` 分支注册；legacy V1 在同一 `collab_tools` 分支的 `else` 分支注册[I]。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:418][E: codex-rs/tools/src/tool_registry_plan.rs:438][E: codex-rs/tools/src/tool_registry_plan.rs:464]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_tool.rs:218]

## 2 用途定位

`wait_agent` V2 等待“任何 live agent 的 mailbox update”，包括 queued messages 和 final-status notifications；工具描述明确说明它不返回内容，只返回有更新或 timeout 的摘要。[E: codex-rs/tools/src/agent_tool.rs:220]

V2 handler 订阅的是 session mailbox sequence；从 handler 代码看，它没有接收 target list，也没有调用 per-agent status watch[I]。mailbox `send` 每次递增 sequence 并通知 watch channel。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:40][E: codex-rs/core/src/agent/mailbox.rs:44][E: codex-rs/core/src/agent/mailbox.rs:46]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `timeout_ms` | number | 否 | `30000` | timeout 毫秒数；schema 文案来自 `WaitAgentTimeoutOptions`，默认 30000、最小 10000、最大 3600000；handler 对非正数报错，对正数执行 clamp。[E: codex-rs/tools/src/agent_tool.rs:745][E: codex-rs/tools/src/agent_tool.rs:749][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:29][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:30][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:31][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:30][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:37] |

V2 schema 没有 `targets` 字段，required 也是 `None`；对应测试直接断言 `properties` 不包含 `targets`。[E: codex-rs/tools/src/agent_tool.rs:754][E: codex-rs/tools/src/agent_tool_tests.rs:235]

## 4 输出 schema & 截断

输出 schema 是 object，包含 `message: string` 和 `timed_out: boolean`，required 为 `["message", "timed_out"]`。[E: codex-rs/tools/src/agent_tool.rs:444][E: codex-rs/tools/src/agent_tool.rs:446][E: codex-rs/tools/src/agent_tool.rs:450][E: codex-rs/tools/src/agent_tool.rs:455]

`message` 的 schema 描述是“不含 agent final content 的简短 wait summary”，handler 只会生成 `"Wait completed."` 或 `"Wait timed out."`。[E: codex-rs/tools/src/agent_tool.rs:448][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:93]

`wait_agent` V2 没有在 schema 或 handler 中暴露输出截断字段[I]；测试覆盖了 mailbox 内容 `"sensitive child output"` 不出现在 tool output 中。[E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3097][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3119]

## 5 ToolSpec 类型

`create_wait_agent_tool_v2` 返回 function tool，`strict: false`、`defer_loading: None`，parameters 由 `wait_agent_tool_parameters_v2` 生成。[E: codex-rs/tools/src/agent_tool.rs:218][E: codex-rs/tools/src/agent_tool.rs:222][E: codex-rs/tools/src/agent_tool.rs:223][E: codex-rs/tools/src/agent_tool.rs:224]

handler 返回 `ToolKind::Function`，并只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:13][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:17]

## 6 注册与门控

`wait_agent` V2 在 `config.collab_tools && config.multi_agent_v2` 分支注册。[E: codex-rs/tools/src/tool_registry_plan.rs:392][E: codex-rs/tools/src/tool_registry_plan.rs:393][E: codex-rs/tools/src/tool_registry_plan.rs:418]

注册时使用 `create_wait_agent_tool_v2(params.wait_agent_timeouts)`，`supports_parallel_tool_calls` 为 false，handler 名 `wait_agent` 绑定到 `ToolHandlerKind::WaitAgentV2`。[E: codex-rs/tools/src/tool_registry_plan.rs:418][E: codex-rs/tools/src/tool_registry_plan.rs:419][E: codex-rs/tools/src/tool_registry_plan.rs:435]

## 7 parallel-safe

`wait_agent` V2 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:419]

虽然 handler 本身主要等待 mailbox seq，但一次调用会订阅 session mailbox watch、发送 `CollabWaitingBeginEvent` 和 `CollabWaitingEndEvent`，并把同一个 watch receiver 交给 `wait_for_mailbox_change`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:40][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:45][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:62]

## 8 handler 走读

1. Core registry 将 `ToolHandlerKind::WaitAgentV2` 注册为 `WaitAgentHandlerV2`。[E: codex-rs/core/src/tools/spec.rs:291]
2. Handler 解析 arguments 为 `WaitArgs`，读取或默认 `timeout_ms`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:29][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:30]
3. Handler 对 `timeout_ms <= 0` 返回 model-facing error，对正数执行 `MIN_WAIT_TIMEOUT_MS..MAX_WAIT_TIMEOUT_MS` clamp。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:37][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:29][E: codex-rs/core/src/tools/handlers/multi_agents_common.rs:31]
4. Handler 通过 `session.subscribe_mailbox_seq()` 订阅 mailbox sequence。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:40][E: codex-rs/core/src/session/mod.rs:2967]
5. Handler 发送 waiting begin event，随后用 deadline 调用 `wait_for_mailbox_change`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:42][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:55][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:56]
6. `wait_for_mailbox_change` 在 watch receiver `changed()` 成功时返回 true，超时或 sender 关闭时返回 false。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:124][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:125][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:126]
7. Handler 把 boolean 转成 `WaitAgentResult { message, timed_out }`，发送 waiting end event，并返回 `Ok(result)`；`ToolOutput` 实现再把结果交给 `tool_output_response_item`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:57][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:59][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:72][E: codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs:112]

## 9 设计动机、edge、历史

V2 `wait_agent` schema 不要求 `targets`，并且测试覆盖了 “wakes on any mailbox notification”；把 target selection 移出 wait 输入是 V2 mailbox 汇聚设计的结果[I]。[E: codex-rs/tools/src/agent_tool.rs:754][E: codex-rs/tools/src/agent_tool_tests.rs:235][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2950][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:3012]

V2 wait 从调用开始后等待新的 mailbox seq；测试把一条 mail 预先 enqueue 后启动 wait，断言 wait task 不应结束，然后 enqueue 新 mail 才返回。[E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2895][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2919][E: codex-rs/core/src/tools/handlers/multi_agents_tests.rs:2924]

V1 schema 要求 `targets` 并返回按 agent id keyed 的 `status` map；V2 schema 没有 `targets`，只返回 `message` 与 `timed_out` summary。[E: codex-rs/tools/src/agent_tool.rs:720][E: codex-rs/tools/src/agent_tool.rs:740][E: codex-rs/tools/src/agent_tool.rs:427][E: codex-rs/tools/src/agent_tool.rs:430][E: codex-rs/tools/src/agent_tool.rs:446][E: codex-rs/tools/src/agent_tool.rs:450][E: codex-rs/tools/src/agent_tool.rs:754]

## Sources

- codex-rs/tools/src/agent_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/wait.rs
- codex-rs/core/src/tools/handlers/multi_agents_common.rs
- codex-rs/core/src/agent/mailbox.rs
- codex-rs/core/src/session/mod.rs
- codex-rs/tools/src/agent_tool_tests.rs
- codex-rs/core/src/tools/handlers/multi_agents_tests.rs

## 相关

- [spawn_agent (V2) 工具](spawn-agent-v2.md)
- [send_message 工具](send-message.md)
- [followup_task 工具](followup-task.md)
- [list_agents 工具](list-agents.md)
