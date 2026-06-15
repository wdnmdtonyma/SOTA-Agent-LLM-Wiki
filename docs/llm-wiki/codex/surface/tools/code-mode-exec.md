---
id: tool.code-mode-exec
title: exec code-mode 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/code_mode.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/code-mode/src/lib.rs, codex-rs/code-mode/src/description.rs, codex-rs/code-mode/src/runtime/mod.rs, codex-rs/code-mode/src/service.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/code_mode/mod.rs, codex-rs/core/src/tools/code_mode/execute_handler.rs, codex-rs/core/src/session/mod.rs]
symbols: [create_code_mode_tool, ToolHandlerKind::CodeModeExecute, CodeModeExecuteHandler, PUBLIC_TOOL_NAME, ExecuteRequest]
related: [tool.code-mode-wait, tool.js-repl, tool.shell, tool.exec-command, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> code-mode `exec` 是 freeform JavaScript execution surface。[E: codex-rs/tools/src/code_mode.rs:154] 它把 nested Codex tools 暴露给 runtime，允许 JS cell 调工具、yield、保存 stored values，并通过 `wait` 继续轮询长运行 cell。[E: codex-rs/tools/src/tool_registry_plan.rs:101][E: codex-rs/core/src/tools/code_mode/mod.rs:119][E: codex-rs/code-mode/src/runtime/mod.rs:45][E: codex-rs/core/src/tools/code_mode/mod.rs:188][E: codex-rs/tools/src/tool_registry_plan.rs:127]

## 能回答的问题

- code-mode `exec` 的 wire name 为什么是 `exec`，不是 `code_mode_exec`?
- 它的 freeform grammar、pragma 与 schema 是什么?
- registry 如何构造 nested tool definitions 并传给 description?
- handler 如何把 raw JS source 变成 `ExecuteRequest`?
- code-mode 为什么会注册 `wait` companion tool?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `exec`; `codex_code_mode::PUBLIC_TOOL_NAME` 常量固定为 `"exec"`。[E: codex-rs/code-mode/src/lib.rs:31] |
| aliases | registry plan 使用 `codex_code_mode::PUBLIC_TOOL_NAME` 作为 canonical handler name。[E: codex-rs/tools/src/tool_registry_plan.rs:122][E: codex-rs/tools/src/tool_registry_plan.rs:123] |
| ToolHandlerKind | `ToolHandlerKind::CodeModeExecute` 是 registry plan 的 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:17] |
| concrete handler | `core/src/tools/spec.rs` 把 `ToolHandlerKind::CodeModeExecute` 注册到 `code_mode_handler`。[E: codex-rs/core/src/tools/spec.rs:203][E: codex-rs/core/src/tools/spec.rs:204] |
| 所属 crate | schema 在 `codex_tools::code_mode`; runtime/service 在 `codex_code_mode`; handler wrapper 在 `codex_core::tools::code_mode`。[E: codex-rs/tools/src/code_mode.rs:138][E: codex-rs/code-mode/src/service.rs:52][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:13] |

## 2 用途定位

code-mode `exec` 运行 freeform JavaScript source，并可在运行时调用 nested Codex tools。registry 在创建 `exec` 前先构造 nested tool registry plan，再收集可作为 code-mode nested tools 的 definitions，传入 `create_code_mode_tool`。[E: codex-rs/tools/src/tool_registry_plan.rs:93][E: codex-rs/tools/src/tool_registry_plan.rs:94][E: codex-rs/tools/src/tool_registry_plan.rs:101][E: codex-rs/tools/src/tool_registry_plan.rs:110] code-mode runtime 的 `ExecuteRequest` 包含 enabled tools、source、stored values、yield time 和 max output tokens。[E: codex-rs/code-mode/src/runtime/mod.rs:29][E: codex-rs/code-mode/src/runtime/mod.rs:30][E: codex-rs/code-mode/src/runtime/mod.rs:31][E: codex-rs/code-mode/src/runtime/mod.rs:32][E: codex-rs/code-mode/src/runtime/mod.rs:33]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| raw source | custom/freeform text | 是 | 无 | `create_code_mode_tool` 返回 `ToolSpec::Freeform`，name 是 `PUBLIC_TOOL_NAME`。[E: codex-rs/tools/src/code_mode.rs:154][E: codex-rs/tools/src/code_mode.rs:155] | handler 只接受 `ToolPayload::Custom`，并要求 tool name 是 `exec`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:62][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:77] |
| pragma | first-line directive | 否 | runtime defaults | grammar 允许第一行 `// @exec:...`，然后跟 `SOURCE`。[E: codex-rs/tools/src/code_mode.rs:146][E: codex-rs/tools/src/code_mode.rs:149] | handler 调用 `codex_code_mode::parse_exec_source` 解析 raw code，解析失败会变成 model-facing error。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:23][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:24] |
| `yield_time_ms` | pragma-derived | 否 | `10_000` | `ExecuteRequest.yield_time_ms` 是 `Option<u64>`。[E: codex-rs/code-mode/src/runtime/mod.rs:32] | service 启动 session control 时使用 `request.yield_time_ms.unwrap_or(DEFAULT_EXEC_YIELD_TIME_MS)`；默认常量为 `10_000`。[E: codex-rs/code-mode/src/service.rs:108][E: codex-rs/code-mode/src/runtime/mod.rs:21] |
| `max_output_tokens` | pragma-derived | 否 | runtime resolve [I] | `ExecuteRequest.max_output_tokens` 是 `Option<usize>`；runtime module 定义 code-mode exec 默认最大输出 token 常量 `10_000`。[E: codex-rs/code-mode/src/runtime/mod.rs:33][E: codex-rs/code-mode/src/runtime/mod.rs:23] | output truncation 通过 `resolve_max_tokens(max_output_tokens)` 执行。[E: codex-rs/core/src/tools/code_mode/mod.rs:240] |

freeform grammar 的 `SOURCE` 是 `[\s\S]+`，因此 source body 至少需要一个字符。[E: codex-rs/tools/src/code_mode.rs:151]

## 4 输出

`exec` 没有 JSON output schema，因为它是 `ToolSpec::Freeform`。[E: codex-rs/tools/src/code_mode.rs:154] core wrapper 的 `handle_runtime_response` 会把 runtime response 转成 `FunctionToolOutput` content items: `Yielded` 分支转换 content items、sanitize、truncate、prepend status header 并返回 success true；`Terminated` 分支走同样的 formatter；`Result` 分支会在 formatter 中替换 stored values、附加 script error、truncate、prepend status header，并把 success 设为 `error_text.is_none()`。[E: codex-rs/core/src/tools/code_mode/mod.rs:163][E: codex-rs/core/src/tools/code_mode/mod.rs:164][E: codex-rs/core/src/tools/code_mode/mod.rs:165][E: codex-rs/core/src/tools/code_mode/mod.rs:166][E: codex-rs/core/src/tools/code_mode/mod.rs:167][E: codex-rs/core/src/tools/code_mode/mod.rs:168][E: codex-rs/core/src/tools/code_mode/mod.rs:170][E: codex-rs/core/src/tools/code_mode/mod.rs:175][E: codex-rs/core/src/tools/code_mode/mod.rs:177][E: codex-rs/core/src/tools/code_mode/mod.rs:188][E: codex-rs/core/src/tools/code_mode/mod.rs:190][E: codex-rs/core/src/tools/code_mode/mod.rs:196][E: codex-rs/core/src/tools/code_mode/mod.rs:197][E: codex-rs/core/src/tools/code_mode/mod.rs:198]

status header 包含 `Script running with cell ID ...`、`Script terminated`、`Script completed` 或 `Script failed`，再加 wall time 和 `Output:`。[E: codex-rs/core/src/tools/code_mode/mod.rs:212][E: codex-rs/core/src/tools/code_mode/mod.rs:215][E: codex-rs/core/src/tools/code_mode/mod.rs:218][E: codex-rs/core/src/tools/code_mode/mod.rs:220][E: codex-rs/core/src/tools/code_mode/mod.rs:232] 如果 runtime 返回 `Result`，core 会用 response 中的 `stored_values` 替换 session code-mode stored values。[E: codex-rs/core/src/tools/code_mode/mod.rs:177][E: codex-rs/core/src/tools/code_mode/mod.rs:179][E: codex-rs/core/src/tools/code_mode/mod.rs:185][E: codex-rs/core/src/tools/code_mode/mod.rs:188]

## 5 ToolSpec 类型

`exec` 是 `ToolSpec::Freeform(FreeformTool)`，format 是 grammar/lark。[E: codex-rs/tools/src/code_mode.rs:154][E: codex-rs/tools/src/code_mode.rs:162][E: codex-rs/tools/src/code_mode.rs:165] registry 还会在 code-mode 开启时用 `augment_tool_spec_for_code_mode` 改写其他工具 description，给 nested tool 调用补 code-mode-specific exec samples。[E: codex-rs/tools/src/code_mode.rs:13][E: codex-rs/tools/src/tool_registry_plan_types.rs:107][E: codex-rs/tools/src/tool_registry_plan_types.rs:111]

## 6 注册与门控

`exec` 只在 `config.code_mode_enabled` 为 true 时注册。[E: codex-rs/tools/src/tool_registry_plan.rs:78][E: codex-rs/tools/src/tool_registry_plan.rs:120] `ToolsConfig::new` 用 `Feature::CodeMode` 设置 `code_mode_enabled`，用 `Feature::CodeModeOnly` 设置 `code_mode_only_enabled`，且 code-mode-only 要求 code-mode 已开启。[E: codex-rs/tools/src/tool_config.rs:141][E: codex-rs/tools/src/tool_config.rs:142][E: codex-rs/tools/src/tool_config.rs:222]

session 初始化时，如果 `Feature::CodeMode` 开启但兼容 Node runtime 解析失败，会禁用 `Feature::CodeMode` 并记录 `Disabled exec...` startup warning。[E: codex-rs/core/src/session/mod.rs:502][E: codex-rs/core/src/session/mod.rs:505][E: codex-rs/core/src/session/mod.rs:506][E: codex-rs/core/src/session/mod.rs:509][E: codex-rs/core/src/session/mod.rs:510]

registry 构造 nested plan 时调用 `config.for_code_mode_nested_tools()`，该方法复制 config 并关闭 `code_mode_enabled` 与 `code_mode_only_enabled`，避免 `exec` 在自己的 nested tool set 中递归出现。[E: codex-rs/tools/src/tool_config.rs:300][E: codex-rs/tools/src/tool_config.rs:301][E: codex-rs/tools/src/tool_config.rs:302][E: codex-rs/tools/src/tool_config.rs:303][I]

## 7 parallel-safe

`exec` 的 plan-level `supports_parallel_tool_calls` 是 false。[E: codex-rs/tools/src/tool_registry_plan.rs:109][E: codex-rs/tools/src/tool_registry_plan.rs:119] code-mode service 有共享 `stored_values` 与 session map，同一 service 会为每个 execute 分配 cell id 并管理 running sessions。[E: codex-rs/code-mode/src/service.rs:45][E: codex-rs/code-mode/src/service.rs:46][E: codex-rs/code-mode/src/service.rs:49][E: codex-rs/code-mode/src/service.rs:80][E: codex-rs/code-mode/src/service.rs:90][E: codex-rs/code-mode/src/service.rs:98] 禁用 parallel 可以避免多个 top-level JS cells 同时更新 stored values 或竞争 nested tool worker 顺序。[I]

## 8 handler 走读

1. `CodeModeExecuteHandler::matches_kind` 只接受 `ToolPayload::Custom`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:61][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:62]
2. `handle` 要求 tool name namespace 为空且 name 等于 `PUBLIC_TOOL_NAME`，否则返回 `exec expects raw JavaScript source text`。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:75][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:82]
3. `execute` 先调用 `parse_exec_source` 解析 raw source 和 pragma。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:23][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:24]
4. handler 构造 `ExecContext`，调用 `build_enabled_tools` 构造 runtime 可见 nested tool definitions。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:25][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:26]
5. handler 读取现有 `stored_values`，然后调用 `code_mode_service.execute(ExecuteRequest { ... })`，并把 call id、enabled tools、source、stored values、yield time 和 max output tokens 写入请求。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:27][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:38][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:39][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:40][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:41][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:42][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:43][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:44]
6. service 为请求分配新的 `cell_id`，spawn runtime，插入 sessions map，并启动 session control worker。[E: codex-rs/code-mode/src/service.rs:80][E: codex-rs/code-mode/src/service.rs:83][E: codex-rs/code-mode/src/service.rs:86][E: codex-rs/code-mode/src/service.rs:90][E: codex-rs/code-mode/src/service.rs:98]
7. core wrapper 的 `CoreTurnHost::invoke_tool` 让 runtime 内 JS 可以调用 nested Codex tools。[E: codex-rs/core/src/tools/code_mode/mod.rs:119][E: codex-rs/core/src/tools/code_mode/mod.rs:125][E: codex-rs/core/src/tools/code_mode/mod.rs:132]
8. nested call 会构造 `ToolCall` 并以 `ToolCallSource::CodeMode` 交给 `ToolCallRuntime` 处理，最后把 result 转成 code-mode JSON value。[E: codex-rs/core/src/tools/code_mode/mod.rs:336][E: codex-rs/core/src/tools/code_mode/mod.rs:342][E: codex-rs/core/src/tools/code_mode/mod.rs:344]

## 9 设计动机·edge·历史

code-mode 只把 `ToolSpec::Function`、`ToolSpec::Freeform` 与 namespace function 转换成 nested tool definitions；`ToolSpec::LocalShell`、image generation、tool search 和 web search 被排除。[E: codex-rs/tools/src/code_mode.rs:181][E: codex-rs/tools/src/code_mode.rs:193][E: codex-rs/tools/src/code_mode.rs:204][E: codex-rs/tools/src/code_mode.rs:221][E: codex-rs/tools/src/code_mode.rs:224] 这表明 nested tool set 是经过显式白名单转换的，而不是把所有 visible tools 原样塞进 JS runtime。[I]

`call_nested_tool` 明确禁止 `exec` 调用自己，避免递归 code-mode execution。[E: codex-rs/core/src/tools/code_mode/mod.rs:309][E: codex-rs/core/src/tools/code_mode/mod.rs:312]

## Sources

- `codex-rs/tools/src/code_mode.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/code-mode/src/lib.rs`
- `codex-rs/code-mode/src/description.rs`
- `codex-rs/code-mode/src/runtime/mod.rs`
- `codex-rs/code-mode/src/service.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/code_mode/mod.rs`
- `codex-rs/core/src/tools/code_mode/execute_handler.rs`
- `codex-rs/core/src/session/mod.rs`

## 相关

- [wait 工具](code-mode-wait.md)
- [js_repl 工具](js-repl.md)
