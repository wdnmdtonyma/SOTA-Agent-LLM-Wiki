---
id: subsys.config-auth.auth-flows
title: 认证流程
kind: subsystem
tier: T2
source: [codex-rs/login/src/auth/manager.rs, codex-rs/login/src/auth/auth_headers.rs, codex-rs/login/src/auth/workload_identity.rs, codex-rs/login/src/device_code_auth.rs, codex-rs/login/src/server.rs, codex-rs/login/src/callback_params.rs, codex-rs/login/src/lib.rs, codex-rs/workload-identity/src/lib.rs, docs/authentication.md, codex-rs/cli/src/main.rs, codex-rs/user-verification/src/lib.rs, codex-rs/Cargo.toml, codex-rs/app-server-protocol/src/protocol/common.rs]
symbols: [CodexAuth, AuthHeaders, ExternalAuth, AuthManager, LoginCallbackResult, LoginOnboardingEntrypoint, set_external_auth, login_with_api_key, run_login_server, run_device_code_login, complete_device_code_login, enforce_login_restrictions, UserVerificationProvider]
related: [subsys.config-auth.credential-storage, config.auth-account, rpc.config-account-methods, subsys.providers.provider-openai, subsys.cloud.cloud-config]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Codex 认证流程把 API key、ChatGPT OAuth/device code、external auth（包括整组 HTTP headers）、agent identity、personal access token、Bedrock API key 和 Bedrock access keys 都统一为 `CodexAuth` snapshots；`AuthManager` 负责缓存、env/external auth precedence、forced login/workspace restrictions 和 token refresh。本地 user-verification 凭证与签名在独立 crate，不走这套 login/network registration。[E: codex-rs/login/src/auth/manager.rs:80][E: codex-rs/login/src/auth/manager.rs:2049][E: codex-rs/user-verification/src/lib.rs:33]

## 能回答的问题

- `CodexAuth` 现在有哪些 runtime auth variants？
- `user-verification` crate 做什么，和 `userVerification/*` RPC 如何分工？
- ChatGPT browser OAuth flow 怎样生成 authorize URL、校验 callback state、exchange code 并持久化 token？
- device code flow 怎样轮询 token 并复用 token exchange/persist 流程？
- API key/env/external auth 与 cached auth 的 precedence 如何体现？
- forced login method 和 workspace restriction 会怎样拒绝/登出不匹配 auth？
- ChatGPT token refresh 怎样避免并发刷新和覆盖新登录账号？

## 职责边界

auth-flows 节点覆盖登录、限制、refresh 和 runtime auth snapshot，以及本地 user-verification 凭证/签名 crate 的边界。不覆盖凭据落盘 backend 的细节；`subsys.config-auth.credential-storage` 解释 `auth.json`、keyring/direct-vs-secrets backend、ephemeral storage 和 secret store。[E: codex-rs/login/src/auth/manager.rs:2049]

`userVerification/cancel` 等 RPC 方法表以 `rpc.config-account-methods` 为准；本页只记 crate 不做 network registration。[E: codex-rs/app-server-protocol/src/protocol/common.rs:550][E: codex-rs/user-verification/src/lib.rs:33]

`docs/authentication.md` 当前只是把用户导向 OpenAI developer docs，不定义本地 auth wire protocol；源码事实以 `codex-rs/login` 为准。[E: docs/authentication.md:3]

## 数据模型

`CodexAuth` 当前 variants 是 `ApiKey`、`Chatgpt`、`ChatgptAuthTokens`、`Headers`、`AgentIdentity`、`PersonalAccessToken`、`BedrockApiKey` 和 `BedrockAccessKeys`；`Headers(AuthHeaders)` 表示由宿主外部管理的一整组请求 headers，它把 header map 留在内存里、debug 时 redacted，不从 `auth.json` 恢复。[E: codex-rs/login/src/auth/manager.rs:80][E: codex-rs/login/src/auth/manager.rs:84][E: codex-rs/login/src/auth/auth_headers.rs:12]

`AuthConfig` 聚合 codex_home、credential store mode、keyring backend、forced login method、ChatGPT base URL、forced workspace ids、managed auth policy 和 auth route config；`enforce_login_restrictions` 会从 ChatGPT base URL 派生 agent identity AuthAPI base URL 后传入内部 restriction helper。[E: codex-rs/login/src/auth/manager.rs:1155][E: codex-rs/login/src/auth/manager.rs:1288][E: codex-rs/login/src/auth/manager.rs:1289][E: codex-rs/login/src/auth/manager.rs:1307]

`AuthManager` 是 runtime cache owner；配置了 `ExternalAuth` 时，`auth()` 每次先 reload 并返回 cached snapshot；否则才读取 cached auth，并在需要时进入 proactive guarded refresh。[E: codex-rs/login/src/auth/manager.rs:2049][E: codex-rs/login/src/auth/manager.rs:2372][E: codex-rs/login/src/auth/manager.rs:2373][E: codex-rs/login/src/auth/manager.rs:2374]

`set_external_auth` 在 workload identity 未占用时走 `install_external_auth`：先 resolve、校验并 commit snapshot。[E: codex-rs/login/src/auth/manager.rs:2627][E: codex-rs/login/src/auth/manager.rs:2631][E: codex-rs/login/src/auth/manager.rs:2636]

Workload identity 不是新的 `CodexAuth` variant。`is_workload_identity_selected()` 只看 process env 是否出现 federation rule 或 assertion file；`workload_identity_context` 不是 selection marker。选中后缺 required 字段会校验失败，而不是回退到其它 credential。[E: codex-rs/login/src/auth/workload_identity.rs:128][E: codex-rs/login/src/auth/workload_identity.rs:261][E: codex-rs/login/src/auth/workload_identity.rs:262][E: codex-rs/login/src/auth/workload_identity.rs:146][E: codex-rs/login/src/auth/workload_identity.rs:150] `AuthManager` 把它安装成 workload-identity external auth，远程 exec-server 注册在 selected 时走 `auth_provider_from_auth_manager`，否则用静态 `auth_provider_from_auth`。[E: codex-rs/cli/src/main.rs:2113][E: codex-rs/cli/src/main.rs:2114][E: codex-rs/cli/src/main.rs:2119]

## User verification crate

`codex-user-verification` 是独立 workspace member：device credentials and signing，独立于 RPC routing、UI 和 backend registration。[E: codex-rs/Cargo.toml:105][E: codex-rs/user-verification/src/lib.rs:33]

`UserVerificationProvider` 提供 `status` / `ensure_key` / `delete` / `verify`；实现不得做 network registration。成功创建本地 key 也不等于 server enrollment；backend revocation 属于 caller。[E: codex-rs/user-verification/src/lib.rs:33][E: codex-rs/user-verification/src/lib.rs:35][E: codex-rs/user-verification/src/lib.rs:41][E: codex-rs/user-verification/src/lib.rs:47][E: codex-rs/user-verification/src/lib.rs:54]

原生 provider 目前只在 macOS build；其它平台走 `UnsupportedProvider`。[E: codex-rs/user-verification/src/lib.rs:62][E: codex-rs/user-verification/src/lib.rs:84][E: codex-rs/user-verification/src/lib.rs:89]

RPC `userVerification/{status,enroll,delete,verify,cancel}` 的方法表在 `rpc.config-account-methods`；本轮 `userVerification/cancel` 是 experimental client method。[E: codex-rs/app-server-protocol/src/protocol/common.rs:550]

## Browser OAuth flow

1. `run_login_server` 生成 PKCE、state，绑定本地 callback server，并构造 `http://localhost:<port>/auth/callback` redirect URI 和 authorize URL。[E: codex-rs/login/src/server.rs:160][E: codex-rs/login/src/server.rs:161][E: codex-rs/login/src/server.rs:164][E: codex-rs/login/src/server.rs:176][E: codex-rs/login/src/server.rs:177]
2. `build_authorize_url` 写入 response_type、client_id、redirect_uri、scope、code_challenge、state、originator；有 forced workspace ids 时追加 `allowed_workspace_id`。[E: codex-rs/login/src/server.rs:576]
3. Callback handler 校验 state，处理 OAuth error，要求 authorization code 存在，再调用 `exchange_code_for_tokens`。state 可以是原始 expected value，或精确追加 `.onboarding_entrypoint=life_sciences`；后者只把 `LifeSciences` 写入 callback result，任意其他 suffix 都校验失败。[E: codex-rs/login/src/callback_params.rs:4][E: codex-rs/login/src/callback_params.rs:13]
4. Token exchange 对 `/oauth/token` 发 form body，包含 grant_type、code、redirect_uri、client_id、code_verifier。[E: codex-rs/login/src/server.rs:809]
5. OAuth 成功后会检查 workspace restriction，尝试用 id token obtain API key，并通过 `persist_tokens_async` 写入 configured auth store。[E: codex-rs/login/src/server.rs:437][E: codex-rs/login/src/server.rs:886]

## Device code flow

`run_device_code_login` 先 request device code，打印 verification URL 和 user code，再调用 `complete_device_code_login`。[E: codex-rs/login/src/device_code_auth.rs:234]

`request_device_code` 以 issuer 派生 `/api/accounts` base URL，请求 user code 后返回 verification URL、user code、device_auth_id 和 interval。[E: codex-rs/login/src/device_code_auth.rs:165]

`poll_for_token` 最多等待 15 分钟；HTTP 403/404 表示继续等待授权，其他 non-success status 立即失败。[E: codex-rs/login/src/device_code_auth.rs:100]

`complete_device_code_login` 拿到 authorization code 后复用 PKCE token exchange 与 token persist 流程，所以 device code 和 browser OAuth 在持久化后的 auth 形态相同。[E: codex-rs/login/src/device_code_auth.rs:181]

## API key、env 与 restrictions

`enforce_login_restrictions` 会先 `load_auth(..., enable_codex_api_key_env=true, forced_chatgpt_workspace_id=None, ...)`，再检查 forced login method；ChatGPT-required mode 允许 ChatGPT、ChatgptAuthTokens、Headers、AgentIdentity 和 PersonalAccessToken，API-required mode 允许 ApiKey、BedrockApiKey 和 BedrockAccessKeys。[E: codex-rs/login/src/auth/manager.rs:1288][E: codex-rs/login/src/auth/manager.rs:1323][E: codex-rs/login/src/auth/manager.rs:1326][E: codex-rs/login/src/auth/manager.rs:1327][E: codex-rs/login/src/auth/manager.rs:1332]

Forced workspace restriction 使用 configured workspace ids 比对有 account id 的 auth；ApiKey、BedrockApiKey 和 BedrockAccessKeys 没有 workspace metadata，会直接跳过这项检查。[E: codex-rs/login/src/auth/manager.rs:1359][E: codex-rs/login/src/auth/manager.rs:1361]

## Refresh

`refresh_token` 通过 refresh lock 串行化刷新；API key 与 personal access token auth 不刷新。刷新前会 guarded reload，如果 storage 中 account 已变则跳过，避免覆盖另一个实例的新登录状态。[E: codex-rs/login/src/auth/manager.rs:2803][E: codex-rs/login/src/auth/manager.rs:2804][E: codex-rs/login/src/auth/manager.rs:2811][E: codex-rs/login/src/auth/manager.rs:2825]

`refresh_token_from_authority_impl` 在安装了 external provider 时走 provider refresh；没有 external provider 时，只有 managed ChatGPT 走 refresh-and-persist。[E: codex-rs/login/src/auth/manager.rs:2852]

## Gotchas

- `Headers` 是 runtime-only external auth：它把 header map 留在内存里，也没有可供普通 bearer-token client 使用的单一 token。[E: codex-rs/login/src/auth/auth_headers.rs:12]
- `user-verification` 只做本地凭证/签名；不要把它写成会向后端注册设备。[E: codex-rs/user-verification/src/lib.rs:33]
- device code flow 的 user code 有短过期窗口；不要把 user code 当作长期 credential。[E: codex-rs/login/src/device_code_auth.rs:234]
- pending environment attachment 与 per-environment permission profile snapshot 的完整跨 thread 契约未在本节点逐字段核完。[U]

## Sources

- `codex-rs/login/src/auth/manager.rs`
- `codex-rs/login/src/auth/auth_headers.rs`
- `codex-rs/login/src/auth/workload_identity.rs`
- `codex-rs/workload-identity/src/lib.rs`
- `codex-rs/cli/src/main.rs`
- `codex-rs/login/src/device_code_auth.rs`
- `codex-rs/login/src/server.rs`
- `codex-rs/login/src/callback_params.rs`
- `codex-rs/login/src/lib.rs`
- `codex-rs/user-verification/src/lib.rs`
- `codex-rs/Cargo.toml`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `docs/authentication.md`

## 相关

- `subsys.config-auth.credential-storage`: auth store backend 与 `auth.json` schema。
- `config.auth-account`: 用户可见 auth config keys。
- `rpc.config-account-methods`: `userVerification/*`（含 `cancel`）方法表。
- `subsys.cloud.cloud-config`: managed requirements 与 forced login/workspace policy 来源。
