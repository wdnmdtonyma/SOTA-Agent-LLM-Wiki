---
id: surface.providers.auth
title: 认证与登录(OAuth/api-key)
kind: surface
tier: T1
pkg: ai
source:
  - packages/ai/src/cli.ts
  - packages/ai/src/auth/resolve.ts
  - packages/ai/src/oauth.ts
  - packages/ai/src/models.ts
  - packages/ai/src/auth/types.ts
  - packages/ai/src/auth/helpers.ts
  - packages/ai/src/env-api-keys.ts
  - packages/ai/src/providers/all.ts
  - packages/coding-agent/src/core/auth-storage.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/core/model-registry.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/docs/providers.md
symbols:
  - getAuth
  - resolveProviderAuth
  - login
related:
  - subsys.ai.auth-resolution
  - subsys.ai.oauth-flow
  - subsys.coding-agent.auth-storage
  - ref.ai.auth-types
evidence: explicit
status: verified
updated: 8c943640
---

> `surface.providers.auth` 是 pi 的 provider 认证可见面: 它把 `/login`、`--api-key`、`auth.json`、环境变量、OAuth token 刷新与 `Models.getAuth()`/`resolveProviderAuth()` 的请求时认证解析连成一条可检索路径。

## 能回答的问题

- `/login` 如何在 subscription OAuth 和 API key provider 之间分流?
- API key、OAuth token、环境变量、`auth.json` 和 `models.json` 的优先级是什么?
- `Models.getAuth()` 与 `resolveProviderAuth()` 如何把 provider auth contract 解析成请求时 `AuthResult`?
- 内置 provider 与环境变量映射的 ground truth 分别在哪里?
- `auth.json` 存在哪里、如何加锁写入、如何刷新过期 OAuth token?
- `pi-ai` 包里的 standalone `login` CLI 与 coding-agent `/login` 是不是同一个入口?

## 1 用户入口与登录分流

Pi 的用户文档把 provider auth 分成 subscription OAuth 和 API-key provider 两类: subscription 通过交互模式 `/login` 选择 ChatGPT Plus/Pro、Claude Pro/Max 或 GitHub Copilot,并用 `/logout` 清理凭证;API-key provider 可以通过 `/login` 写入 `auth.json`,也可以直接用环境变量启动 pi [E: packages/coding-agent/docs/providers.md:16] [E: packages/coding-agent/docs/providers.md:18] [E: packages/coding-agent/docs/providers.md:19] [E: packages/coding-agent/docs/providers.md:20] [E: packages/coding-agent/docs/providers.md:22] [E: packages/coding-agent/docs/providers.md:42] [E: packages/coding-agent/docs/providers.md:44]。

交互式命令层把文本 `/login` 映射到 `showOAuthSelector("login")`,再展示认证方式选择器,用户选择 subscription 时进入 OAuth provider 列表,选择 API key 时进入 API-key provider 列表 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2634] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2635] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4667] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4672] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4676] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4677]。

OAuth 登录列表来自 `authStorage.getOAuthProviders()`,API-key 登录列表从当前 model registry 的 provider 集合构造,再经 `isApiKeyLoginProvider(...)` 过滤:有显式 display name 的 builtin 可展示,没有显式 display name 的 builtin 被跳过,非 builtin 则排除 OAuth provider id 后展示;选择 provider 后,OAuth 分支调用 `showLoginDialog(...)`,Bedrock API-key 分支走 `showBedrockSetupDialog(...)`,其余 API-key 分支调用 `showApiKeyLoginDialog(...)` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:237] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:242] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:245] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:248] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4622] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4623] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4624] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4632] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4634] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4637] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4710] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4711] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4712] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4715]。

API-key 登录对话框读取非空 secret,然后把 `{ type: "api_key", key: apiKey }` 存到 `this.session.modelRegistry.authStorage` 的 provider id 下;OAuth 登录对话框调用 `authStorage.login(providerId, callbacks)`,并把 auth URL、device code、prompt、progress、select、manual code 和 cancel signal 转给 UI [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4883] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4884] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4888] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4971] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4972] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4995] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5000] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5004] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5008] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5010] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5012]。

## 2 存储位置与本地凭证形状

用户文档声明 subscription token 存在 `~/.pi/agent/auth.json`,API-key 示例也把 provider id 映射到 `auth.json` key,并说明该文件以 `0600` 权限创建且 auth file credential 优先于环境变量 [E: packages/coding-agent/docs/providers.md:22] [E: packages/coding-agent/docs/providers.md:49] [E: packages/coding-agent/docs/providers.md:85] [E: packages/coding-agent/docs/providers.md:87] [E: packages/coding-agent/docs/providers.md:105]。

源码侧的默认文件后端由 `AuthStorage.create()` 建出来: `FileAuthStorageBackend` 默认路径是 `join(getAgentDir(), "auth.json")`,缺父目录时用 `0o700` 创建,缺文件时写入 `{}` 并 chmod 到 `0o600` [E: packages/coding-agent/src/core/auth-storage.ts:63] [E: packages/coding-agent/src/core/auth-storage.ts:67] [E: packages/coding-agent/src/core/auth-storage.ts:70] [E: packages/coding-agent/src/core/auth-storage.ts:74] [E: packages/coding-agent/src/core/auth-storage.ts:76] [E: packages/coding-agent/src/core/auth-storage.ts:77] [E: packages/coding-agent/src/core/auth-storage.ts:215] [E: packages/coding-agent/src/core/auth-storage.ts:216]。

`auth.json` 的 credential union 在 coding-agent storage 中是 `ApiKeyCredential | OAuthCredential`:API key credential 形如 `{ type: "api_key"; key; env? }`,OAuth credential 形如 `{ type: "oauth" } & OAuthCredentials`,整个文件数据是 `Record<string, AuthCredential>` [E: packages/coding-agent/src/core/auth-storage.ts:24] [E: packages/coding-agent/src/core/auth-storage.ts:26] [E: packages/coding-agent/src/core/auth-storage.ts:27] [E: packages/coding-agent/src/core/auth-storage.ts:30] [E: packages/coding-agent/src/core/auth-storage.ts:32] [E: packages/coding-agent/src/core/auth-storage.ts:34] [E: packages/coding-agent/src/core/auth-storage.ts:36]。

Provider-scoped `env` 是 API-key credential 的一部分,可让 `auth.json` 中的 Cloudflare/Azure/Vertex/Bedrock 等配置优先于进程环境变量;文档建议在 pi 需要使用不同于项目 shell environment 的 provider settings 时使用该字段 [E: packages/coding-agent/docs/providers.md:107] [E: packages/coding-agent/docs/providers.md:111] [E: packages/coding-agent/docs/providers.md:114] [E: packages/coding-agent/docs/providers.md:123]。

## 3 内置 provider 与环境变量 ground truth

内置文本 provider 集合的 ground truth 是 `packages/ai/src/providers/all.ts` 的 `builtinProviders()`:当前它返回 35 个 provider factory 的 fresh array,从 `amazonBedrockProvider()` 到 `zaiCodingCnProvider()` [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:71] [E: packages/ai/src/providers/all.ts:72] [E: packages/ai/src/providers/all.ts:106]。`builtinModels(options)` 创建 `Models` collection 后逐个 `models.setProvider(provider)`,所以请求时 provider id 解析依赖 collection 中注册的 provider [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:112] [E: packages/ai/src/providers/all.ts:113] [E: packages/ai/src/providers/all.ts:114]。

API key 环境变量映射的源码 ground truth 是 `packages/ai/src/env-api-keys.ts`:`getApiKeyEnvVars(provider)` 对 Anthropic 特判 `ANTHROPIC_OAUTH_TOKEN` 优先于 `ANTHROPIC_API_KEY`,对 GitHub Copilot 特判 `COPILOT_GITHUB_TOKEN`,再用 `envMap` 覆盖 OpenAI、Azure、Google、Cloudflare、OpenRouter、ZAI、Xiaomi 等 provider id 到环境变量名的映射 [E: packages/ai/src/env-api-keys.ts:64] [E: packages/ai/src/env-api-keys.ts:65] [E: packages/ai/src/env-api-keys.ts:66] [E: packages/ai/src/env-api-keys.ts:70] [E: packages/ai/src/env-api-keys.ts:71] [E: packages/ai/src/env-api-keys.ts:74] [E: packages/ai/src/env-api-keys.ts:76] [E: packages/ai/src/env-api-keys.ts:77] [E: packages/ai/src/env-api-keys.ts:80] [E: packages/ai/src/env-api-keys.ts:85] [E: packages/ai/src/env-api-keys.ts:100] [E: packages/ai/src/env-api-keys.ts:105]。

`findEnvKeys(provider, env?)` 只从 `getApiKeyEnvVars(provider)` 的 known key/token 环境变量列表中筛出实际配置过的变量,不把 ADC/AWS 这类 ambient credential source 当成 env key 返回;`getEnvApiKey(provider, env?)` 返回第一个找到的环境变量值,并为 Google Vertex 与 Amazon Bedrock 额外返回 `"<authenticated>"` 这类 ambient-auth sentinel,前者要求 ADC/project/location,后者接受 AWS profile、IAM key、Bedrock bearer token、ECS credential URI 或 web identity token file [E: packages/ai/src/env-api-keys.ts:119] [E: packages/ai/src/env-api-keys.ts:122] [E: packages/ai/src/env-api-keys.ts:125] [E: packages/ai/src/env-api-keys.ts:126] [E: packages/ai/src/env-api-keys.ts:134] [E: packages/ai/src/env-api-keys.ts:137] [E: packages/ai/src/env-api-keys.ts:139] [E: packages/ai/src/env-api-keys.ts:144] [E: packages/ai/src/env-api-keys.ts:151] [E: packages/ai/src/env-api-keys.ts:152] [E: packages/ai/src/env-api-keys.ts:156] [E: packages/ai/src/env-api-keys.ts:165] [E: packages/ai/src/env-api-keys.ts:172] [I]。

## 4 请求时 auth 解析

`Models.getAuth(model)` 是 `pi-ai` collection 的公开认证查询:它按 `model.provider` 找 provider,未知 provider 返回 `undefined`,找到 provider 后调用 `resolveProviderAuth(provider, model, this.credentials, this.authContext)` [E: packages/ai/src/models.ts:112] [E: packages/ai/src/models.ts:216] [E: packages/ai/src/models.ts:217] [E: packages/ai/src/models.ts:218] [E: packages/ai/src/models.ts:219]。

`resolveProviderAuth()` 的优先级是 request override、credential store、ambient api-key path。显式 `overrides.apiKey` 且 provider 支持 `auth.apiKey` 时立即走 `resolveApiKey(...)`;否则读取 `CredentialStore` 中的 provider credential;读到 OAuth credential 且 provider 支持 `auth.oauth` 时走 OAuth path,读到 API-key credential 且 provider 支持 `auth.apiKey` 时走 API-key path,没有 stored credential 时才尝试 ambient `auth.apiKey` [E: packages/ai/src/auth/resolve.ts:40] [E: packages/ai/src/auth/resolve.ts:49] [E: packages/ai/src/auth/resolve.ts:50] [E: packages/ai/src/auth/resolve.ts:57] [E: packages/ai/src/auth/resolve.ts:59] [E: packages/ai/src/auth/resolve.ts:60] [E: packages/ai/src/auth/resolve.ts:62] [E: packages/ai/src/auth/resolve.ts:64] [E: packages/ai/src/auth/resolve.ts:70]。

API-key provider 的标准 helper 是 `envApiKeyAuth(name, envVars)`:它的 login prompt 返回 `{ type: "api_key", key }`,resolve 时 stored credential key 先赢,否则按传入环境变量列表顺序返回第一个 `ctx.env(envVar)` 命中的值,都没有则返回 `undefined` [E: packages/ai/src/auth/helpers.ts:9] [E: packages/ai/src/auth/helpers.ts:12] [E: packages/ai/src/auth/helpers.ts:13] [E: packages/ai/src/auth/helpers.ts:14] [E: packages/ai/src/auth/helpers.ts:16] [E: packages/ai/src/auth/helpers.ts:17] [E: packages/ai/src/auth/helpers.ts:18] [E: packages/ai/src/auth/helpers.ts:20] [E: packages/ai/src/auth/helpers.ts:22]。

OAuth provider 的标准 wrapper 是 `lazyOAuth(...)`:provider definition 可以暴露 OAuth auth metadata,但真正的 login、refresh、toAuth 实现会在首次调用时通过 `load()` 懒加载 [E: packages/ai/src/auth/helpers.ts:34] [E: packages/ai/src/auth/helpers.ts:35] [E: packages/ai/src/auth/helpers.ts:37] [E: packages/ai/src/auth/helpers.ts:42] [E: packages/ai/src/auth/helpers.ts:43] [E: packages/ai/src/auth/helpers.ts:44]。

一次 stream 请求内部也会应用 auth:`applyAuth()` 调 `resolveProviderAuth(...)`,把返回的 `baseUrl` 合并进 request model,并把 resolved `apiKey`、`headers`、`env` 与显式 request options 合并;显式 request options 对同名 `apiKey`、headers/env key 有后写入效果 [E: packages/ai/src/models.ts:230] [E: packages/ai/src/models.ts:234] [E: packages/ai/src/models.ts:240] [E: packages/ai/src/models.ts:241] [E: packages/ai/src/models.ts:247] [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:251] [E: packages/ai/src/models.ts:252] [E: packages/ai/src/models.ts:263] [E: packages/ai/src/models.ts:265]。

## 5 产品层优先级与 compatibility path

用户文档把 provider credential resolution order 写成四层:CLI `--api-key` flag、`auth.json` entry、environment variable、custom provider keys from `models.json` [E: packages/coding-agent/docs/providers.md:268] [E: packages/coding-agent/docs/providers.md:270] [E: packages/coding-agent/docs/providers.md:272] [E: packages/coding-agent/docs/providers.md:273] [E: packages/coding-agent/docs/providers.md:274] [E: packages/coding-agent/docs/providers.md:275]。`main.ts` 实现了 CLI `--api-key` 的 product-level override:只有选定 model 后才调用 `authStorage.setRuntimeApiKey(sessionOptions.model.provider, parsed.apiKey)` [E: packages/coding-agent/src/main.ts:701] [E: packages/coding-agent/src/main.ts:702] [E: packages/coding-agent/src/main.ts:708]。

coding-agent 的 `AuthStorage.getApiKey(providerId)` 是 product compatibility path:它先返回 runtime override,再返回 stored API key credential,再处理 stored OAuth credential,最后才在 `includeFallback !== false` 时调用 `getEnvApiKey(providerId)` 环境变量 fallback [E: packages/coding-agent/src/core/auth-storage.ts:462] [E: packages/coding-agent/src/core/auth-storage.ts:464] [E: packages/coding-agent/src/core/auth-storage.ts:465] [E: packages/coding-agent/src/core/auth-storage.ts:471] [E: packages/coding-agent/src/core/auth-storage.ts:472] [E: packages/coding-agent/src/core/auth-storage.ts:475] [E: packages/coding-agent/src/core/auth-storage.ts:513] [E: packages/coding-agent/src/core/auth-storage.ts:516]。

Model registry 在 `models.json`/request-auth 兼容层显式把 `authStorage.getApiKey(model.provider, { includeFallback: false })` 放在 provider config key 之前,并在 `getProviderAuthStatus()` 中把 `models_json_command`、environment-backed config value 和 `models_json_key` 作为 status fallback [E: packages/coding-agent/src/core/model-registry.ts:701] [E: packages/coding-agent/src/core/model-registry.ts:703] [E: packages/coding-agent/src/core/model-registry.ts:704] [E: packages/coding-agent/src/core/model-registry.ts:705] [E: packages/coding-agent/src/core/model-registry.ts:706] [E: packages/coding-agent/src/core/model-registry.ts:708] [E: packages/coding-agent/src/core/model-registry.ts:757] [E: packages/coding-agent/src/core/model-registry.ts:768] [E: packages/coding-agent/src/core/model-registry.ts:775] [E: packages/coding-agent/src/core/model-registry.ts:779]。

`Models.getAuth()` 的 newer `CredentialStore` path 与 coding-agent `AuthStorage.getApiKey()` compatibility path 都描述 auth resolution,但它们服务的调用面不同:`Models.getAuth()`/`applyAuth()` 是 `pi-ai` runtime request auth,`AuthStorage`/model-registry path 是 coding-agent 产品层的 stored credential、runtime override、status 与 custom provider compatibility glue [E: packages/ai/src/models.ts:216] [E: packages/ai/src/models.ts:234] [E: packages/coding-agent/src/core/auth-storage.ts:462] [E: packages/coding-agent/src/core/model-registry.ts:701] [I]。

## 6 OAuth 刷新与锁

`pi-ai` 的 `resolveProviderAuth()` 对 stored OAuth credential 做二次检查式刷新:token 过期时调用 `credentials.modify(providerId, async (current) => ...)`,在 modify 回调内确认当前 credential 仍是 OAuth 且仍过期,再调用 `oauth.refresh(current)`;刷新后用 `oauth.toAuth(credential)` 生成 request auth [E: packages/ai/src/auth/resolve.ts:94] [E: packages/ai/src/auth/resolve.ts:98] [E: packages/ai/src/auth/resolve.ts:99] [E: packages/ai/src/auth/resolve.ts:100] [E: packages/ai/src/auth/resolve.ts:102] [E: packages/ai/src/auth/resolve.ts:111] [E: packages/ai/src/auth/resolve.ts:116]。

coding-agent 文件后端用 `proper-lockfile` 保护 `auth.json`:同步 path 会 lock/read/write/unlock,异步 path 会用重试、stale timeout 和 compromised 回调获取锁,并在读、写、返回前检查 compromised 状态 [E: packages/coding-agent/src/core/auth-storage.ts:108] [E: packages/coding-agent/src/core/auth-storage.ts:114] [E: packages/coding-agent/src/core/auth-storage.ts:115] [E: packages/coding-agent/src/core/auth-storage.ts:118] [E: packages/coding-agent/src/core/auth-storage.ts:122] [E: packages/coding-agent/src/core/auth-storage.ts:129] [E: packages/coding-agent/src/core/auth-storage.ts:143] [E: packages/coding-agent/src/core/auth-storage.ts:151] [E: packages/coding-agent/src/core/auth-storage.ts:152] [E: packages/coding-agent/src/core/auth-storage.ts:158] [E: packages/coding-agent/src/core/auth-storage.ts:161] [E: packages/coding-agent/src/core/auth-storage.ts:166]。

coding-agent legacy OAuth refresh path 也在锁内 reread storage,跳过已登出或已被其他进程刷新的 credential,刷新成功后把新 OAuth credential 写回同一 provider id;刷新异常时记录错误、reload 文件,如果其他进程已经写入有效 token 就复用,否则返回 `undefined` 并保留 credential 供用户重新 `/login` 或稍后重试 [E: packages/coding-agent/src/core/auth-storage.ts:416] [E: packages/coding-agent/src/core/auth-storage.ts:421] [E: packages/coding-agent/src/core/auth-storage.ts:422] [E: packages/coding-agent/src/core/auth-storage.ts:426] [E: packages/coding-agent/src/core/auth-storage.ts:437] [E: packages/coding-agent/src/core/auth-storage.ts:442] [E: packages/coding-agent/src/core/auth-storage.ts:444] [E: packages/coding-agent/src/core/auth-storage.ts:448] [E: packages/coding-agent/src/core/auth-storage.ts:492] [E: packages/coding-agent/src/core/auth-storage.ts:495] [E: packages/coding-agent/src/core/auth-storage.ts:498] [E: packages/coding-agent/src/core/auth-storage.ts:505]。

## 7 Gotcha

- Standalone `pi-ai` CLI 也有一个 local `login(providerId)` 函数,但它使用当前工作目录的 `auth.json` 常量,provider 列表常量来自 `getOAuthProviders()`,并把 OAuth credentials 写入该 local 文件;这不是 coding-agent 文档里的 `~/.pi/agent/auth.json` product flow [E: packages/ai/src/cli.ts:8] [E: packages/ai/src/cli.ts:9] [E: packages/ai/src/cli.ts:28] [E: packages/ai/src/cli.ts:65] [E: packages/ai/src/cli.ts:66] [E: packages/ai/src/cli.ts:67] [I]。index 中 `surface.providers.auth` 的 `login` symbol/source 更像同时指向 standalone `pi-ai` CLI 与 coding-agent `/login`,该归属没有在 index 或源码注释中消歧 [U]。
- Stored credential owns provider in the `pi-ai` resolver:读到 stored credential 后,如果 credential 类型与 provider handler 不匹配,入口返回 `undefined`;只有没有 stored credential 时才进入 ambient API-key path;OAuth refresh 或 OAuth toAuth 抛错会包装成 `ModelsError("oauth", ...)`,而不是静默回退到环境变量 [E: packages/ai/src/auth/resolve.ts:57] [E: packages/ai/src/auth/resolve.ts:58] [E: packages/ai/src/auth/resolve.ts:59] [E: packages/ai/src/auth/resolve.ts:62] [E: packages/ai/src/auth/resolve.ts:66] [E: packages/ai/src/auth/resolve.ts:70] [E: packages/ai/src/auth/resolve.ts:104] [E: packages/ai/src/auth/resolve.ts:118]。
- `AuthStorage.getAuthStatus(provider)` 不暴露 secret,也不刷新 OAuth token:它只报告 stored/runtime/environment/empty status,而 model registry 会再补 `models.json` status fallback [E: packages/coding-agent/src/core/auth-storage.ts:354] [E: packages/coding-agent/src/core/auth-storage.ts:355] [E: packages/coding-agent/src/core/auth-storage.ts:359] [E: packages/coding-agent/src/core/auth-storage.ts:363] [E: packages/coding-agent/src/core/auth-storage.ts:368] [E: packages/coding-agent/src/core/model-registry.ts:757] [E: packages/coding-agent/src/core/model-registry.ts:763] [E: packages/coding-agent/src/core/model-registry.ts:779]。

## 跨包关系

[subsys.ai.auth-resolution](../../subsystems/ai/auth-resolution.md) 详细解释 `resolveProviderAuth()` 的 request override、stored credential、ambient auth、OAuth refresh 和 `ModelsError` 语义;本节点只把它放进 provider 登录与请求时认证的用户可见路径 [E: packages/ai/src/auth/resolve.ts:40] [I]。

[subsys.ai.oauth-flow](../../subsystems/ai/oauth-flow.md) 详细解释 legacy OAuth provider registry、device-code polling 与 PKCE helper;本节点只关心 `/login` 如何触发 provider-specific OAuth login 与 token storage [I]。

[subsys.coding-agent.auth-storage](../../subsystems/coding-agent/auth-storage.md) 详细解释 `AuthStorage` 的文件锁、runtime override、status、legacy refresh 和 environment fallback;本节点只抽取这些行为对 provider auth surface 的影响 [E: packages/coding-agent/src/core/auth-storage.ts:203] [I]。

[ref.ai.auth-types](../../reference/auth-types.md) 是 `ModelAuth`、`CredentialStore`、`AuthLoginCallbacks`、`ApiKeyAuth`、`OAuthAuth` 和 `ProviderAuth` 的字段目录;本节点按这些类型解释登录 callback 与 request auth 的边界 [E: packages/ai/src/auth/types.ts:8] [E: packages/ai/src/auth/types.ts:47] [E: packages/ai/src/auth/types.ts:118] [E: packages/ai/src/auth/types.ts:129] [E: packages/ai/src/auth/types.ts:154] [E: packages/ai/src/auth/types.ts:179]。

## Sources

- packages/ai/src/cli.ts
- packages/ai/src/auth/resolve.ts
- packages/ai/src/oauth.ts
- packages/ai/src/models.ts
- packages/ai/src/auth/types.ts
- packages/ai/src/auth/helpers.ts
- packages/ai/src/env-api-keys.ts
- packages/ai/src/providers/all.ts
- packages/coding-agent/src/core/auth-storage.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/model-registry.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/docs/providers.md

## 相关

- [subsys.ai.auth-resolution](../../subsystems/ai/auth-resolution.md): `resolveProviderAuth()` 的优先级、stored credential 和 OAuth refresh 细节。
- [subsys.ai.oauth-flow](../../subsystems/ai/oauth-flow.md): OAuth provider registry、device-code polling 与 PKCE helper。
- [subsys.coding-agent.auth-storage](../../subsystems/coding-agent/auth-storage.md): `auth.json`、runtime override、status 和 legacy `getApiKey()` path。
- [ref.ai.auth-types](../../reference/auth-types.md): auth、credential、login callback 和 provider auth 类型字段目录。
