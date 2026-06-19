---
id: config.agents-memory
title: agents 与 memory 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/profile_toml.rs, codex-rs/config/src/types.rs]
symbols: [ConfigToml, ConfigProfile, AgentsToml, AgentRoleToml, MemoriesToml, MemoriesConfig, ProjectConfig, ThreadStoreToml]
related: [command.session-thread, command.realtime-debug, config.skills-plugins-features, subsys.core.memory, subsys.core.thread-store]
evidence: explicit
status: verified
updated: 5670360009
---

> agents 与 memory 设置 catalog 覆盖 ConfigToml 中 instructions/developer blocks、profile selection、project docs、agent concurrency, memory behavior, project trust and experimental thread config/store keys。

## 能回答的问题

- instructions、developer_instructions 和 include_* instruction flags 当前有哪些？
- profile/profiles、project docs、projects 的 top-level fields 是什么？
- agents 和 memories nested sections 在 ConfigToml 中如何声明？
- thread config/store 相关 experimental/removed keys 当前是什么状态？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 19 个。8 个 surface/config catalog 节点合计覆盖全部 96 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:136][E: codex-rs/config/src/config_toml.rs:139]

`MemoriesToml` includes generation/use toggles, dedicated tools, retention limits, rate-limit threshold, and model overrides; `MemoriesConfig::default()` now defaults max_rollouts_per_startup to 2 and max_rollout_age_days to 10.[E: codex-rs/config/src/types.rs:282][E: codex-rs/config/src/types.rs:291][E: codex-rs/config/src/types.rs:330][E: codex-rs/config/src/types.rs:339][E: codex-rs/config/src/types.rs:340]

## 字段 catalog

| key | Rust type | serde/schema attrs | 源码注释摘要 | Evidence |
|---|---|---|---|---|
| `instructions` | `Option<String>` | none | System instructions. | [E: codex-rs/config/src/config_toml.rs:203][E: codex-rs/config/src/config_toml.rs:204] |
| `developer_instructions` | `Option<String>` | `#[serde(default)]` | Developer instructions inserted as a `developer` role message. | [E: codex-rs/config/src/config_toml.rs:206][E: codex-rs/config/src/config_toml.rs:207][E: codex-rs/config/src/config_toml.rs:208] |
| `include_permissions_instructions` | `Option<bool>` | none | Whether to inject the `<permissions instructions>` developer block. | [E: codex-rs/config/src/config_toml.rs:210][E: codex-rs/config/src/config_toml.rs:211] |
| `include_apps_instructions` | `Option<bool>` | none | Whether to inject the `<apps_instructions>` developer block. | [E: codex-rs/config/src/config_toml.rs:213][E: codex-rs/config/src/config_toml.rs:214] |
| `include_collaboration_mode_instructions` | `Option<bool>` | none | Whether to inject the `<collaboration_mode>` developer block. | [E: codex-rs/config/src/config_toml.rs:216][E: codex-rs/config/src/config_toml.rs:217] |
| `include_environment_context` | `Option<bool>` | none | Whether to inject the `<environment_context>` user block. | [E: codex-rs/config/src/config_toml.rs:219][E: codex-rs/config/src/config_toml.rs:220] |
| `model_instructions_file` | `Option<AbsolutePathBuf>` | none | Optional path to a file containing model instructions that will override the built-in instructions for the selected model. Users are STRONGLY DISCOURAGED from using this field, ... | [E: codex-rs/config/src/config_toml.rs:222][E: codex-rs/config/src/config_toml.rs:226] |
| `compact_prompt` | `Option<String>` | none | Compact prompt used for history compaction. | [E: codex-rs/config/src/config_toml.rs:228][E: codex-rs/config/src/config_toml.rs:229] |
| `project_doc_max_bytes` | `Option<usize>` | `#[serde(default = "default_project_doc_max_bytes")]` | Maximum number of bytes to include from an AGENTS.md project doc file. | [E: codex-rs/config/src/config_toml.rs:275][E: codex-rs/config/src/config_toml.rs:276][E: codex-rs/config/src/config_toml.rs:277] |
| `project_doc_fallback_filenames` | `Option<Vec<String>>` | `#[serde(default = "default_project_doc_fallback_filenames")]` | Ordered list of fallback filenames to look for when AGENTS.md is missing. | [E: codex-rs/config/src/config_toml.rs:279][E: codex-rs/config/src/config_toml.rs:280][E: codex-rs/config/src/config_toml.rs:281] |
| `profile` | `Option<String>` | none | Profile to use from the `profiles` map. | [E: codex-rs/config/src/config_toml.rs:298][E: codex-rs/config/src/config_toml.rs:299] |
| `profiles` | `HashMap<String, ConfigProfile>` | `#[serde(default)]` | Named profiles to facilitate switching between different configurations. | [E: codex-rs/config/src/config_toml.rs:301][E: codex-rs/config/src/config_toml.rs:302][E: codex-rs/config/src/config_toml.rs:303] |
| `agents` | `Option<AgentsToml>` | none | Agent-related settings (thread limits, etc.). | [E: codex-rs/config/src/config_toml.rs:421][E: codex-rs/config/src/config_toml.rs:422] |
| `memories` | `Option<MemoriesToml>` | none | Memories subsystem settings. | [E: codex-rs/config/src/config_toml.rs:424][E: codex-rs/config/src/config_toml.rs:425] |
| `projects` | `Option<HashMap<String, ProjectConfig>>` | none | ConfigToml schema field. | [E: codex-rs/config/src/config_toml.rs:410] |
| `experimental_thread_config_endpoint` | `Option<String>` | none | Experimental / do not use. When set, app-server fetches thread-scoped config from a remote service at this endpoint. | [E: codex-rs/config/src/config_toml.rs:399][E: codex-rs/config/src/config_toml.rs:401] |
| `experimental_thread_store_endpoint` | `Option<String>` | `#[schemars(skip)]` | Removed. Former remote thread-store endpoint setting kept only so we can fail fast instead of silently falling back to local persistence. | [E: codex-rs/config/src/config_toml.rs:403][E: codex-rs/config/src/config_toml.rs:405][E: codex-rs/config/src/config_toml.rs:406] |
| `experimental_thread_store` | `Option<ThreadStoreToml>` | none | Experimental / do not use. Selects the thread store implementation. | [E: codex-rs/config/src/config_toml.rs:408][E: codex-rs/config/src/config_toml.rs:409] |
| `experimental_compact_prompt_file` | `Option<AbsolutePathBuf>` | none | ConfigToml schema field. | [E: codex-rs/config/src/config_toml.rs:497] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/types.rs`

## 相关

- `command.session-thread`
- `command.realtime-debug`
- `config.skills-plugins-features`
- `subsys.core.memory`
- `subsys.core.thread-store`
