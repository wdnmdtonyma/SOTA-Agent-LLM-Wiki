---
id: config.auth-account
title: 认证与账户设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/protocol/src/config_types.rs]
symbols: [ConfigToml, ForcedChatgptWorkspaceIds, ForcedLoginMethod, AuthCredentialsStoreMode]
related: [config.model-provider, config.mcp-tools, subsys.config-auth.auth-flows, subsys.config-auth.credential-storage]
evidence: explicit
status: verified
updated: 5670360009
---

> 认证与账户设置 catalog 覆盖 ConfigToml 中限制 ChatGPT workspace、限制 login method 和选择 CLI auth credential storage backend 的顶层键。

## 能回答的问题

- ChatGPT workspace allowlist 的字段名和类型是什么？
- 强制 login method 的 ConfigToml 字段是什么？
- CLI auth credentials store 支持哪个 enum 类型？
- MCP OAuth storage 为什么不在本节点而在 MCP/tools 节点？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 3 个。8 个 surface/config catalog 节点合计覆盖全部 96 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:136][E: codex-rs/config/src/config_toml.rs:139]

MCP OAuth credential storage is a separate top-level field under the MCP/tools catalog because the field name and comments are scoped to MCP OAuth, not CLI account login.[E: codex-rs/config/src/config_toml.rs:252][E: codex-rs/config/src/config_toml.rs:258]

## 字段 catalog

| key | Rust type | serde/schema attrs | 源码注释摘要 | Evidence |
|---|---|---|---|---|
| `forced_chatgpt_workspace_id` | `Option<ForcedChatgptWorkspaceIds>` | `#[serde(default)]` | When set, restricts ChatGPT login to one or more workspace identifiers. | [E: codex-rs/config/src/config_toml.rs:231][E: codex-rs/config/src/config_toml.rs:232][E: codex-rs/config/src/config_toml.rs:233] |
| `forced_login_method` | `Option<ForcedLoginMethod>` | `#[serde(default)]` | When set, restricts the login mechanism users may use. | [E: codex-rs/config/src/config_toml.rs:235][E: codex-rs/config/src/config_toml.rs:236][E: codex-rs/config/src/config_toml.rs:237] |
| `cli_auth_credentials_store` | `Option<AuthCredentialsStoreMode>` | `#[serde(default)]` | Preferred backend for storing CLI auth credentials. file (default): Use a file in the Codex home directory. keyring: Use an OS-specific keyring service. auto: Use the keyring if... | [E: codex-rs/config/src/config_toml.rs:239][E: codex-rs/config/src/config_toml.rs:243][E: codex-rs/config/src/config_toml.rs:244] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/protocol/src/config_types.rs`

## 相关

- `config.model-provider`
- `config.mcp-tools`
- `subsys.config-auth.auth-flows`
- `subsys.config-auth.credential-storage`
