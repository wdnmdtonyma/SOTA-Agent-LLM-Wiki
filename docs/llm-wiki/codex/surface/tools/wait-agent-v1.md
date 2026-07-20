---
id: tool.wait-agent-v1
title: wait_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/wait.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_wait_agent_tool_v1, WaitAgentHandler, multi_agents::wait::Handler, multi_agents::WaitAgentResult]
related: [tool.spawn-agent-v1, tool.send-input-v1, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> `wait_agent` V1 是 `multi_agent_v1` namespace 下的 target-list wait 工具；它等待指定 agent thread id 达到 final status，并返回 status map，runtime key 优先使用 agent path、缺失时回退 thread id。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "wait_agent")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:30][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:14] |
| spec builder | `create_wait_agent_tool_v1` 返回 namespace spec，内部 function name 是 `wait_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:269][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:273][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:274] |
| handler | `multi_agents.rs` re-export `wait::Handler as WaitAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:78][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:267][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:269] |

## 注册与门控

`wait_agent` V1 注册在 `collab_tools_enabled` true 且 `multi_agent_v2_enabled` false 的分支；V1 exposure 在 search+namespace 同时开启时是 deferred，否则 direct。[E: codex-rs/core/src/tools/spec_plan.rs:786][E: codex-rs/core/src/tools/spec_plan.rs:788][E: codex-rs/core/src/tools/spec_plan.rs:789][E: codex-rs/core/src/tools/spec_plan.rs:843][E: codex-rs/core/src/tools/spec_plan.rs:846][E: codex-rs/core/src/tools/spec_plan.rs:847][E: codex-rs/core/src/tools/spec_plan.rs:849][E: codex-rs/core/src/tools/spec_plan.rs:865][E: codex-rs/core/src/tools/spec_plan.rs:866]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:39][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:40][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 timeout

| 字段 | 必填 | 说明 |
|---|---:|---|
| `targets` | 是 | agent id array；schema required 包含 `targets`，runtime 也要求非空并逐项解析成 `ThreadId`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:851][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:855][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:869][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:871][E: codex-rs/core/src/tools/handlers/multi_agents.rs:45][E: codex-rs/core/src/tools/handlers/multi_agents.rs:48][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:65] |
| `timeout_ms` | 否 | 缺省使用 `DEFAULT_WAIT_TIMEOUT_MS`；runtime 要求大于 0，并 clamp 到 min/max。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:861][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:863][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:89][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:96] |

## Handler 流程

handler 解析 targets 后，为每个目标收集 metadata、建立 target display key，并发出 `CollabAgentToolCall` started item。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:65][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:99][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:102]

对每个目标，handler 订阅 status watch；如果初始状态已 final 或 thread not found，会直接纳入结果。否则并发等待任一目标达到 final status，超时则返回空 status map。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:117][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:120][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:123][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:128][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:156][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:159][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:167][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:173]

结果 status key 优先用 agent path，缺失时回退 thread id；completed item 则用 thread id keyed 的 `agents_states`，并只保留返回状态所对应的 receiver entries。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:80][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:189][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:190][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:193][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:203][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:206][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:212][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:216]

## 输出

V1 output schema 是 `{ status, timed_out }`；schema description 仍写着 final statuses keyed by agent id，但 runtime 构造结果时使用上文的 target display key。`timed_out` 等于 `statuses.is_empty()`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:495][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:499][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:501][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:509][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:188][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:190][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:194]

`wait_for_final_status` 在 watch 关闭时会重新读取 latest status；只有 latest 是 final 时才返回结果。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:304][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:314][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:315][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:316][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:317][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:320]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/wait.rs
- codex-rs/tools/src/tool_executor.rs
