---
id: subsys.ai.oauth-flow
title: OAuth 登录流程
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/utils/oauth/index.ts
  - packages/ai/src/utils/oauth/device-code.ts
  - packages/ai/src/utils/oauth/pkce.ts
symbols:
  - getOAuthProvider
  - pollOAuthDeviceCodeFlow
  - generatePKCE
related:
  - surface.providers.auth
  - subsys.ai.auth-resolution
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.ai.oauth-flow` covers the `pi-ai` legacy OAuth provider registry plus two provider-neutral helpers: device-code polling and PKCE verifier/challenge generation.

## 能回答的问题

- `getOAuthProvider()` 从哪里找到 Anthropic、GitHub Copilot、OpenAI Codex 的 legacy OAuth provider?
- legacy OAuth provider registry 如何注册、注销、重置和列出 provider?
- device-code polling helper 如何处理 `pending`、`slow_down`、`failed`、取消和超时?
- PKCE verifier 与 challenge 如何生成?
- 本节点和 `subsys.ai.auth-resolution` 的边界在哪里?

## 职责边界

`packages/ai/src/utils/oauth/index.ts` is the legacy/high-level OAuth provider registry. It re-exports provider-specific OAuth modules for Anthropic, GitHub Copilot and OpenAI Codex, then builds an in-memory registry from their provider objects [E: packages/ai/src/utils/oauth/index.ts:11] [E: packages/ai/src/utils/oauth/index.ts:14] [E: packages/ai/src/utils/oauth/index.ts:22] [E: packages/ai/src/utils/oauth/index.ts:42] [E: packages/ai/src/utils/oauth/index.ts:43] [E: packages/ai/src/utils/oauth/index.ts:44] [E: packages/ai/src/utils/oauth/index.ts:45].

`packages/ai/src/utils/oauth/device-code.ts` is a generic polling loop. Its options contain caller-supplied `poll()`, optional `intervalSeconds`, optional `expiresInSeconds`, and optional `AbortSignal`; the helper itself has no provider endpoint or provider id parameter [E: packages/ai/src/utils/oauth/device-code.ts:18] [E: packages/ai/src/utils/oauth/device-code.ts:19] [E: packages/ai/src/utils/oauth/device-code.ts:20] [E: packages/ai/src/utils/oauth/device-code.ts:21] [E: packages/ai/src/utils/oauth/device-code.ts:22] [I].

`packages/ai/src/utils/oauth/pkce.ts` is a generic PKCE helper. It creates a random verifier, hashes that verifier with SHA-256, encodes both byte sequences as base64url strings, and returns `{ verifier, challenge }` [E: packages/ai/src/utils/oauth/pkce.ts:21] [E: packages/ai/src/utils/oauth/pkce.ts:23] [E: packages/ai/src/utils/oauth/pkce.ts:24] [E: packages/ai/src/utils/oauth/pkce.ts:25] [E: packages/ai/src/utils/oauth/pkce.ts:28] [E: packages/ai/src/utils/oauth/pkce.ts:29] [E: packages/ai/src/utils/oauth/pkce.ts:30] [E: packages/ai/src/utils/oauth/pkce.ts:31] [E: packages/ai/src/utils/oauth/pkce.ts:33].

This node does not directly verify the newer runtime `OAuthAuth` contract or credential-store locking path, because those are outside this node's source list. It treats `subsys.ai.auth-resolution` as the related node for stored credential precedence, locked refresh, and request auth derivation [I].

## 关键文件

- `packages/ai/src/utils/oauth/index.ts`: provider module re-exports, built-in provider registry, custom register/unregister/reset/list helpers, and deprecated high-level refresh/key wrappers [E: packages/ai/src/utils/oauth/index.ts:11] [E: packages/ai/src/utils/oauth/index.ts:31] [E: packages/ai/src/utils/oauth/index.ts:42] [E: packages/ai/src/utils/oauth/index.ts:55] [E: packages/ai/src/utils/oauth/index.ts:62] [E: packages/ai/src/utils/oauth/index.ts:72] [E: packages/ai/src/utils/oauth/index.ts:84] [E: packages/ai/src/utils/oauth/index.ts:94] [E: packages/ai/src/utils/oauth/index.ts:117] [E: packages/ai/src/utils/oauth/index.ts:135].
- `packages/ai/src/utils/oauth/device-code.ts`: device-code poll result union, poll options, abortable sleep, and `pollOAuthDeviceCodeFlow()` [E: packages/ai/src/utils/oauth/device-code.ts:11] [E: packages/ai/src/utils/oauth/device-code.ts:16] [E: packages/ai/src/utils/oauth/device-code.ts:18] [E: packages/ai/src/utils/oauth/device-code.ts:25] [E: packages/ai/src/utils/oauth/device-code.ts:45].
- `packages/ai/src/utils/oauth/pkce.ts`: base64url encoding helper and `generatePKCE()` [E: packages/ai/src/utils/oauth/pkce.ts:9] [E: packages/ai/src/utils/oauth/pkce.ts:14] [E: packages/ai/src/utils/oauth/pkce.ts:21].

## OAuth provider lookup

`BUILT_IN_OAUTH_PROVIDERS` contains exactly the three imported provider objects `anthropicOAuthProvider`, `githubCopilotOAuthProvider`, and `openaiCodexOAuthProvider` [E: packages/ai/src/utils/oauth/index.ts:37] [E: packages/ai/src/utils/oauth/index.ts:38] [E: packages/ai/src/utils/oauth/index.ts:39] [E: packages/ai/src/utils/oauth/index.ts:42] [E: packages/ai/src/utils/oauth/index.ts:43] [E: packages/ai/src/utils/oauth/index.ts:44] [E: packages/ai/src/utils/oauth/index.ts:45].

`oauthProviderRegistry` is a `Map<string, OAuthProviderInterface>` whose initial entries are `[provider.id, provider]` pairs from `BUILT_IN_OAUTH_PROVIDERS` [E: packages/ai/src/utils/oauth/index.ts:48] [E: packages/ai/src/utils/oauth/index.ts:49].

`getOAuthProvider(id)` only returns `oauthProviderRegistry.get(id)`. Unknown ids therefore return the normal `Map.get()` miss value, and this function does not perform login, credential reads, or dynamic provider loading [E: packages/ai/src/utils/oauth/index.ts:55] [E: packages/ai/src/utils/oauth/index.ts:56] [I].

`registerOAuthProvider(provider)` upserts a registry entry under `provider.id` [E: packages/ai/src/utils/oauth/index.ts:62] [E: packages/ai/src/utils/oauth/index.ts:63].

`unregisterOAuthProvider(id)` searches the built-in provider array first. If the id is built in, it restores that built-in object in the registry; otherwise it deletes the id from the registry [E: packages/ai/src/utils/oauth/index.ts:72] [E: packages/ai/src/utils/oauth/index.ts:73] [E: packages/ai/src/utils/oauth/index.ts:74] [E: packages/ai/src/utils/oauth/index.ts:75] [E: packages/ai/src/utils/oauth/index.ts:78].

`resetOAuthProviders()` clears the registry and re-adds all built-ins; `getOAuthProviders()` returns `Array.from(oauthProviderRegistry.values())`, so registered custom providers remain listable until unregister or reset changes the map [E: packages/ai/src/utils/oauth/index.ts:84] [E: packages/ai/src/utils/oauth/index.ts:85] [E: packages/ai/src/utils/oauth/index.ts:86] [E: packages/ai/src/utils/oauth/index.ts:87] [E: packages/ai/src/utils/oauth/index.ts:94] [E: packages/ai/src/utils/oauth/index.ts:95] [I].

## Device-code flow

`OAuthDeviceCodePollResult<T>` has four statuses: `pending`, `slow_down`, `failed`, and `complete`. `failed` carries `message`; `complete` carries `value` [E: packages/ai/src/utils/oauth/device-code.ts:11] [E: packages/ai/src/utils/oauth/device-code.ts:12] [E: packages/ai/src/utils/oauth/device-code.ts:13] [E: packages/ai/src/utils/oauth/device-code.ts:14] [E: packages/ai/src/utils/oauth/device-code.ts:16].

The polling deadline is `Date.now() + expiresInSeconds * 1000` when `expiresInSeconds` is numeric; otherwise the deadline is `Number.POSITIVE_INFINITY` [E: packages/ai/src/utils/oauth/device-code.ts:46] [E: packages/ai/src/utils/oauth/device-code.ts:47] [E: packages/ai/src/utils/oauth/device-code.ts:48] [E: packages/ai/src/utils/oauth/device-code.ts:49].

The initial poll interval is `Math.floor((options.intervalSeconds ?? DEFAULT_POLL_INTERVAL_SECONDS) * 1000)` capped to at least `MINIMUM_INTERVAL_MS`; the constants are 5 seconds default and 1000 ms minimum [E: packages/ai/src/utils/oauth/device-code.ts:5] [E: packages/ai/src/utils/oauth/device-code.ts:7] [E: packages/ai/src/utils/oauth/device-code.ts:50] [E: packages/ai/src/utils/oauth/device-code.ts:51] [E: packages/ai/src/utils/oauth/device-code.ts:52].

Each loop iteration first checks `options.signal?.aborted`, then calls `options.poll()`. `complete` returns the value, `failed` throws the supplied message, and `slow_down` increments a counter and adds 5000 ms to current and later sleeps [E: packages/ai/src/utils/oauth/device-code.ts:56] [E: packages/ai/src/utils/oauth/device-code.ts:57] [E: packages/ai/src/utils/oauth/device-code.ts:58] [E: packages/ai/src/utils/oauth/device-code.ts:61] [E: packages/ai/src/utils/oauth/device-code.ts:62] [E: packages/ai/src/utils/oauth/device-code.ts:63] [E: packages/ai/src/utils/oauth/device-code.ts:65] [E: packages/ai/src/utils/oauth/device-code.ts:66] [E: packages/ai/src/utils/oauth/device-code.ts:68] [E: packages/ai/src/utils/oauth/device-code.ts:69] [E: packages/ai/src/utils/oauth/device-code.ts:71].

Sleep is abortable. `abortableSleep()` rejects with `"Login cancelled"` if the signal is already aborted or aborts before timeout resolution, clears the timeout on abort, and removes the abort listener when the timeout resolves normally [E: packages/ai/src/utils/oauth/device-code.ts:1] [E: packages/ai/src/utils/oauth/device-code.ts:25] [E: packages/ai/src/utils/oauth/device-code.ts:27] [E: packages/ai/src/utils/oauth/device-code.ts:28] [E: packages/ai/src/utils/oauth/device-code.ts:32] [E: packages/ai/src/utils/oauth/device-code.ts:33] [E: packages/ai/src/utils/oauth/device-code.ts:34] [E: packages/ai/src/utils/oauth/device-code.ts:36] [E: packages/ai/src/utils/oauth/device-code.ts:37] [E: packages/ai/src/utils/oauth/device-code.ts:41].

When the loop exits by timeout, the thrown message depends on whether any `slow_down` response was seen: no slow-down uses `"Device flow timed out"`; one or more slow-down responses uses the longer clock-drift hint [E: packages/ai/src/utils/oauth/device-code.ts:2] [E: packages/ai/src/utils/oauth/device-code.ts:3] [E: packages/ai/src/utils/oauth/device-code.ts:4] [E: packages/ai/src/utils/oauth/device-code.ts:55] [E: packages/ai/src/utils/oauth/device-code.ts:82].

## PKCE helper

`base64urlEncode(bytes)` builds a binary string from the bytes, calls `btoa(binary)`, replaces `+` with `-`, replaces `/` with `_`, and removes `=` padding [E: packages/ai/src/utils/oauth/pkce.ts:9] [E: packages/ai/src/utils/oauth/pkce.ts:10] [E: packages/ai/src/utils/oauth/pkce.ts:11] [E: packages/ai/src/utils/oauth/pkce.ts:12] [E: packages/ai/src/utils/oauth/pkce.ts:14].

`generatePKCE()` allocates 32 random bytes, fills them with `crypto.getRandomValues()`, and base64url-encodes those bytes as the verifier [E: packages/ai/src/utils/oauth/pkce.ts:21] [E: packages/ai/src/utils/oauth/pkce.ts:23] [E: packages/ai/src/utils/oauth/pkce.ts:24] [E: packages/ai/src/utils/oauth/pkce.ts:25].

The challenge is `base64urlEncode(new Uint8Array(hashBuffer))` where `hashBuffer` comes from `crypto.subtle.digest("SHA-256", encoder.encode(verifier))` [E: packages/ai/src/utils/oauth/pkce.ts:28] [E: packages/ai/src/utils/oauth/pkce.ts:29] [E: packages/ai/src/utils/oauth/pkce.ts:30] [E: packages/ai/src/utils/oauth/pkce.ts:31].

The helper depends on global `btoa`, `crypto.getRandomValues`, `crypto.subtle.digest`, and `TextEncoder`; this file has no fallback implementation for runtimes that lack those globals [E: packages/ai/src/utils/oauth/pkce.ts:10] [E: packages/ai/src/utils/oauth/pkce.ts:14] [E: packages/ai/src/utils/oauth/pkce.ts:24] [E: packages/ai/src/utils/oauth/pkce.ts:28] [E: packages/ai/src/utils/oauth/pkce.ts:30] [I].

## Token refresh and key wrapper

`refreshOAuthToken(providerId, credentials)` is a deprecated high-level wrapper. It looks up the provider with `getOAuthProvider(providerId)`, throws `Unknown OAuth provider: ${providerId}` when missing, and otherwise delegates to `provider.refreshToken(credentials)` [E: packages/ai/src/utils/oauth/index.ts:117] [E: packages/ai/src/utils/oauth/index.ts:121] [E: packages/ai/src/utils/oauth/index.ts:122] [E: packages/ai/src/utils/oauth/index.ts:123] [E: packages/ai/src/utils/oauth/index.ts:125].

`getOAuthApiKey(providerId, credentials)` is a deprecated high-level token-to-key wrapper. It looks up the provider, reads `credentials[providerId]`, returns `null` for missing credentials, refreshes when `Date.now() >= creds.expires`, then returns `{ newCredentials: creds, apiKey }` after `provider.getApiKey(creds)` [E: packages/ai/src/utils/oauth/index.ts:135] [E: packages/ai/src/utils/oauth/index.ts:139] [E: packages/ai/src/utils/oauth/index.ts:144] [E: packages/ai/src/utils/oauth/index.ts:145] [E: packages/ai/src/utils/oauth/index.ts:146] [E: packages/ai/src/utils/oauth/index.ts:150] [E: packages/ai/src/utils/oauth/index.ts:152] [E: packages/ai/src/utils/oauth/index.ts:158] [E: packages/ai/src/utils/oauth/index.ts:159].

`getOAuthApiKey()` catches any refresh error and throws a new generic `Failed to refresh OAuth token for ${providerId}` error, so provider-specific refresh details are not preserved by this wrapper [E: packages/ai/src/utils/oauth/index.ts:150] [E: packages/ai/src/utils/oauth/index.ts:151] [E: packages/ai/src/utils/oauth/index.ts:152] [E: packages/ai/src/utils/oauth/index.ts:153] [E: packages/ai/src/utils/oauth/index.ts:154] [I].

## 设计动机与权衡

The registry and helpers are provider-neutral at their public boundary: registry operations accept provider ids or provider objects, device-code polling accepts a caller-supplied poll function, and PKCE returns only verifier/challenge material. Endpoint-specific request and response parsing is left to provider modules re-exported from `index.ts` [E: packages/ai/src/utils/oauth/index.ts:11] [E: packages/ai/src/utils/oauth/index.ts:14] [E: packages/ai/src/utils/oauth/index.ts:22] [E: packages/ai/src/utils/oauth/index.ts:55] [E: packages/ai/src/utils/oauth/index.ts:62] [E: packages/ai/src/utils/oauth/device-code.ts:21] [E: packages/ai/src/utils/oauth/pkce.ts:33] [I].

The deprecated wrappers still expose the legacy "OAuth credentials to API key" path, while the related auth-resolution node should own the newer runtime request-auth path [E: packages/ai/src/utils/oauth/index.ts:117] [E: packages/ai/src/utils/oauth/index.ts:135] [I].

## Gotcha

- `getOAuthProvider()` and `getOAuthProviders()` operate on this module-local legacy registry, not on a visible provider collection in these three files [E: packages/ai/src/utils/oauth/index.ts:48] [E: packages/ai/src/utils/oauth/index.ts:55] [E: packages/ai/src/utils/oauth/index.ts:94] [I].
- `getOAuthApiKey()` performs refresh directly through the legacy provider object; this source window does not show credential-store locking around that refresh [E: packages/ai/src/utils/oauth/index.ts:150] [E: packages/ai/src/utils/oauth/index.ts:152] [I].
- A `slow_down` response changes subsequent polling cadence by increasing `intervalMs`; timeout after any slow-down uses the special slow-down timeout message [E: packages/ai/src/utils/oauth/device-code.ts:68] [E: packages/ai/src/utils/oauth/device-code.ts:69] [E: packages/ai/src/utils/oauth/device-code.ts:71] [E: packages/ai/src/utils/oauth/device-code.ts:82].
- `generatePKCE()` uses Web Crypto and `btoa` globals directly; there is no fallback path inside `pkce.ts` [E: packages/ai/src/utils/oauth/pkce.ts:14] [E: packages/ai/src/utils/oauth/pkce.ts:24] [E: packages/ai/src/utils/oauth/pkce.ts:30] [I].

## 跨包边界

[surface.providers.auth](../../surface/providers/auth.md) should describe user-visible login/auth commands and interactions; this node only verifies the lower-level registry and generic OAuth helpers present in `packages/ai/src/utils/oauth/*` [I].

[subsys.ai.auth-resolution](auth-resolution.md) should describe stored credential precedence, locked refresh, and request auth derivation; this node only verifies the legacy registry, device-code polling helper, and PKCE helper in the three source files listed here [I].

## Sources

- packages/ai/src/utils/oauth/index.ts
- packages/ai/src/utils/oauth/device-code.ts
- packages/ai/src/utils/oauth/pkce.ts

## 相关

- [surface.providers.auth](../../surface/providers/auth.md): provider 登录、认证入口和用户可见 OAuth/api-key 交互。
- [subsys.ai.auth-resolution](auth-resolution.md): stored credential precedence、OAuth refresh locking and request auth derivation.
