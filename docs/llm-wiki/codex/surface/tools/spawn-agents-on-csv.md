---
id: tool.spawn-agents-on-csv
title: spawn_agents_on_csv 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/agent_jobs_spec.rs, codex-rs/core/src/tools/handlers/agent_jobs.rs, codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs, codex-rs/utils/absolute-path/src/lib.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_spawn_agents_on_csv_tool, SpawnAgentsOnCsvHandler, SpawnAgentsOnCsvArgs, SpawnAgentsOnCsvResult]
related: [tool.report-agent-job-result, tool.spawn-agent-v1, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 5670360009
---

> `spawn_agents_on_csv` 是 agent jobs 的 CSV fanout 工具：读取一个本地 CSV，把每行变成 job item，并为 pending items spawn worker sub-agent；worker 用 `report_agent_job_result` 写回结果。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | handler 返回 plain `spawn_agents_on_csv`，spec builder 也设置同名 function tool。[E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:17][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:19][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:63][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:64] |
| handler | `agent_jobs.rs` re-export `spawn_agents_on_csv::SpawnAgentsOnCsvHandler`；handler 只匹配 function payload。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:35][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:58][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:60] |
| spec | `create_spawn_agents_on_csv_tool` 返回 `ToolSpec::Function`，`strict: false`、`defer_loading: None`、`output_schema: None`。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:6][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:63][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:67][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:68][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:70] |

## 注册与门控

`agent_jobs_tools_enabled` 要求 `Feature::SpawnCsv` 已启用且 collaboration tools 已启用；满足时 `spec_plan.rs` 加入 `SpawnAgentsOnCsvHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:357][E: codex-rs/core/src/tools/spec_plan.rs:362][E: codex-rs/core/src/tools/spec_plan.rs:363][E: codex-rs/core/src/tools/spec_plan.rs:841][E: codex-rs/core/src/tools/spec_plan.rs:842]

handler 没有覆写 `supports_parallel_tool_calls`，所以按 `ToolExecutor` 默认不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入

| 字段 | 必填 | 说明 |
|---|---:|---|
| `csv_path` | 是 | 本地 CSV 路径；handler 要求 exactly one local/native environment，并用该 environment cwd 的 `AbsolutePathBuf::join` 解析路径：relative path 相对 cwd，absolute path 由 helper 规范化为 absolute path。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:17][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:69][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:81][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:83][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:85][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:302][E: codex-rs/utils/absolute-path/src/lib.rs:93][E: codex-rs/utils/absolute-path/src/lib.rs:94] |
| `instruction` | 是 | 每行的 instruction template；空白会被拒绝。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:21][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:23][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:74][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:75] |
| `id_column` | 否 | 可选稳定 item id 列；找不到 header 返回错误，空值回退 `row-{index}`，重复 id 加数字后缀。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:28][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:102][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:107][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:126][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:130][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:135] |
| `output_csv_path` | 否 | 未提供时写到输入旁边的默认路径；提供时也通过同一个 cwd `join` helper 解析，所以 relative path 相对 cwd，absolute path 保持 absolute。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:34][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:153][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:155][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:156][E: codex-rs/utils/absolute-path/src/lib.rs:93][E: codex-rs/utils/absolute-path/src/lib.rs:94] |
| `max_concurrency` / `max_workers` | 否 | `max_workers` 是 alias；handler 取 `max_concurrency.or(max_workers)`，再按默认 16、硬上限 64 和 agent max threads normalize。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:40][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:48][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:184][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:38][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:39][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:134][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:136] |
| `max_runtime_seconds` | 否 | per-worker runtime cap；0 被拒绝，缺省可由 config fallback。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:54][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:160][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:162][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:144][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:148] |
| `output_schema` | 否 | JSON schema description 被保存到 job 的 `output_schema_json`；runtime 仍只要求 report tool 的 `result` 是 JSON object。[E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:7][E: codex-rs/core/src/tools/handlers/agent_jobs_spec.rs:12][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:172][E: codex-rs/core/src/tools/handlers/agent_jobs/report_agent_job_result.rs:63] |

## Handler 流程

handler 读取并解析 CSV，要求 header 非空且唯一，并要求每行字段数与 header 数一致。[E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:92][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:95][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:100][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:116][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:121]

每行被转换成 `AgentJobItemCreateParams`，再和 job metadata 一起写入 state DB；随后 job 被标记为 running 并进入 `run_agent_job_loop`。[E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:145][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:164][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:165][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:177][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:195][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:202]

job loop 按 concurrency 取 pending items，构造 worker prompt 并通过 `spawn_agent_with_metadata` 启动 worker；worker 的 session source label 是 `agent_job:{job_id}`，这是 `report_agent_job_result` worker-only 门控的依据。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:186][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:188][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:196][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:201][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:204][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:207][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:208]

loop 结束后会导出 CSV snapshot；如果 job 没有被取消，则标记 completed。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:316][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:322][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:323][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:326]

## 输出

成功 output 是 serialized `SpawnAgentsOnCsvResult` 文本，包含 `job_id`、`status`、`output_csv_path`、总数/完成/失败计数、`job_error` 和最多 5 条 failed item summaries。[E: codex-rs/core/src/tools/handlers/agent_jobs.rs:64][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:65][E: codex-rs/core/src/tools/handlers/agent_jobs.rs:72][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:248][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:253][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:284][E: codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs:299]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/agent_jobs_spec.rs
- codex-rs/core/src/tools/handlers/agent_jobs.rs
- codex-rs/core/src/tools/handlers/agent_jobs/spawn_agents_on_csv.rs
- codex-rs/utils/absolute-path/src/lib.rs
- codex-rs/tools/src/tool_executor.rs
