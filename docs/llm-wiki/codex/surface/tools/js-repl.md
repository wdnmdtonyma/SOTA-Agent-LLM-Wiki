---
id: tool.js-repl
title: js_repl 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/js_repl_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/js_repl.rs, codex-rs/core/src/tools/js_repl/mod.rs, codex-rs/core/src/tools/router.rs, docs/js_repl.md]
symbols: [create_js_repl_tool, ToolHandlerKind::JsRepl, JsReplHandler, JsReplArgs, JS_REPL_PRAGMA_PREFIX]
related: [tool.js-repl-reset, tool.code-mode-exec, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `js_repl` 是持久 Node kernel 的 freeform JavaScript surface。模型发送 raw JavaScript source，可选第一行 pragma 设置 timeout，top-level bindings 在同一 run 内跨调用保留。[E: docs/js_repl.md:3][E: codex-rs/tools/src/js_repl_tool.rs:30][E: codex-rs/core/src/tools/js_repl/mod.rs:974][E: docs/js_repl.md:62]

## 能回答的问题

- `js_repl` 的 freeform grammar 如何限制 JSON/quoted/markdown fence?
- `js_repl` 的 feature gate、Node runtime gate 与 `js_repl_tools_only` 有什么区别?
- handler 如何解析 custom/function payload?
- 默认 timeout 是多少，pragma 如何覆盖?
- nested `codex.tool(...)` 与 image output 的文档约束在哪里?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `js_repl`; constructor 把 `FreeformTool.name` 固定为 `"js_repl"`。[E: codex-rs/tools/src/js_repl_tool.rs:29] |
| aliases | registry plan 注册 `"js_repl"` 到 `ToolHandlerKind::JsRepl`。[E: codex-rs/tools/src/tool_registry_plan.rs:232] |
| ToolHandlerKind | `ToolHandlerKind::JsRepl` 是 registry plan 的 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:21] |
| concrete handler | `core/src/tools/spec.rs` 把 `ToolHandlerKind::JsRepl` 注册到共享 `js_repl_handler`。[E: codex-rs/core/src/tools/spec.rs:215][E: codex-rs/core/src/tools/spec.rs:216] |
| 所属文件 | schema constructor 在 `codex-rs/tools/src/js_repl_tool.rs`; handler/runtime 在 `codex-rs/core/src/tools/handlers/js_repl.rs` 和 `codex-rs/core/src/tools/js_repl/mod.rs`。[E: codex-rs/tools/src/js_repl_tool.rs:8][E: codex-rs/core/src/tools/handlers/js_repl.rs:94][E: codex-rs/core/src/tools/js_repl/mod.rs:93] |

## 2 用途定位

`js_repl` 在持久 Node-backed kernel 中运行 JavaScript，并支持 top-level await；官方 docs 明确说它是 persistent Node-backed kernel。[E: docs/js_repl.md:3] kernel 支持 top-level bindings 在 calls 之间保留，并用 `js_repl_reset` 清空状态。[E: docs/js_repl.md:62][E: docs/js_repl.md:71] 这个 surface 适合把多步数据处理、browser automation helper、nested tool call orchestration 放进同一个 JS execution context。[I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| raw source | custom/freeform text | 是 | 无 | `js_repl` 是 freeform tool，description 要求发送 raw JavaScript source，允许第一行 pragma `// codex-js-repl: timeout_ms=15000`。[E: codex-rs/tools/src/js_repl_tool.rs:28][E: codex-rs/tools/src/js_repl_tool.rs:30] | handler 的 custom payload 走 `parse_freeform_args`，空输入会报错。[E: codex-rs/core/src/tools/handlers/js_repl.rs:127][E: codex-rs/core/src/tools/handlers/js_repl.rs:213] |
| pragma `timeout_ms` | first-line directive | 否 | `30_000` | grammar 允许第一行 `// codex-js-repl:...`。[E: codex-rs/tools/src/js_repl_tool.rs:17][E: codex-rs/tools/src/js_repl_tool.rs:22] | parser 只支持 key `timeout_ms`，重复或非整数会报错；runtime `unwrap_or(30_000)` 作为默认 timeout。[E: codex-rs/core/src/tools/handlers/js_repl.rs:244][E: codex-rs/core/src/tools/handlers/js_repl.rs:245][E: codex-rs/core/src/tools/handlers/js_repl.rs:250][E: codex-rs/core/src/tools/handlers/js_repl.rs:258][E: codex-rs/core/src/tools/js_repl/mod.rs:974] |

freeform grammar 的 `PLAIN_JS_SOURCE` 和 `JS_SOURCE` 首个显著 token 不能是 `{`、`"` 或 markdown fence 反引号模式；源码注释说明这是为了在 API regex 不支持 look-around 时阻断常见 malformed payload。[E: codex-rs/tools/src/js_repl_tool.rs:9][E: codex-rs/tools/src/js_repl_tool.rs:24][E: codex-rs/tools/src/js_repl_tool.rs:25] handler 仍会在运行时调用 `reject_json_or_quoted_source`，明确拒绝 markdown code fences、JSON object 和 JSON string。[E: codex-rs/core/src/tools/handlers/js_repl.rs:280][E: codex-rs/core/src/tools/handlers/js_repl.rs:290]

## 4 输出

`js_repl` freeform ToolSpec 没有 output schema 字段；handler output 类型是 `FunctionToolOutput`。[E: codex-rs/tools/src/js_repl_tool.rs:28][E: codex-rs/core/src/tools/handlers/js_repl.rs:95] handler 把 runtime `result.output` 放入 `InputText` content item，并追加 runtime 返回的其他 `content_items`。[E: codex-rs/core/src/tools/handlers/js_repl.rs:163][E: codex-rs/core/src/tools/handlers/js_repl.rs:166][E: codex-rs/core/src/tools/handlers/js_repl.rs:170] 如果没有 content items，则返回 plain text；否则返回 content item array，success 为 true。[E: codex-rs/core/src/tools/handlers/js_repl.rs:182][E: codex-rs/core/src/tools/handlers/js_repl.rs:185]

docs 说明 kernel 内 `codex.emitImage(imageLike)` 可以显式向外层 `js_repl` function output 添加图片，并列出接受 data URL、单个 `input_image` item、bytes/mimeType object 或 raw tool response object 的情况。[E: docs/js_repl.md:81][E: docs/js_repl.md:86]

## 5 ToolSpec 类型

`js_repl` 是 `ToolSpec::Freeform(FreeformTool)`，format 是 grammar/lark。[E: codex-rs/tools/src/js_repl_tool.rs:28][E: codex-rs/tools/src/js_repl_tool.rs:32][E: codex-rs/tools/src/js_repl_tool.rs:34] handler 仍兼容 `ToolPayload::Function`，会把 function arguments 解析为 `JsReplArgs { code, timeout_ms }`。[E: codex-rs/core/src/tools/handlers/js_repl.rs:101][E: codex-rs/core/src/tools/handlers/js_repl.rs:126][E: codex-rs/core/src/tools/js_repl/mod.rs:107]

## 6 注册与门控

`js_repl` 只在 `config.has_environment && config.js_repl_enabled` 时注册；同一分支也注册 `js_repl_reset`。[E: codex-rs/tools/src/tool_registry_plan.rs:221][E: codex-rs/tools/src/tool_registry_plan.rs:223][E: codex-rs/tools/src/tool_registry_plan.rs:228][E: codex-rs/tools/src/tool_registry_plan.rs:233] `ToolsConfig::new` 用 `Feature::JsRepl` 计算 `js_repl_enabled`，用 `Feature::JsReplToolsOnly` 计算 `js_repl_tools_only`，后者要求前者也开启。[E: codex-rs/tools/src/tool_config.rs:143][E: codex-rs/tools/src/tool_config.rs:145][E: codex-rs/tools/src/tool_config.rs:224]

session 初始化时，如果 `Feature::JsRepl` 开启但 `resolve_compatible_node(config.js_repl_node_path)` 失败，会禁用 `Feature::JsRepl` 与 `Feature::JsReplToolsOnly` 并记录 startup warning。[E: codex-rs/core/src/session/mod.rs:485][E: codex-rs/core/src/session/mod.rs:489][E: codex-rs/core/src/session/mod.rs:500] docs 说明 Node 版本需要满足 `codex-rs/node-version.txt`，runtime resolution 顺序是 env `CODEX_JS_REPL_NODE_PATH`、config/profile `js_repl_node_path`、PATH 中的 `node`。[E: docs/js_repl.md:26][E: docs/js_repl.md:30][E: docs/js_repl.md:31][E: docs/js_repl.md:32]

当 `js_repl_tools_only` 开启时，直接 model tool calls 会限制到 `js_repl` 和 `js_repl_reset`；其他工具仍可在 JS 内通过 `await codex.tool(...)` 调用。[E: docs/js_repl.md:14][E: docs/js_repl.md:22] router 也在 `js_repl_tools_only` 下拒绝非 JS REPL direct calls。[E: codex-rs/core/src/tools/router.rs:285][E: codex-rs/core/src/tools/router.rs:289]

## 7 parallel-safe

`js_repl` 的 plan-level `supports_parallel_tool_calls` 是 false。[E: codex-rs/tools/src/tool_registry_plan.rs:222][E: codex-rs/tools/src/tool_registry_plan.rs:224] persistent kernel 与 top-level binding state 是跨调用共享的，串行化能避免两个 JS cells 同时修改同一个 kernel state。[E: docs/js_repl.md:62][I]

## 8 handler 走读

1. handler 的 `matches_kind` 接受 Function 与 Custom payload。[E: codex-rs/core/src/tools/handlers/js_repl.rs:101][E: codex-rs/core/src/tools/handlers/js_repl.rs:104]
2. `handle` 先检查 session features 中 `Feature::JsRepl` 是否仍启用。[E: codex-rs/core/src/tools/handlers/js_repl.rs:119][E: codex-rs/core/src/tools/handlers/js_repl.rs:121]
3. Function payload 用 JSON `parse_arguments` 解析；Custom payload 用 `parse_freeform_args` 解析。[E: codex-rs/core/src/tools/handlers/js_repl.rs:126][E: codex-rs/core/src/tools/handlers/js_repl.rs:127]
4. handler 通过 `turn.js_repl.manager().await?` 取得或初始化 per-turn `JsReplManager`。[E: codex-rs/core/src/tools/handlers/js_repl.rs:134][E: codex-rs/core/src/tools/js_repl/mod.rs:95]
5. handler 发 begin event，然后调用 `manager.execute_with_cancellation`，传入 session、turn、cancellation token、tracker 和 parsed args。[E: codex-rs/core/src/tools/handlers/js_repl.rs:136][E: codex-rs/core/src/tools/handlers/js_repl.rs:138][E: codex-rs/core/src/tools/handlers/js_repl.rs:143]
6. manager 构造 `HostToKernel::Exec { id, code, timeout_ms }` 并写给 kernel，然后用 `tokio::time::timeout` 等待 response。[E: codex-rs/core/src/tools/js_repl/mod.rs:923][E: codex-rs/core/src/tools/js_repl/mod.rs:926][E: codex-rs/core/src/tools/js_repl/mod.rs:934][E: codex-rs/core/src/tools/js_repl/mod.rs:975]
7. 成功返回后 handler 发 end event，把 text output 与 image/content items 组合为 response。[E: codex-rs/core/src/tools/handlers/js_repl.rs:172][E: codex-rs/core/src/tools/handlers/js_repl.rs:182]

## 9 设计动机·edge·历史

`js_repl` 的 schema 与 runtime 双重拒绝 JSON wrappers，是为了引导模型使用 custom/freeform 的 raw JS body，而不是把 JavaScript 放入 `{"code": ...}` 这种旧 function-call 习惯中。[E: codex-rs/tools/src/js_repl_tool.rs:9][E: codex-rs/core/src/tools/handlers/js_repl.rs:290][I]

`JsReplHandle` 使用 `OnceCell<Arc<JsReplManager>>`，说明同一 turn 的 manager 是懒初始化且复用的。[E: codex-rs/core/src/tools/js_repl/mod.rs:72][E: codex-rs/core/src/tools/js_repl/mod.rs:95] 这与 docs 中 top-level bindings persist 的行为一致。[E: docs/js_repl.md:62]

## Sources

- `codex-rs/tools/src/js_repl_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/js_repl.rs`
- `codex-rs/core/src/tools/js_repl/mod.rs`
- `codex-rs/core/src/tools/router.rs`
- `docs/js_repl.md`

## 相关

- [js_repl_reset 工具](js-repl-reset.md)
- [exec 工具](code-mode-exec.md)
