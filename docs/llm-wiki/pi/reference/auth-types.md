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
  - AuthLoginCallbacks
  - ApiKeyAuth
  - OAuthAuth
  - ProviderAuth
related:
  - subsys.ai.auth-resolution
  - subsys.ai.credential-store
evidence: explicit
status: verified
updated: 5a073885
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
| `ModelAuth` | `apiKey?: string`; `headers?: ProviderHeaders`; `baseUrl?: string` | 单次 model request auth material 的类型字段只有 api key、headers、base URL 三类; 不能放进这些字段的 provider config 不属于 request auth。[E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:9][E: packages/ai/src/auth/types.ts:10][E: packages/ai/src/auth/types.ts:11][I] | 用作 `AuthResult.auth` 和 `OAuthAuth.toAuth()` 的返回形状; 持久化 credential 不直接等同于 request auth。[E: packages/ai/src/auth/types.ts:80][E: packages/ai/src/auth/types.ts:171][I] | [E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:9][E: packages/ai/src/auth/types.ts:10][E: packages/ai/src/auth/types.ts:11] |
| `ApiKeyCredential` | `type: "api_key"`; `key?: string`; `env?: ProviderEnv` | 存储的 api-key credential 类型由 `"api_key"` tag、optional `key` 和 optional provider env 组成。[E: packages/ai/src/auth/types.ts:18][E: packages/ai/src/auth/types.ts:19][E: packages/ai/src/auth/types.ts:20][E: packages/ai/src/auth/types.ts:21] | 表示可持久化或 store 内的 api-key credential,不要求一定有 `key`,因为 provider env 也可随 credential 保存。[E: packages/ai/src/auth/types.ts:20][E: packages/ai/src/auth/types.ts:21][I] | [E: packages/ai/src/auth/types.ts:18][E: packages/ai/src/auth/types.ts:19][E: packages/ai/src/auth/types.ts:20][E: packages/ai/src/auth/types.ts:21] |
| `OAuthCredential` | `extends OAuthCredentials`; `type: "oauth"` | 存储的 OAuth credential,在 imported `OAuthCredentials` shape 上增加 `"oauth"` type tag。[E: packages/ai/src/auth/types.ts:2] | 本节点只从 `types.ts` 证明它继承 `OAuthCredentials` 并增加 tag; `OAuthCredentials` 的内部字段由 OAuth utility 类型定义承担。[E: packages/ai/src/auth/types.ts:25][I] | [E: packages/ai/src/auth/types.ts:25][E: packages/ai/src/auth/types.ts:26] |
| `Credential` | `ApiKeyCredential | OAuthCredential` | 当前 auth store 保存的 credential union 只有 api-key credential 与 OAuth credential 两种成员。[E: packages/ai/src/auth/types.ts:30] | 作为 `CredentialStore` 的读写值类型; provider auth handler 选择不在 union 本身执行。[E: packages/ai/src/auth/types.ts:52][E: packages/ai/src/auth/types.ts:64][I] | [E: packages/ai/src/auth/types.ts:30] |
| `CredentialStore` | `read(providerId: string): Promise<Credential | undefined>`; `modify(providerId: string, fn: (current: Credential | undefined) => Promise<Credential | undefined>): Promise<Credential | undefined>`; `delete(providerId: string): Promise<void>` | Credential storage contract 由 `read`、`modify`、`delete` 三个方法组成,并以 `providerId` 为 key 参数。[E: packages/ai/src/auth/types.ts:47][E: packages/ai/src/auth/types.ts:52][E: packages/ai/src/auth/types.ts:62][E: packages/ai/src/auth/types.ts:63][E: packages/ai/src/auth/types.ts:68] | `read` 的缺省结果和 `modify` callback 都允许 `Credential | undefined`; `delete` 表达 credential removal。[E: packages/ai/src/auth/types.ts:52][E: packages/ai/src/auth/types.ts:64][E: packages/ai/src/auth/types.ts:68][I] | [E: packages/ai/src/auth/types.ts:47][E: packages/ai/src/auth/types.ts:52][E: packages/ai/src/auth/types.ts:62][E: packages/ai/src/auth/types.ts:63][E: packages/ai/src/auth/types.ts:64][E: packages/ai/src/auth/types.ts:65][E: packages/ai/src/auth/types.ts:68] |
| `AuthContext` | `env(name: string): Promise<string | undefined>`; `fileExists(path: string): Promise<boolean>` | Auth resolution context 抽象提供环境值读取与文件存在性检查两个 host 能力。[E: packages/ai/src/auth/types.ts:72][E: packages/ai/src/auth/types.ts:73][E: packages/ai/src/auth/types.ts:75] | 供 provider auth resolver 使用,因为 `ApiKeyAuth.resolve()` 接收 `ctx: AuthContext`。[E: packages/ai/src/auth/types.ts:142][E: packages/ai/src/auth/types.ts:144] | [E: packages/ai/src/auth/types.ts:72][E: packages/ai/src/auth/types.ts:73][E: packages/ai/src/auth/types.ts:75] |
| `AuthResult` | `auth: ModelAuth`; `env?: ProviderEnv`; `source?: string` | 解析某个 model auth 的结果: request auth 是必填,provider-scoped env 与 source 标签可选。[E: packages/ai/src/auth/types.ts:79][E: packages/ai/src/auth/types.ts:80][E: packages/ai/src/auth/types.ts:82][E: packages/ai/src/auth/types.ts:84] | `source` 只在类型层表示为 optional string;具体展示语义由调用方解释。[E: packages/ai/src/auth/types.ts:84][I] | [E: packages/ai/src/auth/types.ts:79][E: packages/ai/src/auth/types.ts:80][E: packages/ai/src/auth/types.ts:82][E: packages/ai/src/auth/types.ts:84] |
| `AuthPrompt` | `{ signal?: AbortSignal } & (...)`; variants: `{ type: "text"; message; placeholder? }`; `{ type: "secret"; message; placeholder? }`; `{ type: "select"; message; options: readonly { id; label; description? }[] }`; `{ type: "manual_code"; message; placeholder? }` | 登录 prompt union 带可选 `signal`,并包含 text、secret、select、manual_code 四种 variant。[E: packages/ai/src/auth/types.ts:93][E: packages/ai/src/auth/types.ts:94][E: packages/ai/src/auth/types.ts:95][E: packages/ai/src/auth/types.ts:96][E: packages/ai/src/auth/types.ts:97] | `select` 的 options 只承载 id/label/optional description; prompt 返回值由 `AuthLoginCallbacks.prompt()` 统一表示成 string。[E: packages/ai/src/auth/types.ts:96][E: packages/ai/src/auth/types.ts:121][I] | [E: packages/ai/src/auth/types.ts:93][E: packages/ai/src/auth/types.ts:94][E: packages/ai/src/auth/types.ts:95][E: packages/ai/src/auth/types.ts:96][E: packages/ai/src/auth/types.ts:97] |
| `AuthEvent` | `{ type: "auth_url"; url; instructions? }`; `{ type: "device_code"; userCode; verificationUri; intervalSeconds?; expiresInSeconds? }`; `{ type: "progress"; message }` | 登录流程可通知 UI 的事件 union: auth URL、device code 和 progress 三类。[E: packages/ai/src/auth/types.ts:100] | 只定义通知 payload,不定义 UI 展示策略或 OAuth polling 行为。[E: packages/ai/src/auth/types.ts:101][E: packages/ai/src/auth/types.ts:103][E: packages/ai/src/auth/types.ts:109][I] | [E: packages/ai/src/auth/types.ts:100][E: packages/ai/src/auth/types.ts:101][E: packages/ai/src/auth/types.ts:103][E: packages/ai/src/auth/types.ts:104][E: packages/ai/src/auth/types.ts:105][E: packages/ai/src/auth/types.ts:106][E: packages/ai/src/auth/types.ts:107][E: packages/ai/src/auth/types.ts:109] |
| `AuthLoginCallbacks` | `signal?: AbortSignal`; `prompt(prompt: AuthPrompt): Promise<string>`; `notify(event: AuthEvent): void` | 交互 callbacks 由整体 `signal`、prompt string 返回值和 auth event 通知组成。[E: packages/ai/src/auth/types.ts:118][E: packages/ai/src/auth/types.ts:119][E: packages/ai/src/auth/types.ts:121][E: packages/ai/src/auth/types.ts:122] | api-key 与 OAuth login 都接收 `AuthLoginCallbacks`;单个 prompt 的取消使用 `AuthPrompt.signal`。[E: packages/ai/src/auth/types.ts:134][E: packages/ai/src/auth/types.ts:158][E: packages/ai/src/auth/types.ts:93][I] | [E: packages/ai/src/auth/types.ts:118][E: packages/ai/src/auth/types.ts:119][E: packages/ai/src/auth/types.ts:121][E: packages/ai/src/auth/types.ts:122] |
| `ApiKeyAuth` | `name: string`; `login?(callbacks: AuthLoginCallbacks): Promise<ApiKeyCredential>`; `resolve(input: { model: Model<Api> | ImagesModel<ImagesApi>; ctx: AuthContext; credential?: ApiKeyCredential }): Promise<AuthResult | undefined>` | Provider 的 api-key auth contract 包含 display name、可选 login 和 resolve 方法。[E: packages/ai/src/auth/types.ts:129][E: packages/ai/src/auth/types.ts:131][E: packages/ai/src/auth/types.ts:134][E: packages/ai/src/auth/types.ts:142][E: packages/ai/src/auth/types.ts:146] | `login` 是 optional;`resolve` 返回 `undefined` 可表达未解析到 auth,并同时支持 chat model 与 image-generation model。[E: packages/ai/src/auth/types.ts:134][E: packages/ai/src/auth/types.ts:143][E: packages/ai/src/auth/types.ts:146][I] | [E: packages/ai/src/auth/types.ts:129][E: packages/ai/src/auth/types.ts:131][E: packages/ai/src/auth/types.ts:134][E: packages/ai/src/auth/types.ts:142][E: packages/ai/src/auth/types.ts:143][E: packages/ai/src/auth/types.ts:144][E: packages/ai/src/auth/types.ts:145][E: packages/ai/src/auth/types.ts:146] |
| `OAuthAuth` | `name: string`; `login(callbacks: AuthLoginCallbacks): Promise<OAuthCredential>`; `refresh(credential: OAuthCredential): Promise<OAuthCredential>`; `toAuth(credential: OAuthCredential): Promise<ModelAuth>` | Provider 的 OAuth auth contract 包含 display name、login、refresh、toAuth 四个成员。[E: packages/ai/src/auth/types.ts:154][E: packages/ai/src/auth/types.ts:156][E: packages/ai/src/auth/types.ts:158][E: packages/ai/src/auth/types.ts:164][E: packages/ai/src/auth/types.ts:171] | `login`/`refresh` 产出 OAuth credential,`toAuth` 从 OAuth credential 派生 request auth; refresh 网络/异常语义不由签名本身证明。[E: packages/ai/src/auth/types.ts:158][E: packages/ai/src/auth/types.ts:164][E: packages/ai/src/auth/types.ts:171][I] | [E: packages/ai/src/auth/types.ts:154][E: packages/ai/src/auth/types.ts:156][E: packages/ai/src/auth/types.ts:158][E: packages/ai/src/auth/types.ts:164][E: packages/ai/src/auth/types.ts:171] |
| `ProviderAuth` | `apiKey?: ApiKeyAuth`; `oauth?: OAuthAuth` | Provider-level auth declaration 可暴露 optional api-key 与 optional OAuth auth handlers。[E: packages/ai/src/auth/types.ts:179][E: packages/ai/src/auth/types.ts:180][E: packages/ai/src/auth/types.ts:181] | 类型签名本身不强制至少一个 handler 存在;“至少一个”的运行约束来自源码注释,本节点不把它作为可由类型签名证伪的事实。[E: packages/ai/src/auth/types.ts:180][E: packages/ai/src/auth/types.ts:181][I] | [E: packages/ai/src/auth/types.ts:179][E: packages/ai/src/auth/types.ts:180][E: packages/ai/src/auth/types.ts:181] |

## 边界速记

`Credential` 是 store 保存的 provider-scoped credential;`ModelAuth` 是请求时实际交给 model API 的 auth material;`AuthResult` 把二者之间的解析结果包成 `auth`、optional `env` 和 optional `source`。[E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:30][E: packages/ai/src/auth/types.ts:79][I]

`CredentialStore` 只规定读、串行改和删的 storage contract;provider-specific api-key 解析由 `ApiKeyAuth.resolve()` 执行,OAuth token 刷新和 request auth 派生由 `OAuthAuth.refresh()` 与 `OAuthAuth.toAuth()` 执行。[E: packages/ai/src/auth/types.ts:47][E: packages/ai/src/auth/types.ts:142][E: packages/ai/src/auth/types.ts:164][E: packages/ai/src/auth/types.ts:171][I]

`AuthLoginCallbacks`、`AuthPrompt` 和 `AuthEvent` 只定义 login flow 与 UI/host 之间的交互协议;具体 OAuth provider、device-code polling、callback server 或密钥持久化不在 `types.ts` 中实现。[E: packages/ai/src/auth/types.ts:93][E: packages/ai/src/auth/types.ts:100][E: packages/ai/src/auth/types.ts:118][I]

## Sources

- packages/ai/src/auth/types.ts

## 相关

- [subsys.ai.auth-resolution](../subsystems/ai/auth-resolution.md): provider auth metadata、ambient context、stored credential 与 request override 如何解析成 `AuthResult`。
- [subsys.ai.credential-store](../subsystems/ai/credential-store.md): `CredentialStore` contract 与默认 store 实现的读写/并发边界。
