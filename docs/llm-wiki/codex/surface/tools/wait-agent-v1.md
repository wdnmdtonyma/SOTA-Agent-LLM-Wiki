---
id: tool.wait-agent-v1
title: wait_agent (V1) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/handlers/multi_agents.rs, codex-rs/core/src/tools/handlers/multi_agents/wait.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_wait_agent_tool_v1, WaitAgentHandler, multi_agents::wait::Handler, WaitAgentResult]
related: [tool.spawn-agent-v1, tool.send-input-v1, tool.wait-agent-v2]
evidence: explicit
status: verified
updated: db887d03e1
---

> `wait_agent` V1 是 `multi_agent_v1` namespace 下的 target-list wait 工具；它等待指定 agent thread id 达到 final status，并返回 status map，runtime key 优先使用 agent path、缺失时回退 thread id。

## Identity

| 项 | 当前源码事实 |
|---|---|
| namespace / wire name | handler 返回 `ToolName::namespaced(MULTI_AGENT_V1_NAMESPACE, "wait_agent")`；namespace 常量是 `multi_agent_v1`。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:30][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:32][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:11] |
| spec builder | `create_wait_agent_tool_v1` 返回 namespace spec，内部 function name 是 `wait_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:236][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:240][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:241] |
| handler | `multi_agents.rs` re-export `wait::Handler as WaitAgentHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/multi_agents.rs:86][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:217][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:219] |

## 注册与门控

`wait_agent` V1 注册在 `collab_tools_enabled` true 且 `multi_agent_v2_enabled` false 的分支；V1 exposure 在 search+namespace 同时开启时是 deferred，否则 direct。[E: codex-rs/core/src/tools/spec_plan.rs:792][E: codex-rs/core/src/tools/spec_plan.rs:794][E: codex-rs/core/src/tools/spec_plan.rs:795][E: codex-rs/core/src/tools/spec_plan.rs:844][E: codex-rs/core/src/tools/spec_plan.rs:847][E: codex-rs/core/src/tools/spec_plan.rs:848][E: codex-rs/core/src/tools/spec_plan.rs:850][E: codex-rs/core/src/tools/spec_plan.rs:863][E: codex-rs/core/src/tools/spec_plan.rs:864]

handler 提供 search metadata；未覆写 `supports_parallel_tool_calls`，所以默认不是 parallel-safe。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:39][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:40][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 timeout

| 字段 | 必填 | 说明 |
|---|---:|---|
| `targets` | 是 | agent id array；schema required 包含 `targets`，runtime 也要求非空并逐项解析成 `ThreadId`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:809][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:813][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:827][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:829][E: codex-rs/core/src/tools/handlers/multi_agents.rs:53][E: codex-rs/core/src/tools/handlers/multi_agents.rs:56][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:65] |
| `timeout_ms` | 否 | 缺省使用 `DEFAULT_WAIT_TIMEOUT_MS`；runtime 要求大于 0，并 clamp 到 min/max。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:819][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:821][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:89][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:91][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:96] |

## Handler 流程

handler 解析 targets 后，为每个目标收集 metadata、建立 target display key，并发送 waiting begin event。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:63][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:65][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:68][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:82][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:99]

对每个目标，handler 订阅 status watch；如果初始状态已 final 或 thread not found，会直接纳入结果。否则并发等待任一目标达到 final status，超时则返回空 status map。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:113][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:116][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:119][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:124][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:151][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:154][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:162][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:168]

结果 status key 优先用 agent path，缺失时回退 thread id；waiting end event 还包含按 thread id keyed 的 statuses 和 `agent_statuses` 展示条目。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:74][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:80][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:184][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:185][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:186][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:189][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:202][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:206]

## 输出

V1 output schema 是 `{ status, timed_out }`；schema description 仍写着 final statuses keyed by agent id，但 runtime 构造结果时使用上文的 target display key。`timed_out` 等于 `statuses.is_empty()`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:466][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:470][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:472][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:478][E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:480][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:183][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:186][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:190]

`wait_for_final_status` 在 watch 关闭时会重新读取 latest status；只有 latest 是 final 时才返回结果。[E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:254][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:264][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:265][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:266][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:267][E: codex-rs/core/src/tools/handlers/multi_agents/wait.rs:270]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/handlers/multi_agents.rs
- codex-rs/core/src/tools/handlers/multi_agents/wait.rs
- codex-rs/tools/src/tool_executor.rs
