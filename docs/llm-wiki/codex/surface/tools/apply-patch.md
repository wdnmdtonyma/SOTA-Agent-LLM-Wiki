---
id: tool.apply-patch
title: apply_patch 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/apply_patch_tool.rs, codex-rs/tools/src/tool_apply_patch.lark, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/apply_patch.rs, codex-rs/core/src/tools/handlers/shell.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/apply_patch.rs, codex-rs/core/src/tools/runtimes/apply_patch.rs, codex-rs/apply-patch/src/lib.rs, codex-rs/apply-patch/src/invocation.rs]
symbols: [create_apply_patch_freeform_tool, create_apply_patch_json_tool, ApplyPatchToolArgs, ToolHandlerKind::ApplyPatch, ApplyPatchHandler]
related: [tool.shell, tool.exec-command, tool.shell-command, subsys.core.tool-system, subsys.core.tool-router, subsys.exec-sandbox.apply-patch-engine]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `apply_patch` 是 Codex 的文件编辑工具。它有 freeform custom tool 与 JSON function tool 两种 wire shape，但两种形态最终进入同一个 `ApplyPatchHandler`，并被重新解析成受 sandbox/approval 管控的 patch action。[E: codex-rs/tools/src/apply_patch_tool.rs:90][E: codex-rs/tools/src/apply_patch_tool.rs:110][E: codex-rs/core/src/tools/handlers/apply_patch.rs:301][E: codex-rs/core/src/tools/handlers/apply_patch.rs:374]

## 能回答的问题

- `apply_patch` 的 freeform 与 JSON 两种 ToolSpec 分别长什么样?
- `apply_patch` 在 registry plan 里受哪个 `ToolsConfig` 字段门控?
- freeform grammar 的 hunk、add、delete、update、move 规则是什么?
- handler 如何把 Function/Custom payload 归一成 raw patch input?
- handler 如何计算文件权限、触发 approval runtime、返回输出?
- 为什么 shell/unified-exec 也会拦截 apply_patch command?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | 两种 shape 都固定为 `apply_patch`: freeform constructor 设置 `FreeformTool.name`，JSON constructor 设置 `ResponsesApiTool.name`。[E: codex-rs/tools/src/apply_patch_tool.rs:91][E: codex-rs/tools/src/apply_patch_tool.rs:111] |
| aliases | ToolSpec/registry 只注册 `"apply_patch"` 到 handler；shell-style apply-patch invocation parser 还接受命令名 `"applypatch"`。[E: codex-rs/tools/src/tool_registry_plan.rs:331][E: codex-rs/apply-patch/src/invocation.rs:27] |
| ToolHandlerKind | `ToolHandlerKind::ApplyPatch` 是 registry plan 的 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:14] |
| concrete handler | `core/src/tools/spec.rs` 把 `ToolHandlerKind::ApplyPatch` 注册到共享 `apply_patch_handler`。[E: codex-rs/core/src/tools/spec.rs:194][E: codex-rs/core/src/tools/spec.rs:195] |
| 所属文件 | schema constructor 在 `codex-rs/tools/src/apply_patch_tool.rs`; handler 在 `codex-rs/core/src/tools/handlers/apply_patch.rs`; parser/apply engine exports 在 `codex-rs/apply-patch/src/lib.rs`。[E: codex-rs/tools/src/apply_patch_tool.rs:89][E: codex-rs/core/src/tools/handlers/apply_patch.rs:294][E: codex-rs/apply-patch/src/lib.rs:22][E: codex-rs/apply-patch/src/lib.rs:27] |

## 2 用途定位

`apply_patch` 是面向 agent 的受控文件编辑 surface:输入是完整 patch envelope，handler 会重新解析并验证 patch，计算涉及的文件路径，再根据 sandbox 和 approval policy 决定直接返回、委托 runtime 或要求审批。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:374][E: codex-rs/core/src/tools/handlers/apply_patch.rs:383][E: codex-rs/core/src/tools/handlers/apply_patch.rs:385][E: codex-rs/core/src/apply_patch.rs:46] 这个工具把“模型表达编辑意图”和“实际写文件”隔离开，便于在写入前做 hook、permission、approval 与 event emission。[I]

## 3 输入 schema 表

### 3.1 Freeform custom tool

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| raw body | custom/freeform text | 是 | 无 | `create_apply_patch_freeform_tool` 返回 `ToolSpec::Freeform`，描述明确要求不要用 JSON 包裹 patch。[E: codex-rs/tools/src/apply_patch_tool.rs:90][E: codex-rs/tools/src/apply_patch_tool.rs:92] | format 是 grammar/lark，definition 来自 `tool_apply_patch.lark`。[E: codex-rs/tools/src/apply_patch_tool.rs:94][E: codex-rs/tools/src/apply_patch_tool.rs:95][E: codex-rs/tools/src/apply_patch_tool.rs:96] |

freeform grammar 要求 `start` 由 `begin_patch hunk+ end_patch` 组成。[E: codex-rs/tools/src/tool_apply_patch.lark:1] patch 必须以 `*** Begin Patch` 起始，以 `*** End Patch` 结束，结束行允许可选 LF。[E: codex-rs/tools/src/tool_apply_patch.lark:2][E: codex-rs/tools/src/tool_apply_patch.lark:3] hunk 可以是 add/delete/update 三类之一。[E: codex-rs/tools/src/tool_apply_patch.lark:5] add file 要求 `*** Add File: ` 后跟 filename，并至少有一行 `+` 内容。[E: codex-rs/tools/src/tool_apply_patch.lark:6][E: codex-rs/tools/src/tool_apply_patch.lark:11] update file 允许可选 `*** Move to:` 与可选 change block。[E: codex-rs/tools/src/tool_apply_patch.lark:8][E: codex-rs/tools/src/tool_apply_patch.lark:13]

### 3.2 JSON function tool

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `input` | `string` | 是 | 无 | JSON constructor 为 `input` 建 string schema，描述为完整 apply_patch command 内容。[E: codex-rs/tools/src/apply_patch_tool.rs:104][E: codex-rs/tools/src/apply_patch_tool.rs:106] | `ApplyPatchToolArgs` 只有 `input: String` 字段。[E: codex-rs/tools/src/apply_patch_tool.rs:83][E: codex-rs/tools/src/apply_patch_tool.rs:84] |

JSON function tool 的 `required` 列表只有 `input`，`additionalProperties` 为 false。[E: codex-rs/tools/src/apply_patch_tool.rs:117][E: codex-rs/tools/src/apply_patch_tool.rs:118]

## 4 输出

`apply_patch` 的两个 ToolSpec constructor 都不声明 output schema: freeform custom tool 没有 JSON schema 输出字段，JSON function tool 明确 `output_schema: None`。[E: codex-rs/tools/src/apply_patch_tool.rs:90][E: codex-rs/tools/src/apply_patch_tool.rs:120] handler 的 output 类型是 `ApplyPatchToolOutput`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:295] 成功路径把文本结果包装成 `ApplyPatchToolOutput::from_text`，直接 output 路径和 runtime delegation 路径都这样返回。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:390][E: codex-rs/core/src/tools/handlers/apply_patch.rs:440]

parse/verification 失败会回给模型不同错误: correctness error 会带 `apply_patch verification failed`，shell parse error 会报告 invalid patch input，非 apply_patch 输入会报告 non-apply_patch input。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:446][E: codex-rs/core/src/tools/handlers/apply_patch.rs:452][E: codex-rs/core/src/tools/handlers/apply_patch.rs:457]

## 5 ToolSpec 类型

`apply_patch` 的 ToolSpec 类型由 `ToolsConfig.apply_patch_tool_type` 决定。`ApplyPatchToolType::Freeform` 使用 `create_apply_patch_freeform_tool()`，`ApplyPatchToolType::Function` 使用 `create_apply_patch_json_tool()`。[E: codex-rs/tools/src/tool_registry_plan.rs:315][E: codex-rs/tools/src/tool_registry_plan.rs:318][E: codex-rs/tools/src/tool_registry_plan.rs:323][E: codex-rs/tools/src/tool_registry_plan.rs:325] `ToolsConfig::new` 优先尊重 `model_info.apply_patch_tool_type`；如果 model metadata 没给类型，而 `Feature::ApplyPatchFreeform` 开启，则默认选择 freeform。[E: codex-rs/tools/src/tool_config.rs:140][E: codex-rs/tools/src/tool_config.rs:193][E: codex-rs/tools/src/tool_config.rs:195]

## 6 注册与门控

`apply_patch` 只在 `config.has_environment` 为 true 且 `config.apply_patch_tool_type` 为 `Some(...)` 时加入 plan。[E: codex-rs/tools/src/tool_registry_plan.rs:312][E: codex-rs/tools/src/tool_registry_plan.rs:313] 无论选择 freeform 还是 function，plan 最后都注册 `"apply_patch"` 到 `ToolHandlerKind::ApplyPatch`。[E: codex-rs/tools/src/tool_registry_plan.rs:331]

这个 gate 的动机是写文件必须依赖 turn environment 和 filesystem abstraction；没有 environment 时 handler 也会返回 `apply_patch is unavailable in this session`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:365][E: codex-rs/core/src/tools/handlers/apply_patch.rs:367][I]

## 7 parallel-safe

`apply_patch` 的 plan-level `supports_parallel_tool_calls` 对两种 shape 都是 false。[E: codex-rs/tools/src/tool_registry_plan.rs:317][E: codex-rs/tools/src/tool_registry_plan.rs:319][E: codex-rs/tools/src/tool_registry_plan.rs:324][E: codex-rs/tools/src/tool_registry_plan.rs:326] handler 还把所有 invocation 标记为 mutating。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:308][E: codex-rs/core/src/tools/handlers/apply_patch.rs:309] 这让文件写入天然串行化，避免两个 patch 同时修改同一文件时产生不可预测结果。[I]

## 8 handler 走读

1. `ApplyPatchHandler::matches_kind` 同时接受 `ToolPayload::Function` 与 `ToolPayload::Custom`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:301][E: codex-rs/core/src/tools/handlers/apply_patch.rs:304]
2. pre/post hooks 通过 `apply_patch_payload_command` 抽取 raw patch body；Function payload 解析 `ApplyPatchToolArgs.input`，Custom payload 直接克隆 input。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:253][E: codex-rs/core/src/tools/handlers/apply_patch.rs:256][E: codex-rs/core/src/tools/handlers/apply_patch.rs:317][E: codex-rs/core/src/tools/handlers/apply_patch.rs:332]
3. `handle` 再次把 payload 归一成 `patch_input`:Function 解析 JSON args，Custom 使用 raw input。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:348][E: codex-rs/core/src/tools/handlers/apply_patch.rs:353]
4. handler 构造 command vector `["apply_patch", patch_input]`，然后用 `maybe_parse_apply_patch_verified` 在 cwd、filesystem 和 sandbox 上下文里解析验证。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:363][E: codex-rs/core/src/tools/handlers/apply_patch.rs:364][E: codex-rs/core/src/tools/handlers/apply_patch.rs:374]
5. 如果 parser 返回 `Body(changes)`，handler 调用 `effective_patch_permissions` 计算文件路径、additional permissions 和有效 sandbox policy。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:382][E: codex-rs/core/src/tools/handlers/apply_patch.rs:383]
6. `apply_patch::apply_patch` 根据 approval/sandbox 决策返回 `Output` 或 `DelegateToRuntime`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:385][E: codex-rs/core/src/apply_patch.rs:38][E: codex-rs/core/src/apply_patch.rs:72]
7. `DelegateToRuntime` 路径把 action 转成 protocol changes，发 begin event，构造 `ApplyPatchRequest`，再交给 `ToolOrchestrator` 和 `ApplyPatchRuntime` 执行。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:393][E: codex-rs/core/src/tools/handlers/apply_patch.rs:404][E: codex-rs/core/src/tools/handlers/apply_patch.rs:423]
8. runtime 实际调用 filesystem apply，并 emit deltas、设置 exit code、处理 sandbox denial。[E: codex-rs/core/src/tools/runtimes/apply_patch.rs:228][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:239][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:241][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:250]

## 9 设计动机·edge·历史

freeform shape 适合 GPT-5 custom tool:它直接把 patch grammar 暴露给 model，避免把多行 diff 塞进 JSON string 时的 escaping 噪声。[E: codex-rs/tools/src/apply_patch_tool.rs:87][E: codex-rs/tools/src/apply_patch_tool.rs:92][I] JSON shape 源码注释标记 `ApplyPatchToolArgs` 待废弃，并说明 JSON constructor “Should only be used with gpt-oss models”。[E: codex-rs/tools/src/apply_patch_tool.rs:81][E: codex-rs/tools/src/apply_patch_tool.rs:101]

shell-like handlers 也会识别 apply_patch command:普通 shell path 在 `run_exec_like` 中调用 `intercept_apply_patch`，unified-exec path 也在执行命令前调用 `intercept_apply_patch`。[E: codex-rs/core/src/tools/handlers/shell.rs:482][E: codex-rs/core/src/tools/handlers/unified_exec.rs:294] `intercept_apply_patch` implementation 复用 apply-patch parser 与 runtime delegation path。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:465][E: codex-rs/core/src/tools/handlers/apply_patch.rs:480][E: codex-rs/core/src/tools/handlers/apply_patch.rs:524][I]

## Sources

- `codex-rs/tools/src/apply_patch_tool.rs`
- `codex-rs/tools/src/tool_apply_patch.lark`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/apply_patch.rs`
- `codex-rs/core/src/tools/handlers/shell.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/apply_patch.rs`
- `codex-rs/core/src/tools/runtimes/apply_patch.rs`
- `codex-rs/apply-patch/src/lib.rs`
- `codex-rs/apply-patch/src/invocation.rs`

## 相关

- [shell 工具](shell.md)
- [exec_command 工具](exec-command.md)
- [shell_command 工具](shell-command.md)
