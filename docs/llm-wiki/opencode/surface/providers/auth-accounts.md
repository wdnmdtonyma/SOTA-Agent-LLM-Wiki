---
id: provider.auth-accounts
title: Provider 认证与账号账户面
kind: surface
tier: T1
v: shared
source: [packages/opencode/src/auth/index.ts, packages/opencode/src/account/account.ts, packages/opencode/src/provider/auth.ts, packages/plugin/src/index.ts, packages/core/src/credential.ts, packages/core/src/credential/sql.ts, packages/core/src/integration.ts, packages/core/src/integration/connection.ts, packages/schema/src/credential.ts, packages/schema/src/integration.ts, packages/schema/src/connection.ts]
symbols: [Auth, Account, ProviderAuth, Credential, Integration, IntegrationConnection]
related: [model-layer.auth, model-layer.credential-v2, integrations.integration-v2, ref.auth-combinators]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Provider auth/accounts 横跨两代：V1 用 `auth.json`、Console device-code account login 和 plugin `auth` hook；V2 用 `Credential` durable table 与 `Integration` 本地 authentication registry。旧 connector module 已被 `packages/core/src/integration.ts` 取代。

## 能回答的问题

- V1 API key、OAuth token 和 well-known auth 分别存在哪里、schema 是什么？
- V1 Console account login 怎样完成 device code、poll、token refresh 和 org switch？
- V1 plugin `auth` hook 的 `methods()`、`authorize()`、`callback()` 如何接上 `/provider/:id/oauth/*` route？
- V2 `Credential` 表如何表示 OAuth/key credential？
- V2 `Integration` 如何表示 key/OAuth/env method 和 connection？

## V1

### `Auth` storage

V1 provider credential 文件是 `Global.Path.data/auth.json`；`Auth.all()` 优先读取 `OPENCODE_AUTH_CONTENT`，否则读该 JSON 文件并按 `Auth.Info` schema 过滤记录。[E: packages/opencode/src/auth/index.ts:10][E: packages/opencode/src/auth/index.ts:58][E: packages/opencode/src/auth/index.ts:59][E: packages/opencode/src/auth/index.ts:65][E: packages/opencode/src/auth/index.ts:66] `Auth.Info` 有三种 variant：`oauth` 包含 access/refresh/expires/accountID/enterpriseUrl，`api` 包含 key，`wellknown` 包含 key 与 token。[E: packages/opencode/src/auth/index.ts:14][E: packages/opencode/src/auth/index.ts:16][E: packages/opencode/src/auth/index.ts:17][E: packages/opencode/src/auth/index.ts:18][E: packages/opencode/src/auth/index.ts:19][E: packages/opencode/src/auth/index.ts:20][E: packages/opencode/src/auth/index.ts:23][E: packages/opencode/src/auth/index.ts:25][E: packages/opencode/src/auth/index.ts:29][E: packages/opencode/src/auth/index.ts:31][E: packages/opencode/src/auth/index.ts:32]

`Auth.set()` 和 `Auth.remove()` 都会把 provider id 尾部 `/` 去掉后写回 JSON 文件，写文件 mode 是 `0o600`。[E: packages/opencode/src/auth/index.ts:73][E: packages/opencode/src/auth/index.ts:74][E: packages/opencode/src/auth/index.ts:75][E: packages/opencode/src/auth/index.ts:79][E: packages/opencode/src/auth/index.ts:83][E: packages/opencode/src/auth/index.ts:84][E: packages/opencode/src/auth/index.ts:88] `Auth.get()` 只是从 `all()` 结果按 provider key 返回单条 credential。[E: packages/opencode/src/auth/index.ts:69][E: packages/opencode/src/auth/index.ts:70]

### Console account device-code flow

`Account` service 管理 opencode Console account，而不是第三方 provider API key。它的 interface 包含 `active`、`activeOrg`、`list`、`orgsByAccount`、`remove`、`use`、`orgs`、`config`、`token`、`login`、`poll`。[E: packages/opencode/src/account/account.ts:169][E: packages/opencode/src/account/account.ts:170][E: packages/opencode/src/account/account.ts:171][E: packages/opencode/src/account/account.ts:172][E: packages/opencode/src/account/account.ts:173][E: packages/opencode/src/account/account.ts:174][E: packages/opencode/src/account/account.ts:175][E: packages/opencode/src/account/account.ts:176][E: packages/opencode/src/account/account.ts:180][E: packages/opencode/src/account/account.ts:181][E: packages/opencode/src/account/account.ts:182] device code 登录使用 client id `opencode-cli`，`login()` POST `${url}/auth/device/code` 并只提交 `client_id`。[E: packages/opencode/src/account/account.ts:123][E: packages/opencode/src/account/account.ts:137][E: packages/opencode/src/account/account.ts:375][E: packages/opencode/src/account/account.ts:378][E: packages/opencode/src/account/account.ts:380]

`poll()` POST `${url}/auth/device/token`，grant type 是 `urn:ietf:params:oauth:grant-type:device_code`；成功后并发读取 `/api/user` 和 `/api/orgs`，再把 account id、email、server url、access/refresh token、expiry 与选中的 org id 持久化。[E: packages/opencode/src/account/account.ts:397][E: packages/opencode/src/account/account.ts:399][E: packages/opencode/src/account/account.ts:403][E: packages/opencode/src/account/account.ts:300][E: packages/opencode/src/account/account.ts:287][E: packages/opencode/src/account/account.ts:418][E: packages/opencode/src/account/account.ts:419][E: packages/opencode/src/account/account.ts:421][E: packages/opencode/src/account/account.ts:430][E: packages/opencode/src/account/account.ts:431][E: packages/opencode/src/account/account.ts:432][E: packages/opencode/src/account/account.ts:433][E: packages/opencode/src/account/account.ts:434][E: packages/opencode/src/account/account.ts:435][E: packages/opencode/src/account/account.ts:436][E: packages/opencode/src/account/account.ts:437] `token()` 在 token 过期前 5 分钟就认为需要刷新，并通过 refresh token 再 POST `/auth/device/token` 更新 stored token。[E: packages/opencode/src/account/account.ts:138][E: packages/opencode/src/account/account.ts:141][E: packages/opencode/src/account/account.ts:220][E: packages/opencode/src/account/account.ts:224][E: packages/opencode/src/account/account.ts:238][E: packages/opencode/src/account/account.ts:248][E: packages/opencode/src/account/account.ts:257][E: packages/opencode/src/account/account.ts:259][E: packages/opencode/src/account/account.ts:311][E: packages/opencode/src/account/account.ts:312][E: packages/opencode/src/account/account.ts:269][E: packages/opencode/src/account/account.ts:273]

### Plugin provider auth hook

V1 plugin `AuthHook` 绑定一个 provider id，可以有 `loader(auth, provider)`，并暴露 oauth 或 api methods；OAuth method 的 `authorize()` 返回 url/instructions 和 `callback()`，API method 可以直接返回 `{ type: "success", key, provider?, metadata? }`。[E: packages/plugin/src/index.ts:88][E: packages/plugin/src/index.ts:90][E: packages/plugin/src/index.ts:91][E: packages/plugin/src/index.ts:120][E: packages/plugin/src/index.ts:150][E: packages/plugin/src/index.ts:152][E: packages/plugin/src/index.ts:153][E: packages/plugin/src/index.ts:154][E: packages/plugin/src/index.ts:155][E: packages/plugin/src/index.ts:165][E: packages/plugin/src/index.ts:168][E: packages/plugin/src/index.ts:189] `ProviderAuth` service 从 plugin list 中筛出 `x.auth?.provider`，把 hook 按 provider id 存入 state。[E: packages/opencode/src/provider/auth.ts:116][E: packages/opencode/src/provider/auth.ts:120][E: packages/opencode/src/provider/auth.ts:122][E: packages/opencode/src/provider/auth.ts:125]

`methods()` 把所有 plugin auth methods 序列化给 API route，返回 provider id 到 method array 的 record；它保留 prompt 的 text/select/when/placeholder/options 等可序列化 metadata，但不返回 function body 或 `validate` 函数。[E: packages/opencode/src/provider/auth.ts:47][E: packages/opencode/src/provider/auth.ts:90][E: packages/opencode/src/provider/auth.ts:131][E: packages/opencode/src/provider/auth.ts:134][E: packages/opencode/src/provider/auth.ts:139][E: packages/opencode/src/provider/auth.ts:145][E: packages/opencode/src/provider/auth.ts:146][E: packages/opencode/src/provider/auth.ts:153][E: packages/opencode/src/provider/auth.ts:154] `authorize(input)` 当前只接受 OAuth method；它按 `providerID` 和 method index 取 hook method、校验 prompts、调用 plugin `authorize()`，把 pending callback 存在内存 state，然后返回 authorization url、method 和 instructions。[E: packages/opencode/src/provider/auth.ts:92][E: packages/opencode/src/provider/auth.ts:163][E: packages/opencode/src/provider/auth.ts:166][E: packages/opencode/src/provider/auth.ts:167][E: packages/opencode/src/provider/auth.ts:168][E: packages/opencode/src/provider/auth.ts:172][E: packages/opencode/src/provider/auth.ts:179][E: packages/opencode/src/provider/auth.ts:180][E: packages/opencode/src/provider/auth.ts:181][E: packages/opencode/src/provider/auth.ts:182][E: packages/opencode/src/provider/auth.ts:183][E: packages/opencode/src/provider/auth.ts:184] `callback()` 根据 pending method 的 callback result 写 `Auth.Info`：带 `key` 的 result 写 api credential，带 `refresh` 的 result 写 oauth credential。[E: packages/opencode/src/provider/auth.ts:188][E: packages/opencode/src/provider/auth.ts:198][E: packages/opencode/src/provider/auth.ts:203][E: packages/opencode/src/provider/auth.ts:204][E: packages/opencode/src/provider/auth.ts:205][E: packages/opencode/src/provider/auth.ts:206][E: packages/opencode/src/provider/auth.ts:207][E: packages/opencode/src/provider/auth.ts:211][E: packages/opencode/src/provider/auth.ts:213][E: packages/opencode/src/provider/auth.ts:214][E: packages/opencode/src/provider/auth.ts:215][E: packages/opencode/src/provider/auth.ts:216][E: packages/opencode/src/provider/auth.ts:217][E: packages/opencode/src/provider/auth.ts:218]

## V2

### Credential durable model

V2 secret payload 是 `Credential.Value` union：OAuth value 包含 `methodID/refresh/access/expires/metadata`，Key value 包含 `key/metadata`。[E: packages/schema/src/credential.ts:16][E: packages/schema/src/credential.ts:18][E: packages/schema/src/credential.ts:19][E: packages/schema/src/credential.ts:20][E: packages/schema/src/credential.ts:21][E: packages/schema/src/credential.ts:22][E: packages/schema/src/credential.ts:26][E: packages/schema/src/credential.ts:28][E: packages/schema/src/credential.ts:29][E: packages/schema/src/credential.ts:32] Core `Credential.Info` 是 stored credential record，包含 `id/integrationID/label/value`。[E: packages/core/src/credential.ts:23][E: packages/core/src/credential.ts:24][E: packages/core/src/credential.ts:25][E: packages/core/src/credential.ts:26][E: packages/core/src/credential.ts:27]

SQL `credential` 表的新读写字段是 `id`、`integration_id`、`label`、JSON `value` 和 timestamps；`connector_id`、`method_id`、`active` 仍作为 compatibility columns 留在 schema 中，但 current service 解码时要求 `integration_id` 并只投影 `id/integrationID/label/value`。[E: packages/core/src/credential/sql.ts:5][E: packages/core/src/credential/sql.ts:6][E: packages/core/src/credential/sql.ts:7][E: packages/core/src/credential/sql.ts:8][E: packages/core/src/credential/sql.ts:9][E: packages/core/src/credential/sql.ts:10][E: packages/core/src/credential/sql.ts:11][E: packages/core/src/credential/sql.ts:12][E: packages/core/src/credential/sql.ts:13][E: packages/core/src/credential.ts:56][E: packages/core/src/credential.ts:57][E: packages/core/src/credential.ts:58][E: packages/core/src/credential.ts:59][E: packages/core/src/credential.ts:60][E: packages/core/src/credential.ts:61][E: packages/core/src/credential.ts:62]

`Credential.create()` 是 replacement-by-integration：生成新 `cred_` id，在 transaction 中删除同 `integration_id` 的旧 rows，再插入新 row；`Credential.remove()` 只按 credential id 删除，不再选择 replacement active row。[E: packages/schema/src/credential.ts:9][E: packages/schema/src/credential.ts:11][E: packages/core/src/credential.ts:94][E: packages/core/src/credential.ts:96][E: packages/core/src/credential.ts:101][E: packages/core/src/credential.ts:105][E: packages/core/src/credential.ts:106][E: packages/core/src/credential.ts:109][E: packages/core/src/credential.ts:111][E: packages/core/src/credential.ts:112][E: packages/core/src/credential.ts:113][E: packages/core/src/credential.ts:114][E: packages/core/src/credential.ts:131][E: packages/core/src/credential.ts:132]

### Integration registry

V2 `Integration` 是 local authentication/integration registry：method union 包含 OAuth/key/env，`Integration.Info` 暴露 id/name/methods/connections，connection union 是 credential connection 或 env connection。[E: packages/schema/src/integration.ts:51][E: packages/schema/src/integration.ts:52][E: packages/schema/src/integration.ts:59][E: packages/schema/src/integration.ts:60][E: packages/schema/src/integration.ts:65][E: packages/schema/src/integration.ts:66][E: packages/schema/src/integration.ts:71][E: packages/schema/src/integration.ts:95][E: packages/schema/src/integration.ts:96][E: packages/schema/src/integration.ts:97][E: packages/schema/src/integration.ts:98][E: packages/schema/src/integration.ts:99][E: packages/schema/src/connection.ts:7][E: packages/schema/src/connection.ts:14][E: packages/schema/src/connection.ts:19]

`connection.key()` 只要求 integration 有 key method，然后把输入 secret 存成 `Credential.Key`；`connection.oauth()` 创建 stateful OAuth attempt，成功 settle 后通过 `Credential.create()` 写 credential。[E: packages/core/src/integration.ts:404][E: packages/core/src/integration.ts:408][E: packages/core/src/integration.ts:410][E: packages/core/src/integration.ts:413][E: packages/core/src/integration.ts:418][E: packages/core/src/integration.ts:428][E: packages/core/src/integration.ts:431][E: packages/core/src/integration.ts:450][E: packages/core/src/integration.ts:322][E: packages/core/src/integration.ts:335]

## V1/V2 对照

| 维度 | V1 | V2 |
|---|---|---|
| provider key storage | `data/auth.json`，schema 是 `oauth`/`api`/`wellknown`。[E: packages/opencode/src/auth/index.ts:10][E: packages/opencode/src/auth/index.ts:35] | SQLite `credential` table，stored value 是 `oauth`/`key`。[E: packages/core/src/credential/sql.ts:5][E: packages/core/src/credential/sql.ts:9][E: packages/schema/src/credential.ts:32] |
| third-party auth surface | plugin `auth` hook 经 `ProviderAuth.authorize()` / `ProviderAuth.callback()` 间接写 `Auth`。[E: packages/opencode/src/provider/auth.ts:163][E: packages/opencode/src/provider/auth.ts:181][E: packages/opencode/src/provider/auth.ts:188][E: packages/opencode/src/provider/auth.ts:213] | `Integration` key/OAuth connection flow 经 `Credential.create()` 写 durable credential。[E: packages/core/src/integration.ts:410][E: packages/core/src/integration.ts:335] |
| account login | `Account` 是 opencode Console device-code account，不是 provider API key。[E: packages/opencode/src/account/account.ts:375][E: packages/opencode/src/account/account.ts:397] | V2 `Credential` schema 不包含 Console account flow；它只存 integration credentials。[E: packages/core/src/credential.ts:23][E: packages/core/src/credential.ts:25] |
| naming trap | V1 没有 `Integration.Service`。 | HEAD 使用 `Integration.Service`，不是旧 `Connector.Service`；`Integration.list()` 和 `Integration.connection.active()` 会投影 credential/env connections。[E: packages/core/src/integration.ts:196][E: packages/core/src/integration.ts:374][E: packages/core/src/integration.ts:381][E: packages/core/src/integration.ts:288][E: packages/core/src/integration.ts:300] |

## Sources

- packages/opencode/src/auth/index.ts
- packages/opencode/src/account/account.ts
- packages/opencode/src/provider/auth.ts
- packages/plugin/src/index.ts
- packages/core/src/credential.ts
- packages/core/src/credential/sql.ts
- packages/core/src/integration.ts
- packages/core/src/integration/connection.ts
- packages/schema/src/credential.ts
- packages/schema/src/integration.ts
- packages/schema/src/connection.ts

## 相关

- [Auth subsystem](../../subsystems/model-layer/auth.md)
- [V2 credential model](../../subsystems/model-layer/credential-v2.md)
- [V2 integration subsystem](../../subsystems/integrations/integration-v2.md)
- [Auth combinators](../../reference/auth-combinators.md)
