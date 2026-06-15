---
id: subsys.config-auth.auth-flows
title: 认证流程
kind: subsystem
tier: T2
source: [codex-rs/login/src/auth/manager.rs, codex-rs/login/src/device_code_auth.rs, codex-rs/login/src/server.rs, codex-rs/login/src/lib.rs, docs/authentication.md]
symbols: [CodexAuth, AuthManager, login_with_api_key, run_login_server, run_device_code_login, complete_device_code_login, enforce_login_restrictions]
related: [subsys.config-auth.credential-storage, config.auth-account, subsys.providers.provider-openai, subsys.cloud.cloud-requirements]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex 认证流程支持三条主路径：ChatGPT OAuth browser callback、ChatGPT device code、API key；三者最终都被 `CodexAuth`/`AuthManager` 统一成 runtime auth snapshot，并受 forced login method 与 workspace restrictions 约束。[E: codex-rs/login/src/auth/manager.rs:46][E: codex-rs/login/src/server.rs:132][E: codex-rs/login/src/device_code_auth.rs:224][E: codex-rs/login/src/auth/manager.rs:511]

## 能回答的问题

- ChatGPT OAuth browser flow 怎样生成 authorize URL、校验 state、exchange code 并保存 token？
- device code flow 怎样请求 user code、轮询 token、再复用 token exchange/persist 逻辑？
- API key login 写入 `auth.json` 的字段是什么？
- `AuthManager::auth()` 怎样处理外部 API key、cached auth 和 ChatGPT token refresh？
- forced login method 与 forced ChatGPT workspace id 怎样限制已登录账号？

## 职责边界

auth-flows 节点覆盖登录/刷新/限制的控制流，不覆盖凭据落盘 backend 的细节；`subsys.config-auth.credential-storage` 解释 `auth.json`、keyring、ephemeral storage、secret store 和 device key storage。`CodexAuth` 是 runtime auth enum，包含 `ApiKey`、`Chatgpt`、`ChatgptAuthTokens` 和 `AgentIdentity` 四种形态。[E: codex-rs/login/src/auth/manager.rs:46][E: codex-rs/login/src/auth/manager.rs:49][E: codex-rs/login/src/auth/manager.rs:51][E: codex-rs/login/src/auth/manager.rs:52]

`docs/authentication.md` 当前只把用户导向 OpenAI developer docs，而不是定义本地 auth wire protocol。[E: docs/authentication.md:1][E: docs/authentication.md:3] 因此本节点的行为事实以 `codex-rs/login` 源码为准。

## 数据模型

`ApiKeyAuth` 保存 `api_key`；`ChatgptAuth` 保存 shared `ChatgptAuthState` 与 auth storage；`ChatgptAuthTokens` 保存同一个 state 形态，`login_with_chatgpt_auth_tokens` 会把外部 token 保存到 ephemeral store。[E: codex-rs/login/src/auth/manager.rs:61][E: codex-rs/login/src/auth/manager.rs:66][E: codex-rs/login/src/auth/manager.rs:72][E: codex-rs/login/src/auth/manager.rs:77][E: codex-rs/login/src/auth/manager.rs:527][E: codex-rs/login/src/auth/manager.rs:539][E: codex-rs/login/src/auth/manager.rs:542] `AuthConfig` 聚合 `codex_home`、`auth_credentials_store_mode`、`forced_login_method` 和 `forced_chatgpt_workspace_id`。[E: codex-rs/login/src/auth/manager.rs:569][E: codex-rs/login/src/auth/manager.rs:571][E: codex-rs/login/src/auth/manager.rs:574]

`AuthManager` 的源码注释把它定义为 auth.json-derived authentication data 的 single source of truth，并说明它加载一次后向程序其他部分发放 cloned `CodexAuth` snapshot。[E: codex-rs/login/src/auth/manager.rs:1179][E: codex-rs/login/src/auth/manager.rs:1181] `AuthManager` 字段包含 codex_home、cached inner auth、是否启用 API key env、credential store mode、workspace restriction、ChatGPT base URL、refresh semaphore 和 external auth provider。[E: codex-rs/login/src/auth/manager.rs:1187][E: codex-rs/login/src/auth/manager.rs:1195]

## ChatGPT OAuth browser flow

1. `run_login_server` 创建 PKCE verifier/challenge 与 CSRF state，绑定本地 callback listener，构造 authorize URL，然后尝试打开浏览器。[E: codex-rs/login/src/server.rs:132][E: codex-rs/login/src/server.rs:141][E: codex-rs/login/src/server.rs:148][E: codex-rs/login/src/server.rs:160]
2. `build_authorize_url` 写入 response_type、client_id、redirect_uri、scope、code_challenge、state，并附带 originator 信息。[E: codex-rs/login/src/server.rs:468][E: codex-rs/login/src/server.rs:477][E: codex-rs/login/src/server.rs:492]
3. callback handler 校验 `state`，处理 OAuth error，再用 auth code 调 `exchange_code_for_tokens`。[E: codex-rs/login/src/server.rs:275][E: codex-rs/login/src/server.rs:303][E: codex-rs/login/src/server.rs:331]
4. token exchange 使用 POST form 发送 grant_type、code、redirect_uri、client_id、code_verifier，并解析 JSON response。[E: codex-rs/login/src/server.rs:684][E: codex-rs/login/src/server.rs:697][E: codex-rs/login/src/server.rs:746]
5. server flow 会检查 workspace restriction，并通过 `persist_tokens_async` 保存 tokens；如果 authorization server 同时返回 API key，persist 逻辑也能保存该 key。[E: codex-rs/login/src/server.rs:335][E: codex-rs/login/src/server.rs:347][E: codex-rs/login/src/server.rs:755]

## ChatGPT device code flow

1. `run_device_code_login` 先用 `ServerOptions` 请求 `DeviceCode`，打印 verification URL/user code，再把 `ServerOptions` 和 `DeviceCode` 交给 `complete_device_code_login`。[E: codex-rs/login/src/device_code_auth.rs:224][E: codex-rs/login/src/device_code_auth.rs:225][E: codex-rs/login/src/device_code_auth.rs:227]
2. `request_device_code` 请求 backend device code endpoint，request body 只发送 `client_id`。[E: codex-rs/login/src/device_code_auth.rs:35][E: codex-rs/login/src/device_code_auth.rs:67][E: codex-rs/login/src/device_code_auth.rs:69]
3. `poll_for_token` 最多等待 15 分钟，并按 device code response 的 interval 轮询；HTTP 403/404 被视为仍在等待授权直到 timeout，其他非成功状态会返回失败。[E: codex-rs/login/src/device_code_auth.rs:98][E: codex-rs/login/src/device_code_auth.rs:107][E: codex-rs/login/src/device_code_auth.rs:130][E: codex-rs/login/src/device_code_auth.rs:141]
4. `complete_device_code_login` 在拿到 authorization code 后，复用 PKCE token exchange、workspace restriction 和 `persist_tokens_async` 保存流程。[E: codex-rs/login/src/device_code_auth.rs:181][E: codex-rs/login/src/device_code_auth.rs:203][E: codex-rs/login/src/device_code_auth.rs:215]

## API key flow

`login_with_api_key` 把 `AuthDotJson` 写成 `mode: ApiKey`、`openai_api_key: Some(api_key)`、`tokens: None`、`last_refresh: None`、`agent_identity: None`。[E: codex-rs/login/src/auth/manager.rs:511][E: codex-rs/login/src/auth/manager.rs:516][E: codex-rs/login/src/auth/manager.rs:523] `CodexAuth::from_auth_dot_json` 在 `AuthMode::ApiKey` 下要求 `openai_api_key` 存在，否则返回缺 key 错误。[E: codex-rs/login/src/auth/manager.rs:195][E: codex-rs/login/src/auth/manager.rs:201]

源码定义了 `OPENAI_API_KEY` 与 `CODEX_API_KEY` 两个 env helper，helper 都会丢弃空字符串；`load_auth(..., true, ...)` 的 env-precedence 分支当前调用的是 `CODEX_API_KEY` helper。[E: codex-rs/login/src/auth/manager.rs:470][E: codex-rs/login/src/auth/manager.rs:473][E: codex-rs/login/src/auth/manager.rs:481][E: codex-rs/login/src/auth/manager.rs:691][E: codex-rs/login/src/auth/manager.rs:692] `AuthManager::auth()` 先尝试 external API key auth，再尝试 cached auth，并且只在 ChatGPT auth stale 时触发 proactive refresh。[E: codex-rs/login/src/auth/manager.rs:1341][E: codex-rs/login/src/auth/manager.rs:1345][E: codex-rs/login/src/auth/manager.rs:1351]

## Refresh 与限制

ChatGPT proactive refresh cadence 使用 8 天 refresh interval；`is_stale_for_proactive_refresh` 在 access token 过期或 `last_refresh` 超过该 interval 时返回 true。[E: codex-rs/login/src/auth/manager.rs:83][E: codex-rs/login/src/auth/manager.rs:1712][E: codex-rs/login/src/auth/manager.rs:1725][E: codex-rs/login/src/auth/manager.rs:1731] `refresh_token` 用 semaphore 限制并发 refresh，跳过 API key auth，并在 refresh 前后检查 account 是否仍匹配，避免覆盖新登录账号。[E: codex-rs/login/src/auth/manager.rs:1588][E: codex-rs/login/src/auth/manager.rs:1595][E: codex-rs/login/src/auth/manager.rs:1614]

`enforce_login_restrictions` 调用 `load_auth(..., true, ...)`，而 `load_auth` 在启用 env auth 时让 `CODEX_API_KEY` 优先于其他 auth method。[E: codex-rs/login/src/auth/manager.rs:577][E: codex-rs/login/src/auth/manager.rs:580][E: codex-rs/login/src/auth/manager.rs:691][E: codex-rs/login/src/auth/manager.rs:692] forced method 可要求 ChatGPT 或 API key，mismatch 时会 logout 并返回错误。[E: codex-rs/login/src/auth/manager.rs:587][E: codex-rs/login/src/auth/manager.rs:605] workspace restriction 检查 `forced_chatgpt_workspace_id`，并要求 ChatGPT auth 的 account id 或 workspace id 与配置匹配。[E: codex-rs/login/src/auth/manager.rs:614][E: codex-rs/login/src/auth/manager.rs:635][E: codex-rs/login/src/auth/manager.rs:650]

## 设计动机与权衡

`AuthManager` 把 file/keyring/ephemeral storage 与 token refresh 统一到一个 cached snapshot，是为了让 provider/client 侧只询问当前 auth，而不用知道登录来源。[I] 该设计由 `AuthManager::new` 启动时加载一次 storage、`auth()` 再复用 cached auth 与 refresh logic 共同体现。[E: codex-rs/login/src/auth/manager.rs:1238][E: codex-rs/login/src/auth/manager.rs:1341]

`ChatgptAuthTokens` 的 refresh 路径会调用 `refresh_external_auth`，然后把外部刷新得到的 ChatGPT metadata/tokens 保存到 ephemeral storage 并 reload cache。[E: codex-rs/login/src/auth/manager.rs:1653][E: codex-rs/login/src/auth/manager.rs:1734][E: codex-rs/login/src/auth/manager.rs:1775][E: codex-rs/login/src/auth/manager.rs:1783]

## Gotchas

- API key auth 和 AgentIdentity auth 没有 token refresh；`refresh_token_from_authority_impl` 对 `ApiKey` 和 `AgentIdentity` 直接返回 `Ok(())`。[E: codex-rs/login/src/auth/manager.rs:1666]
- `refresh_external_auth` 要求 external auth 已启用；当 external auth 返回 ChatGPT metadata 时仍会套 workspace restriction。[E: codex-rs/login/src/auth/manager.rs:1734][E: codex-rs/login/src/auth/manager.rs:1758][E: codex-rs/login/src/auth/manager.rs:1772]
- OAuth server 的 URL redaction 会把常见敏感 query key 的值替换成 `<redacted>`，这些 key 包含 access_token、api_key、code、code_verifier、id_token、refresh_token、state 和 token 等。[E: codex-rs/login/src/server.rs:594][E: codex-rs/login/src/server.rs:595][E: codex-rs/login/src/server.rs:608][E: codex-rs/login/src/server.rs:621]

## Sources

- `codex-rs/login/src/auth/manager.rs`
- `codex-rs/login/src/device_code_auth.rs`
- `codex-rs/login/src/server.rs`
- `codex-rs/login/src/lib.rs`
- `docs/authentication.md`

## 相关

- `subsys.config-auth.credential-storage`: login flow 写入的 auth material 如何保存。
- `config.auth-account`: forced login method 与 workspace restriction 的配置入口。
- `subsys.providers.provider-openai`: provider 发请求时如何消费 auth。
