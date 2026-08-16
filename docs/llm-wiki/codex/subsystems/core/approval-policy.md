---
id: subsys.core.approval-policy
title: Approval policy 与权限状态机
kind: subsystem
tier: T2
source: [codex-rs/utils/approval-presets/src/lib.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/approvals.rs, codex-rs/protocol/src/permission_profile_snapshot.rs, codex-rs/protocol/src/environment.rs, codex-rs/protocol/src/models.rs, codex-rs/core/src/exec_policy.rs, codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/tools/network_approval.rs, codex-rs/core/src/tools/runtimes/shell.rs, codex-rs/core/src/session/mod.rs]
symbols: [ApprovalPreset, AskForApproval, PermissionProfile, PermissionProfileSnapshot, ActivePermissionProfile, EnvironmentConfig, GranularApprovalConfig, SandboxPolicy, ExecPolicyManager, ExecApprovalRequestEvent, ApprovalKey, ApprovalAction, ApprovalReviewer, Session::request_approval, create_exec_approval_requirement_for_command, prompt_is_rejected_by_policy, load_exec_policy, render_decision_for_unmatched_command, ApprovalsReviewer, NetworkApprovalService, PendingApprovalDecision, NetworkSandboxPolicy, SandboxMode]
related: [subsys.core.approval-guardian, subsys.core.approval-guardian-v2, subsys.exec-sandbox.execpolicy-dsl, config.approval-sandbox, ref.protocol-items]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Approval policy 是 Codex 把 preset、`AskForApproval`、permission profile、sandbox policy 和 execpolicy rules 折叠为命令运行要求的状态机。当前 preset 不再直接携带 `SandboxPolicy` 字段，而是携带 `active_permission_profile` 和 `permission_profile`。每个 environment attachment 再带一份 `PermissionProfileSnapshot`。[E: codex-rs/utils/approval-presets/src/lib.rs:10][E: codex-rs/utils/approval-presets/src/lib.rs:20][E: codex-rs/protocol/src/permission_profile_snapshot.rs:13][E: codex-rs/protocol/src/environment.rs:23]

## 能回答的问题

- 内置 `read-only`、`auto`、`full-access` preset 分别映射到哪个 approval mode 和 permission profile？
- `AskForApproval::Never`、`OnRequest`、`UnlessTrusted`、`Granular` 如何影响 allow/prompt/forbid？
- `PermissionProfileSnapshot` 如何把 concrete profile、active identity 和 profile workspace roots 绑在一起？
- 每个 environment 的 permission profile 存在哪里？
- execpolicy `Decision::Prompt` 什么时候被 policy 拒绝，而不是发 approval？
- approval request event 给 UI 暴露哪些字段？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/utils/approval-presets/src/lib.rs` | 定义内置 approval presets 以及 built-in profile 到 `PermissionProfile` 的映射。[E: codex-rs/utils/approval-presets/src/lib.rs:28][E: codex-rs/utils/approval-presets/src/lib.rs:64] |
| `codex-rs/protocol/src/protocol.rs` | 定义 `AskForApproval`、`GranularApprovalConfig`、`SandboxPolicy` 等 protocol shape。[E: codex-rs/protocol/src/protocol.rs:914][E: codex-rs/protocol/src/protocol.rs:941][E: codex-rs/protocol/src/protocol.rs:1001] |
| `codex-rs/protocol/src/models.rs` | canonical `PermissionProfile` / `ActivePermissionProfile`。[E: codex-rs/protocol/src/models.rs:318][E: codex-rs/protocol/src/models.rs:341] |
| `codex-rs/protocol/src/permission_profile_snapshot.rs` | 已解析的 trusted snapshot：concrete profile + optional identity + profile roots。[E: codex-rs/protocol/src/permission_profile_snapshot.rs:13] |
| `codex-rs/protocol/src/environment.rs` | 每个 environment attachment 的 `EnvironmentConfig.permission_profile` 就是一份 snapshot。[E: codex-rs/protocol/src/environment.rs:19] |
| `codex-rs/protocol/src/approvals.rs` | 定义 `ExecPolicyAmendment`、Guardian assessment action/event、exec approval request event。[E: codex-rs/protocol/src/approvals.rs:40][E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:226] |
| `codex-rs/core/src/exec_policy.rs` | 加载 execpolicy、检查命令、生成 `ExecApprovalRequirement`、追加 allow/network rule。[E: codex-rs/core/src/exec_policy.rs:300][E: codex-rs/core/src/exec_policy.rs:312][E: codex-rs/core/src/exec_policy.rs:439][E: codex-rs/core/src/exec_policy.rs:489] |
| `codex-rs/core/src/tools/approvals.rs` | central approval policy stage：先跑 permission-request hooks，再路由 Guardian/user reviewer。[E: codex-rs/core/src/tools/approvals.rs:502][E: codex-rs/core/src/tools/approvals.rs:548] |
| `codex-rs/core/src/tools/network_approval.rs` | 管理 network approval、session allow/deny cache，并把 policy amendment 持久化成败折叠为 fail-closed 的待决结果。[E: codex-rs/core/src/tools/network_approval.rs:841][E: codex-rs/core/src/tools/network_approval.rs:874] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ApprovalPreset` | 字段是 `id`、`label`、`description`、`approval`、`active_permission_profile`、`permission_profile`。[E: codex-rs/utils/approval-presets/src/lib.rs:10][E: codex-rs/utils/approval-presets/src/lib.rs:20][E: codex-rs/utils/approval-presets/src/lib.rs:22] |
| built-in presets | `read-only` 和 `auto` 都是 `AskForApproval::OnRequest`；`full-access` 是 `AskForApproval::Never` 且 `PermissionProfile::Disabled`。[E: codex-rs/utils/approval-presets/src/lib.rs:34][E: codex-rs/utils/approval-presets/src/lib.rs:38][E: codex-rs/utils/approval-presets/src/lib.rs:48][E: codex-rs/utils/approval-presets/src/lib.rs:54][E: codex-rs/utils/approval-presets/src/lib.rs:58] |
| `AskForApproval` | 变体包括 `UnlessTrusted`、default `OnRequest`、`Granular(GranularApprovalConfig)` 和 `Never`；legacy serialized value `on-failure` is accepted as an alias for `OnRequest` rather than a separate enum variant。[E: codex-rs/protocol/src/protocol.rs:914][E: codex-rs/protocol/src/protocol.rs:920][E: codex-rs/protocol/src/protocol.rs:923][E: codex-rs/protocol/src/protocol.rs:925][E: codex-rs/protocol/src/protocol.rs:933][E: codex-rs/protocol/src/protocol.rs:937] |
| `GranularApprovalConfig` | 独立控制 sandbox approval、execpolicy prompt rules、skill approval、`request_permissions`、MCP elicitation prompt。[E: codex-rs/protocol/src/protocol.rs:941][E: codex-rs/protocol/src/protocol.rs:944][E: codex-rs/protocol/src/protocol.rs:946][E: codex-rs/protocol/src/protocol.rs:949][E: codex-rs/protocol/src/protocol.rs:952][E: codex-rs/protocol/src/protocol.rs:954] |
| `PermissionProfile` | `Managed { file_system, network }` / `Disabled` / `External { network }`。runtime 必须遵守这个 concrete enum，不能从名字反推。[E: codex-rs/protocol/src/models.rs:318][E: codex-rs/protocol/src/models.rs:327][E: codex-rs/protocol/src/models.rs:331] |
| `ActivePermissionProfile` | sidecar identity：`id`（如 `:workspace`）和 optional `extends`。只给 UI 显示，不替代 concrete profile。[E: codex-rs/protocol/src/models.rs:341][E: codex-rs/protocol/src/models.rs:345] |
| `PermissionProfileSnapshot` | 把 concrete `PermissionProfile`、optional `ActivePermissionProfile`、`profile_workspace_roots` 绑成原子安装单元。`legacy()` 没有 identity；`active` / `active_with_profile_workspace_roots` 给已解析的 named profile。[E: codex-rs/protocol/src/permission_profile_snapshot.rs:13][E: codex-rs/protocol/src/permission_profile_snapshot.rs:24][E: codex-rs/protocol/src/permission_profile_snapshot.rs:33][E: codex-rs/protocol/src/permission_profile_snapshot.rs:47] |
| per-environment profile | `EnvironmentConfig.permission_profile` 是 `PermissionProfileSnapshot`。`EnvironmentConfigState` 可以是 `FromThread` / `Pending` / `Ready` / `Failed`，所以 attachment 可以先挂上再补配置。[E: codex-rs/protocol/src/environment.rs:6][E: codex-rs/protocol/src/environment.rs:19][E: codex-rs/protocol/src/environment.rs:23] |
| session/thread snapshots | `SessionConfigured` / `ThreadSettingsSnapshot` / `TurnContextItem` 都直接携带 `permission_profile` 和 optional `active_permission_profile`。[E: codex-rs/protocol/src/protocol.rs:2053][E: codex-rs/protocol/src/protocol.rs:3690][E: codex-rs/protocol/src/protocol.rs:3038] |
| `SandboxPolicy` | 表达 danger-full-access、read-only、external sandbox、workspace-write 及 network/filesystem 约束；它仍是 protocol 类型，但 built-in presets 现在通过 permission profiles 表达运行权限。[E: codex-rs/protocol/src/protocol.rs:1001][I] |
| `ExecApprovalRequestEvent` | UI event 携带 command、cwd、reason、network context、proposed exec/network amendments、additional permissions、available decisions 和 parsed command。[E: codex-rs/protocol/src/approvals.rs:226][E: codex-rs/protocol/src/approvals.rs:261][E: codex-rs/protocol/src/approvals.rs:263][E: codex-rs/protocol/src/approvals.rs:266][E: codex-rs/protocol/src/approvals.rs:270][E: codex-rs/protocol/src/approvals.rs:274][E: codex-rs/protocol/src/approvals.rs:278][E: codex-rs/protocol/src/approvals.rs:282][E: codex-rs/protocol/src/approvals.rs:289][E: codex-rs/protocol/src/approvals.rs:290] |

## 控制流

1. `load_exec_policy` 按 config layer 从低到高读取 `rules` 目录，必要时跳过 user/project rules，最后把 requirements 里的 `exec_policy` overlay 合并进 policy。[E: codex-rs/core/src/exec_policy.rs:637][E: codex-rs/core/src/exec_policy.rs:644][E: codex-rs/core/src/exec_policy.rs:645][E: codex-rs/core/src/exec_policy.rs:686][E: codex-rs/core/src/exec_policy.rs:690]
2. `ExecPolicyManager::create_exec_approval_requirement_for_command` 接收 command、cwd、approval policy、permission profile、sandbox permissions、command origin 等输入，并先把 command 转成 execpolicy 可匹配的 command segments。[E: codex-rs/core/src/exec_policy.rs:312][E: codex-rs/core/src/exec_policy.rs:316]
3. `Decision::Forbidden` 直接返回 `ExecApprovalRequirement::Forbidden`；不会先发用户 prompt。[E: codex-rs/core/src/exec_policy.rs:372]
4. `Decision::Prompt` 会先经过 `prompt_is_rejected_by_policy`：`Never` 拒绝 prompt；`OnRequest` 和 `UnlessTrusted` 允许 prompt；`Granular` 依据 prompt 来源检查对应 allow flag。[E: codex-rs/core/src/exec_policy.rs:217][E: codex-rs/core/src/exec_policy.rs:221][E: codex-rs/core/src/exec_policy.rs:224][E: codex-rs/core/src/exec_policy.rs:387]
5. prompt 没被拒绝时返回 `ExecApprovalRequirement::NeedsApproval`，可携带 requested 或自动推导的 `proposed_execpolicy_amendment`。[E: codex-rs/core/src/exec_policy.rs:401]
6. `Decision::Allow` 返回 `Skip`；只有每个 command segment 都显式匹配 allow policy 时才设置 `bypass_sandbox: true`。[E: codex-rs/core/src/exec_policy.rs:415][E: codex-rs/core/src/exec_policy.rs:418]
7. unmatched command fallback 中，known-safe command 只有在未使用 complex parsing 且 policy 是 `UnlessTrusted` 或命中特定 Windows legacy managed-filesystem case 时 allow。dangerous command，以及缺少 managed-filesystem backend 的 Windows legacy case，会先进入更严格分支：`Never` 直接 forbidden，其余 approval policies prompt；这里不会因 sandbox disabled/external 而放行。[E: codex-rs/core/src/exec_policy.rs:727][E: codex-rs/core/src/exec_policy.rs:758][E: codex-rs/core/src/exec_policy.rs:772][E: codex-rs/core/src/exec_policy.rs:774]
8. 对没有命中 dangerous/Windows legacy managed-filesystem earlier branch 的非危险 unmatched command，`OnRequest` 和 `Granular` 在 unrestricted/external filesystem policy 下 allow；restricted sandbox 只有请求 sandbox override 时 prompt，否则 allow。[E: codex-rs/core/src/exec_policy.rs:793][E: codex-rs/core/src/exec_policy.rs:801][E: codex-rs/core/src/exec_policy.rs:813][E: codex-rs/core/src/exec_policy.rs:820]
9. 接受 execpolicy amendment 时，`append_amendment_and_update` 写入默认 policy file，并在内存 policy 中补一条 allow prefix rule；network rule 走 `append_network_rule_and_update` 写文件并更新内存 policy。[E: codex-rs/core/src/exec_policy.rs:439][E: codex-rs/core/src/exec_policy.rs:453][E: codex-rs/core/src/exec_policy.rs:484][E: codex-rs/core/src/exec_policy.rs:489][E: codex-rs/core/src/exec_policy.rs:530]
10. network allow amendment 只有在 `persist_network_policy_amendment` 的成功回调把 drop decision 改为 `AllowForSession` 后，才会清除 session deny 并写入 session allow cache；持久化失败会发 warning，保持默认 deny，并让当前请求返回 `Deny`。[E: codex-rs/core/src/tools/network_approval.rs:841][E: codex-rs/core/src/tools/network_approval.rs:862][E: codex-rs/core/src/tools/network_approval.rs:874][E: codex-rs/core/src/session/mod.rs:2242]

Tool runtime 真正请求审批时统一进入 `Session::request_approval()`：若 tool 产生 permission-request payload，hook 的 allow/deny 先于 reviewer 生效；hook 未决时才按 `ApprovalReviewer` 路由 Guardian 或 user UI。Guardian/user 的 deny、abort、timeout 会归一化为 `ToolError::Rejected`。[E: codex-rs/core/src/tools/approvals.rs:502][E: codex-rs/core/src/tools/approvals.rs:548][E: codex-rs/core/src/tools/approvals.rs:454]

shell runtime 的 cache/dedup `ApprovalKey` 包含 environment、canonical command、cwd、sandbox 与 additional permissions；其中 cwd 类型是 `PathUri`，并由 absolute path 显式转换。[E: codex-rs/core/src/tools/runtimes/shell.rs:93][E: codex-rs/core/src/tools/runtimes/shell.rs:96][E: codex-rs/core/src/tools/runtimes/shell.rs:135][I]

## 设计动机与权衡

- preset 层给 UI 一个三档选择，但 runtime 仍保留 granular approval、per-environment `PermissionProfileSnapshot`、execpolicy DSL 和 network amendments，这说明简单 preset 不是权限系统的唯一状态来源。[E: codex-rs/utils/approval-presets/src/lib.rs:28][E: codex-rs/protocol/src/environment.rs:23][E: codex-rs/core/src/exec_policy.rs:637][I]
- snapshot 把“用户选了哪个 named profile”和“实际生效的 concrete permissions”分开安装，避免客户端用 id 反推 runtime 权限。[E: codex-rs/protocol/src/permission_profile_snapshot.rs:13][E: codex-rs/protocol/src/models.rs:341][I]
- `prompt_is_rejected_by_policy` 把 “rule 想 prompt” 和 “当前 approval policy 允许 prompt” 分开，避免 `Never` 或 granular deny 被 execpolicy prompt rule 绕过。[E: codex-rs/core/src/exec_policy.rs:217][E: codex-rs/core/src/exec_policy.rs:387][I]
- `bypass_sandbox` 比 allow 更严格：命令要运行可以是 allow，但只有全部 segment 都命中 allow policy 时才绕过 sandbox。[E: codex-rs/core/src/exec_policy.rs:415][E: codex-rs/core/src/exec_policy.rs:418][I]
- network amendment 把“用户选择 allow”与“规则已成功落盘”分开；只有后者才能放行当前调用并形成 session 级授权。[E: codex-rs/core/src/tools/network_approval.rs:841][E: codex-rs/core/src/tools/network_approval.rs:874][I]

## Gotcha

- `on-failure` 现在只是 `OnRequest` 的 serde alias，不是独立的 `AskForApproval` variant；新文档不要把它当成推荐模式。[E: codex-rs/protocol/src/protocol.rs:923]
- `full-access` preset 是 `AskForApproval::Never` 加 `PermissionProfile::Disabled`，不是 “自动问询后批准”。[E: codex-rs/utils/approval-presets/src/lib.rs:54][E: codex-rs/utils/approval-presets/src/lib.rs:58]
- `Granular` 的 unmatched command fallback mirrors `OnRequest`，但 prompt-vs-reject 仍由 `prompt_is_rejected_by_policy` 决定。[E: codex-rs/core/src/exec_policy.rs:813][E: codex-rs/core/src/exec_policy.rs:817]
- environment attachment 可以是 `Pending`：先挂环境，permission snapshot 后到。在 `Ready` 之前不要假设已有可执行 profile。[E: codex-rs/protocol/src/environment.rs:10]
- network allow amendment 的持久化错误不是“本次放行、下次再修”；它会警告并 fail closed，当前请求也被拒绝。[E: codex-rs/core/src/tools/network_approval.rs:862][E: codex-rs/core/src/tools/network_approval.rs:881]

## Sources

- `codex-rs/utils/approval-presets/src/lib.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/protocol/src/permission_profile_snapshot.rs`
- `codex-rs/protocol/src/environment.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/core/src/exec_policy.rs`
- `codex-rs/core/src/tools/approvals.rs`
- `codex-rs/core/src/tools/network_approval.rs`
- `codex-rs/core/src/tools/runtimes/shell.rs`
- `codex-rs/core/src/session/mod.rs`

## 相关

- [Approval Guardian](approval-guardian.md)
- [Guardian V2 风险分类与预审](approval-guardian-v2.md)
- [execpolicy DSL](../exec-sandbox/execpolicy-dsl.md)
- [approval/sandbox 配置](../../config/approval-sandbox.md)
- 索引 id：`ref.protocol-items`
