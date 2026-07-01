---
id: integrations.integration-v2
title: V2 Integration 子系统
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/integration.ts
  - packages/core/src/integration/connection.ts
  - packages/schema/src/integration.ts
  - packages/schema/src/connection.ts
  - packages/protocol/src/api.ts
  - packages/protocol/src/groups/integration.ts
  - packages/protocol/src/groups/credential.ts
  - packages/server/src/api.ts
  - packages/server/src/handlers/integration.ts
  - packages/server/src/handlers/credential.ts
  - packages/core/src/catalog.ts
  - packages/core/src/session/runner/model.ts
  - packages/core/src/plugin/models-dev.ts
symbols:
  - Integration.Service
  - Integration.Info
  - IntegrationConnection.Info
  - Integration.Attempt
  - IntegrationGroup
  - IntegrationHandler
  - CredentialGroup
  - CredentialHandler
related:
  - model-layer.credential-v2
  - model-layer.model-catalog-v2
  - server-api.v2-routes
  - sdk.surface
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 Integration 子系统是 provider authentication/discovery 的 location-scoped registry：core service 管 integration method registry、credential/env connection projection、OAuth attempt lifecycle；protocol/server route 把这些能力暴露为 `/api/integration/*` 与 `/api/credential/*`。

## 能回答的问题

- V2 integration registry 在当前源码中有哪些 service 方法。
- key、OAuth、env 三类 integration method 如何投射为 connection。
- protocol route 与 server handler 分别负责什么。
- provider/model availability 和 request auth 如何通过 integration connection 决定。
- 删除的 `packages/core/src/integration/schema.ts` 迁移到了哪里。

## 职责边界

`Integration.Service` 的 tag 是 `@opencode/v2/Integration`，service interface 覆盖 registry transform/reload、`get/list`、`connection.active/resolve/key/oauth/update/remove`，以及 `attempt.status/complete/cancel`。[E: packages/core/src/integration.ts:140] [E: packages/core/src/integration.ts:146] [E: packages/core/src/integration.ts:154] [E: packages/core/src/integration.ts:181] [E: packages/core/src/integration.ts:196]

删除的 `packages/core/src/integration/schema.ts` 不再是 schema source；core integration 现在从 `@opencode-ai/schema/integration` re-export `ID`、`MethodID`、`AttemptID`、method schemas、`Info`、attempt schemas 和 events。[E: packages/core/src/integration.ts:18] [E: packages/core/src/integration.ts:24] [E: packages/core/src/integration.ts:27] [E: packages/core/src/integration.ts:30] [E: packages/core/src/integration.ts:45] [E: packages/core/src/integration.ts:57] [E: packages/core/src/integration.ts:97] [E: packages/core/src/integration.ts:113]

`packages/schema/src/integration.ts` 定义 branded `ID`/`MethodID`，`AttemptID.create()` 仍生成 `con_` prefix 的 attempt id；connection union 则在 `packages/schema/src/connection.ts` 中定义 credential/env 两类。[E: packages/schema/src/integration.ts:11] [E: packages/schema/src/integration.ts:14] [E: packages/schema/src/integration.ts:102] [E: packages/schema/src/integration.ts:104] [E: packages/schema/src/connection.ts:7] [E: packages/schema/src/connection.ts:14] [E: packages/schema/src/connection.ts:19]

## 数据模型

method union 包含 OAuth、key、env：OAuth method 有 id、label 和 optional prompts；key method 有 optional label；env method 有 env var names。[E: packages/schema/src/integration.ts:52] [E: packages/schema/src/integration.ts:60] [E: packages/schema/src/integration.ts:66] [E: packages/schema/src/integration.ts:71]

`Integration.Info` 返回 id、name、methods、connections；connections 使用 `Connection.Info` union，所以 API consumer 只会看到 credential connection 或 env connection。[E: packages/schema/src/integration.ts:95] [E: packages/schema/src/integration.ts:98] [E: packages/schema/src/integration.ts:99] [E: packages/schema/src/connection.ts:19]

OAuth attempt status 有 pending、complete、failed、expired 四种；core runtime 配置 pending lifetime 为 10 minutes、terminal retention 为 1 minute、scrub interval 为 30 seconds。[E: packages/schema/src/integration.ts:121] [E: packages/schema/src/integration.ts:122] [E: packages/schema/src/integration.ts:123] [E: packages/schema/src/integration.ts:124] [E: packages/schema/src/integration.ts:125] [E: packages/core/src/integration.ts:198] [E: packages/core/src/integration.ts:199] [E: packages/core/src/integration.ts:200]

## Registry 与 connection

registry draft 用 `update(id, fn)` upsert integration ref，并在 method update 时按 method type/id upsert method；OAuth implementation 会额外写入 `implementations` map，用于后续 authorize/refresh/label。[E: packages/core/src/integration.ts:233] [E: packages/core/src/integration.ts:246] [E: packages/core/src/integration.ts:258] [E: packages/core/src/integration.ts:263] [E: packages/core/src/integration.ts:265]

`resolveConnections(entry, saved)` 先把 stored credentials 映射为 credential connections，再把当前 process env 中存在的 env method names 映射为 env connections；`connection.active(id)` 返回这个列表的第一项，因此 saved credential 优先于 env connection。[E: packages/core/src/integration.ts:288] [E: packages/core/src/integration.ts:289] [E: packages/core/src/integration.ts:296] [E: packages/core/src/integration.ts:300] [E: packages/core/src/integration.ts:381] [E: packages/core/src/integration.ts:383]

`connection.resolve` 对 env connection 读取 `process.env[name]` 并包装为 `Credential.Key`；credential connection 则读取 stored credential，key credential 直接返回，OAuth credential 可在即将过期时调用 implementation refresh 并更新 credential。[E: packages/core/src/integration.ts:385] [E: packages/core/src/integration.ts:386] [E: packages/core/src/integration.ts:390] [E: packages/core/src/integration.ts:392] [E: packages/core/src/integration.ts:397] [E: packages/core/src/integration.ts:400] [E: packages/core/src/integration.ts:401]

`connection.key` 要求 integration 存在 key method，然后保存 `Credential.Key` 并发布 `integration.connection.updated` 与 `integration.updated` events。[E: packages/core/src/integration.ts:404] [E: packages/core/src/integration.ts:408] [E: packages/core/src/integration.ts:410] [E: packages/core/src/integration.ts:413] [E: packages/core/src/integration.ts:415] [E: packages/core/src/integration.ts:416]

## OAuth Attempt

`connection.oauth` 查 OAuth implementation，fork attempt scope，调用 authorize，保存 pending attempt；auto mode 会 fork callback 并在 completion 后 settle。[E: packages/core/src/integration.ts:418] [E: packages/core/src/integration.ts:419] [E: packages/core/src/integration.ts:423] [E: packages/core/src/integration.ts:424] [E: packages/core/src/integration.ts:428] [E: packages/core/src/integration.ts:431] [E: packages/core/src/integration.ts:443] [E: packages/core/src/integration.ts:444]

`settle` 成功时把 OAuth value 写入 Credential service，发布 connection/global update events；失败时记录 failed message；两种情况都会关闭 attempt scope。[E: packages/core/src/integration.ts:322] [E: packages/core/src/integration.ts:327] [E: packages/core/src/integration.ts:333] [E: packages/core/src/integration.ts:335] [E: packages/core/src/integration.ts:340] [E: packages/core/src/integration.ts:341] [E: packages/core/src/integration.ts:343]

`attempt.complete` 在 code mode 且缺少 code 时返回 `Integration.CodeRequired`，否则执行 callback、settle，并在失败时返回 authorization failure。[E: packages/core/src/integration.ts:484] [E: packages/core/src/integration.ts:488] [E: packages/core/src/integration.ts:493] [E: packages/core/src/integration.ts:501] [E: packages/core/src/integration.ts:502] [E: packages/core/src/integration.ts:503]

## HTTP API

`packages/server/src/api.ts` 当前不直接列 group；它通过 `makeDefaultApi` 委托给 `packages/protocol/src/api.ts`，而 protocol API 把 `IntegrationGroup` 和 `CredentialGroup` 加进 `HttpApi.make("server")`。[E: packages/server/src/api.ts:1] [E: packages/server/src/api.ts:5] [E: packages/protocol/src/api.ts:21] [E: packages/protocol/src/api.ts:22] [E: packages/protocol/src/api.ts:45] [E: packages/protocol/src/api.ts:46]

| operation | method/path | handler action |
|---|---|---|
| `v2.integration.list` | `GET /api/integration` | `Integration.Service.list()` [E: packages/protocol/src/groups/integration.ts:12] [E: packages/protocol/src/groups/integration.ts:19] [E: packages/server/src/handlers/integration.ts:23] [E: packages/server/src/handlers/integration.ts:26] |
| `v2.integration.get` | `GET /api/integration/:integrationID` | `Integration.Service.get(integrationID)` [E: packages/protocol/src/groups/integration.ts:26] [E: packages/protocol/src/groups/integration.ts:34] [E: packages/server/src/handlers/integration.ts:30] [E: packages/server/src/handlers/integration.ts:33] |
| `v2.integration.connect.key` | `POST /api/integration/:integrationID/connect/key` | `connection.key({ integrationID, key, label })` [E: packages/protocol/src/groups/integration.ts:41] [E: packages/protocol/src/groups/integration.ts:54] [E: packages/server/src/handlers/integration.ts:37] [E: packages/server/src/handlers/integration.ts:41] |
| `v2.integration.connect.oauth` | `POST /api/integration/:integrationID/connect/oauth` | `connection.oauth({ integrationID, methodID, inputs, label })` [E: packages/protocol/src/groups/integration.ts:61] [E: packages/protocol/src/groups/integration.ts:75] [E: packages/server/src/handlers/integration.ts:51] [E: packages/server/src/handlers/integration.ts:56] |
| `v2.integration.attempt.status` | `GET /api/integration/attempt/:attemptID` | `attempt.status(attemptID)` [E: packages/protocol/src/groups/integration.ts:82] [E: packages/protocol/src/groups/integration.ts:90] [E: packages/server/src/handlers/integration.ts:67] [E: packages/server/src/handlers/integration.ts:70] |
| `v2.integration.attempt.complete` | `POST /api/integration/attempt/:attemptID/complete` | `attempt.complete({ attemptID, code })` [E: packages/protocol/src/groups/integration.ts:97] [E: packages/protocol/src/groups/integration.ts:107] [E: packages/server/src/handlers/integration.ts:74] [E: packages/server/src/handlers/integration.ts:77] |
| `v2.integration.attempt.cancel` | `DELETE /api/integration/attempt/:attemptID` | `attempt.cancel(attemptID)` [E: packages/protocol/src/groups/integration.ts:114] [E: packages/protocol/src/groups/integration.ts:122] [E: packages/server/src/handlers/integration.ts:96] [E: packages/server/src/handlers/integration.ts:99] |
| `v2.credential.update` | `PATCH /api/credential/:credentialID` | `connection.update(credentialID, { label })` [E: packages/protocol/src/groups/credential.ts:8] [E: packages/protocol/src/groups/credential.ts:17] [E: packages/server/src/handlers/credential.ts:9] [E: packages/server/src/handlers/credential.ts:11] |
| `v2.credential.remove` | `DELETE /api/credential/:credentialID` | `connection.remove(credentialID)` [E: packages/protocol/src/groups/credential.ts:24] [E: packages/protocol/src/groups/credential.ts:32] [E: packages/server/src/handlers/credential.ts:16] [E: packages/server/src/handlers/credential.ts:18] |

## Catalog 与 Runner

`Catalog.provider.available()` 读取 `Integration.Service.list()`，provider availability 规则是：disabled provider 不可用；provider 有 static apiKey 可用；integration 有 connection 可用；provider 没有 integrationID 且没有 matching integration 也可用。[E: packages/core/src/catalog.ts:69] [E: packages/core/src/catalog.ts:71] [E: packages/core/src/catalog.ts:72] [E: packages/core/src/catalog.ts:73] [E: packages/core/src/catalog.ts:74] [E: packages/core/src/catalog.ts:75] [E: packages/core/src/catalog.ts:184] [E: packages/core/src/catalog.ts:185] [E: packages/core/src/catalog.ts:187]

`SessionRunnerModel.locationLayer` 在选定 provider/model 后读取 `integrations.connection.active(provider.integrationID ?? providerID)`，再用 `integrations.connection.resolve(connection)` 得到 request credential；`fromCatalogModel` 对 key credential 的 metadata 合并 request body，并按 provider protocol 设置 bearer/header auth。[E: packages/core/src/session/runner/model.ts:185] [E: packages/core/src/session/runner/model.ts:186] [E: packages/core/src/session/runner/model.ts:204] [E: packages/core/src/session/runner/model.ts:205] [E: packages/core/src/session/runner/model.ts:211] [E: packages/core/src/session/runner/model.ts:135] [E: packages/core/src/session/runner/model.ts:141] [E: packages/core/src/session/runner/model.ts:145] [E: packages/core/src/session/runner/model.ts:152] [E: packages/core/src/session/runner/model.ts:159]

`ModelsDevPlugin` 仍是 provider catalog 的主要 registration source：有 env var list 的 provider 会注册 integration ref、key method、env method，然后写入 provider/model catalog。[E: packages/core/src/plugin/models-dev.ts:142] [E: packages/core/src/plugin/models-dev.ts:147] [E: packages/core/src/plugin/models-dev.ts:150] [E: packages/core/src/plugin/models-dev.ts:164] [E: packages/core/src/plugin/models-dev.ts:162]

## Gotcha

- 当前 route definition 不在 `packages/server/src/groups/*`；`IntegrationGroup` 和 `CredentialGroup` 已移动到 `packages/protocol/src/groups/*`，server 只提供 handler implementation。[E: packages/protocol/src/groups/integration.ts:10] [E: packages/protocol/src/groups/credential.ts:6] [E: packages/server/src/handlers/integration.ts:19] [E: packages/server/src/handlers/credential.ts:6]
- `CredentialHandler` 不直接依赖 `Credential.Service`，而是通过 `Integration.Service.connection.update/remove` 修改 connection-facing state。[E: packages/server/src/handlers/credential.ts:1] [E: packages/server/src/handlers/credential.ts:11] [E: packages/server/src/handlers/credential.ts:18]
- env connection 是 process env 检测，不会把 secret 写入 credential table；实际 secret 只在 `connection.resolve` 读取时用 `Credential.Key.make` 包装。[E: packages/core/src/integration.ts:296] [E: packages/core/src/integration.ts:298] [E: packages/core/src/integration.ts:386] [E: packages/core/src/integration.ts:388]

## Sources

- packages/core/src/integration.ts
- packages/core/src/integration/connection.ts
- packages/schema/src/integration.ts
- packages/schema/src/connection.ts
- packages/protocol/src/api.ts
- packages/protocol/src/groups/integration.ts
- packages/protocol/src/groups/credential.ts
- packages/server/src/api.ts
- packages/server/src/handlers/integration.ts
- packages/server/src/handlers/credential.ts
- packages/core/src/catalog.ts
- packages/core/src/session/runner/model.ts
- packages/core/src/plugin/models-dev.ts

## 相关

- [V2 Credential](../model-layer/credential-v2.md)
- [V2 catalog](../model-layer/model-catalog-v2.md)
- [V2 route catalog](../../surface/server-api/v2-routes.md)
- [SDK surface](../../surface/sdk/surface.md)
