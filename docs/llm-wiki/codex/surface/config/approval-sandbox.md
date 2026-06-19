---
id: config.approval-sandbox
title: 审批与沙箱设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/permissions_toml.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/permissions.rs, codex-rs/protocol/src/protocol.rs]
symbols: [ConfigToml, AutoReviewToml, ShellEnvironmentPolicyToml, SandboxWorkspaceWrite, PermissionsToml, PermissionProfileToml, AskForApproval, ApprovalsReviewer, SandboxMode]
related: [cli.global-flags, cli.exec-mode, command.config-system, subsys.core.approval-policy, subsys.exec-sandbox.overview]
evidence: explicit
status: verified
updated: 5670360009
---

> 审批与沙箱设置 catalog 覆盖 ConfigToml 中 command approval、approval reviewer、Guardian auto-review、shell environment、login shell、legacy sandbox 和 named permission profile 的顶层键。

## 能回答的问题

- approval policy、approvals reviewer 和 auto_review 分别对应哪些 schema 字段？
- shell environment、login shell、sandbox mode 和 workspace-write sandbox knobs 在哪里声明？
- named permission profiles 使用哪些 ConfigToml keys？
- PermissionsToml 的 profile map 和 PermissionProfileToml 的 section 形状是什么？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 9 个。8 个 surface/config catalog 节点合计覆盖全部 96 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:136][E: codex-rs/config/src/config_toml.rs:139]

`PermissionsToml` stores a flattened map of named permission profiles, and `PermissionProfileToml` has description, extends, workspace_roots, filesystem, and network sections.[E: codex-rs/config/src/permissions_toml.rs:23][E: codex-rs/config/src/permissions_toml.rs:25][E: codex-rs/config/src/permissions_toml.rs:113][E: codex-rs/config/src/permissions_toml.rs:114][E: codex-rs/config/src/permissions_toml.rs:118]

## 字段 catalog

| key | Rust type | serde/schema attrs | 源码注释摘要 | Evidence |
|---|---|---|---|---|
| `approval_policy` | `Option<AskForApproval>` | none | Default approval policy for executing commands. | [E: codex-rs/config/src/config_toml.rs:158][E: codex-rs/config/src/config_toml.rs:159] |
| `approvals_reviewer` | `Option<ApprovalsReviewer>` | none | Configures who approval requests are routed to for review once they have been escalated. This does not disable separate safety checks such as ARC. | [E: codex-rs/config/src/config_toml.rs:161][E: codex-rs/config/src/config_toml.rs:164] |
| `auto_review` | `Option<AutoReviewToml>` | `#[serde(default)]` | Optional policy instructions for the guardian auto-reviewer. | [E: codex-rs/config/src/config_toml.rs:166][E: codex-rs/config/src/config_toml.rs:167][E: codex-rs/config/src/config_toml.rs:168] |
| `shell_environment_policy` | `ShellEnvironmentPolicyToml` | `#[serde(default)]` | ConfigToml schema field. | [E: codex-rs/config/src/config_toml.rs:170][E: codex-rs/config/src/config_toml.rs:171] |
| `allow_login_shell` | `Option<bool>` | `#[serde(default = "default_allow_login_shell")]` | Whether the model may request a login shell for shell-based tools. Default to `true` If `true`, the model may request a login shell (`login = true`), and omitting `login` defaul... | [E: codex-rs/config/src/config_toml.rs:173][E: codex-rs/config/src/config_toml.rs:181][E: codex-rs/config/src/config_toml.rs:182] |
| `sandbox_mode` | `Option<SandboxMode>` | none | Sandbox mode to use. | [E: codex-rs/config/src/config_toml.rs:184][E: codex-rs/config/src/config_toml.rs:185] |
| `sandbox_workspace_write` | `Option<SandboxWorkspaceWrite>` | none | Sandbox configuration to apply if `sandbox` is `WorkspaceWrite`. | [E: codex-rs/config/src/config_toml.rs:187][E: codex-rs/config/src/config_toml.rs:188] |
| `default_permissions` | `Option<String>` | none | Default permissions profile to apply. Names starting with `:` refer to built-in profiles; other names are resolved from the `[permissions]` table. | [E: codex-rs/config/src/config_toml.rs:190][E: codex-rs/config/src/config_toml.rs:193] |
| `permissions` | `Option<PermissionsToml>` | `#[serde(default)]` | Named permissions profiles. | [E: codex-rs/config/src/config_toml.rs:195][E: codex-rs/config/src/config_toml.rs:196][E: codex-rs/config/src/config_toml.rs:197] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/permissions_toml.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/permissions.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- `cli.global-flags`
- `cli.exec-mode`
- `command.config-system`
- `subsys.core.approval-policy`
- `subsys.exec-sandbox.overview`
