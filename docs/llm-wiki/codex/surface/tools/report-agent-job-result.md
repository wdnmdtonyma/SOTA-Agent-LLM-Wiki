---
id: tool.report-agent-job-result
title: report_agent_job_result 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/agent_jobs_spec.rs, codex-rs/core/src/tools/handlers/agent_jobs.rs, codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs, codex-rs/state/src/runtime/agent_jobs.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_report_agent_job_result_tool, ReportAgentJobResultHandler, ReportAgentJobResultArgs, ReportAgentJobResultToolResult]
related: [tool.spawn-agents-on-csv, subsys.core.tool-system]
evidence: explicit
status: verified
updated: db887d03e1
---

> `report_agent_job_result` 是 agent job worker-only 工具：CSV fanout worker 用它把当前 job item 的 JSON object result 写回 state DB；`stop=true` 且结果被 accepted 时会把 job 标记为 cancelled，从而停止继续拉起 pending work。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | handler 返回 plain `report_agent_job_result`，spec builder 也设置同名 function tool。[E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:16][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:18][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:101][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:102] |
| handler | `agent_jobs.rs` re-export `ReportAgentJobResultHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:35][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:52][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:54] |
| spec | function tool，`strict: false`、`defer_loading: None`、`output_schema: None`。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:74][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:101][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:106][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:107][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:113] |

## 注册与门控

`report_agent_job_result` 只有在 `agent_jobs_worker_tools_enabled` 为 true 时注册；该 helper 还要求 session source 是 `SubAgentSource::Other(label)` 且 label 以 `agent_job:` 开头。[E: codex-rs/core/src/tools/spec_plan.rs:370][E: codex-rs/core/src/tools/spec_plan.rs:371][E: codex-rs/core/src/tools/spec_plan.rs:373][E: codex-rs/core/src/tools/spec_plan.rs:375][E: codex-rs/core/src/tools/spec_plan.rs:871][E: codex-rs/core/src/tools/spec_plan.rs:872]

该 label 由 `spawn_agents_on_csv` worker spawn path 设置为 `agent_job:{job_id}`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:204][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:207][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:208]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入与 handler

| 字段 | 必填 | 说明 |
|---|---:|---|
| `job_id` | 是 | job identifier，传给 state DB report call。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:83][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:109][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:71][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:72] |
| `item_id` | 是 | job item identifier，传给 state DB report call。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:88][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:110][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:73] |
| `result` | 是 | 必须是 JSON object；非 object 返回 model-facing error。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:75][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:80][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:91][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:63][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:65] |
| `stop` | 否 | 缺省 false；只有 report accepted 且 `stop` 为 true 时，handler 才把 job row 标记为 cancelled。这个路径不直接把 pending item rows 改成 cancelled，也不立即 kill 已运行 worker。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:93][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:95][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:85][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:88][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:182][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:186][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:287] |

handler 用当前 session thread id 作为 `reporting_thread_id`，并调用 `report_agent_job_item_result(job_id, item_id, reporting_thread_id, result)`。[E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:68][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:69][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:70][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:71]

state DB 只在 item 仍是 `running` 且 `assigned_thread_id` 等于 reporting thread 时更新并返回 true；否则 rows affected 为 0，handler 返回 `{ accepted: false }`。[E: codex-rs/state/src/runtime/agent_jobs.rs:425][E: codex-rs/state/src/runtime/agent_jobs.rs:436][E: codex-rs/state/src/runtime/agent_jobs.rs:448][E: codex-rs/state/src/runtime/agent_jobs.rs:449][E: codex-rs/state/src/runtime/agent_jobs.rs:460][E: codex-rs/state/src/runtime/agent_jobs.rs:463]

## 输出

成功 output 是 `ReportAgentJobResultToolResult { accepted }` 的 JSON 文本，success flag 为 true。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:83][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:84][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:91][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:92][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:97]

如果 `accepted && stop`，handler 调用 `mark_agent_job_cancelled`，取消原因是 `cancelled by worker request`；state DB update 改的是 eligible job row 的 status。runner 观察到 cancellation 后不再进入 spawn-pending 分支，并等 running items drain，而不是在 report handler 中改写 item rows 或终止 worker。[E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:85][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:86][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:88][E: codex-rs/state/src/runtime/agent_jobs.rs:271][E: codex-rs/state/src/runtime/agent_jobs.rs:279][E: codex-rs/state/src/runtime/agent_jobs.rs:281][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:182][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:186][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:287]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/agent_jobs_spec.rs
- codex-rs/core/src/tools/handlers/agent_jobs.rs
- codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs
- codex-rs/state/src/runtime/agent_jobs.rs
- codex-rs/tools/src/tool_executor.rs
