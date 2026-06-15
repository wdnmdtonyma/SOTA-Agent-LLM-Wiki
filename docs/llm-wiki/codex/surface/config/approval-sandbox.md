---
id: config.approval-sandbox
title: 审批与沙箱设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/permissions_toml.rs, codex-rs/core/src/config/mod.rs, docs/sandbox.md]
symbols: [ConfigToml, SandboxWorkspaceWrite, ShellEnvironmentPolicyToml, PermissionsToml, PermissionProfileToml, ConfigToml::derive_sandbox_policy]
related: [cli.global-flags, cli.exec-mode, command.config-system, tool.shell]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 审批与沙箱设置 catalog 覆盖 `ConfigToml` 中决定 command approval、approval reviewer、filesystem/network sandbox、permission profiles 和 shell environment inheritance 的顶层键。

## 能回答的问题

- `approval_policy` 未设置时如何从 trusted/untrusted project 推导?
- `sandbox_mode` 与 `sandbox_workspace_write` 如何生成 effective `SandboxPolicy`?
- `[permissions]` profiles 与 legacy `sandbox_mode` 是如何分流的?
- shell tool 的环境变量继承策略有哪些默认值?
- `allow_login_shell=false` 对 shell-based tools 表示什么?

## Catalog

| key | TOML 类型 | TOML 默认 | 有效配置默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `approval_policy` | `Option<AskForApproval>` | unset | override、profile、global 后，trusted project 默认 `OnRequest`，untrusted project 默认 `UnlessTrusted`，否则使用 `AskForApproval::default()`。[E: codex-rs/core/src/config/mod.rs:1812][E: codex-rs/core/src/config/mod.rs:1813][E: codex-rs/core/src/config/mod.rs:1814][E: codex-rs/core/src/config/mod.rs:1817][E: codex-rs/core/src/config/mod.rs:1819][E: codex-rs/core/src/config/mod.rs:1821] | 控制执行 commands 前何时要 human approval；该值之后会受 requirements constraint 校验。[E: codex-rs/core/src/config/mod.rs:2092][E: codex-rs/core/src/config/mod.rs:2094][E: codex-rs/core/src/config/mod.rs:1045][E: codex-rs/core/src/config/mod.rs:1054] | `codex-rs/config/src/config_toml.rs:86` |
| `approvals_reviewer` | `Option<ApprovalsReviewer>` | unset | override、profile、global 后默认 `ApprovalsReviewer::User`；隐式默认仍可能受 requirements constraint 改写。[E: codex-rs/core/src/config/mod.rs:1836][E: codex-rs/core/src/config/mod.rs:1837][E: codex-rs/core/src/config/mod.rs:1838][E: codex-rs/core/src/config/mod.rs:1839][E: codex-rs/core/src/config/mod.rs:1840][E: codex-rs/core/src/config/mod.rs:1847][E: codex-rs/core/src/config/mod.rs:2125] | 配置 approval requests 被 escalate 后路由给谁 review；字段注释说明它不关闭 separate safety checks such as ARC。[E: codex-rs/config/src/config_toml.rs:88][E: codex-rs/config/src/config_toml.rs:89][E: codex-rs/config/src/config_toml.rs:90] | `codex-rs/config/src/config_toml.rs:91` |
| `shell_environment_policy` | `ShellEnvironmentPolicyToml` | `{}` via `serde(default)` | `inherit=All`、`ignore_default_excludes=true`、`exclude=[]`、`set={}`、`include_only=[]`、`use_profile=false`。[E: codex-rs/config/src/types.rs:767][E: codex-rs/config/src/types.rs:768][E: codex-rs/config/src/types.rs:771][E: codex-rs/config/src/types.rs:775][E: codex-rs/config/src/types.rs:778][E: codex-rs/config/src/types.rs:782] | 构造 shell/local_shell tool 的 process environment；转换步骤先按 inherit 建 map，再做 default excludes、custom excludes、set、include-only 过滤。[E: codex-rs/config/src/types.rs:714][E: codex-rs/config/src/types.rs:736][E: codex-rs/config/src/types.rs:737][E: codex-rs/config/src/types.rs:739][E: codex-rs/config/src/types.rs:740][E: codex-rs/config/src/types.rs:741] | `codex-rs/config/src/config_toml.rs:94` |
| `allow_login_shell` | `Option<bool>` | unset | `true`。[E: codex-rs/core/src/config/mod.rs:1884] | 允许模型请求 login shell；设为 `false` 时 `login=true` 会被拒绝，省略 `login` 默认 non-login shell。[E: codex-rs/config/src/config_toml.rs:96][E: codex-rs/config/src/config_toml.rs:101][E: codex-rs/config/src/config_toml.rs:103] | `codex-rs/config/src/config_toml.rs:104` |
| `sandbox_mode` | `Option<SandboxMode>` | unset | override、profile、global、project trust 推导后落到 `SandboxMode::default()`。[E: codex-rs/config/src/config_toml.rs:616][E: codex-rs/config/src/config_toml.rs:617][E: codex-rs/config/src/config_toml.rs:618][E: codex-rs/config/src/config_toml.rs:625][E: codex-rs/config/src/config_toml.rs:632][E: codex-rs/config/src/config_toml.rs:639] | 选择 shell command sandbox mode；`ReadOnly`、`WorkspaceWrite`、`DangerFullAccess` 分别映射到对应 `SandboxPolicy`。[E: codex-rs/config/src/config_toml.rs:641][E: codex-rs/config/src/config_toml.rs:642][E: codex-rs/config/src/config_toml.rs:655][E: codex-rs/config/src/config_toml.rs:657] | `codex-rs/config/src/config_toml.rs:107` |
| `sandbox_workspace_write` | `Option<SandboxWorkspaceWrite>` | unset | 仅在 resolved mode 为 `WorkspaceWrite` 时读取；未设置时使用 `SandboxPolicy::new_workspace_write_policy()`。[E: codex-rs/config/src/config_toml.rs:642][E: codex-rs/config/src/config_toml.rs:655] | 为 workspace-write sandbox 提供 writable roots、network access、tmpdir exclusion knobs；四个 nested fields 都带 serde default。[E: codex-rs/config/src/types.rs:677][E: codex-rs/config/src/types.rs:678][E: codex-rs/config/src/types.rs:679][E: codex-rs/config/src/types.rs:680][E: codex-rs/config/src/types.rs:681][E: codex-rs/config/src/types.rs:682][E: codex-rs/config/src/types.rs:683][E: codex-rs/config/src/types.rs:684] | `codex-rs/config/src/config_toml.rs:110` |
| `default_permissions` | `Option<String>` | unset | unset 时不选择 named permission profile；如果选择 permission profiles，需要同时存在 `[permissions]` table 和 named profile。[E: codex-rs/core/src/config/mod.rs:1330][E: codex-rs/core/src/config/mod.rs:1331][E: codex-rs/core/src/config/mod.rs:1333][E: codex-rs/core/src/config/mod.rs:1336][E: codex-rs/core/src/config/mod.rs:1740][E: codex-rs/core/src/config/mod.rs:1746][E: codex-rs/core/src/config/mod.rs:1752] | 指定 `[permissions]` 中默认使用的 named profile；该键让 permission profile syntax 与 legacy `sandbox_mode` syntax 分流。[E: codex-rs/config/src/config_toml.rs:112][E: codex-rs/config/src/config_toml.rs:114][E: codex-rs/core/src/config/mod.rs:1322][E: codex-rs/core/src/config/mod.rs:1326] | `codex-rs/config/src/config_toml.rs:114` |
| `permissions` | `Option<PermissionsToml>` | unset / empty | active profile syntax 下会 compile 成 filesystem sandbox、network sandbox 和 legacy sandbox policy。[E: codex-rs/core/src/config/mod.rs:1739][E: codex-rs/core/src/config/mod.rs:1752][E: codex-rs/core/src/config/mod.rs:1755][E: codex-rs/core/src/config/mod.rs:1763] | 定义 named permission profiles；每个 `PermissionProfileToml` 可含 `filesystem` 和 `network` 两个 section。[E: codex-rs/config/src/permissions_toml.rs:13][E: codex-rs/config/src/permissions_toml.rs:16][E: codex-rs/config/src/permissions_toml.rs:27][E: codex-rs/config/src/permissions_toml.rs:28][E: codex-rs/config/src/permissions_toml.rs:29] | `codex-rs/config/src/config_toml.rs:118` |

## 共性机制

`ConfigToml::derive_sandbox_policy()` 先记录 sandbox mode 是否显式配置，再按 override/profile/global/project trust/default 顺序解析 mode。[E: codex-rs/config/src/config_toml.rs:613][E: codex-rs/config/src/config_toml.rs:616][E: codex-rs/config/src/config_toml.rs:618][E: codex-rs/config/src/config_toml.rs:625][E: codex-rs/config/src/config_toml.rs:632][E: codex-rs/config/src/config_toml.rs:639] Windows 上如果 experimental Windows sandbox disabled，`WorkspaceWrite` 会降级为 read-only；requirements constraint 也可能把默认 sandbox policy 改成 required default。[E: codex-rs/config/src/config_toml.rs:660][E: codex-rs/config/src/config_toml.rs:662][E: codex-rs/config/src/config_toml.rs:663][E: codex-rs/config/src/config_toml.rs:665][E: codex-rs/config/src/config_toml.rs:671][E: codex-rs/config/src/config_toml.rs:672][E: codex-rs/config/src/config_toml.rs:673][E: codex-rs/config/src/config_toml.rs:679]

`PermissionsToml` 使用 flatten map 保存 named profiles；filesystem permissions 有 optional `glob_scan_max_depth` 和 flatten path entries，network permissions 有 proxy、mode、domain、Unix socket 和 local binding controls。[E: codex-rs/config/src/permissions_toml.rs:15][E: codex-rs/config/src/permissions_toml.rs:16][E: codex-rs/config/src/permissions_toml.rs:37][E: codex-rs/config/src/permissions_toml.rs:39][E: codex-rs/config/src/permissions_toml.rs:149][E: codex-rs/config/src/permissions_toml.rs:157][E: codex-rs/config/src/permissions_toml.rs:158][E: codex-rs/config/src/permissions_toml.rs:159][E: codex-rs/config/src/permissions_toml.rs:160]

`docs/sandbox.md` 只指向外部 security documentation。[E: docs/sandbox.md:1][E: docs/sandbox.md:3] 本节点的行为断言以 Rust source 为主要证据。[I]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/permissions_toml.rs`
- `codex-rs/core/src/config/mod.rs`
- `docs/sandbox.md`

## 相关

- [CLI 全局 flag](../cli/global-flags.md) — 覆盖 `--sandbox`、`--full-auto`、`--ask-for-approval` 和 dangerous bypass flags。
- [exec 非交互模式](../cli/exec-mode.md) — 覆盖 exec 对 sandbox/approval 的非交互默认值。
- [配置与系统 slash command](../slash-commands/config-system.md) — 覆盖 `/approvals`、`/permissions`、`/sandbox-add-read-dir` 等 TUI config commands。
