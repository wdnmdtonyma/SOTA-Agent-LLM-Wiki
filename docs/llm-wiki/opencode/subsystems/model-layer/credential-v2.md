---
id: model-layer.credential-v2
title: Credential V2
kind: subsystem
tier: T1
v: v2
source: [packages/core/src/credential/sql.ts, packages/core/src/connector.ts]
symbols: [Credential.Service, CredentialTable, Connector.Service, Connector.Attempt, Connector.OAuthMethod, Connector.KeyMethod]
related: [model-layer.auth]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V2 credential layer 把 provider credentials 存在 SQLite `credential` 表,用 `Credential.Service` 管 active credential,用 `Connector.Service` 注册 key/OAuth methods 并管理 OAuth attempt lifecycle。`connector.ts` 是本地凭据注册表,不是云连接器。

## 能回答的问题
- `credential` 表有哪些字段和唯一约束?
- V2 credential value 支持 key 与 OAuth 哪些字段?
- create/activate/remove 如何维护同 connector 只有一个 active credential?
- Connector key/OAuth method 怎么写入 Credential?
- OAuth attempt 的 pending/complete/failed/expired 状态怎么维护?

## Storage Schema

SQLite `CredentialTable` 表名是 `credential`,字段包括 id、connector_id、method_id、label、value JSON、active boolean、timestamps。[E: packages/core/src/credential/sql.ts:8][E: packages/core/src/credential/sql.ts:10][E: packages/core/src/credential/sql.ts:16] 表上有 `credential_connector_active_idx` partial unique index,约束同一 connector 在 `active = 1` 时只能有一个 active credential。[E: packages/core/src/credential/sql.ts:19][E: packages/core/src/credential/sql.ts:21]

`Credential.Value` union 只有 `OAuth` 与 `Key`:OAuth 字段是 type/refresh/access/expires/metadata,Key 字段是 type/key/metadata。[E: packages/core/src/credential.ts:23][E: packages/core/src/credential.ts:27][E: packages/core/src/credential.ts:31][E: packages/core/src/credential.ts:33][E: packages/core/src/credential.ts:36]

`Credential.Info` 字段是 id、connectorID、methodID、label、value。[E: packages/core/src/credential.ts:58][E: packages/core/src/credential.ts:63]

## Credential.Service

service surface 包含 get/all/create/update/remove/activate/active/activeAll/forConnector。[E: packages/core/src/credential.ts:86][E: packages/core/src/credential.ts:99]

`create` 总是生成新 id,默认 label 是 `"default"`,并在事务中把同 connector 旧 active 全部置 false,插入新 credential 为 active,然后发布 `credential.added` 与 `credential.switched`。[E: packages/core/src/credential.ts:249][E: packages/core/src/credential.ts:252][E: packages/core/src/credential.ts:263][E: packages/core/src/credential.ts:276][E: packages/core/src/credential.ts:283][E: packages/core/src/credential.ts:284]

`activate` 先查 credential,如果不存在或已 active 就返回;否则在事务中找当前 active,把同 connector 全部置 inactive,再把目标 id 置 active,成功后发布 switched event。[E: packages/core/src/credential.ts:187][E: packages/core/src/credential.ts:188][E: packages/core/src/credential.ts:194][E: packages/core/src/credential.ts:199][E: packages/core/src/credential.ts:204]

`remove` 删除 credential;如果删除的是 active credential,会选择同 connector 最早创建的其他 credential 作为 replacement active,再发布 removed 与 switched event。[E: packages/core/src/credential.ts:300][E: packages/core/src/credential.ts:302][E: packages/core/src/credential.ts:303][E: packages/core/src/credential.ts:308][E: packages/core/src/credential.ts:313][E: packages/core/src/credential.ts:325][E: packages/core/src/credential.ts:326]

legacy import layer 会从 global `auth.json` 导入旧 V1 auth:legacy `api` 变 key credential,legacy OAuth 保留 refresh/access/expires 并迁移 account/enterprise metadata,插入时 active=true。[E: packages/core/src/credential.ts:111][E: packages/core/src/credential.ts:127][E: packages/core/src/credential.ts:129][E: packages/core/src/credential.ts:130][E: packages/core/src/credential.ts:135][E: packages/core/src/credential.ts:137][E: packages/core/src/credential.ts:153][E: packages/core/src/credential.ts:159]

## Connector Model

Connector id/method id 来自 `ConnectorSchema`;attempt id 以 `con_` 加 ascending identifier 创建。[E: packages/core/src/connector.ts:13][E: packages/core/src/connector.ts:16][E: packages/core/src/connector.ts:21]

connector prompt 支持 text/select,每个 prompt 可带 `when` 条件。[E: packages/core/src/connector.ts:32][E: packages/core/src/connector.ts:37][E: packages/core/src/connector.ts:40][E: packages/core/src/connector.ts:51] method 支持 OAuthMethod 与 KeyMethod,Info 是 id/name/methods。[E: packages/core/src/connector.ts:57][E: packages/core/src/connector.ts:64][E: packages/core/src/connector.ts:74][E: packages/core/src/connector.ts:77]

implementation 分两类:OAuthImplementation 有 authorize 与 optional refresh,KeyImplementation 有 authorize(key, inputs)。[E: packages/core/src/connector.ts:96][E: packages/core/src/connector.ts:106]

service surface 包含 registry transform/update/get/list/refresh,以及 `connect.key` 和 `connect.oauth.begin/status/complete/cancel`。[E: packages/core/src/connector.ts:180][E: packages/core/src/connector.ts:190][E: packages/core/src/connector.ts:193][E: packages/core/src/connector.ts:207][E: packages/core/src/connector.ts:227]

## OAuth Attempt Lifecycle

attempt lifetime 是 10 分钟,terminal retention 是 1 分钟,scrub 每 30 秒运行。[E: packages/core/src/connector.ts:236][E: packages/core/src/connector.ts:237][E: packages/core/src/connector.ts:238]

`connect.oauth.begin` 查找 OAuth implementation,创建 child scope,执行 authorize,生成 attempt id 与 expiry,把 pending attempt 放入 in-memory attempts map;auto mode 会 fork callback 并在完成后 settle。[E: packages/core/src/connector.ts:410][E: packages/core/src/connector.ts:414][E: packages/core/src/connector.ts:415][E: packages/core/src/connector.ts:419][E: packages/core/src/connector.ts:421][E: packages/core/src/connector.ts:422][E: packages/core/src/connector.ts:434][E: packages/core/src/connector.ts:437]

`status` 返回 pending/complete/failed/expired 状态,failed 会带 message。[E: packages/core/src/connector.ts:449][E: packages/core/src/connector.ts:455]

`complete` 会防止重复 completion,code mode 没 code 时返回 `CodeRequiredError`,执行 callback 后调用 settle;失败时会 re-yield 已经由 `authorize` 映射后的 failure exit。[E: packages/core/src/connector.ts:458][E: packages/core/src/connector.ts:467][E: packages/core/src/connector.ts:474][E: packages/core/src/connector.ts:475][E: packages/core/src/connector.ts:476][E: packages/core/src/connector.ts:309][E: packages/core/src/connector.ts:310]

`settle` 对 success 会调用 `credentials.create({ connectorID, methodID, label, value })`,并关闭 attempt scope;failure 则把 attempt 标为 failed 并保留 message。[E: packages/core/src/connector.ts:325][E: packages/core/src/connector.ts:327][E: packages/core/src/connector.ts:332][E: packages/core/src/connector.ts:339]

`refresh` 使用 credential id keyed mutex,只刷新 OAuth credential,查找原 connector/method implementation 的 refresh 方法,并用 `credentials.update` 保存新的 OAuth value。[E: packages/core/src/connector.ts:373][E: packages/core/src/connector.ts:390]

`connect.key` 查 key implementation,调用 method.authorize(key, inputs),然后创建 credential。[E: packages/core/src/connector.ts:395][E: packages/core/src/connector.ts:405]

## 与 Catalog 的关系

Catalog query projection 会读取 `credentials.activeAll()`:当 active credential 的 connector id 等于 provider id,key credential 把 key/metadata 写入 request body,OAuth credential 把 access token 写为 apiKey,并把 provider enabled 标成 credential 来源。[E: packages/core/src/catalog.ts:214][E: packages/core/src/catalog.ts:234][E: packages/core/src/catalog.ts:103][E: packages/core/src/catalog.ts:107][E: packages/core/src/catalog.ts:108][E: packages/core/src/catalog.ts:110][E: packages/core/src/catalog.ts:113]

ModelsDevPlugin 会为有 env 的 provider 注册 KeyMethod `api-key`,authorize 直接把输入 key 包成 `Credential.Key`。[E: packages/core/src/plugin/models-dev.ts:69][E: packages/core/src/plugin/models-dev.ts:72][E: packages/core/src/plugin/models-dev.ts:75][E: packages/core/src/plugin/models-dev.ts:79]

## 易错点

- `Connector.Service` 维护的是本地 login method registry 与 OAuth attempt state:registry record 保存 connector info 与 method implementations,attempt map 是进程内 `SynchronizedRef`。[E: packages/core/src/connector.ts:160][E: packages/core/src/connector.ts:166][E: packages/core/src/connector.ts:265] 这说明这里的 connector 不是外部 connector/cloud integration。[I]
- active uniqueness 既由 service transaction 维护,也由 SQLite partial unique index 兜底。[E: packages/core/src/credential/sql.ts:19][E: packages/core/src/credential/sql.ts:21][E: packages/core/src/credential.ts:263][E: packages/core/src/credential.ts:276]
- OAuth attempt map 是内存状态;credential 持久化发生在 settle success 调 `credentials.create` 时。[E: packages/core/src/connector.ts:265][E: packages/core/src/connector.ts:332]

## Sources
- packages/core/src/credential/sql.ts
- packages/core/src/credential.ts
- packages/core/src/connector.ts
- packages/core/src/catalog.ts
- packages/core/src/plugin/models-dev.ts

## Related
- model-layer.auth
