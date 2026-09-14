---
id: config.agents-memory
title: agents 与 memory 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/profile_toml.rs, codex-rs/config/src/types.rs, codex-rs/features/src/feature_configs.rs, codex-rs/config/src/merge.rs]
symbols: [AgentsToml, AgentRoleToml, MemoriesToml, ThreadStoreToml]
related: [command.session-thread, command.realtime-debug, config.skills-plugins-features, subsys.core.memory, subsys.core.thread-store]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> agents 与 memory 设置 catalog 覆盖 ConfigToml 中 instructions/developer blocks、profile selection、project docs、agent enablement/concurrency/default model, memory behavior, project trust and experimental thread config/store keys。

## 能回答的问题

- instructions、developer_instructions 和 include_* instruction flags 当前有哪些？
- profile/profiles、project docs、projects 的 top-level fields 是什么？
- agents 和 memories nested sections 在 ConfigToml 中如何声明？
- thread config/store 相关 experimental/removed keys 当前是什么状态？

## Catalog 边界

当前 `ConfigToml` 有 99 个顶层 `pub` 字段；本节点覆盖其中 19 个字段。[E: codex-rs/config/src/config_toml.rs:156][E: codex-rs/config/src/config_toml.rs:539]

`AgentsToml` exposes `enabled`、per-session `max_concurrent_threads_per_session`（`max_threads` alias）、V1-only `max_depth`、默认 subagent model/reasoning effort、interrupt-message policy 与 flattened role declarations。`job_max_runtime_seconds` 只为旧配置可解析而保留，是 schema-hidden no-op；当前没有 agent-job runtime。[E: codex-rs/config/src/config_toml.rs:687][E: codex-rs/config/src/config_toml.rs:690][E: codex-rs/config/src/config_toml.rs:693][E: codex-rs/config/src/config_toml.rs:695][E: codex-rs/config/src/config_toml.rs:704][E: codex-rs/config/src/config_toml.rs:719]

`MemoriesToml` includes generation/use toggles, dedicated tools, retention limits, rate-limit threshold, and model overrides; memory defaults set `max_rollouts_per_startup` to 2 and `max_rollout_age_days` to 10.[E: codex-rs/config/src/types.rs:296][E: codex-rs/config/src/types.rs:305][E: codex-rs/config/src/types.rs:307][E: codex-rs/config/src/types.rs:309][E: codex-rs/config/src/types.rs:316][E: codex-rs/config/src/types.rs:319][E: codex-rs/config/src/types.rs:324][E: codex-rs/config/src/types.rs:326][E: codex-rs/config/src/types.rs:50][E: codex-rs/config/src/types.rs:51][E: codex-rs/config/src/types.rs:361][E: codex-rs/config/src/types.rs:362]

multi-agent v2 的配置不增加 ConfigToml 顶层字段，而是扩展 `features.multi_agent_v2` table：`subagent_developer_instructions` 可覆盖没有 role-specific instructions 的 subagent developer instructions。layer merge 对该 feature 特判 bool/table 兼容：低层 bool 遇高层 table 会提升为 `{ enabled = ... }`，低层 table 遇高层 bool 则只覆盖其 `enabled`，避免丢掉 table 内的其余 knobs。[E: codex-rs/features/src/feature_configs.rs:250][E: codex-rs/features/src/feature_configs.rs:276][E: codex-rs/config/src/merge.rs:58][E: codex-rs/config/src/merge.rs:78]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `instructions` | `Option<String>` | none | System instruction override field. | [E: codex-rs/config/src/config_toml.rs:232] |
| `developer_instructions` | `Option<String>` | `#[serde(default)]` | Developer instruction override field. | [E: codex-rs/config/src/config_toml.rs:236] |
| `include_permissions_instructions` | `Option<bool>` | none | Toggle for the permissions developer block. | [E: codex-rs/config/src/config_toml.rs:239] |
| `include_apps_instructions` | `Option<bool>` | none | Toggle for the apps developer block. | [E: codex-rs/config/src/config_toml.rs:242] |
| `include_collaboration_mode_instructions` | `Option<bool>` | none | Toggle for the collaboration-mode developer block. | [E: codex-rs/config/src/config_toml.rs:245] |
| `include_environment_context` | `Option<bool>` | none | Toggle for injecting environment context. | [E: codex-rs/config/src/config_toml.rs:248] |
| `model_instructions_file` | `Option<AbsolutePathBuf>` | none | Optional model-instructions file path field. | [E: codex-rs/config/src/config_toml.rs:254] |
| `compact_prompt` | `Option<String>` | none | Compact prompt override field. | [E: codex-rs/config/src/config_toml.rs:257] |
| `project_doc_max_bytes` | `Option<usize>` | `#[serde(default = "default_project_doc_max_bytes")]` | Project-doc byte limit field. | [E: codex-rs/config/src/config_toml.rs:315] |
| `project_doc_fallback_filenames` | `Option<Vec<String>>` | `#[serde(default = "default_project_doc_fallback_filenames")]` | Project-doc fallback filename list. | [E: codex-rs/config/src/config_toml.rs:319] |
| `profile` | `Option<String>` | none | Selected profile name. | [E: codex-rs/config/src/config_toml.rs:341] |
| `profiles` | `HashMap<String, ConfigProfile>` | `#[serde(default)]` | Named profile map. | [E: codex-rs/config/src/config_toml.rs:345] |
| `agents` | `Option<AgentsToml>` | none | Agent-related settings section. | [E: codex-rs/config/src/config_toml.rs:460] |
| `goals` | `Option<GoalsToml>` | none | Goal-related settings. | [E: codex-rs/config/src/config_toml.rs:463] |
| `memories` | `Option<MemoriesToml>` | none | Memories subsystem settings section. | [E: codex-rs/config/src/config_toml.rs:466] |
| `projects` | `Option<HashMap<String, ProjectConfig>>` | none | Project trust/settings map. | [E: codex-rs/config/src/config_toml.rs:448] |
| `experimental_thread_store_endpoint` | `Option<String>` | `#[schemars(skip)]` | Removed thread-store endpoint compatibility field. | [E: codex-rs/config/src/config_toml.rs:444] |
| `experimental_thread_store` | `Option<ThreadStoreToml>` | none | Experimental thread-store implementation selector. | [E: codex-rs/config/src/config_toml.rs:447] |
| `experimental_compact_prompt_file` | `Option<AbsolutePathBuf>` | none | Experimental compact-prompt file path. | [E: codex-rs/config/src/config_toml.rs:536] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/config/src/merge.rs`

## 相关

- `command.session-thread`
- `command.realtime-debug`
- `config.skills-plugins-features`
- `subsys.core.memory`
- `subsys.core.thread-store`
