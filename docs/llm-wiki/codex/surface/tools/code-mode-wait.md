---
id: tool.code-mode-wait
title: wait code-mode 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/code_mode/wait_spec.rs, codex-rs/core/src/tools/code_mode/wait_handler.rs, codex-rs/core/src/tools/code_mode/mod.rs, codex-rs/code-mode-protocol/src/lib.rs, codex-rs/code-mode-protocol/src/runtime.rs, codex-rs/code-mode-runtime/src/service.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_wait_tool, CodeModeWaitHandler, WAIT_TOOL_NAME, WaitRequest, WaitOutcome]
related: [tool.code-mode-exec, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 7750465934
---

> code-mode `wait` 是 `exec` 的 companion function tool：它用 cell id poll yielded JavaScript cell，或终止 running cell，并把 runtime response 交给和 `exec` 相同的 formatter。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `WAIT_TOOL_NAME` 是 `wait`；handler 返回 plain `wait`。[E: codex-rs/code-mode-protocol/src/lib.rs:47][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:48][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:50] |
| spec | `create_wait_tool` 返回 `ToolSpec::Function`，name 是 `wait`，`strict: false`，`output_schema: None`。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:6][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:32][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:33][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:39][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:45] |
| payload | handler 只接受 un-namespaced `wait` 的 function payload；否则返回 JSON arguments error。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:74][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:84][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:85][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:156] |

## 注册与门控

`wait` 不单独 gate；`finalize_tool_router` 在 code mode 生效时移除已有 plain `exec`/`wait`，`register_code_mode_executors` 再把 companion `wait` 与 `exec` 一起 prepend 到 registry。[E: codex-rs/core/src/tools/spec_plan.rs:243][E: codex-rs/core/src/tools/spec_plan.rs:249][E: codex-rs/core/src/tools/spec_plan.rs:263][E: codex-rs/core/src/tools/spec_plan.rs:593][E: codex-rs/core/src/tools/spec_plan.rs:594]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:73][E: codex-rs/tools/src/tool_executor.rs:74]

## 输入

| 字段 | 必填 | 说明 |
|---|---:|---|
| `cell_id` | 是 | running `exec` cell id；schema required 只包含该字段。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:9][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:40][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:42][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:25][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:26] |
| `yield_time_ms` | 否 | 等待更多输出再 yield 的毫秒数；serde default 是 `DEFAULT_WAIT_YIELD_TIME_MS`，当前常量是 10000。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:13][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:15][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:28][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:35][E: codex-rs/code-mode-protocol/src/runtime.rs:12] |
| `max_tokens` | 否 | 传给 shared formatter 的 output budget。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:19][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:21][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:30][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:151] |
| `terminate` | 否 | default false；true 时 handler 调用 `code_mode_service.terminate`，否则调用 `wait`。[E: codex-rs/core/src/tools/code_mode/wait_spec.rs:25][E: codex-rs/core/src/tools/code_mode/wait_spec.rs:27][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:32][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:93][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:100] |

## Handler 流程

handler parse JSON arguments，构造 `CellId`，然后根据 `terminate` 分支调用 service；service wait path 找不到或已关闭 cell 时返回 missing wait outcome，terminate path 找不到或已关闭 cell 时返回 `MissingCell` response。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:78][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:92][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:93][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:103][E: codex-rs/code-mode-runtime/src/service.rs:112][E: codex-rs/code-mode-runtime/src/service.rs:142][E: codex-rs/code-mode-runtime/src/service.rs:143][E: codex-rs/code-mode-runtime/src/service.rs:149][E: codex-rs/code-mode-runtime/src/service.rs:152][E: codex-rs/code-mode-runtime/src/service.rs:153]

`WaitRequest` 只包含 `cell_id` 和 `yield_time_ms`； `WaitOutcome` 是 `LiveCell(RuntimeResponse)` 或 `MissingCell(RuntimeResponse)`，并能转换回 `RuntimeResponse`。[E: codex-rs/code-mode-protocol/src/runtime.rs:25][E: codex-rs/code-mode-protocol/src/runtime.rs:26][E: codex-rs/code-mode-protocol/src/runtime.rs:27][E: codex-rs/code-mode-protocol/src/runtime.rs:36][E: codex-rs/code-mode-protocol/src/runtime.rs:37][E: codex-rs/code-mode-protocol/src/runtime.rs:38][E: codex-rs/code-mode-protocol/src/runtime.rs:57][E: codex-rs/code-mode-protocol/src/runtime.rs:60]

如果 live-cell wait 返回非-yielded runtime response，handler 记录 code-cell ended 并 finish dispatch；随后无论 live/missing 都把 response 交给 `handle_runtime_response`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:99][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:114][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:110][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:133][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:120][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:151]

shared formatter 的输出规则与 `exec` 相同：runtime response 转 function output items、sanitize、truncate、prepend script status，`Result` 的 success 来自 `error_text.is_none()`。[E: codex-rs/core/src/tools/code_mode/mod.rs:223][E: codex-rs/core/src/tools/code_mode/mod.rs:232][E: codex-rs/core/src/tools/code_mode/mod.rs:233][E: codex-rs/core/src/tools/code_mode/mod.rs:234][E: codex-rs/core/src/tools/code_mode/mod.rs:235][E: codex-rs/core/src/tools/code_mode/mod.rs:236][E: codex-rs/core/src/tools/code_mode/mod.rs:239][E: codex-rs/core/src/tools/code_mode/mod.rs:242][E: codex-rs/core/src/tools/code_mode/mod.rs:253][E: codex-rs/core/src/tools/code_mode/mod.rs:259][E: codex-rs/core/src/tools/code_mode/mod.rs:260]

`CodeModeWaitHandler` 明确让 pre/post tool-use hook payload 返回 `None`，因为 wait 是已有 code cell 的 runtime control，不是独立用户动作。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:169][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:170][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:175][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:178][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:185]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/code_mode/wait_spec.rs
- codex-rs/core/src/tools/code_mode/wait_handler.rs
- codex-rs/core/src/tools/code_mode/mod.rs
- codex-rs/code-mode-protocol/src/lib.rs
- codex-rs/code-mode-protocol/src/runtime.rs
- codex-rs/code-mode-runtime/src/service.rs
- codex-rs/tools/src/tool_executor.rs
