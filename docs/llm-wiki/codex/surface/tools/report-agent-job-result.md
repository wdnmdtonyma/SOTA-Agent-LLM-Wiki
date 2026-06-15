---
id: tool.report-agent-job-result
title: report_agent_job_result 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_job_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/agent_jobs.rs, codex-rs/state/src/runtime/agent_jobs.rs, codex-rs/tools/src/tool_registry_plan_tests.rs]
symbols: [create_report_agent_job_result_tool, ToolHandlerKind::AgentJobs, report_agent_job_result::handle]
related: [tool.spawn-agents-on-csv, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `report_agent_job_result` 是 agent job worker-only function tool：CSV fanout worker 用它把当前 job item 的 JSON result 写回 state DB，并可请求把整个 job 标记为 cancelled。

## 能回答的问题

- `report_agent_job_result` 为什么是 worker-only？
- `report_agent_job_result` 的 `job_id`、`item_id`、`result`、`stop` 字段怎么用？
- `report_agent_job_result` 在什么 session source 下才注册？
- `report_agent_job_result` 成功输出是什么？
- `report_agent_job_result` 如何影响 `spawn_agents_on_csv` 的完成判定？

## 1 Identity

- Wire name: `report_agent_job_result`。[E: codex-rs/tools/src/agent_job_tool.rs:90]
- Handler kind: `ToolHandlerKind::AgentJobs`；core registry 映射为共享 `BatchJobHandler`。[E: codex-rs/tools/src/tool_registry_plan.rs:493][E: codex-rs/core/src/tools/spec.rs:192]
- 所属工具族: agent job tools，schema 在 `codex-rs/tools/src/agent_job_tool.rs`，runtime 在 `codex-rs/core/src/tools/handlers/agent_jobs.rs`。[E: codex-rs/tools/src/lib.rs:28][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:468]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_job_tool.rs:89]

## 2 用途定位

`report_agent_job_result` 是 worker-only 工具；工具 description 明确写着 worker 用它报告 agent job item result，main agents should not call this。[E: codex-rs/tools/src/agent_job_tool.rs:92]

`spawn_agents_on_csv` 生成的 worker prompt 要求 worker exactly once 调用 `report_agent_job_result`，缺少报告会在 worker finished 后被标记为失败。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1021][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:980][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:984]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `job_id` | string | 是 | 无 | agent job id；handler 把它传给 `report_agent_job_item_result`。[E: codex-rs/tools/src/agent_job_tool.rs:69][E: codex-rs/tools/src/agent_job_tool.rs:70][E: codex-rs/tools/src/agent_job_tool.rs:97][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:475][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:485] |
| `item_id` | string | 是 | 无 | job item id；handler 把它传给 state DB 的 report 方法。[E: codex-rs/tools/src/agent_job_tool.rs:73][E: codex-rs/tools/src/agent_job_tool.rs:74][E: codex-rs/tools/src/agent_job_tool.rs:98][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:486] |
| `result` | object | 是 | 无 | worker 的 JSON object 结果；handler 明确要求 `result.is_object()`，非 object 返回 model-facing error。[E: codex-rs/tools/src/agent_job_tool.rs:77][E: codex-rs/tools/src/agent_job_tool.rs:78][E: codex-rs/tools/src/agent_job_tool.rs:99][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:476][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:478] |
| `stop` | boolean | 否 | `false` | handler 用 `args.stop.unwrap_or(false)`，所以缺省等价 false；true 且 result accepted 时把 job 标记为 cancelled，取消原因是 `cancelled by worker request`。[E: codex-rs/tools/src/agent_job_tool.rs:81][E: codex-rs/tools/src/agent_job_tool.rs:83][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:498][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:499][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:501] |

parameters required 为 `job_id`、`item_id`、`result`，additionalProperties 为 false。[E: codex-rs/tools/src/agent_job_tool.rs:96][E: codex-rs/tools/src/agent_job_tool.rs:97][E: codex-rs/tools/src/agent_job_tool.rs:98][E: codex-rs/tools/src/agent_job_tool.rs:99][E: codex-rs/tools/src/agent_job_tool.rs:100]

## 4 输出 schema & 截断

ToolSpec 的 `output_schema` 是 `None`，runtime 成功时返回 serialized `ReportAgentJobResultToolResult { accepted }` JSON 文本。[E: codex-rs/tools/src/agent_job_tool.rs:101][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:96][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:97][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:505]

`accepted` 是 state DB `report_agent_job_item_result` 的返回值；state DB 只在 item 仍是 `running` 且 `assigned_thread_id` 等于 reporting thread 时更新为 completed 并返回 true，late report 会返回 false；当 `accepted && stop.unwrap_or(false)` 时 handler 会 mark job cancelled。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:483][E: codex-rs/state/src/runtime/agent_jobs.rs:448][E: codex-rs/state/src/runtime/agent_jobs.rs:449][E: codex-rs/state/src/runtime/agent_jobs.rs:459][E: codex-rs/state/src/runtime/agent_jobs.rs:460][E: codex-rs/state/src/runtime/agent_jobs.rs:463][E: codex-rs/state/src/runtime/agent_jobs.rs:665][E: codex-rs/state/src/runtime/agent_jobs.rs:673][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:498][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:501]

该工具没有在 schema 或 handler 中暴露输出截断字段[I]；handler 只返回 `{accepted: bool}`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:505][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:510]

## 5 ToolSpec 类型

`report_agent_job_result` 是 function tool，`strict: false`、`defer_loading: None`、object parameters。[E: codex-rs/tools/src/agent_job_tool.rs:89][E: codex-rs/tools/src/agent_job_tool.rs:94][E: codex-rs/tools/src/agent_job_tool.rs:95][E: codex-rs/tools/src/agent_job_tool.rs:96]

共享 `BatchJobHandler` 返回 `ToolKind::Function`，只接受 function payload，并按 tool name 分派到 `report_agent_job_result::handle`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:184][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:188][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:211]

## 6 注册与门控

`report_agent_job_result` 只有在 `config.agent_jobs_tools` true 且 `config.agent_jobs_worker_tools` true 时注册。[E: codex-rs/tools/src/tool_registry_plan.rs:480][E: codex-rs/tools/src/tool_registry_plan.rs:487][E: codex-rs/tools/src/tool_registry_plan.rs:489]

`agent_jobs_tools` 由 `Feature::SpawnCsv` 计算；`agent_jobs_worker_tools` 还要求 session source 是 `SessionSource::SubAgent(SubAgentSource::Other(label))` 且 label 以 `agent_job:` 开头。[E: codex-rs/tools/src/tool_config.rs:148][E: codex-rs/tools/src/tool_config.rs:198][E: codex-rs/tools/src/tool_config.rs:201][E: codex-rs/tools/src/tool_config.rs:202]

注册 plan 将 `report_agent_job_result` 以 `supports_parallel_tool_calls=false` 加入，并把 handler 绑定到 `ToolHandlerKind::AgentJobs`。[E: codex-rs/tools/src/tool_registry_plan.rs:489][E: codex-rs/tools/src/tool_registry_plan.rs:490][E: codex-rs/tools/src/tool_registry_plan.rs:493]

## 7 parallel-safe

`report_agent_job_result` 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:490]

handler 会写 state DB 的 job item result，并可能取消整批 job，因此同一 job 上并行调用会竞争 job/item 状态[I]。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:483][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:501]

## 8 handler 走读

1. Core registry 将 `ToolHandlerKind::AgentJobs` 注册为 `BatchJobHandler`。[E: codex-rs/core/src/tools/spec.rs:192]
2. `BatchJobHandler` 收到 tool name `report_agent_job_result` 时调用 `report_agent_job_result::handle`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:209][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:211]
3. Handler 解析 arguments 为 `ReportAgentJobResultArgs`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:471][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:475]
4. Handler 校验 `result` 必须是 JSON object。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:476][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:477]
5. Handler 要求 session 有 state DB，并把当前 `conversation_id` 作为 `reporting_thread_id` 写入 result report。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:481][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:482][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:487]
6. Handler 调用 `db.report_agent_job_item_result(job_id, item_id, reporting_thread_id, result)`，错误时返回 model-facing message。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:483][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:491][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:495]
7. 如果 result accepted 且 `stop=true`，handler 把 job 标记为 cancelled。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:498][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:501]
8. Handler 序列化 `{accepted}` 并返回成功 function output。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:505][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:510]

## 9 设计动机、edge、历史

worker-only 门控由 session source label 实现：`spawn_agents_on_csv` spawn worker 时使用 `SessionSource::SubAgent(SubAgentSource::Other(format!("agent_job:{job_id}")))`，`ToolsConfig::new` 只对这种 label 打开 `agent_jobs_worker_tools`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:635][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:636][E: codex-rs/tools/src/tool_config.rs:201][E: codex-rs/tools/src/tool_config.rs:202]

registry 测试覆盖了 agent job worker session source 会同时看到 `spawn_agents_on_csv` 和 `report_agent_job_result`。[E: codex-rs/tools/src/tool_registry_plan_tests.rs:486][E: codex-rs/tools/src/tool_registry_plan_tests.rs:487][E: codex-rs/tools/src/tool_registry_plan_tests.rs:507][E: codex-rs/tools/src/tool_registry_plan_tests.rs:508]

`report_agent_job_result` 的 `stop` 是 worker 主动请求停止后续 pending worker 的 escape hatch[I]；handler 只有在 result accepted 后才把 job 标记为 cancelled，runner 随后不再启动 pending items，并在 running items drain 后退出。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:498][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:501][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:604][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:614][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:711][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:712]

## Sources

- codex-rs/tools/src/agent_job_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/tools/src/tool_config.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/agent_jobs.rs
- codex-rs/state/src/runtime/agent_jobs.rs
- codex-rs/tools/src/tool_registry_plan_tests.rs

## 相关

- [spawn_agents_on_csv 工具](spawn-agents-on-csv.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
