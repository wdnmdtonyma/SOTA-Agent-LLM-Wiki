---
id: subsys.mcp.oauth
title: MCP OAuth
kind: subsystem
tier: T2
source: [codex-rs/rmcp-client/src/oauth.rs, codex-rs/rmcp-client/src/auth_status.rs, codex-rs/rmcp-client/src/perform_oauth_login.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/codex-mcp/src/mcp/auth.rs, codex-rs/core/src/mcp_tool_call.rs]
symbols: [StoredOAuthTokens, OAuthPersistor, load_oauth_tokens, save_oauth_tokens, delete_oauth_tokens, determine_streamable_http_auth_status, perform_oauth_login, oauth_login_support, compute_auth_statuses]
related: [subsys.mcp.client, subsys.mcp.transports, subsys.config-auth.auth-flows, config.mcp-tools]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> MCP OAuth 是 streamable HTTP MCP server 的认证层：Codex 先判断 bearer/header/stored OAuth/discovery 状态，login flow 通过本地 callback 获取 token，runtime 通过 `OAuthPersistor` 刷新并保存 token。[E: codex-rs/rmcp-client/src/auth_status.rs:38][E: codex-rs/rmcp-client/src/auth_status.rs:47][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:425][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:493][E: codex-rs/rmcp-client/src/oauth.rs:252][E: codex-rs/rmcp-client/src/oauth.rs:356]

## 能回答的问题

- `codex mcp login` 能支持哪些 MCP server？
- OAuth token 存在 keyring 还是 `.credentials.json`？
- auth status 如何区分 BearerToken、OAuth、NotLoggedIn、Unsupported？
- OAuth scopes 的 explicit/configured/discovered 优先级是什么？
- runtime call 前何时 refresh OAuth tokens？

## 职责边界

`rmcp-client` 负责 OAuth token persistence、discovery、login flow、runtime refresh；`codex-mcp/src/mcp/auth.rs` 负责把 configured MCP servers 转成 CLI-facing support/status/scopes 结果；tool call approval 和 MCP app policy 不属于 OAuth 层。[E: codex-rs/rmcp-client/src/oauth.rs:79][E: codex-rs/rmcp-client/src/auth_status.rs:34][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:425][E: codex-rs/rmcp-client/src/rmcp_client.rs:875][E: codex-rs/codex-mcp/src/mcp/auth.rs:44][E: codex-rs/codex-mcp/src/mcp/auth.rs:126][I]

## 关键 crate/文件

- `codex-rs/rmcp-client/src/oauth.rs`: token load/save/delete、keyring/file fallback、expiry refresh、store key 和 fallback file format。[E: codex-rs/rmcp-client/src/oauth.rs:79][E: codex-rs/rmcp-client/src/oauth.rs:155][E: codex-rs/rmcp-client/src/oauth.rs:216][E: codex-rs/rmcp-client/src/oauth.rs:517]
- `codex-rs/rmcp-client/src/auth_status.rs`: streamable HTTP OAuth discovery 和 auth status classification。[E: codex-rs/rmcp-client/src/auth_status.rs:34][E: codex-rs/rmcp-client/src/auth_status.rs:72][E: codex-rs/rmcp-client/src/auth_status.rs:85]
- `codex-rs/rmcp-client/src/perform_oauth_login.rs`: local callback listener、authorization URL、callback parse、token save。[E: codex-rs/rmcp-client/src/perform_oauth_login.rs:160][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:197][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:261][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:425][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:443][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:527]
- `codex-rs/codex-mcp/src/mcp/auth.rs`: CLI/server config 层面的 login support、scope resolution、auth status aggregation。[E: codex-rs/codex-mcp/src/mcp/auth.rs:44][E: codex-rs/codex-mcp/src/mcp/auth.rs:81][E: codex-rs/codex-mcp/src/mcp/auth.rs:126]

## 数据模型

- `StoredOAuthTokens` 存储 access token、refresh token、expires_in、expires_at；`refresh_expires_in_from_timestamp` 会把 absolute `expires_at` 转成 relative `expires_in`。[E: codex-rs/rmcp-client/src/oauth.rs:56][E: codex-rs/rmcp-client/src/oauth.rs:58][E: codex-rs/rmcp-client/src/oauth.rs:59][E: codex-rs/rmcp-client/src/oauth.rs:61][E: codex-rs/rmcp-client/src/oauth.rs:105]
- `OAuthPersistor` 保存 server name、server URL、authorization manager、storage mode 和上次 token snapshot；它在 runtime 操作后决定是否持久化新 token。[E: codex-rs/rmcp-client/src/oauth.rs:252][E: codex-rs/rmcp-client/src/oauth.rs:254][E: codex-rs/rmcp-client/src/oauth.rs:255][E: codex-rs/rmcp-client/src/oauth.rs:257][E: codex-rs/rmcp-client/src/oauth.rs:260][E: codex-rs/rmcp-client/src/oauth.rs:290]
- `StreamableHttpOAuthDiscovery` 只暴露 `scopes_supported`；auth status discovery 成功但没有 token 时会报告 NotLoggedIn。[E: codex-rs/rmcp-client/src/auth_status.rs:26][E: codex-rs/rmcp-client/src/auth_status.rs:51][E: codex-rs/rmcp-client/src/auth_status.rs:52]
- `McpOAuthScopesSource` 记录 scopes 来自 explicit、configured、discovered 或 empty；`ResolvedMcpOAuthScopes` 同时携带 scopes 与 source。[E: codex-rs/codex-mcp/src/mcp/auth.rs:30][E: codex-rs/codex-mcp/src/mcp/auth.rs:31][E: codex-rs/codex-mcp/src/mcp/auth.rs:35][E: codex-rs/codex-mcp/src/mcp/auth.rs:38][E: codex-rs/codex-mcp/src/mcp/auth.rs:41]

## 控制流

1. `oauth_login_support` 只支持 `McpServerTransportConfig::StreamableHttp`；stdio 返回 unsupported，配置 bearer token env var 的 HTTP server 也返回 unsupported。[E: codex-rs/codex-mcp/src/mcp/auth.rs:44][E: codex-rs/codex-mcp/src/mcp/auth.rs:51][E: codex-rs/codex-mcp/src/mcp/auth.rs:55]
2. Streamable HTTP login support 会调用 `discover_streamable_http_oauth`，成功时返回 login config，包含 URL、static/env headers 和 discovered scopes。[E: codex-rs/codex-mcp/src/mcp/auth.rs:59][E: codex-rs/codex-mcp/src/mcp/auth.rs:64][E: codex-rs/codex-mcp/src/mcp/auth.rs:66]
3. `resolve_oauth_scopes` 优先 explicit scopes，其次 server config scopes，其次非空 discovered scopes，最后返回 empty scopes。[E: codex-rs/codex-mcp/src/mcp/auth.rs:81][E: codex-rs/codex-mcp/src/mcp/auth.rs:87][E: codex-rs/codex-mcp/src/mcp/auth.rs:94][E: codex-rs/codex-mcp/src/mcp/auth.rs:101]
4. `determine_streamable_http_auth_status` 先检查 bearer env var，再检查 default Authorization header，再检查 stored OAuth tokens，最后尝试 OAuth discovery。[E: codex-rs/rmcp-client/src/auth_status.rs:34][E: codex-rs/rmcp-client/src/auth_status.rs:38][E: codex-rs/rmcp-client/src/auth_status.rs:42][E: codex-rs/rmcp-client/src/auth_status.rs:47][E: codex-rs/rmcp-client/src/auth_status.rs:51]
5. OAuth discovery 构造 reqwest client，按 RFC 8414 风格 discovery paths 逐个请求，必须拿到 `authorization_endpoint` 和 `token_endpoint` 才返回 `Some(StreamableHttpOAuthDiscovery { ... })`。[E: codex-rs/rmcp-client/src/auth_status.rs:89][E: codex-rs/rmcp-client/src/auth_status.rs:93][E: codex-rs/rmcp-client/src/auth_status.rs:97][E: codex-rs/rmcp-client/src/auth_status.rs:100][E: codex-rs/rmcp-client/src/auth_status.rs:122][E: codex-rs/rmcp-client/src/auth_status.rs:125][E: codex-rs/rmcp-client/src/auth_status.rs:132]
6. `perform_oauth_login` 创建 `OauthLoginFlow`，绑定本地 callback，启动 authorization，必要时打开浏览器或打印 URL，等待 callback 后保存 `StoredOAuthTokens`。[E: codex-rs/rmcp-client/src/perform_oauth_login.rs:425][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:433][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:443][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:473][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:493][E: codex-rs/rmcp-client/src/perform_oauth_login.rs:527]
7. `load_oauth_tokens` 在 Auto 模式先查 keyring，并在 keyring 不可用时回退 file；File 和 Keyring 模式分别只读对应 backend。[E: codex-rs/rmcp-client/src/oauth.rs:79][E: codex-rs/rmcp-client/src/oauth.rs:83][E: codex-rs/rmcp-client/src/oauth.rs:88][E: codex-rs/rmcp-client/src/oauth.rs:92]
8. `save_oauth_tokens` 在 Auto 模式先写 keyring，失败时写 fallback file；keyring 写成功后会删除 fallback file，减少旧 token 残留。[E: codex-rs/rmcp-client/src/oauth.rs:155][E: codex-rs/rmcp-client/src/oauth.rs:159][E: codex-rs/rmcp-client/src/oauth.rs:174][E: codex-rs/rmcp-client/src/oauth.rs:191]
9. runtime `RmcpClient` 的公开 MCP operation wrapper 会在 service operation 前调用 `refresh_oauth_if_needed`，operation 成功后调用 `persist_oauth_tokens`；`list_tools` 与 `call_tool` 都按这个模式执行。[E: codex-rs/rmcp-client/src/rmcp_client.rs:624][E: codex-rs/rmcp-client/src/rmcp_client.rs:631][E: codex-rs/rmcp-client/src/rmcp_client.rs:735][E: codex-rs/rmcp-client/src/rmcp_client.rs:789][E: codex-rs/rmcp-client/src/rmcp_client.rs:865][E: codex-rs/rmcp-client/src/rmcp_client.rs:875]
10. `OAuthPersistor::refresh_if_needed` 只在 stored token 接近 expiry 时调用 manager refresh，刷新后通过 `persist_if_needed` 保存新 credentials。[E: codex-rs/rmcp-client/src/oauth.rs:346][E: codex-rs/rmcp-client/src/oauth.rs:352][E: codex-rs/rmcp-client/src/oauth.rs:356][E: codex-rs/rmcp-client/src/oauth.rs:367]

## 设计动机与权衡

- fallback file 使用 `CODEX_HOME/.credentials.json`；store-key payload 的 `type` 为 `http`，store key 是 `{server_name}|{sha256_prefix}`，其中 hash 输入包含 URL 和空 headers JSON。[E: codex-rs/rmcp-client/src/oauth.rs:371][E: codex-rs/rmcp-client/src/oauth.rs:520][E: codex-rs/rmcp-client/src/oauth.rs:524][E: codex-rs/rmcp-client/src/oauth.rs:528][E: codex-rs/rmcp-client/src/oauth.rs:530]
- fallback file 写入时会创建 parent dir，并在 Unix 上设置 `0600` 权限；这是把 token file 当敏感凭据处理的实现。[E: codex-rs/rmcp-client/src/oauth.rs:556][E: codex-rs/rmcp-client/src/oauth.rs:561][E: codex-rs/rmcp-client/src/oauth.rs:567][E: codex-rs/rmcp-client/src/oauth.rs:575]
- `should_retry_without_scopes` 只在 scopes source 是 Discovered 且错误是 OAuth provider error 时返回 true，说明显式或配置 scopes 失败不会自动抹掉用户意图。[E: codex-rs/codex-mcp/src/mcp/auth.rs:115][E: codex-rs/codex-mcp/src/mcp/auth.rs:117]

## gotcha

- 配置了 `bearer_token_env_var` 的 streamable HTTP server 被 login support 视为 unsupported；auth status path 会先把 bearer env var 识别为 BearerToken。[E: codex-rs/codex-mcp/src/mcp/auth.rs:55][E: codex-rs/codex-mcp/src/mcp/auth.rs:56][E: codex-rs/rmcp-client/src/auth_status.rs:38][I]
- `normalize_scopes` 会 trim、去空、去重；因此 discovered scopes 的重复项不会保留为多条。[E: codex-rs/rmcp-client/src/auth_status.rs:146][E: codex-rs/rmcp-client/src/auth_status.rs:151][E: codex-rs/rmcp-client/src/auth_status.rs:157]
- `compute_auth_statuses` 对单个 server status 计算错误会降级成 Unsupported entry，而不是让整个 status list 失败。[E: codex-rs/codex-mcp/src/mcp/auth.rs:126][E: codex-rs/codex-mcp/src/mcp/auth.rs:137][E: codex-rs/codex-mcp/src/mcp/auth.rs:142]

## Sources

- codex-rs/rmcp-client/src/oauth.rs
- codex-rs/rmcp-client/src/auth_status.rs
- codex-rs/rmcp-client/src/perform_oauth_login.rs
- codex-rs/rmcp-client/src/rmcp_client.rs
- codex-rs/codex-mcp/src/mcp/auth.rs
- codex-rs/core/src/mcp_tool_call.rs

## 相关

- `subsys.mcp.client`
- `subsys.mcp.transports`
- `subsys.config-auth.auth-flows`
- `config.mcp-tools`
