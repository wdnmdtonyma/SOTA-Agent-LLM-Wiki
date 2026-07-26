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
updated: 61a44880a8
---

> code-mode `exec` 是 un-namespaced freeform JavaScript tool。`spec_plan.rs` 在 code mode 有效时 prepend `exec` 和 companion `wait`，并把当前可用于 code mode 的 nested tools 放进 `exec` description/runtime。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `PUBLIC_TOOL_NAME` 是 `exec`；handler 返回 plain `exec`。[E: codex-rs/code-mode-protocol/src/lib.rs:46][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:95][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:97] |
| spec | `create_code_mode_tool` 返回 `ToolSpec::Freeform`，format 是 lark grammar，name 是 `exec`。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:7][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:24][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:25][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:33] |
| payload | handler 只匹配 `ToolPayload::Custom`，并要求 tool name 是 un-namespaced `exec`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:123][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:124][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:135][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:137] |

## 注册与门控

`build_tool_specs_and_registry` 先 `add_tool_sources`，再应用 direct-model-only namespace overrides、追加 `tool_search` executor，最后 `prepend_code_mode_executors`；后者调用 `build_code_mode_executors` 并把结果插到 runtime list 前面。[E: codex-rs/core/src/tools/spec_plan.rs:176][E: codex-rs/core/src/tools/spec_plan.rs:206][E: codex-rs/core/src/tools/spec_plan.rs:207][E: codex-rs/core/src/tools/spec_plan.rs:208][E: codex-rs/core/src/tools/spec_plan.rs:209][E: codex-rs/core/src/tools/spec_plan.rs:996][E: codex-rs/core/src/tools/spec_plan.rs:1001][E: codex-rs/core/src/tools/spec_plan.rs:1002]

`build_code_mode_executors` 只在 effective tool mode 是 `CodeMode` 或 `CodeModeOnly` 时返回 executors；否则返回空。[E: codex-rs/core/src/tools/spec_plan.rs:457][E: codex-rs/core/src/tools/spec_plan.rs:461][E: codex-rs/core/src/tools/spec_plan.rs:462][E: codex-rs/core/src/tools/spec_plan.rs:463]

它过滤 direct-model-only、hidden、excluded namespace tools，收集 code-mode nested tool specs 和 exec-prompt-visible tool definitions，然后返回 `CodeModeExecuteHandler` 与 `CodeModeWaitHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:471][E: codex-rs/core/src/tools/spec_plan.rs:472][E: codex-rs/core/src/tools/spec_plan.rs:476][E: codex-rs/core/src/tools/spec_plan.rs:480][E: codex-rs/core/src/tools/spec_plan.rs:491][E: codex-rs/core/src/tools/spec_plan.rs:493][E: codex-rs/core/src/tools/spec_plan.rs:524][E: codex-rs/core/src/tools/spec_plan.rs:534]

## 输入与 pragma

`exec` 的 freeform grammar 接受纯 source，或第一行 `// @exec:...` 后跟 source；`SOURCE` 至少包含一个字符。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:14][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:15][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:16][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:19][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:21]

runtime parser `parse_exec_source` 拒绝空白 input；pragma 必须后接 JavaScript source，JSON object 只支持 `yield_time_ms` 和 `max_output_tokens` 字段。[E: codex-rs/code-mode-protocol/src/description.rs:164][E: codex-rs/code-mode-protocol/src/description.rs:165][E: codex-rs/code-mode-protocol/src/description.rs:185][E: codex-rs/code-mode-protocol/src/description.rs:199][E: codex-rs/code-mode-protocol/src/description.rs:208][E: codex-rs/code-mode-protocol/src/description.rs:210]

`ExecuteRequest` 包含 call id、enabled tools、source、optional yield time 和 optional max output tokens；默认 exec yield time 是 10000 ms。[E: codex-rs/code-mode-protocol/src/runtime.rs:11][E: codex-rs/code-mode-protocol/src/runtime.rs:16][E: codex-rs/code-mode-protocol/src/runtime.rs:17][E: codex-rs/code-mode-protocol/src/runtime.rs:18][E: codex-rs/code-mode-protocol/src/runtime.rs:19][E: codex-rs/code-mode-protocol/src/runtime.rs:20][E: codex-rs/code-mode-protocol/src/runtime.rs:21][E: codex-rs/code-mode/src/service.rs:114][E: codex-rs/code-mode/src/service.rs:115]

## Handler 流程

handler parse raw source，收集 nested tool definitions，并向 session code-mode service 发送 `ExecuteRequest`；service 用 `SessionRuntime::execute` 运行 request，生成 protocol cell id，并返回 `StartedCell`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:36][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:39][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:46][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:49][E: codex-rs/code-mode/src/service.rs:114][E: codex-rs/code-mode/src/service.rs:116][E: codex-rs/code-mode/src/service.rs:118][E: codex-rs/code-mode/src/service.rs:124][E: codex-rs/code-mode/src/service.rs:135]

core 记录 code-cell trace，标记 cell ready for dispatch，等待 initial response；如果 initial response 不是 `Yielded`，会记录 ended 并 finish dispatch。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:57][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:61][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:67][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:71][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:78][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:81][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:86]

`handle_runtime_response` 把 `Yielded`/`Terminated`/`Result` 转成 function output items、sanitize image detail、按 token budget truncate，并 prepends script status；`Result` 的 success 取决于 `error_text.is_none()`。[E: codex-rs/core/src/tools/code_mode/mod.rs:199][E: codex-rs/core/src/tools/code_mode/mod.rs:208][E: codex-rs/core/src/tools/code_mode/mod.rs:209][E: codex-rs/core/src/tools/code_mode/mod.rs:210][E: codex-rs/core/src/tools/code_mode/mod.rs:211][E: codex-rs/core/src/tools/code_mode/mod.rs:212][E: codex-rs/core/src/tools/code_mode/mod.rs:215][E: codex-rs/core/src/tools/code_mode/mod.rs:218][E: codex-rs/core/src/tools/code_mode/mod.rs:229][E: codex-rs/core/src/tools/code_mode/mod.rs:235][E: codex-rs/core/src/tools/code_mode/mod.rs:236]

`exec` cannot invoke itself from code-mode nested tool calls.[E: codex-rs/core/src/tools/code_mode/mod.rs:306][E: codex-rs/core/src/tools/code_mode/mod.rs:307][E: codex-rs/core/src/tools/code_mode/mod.rs:308]

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
