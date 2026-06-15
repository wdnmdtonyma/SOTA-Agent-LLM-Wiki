---
id: config.skills-plugins-features
title: skills/plugins/features 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/skills_config.rs, codex-rs/config/src/types.rs, codex-rs/core/src/config/mod.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/legacy.rs]
symbols: [ConfigToml, SkillsConfig, SkillConfig, PluginConfig, MarketplaceConfig, FeaturesToml, FeatureToml, FeatureConfigSource]
related: [command.tools-integrations, config.mcp-tools, config.agents-memory, cli.global-flags]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> skills/plugins/features 设置 catalog 覆盖 `ConfigToml` 中控制 user skills、plugins、marketplaces、feature flags、unstable warnings、legacy instructions/compact prompt path key 和 legacy experimental feature aliases 的顶层键。

## 能回答的问题

- `[skills]` nested table 有哪些 fields，`include_instructions` 默认是什么?
- `plugins` 与 `marketplaces` 的 TOML shape 如何 keyed by name?
- `features` 是如何接收 boolean feature toggles 与 custom `multi_agent_v2` config 的?
- 顶层 `experimental_use_unified_exec_tool` 和 `experimental_use_freeform_apply_patch` 是否仍会影响 feature flags?
- `experimental_instructions_file` 与 `experimental_compact_prompt_file` 的状态有什么不同?

## Catalog

| key | TOML 类型 | TOML 默认 | 有效配置默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `skills` | `Option<SkillsConfig>` | unset | `include_skill_instructions` 默认 `true`，除非 `[skills].include_instructions` 指定 false。[E: codex-rs/core/src/config/mod.rs:2019][E: codex-rs/core/src/config/mod.rs:2023] | 配置 user-level skills；nested fields 包含 `bundled`、`include_instructions` 和 `config` list。[E: codex-rs/config/src/skills_config.rs:28][E: codex-rs/config/src/skills_config.rs:32][E: codex-rs/config/src/skills_config.rs:35] | `codex-rs/config/src/config_toml.rs:329` |
| `plugins` | `HashMap<String, PluginConfig>` | `{}` | empty map；每个 plugin config 的 `enabled` 默认 true。[E: codex-rs/config/src/config_toml.rs:332][E: codex-rs/config/src/config_toml.rs:333][E: codex-rs/config/src/types.rs:640][E: codex-rs/config/src/types.rs:641][E: codex-rs/config/src/types.rs:40][E: codex-rs/config/src/types.rs:41] | 按 plugin name 保存 user-level plugin config entries。[E: codex-rs/config/src/config_toml.rs:331] | `codex-rs/config/src/config_toml.rs:333` |
| `marketplaces` | `HashMap<String, MarketplaceConfig>` | `{}` | empty map；每个 marketplace 记录 last update/revision/source/ref/sparse checkout metadata。[E: codex-rs/config/src/config_toml.rs:336][E: codex-rs/config/src/config_toml.rs:337][E: codex-rs/config/src/types.rs:649][E: codex-rs/config/src/types.rs:652][E: codex-rs/config/src/types.rs:655][E: codex-rs/config/src/types.rs:658][E: codex-rs/config/src/types.rs:661][E: codex-rs/config/src/types.rs:664] | 按 marketplace name 保存 user-level marketplace entries；source type 是 `git` 或 `local`。[E: codex-rs/config/src/types.rs:669][E: codex-rs/config/src/types.rs:670][E: codex-rs/config/src/types.rs:671] | `codex-rs/config/src/config_toml.rs:337` |
| `features` | `Option<FeaturesToml>` | unset | 从 built-in defaults 开始，依次应用 global/profile legacy toggles 与 `[features]`，再应用 CLI overrides、normalize dependencies，并带 `feature_requirements` 构造 `ManagedFeatures`。[E: codex-rs/features/src/lib.rs:416][E: codex-rs/features/src/lib.rs:418][E: codex-rs/features/src/lib.rs:427][E: codex-rs/features/src/lib.rs:431][E: codex-rs/features/src/lib.rs:432][E: codex-rs/core/src/config/mod.rs:1642][E: codex-rs/core/src/config/mod.rs:1659] | centralized feature flags table；schema 注释说明 prefer this over individual toggles。[E: codex-rs/config/src/config_toml.rs:339] | `codex-rs/config/src/config_toml.rs:343` |
| `suppress_unstable_features_warning` | `Option<bool>` | unset | `false`。[E: codex-rs/core/src/config/mod.rs:2345][E: codex-rs/core/src/config/mod.rs:2347] | 关闭 unstable under-development feature warnings。[E: codex-rs/config/src/config_toml.rs:345] | `codex-rs/config/src/config_toml.rs:346` |
| `experimental_instructions_file` | `Option<AbsolutePathBuf>` | unset | deprecated；不作为 effective instructions file 读取；schema skips this field；config layer stack 仍会检测该 key 是否出现。[E: codex-rs/config/src/config_toml.rs:394][E: codex-rs/config/src/config_toml.rs:395][E: codex-rs/core/src/config/mod.rs:2483][E: codex-rs/core/src/config/mod.rs:2506][E: codex-rs/core/src/config/mod.rs:2514] | legacy instructions file key；replacement 是 `model_instructions_file`。[E: codex-rs/config/src/config_toml.rs:394] | `codex-rs/config/src/config_toml.rs:396` |
| `experimental_compact_prompt_file` | `Option<AbsolutePathBuf>` | unset | profile 覆盖 global；读取 non-empty file 后作为 compact prompt fallback。[E: codex-rs/core/src/config/mod.rs:2039][E: codex-rs/core/src/config/mod.rs:2042][E: codex-rs/core/src/config/mod.rs:2043][E: codex-rs/core/src/config/mod.rs:2049] | legacy/experimental compact prompt file path；与 inline compact prompt string 共同决定 effective compact prompt。[E: codex-rs/core/src/config/mod.rs:1985][E: codex-rs/core/src/config/mod.rs:2049] | `codex-rs/config/src/config_toml.rs:397` |
| `experimental_use_unified_exec_tool` | `Option<bool>` | unset | 作为 legacy top-level feature toggle 输入 `FeatureConfigSource`。[E: codex-rs/core/src/config/mod.rs:1647] | legacy alias for `Feature::UnifiedExec`; feature alias table把该 key 映射到 `UnifiedExec`。[E: codex-rs/features/src/legacy.rs:21][E: codex-rs/features/src/legacy.rs:22] | `codex-rs/config/src/config_toml.rs:398` |
| `experimental_use_freeform_apply_patch` | `Option<bool>` | unset | 作为 legacy top-level feature toggle 输入 `FeatureConfigSource`。[E: codex-rs/core/src/config/mod.rs:1646] | legacy alias for `Feature::ApplyPatchFreeform`; feature alias table把该 key 映射到 `ApplyPatchFreeform`。[E: codex-rs/features/src/legacy.rs:25][E: codex-rs/features/src/legacy.rs:26] | `codex-rs/config/src/config_toml.rs:399` |

## Skills nested schema

`SkillConfig` 可以按 `path` 或 `name` 选择 skill，并包含 required `enabled` bool。[E: codex-rs/config/src/skills_config.rs:14][E: codex-rs/config/src/skills_config.rs:17][E: codex-rs/config/src/skills_config.rs:20][E: codex-rs/config/src/skills_config.rs:21] `BundledSkillsConfig.enabled` 默认 true，表示 bundled skills 可以统一开关。[E: codex-rs/config/src/skills_config.rs:40][E: codex-rs/config/src/skills_config.rs:47]

## Features nested schema

`FeaturesToml` flatten 任意 boolean feature entries；canonical/legacy key 会被 `feature_for_key()` 识别并由 `apply_toml()` 执行 enable/disable，未知 key 只记录 warning。[E: codex-rs/features/src/lib.rs:537][E: codex-rs/features/src/lib.rs:538][E: codex-rs/features/src/lib.rs:510][E: codex-rs/features/src/lib.rs:512][E: codex-rs/features/src/lib.rs:516][E: codex-rs/features/src/lib.rs:390][E: codex-rs/features/src/lib.rs:399][E: codex-rs/features/src/lib.rs:401][E: codex-rs/features/src/lib.rs:404][E: codex-rs/features/src/lib.rs:405] `multi_agent_v2` 可写成 `FeatureToml<MultiAgentV2ConfigToml>`；feature toggle path 只把 `multi_agent_v2.enabled()` 折叠进 boolean entries，custom config fields 由 core config 的 `resolve_multi_agent_v2_config()` 读取。[E: codex-rs/features/src/lib.rs:535][E: codex-rs/features/src/lib.rs:548][E: codex-rs/features/src/lib.rs:551][E: codex-rs/features/src/lib.rs:552][E: codex-rs/core/src/config/mod.rs:1469][E: codex-rs/core/src/config/mod.rs:1473][E: codex-rs/core/src/config/mod.rs:1474][E: codex-rs/core/src/config/mod.rs:1477][E: codex-rs/core/src/config/mod.rs:1481][E: codex-rs/core/src/config/mod.rs:1486] `FeatureToml<T>` 可以是 plain boolean，也可以是 custom config object。[E: codex-rs/features/src/lib.rs:572][E: codex-rs/features/src/lib.rs:573] Feature specs 记录 key、stage 和 default: `unified_exec` 是 stable 且默认 `!cfg!(windows)`，`apply_patch_freeform` 是 under development 且默认 false。[E: codex-rs/features/src/lib.rs:615][E: codex-rs/features/src/lib.rs:616][E: codex-rs/features/src/lib.rs:617][E: codex-rs/features/src/lib.rs:618][E: codex-rs/features/src/lib.rs:726][E: codex-rs/features/src/lib.rs:727][E: codex-rs/features/src/lib.rs:728][E: codex-rs/features/src/lib.rs:729]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/skills_config.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/legacy.rs`

## 相关

- [工具与集成 slash command](../slash-commands/tools-integrations.md) — 覆盖 `/skills`、`/plugins` 和 `/apps` entrypoints。
- [MCP 与工具设置](mcp-tools.md) — 覆盖 feature-gated built-in tools 与 MCP tool settings。
- [agents 与 memory 设置](agents-memory.md) — 覆盖 `[skills].include_instructions` 对 effective prompt block 的影响。
