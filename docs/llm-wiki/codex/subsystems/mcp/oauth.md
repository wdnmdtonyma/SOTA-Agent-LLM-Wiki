---
id: subsys.mcp.oauth
title: MCP OAuth
kind: subsystem
tier: T2
source: [codex-rs/rmcp-client/src/oauth.rs, codex-rs/rmcp-client/src/auth_status.rs, codex-rs/rmcp-client/src/perform_oauth_login.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/codex-mcp/src/mcp/auth.rs]
symbols: [StoredOAuthTokens, OAuthPersistor, load_oauth_tokens, save_oauth_tokens, delete_oauth_tokens, determine_streamable_http_auth_status, OauthLoginFlow, oauth_login_support, compute_auth_statuses]
related: [subsys.mcp.client, subsys.mcp.transports, subsys.config-auth.auth-flows, config.mcp-tools]
evidence: explicit
status: verified
updated: db887d03e1
---

> MCP OAuth is the auth layer for streamable HTTP MCP servers: Codex classifies bearer/header/stored-token/discovery status, performs browser callback login, persists tokens to keyring/secrets/file depending on configuration, and refreshes/persists runtime OAuth credentials around RMCP operations.[E: codex-rs/rmcp-client/src/auth_status.rs:62][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:491][E: codex-rs/rmcp-client/src/oauth.rs:93][E: codex-rs/rmcp-client/src/oauth.rs:448]

## 能回答的问题

- streamable HTTP MCP server 什么时候是 BearerToken、OAuth、NotLoggedIn、Unsupported？
- `codex mcp login` 支持哪些 transport？
- OAuth scopes 的 explicit/configured/discovered/empty 优先级是什么？
- token 存在哪里，什么时候 fallback 到文件？
- runtime 何时 refresh 或 persist OAuth tokens？

## 职责边界

`rmcp-client` owns token persistence, auth status discovery, browser callback login, OAuth transport creation, and runtime refresh/persist hooks; `codex-mcp/src/mcp/auth.rs` maps configured servers into CLI-facing login support, scope resolution, and auth-status aggregation.[E: codex-rs/rmcp-client/src/oauth.rs:93][E: codex-rs/rmcp-client/src/auth_status.rs:62][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:491][E: codex-rs/rmcp-client/src/rmcp_client.rs:764][E: codex-rs/codex-mcp/src/mcp/auth.rs:60][E: codex-rs/codex-mcp/src/mcp/auth.rs:144][E: codex-rs/codex-mcp/src/mcp/auth.rs:183]

Tool approval, connector discoverability, and app policy are outside OAuth; those belong to tool/app policy layers.[I]

## 关键文件

- `codex-rs/rmcp-client/src/oauth.rs`: stored token struct/status, load/save/delete, keyring/secrets/file fallback, persistor refresh/persist, fallback file format.[E: codex-rs/rmcp-client/src/oauth.rs:64][E: codex-rs/rmcp-client/src/oauth.rs:87][E: codex-rs/rmcp-client/src/oauth.rs:93][E: codex-rs/rmcp-client/src/oauth.rs:245][E: codex-rs/rmcp-client/src/oauth.rs:353][E: codex-rs/rmcp-client/src/oauth.rs:448][E: codex-rs/rmcp-client/src/oauth.rs:575][E: codex-rs/rmcp-client/src/oauth.rs:581][E: codex-rs/rmcp-client/src/oauth.rs:594][E: codex-rs/rmcp-client/src/oauth.rs:637]
- `codex-rs/rmcp-client/src/auth_status.rs`: streamable HTTP auth classification and OAuth discovery via well-known endpoints.[E: codex-rs/rmcp-client/src/auth_status.rs:62][E: codex-rs/rmcp-client/src/auth_status.rs:137][E: codex-rs/rmcp-client/src/auth_status.rs:146][E: codex-rs/rmcp-client/src/auth_status.rs:161][E: codex-rs/rmcp-client/src/auth_status.rs:207]
- `codex-rs/rmcp-client/src/perform_oauth_login.rs`: callback listener, redirect URI/callback id handling, auth URL launch, callback wait, token save.[E: codex-rs/rmcp-client/src/perform_oauth_login.rs:491][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:509][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:521][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:538][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:546][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:592][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:626]
- `codex-rs/codex-mcp/src/mcp/auth.rs`: login support gate, scope resolution, discovered-scope retry policy, auth-status aggregation.[E: codex-rs/codex-mcp/src/mcp/auth.rs:60][E: codex-rs/codex-mcp/src/mcp/auth.rs:144][E: codex-rs/codex-mcp/src/mcp/auth.rs:178][E: codex-rs/codex-mcp/src/mcp/auth.rs:183]

## Auth status

- If a streamable HTTP config uses `bearer_token_env_var`, status is `BearerToken` without probing OAuth.[E: codex-rs/rmcp-client/src/auth_status.rs:137]
- Static or env-derived default HTTP headers containing `Authorization` also classify as `BearerToken`.[E: codex-rs/rmcp-client/src/auth_status.rs:141][E: codex-rs/rmcp-client/src/auth_status.rs:142][E: codex-rs/rmcp-client/src/auth_status.rs:143]
- Stored usable OAuth tokens classify as `OAuth`; stored but unusable/refresh-needed-without-valid-refresh-token classify as `LoggedOut(Reauthentication)`, which maps to protocol `NotLoggedIn`; missing tokens fall through to discovery.[E: codex-rs/rmcp-client/src/auth_status.rs:45][E: codex-rs/rmcp-client/src/auth_status.rs:146][E: codex-rs/rmcp-client/src/auth_status.rs:150][E: codex-rs/rmcp-client/src/oauth.rs:115][E: codex-rs/rmcp-client/src/oauth.rs:130]
- Discovery returns `LoggedOut(Login)` when OAuth metadata is found, `Unsupported` when none is found, and debug-logs discovery errors before returning `Unsupported`; `LoggedOut` maps to protocol `NotLoggedIn`.[E: codex-rs/rmcp-client/src/auth_status.rs:45][E: codex-rs/rmcp-client/src/auth_status.rs:161][E: codex-rs/rmcp-client/src/auth_status.rs:167][E: codex-rs/rmcp-client/src/auth_status.rs:168][E: codex-rs/rmcp-client/src/auth_status.rs:169]

## Login support and scopes

- `oauth_login_support` supports only `StreamableHttp` transports and rejects configs that use bearer-token env vars.[E: codex-rs/codex-mcp/src/mcp/auth.rs:60][E: codex-rs/codex-mcp/src/mcp/auth.rs:105][E: codex-rs/codex-mcp/src/mcp/auth.rs:114]
- Scope resolution precedence is explicit scopes, configured scopes, non-empty discovered scopes, then empty scopes.[E: codex-rs/codex-mcp/src/mcp/auth.rs:144][E: codex-rs/codex-mcp/src/mcp/auth.rs:149][E: codex-rs/codex-mcp/src/mcp/auth.rs:156][E: codex-rs/codex-mcp/src/mcp/auth.rs:163][E: codex-rs/codex-mcp/src/mcp/auth.rs:172]
- If discovered scopes cause an `OAuthProviderError`, `should_retry_without_scopes` allows retrying without scopes only for the discovered-scope case.[E: codex-rs/codex-mcp/src/mcp/auth.rs:178]

## Token persistence

- `StoredOAuthTokens` stores server name, URL, client id, wrapped token response, and optional `expires_at` timestamp.[E: codex-rs/rmcp-client/src/oauth.rs:64]
- Store mode `Auto` loads from keyring with file fallback, `File` loads directly from fallback file, and `Keyring` requires keyring load success.[E: codex-rs/rmcp-client/src/oauth.rs:93][E: codex-rs/rmcp-client/src/oauth.rs:100][E: codex-rs/rmcp-client/src/oauth.rs:107]
- Save mode `Auto` writes keyring/secrets with file fallback; direct keyring save deletes fallback file on success; secrets keyring uses encrypted local secrets namespace `McpOAuth` and also deletes fallback file on success.[E: codex-rs/rmcp-client/src/oauth.rs:245][E: codex-rs/rmcp-client/src/oauth.rs:253][E: codex-rs/rmcp-client/src/oauth.rs:285][E: codex-rs/rmcp-client/src/oauth.rs:295][E: codex-rs/rmcp-client/src/oauth.rs:311][E: codex-rs/rmcp-client/src/oauth.rs:318][E: codex-rs/rmcp-client/src/oauth.rs:329][E: codex-rs/rmcp-client/src/oauth.rs:336]
- Runtime persistence compares latest credentials from the authorization manager with the last stored value, computes expiry for changed tokens, saves changed tokens, and deletes stored credentials if the manager no longer has any.[E: codex-rs/rmcp-client/src/oauth.rs:488][E: codex-rs/rmcp-client/src/oauth.rs:495][E: codex-rs/rmcp-client/src/oauth.rs:503][E: codex-rs/rmcp-client/src/oauth.rs:516][E: codex-rs/rmcp-client/src/oauth.rs:525]

## Runtime hooks

- Streamable HTTP pending transport loads stored tokens only when no configured bearer token, runtime auth provider, or Authorization header is present.[E: codex-rs/rmcp-client/src/rmcp_client.rs:776][E: codex-rs/rmcp-client/src/rmcp_client.rs:787][E: codex-rs/rmcp-client/src/rmcp_client.rs:796]
- Stored tokens create an OAuth transport plus `OAuthPersistor`; if OAuth metadata is unavailable but an access token exists, Codex falls back to bearer-token auth using the stored access token.[E: codex-rs/rmcp-client/src/rmcp_client.rs:811][E: codex-rs/rmcp-client/src/rmcp_client.rs:823][E: codex-rs/rmcp-client/src/rmcp_client.rs:829][E: codex-rs/rmcp-client/src/rmcp_client.rs:834][E: codex-rs/rmcp-client/src/rmcp_client.rs:843]
- RMCP operations call `refresh_oauth_if_needed` before tool/resource operations and persist tokens after successful operation returns; the post-operation persist path is after `await?`, so errors return before it.[E: codex-rs/rmcp-client/src/rmcp_client.rs:489][E: codex-rs/rmcp-client/src/rmcp_client.rs:494][E: codex-rs/rmcp-client/src/rmcp_client.rs:500][E: codex-rs/rmcp-client/src/rmcp_client.rs:501][E: codex-rs/rmcp-client/src/rmcp_client.rs:551][E: codex-rs/rmcp-client/src/rmcp_client.rs:556][E: codex-rs/rmcp-client/src/rmcp_client.rs:562][E: codex-rs/rmcp-client/src/rmcp_client.rs:563][E: codex-rs/rmcp-client/src/rmcp_client.rs:599][E: codex-rs/rmcp-client/src/rmcp_client.rs:606][E: codex-rs/rmcp-client/src/rmcp_client.rs:652][E: codex-rs/rmcp-client/src/rmcp_client.rs:653]

## Sources

- codex-rs/rmcp-client/src/oauth.rs
- codex-rs/rmcp-client/src/auth_status.rs
- codex-rs/rmcp-client/src/perform_oauth_login.rs
- codex-rs/rmcp-client/src/rmcp_client.rs
- codex-rs/codex-mcp/src/mcp/auth.rs
