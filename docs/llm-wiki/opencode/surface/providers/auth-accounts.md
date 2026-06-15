---
id: provider.auth-accounts
title: Provider 认证与账号账户面
kind: surface
tier: T1
v: shared
source: [packages/opencode/src/auth/index.ts, packages/opencode/src/account/account.ts, packages/opencode/src/provider/auth.ts, packages/core/src/credential.ts, packages/core/src/credential/sql.ts, packages/core/src/connector.ts, packages/core/src/connector/schema.ts]
symbols: [Auth, Account, ProviderAuth, Credential, Connector]
related: [model-layer.auth, model-layer.credential-v2, ref.auth-combinators]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> Provider auth/accounts 横跨两代：V1 用 `auth.json`、Console device-code account login 和 plugin `auth` hook；V2 用 `Credential` durable table 与 `Connector` 本地凭据注册表。`packages/core/src/connector.ts` 是本地 credential connector registry，不是云 connector。

## 能回答的问题

- V1 API key、OAuth token 和 well-known auth 分别存在哪里、schema 是什么？
- V1 Console account login 怎样完成 device code、poll、token refresh 和 org switch？
- V1 plugin `auth` hook 的 `methods()`、`authorize()`、`callback()` 如何接上 `/provider/:id/oauth/*` route？
- V2 `Credential` 表如何表示 OAuth/key credential，如何从 V1 `auth.json` migrate？
- V2 `Connector` 为什么是本地凭据注册表，以及 key/OAuth attempt lifecycle 是什么？

## V1

### `Auth` storage

V1 provider credential 文件是 `Global.Path.data/auth.json`；`Auth.all()` 优先读取 `OPENCODE_AUTH_CONTENT`，否则读该 JSON 文件并按 `Auth.Info` schema 过滤记录。[E: packages/opencode/src/auth/index.ts:10][E: packages/opencode/src/auth/index.ts:58][E: packages/opencode/src/auth/index.ts:61][E: packages/opencode/src/auth/index.ts:65] `Auth.Info` 有三种 variant：`oauth` 包含 access/refresh/expires/accountID/enterpriseUrl，`api` 包含 key，`wellknown` 包含 key 与 optional token。[E: packages/opencode/src/auth/index.ts:14][E: packages/opencode/src/auth/index.ts:16][E: packages/opencode/src/auth/index.ts:23][E: packages/opencode/src/auth/index.ts:25][E: packages/opencode/src/auth/index.ts:29][E: packages/opencode/src/auth/index.ts:31]

`Auth.set()` 和 `Auth.remove()` 都会把 provider id 尾部 `/` 去掉后写回 JSON 文件，写文件 mode 是 `0o600`。[E: packages/opencode/src/auth/index.ts:73][E: packages/opencode/src/auth/index.ts:75][E: packages/opencode/src/auth/index.ts:79][E: packages/opencode/src/auth/index.ts:83][E: packages/opencode/src/auth/index.ts:88] `Auth.get()` 只是从 `all()` 结果按 provider key 返回单条 credential。[E: packages/opencode/src/auth/index.ts:69][E: packages/opencode/src/auth/index.ts:70]

### Console account device-code flow

`Account` service 管理 opencode Console account，而不是第三方 provider API key。它的 interface 包含 `active`、`list`、`orgs`、`remove`、`use`、`config`、`token`、`login`、`poll`。[E: packages/opencode/src/account/account.ts:168][E: packages/opencode/src/account/account.ts:182] device code 登录使用 client id `opencode-cli`，`login()` POST `${url}/auth/device/code` 并只提交 `client_id`。[E: packages/opencode/src/account/account.ts:123][E: packages/opencode/src/account/account.ts:137][E: packages/opencode/src/account/account.ts:375][E: packages/opencode/src/account/account.ts:380]

`poll()` POST `${url}/auth/device/token`，grant type 是 `urn:ietf:params:oauth:grant-type:device_code`；成功后并发读取 `/api/user` 和 `/api/orgs`，再把 account id、email、server url、access/refresh token、expiry 与选中的 org id 持久化。[E: packages/opencode/src/account/account.ts:397][E: packages/opencode/src/account/account.ts:404][E: packages/opencode/src/account/account.ts:418][E: packages/opencode/src/account/account.ts:421][E: packages/opencode/src/account/account.ts:430][E: packages/opencode/src/account/account.ts:437] `token()` 在 token 过期前 5 分钟就认为需要刷新，并通过 refresh token 再 POST `/auth/device/token` 更新 stored token。[E: packages/opencode/src/account/account.ts:138][E: packages/opencode/src/account/account.ts:141][E: packages/opencode/src/account/account.ts:248][E: packages/opencode/src/account/account.ts:257][E: packages/opencode/src/account/account.ts:238]

### Plugin provider auth hook

V1 plugin `AuthHook` 绑定一个 provider id，可以有 `loader(auth, provider)`，并暴露 oauth 或 api methods；OAuth method 的 `authorize()` 返回 url/instructions 和 `callback()`，API method 可以直接返回 `{ type: "success", key, provider?, metadata? }`。[E: packages/plugin/src/index.ts:88][E: packages/plugin/src/index.ts:90][E: packages/plugin/src/index.ts:91][E: packages/plugin/src/index.ts:120][E: packages/plugin/src/index.ts:150][E: packages/plugin/src/index.ts:151] `ProviderAuth` service 从 plugin list 中筛出 `x.auth?.provider`，把 hook 按 provider id 存入 state。[E: packages/opencode/src/provider/auth.ts:116][E: packages/opencode/src/provider/auth.ts:120][E: packages/opencode/src/provider/auth.ts:122][E: packages/opencode/src/provider/auth.ts:125]

`methods(providerID)` 把 plugin auth methods 序列化给 API route，保留 prompt 的 text/select/when/placeholder/options 等可序列化 metadata，但不返回 function body 或 `validate` 函数。[E: packages/opencode/src/provider/auth.ts:131][E: packages/opencode/src/provider/auth.ts:139][E: packages/opencode/src/provider/auth.ts:145][E: packages/opencode/src/provider/auth.ts:146][E: packages/opencode/src/provider/auth.ts:153][E: packages/opencode/src/provider/auth.ts:154] `authorize(providerID, methodID, inputs)` 当前只接受 OAuth method；它校验 prompts、调用 plugin `authorize()`，把 pending callback 存在内存 state，然后返回 authorization url、method 和 instructions。[E: packages/opencode/src/provider/auth.ts:163][E: packages/opencode/src/provider/auth.ts:166][E: packages/opencode/src/provider/auth.ts:173][E: packages/opencode/src/provider/auth.ts:181][E: packages/opencode/src/provider/auth.ts:182] `callback()` 根据 pending method 的 callback result 写 `Auth.Info`：带 `key` 的 result 写 api credential，否则写 oauth credential。[E: packages/opencode/src/provider/auth.ts:188][E: packages/opencode/src/provider/auth.ts:203][E: packages/opencode/src/provider/auth.ts:213][E: packages/opencode/src/provider/auth.ts:215]

## V2

### Credential durable model

V2 `Credential.Info` 用 `id`、`connectorID`、`methodID`、`label` 和 `value` 表示一条 local credential。[E: packages/core/src/credential.ts:58][E: packages/core/src/credential.ts:64] `Credential.Value` 是 `OAuth` 或 `Key` union：OAuth value 有 access/refresh/expires，Key value 有 key。[E: packages/core/src/credential.ts:22][E: packages/core/src/credential.ts:28][E: packages/core/src/credential.ts:30][E: packages/core/src/credential.ts:36] SQL 表名是 `credential`，字段包含 `connector_id`、`method_id`、`label`、JSON `value`、`active` 和 timestamps；unique index `credential_connector_active_idx` 保证每个 connector 只能有一条 active credential。[E: packages/core/src/credential/sql.ts:7][E: packages/core/src/credential/sql.ts:10][E: packages/core/src/credential/sql.ts:14][E: packages/core/src/credential/sql.ts:19][E: packages/core/src/credential/sql.ts:20]

`Credential.create()` 会在 transaction 里 insert credential、停用同 connector 的其他 active credential，并发布 `credential.added` 和 `credential.switched` events。[E: packages/core/src/credential.ts:247][E: packages/core/src/credential.ts:267][E: packages/core/src/credential.ts:269][E: packages/core/src/credential.ts:283][E: packages/core/src/credential.ts:284] `Credential.remove()` 删除 credential 后，如果被删的是 active credential，会找同 connector 的 replacement 并激活它。[E: packages/core/src/credential.ts:296][E: packages/core/src/credential.ts:305][E: packages/core/src/credential.ts:312][E: packages/core/src/credential.ts:313]

### Legacy auth.json migration

V2 `Credential.legacyImportLayer` 只在 migration marker `credential.auth-json` 不存在时读 V1 `auth.json`。[E: packages/core/src/credential.ts:109][E: packages/core/src/credential.ts:110][E: packages/core/src/credential.ts:111] legacy `api` credential 映射为 method id `api-key`，OpenAI OAuth 映射为 `chatgpt-browser`，其他 OAuth 映射为 `oauth`；migration insert 时直接写 `active: true`。[E: packages/core/src/credential.ts:120][E: packages/core/src/credential.ts:123][E: packages/core/src/credential.ts:125][E: packages/core/src/credential.ts:153][E: packages/core/src/credential.ts:159] migrate 完会写入 migration marker，避免重复导入。[E: packages/core/src/credential.ts:162]

### Connector registry

V2 `Connector` 是 local credential connector registry：它定义 connector id、method id、prompt schema、OAuth/key method shape、attempt status 和 connect lifecycle；没有云端连接器语义。[E: packages/core/src/connector.ts:13][E: packages/core/src/connector.ts:16][E: packages/core/src/connector.ts:25][E: packages/core/src/connector.ts:57][E: packages/core/src/connector.ts:64][E: packages/core/src/connector.ts:135] `Connector.Info` 包含 id、name 和 methods；`Connector.Implementation` union 把 OAuth implementation 与 key implementation 放在一起。[E: packages/core/src/connector.ts:74][E: packages/core/src/connector.ts:75][E: packages/core/src/connector.ts:76][E: packages/core/src/connector.ts:77][E: packages/core/src/connector.ts:96][E: packages/core/src/connector.ts:103][E: packages/core/src/connector.ts:109]

`connect.key()` 找到 connector key method，调用 implementation `authorize()`，成功后用 `Credential.create()` 存储 key credential。[E: packages/core/src/connector.ts:394][E: packages/core/src/connector.ts:400][E: packages/core/src/connector.ts:402][E: packages/core/src/connector.ts:403] `connect.oauth.begin()` 创建 10 分钟 lifetime 的 OAuth attempt，支持 `mode: "auto"` 或 `mode: "code"`；`status()` 读取 attempt，`complete()` 调 callback 并用 `Credential.create()` 存 credential，`cancel()` 直接移除仍处于 pending 的 attempt 并关闭 scope。[E: packages/core/src/connector.ts:236][E: packages/core/src/connector.ts:409][E: packages/core/src/connector.ts:431][E: packages/core/src/connector.ts:449][E: packages/core/src/connector.ts:457][E: packages/core/src/connector.ts:472][E: packages/core/src/connector.ts:478][E: packages/core/src/connector.ts:481][E: packages/core/src/connector.ts:483][E: packages/core/src/connector.ts:486]

## V1/V2 对照

| 维度 | V1 | V2 |
|---|---|---|
| provider key storage | `data/auth.json`，schema 是 `oauth`/`api`/`wellknown`。[E: packages/opencode/src/auth/index.ts:10][E: packages/opencode/src/auth/index.ts:35] | SQLite `credential` table，value 是 `oauth`/`key`。[E: packages/core/src/credential/sql.ts:7][E: packages/core/src/credential.ts:36] |
| third-party auth surface | plugin `auth` hook 经 `ProviderAuth.authorize()` / `ProviderAuth.callback()` 间接写 `Auth`。[E: packages/opencode/src/provider/auth.ts:163][E: packages/opencode/src/provider/auth.ts:181][E: packages/opencode/src/provider/auth.ts:188][E: packages/opencode/src/provider/auth.ts:215] | connector method implements key/OAuth flow，经 `Credential.create()` 写 durable credential。[E: packages/core/src/connector.ts:403][E: packages/core/src/connector.ts:472] |
| account login | `Account` 是 opencode Console device-code account，不是 provider API key。[E: packages/opencode/src/account/account.ts:375][E: packages/opencode/src/account/account.ts:397] | V2 credential layer 只迁移 legacy provider credentials；Console account flow 不在 `Credential` schema 中体现。[E: packages/core/src/credential.ts:111][E: packages/core/src/credential.ts:120][I] |
| connector 命名陷阱 | V1 没有 `Connector` service。 | `packages/core/src/connector.ts` 是本地 credential connector registry，不是云连接器。[E: packages/core/src/connector.ts:180][E: packages/core/src/connector.ts:232] |

## Sources

- packages/opencode/src/auth/index.ts
- packages/opencode/src/account/account.ts
- packages/opencode/src/provider/auth.ts
- packages/plugin/src/index.ts
- packages/core/src/credential.ts
- packages/core/src/credential/sql.ts
- packages/core/src/connector.ts
- packages/core/src/connector/schema.ts

## 相关

- [Auth subsystem](../../subsystems/model-layer/auth.md)
- [V2 credential model](../../subsystems/model-layer/credential-v2.md)
- [Auth combinators](../../reference/auth-combinators.md)
