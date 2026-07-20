---
id: subsys.config-auth.auth-flows
title: 认证流程
kind: subsystem
tier: T2
source: [codex-rs/login/src/auth/manager.rs, codex-rs/login/src/device_code_auth.rs, codex-rs/login/src/server.rs, codex-rs/login/src/lib.rs, docs/authentication.md]
symbols: [CodexAuth, AuthHeaders, ExternalAuth, AuthManager, set_external_auth, login_with_api_key, run_login_server, run_device_code_login, complete_device_code_login, enforce_login_restrictions]
related: [subsys.config-auth.credential-storage, config.auth-account, subsys.providers.provider-openai, subsys.cloud.cloud-config]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Codex 认证流程把 API key、ChatGPT OAuth/device code、external auth（包括整组 HTTP headers）、agent identity、personal access token 和 Bedrock API key 都统一为 `CodexAuth` snapshots；`AuthManager` 负责缓存、env/external auth precedence、forced login/workspace restrictions 和 token refresh。[E: codex-rs/login/src/auth/manager.rs:71][E: codex-rs/login/src/auth/manager.rs:75][E: codex-rs/login/src/auth/manager.rs:2023]

## 能回答的问题

- `CodexAuth` 现在有哪些 runtime auth variants？
- ChatGPT browser OAuth flow 怎样生成 authorize URL、校验 callback state、exchange code 并持久化 token？
- device code flow 怎样轮询 token 并复用 token exchange/persist 流程？
- API key/env/external auth 与 cached auth 的 precedence 如何体现？
- forced login method 和 workspace restriction 会怎样拒绝/登出不匹配 auth？
- ChatGPT token refresh 怎样避免并发刷新和覆盖新登录账号？

## 职责边界

auth-flows 节点覆盖登录、限制、refresh 和 runtime auth snapshot，不覆盖凭据落盘 backend 的细节；`subsys.config-auth.credential-storage` 解释 `auth.json`、keyring/direct-vs-secrets backend、ephemeral storage 和 secret store。[E: codex-rs/login/src/auth/manager.rs:1041][E: codex-rs/login/src/auth/manager.rs:1767]

`docs/authentication.md` 当前只是把用户导向 OpenAI developer docs，不定义本地 auth wire protocol；源码事实以 `codex-rs/login` 为准。[E: docs/authentication.md:1][E: docs/authentication.md:3]

## 数据模型

`CodexAuth` 当前 variants 是 `ApiKey`、`Chatgpt`、`ChatgptAuthTokens`、`Headers`、`AgentIdentity`、`PersonalAccessToken` 和 `BedrockApiKey`；`Headers(AuthHeaders)` 表示由宿主外部管理的一整组请求 headers，它不暴露 bearer token、account id/email/plan，也不能从 auth storage 恢复。[E: codex-rs/login/src/auth/manager.rs:71][E: codex-rs/login/src/auth/manager.rs:75][E: codex-rs/login/src/auth/manager.rs:314]

`AuthConfig` 聚合 codex_home、credential store mode、keyring backend、forced login method、ChatGPT base URL、forced workspace ids 和 auth route config；`enforce_login_restrictions` 会从 ChatGPT base URL 派生 agent identity AuthAPI base URL 后传入内部 restriction helper。[E: codex-rs/login/src/auth/manager.rs:1041][E: codex-rs/login/src/auth/manager.rs:1042][E: codex-rs/login/src/auth/manager.rs:1043][E: codex-rs/login/src/auth/manager.rs:1044][E: codex-rs/login/src/auth/manager.rs:1045][E: codex-rs/login/src/auth/manager.rs:1046][E: codex-rs/login/src/auth/manager.rs:1047][E: codex-rs/login/src/auth/manager.rs:1048][E: codex-rs/login/src/auth/manager.rs:1053][E: codex-rs/login/src/auth/manager.rs:1057]

`AuthManager` 是 runtime cache owner；配置了 `ExternalAuth` 时，`auth()` 每次先 reload，并由 external provider 的 `resolve()` 产出任意合法 `CodexAuth` snapshot；否则才读取 cached auth，并在需要时进入 proactive guarded refresh。[E: codex-rs/login/src/auth/manager.rs:218][E: codex-rs/login/src/auth/manager.rs:2023][E: codex-rs/login/src/auth/manager.rs:2024][E: codex-rs/login/src/auth/manager.rs:2195][E: codex-rs/login/src/auth/manager.rs:2196]

`set_external_auth` 在安装 provider 前先 resolve、校验并 commit snapshot；`clear_external_auth` 同时清空 cache。外部 `ChatgptAuthTokens` 还会镜像到 process-local ephemeral store，让 app/connectors 自建的 `AuthManager` 也能读取，而 `Headers` 等其他 external variants 只更新当前 cache。[E: codex-rs/login/src/auth/manager.rs:2242][E: codex-rs/login/src/auth/manager.rs:2250][E: codex-rs/login/src/auth/manager.rs:2253][E: codex-rs/login/src/auth/manager.rs:2557][E: codex-rs/login/src/auth/manager.rs:2575]

## Browser OAuth flow

1. `run_login_server` 生成 PKCE、state，绑定本地 callback server，并构造 `http://localhost:<port>/auth/callback` redirect URI 和 authorize URL。[E: codex-rs/login/src/server.rs:151][E: codex-rs/login/src/server.rs:152][E: codex-rs/login/src/server.rs:153][E: codex-rs/login/src/server.rs:155][E: codex-rs/login/src/server.rs:167][E: codex-rs/login/src/server.rs:168]
2. `build_authorize_url` 写入 response_type、client_id、redirect_uri、scope、code_challenge、state、originator；有 forced workspace ids 时追加 `allowed_workspace_id`。[E: codex-rs/login/src/server.rs:553][E: codex-rs/login/src/server.rs:561][E: codex-rs/login/src/server.rs:562][E: codex-rs/login/src/server.rs:566][E: codex-rs/login/src/server.rs:571][E: codex-rs/login/src/server.rs:577][E: codex-rs/login/src/server.rs:580]
3. Callback handler 校验 state，处理 OAuth error，要求 authorization code 存在，再调用 `exchange_code_for_tokens`。[E: codex-rs/login/src/server.rs:328][E: codex-rs/login/src/server.rs:332][E: codex-rs/login/src/server.rs:335][E: codex-rs/login/src/server.rs:344][E: codex-rs/login/src/server.rs:356][E: codex-rs/login/src/server.rs:372][E: codex-rs/login/src/server.rs:384]
4. Token exchange 对 `/oauth/token` 发 form body，包含 grant_type、code、redirect_uri、client_id、code_verifier；非 success status 会解析 error detail 并返回错误。[E: codex-rs/login/src/server.rs:749][E: codex-rs/login/src/server.rs:802][E: codex-rs/login/src/server.rs:809][E: codex-rs/login/src/server.rs:812][E: codex-rs/login/src/server.rs:813][E: codex-rs/login/src/server.rs:837][E: codex-rs/login/src/server.rs:839][E: codex-rs/login/src/server.rs:846]
5. OAuth 成功后会检查 workspace restriction，尝试用 id token obtain API key，并通过 `persist_tokens_async` 写入 configured auth store。[E: codex-rs/login/src/server.rs:394][E: codex-rs/login/src/server.rs:395][E: codex-rs/login/src/server.rs:408][E: codex-rs/login/src/server.rs:411][E: codex-rs/login/src/server.rs:416][E: codex-rs/login/src/server.rs:861]

## Device code flow

`run_device_code_login` 先 request device code，打印 verification URL 和 user code，再调用 `complete_device_code_login`。[E: codex-rs/login/src/device_code_auth.rs:234][E: codex-rs/login/src/device_code_auth.rs:235][E: codex-rs/login/src/device_code_auth.rs:236][E: codex-rs/login/src/device_code_auth.rs:237]

`request_device_code` 以 issuer 派生 `/api/accounts` base URL，请求 user code 后返回 verification URL、user code、device_auth_id 和 interval。[E: codex-rs/login/src/device_code_auth.rs:165][E: codex-rs/login/src/device_code_auth.rs:166][E: codex-rs/login/src/device_code_auth.rs:171][E: codex-rs/login/src/device_code_auth.rs:173]

`poll_for_token` 最多等待 15 分钟；HTTP 403/404 表示继续等待授权，其他 non-success status 立即失败。[E: codex-rs/login/src/device_code_auth.rs:100][E: codex-rs/login/src/device_code_auth.rs:107][E: codex-rs/login/src/device_code_auth.rs:108][E: codex-rs/login/src/device_code_auth.rs:127][E: codex-rs/login/src/device_code_auth.rs:131][E: codex-rs/login/src/device_code_auth.rs:142]

`complete_device_code_login` 拿到 authorization code 后复用 PKCE token exchange 与 token persist 流程，所以 device code 和 browser OAuth 在持久化后的 auth 形态相同。[E: codex-rs/login/src/device_code_auth.rs:181][E: codex-rs/login/src/device_code_auth.rs:189][E: codex-rs/login/src/device_code_auth.rs:198][E: codex-rs/login/src/device_code_auth.rs:229]

## API key、env 与 restrictions

`OPENAI_API_KEY` 和 `CODEX_API_KEY` 都有 non-empty env helper；当前 load path 的 env-precedence 分支使用 `CODEX_API_KEY` helper。[E: codex-rs/login/src/auth/manager.rs:836][E: codex-rs/login/src/auth/manager.rs:837][E: codex-rs/login/src/auth/manager.rs:841][E: codex-rs/login/src/auth/manager.rs:848][E: codex-rs/login/src/auth/manager.rs:1226][E: codex-rs/login/src/auth/manager.rs:1227]

`enforce_login_restrictions` 会先 `load_auth(..., enable_codex_api_key_env=true, forced_chatgpt_workspace_id=None, ...)`，再检查 forced login method；ChatGPT-required mode 允许 ChatGPT、ChatgptAuthTokens、Headers、AgentIdentity 和 PersonalAccessToken，API-required mode 允许 ApiKey 和 BedrockApiKey。[E: codex-rs/login/src/auth/manager.rs:1066][E: codex-rs/login/src/auth/manager.rs:1081][E: codex-rs/login/src/auth/manager.rs:1083][E: codex-rs/login/src/auth/manager.rs:1087][E: codex-rs/login/src/auth/manager.rs:1089]

Forced workspace restriction 使用 configured workspace ids 比对有 account id 的 auth；ApiKey、Headers 和 BedrockApiKey 没有 workspace metadata，会直接跳过这项检查；其余不匹配会走 `logout_with_message`。[E: codex-rs/login/src/auth/manager.rs:1115][E: codex-rs/login/src/auth/manager.rs:1117][E: codex-rs/login/src/auth/manager.rs:1120][E: codex-rs/login/src/auth/manager.rs:1123]

## Refresh

`refresh_token` 通过 refresh semaphore 串行化刷新；API key 与 personal access token auth 不刷新。刷新前会 guarded reload，如果 storage 中 account 已变则跳过，避免覆盖另一个实例的新登录状态。[E: codex-rs/login/src/auth/manager.rs:2366][E: codex-rs/login/src/auth/manager.rs:2366][E: codex-rs/login/src/auth/manager.rs:2367][E: codex-rs/login/src/auth/manager.rs:2373][E: codex-rs/login/src/auth/manager.rs:2376][E: codex-rs/login/src/auth/manager.rs:2384][E: codex-rs/login/src/auth/manager.rs:2388]

`refresh_token_from_authority_impl` 只要安装了 external provider，就调用其 `refresh(context)`，所以 Headers 也能做 unauthorized recovery；没有 external provider 时，只有 managed `Chatgpt` 走 refresh-and-persist，`ChatgptAuthTokens`、Headers 和其他 variants 都是 no-op。[E: codex-rs/login/src/auth/manager.rs:463][E: codex-rs/login/src/auth/manager.rs:2427][E: codex-rs/login/src/auth/manager.rs:2431][E: codex-rs/login/src/auth/manager.rs:2441][E: codex-rs/login/src/auth/manager.rs:2446]

`refresh_external_auth` 带上 unauthorized reason 与 previous account id，接受 provider 返回的任意 `CodexAuth`，随后重新校验 forced workspace 并 commit；刷新失败直接传播，不会退回旧 external snapshot。[E: codex-rs/login/src/auth/manager.rs:2530][E: codex-rs/login/src/auth/manager.rs:2539][E: codex-rs/login/src/auth/manager.rs:2543][E: codex-rs/login/src/auth/manager.rs:2548][E: codex-rs/login/src/auth/manager.rs:2552][E: codex-rs/login/src/auth/manager.rs:2579]

## Gotchas

- `Headers` 是 runtime-only external auth：它不能从 `auth.json` 加载，也没有可供普通 bearer-token client 使用的单一 token。[E: codex-rs/login/src/auth/manager.rs:314][E: codex-rs/login/src/auth/manager.rs:507]
- URL redaction 的 sensitive query keys 包含 access_token、api_key、client_secret、code、code_verifier、id_token、refresh_token、state、token 等；日志事实不要引用未 redacted URL。[E: codex-rs/login/src/server.rs:694][E: codex-rs/login/src/server.rs:695][E: codex-rs/login/src/server.rs:696][E: codex-rs/login/src/server.rs:699][E: codex-rs/login/src/server.rs:701][E: codex-rs/login/src/server.rs:703][E: codex-rs/login/src/server.rs:705]
- device code flow 的 user code prompt 明确提示 code 15 分钟过期且不要分享；不要把 user code 当作长期 credential。[E: codex-rs/login/src/device_code_auth.rs:160][E: codex-rs/login/src/device_code_auth.rs:154][E: codex-rs/login/src/device_code_auth.rs:155]

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
