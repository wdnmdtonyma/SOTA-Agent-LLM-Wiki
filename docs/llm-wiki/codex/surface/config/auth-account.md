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
updated: db887d03e1
---

> 认证与账户设置 catalog 覆盖 ConfigToml 中限制 ChatGPT workspace、限制 login method 和选择 CLI auth credential storage backend 的顶层键。

## 能回答的问题

- ChatGPT workspace allowlist 的字段名和类型是什么？
- 强制 login method 的 ConfigToml 字段是什么？
- CLI auth credentials store 支持哪个 enum 类型？
- MCP OAuth storage 为什么不在本节点而在 MCP/tools 节点？

## Catalog 边界

当前 `ConfigToml` 有 97 个顶层 `pub` 字段；本节点覆盖其中 3 个字段。[E: codex-rs/config/src/config_toml.rs:154][E: codex-rs/config/src/config_toml.rs:518]

MCP OAuth credential storage remains a separate top-level field named `mcp_oauth_credentials_store`, so this CLI account catalog keeps it under the MCP/tools catalog boundary.[E: codex-rs/config/src/config_toml.rs:273]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `forced_chatgpt_workspace_id` | `Option<ForcedChatgptWorkspaceIds>` | `#[serde(default)]` | Restricts ChatGPT login to configured workspace identifiers. | [E: codex-rs/config/src/config_toml.rs:247][E: codex-rs/config/src/config_toml.rs:248] |
| `forced_login_method` | `Option<ForcedLoginMethod>` | `#[serde(default)]` | Restricts the allowed login mechanism. | [E: codex-rs/config/src/config_toml.rs:251][E: codex-rs/config/src/config_toml.rs:252] |
| `cli_auth_credentials_store` | `Option<AuthCredentialsStoreMode>` | `#[serde(default)]` | Selects the CLI auth credentials storage backend. | [E: codex-rs/config/src/config_toml.rs:258][E: codex-rs/config/src/config_toml.rs:259] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/protocol/src/config_types.rs`

## 相关

- `config.model-provider`
- `config.mcp-tools`
- `subsys.config-auth.auth-flows`
- `subsys.config-auth.credential-storage`
