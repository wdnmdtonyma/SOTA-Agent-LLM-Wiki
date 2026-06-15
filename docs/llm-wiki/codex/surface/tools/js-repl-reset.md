---
id: tool.js-repl-reset
title: js_repl_reset 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/js_repl_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/js_repl.rs, codex-rs/core/src/tools/js_repl/mod.rs, codex-rs/core/src/session/mod.rs, docs/js_repl.md]
symbols: [create_js_repl_reset_tool, ToolHandlerKind::JsReplReset, JsReplResetHandler]
related: [tool.js-repl, tool.code-mode-exec, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `js_repl_reset` 是 `js_repl` 的 companion function tool。它没有输入参数，重启 per-turn JS kernel，并清空 persisted top-level bindings。[E: codex-rs/tools/src/js_repl_tool.rs:41][E: codex-rs/tools/src/js_repl_tool.rs:44][E: codex-rs/tools/src/js_repl_tool.rs:48]

## 能回答的问题

- `js_repl_reset` 的 wire name、schema 和 output 是什么?
- 它和 `js_repl` 是否在同一个 feature gate 下注册?
- reset handler 如何找到 manager 并执行 reset?
- 为什么 reset 不支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `js_repl_reset`; constructor 把 `ResponsesApiTool.name` 固定为 `"js_repl_reset"`。[E: codex-rs/tools/src/js_repl_tool.rs:42] |
| aliases | registry plan 以 canonical name `"js_repl_reset"` 注册到 `ToolHandlerKind::JsReplReset`。[E: codex-rs/tools/src/tool_registry_plan.rs:233] |
| ToolHandlerKind | `ToolHandlerKind::JsReplReset` 是 registry plan 的 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:22] |
| concrete handler | `core/src/tools/spec.rs` 把 `ToolHandlerKind::JsReplReset` 注册到共享 `js_repl_reset_handler`。[E: codex-rs/core/src/tools/spec.rs:218][E: codex-rs/core/src/tools/spec.rs:219] |
| 所属 crate | schema 在 `codex_tools::js_repl_tool`; handler 在 `codex_core::tools::handlers::js_repl`。[E: codex-rs/tools/src/js_repl_tool.rs:40][E: codex-rs/core/src/tools/handlers/js_repl.rs:190] |

## 2 用途定位

`js_repl_reset` 清空 `js_repl` 的 kernel state。schema description 直接写明它会 restart kernel 并 clear persisted top-level bindings。[E: codex-rs/tools/src/js_repl_tool.rs:43][E: codex-rs/tools/src/js_repl_tool.rs:44] docs 也把它列为清除 kernel state 的方式。[E: docs/js_repl.md:71]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| 无字段 | JSON object | 否 | 无 | constructor 使用空 `BTreeMap` 构造参数 schema，没有 required 列表。[E: codex-rs/tools/src/js_repl_tool.rs:48] | handler body 不读取 arguments；它只检查 session feature 并使用 invocation 的 turn manager。[E: codex-rs/core/src/tools/handlers/js_repl.rs:198][E: codex-rs/core/src/tools/handlers/js_repl.rs:203][I] |

constructor 在 `JsonSchema::object` 的第三个参数传入 `Some(false.into())`，因此该空参数对象被构造为不接受额外字段。[E: codex-rs/tools/src/js_repl_tool.rs:48][I]

## 4 输出

`js_repl_reset` 不声明 output schema。[E: codex-rs/tools/src/js_repl_tool.rs:49] handler 成功时返回 plain text `js_repl kernel reset`，success 为 true。[E: codex-rs/core/src/tools/handlers/js_repl.rs:205][E: codex-rs/core/src/tools/handlers/js_repl.rs:206][E: codex-rs/core/src/tools/handlers/js_repl.rs:207]

## 5 ToolSpec 类型

`js_repl_reset` 是 `ToolSpec::Function(ResponsesApiTool)`，而不是 freeform tool。[E: codex-rs/tools/src/js_repl_tool.rs:41] Function shape 适合“无参数命令”语义:它只需要被调用一次，不需要 raw source body。[I]

## 6 注册与门控

`js_repl_reset` 和 `js_repl` 在同一个 `config.has_environment && config.js_repl_enabled` 分支里注册。[E: codex-rs/tools/src/tool_registry_plan.rs:221][E: codex-rs/tools/src/tool_registry_plan.rs:223][E: codex-rs/tools/src/tool_registry_plan.rs:228][E: codex-rs/tools/src/tool_registry_plan.rs:233] `ToolsConfig::new` 用 `Feature::JsRepl` 设置 `js_repl_enabled`，所以 reset 不会单独出现。[E: codex-rs/tools/src/tool_config.rs:143][E: codex-rs/tools/src/tool_config.rs:223]

session 初始化时，如果兼容 Node runtime 不可用，会禁用 `Feature::JsRepl` 和 `Feature::JsReplToolsOnly`。[E: codex-rs/core/src/session/mod.rs:485][E: codex-rs/core/src/session/mod.rs:489] 因此 `js_repl_reset` 的实际可用性也依赖同一个 Node runtime gate。[I]

## 7 parallel-safe

`js_repl_reset` 的 plan-level `supports_parallel_tool_calls` 是 false。[E: codex-rs/tools/src/tool_registry_plan.rs:228][E: codex-rs/tools/src/tool_registry_plan.rs:229] reset 会改变 persistent kernel state，如果和 `js_repl` cell 并行执行会产生顺序歧义，因此关闭 parallel tool calls。[E: codex-rs/tools/src/js_repl_tool.rs:44][I]

## 8 handler 走读

1. `JsReplResetHandler::handle` 先检查 session features 中 `Feature::JsRepl` 是否启用。[E: codex-rs/core/src/tools/handlers/js_repl.rs:198][E: codex-rs/core/src/tools/handlers/js_repl.rs:200]
2. handler 通过 `invocation.turn.js_repl.manager().await?` 取得 per-turn manager。[E: codex-rs/core/src/tools/handlers/js_repl.rs:203]
3. handler 调用 `manager.reset().await?`。[E: codex-rs/core/src/tools/handlers/js_repl.rs:204]
4. handler 返回 `FunctionToolOutput::from_text("js_repl kernel reset", Some(true))`。[E: codex-rs/core/src/tools/handlers/js_repl.rs:205][E: codex-rs/core/src/tools/handlers/js_repl.rs:207]

## 9 设计动机·edge·历史

`js_repl_reset` 复用 `invocation.turn.js_repl.manager()` 返回的 manager，而不是创建独立 runtime surface；这让 reset 的作用域与 `js_repl` 的 per-turn `OnceCell<Arc<JsReplManager>>` 一致。[E: codex-rs/core/src/tools/handlers/js_repl.rs:203][E: codex-rs/core/src/tools/handlers/js_repl.rs:204][E: codex-rs/core/src/tools/js_repl/mod.rs:68][E: codex-rs/core/src/tools/js_repl/mod.rs:72][E: codex-rs/core/src/tools/js_repl/mod.rs:93][I]

`js_repl_tools_only` 模式仍允许直接调用 `js_repl_reset`，因为 docs 明确说 direct model tool calls 限制到 `js_repl` 与 `js_repl_reset`，其他工具只留给 JS 内部 `codex.tool(...)`。[E: docs/js_repl.md:22]

## Sources

- `codex-rs/tools/src/js_repl_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/js_repl.rs`
- `codex-rs/core/src/tools/js_repl/mod.rs`
- `codex-rs/core/src/session/mod.rs`
- `docs/js_repl.md`

## 相关

- [js_repl 工具](js-repl.md)
- [exec 工具](code-mode-exec.md)
