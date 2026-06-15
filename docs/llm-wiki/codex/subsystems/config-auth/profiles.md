---
id: subsys.config-auth.profiles
title: Profiles 与项目信任
kind: subsystem
tier: T2
source: [codex-rs/config/src/profile_toml.rs, codex-rs/config/src/config_toml.rs, codex-rs/core/src/config/mod.rs, codex-rs/protocol/src/config_types.rs]
symbols: [ConfigProfile, Profile, ProjectConfig, TrustLevel, get_config_profile, get_active_project, derive_sandbox_policy]
related: [subsys.config-auth.config-loading, config.approval-sandbox, config.model-provider, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex profiles 是 `ConfigToml.profiles` 中按名称保存的可覆盖运行参数集合；project trust 是 `ConfigToml.projects` 中按路径保存的 `TrustLevel`，两者在 `ConfigBuilder` 中共同决定 active profile、approval policy 和 sandbox default。[E: codex-rs/config/src/config_toml.rs:220][E: codex-rs/config/src/config_toml.rs:223][E: codex-rs/config/src/config_toml.rs:311][E: codex-rs/core/src/config/mod.rs:1619]

## 能回答的问题

- `[profiles.<name>]` 中哪些字段会转成 runtime `Profile`？
- `--profile` / config `profile` / default profile 的优先级是什么？
- `ProjectConfig.trust_level` 怎样表达 trusted/untrusted？
- trusted project 和 untrusted/unknown project 对 sandbox 与 approval 默认值有什么影响？
- active project 是怎样从 cwd、repository root 和 config `[projects]` 推导出来的？

## 职责边界

profiles 节点解释 profile selection、profile field merge 和 project trust 的 runtime 后果。`ConfigProfile` 是 TOML 可反序列化结构，包含 model/provider、approval/sandbox、reasoning、model instructions、JS REPL、tool toggles、web search、analytics、windows、features 和 OSS provider 等 optional 字段。[E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/config/src/profile_toml.rs:30][E: codex-rs/config/src/profile_toml.rs:41][E: codex-rs/config/src/profile_toml.rs:52][E: codex-rs/config/src/profile_toml.rs:59][E: codex-rs/config/src/profile_toml.rs:61][E: codex-rs/config/src/profile_toml.rs:68] `Profile` 是 runtime 上更窄的 legacy projection，只从 `ConfigProfile` 复制 model、model_provider、approval、reasoning、verbosity 和 chatgpt base URL 等字段。[E: codex-rs/config/src/profile_toml.rs:72][E: codex-rs/config/src/profile_toml.rs:80]

本节点不逐项列举所有 config keys；T1 `surface/config/*` catalog 负责 key 级表格。本节点也不解释 layer 发现顺序；`subsys.config-auth.config-loading` 覆盖 layer stack。

## 关键 crate/文件

- `codex-rs/config/src/profile_toml.rs`: `ConfigProfile` 的 TOML 字段定义与 `Profile` projection。[E: codex-rs/config/src/profile_toml.rs:20][E: codex-rs/config/src/profile_toml.rs:72]
- `codex-rs/config/src/config_toml.rs`: top-level `profile`、`profiles`、`projects`、project trust helper、sandbox derivation 和 active project/profile helper。[E: codex-rs/config/src/config_toml.rs:220][E: codex-rs/config/src/config_toml.rs:429][E: codex-rs/config/src/config_toml.rs:613]
- `codex-rs/core/src/config/mod.rs`: `ConfigBuilder` 使用 CLI override、active profile、feature overrides、active project 和 trust defaults 构造 runtime `Config`。[E: codex-rs/core/src/config/mod.rs:1601][E: codex-rs/core/src/config/mod.rs:1642][E: codex-rs/core/src/config/mod.rs:1810]
- `codex-rs/protocol/src/config_types.rs`: `TrustLevel` 只有 `Trusted` 和 `Untrusted` 两个 enum variant。[E: codex-rs/protocol/src/config_types.rs:345][E: codex-rs/protocol/src/config_types.rs:346][E: codex-rs/protocol/src/config_types.rs:347]

## 数据模型

`ConfigToml.profile` 是可选 active profile 名称，`ConfigToml.profiles` 是 profile name 到 `ConfigProfile` 的 map。[E: codex-rs/config/src/config_toml.rs:220][E: codex-rs/config/src/config_toml.rs:223] `ConfigToml.projects` 保存 project path 到 `ProjectConfig` 的 map；`ProjectConfig` 目前只包含 `trust_level: Option<TrustLevel>`。[E: codex-rs/config/src/config_toml.rs:311][E: codex-rs/config/src/config_toml.rs:429][E: codex-rs/config/src/config_toml.rs:432]

`ProjectConfig::is_trusted()` 只在 trust_level 为 `Some(TrustLevel::Trusted)` 时为 true；`ProjectConfig::is_untrusted()` 只在 trust_level 为 `Some(TrustLevel::Untrusted)` 时为 true。[E: codex-rs/config/src/config_toml.rs:437][E: codex-rs/config/src/config_toml.rs:441] `TrustLevel` 的源码注释说明它表示 project directory 的 trust level，并影响 approval policy 和 sandbox mode。[E: codex-rs/protocol/src/config_types.rs:340][E: codex-rs/protocol/src/config_types.rs:341]

## 控制流

1. `ConfigBuilder` 先读取 `config_profile` override，再用 override 或 `cfg.profile` 作为 active profile name。[E: codex-rs/core/src/config/mod.rs:1601][E: codex-rs/core/src/config/mod.rs:1619]
2. 如果 active profile name 存在，builder 从 `cfg.profiles` 查找对应 `ConfigProfile`；如果缺少该 profile，源码会走 error path 而不是静默忽略。[E: codex-rs/core/src/config/mod.rs:1623][E: codex-rs/core/src/config/mod.rs:1629]
3. feature 设置按 base config、profile config、CLI overrides 合并；profile 的 `features` 能覆盖 base config，CLI `feature_overrides` 最后应用。[E: codex-rs/core/src/config/mod.rs:1642][E: codex-rs/core/src/config/mod.rs:1650][E: codex-rs/core/src/config/mod.rs:1657]
4. active project 通过 `get_active_project` 从 cwd 与 repo root 对应的 `[projects]` entry 选择；`ConfigBuilder` 会把解析出的 active project 存入最终 runtime `Config`。[E: codex-rs/config/src/config_toml.rs:685][E: codex-rs/core/src/config/mod.rs:1685][E: codex-rs/core/src/config/mod.rs:2349]
5. approval policy 的优先级是 CLI override 高于 profile approval_policy，高于 global approval_policy，高于 project trust default；trusted project 默认 `OnRequest`，untrusted project 默认 `UnlessTrusted`，unknown project 使用 `AskForApproval::default()`。[E: codex-rs/core/src/config/mod.rs:1810][E: codex-rs/core/src/config/mod.rs:1815][E: codex-rs/core/src/config/mod.rs:1817][E: codex-rs/core/src/config/mod.rs:1819][E: codex-rs/core/src/config/mod.rs:1821]
6. sandbox policy derivation 先看显式 `sandbox_mode`/profile/global；如果没有显式 sandbox mode 且 project 明确 trusted 或 untrusted，非禁用 Windows sandbox 下默认 `WorkspaceWrite`，unknown project 走 `SandboxMode::default()`，而 `SandboxMode::default()` 是 `ReadOnly`。[E: codex-rs/config/src/config_toml.rs:613][E: codex-rs/config/src/config_toml.rs:625][E: codex-rs/config/src/config_toml.rs:632][E: codex-rs/config/src/config_toml.rs:639][E: codex-rs/protocol/src/config_types.rs:60][E: codex-rs/protocol/src/config_types.rs:63]

## 设计动机与权衡

`ConfigProfile` 包含很多与 top-level config 同名的 optional 字段，说明 profile 的设计目标是局部覆盖，而不是创建一份完整、独立的配置文件。[I] 这个结论由 `ConfigProfile` 字段几乎全为 `Option<T>`、`ConfigBuilder` 读取 selected `config_profile` 字段并用 `.or(cfg...)` 回退 global config 的模式共同支撑。[E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/core/src/config/mod.rs:1812][E: codex-rs/core/src/config/mod.rs:1814]

project trust 会影响 approval/sandbox 的默认策略；trusted project 默认 `OnRequest` approval，untrusted project 默认 `UnlessTrusted` approval，trusted/untrusted project 在未显式设置 sandbox mode 时参与 sandbox default 选择。[E: codex-rs/core/src/config/mod.rs:1817][E: codex-rs/core/src/config/mod.rs:1819][E: codex-rs/config/src/config_toml.rs:625]

## Gotchas

- `ConfigProfile` 到 `Profile` 的 `From` implementation 不是全量转换；很多 `ConfigProfile` 字段直接在 `ConfigBuilder` 中使用，而不会进入 `Profile` projection。[E: codex-rs/config/src/profile_toml.rs:72][E: codex-rs/core/src/config/mod.rs:2011]
- `TrustLevel` 没有 `Unknown` variant；unknown project 是缺少 `[projects]` entry 或缺少 trust_level 的状态，由 `Option<TrustLevel>` 表达。[E: codex-rs/config/src/config_toml.rs:432][E: codex-rs/protocol/src/config_types.rs:345]
- active profile 名称可以来自 CLI override 或 config `profile`；这两个来源都指向同一个 `cfg.profiles` map。[E: codex-rs/core/src/config/mod.rs:1619][E: codex-rs/core/src/config/mod.rs:1623]

## Sources

- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/config_toml.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/protocol/src/config_types.rs`

## 相关

- `subsys.config-auth.config-loading`: profiles 所在 TOML layer 怎样被合并成 effective config。
- `config.model-provider`: profile 可覆盖的 model/provider keys。
- `config.approval-sandbox`: profile 可覆盖的 approval/sandbox keys。
