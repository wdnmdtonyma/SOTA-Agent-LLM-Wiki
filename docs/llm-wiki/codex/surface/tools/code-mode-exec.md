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
updated: 9ded177ce7
---

> code-mode `exec` 是 un-namespaced freeform JavaScript tool。`spec_plan.rs` 在 code mode 有效时 prepend `exec` 和 companion `wait`，并把当前可用于 code mode 的 nested tools 放进 `exec` description/runtime。

## Identity

| 项 | 当前源码事实 |
|---|---|
| wire name | `PUBLIC_TOOL_NAME` 是 `exec`；handler 返回 plain `exec`。[E: codex-rs/code-mode-protocol/src/lib.rs:50][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:140][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:141] |
| spec | `create_code_mode_tool` 返回 `ToolSpec::Freeform`，format 是 lark grammar，name 是 `exec`。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:8][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:26][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:27][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:37] |
| payload | handler 只匹配 `ToolPayload::Custom`，并要求 tool name 是 un-namespaced `exec`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:175][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:193][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:194] |

## 注册与门控

`finalize_tool_router` 在 code mode 生效时先移除旧 plain `exec`/`wait`，再调用 `register_code_mode_executors`。注册器遍历最终 registry，过滤不可嵌套 exposure，规范化 nested tool 名称并跳过碰撞，最后依次 prepend `wait` 与 `exec`。[E: codex-rs/core/src/tools/spec_plan.rs:324][E: codex-rs/core/src/tools/spec_plan.rs:328][E: codex-rs/core/src/tools/spec_plan.rs:334][E: codex-rs/core/src/tools/spec_plan.rs:375][E: codex-rs/core/src/tools/spec_plan.rs:709][E: codex-rs/core/src/tools/spec_plan.rs:724][E: codex-rs/core/src/tools/spec_plan.rs:811][E: codex-rs/core/src/tools/spec_plan.rs:812]

`create_code_mode_tool` 现在还接收 `ImageDetailVisibility`。`unified_image_budget_enabled` 为真时，code-mode exec description 隐藏 image detail；否则保持 Visible。[E: codex-rs/core/src/tools/spec_plan.rs:801][E: codex-rs/core/src/tools/spec_plan.rs:803][E: codex-rs/core/src/tools/spec_plan.rs:805][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:14][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:34]

Guardian reviewer turn 不会进入普通 tool 注册，因此也不会安装 code-mode `exec`/`wait`。[E: codex-rs/core/src/tools/spec_plan.rs:147][E: codex-rs/core/src/tools/spec_plan.rs:896][E: codex-rs/core/src/tools/spec_plan.rs:930]

## 输入与 pragma

`exec` 的 freeform grammar 接受纯 source，或第一行 `// @exec:...` 后跟 source；`SOURCE` 至少包含一个字符。[E: codex-rs/core/src/tools/code_mode/execute_spec.rs:17][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:18][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:19][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:21][E: codex-rs/core/src/tools/code_mode/execute_spec.rs:23]

runtime parser `parse_exec_source` 拒绝空白 input；pragma 必须后接 JavaScript source，JSON object 只支持 `yield_time_ms` 和 `max_output_tokens` 字段。[E: codex-rs/code-mode-protocol/src/description.rs:168][E: codex-rs/code-mode-protocol/src/description.rs:169][E: codex-rs/code-mode-protocol/src/description.rs:188][E: codex-rs/code-mode-protocol/src/description.rs:196][E: codex-rs/code-mode-protocol/src/description.rs:212][E: codex-rs/code-mode-protocol/src/description.rs:213]

`ExecuteRequest` 包含 call id、enabled tools、source、optional yield time 和 optional max output tokens；默认 exec yield time 是 10000 ms。[E: codex-rs/code-mode-protocol/src/runtime.rs:11][E: codex-rs/code-mode-protocol/src/runtime.rs:16][E: codex-rs/code-mode-protocol/src/runtime.rs:17][E: codex-rs/code-mode-protocol/src/runtime.rs:18][E: codex-rs/code-mode-protocol/src/runtime.rs:19][E: codex-rs/code-mode-protocol/src/runtime.rs:20][E: codex-rs/code-mode-protocol/src/runtime.rs:21][E: codex-rs/code-mode-runtime/src/service.rs:77][E: codex-rs/code-mode-runtime/src/service.rs:78]

## Handler 流程

handler parse raw source，收集 nested tool definitions，并向 session code-mode service 发送 `ExecuteRequest`；service 用 `SessionRuntime::execute` 运行 request，生成 protocol cell id，并返回 `StartedCell`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:41][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:42][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:65][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:69][E: codex-rs/code-mode-runtime/src/service.rs:77][E: codex-rs/code-mode-runtime/src/service.rs:81][E: codex-rs/code-mode-runtime/src/service.rs:87][E: codex-rs/code-mode-runtime/src/service.rs:98]

core 记录 code-cell trace，标记 cell ready for dispatch，等待 initial response；如果 initial response 不是 `Yielded`，会记录 ended 并 finish dispatch。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:97][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:106][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:108][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:114][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:117][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:122]

`handle_runtime_response` 把 `Yielded`/`Terminated`/`Result` 转成 function output items、sanitize image detail、按 token budget truncate，并 prepends script status；`Result` 的 success 取决于 `error_text.is_none()`。[E: codex-rs/core/src/tools/code_mode/mod.rs:233][E: codex-rs/core/src/tools/code_mode/mod.rs:242][E: codex-rs/core/src/tools/code_mode/mod.rs:244][E: codex-rs/core/src/tools/code_mode/mod.rs:245][E: codex-rs/core/src/tools/code_mode/mod.rs:246][E: codex-rs/core/src/tools/code_mode/mod.rs:247][E: codex-rs/core/src/tools/code_mode/mod.rs:261][E: codex-rs/core/src/tools/code_mode/mod.rs:263]

`exec` cannot invoke itself from code-mode nested tool calls.[E: codex-rs/core/src/tools/code_mode/mod.rs:340][E: codex-rs/core/src/tools/code_mode/mod.rs:341][E: codex-rs/core/src/tools/code_mode/mod.rs:342]

handler 没有覆写 `supports_parallel_tool_calls`，所以按默认 trait 不是 parallel-safe。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123]

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
