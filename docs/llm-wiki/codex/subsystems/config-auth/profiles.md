---
id: subsys.config-auth.profiles
title: Profiles 与项目信任
kind: subsystem
tier: T2
source: [codex-rs/config/src/profile_toml.rs, codex-rs/config/src/config_toml.rs, codex-rs/config/src/loader/mod.rs, codex-rs/core/src/config/mod.rs, codex-rs/protocol/src/config_types.rs]
symbols: [ConfigProfile, ProfileTui, ProjectConfig, TrustLevel, resolve_profile_v2_config_path, get_active_project, derive_permission_profile]
related: [subsys.config-auth.config-loading, config.approval-sandbox, config.model-provider, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> Current Codex profile handling is split: legacy `ConfigToml.profile`/`ConfigToml.profiles` still deserialize, but runtime config rejects `profile = "..."`; profile-v2 uses `--profile <name>` to load `<name>.config.toml` as an additional User config layer, while project trust still comes from `[projects]` entries and influences default approval/sandbox behavior。[E: codex-rs/config/src/config_toml.rs:336][E: codex-rs/core/src/config/mod.rs:3292][E: codex-rs/core/src/config/mod.rs:1939][E: codex-rs/config/src/config_toml.rs:556][E: codex-rs/core/src/config/mod.rs:3655]

## 能回答的问题

- `ConfigProfile` schema 当前还包含哪些 field？
- legacy `profile =` 和 `[profiles.<name>]` 与 profile-v2 有什么区别？
- profile-v2 文件路径如何解析，怎样叠加到 base user config？
- `[projects]` 的 `TrustLevel` 如何影响 approval policy 和 permission profile default？
- active project 是按 cwd 还是 git repo root 选择？

## 职责边界

本节点解释 profile schema residue、profile-v2 layer 机制和 project trust runtime 后果，不逐项列举所有 config keys。Profile-v2 的 layer 加载细节在 `subsys.config-auth.config-loading` 展开；permission profile catalog 在 `config.approval-sandbox` 展开。

## Profile schema 与 profile-v2

`ConfigProfile` 仍是可反序列化结构，字段大多是 optional override：model/provider、approval/sandbox、reasoning、model instructions、tools/web search/analytics、TUI/window settings、features 和 OSS provider 都在这个 schema 中。[E: codex-rs/config/src/profile_toml.rs:24][E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/config/src/profile_toml.rs:32][E: codex-rs/config/src/profile_toml.rs:33][E: codex-rs/config/src/profile_toml.rs:35][E: codex-rs/config/src/profile_toml.rs:45][E: codex-rs/config/src/profile_toml.rs:58][E: codex-rs/config/src/profile_toml.rs:59][E: codex-rs/config/src/profile_toml.rs:60][E: codex-rs/config/src/profile_toml.rs:63][E: codex-rs/config/src/profile_toml.rs:65][E: codex-rs/config/src/profile_toml.rs:70]

`ProfileTui` 当前只暴露 `session_picker_view`，说明 profile-local TUI config 已收窄为 explicit 子结构，而不是任意 TUI config map。[E: codex-rs/config/src/profile_toml.rs:78][E: codex-rs/config/src/profile_toml.rs:81]

`ConfigToml.profile` 和 `ConfigToml.profiles` 仍存在于 TOML schema，但 `ConfigBuilder` 在看到 `cfg.profile` 时直接返回错误，提示使用 `--profile <name>` 和 `<name>.config.toml`。[E: codex-rs/config/src/config_toml.rs:336][E: codex-rs/config/src/config_toml.rs:340][E: codex-rs/core/src/config/mod.rs:3292][E: codex-rs/core/src/config/mod.rs:3296]

Profile-v2 的路径由 `resolve_profile_v2_config_path(codex_home, profile_name)` 解析为 `codex_home/<profile_name>.config.toml`；loader 先加入 base user config，再在 active profile file 不同于 base file 时加入第二个 User layer。[E: codex-rs/core/src/config/mod.rs:1939][E: codex-rs/core/src/config/mod.rs:1943][E: codex-rs/config/src/loader/mod.rs:319][E: codex-rs/config/src/loader/mod.rs:349][E: codex-rs/config/src/loader/mod.rs:351]

如果 `--profile <name>` 与 base config 里的 legacy `profile = "<name>"` 或 `[profiles.<name>]` 同时出现，loader 会拒绝启动并要求迁移到独立 profile-v2 file。[E: codex-rs/config/src/loader/mod.rs:327][E: codex-rs/config/src/loader/mod.rs:330][E: codex-rs/config/src/loader/mod.rs:334][E: codex-rs/config/src/loader/mod.rs:338][E: codex-rs/config/src/loader/mod.rs:342]

## Project trust

`ProjectConfig` 当前只保存 `trust_level: Option<TrustLevel>`；`is_trusted()` 和 `is_untrusted()` 分别只在值为 `Trusted`/`Untrusted` 时为 true。`TrustLevel` enum 本身只有 `Trusted` 和 `Untrusted` 两个 variants，unknown project 由 absence/None 表示。[E: codex-rs/config/src/config_toml.rs:555][E: codex-rs/config/src/config_toml.rs:556][E: codex-rs/config/src/config_toml.rs:560][E: codex-rs/config/src/config_toml.rs:564][E: codex-rs/protocol/src/config_types.rs:641][E: codex-rs/protocol/src/config_types.rs:642][E: codex-rs/protocol/src/config_types.rs:643]

`get_active_project` 先用 resolved cwd 的 normalized lookup keys 查 `[projects]`，找不到时再用 resolved git repo root lookup keys；仍找不到则返回 None。[E: codex-rs/config/src/config_toml.rs:829][E: codex-rs/config/src/config_toml.rs:836][E: codex-rs/config/src/config_toml.rs:842][E: codex-rs/config/src/config_toml.rs:852]

`ConfigBuilder` 解析 cwd、repo root，然后调用 `cfg.get_active_project(...).unwrap_or(ProjectConfig { trust_level: None })`，所以 runtime 总有 active_project value，但 trust level 可能是 None。[E: codex-rs/core/src/config/mod.rs:3379][E: codex-rs/core/src/config/mod.rs:3381][E: codex-rs/core/src/config/mod.rs:3385]

## Approval 与 sandbox default

Approval policy priority 是 CLI override 高于 config `approval_policy`，否则按 active project trust default：trusted project 默认 `OnRequest`，untrusted project 默认 `UnlessTrusted`，unknown project 使用 `AskForApproval::default()`；requirements 可在默认值不允许时强制 fallback。[E: codex-rs/core/src/config/mod.rs:3650][E: codex-rs/core/src/config/mod.rs:3652][E: codex-rs/core/src/config/mod.rs:3655][E: codex-rs/core/src/config/mod.rs:3657][E: codex-rs/core/src/config/mod.rs:3660][E: codex-rs/core/src/config/mod.rs:3663]

Legacy sandbox-mode derivation only runs after named `default_permissions` profiles have been ruled out; if no explicit sandbox mode is set but project trust has a known trusted/untrusted decision, it defaults to workspace-write except on unsandboxed Windows where it defaults to read-only。[E: codex-rs/config/src/config_toml.rs:751][E: codex-rs/config/src/config_toml.rs:759][E: codex-rs/config/src/config_toml.rs:765][E: codex-rs/config/src/config_toml.rs:770][E: codex-rs/config/src/config_toml.rs:772]

If permission profiles are not active, `ConfigBuilder` still derives a canonical `PermissionProfile` from old `sandbox_mode` defaults, then projects it back into legacy sandbox policy where required by older code paths。[E: codex-rs/core/src/config/mod.rs:3602][E: codex-rs/core/src/config/mod.rs:3603][E: codex-rs/core/src/config/mod.rs:3623]

## Feature interaction

Because profile-v2 is already materialized as a layer before `ConfigToml` reaches `ConfigBuilder`, runtime feature resolution uses effective `cfg.features` as base and passes an empty profile source to `Features::from_sources`.[E: codex-rs/core/src/config/mod.rs:3306][E: codex-rs/core/src/config/mod.rs:3307][E: codex-rs/core/src/config/mod.rs:3311]

## Gotchas

- Do not document `ConfigToml.profiles` as the active selection mechanism for current Codex runtime; `profile =` now errors and profile-v2 is file-layer based。[E: codex-rs/core/src/config/mod.rs:3292][E: codex-rs/core/src/config/mod.rs:3296]
- `TrustLevel` has no `Unknown` variant; unknown is `None`/missing `[projects]` entry。[E: codex-rs/config/src/config_toml.rs:556][E: codex-rs/protocol/src/config_types.rs:641]
- Project trust affects defaults, but explicit approval/sandbox/permission-profile settings and requirements constraints can override or constrain those defaults。[E: codex-rs/core/src/config/mod.rs:3650][E: codex-rs/config/src/config_toml.rs:759][E: codex-rs/core/src/config/mod.rs:3663]

## Sources

- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/loader/mod.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/protocol/src/config_types.rs`

## 相关

- `subsys.config-auth.config-loading`: profile-v2 file 如何成为第二个 User layer。
- `config.approval-sandbox`: permission profile 与 sandbox/approval catalog。
- `subsys.config-auth.features-system`: effective `features` 如何解析。
