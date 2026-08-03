---
id: subsys.ai.oauth-flow
title: OAuth 登录流程
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/oauth.ts
  - packages/ai/src/auth/oauth/load.ts
  - packages/ai/src/auth/oauth/device-code.ts
  - packages/ai/src/auth/oauth/pkce.ts
  - packages/ai/src/auth/oauth/kimi-coding.ts
  - packages/ai/src/auth/oauth/openrouter.ts
  - packages/ai/src/bun-oauth.ts
  - packages/ai/src/providers/anthropic.ts
  - packages/ai/src/providers/openai-codex.ts
  - packages/ai/src/providers/kimi-coding.ts
  - packages/ai/src/providers/openrouter.ts
  - packages/ai/package.json
symbols:
  - loadAnthropicOAuth
  - loadOpenAICodexOAuth
  - loadKimiCodingOAuth
  - loadOpenRouterOAuth
  - registerBundledOAuthFlowLoaders
  - pollOAuthDeviceCodeFlow
  - generatePKCE
related:
  - surface.providers.auth
  - subsys.ai.auth-resolution
evidence: explicit
status: verified
updated: c1019d9202
---

> `subsys.ai.oauth-flow` 描述当前 `pi-ai` OAuth 实现入口：provider 按需加载 flow，standalone Bun 注入静态 flow，公共 `./oauth` subpath 仅保留 coding-agent extension 的类型兼容面。

## 能回答的问题

- 被删除的 `packages/ai/src/utils/oauth/index.ts` 由什么入口取代?
- 普通 Node/bundler 与 standalone Bun 如何加载同一组 OAuth flow?
- device-code polling 如何处理首次等待、`slow_down`、取消和超时?
- PKCE verifier/challenge 如何生成?
- `@earendil-works/pi-ai/oauth` 现在导出实现还是只导出类型?

## 搬家后的入口边界

旧 `packages/ai/src/utils/oauth/index.ts` 的全局 registry、`getOAuthProvider()` 与 deprecated token wrapper 已删除；当前 OAuth 实现没有新的同形 `index.ts`。内部实现入口是 `packages/ai/src/auth/oauth/load.ts`：它定义 Anthropic、OpenAI Codex、GitHub Copilot、OpenRouter、Kimi Coding、xAI 与 Radius 的 lazy loader，并统一返回 `OAuthAuth` contract [E: packages/ai/src/auth/oauth/load.ts:14] [E: packages/ai/src/auth/oauth/load.ts:21] [E: packages/ai/src/auth/oauth/load.ts:33] [E: packages/ai/src/auth/oauth/load.ts:67]。

公共 package subpath `./oauth` 仍存在于 exports map [E: packages/ai/package.json:30]，但对应 `src/oauth.ts` 只 `export type` coding-agent extension compatibility declarations；它不再重导出 OAuth flow 实现、registry 或 helpers [E: packages/ai/src/oauth.ts:2] [E: packages/ai/src/oauth.ts:10]。因此“被删 `index.ts` 的新入口”要分成两层理解：应用内部 flow 加载走 `auth/oauth/load.ts`，外部 `@earendil-works/pi-ai/oauth` 只是 type-only compatibility entry。

provider factory 自己声明 OAuth 能力并绑定 loader。除 Anthropic/OpenAI Codex 外，Kimi 与 OpenRouter 现在也同时提供 API-key 与 lazy OAuth method。[E: packages/ai/src/providers/kimi-coding.ts:12] [E: packages/ai/src/providers/kimi-coding.ts:14] [E: packages/ai/src/providers/openrouter.ts:12] [E: packages/ai/src/providers/openrouter.ts:14]

## 新增 Kimi 与 OpenRouter flow

Kimi Code 使用 RFC 8628 device authorization：默认 host 为 `https://auth.kimi.com`，可由 provider env 覆盖；授权与 token polling 都使用 JSON/form 请求，成功 credential 携带 access/refresh/expiry。[E: packages/ai/src/auth/oauth/kimi-coding.ts:9] [E: packages/ai/src/auth/oauth/kimi-coding.ts:13] [E: packages/ai/src/auth/oauth/kimi-coding.ts:35] [E: packages/ai/src/auth/oauth/kimi-coding.ts:69] [E: packages/ai/src/auth/oauth/kimi-coding.ts:119] [E: packages/ai/src/auth/oauth/kimi-coding.ts:141]

OpenRouter 使用 PKCE 与单次 loopback HTTP callback；它把 authorization code 换成长期 API key，并保存为 `type: "oauth"`、空 refresh、`Number.MAX_SAFE_INTEGER` expiry。callback host 默认 `127.0.0.1`，可由 `PI_OAUTH_CALLBACK_HOST` 覆盖。[E: packages/ai/src/auth/oauth/openrouter.ts:14] [E: packages/ai/src/auth/oauth/openrouter.ts:20] [E: packages/ai/src/auth/oauth/openrouter.ts:25] [E: packages/ai/src/auth/oauth/openrouter.ts:80] [E: packages/ai/src/auth/oauth/openrouter.ts:123] [E: packages/ai/src/auth/oauth/openrouter.ts:127] [E: packages/ai/src/auth/oauth/openrouter.ts:242]

OpenRouter 登录同时启动 loopback callback 等待与 `manual_code` prompt；用户可粘贴裸 authorization code 或最终 redirect URL。两条路径竞争同一个登录结果：manual input 会取消未 claimed 的 callback wait，成功 callback 则返回 credential；`finally` 同时 abort manual prompt 并关闭 callback server，因此 remote/headless browser 不必能回连运行 pi 的机器。[E: packages/ai/src/auth/oauth/openrouter.ts:242] [E: packages/ai/src/auth/oauth/openrouter.ts:245] [E: packages/ai/src/auth/oauth/openrouter.ts:262] [E: packages/ai/src/auth/oauth/openrouter.ts:269] [E: packages/ai/src/auth/oauth/openrouter.ts:278] [E: packages/ai/src/auth/oauth/openrouter.ts:285] [E: packages/ai/src/auth/oauth/openrouter.ts:291] [E: packages/ai/src/auth/oauth/openrouter.ts:294] [E: packages/ai/src/auth/oauth/openrouter.ts:295]

## Lazy flow 与 standalone Bun

普通运行时通过 variable specifier 调用 dynamic `import()`；loader 在源 `.ts` 与构建后 `.js` 之间重写后缀，使 bundler 不必静态追入依赖 `node:http` / `node:crypto` 的 flow 实现 [E: packages/ai/src/auth/oauth/load.ts:9] [E: packages/ai/src/auth/oauth/load.ts:10] [E: packages/ai/src/auth/oauth/load.ts:11]。

每个 `load*OAuth()` 先检查 module-local `bundledLoaders`：存在时调用已注册函数，否则动态 import 对应实现并取出 `OAuthAuth` object [E: packages/ai/src/auth/oauth/load.ts:24] [E: packages/ai/src/auth/oauth/load.ts:27] [E: packages/ai/src/auth/oauth/load.ts:32] [E: packages/ai/src/auth/oauth/load.ts:31] [E: packages/ai/src/auth/oauth/load.ts:37] [E: packages/ai/src/auth/oauth/load.ts:38]。

standalone Bun 不能依赖这些 flow 在运行时仍是可发现 chunk，所以 `registerBunOAuthFlows()` 静态导入七组实现并调用 `registerBundledOAuthFlowLoaders()`；Radius 以 factory 接受 `{name, gateway}`，其余 loader 返回固定 `OAuthAuth` object [E: packages/ai/src/bun-oauth.ts:1] [E: packages/ai/src/bun-oauth.ts:8] [E: packages/ai/src/bun-oauth.ts:11] [E: packages/ai/src/bun-oauth.ts:19]。package exports 为该 bundle bridge 提供独立 `./bun-oauth` subpath [E: packages/ai/package.json:38]。

## Device-code polling

`OAuthDeviceCodePollResult<T>` 的非终态是 `pending` 或带可选 server interval 的 `slow_down`；终态是带 message 的 `failed` 或带 value 的 `complete` [E: packages/ai/src/auth/oauth/device-code.ts:11] [E: packages/ai/src/auth/oauth/device-code.ts:16]。options 提供初始 interval、过期时间、是否首次 poll 前等待、caller-supplied `poll()` 与 `AbortSignal` [E: packages/ai/src/auth/oauth/device-code.ts:18] [E: packages/ai/src/auth/oauth/device-code.ts:23]。

deadline 由 `expiresInSeconds` 计算，未提供时为 infinity；初始 interval 默认 5 秒且不会低于 1000ms [E: packages/ai/src/auth/oauth/device-code.ts:47] [E: packages/ai/src/auth/oauth/device-code.ts:50] [E: packages/ai/src/auth/oauth/device-code.ts:51] [E: packages/ai/src/auth/oauth/device-code.ts:53]。`waitBeforeFirstPoll` 为 true 时，helper 会先睡 `min(interval, remaining)`，避免立即打第一枪 [E: packages/ai/src/auth/oauth/device-code.ts:57] [E: packages/ai/src/auth/oauth/device-code.ts:60]。

循环先检查 cancel，再调用 caller 的 `poll()`；`complete` 返回 value，`failed` 抛出 message [E: packages/ai/src/auth/oauth/device-code.ts:64] [E: packages/ai/src/auth/oauth/device-code.ts:66] [E: packages/ai/src/auth/oauth/device-code.ts:69] [E: packages/ai/src/auth/oauth/device-code.ts:74]。`slow_down` 若携带有限正数 `intervalSeconds` 就采用 server minimum，否则在当前 interval 上增加 5000ms；两种情况都保持 1000ms 下限 [E: packages/ai/src/auth/oauth/device-code.ts:76] [E: packages/ai/src/auth/oauth/device-code.ts:82] [E: packages/ai/src/auth/oauth/device-code.ts:86]。

每次 sleep 都被 remaining deadline 截断并受 signal 取消 [E: packages/ai/src/auth/oauth/device-code.ts:89] [E: packages/ai/src/auth/oauth/device-code.ts:94]。超时后，只要曾收到 `slow_down` 就抛带 WSL/VM clock-drift 提示的 message，否则抛普通 timeout [E: packages/ai/src/auth/oauth/device-code.ts:3] [E: packages/ai/src/auth/oauth/device-code.ts:97]。

## PKCE helper

`base64urlEncode()` 把 bytes 拼成 binary string，经 `btoa()` 后替换 `+`、`/` 并移除 `=` padding [E: packages/ai/src/auth/oauth/pkce.ts:9] [E: packages/ai/src/auth/oauth/pkce.ts:14]。`generatePKCE()` 生成 32 个 random bytes 并编码为 verifier，再用 Web Crypto SHA-256 digest verifier 的 UTF-8 bytes，最后把 digest 编成 challenge [E: packages/ai/src/auth/oauth/pkce.ts:21] [E: packages/ai/src/auth/oauth/pkce.ts:23] [E: packages/ai/src/auth/oauth/pkce.ts:25] [E: packages/ai/src/auth/oauth/pkce.ts:28] [E: packages/ai/src/auth/oauth/pkce.ts:31]。

## 设计动机与 gotcha

- flow loader 隔离 Node-only implementation，provider factory 只持有 lazy `OAuthAuth`；这让 core/provider import 不必立刻加载 callback server 与 PKCE 依赖 [E: packages/ai/src/auth/oauth/load.ts:9] [E: packages/ai/src/providers/anthropic.ts:45] [I]。
- `registerBundledOAuthFlowLoaders()` 是 process/module 级 override，不是 per-provider registry；loader shape 明确包含 Anthropic、OpenAI Codex、GitHub Copilot、OpenRouter、Kimi Coding、xAI 与 Radius 七类，注册后都优先使用 bundled functions [E: packages/ai/src/auth/oauth/load.ts:14] [E: packages/ai/src/auth/oauth/load.ts:15] [E: packages/ai/src/auth/oauth/load.ts:16] [E: packages/ai/src/auth/oauth/load.ts:17] [E: packages/ai/src/auth/oauth/load.ts:18] [E: packages/ai/src/auth/oauth/load.ts:19] [E: packages/ai/src/auth/oauth/load.ts:20] [E: packages/ai/src/auth/oauth/load.ts:21] [E: packages/ai/src/auth/oauth/load.ts:27] [E: packages/ai/src/auth/oauth/load.ts:28]。
- `@earendil-works/pi-ai/oauth` 名称容易让人误以为仍包含实现；目标 commit 中它只保留 extension OAuth types [E: packages/ai/src/oauth.ts:2]。
- `waitBeforeFirstPoll` 与 server-supplied `slow_down.intervalSeconds` 都是本轮新增的 cadence 控制，旧 wiki 的“总是先 poll、slow_down 固定 +5 秒”描述已不成立 [E: packages/ai/src/auth/oauth/device-code.ts:21] [E: packages/ai/src/auth/oauth/device-code.ts:85]。

## 跨包边界

[surface.providers.auth](../../surface/providers/auth.md) 描述 coding-agent 用户可见的 login/logout、credential storage 与 provider auth selection；本节点只解释 `pi-ai` 的 flow loading 和通用 OAuth helpers。

[subsys.ai.auth-resolution](auth-resolution.md) 描述 stored credential refresh 与 request auth derivation；本节点不负责 credential precedence 或锁语义。

## Sources

- packages/ai/src/oauth.ts
- packages/ai/src/auth/oauth/load.ts
- packages/ai/src/auth/oauth/device-code.ts
- packages/ai/src/auth/oauth/pkce.ts
- packages/ai/src/auth/oauth/kimi-coding.ts
- packages/ai/src/auth/oauth/openrouter.ts
- packages/ai/src/bun-oauth.ts
- packages/ai/src/providers/anthropic.ts
- packages/ai/src/providers/openai-codex.ts
- packages/ai/src/providers/kimi-coding.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/package.json

## 相关

- [surface.providers.auth](../../surface/providers/auth.md): coding-agent 登录、登出与 credential UX。
- [subsys.ai.auth-resolution](auth-resolution.md): stored credential、refresh lock 与 request auth。
