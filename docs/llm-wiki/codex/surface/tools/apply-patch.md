---
id: tool.apply-patch
title: apply_patch 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/apply_patch_spec.rs, codex-rs/core/src/tools/handlers/apply_patch.lark, codex-rs/core/src/tools/handlers/apply_patch.rs, codex-rs/core/src/apply_patch.rs, codex-rs/core/src/tools/runtimes/apply_patch.rs, codex-rs/core/src/tools/handlers/shell.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/tools/router.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/apply-patch/src/invocation.rs, codex-rs/apply-patch/src/parser.rs, codex-rs/apply-patch/src/streaming_parser.rs]
symbols: [add_core_utility_tools, ApplyPatchHandler, create_apply_patch_freeform_tool, APPLY_PATCH_LARK_GRAMMAR, parse_patch, verify_apply_patch_args, maybe_parse_apply_patch_verified, intercept_apply_patch, ApplyPatchRuntime]
related: [tool.exec-command, tool.shell-command, subsys.core.tool-system, subsys.core.tool-router, subsys.exec-sandbox.apply-patch-engine]
evidence: explicit
status: verified
updated: 5670360009
---

> `apply_patch` 是当前 Codex 的 freeform custom tool 文件编辑 surface：模型提交完整 patch envelope，handler 只接受 `ToolPayload::Custom`，重新解析、按 turn environment 校验文件系统与 sandbox，再根据 safety/approval 决策直接拒绝或委托 `ApplyPatchRuntime` 写入。[E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:18][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:20][E: codex-rs/core/src/tools/handlers/apply_patch.rs:345][E: codex-rs/core/src/tools/handlers/apply_patch.rs:350][E: codex-rs/core/src/tools/handlers/apply_patch.rs:382][E: codex-rs/core/src/apply_patch.rs:33][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:237]

## 能回答的问题

- `apply_patch` 的 wire name、ToolSpec 类型、grammar 和 handler 是什么?
- 它何时由 `spec_plan.rs` 暴露，如何支持 multiple environment?
- patch envelope grammar、environment id preamble、解析与验证路径在哪里?
- handler 如何计算涉及路径、合并 turn/session permissions 并触发 approval runtime?
- shell/unified-exec 为什么仍会拦截 `apply_patch` 命令?
- 它是否支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `ApplyPatchHandler::tool_name()` 返回 plain `"apply_patch"`；schema constructor 也把 `FreeformTool.name` 设为 `"apply_patch"`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:316][E: codex-rs/core/src/tools/handlers/apply_patch.rs:318][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:18][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:19] |
| concrete handler | `ApplyPatchHandler` 保存 `multi_environment`，`spec()` 调用 `create_apply_patch_freeform_tool(self.multi_environment)`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:60][E: codex-rs/core/src/tools/handlers/apply_patch.rs:61][E: codex-rs/core/src/tools/handlers/apply_patch.rs:65][E: codex-rs/core/src/tools/handlers/apply_patch.rs:322] |
| ToolSpec | 当前 constructor 返回 `ToolSpec::Freeform(FreeformTool { ... })`；`ToolSpec` 的 freeform variant 序列化为 Responses API custom tool。[E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:18][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:21][E: codex-rs/tools/src/tool_spec.rs:49][E: codex-rs/tools/src/tool_spec.rs:50] |
| handler exposure | `ApplyPatchHandler` 没有覆盖 `exposure()`，因此使用 `ToolExecutor` 默认 `Direct`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:316][E: codex-rs/core/src/tools/handlers/apply_patch.rs:325][E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:56] |

## 2 用途定位

`apply_patch` 把模型的文件编辑意图限制在显式 patch grammar 内。handler 先用 `codex_apply_patch::parse_patch` 解析 custom payload，再用 `verify_apply_patch_args` 在选中 environment 的 cwd、filesystem 和 sandbox context 上验证 add/delete/update/move 所需内容。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:345][E: codex-rs/core/src/tools/handlers/apply_patch.rs:350][E: codex-rs/core/src/tools/handlers/apply_patch.rs:362][E: codex-rs/core/src/tools/handlers/apply_patch.rs:377][E: codex-rs/core/src/tools/handlers/apply_patch.rs:382]

验证通过后，core 会计算变更路径和额外写权限，把 `apply_patch::apply_patch` 的 safety 结果映射为直接输出或 runtime delegation；runtime 最终通过 selected turn environment filesystem 调用 `codex_apply_patch::apply_patch`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:385][E: codex-rs/core/src/tools/handlers/apply_patch.rs:395][E: codex-rs/core/src/apply_patch.rs:50][E: codex-rs/core/src/apply_patch.rs:61][E: codex-rs/core/src/apply_patch.rs:82][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:244][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:254]

## 3 输入 grammar

`create_apply_patch_freeform_tool` 把 `apply_patch.lark` 作为 grammar definition 暴露给模型，并在 description 中明确要求不要用 JSON 包裹 patch。[E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:5][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:18][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:20][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:21][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:23]

基础 grammar 要求 `start: begin_patch hunk+ end_patch`；begin/end marker 分别是 `*** Begin Patch` 和 `*** End Patch`，end 允许可选 LF。[E: codex-rs/core/src/tools/handlers/apply_patch.lark:1][E: codex-rs/core/src/tools/handlers/apply_patch.lark:2][E: codex-rs/core/src/tools/handlers/apply_patch.lark:3] hunk 可以是 add、delete 或 update；add 要求至少一行 `+` 内容，update 允许可选 `*** Move to:` 和 change block。[E: codex-rs/core/src/tools/handlers/apply_patch.lark:5][E: codex-rs/core/src/tools/handlers/apply_patch.lark:6][E: codex-rs/core/src/tools/handlers/apply_patch.lark:8][E: codex-rs/core/src/tools/handlers/apply_patch.lark:11][E: codex-rs/core/src/tools/handlers/apply_patch.lark:13][E: codex-rs/core/src/tools/handlers/apply_patch.lark:14]

当 `ToolEnvironmentMode::Multiple` 生效时，spec constructor 会把 start rule 改写为允许 `*** Environment ID: ...` preamble；parser/streaming parser 会保存该 environment id，并拒绝重复或空 id。[E: codex-rs/core/src/tools/spec_plan.rs:734][E: codex-rs/core/src/tools/spec_plan.rs:736][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:10][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:13][E: codex-rs/apply-patch/src/parser.rs:184][E: codex-rs/apply-patch/src/parser.rs:188][E: codex-rs/apply-patch/src/streaming_parser.rs:84][E: codex-rs/apply-patch/src/streaming_parser.rs:99]

## 4 输出与错误

freeform tool 没有单独的 JSON output schema；handler 的文本结果用 `ApplyPatchToolOutput::from_text(...)` 包装。当前 auto-approve 和 ask-user 写入路径都先进入 `DelegateToRuntime`，再由 emitter finish 产出文本；`Output` 分支主要承接直接返回或错误传播路径。[E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:18][E: codex-rs/core/src/tools/handlers/apply_patch_spec.rs:26][E: codex-rs/core/src/apply_patch.rs:42][E: codex-rs/core/src/apply_patch.rs:61][E: codex-rs/core/src/apply_patch.rs:73][E: codex-rs/core/src/apply_patch.rs:82][E: codex-rs/core/src/tools/handlers/apply_patch.rs:398][E: codex-rs/core/src/tools/handlers/apply_patch.rs:400][E: codex-rs/core/src/tools/handlers/apply_patch.rs:457][E: codex-rs/core/src/tools/handlers/apply_patch.rs:458]

parse/verification 错误面向模型返回明确文本：初始 parse error 是 `apply_patch verification failed: ...`，verified path 的 correctness error 也带同样前缀；shell parse error 与非 apply_patch 输入分别返回 invalid patch input / non-apply_patch input。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:350][E: codex-rs/core/src/tools/handlers/apply_patch.rs:353][E: codex-rs/core/src/tools/handlers/apply_patch.rs:462][E: codex-rs/core/src/tools/handlers/apply_patch.rs:469][E: codex-rs/core/src/tools/handlers/apply_patch.rs:473][E: codex-rs/core/src/tools/handlers/apply_patch.rs:475]

## 5 注册与门控

`add_tool_sources` 调用 `add_core_utility_tools`；该段只在 `environment_mode.has_environment()` 且 `turn_context.model_info.apply_patch_tool_type.is_some()` 时注册 `ApplyPatchHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:604][E: codex-rs/core/src/tools/spec_plan.rs:607][E: codex-rs/core/src/tools/spec_plan.rs:689][E: codex-rs/core/src/tools/spec_plan.rs:734][E: codex-rs/core/src/tools/spec_plan.rs:737]

visible spec 构建会遍历 runtime，只有 direct exposure 且未被 code-mode-only 隐藏时才把 `runtime.spec()` 推入 model-visible specs；`ApplyPatchHandler` 因默认 Direct exposure 会进入这一流程。[E: codex-rs/core/src/tools/spec_plan.rs:231][E: codex-rs/core/src/tools/spec_plan.rs:241][E: codex-rs/core/src/tools/spec_plan.rs:246][E: codex-rs/core/src/tools/spec_plan.rs:247][E: codex-rs/core/src/tools/spec_plan.rs:249][E: codex-rs/tools/src/tool_executor.rs:55]

## 6 parallel support

`ApplyPatchHandler` 的 `ToolExecutor` impl 只定义 `tool_name`、`spec`、`handle`，没有 `supports_parallel_tool_calls()` override；因此使用 trait 默认 false，router 查询不到支持位时也回退 false。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:316][E: codex-rs/core/src/tools/handlers/apply_patch.rs:321][E: codex-rs/core/src/tools/handlers/apply_patch.rs:325][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65][E: codex-rs/core/src/tools/router.rs:100][E: codex-rs/core/src/tools/router.rs:103]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Custom { input }`；其它 payload 返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:345][E: codex-rs/core/src/tools/handlers/apply_patch.rs:346][E: codex-rs/core/src/tools/handlers/apply_patch.rs:347]
2. 它解析 patch，再按 parsed environment id 与 `multi_environment` 调用 `require_environment_id`；不允许 environment selection 时传入 id 会报错。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:350][E: codex-rs/core/src/tools/handlers/apply_patch.rs:358][E: codex-rs/core/src/tools/handlers/apply_patch.rs:359][E: codex-rs/core/src/tools/handlers/apply_patch.rs:639][E: codex-rs/core/src/tools/handlers/apply_patch.rs:645]
3. 它解析 selected turn environment，要求 cwd 可转为 host-native absolute path，然后构造 filesystem sandbox context。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:362][E: codex-rs/core/src/tools/handlers/apply_patch.rs:363][E: codex-rs/core/src/tools/handlers/apply_patch.rs:371][E: codex-rs/core/src/tools/handlers/apply_patch.rs:377][E: codex-rs/core/src/tools/handlers/apply_patch.rs:378]
4. `verify_apply_patch_args` 用 effective cwd 解析 hunk 路径；delete/update 会读取现有文件内容或 unified diff，move path 会按 effective cwd 解析。[E: codex-rs/apply-patch/src/invocation.rs:162][E: codex-rs/apply-patch/src/invocation.rs:174][E: codex-rs/apply-patch/src/invocation.rs:180][E: codex-rs/apply-patch/src/invocation.rs:189][E: codex-rs/apply-patch/src/invocation.rs:213][E: codex-rs/apply-patch/src/invocation.rs:223]
5. `effective_patch_permissions` 合并 session 与 turn grants，计算 effective filesystem sandbox policy，并为当前 patch 需要但 sandbox 未允许的写路径生成 additional permissions。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:273][E: codex-rs/core/src/tools/handlers/apply_patch.rs:284][E: codex-rs/core/src/tools/handlers/apply_patch.rs:285][E: codex-rs/core/src/tools/handlers/apply_patch.rs:296][E: codex-rs/core/src/tools/handlers/apply_patch.rs:300][E: codex-rs/core/src/tools/handlers/apply_patch.rs:305]
6. `apply_patch::apply_patch` 用 safety check 决定 auto approve、ask user 或 reject；AskUser 会设置 `ExecApprovalRequirement::NeedsApproval` 交给 runtime/orchestrator。[E: codex-rs/core/src/apply_patch.rs:50][E: codex-rs/core/src/apply_patch.rs:58][E: codex-rs/core/src/apply_patch.rs:61][E: codex-rs/core/src/apply_patch.rs:69][E: codex-rs/core/src/apply_patch.rs:73][E: codex-rs/core/src/apply_patch.rs:76][E: codex-rs/core/src/apply_patch.rs:82]
7. delegation path 构造 `ApplyPatchRequest`，用 `ToolOrchestrator` 运行 `ApplyPatchRuntime`，然后用 emitter finish 产出最终文本。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:402][E: codex-rs/core/src/tools/handlers/apply_patch.rs:417][E: codex-rs/core/src/tools/handlers/apply_patch.rs:429][E: codex-rs/core/src/tools/handlers/apply_patch.rs:430][E: codex-rs/core/src/tools/handlers/apply_patch.rs:437][E: codex-rs/core/src/tools/handlers/apply_patch.rs:457]
8. runtime 的 approval key 包含 environment id 与路径；实际 run 从 environment filesystem 取 fs，并带 sandbox context 调用 `codex_apply_patch::apply_patch`。[E: codex-rs/core/src/tools/runtimes/apply_patch.rs:42][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:43][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:129][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:133][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:244][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:254][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:260]

## 8 shell / unified-exec 拦截

虽然模型侧 `apply_patch` 已是 custom tool，shell-like 工具仍会识别命令形式的 `apply_patch`：legacy shell shared path 在执行前调用 `intercept_apply_patch`；unified-exec `exec_command` 会先取得 manager 并分配 process id，但仍在调用 `manager.exec_command(...)` 启动实际命令前拦截，命中时释放该 process id。[E: codex-rs/core/src/tools/handlers/shell.rs:141][E: codex-rs/core/src/tools/handlers/shell.rs:142][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:126][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:198][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:291][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:292][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:305][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:321]

命令解析仍由 `codex-apply-patch` 支持直接 `apply_patch <patch>` 与 shell heredoc；命令名列表包含 `"apply_patch"` 和 `"applypatch"`。命中后，拦截路径复用和 custom handler 基本相同的 permission、safety、runtime delegation 逻辑。[E: codex-rs/apply-patch/src/invocation.rs:28][E: codex-rs/apply-patch/src/invocation.rs:106][E: codex-rs/apply-patch/src/invocation.rs:109][E: codex-rs/apply-patch/src/invocation.rs:114][E: codex-rs/core/src/tools/handlers/apply_patch.rs:532][E: codex-rs/core/src/tools/handlers/apply_patch.rs:546][E: codex-rs/core/src/tools/handlers/apply_patch.rs:559][E: codex-rs/core/src/tools/handlers/apply_patch.rs:593]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/apply_patch_spec.rs`
- `codex-rs/core/src/tools/handlers/apply_patch.lark`
- `codex-rs/core/src/tools/handlers/apply_patch.rs`
- `codex-rs/core/src/apply_patch.rs`
- `codex-rs/core/src/tools/runtimes/apply_patch.rs`
- `codex-rs/core/src/tools/handlers/shell.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/apply-patch/src/invocation.rs`
- `codex-rs/apply-patch/src/parser.rs`
- `codex-rs/apply-patch/src/streaming_parser.rs`

## 相关

- [exec_command 工具](exec-command.md) — unified-exec command path 仍会拦截 shell 形式的 apply_patch。
- [shell_command 工具](shell-command.md) — legacy shell shared path 同样复用 apply_patch 拦截。
