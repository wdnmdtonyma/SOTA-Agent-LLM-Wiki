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
  - packages/coding-agent/src/main.ts
  - packages/ai/src/models.ts
  - packages/ai/src/auth/resolve.ts
  - packages/ai/src/auth/helpers.ts
  - packages/ai/src/env-api-keys.ts
  - packages/ai/src/providers/all.ts
symbols:
  - ModelRuntime.login
  - ModelRuntime.logout
  - Models.login
  - resolveProviderAuth
related:
  - subsys.ai.auth-resolution
  - subsys.ai.oauth-flow
  - subsys.coding-agent.auth-storage
  - ref.ai.auth-types
evidence: explicit
status: verified
updated: 3da591ab
---

> `surface.providers.auth` 把 coding-agent 的 `/login`、`/logout`、CLI `--api-key`、`auth.json` 与 `ModelRuntime`/`pi-ai Models` 的请求时认证连成一条当前可检索路径。

## 能回答的问题

- `/login [provider]` 怎样选择 account OAuth 或 API-key method?
- `/logout` 会删除哪些 credential，哪些 environment/models.json 配置不会动?
- `--api-key`、runtime override、`auth.json`、environment 与 request options 的优先级是什么?
- `AuthStorage`、`RuntimeCredentials`、`ModelRuntime` 和 `pi-ai Models` 分别负责哪一层?
- OAuth refresh 为什么能跨进程只刷新一次?
- `ModelRegistry` 还是产品内部的 auth owner 吗?

## 用户入口

provider 文档把 subscription auth 与 API-key auth 都放进 `/login`：当前 subscription 列表包括 OpenAI Codex、Anthropic、GitHub Copilot、xAI 与 Radius；`/logout` 清理存入 `~/.pi/agent/auth.json` 的 credential [E: packages/coding-agent/docs/providers.md:17] [E: packages/coding-agent/docs/providers.md:23] [E: packages/coding-agent/docs/providers.md:25]。API-key provider 既可由 `/login` 持久化，也可继续使用环境变量 [E: packages/coding-agent/docs/providers.md:54] [E: packages/coding-agent/docs/providers.md:57]。

interactive parser 接受精确 `/login` 和 `/login <provider-ref>`；前者打开 method selector，后者把 ref 传给 `handleLoginCommand()` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2703] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2706]。`/logout` 走独立 logout selector [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2709] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2710]。

登录候选不再来自 legacy `AuthStorage.getOAuthProviders()`：UI 遍历 `modelRuntime.getProviders()`，对每个 provider 分别检查 `provider.auth.oauth` 与 `provider.auth.apiKey`，因此同一 provider 可以同时出现两种 method [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4794] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4796] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4804] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4813]。候选还携带 runtime auth status，显示 OAuth/API-key 类型和 source label [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4797] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4801]。

`/login <provider-ref>` 同时匹配 provider id 与 display name；唯一 match 直接开始，相同 provider 有两种 auth method 时先让用户选 method，其余情况以输入作为 selector 初始搜索 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4837] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4846] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4857] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4866] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4871]。

OAuth method 进入 `showLoginDialog()`；有 `apiKey.login` 的 provider 进入 API-key dialog；只有 ambient resolver、没有 login UI 的 provider 显示 ambient-auth guidance [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4874] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4880]。最终两种交互都调用 `modelRuntime.login(providerId, method, interaction)` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5223] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5228]。

logout selector 只由 `modelRuntime.listCredentials()` 生成，所以只列 runtime/persistent store 可见的 credential；UI 文案明确 `/logout` 不改 environment variables 或 `models.json` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4826] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4832] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4994]。选择后调用 `modelRuntime.logout()` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5012]。

## 当前分层：store → overlay → runtime → pi-ai

`AuthStorage` 现在只实现 `CredentialStore`：公开面是 `read`、`modify`、`delete` 与只列 metadata 的 `list` [E: packages/coding-agent/src/core/auth-storage.ts:171] [E: packages/coding-agent/src/core/auth-storage.ts:217] [E: packages/coding-agent/src/core/auth-storage.ts:224] [E: packages/coding-agent/src/core/auth-storage.ts:242] [E: packages/coding-agent/src/core/auth-storage.ts:252]。它不再拥有 legacy OAuth provider registry、login callbacks、refresh policy 或 `getApiKey()` fallback。[I]

`ModelRuntime.create()` 默认用 file-backed `AuthStorage`，外层再包 `RuntimeCredentials`，并把该 composite store 交给 `createModels()` [E: packages/coding-agent/src/core/model-runtime.ts:131] [E: packages/coding-agent/src/core/model-runtime.ts:132] [E: packages/coding-agent/src/core/model-runtime.ts:127]。同一 factory 加载 `models.json`，建立 persistent models store，注册 builtin providers，并为非 Radius builtin 套 remote catalog overlay [E: packages/coding-agent/src/core/model-runtime.ts:134] [E: packages/coding-agent/src/core/model-runtime.ts:139] [E: packages/coding-agent/src/core/model-runtime.ts:141] [E: packages/coding-agent/src/core/model-runtime.ts:144]。

`RuntimeCredentials` 是不落盘的 API-key overlay：`setRuntimeApiKey()` 写内存 map；`read()` 命中时返回 synthetic API-key credential，否则委托底层 store；`delete()` 同时清 overlay 与 persistent store [E: packages/coding-agent/src/core/runtime-credentials.ts:12] [E: packages/coding-agent/src/core/runtime-credentials.ts:24] [E: packages/coding-agent/src/core/runtime-credentials.ts:26] [E: packages/coding-agent/src/core/runtime-credentials.ts:44] [E: packages/coding-agent/src/core/runtime-credentials.ts:46]。

CLI `--api-key` 要求先选定 model，然后按该 model provider 调 `modelRuntime.setRuntimeApiKey()` 并刷新 availability [E: packages/coding-agent/src/main.ts:705] [E: packages/coding-agent/src/main.ts:709] [E: packages/coding-agent/src/main.ts:712] [E: packages/coding-agent/src/main.ts:713]。`ModelRuntime` 同步更新 auth/configured snapshot，再按 network policy refresh catalog；值没有写进 `auth.json` [E: packages/coding-agent/src/core/model-runtime.ts:392] [E: packages/coding-agent/src/core/model-runtime.ts:402] [E: packages/coding-agent/src/core/model-runtime.ts:404]。

`ModelRegistry` 在目标 commit 只保存一个 `ModelRuntime`，model/auth 查询与 provider registration 都转发给它 [E: packages/coding-agent/src/core/model-registry.ts:20] [E: packages/coding-agent/src/core/model-registry.ts:21] [E: packages/coding-agent/src/core/model-registry.ts:23] [E: packages/coding-agent/src/core/model-registry.ts:24] [E: packages/coding-agent/src/core/model-registry.ts:36] [E: packages/coding-agent/src/core/model-registry.ts:37] [E: packages/coding-agent/src/core/model-registry.ts:91] [E: packages/coding-agent/src/core/model-registry.ts:92] [E: packages/coding-agent/src/core/model-registry.ts:121] [E: packages/coding-agent/src/core/model-registry.ts:124] [E: packages/coding-agent/src/core/model-registry.ts:127]。扩展仍可通过这个 compatibility facade 操作 runtime，但不能再把它当成 credential owner。[I]

## auth.json 形状、权限与锁

默认 auth path 是 `join(getAgentDir(), "auth.json")` [E: packages/coding-agent/src/core/auth-storage.ts:31]。父目录缺失时以 `0700` 创建；文件缺失时以 `0600` 写 `{}` 并显式 chmod [E: packages/coding-agent/src/core/auth-storage.ts:35] [E: packages/coding-agent/src/core/auth-storage.ts:38] [E: packages/coding-agent/src/core/auth-storage.ts:42] [E: packages/coding-agent/src/core/auth-storage.ts:45]。文档也明确 auth-file credential 优先于 environment，并允许 API-key credential 携带 provider-scoped `env` [E: packages/coding-agent/docs/providers.md:119] [E: packages/coding-agent/docs/providers.md:121]。

storage data 是 `Record<string, Credential>`，所以 `auth.json` 可同时持有 `{type:"api_key", key, env?}` 与 `{type:"oauth", ...}` [E: packages/coding-agent/src/core/auth-storage.ts:14]。`read()` 对 API-key credential 解析 command/`$ENV` config value，但 OAuth 或无 key credential 原样返回 [E: packages/coding-agent/src/core/auth-storage.ts:217] [E: packages/coding-agent/src/core/auth-storage.ts:221]。

sync lock path 对 `ELOCKED` 最多尝试 10 次、每次 busy-wait 20ms，然后在锁内读写并保持 `0600` [E: packages/coding-agent/src/core/auth-storage.ts:49] [E: packages/coding-agent/src/core/auth-storage.ts:54] [E: packages/coding-agent/src/core/auth-storage.ts:62] [E: packages/coding-agent/src/core/auth-storage.ts:82] [E: packages/coding-agent/src/core/auth-storage.ts:87]。async path 使用 exponential retry、30s stale threshold 和 compromised callback，并在读后、写前、返回前检查 compromised 状态 [E: packages/coding-agent/src/core/auth-storage.ts:111] [E: packages/coding-agent/src/core/auth-storage.ts:119] [E: packages/coding-agent/src/core/auth-storage.ts:126] [E: packages/coding-agent/src/core/auth-storage.ts:134]。

`modify()` 在 async file lock 内重新 parse current file、运行 caller callback、merge provider credential 并更新 in-memory snapshot；callback 返回 `undefined` 表示不改写并返回锁内读到的 current credential [E: packages/coding-agent/src/core/auth-storage.ts:224] [E: packages/coding-agent/src/core/auth-storage.ts:228] [E: packages/coding-agent/src/core/auth-storage.ts:230] [E: packages/coding-agent/src/core/auth-storage.ts:238]。`delete()` 同样在锁内删除 provider key [E: packages/coding-agent/src/core/auth-storage.ts:242] [E: packages/coding-agent/src/core/auth-storage.ts:247]。

## 请求时优先级

用户文档给出 product-level 顺序：CLI `--api-key`、`auth.json`、environment、custom provider keys from `models.json` [E: packages/coding-agent/docs/providers.md:292] [E: packages/coding-agent/docs/providers.md:294] [E: packages/coding-agent/docs/providers.md:297]。代码层需要拆成两段看：CLI key 通过 `RuntimeCredentials` 伪装成 store credential；`models.json` 通过 `ModelRuntime` provider composition/headers 叠加，而不是 `AuthStorage` 自己查表。[I]

`resolveProviderAuth()` 先建立 request env overlay；若 request 明确带 `apiKey` 且 provider 支持 API-key auth，就直接解析该 override [E: packages/ai/src/auth/resolve.ts:43] [E: packages/ai/src/auth/resolve.ts:45] [E: packages/ai/src/auth/resolve.ts:49]。否则读取 composite credential store：stored OAuth 走 OAuth handler，stored API key 走 API-key handler，credential type 与 provider handler 不匹配时返回 `undefined` [E: packages/ai/src/auth/resolve.ts:53] [E: packages/ai/src/auth/resolve.ts:56] [E: packages/ai/src/auth/resolve.ts:58] [E: packages/ai/src/auth/resolve.ts:62]。只有 store 完全没有 credential 时才尝试 ambient env/AWS/ADC path [E: packages/ai/src/auth/resolve.ts:66] [E: packages/ai/src/auth/resolve.ts:68]。

标准 `envApiKeyAuth()` 的 login 返回 API-key credential；resolve 时 credential key 优先，再按声明的 env var 顺序查询 `AuthContext` [E: packages/ai/src/auth/helpers.ts:9] [E: packages/ai/src/auth/helpers.ts:14] [E: packages/ai/src/auth/helpers.ts:16] [E: packages/ai/src/auth/helpers.ts:20]。legacy convenience catalog `env-api-keys.ts` 仍提供 provider→env mapping 与 ambient readiness detection，但实际 provider auth ground truth 是各 `Provider.auth` contract。[I]

## login/logout 与 OAuth refresh

`pi-ai Models.login()` 按 provider id 查 provider，再按 requested `AuthType` 取 `provider.auth.oauth` 或 `provider.auth.apiKey`；method 不支持 login 时抛 auth error，成功后通过 `CredentialStore.modify()` 持久化返回的 credential [E: packages/ai/src/models.ts:431] [E: packages/ai/src/models.ts:434] [E: packages/ai/src/models.ts:436] [E: packages/ai/src/models.ts:438] [E: packages/ai/src/models.ts:440]。logout 则调用 store delete [E: packages/ai/src/models.ts:447] [E: packages/ai/src/models.ts:449]。

`ModelRuntime.login()`/`logout()` 只是产品层 orchestration：委托 `Models` 后 refresh catalogs/availability；logout 还先重组 provider，清除 credential-dependent compatibility projection [E: packages/coding-agent/src/core/model-runtime.ts:493] [E: packages/coding-agent/src/core/model-runtime.ts:495] [E: packages/coding-agent/src/core/model-runtime.ts:499] [E: packages/coding-agent/src/core/model-runtime.ts:503]。

OAuth token 未过期时不加锁；过期时 `resolveStoredOAuth()` 在 `CredentialStore.modify()` 的锁内重新检查 credential 是否仍存在、是否已被别的 process/request 刷新，只让一个 caller 执行 `oauth.refresh()` 并持久化 rotated credential [E: packages/ai/src/auth/resolve.ts:92] [E: packages/ai/src/auth/resolve.ts:96] [E: packages/ai/src/auth/resolve.ts:98] [E: packages/ai/src/auth/resolve.ts:100]。刷新后 `oauth.toAuth()` 生成 request auth；refresh/toAuth error 都包装成 `ModelsError("oauth", ...)`，不会静默回落 environment [E: packages/ai/src/auth/resolve.ts:102] [E: packages/ai/src/auth/resolve.ts:114] [E: packages/ai/src/auth/resolve.ts:116]。

## 请求装配

`Models.applyAuth()` 要求 provider 存在且 auth resolution 非空；否则分别抛 provider/auth error [E: packages/ai/src/models.ts:463] [E: packages/ai/src/models.ts:467] [E: packages/ai/src/models.ts:472] [E: packages/ai/src/models.ts:473]。显式 request `apiKey` 覆盖 resolved key，headers 做 case-insensitive merge，request env 后写覆盖 resolved env，resolved `baseUrl` 复制到 request model [E: packages/ai/src/models.ts:478] [E: packages/ai/src/models.ts:478] [E: packages/ai/src/models.ts:479] [E: packages/ai/src/models.ts:481] [E: packages/ai/src/models.ts:482]。

coding-agent `ModelRuntime.getAuth(model)` 还把 `models.json`/extension configured model headers 合进 `pi-ai` resolution，并按 header name case-insensitive 覆盖 [E: packages/coding-agent/src/core/model-runtime.ts:370] [E: packages/coding-agent/src/core/model-runtime.ts:375] [E: packages/coding-agent/src/core/model-runtime.ts:377] [E: packages/coding-agent/src/core/model-runtime.ts:387]。

## Gotcha

- stored credential owns provider：错误类型的 stored credential 会阻断 ambient fallback；logout 或修正 store 才会重新暴露 environment path [E: packages/ai/src/auth/resolve.ts:54] [E: packages/ai/src/auth/resolve.ts:62]。
- `/logout` 不会 unset environment、删除 `models.json` 或清远端 catalog cache [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4994]。
- `AuthStorage.reload()` parse/lock 失败时保留上一份 valid in-memory snapshot，而不是清空 credentials [E: packages/coding-agent/src/core/auth-storage.ts:204] [E: packages/coding-agent/src/core/auth-storage.ts:211] [E: packages/coding-agent/src/core/auth-storage.ts:212]。
- `ModelRuntime.getProviderAuthStatus()` 的 source 顺序是 runtime、stored、configured request auth、environment check；它是 display/status snapshot，不返回 secret [E: packages/coding-agent/src/core/model-runtime.ts:416] [E: packages/coding-agent/src/core/model-runtime.ts:425]。

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
- packages/coding-agent/src/main.ts
- packages/ai/src/models.ts
- packages/ai/src/auth/resolve.ts
- packages/ai/src/auth/helpers.ts
- packages/ai/src/env-api-keys.ts
- packages/ai/src/providers/all.ts

## 相关

- [subsys.ai.auth-resolution](../../subsystems/ai/auth-resolution.md): request override、stored credential、ambient auth 与 OAuth refresh。
- [subsys.ai.oauth-flow](../../subsystems/ai/oauth-flow.md): lazy flow、Bun bridge、device-code 与 PKCE。
- [subsys.coding-agent.auth-storage](../../subsystems/coding-agent/auth-storage.md): `auth.json` backend 与 lock。
- [ref.ai.auth-types](../../reference/auth-types.md): credential、auth result 与 provider auth 类型字段。
