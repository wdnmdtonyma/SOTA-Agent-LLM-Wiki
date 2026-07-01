---
id: subsys.ai.auth-resolution
title: 认证解析引擎
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/auth/resolve.ts
  - packages/ai/src/auth/context.ts
symbols:
  - resolveProviderAuth
  - AuthResult
related:
  - surface.providers.auth
  - subsys.ai.credential-store
  - ref.ai.auth-types
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.ai.auth-resolution` 是 `pi-ai` 的 provider auth 决策层: 它把 provider 的 auth contract、目标 model、credential store、`AuthContext` 和 request override 解析成可用于模型请求的 `AuthResult | undefined`。

## 能回答的问题

- `resolveProviderAuth()` 的输入分别控制哪一段认证解析?
- request 级 `apiKey` override 和 credential store 谁优先?
- 已保存 OAuth 凭证过期时如何刷新,失败时是否回退到环境变量?
- 已保存 api-key 凭证如何与 request 级 env override 合并?
- 没有保存凭证时,环境变量、ADC 文件或 AWS profile 这类 ambient auth 从哪里进入?
- `AuthContext` 在 Node 与 browser-like runtime 中的边界是什么?

## 职责边界

`resolveProviderAuth()` 是认证解析入口,输入包括 provider id/auth contract、chat 或 image model、`CredentialStore`、`AuthContext` 和可选 `AuthResolutionOverrides`;返回值类型是 `Promise<AuthResult | undefined>` [E: packages/ai/src/auth/resolve.ts:40] [E: packages/ai/src/auth/resolve.ts:41] [E: packages/ai/src/auth/resolve.ts:42] [E: packages/ai/src/auth/resolve.ts:43] [E: packages/ai/src/auth/resolve.ts:44] [E: packages/ai/src/auth/resolve.ts:45] [E: packages/ai/src/auth/resolve.ts:46]。

本节点只覆盖 auth resolution 的调度和边界: provider-specific api-key 解析在 `apiKey.resolve({ model, ctx, credential })` 中执行,而 OAuth token 刷新与 auth 派生分别由 provider 的 `oauth.refresh(...)` 和 `oauth.toAuth(...)` 执行 [E: packages/ai/src/auth/resolve.ts:102] [E: packages/ai/src/auth/resolve.ts:116] [E: packages/ai/src/auth/resolve.ts:129]。[ref.ai.auth-types](../../reference/auth-types.md) 应定义 `AuthResult`、credential 和 provider auth 类型的完整字段语义 [I]。

## 关键文件

- `packages/ai/src/auth/resolve.ts`: 定义 `AuthResolutionOverrides`、`ModelsError`、`AuthModel`、`resolveProviderAuth()`、credential lookup wrapper、api-key wrapper 和 stored OAuth refresh path [E: packages/ai/src/auth/resolve.ts:16] [E: packages/ai/src/auth/resolve.ts:21] [E: packages/ai/src/auth/resolve.ts:32] [E: packages/ai/src/auth/resolve.ts:40] [E: packages/ai/src/auth/resolve.ts:86] [E: packages/ai/src/auth/resolve.ts:122] [E: packages/ai/src/auth/resolve.ts:135]。
- `packages/ai/src/auth/context.ts`: 定义默认 `AuthContext`,从 `process.env` 读取非空环境变量,并用 Node `fs.access()` 判断文件存在;运行时没有 Node builtin 或访问失败时 `fileExists()` 返回 `false` [E: packages/ai/src/auth/context.ts:23] [E: packages/ai/src/auth/context.ts:25] [E: packages/ai/src/auth/context.ts:26] [E: packages/ai/src/auth/context.ts:27] [E: packages/ai/src/auth/context.ts:30] [E: packages/ai/src/auth/context.ts:32] [E: packages/ai/src/auth/context.ts:38] [E: packages/ai/src/auth/context.ts:40] [E: packages/ai/src/auth/context.ts:41]。

## 数据模型

`AuthResolutionOverrides` 当前只有 request 级 `apiKey?: string` 和 `env?: ProviderEnv`;`env` 会先被叠加到 `AuthContext`,而 `apiKey` 只在 provider 声明 `auth.apiKey` 时触发 direct api-key resolution [E: packages/ai/src/auth/resolve.ts:16] [E: packages/ai/src/auth/resolve.ts:17] [E: packages/ai/src/auth/resolve.ts:18] [E: packages/ai/src/auth/resolve.ts:47] [E: packages/ai/src/auth/resolve.ts:49]。

`AuthModel` 是 auth resolution 接收的模型联合:文字/聊天模型 `Model<Api>` 或图片模型 `ImagesModel<ImagesApi>` 都走同一个认证解析函数 [E: packages/ai/src/auth/resolve.ts:1] [E: packages/ai/src/auth/resolve.ts:32]。

`AuthResult` 在本文件中表现为 `resolveProviderAuth()`、`resolveStoredOAuth()` 和 `resolveApiKey()` 的返回类型;OAuth 成功路径构造 `{ auth: await oauth.toAuth(credential), source: "OAuth" }`,api-key 路径直接返回 provider-specific `apiKey.resolve(...)` 的结果 [E: packages/ai/src/auth/resolve.ts:46] [E: packages/ai/src/auth/resolve.ts:91] [E: packages/ai/src/auth/resolve.ts:116] [E: packages/ai/src/auth/resolve.ts:122] [E: packages/ai/src/auth/resolve.ts:127] [E: packages/ai/src/auth/resolve.ts:129]。

`AuthContext` 的默认实现只有两个能力: `env(name)` 读取 trimmed non-empty `process.env[name]`,`fileExists(path)` 动态 import Node `fs/promises` 并支持 `~` 展开到 `os.homedir()` [E: packages/ai/src/auth/context.ts:23] [E: packages/ai/src/auth/context.ts:25] [E: packages/ai/src/auth/context.ts:26] [E: packages/ai/src/auth/context.ts:27] [E: packages/ai/src/auth/context.ts:30] [E: packages/ai/src/auth/context.ts:32] [E: packages/ai/src/auth/context.ts:34] [E: packages/ai/src/auth/context.ts:35] [E: packages/ai/src/auth/context.ts:36]。

## 控制流

1. `resolveProviderAuth@packages/ai/src/auth/resolve.ts:40` 先构造 request auth context: 有 `overrides.env` 时调用 `overlayEnvAuthContext(authContext, overrides.env)`,否则沿用传入的 `authContext` [E: packages/ai/src/auth/resolve.ts:47]。
2. Request-level api-key override 最高优先级: 只要 `overrides.apiKey !== undefined` 且 provider 支持 `auth.apiKey`,入口立即调用 `resolveApiKey(...)`,并把 credential 形状设为 `{ type: "api_key", key: overrides.apiKey, env: overrides.env }` [E: packages/ai/src/auth/resolve.ts:49] [E: packages/ai/src/auth/resolve.ts:50] [E: packages/ai/src/auth/resolve.ts:51] [E: packages/ai/src/auth/resolve.ts:52] [E: packages/ai/src/auth/resolve.ts:53]。
3. 没有 direct api-key override 时,入口通过 `readCredential(credentials, provider.id)` 从 credential store 读取 provider-scoped credential;读取异常被包装成 `ModelsError("auth", "Credential store read failed ...")` [E: packages/ai/src/auth/resolve.ts:57] [E: packages/ai/src/auth/resolve.ts:135] [E: packages/ai/src/auth/resolve.ts:137] [E: packages/ai/src/auth/resolve.ts:139]。
4. 读到 OAuth credential 且 provider 支持 `auth.oauth` 时,解析进入 `resolveStoredOAuth(credentials, provider.id, provider.auth.oauth, stored)`;这条路径不会把 `AuthContext` 传给 OAuth refresh 或 toAuth [E: packages/ai/src/auth/resolve.ts:58] [E: packages/ai/src/auth/resolve.ts:59] [E: packages/ai/src/auth/resolve.ts:60] [E: packages/ai/src/auth/resolve.ts:86] [E: packages/ai/src/auth/resolve.ts:87] [E: packages/ai/src/auth/resolve.ts:89] [E: packages/ai/src/auth/resolve.ts:115] [E: packages/ai/src/auth/resolve.ts:116]。
5. 读到 api-key credential 且 provider 支持 `auth.apiKey` 时,解析进入 `resolveApiKey(...)`;若 request 带 `overrides.env`,存储 credential 的 `env` 会与 override env 合并,且 override env 后写入覆盖同名 key [E: packages/ai/src/auth/resolve.ts:62] [E: packages/ai/src/auth/resolve.ts:63] [E: packages/ai/src/auth/resolve.ts:64]。
6. 读到 credential 但类型与 provider 支持的 auth handler 不匹配时,入口返回 `undefined`;这意味着已保存但不可处理的 credential 不会自动回落到 ambient env [E: packages/ai/src/auth/resolve.ts:58] [E: packages/ai/src/auth/resolve.ts:59] [E: packages/ai/src/auth/resolve.ts:62] [E: packages/ai/src/auth/resolve.ts:66] [I]。
7. Credential store 没有记录时,入口才尝试 ambient api-key path: provider 支持 `auth.apiKey` 时调用 `resolveApiKey(requestAuthContext, provider.auth.apiKey, model, undefined)`,否则返回 `undefined` [E: packages/ai/src/auth/resolve.ts:57] [E: packages/ai/src/auth/resolve.ts:58] [E: packages/ai/src/auth/resolve.ts:70]。

## OAuth 刷新与错误语义

`resolveStoredOAuth()` 先用 `Date.now() >= credential.expires` 判断 token 是否过期;未过期时直接走 `oauth.toAuth(credential)` [E: packages/ai/src/auth/resolve.ts:92] [E: packages/ai/src/auth/resolve.ts:94] [E: packages/ai/src/auth/resolve.ts:115] [E: packages/ai/src/auth/resolve.ts:116]。

过期 OAuth credential 通过 `credentials.modify(providerId, async (current) => ...)` 刷新;modify 回调里会再次检查当前 credential 仍是 OAuth 且仍然过期,满足条件时回调内的唯一刷新调用点是 `oauth.refresh(current)` [E: packages/ai/src/auth/resolve.ts:98] [E: packages/ai/src/auth/resolve.ts:99] [E: packages/ai/src/auth/resolve.ts:100] [E: packages/ai/src/auth/resolve.ts:102]。

OAuth refresh 抛错会被包装成 `ModelsError("oauth", "OAuth refresh failed ...")`,credential store modify 的非 `ModelsError` 异常会被包装成 `ModelsError("auth", "Credential store modify failed ...")` [E: packages/ai/src/auth/resolve.ts:103] [E: packages/ai/src/auth/resolve.ts:104] [E: packages/ai/src/auth/resolve.ts:107] [E: packages/ai/src/auth/resolve.ts:108] [E: packages/ai/src/auth/resolve.ts:109]。

`credentials.modify()` 返回的 `post` 不是 OAuth credential 时,`resolveStoredOAuth()` 返回 `undefined`;刷新成功后再把 `post` 作为新的 credential 传入 `oauth.toAuth(...)` [E: packages/ai/src/auth/resolve.ts:98] [E: packages/ai/src/auth/resolve.ts:111] [E: packages/ai/src/auth/resolve.ts:112] [E: packages/ai/src/auth/resolve.ts:116]。

`oauth.toAuth(...)` 抛错会被包装成 `ModelsError("oauth", "OAuth auth derivation failed ...")`,并且该错误路径不再尝试 ambient env 或 api-key fallback [E: packages/ai/src/auth/resolve.ts:115] [E: packages/ai/src/auth/resolve.ts:116] [E: packages/ai/src/auth/resolve.ts:117] [E: packages/ai/src/auth/resolve.ts:118] [I]。

## Env、api-key 与 AuthContext 边界

`overlayEnvAuthContext()` 只覆盖 `env(name)`: 它先读 `overrides.env[name]`,该值 falsy 时才调用 base `authContext.env(name)`;`fileExists(path)` 始终委托给 base `authContext.fileExists(path)` [E: packages/ai/src/auth/resolve.ts:73] [E: packages/ai/src/auth/resolve.ts:75] [E: packages/ai/src/auth/resolve.ts:76]。

默认 `env(name)` 只返回非空字符串: `process.env` 不存在、变量不存在、变量不是字符串或 trim 后为空时都会返回 `undefined` [E: packages/ai/src/auth/context.ts:14] [E: packages/ai/src/auth/context.ts:15] [E: packages/ai/src/auth/context.ts:16] [E: packages/ai/src/auth/context.ts:25] [E: packages/ai/src/auth/context.ts:26] [E: packages/ai/src/auth/context.ts:27]。

默认 `fileExists(path)` 在 Node 中动态导入 `node:fs/promises`;以 `~` 开头的 path 会动态导入 `node:os` 并拼接 `homedir()`,任何 import、homedir、access 或权限错误都会落入 catch 并返回 `false` [E: packages/ai/src/auth/context.ts:12] [E: packages/ai/src/auth/context.ts:30] [E: packages/ai/src/auth/context.ts:32] [E: packages/ai/src/auth/context.ts:34] [E: packages/ai/src/auth/context.ts:35] [E: packages/ai/src/auth/context.ts:36] [E: packages/ai/src/auth/context.ts:38] [E: packages/ai/src/auth/context.ts:40] [E: packages/ai/src/auth/context.ts:41]。

api-key provider 的具体环境变量、文件探测或 ambient credential 判断不在 `resolveProviderAuth()` 中硬编码;该入口只把 `model`、`ctx` 和可选 `credential` 传给 provider 的 `apiKey.resolve(...)` [E: packages/ai/src/auth/resolve.ts:122] [E: packages/ai/src/auth/resolve.ts:123] [E: packages/ai/src/auth/resolve.ts:124] [E: packages/ai/src/auth/resolve.ts:125] [E: packages/ai/src/auth/resolve.ts:126] [E: packages/ai/src/auth/resolve.ts:129] [I]。

## 设计动机与权衡

Stored credential owns the provider: `resolveProviderAuth()` 只有在 credential store 没有记录时才走 ambient api-key path;读到不匹配的 credential、OAuth refresh 失败或 OAuth auth derivation 失败都不会静默回退到 env [E: packages/ai/src/auth/resolve.ts:57] [E: packages/ai/src/auth/resolve.ts:58] [E: packages/ai/src/auth/resolve.ts:66] [E: packages/ai/src/auth/resolve.ts:70] [E: packages/ai/src/auth/resolve.ts:104] [E: packages/ai/src/auth/resolve.ts:118] [I]。

OAuth refresh 使用 `CredentialStore.modify(...)` 包住二次检查和 refresh;本节点不能证明具体锁实现,只能证明 resolver 把并发控制所需的 read-modify-write 边界交给 `modify()` [E: packages/ai/src/auth/resolve.ts:98] [E: packages/ai/src/auth/resolve.ts:99] [E: packages/ai/src/auth/resolve.ts:100] [E: packages/ai/src/auth/resolve.ts:102] [I]。

`AuthContext` 把 ambient auth 探测限制成 `env` 和 `fileExists` 两个抽象能力;这让 provider api-key resolver 可以在 Node 与 browser-like runtime 中复用同一接口,同时默认 browser-like runtime 会因为 Node builtin import 失败而把文件存在性视为 `false` [E: packages/ai/src/auth/context.ts:12] [E: packages/ai/src/auth/context.ts:23] [E: packages/ai/src/auth/context.ts:25] [E: packages/ai/src/auth/context.ts:30] [E: packages/ai/src/auth/context.ts:40] [E: packages/ai/src/auth/context.ts:41] [I]。

## Gotcha

- `overrides.apiKey` 即使是空字符串也会触发 direct api-key resolution,因为判断条件是 `overrides.apiKey !== undefined`;空值是否被接受由 provider 的 `apiKey.resolve(...)` 决定 [E: packages/ai/src/auth/resolve.ts:49] [E: packages/ai/src/auth/resolve.ts:52] [E: packages/ai/src/auth/resolve.ts:129] [I]。
- `overrides.env` 里的空字符串不会遮蔽 base env,因为 overlay 使用 `env[name] || await base.env(name)` 而不是 nullish coalescing [E: packages/ai/src/auth/resolve.ts:75] [I]。
- 保存的 api-key credential 合并 request env 时用 object spread,所以同名 env key 由 request override 覆盖 stored credential env [E: packages/ai/src/auth/resolve.ts:63] [I]。
- OAuth path 不接收 `AuthContext`;如果某个 OAuth provider 的 `toAuth()` 需要额外 ambient state,本解析器源码没有把 `ctx` 传进去 [E: packages/ai/src/auth/resolve.ts:60] [E: packages/ai/src/auth/resolve.ts:86] [E: packages/ai/src/auth/resolve.ts:89] [E: packages/ai/src/auth/resolve.ts:116] [I]。
- Credential store read failure、api-key resolver failure、OAuth refresh failure 和 OAuth auth derivation failure 都会被包装成 `ModelsError`,但 code 分别可能是 `"auth"` 或 `"oauth"` [E: packages/ai/src/auth/resolve.ts:104] [E: packages/ai/src/auth/resolve.ts:118] [E: packages/ai/src/auth/resolve.ts:131] [E: packages/ai/src/auth/resolve.ts:139]。

## 跨包边界

[surface.providers.auth](../../surface/providers/auth.md) 应说明登录、OAuth/api-key 选择和用户可见认证入口;本节点只说明 provider auth contract 被运行时解析成 request auth 的顺序和失败语义 [I]。

[subsys.ai.credential-store](credential-store.md) 应说明 `CredentialStore.read()` 与 `CredentialStore.modify()` 的持久化/并发语义;本节点只依赖这两个方法的调用边界和 resolver 侧错误包装 [E: packages/ai/src/auth/resolve.ts:98] [E: packages/ai/src/auth/resolve.ts:135] [E: packages/ai/src/auth/resolve.ts:137] [E: packages/ai/src/auth/resolve.ts:139] [I]。

[ref.ai.auth-types](../../reference/auth-types.md) 应是 `AuthResult`、`ProviderAuth`、`ApiKeyAuth`、`OAuthAuth` 和 credential shapes 的类型目录;本节点只覆盖 `resolve.ts` 中实际执行的控制流 [E: packages/ai/src/auth/resolve.ts:2] [E: packages/ai/src/auth/resolve.ts:3] [E: packages/ai/src/auth/resolve.ts:6] [E: packages/ai/src/auth/resolve.ts:9] [E: packages/ai/src/auth/resolve.ts:11] [I]。

## Sources

- packages/ai/src/auth/resolve.ts
- packages/ai/src/auth/context.ts

## 相关

- [surface.providers.auth](../../surface/providers/auth.md): 认证与登录的用户可见入口。
- [subsys.ai.credential-store](credential-store.md): credential store 的读写、modify 和持久化边界。
- [ref.ai.auth-types](../../reference/auth-types.md): auth/credential/provider auth 类型目录。
