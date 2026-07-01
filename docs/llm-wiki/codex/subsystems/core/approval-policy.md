---
id: subsys.core.approval-policy
title: Approval policy 与权限状态机
kind: subsystem
tier: T2
source: [codex-rs/utils/approval-presets/src/lib.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/approvals.rs, codex-rs/core/src/exec_policy.rs]
symbols: [ApprovalPreset, AskForApproval, PermissionProfile, ActivePermissionProfile, GranularApprovalConfig, SandboxPolicy, ExecPolicyManager, ExecApprovalRequestEvent, create_exec_approval_requirement_for_command, prompt_is_rejected_by_policy, load_exec_policy, render_decision_for_unmatched_command]
related: [subsys.core.approval-guardian, subsys.exec-sandbox.execpolicy-dsl, config.approval-sandbox, ref.protocol-items]
evidence: explicit
status: verified
updated: db887d03e1
---

> Approval policy 是 Codex 把 preset、`AskForApproval`、permission profile、sandbox policy 和 execpolicy rules 折叠为命令运行要求的状态机。当前 preset 不再直接携带 `SandboxPolicy` 字段，而是携带 `active_permission_profile` 和 `permission_profile`。[E: codex-rs/utils/approval-presets/src/lib.rs:10][E: codex-rs/utils/approval-presets/src/lib.rs:18][E: codex-rs/utils/approval-presets/src/lib.rs:22][E: codex-rs/core/src/exec_policy.rs:234][E: codex-rs/core/src/exec_policy.rs:269]

## 能回答的问题

- 内置 `read-only`、`auto`、`full-access` preset 分别映射到哪个 approval mode 和 permission profile？
- `AskForApproval::Never`、`OnRequest`、`UnlessTrusted`、`Granular` 如何影响 allow/prompt/forbid？
- execpolicy `Decision::Prompt` 什么时候被 policy 拒绝，而不是发 approval？
- exec/network policy amendment 怎样写回默认 rules file 并更新内存 policy？
- approval request event 给 UI 暴露哪些字段？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/utils/approval-presets/src/lib.rs` | 定义内置 approval presets 以及 built-in profile 到 `PermissionProfile` 的映射。[E: codex-rs/utils/approval-presets/src/lib.rs:28][E: codex-rs/utils/approval-presets/src/lib.rs:64] |
| `codex-rs/protocol/src/protocol.rs` | 定义 `AskForApproval`、`GranularApprovalConfig`、`SandboxPolicy` 等 protocol shape。[E: codex-rs/protocol/src/protocol.rs:901][E: codex-rs/protocol/src/protocol.rs:928][E: codex-rs/protocol/src/protocol.rs:988] |
| `codex-rs/protocol/src/approvals.rs` | 定义 `ExecPolicyAmendment`、Guardian assessment action/event、exec approval request event。[E: codex-rs/protocol/src/approvals.rs:32][E: codex-rs/protocol/src/approvals.rs:137][E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:218] |
| `codex-rs/core/src/exec_policy.rs` | 加载 execpolicy、检查命令、生成 `ExecApprovalRequirement`、追加 allow/network rule。[E: codex-rs/core/src/exec_policy.rs:257][E: codex-rs/core/src/exec_policy.rs:269][E: codex-rs/core/src/exec_policy.rs:376][E: codex-rs/core/src/exec_policy.rs:426] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ApprovalPreset` | 字段是 `id`、`label`、`description`、`approval`、`active_permission_profile`、`permission_profile`。[E: codex-rs/utils/approval-presets/src/lib.rs:10][E: codex-rs/utils/approval-presets/src/lib.rs:18][E: codex-rs/utils/approval-presets/src/lib.rs:20][E: codex-rs/utils/approval-presets/src/lib.rs:22] |
| built-in presets | `read-only` 和 `auto` 都是 `AskForApproval::OnRequest`；`full-access` 是 `AskForApproval::Never` 且 `PermissionProfile::Disabled`。[E: codex-rs/utils/approval-presets/src/lib.rs:31][E: codex-rs/utils/approval-presets/src/lib.rs:34][E: codex-rs/utils/approval-presets/src/lib.rs:38][E: codex-rs/utils/approval-presets/src/lib.rs:41][E: codex-rs/utils/approval-presets/src/lib.rs:44][E: codex-rs/utils/approval-presets/src/lib.rs:48][E: codex-rs/utils/approval-presets/src/lib.rs:51][E: codex-rs/utils/approval-presets/src/lib.rs:54][E: codex-rs/utils/approval-presets/src/lib.rs:58] |
| `AskForApproval` | 变体包括 `UnlessTrusted`、default `OnRequest`、`Granular(GranularApprovalConfig)` 和 `Never`；legacy serialized value `on-failure` is accepted as an alias for `OnRequest` rather than a separate enum variant。[E: codex-rs/protocol/src/protocol.rs:901][E: codex-rs/protocol/src/protocol.rs:907][E: codex-rs/protocol/src/protocol.rs:910][E: codex-rs/protocol/src/protocol.rs:912][E: codex-rs/protocol/src/protocol.rs:920][E: codex-rs/protocol/src/protocol.rs:924] |
| `GranularApprovalConfig` | 独立控制 sandbox approval、execpolicy prompt rules、skill approval、`request_permissions`、MCP elicitation prompt。[E: codex-rs/protocol/src/protocol.rs:928][E: codex-rs/protocol/src/protocol.rs:931][E: codex-rs/protocol/src/protocol.rs:933][E: codex-rs/protocol/src/protocol.rs:936][E: codex-rs/protocol/src/protocol.rs:939][E: codex-rs/protocol/src/protocol.rs:941] |
| `SandboxPolicy` | 表达 danger-full-access、read-only、external sandbox、workspace-write 及 network/filesystem 约束；它仍是 protocol 类型，但 built-in presets 现在通过 permission profiles 表达运行权限。[E: codex-rs/protocol/src/protocol.rs:984][E: codex-rs/protocol/src/protocol.rs:988][E: codex-rs/protocol/src/protocol.rs:993][E: codex-rs/protocol/src/protocol.rs:1002][E: codex-rs/protocol/src/protocol.rs:1011][I] |
| `ExecApprovalRequestEvent` | UI event 携带 command、cwd、reason、network context、proposed exec/network amendments、additional permissions、available decisions 和 parsed command。[E: codex-rs/protocol/src/approvals.rs:218][E: codex-rs/protocol/src/approvals.rs:245][E: codex-rs/protocol/src/approvals.rs:247][E: codex-rs/protocol/src/approvals.rs:250][E: codex-rs/protocol/src/approvals.rs:254][E: codex-rs/protocol/src/approvals.rs:258][E: codex-rs/protocol/src/approvals.rs:262][E: codex-rs/protocol/src/approvals.rs:266][E: codex-rs/protocol/src/approvals.rs:273][E: codex-rs/protocol/src/approvals.rs:274] |

## 控制流

1. `load_exec_policy` 按 config layer 从低到高读取 `rules` 目录，必要时跳过 user/project rules，最后把 requirements 里的 `exec_policy` overlay 合并进 policy。[E: codex-rs/core/src/exec_policy.rs:567][E: codex-rs/core/src/exec_policy.rs:573][E: codex-rs/core/src/exec_policy.rs:574][E: codex-rs/core/src/exec_policy.rs:578][E: codex-rs/core/src/exec_policy.rs:597][E: codex-rs/core/src/exec_policy.rs:619][E: codex-rs/core/src/exec_policy.rs:623]
2. `ExecPolicyManager::create_exec_approval_requirement_for_command` 接收 command、cwd、approval policy、permission profile、sandbox permissions、command origin 等输入，并先把 command 转成 execpolicy 可匹配的 command segments。[E: codex-rs/core/src/exec_policy.rs:269][E: codex-rs/core/src/exec_policy.rs:273][E: codex-rs/core/src/exec_policy.rs:281][E: codex-rs/core/src/exec_policy.rs:282]
3. `Decision::Forbidden` 直接返回 `ExecApprovalRequirement::Forbidden`；不会先发用户 prompt。[E: codex-rs/core/src/exec_policy.rs:326][E: codex-rs/core/src/exec_policy.rs:327][E: codex-rs/core/src/exec_policy.rs:328]
4. `Decision::Prompt` 会先经过 `prompt_is_rejected_by_policy`：`Never` 拒绝 prompt；`OnRequest` 和 `UnlessTrusted` 允许 prompt；`Granular` 依据 prompt 来源检查对应 allow flag。[E: codex-rs/core/src/exec_policy.rs:174][E: codex-rs/core/src/exec_policy.rs:179][E: codex-rs/core/src/exec_policy.rs:180][E: codex-rs/core/src/exec_policy.rs:181][E: codex-rs/core/src/exec_policy.rs:182][E: codex-rs/core/src/exec_policy.rs:189]
5. prompt 没被拒绝时返回 `ExecApprovalRequirement::NeedsApproval`，可携带 requested 或自动推导的 `proposed_execpolicy_amendment`。[E: codex-rs/core/src/exec_policy.rs:330][E: codex-rs/core/src/exec_policy.rs:338][E: codex-rs/core/src/exec_policy.rs:339][E: codex-rs/core/src/exec_policy.rs:340][E: codex-rs/core/src/exec_policy.rs:341]
6. `Decision::Allow` 返回 `Skip`；只有每个 command segment 都显式匹配 allow policy 时才设置 `bypass_sandbox: true`。[E: codex-rs/core/src/exec_policy.rs:352][E: codex-rs/core/src/exec_policy.rs:355][E: codex-rs/core/src/exec_policy.rs:363][E: codex-rs/core/src/exec_policy.rs:364]
7. unmatched command fallback 中，known-safe command 只有在未使用 complex parsing 且 policy 是 `UnlessTrusted` 或命中特定 Windows legacy managed-filesystem case 时 allow；dangerous command 或该 Windows legacy case 在 `Never` 且 sandbox 显式 disabled/external 时 allow，否则 forbidden，其他 approval policies prompt。[E: codex-rs/core/src/exec_policy.rs:627][E: codex-rs/core/src/exec_policy.rs:640][E: codex-rs/core/src/exec_policy.rs:656][E: codex-rs/core/src/exec_policy.rs:657][E: codex-rs/core/src/exec_policy.rs:658][E: codex-rs/core/src/exec_policy.rs:677][E: codex-rs/core/src/exec_policy.rs:678][E: codex-rs/core/src/exec_policy.rs:684][E: codex-rs/core/src/exec_policy.rs:688][E: codex-rs/core/src/exec_policy.rs:691]
8. 对没有命中 dangerous/Windows legacy managed-filesystem earlier branch 的非危险 unmatched command，`OnRequest` 和 `Granular` 在 unrestricted/external filesystem policy 下 allow；restricted sandbox 只有请求 sandbox override 时 prompt，否则 allow。[E: codex-rs/core/src/exec_policy.rs:677][E: codex-rs/core/src/exec_policy.rs:708][E: codex-rs/core/src/exec_policy.rs:709][E: codex-rs/core/src/exec_policy.rs:714][E: codex-rs/core/src/exec_policy.rs:716][E: codex-rs/core/src/exec_policy.rs:720][E: codex-rs/core/src/exec_policy.rs:728][E: codex-rs/core/src/exec_policy.rs:735][E: codex-rs/core/src/exec_policy.rs:738]
9. 接受 execpolicy amendment 时，`append_amendment_and_update` 写入默认 policy file，并在内存 policy 中补一条 allow prefix rule；network rule 走 `append_network_rule_and_update` 写文件并更新内存 policy。[E: codex-rs/core/src/exec_policy.rs:376][E: codex-rs/core/src/exec_policy.rs:390][E: codex-rs/core/src/exec_policy.rs:394][E: codex-rs/core/src/exec_policy.rs:420][E: codex-rs/core/src/exec_policy.rs:421][E: codex-rs/core/src/exec_policy.rs:426][E: codex-rs/core/src/exec_policy.rs:450][E: codex-rs/core/src/exec_policy.rs:466][E: codex-rs/core/src/exec_policy.rs:467]

## 设计动机与权衡

- preset 层给 UI 一个三档选择，但 runtime 仍保留 granular approval、permission profiles、execpolicy DSL 和 network amendments，这说明简单 preset 不是权限系统的唯一状态来源。[E: codex-rs/utils/approval-presets/src/lib.rs:28][E: codex-rs/protocol/src/protocol.rs:928][E: codex-rs/core/src/exec_policy.rs:567][E: codex-rs/core/src/exec_policy.rs:426][I]
- `prompt_is_rejected_by_policy` 把 “rule 想 prompt” 和 “当前 approval policy 允许 prompt” 分开，避免 `Never` 或 granular deny 被 execpolicy prompt rule 绕过。[E: codex-rs/core/src/exec_policy.rs:174][E: codex-rs/core/src/exec_policy.rs:330][E: codex-rs/core/src/exec_policy.rs:334][I]
- `bypass_sandbox` 比 allow 更严格：命令要运行可以是 allow，但只有全部 segment 都命中 allow policy 时才绕过 sandbox。[E: codex-rs/core/src/exec_policy.rs:352][E: codex-rs/core/src/exec_policy.rs:355][E: codex-rs/core/src/exec_policy.rs:364][I]

## Gotcha

- `on-failure` 现在只是 `OnRequest` 的 serde alias，不是独立的 `AskForApproval` variant；新文档不要把它当成推荐模式。[E: codex-rs/protocol/src/protocol.rs:910][E: codex-rs/protocol/src/protocol.rs:912]
- `full-access` preset 是 `AskForApproval::Never` 加 `PermissionProfile::Disabled`，不是 “自动问询后批准”。[E: codex-rs/utils/approval-presets/src/lib.rs:51][E: codex-rs/utils/approval-presets/src/lib.rs:54][E: codex-rs/utils/approval-presets/src/lib.rs:58]
- `Granular` 的 unmatched command fallback mirrors `OnRequest`，但 prompt-vs-reject 仍由 `prompt_is_rejected_by_policy` 决定。[E: codex-rs/core/src/exec_policy.rs:728][E: codex-rs/core/src/exec_policy.rs:730][E: codex-rs/core/src/exec_policy.rs:735]

## Sources

- `codex-rs/utils/approval-presets/src/lib.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/core/src/exec_policy.rs`

## 相关

- [Approval Guardian](approval-guardian.md)
- [execpolicy DSL](../exec-sandbox/execpolicy-dsl.md)
- [approval/sandbox 配置](../../config/approval-sandbox.md)
- 索引 id：`ref.protocol-items`
