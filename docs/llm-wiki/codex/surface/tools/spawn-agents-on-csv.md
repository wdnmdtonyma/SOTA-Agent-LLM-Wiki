---
id: tool.spawn-agents-on-csv
title: spawn_agents_on_csv 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/agent_job_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_config.rs, codex-rs/features/src/lib.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/agent_jobs.rs, codex-rs/tools/src/tool_registry_plan_tests.rs]
symbols: [create_spawn_agents_on_csv_tool, ToolHandlerKind::AgentJobs, BatchJobHandler]
related: [tool.report-agent-job-result, tool.spawn-agent-v1, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `spawn_agents_on_csv` 是 CSV-backed agent job 工具：它把 CSV 每一行转换为一个 job item，为每行 spawn 一个 worker sub-agent，并在 agent-job loop 到达 completed、failed 或 cancelled terminal state 后导出结果 CSV snapshot。

## 能回答的问题

- `spawn_agents_on_csv` 的输入字段和默认值是什么？
- `spawn_agents_on_csv` 如何把 CSV 行变成 worker prompt？
- `spawn_agents_on_csv` 与 `report_agent_job_result` 如何配合？
- `spawn_agents_on_csv` 在什么 feature/config 门控下注册？
- `spawn_agents_on_csv` 的输出 JSON 包含哪些字段？

## 1 Identity

- Wire name: `spawn_agents_on_csv`。[E: codex-rs/tools/src/agent_job_tool.rs:56]
- Handler kind: `ToolHandlerKind::AgentJobs`；core registry 将 AgentJobs kind 统一映射到 `BatchJobHandler`。[E: codex-rs/tools/src/tool_registry_plan.rs:486][E: codex-rs/core/src/tools/spec.rs:192]
- 所属 crate: schema 在 `codex-rs/tools/src/agent_job_tool.rs`，运行时在 `codex-rs/core/src/tools/handlers/agent_jobs.rs`。[E: codex-rs/tools/src/lib.rs:29][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:37]
- ToolSpec 类型: `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/agent_job_tool.rs:55]

## 2 用途定位

`spawn_agents_on_csv` 用于处理 CSV：每行生成一个 worker sub-agent，instruction 字符串使用 `{column}` placeholder 注入行值，每个 worker 必须调用 `report_agent_job_result`，缺失报告会被视为失败。[E: codex-rs/tools/src/agent_job_tool.rs:57]

调用会阻塞到 agent-job loop 到达终态，并自动导出结果到 `output_csv_path` 或默认 path；通常终态意味着所有行 completed/failed，但 worker 通过 `report_agent_job_result(stop=true)` 可取消剩余 pending items，runner 会停止拉起新 worker、导出 snapshot 并在 cancelled 分支提前返回。[E: codex-rs/tools/src/agent_job_tool.rs:57][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:365][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:498][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:501][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:604][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:614][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:750][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:757][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:771]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明与校验 |
|---|---|---:|---|---|
| `csv_path` | string | 是 | 无 | 输入 CSV 路径；handler 用 `turn.resolve_path` 解析并异步读取文件。[E: codex-rs/tools/src/agent_job_tool.rs:9][E: codex-rs/tools/src/agent_job_tool.rs:61][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:240][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:242] |
| `instruction` | string | 是 | 无 | 对每行应用的 instruction template；handler 拒绝 trim 后为空的 instruction。[E: codex-rs/tools/src/agent_job_tool.rs:13][E: codex-rs/tools/src/agent_job_tool.rs:15][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:233] |
| `id_column` | string | 否 | row index 派生 id | 可选 stable item id 列名；handler 找不到该 header 时返回 model-facing error，空值会回退 `row-{index}`。[E: codex-rs/tools/src/agent_job_tool.rs:20][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:259][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:265][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:266][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:283][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:289] |
| `output_csv_path` | string | 否 | `<input-stem>.agent-job-<job-suffix>.csv` | 可选输出路径；未提供时使用 `default_output_csv_path`，提供时也经过 `turn.resolve_path`。[E: codex-rs/tools/src/agent_job_tool.rs:26][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:313][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1102] |
| `max_concurrency` | number | 否 | 16 | 最大并发 worker 数；schema 说明默认 16 并受 config cap，handler 会与 `max_workers` 合并后调用 `normalize_concurrency`。[E: codex-rs/tools/src/agent_job_tool.rs:30][E: codex-rs/tools/src/agent_job_tool.rs:32][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:341][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:545] |
| `max_workers` | number | 否 | 同 `max_concurrency` | `max_concurrency` alias；schema 写明设为 1 可顺序运行。[E: codex-rs/tools/src/agent_job_tool.rs:37][E: codex-rs/tools/src/agent_job_tool.rs:39] |
| `max_runtime_seconds` | number | 否 | 1800 秒 | 每个 worker 最大运行秒数；handler 允许 config fallback，并拒绝 0。[E: codex-rs/tools/src/agent_job_tool.rs:43][E: codex-rs/tools/src/agent_job_tool.rs:45][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:317][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:559] |
| `output_schema` | object | 否 | omitted/`None`; worker prompt displays `{}` | 期望 worker 按该 JSON Schema 返回 `result`；handler 存入 job 的 `output_schema_json`，worker prompt 会 pretty-print 该 schema，缺省时 prompt 显示 `{}`。`report_agent_job_result` 只校验 `result` 是 JSON object，不执行该 schema 的结构校验。[E: codex-rs/tools/src/agent_job_tool.rs:50][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:51][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:329][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1004][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1009][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:476] |

parameters required 为 `csv_path` 和 `instruction`，additionalProperties 为 false。[E: codex-rs/tools/src/agent_job_tool.rs:61]

## 4 输出 schema & 截断

ToolSpec 的 `output_schema` 是 `None`，但 runtime 成功时返回 serialized `SpawnAgentsOnCsvResult` JSON 文本。[E: codex-rs/tools/src/agent_job_tool.rs:62][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:449]

runtime result 包含 `job_id`、`status`、`output_csv_path`、`total_items`、`completed_items`、`failed_items`、`job_error`、`failed_item_errors`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:67][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:68][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:69][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:70][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:71][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:72][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:73][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:74]

该工具没有在 schema 或 handler 中暴露输出截断字段[I]；失败摘要最多取 5 个 failed items 用于 `failed_item_errors`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:415][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:418]

## 5 ToolSpec 类型

`spawn_agents_on_csv` 是 function tool，`strict: false`、`defer_loading: None`、object parameters。[E: codex-rs/tools/src/agent_job_tool.rs:55][E: codex-rs/tools/src/agent_job_tool.rs:59][E: codex-rs/tools/src/agent_job_tool.rs:60][E: codex-rs/tools/src/agent_job_tool.rs:61]

handler 只接受 `ToolPayload::Function`，并根据 tool name 在同一个 `BatchJobHandler` 中分派。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:183][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:188][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:209]

## 6 注册与门控

`spawn_agents_on_csv` 在 `config.agent_jobs_tools` 为 true 时注册。[E: codex-rs/tools/src/tool_registry_plan.rs:480]

`ToolsConfig::new` 由 `Feature::SpawnCsv` 计算 `agent_jobs_tools`；feature dependency 还会在启用 `SpawnCsv` 但未启用 `Collab` 时自动启用 `Collab`。[E: codex-rs/tools/src/tool_config.rs:148][E: codex-rs/tools/src/tool_config.rs:233][E: codex-rs/features/src/lib.rs:442]

注册时 `supports_parallel_tool_calls` 为 false，handler 名 `spawn_agents_on_csv` 绑定到 `ToolHandlerKind::AgentJobs`。[E: codex-rs/tools/src/tool_registry_plan.rs:481][E: codex-rs/tools/src/tool_registry_plan.rs:483][E: codex-rs/tools/src/tool_registry_plan.rs:486]

## 7 parallel-safe

`spawn_agents_on_csv` 显式不是 parallel-safe。[E: codex-rs/tools/src/tool_registry_plan.rs:483]

一次调用会要求 SQLite state DB、创建 agent job、标记 job running、spawn 多个 worker、持续更新 progress、导出 CSV；这些动作会改变 agent job 状态与协作树状态[I]。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:239][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:518][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:321][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:352][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:632][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:737][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:805]

## 8 handler 走读

1. Core registry 将 `ToolHandlerKind::AgentJobs` 注册为 `BatchJobHandler`。[E: codex-rs/core/src/tools/spec.rs:192]
2. `BatchJobHandler` 按 tool name 分派；`spawn_agents_on_csv` 调用 `spawn_agents_on_csv::handle`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:209][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:210]
3. Handler 解析 args，拒绝空 instruction，读取 CSV，解析 header 和 rows，并要求 header 非空且唯一。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:232][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:233][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:242][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:249][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:252][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:255][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:257]
4. Handler 为每行生成 `AgentJobItemCreateParams`，使用 `id_column` 或 `row-{index}` 生成 item id，并对重复 id 加后缀。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:271][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:287][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:292][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:302]
5. Handler 创建 job，记录 input/output path、headers、instruction、max runtime、output schema。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:321][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:326][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:329][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:331]
6. Handler 计算 effective concurrency，标记 job running，并发出 background event 报告 requested/max/effective concurrency。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:341][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:352][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:361]
7. `run_agent_job_loop` 恢复 running items，按 concurrency 取 pending rows，为每个 item 构造 worker prompt 并 spawn sub-agent，session source label 为 `agent_job:{job_id}`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:567][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:581][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:614][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:624][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:632][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:636]
8. Worker prompt 明确要求 worker 调用 `report_agent_job_result` exactly once，并传入 job_id、item_id、result object；如果 worker final status 到达但 item 没有 `result_json`，finalizer 将该 item 标记为失败。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1021][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1024][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:976][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:984]
9. Loop 结束后导出 job CSV；若 cancelled，则报告 pending items、发送最终 progress 后提前返回，job 保持 cancelled；未取消时若有 failed items 则发 background event，随后标记 completed 并返回最终 JSON。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:749][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:750][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:757][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:760][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:770][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:771][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:773][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:778][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:449]

## 9 设计动机、edge、历史

`spawn_agents_on_csv` 是 fanout 工具[I]：registry test 显示启用 `Feature::SpawnCsv` 并 normalize dependencies 后，tool set 包含 legacy collab tools 和 `spawn_agents_on_csv`。[E: codex-rs/tools/src/tool_registry_plan_tests.rs:333][E: codex-rs/tools/src/tool_registry_plan_tests.rs:336][E: codex-rs/tools/src/tool_registry_plan_tests.rs:359][E: codex-rs/tools/src/tool_registry_plan_tests.rs:360][E: codex-rs/tools/src/tool_registry_plan_tests.rs:361][E: codex-rs/tools/src/tool_registry_plan_tests.rs:362][E: codex-rs/tools/src/tool_registry_plan_tests.rs:363]

CSV parser 使用 `csv::ReaderBuilder`、要求 headers、跳过全空 row，并移除首 header 的 UTF-8 BOM。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1106][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1110][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1113][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1119]

导出的 CSV 会追加 job metadata 与 result fields，包括 `job_id`、`item_id`、`status`、`last_error`、`result_json`、`reported_at`、`completed_at`。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1134][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1135][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1138][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1140][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1141][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1142][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1143][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1180][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:1191]

## Sources

- codex-rs/tools/src/agent_job_tool.rs
- codex-rs/tools/src/tool_registry_plan.rs
- codex-rs/tools/src/tool_config.rs
- codex-rs/features/src/lib.rs
- codex-rs/core/src/tools/spec.rs
- codex-rs/core/src/tools/handlers/agent_jobs.rs
- codex-rs/tools/src/tool_registry_plan_tests.rs

## 相关

- [report_agent_job_result 工具](report-agent-job-result.md)
- [spawn_agent (V1) 工具](spawn-agent-v1.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
