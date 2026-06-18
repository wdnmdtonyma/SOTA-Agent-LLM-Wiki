---
id: integrations.integration-v2
title: V2 Integration 子系统
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/integration.ts, packages/core/src/integration/connection.ts, packages/core/src/integration/schema.ts, packages/server/src/groups/integration.ts, packages/server/src/handlers/integration.ts, packages/server/src/groups/credential.ts, packages/server/src/handlers/credential.ts, packages/core/src/catalog.ts, packages/core/src/session/runner/model.ts]
symbols: [Integration.Service, Integration.Info, IntegrationConnection.Info, Integration.Attempt, IntegrationGroup, IntegrationHandler, CredentialGroup, CredentialHandler]
related: [model-layer.credential-v2, model-layer.model-catalog-v2, server-api.v2-routes, sdk.surface]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 Integration 子系统是 provider authentication/discovery 的 location-scoped registry：它注册 integration methods，展示 credential/env connections，管理 OAuth attempts，并让 catalog/model resolution 从 connection 派生可用性和 api key。

## 能回答的问题
- `integration.ts` 取代旧 `connector.ts` 后承担哪些职责?
- key、OAuth、env 三类 integration method 分别如何影响 connection?
- `/api/integration/*` 和 `/api/credential/*` route 各自处理什么?
- provider/model availability 如何由 integration connection 决定?
- model runner 如何把 credential/env connection 转成 request auth?

## 职责边界

`Integration.Service` 的 tag 是 `@opencode/v2/Integration`，service interface 覆盖 registry transform/update、`get/list`、`connection.list/forIntegration/key/oauth/update/remove`，以及 `attempt.status/complete/cancel`。[E: packages/core/src/integration.ts:196][E: packages/core/src/integration.ts:202][E: packages/core/src/integration.ts:204][E: packages/core/src/integration.ts:205][E: packages/core/src/integration.ts:211][E: packages/core/src/integration.ts:220][E: packages/core/src/integration.ts:231][E: packages/core/src/integration.ts:238][E: packages/core/src/integration.ts:242][E: packages/core/src/integration.ts:249][E: packages/core/src/integration.ts:253]

`Integration.ID` 和 `Integration.MethodID` 是 branded string；attempt id 使用 `con_` prefix，这保留了旧 connector attempt id 的 prefix 兼容，但命名空间现在是 Integration。[E: packages/core/src/integration/schema.ts:5][E: packages/core/src/integration/schema.ts:8][E: packages/core/src/integration.ts:19][E: packages/core/src/integration.ts:21]

`Integration.Info` 返回 id、name、methods、connections；connection union 只有 credential connection 和 env connection 两类。[E: packages/core/src/integration.ts:82][E: packages/core/src/integration.ts:83][E: packages/core/src/integration.ts:84][E: packages/core/src/integration.ts:85][E: packages/core/src/integration.ts:86][E: packages/core/src/integration/connection.ts:6][E: packages/core/src/integration/connection.ts:13][E: packages/core/src/integration/connection.ts:19]

## Method Registry

method union 包含 OAuth、key、env。OAuth method 有 id、label、optional prompts；key method 有 optional label；env method 有 env var names。[E: packages/core/src/integration.ts:59][E: packages/core/src/integration.ts:60][E: packages/core/src/integration.ts:62][E: packages/core/src/integration.ts:63][E: packages/core/src/integration.ts:67][E: packages/core/src/integration.ts:69][E: packages/core/src/integration.ts:73][E: packages/core/src/integration.ts:75][E: packages/core/src/integration.ts:79]

registry editor 的 `method.update` 会按 method type upsert；OAuth method 还按 method id 存入 implementations map，key/env method 只登记 method metadata。[E: packages/core/src/integration.ts:301][E: packages/core/src/integration.ts:303][E: packages/core/src/integration.ts:317][E: packages/core/src/integration.ts:319][E: packages/core/src/integration.ts:322][E: packages/core/src/integration.ts:324][E: packages/core/src/integration.ts:325]

`ModelsDevPlugin` 是当前 provider catalog 的主 registration source：它对有 env var list 的 provider 注册 integration name、key method 和 env method，再写入 provider/model catalog。[E: packages/core/src/plugin/models-dev.ts:64][E: packages/core/src/plugin/models-dev.ts:66][E: packages/core/src/plugin/models-dev.ts:69][E: packages/core/src/plugin/models-dev.ts:71][E: packages/core/src/plugin/models-dev.ts:73][E: packages/core/src/plugin/models-dev.ts:75][E: packages/core/src/plugin/models-dev.ts:77][E: packages/core/src/plugin/models-dev.ts:81]

## Connection Semantics

`connections(entry, saved)` 把 stored credentials 映射为 credential connections，并把 env methods 中当前 process env 存在的 names 映射为 env connections。[E: packages/core/src/integration.ts:344][E: packages/core/src/integration.ts:345][E: packages/core/src/integration.ts:346][E: packages/core/src/integration.ts:350][E: packages/core/src/integration.ts:351][E: packages/core/src/integration.ts:352][E: packages/core/src/integration.ts:353]

active connection 先取 saved credentials 的最后一条；如果没有 stored credential，才从 env method names 中找第一个 process env 存在的 name。[E: packages/core/src/integration.ts:357][E: packages/core/src/integration.ts:361][E: packages/core/src/integration.ts:362][E: packages/core/src/integration.ts:364][E: packages/core/src/integration.ts:367][E: packages/core/src/integration.ts:368]

`connection.key` 检查 integration 是否有 key method，随后直接保存 `Credential.Key`，并发布 `integration.updated`；key method 当前不是 per-provider authorize callback。[E: packages/core/src/integration.ts:464][E: packages/core/src/integration.ts:467][E: packages/core/src/integration.ts:468][E: packages/core/src/integration.ts:470][E: packages/core/src/integration.ts:471][E: packages/core/src/integration.ts:473][E: packages/core/src/integration.ts:475]

## OAuth Attempt

OAuth attempt 有 pending、complete、failed、expired 四种 status；attempt lifetime 是 10 minutes，terminal retention 是 1 minute，scrub interval 是 30 seconds。[E: packages/core/src/integration.ts:144][E: packages/core/src/integration.ts:145][E: packages/core/src/integration.ts:146][E: packages/core/src/integration.ts:147][E: packages/core/src/integration.ts:148][E: packages/core/src/integration.ts:257][E: packages/core/src/integration.ts:258][E: packages/core/src/integration.ts:259]

`connection.oauth` 查 OAuth implementation，fork attempt scope，调用 authorize，保存 pending attempt，并在 auto mode fork callback 后 settle。[E: packages/core/src/integration.ts:477][E: packages/core/src/integration.ts:478][E: packages/core/src/integration.ts:482][E: packages/core/src/integration.ts:483][E: packages/core/src/integration.ts:490][E: packages/core/src/integration.ts:493][E: packages/core/src/integration.ts:502][E: packages/core/src/integration.ts:503][E: packages/core/src/integration.ts:505]

`settle` 成功时把 OAuth value 补上 methodID 后写入 Credential service；失败时记录 failed message；两种情况都会关闭 attempt scope。[E: packages/core/src/integration.ts:390][E: packages/core/src/integration.ts:395][E: packages/core/src/integration.ts:397][E: packages/core/src/integration.ts:401][E: packages/core/src/integration.ts:402][E: packages/core/src/integration.ts:407][E: packages/core/src/integration.ts:410][E: packages/core/src/integration.ts:412]

## HTTP API

V2 server `Api` 注册 `IntegrationGroup` 和 `CredentialGroup` 两个 group。[E: packages/server/src/api.ts:23][E: packages/server/src/api.ts:31][E: packages/server/src/api.ts:32]

| operation | method/path | handler action |
|---|---|---|
| `v2.integration.list` | `GET /api/integration` | `Integration.Service.list()` [E: packages/server/src/groups/integration.ts:12][E: packages/server/src/handlers/integration.ts:23][E: packages/server/src/handlers/integration.ts:26] |
| `v2.integration.get` | `GET /api/integration/:integrationID` | `Integration.Service.get(integrationID)` [E: packages/server/src/groups/integration.ts:26][E: packages/server/src/handlers/integration.ts:30][E: packages/server/src/handlers/integration.ts:33] |
| `v2.integration.connect.key` | `POST /api/integration/:integrationID/connect/key` | `connection.key({ integrationID, key, label })` [E: packages/server/src/groups/integration.ts:41][E: packages/server/src/handlers/integration.ts:37][E: packages/server/src/handlers/integration.ts:41] |
| `v2.integration.connect.oauth` | `POST /api/integration/:integrationID/connect/oauth` | `connection.oauth({ integrationID, methodID, inputs, label })` [E: packages/server/src/groups/integration.ts:61][E: packages/server/src/handlers/integration.ts:51][E: packages/server/src/handlers/integration.ts:56] |
| `v2.integration.attempt.status` | `GET /api/integration/attempt/:attemptID` | `attempt.status(attemptID)` [E: packages/server/src/groups/integration.ts:82][E: packages/server/src/handlers/integration.ts:67][E: packages/server/src/handlers/integration.ts:70] |
| `v2.integration.attempt.complete` | `POST /api/integration/attempt/:attemptID/complete` | `attempt.complete({ attemptID, code })` [E: packages/server/src/groups/integration.ts:97][E: packages/server/src/handlers/integration.ts:74][E: packages/server/src/handlers/integration.ts:77] |
| `v2.integration.attempt.cancel` | `DELETE /api/integration/attempt/:attemptID` | `attempt.cancel(attemptID)` [E: packages/server/src/groups/integration.ts:114][E: packages/server/src/handlers/integration.ts:96][E: packages/server/src/handlers/integration.ts:99] |
| `v2.credential.update` | `PATCH /api/credential/:credentialID` | `connection.update(credentialID, { label })` [E: packages/server/src/groups/credential.ts:8][E: packages/server/src/handlers/credential.ts:9][E: packages/server/src/handlers/credential.ts:11] |
| `v2.credential.remove` | `DELETE /api/credential/:credentialID` | `connection.remove(credentialID)` [E: packages/server/src/groups/credential.ts:24][E: packages/server/src/handlers/credential.ts:16][E: packages/server/src/handlers/credential.ts:18] |

## Catalog 与 Runner

`Catalog.provider.available()` 用 provider id cast 成 integration id，要求 provider 非 disabled，并按 static apiKey、connection presence、integration absence 三类规则判断 availability。[E: packages/core/src/catalog.ts:96][E: packages/core/src/catalog.ts:97][E: packages/core/src/catalog.ts:98][E: packages/core/src/catalog.ts:99][E: packages/core/src/catalog.ts:100][E: packages/core/src/catalog.ts:226][E: packages/core/src/catalog.ts:227][E: packages/core/src/catalog.ts:228][E: packages/core/src/catalog.ts:232][E: packages/core/src/catalog.ts:233]

`SessionRunnerModel` 在选定 provider/model 后读取 `integrations.connection.forIntegration(providerID)`；credential connection 会 `credentials.get(connection.id)`，key credential 用 key，OAuth credential 用 access token。[E: packages/core/src/session/runner/model.ts:51][E: packages/core/src/session/runner/model.ts:52][E: packages/core/src/session/runner/model.ts:53][E: packages/core/src/session/runner/model.ts:145][E: packages/core/src/session/runner/model.ts:146][E: packages/core/src/session/runner/model.ts:157][E: packages/core/src/session/runner/model.ts:161]

## Gotcha

- `/api/connector/*` 和 `v2.connector.*` 是旧 generated surface；HEAD route 是 `/api/integration/*` 与 `v2.integration.*`。[E: packages/server/src/groups/integration.ts:12][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5799]
- `CredentialGroup` 不直接依赖 `Credential.Service`，而是通过 `Integration.Service.connection.update/remove` 修改 connection-facing state。[E: packages/server/src/handlers/credential.ts:1][E: packages/server/src/handlers/credential.ts:11][E: packages/server/src/handlers/credential.ts:18]
- env connection 是 process env 检测，不会把 secret 写入 credential table。[E: packages/core/src/integration.ts:350][E: packages/core/src/integration.ts:352][E: packages/core/src/integration.ts:353]

## Sources
- packages/core/src/integration.ts
- packages/core/src/integration/connection.ts
- packages/core/src/integration/schema.ts
- packages/server/src/groups/integration.ts
- packages/server/src/handlers/integration.ts
- packages/server/src/groups/credential.ts
- packages/server/src/handlers/credential.ts
- packages/core/src/catalog.ts
- packages/core/src/session/runner/model.ts

## 相关
- [V2 Credential](../model-layer/credential-v2.md)
- [V2 catalog](../model-layer/model-catalog-v2.md)
- [V2 route catalog](../../surface/server-api/v2-routes.md)
- [SDK surface](../../surface/sdk/surface.md)
