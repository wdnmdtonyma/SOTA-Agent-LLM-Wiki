---
id: model-layer.auth
title: Model Auth
kind: subsystem
tier: T2
v: shared
source: [packages/opencode/src/auth/index.ts, packages/opencode/src/provider/auth.ts, packages/opencode/src/account/account.ts, packages/core/src/credential.ts, packages/core/src/credential/sql.ts, packages/core/src/integration.ts, packages/core/src/integration/connection.ts, packages/schema/src/credential.ts, packages/schema/src/integration.ts]
symbols: [Auth.Service, ProviderAuth.Service, Account.Service, Credential.Service, Integration.Service]
related: [provider.auth-accounts, model-layer.credential-v2, integrations.integration-v2]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Model auth 横跨两代:V1 用 `auth.json` + provider auth hooks + account device flow 给 AI SDK provider registry 提供 key/OAuth token;V2 把 credentials 放进 SQLite `Credential` 表,并用 `Integration` 管 key/OAuth/env connection 与 OAuth attempt。

## 能回答的问题
- V1 `auth.json` 里有哪些 credential shape?
- `ProviderAuth.authorize/callback` 如何通过 plugin hook 写入 auth?
- opencode account device flow 和 provider auth 是不是同一个东西?
- V2 credential 如何与 Integration connection 配合?
- `packages/core/src/integration.ts` 为什么不是 workspace adapter?

## V1

### Auth Storage

V1 auth 文件路径是 global data 下的 `auth.json`。[E: packages/opencode/src/auth/index.ts:10] `Info` union 包含 `oauth`、`api`、`wellknown` 三种 shape:OAuth 有 refresh/access/expires/accountId/enterpriseUrl,API 有 key/metadata,wellknown 有 key/token。[E: packages/opencode/src/auth/index.ts:15][E: packages/opencode/src/auth/index.ts:20][E: packages/opencode/src/auth/index.ts:24][E: packages/opencode/src/auth/index.ts:26][E: packages/opencode/src/auth/index.ts:30][E: packages/opencode/src/auth/index.ts:32][E: packages/opencode/src/auth/index.ts:35]

`Auth.all` 优先读取 `OPENCODE_AUTH_CONTENT` env,否则读 `auth.json` 并按 schema 过滤有效条目。[E: packages/opencode/src/auth/index.ts:59][E: packages/opencode/src/auth/index.ts:65][E: packages/opencode/src/auth/index.ts:66] `set/remove` 会 normalize trailing slash key,并用 `0o600` 权限写回文件。[E: packages/opencode/src/auth/index.ts:74][E: packages/opencode/src/auth/index.ts:79][E: packages/opencode/src/auth/index.ts:84][E: packages/opencode/src/auth/index.ts:88]

### ProviderAuth Hooks

`ProviderAuth.Method` 的 type 是 `oauth|api`,每个 method 有 label 与 prompts。[E: packages/opencode/src/provider/auth.ts:42][E: packages/opencode/src/provider/auth.ts:44] service surface 是 `methods()`、`authorize(providerID, method, inputs)`、`callback(providerID, method, code)`。[E: packages/opencode/src/provider/auth.ts:91][E: packages/opencode/src/provider/auth.ts:97]

layer 初始化时从 V1 plugin list 收集 `x.auth.provider` hooks,并把 provider id 映射到 hook。[E: packages/opencode/src/provider/auth.ts:116][E: packages/opencode/src/provider/auth.ts:120][E: packages/opencode/src/provider/auth.ts:121]

`authorize` 只处理 oauth method;它会校验 text prompt,调用 plugin method.authorize,把 result 放进 pending map,并返回 url/method/instructions 给 caller。[E: packages/opencode/src/provider/auth.ts:168][E: packages/opencode/src/provider/auth.ts:170][E: packages/opencode/src/provider/auth.ts:174][E: packages/opencode/src/provider/auth.ts:179][E: packages/opencode/src/provider/auth.ts:180][E: packages/opencode/src/provider/auth.ts:182][E: packages/opencode/src/provider/auth.ts:184]

`callback` 从 pending map 找 OAuth result,code-mode 没 code 会抛 `OauthCodeMissing`;callback 成功后,如果 result 带 key 就写 `Auth.Api`,如果带 refresh/access/expires 就写 `Auth.Oauth`。[E: packages/opencode/src/provider/auth.ts:191][E: packages/opencode/src/provider/auth.ts:193][E: packages/opencode/src/provider/auth.ts:195][E: packages/opencode/src/provider/auth.ts:198][E: packages/opencode/src/provider/auth.ts:201][E: packages/opencode/src/provider/auth.ts:203][E: packages/opencode/src/provider/auth.ts:205][E: packages/opencode/src/provider/auth.ts:211][E: packages/opencode/src/provider/auth.ts:214][E: packages/opencode/src/provider/auth.ts:218]

### Account Device Flow

`Account.Service` 是 opencode account/login 层,接口包含 active/list/orgs/config/token/login/poll 等方法。[E: packages/opencode/src/account/account.ts:168][E: packages/opencode/src/account/account.ts:182] 它不等于 generic provider auth。[I]

device login 用 `/auth/device/code` 拿 device/user code 与 verification URL,poll 用 device grant 调 `/auth/device/token`,成功后并发 fetch user/orgs,再把 account、accessToken、refreshToken、expiry、orgID 持久化。[E: packages/opencode/src/account/account.ts:378][E: packages/opencode/src/account/account.ts:388][E: packages/opencode/src/account/account.ts:393][E: packages/opencode/src/account/account.ts:399][E: packages/opencode/src/account/account.ts:403][E: packages/opencode/src/account/account.ts:421][E: packages/opencode/src/account/account.ts:430][E: packages/opencode/src/account/account.ts:437]

refresh token flow 调 `/auth/device/token` 的 refresh_token grant,解析 token 后持久化新的 access/refresh/expiry。[E: packages/opencode/src/account/account.ts:220][E: packages/opencode/src/account/account.ts:224][E: packages/opencode/src/account/account.ts:232][E: packages/opencode/src/account/account.ts:238][E: packages/opencode/src/account/account.ts:242]

## V2

V2 credential service 是 `@opencode/v2/Credential`,value 类型只有 `oauth` 与 `key` 两类:OAuth 含 methodID/refresh/access/expires/metadata,Key 含 key/metadata。[E: packages/core/src/credential.ts:49][E: packages/schema/src/credential.ts:16][E: packages/schema/src/credential.ts:18][E: packages/schema/src/credential.ts:19][E: packages/schema/src/credential.ts:20][E: packages/schema/src/credential.ts:21][E: packages/schema/src/credential.ts:22][E: packages/schema/src/credential.ts:26][E: packages/schema/src/credential.ts:28][E: packages/schema/src/credential.ts:29][E: packages/schema/src/credential.ts:32]

`Credential.Info` 是 persisted row projection，字段是 id、integrationID、label、value；`Credential.create()` 会删除同 integration 的旧 rows 后插入新 credential。[E: packages/core/src/credential.ts:23][E: packages/core/src/credential.ts:24][E: packages/core/src/credential.ts:25][E: packages/core/src/credential.ts:26][E: packages/core/src/credential.ts:27][E: packages/core/src/credential.ts:94][E: packages/core/src/credential.ts:105][E: packages/core/src/credential.ts:109]

`Integration.Service` 是本地 authentication/integration registry。它定义 OAuth/key/env methods、connection list、OAuth attempt lifecycle，并将成功授权写入 `Credential.Service`。[E: packages/schema/src/integration.ts:52][E: packages/schema/src/integration.ts:60][E: packages/schema/src/integration.ts:66][E: packages/core/src/integration.ts:146][E: packages/core/src/integration.ts:181][E: packages/core/src/integration.ts:335][E: packages/core/src/integration.ts:410] 这里的 integration 不是 workspace adapter。[I]

## 设计动机

V1 auth 是文件与 plugin hook 的组合;V2 credential/integration 把 provider credential 变成 SQLite row 与 location-scoped connection service。[E: packages/opencode/src/auth/index.ts:10][E: packages/opencode/src/provider/auth.ts:118][E: packages/core/src/credential/sql.ts:5][E: packages/core/src/credential.ts:49][E: packages/core/src/integration.ts:146][E: packages/core/src/integration.ts:221][E: packages/core/src/integration.ts:520] 这种形态服务于 durable/event-sourced core 和 provider availability 投影。[I]

## 易错点

- V1 `ProviderAuth` 的 method type 名叫 `api`;V2 `Integration.KeyMethod` 的 method type 是 `key`,V2 credential value type 也是 `key`。[E: packages/opencode/src/provider/auth.ts:42][E: packages/schema/src/integration.ts:60][E: packages/schema/src/integration.ts:61][E: packages/schema/src/credential.ts:26][E: packages/schema/src/credential.ts:27]
- V1 account login 是 opencode server account device flow。[E: packages/opencode/src/account/account.ts:378][E: packages/opencode/src/account/account.ts:399] 它不是 provider API key login。[I]
- V2 Integration 的 OAuth attempt 有 oauth/status/complete/cancel 生命周期。[E: packages/core/src/integration.ts:163][E: packages/core/src/integration.ts:183][E: packages/core/src/integration.ts:185][E: packages/core/src/integration.ts:192] 它不是 external SaaS connector abstraction。[I]

## Sources
- packages/opencode/src/auth/index.ts
- packages/opencode/src/provider/auth.ts
- packages/opencode/src/account/account.ts
- packages/core/src/credential.ts
- packages/core/src/credential/sql.ts
- packages/core/src/integration.ts
- packages/core/src/integration/connection.ts
- packages/schema/src/credential.ts
- packages/schema/src/integration.ts

## Related
- provider.auth-accounts
- model-layer.credential-v2
- integrations.integration-v2
