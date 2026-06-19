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
updated: 5670360009
---

> Current Codex profile handling is split: legacy `ConfigToml.profile`/`ConfigToml.profiles` still deserialize, but runtime config rejects `profile = "..."`; profile-v2 uses `--profile <name>` to load `<name>.config.toml` as an additional User config layer, while project trust still comes from `[projects]` entries and influences default approval/sandbox behavior。[E: codex-rs/config/src/config_toml.rs:298][E: codex-rs/config/src/config_toml.rs:303][E: codex-rs/core/src/config/mod.rs:2843][E: codex-rs/config/src/loader/mod.rs:241][E: codex-rs/core/src/config/mod.rs:1659][E: codex-rs/config/src/config_toml.rs:553][E: codex-rs/core/src/config/mod.rs:3176]

## 能回答的问题

- `ConfigProfile` schema 当前还包含哪些 field？
- legacy `profile =` 和 `[profiles.<name>]` 与 profile-v2 有什么区别？
- profile-v2 文件路径如何解析，怎样叠加到 base user config？
- `[projects]` 的 `TrustLevel` 如何影响 approval policy 和 permission profile default？
- active project 是按 cwd 还是 git repo root 选择？

## 职责边界

本节点解释 profile schema residue、profile-v2 layer 机制和 project trust runtime 后果，不逐项列举所有 config keys。Profile-v2 的 layer 加载细节在 `subsys.config-auth.config-loading` 展开；permission profile catalog 在 `config.approval-sandbox` 展开。

## Profile schema 与 profile-v2

`ConfigProfile` 仍是可反序列化结构，字段大多是 optional override：model/provider、approval/sandbox、reasoning、model instructions、tools/web search/analytics、TUI/window settings、features 和 OSS provider 都在这个 schema 中。[E: codex-rs/config/src/profile_toml.rs:20][E: codex-rs/config/src/profile_toml.rs:24][E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/config/src/profile_toml.rs:31][E: codex-rs/config/src/profile_toml.rs:32][E: codex-rs/config/src/profile_toml.rs:34][E: codex-rs/config/src/profile_toml.rs:51][E: codex-rs/config/src/profile_toml.rs:57][E: codex-rs/config/src/profile_toml.rs:58][E: codex-rs/config/src/profile_toml.rs:59][E: codex-rs/config/src/profile_toml.rs:62][E: codex-rs/config/src/profile_toml.rs:64][E: codex-rs/config/src/profile_toml.rs:69]

`ProfileTui` 当前只暴露 `session_picker_view`，说明 profile-local TUI config 已收窄为 explicit 子结构，而不是任意 TUI config map。[E: codex-rs/config/src/profile_toml.rs:73][E: codex-rs/config/src/profile_toml.rs:77][E: codex-rs/config/src/profile_toml.rs:80]

`ConfigToml.profile` 和 `ConfigToml.profiles` 仍存在于 TOML schema，但 `ConfigBuilder` 在看到 `cfg.profile` 时直接返回错误，提示使用 `--profile <name>` 和 `<name>.config.toml`。[E: codex-rs/config/src/config_toml.rs:298][E: codex-rs/config/src/config_toml.rs:303][E: codex-rs/core/src/config/mod.rs:2843][E: codex-rs/core/src/config/mod.rs:2847]

Profile-v2 的路径由 `resolve_profile_v2_config_path(codex_home, profile_name)` 解析为 `codex_home/<profile_name>.config.toml`；loader 先加入 base user config，再在 active profile file 不同于 base file 时加入第二个 User layer。[E: codex-rs/core/src/config/mod.rs:1659][E: codex-rs/core/src/config/mod.rs:1663][E: codex-rs/core/src/config/mod.rs:1664][E: codex-rs/config/src/loader/mod.rs:241][E: codex-rs/config/src/loader/mod.rs:244][E: codex-rs/config/src/loader/mod.rs:276][E: codex-rs/config/src/loader/mod.rs:278]

如果 `--profile <name>` 与 base config 里的 legacy `profile = "<name>"` 或 `[profiles.<name>]` 同时出现，loader 会拒绝启动并要求迁移到独立 profile-v2 file。[E: codex-rs/config/src/loader/mod.rs:254][E: codex-rs/config/src/loader/mod.rs:257][E: codex-rs/config/src/loader/mod.rs:261][E: codex-rs/config/src/loader/mod.rs:265][E: codex-rs/config/src/loader/mod.rs:269]

## Project trust

`ProjectConfig` 当前只保存 `trust_level: Option<TrustLevel>`；`is_trusted()` 和 `is_untrusted()` 分别只在值为 `Trusted`/`Untrusted` 时为 true。`TrustLevel` enum 本身只有 `Trusted` 和 `Untrusted` 两个 variants，unknown project 由 absence/None 表示。[E: codex-rs/config/src/config_toml.rs:551][E: codex-rs/config/src/config_toml.rs:553][E: codex-rs/config/src/config_toml.rs:558][E: codex-rs/config/src/config_toml.rs:562][E: codex-rs/protocol/src/config_types.rs:539][E: codex-rs/protocol/src/config_types.rs:544][E: codex-rs/protocol/src/config_types.rs:545][E: codex-rs/protocol/src/config_types.rs:546]

`get_active_project` 先用 resolved cwd 的 normalized lookup keys 查 `[projects]`，找不到时再用 resolved git repo root lookup keys；仍找不到则返回 None。[E: codex-rs/config/src/config_toml.rs:806][E: codex-rs/config/src/config_toml.rs:809][E: codex-rs/config/src/config_toml.rs:814][E: codex-rs/config/src/config_toml.rs:816][E: codex-rs/config/src/config_toml.rs:822][E: codex-rs/config/src/config_toml.rs:832]

`ConfigBuilder` 解析 cwd、repo root，然后调用 `cfg.get_active_project(...).unwrap_or(ProjectConfig { trust_level: None })`，所以 runtime 总有 active_project value，但 trust level 可能是 None。[E: codex-rs/core/src/config/mod.rs:2897][E: codex-rs/core/src/config/mod.rs:2919][E: codex-rs/core/src/config/mod.rs:2920][E: codex-rs/core/src/config/mod.rs:2924][E: codex-rs/core/src/config/mod.rs:2925]

## Approval 与 sandbox default

Approval policy priority 是 CLI override 高于 config `approval_policy`，否则按 active project trust default：trusted project 默认 `OnRequest`，untrusted project 默认 `UnlessTrusted`，unknown project 使用 `AskForApproval::default()`；requirements 可在默认值不允许时强制 fallback。[E: codex-rs/core/src/config/mod.rs:3176][E: codex-rs/core/src/config/mod.rs:3178][E: codex-rs/core/src/config/mod.rs:3180][E: codex-rs/core/src/config/mod.rs:3181][E: codex-rs/core/src/config/mod.rs:3183][E: codex-rs/core/src/config/mod.rs:3186][E: codex-rs/core/src/config/mod.rs:3189]

Legacy sandbox-mode derivation only runs after named `default_permissions` profiles have been ruled out; if no explicit sandbox mode is set but project trust has a known trusted/untrusted decision, it defaults to workspace-write except on unsandboxed Windows where it defaults to read-only。[E: codex-rs/config/src/config_toml.rs:725][E: codex-rs/config/src/config_toml.rs:731][E: codex-rs/config/src/config_toml.rs:738][E: codex-rs/config/src/config_toml.rs:740][E: codex-rs/config/src/config_toml.rs:744][E: codex-rs/config/src/config_toml.rs:747][E: codex-rs/config/src/config_toml.rs:752]

If permission profiles are not active, `ConfigBuilder` still derives a canonical `PermissionProfile` from old `sandbox_mode` defaults, then projects it back into legacy sandbox policy where required by older code paths。[E: codex-rs/core/src/config/mod.rs:3129][E: codex-rs/core/src/config/mod.rs:3131][E: codex-rs/core/src/config/mod.rs:3136][E: codex-rs/core/src/config/mod.rs:3150][E: codex-rs/core/src/config/mod.rs:3157]

## Feature interaction

Because profile-v2 is already materialized as a layer before `ConfigToml` reaches `ConfigBuilder`, runtime feature resolution uses effective `cfg.features` as base and passes an empty profile source to `Features::from_sources`.[E: codex-rs/core/src/config/mod.rs:2852][E: codex-rs/core/src/config/mod.rs:2857][E: codex-rs/core/src/config/mod.rs:2859][E: codex-rs/core/src/config/mod.rs:2862]

## Gotchas

- Do not document `ConfigToml.profiles` as the active selection mechanism for current Codex runtime; `profile =` now errors and profile-v2 is file-layer based。[E: codex-rs/core/src/config/mod.rs:2843][E: codex-rs/core/src/config/mod.rs:2847][E: codex-rs/config/src/loader/mod.rs:241]
- `TrustLevel` has no `Unknown` variant; unknown is `None`/missing `[projects]` entry。[E: codex-rs/config/src/config_toml.rs:553][E: codex-rs/protocol/src/config_types.rs:544]
- Project trust affects defaults, but explicit approval/sandbox/permission-profile settings and requirements constraints can override or constrain those defaults。[E: codex-rs/core/src/config/mod.rs:3178][E: codex-rs/config/src/config_toml.rs:738][E: codex-rs/core/src/config/mod.rs:3189]

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
