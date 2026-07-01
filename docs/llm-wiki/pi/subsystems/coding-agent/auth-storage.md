---
id: subsys.coding-agent.auth-storage
title: API key 本地存储
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/auth-storage.ts
  - packages/coding-agent/src/core/auth-guidance.ts
symbols:
  - AuthStorage
  - getAuthStatus
  - set
related:
  - surface.providers.auth
  - subsys.coding-agent.model-registry
evidence: explicit
status: verified
updated: 8c943640
---

> `AuthStorage` 是 pi-coding-agent 的 credential store: 它把 provider-scoped API key、OAuth credentials、runtime `--api-key` override、environment fallback 和无泄密的 auth status 汇合成本地鉴权接口。

## 能回答的问题

- `auth.json` 默认在哪里创建, 写文件权限和锁怎么处理?
- `AuthStorage.getApiKey()` 的 API key 优先级是什么?
- runtime `--api-key` override 是否会持久化到 `auth.json`?
- `getAuthStatus()` 为什么不暴露 secret, 也不刷新 OAuth token?
- OAuth token 过期时, 多个 pi 进程同时刷新会怎样协调?
- `auth-guidance.ts` 里的登录提示会在哪些无模型或无 key 场景出现?

## 职责边界

`packages/coding-agent/src/core/auth-storage.ts` owns credential persistence and resolution for coding-agent, not provider registration: it imports environment-key helpers and OAuth provider helpers from `@earendil-works/pi-ai`, while local storage, file locks, runtime overrides, and status formatting live in this coding-agent file [E: packages/coding-agent/src/core/auth-storage.ts:9] [E: packages/coding-agent/src/core/auth-storage.ts:16] [E: packages/coding-agent/src/core/auth-storage.ts:203]。

`AuthStorage.create(authPath?)` defaults to `getAgentDir()/auth.json`; callers can inject another path or backend through `AuthStorage.create(path)`, `AuthStorage.fromStorage()`, or `AuthStorage.inMemory()` [E: packages/coding-agent/src/core/auth-storage.ts:215] [E: packages/coding-agent/src/core/auth-storage.ts:216] [E: packages/coding-agent/src/core/auth-storage.ts:219] [E: packages/coding-agent/src/core/auth-storage.ts:223]。

`packages/coding-agent/src/core/auth-guidance.ts` formats user-facing help for missing models, missing selected model, and missing API key by pointing users at `providers.md` and `models.md` under `getDocsPath()` [E: packages/coding-agent/src/core/auth-guidance.ts:6] [E: packages/coding-agent/src/core/auth-guidance.ts:9] [E: packages/coding-agent/src/core/auth-guidance.ts:14] [E: packages/coding-agent/src/core/auth-guidance.ts:18] [E: packages/coding-agent/src/core/auth-guidance.ts:22]。

The index symbol `saveApiKey` does not correspond to an exported function or method in the two source files for this node; the current write path is the generic `AuthStorage.set(provider, { type: "api_key", key })` style API [E: packages/coding-agent/src/core/auth-storage.ts:313] [U]。

## 关键文件

- `packages/coding-agent/src/core/auth-storage.ts`: credential type definitions, file/in-memory backends, `AuthStorage` state, reload/persist operations, runtime override, auth status, OAuth login/logout, token refresh, and `getApiKey()` priority chain [E: packages/coding-agent/src/core/auth-storage.ts:24] [E: packages/coding-agent/src/core/auth-storage.ts:30] [E: packages/coding-agent/src/core/auth-storage.ts:60] [E: packages/coding-agent/src/core/auth-storage.ts:180] [E: packages/coding-agent/src/core/auth-storage.ts:203] [E: packages/coding-agent/src/core/auth-storage.ts:259] [E: packages/coding-agent/src/core/auth-storage.ts:274] [E: packages/coding-agent/src/core/auth-storage.ts:462]。
- `packages/coding-agent/src/core/auth-guidance.ts`: login guidance string builders for no-model and no-key messages [E: packages/coding-agent/src/core/auth-guidance.ts:6] [E: packages/coding-agent/src/core/auth-guidance.ts:14] [E: packages/coding-agent/src/core/auth-guidance.ts:18] [E: packages/coding-agent/src/core/auth-guidance.ts:22]。

## 数据模型

`ApiKeyCredential` is `{ type: "api_key", key, env? }`; the optional `env` object is provider-scoped environment data passed to `resolveConfigValue()` when resolving the stored key [E: packages/coding-agent/src/core/auth-storage.ts:24] [E: packages/coding-agent/src/core/auth-storage.ts:27] [E: packages/coding-agent/src/core/auth-storage.ts:471] [E: packages/coding-agent/src/core/auth-storage.ts:472]。

`OAuthCredential` is `{ type: "oauth" } & OAuthCredentials`, and `AuthCredential` is the union of API key and OAuth credentials; `AuthStorageData` maps provider id strings to one credential each [E: packages/coding-agent/src/core/auth-storage.ts:30] [E: packages/coding-agent/src/core/auth-storage.ts:34] [E: packages/coding-agent/src/core/auth-storage.ts:36]。

`AuthStatus` contains only `configured`, optional `source`, and optional `label`; `getAuthStatus()` returns these status fields without exposing stored API keys, access tokens, or refresh tokens [E: packages/coding-agent/src/core/auth-storage.ts:38] [E: packages/coding-agent/src/core/auth-storage.ts:40] [E: packages/coding-agent/src/core/auth-storage.ts:354]。

`AuthStorage` keeps four internal concerns separate: parsed persisted data in `data`, non-persisted CLI overrides in `runtimeOverrides`, a latest `loadError`, and accumulated `errors` drained by `drainErrors()` [E: packages/coding-agent/src/core/auth-storage.ts:204] [E: packages/coding-agent/src/core/auth-storage.ts:205] [E: packages/coding-agent/src/core/auth-storage.ts:206] [E: packages/coding-agent/src/core/auth-storage.ts:207] [E: packages/coding-agent/src/core/auth-storage.ts:378]。

`AuthStorageBackend` is a small lock-aware storage interface with sync and async variants; `FileAuthStorageBackend` implements it with `proper-lockfile`, while `InMemoryAuthStorageBackend` stores the backend value as an in-memory JSON string [E: packages/coding-agent/src/core/auth-storage.ts:55] [E: packages/coding-agent/src/core/auth-storage.ts:56] [E: packages/coding-agent/src/core/auth-storage.ts:60] [E: packages/coding-agent/src/core/auth-storage.ts:180]。

## 控制流

1. `FileAuthStorageBackend.constructor@packages/coding-agent/src/core/auth-storage.ts:63` normalizes the auth path; the default path is `join(getAgentDir(), "auth.json")` [E: packages/coding-agent/src/core/auth-storage.ts:63] [E: packages/coding-agent/src/core/auth-storage.ts:64] [E: packages/coding-agent/src/core/auth-storage.ts:216]。
2. `ensureParentDir()` creates the parent directory with mode `0o700`, and `ensureFileExists()` initializes the file to `{}` with write options mode `0o600` plus an explicit chmod [E: packages/coding-agent/src/core/auth-storage.ts:67] [E: packages/coding-agent/src/core/auth-storage.ts:70] [E: packages/coding-agent/src/core/auth-storage.ts:74] [E: packages/coding-agent/src/core/auth-storage.ts:76] [E: packages/coding-agent/src/core/auth-storage.ts:77]。
3. `withLock()` acquires a sync lock, reads current JSON, lets the caller return `{ result, next }`, writes `next` when present, then releases the lock in `finally` [E: packages/coding-agent/src/core/auth-storage.ts:108] [E: packages/coding-agent/src/core/auth-storage.ts:114] [E: packages/coding-agent/src/core/auth-storage.ts:115] [E: packages/coding-agent/src/core/auth-storage.ts:116] [E: packages/coding-agent/src/core/auth-storage.ts:118] [E: packages/coding-agent/src/core/auth-storage.ts:122]。
4. `withLockAsync()` uses async `proper-lockfile.lock()` with retry/backoff, stale timeout, and `onCompromised`; it checks the compromised flag before reading, before writing, and before returning [E: packages/coding-agent/src/core/auth-storage.ts:129] [E: packages/coding-agent/src/core/auth-storage.ts:143] [E: packages/coding-agent/src/core/auth-storage.ts:145] [E: packages/coding-agent/src/core/auth-storage.ts:151] [E: packages/coding-agent/src/core/auth-storage.ts:152] [E: packages/coding-agent/src/core/auth-storage.ts:158] [E: packages/coding-agent/src/core/auth-storage.ts:161] [E: packages/coding-agent/src/core/auth-storage.ts:166]。
5. `AuthStorage` constructor calls `reload()` immediately; `reload()` reads the backend under lock, parses JSON into `data`, clears `loadError` on success, or records the error on failure [E: packages/coding-agent/src/core/auth-storage.ts:210] [E: packages/coding-agent/src/core/auth-storage.ts:212] [E: packages/coding-agent/src/core/auth-storage.ts:259] [E: packages/coding-agent/src/core/auth-storage.ts:262] [E: packages/coding-agent/src/core/auth-storage.ts:266] [E: packages/coding-agent/src/core/auth-storage.ts:267] [E: packages/coding-agent/src/core/auth-storage.ts:269]。
6. `set(provider, credential)` updates in-memory `data` and persists a merged provider change; `remove(provider)` deletes the key and persists deletion [E: packages/coding-agent/src/core/auth-storage.ts:313] [E: packages/coding-agent/src/core/auth-storage.ts:314] [E: packages/coding-agent/src/core/auth-storage.ts:315] [E: packages/coding-agent/src/core/auth-storage.ts:321] [E: packages/coding-agent/src/core/auth-storage.ts:322] [E: packages/coding-agent/src/core/auth-storage.ts:323]。
7. `persistProviderChange()` refuses to write while `loadError` is set, otherwise it rereads current storage under lock, merges or deletes only the targeted provider, and writes pretty JSON [E: packages/coding-agent/src/core/auth-storage.ts:274] [E: packages/coding-agent/src/core/auth-storage.ts:275] [E: packages/coding-agent/src/core/auth-storage.ts:280] [E: packages/coding-agent/src/core/auth-storage.ts:281] [E: packages/coding-agent/src/core/auth-storage.ts:282] [E: packages/coding-agent/src/core/auth-storage.ts:284] [E: packages/coding-agent/src/core/auth-storage.ts:286] [E: packages/coding-agent/src/core/auth-storage.ts:288]。

## API key 解析优先级

`setRuntimeApiKey(provider, apiKey)` only writes the in-memory `runtimeOverrides` map, and `removeRuntimeApiKey()` removes that map entry; neither method calls the backend writer, so CLI `--api-key` is non-persisted by this class [E: packages/coding-agent/src/core/auth-storage.ts:233] [E: packages/coding-agent/src/core/auth-storage.ts:234] [E: packages/coding-agent/src/core/auth-storage.ts:240] [E: packages/coding-agent/src/core/auth-storage.ts:241]。

`getApiKey(providerId, options)` first returns a runtime override when `runtimeOverrides.get(providerId)` yields a value, then resolves a stored API key credential with `resolveConfigValue(cred.key, cred.env)`, then handles stored OAuth credentials, and only after those paths falls back to environment variables unless `includeFallback === false` [E: packages/coding-agent/src/core/auth-storage.ts:462] [E: packages/coding-agent/src/core/auth-storage.ts:464] [E: packages/coding-agent/src/core/auth-storage.ts:465] [E: packages/coding-agent/src/core/auth-storage.ts:471] [E: packages/coding-agent/src/core/auth-storage.ts:472] [E: packages/coding-agent/src/core/auth-storage.ts:475] [E: packages/coding-agent/src/core/auth-storage.ts:513] [E: packages/coding-agent/src/core/auth-storage.ts:516]。

For availability checks, `hasAuth(provider)` is non-refreshing: it returns true for runtime override, any stored credential, or `getEnvApiKey(provider)` [E: packages/coding-agent/src/core/auth-storage.ts:344] [E: packages/coding-agent/src/core/auth-storage.ts:345] [E: packages/coding-agent/src/core/auth-storage.ts:346] [E: packages/coding-agent/src/core/auth-storage.ts:347]。

For status display, `getAuthStatus(provider)` reports stored credentials as `{ configured: true, source: "stored" }`, runtime override as `{ configured: false, source: "runtime", label: "--api-key" }`, first matching environment variable name as `{ configured: false, source: "environment", label }`, or `{ configured: false }` [E: packages/coding-agent/src/core/auth-storage.ts:354] [E: packages/coding-agent/src/core/auth-storage.ts:355] [E: packages/coding-agent/src/core/auth-storage.ts:356] [E: packages/coding-agent/src/core/auth-storage.ts:359] [E: packages/coding-agent/src/core/auth-storage.ts:360] [E: packages/coding-agent/src/core/auth-storage.ts:363] [E: packages/coding-agent/src/core/auth-storage.ts:365] [E: packages/coding-agent/src/core/auth-storage.ts:368]。

Runtime/environment statuses mark `configured: false` even though `hasAuth()` may treat them as usable auth; this looks like a display distinction between persisted credential and transient/fallback source, but the source files do not document the intended UI semantics [I]。

## OAuth login, logout, and refresh

`login(providerId, callbacks)` looks up a registered OAuth provider, throws for an unknown provider id, calls provider-specific `login(callbacks)`, then stores `{ type: "oauth", ...credentials }` under that provider id [E: packages/coding-agent/src/core/auth-storage.ts:387] [E: packages/coding-agent/src/core/auth-storage.ts:388] [E: packages/coding-agent/src/core/auth-storage.ts:390] [E: packages/coding-agent/src/core/auth-storage.ts:393] [E: packages/coding-agent/src/core/auth-storage.ts:394]。

`logout(provider)` is a thin alias over `remove(provider)`, so it removes whichever credential type is stored for that provider [E: packages/coding-agent/src/core/auth-storage.ts:400] [E: packages/coding-agent/src/core/auth-storage.ts:401]。

When `getApiKey()` sees an OAuth credential, it returns undefined for an unknown OAuth provider; for a known provider, it compares `Date.now()` with `cred.expires`, returns the provider API key directly when still valid, or calls `refreshOAuthTokenWithLock()` when expired [E: packages/coding-agent/src/core/auth-storage.ts:475] [E: packages/coding-agent/src/core/auth-storage.ts:476] [E: packages/coding-agent/src/core/auth-storage.ts:477] [E: packages/coding-agent/src/core/auth-storage.ts:483] [E: packages/coding-agent/src/core/auth-storage.ts:485] [E: packages/coding-agent/src/core/auth-storage.ts:488] [E: packages/coding-agent/src/core/auth-storage.ts:509]。

`refreshOAuthTokenWithLock()` rereads current storage inside an async lock, updates `this.data` to match file state, skips refresh when the current credential is no longer OAuth, returns an already-valid token if another process refreshed first, or builds an OAuth credential map and calls `getOAuthApiKey()` [E: packages/coding-agent/src/core/auth-storage.ts:416] [E: packages/coding-agent/src/core/auth-storage.ts:417] [E: packages/coding-agent/src/core/auth-storage.ts:418] [E: packages/coding-agent/src/core/auth-storage.ts:421] [E: packages/coding-agent/src/core/auth-storage.ts:422] [E: packages/coding-agent/src/core/auth-storage.ts:426] [E: packages/coding-agent/src/core/auth-storage.ts:437]。

On successful refresh, `refreshOAuthTokenWithLock()` merges new credentials into `AuthStorageData`, updates `this.data`, clears `loadError`, and returns `next` JSON for the backend to persist under the same lock [E: packages/coding-agent/src/core/auth-storage.ts:442] [E: packages/coding-agent/src/core/auth-storage.ts:444] [E: packages/coding-agent/src/core/auth-storage.ts:446] [E: packages/coding-agent/src/core/auth-storage.ts:447] [E: packages/coding-agent/src/core/auth-storage.ts:448]。

If refresh throws, `getApiKey()` records the error, reloads storage, returns another process's freshly valid token if present, and otherwise returns undefined while preserving credentials for retry [E: packages/coding-agent/src/core/auth-storage.ts:492] [E: packages/coding-agent/src/core/auth-storage.ts:493] [E: packages/coding-agent/src/core/auth-storage.ts:495] [E: packages/coding-agent/src/core/auth-storage.ts:498] [E: packages/coding-agent/src/core/auth-storage.ts:500] [E: packages/coding-agent/src/core/auth-storage.ts:505]。

## 登录提示与错误文案

`getProviderLoginHelp()` tells users to use `/login` and points at `providers.md` and `models.md`; every formatter in `auth-guidance.ts` embeds this same help string [E: packages/coding-agent/src/core/auth-guidance.ts:6] [E: packages/coding-agent/src/core/auth-guidance.ts:8] [E: packages/coding-agent/src/core/auth-guidance.ts:9] [E: packages/coding-agent/src/core/auth-guidance.ts:10]。

`formatNoModelsAvailableMessage()` prepends `No models available.`, `formatNoModelSelectedMessage()` adds `Then use /model to select a model.`, and `formatNoApiKeyFoundMessage(provider)` substitutes `the selected model` when provider is `"unknown"` [E: packages/coding-agent/src/core/auth-guidance.ts:14] [E: packages/coding-agent/src/core/auth-guidance.ts:15] [E: packages/coding-agent/src/core/auth-guidance.ts:18] [E: packages/coding-agent/src/core/auth-guidance.ts:19] [E: packages/coding-agent/src/core/auth-guidance.ts:22] [E: packages/coding-agent/src/core/auth-guidance.ts:23] [E: packages/coding-agent/src/core/auth-guidance.ts:24]。

## Gotcha

- `reload()` and `persistProviderChange()` catch malformed JSON or backend errors and record them instead of throwing to the caller; callers that need diagnostics must read `drainErrors()` [E: packages/coding-agent/src/core/auth-storage.ts:268] [E: packages/coding-agent/src/core/auth-storage.ts:270] [E: packages/coding-agent/src/core/auth-storage.ts:290] [E: packages/coding-agent/src/core/auth-storage.ts:291] [E: packages/coding-agent/src/core/auth-storage.ts:378]。
- `get(provider)`, `list()`, `has()`, and `getAll()` read the in-memory `data` snapshot; `reload()` is the operation that refreshes the snapshot from backend storage [E: packages/coding-agent/src/core/auth-storage.ts:298] [E: packages/coding-agent/src/core/auth-storage.ts:329] [E: packages/coding-agent/src/core/auth-storage.ts:336] [E: packages/coding-agent/src/core/auth-storage.ts:374] [E: packages/coding-agent/src/core/auth-storage.ts:259]。
- `getProviderEnv(provider)` returns a shallow copy of env only for stored API key credentials; OAuth credentials and runtime overrides do not contribute provider env through this method [E: packages/coding-agent/src/core/auth-storage.ts:305] [E: packages/coding-agent/src/core/auth-storage.ts:306] [E: packages/coding-agent/src/core/auth-storage.ts:307]。
- Sync lock retry uses a busy wait loop for 20 ms between `ELOCKED` attempts, which keeps sync callers sync but can block the event loop during contention [E: packages/coding-agent/src/core/auth-storage.ts:81] [E: packages/coding-agent/src/core/auth-storage.ts:86] [E: packages/coding-agent/src/core/auth-storage.ts:94] [E: packages/coding-agent/src/core/auth-storage.ts:98] [E: packages/coding-agent/src/core/auth-storage.ts:99] [I]。
- `AuthStorage.getOAuthProviders()` returns the imported `getOAuthProviders()` helper from `pi-ai` [E: packages/coding-agent/src/core/auth-storage.ts:16] [E: packages/coding-agent/src/core/auth-storage.ts:525] [E: packages/coding-agent/src/core/auth-storage.ts:526]。

## 跨包边界

`surface.providers.auth` covers the user-visible provider auth surface: CLI/login flows decide when users authenticate, while this node covers the local credential store and retrieval primitives used by those flows [I]。

[subsys.coding-agent.model-registry](model-registry.md) consumes `AuthStorage` for model availability and request auth: it calls `hasAuth()`, `getAuthStatus()`, `getProviderEnv()`, and `getApiKey()` rather than reading `auth.json` itself [E: packages/coding-agent/src/core/auth-storage.ts:344] [E: packages/coding-agent/src/core/auth-storage.ts:354] [E: packages/coding-agent/src/core/auth-storage.ts:305] [E: packages/coding-agent/src/core/auth-storage.ts:462] [I]。

The `pi-ai` layer owns provider-specific environment lookup and OAuth provider mechanics via `findEnvKeys()`, `getEnvApiKey()`, `getOAuthProvider()`, `getOAuthProviders()`, and `getOAuthApiKey()`; coding-agent's `AuthStorage` orchestrates those helpers with product-local storage policy [E: packages/coding-agent/src/core/auth-storage.ts:9] [E: packages/coding-agent/src/core/auth-storage.ts:16] [I]。

## Sources

- packages/coding-agent/src/core/auth-storage.ts
- packages/coding-agent/src/core/auth-guidance.ts

## 相关

- `surface.providers.auth`: provider 登录、OAuth/API key surface 和用户入口; 该节点文件当前未落盘, 因此这里保留 index id 而不创建 markdown 链接。
- [subsys.coding-agent.model-registry](model-registry.md): model registry 读取 `AuthStorage` 来过滤 available models, 解析 request API key/header, 并呈现 provider auth status。
