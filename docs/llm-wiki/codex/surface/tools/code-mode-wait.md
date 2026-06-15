---
id: tool.code-mode-wait
title: wait code-mode 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/code_mode.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/code-mode/src/lib.rs, codex-rs/code-mode/src/runtime/mod.rs, codex-rs/code-mode/src/service.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/code_mode/mod.rs, codex-rs/core/src/tools/code_mode/wait_handler.rs]
symbols: [create_wait_tool, ToolHandlerKind::CodeModeWait, CodeModeWaitHandler, WAIT_TOOL_NAME, WaitRequest]
related: [tool.code-mode-exec, tool.js-repl, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> code-mode `wait` 是 `exec` 的 companion function tool。它用 cell id 轮询 yielded JavaScript cell，或终止正在运行的 cell，并把结果走同一套 code-mode output formatter。[E: codex-rs/code-mode/src/lib.rs:32][E: codex-rs/tools/src/code_mode.rs:120][E: codex-rs/code-mode/src/service.rs:116][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:75][E: codex-rs/core/src/tools/code_mode/mod.rs:154]

## 能回答的问题

- `wait` 的 wire name、input schema 和默认值是什么?
- `wait` 什么时候随 `exec` 注册?
- handler 如何解析 JSON arguments 并调用 code-mode service?
- `terminate` 字段如何改变 service 行为?
- `wait` 输出如何和 `exec` 保持一致?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `wait`; `codex_code_mode::WAIT_TOOL_NAME` 常量固定为 `"wait"`。[E: codex-rs/code-mode/src/lib.rs:32] |
| aliases | registry plan 使用 `WAIT_TOOL_NAME` 作为 canonical handler name。[E: codex-rs/tools/src/tool_registry_plan.rs:131][E: codex-rs/tools/src/tool_registry_plan.rs:132] |
| ToolHandlerKind | `ToolHandlerKind::CodeModeWait` 是 registry plan 的 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:18] |
| concrete handler | `core/src/tools/spec.rs` 把 `ToolHandlerKind::CodeModeWait` 注册到 `code_mode_wait_handler`。[E: codex-rs/core/src/tools/spec.rs:206][E: codex-rs/core/src/tools/spec.rs:207] |
| 所属 crate | schema 在 `codex_tools::code_mode`; service/runtime 在 `codex_code_mode`; handler wrapper 在 `codex_core::tools::code_mode`。[E: codex-rs/tools/src/code_mode.rs:93][E: codex-rs/code-mode/src/service.rs:116][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:15] |

## 2 用途定位

`wait` 的 description 明确说它等待 yielded `exec` cell 并返回新输出或 completion。[E: codex-rs/tools/src/code_mode.rs:122][E: codex-rs/tools/src/code_mode.rs:123][E: codex-rs/tools/src/code_mode.rs:125] runtime response 支持 `Yielded`、`Terminated` 和 `Result` 三种状态，因此 `wait` 既可以继续轮询，也可以在 terminate 时把 cell 结束状态返回给模型。[E: codex-rs/code-mode/src/runtime/mod.rs:45][E: codex-rs/code-mode/src/runtime/mod.rs:49][E: codex-rs/code-mode/src/runtime/mod.rs:53][E: codex-rs/code-mode/src/service.rs:129][E: codex-rs/code-mode/src/service.rs:130][E: codex-rs/code-mode/src/service.rs:132][E: codex-rs/code-mode/src/service.rs:137]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `cell_id` | `string` | 是 | 无 | schema 描述为 running exec cell 的 identifier。[E: codex-rs/tools/src/code_mode.rs:96][E: codex-rs/tools/src/code_mode.rs:97] | `ExecWaitArgs.cell_id` 是 required string；handler 把它传给 `WaitRequest.cell_id`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:19][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:69] |
| `yield_time_ms` | `number` | 否 | `10_000` | schema 描述为等待更多输出再 yield 的毫秒数。[E: codex-rs/tools/src/code_mode.rs:100][E: codex-rs/tools/src/code_mode.rs:101][E: codex-rs/tools/src/code_mode.rs:102] | serde default 调用 `default_wait_yield_time_ms()`，该函数返回 `DEFAULT_WAIT_YIELD_TIME_MS`；runtime 常量为 `10_000`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:20][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:29][E: codex-rs/code-mode/src/runtime/mod.rs:22] |
| `max_tokens` | `number` | 否 | runtime resolve [I] | schema 描述为本次 wait 最大输出 token 数。[E: codex-rs/tools/src/code_mode.rs:107][E: codex-rs/tools/src/code_mode.rs:108][E: codex-rs/tools/src/code_mode.rs:109] | handler 把 `args.max_tokens` 传给 `handle_runtime_response`；truncation 通过 `resolve_max_tokens` 解析缺省值。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:75][E: codex-rs/core/src/tools/code_mode/mod.rs:240] |
| `terminate` | `boolean` | 否 | false | schema 描述为是否终止 running exec cell。[E: codex-rs/tools/src/code_mode.rs:113][E: codex-rs/tools/src/code_mode.rs:115] | serde default 为 false；handler 把它传给 `WaitRequest.terminate`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:24][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:71] |

`create_wait_tool` 的 required 列表只包含 `cell_id`，`additionalProperties` 为 false。[E: codex-rs/tools/src/code_mode.rs:128][E: codex-rs/tools/src/code_mode.rs:131]

## 4 输出

`wait` 不声明 output schema。[E: codex-rs/tools/src/code_mode.rs:133] handler 把 service response 交给 shared `handle_runtime_response`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:75][E: codex-rs/core/src/tools/code_mode/mod.rs:154] 这个 formatter 对 `Yielded`、`Terminated` 和 `Result` response 分别转换 content items、sanitize image detail、truncate token 输出、prepend status header，并在 `Result` 分支用 `error_text` 生成 success flag。[E: codex-rs/core/src/tools/code_mode/mod.rs:163][E: codex-rs/core/src/tools/code_mode/mod.rs:165][E: codex-rs/core/src/tools/code_mode/mod.rs:167][E: codex-rs/core/src/tools/code_mode/mod.rs:170][E: codex-rs/core/src/tools/code_mode/mod.rs:175][E: codex-rs/core/src/tools/code_mode/mod.rs:177][E: codex-rs/core/src/tools/code_mode/mod.rs:190][E: codex-rs/core/src/tools/code_mode/mod.rs:198]

如果 cell 已经不存在，service 返回 `missing_cell_response(cell_id)`，这是 service 层处理而不是 handler 自己报错。[E: codex-rs/code-mode/src/service.rs:125][E: codex-rs/code-mode/src/service.rs:126]

## 5 ToolSpec 类型

`wait` 是 `ToolSpec::Function(ResponsesApiTool)`，因为它用 JSON schema 表达 `cell_id`、polling、truncation 与 termination 参数。[E: codex-rs/tools/src/code_mode.rs:96][E: codex-rs/tools/src/code_mode.rs:100][E: codex-rs/tools/src/code_mode.rs:107][E: codex-rs/tools/src/code_mode.rs:113][E: codex-rs/tools/src/code_mode.rs:120][E: codex-rs/tools/src/code_mode.rs:128][E: codex-rs/tools/src/code_mode.rs:131] 与 freeform `exec` 不同，`wait` 是结构化控制操作，不需要 raw JavaScript body。[I]

## 6 注册与门控

`wait` 和 `exec` 在同一个 `if config.code_mode_enabled` 分支里注册。[E: codex-rs/tools/src/tool_registry_plan.rs:78][E: codex-rs/tools/src/tool_registry_plan.rs:126] plan 先推入 `exec`，再推入 `wait`，并分别注册 `CodeModeExecute` 与 `CodeModeWait` handler kind。[E: codex-rs/tools/src/tool_registry_plan.rs:109][E: codex-rs/tools/src/tool_registry_plan.rs:124][E: codex-rs/tools/src/tool_registry_plan.rs:127][E: codex-rs/tools/src/tool_registry_plan.rs:133]

由于 `wait` 依赖 `exec` yielded cell id，它没有独立 feature gate；`Feature::CodeMode` 被禁用时两者都不会出现。[E: codex-rs/tools/src/tool_config.rs:141][E: codex-rs/tools/src/tool_config.rs:221][I]

## 7 parallel-safe

`wait` 的 plan-level `supports_parallel_tool_calls` 是 false。[E: codex-rs/tools/src/tool_registry_plan.rs:126][E: codex-rs/tools/src/tool_registry_plan.rs:128] wait/terminate 直接操作 running session 的 control channel；并行多个 wait 或 terminate 同一 cell 会有顺序依赖，因此 registry 禁止 parallel calls。[E: codex-rs/code-mode/src/service.rs:129][E: codex-rs/code-mode/src/service.rs:132][E: codex-rs/code-mode/src/service.rs:137][I]

## 8 handler 走读

1. `CodeModeWaitHandler::handle` 只接受 tool name 为 `wait` 的 function payload；其他 payload 返回 `wait expects JSON arguments`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:57][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:59][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:79][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:80]
2. handler 用本地 `parse_arguments` 解析 JSON arguments；parse error 会变成 `failed to parse function arguments: ...`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:32][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:37][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:61]
3. handler 构造 `ExecContext` 并记录 `started_at`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:62][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:63]
4. handler 调用 `code_mode_service.wait(WaitRequest { cell_id, yield_time_ms, terminate })`。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:64][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:68][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:69][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:70][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:71][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:72]
5. service 用 `cell_id` 查 sessions map；找不到就返回 missing-cell response。[E: codex-rs/code-mode/src/service.rs:116][E: codex-rs/code-mode/src/service.rs:123][E: codex-rs/code-mode/src/service.rs:126]
6. 如果 `terminate` 为 true，service 发送 `SessionControlCommand::Terminate`；否则发送 `SessionControlCommand::Poll { yield_time_ms, ... }`，然后通过 `handle.control_tx.send(control_message)` 发给 running session。[E: codex-rs/code-mode/src/service.rs:129][E: codex-rs/code-mode/src/service.rs:130][E: codex-rs/code-mode/src/service.rs:132][E: codex-rs/code-mode/src/service.rs:133][E: codex-rs/code-mode/src/service.rs:137]
7. handler 将 response 与 `max_tokens` 交给 `handle_runtime_response` 输出。[E: codex-rs/core/src/tools/code_mode/wait_handler.rs:75][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:77]

## 9 设计动机·edge·历史

`wait` 使用 `max_tokens` 而 `exec` runtime request 字段名是 `max_output_tokens`；这体现了 wire surface 对 polling action 的短名设计，而 core formatter 最终仍走同一个 `max_output_tokens` 参数位置。[E: codex-rs/tools/src/code_mode.rs:107][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:23][E: codex-rs/core/src/tools/code_mode/wait_handler.rs:75][E: codex-rs/code-mode/src/runtime/mod.rs:33][E: codex-rs/core/src/tools/code_mode/mod.rs:157][I]

service 的 wait path 不直接删除不存在 cell 的错误，而是返回 missing-cell response；这让模型能收到普通 tool output 并继续恢复控制流，而不是让工具调用以 infrastructure error 结束。[E: codex-rs/code-mode/src/service.rs:125][E: codex-rs/code-mode/src/service.rs:126][I]

## Sources

- `codex-rs/tools/src/code_mode.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/code-mode/src/lib.rs`
- `codex-rs/code-mode/src/runtime/mod.rs`
- `codex-rs/code-mode/src/service.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/code_mode/mod.rs`
- `codex-rs/core/src/tools/code_mode/wait_handler.rs`

## 相关

- [exec 工具](code-mode-exec.md)
- [js_repl 工具](js-repl.md)
