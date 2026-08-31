---
id: subsys.core.approval-policy
title: Approval policy 与权限状态机
kind: subsystem
tier: T2
source: [codex-rs/utils/approval-presets/src/lib.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/approvals.rs, codex-rs/protocol/src/permission_profile_snapshot.rs, codex-rs/protocol/src/environment.rs, codex-rs/protocol/src/models.rs, codex-rs/core/src/exec_policy.rs, codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/tools/network_approval.rs, codex-rs/core/src/tools/runtimes/unified_exec.rs, codex-rs/core/src/session/mod.rs]
symbols: [ApprovalPreset, AskForApproval, PermissionProfile, PermissionProfileSnapshot, ActivePermissionProfile, EnvironmentConfig, GranularApprovalConfig, SandboxPolicy, ExecPolicyManager, ExecApprovalRequestEvent, ApprovalAction, ApprovalReviewer, Session::request_approval, create_exec_approval_requirement_for_command, prompt_is_rejected_by_policy, load_exec_policy, render_decision_for_unmatched_command, ApprovalsReviewer, NetworkApprovalService, PendingApprovalDecision, NetworkSandboxPolicy]
related: [subsys.core.approval-guardian, subsys.core.approval-guardian-v2, subsys.exec-sandbox.execpolicy-dsl, config.approval-sandbox, ref.protocol-items]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Approval policy 是 Codex 把 preset、`AskForApproval`、permission profile、sandbox policy 和 execpolicy rules 折叠为命令运行要求的状态机。当前 preset 不再直接携带 `SandboxPolicy` 字段，而是携带 `active_permission_profile` 和 `permission_profile`。每个 environment attachment 再带一份 `PermissionProfileSnapshot`。shell runtime 的 `ApprovalKey` 已删除，exec 复用 cache 走 `UnifiedExecApprovalKey`。[E: codex-rs/utils/approval-presets/src/lib.rs:10][E: codex-rs/protocol/src/permission_profile_snapshot.rs:13][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:91]

## 能回答的问题

- 内置 `read-only`、`auto`、`full-access` preset 分别映射到哪个 approval mode 和 permission profile？
- `AskForApproval::Never`、`OnRequest`、`UnlessTrusted`、`Granular` 如何影响 allow/prompt/forbid？
- `PermissionProfileSnapshot` 如何把 concrete profile、active identity 和 profile workspace roots 绑在一起？
- 每个 environment 的 permission profile 存在哪里？
- execpolicy `Decision::Prompt` 什么时候被 policy 拒绝，而不是发 approval？
- unmatched command fallback 是否还有 known-safe 特例？
- approval request event 给 UI 暴露哪些字段？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/utils/approval-presets/src/lib.rs` | 定义内置 approval presets 以及 built-in profile 到 `PermissionProfile` 的映射。[E: codex-rs/utils/approval-presets/src/lib.rs:28] |
| `codex-rs/protocol/src/protocol.rs` | 定义 `AskForApproval`、`GranularApprovalConfig`、`SandboxPolicy` 等 protocol shape。[E: codex-rs/protocol/src/protocol.rs:965][E: codex-rs/protocol/src/protocol.rs:991][E: codex-rs/protocol/src/protocol.rs:1051] |
| `codex-rs/protocol/src/models.rs` | canonical `PermissionProfile` / `ActivePermissionProfile`。[E: codex-rs/protocol/src/models.rs:414][E: codex-rs/protocol/src/models.rs:437] |
| `codex-rs/protocol/src/permission_profile_snapshot.rs` | 已解析的 trusted snapshot：concrete profile + optional identity + profile roots。[E: codex-rs/protocol/src/permission_profile_snapshot.rs:13] |
| `codex-rs/protocol/src/environment.rs` | 每个 environment attachment 的 `EnvironmentConfig.permission_profile` 就是一份 snapshot。[E: codex-rs/protocol/src/environment.rs:32] |
| `codex-rs/protocol/src/approvals.rs` | 定义 `ExecApprovalKind`、`ExecApprovalRequestEvent`、Guardian assessment action/event。[E: codex-rs/protocol/src/approvals.rs:238][E: codex-rs/protocol/src/approvals.rs:245] |
| `codex-rs/core/src/exec_policy.rs` | 加载 execpolicy、检查命令、生成 `ExecApprovalRequirement`、追加 allow/network rule。[E: codex-rs/core/src/exec_policy.rs:315][E: codex-rs/core/src/exec_policy.rs:645] |
| `codex-rs/core/src/tools/approvals.rs` | central approval policy stage：先跑 permission-request hooks，再路由 Guardian/user reviewer。[E: codex-rs/core/src/tools/approvals.rs:495] |
| `codex-rs/core/src/tools/network_approval.rs` | 管理 network approval、session allow/deny cache，并把 policy amendment 持久化成败折叠为 fail-closed 的待决结果。[E: codex-rs/core/src/tools/network_approval.rs:862] |
| `codex-rs/core/src/tools/runtimes/unified_exec.rs` | exec 命令 approval cache key：`UnifiedExecApprovalKey`。[E: codex-rs/core/src/tools/runtimes/unified_exec.rs:91] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ApprovalPreset` | 字段是 `id`、`label`、`description`、`approval`、`active_permission_profile`、`permission_profile`。[E: codex-rs/utils/approval-presets/src/lib.rs:10] |
| built-in presets | `read-only` 和 `auto` 都是 `AskForApproval::OnRequest`；`full-access` 是 `AskForApproval::Never` 且 `PermissionProfile::Disabled`。[E: codex-rs/utils/approval-presets/src/lib.rs:34][E: codex-rs/utils/approval-presets/src/lib.rs:44][E: codex-rs/utils/approval-presets/src/lib.rs:54][E: codex-rs/utils/approval-presets/src/lib.rs:58] |
| `AskForApproval` | 变体包括 `UnlessTrusted`、default `OnRequest`、`Granular(GranularApprovalConfig)` 和 `Never`；legacy serialized value `on-failure` 被接受为 `OnRequest` 的 alias，不是独立 variant。[E: codex-rs/protocol/src/protocol.rs:965][E: codex-rs/protocol/src/protocol.rs:973] |
| `GranularApprovalConfig` | 独立控制 sandbox approval、execpolicy prompt rules、`skill_approval`、`request_permissions`、MCP elicitation prompt。[E: codex-rs/protocol/src/protocol.rs:991][E: codex-rs/protocol/src/protocol.rs:999][E: codex-rs/protocol/src/protocol.rs:1002] |
| `PermissionProfile` | `Managed { file_system, network }` / `Disabled` / `External { network }`。runtime 必须遵守这个 concrete enum，不能从名字反推。[E: codex-rs/protocol/src/models.rs:414] |
| `ActivePermissionProfile` | sidecar identity：`id`（如 `:workspace`）和 optional `extends`。只给 UI 显示，不替代 concrete profile。[E: codex-rs/protocol/src/models.rs:437] |
| `PermissionProfileSnapshot` | 把 concrete `PermissionProfile`、optional `ActivePermissionProfile`、`profile_workspace_roots` 绑成原子安装单元。`legacy()` 没有 identity；`active` / `active_with_profile_workspace_roots` 给已解析的 named profile。[E: codex-rs/protocol/src/permission_profile_snapshot.rs:13][E: codex-rs/protocol/src/permission_profile_snapshot.rs:24][E: codex-rs/protocol/src/permission_profile_snapshot.rs:33] |
| per-environment profile | `EnvironmentConfig.permission_profile` 是 `PermissionProfileSnapshot`。`EnvironmentConfigState` 可以是 `FromThread` / `Pending` / `Ready` / `Failed`。[E: codex-rs/protocol/src/environment.rs:13][E: codex-rs/protocol/src/environment.rs:32] |
| session/thread snapshots | `SessionConfigured` / `ThreadSettingsSnapshot` / `TurnContextItem` 都直接携带 `permission_profile` 和 optional `active_permission_profile`。[E: codex-rs/protocol/src/protocol.rs:2170][E: codex-rs/protocol/src/protocol.rs:3158][E: codex-rs/protocol/src/protocol.rs:3809] |
| `SandboxPolicy` | 表达 danger-full-access、read-only、external sandbox、workspace-write 及 network/filesystem 约束；它仍是 protocol 类型，但 built-in presets 现在通过 permission profiles 表达运行权限。[E: codex-rs/protocol/src/protocol.rs:1051][I] |
| `ExecApprovalRequestEvent` | UI event 携带 `kind`（Command / WriteStdin）、plugin_id、script_path、approval_id、turn_id、environment_id、started_at_ms、command、cwd、reason、network context、proposed amendments、additional permissions、available decisions 和 parsed command。[E: codex-rs/protocol/src/approvals.rs:238][E: codex-rs/protocol/src/approvals.rs:245][E: codex-rs/protocol/src/approvals.rs:312] |

## 控制流

1. `load_exec_policy` 按 config layer 从低到高读取 `rules` 目录，必要时跳过 user/project rules，最后把 requirements 里的 `exec_policy` overlay 合并进 policy。[E: codex-rs/core/src/exec_policy.rs:645]
2. `ExecPolicyManager::create_exec_approval_requirement_for_command` 接收 command、cwd、approval policy、permission profile、sandbox permissions、command origin 等输入，并先把 command 转成 execpolicy 可匹配的 command segments。[E: codex-rs/core/src/exec_policy.rs:315]
3. `Decision::Forbidden` 直接返回 `ExecApprovalRequirement::Forbidden`；不会先发用户 prompt。[E: codex-rs/core/src/exec_policy.rs:380]
4. `Decision::Prompt` 会先经过 `prompt_is_rejected_by_policy`：`Never` 拒绝 prompt；`OnRequest` 和 `UnlessTrusted` 允许 prompt；`Granular` 依据 prompt 来源检查对应 allow flag。[E: codex-rs/core/src/exec_policy.rs:216][E: codex-rs/core/src/exec_policy.rs:395]
5. prompt 没被拒绝时返回 `ExecApprovalRequirement::NeedsApproval`，可携带 requested 或自动推导的 `proposed_execpolicy_amendment`。[E: codex-rs/core/src/exec_policy.rs:409]
6. `Decision::Allow` 返回 `Skip`；只有每个 command segment 都显式匹配 allow policy 时才设置 `bypass_sandbox: true`。[E: codex-rs/core/src/exec_policy.rs:423][E: codex-rs/core/src/exec_policy.rs:426]
7. unmatched command fallback **不再**有 known-safe 特例。dangerous command，以及缺少 managed-filesystem backend 的 Windows legacy case，会先进入更严格分支：`Never` 直接 forbidden，其余 approval policies prompt。[E: codex-rs/core/src/exec_policy.rs:735][E: codex-rs/core/src/exec_policy.rs:763]
8. 对没有命中 dangerous/Windows legacy managed-filesystem earlier branch 的非危险 unmatched command，`OnRequest` 和 `Granular` 在 unrestricted/external filesystem policy 下 allow；restricted sandbox 只有请求 sandbox override 时 prompt，否则 allow。[E: codex-rs/core/src/exec_policy.rs:784][E: codex-rs/core/src/exec_policy.rs:804]
9. 接受 execpolicy amendment 时，`append_amendment_and_update` 写入默认 policy file，并在内存 policy 中补一条 allow prefix rule。[E: codex-rs/core/src/exec_policy.rs:447]
10. network allow amendment 只有在 `persist_network_policy_amendment` 成功后，才会把 drop decision 改为 `AllowForSession`、清除 session deny 并写入 session allow cache；持久化失败会发 warning，保持默认 deny。[E: codex-rs/core/src/session/mod.rs:2425][E: codex-rs/core/src/tools/network_approval.rs:862][E: codex-rs/core/src/tools/network_approval.rs:882]

Tool runtime 真正请求审批时统一进入 `Session::request_approval()`：若 `ApprovalAction::WriteStdin` 请求 sandbox override，且当前 policy 不允许 prompt，则直接 `Rejected`，不进 reviewer。其余路径先跑 permission-request hooks，再按 `ApprovalReviewer` 路由 Guardian 或 user UI。[E: codex-rs/core/src/tools/approvals.rs:495][E: codex-rs/core/src/tools/approvals.rs:503]

exec 命令的 cache/dedup key 是 `UnifiedExecApprovalKey`：environment、executable、canonical command、cwd（`PathUri`）、tty、sandbox 与 additional permissions。`ApprovalAction::WriteStdin` 不进入这条 cache。[E: codex-rs/core/src/tools/runtimes/unified_exec.rs:91][E: codex-rs/core/src/tools/approvals.rs:243][E: codex-rs/core/src/tools/approvals.rs:257]

## 设计动机与权衡

- preset 层给 UI 一个三档选择，但 runtime 仍保留 granular approval、per-environment `PermissionProfileSnapshot`、execpolicy DSL 和 network amendments，这说明简单 preset 不是权限系统的唯一状态来源。[E: codex-rs/utils/approval-presets/src/lib.rs:28][E: codex-rs/protocol/src/environment.rs:32][I]
- snapshot 把“用户选了哪个 named profile”和“实际生效的 concrete permissions”分开安装，避免客户端用 id 反推 runtime 权限。[E: codex-rs/protocol/src/permission_profile_snapshot.rs:13][E: codex-rs/protocol/src/models.rs:437][I]
- `prompt_is_rejected_by_policy` 把 “rule 想 prompt” 和 “当前 approval policy 允许 prompt” 分开，避免 `Never` 或 granular deny 被 execpolicy prompt rule 绕过。[E: codex-rs/core/src/exec_policy.rs:216][I]
- `bypass_sandbox` 比 allow 更严格：命令要运行可以是 allow，但只有全部 segment 都命中 allow policy 时才绕过 sandbox。[E: codex-rs/core/src/exec_policy.rs:426][I]
- network amendment 把“用户选择 allow”与“规则已成功落盘”分开；只有后者才能放行当前调用并形成 session 级授权。[E: codex-rs/core/src/tools/network_approval.rs:862][I]

## Gotcha

- `on-failure` 现在只是 `OnRequest` 的 serde alias，不是独立的 `AskForApproval` variant；新文档不要把它当成推荐模式。[E: codex-rs/protocol/src/protocol.rs:973]
- `full-access` preset 是 `AskForApproval::Never` 加 `PermissionProfile::Disabled`，不是 “自动问询后批准”。[E: codex-rs/utils/approval-presets/src/lib.rs:54][E: codex-rs/utils/approval-presets/src/lib.rs:58]
- `Granular` 的 unmatched command fallback mirrors `OnRequest`，但 prompt-vs-reject 仍由 `prompt_is_rejected_by_policy` 决定。[E: codex-rs/core/src/exec_policy.rs:804][E: codex-rs/core/src/exec_policy.rs:216]
- environment attachment 可以是 `Pending`：先挂环境，permission snapshot 后到。在 `Ready` 之前不要假设已有可执行 profile。[E: codex-rs/protocol/src/environment.rs:17]
- network allow amendment 的持久化错误不是“本次放行、下次再修”；它会警告并 fail closed，当前请求也被拒绝。[E: codex-rs/core/src/tools/network_approval.rs:882]

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
- `codex-rs/core/src/tools/runtimes/unified_exec.rs`
- `codex-rs/core/src/session/mod.rs`

## 相关

- [Approval Guardian](approval-guardian.md)
- [Guardian V2 风险分类与预审](approval-guardian-v2.md)
- [execpolicy DSL](../exec-sandbox/execpolicy-dsl.md)
- [approval/sandbox 配置](../../config/approval-sandbox.md)
- 索引 id：`ref.protocol-items`
