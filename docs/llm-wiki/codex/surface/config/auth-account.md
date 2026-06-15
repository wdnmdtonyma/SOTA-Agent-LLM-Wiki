---
id: config.auth-account
title: 认证与账户设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/core/src/config/mod.rs, codex-rs/protocol/src/config_types.rs, codex-rs/login/src/auth/manager.rs]
symbols: [ConfigToml, AuthCredentialsStoreMode, OAuthCredentialsStoreMode, ForcedLoginMethod, resolve_cli_auth_credentials_store_mode, resolve_mcp_oauth_credentials_store_mode]
related: [cli.subcommands, config.model-provider, config.mcp-tools]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 认证与账户设置 catalog 覆盖 `ConfigToml` 中限制 ChatGPT/API 登录方式、选择 credential store、配置 MCP OAuth callback 的顶层键。

## 能回答的问题

- `forced_login_method` 接受哪些值，如何限制当前 auth mode?
- `forced_chatgpt_workspace_id` 是怎样被 trim 并传给 auth layer 的?
- CLI auth credential store 和 MCP OAuth credential store 的默认值有什么差异?
- 本地开发版本为什么会把 keyring/auto credential store 降级为 file?
- MCP OAuth callback port 与 callback URL 的职责边界是什么?

## Catalog

| key | TOML 类型 | TOML 默认 | 有效配置默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `forced_chatgpt_workspace_id` | `Option<String>` | unset | 空白字符串被 trim 成 `None`，trim 后非空则保存 trimmed copy。[E: codex-rs/core/src/config/mod.rs:1964][E: codex-rs/core/src/config/mod.rs:1966][E: codex-rs/core/src/config/mod.rs:1968] | 限制 ChatGPT login 到指定 workspace identifier；auth manager 在存在 expected account id 时读取当前 ChatGPT account id 并比较。[E: codex-rs/config/src/config_toml.rs:154][E: codex-rs/login/src/auth/manager.rs:614][E: codex-rs/login/src/auth/manager.rs:632][E: codex-rs/login/src/auth/manager.rs:635] | `codex-rs/config/src/config_toml.rs:156` |
| `forced_login_method` | `Option<ForcedLoginMethod>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:1972][E: codex-rs/core/src/config/mod.rs:2336] | 限制用户可用登录机制；serde lowercase wire values 是 `chatgpt` 和 `api`。[E: codex-rs/protocol/src/config_types.rs:260][E: codex-rs/protocol/src/config_types.rs:263][E: codex-rs/protocol/src/config_types.rs:264] | `codex-rs/config/src/config_toml.rs:160` |
| `cli_auth_credentials_store` | `Option<AuthCredentialsStoreMode>` | unset | `AuthCredentialsStoreMode::File`，但 local dev build 下 `Keyring`/`Auto` 也会解析为 `File`。[E: codex-rs/config/src/types.rs:48][E: codex-rs/core/src/config/mod.rs:156][E: codex-rs/core/src/config/mod.rs:157][E: codex-rs/core/src/config/mod.rs:2243] | 选择 CLI auth credentials backend：`file`、`keyring`、`auto`、`ephemeral`。[E: codex-rs/config/src/types.rs:46][E: codex-rs/config/src/types.rs:50][E: codex-rs/config/src/types.rs:52][E: codex-rs/config/src/types.rs:54][E: codex-rs/config/src/types.rs:56] | `codex-rs/config/src/config_toml.rs:167` |
| `mcp_oauth_credentials_store` | `Option<OAuthCredentialsStoreMode>` | unset | `OAuthCredentialsStoreMode::Auto`，local dev build 下 `Keyring`/`Auto` 解析为 `File`。[E: codex-rs/config/src/types.rs:65][E: codex-rs/core/src/config/mod.rs:169][E: codex-rs/core/src/config/mod.rs:170][E: codex-rs/core/src/config/mod.rs:2250] | 选择 MCP OAuth credentials backend：`auto`、`file`、`keyring`。[E: codex-rs/config/src/types.rs:61][E: codex-rs/config/src/types.rs:66][E: codex-rs/config/src/types.rs:69][E: codex-rs/config/src/types.rs:71] | `codex-rs/config/src/config_toml.rs:181` |
| `mcp_oauth_callback_port` | `Option<u16>` | unset | `None`，由 MCP OAuth flow 使用 OS chosen ephemeral port。[E: codex-rs/config/src/config_toml.rs:183][E: codex-rs/config/src/config_toml.rs:184] | 固定 MCP OAuth local HTTP callback server port；适合需要预注册 loopback port 的 OAuth client。[I] | `codex-rs/config/src/config_toml.rs:185` |
| `mcp_oauth_callback_url` | `Option<String>` | unset | 有效 config 保留 clone 后的 configured URL。[E: codex-rs/core/src/config/mod.rs:2254] | 指定 OAuth authorization request 使用的 redirect URI；设置后 local callback listener 仍绑定 `127.0.0.1`，可继续受 `mcp_oauth_callback_port` 控制。[E: codex-rs/config/src/config_toml.rs:187][E: codex-rs/config/src/config_toml.rs:188][E: codex-rs/config/src/config_toml.rs:189][E: codex-rs/config/src/config_toml.rs:190] | `codex-rs/config/src/config_toml.rs:191` |

## Enforcement 机制

`forced_login_method` 不是登录 UI 文案层面的 hint，而是 auth manager 里的校验输入：当要求 API key 但当前使用 ChatGPT/ChatGPT tokens/agent identity 时会返回要求登出的 message；当要求 ChatGPT 但当前使用 API key 时也会返回要求登出的 message。[E: codex-rs/login/src/auth/manager.rs:587][E: codex-rs/login/src/auth/manager.rs:593][E: codex-rs/login/src/auth/manager.rs:596][E: codex-rs/login/src/auth/manager.rs:599][E: codex-rs/login/src/auth/manager.rs:600]

CLI auth store 与 MCP OAuth store 在 `config.toml` 中都省略 `_mode` 后缀，但 effective `Config` 字段保留 `_mode` 后缀以区分 storage mode 与 store implementation。[E: codex-rs/core/src/config/mod.rs:2240][E: codex-rs/core/src/config/mod.rs:2241][E: codex-rs/core/src/config/mod.rs:2242][E: codex-rs/core/src/config/mod.rs:2247][E: codex-rs/core/src/config/mod.rs:2248][E: codex-rs/core/src/config/mod.rs:2249]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/login/src/auth/manager.rs`

## 相关

- [CLI 子命令 catalog](../cli/subcommands.md) — 覆盖 `login`、`logout` subcommands。
- [模型与 provider 设置](model-provider.md) — 覆盖 provider auth 字段与 built-in provider catalog。
- [MCP 与工具设置](mcp-tools.md) — 覆盖 MCP server OAuth scopes/resource 与 callback 使用场景。
