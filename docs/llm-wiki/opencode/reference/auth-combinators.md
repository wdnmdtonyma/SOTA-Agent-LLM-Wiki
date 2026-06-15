---
id: ref.auth-combinators
title: Auth Combinators Reference
kind: reference
tier: T3
v: shared
source:
  - packages/llm/src/route/auth.ts
  - packages/opencode/src/auth/index.ts
status: verified
updated: 92c70c9c3
evidence: explicit
symbols:
  - Auth
  - Credential
  - Auth.Info
  - Auth.Service
related:
  - model-layer.auth
---

# Auth Combinators Reference

本节点拆开两个同名但层级不同的 Auth：`packages/llm/src/route/auth.ts` 是 provider request headers 的组合子；`packages/opencode/src/auth/index.ts` 是 V1 本地凭据注册表和持久化 storage。`packages/core/src/connector.ts` 是本地凭据注册表相关代码，不是云连接器。[I]

## V1

V1 provider registry 从 `Auth.Service` 读取本地凭据并把 provider key 合入 AI SDK options；API auth storage 条目会把 provider source 标成 `api` 并携带 `key`。[E: packages/opencode/src/provider/provider.ts:1472] [E: packages/opencode/src/provider/provider.ts:1479] 本地 auth 文件路径是 `Global.Path.data/auth.json`，并且 `OPENCODE_AUTH_CONTENT` 可覆盖读取来源。[E: packages/opencode/src/auth/index.ts:10] [E: packages/opencode/src/auth/index.ts:59]

### V1 Credential Variants

| Variant | 字段 | 语义 |
| --- | --- | --- |
| `oauth` | `refresh`, `access`, `expires`, `accountId?`, `enterpriseUrl?` | OAuth provider credential。[E: packages/opencode/src/auth/index.ts:14] [E: packages/opencode/src/auth/index.ts:20] |
| `api` | `key`, `metadata?` | API key credential；metadata 是 string record，可保存 provider-specific fields。[E: packages/opencode/src/auth/index.ts:23] [E: packages/opencode/src/auth/index.ts:26] |
| `wellknown` | `key`, `token` | well-known auth credential variant。[E: packages/opencode/src/auth/index.ts:29] [E: packages/opencode/src/auth/index.ts:32] |

`Info` 是以上三种 variant 的 discriminator union，discriminator 是 `type`。[E: packages/opencode/src/auth/index.ts:35] `Auth.Service` 提供 `get/all/set/remove` 四个操作。[E: packages/opencode/src/auth/index.ts:43] [E: packages/opencode/src/auth/index.ts:44]

### V1 Storage Semantics

| 操作 | 行为 |
| --- | --- |
| `all()` | 优先 parse `OPENCODE_AUTH_CONTENT`；否则读取 `auth.json`，只保留能被 `Info` schema decode 的值。[E: packages/opencode/src/auth/index.ts:58] [E: packages/opencode/src/auth/index.ts:66] |
| `get(providerID)` | 返回 `all()[providerID]`。[E: packages/opencode/src/auth/index.ts:69] [E: packages/opencode/src/auth/index.ts:70] |
| `set(key, info)` | 去掉 key 尾部 slash，删除旧 slash variants，`writeJson(..., 0o600)`。[E: packages/opencode/src/auth/index.ts:73] [E: packages/opencode/src/auth/index.ts:79] |
| `remove(key)` | 同样 normalize slash variants，再写回 JSON 0600。[E: packages/opencode/src/auth/index.ts:83] [E: packages/opencode/src/auth/index.ts:88] |

## V2

`packages/llm/src/route/auth.ts` 是 V2 provider route auth 的核心组合子层。它不存储 credential；它把 value/config/effect credential 解析成 headers，并把 missing/config errors 统一映射成 `LLMError`。[E: packages/llm/src/route/auth.ts:43] [E: packages/llm/src/route/auth.ts:137]

### AuthInput

`AuthInput` 带 `request/method/url/body/headers`，所以 `Auth.custom` 可以根据 provider request 全量上下文生成 headers。[E: packages/llm/src/route/auth.ts:17] [E: packages/llm/src/route/auth.ts:18] 

### Credential Combinators

| Combinator | 输入 | 输出/行为 |
| --- | --- | --- |
| `value(secret, source?)` | string | 从 literal secret 建 `Credential`，空 string 失败为 `MissingCredentialError`。[E: packages/llm/src/route/auth.ts:70] [E: packages/llm/src/route/auth.ts:85] |
| `optional(secret, source?)` | optional `Secret` | undefined 时返回一个失败 credential，否则解析 secret。[E: packages/llm/src/route/auth.ts:87] [E: packages/llm/src/route/auth.ts:90] |
| `config(name)` | config key | 从 `Config.redacted(name)` 读取 secret。[E: packages/llm/src/route/auth.ts:92] |
| `effect(load)` | Effect producing redacted secret | 用 Effect 作为 credential loader。[E: packages/llm/src/route/auth.ts:94] |
| `Credential.orElse(that)` | fallback credential | 当前 credential load 失败时加载 fallback。[E: packages/llm/src/route/auth.ts:46] |
| `Credential.bearer()` | none | 把 secret 渲染为 `authorization: Bearer ${secret}`。[E: packages/llm/src/route/auth.ts:47] |
| `Credential.header(name)` | header name | 把 secret 渲染为指定 header value。[E: packages/llm/src/route/auth.ts:48] |

### Auth Combinators

| Combinator | 行为 | 证据 |
| --- | --- | --- |
| `none` / `passthrough` | 原样返回 headers。 | [E: packages/llm/src/route/auth.ts:96] [E: packages/llm/src/route/auth.ts:105] |
| `headers(input)` | setAll 静态 headers。 | [E: packages/llm/src/route/auth.ts:98] |
| `remove(name)` | 删除 header。 | [E: packages/llm/src/route/auth.ts:101] |
| `custom(apply)` | 用自定义 Effect 生成 headers。 | [E: packages/llm/src/route/auth.ts:103] |
| `bearer(source)` / `apiKey` | credential source 渲染成 Authorization Bearer。 | [E: packages/llm/src/route/auth.ts:112] [E: packages/llm/src/route/auth.ts:117] |
| `header(name, source?)` | curried 或 direct header credential renderer。 | [E: packages/llm/src/route/auth.ts:119] [E: packages/llm/src/route/auth.ts:123] |
| `bearerHeader(name, source?)` | 指定 header 使用 `Bearer ${secret}` value。 | [E: packages/llm/src/route/auth.ts:128] [E: packages/llm/src/route/auth.ts:134] |
| `Auth.andThen(that)` | 先 apply 当前 auth，再把 headers 交给下一 auth。 | [E: packages/llm/src/route/auth.ts:57] [E: packages/llm/src/route/auth.ts:58] |
| `Auth.orElse(that)` | 当前 auth 失败时 fallback 到另一个 auth。 | [E: packages/llm/src/route/auth.ts:59] |
| `toEffect(auth)` | 把 `AuthError` 转成 `LLMError`。 | [E: packages/llm/src/route/auth.ts:151] [E: packages/llm/src/route/auth.ts:154] |

### Error Mapping

`MissingCredentialError` 带 `_tag = "MissingCredentialError"` 和 source，用于报告缺失 credential。[E: packages/llm/src/route/auth.ts:5] [E: packages/llm/src/route/auth.ts:9] `toLLMError` 把 missing credential 映射为 `AuthenticationReason(kind: "missing")`，把 config error 映射为 `InvalidRequestReason`。[E: packages/llm/src/route/auth.ts:137] [E: packages/llm/src/route/auth.ts:145]

## Sources

- packages/llm/src/route/auth.ts
- packages/opencode/src/auth/index.ts

## Related

- model-layer.auth
