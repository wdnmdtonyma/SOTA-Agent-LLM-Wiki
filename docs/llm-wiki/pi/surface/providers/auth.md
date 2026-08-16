---
id: surface.providers.auth
title: 认证与登录(OAuth/api-key)
kind: surface
tier: T1
pkg: cross
source:
  - packages/coding-agent/docs/providers.md
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/core/model-runtime.ts
  - packages/coding-agent/src/core/runtime-credentials.ts
  - packages/coding-agent/src/core/auth-storage.ts
  - packages/coding-agent/src/core/model-registry.ts
  - packages/coding-agent/test/model-registry.test.ts
  - packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts
  - packages/coding-agent/src/main.ts
  - packages/ai/src/models.ts
  - packages/ai/src/types.ts
  - packages/ai/src/compat.ts
  - packages/ai/src/api/openai-completions.ts
  - packages/ai/src/auth/resolve.ts
  - packages/ai/src/auth/helpers.ts
  - packages/ai/src/env-api-keys.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/src/providers/baseten.ts
  - packages/ai/src/providers/kimi-coding.ts
  - packages/ai/src/providers/openrouter.ts
  - packages/ai/src/auth/oauth/kimi-coding.ts
  - packages/ai/src/auth/oauth/openrouter.ts
  - packages/coding-agent/src/cli/args.ts
  - packages/coding-agent/src/cli/auth-command.ts
  - packages/coding-agent/src/cli/auth-check.ts
  - packages/coding-agent/test/auth-check.test.ts
symbols:
  - ModelRuntime.login
  - ModelRuntime.logout
  - Models.login
  - resolveProviderAuth
  - parseAuthCommand
  - checkProviderAuth
related:
  - subsys.ai.auth-resolution
  - subsys.ai.oauth-flow
  - subsys.coding-agent.auth-storage
  - ref.ai.auth-types
evidence: explicit
status: verified
updated: 086c32e745
---

> `surface.providers.auth` 把 coding-agent 的 `/login`、`/logout`、`pi auth check`、CLI `--api-key`、`auth.json` 与 `ModelRuntime`/`pi-ai Models` 的请求时认证连成一条当前可检索路径。

## 能回答的问题

- `/login [provider]` 怎样选择 account OAuth 或 API-key method?
- `/logout` 会删除哪些 credential，哪些 environment/models.json 配置不会动?
- `--api-key`、runtime override、`auth.json`、environment 与 request options 的优先级是什么?
- `AuthStorage`、`RuntimeCredentials`、`ModelRuntime` 和 `pi-ai Models` 分别负责哪一层?
- OAuth refresh 为什么能跨进程只刷新一次?
- `ModelRegistry` 还是产品内部的 auth owner 吗?
- `pi auth check` 怎样做 provider/model credential preflight?

## 用户入口

provider 文档把 subscription auth 与 API-key auth 都放进 `/login`：当前文档列出 OpenAI Codex、Anthropic、GitHub Copilot、xAI、OpenRouter 与 Radius；`/logout` 清理存入 `~/.pi/agent/auth.json` 的 credential [E: packages/coding-agent/docs/providers.md:17] [E: packages/coding-agent/docs/providers.md:24] [E: packages/coding-agent/docs/providers.md:26]。OpenRouter 的 OAuth 会铸造不自动过期的 user-controlled API key [E: packages/coding-agent/docs/providers.md:47] [E: packages/coding-agent/docs/providers.md:52]。

runtime provider contract 还暴露 Kimi Code subscription OAuth：Kimi 与 OpenRouter 都同时有 `apiKey` 和 `oauth` method，因此动态 `/login` selector 会显示两种认证路径。[E: packages/ai/src/providers/kimi-coding.ts:12] [E: packages/ai/src/providers/kimi-coding.ts:14] [E: packages/ai/src/providers/openrouter.ts:12] [E: packages/ai/src/providers/openrouter.ts:14]。`providers.md` 的 subscription bullet list 尚未列 Kimi，这里以实际 provider registry/UI contract 为准并把文档差异保留为 [U]。

interactive parser 接受精确 `/login` 和 `/login <provider-ref>`；前者打开 method selector，后者把 ref 传给 `handleLoginCommand()` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2982] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2985]。`/logout` 走独立 logout selector [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2988] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2989]。

登录候选不再来自 legacy `AuthStorage.getOAuthProviders()`：UI 遍历 `modelRuntime.getProviders()`，对每个 provider 分别检查 `provider.auth.oauth` 与 `provider.auth.apiKey`，因此同一 provider 可以同时出现两种 method [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5211] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5213] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5221] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5230]。候选还携带 runtime auth status，显示 OAuth/API-key 类型和 source label [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5214] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5218]。

`/login <provider-ref>` 同时匹配 provider id 与 display name；唯一 match 直接开始，相同 provider 有两种 auth method 时先让用户选 method，其余情况以输入作为 selector 初始搜索 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5254] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5263] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5273] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5282] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5287]。

OAuth method 进入 `showLoginDialog()`；有 `apiKey.login` 的 provider 进入 API-key dialog；只有 ambient resolver、没有 login UI 的 provider 显示 ambient-auth guidance [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5290] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5296]。最终两种交互都调用 `modelRuntime.login(providerId, method, interaction)` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5679] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5684]。

logout selector 只由 `modelRuntime.listCredentials()` 生成，所以只列 runtime/persistent store 可见的 credential；UI 文案明确 `/logout` 不改 environment variables 或 `models.json` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5243] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5249] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5416]。选择后调用 `modelRuntime.logout()` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5156]。

## CLI `pi auth check` preflight

`args.ts` 把 `pi auth <command>` 列为 credential print 或 provider readiness 子命令；实际解析在 `parseAuthCommand()`：`auth check` / `auth print-api-key` / `auth print-bearer-token`。[E: packages/coding-agent/src/cli/args.ts:260] [E: packages/coding-agent/src/cli/auth-command.ts:51] [E: packages/coding-agent/src/cli/auth-command.ts:52] [E: packages/coding-agent/src/main.ts:139] [E: packages/coding-agent/src/main.ts:147] `check` 必须带 `--provider` 或 `--model`，可选 `--json`、`--credentials`、`--no-refresh`。[E: packages/coding-agent/src/cli/auth-command.ts:43] [E: packages/coding-agent/src/cli/auth-command.ts:83] [E: packages/coding-agent/src/cli/auth-command.ts:108] [E: packages/coding-agent/src/cli/auth-command.ts:110]

`main.ts` 的 `runAuthCommand()` 对 check 建 `createAuthCheckModelRuntime()`：`allowModelNetwork: false`、`refreshOnCreate: false`、内存 models store。默认用可写 `AuthStorage` 以便 refresh OAuth；`--no-refresh` 改用 `ReadOnlyAuthStorage`，不创建缺失的 `auth.json`。[E: packages/coding-agent/src/main.ts:186] [E: packages/coding-agent/src/main.ts:187] [E: packages/coding-agent/src/cli/auth-check.ts:66] [E: packages/coding-agent/src/cli/auth-check.ts:70] [E: packages/coding-agent/src/cli/auth-check.ts:71] [E: packages/coding-agent/test/auth-check.test.ts:136] [E: packages/coding-agent/test/auth-check.test.ts:144]

`checkProviderAuth()` 先从 `--model` 解析 provider，再 `modelRuntime.checkAuth(provider)`。结果三态：`ready`（exit 0）、`not_ready`（exit 1，`provider_not_found` / `credentials_not_configured` / `credential_not_available`）、`invalid`（exit 2，`invalid_state`）。函数参数默认 `refresh: false`；CLI 则传 `{ refresh: !command.noRefresh }`，因此未加 `--no-refresh` 时会再走 `getAuth()` 触发 OAuth refresh。[E: packages/coding-agent/src/cli/auth-check.ts:25] [E: packages/coding-agent/src/cli/auth-check.ts:29] [E: packages/coding-agent/src/cli/auth-check.ts:44] [E: packages/coding-agent/src/cli/auth-check.ts:46] [E: packages/coding-agent/src/cli/auth-check.ts:49] [E: packages/coding-agent/src/main.ts:188] [E: packages/coding-agent/src/main.ts:208] [E: packages/coding-agent/test/auth-check.test.ts:79] [E: packages/coding-agent/test/auth-check.test.ts:99] 文本输出默认只打 `ready`/`not_ready`/`invalid`；`--json` 打完整 result；`--credentials` 仅在 ready 时附带解析出的 secret。[E: packages/coding-agent/src/main.ts:189] [E: packages/coding-agent/src/main.ts:204] [E: packages/coding-agent/src/main.ts:206]

## 当前分层：store → overlay → runtime → pi-ai

`AuthStorage` 现在只实现 `CredentialStore`：公开面是 `read`、`modify`、`delete` 与只列 metadata 的 `list` [E: packages/coding-agent/src/core/auth-storage.ts:328] [E: packages/coding-agent/src/core/auth-storage.ts:274] [E: packages/coding-agent/src/core/auth-storage.ts:450] [E: packages/coding-agent/src/core/auth-storage.ts:305] [E: packages/coding-agent/src/core/auth-storage.ts:316]。它不再拥有 legacy OAuth provider registry、login callbacks、refresh policy 或 `getApiKey()` fallback。[I]

`ModelRuntime.create()` 默认用 file-backed `AuthStorage`，外层再包 `RuntimeCredentials`，并把该 composite store 交给 `createModels()` [E: packages/coding-agent/src/core/model-runtime.ts:172] [E: packages/coding-agent/src/core/model-runtime.ts:173] [E: packages/coding-agent/src/core/model-runtime.ts:168]。同一 factory 加载 `models.json`，建立 persistent models store，注册 builtin providers，并为非 Radius builtin 套 remote catalog overlay [E: packages/coding-agent/src/core/model-runtime.ts:175] [E: packages/coding-agent/src/core/model-runtime.ts:180] [E: packages/coding-agent/src/core/model-runtime.ts:183] [E: packages/coding-agent/src/core/model-runtime.ts:186]。

`RuntimeCredentials` 是不落盘的 API-key overlay：`setRuntimeApiKey()` 写内存 map；`read()` 命中时返回 synthetic API-key credential，否则委托底层 store；`delete()` 同时清 overlay 与 persistent store [E: packages/coding-agent/src/core/runtime-credentials.ts:12] [E: packages/coding-agent/src/core/runtime-credentials.ts:24] [E: packages/coding-agent/src/core/runtime-credentials.ts:26] [E: packages/coding-agent/src/core/runtime-credentials.ts:44] [E: packages/coding-agent/src/core/runtime-credentials.ts:44]。

CLI `--api-key` 要求先选定 model，然后按该 model provider 调 `modelRuntime.setRuntimeApiKey()` 并刷新 availability [E: packages/coding-agent/src/main.ts:812] [E: packages/coding-agent/src/main.ts:816] [E: packages/coding-agent/src/main.ts:764] [E: packages/coding-agent/src/main.ts:764]。`ModelRuntime` 同步更新 auth/configured snapshot，再按 network policy refresh catalog；值没有写进 `auth.json` [E: packages/coding-agent/src/core/model-runtime.ts:434] [E: packages/coding-agent/src/core/model-runtime.ts:774] [E: packages/coding-agent/src/core/model-runtime.ts:437]。

`ModelRegistry` 在目标 commit 只保存一个 `ModelRuntime`，model/auth 查询与 provider registration 都转发给它 [E: packages/coding-agent/src/core/model-registry.ts:32] [E: packages/coding-agent/src/core/model-registry.ts:33] [E: packages/coding-agent/src/core/model-registry.ts:35] [E: packages/coding-agent/src/core/model-registry.ts:36] [E: packages/coding-agent/src/core/model-registry.ts:48] [E: packages/coding-agent/src/core/model-registry.ts:49] [E: packages/coding-agent/src/core/model-registry.ts:95] [E: packages/coding-agent/src/core/model-registry.ts:96] [E: packages/coding-agent/src/core/model-registry.ts:133] [E: packages/coding-agent/src/core/model-registry.ts:136] [E: packages/coding-agent/src/core/model-registry.ts:139]。扩展仍可通过这个 compatibility facade 操作 runtime，但不能再把它当成 credential owner。[I]

`ModelRuntime.getAuth()` 的 case-insensitive merge 会先移除同名旧 casing，再把 override value（包括 `null`）写回；compatibility facade 随后原样返回这些 `ProviderHeaders`，不再过滤 deletion markers。extension 把 auth result 传给 `complete()` 后，OpenAI adapter 继续把 `null` 留在 SDK `defaultHeaders`；结合 nullable header contract，这作为默认 `Authorization` / `x-api-key` suppression marker。[E: packages/coding-agent/src/core/model-runtime.ts:113] [E: packages/coding-agent/src/core/model-runtime.ts:119] [E: packages/coding-agent/src/core/model-runtime.ts:122] [E: packages/coding-agent/src/core/model-runtime.ts:124] [E: packages/coding-agent/src/core/model-runtime.ts:479] [E: packages/coding-agent/src/core/model-runtime.ts:489] [E: packages/coding-agent/src/core/model-registry.ts:64] [E: packages/coding-agent/src/core/model-registry.ts:77] [E: packages/ai/src/types.ts:154] [E: packages/ai/src/compat.ts:250] [E: packages/ai/src/compat.ts:260] [E: packages/ai/src/compat.ts:266] [E: packages/ai/src/compat.ts:271] [E: packages/ai/src/api/openai-completions.ts:669] [E: packages/ai/src/api/openai-completions.ts:670] [E: packages/ai/src/api/openai-completions.ts:678] [E: packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts:82] [E: packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts:91] [E: packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts:99] [E: packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts:100] [I]

Baseten 是普通 API-key auth provider：支持 stored API-key credential 与 ambient `BASETEN_API_KEY`，没有 OAuth 或自定义 ambient resolver 分支。[E: packages/ai/src/providers/baseten.ts:6] [E: packages/ai/src/providers/baseten.ts:11] [E: packages/ai/src/auth/helpers.ts:16] [E: packages/ai/src/auth/helpers.ts:23] [E: packages/ai/src/auth/helpers.ts:26] [E: packages/ai/src/auth/resolve.ts:107] [E: packages/ai/src/auth/resolve.ts:83] [E: packages/ai/src/auth/resolve.ts:109]

## auth.json 形状、权限与锁

默认 auth path 是 `join(getAgentDir(), "auth.json")` [E: packages/coding-agent/src/core/auth-storage.ts:50]。父目录缺失时以 `0700` 创建；文件缺失时以 `0600` 写 `{}` 并显式 chmod [E: packages/coding-agent/src/core/auth-storage.ts:54] [E: packages/coding-agent/src/core/auth-storage.ts:57] [E: packages/coding-agent/src/core/auth-storage.ts:61] [E: packages/coding-agent/src/core/auth-storage.ts:64]。文档也明确 auth-file credential 优先于 environment，并允许 API-key credential 携带 provider-scoped `env` [E: packages/coding-agent/docs/providers.md:139] [E: packages/coding-agent/docs/providers.md:141]。

storage data 是 `Record<string, Credential>`，所以 `auth.json` 可同时持有 `{type:"api_key", key, env?}` 与 `{type:"oauth", ...}` [E: packages/coding-agent/src/core/auth-storage.ts:16]。`read()` 对 API-key credential 解析 command/`$ENV` config value，但 OAuth 或无 key credential 原样返回 [E: packages/coding-agent/src/core/auth-storage.ts:274] [E: packages/coding-agent/src/core/auth-storage.ts:447]。

sync lock path 对 `ELOCKED` 最多尝试 10 次、每次 busy-wait 20ms，然后在锁内读写并保持 `0600` [E: packages/coding-agent/src/core/auth-storage.ts:68] [E: packages/coding-agent/src/core/auth-storage.ts:73] [E: packages/coding-agent/src/core/auth-storage.ts:81] [E: packages/coding-agent/src/core/auth-storage.ts:101] [E: packages/coding-agent/src/core/auth-storage.ts:106]。async path 使用 exponential retry、30s stale threshold 和 compromised callback，并在读后、写前、返回前检查 compromised 状态 [E: packages/coding-agent/src/core/auth-storage.ts:128] [E: packages/coding-agent/src/core/auth-storage.ts:136] [E: packages/coding-agent/src/core/auth-storage.ts:180] [E: packages/coding-agent/src/core/auth-storage.ts:190]。

`modify()` 在 async file lock 内重新 parse current file、运行 caller callback、merge provider credential 并更新 in-memory snapshot；callback 返回 `undefined` 表示不改写并返回锁内读到的 current credential [E: packages/coding-agent/src/core/auth-storage.ts:450] [E: packages/coding-agent/src/core/auth-storage.ts:394] [E: packages/coding-agent/src/core/auth-storage.ts:459] [E: packages/coding-agent/src/core/auth-storage.ts:468]。`delete()` 同样在锁内删除 provider key [E: packages/coding-agent/src/core/auth-storage.ts:305] [E: packages/coding-agent/src/core/auth-storage.ts:480]。

## 请求时优先级

用户文档给出 product-level 顺序：CLI `--api-key`、`auth.json`、environment、custom provider keys from `models.json` [E: packages/coding-agent/docs/providers.md:312] [E: packages/coding-agent/docs/providers.md:314] [E: packages/coding-agent/docs/providers.md:317]。代码层需要拆成两段看：CLI key 通过 `RuntimeCredentials` 伪装成 store credential；`models.json` 通过 `ModelRuntime` provider composition/headers 叠加，而不是 `AuthStorage` 自己查表。[I]

`resolveProviderAuth()` 先建立 request env overlay；若 request 明确带 `apiKey` 且 provider 支持 API-key auth，就直接解析该 override [E: packages/ai/src/auth/resolve.ts:71] [E: packages/ai/src/auth/resolve.ts:73] [E: packages/ai/src/auth/resolve.ts:81]。否则读取 composite credential store：stored OAuth 走 OAuth handler，stored API key 走 API-key handler，credential type 与 provider handler 不匹配时返回 `undefined` [E: packages/ai/src/auth/resolve.ts:64] [E: packages/ai/src/auth/resolve.ts:88] [E: packages/ai/src/auth/resolve.ts:99] [E: packages/ai/src/auth/resolve.ts:103]。只有 store 完全没有 credential 时才尝试 ambient env/AWS/ADC path [E: packages/ai/src/auth/resolve.ts:107] [E: packages/ai/src/auth/resolve.ts:109]。

标准 `envApiKeyAuth()` 的 login 返回 API-key credential；resolve 时 credential key 优先，再按声明的 env var 顺序查询 `AuthContext` [E: packages/ai/src/auth/helpers.ts:9] [E: packages/ai/src/auth/helpers.ts:16] [E: packages/ai/src/auth/helpers.ts:16] [E: packages/ai/src/auth/helpers.ts:26]。legacy convenience catalog `env-api-keys.ts` 仍提供 provider→env mapping 与 ambient readiness detection，但实际 provider auth ground truth 是各 `Provider.auth` contract。[I]

## login/logout 与 OAuth refresh

`pi-ai Models.login()` 按 provider id 查 provider，再按 requested `AuthType` 取 `provider.auth.oauth` 或 `provider.auth.apiKey`；method 不支持 login 时抛 auth error，成功后通过 `CredentialStore.modify()` 持久化返回的 credential [E: packages/ai/src/models.ts:565] [E: packages/ai/src/models.ts:570] [E: packages/ai/src/models.ts:572] [E: packages/ai/src/models.ts:433] [E: packages/ai/src/models.ts:440]。logout 则调用 store delete [E: packages/ai/src/models.ts:445] [E: packages/ai/src/models.ts:449]。

`ModelRuntime.login()`/`logout()` 只是产品层 orchestration：委托 `Models` 后 refresh catalogs/availability；logout 还先重组 provider，清除 credential-dependent compatibility projection [E: packages/coding-agent/src/core/model-runtime.ts:521] [E: packages/coding-agent/src/core/model-runtime.ts:437] [E: packages/coding-agent/src/core/model-runtime.ts:531] [E: packages/coding-agent/src/core/model-runtime.ts:532]。

OAuth token 剩余有效期大于 `max(5 分钟, minOAuthValidityMs)` 时直接使用；进入该窗口后，`resolveStoredOAuth()` 在 `CredentialStore.modify()` 的锁内重新检查 credential 是否仍存在、是否已被别的 process/request 刷新，只让一个 caller 执行 `oauth.refresh()` 并持久化 rotated credential [E: packages/ai/src/auth/resolve.ts:119] [E: packages/ai/src/auth/resolve.ts:135] [E: packages/ai/src/auth/resolve.ts:139] [E: packages/ai/src/auth/resolve.ts:115] [E: packages/ai/src/auth/resolve.ts:120]。刷新后 `oauth.toAuth()` 生成 request auth；显式最小有效期仍不满足时会报错，refresh/toAuth error 都包装成 `ModelsError("oauth", ...)`，不会静默回落 environment [E: packages/ai/src/auth/resolve.ts:155] [E: packages/ai/src/auth/resolve.ts:169] [E: packages/ai/src/auth/resolve.ts:170] [E: packages/ai/src/auth/resolve.ts:175] [E: packages/ai/src/auth/resolve.ts:177]。

## 请求装配

`Models.applyAuth()` 要求 provider 存在且 auth resolution 非空；否则分别抛 provider/auth error [E: packages/ai/src/models.ts:462] [E: packages/ai/src/models.ts:643] [E: packages/ai/src/models.ts:649] [E: packages/ai/src/models.ts:650]。显式 request `apiKey` 覆盖 resolved key，headers 做 case-insensitive merge，request env 后写覆盖 resolved env，resolved `baseUrl` 复制到 request model [E: packages/ai/src/models.ts:655] [E: packages/ai/src/models.ts:655] [E: packages/ai/src/models.ts:656] [E: packages/ai/src/models.ts:658] [E: packages/ai/src/models.ts:659]。

coding-agent `ModelRuntime.getAuth(model)` 还把 `models.json`/extension configured model headers 合进 `pi-ai` resolution，并按 header name case-insensitive 覆盖 [E: packages/coding-agent/src/core/model-runtime.ts:472] [E: packages/coding-agent/src/core/model-runtime.ts:477] [E: packages/coding-agent/src/core/model-runtime.ts:479] [E: packages/coding-agent/src/core/model-runtime.ts:489]。

## Gotcha

- stored credential owns provider：错误类型的 stored credential 会阻断 ambient fallback；logout 或修正 store 才会重新暴露 environment path [E: packages/ai/src/auth/resolve.ts:88] [E: packages/ai/src/auth/resolve.ts:103]。
- `/logout` 不会 unset environment、删除 `models.json` 或清远端 catalog cache [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5416]。
- `AuthStorage.reload()` parse/lock 失败时保留上一份 valid in-memory snapshot，而不是清空 credentials [E: packages/coding-agent/src/core/auth-storage.ts:378] [E: packages/coding-agent/src/core/auth-storage.ts:353] [E: packages/coding-agent/src/core/auth-storage.ts:388]。
- `ModelRuntime.getProviderAuthStatus()` 的 source 顺序是 runtime、stored、configured request auth、environment check；它是 display/status snapshot，不返回 secret [E: packages/coding-agent/src/core/model-runtime.ts:561] [E: packages/coding-agent/src/core/model-runtime.ts:570]。

## 跨包关系

[subsys.ai.auth-resolution](../../subsystems/ai/auth-resolution.md) 深挖 `resolveProviderAuth()`、OAuth lock 和 request auth contract；本节点聚焦用户入口到请求装配。

[subsys.ai.oauth-flow](../../subsystems/ai/oauth-flow.md) 解释 provider lazy flow、Bun bundled loader、device-code poll 与 PKCE；本节点只说明 UI 怎样选择并调用 flow。

[subsys.coding-agent.auth-storage](../../subsystems/coding-agent/auth-storage.md) 深挖 file backend、locking 与 `CredentialStore`；本节点只说明其 surface-visible persistence 语义。

## Sources

- packages/coding-agent/docs/providers.md
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/model-runtime.ts
- packages/coding-agent/src/core/runtime-credentials.ts
- packages/coding-agent/src/core/auth-storage.ts
- packages/coding-agent/src/core/model-registry.ts
- packages/coding-agent/test/model-registry.test.ts
- packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts
- packages/coding-agent/src/main.ts
- packages/ai/src/models.ts
- packages/ai/src/types.ts
- packages/ai/src/compat.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/auth/resolve.ts
- packages/ai/src/auth/helpers.ts
- packages/ai/src/env-api-keys.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/providers/baseten.ts
- packages/ai/src/providers/kimi-coding.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/auth/oauth/kimi-coding.ts
- packages/ai/src/auth/oauth/openrouter.ts
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/cli/auth-command.ts
- packages/coding-agent/src/cli/auth-check.ts
- packages/coding-agent/test/auth-check.test.ts

## 相关

- [subsys.ai.auth-resolution](../../subsystems/ai/auth-resolution.md): request override、stored credential、ambient auth 与 OAuth refresh。
- [subsys.ai.oauth-flow](../../subsystems/ai/oauth-flow.md): lazy flow、Bun bridge、device-code 与 PKCE。
- [subsys.coding-agent.auth-storage](../../subsystems/coding-agent/auth-storage.md): `auth.json` backend 与 lock。
- [ref.ai.auth-types](../../reference/auth-types.md): credential、auth result 与 provider auth 类型字段。
