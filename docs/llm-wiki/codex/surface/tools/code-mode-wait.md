---
id: tool.code-mode-wait
title: wait code-mode 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/code_mode/wait_spec.rs, codex-rs/core/src/tools/code_mode/wait_handler.rs, codex-rs/core/src/tools/code_mode/mod.rs, codex-rs/code-mode-protocol/src/lib.rs, codex-rs/code-mode-protocol/src/runtime.rs, codex-rs/code-mode/src/service.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_wait_tool, CodeModeWaitHandler, WAIT_TOOL_NAME, WaitRequest, WaitOutcome]
related: [tool.code-mode-exec, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 5670360009
---

> code-mode `wait` 是 `exec` 的 companion function tool：它用 cell id poll yielded JavaScript cell，或终止 running cell，并把 runtime response 交给和 `exec` 相同的 formatter。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `WAIT_TOOL_NAME` 是 `wait`；handler 返回 plain `wait`。[E: codex-rs/code-mode-protocol/src/lib.rs:45][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:47][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:49] |
| spec | `create_wait_tool` 返回 `ToolSpec::Function`，name 是 `wait`，`strict: false`，`output_schema: None`。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:6][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:32][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:33][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:39][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:45] |
| payload | handler 只接受 un-namespaced `wait` 的 function payload；否则返回 JSON arguments error。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:74][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:75][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:76][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:128] |

## 注册与门控

`wait` 不单独 gate；`build_code_mode_executors` 在 `CodeMode`/`CodeModeOnly` 下和 `exec` 同时返回 `CodeModeWaitHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:474][E: codex-rs/core/src/tools/spec_plan.rs:478][E: codex-rs/core/src/tools/spec_plan.rs:479][E: codex-rs/core/src/tools/spec_plan.rs:520][E: codex-rs/core/src/tools/spec_plan.rs:530]

reserved names 也在 code mode 有效时同时插入 `exec` 和 `wait`。[E: codex-rs/core/src/tools/spec_plan.rs:982][E: codex-rs/core/src/tools/spec_plan.rs:983][E: codex-rs/core/src/tools/spec_plan.rs:984][E: codex-rs/core/src/tools/spec_plan.rs:985]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 输入

| 字段 | 必填 | 说明 |
|---|---:|---|
| `cell_id` | 是 | running `exec` cell id；schema required 只包含该字段。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:9][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:40][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:42][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:24][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:25] |
| `yield_time_ms` | 否 | 等待更多输出再 yield 的毫秒数；serde default 是 `DEFAULT_WAIT_YIELD_TIME_MS`，当前常量是 10000。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:13][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:15][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:27][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:34][E: codex-rs/code-mode-protocol/src/runtime.rs:12] |
| `max_tokens` | 否 | 传给 shared formatter 的 output budget。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:19][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:21][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:29][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:123] |
| `terminate` | 否 | default false；true 时 handler 调用 `code_mode_service.terminate`，否则调用 `wait`。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:25][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:27][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:31][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:82][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:89] |

## Handler 流程

handler parse JSON arguments，构造 `CellId`，然后根据 `terminate` 分支调用 service；service wait path 找不到 cell 时返回 missing wait outcome，terminate path 找不到 cell 时返回 `MissingCell` response。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:78][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:81][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:82][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:92][E: codex-rs/code-mode/src/service.rs:196][E: codex-rs/code-mode/src/service.rs:208][E: codex-rs/code-mode/src/service.rs:210][E: codex-rs/code-mode/src/service.rs:220][E: codex-rs/code-mode/src/service.rs:223]

`WaitRequest` 只包含 `cell_id` 和 `yield_time_ms`； `WaitOutcome` 是 `LiveCell(RuntimeResponse)` 或 `MissingCell(RuntimeResponse)`，并能转换回 `RuntimeResponse`。[E: codex-rs/code-mode-protocol/src/runtime.rs:25][E: codex-rs/code-mode-protocol/src/runtime.rs:26][E: codex-rs/code-mode-protocol/src/runtime.rs:27][E: codex-rs/code-mode-protocol/src/runtime.rs:36][E: codex-rs/code-mode-protocol/src/runtime.rs:37][E: codex-rs/code-mode-protocol/src/runtime.rs:38][E: codex-rs/code-mode-protocol/src/runtime.rs:57][E: codex-rs/code-mode-protocol/src/runtime.rs:60]

如果 live-cell wait 返回非-yielded runtime response，handler 记录 code-cell ended 并 finish dispatch；随后无论 live/missing 都把 response 交给 `handle_runtime_response`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:99][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:105][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:110][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:117][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:120][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:123]

shared formatter 的输出规则与 `exec` 相同：runtime response 转 function output items、sanitize、truncate、prepend script status，`Result` 的 success 来自 `error_text.is_none()`。[E: codex-rs/core/src/tools/code_mode/mod.rs:146][E: codex-rs/core/src/tools/code_mode/mod.rs:153][E: codex-rs/core/src/tools/code_mode/mod.rs:156][E: codex-rs/core/src/tools/code_mode/mod.rs:160][E: codex-rs/core/src/tools/code_mode/mod.rs:167][E: codex-rs/core/src/tools/code_mode/mod.rs:174][E: codex-rs/core/src/tools/code_mode/mod.rs:180][E: codex-rs/core/src/tools/code_mode/mod.rs:181]

`CodeModeWaitHandler` 明确关闭 pre/post tool-use hook payload，因为 wait 是已有 code cell 的 runtime control，不是独立用户动作。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:135][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:136][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:137][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:144][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:149]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/code_mode/wait_spec.rs
- codex-rs/core/src/tools/code_mode/wait_handler.rs
- codex-rs/core/src/tools/code_mode/mod.rs
- codex-rs/code-mode-protocol/src/lib.rs
- codex-rs/code-mode-protocol/src/runtime.rs
- codex-rs/code-mode/src/service.rs
- codex-rs/tools/src/tool_executor.rs
