---
id: ref.ai.auth-types
title: 认证与凭证类型
kind: reference
tier: T3
pkg: ai
source:
  - packages/ai/src/auth/types.ts
symbols:
  - ModelAuth
  - ApiKeyCredential
  - OAuthCredential
  - Credential
  - CredentialStore
  - AuthContext
  - AuthResult
  - AuthPrompt
  - AuthEvent
  - AuthInteraction
  - ProviderAuthInteraction
  - CredentialInfo
  - AuthOperationOptions
  - AuthCheck
  - AuthType
  - AuthInfoLink
  - ApiKeyAuth
  - OAuthAuth
  - ProviderAuth
related:
  - subsys.ai.auth-resolution
  - subsys.ai.credential-store
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `ref.ai.auth-types` 是 `packages/ai/src/auth/types.ts` 中 auth、credential 与 credential store 相关导出类型的字段目录。

## 能回答的问题

- `ModelAuth`、`AuthResult` 与持久化 `Credential` 的边界是什么?
- api-key credential 与 OAuth credential 在类型层如何区分?
- `CredentialStore` 最小实现需要哪些方法签名?
- provider auth contract 中 `ApiKeyAuth` 和 `OAuthAuth` 各负责哪一段?
- 登录交互 callbacks 能表达哪些 prompt 与事件?

## 类型目录

| 类型/接口名 | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `ModelAuth` | `apiKey?: string`; `headers?: ProviderHeaders`; `baseUrl?: string` | 单次 model request auth material 的类型字段只有 api key、headers、base URL 三类; 不能放进这些字段的 provider config 不属于 request auth。[E: packages/ai/src/auth/types.ts:7][E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:9][E: packages/ai/src/auth/types.ts:10][I] | 用作 `AuthResult.auth` 和 `OAuthAuth.toAuth()` 的返回形状; 持久化 credential 不直接等同于 request auth。[E: packages/ai/src/auth/types.ts:105][E: packages/ai/src/auth/types.ts:229][I] | [E: packages/ai/src/auth/types.ts:7][E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:9][E: packages/ai/src/auth/types.ts:10] |
| `ApiKeyCredential` | `type: "api_key"`; `key?: string`; `env?: ProviderEnv` | 存储的 api-key credential 类型由 `"api_key"` tag、optional `key` 和 optional provider env 组成。[E: packages/ai/src/auth/types.ts:17][E: packages/ai/src/auth/types.ts:18][E: packages/ai/src/auth/types.ts:19][E: packages/ai/src/auth/types.ts:20] | 表示可持久化或 store 内的 api-key credential,不要求一定有 `key`,因为 provider env 也可随 credential 保存。[E: packages/ai/src/auth/types.ts:19][E: packages/ai/src/auth/types.ts:20][I] | [E: packages/ai/src/auth/types.ts:17][E: packages/ai/src/auth/types.ts:18][E: packages/ai/src/auth/types.ts:19][E: packages/ai/src/auth/types.ts:20] |
| `OAuthCredentials` | `refresh: string`; `access: string`; `expires: number`; index signature | 本文件内定义的 OAuth token data（refresh/access/expires），不是从 line 1 import 的。[E: packages/ai/src/auth/types.ts:24][E: packages/ai/src/auth/types.ts:25][E: packages/ai/src/auth/types.ts:26][E: packages/ai/src/auth/types.ts:27] | 被 `OAuthCredential` 继承。[E: packages/ai/src/auth/types.ts:32] | [E: packages/ai/src/auth/types.ts:24] |
| `OAuthCredential` | `extends OAuthCredentials`; `type: "oauth"` | 存储的 OAuth credential,在本文件的 `OAuthCredentials` 上增加 `"oauth"` type tag。[E: packages/ai/src/auth/types.ts:32][E: packages/ai/src/auth/types.ts:33] | 作为 `Credential` union 成员写入 store。[E: packages/ai/src/auth/types.ts:37] | [E: packages/ai/src/auth/types.ts:32] |
| `CredentialInfo` | `providerId: string`; `type: Credential["type"]` | 非密钥的 credential 元数据,供 list/status 枚举。[E: packages/ai/src/auth/types.ts:40][E: packages/ai/src/auth/types.ts:41][E: packages/ai/src/auth/types.ts:42] | `CredentialStore.list()` 返回它。[E: packages/ai/src/auth/types.ts:76] | [E: packages/ai/src/auth/types.ts:40] |
| `AuthOperationOptions` | `signal?: AbortSignal` | 公开 auth/credential 操作的可选取消。[E: packages/ai/src/auth/types.ts:46][E: packages/ai/src/auth/types.ts:47] | `CredentialStore` 的 `read`/`list`/`modify`/`delete` 都接收它。[E: packages/ai/src/auth/types.ts:70][E: packages/ai/src/auth/types.ts:76] | [E: packages/ai/src/auth/types.ts:46] |
| `Credential` | `ApiKeyCredential | OAuthCredential` | 当前 auth store 保存的 credential union 只有 api-key credential 与 OAuth credential 两种成员。[E: packages/ai/src/auth/types.ts:37] | 作为 `CredentialStore` 的读写值类型; provider auth handler 选择不在 union 本身执行。[E: packages/ai/src/auth/types.ts:65][E: packages/ai/src/auth/types.ts:88][I] | [E: packages/ai/src/auth/types.ts:37] |
| `CredentialStore` | `read(providerId, options?)`; `list(options?): Promise<readonly CredentialInfo[]>`; `modify(providerId, fn, options?)`; `delete(providerId, options?)` | Credential storage contract 由 `read`、`list`、`modify`、`delete` 四个方法组成;后三个写/列操作都带可选 `AuthOperationOptions`。[E: packages/ai/src/auth/types.ts:70][E: packages/ai/src/auth/types.ts:76][E: packages/ai/src/auth/types.ts:86][E: packages/ai/src/auth/types.ts:93] | `list` 返回非密钥 metadata 且不得执行 API-key commands; `modify` 是唯一写路径。[E: packages/ai/src/auth/types.ts:76][E: packages/ai/src/auth/types.ts:86][I] | [E: packages/ai/src/auth/types.ts:65] |
| `AuthContext` | `env(name: string): Promise<string | undefined>`; `fileExists(path: string): Promise<boolean>` | Auth resolution context 抽象提供环境值读取与文件存在性检查两个 host 能力。[E: packages/ai/src/auth/types.ts:97][E: packages/ai/src/auth/types.ts:98][E: packages/ai/src/auth/types.ts:100] | 供 provider auth resolver 使用,因为 `ApiKeyAuth.resolve()` 接收 `ctx: AuthContext`。[E: packages/ai/src/auth/types.ts:195] | [E: packages/ai/src/auth/types.ts:97][E: packages/ai/src/auth/types.ts:98][E: packages/ai/src/auth/types.ts:100] |
| `AuthResult` | `auth: ModelAuth`; `env?: ProviderEnv`; `source?: string` | 解析某个 model auth 的结果: request auth 是必填,provider-scoped env 与 source 标签可选。[E: packages/ai/src/auth/types.ts:104][E: packages/ai/src/auth/types.ts:105][E: packages/ai/src/auth/types.ts:107][E: packages/ai/src/auth/types.ts:109] | `source` 只在类型层表示为 optional string;具体展示语义由调用方解释。[E: packages/ai/src/auth/types.ts:109][I] | [E: packages/ai/src/auth/types.ts:104][E: packages/ai/src/auth/types.ts:105][E: packages/ai/src/auth/types.ts:107][E: packages/ai/src/auth/types.ts:109] |
| `AuthPrompt` | `{ signal?: AbortSignal } & (...)`; variants: `{ type: "text"; message; placeholder? }`; `{ type: "secret"; message; placeholder? }`; `{ type: "select"; message; options: readonly { id; label; description? }[] }`; `{ type: "manual_code"; message; placeholder? }` | 登录 prompt union 带可选 `signal`,并包含 text、secret、select、manual_code 四种 variant。[E: packages/ai/src/auth/types.ts:125][E: packages/ai/src/auth/types.ts:126][E: packages/ai/src/auth/types.ts:127][E: packages/ai/src/auth/types.ts:128][E: packages/ai/src/auth/types.ts:129] | `select` 的 options 只承载 id/label/optional description; prompt 返回值由 `AuthLoginCallbacks.prompt()` 统一表示成 string。[E: packages/ai/src/auth/types.ts:128][E: packages/ai/src/auth/types.ts:159][I] | [E: packages/ai/src/auth/types.ts:125][E: packages/ai/src/auth/types.ts:126][E: packages/ai/src/auth/types.ts:127][E: packages/ai/src/auth/types.ts:128][E: packages/ai/src/auth/types.ts:129] |
| `AuthInfoLink` | `url: string`; `label?: string` | `AuthEvent` info 成员可附带的链接。[E: packages/ai/src/auth/types.ts:132][E: packages/ai/src/auth/types.ts:133][E: packages/ai/src/auth/types.ts:134] | `AuthEvent` 的 `info` variant 使用 `links?`。[E: packages/ai/src/auth/types.ts:138] | [E: packages/ai/src/auth/types.ts:132] |
| `AuthEvent` | `{ type: "info"; message; links? }`; `{ type: "auth_url"; url; instructions? }`; `{ type: "device_code"; userCode; verificationUri; intervalSeconds?; expiresInSeconds? }`; `{ type: "progress"; message }` | 登录流程可通知 UI 的事件 union: info、auth URL、device code 和 progress 四类。[E: packages/ai/src/auth/types.ts:137][E: packages/ai/src/auth/types.ts:138][E: packages/ai/src/auth/types.ts:139][E: packages/ai/src/auth/types.ts:147] | 只定义通知 payload,不定义 UI 展示策略或 OAuth polling 行为。[I] | [E: packages/ai/src/auth/types.ts:137] |
| `AuthInteraction` | `signal?: AbortSignal`; `prompt(prompt: AuthPrompt): Promise<string>`; `notify(event: AuthEvent): void` | 登录交互 callbacks;没有名为 `AuthLoginCallbacks` 的类型。[E: packages/ai/src/auth/types.ts:156][E: packages/ai/src/auth/types.ts:157][E: packages/ai/src/auth/types.ts:159][E: packages/ai/src/auth/types.ts:160] | api-key 与 OAuth login 都接收 `ProviderAuthInteraction`。[E: packages/ai/src/auth/types.ts:164][E: packages/ai/src/auth/types.ts:175][E: packages/ai/src/auth/types.ts:216] | [E: packages/ai/src/auth/types.ts:156] |
| `ProviderAuthInteraction` | `AuthInteraction & { signal: AbortSignal }` | 传给 provider login 实现的规范化 interaction,`signal` 必填。[E: packages/ai/src/auth/types.ts:164] | `ApiKeyAuth.login?` 与 `OAuthAuth.login` 的参数类型。[E: packages/ai/src/auth/types.ts:175][E: packages/ai/src/auth/types.ts:216] | [E: packages/ai/src/auth/types.ts:164] |
| `ApiKeyAuth` | `name: string`; `login?(interaction: ProviderAuthInteraction)`; `check?(input: { ctx; credential?; signal })`; `resolve(input: { ctx: AuthContext; credential?: ApiKeyCredential; signal: AbortSignal })` | Provider 的 api-key auth contract; `resolve` **没有** `model` 字段。[E: packages/ai/src/auth/types.ts:170][E: packages/ai/src/auth/types.ts:175][E: packages/ai/src/auth/types.ts:182][E: packages/ai/src/auth/types.ts:194][E: packages/ai/src/auth/types.ts:195][E: packages/ai/src/auth/types.ts:197] | `login`/`check` 可选;`resolve` 返回 `undefined` 表示未配置。[E: packages/ai/src/auth/types.ts:175][E: packages/ai/src/auth/types.ts:198] | [E: packages/ai/src/auth/types.ts:170] |
| `OAuthAuth` | `name`; `isSubscription?`; `loginLabel?`; `login(interaction: ProviderAuthInteraction)`; `refresh(credential, signal: AbortSignal)`; `toAuth(credential)` | Provider 的 OAuth auth contract; `refresh` 第二参数是 `AbortSignal`。[E: packages/ai/src/auth/types.ts:206][E: packages/ai/src/auth/types.ts:211][E: packages/ai/src/auth/types.ts:214][E: packages/ai/src/auth/types.ts:216][E: packages/ai/src/auth/types.ts:222][E: packages/ai/src/auth/types.ts:229] | `login`/`refresh` 产出 OAuth credential,`toAuth` 从 credential 派生 request auth。[E: packages/ai/src/auth/types.ts:216][E: packages/ai/src/auth/types.ts:222][E: packages/ai/src/auth/types.ts:229] | [E: packages/ai/src/auth/types.ts:206] |
| `ProviderAuth` | `apiKey?: ApiKeyAuth`; `oauth?: OAuthAuth` | Provider-level auth declaration 可暴露 optional api-key 与 optional OAuth auth handlers。[E: packages/ai/src/auth/types.ts:237][E: packages/ai/src/auth/types.ts:238][E: packages/ai/src/auth/types.ts:239] | 类型签名本身不强制至少一个 handler 存在;“至少一个”的运行约束来自源码注释,本节点不把它作为可由类型签名证伪的事实。[E: packages/ai/src/auth/types.ts:238][E: packages/ai/src/auth/types.ts:239][I] | [E: packages/ai/src/auth/types.ts:237][E: packages/ai/src/auth/types.ts:238][E: packages/ai/src/auth/types.ts:239] |

## 边界速记

`Credential` 是 store 保存的 provider-scoped credential;`ModelAuth` 是请求时实际交给 model API 的 auth material;`AuthResult` 把二者之间的解析结果包成 `auth`、optional `env` 和 optional `source`。[E: packages/ai/src/auth/types.ts:7][E: packages/ai/src/auth/types.ts:37][E: packages/ai/src/auth/types.ts:104][I]

`CredentialStore` 规定读、list、串行改和删的 storage contract;provider-specific api-key 解析由 `ApiKeyAuth.resolve()` 执行,OAuth token 刷新和 request auth 派生由 `OAuthAuth.refresh()` 与 `OAuthAuth.toAuth()` 执行。[E: packages/ai/src/auth/types.ts:65][E: packages/ai/src/auth/types.ts:194][E: packages/ai/src/auth/types.ts:222][E: packages/ai/src/auth/types.ts:229][I]

`AuthInteraction`、`AuthPrompt` 和 `AuthEvent` 只定义 login flow 与 UI/host 之间的交互协议;具体 OAuth provider、device-code polling、callback server 或密钥持久化不在 `types.ts` 中实现。[E: packages/ai/src/auth/types.ts:125][E: packages/ai/src/auth/types.ts:137][E: packages/ai/src/auth/types.ts:156][I]

## Sources

- packages/ai/src/auth/types.ts

## 相关

- [subsys.ai.auth-resolution](../subsystems/ai/auth-resolution.md): provider auth metadata、ambient context、stored credential 与 request override 如何解析成 `AuthResult`。
- [subsys.ai.credential-store](../subsystems/ai/credential-store.md): `CredentialStore` contract 与默认 store 实现的读写/并发边界。
