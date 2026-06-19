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
updated: 5670360009
---

> Codex 认证流程把 API key、ChatGPT OAuth/device code、external ChatGPT tokens、agent identity、personal access token 和 Bedrock API key 都统一为 `CodexAuth` snapshots；`AuthManager` 负责缓存、env/external auth precedence、forced login/workspace restrictions 和 token refresh。[E: codex-rs/login/src/auth/manager.rs:57][E: codex-rs/login/src/auth/manager.rs:59][E: codex-rs/login/src/auth/manager.rs:790][E: codex-rs/login/src/auth/manager.rs:800][E: codex-rs/login/src/auth/manager.rs:1518][E: codex-rs/login/src/auth/manager.rs:1724]

## 能回答的问题

- `CodexAuth` 现在有哪些 runtime auth variants？
- ChatGPT browser OAuth flow 怎样生成 authorize URL、校验 callback state、exchange code 并持久化 token？
- device code flow 怎样轮询 token 并复用 token exchange/persist 流程？
- API key/env/external auth 与 cached auth 的 precedence 如何体现？
- forced login method 和 workspace restriction 会怎样拒绝/登出不匹配 auth？
- ChatGPT token refresh 怎样避免并发刷新和覆盖新登录账号？

## 职责边界

auth-flows 节点覆盖登录、限制、refresh 和 runtime auth snapshot，不覆盖凭据落盘 backend 的细节；`subsys.config-auth.credential-storage` 解释 `auth.json`、keyring/direct-vs-secrets backend、ephemeral storage 和 secret store。[E: codex-rs/login/src/auth/manager.rs:790][E: codex-rs/login/src/auth/manager.rs:1518]

`docs/authentication.md` 当前只是把用户导向 OpenAI developer docs，不定义本地 auth wire protocol；源码事实以 `codex-rs/login` 为准。[E: docs/authentication.md:1][E: docs/authentication.md:3]

## 数据模型

`CodexAuth` 当前 variants 是 `ApiKey`、`Chatgpt`、`ChatgptAuthTokens`、`AgentIdentity`、`PersonalAccessToken` 和 `BedrockApiKey`；`ApiKeyAuth` 只持有 API key 字符串，`ChatgptAuth` 持有 shared state 和 storage，`ChatgptAuthTokens` 只持有 shared state。[E: codex-rs/login/src/auth/manager.rs:59][E: codex-rs/login/src/auth/manager.rs:60][E: codex-rs/login/src/auth/manager.rs:61][E: codex-rs/login/src/auth/manager.rs:62][E: codex-rs/login/src/auth/manager.rs:63][E: codex-rs/login/src/auth/manager.rs:64][E: codex-rs/login/src/auth/manager.rs:65][E: codex-rs/login/src/auth/manager.rs:79][E: codex-rs/login/src/auth/manager.rs:84][E: codex-rs/login/src/auth/manager.rs:90]

`AuthConfig` 聚合 codex_home、credential store mode、keyring backend、forced login method、ChatGPT base URL、agent identity authapi base URL 和 forced workspace ids。[E: codex-rs/login/src/auth/manager.rs:790][E: codex-rs/login/src/auth/manager.rs:791][E: codex-rs/login/src/auth/manager.rs:792][E: codex-rs/login/src/auth/manager.rs:793][E: codex-rs/login/src/auth/manager.rs:794][E: codex-rs/login/src/auth/manager.rs:795][E: codex-rs/login/src/auth/manager.rs:796][E: codex-rs/login/src/auth/manager.rs:797]

`AuthManager` 是 runtime cache owner；`auth()` 先尝试 external API key auth，再读取 cached auth，并只在 cached auth 需要 proactive refresh 时进入 guarded refresh path。[E: codex-rs/login/src/auth/manager.rs:1518][E: codex-rs/login/src/auth/manager.rs:1720][E: codex-rs/login/src/auth/manager.rs:1724][E: codex-rs/login/src/auth/manager.rs:1725][E: codex-rs/login/src/auth/manager.rs:1729][E: codex-rs/login/src/auth/manager.rs:1730]

## Browser OAuth flow

1. `run_login_server` 生成 PKCE、state，绑定本地 callback server，并构造 `http://localhost:<port>/auth/callback` redirect URI 和 authorize URL。[E: codex-rs/login/src/server.rs:141][E: codex-rs/login/src/server.rs:142][E: codex-rs/login/src/server.rs:143][E: codex-rs/login/src/server.rs:145][E: codex-rs/login/src/server.rs:157][E: codex-rs/login/src/server.rs:158]
2. `build_authorize_url` 写入 response_type、client_id、redirect_uri、scope、code_challenge、state、originator；有 forced workspace ids 时追加 `allowed_workspace_id`。[E: codex-rs/login/src/server.rs:485][E: codex-rs/login/src/server.rs:493][E: codex-rs/login/src/server.rs:494][E: codex-rs/login/src/server.rs:498][E: codex-rs/login/src/server.rs:503][E: codex-rs/login/src/server.rs:509][E: codex-rs/login/src/server.rs:512]
3. Callback handler 校验 state，处理 OAuth error，要求 authorization code 存在，再调用 `exchange_code_for_tokens`。[E: codex-rs/login/src/server.rs:283][E: codex-rs/login/src/server.rs:287][E: codex-rs/login/src/server.rs:290][E: codex-rs/login/src/server.rs:299][E: codex-rs/login/src/server.rs:311][E: codex-rs/login/src/server.rs:327][E: codex-rs/login/src/server.rs:339]
4. Token exchange 对 `/oauth/token` 发 form body，包含 grant_type、code、redirect_uri、client_id、code_verifier；非 success status 会解析 error detail 并返回错误。[E: codex-rs/login/src/server.rs:716][E: codex-rs/login/src/server.rs:731][E: codex-rs/login/src/server.rs:738][E: codex-rs/login/src/server.rs:741][E: codex-rs/login/src/server.rs:766][E: codex-rs/login/src/server.rs:780]
5. OAuth 成功后会检查 workspace restriction，尝试用 id token obtain API key，并通过 `persist_tokens_async` 写入 configured auth store。[E: codex-rs/login/src/server.rs:342][E: codex-rs/login/src/server.rs:343][E: codex-rs/login/src/server.rs:356][E: codex-rs/login/src/server.rs:359][E: codex-rs/login/src/server.rs:790]

## Device code flow

`run_device_code_login` 先 request device code，打印 verification URL 和 user code，再调用 `complete_device_code_login`。[E: codex-rs/login/src/device_code_auth.rs:225][E: codex-rs/login/src/device_code_auth.rs:226][E: codex-rs/login/src/device_code_auth.rs:227][E: codex-rs/login/src/device_code_auth.rs:228]

`request_device_code` 以 issuer 派生 `/api/accounts` base URL，请求 user code 后返回 verification URL、user code、device_auth_id 和 interval。[E: codex-rs/login/src/device_code_auth.rs:159][E: codex-rs/login/src/device_code_auth.rs:160][E: codex-rs/login/src/device_code_auth.rs:162][E: codex-rs/login/src/device_code_auth.rs:163][E: codex-rs/login/src/device_code_auth.rs:165]

`poll_for_token` 最多等待 15 分钟；HTTP 403/404 表示继续等待授权，其他 non-success status 立即失败。[E: codex-rs/login/src/device_code_auth.rs:99][E: codex-rs/login/src/device_code_auth.rs:106][E: codex-rs/login/src/device_code_auth.rs:107][E: codex-rs/login/src/device_code_auth.rs:126][E: codex-rs/login/src/device_code_auth.rs:130][E: codex-rs/login/src/device_code_auth.rs:141]

`complete_device_code_login` 拿到 authorization code 后复用 PKCE token exchange 与 token persist 流程，所以 device code 和 browser OAuth 在持久化后的 auth 形态相同。[E: codex-rs/login/src/device_code_auth.rs:173][E: codex-rs/login/src/device_code_auth.rs:181][E: codex-rs/login/src/device_code_auth.rs:190][E: codex-rs/login/src/device_code_auth.rs:220]

## API key、env 与 restrictions

`OPENAI_API_KEY` 和 `CODEX_API_KEY` 都有 non-empty env helper；当前 load path 的 env-precedence 分支使用 `CODEX_API_KEY` helper。[E: codex-rs/login/src/auth/manager.rs:559][E: codex-rs/login/src/auth/manager.rs:560][E: codex-rs/login/src/auth/manager.rs:564][E: codex-rs/login/src/auth/manager.rs:571][E: codex-rs/login/src/auth/manager.rs:944]

`enforce_login_restrictions` 会先 `load_auth(..., enable_codex_api_key_env=true, forced_chatgpt_workspace_id=None, ...)`，再检查 forced login method；ChatGPT-required mode 允许 ChatGPT、ChatgptAuthTokens、AgentIdentity 和 PersonalAccessToken，API-required mode 允许 ApiKey 和 BedrockApiKey。[E: codex-rs/login/src/auth/manager.rs:800][E: codex-rs/login/src/auth/manager.rs:801][E: codex-rs/login/src/auth/manager.rs:803][E: codex-rs/login/src/auth/manager.rs:815][E: codex-rs/login/src/auth/manager.rs:817][E: codex-rs/login/src/auth/manager.rs:819][E: codex-rs/login/src/auth/manager.rs:822]

Forced workspace restriction 使用 configured workspace ids 比对当前 auth 的 account/workspace；如果没有匹配到 expected workspace，`enforce_login_restrictions` 会构造 workspace mismatch message 并走 `logout_with_message`。[E: codex-rs/login/src/auth/manager.rs:847][E: codex-rs/login/src/auth/manager.rs:853][E: codex-rs/login/src/auth/manager.rs:873][E: codex-rs/login/src/auth/manager.rs:874][E: codex-rs/login/src/auth/manager.rs:878][E: codex-rs/login/src/auth/manager.rs:879][E: codex-rs/login/src/auth/manager.rs:887]

## Refresh

`refresh_token` 通过 refresh semaphore 串行化刷新；API key 与 personal access token auth 不刷新。刷新前会 guarded reload，如果 storage 中 account 已变则跳过，避免覆盖另一个实例的新登录状态。[E: codex-rs/login/src/auth/manager.rs:1985][E: codex-rs/login/src/auth/manager.rs:1990][E: codex-rs/login/src/auth/manager.rs:1991][E: codex-rs/login/src/auth/manager.rs:1997][E: codex-rs/login/src/auth/manager.rs:2000][E: codex-rs/login/src/auth/manager.rs:2008][E: codex-rs/login/src/auth/manager.rs:2012]

`refresh_token_from_authority_impl` 对 `ChatgptAuthTokens` 调 `refresh_external_auth`，对 `Chatgpt` 调 refresh-and-persist path；ApiKey、AgentIdentity、PersonalAccessToken 和 BedrockApiKey 不刷新。[E: codex-rs/login/src/auth/manager.rs:2040][E: codex-rs/login/src/auth/manager.rs:2052][E: codex-rs/login/src/auth/manager.rs:2053][E: codex-rs/login/src/auth/manager.rs:2057][E: codex-rs/login/src/auth/manager.rs:2066]

`refresh_external_auth` 要求 external auth 已配置，refresh 后如果返回 API key auth 就直接成功；若返回 ChatGPT metadata，会套 forced workspace restriction。[E: codex-rs/login/src/auth/manager.rs:2152][E: codex-rs/login/src/auth/manager.rs:2156][E: codex-rs/login/src/auth/manager.rs:2171][E: codex-rs/login/src/auth/manager.rs:2175][E: codex-rs/login/src/auth/manager.rs:2178][E: codex-rs/login/src/auth/manager.rs:2183]

## Gotchas

- `CodexAuth` 不再只有旧版四种形态；PersonalAccessToken 和 BedrockApiKey 都是 current runtime variants。[E: codex-rs/login/src/auth/manager.rs:63][E: codex-rs/login/src/auth/manager.rs:64][E: codex-rs/login/src/auth/manager.rs:65]
- URL redaction 的 sensitive query keys 包含 access_token、api_key、client_secret、code、code_verifier、id_token、refresh_token、state、token 等；日志事实不要引用未 redacted URL。[E: codex-rs/login/src/server.rs:626][E: codex-rs/login/src/server.rs:627][E: codex-rs/login/src/server.rs:628][E: codex-rs/login/src/server.rs:631][E: codex-rs/login/src/server.rs:633][E: codex-rs/login/src/server.rs:635][E: codex-rs/login/src/server.rs:637]
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
