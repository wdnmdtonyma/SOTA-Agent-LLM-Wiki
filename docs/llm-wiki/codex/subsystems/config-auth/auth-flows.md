---
id: subsys.config-auth.auth-flows
title: 认证流程
kind: subsystem
tier: T2
source: [codex-rs/login/src/auth/manager.rs, codex-rs/login/src/device_code_auth.rs, codex-rs/login/src/server.rs, codex-rs/login/src/lib.rs, docs/authentication.md]
symbols: [CodexAuth, AuthManager, login_with_api_key, run_login_server, run_device_code_login, complete_device_code_login, enforce_login_restrictions]
related: [subsys.config-auth.credential-storage, config.auth-account, subsys.providers.provider-openai, subsys.cloud.cloud-config]
evidence: explicit
status: verified
updated: db887d03e1
---

> Codex 认证流程把 API key、ChatGPT OAuth/device code、external ChatGPT tokens、agent identity、personal access token 和 Bedrock API key 都统一为 `CodexAuth` snapshots；`AuthManager` 负责缓存、env/external auth precedence、forced login/workspace restrictions 和 token refresh。[E: codex-rs/login/src/auth/manager.rs:70][E: codex-rs/login/src/auth/manager.rs:70][E: codex-rs/login/src/auth/manager.rs:1043][E: codex-rs/login/src/auth/manager.rs:1054][E: codex-rs/login/src/auth/manager.rs:1792][E: codex-rs/login/src/auth/manager.rs:2045]

## 能回答的问题

- `CodexAuth` 现在有哪些 runtime auth variants？
- ChatGPT browser OAuth flow 怎样生成 authorize URL、校验 callback state、exchange code 并持久化 token？
- device code flow 怎样轮询 token 并复用 token exchange/persist 流程？
- API key/env/external auth 与 cached auth 的 precedence 如何体现？
- forced login method 和 workspace restriction 会怎样拒绝/登出不匹配 auth？
- ChatGPT token refresh 怎样避免并发刷新和覆盖新登录账号？

## 职责边界

auth-flows 节点覆盖登录、限制、refresh 和 runtime auth snapshot，不覆盖凭据落盘 backend 的细节；`subsys.config-auth.credential-storage` 解释 `auth.json`、keyring/direct-vs-secrets backend、ephemeral storage 和 secret store。[E: codex-rs/login/src/auth/manager.rs:1043][E: codex-rs/login/src/auth/manager.rs:1792]

`docs/authentication.md` 当前只是把用户导向 OpenAI developer docs，不定义本地 auth wire protocol；源码事实以 `codex-rs/login` 为准。[E: docs/authentication.md:1][E: docs/authentication.md:3]

## 数据模型

`CodexAuth` 当前 variants 是 `ApiKey`、`Chatgpt`、`ChatgptAuthTokens`、`AgentIdentity`、`PersonalAccessToken` 和 `BedrockApiKey`；`ApiKeyAuth` 只持有 API key 字符串，`ChatgptAuth` 持有 shared state 和 storage，`ChatgptAuthTokens` 只持有 shared state。[E: codex-rs/login/src/auth/manager.rs:70][E: codex-rs/login/src/auth/manager.rs:71][E: codex-rs/login/src/auth/manager.rs:72][E: codex-rs/login/src/auth/manager.rs:73][E: codex-rs/login/src/auth/manager.rs:74][E: codex-rs/login/src/auth/manager.rs:75][E: codex-rs/login/src/auth/manager.rs:76][E: codex-rs/login/src/auth/manager.rs:156][E: codex-rs/login/src/auth/manager.rs:161][E: codex-rs/login/src/auth/manager.rs:167]

`AuthConfig` 聚合 codex_home、credential store mode、keyring backend、forced login method、ChatGPT base URL、forced workspace ids 和 auth route config；`enforce_login_restrictions` 会从 ChatGPT base URL 派生 agent identity AuthAPI base URL 后传入内部 restriction helper。[E: codex-rs/login/src/auth/manager.rs:1043][E: codex-rs/login/src/auth/manager.rs:1044][E: codex-rs/login/src/auth/manager.rs:1045][E: codex-rs/login/src/auth/manager.rs:1046][E: codex-rs/login/src/auth/manager.rs:1047][E: codex-rs/login/src/auth/manager.rs:1048][E: codex-rs/login/src/auth/manager.rs:1049][E: codex-rs/login/src/auth/manager.rs:1050][E: codex-rs/login/src/auth/manager.rs:1055][E: codex-rs/login/src/auth/manager.rs:1059]

`AuthManager` 是 runtime cache owner；`auth()` 先尝试 external API key auth，再读取 cached auth，并只在 cached auth 需要 proactive refresh 时进入 guarded refresh path。[E: codex-rs/login/src/auth/manager.rs:1792][E: codex-rs/login/src/auth/manager.rs:2045][E: codex-rs/login/src/auth/manager.rs:2045][E: codex-rs/login/src/auth/manager.rs:2046][E: codex-rs/login/src/auth/manager.rs:2050][E: codex-rs/login/src/auth/manager.rs:2051]

## Browser OAuth flow

1. `run_login_server` 生成 PKCE、state，绑定本地 callback server，并构造 `http://localhost:<port>/auth/callback` redirect URI 和 authorize URL。[E: codex-rs/login/src/server.rs:145][E: codex-rs/login/src/server.rs:146][E: codex-rs/login/src/server.rs:147][E: codex-rs/login/src/server.rs:149][E: codex-rs/login/src/server.rs:161][E: codex-rs/login/src/server.rs:162]
2. `build_authorize_url` 写入 response_type、client_id、redirect_uri、scope、code_challenge、state、originator；有 forced workspace ids 时追加 `allowed_workspace_id`。[E: codex-rs/login/src/server.rs:501][E: codex-rs/login/src/server.rs:509][E: codex-rs/login/src/server.rs:510][E: codex-rs/login/src/server.rs:514][E: codex-rs/login/src/server.rs:519][E: codex-rs/login/src/server.rs:525][E: codex-rs/login/src/server.rs:528]
3. Callback handler 校验 state，处理 OAuth error，要求 authorization code 存在，再调用 `exchange_code_for_tokens`。[E: codex-rs/login/src/server.rs:287][E: codex-rs/login/src/server.rs:291][E: codex-rs/login/src/server.rs:294][E: codex-rs/login/src/server.rs:303][E: codex-rs/login/src/server.rs:315][E: codex-rs/login/src/server.rs:331][E: codex-rs/login/src/server.rs:343]
4. Token exchange 对 `/oauth/token` 发 form body，包含 grant_type、code、redirect_uri、client_id、code_verifier；非 success status 会解析 error detail 并返回错误。[E: codex-rs/login/src/server.rs:749][E: codex-rs/login/src/server.rs:750][E: codex-rs/login/src/server.rs:757][E: codex-rs/login/src/server.rs:760][E: codex-rs/login/src/server.rs:761][E: codex-rs/login/src/server.rs:785][E: codex-rs/login/src/server.rs:787][E: codex-rs/login/src/server.rs:794]
5. OAuth 成功后会检查 workspace restriction，尝试用 id token obtain API key，并通过 `persist_tokens_async` 写入 configured auth store。[E: codex-rs/login/src/server.rs:353][E: codex-rs/login/src/server.rs:354][E: codex-rs/login/src/server.rs:367][E: codex-rs/login/src/server.rs:370][E: codex-rs/login/src/server.rs:375][E: codex-rs/login/src/server.rs:809]

## Device code flow

`run_device_code_login` 先 request device code，打印 verification URL 和 user code，再调用 `complete_device_code_login`。[E: codex-rs/login/src/device_code_auth.rs:228][E: codex-rs/login/src/device_code_auth.rs:229][E: codex-rs/login/src/device_code_auth.rs:230][E: codex-rs/login/src/device_code_auth.rs:231]

`request_device_code` 以 issuer 派生 `/api/accounts` base URL，请求 user code 后返回 verification URL、user code、device_auth_id 和 interval。[E: codex-rs/login/src/device_code_auth.rs:159][E: codex-rs/login/src/device_code_auth.rs:160][E: codex-rs/login/src/device_code_auth.rs:163][E: codex-rs/login/src/device_code_auth.rs:165][E: codex-rs/login/src/device_code_auth.rs:167]

`poll_for_token` 最多等待 15 分钟；HTTP 403/404 表示继续等待授权，其他 non-success status 立即失败。[E: codex-rs/login/src/device_code_auth.rs:99][E: codex-rs/login/src/device_code_auth.rs:106][E: codex-rs/login/src/device_code_auth.rs:107][E: codex-rs/login/src/device_code_auth.rs:126][E: codex-rs/login/src/device_code_auth.rs:130][E: codex-rs/login/src/device_code_auth.rs:141]

`complete_device_code_login` 拿到 authorization code 后复用 PKCE token exchange 与 token persist 流程，所以 device code 和 browser OAuth 在持久化后的 auth 形态相同。[E: codex-rs/login/src/device_code_auth.rs:175][E: codex-rs/login/src/device_code_auth.rs:183][E: codex-rs/login/src/device_code_auth.rs:192][E: codex-rs/login/src/device_code_auth.rs:223]

## API key、env 与 restrictions

`OPENAI_API_KEY` 和 `CODEX_API_KEY` 都有 non-empty env helper；当前 load path 的 env-precedence 分支使用 `CODEX_API_KEY` helper。[E: codex-rs/login/src/auth/manager.rs:838][E: codex-rs/login/src/auth/manager.rs:839][E: codex-rs/login/src/auth/manager.rs:843][E: codex-rs/login/src/auth/manager.rs:850][E: codex-rs/login/src/auth/manager.rs:1224][E: codex-rs/login/src/auth/manager.rs:1225]

`enforce_login_restrictions` 会先 `load_auth(..., enable_codex_api_key_env=true, forced_chatgpt_workspace_id=None, ...)`，再检查 forced login method；ChatGPT-required mode 允许 ChatGPT、ChatgptAuthTokens、AgentIdentity 和 PersonalAccessToken，API-required mode 允许 ApiKey 和 BedrockApiKey。[E: codex-rs/login/src/auth/manager.rs:1054][E: codex-rs/login/src/auth/manager.rs:1068][E: codex-rs/login/src/auth/manager.rs:1071][E: codex-rs/login/src/auth/manager.rs:1083][E: codex-rs/login/src/auth/manager.rs:1085][E: codex-rs/login/src/auth/manager.rs:1087][E: codex-rs/login/src/auth/manager.rs:1090]

Forced workspace restriction 使用 configured workspace ids 比对当前 auth 的 account/workspace；如果没有匹配到 expected workspace，`enforce_login_restrictions` 会构造 workspace mismatch message 并走 `logout_with_message`。[E: codex-rs/login/src/auth/manager.rs:1115][E: codex-rs/login/src/auth/manager.rs:1121][E: codex-rs/login/src/auth/manager.rs:1141][E: codex-rs/login/src/auth/manager.rs:1142][E: codex-rs/login/src/auth/manager.rs:1146][E: codex-rs/login/src/auth/manager.rs:1147][E: codex-rs/login/src/auth/manager.rs:1155]

## Refresh

`refresh_token` 通过 refresh semaphore 串行化刷新；API key 与 personal access token auth 不刷新。刷新前会 guarded reload，如果 storage 中 account 已变则跳过，避免覆盖另一个实例的新登录状态。[E: codex-rs/login/src/auth/manager.rs:2378][E: codex-rs/login/src/auth/manager.rs:2378][E: codex-rs/login/src/auth/manager.rs:2379][E: codex-rs/login/src/auth/manager.rs:2385][E: codex-rs/login/src/auth/manager.rs:2388][E: codex-rs/login/src/auth/manager.rs:2396][E: codex-rs/login/src/auth/manager.rs:2400]

`refresh_token_from_authority_impl` 对 `ChatgptAuthTokens` 调 `refresh_external_auth`，对 `Chatgpt` 调 refresh-and-persist path；ApiKey、AgentIdentity、PersonalAccessToken 和 BedrockApiKey 不刷新。[E: codex-rs/login/src/auth/manager.rs:2428][E: codex-rs/login/src/auth/manager.rs:2440][E: codex-rs/login/src/auth/manager.rs:2441][E: codex-rs/login/src/auth/manager.rs:2445][E: codex-rs/login/src/auth/manager.rs:2454]

`refresh_external_auth` 要求 external auth 已配置，refresh 后如果返回 API key auth 就直接成功；若返回 ChatGPT metadata，会套 forced workspace restriction。[E: codex-rs/login/src/auth/manager.rs:2544][E: codex-rs/login/src/auth/manager.rs:2548][E: codex-rs/login/src/auth/manager.rs:2563][E: codex-rs/login/src/auth/manager.rs:2567][E: codex-rs/login/src/auth/manager.rs:2570][E: codex-rs/login/src/auth/manager.rs:2575]

## Gotchas

- `CodexAuth` 不再只有旧版四种形态；PersonalAccessToken 和 BedrockApiKey 都是 current runtime variants。[E: codex-rs/login/src/auth/manager.rs:74][E: codex-rs/login/src/auth/manager.rs:75][E: codex-rs/login/src/auth/manager.rs:76]
- URL redaction 的 sensitive query keys 包含 access_token、api_key、client_secret、code、code_verifier、id_token、refresh_token、state、token 等；日志事实不要引用未 redacted URL。[E: codex-rs/login/src/server.rs:642][E: codex-rs/login/src/server.rs:643][E: codex-rs/login/src/server.rs:644][E: codex-rs/login/src/server.rs:647][E: codex-rs/login/src/server.rs:649][E: codex-rs/login/src/server.rs:651][E: codex-rs/login/src/server.rs:653]
- device code flow 的 user code prompt 明确提示 code 15 分钟过期且不要分享；不要把 user code 当作长期 credential。[E: codex-rs/login/src/device_code_auth.rs:148][E: codex-rs/login/src/device_code_auth.rs:153][E: codex-rs/login/src/device_code_auth.rs:155]

## Sources

- `codex-rs/login/src/auth/manager.rs`
- `codex-rs/login/src/device_code_auth.rs`
- `codex-rs/login/src/server.rs`
- `codex-rs/login/src/lib.rs`
- `docs/authentication.md`

## 相关

- `subsys.config-auth.credential-storage`: auth store backend 与 `auth.json` schema。
- `config.auth-account`: 用户可见 auth config keys。
- `subsys.cloud.cloud-config`: managed requirements 与 forced login/workspace policy 来源。
