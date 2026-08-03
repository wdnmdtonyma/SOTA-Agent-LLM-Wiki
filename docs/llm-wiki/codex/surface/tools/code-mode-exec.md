---
id: tool.code-mode-exec
title: exec code-mode 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/code_mode/execute_spec.rs, codex-rs/core/src/tools/code_mode/execute_handler.rs, codex-rs/core/src/tools/code_mode/mod.rs, codex-rs/code-mode-protocol/src/lib.rs, codex-rs/code-mode-protocol/src/runtime.rs, codex-rs/code-mode-protocol/src/description.rs, codex-rs/code-mode-runtime/src/service.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_code_mode_tool, CodeModeExecuteHandler, PUBLIC_TOOL_NAME, ExecuteRequest]
related: [tool.code-mode-wait, tool.exec-command, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 7750465934
---

> code-mode `exec` 是 un-namespaced freeform JavaScript tool。`spec_plan.rs` 在 code mode 有效时 prepend `exec` 和 companion `wait`，并把当前可用于 code mode 的 nested tools 放进 `exec` description/runtime。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `PUBLIC_TOOL_NAME` 是 `exec`；handler 返回 plain `exec`。[E: codex-rs/code-mode-protocol/src/lib.rs:47][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:118][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:120] |
| spec | `create_code_mode_tool` 返回 `ToolSpec::Freeform`，format 是 lark grammar，name 是 `exec`。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:7][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:24][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:25][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:33] |
| payload | handler 只匹配 `ToolPayload::Custom`，并要求 tool name 是 un-namespaced `exec`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:123][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:154][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:171][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:173] |

## 注册与门控

`finalize_tool_router` 在 code mode 生效时先移除旧 plain `exec`/`wait`，再调用 `register_code_mode_executors`。注册器遍历最终 registry，过滤不可嵌套 exposure，规范化 nested tool 名称并跳过碰撞，最后依次 prepend `wait` 与 `exec`。[E: codex-rs/core/src/tools/spec_plan.rs:243][E: codex-rs/core/src/tools/spec_plan.rs:249][E: codex-rs/core/src/tools/spec_plan.rs:263][E: codex-rs/core/src/tools/spec_plan.rs:507][E: codex-rs/core/src/tools/spec_plan.rs:521][E: codex-rs/core/src/tools/spec_plan.rs:538][E: codex-rs/core/src/tools/spec_plan.rs:551][E: codex-rs/core/src/tools/spec_plan.rs:593][E: codex-rs/core/src/tools/spec_plan.rs:594]

## 输入与 pragma

`exec` 的 freeform grammar 接受纯 source，或第一行 `// @exec:...` 后跟 source；`SOURCE` 至少包含一个字符。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:14][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:15][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:16][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:19][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:21]

runtime parser `parse_exec_source` 拒绝空白 input；pragma 必须后接 JavaScript source，JSON object 只支持 `yield_time_ms` 和 `max_output_tokens` 字段。[E: codex-rs/code-mode-protocol/src/description.rs:164][E: codex-rs/code-mode-protocol/src/description.rs:165][E: codex-rs/code-mode-protocol/src/description.rs:185][E: codex-rs/code-mode-protocol/src/description.rs:199][E: codex-rs/code-mode-protocol/src/description.rs:208][E: codex-rs/code-mode-protocol/src/description.rs:210]

`ExecuteRequest` 包含 call id、enabled tools、source、optional yield time 和 optional max output tokens；默认 exec yield time 是 10000 ms。[E: codex-rs/code-mode-protocol/src/runtime.rs:11][E: codex-rs/code-mode-protocol/src/runtime.rs:16][E: codex-rs/code-mode-protocol/src/runtime.rs:17][E: codex-rs/code-mode-protocol/src/runtime.rs:18][E: codex-rs/code-mode-protocol/src/runtime.rs:19][E: codex-rs/code-mode-protocol/src/runtime.rs:20][E: codex-rs/code-mode-protocol/src/runtime.rs:21][E: codex-rs/code-mode-runtime/src/service.rs:68][E: codex-rs/code-mode-runtime/src/service.rs:69]

## Handler 流程

handler parse raw source，收集 nested tool definitions，并向 session code-mode service 发送 `ExecuteRequest`；service 用 `SessionRuntime::execute` 运行 request，生成 protocol cell id，并返回 `StartedCell`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:38][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:41][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:48][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:51][E: codex-rs/code-mode-runtime/src/service.rs:68][E: codex-rs/code-mode-runtime/src/service.rs:70][E: codex-rs/code-mode-runtime/src/service.rs:72][E: codex-rs/code-mode-runtime/src/service.rs:78][E: codex-rs/code-mode-runtime/src/service.rs:89]

core 记录 code-cell trace，标记 cell ready for dispatch，等待 initial response；如果 initial response 不是 `Yielded`，会记录 ended 并 finish dispatch。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:72][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:76][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:82][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:86][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:93][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:96][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:101]

`handle_runtime_response` 把 `Yielded`/`Terminated`/`Result` 转成 function output items、sanitize image detail、按 token budget truncate，并 prepends script status；`Result` 的 success 取决于 `error_text.is_none()`。[E: codex-rs/core/src/tools/code_mode/mod.rs:223][E: codex-rs/core/src/tools/code_mode/mod.rs:232][E: codex-rs/core/src/tools/code_mode/mod.rs:233][E: codex-rs/core/src/tools/code_mode/mod.rs:234][E: codex-rs/core/src/tools/code_mode/mod.rs:235][E: codex-rs/core/src/tools/code_mode/mod.rs:236][E: codex-rs/core/src/tools/code_mode/mod.rs:239][E: codex-rs/core/src/tools/code_mode/mod.rs:242][E: codex-rs/core/src/tools/code_mode/mod.rs:253][E: codex-rs/core/src/tools/code_mode/mod.rs:259][E: codex-rs/core/src/tools/code_mode/mod.rs:260]

`exec` cannot invoke itself from code-mode nested tool calls.[E: codex-rs/core/src/tools/code_mode/mod.rs:330][E: codex-rs/core/src/tools/code_mode/mod.rs:331][E: codex-rs/core/src/tools/code_mode/mod.rs:332]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:73][E: codex-rs/tools/src/tool_executor.rs:74]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/code_mode/execute_spec.rs
- codex-rs/core/src/tools/code_mode/execute_handler.rs
- codex-rs/core/src/tools/code_mode/mod.rs
- codex-rs/code-mode-protocol/src/lib.rs
- codex-rs/code-mode-protocol/src/runtime.rs
- codex-rs/code-mode-protocol/src/description.rs
- codex-rs/code-mode-runtime/src/service.rs
- codex-rs/tools/src/tool_executor.rs
