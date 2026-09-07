---
id: subsys.mcp.oauth
title: MCP OAuth
kind: subsystem
tier: T2
source: [codex-rs/config/src/mcp_types.rs, codex-rs/rmcp-client/src/oauth.rs, codex-rs/rmcp-client/src/oauth/resolved_store.rs, codex-rs/rmcp-client/src/oauth/refresh_transaction.rs, codex-rs/rmcp-client/src/oauth/store_lock.rs, codex-rs/rmcp-client/src/auth_status.rs, codex-rs/rmcp-client/src/oauth_http_client.rs, codex-rs/rmcp-client/src/oauth_client_registration.rs, codex-rs/rmcp-client/src/perform_oauth_login.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/codex-mcp/src/mcp/auth.rs, codex-rs/codex-mcp/src/rmcp_client.rs]
symbols: [StoredOAuthTokens, OAuthPersistor, ResolvedOAuthCredentialStore, resolve_oauth_tokens_from_store_policy, refresh_if_needed, OAuthStoreLock, save_oauth_tokens, delete_oauth_tokens, determine_streamable_http_auth_status, determine_streamable_http_auth_status_from_credentials, OauthLoginFlow, oauth_login_support, compute_auth_statuses, McpOAuthClientRegistration, start_authorization]
related: [subsys.mcp.client, subsys.mcp.transports, subsys.config-auth.auth-flows, config.mcp-tools]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> MCP OAuth is the auth layer for streamable HTTP MCP servers: Codex classifies bearer/header/stored-token/discovery status, performs browser callback login, persists tokens to keyring/secrets/file depending on configuration, and refreshes/persists runtime OAuth credentials around RMCP operations.[E: codex-rs/rmcp-client/src/auth_status.rs:82][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:483][E: codex-rs/rmcp-client/src/oauth.rs:94][E: codex-rs/rmcp-client/src/rmcp_client.rs:1042]

## 能回答的问题

- streamable HTTP MCP server 什么时候是 BearerToken、OAuth、NotLoggedIn、Unsupported？
- `codex mcp login` 支持哪些 transport？
- OAuth scopes 的 explicit/configured/discovered/empty 优先级是什么？
- token 存在哪里，什么时候 fallback 到文件？
- runtime 何时 refresh 或 persist OAuth tokens？
- MCP OAuth login 怎样在 CIMD 与 Dynamic Client Registration 之间选择？

## 职责边界

`rmcp-client` owns token persistence, auth status discovery, browser callback login, OAuth transport creation, and runtime refresh/persist hooks; `codex-mcp/src/mcp/auth.rs` maps configured servers into CLI-facing login support, scope resolution, and auth-status aggregation.[E: codex-rs/rmcp-client/src/oauth.rs:94][E: codex-rs/rmcp-client/src/auth_status.rs:82][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:483][E: codex-rs/rmcp-client/src/rmcp_client.rs:1042][E: codex-rs/codex-mcp/src/mcp/auth.rs:94][E: codex-rs/codex-mcp/src/mcp/auth.rs:158][E: codex-rs/codex-mcp/src/mcp/auth.rs:197]

Tool approval, connector discoverability, and app policy are outside OAuth; those belong to tool/app policy layers.[I]

## 关键文件

- `codex-rs/rmcp-client/src/oauth.rs` plus `oauth/{resolved_store,refresh_transaction,store_lock}.rs`: token format/login cleanup, concrete-store pinning, cross-process store coordination, and serialized refresh transactions。[E: codex-rs/rmcp-client/src/oauth.rs:94][E: codex-rs/rmcp-client/src/oauth.rs:415][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:31]
- `codex-rs/rmcp-client/src/auth_status.rs`: streamable HTTP auth classification and OAuth discovery via well-known endpoints.[E: codex-rs/rmcp-client/src/auth_status.rs:82][E: codex-rs/rmcp-client/src/auth_status.rs:148][E: codex-rs/rmcp-client/src/auth_status.rs:157][E: codex-rs/rmcp-client/src/auth_status.rs:166][E: codex-rs/rmcp-client/src/auth_status.rs:181]
- `codex-rs/rmcp-client/src/oauth_client_registration.rs`: CIMD vs DCR client-registration strategy for interactive HTTP MCP login。[E: codex-rs/rmcp-client/src/oauth_client_registration.rs:20][E: codex-rs/rmcp-client/src/oauth_client_registration.rs:37]
- `codex-rs/rmcp-client/src/perform_oauth_login.rs`: callback listener, redirect URI/callback id handling, auth URL launch, callback wait, token save。[E: codex-rs/rmcp-client/src/perform_oauth_login.rs:483][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:499][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:513][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:523][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:526][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:631][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:669]
- `codex-rs/codex-mcp/src/mcp/auth.rs`: login support gate, scope resolution, discovered-scope retry policy, auth-status aggregation.[E: codex-rs/codex-mcp/src/mcp/auth.rs:94][E: codex-rs/codex-mcp/src/mcp/auth.rs:158][E: codex-rs/codex-mcp/src/mcp/auth.rs:192][E: codex-rs/codex-mcp/src/mcp/auth.rs:197]

## Auth status

- If a streamable HTTP config uses `bearer_token_env_var`, status is `BearerToken` without probing OAuth.[E: codex-rs/rmcp-client/src/auth_status.rs:157]
- Static or env-derived default HTTP headers containing `Authorization` also classify as `BearerToken`.[E: codex-rs/rmcp-client/src/auth_status.rs:161][E: codex-rs/rmcp-client/src/auth_status.rs:162][E: codex-rs/rmcp-client/src/auth_status.rs:163]
- Stored usable OAuth tokens classify as `OAuth`; stored but unusable/refresh-needed-without-valid-refresh-token classify as `LoggedOut(Reauthentication)`, which maps to protocol `NotLoggedIn`; missing tokens fall through to discovery.[E: codex-rs/rmcp-client/src/auth_status.rs:59][E: codex-rs/rmcp-client/src/auth_status.rs:166][E: codex-rs/rmcp-client/src/auth_status.rs:168][E: codex-rs/rmcp-client/src/auth_status.rs:171][E: codex-rs/rmcp-client/src/oauth.rs:327]
- Discovery returns `LoggedOut(Login)` when OAuth metadata is found, `Unsupported` when none is found, and debug-logs discovery errors before returning `Unsupported`; `LoggedOut` maps to protocol `NotLoggedIn`.[E: codex-rs/rmcp-client/src/auth_status.rs:59][E: codex-rs/rmcp-client/src/auth_status.rs:181][E: codex-rs/rmcp-client/src/auth_status.rs:187][E: codex-rs/rmcp-client/src/auth_status.rs:188]

## Login support and scopes

- `oauth_login_support` supports only `StreamableHttp` transports and rejects configs that use bearer-token env vars.[E: codex-rs/codex-mcp/src/mcp/auth.rs:94][E: codex-rs/codex-mcp/src/mcp/auth.rs:123][E: codex-rs/codex-mcp/src/mcp/auth.rs:134]
- Scope resolution precedence is explicit scopes, configured scopes, non-empty discovered scopes, then empty scopes.[E: codex-rs/codex-mcp/src/mcp/auth.rs:152][E: codex-rs/codex-mcp/src/mcp/auth.rs:154][E: codex-rs/codex-mcp/src/mcp/auth.rs:164][E: codex-rs/codex-mcp/src/mcp/auth.rs:171][E: codex-rs/codex-mcp/src/mcp/auth.rs:180]
- If discovered scopes cause an `OAuthProviderError`, `should_retry_without_scopes` allows retrying without scopes only for the discovered-scope case.[E: codex-rs/codex-mcp/src/mcp/auth.rs:186]

## Client registration

`McpOAuthClientRegistration` 控制一次 interactive HTTP MCP login 的 client identifier 策略：`Auto`（默认）在授权服务器广告 CIMD、token endpoint 支持 `none`、且 redirect 是带 callback id 的 ephemeral loopback 时 offer CIMD，否则让 rmcp 走 Dynamic Client Registration；`Cimd` 强制这三项条件，缺一则失败；`Dcr` 永不 offer CIMD。[E: codex-rs/rmcp-client/src/oauth_client_registration.rs:20][E: codex-rs/rmcp-client/src/oauth_client_registration.rs:23][E: codex-rs/rmcp-client/src/oauth_client_registration.rs:91][E: codex-rs/rmcp-client/src/oauth_client_registration.rs:108]

CIMD client metadata URL 是 `https://chatgpt.com/oauth/codex/{callback_id}/client.json`；pre-registered clients 不会进入这条 `start_authorization` 路径。[E: codex-rs/rmcp-client/src/oauth_client_registration.rs:115][E: codex-rs/rmcp-client/src/oauth_client_registration.rs:119][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:623]

## Token persistence

- Credential identity is environment-aware: local servers retain legacy names (with `local:` escaping for names that already look executor-owned), while non-local servers use `executor:<base64url environment id>:<base64url server name>`。The fallback file also stores an `executor_owned` marker；executor lookups require it and host lookups reject it, so legacy host credentials do not silently authorize an executor server。[E: codex-rs/config/src/mcp_types.rs:276][E: codex-rs/config/src/mcp_types.rs:278][E: codex-rs/config/src/mcp_types.rs:289][E: codex-rs/rmcp-client/src/oauth.rs:831][E: codex-rs/rmcp-client/src/oauth.rs:892]
- `StoredOAuthTokens` stores server name, URL, client id, wrapped token response, and optional `expires_at` timestamp.[E: codex-rs/rmcp-client/src/oauth.rs:94]
- Store mode `Auto` resolves keyring-first with file fallback only at lifecycle start, while `File` and `Keyring` choose exact stores；the resolved source is then pinned for reread/refresh/save/delete, and a mid-lifecycle backend failure is surfaced instead of switching to a possibly stale token source。[E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:33][E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:106][E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:113][E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:157][E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:163]
- Login-time keyring writes can clean up the fallback file, but exact-store runtime writes never mutate the other authority；aggregate File/Secrets read-modify-write operations hold a bounded cross-process lock。[E: codex-rs/rmcp-client/src/oauth.rs:341][E: codex-rs/rmcp-client/src/oauth.rs:415][E: codex-rs/rmcp-client/src/oauth.rs:423][E: codex-rs/rmcp-client/src/oauth/store_lock.rs:17]
- Refresh is an owned, serialized read-refresh-write transaction: after acquiring the credential lock it rereads the pinned authority, adopts a newer winner, enforces an independent 45-second provider bound, persists before exposing the rotated credential, and fails closed on persistence errors。[E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:31][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:54][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:99][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:104][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:239]

## Runtime hooks

- Auth-status discovery resolves the environment-specific HTTP client first；local discovery uses a capped timeout, executor-owned discovery can request its environment timeout。A non-local server configured with hosted ChatGPT auth is `Unsupported` unless it also provides explicit HTTP authorization, preventing host session credentials from crossing the environment boundary。[E: codex-rs/codex-mcp/src/mcp/auth.rs:254][E: codex-rs/codex-mcp/src/mcp/auth.rs:267][E: codex-rs/codex-mcp/src/mcp/auth.rs:271]
- Streamable HTTP pending transport loads stored tokens only when no configured bearer token, runtime auth provider, or Authorization header is present；transport rebuilds reread only the lifecycle-pinned store instead of reevaluating `Auto`。[E: codex-rs/rmcp-client/src/rmcp_client.rs:1049][E: codex-rs/rmcp-client/src/rmcp_client.rs:1096][E: codex-rs/rmcp-client/src/rmcp_client.rs:1107]
- Stored tokens create an OAuth transport plus `OAuthPersistor`; if OAuth metadata is unavailable but an access token exists, Codex falls back to bearer-token auth using the stored access token.[E: codex-rs/rmcp-client/src/rmcp_client.rs:1049]
- RMCP operations await `refresh_oauth_if_needed` before their active-time operation timeout begins；refresh failures now propagate instead of being warning-only, while successful operations still run the persistence hook afterward。[E: codex-rs/rmcp-client/src/rmcp_client.rs:694][E: codex-rs/rmcp-client/src/rmcp_client.rs:1042][E: codex-rs/rmcp-client/src/rmcp_client.rs:1044][E: codex-rs/rmcp-client/src/rmcp_client.rs:719]

## Sources

- codex-rs/rmcp-client/src/oauth.rs
- codex-rs/config/src/mcp_types.rs
- codex-rs/rmcp-client/src/oauth/resolved_store.rs
- codex-rs/rmcp-client/src/oauth/refresh_transaction.rs
- codex-rs/rmcp-client/src/oauth/store_lock.rs
- codex-rs/rmcp-client/src/auth_status.rs
- codex-rs/rmcp-client/src/oauth_http_client.rs
- codex-rs/rmcp-client/src/oauth_client_registration.rs
- codex-rs/rmcp-client/src/perform_oauth_login.rs
- codex-rs/rmcp-client/src/rmcp_client.rs
- codex-rs/codex-mcp/src/mcp/auth.rs
- codex-rs/codex-mcp/src/rmcp_client.rs

## 相关

- [MCP client runtime](client.md)
- [MCP transports](transports.md)
- [认证流程](../config-auth/auth-flows.md)
- [MCP 与工具设置](../../surface/config/mcp-tools.md)
