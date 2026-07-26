---
id: subsys.mcp.oauth
title: MCP OAuth
kind: subsystem
tier: T2
source: [codex-rs/rmcp-client/src/oauth.rs, codex-rs/rmcp-client/src/oauth/resolved_store.rs, codex-rs/rmcp-client/src/oauth/refresh_transaction.rs, codex-rs/rmcp-client/src/oauth/store_lock.rs, codex-rs/rmcp-client/src/auth_status.rs, codex-rs/rmcp-client/src/perform_oauth_login.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/codex-mcp/src/mcp/auth.rs]
symbols: [StoredOAuthTokens, OAuthPersistor, ResolvedOAuthCredentialStore, resolve_oauth_tokens_from_store_policy, refresh_if_needed, OAuthStoreLock, save_oauth_tokens, delete_oauth_tokens, determine_streamable_http_auth_status, determine_streamable_http_auth_status_from_credentials, OauthLoginFlow, oauth_login_support, compute_auth_statuses]
related: [subsys.mcp.client, subsys.mcp.transports, subsys.config-auth.auth-flows, config.mcp-tools]
evidence: explicit
status: verified
updated: 61a44880a8
---

> MCP OAuth is the auth layer for streamable HTTP MCP servers: Codex classifies bearer/header/stored-token/discovery status, performs browser callback login, persists tokens to keyring/secrets/file depending on configuration, and refreshes/persists runtime OAuth credentials around RMCP operations.[E: codex-rs/rmcp-client/src/auth_status.rs:76][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:497][E: codex-rs/rmcp-client/src/oauth.rs:81][E: codex-rs/rmcp-client/src/oauth.rs:510]

## 能回答的问题

- streamable HTTP MCP server 什么时候是 BearerToken、OAuth、NotLoggedIn、Unsupported？
- `codex mcp login` 支持哪些 transport？
- OAuth scopes 的 explicit/configured/discovered/empty 优先级是什么？
- token 存在哪里，什么时候 fallback 到文件？
- runtime 何时 refresh 或 persist OAuth tokens？

## 职责边界

`rmcp-client` owns token persistence, auth status discovery, browser callback login, OAuth transport creation, and runtime refresh/persist hooks; `codex-mcp/src/mcp/auth.rs` maps configured servers into CLI-facing login support, scope resolution, and auth-status aggregation.[E: codex-rs/rmcp-client/src/oauth.rs:81][E: codex-rs/rmcp-client/src/auth_status.rs:76][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:497][E: codex-rs/rmcp-client/src/rmcp_client.rs:788][E: codex-rs/codex-mcp/src/mcp/auth.rs:60][E: codex-rs/codex-mcp/src/mcp/auth.rs:147][E: codex-rs/codex-mcp/src/mcp/auth.rs:186]

Tool approval, connector discoverability, and app policy are outside OAuth; those belong to tool/app policy layers.[I]

## 关键文件

- `codex-rs/rmcp-client/src/oauth.rs` plus `oauth/{resolved_store,refresh_transaction,store_lock}.rs`: token format/login cleanup, concrete-store pinning, cross-process store coordination, and serialized refresh transactions。[E: codex-rs/rmcp-client/src/oauth.rs:81][E: codex-rs/rmcp-client/src/oauth.rs:369][E: codex-rs/rmcp-client/src/oauth.rs:414][E: codex-rs/rmcp-client/src/oauth.rs:510][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:30]
- `codex-rs/rmcp-client/src/auth_status.rs`: streamable HTTP auth classification and OAuth discovery via well-known endpoints.[E: codex-rs/rmcp-client/src/auth_status.rs:76][E: codex-rs/rmcp-client/src/auth_status.rs:179][E: codex-rs/rmcp-client/src/auth_status.rs:188][E: codex-rs/rmcp-client/src/auth_status.rs:203][E: codex-rs/rmcp-client/src/auth_status.rs:255]
- `codex-rs/rmcp-client/src/perform_oauth_login.rs`: callback listener, redirect URI/callback id handling, auth URL launch, callback wait, token save.[E: codex-rs/rmcp-client/src/perform_oauth_login.rs:497][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:515][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:527][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:544][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:552][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:598][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:632]
- `codex-rs/codex-mcp/src/mcp/auth.rs`: login support gate, scope resolution, discovered-scope retry policy, auth-status aggregation.[E: codex-rs/codex-mcp/src/mcp/auth.rs:60][E: codex-rs/codex-mcp/src/mcp/auth.rs:147][E: codex-rs/codex-mcp/src/mcp/auth.rs:181][E: codex-rs/codex-mcp/src/mcp/auth.rs:186]

## Auth status

- If a streamable HTTP config uses `bearer_token_env_var`, status is `BearerToken` without probing OAuth.[E: codex-rs/rmcp-client/src/auth_status.rs:179]
- Static or env-derived default HTTP headers containing `Authorization` also classify as `BearerToken`.[E: codex-rs/rmcp-client/src/auth_status.rs:183][E: codex-rs/rmcp-client/src/auth_status.rs:184][E: codex-rs/rmcp-client/src/auth_status.rs:185]
- Stored usable OAuth tokens classify as `OAuth`; stored but unusable/refresh-needed-without-valid-refresh-token classify as `LoggedOut(Reauthentication)`, which maps to protocol `NotLoggedIn`; missing tokens fall through to discovery.[E: codex-rs/rmcp-client/src/auth_status.rs:59][E: codex-rs/rmcp-client/src/auth_status.rs:188][E: codex-rs/rmcp-client/src/auth_status.rs:192][E: codex-rs/rmcp-client/src/oauth.rs:110][E: codex-rs/rmcp-client/src/oauth.rs:158]
- Discovery returns `LoggedOut(Login)` when OAuth metadata is found, `Unsupported` when none is found, and debug-logs discovery errors before returning `Unsupported`; `LoggedOut` maps to protocol `NotLoggedIn`.[E: codex-rs/rmcp-client/src/auth_status.rs:59][E: codex-rs/rmcp-client/src/auth_status.rs:203][E: codex-rs/rmcp-client/src/auth_status.rs:209][E: codex-rs/rmcp-client/src/auth_status.rs:210][E: codex-rs/rmcp-client/src/auth_status.rs:211]

## Login support and scopes

- `oauth_login_support` supports only `StreamableHttp` transports and rejects configs that use bearer-token env vars.[E: codex-rs/codex-mcp/src/mcp/auth.rs:60][E: codex-rs/codex-mcp/src/mcp/auth.rs:107][E: codex-rs/codex-mcp/src/mcp/auth.rs:116]
- Scope resolution precedence is explicit scopes, configured scopes, non-empty discovered scopes, then empty scopes.[E: codex-rs/codex-mcp/src/mcp/auth.rs:147][E: codex-rs/codex-mcp/src/mcp/auth.rs:152][E: codex-rs/codex-mcp/src/mcp/auth.rs:159][E: codex-rs/codex-mcp/src/mcp/auth.rs:166][E: codex-rs/codex-mcp/src/mcp/auth.rs:175]
- If discovered scopes cause an `OAuthProviderError`, `should_retry_without_scopes` allows retrying without scopes only for the discovered-scope case.[E: codex-rs/codex-mcp/src/mcp/auth.rs:181]

## Token persistence

- `StoredOAuthTokens` stores server name, URL, client id, wrapped token response, and optional `expires_at` timestamp.[E: codex-rs/rmcp-client/src/oauth.rs:81]
- Store mode `Auto` resolves keyring-first with file fallback only at lifecycle start, while `File` and `Keyring` choose exact stores；the resolved source is then pinned for reread/refresh/save/delete, and a mid-lifecycle backend failure is surfaced instead of switching to a possibly stale token source。[E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:33][E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:106][E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:113][E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:157][E: codex-rs/rmcp-client/src/oauth/resolved_store.rs:163]
- Login-time keyring writes can clean up the fallback file, but exact-store runtime writes never mutate the other authority；aggregate File/Secrets read-modify-write operations hold a bounded cross-process lock。[E: codex-rs/rmcp-client/src/oauth.rs:295][E: codex-rs/rmcp-client/src/oauth.rs:369][E: codex-rs/rmcp-client/src/oauth.rs:377][E: codex-rs/rmcp-client/src/oauth/store_lock.rs:18]
- Refresh is an owned, serialized read-refresh-write transaction: after acquiring the credential lock it rereads the pinned authority, adopts a newer winner, enforces an independent 45-second provider bound, persists before exposing the rotated credential, and fails closed on persistence errors。[E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:30][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:53][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:98][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:103][E: codex-rs/rmcp-client/src/oauth/refresh_transaction.rs:228]

## Runtime hooks

- Streamable HTTP pending transport loads stored tokens only when no configured bearer token, runtime auth provider, or Authorization header is present；transport rebuilds reread only the lifecycle-pinned store instead of reevaluating `Auto`。[E: codex-rs/rmcp-client/src/rmcp_client.rs:819][E: codex-rs/rmcp-client/src/rmcp_client.rs:826][E: codex-rs/rmcp-client/src/rmcp_client.rs:837]
- Stored tokens create an OAuth transport plus `OAuthPersistor`; if OAuth metadata is unavailable but an access token exists, Codex falls back to bearer-token auth using the stored access token.[E: codex-rs/rmcp-client/src/rmcp_client.rs:878][E: codex-rs/rmcp-client/src/rmcp_client.rs:884][E: codex-rs/rmcp-client/src/rmcp_client.rs:889][E: codex-rs/rmcp-client/src/rmcp_client.rs:898]
- RMCP operations await `refresh_oauth_if_needed` before their active-time operation timeout begins；refresh failures now propagate instead of being warning-only, while successful operations still run the persistence hook afterward。[E: codex-rs/rmcp-client/src/rmcp_client.rs:496][E: codex-rs/rmcp-client/src/rmcp_client.rs:776][E: codex-rs/rmcp-client/src/rmcp_client.rs:781]

## Sources

- codex-rs/rmcp-client/src/oauth.rs
- codex-rs/rmcp-client/src/oauth/resolved_store.rs
- codex-rs/rmcp-client/src/oauth/refresh_transaction.rs
- codex-rs/rmcp-client/src/oauth/store_lock.rs
- codex-rs/rmcp-client/src/auth_status.rs
- codex-rs/rmcp-client/src/perform_oauth_login.rs
- codex-rs/rmcp-client/src/rmcp_client.rs
- codex-rs/codex-mcp/src/mcp/auth.rs
