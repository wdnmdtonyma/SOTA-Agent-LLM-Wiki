---
id: tool.code-mode-exec
title: exec code-mode 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/ext/guardian-reviewer/src/settings.rs, codex-rs/core/src/tools/code_mode/execute_spec.rs, codex-rs/core/src/tools/code_mode/execute_handler.rs, codex-rs/core/src/tools/code_mode/mod.rs, codex-rs/core/src/guardian/tests.rs, codex-rs/code-mode-protocol/src/lib.rs, codex-rs/code-mode-protocol/src/runtime.rs, codex-rs/code-mode-protocol/src/description.rs, codex-rs/code-mode-runtime/src/service.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [create_code_mode_tool, CodeModeExecuteHandler, PUBLIC_TOOL_NAME, ExecuteRequest]
related: [tool.code-mode-wait, tool.exec-command, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> code-mode `exec` 是 un-namespaced freeform JavaScript tool。`spec_plan.rs` 在 code mode 有效时 prepend `exec` 和 companion `wait`，并把当前可用于 code mode 的 nested tools 放进 `exec` description/runtime。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `PUBLIC_TOOL_NAME` 是 `exec`；handler 返回 plain `exec`。[E: codex-rs/code-mode-protocol/src/lib.rs:52][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:175][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:176] |
| spec | `create_code_mode_tool` 返回 `ToolSpec::Freeform`，format 是 lark grammar，name 是 `exec`。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:9][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:28][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:29][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:40] |
| payload | handler 只匹配 `ToolPayload::Custom`，并要求 tool name 是 un-namespaced `exec`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:231][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:256][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:257] |

## 注册与门控

`finalize_tool_router` 在 code mode 生效时先移除旧 plain `exec`/`wait`，再调用 `register_code_mode_executors`。注册器遍历最终 registry，过滤不可嵌套 exposure，规范化 nested tool 名称并跳过碰撞，最后依次 prepend `wait` 与 `exec`。[E: codex-rs/core/src/tools/spec_plan.rs:358][E: codex-rs/core/src/tools/spec_plan.rs:360][E: codex-rs/core/src/tools/spec_plan.rs:366][E: codex-rs/core/src/tools/spec_plan.rs:413][E: codex-rs/core/src/tools/spec_plan.rs:819][E: codex-rs/core/src/tools/spec_plan.rs:836][E: codex-rs/core/src/tools/spec_plan.rs:893][E: codex-rs/core/src/tools/spec_plan.rs:936]

`create_code_mode_tool` 现在还接收 `ImageDetailVisibility`。`unified_image_budget_enabled` 为真时，code-mode exec description 隐藏 image detail；否则保持 Visible。[E: codex-rs/core/src/tools/spec_plan.rs:916][E: codex-rs/core/src/tools/spec_plan.rs:922][E: codex-rs/core/src/tools/spec_plan.rs:923][E: codex-rs/core/src/tools/spec_plan.rs:925][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:15][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:36]

Guardian reviewer 用 `reviewer_tool_policy()`：allowed tools 是 `exec_command` / `write_stdin` / `view_image` / `exec` / `wait`，并 `require_managed_sandbox`。[E: codex-rs/ext/guardian-reviewer/src/settings.rs:32][E: codex-rs/ext/guardian-reviewer/src/settings.rs:39][E: codex-rs/core/src/tools/spec_plan.rs:1018] 这并不阻止 code-mode：`build_tool_router` 仍调用 `finalize_tool_router`；若 guardian 模型 `effective_tool_mode` 是 `CodeMode` / `CodeModeOnly`，就会 prepend `exec`/`wait`，并把上述受限工具嵌进 `exec` description。[E: codex-rs/core/src/tools/spec_plan.rs:181][E: codex-rs/core/src/tools/spec_plan.rs:359][E: codex-rs/core/src/tools/spec_plan.rs:932][E: codex-rs/core/src/tools/spec_plan.rs:936] 集成测试断言 guardian 可见 `exec`/`wait`，nested 名为 `exec_command` / `view_image` / `write_stdin`。[E: codex-rs/core/src/guardian/tests.rs:2341][E: codex-rs/core/src/guardian/tests.rs:2356]

## 输入与 pragma

`exec` 的 freeform grammar 接受纯 source，或第一行 `// @exec:...` 后跟 source；`SOURCE` 至少包含一个字符。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:19][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:20][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:21][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:23][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:25]

runtime parser `parse_exec_source` 拒绝空白 input；pragma 必须后接 JavaScript source，JSON object 只支持 `yield_time_ms` 和 `max_output_tokens` 字段。[E: codex-rs/code-mode-protocol/src/description.rs:176][E: codex-rs/code-mode-protocol/src/description.rs:177][E: codex-rs/code-mode-protocol/src/description.rs:196][E: codex-rs/code-mode-protocol/src/description.rs:204][E: codex-rs/code-mode-protocol/src/description.rs:220][E: codex-rs/code-mode-protocol/src/description.rs:221]

`ExecuteRequest` 包含 call id、enabled tools、source、optional yield time 和 optional max output tokens；默认 exec yield time 是 10000 ms。[E: codex-rs/code-mode-protocol/src/runtime.rs:15][E: codex-rs/code-mode-protocol/src/runtime.rs:20][E: codex-rs/code-mode-protocol/src/runtime.rs:21][E: codex-rs/code-mode-protocol/src/runtime.rs:22][E: codex-rs/code-mode-protocol/src/runtime.rs:23][E: codex-rs/code-mode-protocol/src/runtime.rs:24][E: codex-rs/code-mode-protocol/src/runtime.rs:25][E: codex-rs/code-mode-runtime/src/service.rs:80][E: codex-rs/code-mode-runtime/src/service.rs:71]

## Handler 流程

handler parse raw source，收集 nested tool definitions，并向 session code-mode service 发送 `ExecuteRequest`；service 用 `SessionRuntime::execute` 运行 request，生成 protocol cell id，并返回 `StartedCell`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:45][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:46][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:85][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:89][E: codex-rs/code-mode-runtime/src/service.rs:80][E: codex-rs/code-mode-runtime/src/service.rs:74][E: codex-rs/code-mode-runtime/src/service.rs:82][E: codex-rs/code-mode-runtime/src/service.rs:93]

core 记录 code-cell trace，标记 cell ready for dispatch，等待 initial response；如果 initial response 不是 `Yielded`，会记录 ended 并 finish dispatch。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:122][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:116][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:133][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:142][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:145][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:150]

`handle_runtime_response` 把 `Yielded`/`Terminated`/`Result` 转成 function output items、sanitize image detail、按 token budget truncate，并 prepends script status；`Result` 的 success 取决于 `error_text.is_none()`。[E: codex-rs/core/src/tools/code_mode/mod.rs:254][E: codex-rs/core/src/tools/code_mode/mod.rs:264][E: codex-rs/core/src/tools/code_mode/mod.rs:301][E: codex-rs/core/src/tools/code_mode/mod.rs:291][E: codex-rs/core/src/tools/code_mode/mod.rs:268][E: codex-rs/core/src/tools/code_mode/mod.rs:269][E: codex-rs/core/src/tools/code_mode/mod.rs:283][E: codex-rs/core/src/tools/code_mode/mod.rs:285]

`exec` cannot invoke itself from code-mode nested tool calls.[E: codex-rs/core/src/tools/code_mode/mod.rs:368][E: codex-rs/core/src/tools/code_mode/mod.rs:369]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/ext/guardian-reviewer/src/settings.rs
- codex-rs/core/src/tools/code_mode/execute_spec.rs
- codex-rs/core/src/tools/code_mode/execute_handler.rs
- codex-rs/core/src/tools/code_mode/mod.rs
- codex-rs/core/src/guardian/tests.rs
- codex-rs/code-mode-protocol/src/lib.rs
- codex-rs/code-mode-protocol/src/runtime.rs
- codex-rs/code-mode-protocol/src/description.rs
- codex-rs/code-mode-runtime/src/service.rs
- codex-rs/tools/src/tool_executor.rs

## 相关

- [wait code-mode 工具](code-mode-wait.md) — companion `wait`，poll / terminate yielded cell。
- [exec_command 工具](exec-command.md) — guardian code-mode 下可嵌套的命令执行工具。
