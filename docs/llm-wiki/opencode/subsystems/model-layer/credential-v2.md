---
id: model-layer.credential-v2
title: Credential V2
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/credential.ts, packages/core/src/credential/sql.ts, packages/core/src/integration.ts, packages/core/src/integration/connection.ts, packages/core/src/integration/schema.ts, packages/core/src/catalog.ts, packages/core/src/plugin/models-dev.ts]
symbols: [Credential.Service, CredentialTable, Integration.Service, IntegrationConnection.Info, Integration.Attempt]
related: [model-layer.auth, model-layer.model-catalog-v2, integrations.integration-v2]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 credential layer 把 provider credentials 存在 SQLite `credential` 表；`Integration.Service` 注册 key/OAuth/env methods、暴露 connection list，并管理 OAuth attempt lifecycle。旧 `connector.ts` 已被 `integration.ts`、`integration/connection.ts` 和 `integration/schema.ts` 取代。

## 能回答的问题
- `credential` 表现在有哪些字段，哪些字段是旧 schema compatibility?
- `Credential.Stored` 和 `Credential.Info` 如何区分 persisted row 与 secret value?
- `Integration.Service` 如何注册 methods、列出 connections、写入 key credential?
- OAuth attempt 的 pending/complete/failed/expired 状态怎么维护?
- Catalog provider availability 如何由 integration connection 派生?

## Storage Schema

`CredentialTable` 表名仍是 `credential`，新读写路径使用 `id`、`integration_id`、`label`、JSON `value` 和 timestamps；`connector_id`、`method_id`、`active` 仍留在表中以兼容旧迁移/旧 schema，但当前 `Credential.Stored` 投影只读取 `integration_id`、`label` 和 `value`。[E: packages/core/src/credential/sql.ts:6][E: packages/core/src/credential/sql.ts:7][E: packages/core/src/credential/sql.ts:8][E: packages/core/src/credential/sql.ts:9][E: packages/core/src/credential/sql.ts:10][E: packages/core/src/credential/sql.ts:11][E: packages/core/src/credential/sql.ts:13][E: packages/core/src/credential/sql.ts:14][E: packages/core/src/credential.ts:70][E: packages/core/src/credential.ts:74][E: packages/core/src/credential.ts:76]

`Credential.Info` 是 secret value union，不再带 row id：OAuth value 有 `type/methodID/refresh/access/expires/metadata`，Key value 有 `type/key/metadata`。[E: packages/core/src/credential.ts:17][E: packages/core/src/credential.ts:19][E: packages/core/src/credential.ts:20][E: packages/core/src/credential.ts:21][E: packages/core/src/credential.ts:22][E: packages/core/src/credential.ts:23][E: packages/core/src/credential.ts:26][E: packages/core/src/credential.ts:28][E: packages/core/src/credential.ts:29][E: packages/core/src/credential.ts:32]

`Credential.Stored` 是 persisted credential shape：`id`、`integrationID`、`label`、`value`。[E: packages/core/src/credential.ts:37][E: packages/core/src/credential.ts:38][E: packages/core/src/credential.ts:39][E: packages/core/src/credential.ts:40][E: packages/core/src/credential.ts:41]

## Credential.Service

`Credential.Service` 暴露 `all/list/get/create/update/remove` 六个方法；没有旧版 `activate/active/activeAll/forConnector` surface。[E: packages/core/src/credential.ts:44][E: packages/core/src/credential.ts:46][E: packages/core/src/credential.ts:48][E: packages/core/src/credential.ts:50][E: packages/core/src/credential.ts:52][E: packages/core/src/credential.ts:58][E: packages/core/src/credential.ts:60]

`create` 生成 `cred_` id，默认 label 是 `"default"`，并在 transaction 中先删除同 integration 的所有旧 credential，再插入新 credential；这意味着当前实现是一 integration 一 credential replacement，而不是旧 active flag 切换模型。[E: packages/core/src/credential.ts:11][E: packages/core/src/credential.ts:13][E: packages/core/src/credential.ts:108][E: packages/core/src/credential.ts:110][E: packages/core/src/credential.ts:112][E: packages/core/src/credential.ts:115][E: packages/core/src/credential.ts:119][E: packages/core/src/credential.ts:120][E: packages/core/src/credential.ts:123][E: packages/core/src/credential.ts:126][E: packages/core/src/credential.ts:127][E: packages/core/src/credential.ts:128]

`update` 只在 label 或 value 有变化时更新对应 row；`remove` 直接按 credential id 删除，不再寻找 replacement active credential。[E: packages/core/src/credential.ts:136][E: packages/core/src/credential.ts:137][E: packages/core/src/credential.ts:139][E: packages/core/src/credential.ts:140][E: packages/core/src/credential.ts:141][E: packages/core/src/credential.ts:145][E: packages/core/src/credential.ts:146]

## Integration Registry

`Integration.ID` 与 `Integration.MethodID` 来自 `integration/schema.ts`，attempt id 仍用 `con_` prefix 加 ascending identifier 创建。[E: packages/core/src/integration/schema.ts:5][E: packages/core/src/integration/schema.ts:8][E: packages/core/src/integration.ts:19][E: packages/core/src/integration.ts:21]

method shape 包含 OAuth、key 和 env 三类：OAuth method 有 id、label、optional prompts；key method 只有 type 与 optional label；env method 记录 env var names。[E: packages/core/src/integration.ts:59][E: packages/core/src/integration.ts:60][E: packages/core/src/integration.ts:62][E: packages/core/src/integration.ts:63][E: packages/core/src/integration.ts:67][E: packages/core/src/integration.ts:69][E: packages/core/src/integration.ts:73][E: packages/core/src/integration.ts:75][E: packages/core/src/integration.ts:79]

`Integration.Info` 包含 id、name、methods 和 current connections；connection info 是 `{ type: "credential", id, label }` 或 `{ type: "env", name }`。[E: packages/core/src/integration.ts:82][E: packages/core/src/integration.ts:83][E: packages/core/src/integration.ts:84][E: packages/core/src/integration.ts:85][E: packages/core/src/integration.ts:86][E: packages/core/src/integration/connection.ts:6][E: packages/core/src/integration/connection.ts:13][E: packages/core/src/integration/connection.ts:19]

registry editor 的 `method.update` 会按 method type 和 OAuth method id upsert method；只有 OAuth implementation 存入 `implementations` map，因为 key/env methods 没有 authorize callback implementation。[E: packages/core/src/integration.ts:301][E: packages/core/src/integration.ts:303][E: packages/core/src/integration.ts:317][E: packages/core/src/integration.ts:319][E: packages/core/src/integration.ts:322][E: packages/core/src/integration.ts:324][E: packages/core/src/integration.ts:325]

## Connection Flow

`connection.list()` 会把 `credentials.all()` 按 `integrationID` 分组，并对 registry 中存在的 integration 和只有 saved credential 的 integration 都尝试生成 active connection；credential connection 优先，env method 只在对应 process env 存在时作为 fallback。[E: packages/core/src/integration.ts:451][E: packages/core/src/integration.ts:452][E: packages/core/src/integration.ts:453][E: packages/core/src/integration.ts:454][E: packages/core/src/integration.ts:455][E: packages/core/src/integration.ts:361][E: packages/core/src/integration.ts:364][E: packages/core/src/integration.ts:367]

`connection.key()` 只检查 integration 是否注册了 key method；存在则用 `Credential.Key` 包装用户输入 secret，调用 `credentials.create({ integrationID, label, value })`，再发布 `integration.updated`。[E: packages/core/src/integration.ts:464][E: packages/core/src/integration.ts:467][E: packages/core/src/integration.ts:468][E: packages/core/src/integration.ts:470][E: packages/core/src/integration.ts:471][E: packages/core/src/integration.ts:473][E: packages/core/src/integration.ts:475]

`connection.update()` 与 `connection.remove()` 是 connection-facing wrapper：它们分别调用 `credentials.update` 与 `credentials.remove`，随后发布 `integration.updated`。[E: packages/core/src/integration.ts:517][E: packages/core/src/integration.ts:518][E: packages/core/src/integration.ts:519][E: packages/core/src/integration.ts:521][E: packages/core/src/integration.ts:522][E: packages/core/src/integration.ts:523]

## OAuth Attempt Lifecycle

attempt lifetime 是 10 分钟，terminal retention 是 1 分钟，scrub 每 30 秒运行。[E: packages/core/src/integration.ts:257][E: packages/core/src/integration.ts:258][E: packages/core/src/integration.ts:259]

`connection.oauth()` 查找 OAuth implementation，fork attempt scope，执行 authorize，写入 pending attempt；auto mode 会 fork callback，并在 callback 完成后调用 `settle`。[E: packages/core/src/integration.ts:477][E: packages/core/src/integration.ts:478][E: packages/core/src/integration.ts:482][E: packages/core/src/integration.ts:483][E: packages/core/src/integration.ts:487][E: packages/core/src/integration.ts:490][E: packages/core/src/integration.ts:493][E: packages/core/src/integration.ts:502][E: packages/core/src/integration.ts:503][E: packages/core/src/integration.ts:505]

`attempt.status()` 返回 pending/complete/failed/expired；failed 会带 message。[E: packages/core/src/integration.ts:527][E: packages/core/src/integration.ts:530][E: packages/core/src/integration.ts:531][E: packages/core/src/integration.ts:533]

`attempt.complete()` 会拒绝重复 completion，code mode 没 code 时返回 `Integration.CodeRequired`，执行 callback 后调用 `settle`；callback failure 会以 `AuthorizationError` 形式返回给 caller。[E: packages/core/src/integration.ts:535][E: packages/core/src/integration.ts:538][E: packages/core/src/integration.ts:539][E: packages/core/src/integration.ts:545][E: packages/core/src/integration.ts:547][E: packages/core/src/integration.ts:548][E: packages/core/src/integration.ts:552][E: packages/core/src/integration.ts:553][E: packages/core/src/integration.ts:554]

`settle` 在 success 时调用 `credentials.create`，把 OAuth value 补上 methodID 后保存，并发布 `integration.updated`；failure 则把 attempt 标为 failed，保留 message，并关闭 attempt scope。[E: packages/core/src/integration.ts:390][E: packages/core/src/integration.ts:395][E: packages/core/src/integration.ts:397][E: packages/core/src/integration.ts:401][E: packages/core/src/integration.ts:402][E: packages/core/src/integration.ts:407][E: packages/core/src/integration.ts:410][E: packages/core/src/integration.ts:412]

## 与 Catalog 的关系

Catalog availability 不再读取 credential active flag；`Catalog.provider.available()` 先读取 integration list 和 `integration.connection.list()`，再用 provider id 作为 integration id 判断 provider 是否可用。[E: packages/core/src/catalog.ts:226][E: packages/core/src/catalog.ts:227][E: packages/core/src/catalog.ts:228][E: packages/core/src/catalog.ts:229][E: packages/core/src/catalog.ts:232][E: packages/core/src/catalog.ts:233]

availability 判断规则是：provider disabled 则不可用；provider request body 已有 string `apiKey` 则可用；存在 connection 则可用；如果 provider 没有对应 integration 也可用。[E: packages/core/src/catalog.ts:96][E: packages/core/src/catalog.ts:97][E: packages/core/src/catalog.ts:98][E: packages/core/src/catalog.ts:99][E: packages/core/src/catalog.ts:100]

`ModelsDevPlugin` 为 models.dev provider 注册 integration metadata：有 env names 的 provider 会注册 key method 和 env method，然后把 provider/model 写进 catalog。[E: packages/core/src/plugin/models-dev.ts:57][E: packages/core/src/plugin/models-dev.ts:63][E: packages/core/src/plugin/models-dev.ts:66][E: packages/core/src/plugin/models-dev.ts:69][E: packages/core/src/plugin/models-dev.ts:71][E: packages/core/src/plugin/models-dev.ts:73][E: packages/core/src/plugin/models-dev.ts:75][E: packages/core/src/plugin/models-dev.ts:77][E: packages/core/src/plugin/models-dev.ts:81]

## 易错点

- `Integration` 是本地 auth/integration registry，不是 workspace remote adapter；workspace/control-plane adapter 仍在 server/control-plane 相关代码中。[I]
- `credential` table 保留 `connector_id/method_id/active` compatibility columns，但新 `Credential.Stored` 使用 `integration_id`。[E: packages/core/src/credential/sql.ts:8][E: packages/core/src/credential/sql.ts:11][E: packages/core/src/credential/sql.ts:12][E: packages/core/src/credential/sql.ts:13][E: packages/core/src/credential.ts:39]
- 当前 key connection 不调用 method-specific key authorize implementation；它只要求 key method 已注册，然后直接存 `Credential.Key`。[E: packages/core/src/integration.ts:464][E: packages/core/src/integration.ts:468][E: packages/core/src/integration.ts:470][E: packages/core/src/integration.ts:473]

## Sources
- packages/core/src/credential.ts
- packages/core/src/credential/sql.ts
- packages/core/src/integration.ts
- packages/core/src/integration/connection.ts
- packages/core/src/integration/schema.ts
- packages/core/src/catalog.ts
- packages/core/src/plugin/models-dev.ts

## Related
- model-layer.auth
- model-layer.model-catalog-v2
- integrations.integration-v2
