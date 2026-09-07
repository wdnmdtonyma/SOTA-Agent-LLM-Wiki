---
id: tool.request-permissions
title: request_permissions 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/request_permissions.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/guardian/review.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/features/src/lib.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/config_persistence.rs]
symbols: [create_request_permissions_tool, request_permissions_tool_description, RequestPermissionsHandler, RequestPermissionsArgs, RequestPermissionProfile, RequestPermissionsEvent, RequestPermissionsResponse, PermissionGrantScope, Session::request_permissions_for_environment, Session::notify_request_permissions_response]
related: [spine.tool-call-anatomy, subsys.core.tool-system, subsys.core.approval-policy, subsys.core.approval-guardian, subsys.core.approval-guardian-v2, tool.exec-command, tool.shell-command]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> `request_permissions` 是 Codex 暴露给模型的增量权限申请工具：模型提交 filesystem/network permission profile，可选指定 `environment_id`，handler 按选中 environment cwd 解析并规范化请求。Guardian 路径走共享 `ApprovalAction::RequestPermissions` → `Session::request_guardian_approval` → `run_guardian_review`。TUI 可通过 `AppEvent::SelectPermissionProfile` 选择 named permission profile（含远程 profile，不只是本地内置列表）。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:161][E: codex-rs/core/src/tools/handlers/request_permissions.rs:70][E: codex-rs/core/src/session/mod.rs:2773][E: codex-rs/core/src/session/mod.rs:2836][E: codex-rs/core/src/tools/approvals.rs:586][E: codex-rs/core/src/guardian/review.rs:344][E: codex-rs/tui/src/app_event.rs:1215][E: codex-rs/tui/src/app/config_persistence.rs:272]

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
| wire name | `RequestPermissionsHandler::tool_name()` 返回 plain `"request_permissions"`；schema constructor 也设置同名 `ResponsesApiTool.name`。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:31][E: codex-rs/core/src/tools/handlers/request_permissions.rs:32][E: codex-rs/core/src/tools/handlers/shell_spec.rs:179][E: codex-rs/core/src/tools/handlers/shell_spec.rs:180] |
| concrete handler | `RequestPermissionsHandler` 是 core utility handler；`spec()` 调用 `create_request_permissions_tool(request_permissions_tool_description())`。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:22][E: codex-rs/core/src/tools/handlers/request_permissions.rs:35][E: codex-rs/core/src/tools/handlers/request_permissions.rs:36] |
| ToolSpec | `create_request_permissions_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`，无 output schema。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:179][E: codex-rs/core/src/tools/handlers/shell_spec.rs:189][E: codex-rs/tools/src/tool_spec.rs:24] |
| handler exposure | handler 未覆盖 `exposure()`，因此使用 `ToolExecutor` 默认 `Direct`。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:32][E: codex-rs/tools/src/tool_executor.rs:113][E: codex-rs/tools/src/tool_executor.rs:114] |

## 2 用途定位

该工具请求的是 permission profile，而不是直接执行命令。schema description 说明它等待用户授予请求 profile 的子集，并且获批权限会自动应用到本 turn 后续 shell-like commands；若客户端批准 session scope，则应用到剩余 session。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:193][E: codex-rs/core/src/tools/handlers/shell_spec.rs:194]

这使模型可以先申请网络或文件系统能力，再让后续 `exec_command` 走普通 sandboxed 执行。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:105]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `permissions` | object | 是 | 无 | 顶层 required 只包含 `permissions`；object 内含 `network` 与 `file_system`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:176][E: codex-rs/core/src/tools/handlers/shell_spec.rs:184][E: codex-rs/core/src/tools/handlers/shell_spec.rs:186][E: codex-rs/core/src/tools/handlers/shell_spec.rs:280] | protocol 中 `RequestPermissionsArgs.permissions` 是 `RequestPermissionProfile`；handler 规范化后要求非空。[E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:61][E: codex-rs/core/src/tools/handlers/request_permissions.rs:99] |
| `reason` | string | 否 | 无 | schema 描述为可选短说明。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:164][E: codex-rs/core/src/tools/handlers/shell_spec.rs:166] | protocol 字段是 `Option<String>`；client event 携带 reason，Guardian `ApprovalAction` 也放入 `args.reason`。[E: codex-rs/protocol/src/request_permissions.rs:60][E: codex-rs/core/src/session/mod.rs:2839] |
| `environment_id` | string | 否 | primary environment | schema 描述为来自 `<environment_context>` 的 id，省略时使用 primary environment。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:170][E: codex-rs/core/src/tools/handlers/shell_spec.rs:172] | handler 接受 `environment_id` / `environmentId` alias，调用 `resolve_tool_environment` 选环境；没有环境时报错。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:26][E: codex-rs/core/src/tools/handlers/request_permissions.rs:70][E: codex-rs/core/src/tools/handlers/request_permissions.rs:76] |
| `permissions.network.enabled` | boolean | 否 | none | network schema 只有 `enabled` boolean，true 表示请求网络访问。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:296][E: codex-rs/core/src/tools/handlers/shell_spec.rs:298] | protocol profile 的 `network` 字段是 optional；空 profile 由 `is_empty()` 判定。[E: codex-rs/protocol/src/request_permissions.rs:20][E: codex-rs/protocol/src/request_permissions.rs:26] |
| `permissions.file_system.read` | array<string> | 否 | none | filesystem schema 的 read 字段是路径数组，描述要求 absolute paths。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:312][E: codex-rs/core/src/tools/handlers/shell_spec.rs:316] | handler 在选中 environment 的 policy context 下解析参数，再做 normalize。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:80][E: codex-rs/core/src/tools/handlers/request_permissions.rs:95] |
| `permissions.file_system.write` | array<string> | 否 | none | write 字段同样是 absolute path 数组。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:322][E: codex-rs/core/src/tools/handlers/shell_spec.rs:326] | response 最终会和 requested permissions 求交，避免返回超出请求集合的路径。[E: codex-rs/core/src/session/mod.rs:3106][E: codex-rs/core/src/session/mod.rs:3107] |

`parameters` 使用 `JsonSchema::object(..., Some(vec!["permissions"]), Some(false))`，所以 schema 层关闭 additional properties。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:184][E: codex-rs/core/src/tools/handlers/shell_spec.rs:186][E: codex-rs/core/src/tools/handlers/shell_spec.rs:187]

## 4 输出

`request_permissions` 不声明 structured output schema；handler 把 `RequestPermissionsResponse` 序列化为 JSON 文本，再用 `FunctionToolOutput::from_text(content, Some(true))` 返回。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:189][E: codex-rs/core/src/tools/handlers/request_permissions.rs:126]

协议响应包含 `permissions`、默认 `scope` 和 `strict_auto_review`；scope enum 当前有 `Turn` 和 `Session` 两个值。[E: codex-rs/protocol/src/request_permissions.rs:12][E: codex-rs/protocol/src/request_permissions.rs:14][E: codex-rs/protocol/src/request_permissions.rs:15][E: codex-rs/protocol/src/request_permissions.rs:65][E: codex-rs/protocol/src/request_permissions.rs:68][E: codex-rs/protocol/src/request_permissions.rs:71]

## 5 注册与门控

`add_core_utility_tools` 只在 `Feature::RequestPermissionsTool` 开启且 current tool environment mode 有 environment 时注册 `RequestPermissionsHandler`。该 feature 当前是 UnderDevelopment，默认关闭。[E: codex-rs/core/src/tools/spec_plan.rs:1202][E: codex-rs/features/src/lib.rs:1173][E: codex-rs/features/src/lib.rs:1175][E: codex-rs/features/src/lib.rs:1176]

visible spec 构建沿用普通 runtime 流程：direct exposure 的 runtime spec 会加入 model-visible specs；本 handler 通过默认 exposure 注册，没有额外 hidden/deferred override。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:133][E: codex-rs/tools/src/tool_executor.rs:114]

## 6 parallel support

`RequestPermissionsHandler` 没有覆盖 `supports_parallel_tool_calls()`，因此使用 `ToolExecutor` 默认 false；router 查询 registry 的支持位。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:30][E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/core/src/tools/registry.rs:486]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:61][E: codex-rs/core/src/tools/handlers/request_permissions.rs:64]
2. 它先解析 environment args，选择 turn environment；选中 environment 必须能提供 policy context。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:70][E: codex-rs/core/src/tools/handlers/request_permissions.rs:82]
3. 它解析完整 `RequestPermissionsArgs`，然后把 `permissions` 规范化回 request profile。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:89][E: codex-rs/core/src/tools/handlers/request_permissions.rs:95]
4. 空 permission profile 直接向模型报错，不进入 session approval path。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:99]
5. session 在 approval policy 为 `Never` 或 granular policy 不允许 request permissions 时，立即返回空权限 turn-scope response。[E: codex-rs/core/src/session/mod.rs:2800][E: codex-rs/core/src/session/mod.rs:2808]
6. Guardian path 检查 `routes_approval_policy_to_guardian`，构造共享 `ApprovalAction::RequestPermissions`，再 `request_guardian_approval`。该入口 spawn `run_guardian_review`。[E: codex-rs/core/src/session/mod.rs:2830][E: codex-rs/core/src/session/mod.rs:2836][E: codex-rs/core/src/session/mod.rs:2855][E: codex-rs/core/src/tools/approvals.rs:586][E: codex-rs/core/src/guardian/review.rs:344] V2 `fast_decision` 是否先于 child reviewer claim 低风险请求，属于 Guardian review 实现，不是本 handler 的独立路径。[I]
7. review decision 映射成 turn-scope 授权或空权限，然后 normalize 并按 environment id 记录。[E: codex-rs/core/src/session/mod.rs:2860]
8. 非 Guardian path 创建 pending request entry，发出 `EventMsg::RequestPermissions`，等待客户端通过 call id 返回 response。[E: codex-rs/core/src/session/mod.rs:2918][E: codex-rs/core/src/session/mod.rs:2933]
9. 客户端 `Op::RequestPermissionsResponse` 由 helper `request_permissions_response` 转给 `notify_request_permissions_response`；该函数移除 pending entry、normalize response，再发送给等待中的 handler。[E: codex-rs/core/src/session/handlers.rs:224][E: codex-rs/core/src/session/mod.rs:3040][E: codex-rs/core/src/session/mod.rs:3050]
10. normalize 会拒绝 session-scope strict auto review，并把 granted permissions 与 requested permissions 求交；空 permissions 原样返回。[E: codex-rs/core/src/session/mod.rs:3089][E: codex-rs/core/src/session/mod.rs:3094][E: codex-rs/core/src/session/mod.rs:3102]
11. turn scope 写入 originating turn state，session scope 写入 session state；strict auto review 只在 turn scope 下启用。记录键是 environment id，因此每个 environment 各自持有 granted profile。[E: codex-rs/core/src/session/mod.rs:3128][E: codex-rs/core/src/session/mod.rs:3134][E: codex-rs/core/src/session/mod.rs:3139]
12. TUI `SelectPermissionProfile` 对内置/`:` id 或 embedded 本地 custom profile 直接 apply；否则经 `thread/settings/update` 把 named profile id 发给 app-server（远程 named profile 选择）。[E: codex-rs/tui/src/app/event_dispatch.rs:2492][E: codex-rs/tui/src/app/config_persistence.rs:280][E: codex-rs/tui/src/app/config_persistence.rs:324]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/request_permissions.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/approvals.rs`
- `codex-rs/core/src/guardian/review.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/request_permissions.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/tui/src/app_event.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/app/config_persistence.rs`

## 相关

- [exec_command 工具](exec-command.md) — 后续 shell-like command 会自动看到 turn/session grants。
- [shell_command（已退役）](shell-command.md) — 已不再注册 handler；granted permissions 由后续 `exec_command` 消费。
- [Guardian V1](../../subsystems/core/approval-guardian.md)
- [Guardian V2](../../subsystems/core/approval-guardian-v2.md)
