---
id: tool.request-permissions
title: request_permissions 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/request_permissions.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/approvals.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/request_permissions.rs]
symbols: [create_request_permissions_tool, request_permissions_tool_description, RequestPermissionsHandler, RequestPermissionsArgs, RequestPermissionProfile, RequestPermissionsEvent, RequestPermissionsResponse, PermissionGrantScope, Session::request_permissions_for_environment, Session::notify_request_permissions_response]
related: [spine.tool-call-anatomy, subsys.core.tool-system, subsys.core.approval-policy, subsys.core.approval-guardian, subsys.core.approval-guardian-v2, tool.exec-command, tool.shell-command]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `request_permissions` 是 Codex 暴露给模型的增量权限申请工具：模型提交 filesystem/network permission profile，可选指定 `environment_id`，handler 按选中 environment cwd 解析并规范化请求。Guardian 路径不再单独构造 review request，而是走共享 `ApprovalAction::RequestPermissions` → `Session::request_guardian_approval`，因此 V2 短路径与 V1 child review 都能处理同一条 permission request。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:228][E: codex-rs/core/src/tools/handlers/request_permissions.rs:66][E: codex-rs/core/src/session/mod.rs:2479][E: codex-rs/core/src/session/mod.rs:2530][E: codex-rs/core/src/tools/approvals.rs:384]

## 能回答的问题

- `request_permissions` 的 wire name、ToolSpec 类型、schema 字段是什么?
- 它的 feature gate 和 environment 选择在哪里?
- `permissions.network` / `permissions.file_system` 如何进入协议结构?
- response 为什么会被裁剪为请求权限的子集?
- 共享 Guardian 路径、客户端 pending path 和授权记录路径如何分流?
- 它是否支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `RequestPermissionsHandler::tool_name()` 返回 plain `"request_permissions"`；schema constructor 也设置同名 `ResponsesApiTool.name`。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:29][E: codex-rs/core/src/tools/handlers/request_permissions.rs:30][E: codex-rs/core/src/tools/handlers/shell_spec.rs:245][E: codex-rs/core/src/tools/handlers/shell_spec.rs:246] |
| concrete handler | `RequestPermissionsHandler` 是 core utility handler；`spec()` 调用 `create_request_permissions_tool(request_permissions_tool_description())`。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:20][E: codex-rs/core/src/tools/handlers/request_permissions.rs:33][E: codex-rs/core/src/tools/handlers/request_permissions.rs:34] |
| ToolSpec | `create_request_permissions_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`，无 output schema。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:245][E: codex-rs/core/src/tools/handlers/shell_spec.rs:255][E: codex-rs/tools/src/tool_spec.rs:22][E: codex-rs/tools/src/tool_spec.rs:24] |
| handler exposure | handler 未覆盖 `exposure()`，因此使用 `ToolExecutor` 默认 `Direct`。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:28][E: codex-rs/tools/src/tool_executor.rs:113][E: codex-rs/tools/src/tool_executor.rs:114] |

## 2 用途定位

该工具请求的是 permission profile，而不是直接执行命令。schema description 说明它等待用户授予请求 profile 的子集，并且获批权限会自动应用到本 turn 后续 shell-like commands；若客户端批准 session scope，则应用到剩余 session。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:259][E: codex-rs/core/src/tools/handlers/shell_spec.rs:260]

这使模型可以先申请网络或文件系统能力，再让后续 `exec_command` / `shell_command` 走普通 sandboxed 执行；shell schema 的 per-command approval 参数仍是另一条路径。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:314][E: codex-rs/core/src/tools/handlers/shell_spec.rs:334][E: codex-rs/core/src/tools/handlers/request_permissions.rs:95]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `permissions` | object | 是 | 无 | 顶层 required 只包含 `permissions`；object 内含 `network` 与 `file_system`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:242][E: codex-rs/core/src/tools/handlers/shell_spec.rs:250][E: codex-rs/core/src/tools/handlers/shell_spec.rs:252][E: codex-rs/core/src/tools/handlers/shell_spec.rs:346] | protocol 中 `RequestPermissionsArgs.permissions` 是 `RequestPermissionProfile`；handler 规范化后要求非空。[E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:61][E: codex-rs/core/src/tools/handlers/request_permissions.rs:86][E: codex-rs/core/src/tools/handlers/request_permissions.rs:88] |
| `reason` | string | 否 | 无 | schema 描述为可选短说明。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:230][E: codex-rs/core/src/tools/handlers/shell_spec.rs:232] | protocol 字段是 `Option<String>`；client event 携带 reason，Guardian `ApprovalAction` 也放入 `args.reason`。[E: codex-rs/protocol/src/request_permissions.rs:60][E: codex-rs/protocol/src/request_permissions.rs:94][E: codex-rs/core/src/session/mod.rs:2533] |
| `environment_id` | string | 否 | primary environment | schema 描述为来自 `<environment_context>` 的 id，省略时使用 primary environment。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:236][E: codex-rs/core/src/tools/handlers/shell_spec.rs:238] | handler 接受 `environment_id` / `environmentId` alias，调用 `resolve_tool_environment` 选环境；没有环境时报错。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:24][E: codex-rs/core/src/tools/handlers/request_permissions.rs:66][E: codex-rs/core/src/tools/handlers/request_permissions.rs:71] |
| `permissions.network.enabled` | boolean | 否 | none | network schema 只有 `enabled` boolean，true 表示请求网络访问。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:359][E: codex-rs/core/src/tools/handlers/shell_spec.rs:362][E: codex-rs/core/src/tools/handlers/shell_spec.rs:364] | protocol profile 的 `network` 字段是 optional；空 profile 由 `is_empty()` 判定。[E: codex-rs/protocol/src/request_permissions.rs:20][E: codex-rs/protocol/src/request_permissions.rs:26] |
| `permissions.file_system.read` | array<string> | 否 | none | filesystem schema 的 read 字段是路径数组，描述要求 absolute paths。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:378][E: codex-rs/core/src/tools/handlers/shell_spec.rs:382] | handler 在选中 environment 的 native cwd 下解析参数，再做 normalize。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:77][E: codex-rs/core/src/tools/handlers/request_permissions.rs:84][E: codex-rs/core/src/tools/handlers/request_permissions.rs:85] |
| `permissions.file_system.write` | array<string> | 否 | none | write 字段同样是 absolute path 数组。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:387][E: codex-rs/core/src/tools/handlers/shell_spec.rs:392] | response 最终会和 requested permissions 求交，避免返回超出请求集合的路径。[E: codex-rs/core/src/session/mod.rs:2796][E: codex-rs/core/src/session/mod.rs:2797] |

`parameters` 使用 `JsonSchema::object(..., Some(vec!["permissions"]), Some(false))`，所以 schema 层关闭 additional properties。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:250][E: codex-rs/core/src/tools/handlers/shell_spec.rs:252][E: codex-rs/core/src/tools/handlers/shell_spec.rs:253]

## 4 输出

`request_permissions` 不声明 structured output schema；handler 把 `RequestPermissionsResponse` 序列化为 JSON 文本，再用 `FunctionToolOutput::from_text(content, Some(true))` 返回。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:255][E: codex-rs/core/src/tools/handlers/request_permissions.rs:109][E: codex-rs/core/src/tools/handlers/request_permissions.rs:115]

协议响应包含 `permissions`、默认 `scope` 和 `strict_auto_review`；scope enum 当前有 `Turn` 和 `Session` 两个值。[E: codex-rs/protocol/src/request_permissions.rs:12][E: codex-rs/protocol/src/request_permissions.rs:14][E: codex-rs/protocol/src/request_permissions.rs:15][E: codex-rs/protocol/src/request_permissions.rs:65][E: codex-rs/protocol/src/request_permissions.rs:68][E: codex-rs/protocol/src/request_permissions.rs:71]

## 5 注册与门控

`add_core_utility_tools` 只在 `Feature::RequestPermissionsTool` 开启且 current tool environment mode 有 environment 时注册 `RequestPermissionsHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:1034][E: codex-rs/core/src/tools/spec_plan.rs:1064]

visible spec 构建沿用普通 runtime 流程：direct exposure 的 runtime spec 会加入 model-visible specs；本 handler 通过默认 exposure 注册，没有额外 hidden/deferred override。[E: codex-rs/core/src/tools/spec_plan.rs:317][E: codex-rs/core/src/tools/handlers/request_permissions.rs:122][E: codex-rs/tools/src/tool_executor.rs:114]

## 6 parallel support

`RequestPermissionsHandler` 没有覆盖 `supports_parallel_tool_calls()`，因此使用 `ToolExecutor` 默认 false；router 查询 registry 的支持位，缺省回退 false。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:28][E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123][E: codex-rs/core/src/tools/router.rs:138][E: codex-rs/core/src/tools/router.rs:140]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:56][E: codex-rs/core/src/tools/handlers/request_permissions.rs:59]
2. 它先解析 environment args，选择 turn environment；选中 cwd 必须能转换为 host-native absolute path。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:66][E: codex-rs/core/src/tools/handlers/request_permissions.rs:77]
3. 它用该 cwd 作为 base path 解析完整 `RequestPermissionsArgs`，然后把 `permissions` 规范化回 request profile。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:83][E: codex-rs/core/src/tools/handlers/request_permissions.rs:85]
4. 空 permission profile 直接向模型报错，不进入 session approval path。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:88]
5. session 在 approval policy 为 `Never` 或 granular policy 不允许 request permissions 时，立即返回空权限 turn-scope response。[E: codex-rs/core/src/session/mod.rs:2489][E: codex-rs/core/src/session/mod.rs:2497]
6. Guardian path 检查 `routes_approval_to_guardian`，构造共享 `ApprovalAction::RequestPermissions`，再 `request_guardian_approval`。该入口会进入 V1 `run_guardian_review`，因此 V2 `ApprovalReviewContributor` 可以先于 child reviewer claim 低风险请求。[E: codex-rs/core/src/session/mod.rs:2525][E: codex-rs/core/src/session/mod.rs:2530][E: codex-rs/core/src/session/mod.rs:2548][E: codex-rs/core/src/tools/approvals.rs:384]
7. review decision 映射成 turn/session 授权或空权限，然后 normalize 并按 environment id 记录。[E: codex-rs/core/src/session/mod.rs:2554][E: codex-rs/core/src/session/mod.rs:2590][E: codex-rs/core/src/session/mod.rs:2596]
8. 非 Guardian path 创建 pending request entry，发出 `EventMsg::RequestPermissions`，等待客户端通过 call id 返回 response。[E: codex-rs/core/src/session/mod.rs:2604][E: codex-rs/core/src/session/mod.rs:2627]
9. 客户端 `Op::RequestPermissionsResponse` 由 helper `request_permissions_response` 转给 `notify_request_permissions_response`；该函数移除 pending entry、normalize response，再发送给等待中的 handler。[E: codex-rs/core/src/session/handlers.rs:619][E: codex-rs/core/src/session/handlers.rs:222][E: codex-rs/core/src/session/mod.rs:2726][E: codex-rs/core/src/session/mod.rs:2747]
10. normalize 会拒绝 session-scope strict auto review，并把 granted permissions 与 requested permissions 求交；空 permissions 原样返回。[E: codex-rs/core/src/session/mod.rs:2784][E: codex-rs/core/src/session/mod.rs:2792][E: codex-rs/core/src/session/mod.rs:2796]
11. turn scope 写入 originating turn state，session scope 写入 session state；strict auto review 只在 turn scope 下启用。记录键是 environment id，因此每个 environment 各自持有 granted profile。[E: codex-rs/core/src/session/mod.rs:2817][E: codex-rs/core/src/session/mod.rs:2823][E: codex-rs/core/src/session/mod.rs:2829]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/request_permissions.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/approvals.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/request_permissions.rs`

## 相关

- [exec_command 工具](exec-command.md) — 后续 shell-like command 会自动看到 turn/session grants。
- [shell_command 工具](shell-command.md) — legacy shell path 同样使用已授予的 permission profile。
- [Guardian V1](../../subsystems/core/approval-guardian.md)
- [Guardian V2](../../subsystems/core/approval-guardian-v2.md)
