---
id: tool.code-mode-exec
title: exec code-mode 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/code_mode/execute_spec.rs, codex-rs/core/src/tools/code_mode/execute_handler.rs, codex-rs/core/src/tools/code_mode/mod.rs, codex-rs/code-mode-protocol/src/lib.rs, codex-rs/code-mode-protocol/src/runtime.rs, codex-rs/code-mode-protocol/src/description.rs, codex-rs/code-mode/src/service.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_code_mode_tool, CodeModeExecuteHandler, PUBLIC_TOOL_NAME, ExecuteRequest]
related: [tool.code-mode-wait, tool.exec-command, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 5670360009
---

> code-mode `exec` 是 un-namespaced freeform JavaScript tool。`spec_plan.rs` 在 code mode 有效时 prepend `exec` 和 companion `wait`，并把当前可用于 code mode 的 nested tools 放进 `exec` description/runtime。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `PUBLIC_TOOL_NAME` 是 `exec`；handler 返回 plain `exec`。[E: codex-rs/code-mode-protocol/src/lib.rs:44][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:94][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:96] |
| spec | `create_code_mode_tool` 返回 `ToolSpec::Freeform`，format 是 lark grammar，name 是 `exec`。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:7][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:23][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:24][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:31] |
| payload | handler 只匹配 `ToolPayload::Custom`，并要求 tool name 是 un-namespaced `exec`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:122][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:123][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:134][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:136] |

## 注册与门控

`build_core_tool_plan` 先 `add_tool_sources`，再 `prepend_code_mode_executors`；后者调用 `build_code_mode_executors` 并把结果插到 runtime list 前面。[E: codex-rs/core/src/tools/spec_plan.rs:193][E: codex-rs/core/src/tools/spec_plan.rs:194][E: codex-rs/core/src/tools/spec_plan.rs:197][E: codex-rs/core/src/tools/spec_plan.rs:959][E: codex-rs/core/src/tools/spec_plan.rs:964][E: codex-rs/core/src/tools/spec_plan.rs:965]

`build_code_mode_executors` 只在 effective tool mode 是 `CodeMode` 或 `CodeModeOnly` 时返回 executors；否则返回空。[E: codex-rs/core/src/tools/spec_plan.rs:474][E: codex-rs/core/src/tools/spec_plan.rs:478][E: codex-rs/core/src/tools/spec_plan.rs:479][E: codex-rs/core/src/tools/spec_plan.rs:480]

它过滤 hidden/direct-model-only/excluded tools，收集 code-mode nested tool specs 和 exec-prompt-visible tool definitions，然后返回 `CodeModeExecuteHandler` 与 `CodeModeWaitHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:483][E: codex-rs/core/src/tools/spec_plan.rs:487][E: codex-rs/core/src/tools/spec_plan.rs:489][E: codex-rs/core/src/tools/spec_plan.rs:497][E: codex-rs/core/src/tools/spec_plan.rs:515][E: codex-rs/core/src/tools/spec_plan.rs:520][E: codex-rs/core/src/tools/spec_plan.rs:521][E: codex-rs/core/src/tools/spec_plan.rs:530]

## 输入与 pragma

`exec` 的 freeform grammar 接受纯 source，或第一行 `// @exec:...` 后跟 source；`SOURCE` 至少包含一个字符。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:13][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:14][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:15][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:18][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:20]

runtime parser `parse_exec_source` 拒绝空白 input；pragma 必须后接 JavaScript source，JSON object 只支持 `yield_time_ms` 和 `max_output_tokens` 字段。[E: codex-rs/code-mode-protocol/src/description.rs:163][E: codex-rs/code-mode-protocol/src/description.rs:164][E: codex-rs/code-mode-protocol/src/description.rs:184][E: codex-rs/code-mode-protocol/src/description.rs:198][E: codex-rs/code-mode-protocol/src/description.rs:207][E: codex-rs/code-mode-protocol/src/description.rs:209]

`ExecuteRequest` 包含 call id、enabled tools、source、optional yield time 和 optional max output tokens；默认 exec yield time 是 10000 ms。[E: codex-rs/code-mode-protocol/src/runtime.rs:11][E: codex-rs/code-mode-protocol/src/runtime.rs:16][E: codex-rs/code-mode-protocol/src/runtime.rs:17][E: codex-rs/code-mode-protocol/src/runtime.rs:18][E: codex-rs/code-mode-protocol/src/runtime.rs:19][E: codex-rs/code-mode-protocol/src/runtime.rs:20][E: codex-rs/code-mode-protocol/src/runtime.rs:21][E: codex-rs/code-mode/src/service.rs:130][E: codex-rs/code-mode/src/service.rs:131]

## Handler 流程

handler parse raw source，收集 nested tool definitions，从 session code-mode service execute request；service 分配 cell id、启动 cell，并返回 `StartedCell`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:36][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:39][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:46][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:49][E: codex-rs/code-mode/src/service.rs:130][E: codex-rs/code-mode/src/service.rs:132][E: codex-rs/code-mode/src/service.rs:184][E: codex-rs/code-mode/src/service.rs:190]

core 记录 code-cell trace，标记 cell ready for dispatch，等待 initial response；如果 initial response 不是 `Yielded`，会记录 ended 并 finish dispatch。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:57][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:61][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:67][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:71][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:78][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:81][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:86]

`handle_runtime_response` 把 `Yielded`/`Terminated`/`Result` 转成 function output items、sanitize image detail、按 token budget truncate，并 prepends script status；`Result` 的 success 取决于 `error_text.is_none()`。[E: codex-rs/core/src/tools/code_mode/mod.rs:146][E: codex-rs/core/src/tools/code_mode/mod.rs:153][E: codex-rs/core/src/tools/code_mode/mod.rs:156][E: codex-rs/core/src/tools/code_mode/mod.rs:157][E: codex-rs/core/src/tools/code_mode/mod.rs:160][E: codex-rs/core/src/tools/code_mode/mod.rs:167][E: codex-rs/core/src/tools/code_mode/mod.rs:174][E: codex-rs/core/src/tools/code_mode/mod.rs:180][E: codex-rs/core/src/tools/code_mode/mod.rs:181]

`exec` cannot invoke itself from code-mode nested tool calls.[E: codex-rs/core/src/tools/code_mode/mod.rs:251][E: codex-rs/core/src/tools/code_mode/mod.rs:252][E: codex-rs/core/src/tools/code_mode/mod.rs:253]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/code_mode/execute_spec.rs
- codex-rs/core/src/tools/code_mode/execute_handler.rs
- codex-rs/core/src/tools/code_mode/mod.rs
- codex-rs/code-mode-protocol/src/lib.rs
- codex-rs/code-mode-protocol/src/runtime.rs
- codex-rs/code-mode-protocol/src/description.rs
- codex-rs/code-mode/src/service.rs
- codex-rs/tools/src/tool_executor.rs
