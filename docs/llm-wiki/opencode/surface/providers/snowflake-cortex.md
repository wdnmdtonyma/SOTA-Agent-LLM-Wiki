---
id: provider.snowflake-cortex
title: Snowflake Cortex Provider
kind: surface
tier: T1
v: shared
source: [packages/opencode/src/plugin/snowflake-cortex.ts, packages/opencode/src/plugin/index.ts, packages/opencode/src/provider/provider.ts, packages/core/src/plugin/provider/snowflake-cortex.ts, packages/core/src/plugin/provider.ts, packages/core/src/plugin/internal.ts, packages/core/src/aisdk.ts]
symbols: [SnowflakeCortexAuthPlugin, SnowflakeCortexPlugin, cortexFetch, ProviderPlugins]
related: [provider.resolution, provider.auth-accounts, model-layer.provider-registry-v1]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Snowflake Cortex provider 同时有 V1 provider/auth plugin surface 和 V2 AISDK provider plugin：V1 provider loader 解析 account/token 并设置 Cortex base URL，内建 `SnowflakeCortexAuthPlugin` 提供 external-browser OAuth；V2 `SnowflakeCortexPlugin` 在 AISDK `sdk` hook 中设置 token、usage 和 Cortex fetch compatibility shim。

## 能回答的问题

- `snowflake-cortex` provider 从哪些位置找 account 和 token?
- External Browser OAuth 如何启动本地 callback server 与 PKCE flow?
- OAuth refresh 发生在 loader 阶段还是 fetch 阶段?
- Snowflake Cortex fetch shim 改写了哪些 request/response?
- 手动 PAT/API token method 和 OAuth method 有什么区别?
- V2 provider plugin 在哪里接入 AISDK SDK 初始化？

## 注册位置

V1 plugin host 把 `SnowflakeCortexAuthPlugin` 作为 internal plugin 装入内建 plugin 列表；这意味着它不需要用户从 npm 安装 plugin。[E: packages/opencode/src/plugin/index.ts:22][E: packages/opencode/src/plugin/index.ts:65][E: packages/opencode/src/plugin/index.ts:66][E: packages/opencode/src/plugin/index.ts:79]

provider registry 的 per-provider loader key 是 `"snowflake-cortex"`；它读取 env、V1 auth storage 和 provider config options。[E: packages/opencode/src/provider/provider.ts:849][E: packages/opencode/src/provider/provider.ts:850][E: packages/opencode/src/provider/provider.ts:851][E: packages/opencode/src/provider/provider.ts:857]

V2 core plugin registry 把 `SnowflakeCortexPlugin` 放进 `ProviderPlugins`，当前 internal plugin startup 在 `packages/core/src/plugin/internal.ts` 中遍历 `ProviderPlugins` 并 `add()` 每个 provider plugin；AISDK 初始化通过 `ctx.aisdk.sdk(...)` 注册 hook，`AISDK.language()` 会运行 `service.runSDK({ model, package, options })` 取得 plugin 返回的 SDK。[E: packages/core/src/plugin/provider.ts:22][E: packages/core/src/plugin/provider.ts:36][E: packages/core/src/plugin/provider.ts:59][E: packages/core/src/plugin/internal.ts:33][E: packages/core/src/plugin/internal.ts:81][E: packages/core/src/plugin/internal.ts:118][E: packages/core/src/plugin/provider/snowflake-cortex.ts:70][E: packages/core/src/aisdk.ts:216]

## Credential Precedence

Snowflake account precedence 是 `SNOWFLAKE_ACCOUNT` env、API auth metadata account、OAuth auth accountId、provider option account。[E: packages/opencode/src/provider/provider.ts:853][E: packages/opencode/src/provider/provider.ts:854][E: packages/opencode/src/provider/provider.ts:855][E: packages/opencode/src/provider/provider.ts:856][E: packages/opencode/src/provider/provider.ts:857]

token precedence 是 `SNOWFLAKE_CORTEX_TOKEN`/`SNOWFLAKE_CORTEX_PAT` env，其次 V1 API auth key，其次 OAuth access token，其次 provider option token/apiKey。[E: packages/opencode/src/provider/provider.ts:859][E: packages/opencode/src/provider/provider.ts:860][E: packages/opencode/src/provider/provider.ts:861][E: packages/opencode/src/provider/provider.ts:862][E: packages/opencode/src/provider/provider.ts:864]

V2 `SnowflakeCortexPlugin` 不解析 account/baseURL；它只在 AISDK `sdk` hook 中给 providerID `snowflake-cortex` 的 model 设置 token。token precedence 是 `SNOWFLAKE_CORTEX_TOKEN`、`SNOWFLAKE_CORTEX_PAT`、`evt.options.token`、`evt.options.apiKey`。[E: packages/core/src/plugin/provider/snowflake-cortex.ts:70][E: packages/core/src/plugin/provider/snowflake-cortex.ts:72][E: packages/core/src/plugin/provider/snowflake-cortex.ts:73][E: packages/core/src/plugin/provider/snowflake-cortex.ts:74][E: packages/core/src/plugin/provider/snowflake-cortex.ts:75][E: packages/core/src/plugin/provider/snowflake-cortex.ts:76][E: packages/core/src/plugin/provider/snowflake-cortex.ts:77]

如果 account 或 token 缺失，V1 loader 返回 `autoload: false`，并让 `getModel()` 抛带 missing credentials 的错误。[E: packages/opencode/src/provider/provider.ts:866][E: packages/opencode/src/provider/provider.ts:869][E: packages/opencode/src/provider/provider.ts:870][E: packages/opencode/src/provider/provider.ts:872]

有 account/token 时 base URL 是 `https://${account}.snowflakecomputing.com/api/v2/cortex/v1`，options 至少包含 `baseURL` 和 `apiKey`；config source 会 `autoload: true`。[E: packages/opencode/src/provider/provider.ts:878][E: packages/opencode/src/provider/provider.ts:880][E: packages/opencode/src/provider/provider.ts:944][E: packages/opencode/src/provider/provider.ts:945]

## External Browser OAuth

plugin auth provider id 是 `snowflake-cortex`；prompts 要求 account，并可选 role。[E: packages/opencode/src/plugin/snowflake-cortex.ts:267][E: packages/opencode/src/plugin/snowflake-cortex.ts:270][E: packages/opencode/src/plugin/snowflake-cortex.ts:273][E: packages/opencode/src/plugin/snowflake-cortex.ts:277][E: packages/opencode/src/plugin/snowflake-cortex.ts:284][E: packages/opencode/src/plugin/snowflake-cortex.ts:285]

OAuth method label 是 `Login with Snowflake (External Browser)`，authorize 会 normalize account、start local OAuth server、generate PKCE、generate state、build authorize URL、wait callback，并尝试用 `open(url)` 打开 browser。[E: packages/opencode/src/plugin/snowflake-cortex.ts:460][E: packages/opencode/src/plugin/snowflake-cortex.ts:461][E: packages/opencode/src/plugin/snowflake-cortex.ts:463][E: packages/opencode/src/plugin/snowflake-cortex.ts:464][E: packages/opencode/src/plugin/snowflake-cortex.ts:467][E: packages/opencode/src/plugin/snowflake-cortex.ts:468][E: packages/opencode/src/plugin/snowflake-cortex.ts:469][E: packages/opencode/src/plugin/snowflake-cortex.ts:471][E: packages/opencode/src/plugin/snowflake-cortex.ts:472][E: packages/opencode/src/plugin/snowflake-cortex.ts:473]

authorize URL 使用 `LOCAL_APPLICATION` client id、localhost callback URL、PKCE S256 challenge、role-aware scope；role scope 是 `refresh_token` 或 `refresh_token session:role:<role>`/encoded role variant。[E: packages/opencode/src/plugin/snowflake-cortex.ts:8][E: packages/opencode/src/plugin/snowflake-cortex.ts:67][E: packages/opencode/src/plugin/snowflake-cortex.ts:72][E: packages/opencode/src/plugin/snowflake-cortex.ts:73][E: packages/opencode/src/plugin/snowflake-cortex.ts:75][E: packages/opencode/src/plugin/snowflake-cortex.ts:76][E: packages/opencode/src/plugin/snowflake-cortex.ts:91][E: packages/opencode/src/plugin/snowflake-cortex.ts:93][E: packages/opencode/src/plugin/snowflake-cortex.ts:99][E: packages/opencode/src/plugin/snowflake-cortex.ts:100]

local callback server listens on `127.0.0.1` with an ephemeral port, validates state before exchanging code, and rejects missing code or upstream error。[E: packages/opencode/src/plugin/snowflake-cortex.ts:9][E: packages/opencode/src/plugin/snowflake-cortex.ts:179][E: packages/opencode/src/plugin/snowflake-cortex.ts:180][E: packages/opencode/src/plugin/snowflake-cortex.ts:191][E: packages/opencode/src/plugin/snowflake-cortex.ts:199][E: packages/opencode/src/plugin/snowflake-cortex.ts:207][E: packages/opencode/src/plugin/snowflake-cortex.ts:216][E: packages/opencode/src/plugin/snowflake-cortex.ts:222]

callback result stores OAuth auth with refresh token, access token, expiry, and `accountId`; failure returns `{ type: "failed" }`, and the local server is stopped in finally。[E: packages/opencode/src/plugin/snowflake-cortex.ts:480][E: packages/opencode/src/plugin/snowflake-cortex.ts:482][E: packages/opencode/src/plugin/snowflake-cortex.ts:485][E: packages/opencode/src/plugin/snowflake-cortex.ts:486][E: packages/opencode/src/plugin/snowflake-cortex.ts:487][E: packages/opencode/src/plugin/snowflake-cortex.ts:488][E: packages/opencode/src/plugin/snowflake-cortex.ts:491][E: packages/opencode/src/plugin/snowflake-cortex.ts:493]

## Refresh 与 Fetch Shim

auth loader only returns custom fetch for OAuth auth; non-OAuth auth returns `{}` and provider loader handles env/config/API tokens。[E: packages/opencode/src/plugin/snowflake-cortex.ts:286][E: packages/opencode/src/plugin/snowflake-cortex.ts:288][E: packages/opencode/src/plugin/snowflake-cortex.ts:320][E: packages/opencode/src/provider/provider.ts:859][E: packages/opencode/src/provider/provider.ts:862]

expired OAuth auth is refreshed in loader path and fetch path. Fetch path refreshes if token is missing/expires within 120 seconds, and retries once on HTTP 401。[E: packages/opencode/src/plugin/snowflake-cortex.ts:12][E: packages/opencode/src/plugin/snowflake-cortex.ts:300][E: packages/opencode/src/plugin/snowflake-cortex.ts:302][E: packages/opencode/src/plugin/snowflake-cortex.ts:305][E: packages/opencode/src/plugin/snowflake-cortex.ts:440][E: packages/opencode/src/plugin/snowflake-cortex.ts:443][E: packages/opencode/src/plugin/snowflake-cortex.ts:445][E: packages/opencode/src/plugin/snowflake-cortex.ts:449][E: packages/opencode/src/plugin/snowflake-cortex.ts:451]

fetch shim sets bearer authorization and opencode user-agent, rewrites `max_tokens` to `max_completion_tokens`, turns Snowflake "conversation complete" 400 into a 200 empty assistant message, and fixes streaming chunks with empty role to `"assistant"`。[E: packages/opencode/src/plugin/snowflake-cortex.ts:382][E: packages/opencode/src/plugin/snowflake-cortex.ts:383][E: packages/opencode/src/plugin/snowflake-cortex.ts:389][E: packages/opencode/src/plugin/snowflake-cortex.ts:390][E: packages/opencode/src/plugin/snowflake-cortex.ts:404][E: packages/opencode/src/plugin/snowflake-cortex.ts:405][E: packages/opencode/src/plugin/snowflake-cortex.ts:408][E: packages/opencode/src/plugin/snowflake-cortex.ts:428]

provider-level fetch applies the same request/response transforms for env/config/API-key tokens; OAuth-only tokens skip provider-level fetch so plugin fetch owns refresh and transforms together。[E: packages/opencode/src/provider/provider.ts:887][E: packages/opencode/src/provider/provider.ts:889][E: packages/opencode/src/provider/provider.ts:890][E: packages/opencode/src/provider/provider.ts:894][E: packages/opencode/src/provider/provider.ts:895][E: packages/opencode/src/provider/provider.ts:904][E: packages/opencode/src/provider/provider.ts:908][E: packages/opencode/src/provider/provider.ts:919][E: packages/opencode/src/provider/provider.ts:931]

V2 core `cortexFetch(upstream)` implements the same Cortex request/response quirks: rewrite `max_tokens` to `max_completion_tokens`, turn "conversation complete" 400 into a normal stop response, and normalize streaming empty role to `"assistant"`。[E: packages/core/src/plugin/provider/snowflake-cortex.ts:8][E: packages/core/src/plugin/provider/snowflake-cortex.ts:13][E: packages/core/src/plugin/provider/snowflake-cortex.ts:14][E: packages/core/src/plugin/provider/snowflake-cortex.ts:15][E: packages/core/src/plugin/provider/snowflake-cortex.ts:24][E: packages/core/src/plugin/provider/snowflake-cortex.ts:28][E: packages/core/src/plugin/provider/snowflake-cortex.ts:32][E: packages/core/src/plugin/provider/snowflake-cortex.ts:41][E: packages/core/src/plugin/provider/snowflake-cortex.ts:53]

V2 plugin sets `includeUsage = true` unless caller explicitly set false, then calls `createOpenAICompatible({ ...evt.options, apiKey: token?, fetch: cortexFetch(upstream) })`。[E: packages/core/src/plugin/provider/snowflake-cortex.ts:78][E: packages/core/src/plugin/provider/snowflake-cortex.ts:79][E: packages/core/src/plugin/provider/snowflake-cortex.ts:80][E: packages/core/src/plugin/provider/snowflake-cortex.ts:81][E: packages/core/src/plugin/provider/snowflake-cortex.ts:82][E: packages/core/src/plugin/provider/snowflake-cortex.ts:83][E: packages/core/src/plugin/provider/snowflake-cortex.ts:84]

## Manual Token Method

The plugin also exposes an API method labeled `Paste PAT or bearer token manually`; it reuses only the account prompt。[E: packages/opencode/src/plugin/snowflake-cortex.ts:500][E: packages/opencode/src/plugin/snowflake-cortex.ts:501][E: packages/opencode/src/plugin/snowflake-cortex.ts:502]

## Gotcha

- Snowflake Cortex stored OAuth/API auth is V1 plugin `auth` hook, not V2 `Integration.Service`; the V2 `SnowflakeCortexPlugin` only customizes AISDK SDK initialization/fetch behavior。[E: packages/opencode/src/plugin/snowflake-cortex.ts:284][E: packages/opencode/src/plugin/snowflake-cortex.ts:286][E: packages/core/src/plugin/provider/snowflake-cortex.ts:67][E: packages/core/src/plugin/provider/snowflake-cortex.ts:70]
- OAuth callback server is process-global module state, so a newer authorize request supersedes any pending Snowflake authorize request。[E: packages/opencode/src/plugin/snowflake-cortex.ts:34][E: packages/opencode/src/plugin/snowflake-cortex.ts:236][E: packages/opencode/src/plugin/snowflake-cortex.ts:238][E: packages/opencode/src/plugin/snowflake-cortex.ts:250]
- The provider can be configured entirely by env/config/PAT without external browser OAuth; OAuth is only one credential path。[E: packages/opencode/src/provider/provider.ts:859][E: packages/opencode/src/provider/provider.ts:862][E: packages/opencode/src/plugin/snowflake-cortex.ts:500]

## Sources

- packages/opencode/src/plugin/snowflake-cortex.ts
- packages/opencode/src/plugin/index.ts
- packages/opencode/src/provider/provider.ts
- packages/core/src/plugin/provider/snowflake-cortex.ts
- packages/core/src/plugin/provider.ts
- packages/core/src/plugin/internal.ts
- packages/core/src/aisdk.ts

## 相关

- [Provider/model 解析](resolution.md)
- [Provider auth flows 与 accounts](auth-accounts.md)
- [V1 provider 注册内部](../../subsystems/model-layer/provider-registry-v1.md)
