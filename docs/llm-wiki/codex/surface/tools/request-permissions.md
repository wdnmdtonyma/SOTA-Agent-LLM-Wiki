---
id: tool.request-permissions
title: request_permissions 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/local_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/features/src/lib.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/request_permissions.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/protocol/src/request_permissions.rs]
symbols: [create_request_permissions_tool, request_permissions_tool_description, ToolHandlerKind::RequestPermissions, RequestPermissionsHandler, Session::request_permissions, RequestPermissionsArgs, RequestPermissionsEvent, RequestPermissionsResponse]
related: [spine.tool-call-anatomy, subsys.core.tool-system, subsys.core.approval-policy, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `request_permissions` 是 Codex 暴露给模型的权限增量申请工具；它请求 filesystem/network permission profile，等待客户端或 guardian 返回获批子集，并把获批权限记录到当前 turn 或整个 session。[E: codex-rs/core/src/session/mod.rs:1850][E: codex-rs/core/src/session/mod.rs:2151]

## 能回答的问题

- `request_permissions` 的输入字段如何表达 network 和 file_system 权限？
- `request_permissions` 和 shell 工具的 `sandbox_permissions` 有什么关系？
- `request_permissions` 的 feature gate 和 registry gate 是什么？
- `request_permissions` 返回的权限为什么可能是请求权限的子集？
- `request_permissions` 如何接入 guardian 或客户端审批？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `request_permissions` | `ResponsesApiTool.name` 固定为 `request_permissions`。[E: codex-rs/tools/src/local_tool.rs:281] |
| aliases | 未看到独立 alias；registry 注册的 handler name 是 `request_permissions`。 | `plan.register_handler("request_permissions", ToolHandlerKind::RequestPermissions)`。[E: codex-rs/tools/src/tool_registry_plan.rs:254][I] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_request_permissions_tool` 返回 `ToolSpec::Function`。[E: codex-rs/tools/src/local_tool.rs:280] |
| ToolHandlerKind | `ToolHandlerKind::RequestPermissions` | enum 定义 `RequestPermissions` 变体。[E: codex-rs/tools/src/tool_registry_plan_types.rs:28] |
| core handler | `RequestPermissionsHandler` | `core/src/tools/spec.rs` 创建 `Arc::new(RequestPermissionsHandler)`。[E: codex-rs/core/src/tools/spec.rs:157] |
| 所属 crate | spec 在 `codex-tools` 的 `local_tool.rs`，执行在 `codex-core`，协议在 `codex-protocol`。 | spec 构造 `ToolSpec::Function`，handler 使用 `RequestPermissionsArgs`，协议定义 `RequestPermissionsArgs`。[E: codex-rs/tools/src/local_tool.rs:280][E: codex-rs/core/src/tools/handlers/request_permissions.rs:4][E: codex-rs/protocol/src/request_permissions.rs:50] |

## 2 用途定位

`request_permissions_tool_description` 明确说该工具请求额外 filesystem 或 network permissions，并等待 client 授予请求 profile 的子集。[E: codex-rs/tools/src/local_tool.rs:295]  
获批权限会自动应用到当前 turn 后续 shell-like commands，若 client 以 session scope 批准则应用到剩余 session。[E: codex-rs/tools/src/local_tool.rs:295]  
该工具补足 shell 参数里的 per-command override：shell 参数 `additional_permissions` 位于 shell-like 工具 schema，而 `request_permissions` 是独立工具，可先申请能力再让后续 shell-like command 使用。[E: codex-rs/tools/src/local_tool.rs:371][E: codex-rs/tools/src/local_tool.rs:281][I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `reason` | string | 否 | 无 | 为什么需要额外权限的短说明。 | schema description 写为 optional short explanation。[E: codex-rs/tools/src/local_tool.rs:272][E: codex-rs/tools/src/local_tool.rs:274] |
| `permissions` | object | 是 | 无 | 请求的 permission profile。 | 顶层 schema required 只包含 `permissions`。[E: codex-rs/tools/src/local_tool.rs:277][E: codex-rs/tools/src/local_tool.rs:287] |
| `permissions.network.enabled` | boolean | 否 | 无 | 请求 network access。 | network schema 只有 `enabled` boolean。[E: codex-rs/tools/src/local_tool.rs:391][E: codex-rs/tools/src/local_tool.rs:394] |
| `permissions.file_system.read` | array<string> | 否 | 无 | 需要 read access 的绝对路径列表。 | description 要求 absolute paths。[E: codex-rs/tools/src/local_tool.rs:405][E: codex-rs/tools/src/local_tool.rs:408] |
| `permissions.file_system.write` | array<string> | 否 | 无 | 需要 write access 的绝对路径列表。 | description 要求 absolute paths。[E: codex-rs/tools/src/local_tool.rs:412][E: codex-rs/tools/src/local_tool.rs:415] |

协议层 `RequestPermissionProfile` 包含可选 `network` 与 `file_system` 两个字段，并用 `is_empty` 判断两者都为空。[E: codex-rs/protocol/src/request_permissions.rs:21][E: codex-rs/protocol/src/request_permissions.rs:22][E: codex-rs/protocol/src/request_permissions.rs:27]  
handler 会用 turn cwd 解析参数中的相对路径，再调用 `normalize_additional_permissions` 规范化 permission profile。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:41][E: codex-rs/core/src/tools/handlers/request_permissions.rs:42]  
如果规范化后 profile 为空，handler 返回 `request_permissions requires at least one permission`。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:45][E: codex-rs/core/src/tools/handlers/request_permissions.rs:47]

## 4 输出 schema & 截断

`request_permissions` 的 `ResponsesApiTool.output_schema` 是 `None`，没有声明结构化 output schema。[E: codex-rs/tools/src/local_tool.rs:290]  
协议响应是 `RequestPermissionsResponse { permissions, scope }`，`scope` 默认为 `PermissionGrantScope::Turn`，也可为 `Session`。[E: codex-rs/protocol/src/request_permissions.rs:57][E: codex-rs/protocol/src/request_permissions.rs:60][E: codex-rs/protocol/src/request_permissions.rs:13][E: codex-rs/protocol/src/request_permissions.rs:15]  
handler 把 `RequestPermissionsResponse` 序列化为 JSON 文本，并用 `FunctionToolOutput::from_text(content, Some(true))` 返回给模型。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:60][E: codex-rs/core/src/tools/handlers/request_permissions.rs:66]

## 5 ToolSpec 类型

`request_permissions` 是普通 Function ToolSpec；模型提交 JSON permission profile，core 本地 handler 解析 `ToolPayload::Function { arguments }` 后进入审批和权限记录路径。[E: codex-rs/tools/src/local_tool.rs:280][E: codex-rs/core/src/tools/handlers/request_permissions.rs:32][E: codex-rs/core/src/session/mod.rs:1850][I]  
`RequestPermissionsHandler.kind()` 返回 `ToolKind::Function`。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:17]

## 6 注册与门控

`build_tool_registry_plan` 只有在 `config.request_permissions_tool_enabled` 为 true 时 push spec 并注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:248][E: codex-rs/tools/src/tool_registry_plan.rs:249][E: codex-rs/tools/src/tool_registry_plan.rs:254]  
`ToolsConfig::new` 把 `request_permissions_tool_enabled` 设置为 `features.enabled(Feature::RequestPermissionsTool)`。[E: codex-rs/tools/src/tool_config.rs:163][E: codex-rs/tools/src/tool_config.rs:220]  
`Feature::RequestPermissionsTool` 在 feature catalog 中 key 为 `request_permissions_tool`，stage 是 `UnderDevelopment`，默认关闭。[E: codex-rs/features/src/lib.rs:750][E: codex-rs/features/src/lib.rs:751][E: codex-rs/features/src/lib.rs:753]

## 7 parallel-safe

`request_permissions` 的 `supports_parallel_tool_calls` 实际值是 `false`。[E: codex-rs/tools/src/tool_registry_plan.rs:251]  
该工具会注册 pending request 并等待用户/guardian 决策；并发权限请求会让用户面对多个审批 surface，并增加 requested/approved 子集归属复杂度。[I]  
`Session::request_permissions_for_cwd` 用 `call_id` 作为 pending request key，后续响应也按同一个 `call_id` 移除 pending entry。[E: codex-rs/core/src/session/mod.rs:1979][E: codex-rs/core/src/session/mod.rs:2096]

## 8 handler 走读

1. `core/src/tools/spec.rs` 创建 `Arc<RequestPermissionsHandler>`，并在 `ToolHandlerKind::RequestPermissions` 分支注册到 builder。[E: codex-rs/core/src/tools/spec.rs:157][E: codex-rs/core/src/tools/spec.rs:237]
2. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:32][E: codex-rs/core/src/tools/handlers/request_permissions.rs:35]
3. handler 解析并规范化 `RequestPermissionsArgs`，如果请求为空则返回给模型错误。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:41][E: codex-rs/core/src/tools/handlers/request_permissions.rs:42][E: codex-rs/core/src/tools/handlers/request_permissions.rs:45]
4. handler 调用 `session.request_permissions(&turn, call_id, args, cancellation_token)` 并等待 response。[E: codex-rs/core/src/tools/handlers/request_permissions.rs:52][E: codex-rs/core/src/tools/handlers/request_permissions.rs:53]
5. 如果 approval policy 是 `Never`，session 立即返回空 permissions 和 turn scope。[E: codex-rs/core/src/session/mod.rs:1879][E: codex-rs/core/src/session/mod.rs:1883]
6. 如果 guardian routes approval，session 创建 `GuardianApprovalRequest::RequestPermissions`，再把 guardian decision 映射成 `RequestPermissionsResponse`。[E: codex-rs/core/src/session/mod.rs:1902][E: codex-rs/core/src/session/mod.rs:1910][E: codex-rs/core/src/session/mod.rs:1930]
7. 非 guardian 路径创建 oneshot pending entry，并发出 `EventMsg::RequestPermissions(RequestPermissionsEvent { ... })` 给客户端。[E: codex-rs/core/src/session/mod.rs:1973][E: codex-rs/core/src/session/mod.rs:1995]
8. client 响应进入 `request_permissions_response`，再调用 `Session::notify_request_permissions_response`。[E: codex-rs/core/src/session/handlers.rs:409][E: codex-rs/core/src/session/handlers.rs:414]
9. `normalize_request_permissions_response` 对 requested 与 granted permission profiles 求交集，避免 client 返回超出原请求的能力。[E: codex-rs/core/src/session/mod.rs:2123][E: codex-rs/core/src/session/mod.rs:2133]
10. `record_granted_request_permissions_for_turn` 根据 `scope` 把权限写入 turn state 或 session state。[E: codex-rs/core/src/session/mod.rs:2151][E: codex-rs/core/src/session/mod.rs:2155][E: codex-rs/core/src/session/mod.rs:2160]

## 9 设计动机·edge·历史

`request_permissions` 与 shell 的 `sandbox_permissions=require_escalated` 不同：它请求 permission profile，而 shell 参数还存在 require-escalated execution 这样的 per-command sandbox override。[E: codex-rs/tools/src/local_tool.rs:341][E: codex-rs/tools/src/local_tool.rs:371][I]  
如果 approval policy 或 granular policy 不允许 request permissions，session 返回空权限而不是发出 UI 请求。[E: codex-rs/core/src/session/mod.rs:1880][E: codex-rs/core/src/session/mod.rs:1889]  
client 返回权限会被 intersect 到原请求，说明工具协议设计成“用户可授予子集”，而不是模型说什么就获得什么。[E: codex-rs/core/src/session/mod.rs:2123][E: codex-rs/core/src/session/mod.rs:2137]

## Sources

- `codex-rs/tools/src/local_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/request_permissions.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/state/turn.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/protocol/src/request_permissions.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [审批/沙箱策略解析](../../subsystems/core/approval-policy.md)
- [Guardian 审批流](../../subsystems/core/approval-guardian.md)
