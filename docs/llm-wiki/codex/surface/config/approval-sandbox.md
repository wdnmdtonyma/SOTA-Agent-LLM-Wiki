---
id: config.approval-sandbox
title: 审批与沙箱设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/permissions_toml.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/permissions.rs, codex-rs/protocol/src/protocol.rs]
symbols: [AutoReviewToml, ShellEnvironmentPolicyToml, SandboxWorkspaceWrite, PermissionsToml, PermissionProfileToml]
related: [cli.global-flags, cli.exec-mode, command.config-system, subsys.core.approval-policy, subsys.exec-sandbox.overview]
evidence: explicit
status: verified
updated: 61a44880a8
---

> 审批与沙箱设置 catalog 覆盖 ConfigToml 中 command approval、approval reviewer、Guardian auto-review、shell environment、login shell、legacy sandbox 和 named permission profile 的顶层键。

## 能回答的问题

- approval policy、approvals reviewer 和 auto_review 分别对应哪些 schema 字段？
- shell environment、login shell、sandbox mode 和 workspace-write sandbox knobs 在哪里声明？
- named permission profiles 使用哪些 ConfigToml keys？
- PermissionsToml 的 profile map 和 PermissionProfileToml 的 section 形状是什么？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 9 个字段。[E: codex-rs/config/src/config_toml.rs:150][E: codex-rs/config/src/config_toml.rs:510]

`PermissionsToml` stores a flattened map of named permission profiles, and `PermissionProfileToml` has description, extends, workspace_roots, filesystem, and network sections.[E: codex-rs/config/src/permissions_toml.rs:24][E: codex-rs/config/src/permissions_toml.rs:25][E: codex-rs/config/src/permissions_toml.rs:113][E: codex-rs/config/src/permissions_toml.rs:114][E: codex-rs/config/src/permissions_toml.rs:115][E: codex-rs/config/src/permissions_toml.rs:116][E: codex-rs/config/src/permissions_toml.rs:117][E: codex-rs/config/src/permissions_toml.rs:118]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `approval_policy` | `Option<AskForApproval>` | none | Command approval policy field. | [E: codex-rs/config/src/config_toml.rs:170] |
| `approvals_reviewer` | `Option<ApprovalsReviewer>` | none | Escalated approval reviewer field. | [E: codex-rs/config/src/config_toml.rs:175] |
| `auto_review` | `Option<AutoReviewToml>` | `#[serde(default)]` | Guardian auto-review configuration field. | [E: codex-rs/config/src/config_toml.rs:178][E: codex-rs/config/src/config_toml.rs:179] |
| `shell_environment_policy` | `ShellEnvironmentPolicyToml` | `#[serde(default)]` | Shell environment policy field. | [E: codex-rs/config/src/config_toml.rs:181][E: codex-rs/config/src/config_toml.rs:182] |
| `allow_login_shell` | `Option<bool>` | `#[serde(default = "default_allow_login_shell")]` | Login-shell permission toggle for shell-based tools. | [E: codex-rs/config/src/config_toml.rs:195][E: codex-rs/config/src/config_toml.rs:192] |
| `sandbox_mode` | `Option<SandboxMode>` | none | Sandbox mode selector. | [E: codex-rs/config/src/config_toml.rs:195] |
| `sandbox_workspace_write` | `Option<SandboxWorkspaceWrite>` | none | Workspace-write sandbox configuration. | [E: codex-rs/config/src/config_toml.rs:198] |
| `default_permissions` | `Option<String>` | none | Default named permissions profile. | [E: codex-rs/config/src/config_toml.rs:203] |
| `permissions` | `Option<PermissionsToml>` | `#[serde(default)]` | Named permissions profile map. | [E: codex-rs/config/src/config_toml.rs:206][E: codex-rs/config/src/config_toml.rs:207] |

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
